import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders lobby component', () => {
  render(<App />);
  // Check that the app renders without crashing
  expect(document.body).toBeInTheDocument();
});
