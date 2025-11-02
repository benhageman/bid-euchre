# System Architecture

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ React Components (Game, Lobby, Hand, etc.)           │   │
│  │ ↓                                                     │   │
│  │ Redux Store (gameSlice, playerSlice, etc.)           │   │
│  └──────────────────────────────────────────────────────┘   │
│                      ↑                  ↓                     │
│            Socket.IO Client (socket.ts)                      │
│                      ↑                  ↓                     │
├──────────────────────────────────────────────────────────────┤
│                    WEBSOCKET (Socket.IO)                     │
│  Messages: host, join, submit-bid, play-card, reconnect     │
├──────────────────────────────────────────────────────────────┤
│                   BACKEND (NestJS)                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ GameGateway (WebSocket Event Handlers)               │   │
│  │  - handleHost, handleJoin, handleBid, etc.           │   │
│  └──────────────────────────────────────────────────────┘   │
│                      ↓                                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ ValidationService (Input Validation)                 │   │
│  │  - Validates all incoming actions                    │   │
│  └──────────────────────────────────────────────────────┘   │
│                      ↓                                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ GameStateService (State Management)                  │   │
│  │  - Manages rooms & game state                        │   │
│  └──────────────────────────────────────────────────────┘   │
│                      ↓                                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ GameService (Game Logic)                             │   │
│  │  - Deck operations, tricks, scoring                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                      ↓                                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ BotService (AI Decisions)                            │   │
│  │  - Bot bids & card play logic                        │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow - A Complete Game Move

### 1. Player Plays a Card

```
Frontend                        Backend
┌─────────────────────┐        ┌──────────────────────────────┐
│                     │        │                              │
│ User clicks card    │──────→ │ Socket.IO: 'play-card'       │
│ in Hand component   │        │                              │
│                     │        │ GameGateway.handlePlayCard() │
│                     │        │        ↓                     │
│                     │        │ ValidationService checks:    │
│                     │        │  - Room exists?              │
│                     │        │  - Player in room?           │
│                     │        │  - Valid card?               │
│                     │        │  - Legal move?               │
│                     │        │        ↓                     │
│                     │        │ GameStateService.playCard()  │
│                     │        │  - Remove from hand          │
│                     │        │  - Add to trick              │
│                     │        │  - Check trick complete?     │
│                     │        │  - Evaluate if needed        │
│                     │        │        ↓                     │
│ trick-updated ←──── │ ←──── │ Socket.IO: 'trick-updated'   │
│ event received      │        │ (broadcast to all players)   │
│                     │        │                              │
│ Update Redux store  │        │ Check next turn:             │
│ Re-render Trick     │        │  - Is bot's turn? Play auto  │
│ component           │        │  - Is human's turn? Wait     │
└─────────────────────┘        └──────────────────────────────┘
```

### 2. Message Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Client sends 'play-card' with { room, card, playerId }   │
└────────────────┬────────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Server receives in GameGateway.handlePlayCard()          │
└────────────────┬────────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. ValidationService validates the move                     │
│    Returns { valid: true } or { valid: false, error: "..." }│
└────────────────┬────────────────────────────────────────────┘
                 ↓ (if valid)
┌─────────────────────────────────────────────────────────────┐
│ 4. GameStateService.playCard() updates game state           │
│    - Removes card from player's hand                        │
│    - Adds card to current trick                             │
│    - May evaluate trick if now complete (4 cards)           │
│    - May start new hand if all 6 tricks complete            │
└────────────────┬────────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Server emits 'trick-updated' to all clients              │
│    { trick: [card, card, card, card] }                      │
│                                                              │
│    Server emits 'current-turn' to next player                │
│    { playerId: "...", validMoves: ["9H", "10C", ...] }      │
└────────────────┬────────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. All clients receive updates and re-render                │
│    Redux actions dispatched:                                │
│    - updateTrick(trick)                                     │
│    - updateCurrentTurn(playerId, validMoves)                │
│    - updateHand(newHand) [for current player]               │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔄 Architecture Layers

