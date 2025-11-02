# Input Validation System Documentation

## Overview

A comprehensive server-side validation system has been implemented to ensure game integrity. All incoming game actions (hosting, joining, bidding, playing cards) are validated before being processed.

## Key Benefits

✅ **Security**: Prevents invalid moves and cheating attempts
✅ **Reliability**: Ensures game state consistency
✅ **User Feedback**: Clear error messages when actions fail
✅ **Data Integrity**: Validates all input formats and values

## Validation Service

Located at: `packages/@bid-euchre/server/src/game/services/validation.service.ts`

### Core Methods

#### Room Validation

```typescript
validateRoomExists(roomId: string): ValidationResult
```
- Ensures room ID exists in the system
- Called before: join, bid, play-card

```typescript
validateRoomSize(roomId: string): ValidationResult
```
- Ensures room has less than 4 players
- Called before: join
- Returns error if room is full

```typescript
validateRoomId(roomId: string): ValidationResult
```
- Validates room ID format and length
- Allows: alphanumeric, hyphens
- Max length: 10 characters
- Called before: host, join

#### Player Validation

```typescript
validatePlayerInRoom(roomId: string, playerId: string): ValidationResult
```
- Ensures player exists in specified room
- Called before: bid, play-card

```typescript
validatePlayerName(name: string): ValidationResult
```
- Validates player name format
- Allows: letters, numbers, spaces, hyphens, apostrophes
- Max length: 50 characters
- Called before: host, join

```typescript
validatePlayerNotInRoom(roomId: string, playerName: string): ValidationResult
```
- Prevents duplicate player names in same room
- Called before: join

#### Bidding Validation

```typescript
validateBidTurn(roomId: string, playerId: string): ValidationResult
```
- Ensures it's the player's turn to bid
- Validates bidding phase is active
- Called before: submit-bid

```typescript
validateBid(amount: BidAmount, trump: Trump): ValidationResult
```
- Validates bid amount: 0, 3, 4, 5, 6, or 'moon'
- Validates trump: 'high', 'low', or suit (hearts, diamonds, clubs, spades)
- Called before: submit-bid

Valid amounts:
- `0` = Pass (no trump needed)
- `3`, `4`, `5`, `6` = Trick count (trump required)
- `'moon'` = Win all 6 tricks (trump required)

#### Card Playing Validation

```typescript
validatePlayTurn(roomId: string, playerId: string): ValidationResult
```
- Ensures it's the player's turn to play
- Validates not in bidding phase
- Validates winning bid is established
- Called before: play-card

```typescript
validateCardFormat(cardStr: string): ValidationResult
```
- Validates card string format (e.g., "9H", "10D", "JC", "AS")
- Valid values: 9, 10, J, Q, K, A
- Valid suits: H (hearts), D (diamonds), C (clubs), S (spades)
- Called before: play-card

```typescript
validatePlayerHasCard(roomId: string, playerId: string, card: Card): ValidationResult
```
- Ensures player actually has the card in their hand
- Prevents playing cards not dealt to player
- Called before: play-card

```typescript
validateCardPlay(roomId: string, playerId: string, card: Card): ValidationResult
```
- Validates card is a legal move given current trick state
- Uses GameService.getValidMoves() to determine valid moves
- Ensures follow-suit rules are respected
- Ensures trump requirements are met
- Called before: play-card

## Integration Points

### 1. Host Room
```typescript
@SubscribeMessage('host')
handleHost(@ConnectedSocket() client: Socket, @MessageBody() data: HostRoomDto)
```
Validates:
- ✅ Player name format and length
- ✅ Room ID format and length

### 2. Join Room
```typescript
@SubscribeMessage('join')
handleJoin(@ConnectedSocket() client: Socket, @MessageBody() data: JoinRoomDto)
```
Validates:
- ✅ Room exists
- ✅ Player name format and length
- ✅ Room not full (< 4 players)
- ✅ Player name not already in room

### 3. Submit Bid
```typescript
@SubscribeMessage('submit-bid')
handleBid(@ConnectedSocket() client: Socket, @MessageBody() data: MakeBidDto)
```
Validates:
- ✅ Room exists
- ✅ Player in room
- ✅ Player's turn to bid
- ✅ Bid amount valid (0, 3, 4, 5, 6, moon)
- ✅ Trump valid (high, low, hearts, diamonds, clubs, spades)

### 4. Play Card
```typescript
@SubscribeMessage('play-card')
handlePlayCard(@ConnectedSocket() client: Socket, @MessageBody() data: PlayCardDto)
```
Validates:
- ✅ Room exists
- ✅ Player in room
- ✅ Player's turn to play
- ✅ Card format valid
- ✅ Player has card in hand
- ✅ Card is legal move (follows suit/trump rules)

## Error Handling

When validation fails, an error event is sent to the client:

```typescript
client.emit('error', { message: 'Clear error description' });
```

Examples of error messages:
- `"Room TEST not found"`
- `"It is not player-123's turn to bid"`
- `"Card 9H is not a valid move"`
- `"Player name must be 50 characters or less"`
- `"Room is full (4 players maximum)"`

## Implementation Details

### ValidationResult Type

All validation methods return one of:

```typescript
// Success
{ valid: true }

// Failure
{ valid: false, error: "Descriptive error message" }
```

### Defensive Checks

Validation includes defensive programming:
- ✅ Null/undefined checks
- ✅ Type validation
- ✅ Range validation
- ✅ Format validation (regex)
- ✅ State validation (turn order, game phase)

## Testing

Tests are available in: `packages/@bid-euchre/server/src/game/services/game.service.spec.ts`

All tests pass, including:
- ✅ 25 game logic tests (deck, dealing, valid moves, scoring)
- ✅ Card and bid validation tests
- ✅ Game state consistency tests

Run tests with:
```bash
npm test -- --testPathPattern="game.service.spec"
```

## Future Enhancements

Potential additions:
1. Rate limiting to prevent spam
2. Logging invalid attempts for debugging
3. Ban list for repeated cheating attempts
4. Custom error codes for client error handling
5. Audit trail of all moves for game replay
