const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const rooms = {};
const hands = {};
const bids = {};
const bidTurnIndex = {};
const dealerIndex = {};
const tricks = {};
const currentTurnIndex = {};
const winningTrump = {}; // room => 'high' | 'low' | suit
const moonPlayer = {}; // room => player ID who is going moon
const roundTricks = {}; // room => { team1: number, team2: number }

const fullDeck = [
  '9C', '9D', '9H', '9S',
  '10C', '10D', '10H', '10S',
  'JC', 'JD', 'JH', 'JS',
  'QC', 'QD', 'QH', 'QS',
  'KC', 'KD', 'KH', 'KS',
  'AC', 'AD', 'AH', 'AS'
];

function parseCard(card) {
  const value = card.slice(0, -1);
  const suit = card.slice(-1);
  return { value, suit };
}

function getCardPower(card, leadSuit, trump) {
  const { value, suit } = parseCard(card);
  const isTrumpSuit = trump && trump !== 'high' && trump !== 'low';
  const sameColor = { H: 'D', D: 'H', S: 'C', C: 'S' };

  const rankHigh = ['9', '10', 'J', 'Q', 'K', 'A'];
  const rankLow = [...rankHigh].reverse();

  // Right bower
  if (isTrumpSuit && value === 'J' && suit === trump[0].toUpperCase()) return 100;
  // Left bower
  if (isTrumpSuit && value === 'J' && suit === sameColor[trump[0].toUpperCase()]) return 99;
  // Trump suit
  if (isTrumpSuit && suit === trump[0].toUpperCase()) {
    return 80 + rankHigh.indexOf(value);
  }

  // High (no trump)
  if (trump === 'high') {
    return suit === leadSuit ? 50 + rankHigh.indexOf(value) : 0;
  }

  // Low (no trump, reversed rank)
  if (trump === 'low') {
    return suit === leadSuit ? 50 + rankLow.indexOf(value) : 0;
  }

  // Normal suit game: rank cards by lead suit
  return suit === leadSuit ? 10 + rankHigh.indexOf(value) : 0;
}

function trumpRank(trump) {
  if (trump === 'high') return 3;
  if (trump === 'low') return 2;
  return 1;
}

