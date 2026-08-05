import { fireEvent, render, screen } from '@testing-library/react-native';

import { RecipeDetail } from '@/components/recipe-detail';
import es from '@/i18n/messages/es.json';
import { makeRecipeWithDetails } from '@/test-utils/fixtures';

import '@/i18n';

describe('RecipeDetail delete action', () => {
  it('is hidden when the screen does not allow deleting', () => {
    render(<RecipeDetail recipe={makeRecipeWithDetails()} />);

    expect(screen.queryByText(es.recipes.delete.action)).toBeNull();
  });

  it('calls back when pressed', () => {
    const onDelete = jest.fn();
    render(<RecipeDetail recipe={makeRecipeWithDetails()} onDelete={onDelete} />);

    fireEvent.press(screen.getByText(es.recipes.delete.action));

    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