### Layer 1: WebSocket Gateway (game.gateway.ts)
**Responsibility**: Handle incoming Socket.IO events
- Entry point for all client actions
- Calls validation and game services
- Emits responses back to clients
- Manages bot automation

**Key Methods**:
- `handleHost()` - Creates room
- `handleJoin()` - Adds player to room
- `handleBid()` - Submits bid
- `handlePlayCard()` - Plays card
- `processBotBids()` - Automates bot bidding
- `processBotPlays()` - Automates bot card play

### Layer 2: Validation Service (validation.service.ts)
**Responsibility**: Validate all incoming actions
- Checks room/player existence
- Validates move legality
- Validates data formats
- Returns descriptive errors

**Key Methods**:
- `validateCardPlay()` - Is card move legal?
- `validateBid()` - Is bid amount/trump valid?
- `validateBidTurn()` - Is it this player's turn?
- `validatePlayerHasCard()` - Does player own card?

### Layer 3: Game State Service (game-state.service.ts)
**Responsibility**: Manage game state across rooms
- Creates and stores Room objects
- Manages room lifecycle
- Coordinates with GameService for logic
- Maintains current turn and trick state

**Key Methods**:
- `createRoom()` - Initialize new room
- `startGame()` - Deal cards, begin bidding
- `submitBid()` - Process bid, detect bidding complete
- `playCard()` - Execute card play, check for trick completion
- `getValidMoves()` - Get available moves for player

### Layer 4: Game Service (game.service.ts)
**Responsibility**: Pure game logic implementation
- Deck operations (create, shuffle, deal)
- Card logic (trump handling, bowers)
- Trick evaluation (winner determination)
- Scoring calculations

**Key Methods**:
- `createDeck()` - Build 24-card deck
- `getValidMoves()` - Determine legal card plays
- `evaluateTrick()` - Determine trick winner
- `calculateHandScore()` - Score the hand

### Layer 5: Bot Service (bot.service.ts)
**Responsibility**: AI decision-making
- Bot bidding strategy
- Bot card play strategy
- Bot logic is transparent (not hidden)

**Key Methods**:
- `decideBid()` - What should bot bid?
- `decideCard()` - Which card should bot play?

---

## 🗄️ Data Structures

### Room
```typescript
interface Room {
  id: string;           // "A", "B", etc.
  host: string;         // Player socket ID
  gameState: GameState;
}
```

### GameState
```typescript
interface GameState {
  players: Player[];           // Always 4
  dealerIndex: number;         // 0-3
  currentTurnId: string;       // Whose turn
  hands: {[playerId]: Card[]};  // Player hands
  trick: PlayedCard[];         // 0-4 cards in current trick
  tricksWon: {[playerId]: number}; // Tricks won this hand
  bids: (Bid | null)[];        // 4 bid slots
  winningBid: Bid | null;      // The winning bid
  gameStarted: boolean;
  isBidding: boolean;          // Phase of game
  teamScores: {team1: number, team2: number};
}
```

### Bid
```typescript
interface Bid {
  id: string;                  // Player socket ID
  name: string;                // Player name
  amount: 0 | 3 | 4 | 5 | 6 | 'moon';
  trump: Trump;
}
```

### Card & PlayedCard
```typescript
interface Card {
  value: '9' | '10' | 'J' | 'Q' | 'K' | 'A';
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
}

interface PlayedCard extends Card {
  playerId: string;
}
```

---

## 🚦 Game Phases

### 1. Lobby Phase
- Players join/leave rooms
- No game state

### 2. Dealing Phase
- Deck shuffled and cards dealt
- Players receive 6 cards each

### 3. Bidding Phase
- Players in turn order place bids
- Pass (0) or bid (3-6 tricks, 'moon')
- Specify trump suit or 'high'/'low'
- Bidding complete when highest bid established

