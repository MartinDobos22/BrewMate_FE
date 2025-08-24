import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import RecipeStepsScreen from '../src/components/RecipeStepsScreen';
import { ThemeProvider } from '../src/theme/ThemeProvider';

test('renders recipe steps', () => {
  ReactTestRenderer.create(
    <ThemeProvider>
      <RecipeStepsScreen recipe={'Krok 1\nKrok 2'} onBack={() => {}} />
    </ThemeProvider>,
  );
});
