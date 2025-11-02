import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { Game } from './features/game';
import Lobby from './features/lobby/Lobby';
import ConnectionStatus from './shared/components/ConnectionStatus';

function App() {
  return (
    <Provider store={store}>
      <Router>
        <ConnectionStatus />
        <Routes>
          <Route path="/" element={<Lobby />} />
          <Route path="/game/:roomCode" element={<Game />} />
        </Routes>
      </Router>
    </Provider>
  );
}

export default App;
