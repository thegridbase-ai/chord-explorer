import { NOTES, CHORD_TYPE_IDS, Note, ChordType } from '../constants/musicData';
import { SCALE_TYPE_IDS, ScaleType } from '../constants/scaleData';

export interface UrlState {
  root?: Note;
  type?: ChordType;
  voicing?: number;
  scale?: ScaleType;
  inv?: number;
}

// Parses ?root=C&type=m7&voicing=1&scale=dorian&inv=1. Invalid values are ignored.
export const readStateFromUrl = (): UrlState => {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const state: UrlState = {};

  const root = params.get('root');
  if (root && (NOTES as readonly string[]).includes(root)) {
    state.root = root as Note;
  }

  const type = params.get('type');
  if (type && (CHORD_TYPE_IDS as readonly string[]).includes(type)) {
    state.type = type as ChordType;
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

  return state;
};

export const writeStateToUrl = (
  root: Note,
  type: ChordType,
  voicing: number,
  scaleActive: boolean,
  scale: ScaleType,
  inversion: number = 0,
): void => {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams();
  params.set('root', root);
  params.set('type', type);
  params.set('voicing', String(voicing));
  if (scaleActive) params.set('scale', scale);
  if (inversion > 0) params.set('inv', String(inversion));
  window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
};
