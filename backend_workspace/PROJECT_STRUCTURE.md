# Project Structure

## 📁 Directory Layout

```
bid-euchre/
├── backend_workspace/                    # Monorepo root
│
├── packages/
│   └── @bid-euchre/
│       ├── client/                       # React frontend
│       │   ├── public/
│       │   │   ├── index.html           # HTML entry point
│       │   │   ├── manifest.json        # PWA manifest
│       │   │   └── robots.txt
│       │   │
│       │   ├── src/
│       │   │   ├── index.tsx             # React root
│       │   │   ├── App.tsx               # Main component
│       │   │   ├── index.css             # Global styles
│       │   │   │
│       │   │   ├── api/
│       │   │   │   └── socket.ts         # Socket.IO client setup ⭐
│       │   │   │
│       │   │   ├── features/
│       │   │   │   ├── game/
│       │   │   │   │   ├── Game.tsx              # Main game component
│       │   │   │   │   ├── gameSlice.ts         # Redux state ⭐
│       │   │   │   │   ├── types.ts             # Game TypeScript types
│       │   │   │   │   ├── components/
│       │   │   │   │   │   ├── BidPanel.tsx     # Bidding UI
│       │   │   │   │   │   ├── Hand.tsx         # Player hand display
│       │   │   │   │   │   ├── Trick.tsx        # Current trick display
│       │   │   │   │   │   ├── GameTable.tsx    # Main game board
│       │   │   │   │   │   ├── PlayerArea.tsx   # Player info
│       │   │   │   │   │   ├── ScoreBoard.tsx   # Scores display
│       │   │   │   │   │   └── index.ts
│       │   │   │   │
│       │   │   │   └── lobby/
│       │   │   │       ├── Lobby.tsx            # Room join/create
│       │   │   │       └── index.ts
│       │   │   │
│       │   │   ├── shared/
│       │   │   │   ├── components/
│       │   │   │   │   └── ConnectionStatus.tsx # Connection indicator
│       │   │   │   │
│       │   │   │   └── utils/
│       │   │   │       └── formatCard.ts        # Card display formatting
│       │   │   │
│       │   │   └── store/
│       │   │       └── index.ts                 # Redux store setup
│       │   │
│       │   ├── package.json              # Client dependencies
│       │   ├── tsconfig.json             # TypeScript config
│       │   ├── tailwind.config.js        # Tailwind CSS config
│       │   └── postcss.config.js         # PostCSS config
│       │
│       └── server/                       # NestJS backend
│           ├── src/
│           │   ├── main.ts               # Entry point
│           │   ├── app.module.ts         # Root module
│           │   ├── app.controller.ts     # HTTP endpoints
│           │   ├── app.service.ts        # App logic
│           │   │
│           │   └── game/
│           │       ├── game.gateway.ts   # WebSocket handlers ⭐⭐⭐
│           │       ├── game.module.ts    # Game module
│           │       ├── types.ts          # Game TypeScript types ⭐
│           │       │
│           │       ├── dto/
│           │       │   └── game.dto.ts   # Data transfer objects ⭐
│           │       │
│           │       └── services/
│           │           ├── game.service.ts           # Game logic ⭐
│           │           ├── game.service.spec.ts      # Tests ⭐
│           │           ├── game-state.service.ts     # State management ⭐
│           │           ├── bot.service.ts            # AI logic ⭐
│           │           └── validation.service.ts     # Input validation ⭐
│           │
│           ├── package.json              # Server dependencies
│           ├── tsconfig.json             # TypeScript config
│           ├── tsconfig.build.json       # Build config
│           ├── nest-cli.json             # NestJS CLI config
│           └── jest.config.js            # Jest test config
│
├── DOCUMENTATION.md                      # 📍 START HERE
├── ARCHITECTURE.md                       # System design
├── PROJECT_STRUCTURE.md                  # This file
├── GAME_LOGIC.md                         # Game rules
├── VALIDATION_IMPLEMENTATION.md          # Input validation
├── RECONNECTION.md                       # Reconnection system
├── BOT_AI.md                             # Bot AI logic
├── WEBSOCKET_PROTOCOL.md                 # Socket.IO messages
├── STATE_MANAGEMENT.md                   # Redux/client state
├── TESTING.md                            # Testing guide
├── DEBUGGING.md                          # Debug tips
├── DEPLOYMENT.md                         # Build & deploy
├── PERFORMANCE.md                        # Optimization
│
├── package.json                          # Monorepo root
├── README.md                             # Project overview
└── .gitignore
```

---

