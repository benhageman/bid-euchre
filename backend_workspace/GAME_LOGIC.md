# Game Logic Documentation

## 🎮 Bid Euchre Rules

### Overview
Bid Euchre is a trick-taking card game for 4 players in 2 teams.

**Key Stats**:
- 24-card deck (9, 10, J, Q, K, A of each suit)
- 4 players (2 teams: players 0&2 vs 1&3)
- 6 tricks per hand
- Players bid tricks they think they can win
- Teams score based on whether they make their bid

---

## 🎯 Game Flow

```
1. Deal Cards
   └─ Shuffle 24-card deck
   └─ Deal 6 cards to each of 4 players
   └─ Go to Bidding Phase

2. Bidding Phase
   └─ Players bid in turn (starting with dealer + 1)
   └─ Each player can pass (0) or bid 3-6 tricks or 'moon'
   └─ Once bid, cannot change it
   └─ Bidding ends when all 4 players have bid
   └─ If all pass, re-deal and start over
   └─ Go to Playing Phase

3. Playing Phase
   └─ First player after bidder leads trick
   └─ Players take turns playing cards clockwise
   └─ After 4 cards played, evaluate trick
   └─ Trick winner leads next trick
   └─ Repeat until all 6 tricks complete
   └─ Go to Scoring Phase

4. Scoring Phase
   └─ Tally tricks won by each player
   └─ Determine if bidding team made their bid
   └─ Award points
   └─ Go back to Deal Cards (with new dealer)

5. Game End (First to X points)
   └─ Track cumulative team scores
   └─ Game continues until target score reached
```

---

## 💰 Bidding Rules

### Bid Amounts
- **0 (Pass)**: No bid, no trump specified needed
- **3**: "I can win 3 tricks"
- **4**: "I can win 4 tricks"
- **5**: "I can win 5 tricks"
- **6**: "I can win 6 tricks"
- **moon**: "I will win all 6 tricks" (special bid)

### Trump Types
- **high**: Ace is highest card (default)
- **low**: Nine is highest card (reverse ranking)
- **hearts/diamonds/clubs/spades**: Play with specific suit as trump

### Bid Resolution
When all 4 players have bid:
1. Find highest bid by amount (moon = 7, 6, 5, 4, 3, 0)
2. If multiple same amount, highest in order is winner
3. Bidding team must make (meet or exceed) their bid to score
4. If team fails to make bid, other team scores points

---

## 🎴 Card Play Rules

### Trick Structure
- 1st player leads (plays first card)
- 2nd player plays a card
- 3rd player plays a card
- 4th player plays a card
- Highest card wins the trick

### Following Rules
**Must follow suit** if possible:
- If led card is hearts, must play heart if you have one
- If no hearts, can play any card

**Trump Rules** (when trump is a suit, e.g., hearts):
- If trump led, must play trump if you have one
- If you cannot follow suit and trump was led, you don't have to play trump
- Off-suit trick: Must play trump if you have it? **NO** - only if trump was led

**Bowers** (when trump is a suit):
- Right bower (J of trump suit): Highest card
- Left bower (J of same color): Second highest, counts as trump
- Example: If hearts is trump:
  - JH (right bower) is highest
  - JD (left bower) is second highest
  - AH, KH, QH, 10H, 9H are regular trump in order

---

## 🏆 Trick Winning

### High Trump (no trump is specific suit)
```
Led: AH, 10H, 9H, 5D
Winner: AH (ace is highest in high trump)

Led: AD, 9C, KD, 10D
Winner: KD (king of led suit beats off-suit)
```

### Low Trump (reverse ranking)
```
Led: 9H, 10H, QH, AH
Winner: 9H (nine is highest in low trump)

Led: 9D, 10D, 5H, AD
Winner: AD (still wins because it's led suit)
```

