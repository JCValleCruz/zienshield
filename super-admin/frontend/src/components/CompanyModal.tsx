import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { X, Building, Mail, Phone, Globe } from 'lucide-react';

const companySchema = z.object({
  company_name: z.string().min(2, 'Nombre de empresa requerido'),
  admin_email: z.string().email('Email válido requerido'),
  admin_password: z.string().min(6, 'Contraseña debe tener al menos 6 caracteres'),
  sector: z.string().min(1, 'Sector requerido'),
  admin_phone: z.string().optional(),
});

type CompanyForm = z.infer<typeof companySchema>;

interface CompanyModalProps {
  onClose: () => void;
  onSubmit: (data: CompanyForm) => Promise<boolean>;
}

const sectors = [
  'Telecomunicaciones',
  'Servicios Digitales',
  'Desarrollo Web',
  'Consultoría IT',
  'E-commerce',
  'Fintech',
  'Salud',
  'Educación',
  'Retail',
  'Manufactura',
  'Otros'
];

export default function CompanyModal({ onClose, onSubmit }: CompanyModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const { register, handleSubmit, formState: { errors }, setError } = useForm<CompanyForm>({
    resolver: zodResolver(companySchema)
  });

  const onSubmitForm = async (data: CompanyForm) => {
    setIsLoading(true);
    try {
      const success = await onSubmit(data);
      if (!success) {
        setError('root', { message: 'Error creando la empresa' });
      }
    } catch (error) {
      setError('root', { message: 'Error de conexión' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-slate-800 rounded-2xl shadow-2xl border border-slate-700"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl">
              <Building className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Nueva Empresa</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmitForm)} className="p-6 space-y-4">
          {/* Company Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Nombre de la Empresa *
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                {...register('company_name')}
                placeholder="Ej: TechCorp S.L."
                className="input-professional pl-10 w-full"
              />
            </div>
            {errors.company_name && (
              <p className="text-red-400 text-sm mt-1">{errors.company_name.message}</p>
            )}
          </div>

          {/* Sector */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Sector *
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                {...register('sector')}
                className="input-professional pl-10 w-full"
              >
                <option value="">Seleccionar sector</option>
                {sectors.map(sector => (
                  <option key={sector} value={sector}>{sector}</option>
                ))}
              </select>
            </div>
            {errors.sector && (
              <p className="text-red-400 text-sm mt-1">{errors.sector.message}</p>
            )}
          </div>

          {/* Admin Email */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Email del Administrador *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                {...register('admin_email')}
                type="email"
                placeholder="admin@empresa.com"
                className="input-professional pl-10 w-full"
              />
            </div>
            {errors.admin_email && (
              <p className="text-red-400 text-sm mt-1">{errors.admin_email.message}</p>
            )}
          </div>

          {/* Admin Password */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Contraseña del Administrador *
            </label>
            <input
              {...register('admin_password')}
              type="password"
              placeholder="••••••••••"
              className="input-professional w-full"
            />
            {errors.admin_password && (
              <p className="text-red-400 text-sm mt-1">{errors.admin_password.message}</p>
            )}
          </div>

          {/* Admin Phone */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Teléfono (Opcional)
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                {...register('admin_phone')}
                placeholder="+34 600 000 000"
                className="input-professional pl-10 w-full"
              />
            </div>
          </div>

          {/* Error Message */}
          {errors.root && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
              {errors.root.message}
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 btn-primary"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creando...
                </div>
              ) : (
                'Crear Empresa'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
