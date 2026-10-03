import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  HAND_PROFILE_STORAGE_KEY,
  HAND_PROFILE_DISCLAIMER,
  loadHandProfile,
  saveHandProfile,
  clearHandProfile,
  importHandProfile,
  isDefaultHandProfile,
  applyCalibration,
} from './handProfileStorage';
import {
  DEFAULT_HAND_PROFILE,
  profileFromCalibration,
  calibrationFromProfile,
  validateHandProfile,
  DEFAULT_CALIBRATION,
  STRETCH_TOLERANCE_ALLOW,
  handProfileHash,
} from './engine';

const createMemoryStorage = () => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => (data.has(key) ? data.get(key)! : null),
    setItem: (key: string, value: string) => { data.set(key, String(value)); },
    removeItem: (key: string) => { data.delete(key); },
  };
};

// A smaller hand: pinky reaches fret 3 from index on fret 1, fret 9 from index on fret 7.
const SMALL_PROFILE = profileFromCalibration({ ...DEFAULT_CALIBRATION, lowPinkyFret: 3, highPinkyFret: 9 });

describe('hand profile storage', () => {
  let storage: ReturnType<typeof createMemoryStorage>;

  beforeEach(() => {
    storage = createMemoryStorage();
    vi.stubGlobal('window', { localStorage: storage });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses its own key, separate from the progression store', () => {
    expect(HAND_PROFILE_STORAGE_KEY).toBe('chord-explorer:hand-profile:v1');
  });

  it('carries the ergonomics disclaimer verbatim', () => {
    expect(HAND_PROFILE_DISCLAIMER).toBe(
      'This is comfort guidance, not a medical or safety assessment. Stop if you feel pain or tension.',
    );
  });

  it('falls back to the default profile when nothing is stored', () => {
    expect(loadHandProfile()).toEqual(DEFAULT_HAND_PROFILE);
  });

  it('round-trips a saved profile inside a versioned envelope', () => {
    saveHandProfile(SMALL_PROFILE);
    const stored = JSON.parse(storage.data.get(HAND_PROFILE_STORAGE_KEY)!);
    expect(stored.version).toBe(1);
    expect(stored.profile.reachAtLowMm).toBeCloseTo(SMALL_PROFILE.reachAtLowMm, 6);
    expect(loadHandProfile()).toEqual(SMALL_PROFILE);
  });

  it('falls back to the default for corrupt or foreign data', () => {
    for (const raw of ['not json', '42', 'null', '{"version":2,"profile":{}}', '{"profile":"x"}', '[]']) {
      storage.data.set(HAND_PROFILE_STORAGE_KEY, raw);
      expect(loadHandProfile(), raw).toEqual(DEFAULT_HAND_PROFILE);
    }
  });

  it('sanitizes stored numbers into the engine limits', () => {
    storage.data.set(
      HAND_PROFILE_STORAGE_KEY,
      JSON.stringify({ version: 1, profile: { ...DEFAULT_HAND_PROFILE, reachAtLowMm: 9999, maxFret: 'high' } }),
    );
    const loaded = loadHandProfile();
    expect(loaded.reachAtLowMm).toBe(220);
    expect(loaded.maxFret).toBe(DEFAULT_HAND_PROFILE.maxFret);
  });

  it('clears back to the default', () => {
    saveHandProfile(SMALL_PROFILE);
    clearHandProfile();
    expect(storage.data.has(HAND_PROFILE_STORAGE_KEY)).toBe(false);
    expect(loadHandProfile()).toEqual(DEFAULT_HAND_PROFILE);
  });

  it('never throws when storage is unavailable', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => { throw new Error('denied'); },
        setItem: () => { throw new Error('quota'); },
        removeItem: () => { throw new Error('denied'); },
      },
    });
    expect(loadHandProfile()).toEqual(DEFAULT_HAND_PROFILE);
    expect(() => saveHandProfile(SMALL_PROFILE)).not.toThrow();
    expect(() => clearHandProfile()).not.toThrow();
  });

  it('works without a window (SSR, node)', () => {
    vi.unstubAllGlobals();
    expect(typeof window).toBe('undefined');
    expect(loadHandProfile()).toEqual(DEFAULT_HAND_PROFILE);
    expect(() => saveHandProfile(SMALL_PROFILE)).not.toThrow();
  });
});

