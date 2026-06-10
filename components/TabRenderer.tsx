
import React, { useMemo, useRef, useEffect, useState, memo } from 'react';

// ─── Raw API Interfaces ───────────────────────────────────────────────

interface BendPoint {
  offset: number;
  value: number;
}

interface TabNote {
  fret: number;
  string: number;
  rest?: boolean;
  bend?: { points: BendPoint[] };
  slide?: 'legato' | 'shift';
  hp?: string; // "h" = hammer-on, "p" = pull-off
  staccato?: boolean;
  ghost?: boolean;
  dead?: boolean;
  tie?: boolean;
  vibrato?: boolean;
  letRing?: boolean;
}

interface TabBeat {
  notes: TabNote[];
  type: number;
  rest?: boolean;
  duration: [number, number];
  palmMute?: boolean;
  beamStart?: boolean;
  beamStop?: boolean;
  velocity?: string;
  letRing?: boolean;
  vibrato?: boolean;
  tuplet?: number;
  tupletStart?: boolean;
  tupletStop?: boolean;
  dots?: number;
  pickStroke?: string; // "down" | "up"
}

interface TabVoice {
  beats: TabBeat[];
  rest?: boolean;
}

interface TabMeasure {
  voices: TabVoice[];
  signature?: [number, number];
  rest?: boolean;
  marker?: { text: string };
}

export interface TabData {
  name: string;
  measures: TabMeasure[];
  tuning: number[];
  strings: number;
  instrument: string;
  automations?: { tempo?: Array<{ value: number; position: number }> };
}

interface TabRendererProps {
  data: TabData;
}

// ─── Processed Data Interfaces ────────────────────────────────────────

interface ProcessedNoteInfo {
  fret: number;
  bend: boolean;
  bendValue: number; // semitones
  slide: 'legato' | 'shift' | null;
  hp: string | null; // "h" or "p"
  staccato: boolean;
  ghost: boolean;
  dead: boolean;
  tie: boolean;
  vibrato: boolean;
  letRing: boolean;
}

interface ProcessedBeat {
  notes: Map<number, ProcessedNoteInfo>; // string index -> note info
  isRest: boolean;
  type: number;
  palmMute: boolean;
  beamStart: boolean;
  beamStop: boolean;
  velocity: string | null;
  letRing: boolean;
  vibrato: boolean;
  tuplet: number | null;
  tupletStart: boolean;
  tupletStop: boolean;
  dots: number;
  pickStroke: string | null;
}

interface ProcessedMeasure {
  beats: ProcessedBeat[];
  marker?: string;
  measureNumber: number;
  signature?: [number, number];
}

interface TabRow {
  measures: ProcessedMeasure[];
  marker?: string;
}

// ─── Constants ────────────────────────────────────────────────────────

const STRING_LABELS_6 = ['e', 'B', 'G', 'D', 'A', 'E'];
const STRING_LABELS_4 = ['G', 'D', 'A', 'E'];

const MEASURES_PER_ROW = 4;
const STRING_SPACING = 22;
const LABEL_WIDTH = 24;
const ANNOTATION_TOP_HEIGHT = 20; // space above staff for P.M., let ring, etc.
const ANNOTATION_BOTTOM_HEIGHT = 20; // space below staff for rhythm/beams

const beatWidth = (type: number): number => {
  if (type <= 1) return 64;
  if (type <= 2) return 48;
  if (type <= 4) return 36;
  if (type <= 8) return 28;
  return 24;
};

// ─── Data Processing ──────────────────────────────────────────────────

