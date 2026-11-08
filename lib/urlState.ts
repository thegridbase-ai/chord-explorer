import { NOTES, CHORD_TYPE_IDS, Note, ChordType, ProgressionChord } from '../constants/musicData';
import { SCALE_TYPE_IDS, ScaleType } from '../constants/scaleData';
import { Shape, parsePitchClass } from './engine';
import { chordTypeForShape, parseGvParam, toGvParam } from './playable';

export interface UrlState {
  root?: Note;
  type?: ChordType;
  voicing?: number;
  scale?: ScaleType;
  inv?: number;
  /** Generated "Playable for me" shape, low -> high string, null = muted. */
  gv?: Shape;
  /** Shared progression from ?prog=; absent when the param is missing or holds nothing valid. */
  progression?: ProgressionChord[];
}

const MAX_PROGRESSION = 8;

/**
 * Progression param: chords separated by commas, each `root.type.voicing` (voicing optional), e.g.
 * `A.minor.0,F.major.1,C.major,G.major`. Roots accept flats and lowercase like `root`. Invalid chords
 * are skipped; more than eight are cut.
 */
export const parseProgParam = (value: string | null): ProgressionChord[] | undefined => {
  if (!value) return undefined;
  const chords: ProgressionChord[] = [];
  for (const token of value.split(',')) {
    const [rootRaw, typeRaw, voicingRaw] = token.split('.');
    const pc = rootRaw ? parsePitchClass(rootRaw) : null;
    const type = typeRaw ? parseChordType(typeRaw) : undefined;
    if (pc === null || !type) continue;
    const voicingIndex = voicingRaw !== undefined && /^\d{1,2}$/.test(voicingRaw) ? Number(voicingRaw) : 0;
    chords.push({ root: NOTES[pc], type, voicingIndex });
    if (chords.length >= MAX_PROGRESSION) break;
  }
  return chords.length > 0 ? chords : undefined;
};

export const toProgParam = (progression: readonly ProgressionChord[]): string =>
  progression
    .slice(0, MAX_PROGRESSION)
    .map(c => (c.voicingIndex > 0 ? `${c.root}.${c.type}.${c.voicingIndex}` : `${c.root}.${c.type}`))
    .join(',');

// Case-insensitive so links like ?type=major work. A capital "M7" is shorthand for a major seventh,
// so it is not folded into m7.
const parseChordType = (value: string): ChordType | undefined => {
  if ((CHORD_TYPE_IDS as readonly string[]).includes(value)) return value as ChordType;
  if (value === 'M7') return undefined;
  const lower = value.toLowerCase();
  return CHORD_TYPE_IDS.find(id => id.toLowerCase() === lower);
};

// Parses ?root=C&type=m7&voicing=1&scale=dorian&inv=1 or &gv=x-3-2-0-1-0. Invalid values are ignored.
// Roots may use flats or lowercase letters (Bb -> A#); they are stored with the app's sharp names.
export const readStateFromUrl = (): UrlState => {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const state: UrlState = {};

  const root = params.get('root');
  const rootPc = root ? parsePitchClass(root) : null;
  if (rootPc !== null) {
    state.root = NOTES[rootPc];
  }

  const type = params.get('type');
  const chordType = type ? parseChordType(type) : undefined;
  if (chordType) {
    state.type = chordType;
  }

  const voicing = params.get('voicing');
  if (voicing !== null && /^\d{1,2}$/.test(voicing)) {
    state.voicing = Number(voicing);
  }

  const scale = params.get('scale');
  if (scale && (SCALE_TYPE_IDS as readonly string[]).includes(scale)) {
    state.scale = scale as ScaleType;
  }

  const inv = params.get('inv');
  if (inv !== null && /^[0-3]$/.test(inv)) {
    state.inv = Number(inv);
  }

  // A gv without a type takes the type its notes spell; one that spells none (E5, clusters) is dropped rather
  // than shown under the default type. A gv is the voicing on screen, so it wins over inv.
  const gv = parseGvParam(params.get('gv'));
  if (gv) {
    const gvType = state.type ?? (rootPc !== null ? chordTypeForShape(gv, rootPc) : null);
    if (gvType) {
      state.type = gvType;
      state.gv = gv;
      delete state.inv;
    }
  }

  const progression = parseProgParam(params.get('prog'));
  if (progression) state.progression = progression;

  return state;
};

export const writeStateToUrl = (
  root: Note,
  type: ChordType,
  voicing: number,
  scaleActive: boolean,
  scale: ScaleType,
  inversion: number = 0,
  generatedShape: Shape | null = null,
  progression: readonly ProgressionChord[] = [],
): void => {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams();
  params.set('root', root);
  params.set('type', type);
  params.set('voicing', String(voicing));
  if (scaleActive) params.set('scale', scale);
  if (inversion > 0 && !generatedShape) params.set('inv', String(inversion));
  if (generatedShape) params.set('gv', toGvParam(generatedShape));
  if (progression.length > 0) params.set('prog', toProgParam(progression));
  window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
};
