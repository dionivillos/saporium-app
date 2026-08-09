import {
  fetchPage,
  MAX_BYTES,
  normalizeUrl,
  PageFetchError,
  type FetchFailure,
} from '@/lib/fetch-page';

function reply(
  body: string,
  { status = 200, headers = {} }: { status?: number; headers?: Record<string, string> } = {}
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'text/html', ...headers }),
    text: () => Promise.resolve(body),
  } as unknown as Response;
}

async function failureOf(run: () => Promise<unknown>): Promise<FetchFailure | 'no-failure'> {
  try {
    await run();
    return 'no-failure';
  } catch (error) {
    return error instanceof PageFetchError ? error.reason : 'no-failure';
  }
}

describe('normalizeUrl', () => {
  it('assumes https for a bare host, which is what people paste', () => {
    expect(normalizeUrl('cocina.example/receta')).toBe('https://cocina.example/receta');
  });

  it('keeps an https url as it is', () => {
    expect(normalizeUrl('https://cocina.example/receta')).toBe('https://cocina.example/receta');
  });

  it('trims surrounding whitespace from a pasted url', () => {
    expect(normalizeUrl('  https://cocina.example/  ')).toBe('https://cocina.example/');
  });

  it('refuses plain http rather than silently upgrading it', async () => {
    expect(await failureOf(async () => normalizeUrl('http://cocina.example'))).toBe('insecure');
  });

  it('refuses other schemes', async () => {
    expect(await failureOf(async () => normalizeUrl('file:///etc/passwd'))).toBe('invalid-url');
    expect(await failureOf(async () => normalizeUrl('javascript:alert(1)'))).toBe('invalid-url');
  });

  it('refuses an empty string', async () => {
    expect(await failureOf(async () => normalizeUrl('   '))).toBe('invalid-url');
  });
});

describe('fetchPage', () => {
  it('returns the body of a plain response', async () => {
    const html = await fetchPage('https://cocina.example', () => Promise.resolve(reply('<html/>')));

    expect(html).toBe('<html/>');
  });

  it('follows a redirect the platform handed back', async () => {
    const pages = [
      reply('', { status: 301, headers: { location: 'https://cocina.example/final' } }),
      reply('<html>final</html>'),
    ];
    const fetcher = jest.fn(() => Promise.resolve(pages.shift() ?? reply('')));

    expect(await fetchPage('https://cocina.example', fetcher as never)).toBe('<html>final</html>');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('gives up rather than following a redirect loop', async () => {
    const fetcher = () =>
      Promise.resolve(
        reply('', { status: 302, headers: { location: 'https://cocina.example/a' } })
      );

    expect(await failureOf(() => fetchPage('https://cocina.example', fetcher as never))).toBe(
      'too-many-redirects'
    );
  });

  it('refuses a redirect that leaves https', async () => {
    const fetcher = () =>
      Promise.resolve(reply('', { status: 302, headers: { location: 'http://cocina.example/a' } }));

    expect(await failureOf(() => fetchPage('https://cocina.example', fetcher as never))).toBe(
      'insecure'
    );
  });

  it('refuses a response that is not html', async () => {
    const fetcher = () =>
      Promise.resolve(reply('{}', { headers: { 'content-type': 'application/json' } }));

    expect(await failureOf(() => fetchPage('https://cocina.example', fetcher as never))).toBe(
      'not-html'
    );
  });

  it('stops on a declared length over the cap without reading the body', async () => {
    const text = jest.fn(() => Promise.resolve(''));
    const fetcher = () =>
      Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({
          'content-type': 'text/html',
          'content-length': String(MAX_BYTES + 1),
        }),
        text,
      } as unknown as Response);

    expect(await failureOf(() => fetchPage('https://cocina.example', fetcher as never))).toBe(
      'too-large'
    );
    expect(text).not.toHaveBeenCalled();
  });

  it('stops on an oversized body that declared no length', async () => {
    const fetcher = () => Promise.resolve(reply('x'.repeat(MAX_BYTES + 1)));

    expect(await failureOf(() => fetchPage('https://cocina.example', fetcher as never))).toBe(
      'too-large'
    );
  });

  it('reports an http error as unreachable', async () => {
    const fetcher = () => Promise.resolve(reply('nope', { status: 404 }));

    expect(await failureOf(() => fetchPage('https://cocina.example', fetcher as never))).toBe(
      'unreachable'
    );
  });

  it('reports an aborted request as a timeout', async () => {
    const fetcher = () => {
      const error = new Error('Aborted');
      error.name = 'AbortError';
      return Promise.reject(error);
    };

    expect(await failureOf(() => fetchPage('https://cocina.example', fetcher as never))).toBe(
      'timeout'
    );
  });

  it('reports a network failure as unreachable', async () => {
    const fetcher = () => Promise.reject(new Error('Network request failed'));

    expect(await failureOf(() => fetchPage('https://cocina.example', fetcher as never))).toBe(
      'unreachable'
    );
  });
});
