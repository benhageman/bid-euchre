import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Lobby from './Lobby';
import GameTable from './GameTable';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route path="/game/:roomCode" element={<GameTable />} />
      </Routes>
    </Router>
  );
}

export default App;