const processMeasures = (data: TabData): ProcessedMeasure[] => {
  return data.measures.map((measure, idx) => {
    const beats: ProcessedBeat[] = [];

    if (measure.rest || !measure.voices?.[0]?.beats?.length) {
      beats.push({
        notes: new Map(),
        isRest: true,
        type: 1,
        palmMute: false,
        beamStart: false,
        beamStop: false,
        velocity: null,
        letRing: false,
        vibrato: false,
        tuplet: null,
        tupletStart: false,
        tupletStop: false,
        dots: 0,
        pickStroke: null,
      });
    } else {
      for (const beat of measure.voices[0].beats) {
        const noteMap = new Map<number, ProcessedNoteInfo>();
        let hasBeatLetRing = !!beat.letRing;

        if (!beat.rest && beat.notes) {
          for (const note of beat.notes) {
            if (note.string === undefined) continue;
            if (note.rest && !note.dead) continue;

            const hasBend = !!note.bend && Array.isArray(note.bend.points) && note.bend.points.length > 0;
            const bendMax = hasBend
              ? Math.max(...note.bend!.points.map(p => p.value))
              : 0;

            if (note.letRing) hasBeatLetRing = true;

            noteMap.set(note.string, {
              fret: note.dead ? -1 : (note.fret ?? 0),
              bend: hasBend,
              bendValue: bendMax,
              slide: note.slide ?? null,
              hp: note.hp ?? null,
              staccato: !!note.staccato,
              ghost: !!note.ghost,
              dead: !!note.dead,
              tie: !!note.tie,
              vibrato: !!note.vibrato,
              letRing: !!note.letRing,
            });
          }
        }

        beats.push({
          notes: noteMap,
          isRest: !!beat.rest || noteMap.size === 0,
          type: beat.type || 4,
          palmMute: !!beat.palmMute,
          beamStart: !!beat.beamStart,
          beamStop: !!beat.beamStop,
          velocity: beat.velocity ?? null,
          letRing: hasBeatLetRing,
          vibrato: !!beat.vibrato,
          tuplet: beat.tuplet ?? null,
          tupletStart: !!beat.tupletStart,
          tupletStop: !!beat.tupletStop,
          dots: beat.dots ?? 0,
          pickStroke: beat.pickStroke ?? null,
        });
      }
    }

    return {
      beats,
      marker: measure.marker?.text,
      measureNumber: idx + 1,
      signature: measure.signature,
    };
  });
};

// ─── Fret Number Display ──────────────────────────────────────────────

const FretDisplay: React.FC<{ note: ProcessedNoteInfo }> = memo(({ note }) => {
  if (note.dead) {
    return (
      <span
        className="absolute text-bone/60 font-mono font-bold text-xs leading-none select-none"
        style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 2 }}
      >
        x
      </span>
    );
  }

  const text = note.fret.toString();
  const isWide = text.length > 1;
  const isGhost = note.ghost;
  const display = isGhost ? `(${text})` : text;

  return (
    <>
      <span
        className={`absolute font-mono font-bold leading-none select-none ${
          isGhost ? 'text-bone/40' : note.tie ? 'text-bone/25' : 'text-bone'
        } ${isWide || isGhost ? 'text-[10px]' : 'text-xs'}`}
        style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 2 }}
      >
        {display}
      </span>
      {/* Staccato dot above */}
      {note.staccato && (
        <span
          className="absolute text-ember text-[8px] leading-none select-none"
          style={{ top: '-6px', left: '50%', transform: 'translateX(-50%)', zIndex: 3 }}
        >
          .
        </span>
      )}
      {/* Bend indicator */}
      {note.bend && (
        <span
          className="absolute text-crimson font-mono text-[9px] font-bold leading-none select-none"
          style={{ top: '50%', right: '-7px', transform: 'translateY(-50%)', zIndex: 3 }}
        >
          {note.bendValue >= 2 ? 'full' : note.bendValue === 1 ? '1/2' : 'b'}
        </span>
      )}
      {/* Vibrato after fret */}
      {note.vibrato && !note.bend && (
        <span
          className="absolute text-bone/40 font-mono text-[9px] leading-none select-none"
          style={{ top: '50%', right: '-8px', transform: 'translateY(-50%)', zIndex: 3 }}
        >
          ~
        </span>
      )}
    </>
  );
});

FretDisplay.displayName = 'FretDisplay';

// Background pill behind fret numbers
const FretBg: React.FC<{ note: ProcessedNoteInfo }> = memo(({ note }) => {
  const text = note.dead ? 'x' : note.fret.toString();
  const isGhost = note.ghost;
  const displayLen = isGhost ? text.length + 2 : text.length;
  const w = displayLen > 1 ? Math.min(displayLen * 7, 26) : 12;

  return (
    <span
      className="absolute bg-bg-steel rounded-sm"
      style={{
        width: `${w}px`,
        height: '14px',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1,
      }}
    />
  );
});

