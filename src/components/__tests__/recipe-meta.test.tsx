import { render, screen } from '@testing-library/react-native';

import { RecipeMeta } from '@/components/recipe-meta';
import { makeRecipe } from '@/test-utils/fixtures';

import '@/i18n';

describe('RecipeMeta', () => {
  it('shows minutes when the recipe takes under an hour', () => {
    render(<RecipeMeta recipe={makeRecipe({ prepTimeMinutes: 15, cookTimeMinutes: 25 })} />);

    expect(screen.getByText('40 min')).toBeTruthy();
  });

  it('shows hours and minutes for longer recipes', () => {
    render(<RecipeMeta recipe={makeRecipe({ totalTimeMinutes: 90 })} />);

    expect(screen.getByText('1 h 30 min')).toBeTruthy();
  });

  it('drops the minutes when the time is a round number of hours', () => {
    render(<RecipeMeta recipe={makeRecipe({ totalTimeMinutes: 120 })} />);

    expect(screen.getByText('2 h')).toBeTruthy();
  });

  it('pluralises servings', () => {
    render(<RecipeMeta recipe={makeRecipe({ servingsMin: 1 })} />);
    expect(screen.getByText('1 ración')).toBeTruthy();

    render(<RecipeMeta recipe={makeRecipe({ servingsMin: 4 })} />);
    expect(screen.getByText('4 raciones')).toBeTruthy();
  });

  it('shows a servings range when there is one', () => {
    render(<RecipeMeta recipe={makeRecipe({ servingsMin: 4, servingsMax: 6 })} />);

    expect(screen.getByText('4-6 raciones')).toBeTruthy();
  });

  it('translates the difficulty and omits it when unset', () => {
    render(<RecipeMeta recipe={makeRecipe({ difficulty: 'hard' })} />);
    expect(screen.getByText('Difícil')).toBeTruthy();

    render(<RecipeMeta recipe={makeRecipe({ difficulty: null })} />);
    expect(screen.queryByText('Difícil')).toBeNull();
  });

  it('omits the time when the recipe has none', () => {
    render(<RecipeMeta recipe={makeRecipe()} />);

    expect(screen.queryByText(/min/)).toBeNull();
  });
});
