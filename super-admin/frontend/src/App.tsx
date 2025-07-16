import React, { useState } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';

interface User {
  id: string;
  email: string;
  role: string;
}

function App() {
  const [user, setUser] = useState<User | null>({
    id: '1',
    email: 'admin@zienshield.com',
    role: 'super-admin'
  });

  const handleLogout = () => {
    setUser(null);
  };

  // Si no hay usuario, mostrar login
  if (!user) {
    return (
      <div className="App">
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">ZienSHIELD Admin</h1>
            <p className="text-gray-600">Acceso no autorizado</p>
          </div>
        </div>
      </div>
    );
  }

  // Si hay usuario, mostrar dashboard
  return (
    <div className="App">
      <Dashboard />
    </div>
  );
}

export default App;