### Suit Trump (e.g., hearts)
```
Led: AH, 10H, 9H, 5D
Winner: AH (ace of trump)

Led: AD, JH, KC, 9H
Winner: JH (left bower, counts as trump, beats non-trump)

Led: AD, JD, KC, 9H
Winner: JD (right bower, highest trump)

Led: 9C, 10C, 5H, AC
Winner: 5H (trump beats off-suit regardless of rank)
```

---

## 📊 Scoring System

### Point Calculation

#### If Bidding Team Made Their Bid
- **Bid 3-6**: Team scores **1 point** (made their bid)
- **Sweep (won all 6)**: Team scores **2 points** (even if bid 3)
- **Moon (6 tricks)**: Team scores **4 points** (special)

#### If Bidding Team Set (Failed Bid)
- **Bidding team**: **0 points**
- **Other team**: **2 points** (for setting them)
- Exception: If moon failed, other team gets **2 points**

### Scoring Examples

**Example 1: Bid 3, won 4**
```
Bid: Team 1 bid 3 hearts
Tricks: Team 1 won 4, Team 2 won 2
Result: Team 1 made their bid (4 >= 3)
Points: Team 1 gets +1
```

**Example 2: Bid 5, won 3**
```
Bid: Team 1 bid 5 diamonds
Tricks: Team 1 won 3, Team 2 won 3
Result: Team 1 failed to make bid (3 < 5)
Points: Team 2 gets +2 (for setting)
```

**Example 3: Bid moon, won 5**
```
Bid: Team 1 bid moon (6 tricks needed)
Tricks: Team 1 won 5, Team 2 won 1
Result: Moon failed (5 < 6)
Points: Team 2 gets +2 (for setting moon)
```

**Example 4: Bid 6, won 6**
```
Bid: Team 2 bid 4 low
Tricks: Team 2 won 6, Team 1 won 0
Result: Sweep! (6 tricks)
Points: Team 2 gets +2 (sweep beats plain bid)
```

---

## 🤖 Implementation Details

### Code Files
- **Game rules logic**: `game.service.ts`
- **Game state management**: `game-state.service.ts`
- **WebSocket handlers**: `game.gateway.ts`
- **Type definitions**: `types.ts`

### Key Methods

#### Deck Operations (game.service.ts)
```typescript
createDeck(): Card[]
```
- Creates array of 24 cards (9-A in all 4 suits)

```typescript
shuffleDeck(deck: Card[]): Card[]
```
- Shuffles deck using Fisher-Yates algorithm

```typescript
dealCards(deck: Card[], playerIds: string[]): {[playerId]: Card[]}
```
- Deals 6 cards to each of 4 players

#### Card Play Validation (game.service.ts)
```typescript
getValidMoves(hand: Card[], trick: PlayedCard[], trump: Trump): Card[]
```
- Returns legal cards player can play
- Handles suit following
- Handles trump requirements
- Handles bower logic

#### Trick Evaluation (game.service.ts)
```typescript
evaluateTrick(trick: PlayedCard[], trump: Trump): string
```
- Evaluates 4 cards played
- Returns ID of winning player
- Handles trump beats non-trump
- Handles bower rankings

#### Scoring (game.service.ts)
```typescript
calculateHandScore(bid: Bid, tricksWon: {[playerId]: number}, playerTeams: {[playerId]: number}): {team1: number, team2: number}
```
- Calculates points for hand
- Handles moon bids
- Handles set penalties

#### State Management (game-state.service.ts)
```typescript
startGame(roomId: string): GameState
```
- Resets game state for new hand
- Deals cards to players
- Initiates bidding phase

```typescript
submitBid(roomId: string, playerId: string, bid: Bid): GameState
```
- Records bid
- Detects bidding completion
- Transitions to playing phase

```typescript
playCard(roomId: string, playerId: string, card: Card): GameState
```
- Removes card from player hand
- Adds card to current trick
- Evaluates trick if complete (4 cards)
- Awards trick to winner
- Detects hand completion (6 tricks)
- Calculates scores
- Starts new hand if needed

