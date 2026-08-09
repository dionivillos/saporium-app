import { AiError, type AiFailure } from '@/lib/ai/client';
import type { AiCredentials } from '@/lib/ai/credentials';
import { NotARecipeError, recipeFromText } from '@/lib/ai/recipe-from-text';

const credentials: AiCredentials = { provider: 'anthropic', apiKey: 'sk-ant-test' };

/** Answers as Anthropic would: the object as the input of a forced tool call. */
function vendorReturning(input: unknown): typeof fetch {
  return (() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ content: [{ type: 'tool_use', input }] }),
    } as unknown as Response)) as unknown as typeof fetch;
}

function vendorFailing(status: number): typeof fetch {
  return (() =>
    Promise.resolve({
      ok: false,
      status,
      json: () => Promise.resolve({}),
    } as unknown as Response)) as unknown as typeof fetch;
}

const lentejas = {
  isRecipe: true,
  title: 'Lentejas de la abuela',
  description: null,
  difficulty: 'easy',
  prepTimeMinutes: 15,
  cookTimeMinutes: 45,
  servingsMin: 4,
  servingsMax: null,
  tips: null,
  ingredients: [
    { rawText: '300 g de lentejas', name: 'lentejas', quantity: '300', unit: 'g' },
    { rawText: '2 zanahorias', name: 'zanahorias', quantity: '2', unit: null },
  ],
  steps: ['Pon las lentejas a remojo.', 'Cuece 45 minutos.'],
  tags: ['Guiso', 'guiso', 'CENA'],
};

async function failureOf(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
    return 'no-failure';
  } catch (error) {
    if (error instanceof NotARecipeError) return 'not-a-recipe';
    return error instanceof AiError ? (error.reason as AiFailure) : 'unknown';
  }
}

describe('recipeFromText', () => {
  it('maps a well-formed answer into a recipe', async () => {
    const recipe = await recipeFromText(credentials, 'texto', vendorReturning(lentejas));

    expect(recipe.title).toBe('Lentejas de la abuela');
    expect(recipe.steps.map((step) => step.content)).toEqual([
      'Pon las lentejas a remojo.',
      'Cuece 45 minutos.',
    ]);
    expect(recipe.prepTimeMinutes).toBe(15);
  });

  it('keeps the pasted line verbatim as rawText', async () => {
    const recipe = await recipeFromText(credentials, 'texto', vendorReturning(lentejas));

    expect(recipe.ingredients.map((item) => item.rawText)).toEqual([
      '300 g de lentejas',
      '2 zanahorias',
    ]);
  });

  it('lowercases tags, drops duplicates and caps them at ten', async () => {
    const recipe = await recipeFromText(
      credentials,
      'texto',
      vendorReturning({ ...lentejas, tags: Array.from({ length: 15 }, (_, i) => `Tag${i}`) })
    );

    expect(recipe.tags).toHaveLength(10);
    expect(recipe.tags?.[0]).toBe('tag0');
  });

  it('deduplicates tags that differ only in case', async () => {
    const recipe = await recipeFromText(credentials, 'texto', vendorReturning(lentejas));

    expect(recipe.tags).toEqual(['guiso', 'cena']);
  });

  it('rejects a paste the model says is not a recipe', async () => {
    const answer = { ...lentejas, isRecipe: false };

    expect(
      await failureOf(() => recipeFromText(credentials, 'hola', vendorReturning(answer)))
    ).toBe('not-a-recipe');
  });

  it('rejects an answer with a title but no ingredients, whatever isRecipe said', async () => {
    const answer = { ...lentejas, ingredients: [] };

    expect(await failureOf(() => recipeFromText(credentials, 'x', vendorReturning(answer)))).toBe(
      'not-a-recipe'
    );
  });

  it('rejects an answer with no steps', async () => {
    const answer = { ...lentejas, steps: [] };

    expect(await failureOf(() => recipeFromText(credentials, 'x', vendorReturning(answer)))).toBe(
      'not-a-recipe'
    );
  });

  it('rejects an answer with no title', async () => {
    const answer = { ...lentejas, title: null };

    expect(await failureOf(() => recipeFromText(credentials, 'x', vendorReturning(answer)))).toBe(
      'not-a-recipe'
    );
  });

  it('drops an ingredient the model returned without its original line', async () => {
    const answer = {
      ...lentejas,
      ingredients: [
        ...lentejas.ingredients,
        { rawText: '', name: 'sal', quantity: null, unit: null },
      ],
    };

    const recipe = await recipeFromText(credentials, 'x', vendorReturning(answer));

    expect(recipe.ingredients).toHaveLength(2);
  });

  it('ignores a difficulty outside the three we know', async () => {
    const answer = { ...lentejas, difficulty: 'imposible' };

    expect((await recipeFromText(credentials, 'x', vendorReturning(answer))).difficulty).toBeNull();
  });

  it('ignores a nonsensical time rather than storing it', async () => {
    const answer = { ...lentejas, prepTimeMinutes: -5, cookTimeMinutes: 'un rato' };
    const recipe = await recipeFromText(credentials, 'x', vendorReturning(answer));

    expect(recipe.prepTimeMinutes).toBeNull();
    expect(recipe.cookTimeMinutes).toBeNull();
  });

  it('defaults servings to one rather than failing on a missing number', async () => {
    const answer = { ...lentejas, servingsMin: null };

    expect((await recipeFromText(credentials, 'x', vendorReturning(answer))).servingsMin).toBe(1);
  });

  it('passes a vendor failure through so the screen can explain it', async () => {
    expect(await failureOf(() => recipeFromText(credentials, 'x', vendorFailing(401)))).toBe(
      'unauthorized'
    );
    expect(await failureOf(() => recipeFromText(credentials, 'x', vendorFailing(429)))).toBe(
      'rate-limited'
    );
  });

  it('sends the pasted text as the prompt and asks the model not to invent', async () => {
    const calls: RequestInit[] = [];
    const fetcher = ((_url: string, init: RequestInit) => {
      calls.push(init);
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ content: [{ type: 'tool_use', input: lentejas }] }),
      } as unknown as Response);
    }) as unknown as typeof fetch;

    await recipeFromText(credentials, 'mis lentejas caseras', fetcher);

    const body = JSON.parse(String(calls[0]?.body)) as {
      system: string;
      messages: { content: string }[];
    };
    expect(body.messages[0]?.content).toBe('mis lentejas caseras');
    expect(body.system).toContain('never invent');
  });
});
