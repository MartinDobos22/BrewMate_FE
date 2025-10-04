import React from 'react';
import renderer, { act } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';

import CommunityRecipesScreen from '../src/screens/CommunityRecipesScreen';
import { fetchRecipes } from '../src/services/recipeServices';

jest.mock('../src/services/recipeServices', () => ({
  fetchRecipes: jest.fn(),
}));

describe('CommunityRecipesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading indicator while fetching recipes', async () => {
    let resolveFetch: (value: any) => void = () => {};
    (fetchRecipes as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    let component!: ReactTestRenderer;
    await act(async () => {
      component = renderer.create(<CommunityRecipesScreen />);
    });

    const loading = component.root.findByProps({ testID: 'community-recipes-loading' });
    expect(loading).toBeDefined();

    await act(async () => {
      resolveFetch([]);
    });

    expect(component.root.findAllByProps({ testID: 'community-recipes-loading' })).toHaveLength(0);
  });

  it('renders recipes after successful fetch', async () => {
    (fetchRecipes as jest.Mock).mockResolvedValue([
      { id: '1', title: 'Filtrovaná káva', brewDevice: 'V60' },
    ]);

    let component!: ReactTestRenderer;
    await act(async () => {
      component = renderer.create(<CommunityRecipesScreen />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    const texts = component.root.findAllByType(Text);
    const hasTitle = texts.some((node) => node.props.children === 'Filtrovaná káva');
    const hasDevice = texts.some((node) => node.props.children === 'V60');
    expect(hasTitle).toBe(true);
    expect(hasDevice).toBe(true);
  });

  it('shows error state when fetch fails', async () => {
    (fetchRecipes as jest.Mock).mockRejectedValue(new Error('Network error'));

    let component!: ReactTestRenderer;
    await act(async () => {
      component = renderer.create(<CommunityRecipesScreen />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    const error = component.root.findByProps({ testID: 'community-recipes-error' });
    expect(error).toBeDefined();
  });
});
