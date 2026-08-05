import { randomUUID } from 'expo-crypto';

/** Primary keys are UUID strings minted here, never by SQLite. */
export function newId(): string {
  return randomUUID();
}
