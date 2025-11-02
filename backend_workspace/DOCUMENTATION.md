# Bid Euchre Application - Complete Documentation

## 🎮 Project Overview

Bid Euchre is a real-time multiplayer card game application built with **NestJS** (backend) and **React** (frontend), communicating via **Socket.IO** for instant game updates.

### Tech Stack
- **Backend**: NestJS 11.0.0, TypeScript 5.6.0, Socket.IO 4.7.0
- **Frontend**: React 18.2.0, Redux Toolkit 1.9.7, Tailwind CSS 3.4.1
- **Monorepo**: NPM Workspaces
- **Testing**: Jest

### Key Features
✅ Real-time multiplayer gameplay (4 players)
✅ Automatic reconnection with state recovery
✅ AI bot opponents
✅ Complete input validation
✅ Persistent game state
✅ Responsive UI

---

## 📚 Documentation Index

### Quick Start
1. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture and data flow
2. **[SETUP.md](./SETUP.md)** - Installation and running the application

### Core Features
3. **[GAME_LOGIC.md](./GAME_LOGIC.md)** - Game rules, scoring, trump system
4. **[VALIDATION_IMPLEMENTATION.md](./VALIDATION_IMPLEMENTATION.md)** - Input validation system
5. **[RECONNECTION.md](./RECONNECTION.md)** - Reconnection & state recovery system
6. **[BOT_AI.md](./BOT_AI.md)** - Bot decision-making algorithm

### Development Guide
7. **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** - File organization and key files
8. **[WEBSOCKET_PROTOCOL.md](./WEBSOCKET_PROTOCOL.md)** - Socket.IO messages and events
9. **[STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md)** - Redux state structure
10. **[TESTING.md](./TESTING.md)** - Testing strategy and test files

### Maintenance
11. **[DEBUGGING.md](./DEBUGGING.md)** - Debugging tips and common issues
12. **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Build, deployment, and configuration
13. **[PERFORMANCE.md](./PERFORMANCE.md)** - Performance considerations and optimization

---

## 🚀 Quick Navigation by Role

### As a **Game Developer**
- Start: [GAME_LOGIC.md](./GAME_LOGIC.md) - Understand the game rules
- Then: [WEBSOCKET_PROTOCOL.md](./WEBSOCKET_PROTOCOL.md) - How moves are communicated
- Then: [VALIDATION_IMPLEMENTATION.md](./VALIDATION_IMPLEMENTATION.md) - How moves are validated

