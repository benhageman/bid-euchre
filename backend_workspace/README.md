# Bid Euchre Game

A modern implementation of the classic Bid Euchre card game, supporting multiplayer gameplay through WebSockets.

## Project Structure

This is a monorepo managed with npm workspaces containing:

- `packages/@bid-euchre/client` - React frontend
- `packages/@bid-euchre/server` - NestJS backend

### Client Features
- React 19.1 with TypeScript
- Redux Toolkit for state management
- Socket.IO for real-time communication
- Tailwind CSS for styling
- Feature-based code organization

### Server Features
- NestJS framework with WebSocket support
- TypeScript for type safety
- Modular architecture
- Game state management
- Room-based multiplayer

## Getting Started

1. Prerequisites:
   - Node.js 16.x or higher
   - npm 8.x or higher

2. Installation:
   ```bash
   npm install
   ```

3. Development:
   ```bash
   # Start both client and server in development mode
   npm run dev

   # Start client only
   npm run dev:client

   # Start server only
   npm run dev:server
   ```

4. Build:
   ```bash
   npm run build
   ```

5. Test:
   ```bash
   npm run test
   ```

## Code Organization

### Client
```
client/
├── src/
│   ├── api/          # WebSocket client
│   ├── features/     # Feature modules
│   │   ├── game/     # Game components & logic
│   │   └── lobby/    # Lobby & matchmaking
│   ├── shared/       # Shared components
│   └── store/        # Redux store
```

### Server
```
server/
├── src/
│   ├── game/           # Game module
│   │   ├── services/   # Game logic & state
│   │   └── types.ts    # Shared types
│   └── main.ts         # App entry point
```

## Architecture

### Client-Server Communication
- WebSocket events for real-time updates
- Type-safe communication between client and server
- Room-based game sessions
- State synchronization

### Game State Management
- Server: Source of truth for game state
- Client: Redux for UI state and optimistic updates
- WebSocket events for state synchronization

## Development Guidelines

1. Code Style
   - Use TypeScript strict mode
   - Follow ESLint configuration
   - Document complex logic
   - Use meaningful variable names

2. Component Guidelines
   - Keep components focused and single-responsibility
   - Use TypeScript interfaces for props
   - Document complex prop structures
   - Use shared components when possible

3. State Management
   - Use Redux for global state
   - Keep components pure when possible
   - Document state shape and transitions

4. Documentation
   - Keep READMEs updated
   - Document complex algorithms
   - Include TypeScript types
   - Comment non-obvious code

## Contributing

1. Branch naming:
   - feature/name-of-feature
   - fix/name-of-fix
   - refactor/name-of-refactor

2. Commit messages:
   - Clear and descriptive
   - Reference issue numbers
   - Use conventional commit format

3. Testing:
   - Write unit tests for new features
   - Test both success and error cases
   - Test WebSocket communication