import React, { useState, useEffect } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import CompanyDashboard from './components/CompanyDashboard';
import Login from './components/Login';
import { apiService } from './services/api';

interface User {
  id: string;
  email: string;
  role: string;
  name: string;
  tenant_id?: string | null;
  company_name?: string | null;
  company_id?: number;
  sector?: string;
  wazuh_group?: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verificar si hay sesión guardada o token de impersonación al cargar la app
  useEffect(() => {
    const checkAuthAndImpersonation = async () => {
      try {
        console.log('🔍 Iniciando verificación de autenticación...');
        console.log('🌐 URL actual:', window.location.href);
        console.log('🔗 Search params:', window.location.search);
        
        // 1. Verificar si hay token de impersonación en la URL
        const urlParams = new URLSearchParams(window.location.search);
        const impersonateToken = urlParams.get('impersonate');
        
        console.log('🎭 Token de impersonación en URL:', impersonateToken);
        
        if (impersonateToken) {
          console.log('✅ Token de impersonación detectado, iniciando auto-login...');
          
          try {
            // Intentar auto-login con token de impersonación
            const response = await apiService.autoLogin(impersonateToken);
            
            if (response.success && response.data.user) {
              const user: User = {
                id: Date.now().toString(),
                email: response.data.user.email,
                role: response.data.user.role,
                name: response.data.user.name,
                tenant_id: response.data.user.tenant_id,
                company_name: response.data.user.company_name,
                company_id: response.data.user.company_id,
                sector: response.data.user.sector,
                wazuh_group: response.data.user.wazuh_group
              };

              setUser(user);
              
              // Guardar token de sesión (no el de impersonación)
              localStorage.setItem('zienshield-user', JSON.stringify(user));
              localStorage.setItem('zienshield-token', response.data.token);
              
              console.log('✅ Auto-login por impersonación exitoso:', user);
              
              // Limpiar URL (opcional, para que no se vea el token)
              window.history.replaceState({}, document.title, window.location.pathname);
              
              setIsLoading(false);
              return;
            }
          } catch (error) {
            console.error('❌ Error en auto-login de impersonación:', error);
            // Continuar con verificación de sesión normal
          }
        }
        
        // 2. Verificar sesión guardada normal
        const savedUser = localStorage.getItem('zienshield-user');
        const savedToken = localStorage.getItem('zienshield-token');
        
        if (savedUser && savedToken) {
          try {
            const userData = JSON.parse(savedUser);
            setUser(userData);
            console.log('✅ Sesión restaurada:', userData);
          } catch (error) {
            console.error('❌ Error parsing saved user:', error);
            localStorage.removeItem('zienshield-user');
            localStorage.removeItem('zienshield-token');
          }
        }
        
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthAndImpersonation();
  }, []);

  // Función de login actualizada para usar API
  const handleLogin = async (credentials: LoginCredentials): Promise<boolean> => {
    try {
      console.log('🔐 Intentando login con:', credentials.email);
      
      const response = await fetch('http://194.164.172.92:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();
      console.log('📥 Respuesta del login:', data);

      if (data.success && data.user) {
        const user: User = {
          id: Date.now().toString(),
          email: data.user.email,
          role: data.user.role,
          name: data.user.name,
          tenant_id: data.user.tenant_id,
          company_name: data.user.company_name,
          company_id: data.user.company_id,
          sector: data.user.sector,
          wazuh_group: data.user.wazuh_group
        };

        setUser(user);
        
        // Guardar en localStorage para persistencia
        localStorage.setItem('zienshield-user', JSON.stringify(user));
        localStorage.setItem('zienshield-token', data.token);
        
        console.log('✅ Login exitoso:', user);
        return true;
      } else {
        console.error('❌ Login fallido:', data.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Error en login:', error);
      return false;
    }
  };

  // Función de logout
  const handleLogout = () => {
    console.log('🔓 Cerrando sesión...');
    setUser(null);
    localStorage.removeItem('zienshield-user');
    localStorage.removeItem('zienshield-token');
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

  // Mostrar dashboard según el tipo de usuario
  if (user.role === 'super_admin') {
    console.log('🔧 Mostrando dashboard de Super Admin');
    return <Dashboard user={user} onLogout={handleLogout} />;
  } else if (user.role === 'company_admin') {
    console.log('🏢 Mostrando dashboard de empresa para:', user.company_name);
    return <CompanyDashboard user={user} onLogout={handleLogout} />;
  } else {
    console.error('❌ Rol de usuario desconocido:', user.role);
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Error de Autenticación</h1>
          <p className="text-slate-300 mb-4">Rol de usuario no reconocido: {user.role}</p>
          <button 
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }
}

export default App;
