import { describe, it, expect, afterEach, vi } from 'vitest';
import { readStateFromUrl, writeStateToUrl } from './urlState';

const stubLocation = (search: string) => {
  const replaceState = vi.fn();
  vi.stubGlobal('window', { location: { search, pathname: '/' }, history: { replaceState } });
  return replaceState;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('readStateFromUrl', () => {
  it('reads the existing params unchanged', () => {
    stubLocation('?root=C&type=m7&voicing=1&scale=dorian&inv=1');
    expect(readStateFromUrl()).toEqual({ root: 'C', type: 'm7', voicing: 1, scale: 'dorian', inv: 1 });
  });

  it('ignores invalid values', () => {
    stubLocation('?root=H&type=power&voicing=abc&scale=nope&inv=7&gv=0-2-2');
    expect(readStateFromUrl()).toEqual({});
  });

  it('returns nothing without a window', () => {
    expect(readStateFromUrl()).toEqual({});
  });

  it('accepts chord types in any case', () => {
    const cases: [string, string][] = [
      ['major', 'Major'],
      ['Major', 'Major'],
      ['MINOR', 'minor'],
      ['Maj7', 'maj7'],
      ['m7', 'm7'],
      ['DIM7', 'dim7'],
      ['Sus2', 'sus2'],
      ['7', '7'],
    ];
    for (const [param, type] of cases) {
      stubLocation(`?type=${encodeURIComponent(param)}`);
      expect(readStateFromUrl().type, param).toBe(type);
    }
  });

  it('does not read a capital M7 (major seventh shorthand) as m7', () => {
    stubLocation('?type=M7');
    expect(readStateFromUrl().type).toBeUndefined();
  });

  it('accepts flat and lowercase roots, stored with sharps', () => {
    const cases: [string, string][] = [
      ['Bb', 'A#'],
      ['Db', 'C#'],
      ['Eb', 'D#'],
      ['Gb', 'F#'],
      ['Ab', 'G#'],
      ['C#', 'C#'],
      ['e', 'E'],
      ['bb', 'A#'],
      ['Cb', 'B'],
      ['E#', 'F'],
    ];
    for (const [param, root] of cases) {
      stubLocation(`?root=${encodeURIComponent(param)}`);
      expect(readStateFromUrl().root, param).toBe(root);
    }
    for (const param of ['H', 'C##x', 'Bbb b', '1', '']) {
      stubLocation(`?root=${encodeURIComponent(param)}`);
      expect(readStateFromUrl().root, param).toBeUndefined();
    }
  });

  it('reads a generated voicing shape from gv', () => {
    stubLocation('?root=E&type=major&gv=0-2-2-x-x-x');
    expect(readStateFromUrl()).toEqual({ root: 'E', type: 'Major', gv: [0, 2, 2, null, null, null] });
  });

  it('drops a malformed gv', () => {
    for (const gv of ['0-2-2-x-x', '0-2-30-x-x-x', 'x-x-x-x-x-x', 'a-b-c-d-e-f']) {
      stubLocation(`?root=E&gv=${gv}`);
      expect(readStateFromUrl(), gv).toEqual({ root: 'E' });
    }
  });
});

describe('writeStateToUrl', () => {
  it('writes the same query as before when no shape is given', () => {
    const replaceState = stubLocation('');
    writeStateToUrl('C', 'Major', 1, true, 'dorian', 2);
    expect(replaceState).toHaveBeenCalledWith(null, '', '/?root=C&type=Major&voicing=1&scale=dorian&inv=2');

    writeStateToUrl('A#', 'minor', 0, false, 'dorian');
    expect(replaceState).toHaveBeenLastCalledWith(null, '', '/?root=A%23&type=minor&voicing=0');
  });

  it('keeps the generated voicing as gv', () => {
    const replaceState = stubLocation('');
    writeStateToUrl('A', 'minor', 0, false, 'dorian', 0, [null, 0, 2, 2, 1, 0]);
    expect(replaceState).toHaveBeenCalledWith(null, '', '/?root=A&type=minor&voicing=0&gv=x-0-2-2-1-0');

    writeStateToUrl('A', 'minor', 0, false, 'dorian', 0, null);
    expect(replaceState).toHaveBeenLastCalledWith(null, '', '/?root=A&type=minor&voicing=0');
  });

  it('round-trips through readStateFromUrl', () => {
    const replaceState = stubLocation('');
    writeStateToUrl('G#', 'dim7', 2, true, 'dorian', 1, [4, 5, 3, 4, null, null]);
    const url: string = replaceState.mock.calls[0][2];
    stubLocation(url.slice(url.indexOf('?')));
    expect(readStateFromUrl()).toEqual({ root: 'G#', type: 'dim7', voicing: 2, scale: 'dorian', inv: 1, gv: [4, 5, 3, 4, null, null] });
  });
});
