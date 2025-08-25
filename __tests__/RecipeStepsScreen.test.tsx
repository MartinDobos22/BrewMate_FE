import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import RecipeStepsScreen from '../src/components/RecipeStepsScreen';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import Timer from '../src/components/Timer';

test('renders recipe steps', () => {
  ReactTestRenderer.create(
    <ThemeProvider>
      <RecipeStepsScreen recipe={'Krok 1\nKrok 2'} onBack={() => {}} />
    </ThemeProvider>,
  );
});

test('shows timer when step includes time', () => {
  const instance = ReactTestRenderer.create(
    <ThemeProvider>
      <RecipeStepsScreen recipe={'Var 2 min\nĎalší krok'} onBack={() => {}} />
    </ThemeProvider>,
  );
  const timers = instance.root.findAllByType(Timer);
  expect(timers.length).toBe(1);
});