## ⭐ Most Important Files

### Backend

#### 1. **game.gateway.ts** (game/game.gateway.ts)
**What it does**: Handles all WebSocket events from clients
**Key methods**:
- `handleHost()` - Room creation
- `handleJoin()` - Player joining
- `handleBid()` - Bid submission
- `handlePlayCard()` - Card play
- `processBotBids()` - Automate bot bidding
- `processBotPlays()` - Automate bot card play

**When to modify**: Adding new game actions, changing message formats

#### 2. **game-state.service.ts** (game/services/)
**What it does**: Manages game state in memory
**Key methods**:
- `createRoom()` - Initialize room
- `startGame()` - Deal cards, begin bidding
- `submitBid()` - Handle bid submission
- `playCard()` - Execute card play
- `getValidMoves()` - Calculate legal moves

**When to modify**: Game flow logic, state management

#### 3. **game.service.ts** (game/services/)
**What it does**: Pure game logic (deck, tricks, scoring)
**Key methods**:
- `createDeck()` - Build deck
- `shuffleDeck()` - Shuffle deck
- `dealCards()` - Deal to players
- `getValidMoves()` - Legal move calculation
- `evaluateTrick()` - Determine trick winner
- `calculateHandScore()` - Score calculation

**When to modify**: Game rules change, new card logic

#### 4. **validation.service.ts** (game/services/)
**What it does**: Validates all incoming moves
**Key methods**:
- `validateRoomExists()` - Room validation
- `validatePlayerInRoom()` - Player validation
- `validateBid()` - Bid validation
- `validateCardPlay()` - Move validation
- And 10+ more validation methods

**When to modify**: Adding new validation rules

#### 5. **game.dto.ts** (game/dto/)
**What it does**: Data transfer objects with validation
**Key interfaces**:
- `HostRoomDto` - Room creation request
- `JoinRoomDto` - Join request
- `MakeBidDto` - Bid request
- `PlayCardDto` - Card play request

**When to modify**: Adding new WebSocket events

#### 6. **types.ts** (game/)
**What it does**: All TypeScript type definitions
**Key types**:
- `Card` - Card data structure
- `Trump` - Trump value (high/low/suit)
- `BidAmount` - Valid bid amounts
- `GameState` - Complete game state
- `Bid` - Bid structure
- `Room` - Room structure

**When to modify**: Adding new game concepts

### Frontend

#### 1. **socket.ts** (api/)
**What it does**: Socket.IO client connection and setup
**Key functions**:
- `setupConnectionListeners()` - Connection handling
- `loadPersistedState()` - Load from localStorage
- `saveState()` - Save to localStorage
- `isConnected()` - Connection status
- All Socket.IO event listeners

**When to modify**: New Socket.IO messages, reconnection logic

#### 2. **gameSlice.ts** (features/game/)
**What it does**: Redux state management for game
**Key actions**:
- `setHand()` - Update player hand
- `updateTrick()` - Update current trick
- `updateCurrentTurn()` - Update whose turn
- `updateBids()` - Update bids display
- `updateScores()` - Update scores

**When to modify**: Adding new game state, UI updates

#### 3. **Game.tsx** (features/game/)
**What it does**: Main game component, orchestrates UI
**Key elements**:
- GameTable component
- Hand component
- Trick component
- BidPanel component
- ScoreBoard component

**When to modify**: Changing game UI layout

#### 4. **ConnectionStatus.tsx** (shared/components/)
**What it does**: Visual connection status indicator
**States**:
- Connected (green)
- Disconnected (red)
- Reconnecting (yellow)

**When to modify**: Changing connection UI

---

## 🔗 Key Connections

### Server-Side Data Flow
```
GameGateway (receives event)
    ↓
ValidationService (validates)
    ↓ (if valid)
GameStateService (updates state)
    ↓
GameService (applies logic)
    ↓
GameGateway (emits response)
```

### Client-Side Data Flow
```
User Action (clicks card)
    ↓
Component (Hand, BidPanel, etc.)
    ↓
Socket.IO emit (send to server)
    ↓
Server responds with events
    ↓
Socket.IO listeners (socket.ts)
    ↓
Redux actions dispatched
    ↓
Redux store updated
    ↓
Components re-render
```

---

## 📦 Dependencies by Layer

### Backend Dependencies (package.json)
```json
{
  "@nestjs/common": "^11.0.0",        // NestJS core
  "@nestjs/core": "^11.0.0",
  "@nestjs/websockets": "^11.0.0",    // WebSocket support
  "socket.io": "^4.7.0",              // WebSocket library
  "class-validator": "^0.14.0",       // DTO validation
  "typescript": "^5.6.0"              // TypeScript
}
```

