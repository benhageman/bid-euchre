# Reconnection & State Recovery System

## 🔄 Overview

The reconnection system allows players to regain connectivity after accidental disconnects or page refreshes without losing their game state.

**Key Features**:
- ✅ Automatic reconnection attempts (10 tries, exponential backoff)
- ✅ Player state persistence (localStorage)
- ✅ Game state transfer on reconnect
- ✅ 30-second grace period before player removal
- ✅ Connection status indicator UI

---

## 🏗️ Architecture

### Three-Part System

```
┌─────────────────────────────────────────────────────┐
│ Part 1: CLIENT PERSISTENCE LAYER (localStorage)     │
│ - Stores: Player name, room code                    │
│ - Survives: Page refresh, browser restart           │
├─────────────────────────────────────────────────────┤
│ Part 2: CLIENT RECONNECTION LAYER (socket.ts)       │
│ - Auto-reconnect with exponential backoff           │
│ - Loads persisted player info from localStorage     │
│ - Emits 'reconnect-player' to server                │
├─────────────────────────────────────────────────────┤
│ Part 3: SERVER STATE RECOVERY (game.gateway.ts)     │
│ - Marks disconnect with grace period (30 sec)       │
│ - Transfers state on reconnect                      │
│ - Preserves hands, tricks, bids, scores             │
└─────────────────────────────────────────────────────┘
```

---

## 🖥️ Client-Side Implementation

### Part 1: Persistence Layer (localStorage)

**File**: `packages/@bid-euchre/client/src/api/socket.ts`

#### Save State to Browser
```typescript
function saveState(name: string, room: string) {
  localStorage.setItem('playerName', name);
  localStorage.setItem('roomCode', room);
}
```

**When called**:
- After hosting a room
- After joining a room

**What's saved**:
- Player name (used for reconnection)
- Room code (which game to rejoin)

#### Load State from Browser
```typescript
function loadPersistedState() {
  const name = localStorage.getItem('playerName');
  const room = localStorage.getItem('roomCode');
  return { name, room };
}
```

**When called**:
- On app startup (in socket.ts constructor)
- After page refresh

**What's restored**:
- Player identity for reconnection
- Room code for reconnection

#### Clear State
```typescript
function clearPersistedState() {
  localStorage.removeItem('playerName');
  localStorage.removeItem('roomCode');
}
```

**When called**:
- After player leaves game
- After successful connection to confirm reconnection

---

### Part 2: Automatic Reconnection (socket.ts)

#### Socket Configuration
```typescript
const socket = io(serverURL, {
  reconnection: true,
  reconnectionDelay: 1000,           // Start wait 1 second
  reconnectionDelayMax: 5000,         // Max wait 5 seconds
  reconnectionAttempts: 10,           // Try 10 times
});
```

**Strategy**: Exponential backoff
- Attempt 1: Wait 1s
- Attempt 2: Wait 2s
- Attempt 3: Wait 4s
- Attempt 4: Wait 5s (capped)
- Attempt 5: Wait 5s
- ... up to 10 attempts total

**Time calculation**:
```
Base delay: 1000ms
Max delay: 5000ms
Total attempts: 10
Max total time: ~1s + 2s + 3s + 4s + 5s + 5s + 5s + 5s + 5s + 5s ≈ 40 seconds
```

#### Connection Listeners

**On disconnect** (socket.ts):
```typescript
socket.on('disconnect', (reason) => {
  // Update Redux: connection = false
  // Show red disconnection indicator
  // Start attempting reconnection automatically
});
```

**On reconnect attempt** (socket.ts):
```typescript
socket.on('reconnect_attempt', () => {
  // Update Redux: connection = 'reconnecting'
  // Show yellow pulsing indicator
});
```

**On successful reconnect** (socket.ts):
```typescript
socket.on('connect', () => {
  // If persisted state exists:
  //   1. Load player name + room from localStorage
  //   2. Emit 'reconnect-player' to server
  //   3. Wait for 'reconnected' confirmation
  //   4. Update Redux: connection = true
  //   5. Show green connected indicator
});
```

