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
const totalScores = {}; // room => { team1: number, team2: number }
const teamScores = {}; // room => { team1: number, team2: number }

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
  if (trump === 'low') return 1;
  if (['clubs', 'diamonds', 'hearts', 'spades'].includes(trump)) return 2;
  if (trump === 'high') return 3;
  return 0;
}

function handleNextTurn(room) {
  const players = rooms[room];
  let turnIndex = currentTurnIndex[room];

  // Skip moon teammate if needed
  if (moonPlayer[room]) {
    const moonIndex = players.findIndex(p => p.id === moonPlayer[room]);
    const teammateIndex = (moonIndex + 2) % 4;
    if (turnIndex === teammateIndex) {
      turnIndex = (turnIndex + 1) % 4;
      currentTurnIndex[room] = turnIndex;
    }
  }

  const currentPlayer = players[turnIndex];
  const hand = hands[room]?.[currentPlayer.id];
  const trickSoFar = tricks[room] || [];

  // ✅ Announce current turn
  io.to(room).emit('current-turn', currentPlayer.id);
  console.log('🔧 Starting server...');

  // 🚫 DO NOT auto-play for the first player (they can lead anything)
  if (trickSoFar.length === 0) {
    io.to(currentPlayer.id).emit('your-turn-to-play');
    return;
  }

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
  const matchingCards = hand.filter((c) => getEffectiveSuit(c) === requiredSuit);

  // // ✅ Auto-play only if exactly one matching card is available
  // if (matchingCards.length === 1) {
  //   const card = matchingCards[0];
  //   console.log(`Auto-playing ${card} for ${currentPlayer.name}`);
    
  //   // Notify room
  //   io.to(room).emit('room-update', {
  //     message: `${currentPlayer.name} auto-played ${card}`,
  //     room
  //   });

  //   // Update hand
  //   hands[room][currentPlayer.id] = hand.filter(c => c !== card);
  //   io.to(currentPlayer.id).emit('deal-hand', hands[room][currentPlayer.id]);

  //   // Add to trick
  //   tricks[room] = tricks[room] || [];
  //   tricks[room].push({ id: currentPlayer.id, name: currentPlayer.name, card });

  //   // Notify all clients of updated trick
  //   io.to(room).emit('trick-updated', tricks[room]);
  //   console.log(`Auto play function 1`);
  //   // Return to allow play-card logic to handle end-of-trick or next player
  //   return;
  // }

  // 🟡 Let the player choose a card
  io.to(currentPlayer.id).emit('your-turn-to-play');
}



function isBetterBid(newBid, currentBid) {
  if (!currentBid) return true;

  // Moon always wins
  if (newBid.amount === 'moon') return true;
  if (currentBid.amount === 'moon') return false;

  const newAmt = newBid.amount;
  const curAmt = currentBid.amount;
  const newTrump = newBid.trump;
  const curTrump = currentBid.trump;

  // If new bid has higher number
  if (typeof newAmt === "number" && typeof curAmt === "number") {
    if (newAmt > curAmt) return true;

    // Same amount
    if (newAmt === curAmt) {
      // "high" can always upbid
      if (newTrump === "high" && curTrump !== "high") return true;

      // suit can beat "low"
      const suits = ["spades", "hearts", "diamonds", "clubs"];
      if (suits.includes(newTrump) && curTrump === "low") return true;

      // everything else = invalid upbid
      return false;
    }

    return false;
  }

  return false;
}