FretBg.displayName = 'FretBg';

// ─── Inter-beat connectors (slide, hammer-on, pull-off) ───────────────

const InterBeatConnector: React.FC<{
  note: ProcessedNoteInfo;
}> = memo(({ note }) => {
  if (!note.slide && !note.hp) return null;

  let symbol = '';
  let color = 'text-bone/30';

  if (note.hp === 'h') {
    symbol = 'h';
    color = 'text-ember/50';
  } else if (note.hp === 'p') {
    symbol = 'p';
    color = 'text-ember/50';
  } else if (note.slide === 'legato' || note.slide === 'shift') {
    symbol = '/';
    color = 'text-bone/30';
  }

  return (
    <span
      className={`absolute ${color} font-mono text-[8px] leading-none select-none`}
      style={{ top: '50%', left: '-4px', transform: 'translateY(-50%)', zIndex: 4 }}
    >
      {symbol}
    </span>
  );
});

InterBeatConnector.displayName = 'InterBeatConnector';

// ─── Beat Column ──────────────────────────────────────────────────────

const BeatColumn: React.FC<{
  beat: ProcessedBeat;
  numStrings: number;
  width: number;
}> = memo(({ beat, numStrings, width }) => {
  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: `${width}px`, height: `${(numStrings - 1) * STRING_SPACING}px` }}
    >
      {/* Pick stroke indicator at top */}
      {beat.pickStroke && (
        <div
          className="absolute text-bone/30 font-mono text-[9px] leading-none select-none"
          style={{ top: '-14px', left: '50%', transform: 'translateX(-50%)' }}
        >
          {beat.pickStroke === 'down' ? '\u2193' : '\u2191'}
        </div>
      )}

      {/* Notes on strings */}
      {Array.from({ length: numStrings }, (_, sIdx) => {
        const noteInfo = beat.notes.get(sIdx);
        if (!noteInfo) return null;
        return (
          <div
            key={sIdx}
            className="absolute"
            style={{
              top: `${sIdx * STRING_SPACING}px`,
              left: '50%',
              width: '20px',
              height: '1px',
              transform: 'translateX(-50%)',
            }}
          >
            <FretBg note={noteInfo} />
            <FretDisplay note={noteInfo} />
            <InterBeatConnector note={noteInfo} />
          </div>
        );
      })}
    </div>
  );
});

BeatColumn.displayName = 'BeatColumn';

// ─── Palm Mute / Let Ring Span Renderer ───────────────────────────────
// Renders dashed-line spans above the staff for consecutive PM or let ring beats

interface AnnotationSpan {
  startIdx: number;
  endIdx: number;
  label: string;
}

const computeAnnotationSpans = (
  beats: ProcessedBeat[],
  accessor: (b: ProcessedBeat) => boolean,
  label: string,
): AnnotationSpan[] => {
  const spans: AnnotationSpan[] = [];
  let start = -1;

  for (let i = 0; i < beats.length; i++) {
    if (accessor(beats[i])) {
      if (start === -1) start = i;
    } else {
      if (start !== -1) {
        spans.push({ startIdx: start, endIdx: i - 1, label });
        start = -1;
      }
    }
  }
  if (start !== -1) {
    spans.push({ startIdx: start, endIdx: beats.length - 1, label });
  }

  return spans;
};

// ─── Tuplet Bracket Renderer ──────────────────────────────────────────

interface TupletSpan {
  startIdx: number;
  endIdx: number;
  number: number;
}

const computeTupletSpans = (beats: ProcessedBeat[]): TupletSpan[] => {
  const spans: TupletSpan[] = [];
  let start = -1;
  let tupletNum = 3;

  for (let i = 0; i < beats.length; i++) {
    const b = beats[i];
    if (b.tupletStart || (b.tuplet && start === -1)) {
      start = i;
      tupletNum = b.tuplet ?? 3;
    }
    if (b.tupletStop && start !== -1) {
      spans.push({ startIdx: start, endIdx: i, number: tupletNum });
      start = -1;
    }
  }
  if (start !== -1) {
    // Unclosed tuplet; close at last tuplet beat
    for (let i = beats.length - 1; i >= start; i--) {
      if (beats[i].tuplet) {
        spans.push({ startIdx: start, endIdx: i, number: tupletNum });
        break;
      }
    }
  }
  return spans;
};

