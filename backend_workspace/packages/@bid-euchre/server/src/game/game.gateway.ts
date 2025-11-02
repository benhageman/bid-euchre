import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameStateService } from './services/game-state.service';
import { BotService } from './services/bot.service';
import { ValidationService } from './services/validation.service';
import { HostRoomDto, JoinRoomDto, ReconnectPlayerDto, MakeBidDto, PlayCardDto, AddBotDto } from './dto/game.dto';
import { Bid, Card } from './types';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly gameStateService: GameStateService,
    private readonly botService: BotService,
    private readonly validationService: ValidationService,
  ) {}

  handleConnection(client: Socket) {
    // Connection established
  }

  handleDisconnect(client: Socket) {
    // Find player in all rooms but DON'T remove them immediately
    const rooms = this.gameStateService.getAllRooms();
    
    for (const [roomId, room] of Object.entries(rooms)) {
      const playerIndex = room.gameState.players.findIndex(p => p.id === client.id);
      
      if (playerIndex !== -1) {
        const playerName = room.gameState.players[playerIndex].name;
        const oldSocketId = client.id;
        
        console.log(`Player ${playerName} (${oldSocketId}) disconnected from room ${roomId}. Waiting for reconnection...`);
        console.log(`Saving hand: ${room.gameState.hands[oldSocketId]?.length || 0} cards`);
        
        // Save the hand data under the disconnected marker BEFORE updating the ID
        const disconnectedMarker = `disconnected-${playerName}`;
        if (room.gameState.hands[oldSocketId]) {
          room.gameState.hands[disconnectedMarker] = room.gameState.hands[oldSocketId];
          console.log(`Saved hand under key: ${disconnectedMarker}`);
        }
        
        // Also save tricks won
        if (room.gameState.tricksWon[oldSocketId]) {
          room.gameState.tricksWon[disconnectedMarker] = room.gameState.tricksWon[oldSocketId];
        }
        
        // Mark player as disconnected but keep in game
        room.gameState.players[playerIndex].id = disconnectedMarker;
        
        this.server.to(roomId).emit('room-update', {
          message: `${playerName} disconnected. Game paused.`,
          room: roomId
        });
        
        // Give player 30 seconds to reconnect before removing
        setTimeout(() => {
          const currentRoom = this.gameStateService.getRoom(roomId);
          if (currentRoom) {
            const stillDisconnected = currentRoom.gameState.players.find(
              p => p.id === disconnectedMarker
            );
            
            if (stillDisconnected) {
              console.log(`Player ${playerName} did not reconnect. Removing from game.`);
              this.gameStateService.removePlayerFromRoom(roomId, disconnectedMarker);
              
              this.server.to(roomId).emit('room-update', {
                message: `${playerName} has left the game`,
                room: roomId
              });
              
              const updatedState = this.gameStateService.getRoom(roomId);
              if (updatedState) {
                this.server.to(roomId).emit('player-list', updatedState.gameState.players);
              }
            }
          }
        }, 30000); // 30 second grace period
        
        break;
      }
    }
  }

  @SubscribeMessage('host')
  handleHost(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: HostRoomDto,
  ) {
    // Validate player name
    const nameValidation = this.validationService.validatePlayerName(data.name);
    if (!nameValidation.valid) {
      client.emit('error', { message: nameValidation.error });
      return;
    }

    // Validate room ID
    const roomValidation = this.validationService.validateRoomId(data.room);
    if (!roomValidation.valid) {
      client.emit('error', { message: roomValidation.error });
      return;
    }

    const player = { id: client.id, name: data.name };
    const room = this.gameStateService.createRoom(data.room, player);
    
    client.join(data.room);
    
    this.server.to(data.room).emit('room-update', {
      message: `${data.name} hosted room ${data.room}`,
      room: data.room,
    });
    
    this.server.to(data.room).emit('player-list', room.gameState.players);
  }

  @SubscribeMessage('join')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinRoomDto,
  ) {
    // Validate room exists
    const roomExistsValidation = this.validationService.validateRoomExists(data.room);
    if (!roomExistsValidation.valid) {
      client.emit('error', { message: roomExistsValidation.error });
      return;
    }

    // Validate player name
    const nameValidation = this.validationService.validatePlayerName(data.name);
    if (!nameValidation.valid) {
      client.emit('error', { message: nameValidation.error });
      return;
    }

    // Validate room size
    const sizeValidation = this.validationService.validateRoomSize(data.room);
    if (!sizeValidation.valid) {
      client.emit('error', { message: sizeValidation.error });
      return;
    }

    // Validate player not already in room
    const notInRoomValidation = this.validationService.validatePlayerNotInRoom(data.room, data.name);
    if (!notInRoomValidation.valid) {
      client.emit('error', { message: notInRoomValidation.error });
      return;
    }

    const player = { id: client.id, name: data.name };
    const gameState = this.gameStateService.addPlayerToRoom(data.room, player);
    
    if (!gameState) {
      client.emit('error', { message: 'Failed to join room' });
      return;
    }
    
    client.join(data.room);
    
    this.server.to(data.room).emit('room-update', {
      message: `${data.name} joined room ${data.room}`,
      room: data.room,
    });
    
    this.server.to(data.room).emit('player-list', gameState.players);
    
    // Start game if 4 players
    if (gameState.players.length === 4) {
      const updatedState = this.gameStateService.startGame(data.room);
      if (updatedState) {
        // Deal hands to each player
        updatedState.players.forEach(p => {
          if (!p.isBot) {
            this.server.to(p.id).emit('deal-hand', {
              cards: updatedState.hands[p.id].map(c => 
                `${c.value}${c.suit.charAt(0).toUpperCase()}`
              ),
              playerId: p.id,
            });
          }
        });
        
        // Start bidding
        this.server.to(data.room).emit('bidding-started', {
          dealer: updatedState.players[updatedState.dealerIndex],
          bids: updatedState.bids,
        });
        
        // Process bot bids
        this.processBotBids(data.room, updatedState);
      }
    }
  }

  @SubscribeMessage('reconnect-player')
  handleReconnect(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ReconnectPlayerDto,
  ) {
    const room = this.gameStateService.getRoom(data.room);
    if (!room) {
      console.log(`Room ${data.room} not found for reconnection`);
      return;
    }

    console.log('=== RECONNECTION ATTEMPT ===');
    console.log('Player name:', data.name);
    console.log('New socket ID:', client.id);
    console.log('Current players:', room.gameState.players.map(p => ({ id: p.id, name: p.name })));
    console.log('Current hands keys:', Object.keys(room.gameState.hands));

    // Find the disconnected player
    const playerIndex = room.gameState.players.findIndex(
      p => p.id === `disconnected-${data.name}` || p.name === data.name
    );

    if (playerIndex === -1) {
      console.log(`Player ${data.name} not found in room ${data.room}`);
      // Player might be trying to join a game they weren't part of
      return;
    }

    const player = room.gameState.players[playerIndex];
    const oldId = player.id; // This will be "disconnected-{name}"
    
    console.log('Found player at index:', playerIndex);
    console.log('Old ID marker:', oldId);
    console.log('Hand exists for old ID:', !!room.gameState.hands[oldId]);
    
    // Update socket ID to new connection
    player.id = client.id;
    
    // Transfer hand from disconnected marker to new ID
    if (room.gameState.hands[oldId]) {
      room.gameState.hands[client.id] = room.gameState.hands[oldId];
      delete room.gameState.hands[oldId];
      console.log('Transferred hand from', oldId, 'to', client.id);
      console.log('Hand cards:', room.gameState.hands[client.id].length);
    } else {
      console.log('WARNING: No hand found for old ID:', oldId);
      console.log('Available hand keys:', Object.keys(room.gameState.hands));
    }
    
    // Transfer tricks won from old ID to new ID
    if (room.gameState.tricksWon[oldId]) {
      room.gameState.tricksWon[client.id] = room.gameState.tricksWon[oldId];
      delete room.gameState.tricksWon[oldId];
    }
    
    // Update current turn if it was the disconnected player's turn
    if (room.gameState.currentTurnId === oldId) {
      room.gameState.currentTurnId = client.id;
    }
    
    // Update trick cards if player played in current trick
    room.gameState.trick = room.gameState.trick.map(card => 
      card.playerId === oldId ? { ...card, playerId: client.id } : card
    );
    
    // Update winning bid if it was the reconnected player
    if (room.gameState.winningBid && room.gameState.winningBid.id === oldId) {
      room.gameState.winningBid.id = client.id;
    }
    
    // Join the room
    client.join(data.room);
    
    console.log(`Player ${data.name} reconnected to room ${data.room}`);
    
    // Notify everyone
    this.server.to(data.room).emit('room-update', {
      message: `${data.name} reconnected`,
      room: data.room,
    });
    
    // Send full game state to reconnected player
    this.server.to(data.room).emit('player-list', room.gameState.players);
    
    // Restore player's hand
    if (room.gameState.hands[client.id]) {
      this.server.to(client.id).emit('deal-hand', {
        cards: room.gameState.hands[client.id].map(c =>
          `${c.value}${c.suit.charAt(0).toUpperCase()}`
        ),
        playerId: client.id,
      });
    }
    
    // Restore current trick
    if (room.gameState.trick.length > 0) {
      this.server.to(client.id).emit('trick-updated', {
        trick: room.gameState.trick.map(c => ({
          id: c.playerId,
          card: `${c.value}${c.suit.charAt(0).toUpperCase()}`,
        })),
      });
    }
    
    // Restore bids if in bidding phase
    if (room.gameState.isBidding) {
      this.server.to(client.id).emit('bidding-started', {
        dealer: room.gameState.players[room.gameState.dealerIndex],
        bids: room.gameState.bids,
      });
      this.server.to(client.id).emit('bids-updated', room.gameState.bids);
    } else if (room.gameState.winningBid) {
      // Restore winning bid
      this.server.to(client.id).emit('bidding-complete', {
        winner: room.gameState.winningBid,
        trump: room.gameState.winningBid.trump,
      });
    }
    
    // Restore scores
    this.server.to(client.id).emit('score-update', room.gameState.teamScores);
    
    // Restore current turn
    if (room.gameState.currentTurnId) {
      this.server.to(client.id).emit('current-turn', {
        playerId: room.gameState.currentTurnId,
        validMoves: this.gameStateService.getValidMoves(data.room, room.gameState.currentTurnId),
      });
    }
    
    // Send confirmation
    this.server.to(client.id).emit('reconnected', {
      message: 'Successfully reconnected',
      gameState: {
        players: room.gameState.players,
        currentTurnId: room.gameState.currentTurnId,
        teamScores: room.gameState.teamScores,
        isBidding: room.gameState.isBidding,
      },
    });
  }

  @SubscribeMessage('submit-bid')
  handleBid(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: MakeBidDto,
  ) {
    // Validate room exists
    const roomValidation = this.validationService.validateRoomExists(data.room);
    if (!roomValidation.valid) {
      client.emit('error', { message: roomValidation.error });
      return;
    }

    // Validate player in room
    const playerValidation = this.validationService.validatePlayerInRoom(data.room, client.id);
    if (!playerValidation.valid) {
      client.emit('error', { message: playerValidation.error });
      return;
    }

    // Validate it's their turn to bid
    const turnValidation = this.validationService.validateBidTurn(data.room, client.id);
    if (!turnValidation.valid) {
      client.emit('error', { message: turnValidation.error });
      return;
    }

    // Validate bid amount and trump
    const bidValidation = this.validationService.validateBid(data.amount, data.trump);
    if (!bidValidation.valid) {
      client.emit('error', { message: bidValidation.error });
      return;
    }

    const room = this.gameStateService.getRoom(data.room);
    if (!room) {
      client.emit('error', { message: 'Room not found' });
      return;
    }

    const player = room.gameState.players.find(p => p.id === client.id);
    if (!player) {
      client.emit('error', { message: 'Player not found' });
      return;
    }
    
    const bid: Bid = {
      id: client.id,
      name: player.name,
      amount: data.amount,
      trump: data.trump,
    };
    
    const gameState = this.gameStateService.submitBid(data.room, client.id, bid);
    
    if (gameState) {
      this.server.to(data.room).emit('bids-updated', gameState.bids);
      
      if (!gameState.isBidding && gameState.winningBid) {
        console.log('Bidding complete from handleSubmitBid! Winner:', gameState.winningBid);
        this.server.to(data.room).emit('bidding-complete', {
          winner: gameState.winningBid,
          trump: gameState.winningBid.trump,
        });
        
        if (gameState.currentTurnId) {
          console.log('Current turn ID after bidding (handleSubmitBid):', gameState.currentTurnId);
          this.server.to(data.room).emit('current-turn', {
            playerId: gameState.currentTurnId,
            validMoves: this.gameStateService.getValidMoves(data.room, gameState.currentTurnId),
          });
          console.log('About to call processBotPlays from handleSubmitBid');
          this.processBotPlays(data.room, gameState);
        } else {
          console.log('No current turn ID after bidding (handleSubmitBid)!');
        }
      } else if (gameState.isBidding) {
        this.processBotBids(data.room, gameState);
      }
    }
  }

  @SubscribeMessage('add-bot')
  handleAddBot(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: AddBotDto,
  ) {
    const room = this.gameStateService.getRoom(data.room);
    if (!room) return;
    
    const bot = this.botService.createBot(room.gameState.players);
    const gameState = this.gameStateService.addPlayerToRoom(data.room, bot);
    
    if (gameState) {
      this.server.to(data.room).emit('room-update', {
        message: `${bot.name} joined room ${data.room}`,
        room: data.room,
      });
      
      this.server.to(data.room).emit('player-list', gameState.players);
      
      if (gameState.players.length === 4) {
        const updatedState = this.gameStateService.startGame(data.room);
        if (updatedState) {
          // Deal hands to human players only
          updatedState.players.forEach(p => {
            if (!p.isBot) {
              this.server.to(p.id).emit('deal-hand', {
                cards: updatedState.hands[p.id].map(c =>
                  `${c.value}${c.suit.charAt(0).toUpperCase()}`
                ),
                playerId: p.id,
              });
            }
          });
          
          this.server.to(data.room).emit('bidding-started', {
            dealer: updatedState.players[updatedState.dealerIndex],
            bids: updatedState.bids,
          });
          
          this.processBotBids(data.room, updatedState);
        }
      }
    }
  }

  /**
   * Recursively processes bot bids until it's a human player's turn
   */
  private processBotBids(room: string, gameState: any) {
    const currentPlayer = gameState.players.find(p => p.id === gameState.currentTurnId);
    
    if (!currentPlayer) return;
    
    if (currentPlayer.isBot) {
      const botHand = gameState.hands[currentPlayer.id];
      const botBid = this.botService.decideBid(botHand, gameState.bids);
      
      let updatedState;
      if (botBid) {
        botBid.id = currentPlayer.id;
        botBid.name = currentPlayer.name;
        updatedState = this.gameStateService.submitBid(room, currentPlayer.id, botBid);
      } else {
        // Bot passes (amount 0 doesn't need trump suit)
        updatedState = this.gameStateService.submitBid(room, currentPlayer.id, {
          id: currentPlayer.id,
          name: currentPlayer.name,
          amount: 0,
          trump: 'high', // Irrelevant for pass, but required by type
        });
      }
      
      if (updatedState) {
        this.server.to(room).emit('bids-updated', updatedState.bids);
        
        if (!updatedState.isBidding && updatedState.winningBid) {
          console.log('Bidding complete! Winner:', updatedState.winningBid);
          this.server.to(room).emit('bidding-complete', {
            winner: updatedState.winningBid,
            trump: updatedState.winningBid.trump,
          });
          
          if (updatedState.currentTurnId) {
            console.log('Current turn ID after bidding:', updatedState.currentTurnId);
            this.server.to(room).emit('current-turn', {
              playerId: updatedState.currentTurnId,
              validMoves: this.gameStateService.getValidMoves(room, updatedState.currentTurnId),
            });
            // Process bot plays automatically
            console.log('About to call processBotPlays');
            this.processBotPlays(room, updatedState);
          } else {
            console.log('No current turn ID after bidding!');
          }
        } else {
          this.processBotBids(room, updatedState);
        }
      }
    } else {
      // Human player's turn - emit current-turn to update state
      this.server.to(room).emit('current-turn', {
        playerId: currentPlayer.id,
        validMoves: [],
      });
      this.server.to(currentPlayer.id).emit('your-turn-to-bid');
    }
  }

  /**
   * Recursively processes bot card plays until it's a human player's turn
   */
  private processBotPlays(room: string, gameState: any) {
    console.log('processBotPlays called for room:', room);
    const currentPlayer = gameState.players.find(p => p.id === gameState.currentTurnId);
    
    if (!currentPlayer) {
      console.log('No current player found');
      return;
    }
    
    console.log('Current player:', currentPlayer.name, 'isBot:', currentPlayer.isBot);
    
    if (currentPlayer.isBot) {
      // Bot's turn - decide which card to play
      const botHand = gameState.hands[currentPlayer.id];
      const trump = gameState.winningBid?.trump || 'high';
      const cardToPlay = this.botService.decideCard(botHand, gameState.trick, trump);
      
      // Play the card
      const playedCard = {
        value: cardToPlay.value,
        suit: cardToPlay.suit,
        playerId: currentPlayer.id,
      };
      
      const updatedState = this.gameStateService.playCard(room, currentPlayer.id, playedCard);
      
      if (updatedState) {
        // Check if hand is complete and new bidding round started
        if (updatedState.isBidding) {
          console.log('Hand complete! New bidding round starting.');
          
          // Emit score update
          this.server.to(room).emit('score-update', updatedState.teamScores);
          
          // Emit new hand dealt
          updatedState.players.forEach(p => {
            if (!p.isBot) {
              this.server.to(p.id).emit('deal-hand', {
                cards: updatedState.hands[p.id].map(c =>
                  `${c.value}${c.suit.charAt(0).toUpperCase()}`
                ),
                playerId: p.id,
              });
            }
          });
          
          // Emit bidding started
          this.server.to(room).emit('bidding-started', {
            dealer: updatedState.players[updatedState.dealerIndex],
            bids: updatedState.bids,
          });
          
          // Start bot bidding process
          this.processBotBids(room, updatedState);
          return;
        }
        
        // Emit trick update
        this.server.to(room).emit('trick-updated', {
          trick: updatedState.trick.map(c => ({
            id: c.playerId,
            card: `${c.value}${c.suit.charAt(0).toUpperCase()}`,
          })),
        });
        
        // Update hands for human players
        updatedState.players.forEach(p => {
          if (!p.isBot) {
            this.server.to(p.id).emit('hand-updated', {
              cards: updatedState.hands[p.id].map(c =>
                `${c.value}${c.suit.charAt(0).toUpperCase()}`
              ),
              playerId: p.id,
            });
          }
        });
        
        // Handle trick completion
        if (updatedState.trick.length === 4) {
          this.server.to(room).emit('trick-complete', {
            winnerId: updatedState.currentTurnId,
          });
          
          // Add 1 second delay before continuing to let players see the completed trick
          setTimeout(() => {
            // Update current turn
            if (updatedState.currentTurnId) {
              this.server.to(room).emit('current-turn', {
                playerId: updatedState.currentTurnId,
                validMoves: this.gameStateService.getValidMoves(room, updatedState.currentTurnId),
              });
              
              // Continue processing bot plays
              setTimeout(() => {
                this.processBotPlays(room, updatedState);
              }, 500);
            }
          }, 1000);
        } else {
          // Update current turn immediately if trick not complete
          if (updatedState.currentTurnId) {
            this.server.to(room).emit('current-turn', {
              playerId: updatedState.currentTurnId,
              validMoves: this.gameStateService.getValidMoves(room, updatedState.currentTurnId),
            });
            
            // Continue processing bot plays with a small delay for visualization
            setTimeout(() => {
              this.processBotPlays(room, updatedState);
            }, 500);
          }
        }
      }
    } else {
      // Human player's turn - just emit the turn notification
      this.server.to(currentPlayer.id).emit('your-turn-to-play');
    }
  }

  @SubscribeMessage('play-card')
  handlePlayCard(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: PlayCardDto,
  ) {
    // Validate room exists
    const roomValidation = this.validationService.validateRoomExists(data.room);
    if (!roomValidation.valid) {
      client.emit('error', { message: roomValidation.error });
      return;
    }

    // Validate player in room
    const playerValidation = this.validationService.validatePlayerInRoom(data.room, client.id);
    if (!playerValidation.valid) {
      client.emit('error', { message: playerValidation.error });
      return;
    }

    // Validate it's their turn to play
    const turnValidation = this.validationService.validatePlayTurn(data.room, client.id);
    if (!turnValidation.valid) {
      client.emit('error', { message: turnValidation.error });
      return;
    }

    // Validate card format
    const formatValidation = this.validationService.validateCardFormat(data.card);
    if (!formatValidation.valid) {
      client.emit('error', { message: formatValidation.error });
      return;
    }

    // Parse card string (e.g., "9S" -> {value: "9", suit: "spades"})
    const cardStr = data.card;
    const value = cardStr.slice(0, -1);
    const suitChar = cardStr.slice(-1);
    const suitMap: Record<string, 'hearts' | 'diamonds' | 'clubs' | 'spades'> = {
      'H': 'hearts',
      'D': 'diamonds',
      'C': 'clubs',
      'S': 'spades',
    };
    
    const card = {
      value: value as Card['value'],
      suit: suitMap[suitChar],
      playerId: client.id,
    };

    // Validate player has the card
    const hasCardValidation = this.validationService.validatePlayerHasCard(data.room, client.id, card);
    if (!hasCardValidation.valid) {
      client.emit('error', { message: hasCardValidation.error });
      return;
    }

    // Validate card is a valid move
    const validMoveValidation = this.validationService.validateCardPlay(data.room, client.id, card);
    if (!validMoveValidation.valid) {
      client.emit('error', { message: validMoveValidation.error });
      return;
    }
    
    const gameState = this.gameStateService.playCard(data.room, client.id, card);
    
    if (gameState) {
      // Check if hand is complete and new bidding round started
      if (gameState.isBidding) {
        console.log('Hand complete from human play! New bidding round starting.');
        
        // Emit score update
        this.server.to(data.room).emit('score-update', gameState.teamScores);
        
        // Emit new hand dealt
        gameState.players.forEach(p => {
          if (!p.isBot) {
            this.server.to(p.id).emit('deal-hand', {
              cards: gameState.hands[p.id].map(c =>
                `${c.value}${c.suit.charAt(0).toUpperCase()}`
              ),
              playerId: p.id,
            });
          }
        });
        
        // Emit bidding started
        this.server.to(data.room).emit('bidding-started', {
          dealer: gameState.players[gameState.dealerIndex],
          bids: gameState.bids,
        });
        
        // Start bot bidding process
        this.processBotBids(data.room, gameState);
        return;
      }
      
      // Emit trick update
      this.server.to(data.room).emit('trick-updated', {
        trick: gameState.trick.map(c => ({
          id: c.playerId,
          card: `${c.value}${c.suit.charAt(0).toUpperCase()}`,
        })),
      });
      
      // Update hands
      gameState.players.forEach(p => {
        if (!p.isBot) {
          this.server.to(p.id).emit('hand-updated', {
            cards: gameState.hands[p.id].map(c =>
              `${c.value}${c.suit.charAt(0).toUpperCase()}`
            ),
            playerId: p.id,
          });
        }
      });
      
      // Handle trick completion
      if (gameState.trick.length === 4) {
        this.server.to(data.room).emit('trick-complete', {
          winnerId: gameState.currentTurnId,
        });
        
        // Add 1 second delay before continuing to let players see the completed trick
        setTimeout(() => {
          // Update current turn
          if (gameState.currentTurnId) {
            this.server.to(data.room).emit('current-turn', {
              playerId: gameState.currentTurnId,
              validMoves: this.gameStateService.getValidMoves(data.room, gameState.currentTurnId),
            });
            
            // Process bot plays automatically
            this.processBotPlays(data.room, gameState);
          }
        }, 1000);
      } else {
        // Update current turn immediately if trick not complete
        if (gameState.currentTurnId) {
          this.server.to(data.room).emit('current-turn', {
            playerId: gameState.currentTurnId,
            validMoves: this.gameStateService.getValidMoves(data.room, gameState.currentTurnId),
          });
          
          // Process bot plays automatically
          this.processBotPlays(data.room, gameState);
        }
      }
    }
  }
}