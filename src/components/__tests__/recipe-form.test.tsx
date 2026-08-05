import { fireEvent, render, screen } from '@testing-library/react-native';

import { RecipeForm, toCreateInput, EMPTY_FORM } from '@/components/recipe-form';
import es from '@/i18n/messages/es.json';

import '@/i18n';

const form = es.recipes.form;

function fill(label: string, text: string) {
  fireEvent.changeText(screen.getByLabelText(label), text);
}

describe('toCreateInput', () => {
  it('turns the free text into ingredients and steps', () => {
    const input = toCreateInput({
      ...EMPTY_FORM,
      title: '  Tortilla  ',
      ingredients: '500 g de patatas\n4 huevos',
      steps: 'Pela.\n\nCuaja.',
    });

    expect(input.title).toBe('Tortilla');
    expect(input.ingredients).toHaveLength(2);
    expect(input.steps).toHaveLength(2);
  });

  it('defaults servings to one and leaves blank optionals null', () => {
    const input = toCreateInput({ ...EMPTY_FORM, title: 'X' });

    expect(input.servingsMin).toBe(1);
    expect(input.description).toBeNull();
    expect(input.prepTimeMinutes).toBeNull();
    expect(input.difficulty).toBeNull();
  });
});

describe('RecipeForm', () => {
  it('reports only the three required fields when empty', () => {
    const onSubmit = jest.fn();
    render(<RecipeForm submitLabel={form.submit} onSubmit={onSubmit} />);

    fireEvent.press(screen.getByText(form.submit));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(form.titleRequired)).toBeTruthy();
    expect(screen.getByText(form.ingredientsRequired)).toBeTruthy();
    expect(screen.getByText(form.stepsRequired)).toBeTruthy();
  });

  it('submits a recipe built from the three required fields alone', () => {
    const onSubmit = jest.fn();
    render(<RecipeForm submitLabel={form.submit} onSubmit={onSubmit} />);

    fill(form.title, 'Gazpacho');
    fill(form.ingredients, '1 kg de tomates');
    fill(form.steps, 'Tritura todo.');
    fireEvent.press(screen.getByText(form.submit));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Gazpacho',
        ingredients: [{ name: '1 kg de tomates', rawText: '1 kg de tomates' }],
        steps: [{ content: 'Tritura todo.' }],
      })
    );
  });

  it('keeps the optional fields hidden until asked for', () => {
    render(<RecipeForm submitLabel={form.submit} onSubmit={jest.fn()} />);

    expect(screen.queryByLabelText(form.tips)).toBeNull();

    fireEvent.press(screen.getByText(`▸ ${form.moreDetails}`));

    expect(screen.getByLabelText(form.tips)).toBeTruthy();
  });

  it('reports every change so a draft can be saved', () => {
    const onChange = jest.fn();
    render(<RecipeForm submitLabel={form.submit} onSubmit={jest.fn()} onChange={onChange} />);

    fill(form.title, 'Migas');

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ title: 'Migas' }));
  });

  it('starts from the values it is given, for editing', () => {
    render(
      <RecipeForm
        submitLabel={form.submitEdit}
        initialValues={{ ...EMPTY_FORM, title: 'Ya existente' }}
        onSubmit={jest.fn()}
      />
    );

    expect(screen.getByLabelText(form.title).props.value).toBe('Ya existente');
  });
});
