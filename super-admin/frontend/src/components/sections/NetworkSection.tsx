import React from 'react';
import NetworkTrafficAnalysis from '../NetworkTrafficAnalysis';
import WebMonitoringGrid from '../WebMonitoringGrid';
import NetworkInventory from '../NetworkInventory';
import { User } from '../../types/dashboard';

interface NetworkSectionProps {
  activeSection: string;
  user: User;
}

const NetworkSection: React.FC<NetworkSectionProps> = ({ activeSection, user }) => {
  switch (activeSection) {
    case 'red-mapa':
      return <NetworkInventory user={user} />;
    case 'red-trafico':
      return <NetworkTrafficAnalysis />;
    case 'red-monitoreo':
      return <WebMonitoringGrid />;
    default:
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-300 mb-2">Sección Red</h3>
            <p className="text-gray-400">Selecciona una opción del menú</p>
          </div>
        </div>
      );
  }
};

export default NetworkSection;