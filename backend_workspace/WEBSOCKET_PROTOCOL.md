# WebSocket Protocol Reference

## 📡 Overview

All real-time communication between client and server uses **Socket.IO** over WebSockets. This document lists all messages and their payloads.

---

## 📤 Client → Server Events

### Room Management

#### `host` - Create a new room
**Sent by**: Lobby component
**Payload**:
```typescript
{
  name: string;      // Player name (max 50 chars)
  room: string;      // Room code (max 10 chars)
}
```
**Server Response**: `room-update`, `player-list`

**Example**:
```javascript
socket.emit('host', { name: 'Alice', room: 'GAME1' });
```

---

#### `join` - Join an existing room
**Sent by**: Lobby component
**Payload**:
```typescript
{
  name: string;      // Player name
  room: string;      // Room code to join
}
```
**Server Response**: `room-update`, `player-list`, `deal-hand` (if game starts)

**Validations**:
- Room must exist
- Room must have < 4 players
- Player name must be unique in room
- Name format validation

**Example**:
```javascript
socket.emit('join', { name: 'Bob', room: 'GAME1' });
```

---

#### `reconnect-player` - Reconnect after disconnect
**Sent by**: socket.ts on app load/reconnect
**Payload**:
```typescript
{
  name: string;      // Player name to find
  room: string;      // Room code
}
```
**Server Response**: `reconnected`, `player-list`, `deal-hand`, `current-turn`, etc.

**Validations**:
- Player must exist in room
- Room must exist

**Example**:
```javascript
socket.emit('reconnect-player', { name: 'Alice', room: 'GAME1' });
```

---

### Game Play Events

#### `submit-bid` - Place a bid
**Sent by**: BidPanel component
**Payload**:
```typescript
{
  amount: 0 | 3 | 4 | 5 | 6 | 'moon';  // Bid amount
  trump: 'high' | 'low' | 'hearts' | 'diamonds' | 'clubs' | 'spades';
  room: string;                         // Room code
}
```
**Server Response**: `bids-updated`, `bidding-complete` (if all bid), `current-turn`

**Validations**:
- Must be player's turn to bid
- Amount must be valid (0, 3-6, moon)
- Trump must be valid
- Not already bid in this round

**Example**:
```javascript
socket.emit('submit-bid', { 
  amount: 4, 
  trump: 'hearts', 
  room: 'GAME1' 
});
```

---

#### `play-card` - Play a card from hand
**Sent by**: Hand component (onClick)
**Payload**:
```typescript
{
  card: string;      // Card code (e.g., "9H", "10D", "JC", "AS")
  room: string;      // Room code
}
```
**Server Response**: `trick-updated`, `current-turn`, `score-update` (if hand complete)

**Validations**:
- Must be player's turn to play
- Card format must be valid
- Player must have card in hand
- Card must be legal move (suit following, trump rules)
- Not in bidding phase

**Example**:
```javascript
socket.emit('play-card', { card: '9H', room: 'GAME1' });
```

---

#### `add-bot` - Add a bot opponent
**Sent by**: Lobby component (button click)
**Payload**:
```typescript
{
  room: string;      // Room code
}
```
**Server Response**: `room-update`, `player-list`, `deal-hand` + bidding (if game starts)

**Example**:
```javascript
socket.emit('add-bot', { room: 'GAME1' });
```

---

## 📥 Server → Client Events

### Connection Events

#### `room-update` - Room status message
**Sent by**: Server (broadcast to room)
**Payload**:
```typescript
{
  message: string;   // Human-readable message
  room: string;      // Room code
}
```
**Example**:
```javascript
{ message: 'Alice joined room GAME1', room: 'GAME1' }
```

---

#### `player-list` - Updated player list
**Sent by**: Server (broadcast to room)
**Payload**:
```typescript
{
  []: {
    id: string;           // Socket ID
    name: string;         // Player name
    isBot?: boolean;      // True if AI player
  }[]
}
```
**Example**:
```javascript
[
  { id: 'socket-1', name: 'Alice', isBot: false },
  { id: 'socket-2', name: 'Bob', isBot: false },
  { id: 'bot-123', name: 'Bot Charlie', isBot: true }
]
```