---

## 🔢 Hand Completion

A hand is complete when:
- All 6 tricks have been played and evaluated
- Each player should have played exactly 6 cards
- Each trick was won by exactly one player
- Total tricks won by all players = 6

### Hand Completion Detection
```typescript
// After each card play
if (trick.length === 4) {
  // Evaluate trick
  winningPlayerId = evaluateTrick(trick, trump)
  tricksWon[winningPlayerId]++
  
  // Check if hand complete
  totalTricks = sum(tricksWon.values())
  if (totalTricks === 6) {
    // Hand is complete!
    // Calculate scores
    // Start new hand
  }
}
```

---

## 🎲 Dealer Rotation

- Dealer starts at player index 0
- Each hand, dealer index increments: `dealerIndex = (dealerIndex + 1) % 4`
- Bidding starts with player at index: `(dealerIndex + 1) % 4`
- First trick led by player at index: `(bidderIndex + 1) % 4`

### Team Assignment (Fixed)
- Team 1: Players 0 and 2 (Red)
- Team 2: Players 1 and 3 (Blue)
- Teams never change

---

## 🧪 Test Coverage

### Game Logic Tests
See `game.service.spec.ts`:
- ✅ Deck creation (24 cards, correct values)
- ✅ Card dealing (6 cards per player)
- ✅ Deck shuffling (maintains all cards)
- ✅ Valid move calculation (suit following, trump logic)
- ✅ Trick evaluation (trump handling, bowers)
- ✅ Scoring (made bid, set, moon, sweep)
- ✅ Player team assignment

### Running Tests
```bash
npm test -- --testPathPattern="game.service.spec"
```

---

## 🐛 Common Game Logic Issues

### Issue: Player can't play a valid card
**Check**:
1. Is card in player's hand? → `validatePlayerHasCard()`
2. Is it player's turn? → `validatePlayTurn()`
3. Is move legal? → `validateCardPlay()`

**Debug**:
- Check `game-state.service.ts` logging
- Review `getValidMoves()` logic
- Verify suit following rules

### Issue: Wrong trick winner
**Check**:
1. Is trump being applied? → Check `evaluateTrick()` trump parameter
2. Are bowers ranked correctly? → Check bower comparison logic
3. Is led suit being prioritized? → Check suit comparison

**Debug**:
- Add logging in `evaluateTrick()`
- Test with specific card combinations
- Review trump ranking rules

### Issue: Scoring wrong
**Check**:
1. Were all 6 tricks played?
2. Did bidding team make their bid?
3. Was it a sweep (6 tricks)?
4. Was it a moon bid?

**Debug**:
- Log `calculateHandScore()` inputs
- Verify `tricksWon` count
- Check bid comparison logic

---

## 📚 Reference: Card Ranks

### High Trump
```
Ace (highest)
King
Queen
Jack
10
9 (lowest)
```

### Low Trump
```
9 (highest)
10
Jack
Queen
King
Ace (lowest)
```

### Suit Trump (e.g., hearts)
```
Jack of Hearts (right bower) (highest)
Jack of Diamonds (left bower)
Ace of Hearts
King of Hearts
Queen of Hearts
10 of Hearts
9 of Hearts (lowest trump)
```

Non-trump cards lose to any trump card.

---

## 🎓 Learn More

- **Bidding Rules**: See [VALIDATION_IMPLEMENTATION.md](./VALIDATION_IMPLEMENTATION.md#bidding-validation)
- **Move Validation**: See [VALIDATION_IMPLEMENTATION.md](./VALIDATION_IMPLEMENTATION.md#card-playing-validation)
- **Game Flow**: See [ARCHITECTURE.md - Game Phases](./ARCHITECTURE.md#game-phases)
- **WebSocket Events**: See [WEBSOCKET_PROTOCOL.md](./WEBSOCKET_PROTOCOL.md)

---

**Last Updated**: November 2, 2025
