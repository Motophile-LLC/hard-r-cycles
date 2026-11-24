'use client';

import { AlertTriangle, X, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { getJobPacing } from '@/data/shiftJobs';
import { useGameStore } from '@/store/useGameStore';

interface WireColorDef {
  id: string;
  label: string;
  hex: string;
}

const WIRE_COLORS: WireColorDef[] = [
  { id: 'red', label: 'IGN +12V', hex: '#ef4444' },
  { id: 'yellow', label: 'TURN L/R', hex: '#eab308' },
  { id: 'blue', label: 'HIGH BEAM', hex: '#3b82f6' },
  { id: 'white', label: 'GROUND', hex: '#e5e7eb' },
];

function shuffleIds(ids: string[]): string[] {
  const arr = [...ids];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function WiringMiniGameBoard({
  canScramble,
  totalMs,
  scrambleAtMs,
}: {
  canScramble: boolean;
  totalMs: number;
  scrambleAtMs: number;
}) {
  const [rightOrder, setRightOrder] = useState<string[]>(() =>
    shuffleIds(WIRE_COLORS.map((w) => w.id)),
  );
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [connectedIds, setConnectedIds] = useState<string[]>([]);
  const [scrambledOnce, setScrambledOnce] = useState(false);

  const fuseBarRef = useRef<HTMLDivElement>(null);
  const fuseTextRef = useRef<HTMLSpanElement>(null);
  const connectedRef = useRef<string[]>([]);
  const scrambledRef = useRef(false);

  useEffect(() => {
    connectedRef.current = connectedIds;
  }, [connectedIds]);

  useEffect(() => {
    const start = performance.now();
    let rafId = 0;

    const tickTimer = (now: number) => {
      const elapsed = now - start;
      const remMs = Math.max(0, totalMs - elapsed);
      const pct = (remMs / totalMs) * 100;

      if (fuseBarRef.current) {
        fuseBarRef.current.style.width = `${pct}%`;
      }
      if (fuseTextRef.current) {
        fuseTextRef.current.textContent = `${(remMs / 1000).toFixed(1)}s`;
      }

      if (canScramble && scrambleAtMs > 0 && !scrambledRef.current && remMs < scrambleAtMs) {
        scrambledRef.current = true;
        setScrambledOnce(true);
        setRightOrder((prev) => {
          const locked = new Set(connectedRef.current);
          const unlocked = prev.filter((id) => !locked.has(id));
          const shuffledUnlocked = shuffleIds(unlocked);
          let cursor = 0;
          return prev.map((id) => (locked.has(id) ? id : shuffledUnlocked[cursor++]));
        });
      }

      if (remMs <= 0) {
        useGameStore.getState().failWiring('FUSE TIMED OUT! Dead short across the frame!');
        return;
      }

      rafId = window.requestAnimationFrame(tickTimer);
    };

    rafId = window.requestAnimationFrame(tickTimer);
    return () => window.cancelAnimationFrame(rafId);
  }, [canScramble, totalMs, scrambleAtMs]);

  const handleRightClick = (rightId: string) => {
    if (!selectedLeft) return;
    if (connectedIds.includes(rightId)) return;

    if (selectedLeft !== rightId) {
      useGameStore.getState().failWiring('CROSSED WIRES! Dead short & flash-bang!');
      return;
    }

    const next = [...connectedIds, rightId];
    setConnectedIds(next);
    setSelectedLeft(null);

    if (next.length === WIRE_COLORS.length) {
      useGameStore.getState().resolveWiringSuccess();
    }
  };

  return (
    <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-3 backdrop-blur-[2px] sm:p-4">
      <div className="max-h-[92dvh] w-[min(94dvw,520px)] overflow-y-auto rounded-2xl border-4 border-black bg-zinc-900 p-3.5 text-white shadow-[10px_10px_0px_#000] sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-black bg-yellow-400 text-black">
              <Zap className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-yellow-300">
                HAZARD: MYSTERY WIRING HARNESS
              </p>
              <h3 className="text-base font-black leading-tight sm:text-lg">
                Match Left Leads to Terminal Lugs!
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={() => useGameStore.getState().cancelActiveOverlay()}
            className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-black bg-zinc-700 p-1.5 hover:bg-zinc-600"
            aria-label="Cancel wiring"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Fuse countdown bar */}
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between text-xs font-black uppercase text-red-300">
            <span>LIVE BATTERY FUSE TIMER</span>
            <span ref={fuseTextRef}>{(totalMs / 1000).toFixed(1)}s</span>
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full border-2 border-black bg-zinc-800">
            <div
              ref={fuseBarRef}
              className="h-full bg-gradient-to-r from-red-500 via-orange-400 to-yellow-300"
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {scrambledOnce ? (
          <div className="mb-3 flex items-center gap-2 rounded-lg border-2 border-black bg-amber-300 px-3 py-1.5 text-xs font-black text-black">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-700" aria-hidden="true" />
            PREVIOUS OWNER SCOTCH-LOK HACK! UNLOCKED TERMINALS SHIFTED!
          </div>
        ) : null}

        <p className="mb-3 text-xs font-bold text-zinc-300">
          Tap a colored lead on the left, then tap its matching terminal on the right. One wrong tap blows the shop breakers!
        </p>

        {/* Wire Matching Board */}
        <div className="relative grid grid-cols-[1fr_54px_1fr] items-center gap-1.5 rounded-xl border-3 border-black bg-zinc-800 p-2.5 sm:grid-cols-[1fr_76px_1fr] sm:gap-2 sm:p-4">
          <div className="flex flex-col gap-2.5 sm:gap-3">
            {WIRE_COLORS.map((wire) => {
              const done = connectedIds.includes(wire.id);
              const active = selectedLeft === wire.id;
              return (
                <button
                  key={wire.id}
                  type="button"
                  disabled={done}
                  onClick={() => setSelectedLeft(wire.id)}
                  className={`flex min-h-[44px] cursor-pointer items-center justify-between rounded-lg border-3 border-black px-2.5 py-2 text-xs font-black text-black transition-transform sm:px-3 ${
                    done
                      ? 'opacity-45'
                      : active
                        ? '-translate-y-0.5 ring-4 ring-yellow-300'
                        : 'hover:-translate-y-0.5'
                  }`}
                  style={{ backgroundColor: wire.hex }}
                >
                  <span>{wire.label}</span>
                  <span className="h-3 w-3 shrink-0 rounded-full border-2 border-black bg-white" />
                </button>
              );
            })}
          </div>

          <div className="flex flex-col items-center justify-center gap-1 text-center">
            <Zap className="h-5 w-5 text-yellow-400 sm:h-6 sm:w-6" aria-hidden="true" />
            <span className="text-[11px] font-black text-zinc-200">
              {connectedIds.length} / {WIRE_COLORS.length}
            </span>
          </div>

          <div className="flex flex-col gap-2.5 sm:gap-3">
            {rightOrder.map((id) => {
              const wire = WIRE_COLORS.find((w) => w.id === id)!;
              const done = connectedIds.includes(wire.id);
              return (
                <button
                  key={wire.id}
                  type="button"
                  disabled={done || !selectedLeft}
                  onClick={() => handleRightClick(wire.id)}
                  className={`flex min-h-[44px] cursor-pointer items-center justify-between rounded-lg border-3 border-black px-2.5 py-2 text-xs font-black text-black transition-transform sm:px-3 ${
                    done
                      ? 'opacity-45'
                      : selectedLeft
                        ? 'hover:scale-[1.03] hover:ring-2 hover:ring-white'
                        : 'opacity-85'
                  }`}
                  style={{ backgroundColor: wire.hex }}
                >
                  <span className="h-3 w-3 rounded-full border-2 border-black bg-zinc-900" />
                  <span>{done ? 'SPLICED' : wire.id.toUpperCase()}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function WiringMiniGame() {
  const wiringActive = useGameStore((s) => s.wiringActive);
  const shiftJobs = useGameStore((s) => s.shiftJobs);
  const currentJobIndex = useGameStore((s) => s.currentJobIndex);
  const currentStepIndex = useGameStore((s) => s.currentStepIndex);

  if (!wiringActive) return null;

  const job = shiftJobs[currentJobIndex] ?? shiftJobs[0];
  const pacing = getJobPacing(currentJobIndex);
  const step = job.steps[currentStepIndex];

  return (
    <WiringMiniGameBoard
      canScramble={Boolean(step?.scrambleWires)}
      totalMs={pacing.wiringFuseMs}
      scrambleAtMs={step?.scrambleWires ? pacing.wiringScrambleAtMs : 0}
    />
  );
}
