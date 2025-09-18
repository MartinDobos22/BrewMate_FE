import { useContext } from 'react';
import { PersonalizationContext } from '../../App';

export const usePersonalization = () => {
  const context = useContext(PersonalizationContext);
  if (!context) {
    throw new Error('usePersonalization must be used within a PersonalizationContext provider');
  }
  return context;
};

export default usePersonalization;
