import { NOTES, CHORD_TYPE_IDS, ProgressionChord } from '../constants/musicData';

const STORAGE_KEY = 'chord-explorer:v1';

interface StoredState {
  progression?: ProgressionChord[];
  bpm?: number;
}

const readStored = (): StoredState => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredState) : {};
  } catch {
    return {};
  }
};

const writeStored = (patch: StoredState): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readStored(), ...patch }));
  } catch {
    // Storage unavailable (private mode, quota) - persistence is best-effort.
  }
};

export const loadStoredProgression = (): ProgressionChord[] => {
  const { progression } = readStored();
  if (!Array.isArray(progression)) return [];
  return progression
    .filter(
      (c): c is ProgressionChord =>
        !!c &&
        (NOTES as readonly string[]).includes(c.root) &&
        (CHORD_TYPE_IDS as readonly string[]).includes(c.type),
    )
    .map(c => ({
      root: c.root,
      type: c.type,
      voicingIndex: Number.isInteger(c.voicingIndex) && c.voicingIndex >= 0 ? c.voicingIndex : 0,
    }))
    .slice(0, 8);
};

export const saveStoredProgression = (progression: ProgressionChord[]): void => {
  writeStored({ progression });
};

export const loadStoredBpm = (): number => {
  const { bpm } = readStored();
  return typeof bpm === 'number' && bpm >= 60 && bpm <= 240 ? Math.round(bpm) : 120;
};

export const saveStoredBpm = (bpm: number): void => {
  writeStored({ bpm });
};
