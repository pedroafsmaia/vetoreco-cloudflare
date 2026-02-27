import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppInner from './app/AppInner';

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}