function sortHand(hand) {
  const suitColors = {
    H: 'red',
    D: 'red',
    S: 'black',
    C: 'black'
  };

  const cardRank = {
    A: 0,
    K: 1,
    Q: 2,
    J: 3,
    '10': 4,
    '9': 5
  };

  const suitGroups = {
    H: [],
    D: [],
    S: [],
    C: []
  };

  hand.forEach(card => {
    const value = card.slice(0, -1);
    const suit = card.slice(-1);
    suitGroups[suit].push({ card, rank: cardRank[value] });
  });

  for (const suit in suitGroups) {
    suitGroups[suit].sort((a, b) => a.rank - b.rank);
  }

  // Alternate red-black
  const suits = ['H', 'D', 'S', 'C'];
  const presentSuits = suits.filter(s => suitGroups[s].length > 0);

  const redSuits = presentSuits.filter(s => suitColors[s] === 'red');
  const blackSuits = presentSuits.filter(s => suitColors[s] === 'black');

  const orderedSuits = [];
  while (redSuits.length || blackSuits.length) {
    if (redSuits.length) orderedSuits.push(redSuits.shift());
    if (blackSuits.length) orderedSuits.push(blackSuits.shift());
  }

  // Flatten the sorted hand
  const sortedHand = orderedSuits.flatMap(suit => suitGroups[suit].map(c => c.card));

  return sortedHand;
}
  

  function startGame(room) {
  console.log(`🎮 startGame called for room ${room}`);
  bids[room] = [null, null, null, null];
  const players = rooms[room];
  if (!players || players.length !== 4) return;

  const deck = [...fullDeck];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  hands[room] = {};
  players.forEach((player, index) => {
  const hand = deck.slice(index * 6, (index + 1) * 6);
  const sortedHand = sortHand(hand); // 🔁 Sort it here
  hands[room][player.id] = sortedHand;
  io.to(player.id).emit('deal-hand', sortedHand);
  });

  io.to(room).emit('game-started');

  dealerIndex[room] = (dealerIndex[room] || 0) % 4;
  const firstBidderIndex = (dealerIndex[room] + 1) % 4;
  bidTurnIndex[room] = firstBidderIndex;
  bids[room] = [null, null, null, null];

  io.to(room).emit('bidding-started', {
    dealer: players[dealerIndex[room]],
    bids: bids[room]
  });
  console.log("🔥 Bidding started", {
    dealer: players[dealerIndex[room]],
    bids: bids[room]
  });

  io.to(players[firstBidderIndex].id).emit('your-turn-to-bid');
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

    if (rooms[room].length === 4) {
      setTimeout(() => {
        io.to(room).emit('room-update', { message: 'All players joined. Starting game...', room });
        startGame(room);
      }, 300); // slight delay ensures client UI sync
    }

  });

  socket.on('get-player-list', (room) => {
    if (rooms[room]) {
      io.to(socket.id).emit('player-list', rooms[room]);
    }
  });

  socket.on('start-game', (room) => {
    startGame(room);
  });


  socket.on('submit-bid', ({ room, amount, trump }) => {
    const players = rooms[room];
    const turnIndex = bidTurnIndex[room];
    const currentPlayer = players[turnIndex];
    console.log(`📨 Received bid from ${socket.id} (${currentPlayer?.name}) — amount: ${amount}, trump: ${trump}`);
    console.log(`Current bids for room ${room}:`, bids[room]);

    const newBid = {
        id: currentPlayer.id,
        name: currentPlayer.name,
        amount: amount === 'moon' ? 'moon' : Number(amount),
        trump
    };
    bids[room][turnIndex] = newBid;
    io.to(room).emit('bids-updated', bids[room]);

    if (bids[room].filter(b => b !== null).length >= 4) {
      console.log('✅ All bids in. Ending bidding phase...');
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
        handleNextTurn(room);
      }
      
    } else {
      bidTurnIndex[room] = (turnIndex + 1) % 4;
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
      const validCards = playerHand.filter(c => getEffectiveSuit(c) === requiredSuit);

      if (validCards.length > 0 && getEffectiveSuit(card) !== requiredSuit) {
        io.to(socket.id).emit('error-message', `You must follow suit: ${requiredSuit}`);
        if (callback) callback({ success: false });
        return;
      }

      // 👇 NEW: Auto-play the only valid card if there's just one option
      // if (validCards.length === 1 && getEffectiveSuit(card) !== requiredSuit) {
      //   const autoCard = validCards[0];
      //   card = autoCard;
      //       console.log(`Auto play function 2`);

      // }
    }


    hands[room][socket.id] = playerHand.filter(c => c !== card);
    io.to(socket.id).emit('deal-hand', hands[room][socket.id]); // <-- update client hand


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
      
      // Check if the round is over (6 tricks total)
      const totalTricks = roundTricks[room].team1 + roundTricks[room].team2;
      if (totalTricks === 6) {
        // Scoring logic
        const scores = { team1: 0, team2: 0 };
        const bid = bids[room].find(b => b.amount !== 0);
        const biddingPlayerId = moonPlayer[room] || bid?.id;
        const biddingIndex = players.findIndex(p => p.id === biddingPlayerId);
        const biddingTeam = biddingIndex % 2 === 0 ? 'team1' : 'team2';
        const opponentTeam = biddingTeam === 'team1' ? 'team2' : 'team1';
        const tricksWon = roundTricks[room][biddingTeam];

        // Apply rules
        if (moonPlayer[room]) {
          if (tricksWon === 6) {
            scores[biddingTeam] += 4;
          } else {
            scores[opponentTeam] += 2;
          }
        } else if (bid) {
          if (tricksWon === 6) {
            scores[biddingTeam] += 2;
          } else if (tricksWon >= bid.amount) {
            scores[biddingTeam] += 1;
          } else {
            scores[opponentTeam] += 2;
          }
        }

        // Initialize if not present
        if (!teamScores[room]) {
          teamScores[room] = { team1: 0, team2: 0 };
        }

        // Add round points to total scores
        teamScores[room].team1 += scores.team1;
        teamScores[room].team2 += scores.team2;

        // Send updated total scores to clients
        io.to(room).emit('score-update', teamScores[room]);

        // Reset for next round
        roundTricks[room] = { team1: 0, team2: 0 };
        moonPlayer[room] = null;

        // Rotate dealer
        dealerIndex[room] = ((dealerIndex[room] || 0) + 1) % 4;
        const dealer = players[dealerIndex[room]];
        const firstBidderIndex = (dealerIndex[room] + 1) % 4;
        bidTurnIndex[room] = firstBidderIndex;
        bids[room] = [null, null, null, null];
        tricks[room] = [];
        roundTricks[room] = { team1: 0, team2: 0 };
        moonPlayer[room] = null;
        winningTrump[room] = null;

        // Shuffle and deal new hands
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

        // Start new bidding phase
        io.to(room).emit('bidding-started', {
          dealer,
          bids: bids[room]
        });
        io.to(players[firstBidderIndex].id).emit('your-turn-to-bid');
      }
      

      setTimeout(() => {
        handleNextTurn(room);
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
        handleNextTurn(room);
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
