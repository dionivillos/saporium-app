/**
 * Search normalisation, shared by the SQL query and any in-memory matching.
 *
 * SQLite's `lower()` and `LIKE` only fold ASCII, so "Puré" never matches a
 * search for "pure" unless the accents are stripped explicitly on both sides.
 * The set of letters that matters is small and closed for the languages the app
 * ships in, and it lives here so the SQL builder and the JS side cannot drift.
 */
export const FOLDED_CHARACTERS: Readonly<Record<string, string>> = {
  á: 'a',
  é: 'e',
  í: 'i',
  ó: 'o',
  ú: 'u',
  ü: 'u',
  ñ: 'n',
  ç: 'c',
};

/** Lowercases and strips the accents above. */
export function foldForSearch(text: string): string {
  return [...text.toLowerCase()]
    .map((character) => FOLDED_CHARACTERS[character] ?? character)
    .join('');
}

/**
 * Escapes the wildcards a user can type, so searching for "50%" looks for that
 * text instead of matching everything. Pairs with `ESCAPE '\'` in the query.
 */
export function escapeLikePattern(text: string): string {
  return text.replace(/[\\%_]/g, (character) => `\\${character}`);
}
