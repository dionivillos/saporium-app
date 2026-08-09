import { AiError, requestStructured, testCredentials, type AiFailure } from '@/lib/ai/client';
import type { AiCredentials } from '@/lib/ai/credentials';

const anthropic: AiCredentials = { provider: 'anthropic', apiKey: 'sk-ant-test' };
const openai: AiCredentials = { provider: 'openai', apiKey: 'sk-openai-test' };

const request = {
  system: 'be exact',
  prompt: 'give me a recipe',
  schemaName: 'recipe',
  schema: { type: 'object', properties: { title: { type: 'string' } } },
};

function reply(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(payload),
  } as unknown as Response;
}

function broken(status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.reject(new Error('not json')),
  } as unknown as Response;
}

async function failureOf(run: () => Promise<unknown>): Promise<AiFailure | 'no-failure'> {
  try {
    await run();
    return 'no-failure';
  } catch (error) {
    return error instanceof AiError ? error.reason : 'no-failure';
  }
}

function capture(response: Response) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetcher = ((url: string, init: RequestInit) => {
    calls.push({ url, init });
    return Promise.resolve(response);
  }) as unknown as typeof fetch;

  return { calls, fetcher };
}

describe('requestStructured with Anthropic', () => {
  const ok = reply({ content: [{ type: 'tool_use', input: { title: 'Lentejas' } }] });

  it('returns the forced tool call input', async () => {
    const { fetcher } = capture(ok);

    expect(await requestStructured(anthropic, request, fetcher)).toEqual({ title: 'Lentejas' });
  });

  it('sends the key in the header Anthropic expects, and nowhere else', async () => {
    const { calls, fetcher } = capture(ok);
    await requestStructured(anthropic, request, fetcher);

    const call = calls[0];
    expect(call?.url).toBe('https://api.anthropic.com/v1/messages');
    expect((call?.init.headers as Record<string, string>)['x-api-key']).toBe('sk-ant-test');
    expect(String(call?.init.body)).not.toContain('sk-ant-test');
  });

  it('forces the tool so the model cannot answer in prose', async () => {
    const { calls, fetcher } = capture(ok);
    await requestStructured(anthropic, request, fetcher);

    const body = JSON.parse(String(calls[0]?.init.body)) as Record<string, unknown>;
    expect(body.tool_choice).toEqual({ type: 'tool', name: 'recipe' });
  });

  it('fails when the answer carries no tool call', async () => {
    const { fetcher } = capture(reply({ content: [{ type: 'text', text: 'hello' }] }));

    expect(await failureOf(() => requestStructured(anthropic, request, fetcher))).toBe(
      'bad-response'
    );
  });
});

describe('requestStructured with OpenAI', () => {
  const ok = reply({ choices: [{ message: { content: '{"title":"Lentejas"}' } }] });

  it('parses the JSON out of the message content', async () => {
    const { fetcher } = capture(ok);

    expect(await requestStructured(openai, request, fetcher)).toEqual({ title: 'Lentejas' });
  });

  it('sends the key as a bearer token, and nowhere else', async () => {
    const { calls, fetcher } = capture(ok);
    await requestStructured(openai, request, fetcher);

    const call = calls[0];
    expect(call?.url).toBe('https://api.openai.com/v1/chat/completions');
    expect((call?.init.headers as Record<string, string>).authorization).toBe(
      'Bearer sk-openai-test'
    );
    expect(String(call?.init.body)).not.toContain('sk-openai-test');
  });

  it('asks for strict schema conformance', async () => {
    const { calls, fetcher } = capture(ok);
    await requestStructured(openai, request, fetcher);

    const body = JSON.parse(String(calls[0]?.init.body)) as {
      response_format?: { json_schema?: { strict?: boolean } };
    };
    expect(body.response_format?.json_schema?.strict).toBe(true);
  });

  it('fails when the content is not JSON', async () => {
    const { fetcher } = capture(reply({ choices: [{ message: { content: 'sorry!' } }] }));

    expect(await failureOf(() => requestStructured(openai, request, fetcher))).toBe('bad-response');
  });
});

describe('failures', () => {
  it('reads 401 as a bad key, which is the one the user can fix', async () => {
    const { fetcher } = capture(reply({}, 401));

    expect(await failureOf(() => testCredentials(anthropic, fetcher))).toBe('unauthorized');
  });

  it('reads 403 as a bad key too', async () => {
    const { fetcher } = capture(reply({}, 403));

    expect(await failureOf(() => testCredentials(anthropic, fetcher))).toBe('unauthorized');
  });

  it('separates rate limiting from a broken key', async () => {
    const { fetcher } = capture(reply({}, 429));

    expect(await failureOf(() => testCredentials(anthropic, fetcher))).toBe('rate-limited');
  });

  it('reports any other error status as unreachable', async () => {
    const { fetcher } = capture(reply({}, 500));

    expect(await failureOf(() => testCredentials(anthropic, fetcher))).toBe('unreachable');
  });

  it('reports an unparseable body', async () => {
    const { fetcher } = capture(broken());

    expect(await failureOf(() => testCredentials(anthropic, fetcher))).toBe('bad-response');
  });

  it('reports an aborted request as a timeout', async () => {
    const fetcher = (() => {
      const error = new Error('Aborted');
      error.name = 'AbortError';
      return Promise.reject(error);
    }) as unknown as typeof fetch;

    expect(await failureOf(() => testCredentials(anthropic, fetcher))).toBe('timeout');
  });

  it('reports a network failure', async () => {
    const fetcher = (() =>
      Promise.reject(new Error('Network request failed'))) as unknown as typeof fetch;

    expect(await failureOf(() => testCredentials(anthropic, fetcher))).toBe('unreachable');
  });
});

describe('testCredentials', () => {
  it('resolves when the vendor answers in the requested shape', async () => {
    const { fetcher } = capture(reply({ content: [{ type: 'tool_use', input: { ok: true } }] }));

    await expect(testCredentials(anthropic, fetcher)).resolves.toBeUndefined();
  });
});
