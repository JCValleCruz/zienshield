import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Shield, Eye, EyeOff, Lock, Mail } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Email inválido').min(1, 'Email requerido'),
  password: z.string().min(6, 'Contraseña debe tener al menos 6 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

interface LoginProps {
  onLogin: (credentials: LoginForm) => Promise<boolean>;
}

export default function Login({ onLogin }: LoginProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { register, handleSubmit, formState: { errors }, setError } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const success = await onLogin(data);
      if (!success) {
        setError('root', { message: 'Credenciales inválidas' });
      }
    } catch (error) {
      setError('root', { message: 'Error de conexión' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        {/* Logo and Header */}
        <div className="login-header">
          <div className="logo-container">
            <Shield className="logo-icon" />
          </div>
          <h1 className="login-title">ZienSHIELD</h1>
          <p className="login-subtitle">Super Admin Panel</p>
          <p className="login-description">Gestión avanzada de seguridad multi-tenant</p>
        </div>

        {/* Login Card */}
        <div className="login-card">
          <form onSubmit={handleSubmit(onSubmit)} className="login-form">
            {/* Email Field */}
            <div className="form-group">
              <label className="form-label">Email de administrador</label>
              <div className="input-container">
                <Mail className="input-icon" />
                <input
                  {...register('email')}
                  type="email"
                  placeholder="admin@zienshield.com"
                  className="form-input"
                />
              </div>
              {errors.email && (
                <p className="field-error">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <div className="input-container">
                <Lock className="input-icon" />
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••"
                  className="form-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="toggle-password"
                >
                  {showPassword ? <EyeOff className="logo-icon" /> : <Eye className="logo-icon" />}
                </button>
              </div>
              {errors.password && (
                <p className="field-error">{errors.password.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="submit-button"
            >
              {isLoading ? (
                <>
                  <div className="loading-spinner"></div>
                  Verificando...
                </>
              ) : (
                'Acceder al Panel'
              )}
            </button>

            {/* Error Message */}
            {errors.root && (
              <div className="error-message">
                {errors.root.message}
              </div>
            )}
          </form>

          {/* Demo Credentials */}
          <div className="demo-credentials">
            <p className="demo-title">Credenciales de demostración:</p>
            <p className="demo-text">admin@zienshield.com / ZienAdmin2025</p>
          </div>
        </div>

        {/* Footer */}
        <div className="login-footer">
          <p>© 2025 ZienSHIELD. Sistema de gestión de seguridad avanzado.</p>
        </div>
      </div>
    </div>
  );
}