#### Reconnection Trigger
```typescript
// In socket.ts on connection
function setupConnectionListeners() {
  socket.on('connect', () => {
    const { name, room } = loadPersistedState();
    
    if (name && room) {
      // We were playing before - try to rejoin
      socket.emit('reconnect-player', { name, room });
    }
  });
  
  socket.on('reconnected', (data) => {
    // Successfully reconnected!
    clearPersistedState(); // Clear after successful reconnect
    // Redux is updated by 'reconnected' handler
  });
}
```

---

## 🖧 Server-Side Implementation

### Part 3: State Recovery (game.gateway.ts)

#### On Disconnect: Mark Player as Disconnected

**File**: `packages/@bid-euchre/server/src/game/game.gateway.ts`

```typescript
handleDisconnect(client: Socket) {
  // Find player in all rooms
  // Mark as "disconnected-{playerName}" instead of removing
  // Save hand and tricks under this marker
  // Set 30-second timeout for removal
}
```

**Key actions**:

1. **Find the player**:
   ```typescript
   const playerIndex = room.gameState.players.findIndex(p => p.id === client.id);
   if (playerIndex !== -1) {
     const playerName = room.gameState.players[playerIndex].name;
     const disconnectedMarker = `disconnected-${playerName}`;
     
     // Mark player as disconnected
     room.gameState.players[playerIndex].id = disconnectedMarker;
   }
   ```

2. **Save state under marker**:
   ```typescript
   // Save hand so player gets same cards when reconnecting
   if (room.gameState.hands[oldSocketId]) {
     room.gameState.hands[disconnectedMarker] = room.gameState.hands[oldSocketId];
     delete room.gameState.hands[oldSocketId];
   }
   
   // Save tricks won this hand
   if (room.gameState.tricksWon[oldSocketId]) {
     room.gameState.tricksWon[disconnectedMarker] = room.gameState.tricksWon[oldSocketId];
     delete room.gameState.tricksWon[oldSocketId];
   }
   ```

3. **Broadcast to room**:
   ```typescript
   this.server.to(roomId).emit('room-update', {
     message: `${playerName} disconnected. Game paused.`,
     room: roomId
   });
   ```

4. **Set grace period timer**:
   ```typescript
   setTimeout(() => {
     const currentRoom = this.gameStateService.getRoom(roomId);
     if (currentRoom) {
       const stillDisconnected = currentRoom.gameState.players.find(
         p => p.id === disconnectedMarker
       );
       
       if (stillDisconnected) {
         // Player didn't reconnect - remove them
         this.gameStateService.removePlayerFromRoom(roomId, disconnectedMarker);
       }
     }
   }, 30000); // 30 seconds
   ```

#### On Reconnect: Transfer State Back

**File**: `packages/@bid-euchre/server/src/game/game.gateway.ts`

```typescript
@SubscribeMessage('reconnect-player')
handleReconnect(@ConnectedSocket() client: Socket, @MessageBody() data: ReconnectPlayerDto)
```

**Key actions**:

1. **Find the disconnected player marker**:
   ```typescript
   const disconnectedMarker = `disconnected-${data.name}`;
   const playerIndex = room.gameState.players.findIndex(
     p => p.id === disconnectedMarker
   );
   ```

2. **Transfer hand from marker to new socket ID**:
   ```typescript
   if (room.gameState.hands[disconnectedMarker]) {
     room.gameState.hands[client.id] = room.gameState.hands[disconnectedMarker];
     delete room.gameState.hands[disconnectedMarker];
   }
   ```

3. **Transfer tricks won**:
   ```typescript
   if (room.gameState.tricksWon[disconnectedMarker]) {
     room.gameState.tricksWon[client.id] = room.gameState.tricksWon[disconnectedMarker];
     delete room.gameState.tricksWon[disconnectedMarker];
   }
   ```

4. **Update player record with new socket ID**:
   ```typescript
   player.id = client.id;
   ```

