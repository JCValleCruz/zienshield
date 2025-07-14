import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, X, Trash2 } from 'lucide-react';

interface Company {
  id: number;
  company_name: string;
  admin_email: string;
  sector: string;
}

interface DeleteModalProps {
  company: Company;
  onClose: () => void;
  onConfirm: () => Promise<boolean>;
}

export default function DeleteModal({ company, onClose, onConfirm }: DeleteModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleConfirm = async () => {
    if (confirmText !== company.company_name) return;
    
    setIsLoading(true);
    try {
      await onConfirm();
    } finally {
      setIsLoading(false);
    }
  };

  const canDelete = confirmText === company.company_name;

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
        className="relative w-full max-w-md bg-slate-800 rounded-2xl shadow-2xl border border-red-500/30"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-red-500 to-red-700 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Eliminar Empresa</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
              <Trash2 className="w-8 h-8 text-red-400" />
            </div>
            
            <h3 className="text-lg font-semibold text-white mb-2">
              ¿Está seguro de eliminar esta empresa?
            </h3>
            
            <div className="bg-slate-700/50 rounded-lg p-4 mb-4">
              <p className="text-white font-medium">{company.company_name}</p>
              <p className="text-slate-400 text-sm">{company.admin_email}</p>
              <p className="text-slate-500 text-xs">{company.sector}</p>
            </div>
            
            <div className="text-left bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
              <h4 className="text-red-400 font-semibold mb-2">⚠️ Esta acción eliminará:</h4>
              <ul className="text-red-300 text-sm space-y-1">
                <li>• Todos los datos de la empresa</li>
                <li>• Todos los agentes asociados</li>
                <li>• Historial de alertas y eventos</li>
                <li>• Configuraciones de Wazuh</li>
                <li>• Usuarios y permisos</li>
              </ul>
            </div>
          </div>

          {/* Confirmation Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Para confirmar, escriba el nombre de la empresa:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={company.company_name}
              className="input-professional w-full"
            />
            <p className="text-slate-500 text-xs mt-1">
              Escriba exactamente: <span className="font-mono text-slate-400">{company.company_name}</span>
            </p>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={!canDelete || isLoading}
              className={`flex-1 py-2 px-4 rounded-lg transition-colors font-semibold ${
                canDelete && !isLoading
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-slate-600 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Eliminando...
                </div>
              ) : (
                'Eliminar Definitivamente'
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
