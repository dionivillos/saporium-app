import 'i18next';

import type es from './messages/es.json';

// Makes `t()` keys type-checked against the Spanish catalog, which is the
// reference language (see CLAUDE.md: English is added in one pass at F3).
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof es };
  }
}
