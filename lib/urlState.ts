import { NOTES, CHORD_TYPE_IDS, Note, ChordType } from '../constants/musicData';
import { SCALE_TYPE_IDS, ScaleType } from '../constants/scaleData';
import { Shape, parsePitchClass } from './engine';
import { parseGvParam, toGvParam } from './playable';

export interface UrlState {
  root?: Note;
  type?: ChordType;
  voicing?: number;
  scale?: ScaleType;
  inv?: number;
  /** Generated "Playable for me" shape, low -> high string, null = muted. */
  gv?: Shape;
}

// Case-insensitive so links like ?type=major work. A capital "M7" is shorthand for a major seventh,
// so it is not folded into m7.
const parseChordType = (value: string): ChordType | undefined => {
  if ((CHORD_TYPE_IDS as readonly string[]).includes(value)) return value as ChordType;
  if (value === 'M7') return undefined;
  const lower = value.toLowerCase();
  return CHORD_TYPE_IDS.find(id => id.toLowerCase() === lower);
};

// Parses ?root=C&type=m7&voicing=1&scale=dorian&inv=1&gv=x-3-2-0-1-0. Invalid values are ignored.
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

  const gv = parseGvParam(params.get('gv'));
  if (gv) {
    state.gv = gv;
  }

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
): void => {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams();
  params.set('root', root);
  params.set('type', type);
  params.set('voicing', String(voicing));
  if (scaleActive) params.set('scale', scale);
  if (inversion > 0) params.set('inv', String(inversion));
  if (generatedShape) params.set('gv', toGvParam(generatedShape));
  window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
};
