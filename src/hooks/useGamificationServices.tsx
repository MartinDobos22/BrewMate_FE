import React, { createContext, useContext, useMemo } from 'react';
import type { GamificationService } from '../services/gamification/GamificationService';

const GamificationServiceContext = createContext<GamificationService | null>(null);

interface ProviderProps {
  service: GamificationService | null;
  children: React.ReactNode;
}

/**
 * Poskytuje gamifikačnú službu komponentom cez Context.
 */
export const GamificationServiceProvider: React.FC<ProviderProps> = ({ service, children }) => {
  const value = useMemo(() => service, [service]);
  return <GamificationServiceContext.Provider value={value}>{children}</GamificationServiceContext.Provider>;
};

export const useGamificationServices = () => useContext(GamificationServiceContext);