// ─── Beam Group Renderer ──────────────────────────────────────────────

interface BeamGroup {
  startIdx: number;
  endIdx: number;
  level: number; // 1 = eighth, 2 = sixteenth
}

const computeBeamGroups = (beats: ProcessedBeat[]): BeamGroup[] => {
  const groups: BeamGroup[] = [];
  let start = -1;
  let maxLevel = 1;

  for (let i = 0; i < beats.length; i++) {
    const b = beats[i];
    if (b.beamStart) {
      start = i;
      maxLevel = b.type >= 16 ? 2 : 1;
    }
    if (start !== -1) {
      if (b.type >= 16) maxLevel = 2;
    }
    if (b.beamStop && start !== -1) {
      groups.push({ startIdx: start, endIdx: i, level: maxLevel });
      start = -1;
      maxLevel = 1;
    }
  }
  return groups;
};

// ─── Cumulative beat positions helper ─────────────────────────────────

const computeBeatPositions = (beats: ProcessedBeat[]): number[] => {
  // Returns the center-x of each beat within the evenly-justified layout
  const totalWidth = beats.reduce((s, b) => s + beatWidth(b.type), 0);
  const positions: number[] = [];
  let x = 0;
  for (const b of beats) {
    const w = beatWidth(b.type);
    positions.push(x + w / 2);
    x += w;
  }
  // Scale to fit inside the measure content area (same justify-evenly logic)
  // Actually with justify-evenly the spacing is uniform, but for overlay positioning
  // we need to approximate. We use fractional positioning.
  if (totalWidth === 0) return positions;
  return positions.map(p => p / totalWidth);
};

// ─── Time Signature Display ───────────────────────────────────────────

const TimeSignature: React.FC<{ sig: [number, number]; staffHeight: number }> = memo(({ sig, staffHeight }) => {
  return (
    <div
      className="absolute flex flex-col items-center justify-center font-mono font-bold text-crimson/60 select-none bg-bg-steel"
      style={{
        left: '0px',
        top: 0,
        height: `${staffHeight}px`,
        width: '20px',
        zIndex: 5,
        fontSize: '14px',
        lineHeight: '1',
      }}
    >
      <span>{sig[0]}</span>
      <span className="mt-1">{sig[1]}</span>
    </div>
  );
});

TimeSignature.displayName = 'TimeSignature';

// ─── Measure Block ────────────────────────────────────────────────────