---

#### `reconnected` - Confirmation of successful reconnection
**Sent by**: Server (to reconnected player)
**Payload**:
```typescript
{
  message: string;                           // Confirmation message
  gameState: {
    players: Player[];
    currentTurnId: string;
    teamScores: {team1: number, team2: number};
    isBidding: boolean;
    hand: Card[];
  };
}
```

---

#### `error` - Error response to invalid action
**Sent by**: Server (to player)
**Payload**:
```typescript
{
  message: string;   // Error description
}
```
**Examples**:
```javascript
{ message: 'Card 9H is not a valid move' }
{ message: 'Room is full (4 players maximum)' }
{ message: 'It is not your turn to bid' }
```

---

### Game State Events

#### `deal-hand` - Cards dealt to player
**Sent by**: Server (to individual player)
**Payload**:
```typescript
{
  cards: string[];   // Array of card codes (e.g., ["9H", "10D", "JC"])
  playerId: string;  // The player receiving the hand
}
```
**Example**:
```javascript
{ cards: ['9H', '10D', 'JC', 'QS', 'KH', 'AS'], playerId: 'socket-1' }
```

---

#### `bidding-started` - Bidding phase begins
**Sent by**: Server (broadcast to room)
**Payload**:
```typescript
{
  dealer: {
    id: string;          // Dealer's socket ID
    name: string;        // Dealer's name
  };
  bids: (Bid | null)[];  // 4 slots, one per player
}
```
**Example**:
```javascript
{
  dealer: { id: 'socket-2', name: 'Bob' },
  bids: [null, null, null, null]
}
```

---

#### `bids-updated` - A bid was placed
**Sent by**: Server (broadcast to room)
**Payload**:
```typescript
[
  {
    id: string;       // Player socket ID
    name: string;     // Player name
    amount: number | 'moon';
    trump: string;
  } | null
  // ... 4 slots total
]
```
**Example**:
```javascript
[
  { id: 'socket-1', name: 'Alice', amount: 3, trump: 'hearts' },
  null,
  null,
  null
]
```

---

#### `bidding-complete` - All bids finished, playing begins
**Sent by**: Server (broadcast to room)
**Payload**:
```typescript
{
  winner: {
    id: string;
    name: string;
    amount: number | 'moon';
    trump: string;
  };
  trump: string;      // The trump for this hand
}
```

---

#### `current-turn` - Whose turn is it (bid or play)
**Sent by**: Server (broadcast to room)
**Payload**:
```typescript
{
  playerId: string;             // Current player's socket ID
  validMoves?: string[];        // If playing phase (card codes)
}
```
**Example during bidding**:
```javascript
{ playerId: 'socket-3' }
```

**Example during playing**:
```javascript
{ 
  playerId: 'socket-1',
  validMoves: ['9H', '10D', 'JC']  // Can only play these
}
```

---

#### `your-turn-to-bid` - You should bid now
**Sent by**: Server (to specific player)
**Payload**: None (just a signal)

---

#### `your-turn-to-play` - You should play a card now
**Sent by**: Server (to specific player)
**Payload**: None (just a signal)

---

#### `trick-updated` - Cards in the current trick
**Sent by**: Server (broadcast to room)
**Payload**:
```typescript
{
  trick: [
    {
      id: string;   // Player socket ID who played
      card: string; // Card code (e.g., "9H")
    }
    // ... 0-4 cards
  ]
}
```
**Example**:
```javascript
{
  trick: [
    { id: 'socket-1', card: '9H' },
    { id: 'socket-2', card: '10D' },
    { id: 'socket-3', card: 'JC' }
  ]
}
```

---

