import { render, screen } from '@testing-library/react-native';

import RecipeListScreen from '@/app/index';
import es from '@/i18n/messages/es.json';

import '@/i18n';

describe('RecipeListScreen', () => {
  it('renders the empty state with translated copy', () => {
    render(<RecipeListScreen />);

    expect(screen.getByText(es.recipes.empty)).toBeTruthy();
    expect(screen.getByText(es.recipes.emptyDescription)).toBeTruthy();
  });
});
