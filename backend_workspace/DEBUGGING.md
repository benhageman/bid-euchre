# Debugging Guide

## 🔍 How to Debug Common Issues

### Common Problems & Solutions

---

## 🎮 Game Logic Issues

### Problem: Player can't play a valid card
**Symptoms**: Card is grayed out or error says "not a valid move"

**Debug Steps**:
1. Check server logs for `validateCardPlay` error
2. Verify it's actually the player's turn
3. Check if card follows suit rules
4. Check if trump is applied correctly

**Check in code**:
```typescript
// 1. Is it their turn?
console.log('currentTurnId:', room.gameState.currentTurnId);
console.log('player socket:', client.id);

// 2. Does player have the card?
const hand = room.gameState.hands[client.id];
console.log('Hand:', hand);
console.log('Requested card:', card);

// 3. Is move legal?
const validMoves = this.gameService.getValidMoves(hand, room.gameState.trick, trump);
console.log('Valid moves:', validMoves);
console.log('Requested card valid?', validMoves.find(m => m.suit === card.suit && m.value === card.value));
```

**Common Causes**:
- Player didn't follow suit when they could
- Player is trying to play but it's not their turn
- Card format wrong (e.g., "9" instead of "09")
- Trump logic incorrect for bower handling

---

### Problem: Wrong trick winner
**Symptoms**: Trick awarded to wrong player

**Debug Steps**:
1. Check trump value being used
2. Verify card comparison logic
3. Check bower handling

**Add logging** (game.service.ts → evaluateTrick):
```typescript
console.log('Evaluating trick with trump:', trump);
console.log('Trick cards:', trick.map(c => `${c.value}${c.suit.charAt(0).toUpperCase()}${c.isLeftBower ? ' (left bower)' : c.isRightBower ? ' (right bower)' : ''}`));
```

**Check**:
- Is trump 'high', 'low', or a suit?
- For suit trump, are bowers being recognized?
- Is led suit being prioritized?

---

### Problem: Scoring wrong
**Symptoms**: Team got wrong points

**Debug Steps**:
1. Verify bidding team made their bid
2. Check if it was a sweep (all 6 tricks)
3. Check if it was a moon bid

**Add logging** (game-state.service.ts → playCard):
```typescript
// When hand complete
console.log('Tricks won:', room.gameState.tricksWon);
console.log('Total tricks:', Object.values(room.gameState.tricksWon).reduce((a, b) => a + b, 0));
console.log('Winning bid:', room.gameState.winningBid);
```

**Then check** (game.service.ts → calculateHandScore):
```typescript
console.log('Bidding team tricks:', bidTeamTricks);
console.log('Required tricks:', bid.amount === 'moon' ? 6 : bid.amount);
```

---

## 🌐 Connection Issues

### Problem: "Room not found" error
**Symptoms**: Can't join room or get "Room does not exist"

**Debug Steps**:
1. Verify room code entered correctly
2. Check if room was deleted (all players left)
3. Verify room code exists on server

**Check in code**:
```typescript
// Server-side
const room = this.gameStateService.getRoom(data.room);
console.log('Looking for room:', data.room);
console.log('Room exists?', !!room);
console.log('All rooms:', Array.from(this.gameStateService.getAllRooms().keys()));
```

**Common Causes**:
- Typo in room code
- Room code is case-sensitive
- Last player left, room was deleted

---

### Problem: Player can't reconnect
**Symptoms**: After disconnect, can't rejoin

**Debug Steps**:
1. Check if localStorage has saved data
2. Verify server still has the disconnected player marker
3. Check if 30-second grace period expired

**Check in browser console**:
```javascript
// Do we have saved data?
console.log('Saved name:', localStorage.getItem('playerName'));
console.log('Saved room:', localStorage.getItem('roomCode'));

// Is socket connected?
console.log('Socket connected:', socket.connected);
```

**Check server logs**:
```
handleReconnect() called
Found player at index: X
Transferred hand from disconnected-Alice to socket-123
```

**Common Causes**:
- More than 30 seconds since disconnect (player was removed)
- localStorage was cleared
- Room was deleted (all players left)

---

### Problem: Connection constantly drops
**Symptoms**: Yellow reconnecting indicator flashing

**Debug Steps**:
1. Check network stability
2. Look for server errors
3. Check for memory leaks

**Network issues**:
- WiFi instability
- Firewall blocking WebSockets
- Proxy stripping WebSocket connections

**Server issues**:
```
npm start  # Watch for crash messages
```

**Client issues**:
```javascript
// In browser console
socket.on('disconnect', (reason) => {
  console.log('Disconnected because:', reason);
});
```

Possible reasons: `'io server disconnect'`, `'transport close'`, `'ping timeout'`, etc.

---

## 🎯 Bid-Specific Issues

### Problem: Invalid bid error
**Symptoms**: "Invalid bid amount" or "Invalid trump"

**Debug Steps**:
1. Check bid amount is one of: 0, 3, 4, 5, 6, 'moon'
2. Check trump is one of: 'high', 'low', 'hearts', 'diamonds', 'clubs', 'spades'

**Add logging** (validation.service.ts → validateBid):
```typescript
console.log('Bid amount:', amount, 'Valid?', [0, 3, 4, 5, 6, 'moon'].includes(amount));
console.log('Trump:', trump, 'Valid?', ['high', 'low', 'hearts', 'diamonds', 'clubs', 'spades'].includes(trump));
```

