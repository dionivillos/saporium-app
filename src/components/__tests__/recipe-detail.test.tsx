import { render, screen } from '@testing-library/react-native';

import { RecipeDetail } from '@/components/recipe-detail';
import { makeRecipeWithDetails } from '@/test-utils/fixtures';

import '@/i18n';

describe('RecipeDetail', () => {
  it('prefers the original ingredient line over the parsed parts', () => {
    render(<RecipeDetail recipe={makeRecipeWithDetails()} />);

    expect(screen.getByText('500 g de patatas')).toBeTruthy();
  });

  it('falls back to quantity, unit and name when there is no original line', () => {
    const recipe = makeRecipeWithDetails();
    recipe.ingredients = [{ ...recipe.ingredients[0]!, rawText: null }];

    render(<RecipeDetail recipe={recipe} />);

    expect(screen.getByText('500 g Patatas')).toBeTruthy();
  });

  it('numbers the steps in order', () => {
    const recipe = makeRecipeWithDetails();
    recipe.steps = [
      { ...recipe.steps[0]!, id: 'a', position: 0, content: 'Primero' },
      { ...recipe.steps[0]!, id: 'b', position: 1, content: 'Segundo' },
    ];

    render(<RecipeDetail recipe={recipe} />);

    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('Segundo')).toBeTruthy();
  });

  it('groups ingredients under their group name', () => {
    const recipe = makeRecipeWithDetails();
    recipe.ingredients = [
      { ...recipe.ingredients[0]!, id: 'a', groupName: 'Para la masa', rawText: 'Harina' },
      { ...recipe.ingredients[0]!, id: 'b', groupName: 'Para el relleno', rawText: 'Atún' },
    ];

    render(<RecipeDetail recipe={recipe} />);

    expect(screen.getByText('Para la masa')).toBeTruthy();
    expect(screen.getByText('Para el relleno')).toBeTruthy();
  });

  it('hides the tips section when the recipe has none', () => {
    render(<RecipeDetail recipe={makeRecipeWithDetails({ tips: null })} />);

    expect(screen.queryByText('Consejos')).toBeNull();
  });

  it('shows tips and tags when present', () => {
    render(
      <RecipeDetail recipe={makeRecipeWithDetails({ tips: 'Deja reposar', tags: ['cena'] })} />
    );

    expect(screen.getByText('Consejos')).toBeTruthy();
    expect(screen.getByText('Deja reposar')).toBeTruthy();
    expect(screen.getByText('#cena')).toBeTruthy();
  });
});