const MeasureBlock: React.FC<{
  measure: ProcessedMeasure;
  numStrings: number;
  isLast: boolean;
  showSignature: boolean;
}> = memo(({ measure, numStrings, isLast, showSignature }) => {
  const totalBeatWidth = measure.beats.reduce((sum, b) => sum + beatWidth(b.type), 0);
  const sigPad = 0; // Time signature now rendered in label column
  const minWidth = 60;
  const measWidth = Math.max(totalBeatWidth + 16 + sigPad, minWidth);
  const staffHeight = (numStrings - 1) * STRING_SPACING;

  // Compute annotation data
  const pmSpans = useMemo(
    () => computeAnnotationSpans(measure.beats, b => b.palmMute, 'P.M.'),
    [measure.beats],
  );
  const letRingSpans = useMemo(
    () => computeAnnotationSpans(measure.beats, b => b.letRing, 'let ring'),
    [measure.beats],
  );
  const tupletSpans = useMemo(() => computeTupletSpans(measure.beats), [measure.beats]);
  const beamGroups = useMemo(() => computeBeamGroups(measure.beats), [measure.beats]);
  const beatPositions = useMemo(() => computeBeatPositions(measure.beats), [measure.beats]);

  const hasTopAnnotations = pmSpans.length > 0 || letRingSpans.length > 0 || tupletSpans.length > 0;
  const hasBottomAnnotations = beamGroups.length > 0;
  const bottomPad = hasBottomAnnotations ? ANNOTATION_BOTTOM_HEIGHT : 0;

  // Content area width (inside the measure, excluding padding)
  const contentLeft = 8 + sigPad;
  const contentWidth = measWidth - 16 - sigPad;

  return (
    <div className="relative flex-1 min-w-0">
      {/* Measure number */}
      <div
        className="absolute text-bone/60 font-mono select-none"
        style={{ top: '-16px', left: '2px', fontSize: '9px', lineHeight: '1' }}
      >
        {measure.measureNumber}
      </div>

      {/* Top annotations (P.M., let ring) — absolutely positioned above staff, no layout impact */}
      {hasTopAnnotations && (
        <div className="absolute left-0 right-0" style={{ top: `-${ANNOTATION_TOP_HEIGHT}px`, height: `${ANNOTATION_TOP_HEIGHT}px`, zIndex: 3 }}>
          {/* Palm mute spans */}
          {pmSpans.map((span, i) => {
            const left = contentLeft + beatPositions[span.startIdx] * contentWidth;
            // Extend to end of last beat + its width, or measure end
            const lastBeatEnd = span.endIdx < measure.beats.length - 1
              ? beatPositions[span.endIdx + 1] * contentWidth
              : contentWidth;
            const w = Math.max(lastBeatEnd - beatPositions[span.startIdx] * contentWidth, 30);
            return (
              <div
                key={`pm-${i}`}
                className="absolute flex items-center"
                style={{ left: `${left}px`, width: `${w}px`, top: '2px' }}
              >
                <span className="text-bone/40 font-mono text-[9px] leading-none whitespace-nowrap select-none">
                  P.M.
                </span>
                <div
                  className="flex-1 ml-1 border-b border-dashed border-bone/25"
                  style={{ height: '1px' }}
                />
              </div>
            );
          })}

          {/* Let ring spans */}
          {letRingSpans.map((span, i) => {
            const left = contentLeft + beatPositions[span.startIdx] * contentWidth;
            const right = contentLeft + beatPositions[span.endIdx] * contentWidth;
            const w = right - left;
            return (
              <div
                key={`lr-${i}`}
                className="absolute flex items-center"
                style={{ left: `${left}px`, width: `${Math.max(w, 30)}px`, top: pmSpans.length > 0 ? '12px' : '2px' }}
              >
                <span className="text-bone/30 font-mono text-[7px] italic leading-none whitespace-nowrap select-none">
                  let ring
                </span>
                {w > 36 && (
                  <div
                    className="flex-1 ml-1 border-b border-dashed border-bone/15"
                    style={{ height: '1px' }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Staff area with string lines */}
      <div className="relative" style={{ height: `${staffHeight}px` }}>
        {/* Time signature */}
        {/* Time signature now rendered in TabRowView label column */}

        {/* String lines rendered at row level for alignment — see TabRowView */}

        {/* Beats */}
        <div
          className="relative flex items-start justify-evenly h-full"
          style={{ marginLeft: `${sigPad}px` }}
        >
          {measure.beats.map((beat, bIdx) => (
            <BeatColumn
              key={bIdx}
              beat={beat}
              numStrings={numStrings}
              width={beatWidth(beat.type)}
            />
          ))}
        </div>

        {/* Velocity markings below the last string */}
        {measure.beats.map((beat, bIdx) => {
          if (!beat.velocity) return null;
          const pos = beatPositions[bIdx];
          return (
            <div
              key={`vel-${bIdx}`}
              className="absolute text-crimson/40 font-mono italic select-none"
              style={{
                left: `${contentLeft + pos * contentWidth}px`,
                top: `${staffHeight + 2}px`,
                fontSize: '7px',
                transform: 'translateX(-50%)',
                lineHeight: '1',
              }}
            >
              {beat.velocity}
            </div>
          );
        })}
      </div>

      {/* Bottom annotations area (beam brackets, tuplet brackets) */}
      {(hasBottomAnnotations || tupletSpans.length > 0) && (
        <div className="relative" style={{ height: `${Math.max(bottomPad, tupletSpans.length > 0 ? 14 : 0)}px` }}>
          {/* Beam groups */}
          {beamGroups.map((group, i) => {
            const left = contentLeft + beatPositions[group.startIdx] * contentWidth;
            const right = contentLeft + beatPositions[group.endIdx] * contentWidth;
            const w = Math.max(right - left, 8);
            return (
              <div key={`beam-${i}`} className="absolute" style={{ left: `${left}px`, width: `${w}px`, top: '4px' }}>
                {/* First beam line (eighth) */}
                <div className="w-full border-b border-bone/25" style={{ height: '0px' }} />
                {/* Second beam line (sixteenth) */}
                {group.level >= 2 && (
                  <div className="w-full border-b border-bone/25" style={{ marginTop: '3px', height: '0px' }} />
                )}
              </div>
            );
          })}

          {/* Tuplet brackets */}
          {tupletSpans.map((span, i) => {
            const left = contentLeft + beatPositions[span.startIdx] * contentWidth;
            const right = contentLeft + beatPositions[span.endIdx] * contentWidth;
            const w = Math.max(right - left, 16);
            const bracketTop = beamGroups.length > 0 ? 12 : 2;
            return (
              <div
                key={`tup-${i}`}
                className="absolute flex items-center"
                style={{ left: `${left - 2}px`, width: `${w + 4}px`, top: `${bracketTop}px` }}
              >
                <div className="flex-1 border-t border-l border-bone/20 h-[5px]" />
                <span className="text-bone/40 font-mono text-[8px] leading-none px-1 select-none">
                  {span.number}
                </span>
                <div className="flex-1 border-t border-r border-bone/20 h-[5px]" />
              </div>
            );
          })}
        </div>
      )}

      {/* Right bar line */}
      {!isLast && (
        <div
          className="absolute right-0 border-r border-bone/15"
          style={{ top: 0, height: `${staffHeight}px` }}
        />
      )}
    </div>
  );
});

MeasureBlock.displayName = 'MeasureBlock';

// ─── Row View ─────────────────────────────────────────────────────────

const TabRowView: React.FC<{
  row: TabRow;
  numStrings: number;
  stringLabels: string[];
  showSignatureOnFirst: boolean;
}> = memo(({ row, numStrings, stringLabels, showSignatureOnFirst }) => {
  const staffHeight = (numStrings - 1) * STRING_SPACING;

  // P.M. annotations are now absolute — no topPad needed

  return (
    <div className="mb-8 pt-6">
      {/* Section marker */}
      {row.marker && (
        <div className="text-crimson font-metal text-sm tracking-wide mb-1 select-none">
          {row.marker}
        </div>
      )}

      <div className="flex items-start">
        {/* String labels column (+ time signature if present) */}
        <div
          className="flex-shrink-0 relative"
          style={{ width: `${showSignatureOnFirst && row.measures[0]?.signature ? LABEL_WIDTH + 20 : LABEL_WIDTH}px`, height: `${staffHeight}px` }}
        >
          {stringLabels.map((label, sIdx) => (
            <div
              key={sIdx}
              className="absolute text-bone/30 font-mono text-[11px] select-none"
              style={{
                top: `${sIdx * STRING_SPACING - 7}px`,
                left: '0px',
                lineHeight: '14px',
              }}
            >
              {label}
            </div>
          ))}
          {showSignatureOnFirst && row.measures[0]?.signature && (
            <div
              className="absolute flex flex-col items-center justify-center font-mono font-bold text-crimson/50 select-none"
              style={{
                right: '2px',
                top: 0,
                height: `${staffHeight}px`,
                width: '16px',
                lineHeight: '1',
                fontSize: '13px',
              }}
            >
              <span>{row.measures[0].signature[0]}</span>
              <span className="mt-0.5">{row.measures[0].signature[1]}</span>
            </div>
          )}
        </div>

        {/* Measures area with continuous string lines */}
        <div className="relative flex-1">
          {/* Continuous string lines spanning the full row */}
          {Array.from({ length: numStrings }, (_, sIdx) => (
            <div
              key={`line-${sIdx}`}
              className="absolute w-full border-b border-bone/20"
              style={{ top: `${sIdx * STRING_SPACING}px`, left: 0, zIndex: 0 }}
            />
          ))}

          {/* Opening bar line */}
          <div
            className="absolute left-0 top-0 border-l border-bone/30"
            style={{ height: `${staffHeight}px`, zIndex: 1 }}
          />

          {/* Measures (fret numbers, annotations, bar lines — no string lines) */}
          <div className="relative flex w-full" style={{ zIndex: 1, height: `${staffHeight}px` }}>
            {row.measures.map((measure, mIdx) => (
              <MeasureBlock
                key={measure.measureNumber}
                measure={measure}
                numStrings={numStrings}
                isLast={mIdx === row.measures.length - 1}
                showSignature={mIdx === 0 && showSignatureOnFirst}
              />
            ))}
          </div>

          {/* Closing bar line */}
          <div
            className="absolute right-0 top-0 border-r border-bone/30"
            style={{ height: `${staffHeight}px`, zIndex: 1 }}
          />
        </div>
      </div>
    </div>
  );
});

TabRowView.displayName = 'TabRowView';

// ─── Main Renderer ────────────────────────────────────────────────────

const TabRenderer: React.FC<TabRendererProps> = ({ data }) => {
  const numStrings = data.strings || 6;
  const stringLabels = numStrings === 4 ? STRING_LABELS_4 : STRING_LABELS_6;
  const containerRef = useRef<HTMLDivElement>(null);
  const [measuresPerRow, setMeasuresPerRow] = useState(MEASURES_PER_ROW);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 800;
      const available = width - LABEL_WIDTH - 8;
      const perRow = Math.max(1, Math.min(8, Math.floor(available / 140)));
      setMeasuresPerRow(perRow);
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const rows = useMemo(() => {
    const processed = processMeasures(data);

    const result: TabRow[] = [];
    let currentRow: ProcessedMeasure[] = [];
    let pendingMarker: string | undefined;

    for (const measure of processed) {
      if (measure.marker && currentRow.length === 0) {
        pendingMarker = measure.marker;
      } else if (measure.marker && currentRow.length > 0) {
        result.push({ measures: currentRow, marker: pendingMarker });
        currentRow = [];
        pendingMarker = measure.marker;
      }

      currentRow.push(measure);

      if (currentRow.length >= measuresPerRow) {
        result.push({ measures: currentRow, marker: pendingMarker });
        currentRow = [];
        pendingMarker = undefined;
      }
    }

    if (currentRow.length > 0) {
      result.push({ measures: currentRow, marker: pendingMarker });
    }

    return result;
  }, [data, measuresPerRow]);

  // Track which rows should show a time signature (on the first measure of each section,
  // or when signature changes)
  const rowSignatureFlags = useMemo(() => {
    let lastSig: string | null = null;
    return rows.map(row => {
      const firstMeasure = row.measures[0];
      if (firstMeasure?.signature) {
        const sigKey = `${firstMeasure.signature[0]}/${firstMeasure.signature[1]}`;
        if (sigKey !== lastSig) {
          lastSig = sigKey;
          return true;
        }
      }
      return false;
    });
  }, [rows]);

  const tempo = data.automations?.tempo?.[0]?.value;

  return (
    <div ref={containerRef} className="w-full">
      {/* Track info header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-bone text-sm font-medium">{data.name}</h4>
          <p className="text-bone/30 text-xs font-mono">
            {data.instrument} | {data.strings} strings
          </p>
        </div>
        {tempo && (
          <span className="text-xs font-mono text-ember">{tempo} BPM</span>
        )}
      </div>

      {/* Notation legend (compact) */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4 text-[9px] font-mono text-bone/25 select-none">
        <span>h=hammer-on</span>
        <span>p=pull-off</span>
        <span>/=slide</span>
        <span>b=bend</span>
        <span>~=vibrato</span>
        <span>x=dead</span>
        <span>(n)=ghost</span>
        <span>P.M.=palm mute</span>
      </div>

      {/* Tab staff rows */}
      <div
        className="overflow-x-auto pb-4"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(220,20,60,0.3) transparent' }}
      >
        {rows.map((row, rIdx) => (
          <TabRowView
            key={rIdx}
            row={row}
            numStrings={numStrings}
            stringLabels={stringLabels}
            showSignatureOnFirst={rowSignatureFlags[rIdx]}
          />
        ))}
      </div>
    </div>
  );
};

export default TabRenderer;
