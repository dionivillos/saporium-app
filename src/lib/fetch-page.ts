/**
 * Fetching a recipe page from the device.
 *
 * The request goes straight from the phone to the site with no credentials of
 * ours attached and no server in between, so the usual server-side worries
 * (SSRF, request forgery against an internal network) do not apply. What is
 * left is protecting the user: do not hang, do not swallow a phone's worth of
 * memory, and do not send the URL over plain HTTP.
 */

export const MAX_REDIRECTS = 3;
export const TIMEOUT_MS = 10_000;
export const MAX_BYTES = 2 * 1024 * 1024;

export type FetchFailure =
  | 'invalid-url'
  | 'insecure'
  | 'timeout'
  | 'too-many-redirects'
  | 'too-large'
  | 'not-html'
  | 'unreachable';

export class PageFetchError extends Error {
  constructor(readonly reason: FetchFailure) {
    super(reason);
    this.name = 'PageFetchError';
  }
}

/** Adds `https://` when the user pastes a bare host, and rejects anything else. */
export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (trimmed.length === 0) throw new PageFetchError('invalid-url');

  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new PageFetchError('invalid-url');
  }

  if (url.protocol === 'http:') throw new PageFetchError('insecure');
  if (url.protocol !== 'https:') throw new PageFetchError('invalid-url');
  if (url.hostname.length === 0) throw new PageFetchError('invalid-url');

  return url.toString();
}

type Fetch = typeof globalThis.fetch;

/**
 * Returns the page's HTML. `fetcher` is injectable so the limits can be tested
 * without a network.
 */
export async function fetchPage(rawUrl: string, fetcher: Fetch = fetch): Promise<string> {
  let url = normalizeUrl(rawUrl);

  for (let redirects = 0; ; redirects += 1) {
    const response = await request(url, fetcher);

    const location =
      response.status >= 300 && response.status < 400 ? response.headers.get('location') : null;

    // React Native usually follows redirects itself, in which case this loop
    // never runs. When it does hand them back, the cap is enforced here.
    if (location === null) return await readHtml(response);

    if (redirects >= MAX_REDIRECTS) throw new PageFetchError('too-many-redirects');
    url = normalizeUrl(new URL(location, url).toString());
  }
}

async function request(url: string, fetcher: Fetch): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    return await fetcher(url, {
      headers: { accept: 'text/html,application/xhtml+xml' },
      signal: controller.signal,
    });
  } catch (error) {
    throw new PageFetchError(
      error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'unreachable'
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function readHtml(response: Response): Promise<string> {
  if (!response.ok) throw new PageFetchError('unreachable');

  const type = response.headers.get('content-type') ?? '';
  if (type.length > 0 && !/text\/html|application\/xhtml\+xml/i.test(type)) {
    throw new PageFetchError('not-html');
  }

  const declared = Number(response.headers.get('content-length') ?? '');
  if (Number.isFinite(declared) && declared > MAX_BYTES) throw new PageFetchError('too-large');

  // Without streaming the body is already in memory by the time it can be
  // measured; the declared length above is what stops the worst case early.
  const html = await response.text();
  if (html.length > MAX_BYTES) throw new PageFetchError('too-large');

  return html;
}
