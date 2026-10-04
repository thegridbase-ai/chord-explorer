import {
  CalibrationAnswers,
  DEFAULT_HAND_PROFILE,
  HandProfile,
  calibrationFromProfile,
  handProfileHash,
  profileFromCalibration,
  validateHandProfile,
} from './engine';

// Separate from 'chord-explorer:v1' so a bad profile can never break the stored progression.
export const HAND_PROFILE_STORAGE_KEY = 'chord-explorer:hand-profile:v1';

// Same wording as RiffForge's hand profile drawer.
export const HAND_PROFILE_DISCLAIMER =
  'This is comfort guidance, not a medical or safety assessment. Stop if you feel pain or tension.';

const STORAGE_VERSION = 1;
// A real profile export is well under 1 KB; anything this large is not one.
const MAX_IMPORT_LENGTH = 20_000;

interface StoredHandProfile {
  version: typeof STORAGE_VERSION;
  profile: HandProfile;
}

export type HandProfileImport = { ok: true; profile: HandProfile } | { ok: false; error: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// validateHandProfile turns anything into a valid profile, so require the two reach numbers
// before calling it, otherwise unrelated JSON would silently "import" the defaults.
const looksLikeProfile = (value: unknown): value is Record<string, unknown> =>
  isRecord(value) &&
  typeof value.reachAtLowMm === 'number' && Number.isFinite(value.reachAtLowMm) &&
  typeof value.reachAtHighMm === 'number' && Number.isFinite(value.reachAtHighMm);

export const loadHandProfile = (): HandProfile => {
  if (typeof window === 'undefined') return DEFAULT_HAND_PROFILE;
  try {
    const raw = window.localStorage.getItem(HAND_PROFILE_STORAGE_KEY);
    if (!raw) return DEFAULT_HAND_PROFILE;
    const stored: unknown = JSON.parse(raw);
    if (!isRecord(stored) || stored.version !== STORAGE_VERSION || !isRecord(stored.profile)) {
      return DEFAULT_HAND_PROFILE;
    }
    return validateHandProfile(stored.profile);
  } catch {
    return DEFAULT_HAND_PROFILE;
  }
};

export const saveHandProfile = (profile: HandProfile): void => {
  if (typeof window === 'undefined') return;
  try {
    const stored: StoredHandProfile = { version: STORAGE_VERSION, profile: validateHandProfile(profile) };
    window.localStorage.setItem(HAND_PROFILE_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Storage unavailable (private mode, quota) - persistence is best-effort.
  }
};

export const clearHandProfile = (): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(HAND_PROFILE_STORAGE_KEY);
  } catch {
    // Best-effort, see saveHandProfile.
  }
};

export const isDefaultHandProfile = (profile: HandProfile): boolean =>
  handProfileHash(profile) === handProfileHash(DEFAULT_HAND_PROFILE);

export type QuickCalibration = Pick<CalibrationAnswers, 'lowPinkyFret' | 'highPinkyFret' | 'allowStretches' | 'noBarre'>;

/**
 * The two reach questions plus stretches and barres, applied on top of the current profile. Everything the quick
 * form does not ask about (scale length, pair limits, max fret, ...) is kept, so an imported profile keeps its tuning.
 */
export const applyCalibration = (profile: HandProfile, answers: QuickCalibration): HandProfile => {
  const calibrated = profileFromCalibration({ ...calibrationFromProfile(profile), ...answers });
  return validateHandProfile({
    ...profile,
    reachAtLowMm: calibrated.reachAtLowMm,
    reachAtHighMm: calibrated.reachAtHighMm,
    lowRefFret: calibrated.lowRefFret,
    highRefFret: calibrated.highRefFret,
    stretchTolerance: calibrated.stretchTolerance,
    noBarre: calibrated.noBarre,
  });
};

/**
 * Parses pasted JSON: RiffForge's export `{ app: 'riffforge', version: 1, profile }`, the stored
 * envelope `{ version: 1, profile }`, or a bare profile. Values are sanitized by the engine. Never throws.
 */
export const importHandProfile = (text: string): HandProfileImport => {
  if (typeof text !== 'string' || text.trim() === '') {
    return { ok: false, error: 'Paste the profile JSON first.' };
  }
  if (text.length > MAX_IMPORT_LENGTH) {
    return { ok: false, error: 'That is far too long to be a hand profile.' };
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'That is not valid JSON. Copy the whole profile, including the braces.' };
  }
  if (!isRecord(data)) {
    return { ok: false, error: 'Expected a JSON object with a hand profile.' };
  }

  const isEnvelope = 'profile' in data || 'app' in data;
  if (isEnvelope) {
    if (data.app !== undefined && data.app !== 'riffforge') {
      return { ok: false, error: 'This JSON was not exported by RiffForge.' };
    }
    if (data.version !== STORAGE_VERSION) {
      return { ok: false, error: `Unsupported profile export version (${String(data.version)}).` };
    }
    if (!looksLikeProfile(data.profile)) {
      return { ok: false, error: 'No hand profile found in this JSON.' };
    }
    return { ok: true, profile: validateHandProfile(data.profile) };
  }

  if (!looksLikeProfile(data)) {
    return { ok: false, error: 'No hand profile found in this JSON.' };
  }
  return { ok: true, profile: validateHandProfile(data) };
};
