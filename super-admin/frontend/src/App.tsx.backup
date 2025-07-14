import React, { useState } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import './App.css';

interface User {
  email: string;
  name: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);

  const handleLogin = async (credentials: LoginCredentials): Promise<boolean> => {
    try {
      // Simular autenticación (después conectaremos con la API real)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Credenciales de prueba
      if (credentials.email === 'admin@zienshield.com' && credentials.password === 'ZienAdmin2025') {
        setUser({
          email: credentials.email,
          name: 'Super Admin'
        });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error en login:', error);
      return false;
    }
  };

  const handleLogout = () => {
    setUser(null);
  };

  // Si no hay usuario, mostrar login
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // Si hay usuario, mostrar dashboard
  return (
    <div className="App">
      <Dashboard />
      
      {/* Botón de logout temporal en la esquina */}
      <button
        onClick={handleLogout}
        className="fixed top-4 right-4 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm z-50"
      >
        Cerrar Sesión
      </button>
    </div>
  );
}

export default App;
