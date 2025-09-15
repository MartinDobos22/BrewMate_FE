import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { MorningRitualManager } from '../services/MorningRitualManager';
import type { PreferenceLearningEngine } from '../services/PreferenceLearningEngine';
import { preferenceEngine } from '../services/personalizationGateway';

interface PersonalizationContextValue {
  ready: boolean;
  manager: MorningRitualManager | null;
  setManager: React.Dispatch<React.SetStateAction<MorningRitualManager | null>>;
  learningEngine: PreferenceLearningEngine | null;
}

const PersonalizationContext = createContext<PersonalizationContextValue | undefined>(undefined);

interface PersonalizationProviderProps {
  children: React.ReactNode;
}

export const PersonalizationProvider: React.FC<PersonalizationProviderProps> = ({ children }) => {
  const [manager, setManager] = useState<MorningRitualManager | null>(null);
  const [learningEngine, setLearningEngine] = useState<PreferenceLearningEngine | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const engine = preferenceEngine.getEngine();

    const initialize = async () => {
      try {
        await engine.initialize();
      } catch (error) {
        console.warn('PersonalizationProvider: failed to initialize learning engine', error);
      }

      if (!active) {
        return;
      }

      setLearningEngine(engine);
      setReady(true);
    };

    initialize();

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      ready,
      manager,
      setManager,
      learningEngine,
    }),
    [ready, manager, learningEngine],
  );

  return <PersonalizationContext.Provider value={value}>{children}</PersonalizationContext.Provider>;
};

export const usePersonalization = (): PersonalizationContextValue => {
  const context = useContext(PersonalizationContext);
  if (!context) {
    throw new Error('usePersonalization must be used within a PersonalizationProvider');
  }
  return context;
};