function isBetterBid(newBid, currentBid) {
    if (!currentBid) return true;
  
    // Moon always wins
    if (newBid.amount === 'moon') return true;
    if (currentBid.amount === 'moon') return false;
  
    if (newBid.amount > currentBid.amount) return true;
    if (newBid.amount < currentBid.amount) return false;
  
    return trumpRank(newBid.trump) > trumpRank(currentBid.trump);
  }
  
  

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('host', ({ name, room }) => {
    if (!name || !room) return;
    socket.join(room);
    rooms[room] = rooms[room] || [];
    rooms[room] = rooms[room].filter(p => p.id !== socket.id);
    rooms[room].push({ id: socket.id, name });

    io.to(room).emit('room-update', { message: `${name} hosted room ${room}`, room });
    io.to(room).emit('player-list', rooms[room]);
  });

  socket.on('join', ({ name, room }) => {
    if (!name || !room) return;
    socket.join(room);
    rooms[room] = rooms[room] || [];
    rooms[room] = rooms[room].filter(p => p.id !== socket.id);
    rooms[room].push({ id: socket.id, name });

    io.to(room).emit('room-update', { message: `${name} joined room ${room}`, room });
    io.to(room).emit('player-list', rooms[room]);
  });

  socket.on('get-player-list', (room) => {
    if (rooms[room]) {
      io.to(socket.id).emit('player-list', rooms[room]);
    }
  });

  socket.on('start-game', (room) => {
    const players = rooms[room];
    if (!players || players.length !== 4) {
      io.to(socket.id).emit('error-message', 'Game requires 4 players to start.');
      return;
    }

    const deck = [...fullDeck];
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    hands[room] = {};
    players.forEach((player, index) => {
      const hand = deck.slice(index * 6, (index + 1) * 6);
      hands[room][player.id] = hand;
      io.to(player.id).emit('deal-hand', hand);
    });

    io.to(room).emit('game-started');

    dealerIndex[room] = (dealerIndex[room] || 0) % 4;
    const firstBidderIndex = (dealerIndex[room] + 1) % 4;
    bidTurnIndex[room] = firstBidderIndex;
    bids[room] = [];

    io.to(room).emit('bidding-started', {
      dealer: players[dealerIndex[room]],
      bids: bids[room]
    });

    io.to(players[firstBidderIndex].id).emit('your-turn-to-bid');
  });

  socket.on('submit-bid', ({ room, amount, trump }) => {
    const players = rooms[room];
    const turnIndex = bidTurnIndex[room];
    const currentPlayer = players[turnIndex];

    const isFourthBid = bids[room].length === 3;
    const firstThreePassed = bids[room].every(b => b.amount === 0);
    const tryingToPass = amount === 0;

    if (isFourthBid && firstThreePassed && tryingToPass) {
      io.to(currentPlayer.id).emit('error-message', 'You must place a bid — all others passed.');
      return;
    }

    const newBid = {
        id: currentPlayer.id,
        name: currentPlayer.name,
        amount: amount === 'moon' ? 'moon' : Number(amount),
        trump
    };
    bids[room].push(newBid);
    io.to(room).emit('bids-updated', bids[room]);

    bidTurnIndex[room] = (turnIndex + 1) % 4;

    if (bids[room].length >= 4) {
      const validBids = bids[room].filter(b => b.amount !== 0);
      const winningBid = validBids.reduce((best, bid) => isBetterBid(bid, best) ? bid : best, null);
      io.to(room).emit('bidding-complete', { winner: winningBid });

      if (winningBid) {
        if (winningBid.amount === 'moon') {
          moonPlayer[room] = winningBid.id;
        }
        winningTrump[room] = winningBid.trump;
        const winnerIndex = players.findIndex(p => p.id === winningBid.id);
        const firstPlayer = (winnerIndex + 1) % 4;
        currentTurnIndex[room] = firstPlayer;
        tricks[room] = [];
        io.to(players[firstPlayer].id).emit('your-turn-to-play');
      }
      
    } else {
      const nextPlayer = players[bidTurnIndex[room]];
      io.to(nextPlayer.id).emit('your-turn-to-bid');
    }
  });

  socket.on('play-card', ({ room, card }, callback) => {
    const players = rooms[room];
    if (!players) return;

    const turnIndex = currentTurnIndex[room];
    const currentPlayer = players[turnIndex];
    // Skip moonPlayer's teammate
    if (moonPlayer[room]) {
        const moonIndex = players.findIndex(p => p.id === moonPlayer[room]);
        const teammateIndex = (moonIndex + 2) % 4;
      
        if (socket.id === players[teammateIndex].id) {
          io.to(socket.id).emit('error-message', 'You are skipped this round — teammate is going Moon.');
      
          // Advance to the next player instead
          currentTurnIndex[room] = (currentTurnIndex[room] + 1) % 4;
      
          // If the next player is still the moonPlayer's teammate (e.g., in 3-player moon scenario), skip again
          const nextPlayer = players[currentTurnIndex[room]];
          if (nextPlayer.id === players[teammateIndex].id) {
            currentTurnIndex[room] = (currentTurnIndex[room] + 1) % 4;
          }
      
          // Notify next player to play
          const nextUp = players[currentTurnIndex[room]];
          setTimeout(() => {
            io.to(nextUp.id).emit('your-turn-to-play');
          }, 100);
      
          if (callback) callback({ success: false });
          return;
        }
      }
      
    
    const playerHand = hands[room]?.[socket.id];

    if (socket.id !== currentPlayer.id) {
        io.to(socket.id).emit('error-message', 'Not your turn to play.');
        if (callback) callback({ success: false });
        return;
      }
      

    if (!playerHand || !playerHand.includes(card)) {
      io.to(socket.id).emit('error-message', 'You do not have this card.');
      if (callback) callback({ success: false });
      return;
    }
      

    // Enforce follow suit rule
    const trickSoFar = tricks[room] || [];
    if (trickSoFar.length > 0) {
      const trump = winningTrump[room];
      const leadSuit = parseCard(trickSoFar[0].card).suit;
    
      const isTrumpSuit = trump && trump !== 'high' && trump !== 'low';
      const sameColor = { H: 'D', D: 'H', S: 'C', C: 'S' };
    
      const getEffectiveSuit = (card) => {
        const { value, suit } = parseCard(card);
        if (isTrumpSuit && value === 'J') {
          if (suit === trump[0].toUpperCase()) return 'TRUMP'; // Right bower
          if (suit === sameColor[trump[0].toUpperCase()]) return 'TRUMP'; // Left bower
        }
        return isTrumpSuit && suit === trump[0].toUpperCase() ? 'TRUMP' : suit;
      };
    
      const requiredSuit = getEffectiveSuit(trickSoFar[0].card);
      const playedSuit = getEffectiveSuit(card);
    
      const hasRequiredSuit = playerHand.some(c => getEffectiveSuit(c) === requiredSuit);
    
      if (hasRequiredSuit && playedSuit !== requiredSuit) {
        io.to(socket.id).emit('error-message', `You must follow suit: ${requiredSuit}`);
        if (callback) callback({ success: false }); // 👈 let the front end know to not proceed
        return;
      }
      
    }    

    hands[room][socket.id] = playerHand.filter(c => c !== card);

    tricks[room] = tricks[room] || [];
    tricks[room].push({ id: socket.id, name: currentPlayer.name, card });
    if (callback) callback({ success: true });

    io.to(room).emit('trick-updated', tricks[room]);

    const expectedPlays = moonPlayer[room] ? 3 : 4;
    if (tricks[room].length === expectedPlays) {

      const trump = winningTrump[room];
      const leadSuit = parseCard(tricks[room][0].card).suit;

      let winningPlay = tricks[room][0];
      let highestPower = getCardPower(winningPlay.card, leadSuit, trump);

      for (let i = 1; i < tricks[room].length; i++) {
        const power = getCardPower(tricks[room][i].card, leadSuit, trump);
        if (power > highestPower) {
          winningPlay = tricks[room][i];
          highestPower = power;
        }
      }

      io.to(room).emit('trick-complete', {
        plays: tricks[room],
        winner: winningPlay,
        winnerId: winningPlay.id // 👈 this is what your front-end expects
      });
      

      if (!roundTricks[room]) {
        roundTricks[room] = { team1: 0, team2: 0 };
      }
      
      const team = players.findIndex(p => p.id === winningPlay.id) % 2 === 0 ? 'team1' : 'team2';
      roundTricks[room][team]++;
      
      const winnerIndex = players.findIndex(p => p.id === winningPlay.id);
      currentTurnIndex[room] = winnerIndex;
      tricks[room] = [];

      if (!roundTricks[room]) {
        roundTricks[room] = { team1: 0, team2: 0 };
      }
      
      const team = winnerIndex % 2 === 0 ? 'team1' : 'team2';
      roundTricks[room][team]++;
      
      // Check if the round is over (6 tricks total)
      const totalTricks = roundTricks[room].team1 + roundTricks[room].team2;
      if (totalTricks === 6) {
        const scores = { team1: 0, team2: 0 };
      
        const bid = bids[room].find(b => b.id === moonPlayer[room]) || bids[room].find(b => b.amount !== 0);
        const biddingIndex = players.findIndex(p => p.id === bid.id);
        const biddingTeam = biddingIndex % 2 === 0 ? 'team1' : 'team2';
        const opponentTeam = biddingTeam === 'team1' ? 'team2' : 'team1';
      
        const tricksWon = roundTricks[room][biddingTeam];
      
    if (bid.amount === 'moon') {
          if (tricksWon === 6) {
            scores[biddingTeam] += 4;
          } else {
            scores[opponentTeam] += 2;
          }
        } else {
          if (tricksWon === 6) {
            scores[biddingTeam] += 2;
          } else if (tricksWon >= bid.amount) {
            scores[biddingTeam] += 1;
          } else {
            scores[opponentTeam] += 2;
          }
        }
      
        io.to(room).emit('round-score', scores);
      
        // Reset for next round (optional)
        roundTricks[room] = { team1: 0, team2: 0 };
        moonPlayer[room] = null;
      }
      

      setTimeout(() => {
        io.to(players[winnerIndex].id).emit('your-turn-to-play');
      }, 1500);
    } else {
        let nextTurn = (turnIndex + 1) % 4;

        // Skip moon player's teammate if applicable
        if (moonPlayer[room]) {
          const moonIndex = players.findIndex(p => p.id === moonPlayer[room]);
          const teammateIndex = (moonIndex + 2) % 4;
          if (nextTurn === teammateIndex) {
            nextTurn = (nextTurn + 1) % 4;
          }
        }
        
        currentTurnIndex[room] = nextTurn;
        io.to(players[nextTurn].id).emit('your-turn-to-play');
    }
  });

  socket.on('disconnect', () => {
    for (const room in rooms) {
      rooms[room] = rooms[room].filter(p => p.id !== socket.id);
      io.to(room).emit('player-list', rooms[room]);
    }
    console.log('A user disconnected:', socket.id);
  });
});

server.listen(3001, () => {
  console.log('Socket.io server running on port 3001');
});
