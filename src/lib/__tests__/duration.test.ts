import { effectiveTotalMinutes, splitDuration } from '@/lib/duration';

describe('splitDuration', () => {
  it('splits minutes into hours and remainder', () => {
    expect(splitDuration(90)).toEqual({ hours: 1, minutes: 30 });
    expect(splitDuration(45)).toEqual({ hours: 0, minutes: 45 });
    expect(splitDuration(120)).toEqual({ hours: 2, minutes: 0 });
  });

  it('clamps nonsense input instead of producing negative time', () => {
    expect(splitDuration(-10)).toEqual({ hours: 0, minutes: 0 });
  });
});

describe('effectiveTotalMinutes', () => {
  it('prefers the explicit total', () => {
    expect(
      effectiveTotalMinutes({ totalTimeMinutes: 50, prepTimeMinutes: 10, cookTimeMinutes: 20 })
    ).toBe(50);
  });

  it('adds prep and cook when there is no total', () => {
    expect(
      effectiveTotalMinutes({ totalTimeMinutes: null, prepTimeMinutes: 10, cookTimeMinutes: 20 })
    ).toBe(30);
  });

  it('works with only one of the two', () => {
    expect(
      effectiveTotalMinutes({ totalTimeMinutes: null, prepTimeMinutes: 10, cookTimeMinutes: null })
    ).toBe(10);
  });

  it('is null when the recipe has no times at all', () => {
    expect(
      effectiveTotalMinutes({
        totalTimeMinutes: null,
        prepTimeMinutes: null,
        cookTimeMinutes: null,
      })
    ).toBeNull();
  });
});