5. **Update all references to old ID in game state**:
   ```typescript
   // Update current turn if it was this player
   if (room.gameState.currentTurnId === disconnectedMarker) {
     room.gameState.currentTurnId = client.id;
   }
   
   // Update trick cards if player played
   room.gameState.trick = room.gameState.trick.map(card =>
     card.playerId === disconnectedMarker 
       ? { ...card, playerId: client.id }
       : card
   );
   
   // Update winning bid if it was this player
   if (room.gameState.winningBid?.id === disconnectedMarker) {
     room.gameState.winningBid.id = client.id;
   }
   ```

6. **Emit state recovery to reconnected player**:
   ```typescript
   // Send full game state
   this.server.to(client.id).emit('reconnected', {
     message: 'Successfully reconnected',
     gameState: { /* full state */ }
   });
   
   // Restore hand
   this.server.to(client.id).emit('deal-hand', {
     cards: room.gameState.hands[client.id].map(c => `${c.value}${c.suit.charAt(0).toUpperCase()}`),
     playerId: client.id
   });
   
   // Restore current trick
   if (room.gameState.trick.length > 0) {
     this.server.to(client.id).emit('trick-updated', { /* trick */ });
   }
   
   // Restore current turn
   if (room.gameState.currentTurnId) {
     this.server.to(client.id).emit('current-turn', { /* turn info */ });
   }
   ```

7. **Broadcast to room that player returned**:
   ```typescript
   this.server.to(data.room).emit('room-update', {
     message: `${data.name} reconnected`,
     room: data.room
   });
   ```

---

## 🎬 Complete Reconnection Flow

### Scenario: Player Loses WiFi

