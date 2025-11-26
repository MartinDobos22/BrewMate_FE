import { useContext } from 'react';
import { PersonalizationContext } from '../../App';

/**
 * Provides access to the personalization context containing user taste data and actions.
 *
 * Must be used inside a `PersonalizationContext` provider defined at the app root.
 *
 * @returns {import('../../App').PersonalizationContextType} The personalization context value with state and dispatchers.
 * @throws {Error} When invoked outside of a `PersonalizationContext` provider.
 */
export const usePersonalization = () => {
  const context = useContext(PersonalizationContext);
  if (!context) {
    throw new Error('usePersonalization must be used within a PersonalizationContext provider');
  }
  return context;
};

export default usePersonalization;
