import type { AiCredentials, AiProvider } from '@/lib/ai/credentials';

/**
 * A very thin client that asks a vendor for JSON matching a schema.
 *
 * The call goes from the device straight to the vendor with the user's own key.
 * There is no server of ours in the path and never will be, so this file is the
 * whole of the "AI backend". Both vendors are one POST; the differences are the
 * header, the envelope and where the JSON comes back, which is why they live
 * side by side here rather than behind an abstraction.
 */

/** A constant, not a setting, until someone actually needs to change it. */
const MODELS: Record<AiProvider, string> = {
  anthropic: 'claude-haiku-4-5-20251001',
  openai: 'gpt-4o-mini',
};

const TIMEOUT_MS = 30_000;
const MAX_TOKENS = 4096;

export type AiFailure =
  'unauthorized' | 'rate-limited' | 'unreachable' | 'timeout' | 'bad-response';

export class AiError extends Error {
  constructor(readonly reason: AiFailure) {
    super(reason);
    this.name = 'AiError';
  }
}

export type StructuredRequest = {
  system: string;
  prompt: string;
  /** JSON Schema for the object wanted back. */
  schema: Record<string, unknown>;
  schemaName: string;
};

type Fetch = typeof globalThis.fetch;

/** Asks the vendor for one JSON object shaped like `schema`. Never validates it. */
export async function requestStructured(
  credentials: AiCredentials,
  request: StructuredRequest,
  fetcher: Fetch = fetch
): Promise<unknown> {
  const body = credentials.provider === 'anthropic' ? anthropicBody(request) : openAiBody(request);

  const response = await post(credentials, body, fetcher);
  const payload: unknown = await readJson(response);

  return credentials.provider === 'anthropic' ? anthropicResult(payload) : openAiResult(payload);
}

/**
 * The smallest call that proves the key works. Deliberately not free: there is
 * no cheaper way to tell a valid key from a typo than to use it once.
 */
export async function testCredentials(
  credentials: AiCredentials,
  fetcher: Fetch = fetch
): Promise<void> {
  await requestStructured(
    credentials,
    {
      system: 'You answer with the requested JSON and nothing else.',
      prompt: 'Reply with ok set to true.',
      schemaName: 'connection_check',
      schema: {
        type: 'object',
        properties: { ok: { type: 'boolean' } },
        required: ['ok'],
        additionalProperties: false,
      },
    },
    fetcher
  );
}

const ENDPOINTS: Record<AiProvider, string> = {
  anthropic: 'https://api.anthropic.com/v1/messages',
  openai: 'https://api.openai.com/v1/chat/completions',
};

function headers(credentials: AiCredentials): Record<string, string> {
  const common = { 'content-type': 'application/json' };

  return credentials.provider === 'anthropic'
    ? { ...common, 'x-api-key': credentials.apiKey, 'anthropic-version': '2023-06-01' }
    : { ...common, authorization: `Bearer ${credentials.apiKey}` };
}

async function post(credentials: AiCredentials, body: unknown, fetcher: Fetch): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetcher(ENDPOINTS[credentials.provider], {
      method: 'POST',
      headers: headers(credentials),
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    throw new AiError(
      error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'unreachable'
    );
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 401 || response.status === 403) throw new AiError('unauthorized');
  if (response.status === 429) throw new AiError('rate-limited');
  if (!response.ok) throw new AiError('unreachable');

  return response;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new AiError('bad-response');
  }
}

// Anthropic returns the object as the input of a forced tool call.
function anthropicBody(request: StructuredRequest): unknown {
  return {
    model: MODELS.anthropic,
    max_tokens: MAX_TOKENS,
    system: request.system,
    tools: [
      { name: request.schemaName, description: request.system, input_schema: request.schema },
    ],
    tool_choice: { type: 'tool', name: request.schemaName },
    messages: [{ role: 'user', content: request.prompt }],
  };
}

function anthropicResult(payload: unknown): unknown {
  const content = (payload as { content?: unknown }).content;
  if (!Array.isArray(content)) throw new AiError('bad-response');

  const block = content.find(
    (item): item is { type: string; input: unknown } =>
      typeof item === 'object' && item !== null && (item as { type?: unknown }).type === 'tool_use'
  );

  if (block === undefined) throw new AiError('bad-response');

  return block.input;
}

// OpenAI returns it as a JSON string in the message content.
function openAiBody(request: StructuredRequest): unknown {
  return {
    model: MODELS.openai,
    response_format: {
      type: 'json_schema',
      json_schema: { name: request.schemaName, schema: request.schema, strict: true },
    },
    messages: [
      { role: 'system', content: request.system },
      { role: 'user', content: request.prompt },
    ],
  };
}

function openAiResult(payload: unknown): unknown {
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices)) throw new AiError('bad-response');

  const content = (choices[0] as { message?: { content?: unknown } } | undefined)?.message?.content;
  if (typeof content !== 'string') throw new AiError('bad-response');

  try {
    return JSON.parse(content);
  } catch {
    throw new AiError('bad-response');
  }
}