### Frontend Dependencies (package.json)
```json
{
  "react": "^18.2.0",                 // React
  "react-redux": "^8.1.0",            // Redux integration
  "@reduxjs/toolkit": "^1.9.7",       // Redux
  "socket.io-client": "^4.7.0",       // WebSocket client
  "tailwindcss": "^3.4.1"             // CSS framework
}
```

---

## 🎯 File Modification Quick Reference

| Need to...                    | Edit file                          |
|-------------------------------|-------------------------------------|
| Add new game event            | game.gateway.ts + game.dto.ts       |
| Add new game rule             | game.service.ts                     |
| Add new validation            | validation.service.ts              |
| Change UI layout              | Game.tsx + components               |
| Add new Redux state           | gameSlice.ts                        |
| Change Socket.IO behavior     | socket.ts                           |
| Update game types             | server/game/types.ts                |
| Change game phases            | game-state.service.ts               |
| Add bot logic                 | bot.service.ts                      |
| Debug game state              | game-state.service.ts (add logs)    |

---

## 🏗️ Architecture Layers Map

```
PRESENTATION LAYER
├── Game.tsx (main game view)
├── Lobby.tsx (room selection)
└── Components (Hand, Trick, BidPanel, etc.)
         ↓
COMMUNICATION LAYER
├── socket.ts (Socket.IO client)
└── Socket.IO events (host, join, play-card, etc.)
         ↓
STATE MANAGEMENT LAYER
├── Redux Store (gameSlice)
└── Redux Actions (dispatch to update state)
         ↓
API/GATEWAY LAYER
├── game.gateway.ts (WebSocket handler)
├── DTOs (HostRoomDto, PlayCardDto, etc.)
└── Request validation (class-validator)
         ↓
SERVICE LAYER
├── ValidationService (input validation)
├── GameStateService (state management)
├── GameService (business logic)
└── BotService (AI logic)
         ↓
DATA LAYER
├── GameState (in-memory)
├── Room objects
└── Player hands & tricks
```

---

## 📊 Module Dependencies

### Backend Modules
```
AppModule (root)
└── GameModule
    ├── GameGateway
    ├── GameService
    ├── GameStateService
    ├── BotService
    └── ValidationService
```

### Frontend Modules
```
React App (index.tsx)
└── App.tsx
    ├── Lobby.tsx (room selection)
    └── Game.tsx (game board)
        ├── GameTable.tsx
        ├── Hand.tsx
        ├── Trick.tsx
        ├── BidPanel.tsx
        ├── PlayerArea.tsx
        └── ScoreBoard.tsx
```

---

## 🚀 Build Output

### Frontend Build
```
packages/@bid-euchre/client/build/
├── index.html          # Entry HTML
├── static/
│   ├── js/             # Bundled React code
│   └── css/            # Compiled Tailwind CSS
└── manifest.json       # PWA metadata
```

### Server Build
```
packages/@bid-euchre/server/dist/
├── main.js             # Compiled NestJS app
├── game/
│   └── ...compiled files
└── ...other modules
```

---

## 💾 Configuration Files

### Client Configs
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.js` - Tailwind CSS theme
- `postcss.config.js` - CSS processing
- `.env` - Environment variables (create for dev/prod)

### Server Configs
- `tsconfig.json` - TypeScript configuration
- `tsconfig.build.json` - Build-specific config
- `nest-cli.json` - NestJS CLI configuration
- `.env` - Environment variables (server URL, port, etc.)

---

## 🔍 How to Find Code

**Q: Where do I find the code that handles bidding?**
A: `game.gateway.ts` → `handleBid()`, then `game-state.service.ts` → `submitBid()`

**Q: Where do I find the bidding UI?**
A: `BidPanel.tsx` in `features/game/components/`

**Q: Where do I find the winning bid determination?**
A: `game-state.service.ts` → `submitBid()` method

**Q: Where do I find the card validation?**
A: `validation.service.ts` → `validateCardPlay()`

**Q: Where do I find valid move calculation?**
A: `game.service.ts` → `getValidMoves()`

**Q: Where do I find trick evaluation?**
A: `game.service.ts` → `evaluateTrick()`

**Q: Where do I find the Redux state?**
A: `gameSlice.ts` in `store/`

**Q: Where do I find game logic tests?**
A: `game.service.spec.ts` in `services/`

---

**Last Updated**: November 2, 2025