**Common Causes**:
- Typo in bid amount (e.g., 7 instead of 6)
- Trump spelled wrong (e.g., 'hearts' vs 'heart')
- Bid being modified after submission

---

## 👁️ Debugging Tools

### Browser DevTools

#### Network Tab
1. Open DevTools (F12)
2. Go to Network tab
3. Filter for "websocket"
4. Look for "socket.io" connections
5. Click to see messages being sent/received

**What to look for**:
- Green = successful connection
- Red = connection failed
- Messages are on "Messages" tab

#### Console Tab
```javascript
// Check current socket status
console.log(socket);

// Log all emitted events
const originalEmit = socket.emit;
socket.emit = function(event, ...args) {
  console.log('EMIT:', event, args);
  return originalEmit.apply(socket, [event, ...args]);
};

// Log all received events
socket.onAny((event, ...args) => {
  console.log('RECV:', event, args);
});
```

#### Redux DevTools (if installed)
1. Install Redux DevTools extension (Chrome/Firefox)
2. Open extension
3. See all Redux actions and state changes
4. Time-travel through game history

### Server Console Logging

**Current logging** (already added):
```
Game moving through phases:
- "Clearing completed trick before adding new card"
- "Card played. Trick now has X cards"
- "Trick is complete! Evaluating..."
- "Trick winner: X. Total tricks won: Y"
- "HAND IS COMPLETE! All 6 tricks finished"
```

**Add more logging**:
```typescript
// In game.gateway.ts
console.log(`Player ${player.name} (${client.id}) action: ${action}`);

// In game-state.service.ts
console.log(`Before: ${JSON.stringify(room.gameState)}`);
// ... do something ...
console.log(`After: ${JSON.stringify(room.gameState)}`);

// In validation.service.ts
if (!validationResult.valid) {
  console.warn(`Validation failed: ${validationResult.error}`);
}
```

---

## 🧪 Testing & Reproduction

### Step 1: Create Test Scenario
```typescript
// In game.service.spec.ts
it('should handle specific card combination', () => {
  const hand = [
    { suit: 'hearts', value: '9' },
    { suit: 'hearts', value: 'J' },
  ];
  const trick = [
    { suit: 'spades', value: 'A', playerId: 'p1' }
  ];
  const trump = 'hearts';
  
  const validMoves = service.getValidMoves(hand, trick, trump);
  expect(validMoves).toContain(/* what you expect */);
});
```

### Step 2: Run Tests
```bash
npm test -- --testPathPattern="game.service.spec" --verbose
```

### Step 3: Reproduce in App
1. Start dev servers
2. Create test scenario manually
3. Check console logs
4. Compare with test expectations

---

## 🔧 Manual Testing Checklist

### Before Each Release
- [ ] Create room with 4 human players
- [ ] All players can bid in turn
- [ ] All players can play cards in turn
- [ ] Tricks evaluate correctly
- [ ] Scores calculated correctly
- [ ] New hand deals after hand complete
- [ ] Disconnect one player
- [ ] Reconnect within 30 seconds
- [ ] Disconnected player removed after 30 seconds
- [ ] Add bot player
- [ ] Bot bids correctly
- [ ] Bot plays valid cards
- [ ] Try invalid moves (should be rejected)

### Keyboard Shortcuts for Testing
```javascript
// In browser console, set up test commands
window.testGame = {
  disconnect: () => socket.disconnect(),
  reconnect: () => socket.connect(),
  log: () => console.log(store.getState()),
  emitError: () => socket.emit('error', {message: 'Test error'}),
};

// Usage
testGame.disconnect();  // Simulate disconnect
testGame.reconnect();   // Reconnect
testGame.log();        // Log Redux state
```

---

## 📝 Common Error Messages & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| "Room X not found" | Room doesn't exist or was deleted | Create new room or verify code |
| "It is not your turn to bid" | Wrong turn order | Wait your turn or check logic |
| "Card 9H is not a valid move" | Move violates rules | Follow suit if possible |
| "Card format invalid" | Malformed card string | Use format like "9H", "10D", "JC" |
| "Player name already in room" | Duplicate name | Choose different name |
| "Room is full" | Already 4 players | Wait or create new room |
| "Not in bidding phase" | Trying to bid during play | Wait for bidding phase |
| "Can't play cards during bidding" | Trying to play during bid | Submit bid first |

---

## 🎯 Performance Debugging

### Slow Card Play
**Possible causes**:
- Lots of browser tabs open
- JavaScript parsing is slow
- Network latency

**Check**:
```javascript
// Time a socket emit + response
console.time('card-play');
socket.emit('play-card', cardData);
socket.once('trick-updated', () => {
  console.timeEnd('card-play');
});
```

### High Server CPU
**Possible causes**:
- Too many concurrent games
- Bot AI is slow
- Invalid moves causing repeated validation

**Check**:
```bash
top  # On Linux/Mac
tasklist  # On Windows
# Look for node process CPU usage
```

---

## 📞 Getting Help

### When Reporting Issues
Include:
1. **What you were doing** (playing, bidding, etc.)
2. **What happened** (error message or unexpected behavior)
3. **Server logs** (last 50 lines from `npm start`)
4. **Browser console** (any red errors)
5. **Steps to reproduce** (exact sequence to recreate)

### Useful Debug Info to Gather
```bash
# Server version
npm list @nestjs/core

# Client version
npm list react

# Node version
node --version

# Network connectivity
ping socket.io-server-url
```

---

**Last Updated**: November 2, 2025