#### `score-update` - Team scores updated
**Sent by**: Server (broadcast to room)
**Payload**:
```typescript
{
  team1: number;   // Team 1 (players 0 & 2) total score
  team2: number;   // Team 2 (players 1 & 3) total score
}
```
**Example**:
```javascript
{ team1: 5, team2: 3 }
```

---

## 🔄 Message Flow Examples

### Complete Game Sequence

```
1. User creates room:
   ┌─ emit 'host' {name: 'Alice', room: 'GAME1'}
   └─ receive 'room-update'
   └─ receive 'player-list' [Alice]

2. Second player joins:
   ┌─ emit 'join' {name: 'Bob', room: 'GAME1'}
   └─ receive 'room-update'
   └─ receive 'player-list' [Alice, Bob]

3. Bot added:
   ┌─ emit 'add-bot' {room: 'GAME1'}
   └─ receive 'room-update'
   └─ receive 'player-list' [Alice, Bob, Bot, ...]

4. Fourth player joins (game starts):
   ┌─ emit 'join' {name: 'Dave', room: 'GAME1'}
   └─ receive 'room-update'
   └─ receive 'player-list' [Alice, Bob, Bot, Dave]
   └─ receive 'deal-hand' [your 6 cards]
   └─ receive 'bidding-started'
   └─ receive 'current-turn' {playerId: '...', validMoves: []}

5. Players bid:
   ┌─ emit 'submit-bid' {amount: 0, trump: 'high', room: 'GAME1'}
   └─ receive 'bids-updated' [bid1, bid2, ...]
   └─ receive 'current-turn' {next player}
   ... repeat until all bid ...
   └─ receive 'bidding-complete'
   └─ receive 'current-turn' {first player, validMoves: [...]}

6. Players play cards:
   ┌─ emit 'play-card' {card: '9H', room: 'GAME1'}
   └─ receive 'trick-updated' {trick: [...]}
   └─ receive 'current-turn' {next player, validMoves: [...]}
   ... repeat 6 times (one per trick) ...

7. Hand complete:
   └─ receive 'score-update' {team1: X, team2: Y}
   └─ receive 'deal-hand' [new 6 cards]
   └─ receive 'bidding-started' (back to step 5)
```

---

## 🔗 Message Categories

### Authentication & Room
- `host`, `join`, `reconnect-player` → Room setup
- `room-update`, `player-list`, `reconnected` ← Room status

### Game Setup
- `deal-hand`, `bidding-started` ← Cards and phase

### Bidding
- `submit-bid` → Player action
- `bids-updated`, `bidding-complete` ← Server updates
- `current-turn`, `your-turn-to-bid` ← Turn notification

### Playing
- `play-card` → Player action
- `trick-updated` ← Trick status
- `current-turn`, `your-turn-to-play` ← Turn notification

### Scoring
- `score-update` ← Hand complete, scores updated

### Error Handling
- `error` ← Any validation failure

---

## 🔐 Security Considerations

### Player Identity
- Each Socket.IO connection has unique `socket.id`
- When player joins, their `socket.id` becomes their player ID
- Reconnection uses name + room to find original player

### Turn Order Validation
- Server validates `currentTurnId` before accepting moves
- Client cannot fake whose turn it is

### Card Validation
- Server validates card ownership and legal moves
- Client cannot play cards not in hand

### Room Isolation
- Messages broadcast only to room members
- No data leakage between games

---

## 📊 Message Frequency

During a complete hand (bidding + 6 tricks):
- **Broadcast to all**: ~20+ messages (state updates)
- **To individual**: ~10+ messages (hands, turn notifications)
- **Total**: ~30-40 socket.io emissions

During reconnection:
- **To reconnected player**: 5-10 messages (state recovery)

---

## 🚀 Best Practices

### Client Side
1. Always handle `error` events
2. Store recent `validMoves` locally
3. Cache `player-list` for display
4. Debounce rapid card plays (prevent double-click)

### Server Side
1. Validate every message before processing
2. Emit to specific player or room, not broadcast all
3. Include timestamps in state updates (future: replay system)
4. Log important state transitions

---

**Last Updated**: November 2, 2025