### 4. Playing Phase
- First player after bidder leads
- Follow suit if possible, otherwise any card
- Trump requirements for trump suits
- Evaluate each trick after 4 cards played
- Award trick to winner (highest card of led suit or trump)

### 5. Scoring Phase
- Calculate points for hand
- Update team scores
- Return to Dealing Phase for new hand

---

## 🔌 Key Integration Points

### Frontend ↔ Backend (Socket.IO)
**Defined in**: `socket.ts` (client) and `game.gateway.ts` (server)

Events flow:
```
Client → Server          Server → Client
━━━━━━━━━━━━━            ━━━━━━━━━━━━━
host                     room-update
join                     player-list
reconnect-player         deal-hand
submit-bid               bidding-started
add-bot                  bidding-complete
play-card                bids-updated
                         current-turn
                         trick-updated
                         score-update
                         error
```

### State Management (Redux on Frontend)
**Defined in**: `gameSlice.ts`

Actions:
- `setPlayers()` - Update player list
- `setGameStarted()` - Game started flag
- `setHand()` - Player's cards
- `updateTrick()` - Current trick display
- `updateCurrentTurn()` - Whose turn
- `updateBids()` - Bid display
- `updateScores()` - Score display

---

## 🛠️ Adding New Features

### Example: Adding a Chat System

1. **Update Data Structures**
   - Add `messages: ChatMessage[]` to GameState
   - Define `ChatMessage` interface

2. **Add Gateway Handler** (game.gateway.ts)
   ```typescript
   @SubscribeMessage('send-message')
   handleMessage(@ConnectedSocket() client: Socket, @MessageBody() data) {
     // Validate message
     // Add to gameState.messages
     // Emit 'message-received' to room
   }
   ```

3. **Add Validation** (validation.service.ts)
   ```typescript
   validateMessage(message: string): ValidationResult {
     // Check length, content, etc.
   }
   ```

4. **Update Frontend** (socket.ts)
   ```typescript
   socket.on('message-received', (message) => {
     dispatch(addMessage(message));
   });
   ```

5. **Add UI Component**
   - Create ChatBox.tsx
   - Dispatch `send-message` on submit
   - Display messages from Redux store

6. **Write Tests** (game.service.spec.ts)
   - Test message validation
   - Test message ordering

---

## ⚡ Performance Considerations

### Current Optimizations
- ✅ Game logic cached in memory (no database)
- ✅ Validation before expensive operations
- ✅ Lazy evaluation of valid moves
- ✅ WebSocket for low-latency updates

### Potential Bottlenecks
- Large number of concurrent rooms
- Long-running games (many tricks)
- Complex bot decision-making

### Scalability Strategy
- If server overloaded: Use room load balancing
- If computation heavy: Pre-calculate bot decisions
- If many connections: Use Redis for session store

---

## 🔐 Security Architecture

### Input Validation
- **Every incoming action validated** at gateway level
- Type checking with class-validator DTOs
- Range/format validation in ValidationService

### State Protection
- Game state never sent directly to clients (broadcast safe)
- Player hands only sent to owning player
- Valid moves calculated server-side, not trusted from client

### Authorization
- Player ID verified via Socket.IO connection
- Turn order enforced server-side
- Room membership verified for all actions

---

## 🧪 Testing Strategy

### Unit Tests
- GameService: Game logic in isolation
- ValidationService: All validation rules
- BotService: Bot decision-making

### Integration Tests (Planned)
- Full game flow through gateway
- Reconnection scenarios
- Error handling

### Manual Testing Checklist
- All 4 players joined and playing
- Disconnection and reconnection
- Bot opponents playing correctly
- Invalid moves rejected
- Scoring calculated correctly

---

## 📈 Monitoring & Debugging

### Key Debug Points
- Server console: Game state changes logged
- Redux DevTools: Client state history
- Socket.IO debug: Message logging available
- Browser console: Client-side errors

### Common Issues & Solutions
See [DEBUGGING.md](./DEBUGGING.md)

---

**Last Updated**: November 2, 2025
