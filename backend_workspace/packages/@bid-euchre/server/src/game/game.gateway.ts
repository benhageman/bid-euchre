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
import { HostRoomDto, JoinRoomDto, MakeBidDto, PlayCardDto, AddBotDto } from './dto/game.dto';
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
  ) {}

  handleConnection(client: Socket) {
    // Connection established
  }

  handleDisconnect(client: Socket) {
    // Find and remove player from all rooms
    const rooms = this.gameStateService.getAllRooms();
    
    for (const [roomId, room] of Object.entries(rooms)) {
      const playerIndex = room.gameState.players.findIndex(p => p.id === client.id);
      
      if (playerIndex !== -1) {
        const playerName = room.gameState.players[playerIndex].name;
        
        this.gameStateService.removePlayerFromRoom(roomId, client.id);
        
        this.server.to(roomId).emit('room-update', {
          message: `${playerName} disconnected`,
          room: roomId
        });
        
        const updatedState = this.gameStateService.getRoom(roomId);
        if (updatedState) {
          this.server.to(roomId).emit('player-list', updatedState.gameState.players);
        }
        
        break;
      }
    }
  }

  @SubscribeMessage('host')
  handleHost(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: HostRoomDto,
  ) {
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
    const player = { id: client.id, name: data.name };
    const gameState = this.gameStateService.addPlayerToRoom(data.room, player);
    
    if (!gameState) return;
    
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

  @SubscribeMessage('submit-bid')
  handleBid(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: MakeBidDto,
  ) {
    const room = this.gameStateService.getRoom(data.room);
    if (!room) return;
    
    const player = room.gameState.players.find(p => p.id === client.id);
    if (!player) return;
    
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
    const room = this.gameStateService.getRoom(data.room);
    if (!room) return;
    
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