```
┌─ DISCONNECT EVENT ─────────────────────────────────────────┐
│                                                              │
│ 1. Client (browser)                                         │
│    └─ Socket disconnects                                    │
│    └─ localStorage still has: name='Alice', room='GAME1'    │
│    └─ Connection status UI: RED with "Reconnecting..."      │
│                                                              │
│ 2. Server                                                    │
│    └─ handleDisconnect() called                             │
│    └─ Player marked: "disconnected-Alice"                   │
│    └─ Hand saved under marker                               │
│    └─ 30-second timer started                               │
│    └─ All players notified: "Alice disconnected"            │
│                                                              │
└────────────────────────────────────────────────────────────┘

          ⏳ GRACE PERIOD (up to 30 seconds)
          
            Player can:
            - Manually refresh page
            - Wait for auto-reconnection
            - Walk away (removed after 30s)

┌─ RECONNECTION EVENT ───────────────────────────────────────┐
│                                                              │
│ 1. Client reconnects (WiFi restored or app reloaded)       │
│    └─ Socket.IO auto-reconnection OR new connection        │
│    └─ loadPersistedState() gets: name='Alice', room='G1'   │
│    └─ Emits: 'reconnect-player' with name & room           │
│    └─ Connection status UI: YELLOW with "Reconnecting..."  │
│                                                              │
│ 2. Server receives 'reconnect-player'                       │
│    └─ handleReconnect() called                              │
│    └─ Finds "disconnected-Alice" player marker              │
│    └─ Transfers hand from marker → new socket ID            │
│    └─ Transfers tricks from marker → new socket ID          │
│    └─ Updates player.id to new socket ID                    │
│    └─ Updates all state references                          │
│    └─ Cancels 30-second removal timer                       │
│    └─ Emits 'reconnected' + state recovery messages         │
│    └─ All players notified: "Alice reconnected"             │
│                                                              │
│ 3. Client receives reconnection confirmation               │
│    └─ Redux updated with full game state                   │
│    └─ Hand restored to Hand component                       │
│    └─ Current trick displayed                               │
│    └─ Connection status UI: GREEN with "Connected"          │
│    └─ localStorage cleared (job done)                       │
│                                                              │
│ 4. Game continues                                           │
│    └─ If Alice's turn: UI shows valid moves                 │
│    └─ Other players continue playing (auto-bot plays)       │
│    └─ Alice can now play their cards                        │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

---

## 🧪 Test Scenarios

### Scenario 1: Page Refresh During Playing
1. Player in middle of game
2. Press F5 or Ctrl+R to refresh
3. App reloads, socket.ts loads persisted state
4. Auto-reconnects to server
5. Server transfers hand + game state
6. Game continues where it left off
✅ **Expected**: Player sees same hand, same turn order

### Scenario 2: WiFi Dropout and Recovery
1. Player loses internet connection
2. No connection for 5 seconds
3. WiFi comes back
4. Socket.IO auto-reconnects (exponential backoff)
5. Server recovers player state
6. Game resumes
✅ **Expected**: Seamless reconnection, game continues

### Scenario 3: Timeout (No Reconnect)
1. Player loses internet connection
2. Doesn't reconnect for 35 seconds
3. Server removes player from game after 30s
4. Other players get message: "Alice has left the game"
5. Game continues with 3 players
✅ **Expected**: Player removed cleanly

### Scenario 4: Rapid Disconnect/Reconnect
1. Player disconnects
2. Reconnects within 1 second
3. Server hasn't started removal timer yet
✅ **Expected**: Seamless, no player removal

### Scenario 5: Multiple Disconnects
1. Player 1 disconnects
2. Player 2 disconnects
3. Both are within 30-second window
4. Player 1 reconnects (state restored)
5. Player 2 is removed after 30s
✅ **Expected**: Both handled independently

---

## 📊 State Preserved on Disconnect

### What's Saved
- ✅ Player hand (cards held)
- ✅ Tricks won this hand
- ✅ Current bid (if bidding phase)
- ✅ Turn order
- ✅ Current trick (4 cards played)
- ✅ Team scores
- ✅ Game phase (bidding vs playing)

### What's NOT Saved (Lost)
- ❌ Exact millisecond timestamps
- ❌ Original connection time
- ❌ Network latency history

### What's Reconstructed
- ✅ Valid moves (recalculated on reconnect)
- ✅ UI display (re-renders from state)
- ✅ Player list (updated on reconnect)

---

## 🔐 Security Considerations

### Player Identity
- Uses **player name + room code** to identify
- Not using socket ID (that changes)
- Assumes players know their own name/room

### Potential Vulnerabilities
⚠️ **Risk**: Another player could reconnect as someone else if they guess the name
- **Mitigation**: Room codes are unique per game
- **Better**: Could add auth token (future enhancement)

### Grace Period Benefit
- Prevents accidental removal of legitimate players
- Gives 30 seconds for network recovery
- After 30s, confidently assume they're gone

---

## 🛠️ Debugging Reconnection Issues

### Check Persisted State
```javascript
// In browser console
console.log(localStorage.getItem('playerName'));
console.log(localStorage.getItem('roomCode'));
```

### Monitor Socket Status
```javascript
// In browser console
console.log(io().connected);  // true/false
```

### Server-Side Debugging
Check server logs for:
```
handleDisconnect() called
Saving hand under: disconnected-Alice
handleReconnect() called
Transferred hand from disconnected-Alice to socket-123
```

### Test with DevTools
1. Open DevTools (F12)
2. Go to Network tab
3. Simulate offline mode
4. Refresh page
5. Turn offline back on
6. Should auto-reconnect

---

## 📈 Future Enhancements

### Planned Improvements
- [ ] Add authentication token (more secure player identity)
- [ ] Extend grace period (currently 30s)
- [ ] Replay system (replay moves from disconnection)
- [ ] Persistent storage (survive server restarts)
- [ ] Session recovery from server database
- [ ] Detailed reconnection analytics

---

## 🎯 Key Takeaways

1. **Client saves**: Player name + room code to localStorage
2. **Client auto-reconnects**: With exponential backoff (10 tries)
3. **Server marks**: Player as disconnected with `disconnected-{name}` marker
4. **Server waits**: 30 seconds for player to reconnect
5. **On reconnect**: State transferred from marker to new socket ID
6. **Game continues**: Without missing a beat

---

**Last Updated**: November 2, 2025