### As a **Full Stack Developer**
- Start: [ARCHITECTURE.md](./ARCHITECTURE.md) - Big picture
- Then: [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - Where code lives
- Then: [WEBSOCKET_PROTOCOL.md](./WEBSOCKET_PROTOCOL.md) - How client/server talk
- Then: [STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md) - Client state management

### As a **Backend Developer**
- Start: [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
- Then: [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - Server code organization
- Then: [GAME_LOGIC.md](./GAME_LOGIC.md) - Game rules implementation
- Then: [VALIDATION_IMPLEMENTATION.md](./VALIDATION_IMPLEMENTATION.md) - Input validation

### As a **Frontend Developer**
- Start: [ARCHITECTURE.md](./ARCHITECTURE.md) - System overview
- Then: [WEBSOCKET_PROTOCOL.md](./WEBSOCKET_PROTOCOL.md) - Socket events
- Then: [STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md) - Redux structure
- Then: [VALIDATION_IMPLEMENTATION.md](./VALIDATION_IMPLEMENTATION.md) - Expected errors

### As a **DevOps/Maintainer**
- Start: [SETUP.md](./SETUP.md) - Running the app
- Then: [DEPLOYMENT.md](./DEPLOYMENT.md) - Build & deploy
- Then: [DEBUGGING.md](./DEBUGGING.md) - Troubleshooting
- Then: [PERFORMANCE.md](./PERFORMANCE.md) - Monitoring & optimization

---

## 📖 Common Questions

**Q: How does the game start?**
A: See [GAME_LOGIC.md - Game Flow](./GAME_LOGIC.md#game-flow)

**Q: How do reconnections work?**
A: See [RECONNECTION.md](./RECONNECTION.md)

**Q: What happens when a player makes an invalid move?**
A: See [VALIDATION_IMPLEMENTATION.md](./VALIDATION_IMPLEMENTATION.md)

**Q: How does the AI make decisions?**
A: See [BOT_AI.md](./BOT_AI.md)

**Q: How are moves communicated?**
A: See [WEBSOCKET_PROTOCOL.md](./WEBSOCKET_PROTOCOL.md)

**Q: Where do I find the game state?**
A: See [STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md)

**Q: How do I add a new feature?**
A: See [ARCHITECTURE.md - Adding Features](./ARCHITECTURE.md#adding-new-features)

**Q: How do I debug an issue?**
A: See [DEBUGGING.md](./DEBUGGING.md)

---

## 🔑 Key Concepts

### Game State
The entire game is represented by a `GameState` object:
```typescript
{
  players: Player[],           // 4 players
  hands: {[playerId]: Card[]}, // Cards each player holds
  trick: PlayedCard[],         // Current trick (0-4 cards)
  tricksWon: {[playerId]: number}, // Tricks won this hand
  winningBid: Bid,             // Who bid what
  currentTurnId: string,       // Whose turn is it
  teamScores: {team1, team2},  // Score tracking
  // ... more fields
}
```

### Card Representation
```typescript
type Card = {
  value: '9' | '10' | 'J' | 'Q' | 'K' | 'A',
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades'
}
```

### Trump System
- **High**: Ace is highest card
- **Low**: 9 is highest card
- **Suit-specific**: Hearts/Diamonds/Clubs/Spades
  - Right bower (Jack of trump suit) is highest
  - Left bower (Jack of same color) is second highest
  - Then regular trump cards in order

### Communication Layer
All client-server communication happens via Socket.IO events:
- Client → Server: `host`, `join`, `submit-bid`, `play-card`, etc.
- Server → Client: `player-list`, `deal-hand`, `current-turn`, `trick-updated`, etc.

### Validation Layer
All incoming actions are validated server-side for:
- Game state consistency
- Turn order
- Card ownership
- Legal moves

---

## 🛠️ Development Workflow

### Setup
```bash
npm install
npm start  # Runs both server and client in watch mode
```

### Testing
```bash
npm test   # Runs all tests
```

### Building
```bash
npm run build  # Builds both packages
```

### Key Files to Know
- `packages/@bid-euchre/server/src/game/game.gateway.ts` - WebSocket event handlers
- `packages/@bid-euchre/server/src/game/services/game-state.service.ts` - Game state management
- `packages/@bid-euchre/server/src/game/services/game.service.ts` - Game logic (deck, tricks, scoring)
- `packages/@bid-euchre/client/src/store/index.ts` - Redux state
- `packages/@bid-euchre/client/src/features/game/gameSlice.ts` - Redux game state slice

---

## 📋 Checklist for New Contributors

- [ ] Read [ARCHITECTURE.md](./ARCHITECTURE.md)
- [ ] Run app locally following [SETUP.md](./SETUP.md)
- [ ] Understand game rules in [GAME_LOGIC.md](./GAME_LOGIC.md)
- [ ] Review [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)
- [ ] Read [WEBSOCKET_PROTOCOL.md](./WEBSOCKET_PROTOCOL.md)
- [ ] Run tests: `npm test`
- [ ] Explore code and cross-reference with docs
- [ ] Ask questions!

---

## 📞 Documentation Maintenance

Each documentation file includes:
- Overview and purpose
- Key concepts and data structures
- Code examples where applicable
- Links to related documentation
- Common issues and solutions

If you find outdated or unclear documentation, update it immediately!

**Last Updated**: November 2, 2025
**Version**: 1.0
