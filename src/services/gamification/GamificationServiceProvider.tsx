import React, { createContext, useContext, useMemo } from 'react';
import type GamificationService from './GamificationService';

export interface GamificationServiceContextValue {
  service: GamificationService | null;
  setService: React.Dispatch<React.SetStateAction<GamificationService | null>>;
}

const GamificationServiceContext = createContext<GamificationServiceContextValue | undefined>(undefined);

export interface GamificationServiceProviderProps {
  value: GamificationServiceContextValue;
  children: React.ReactNode;
}

export const GamificationServiceProvider = ({ value, children }: GamificationServiceProviderProps): React.JSX.Element => {
  const memoisedValue = useMemo(
    () => ({ service: value.service, setService: value.setService }),
    [value.service, value.setService],
  );
  return <GamificationServiceContext.Provider value={memoisedValue}>{children}</GamificationServiceContext.Provider>;
};

export const useGamificationServiceContext = (): GamificationServiceContextValue => {
  const context = useContext(GamificationServiceContext);
  if (!context) {
    throw new Error('useGamificationServiceContext must be used within a GamificationServiceProvider');
  }
  return context;
};

export default GamificationServiceContext;