describe('importHandProfile', () => {
  it("accepts RiffForge's export envelope", () => {
    const result = importHandProfile(JSON.stringify({ app: 'riffforge', version: 1, profile: SMALL_PROFILE }));
    expect(result.ok).toBe(true);
    if (result.ok === true) expect(result.profile).toEqual(SMALL_PROFILE);
  });

  it('accepts a bare profile and surrounding whitespace', () => {
    const result = importHandProfile(`\n  ${JSON.stringify(SMALL_PROFILE, null, 2)}  \n`);
    expect(result.ok).toBe(true);
    if (result.ok === true) expect(handProfileHash(result.profile)).toBe(handProfileHash(SMALL_PROFILE));
  });

  it('accepts the stored envelope without an app tag', () => {
    const result = importHandProfile(JSON.stringify({ version: 1, profile: SMALL_PROFILE }));
    expect(result.ok).toBe(true);
  });

  it('sanitizes imported values instead of trusting them', () => {
    const result = importHandProfile(JSON.stringify({ ...SMALL_PROFILE, reachAtHighMm: -5, noBarre: 'yes' }));
    expect(result.ok).toBe(true);
    if (result.ok === true) {
      expect(result.profile.reachAtHighMm).toBe(30);
      expect(result.profile.noBarre).toBe(DEFAULT_HAND_PROFILE.noBarre);
    }
  });

  it('rejects input that is not a hand profile, with a reason and without throwing', () => {
    const cases: string[] = [
      '',
      '   ',
      'not json at all',
      '{"app":"riffforge"',
      'null',
      '42',
      '"profile"',
      '[]',
      '{}',
      '{"foo":1}',
      JSON.stringify({ app: 'riffforge', version: 1 }),
      JSON.stringify({ app: 'riffforge', version: 1, profile: 'small' }),
      JSON.stringify({ app: 'riffforge', version: 2, profile: SMALL_PROFILE }),
      JSON.stringify({ app: 'someone-else', version: 1, profile: SMALL_PROFILE }),
      JSON.stringify({ ...SMALL_PROFILE, reachAtLowMm: 'long' }),
      'x'.repeat(50_000),
    ];
    for (const text of cases) {
      let result: ReturnType<typeof importHandProfile> | undefined;
      expect(() => { result = importHandProfile(text); }, text.slice(0, 40)).not.toThrow();
      expect(result!.ok, text.slice(0, 40)).toBe(false);
      if (result!.ok === false) expect(result!.error.length, text.slice(0, 40)).toBeGreaterThan(0);
    }
  });

  it('tolerates non-string input at runtime', () => {
    const result = importHandProfile(undefined as unknown as string);
    expect(result.ok).toBe(false);
  });
});

describe('isDefaultHandProfile', () => {
  it('compares by value', () => {
    expect(isDefaultHandProfile(DEFAULT_HAND_PROFILE)).toBe(true);
    expect(isDefaultHandProfile({ ...DEFAULT_HAND_PROFILE })).toBe(true);
    expect(isDefaultHandProfile(SMALL_PROFILE)).toBe(false);
  });
});

describe('applyCalibration', () => {
  it('takes reach, stretch and barre preference from the answers and keeps the rest of the profile', () => {
    const custom = validateHandProfile({
      ...DEFAULT_HAND_PROFILE,
      pairLimits: { indexMiddle: 0.5, middleRing: 0.3, ringPinky: 0.35 },
      maxFret: 12,
      allowThumb: true,
    });
    const next = applyCalibration(custom, { lowPinkyFret: 3, highPinkyFret: 9, allowStretches: true, noBarre: false });

    expect(next.reachAtLowMm).toBeCloseTo(SMALL_PROFILE.reachAtLowMm, 6);
    expect(next.reachAtHighMm).toBeCloseTo(SMALL_PROFILE.reachAtHighMm, 6);
    expect(next.stretchTolerance).toBe(STRETCH_TOLERANCE_ALLOW);
    expect(next.noBarre).toBe(false);
    expect(next.pairLimits).toEqual(custom.pairLimits);
    expect(next.maxFret).toBe(12);
    expect(next.allowThumb).toBe(true);
  });

  it('round-trips the default profile through its own calibration answers', () => {
    const answers = calibrationFromProfile(DEFAULT_HAND_PROFILE);
    expect(handProfileHash(applyCalibration(DEFAULT_HAND_PROFILE, answers))).toBe(handProfileHash(DEFAULT_HAND_PROFILE));
  });

  it('clamps answers outside the calibration ranges', () => {
    const next = applyCalibration(DEFAULT_HAND_PROFILE, { lowPinkyFret: 99, highPinkyFret: -4, allowStretches: false, noBarre: true });
    const answers = calibrationFromProfile(next);
    expect(answers.lowPinkyFret).toBe(7);
    expect(answers.highPinkyFret).toBe(9);
  });
});
