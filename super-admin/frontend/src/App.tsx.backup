import React, { useState, useEffect } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import Login from './components/Login';

interface User {
  id: string;
  email: string;
  role: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verificar si hay sesión guardada al cargar la app
  useEffect(() => {
    const savedUser = localStorage.getItem('zienshield-admin-user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('zienshield-admin-user');
      }
    }
    setIsLoading(false);
  }, []);

  // Función de login
  const handleLogin = async (credentials: LoginCredentials): Promise<boolean> => {
    try {
      // Credenciales válidas (puedes expandir esto más tarde)
      const validCredentials = [
        { email: 'admin@zienshield.com', password: 'ZienAdmin2025' },
        { email: 'admin@axafone.com', password: 'admin123' },
        { email: 'superadmin@zienshield.com', password: 'SuperAdmin2025' }
      ];

      const isValid = validCredentials.some(
        cred => cred.email === credentials.email && cred.password === credentials.password
      );

      if (isValid) {
        const user: User = {
          id: Date.now().toString(),
          email: credentials.email,
          role: 'super-admin'
        };

        setUser(user);
        // Guardar en localStorage para persistencia
        localStorage.setItem('zienshield-admin-user', JSON.stringify(user));
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error en login:', error);
      return false;
    }
  };

  // Función de logout
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('zienshield-admin-user');
  };

  // Mostrar loading inicial
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4 text-slate-300">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="text-lg">Cargando ZienSHIELD...</span>
        </div>
      </div>
    );
  }

  // Si no hay usuario, mostrar login
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // Si hay usuario, mostrar dashboard con logout
  return (
    <div className="App">
      <Dashboard user={user} onLogout={handleLogout} />
    </div>
  );
}

export default App;
