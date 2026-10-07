import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from './page/Dashboard';
import Reminder from './page/Reminder';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="relative w-screen h-screen overflow-hidden bg-zinc-950 font-sans text-zinc-100">
        {/* Container Terapung untuk Reminder di Pojok Kiri Atas */}
        <div className="fixed top-4 left-4 z-50 pointer-events-auto">
          <Reminder />
        </div>

        {/* Tampilan Utama Dashboard */}
        <Dashboard />
      </div>
    </BrowserRouter>
  );
};

export default App;