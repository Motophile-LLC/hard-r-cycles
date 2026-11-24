'use client';

import { Flame, Gauge, Sparkles, Wrench, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { HOTSPOT_LABELS, TOOL_MAP, getJobPacing } from '@/data/shiftJobs';
import { isTutorialTraining, useGameStore } from '@/store/useGameStore';

export function TorqueMiniGame() {
  const torqueActive = useGameStore((s) => s.torqueActive);
  const torquePhase = useGameStore((s) => s.torquePhase);
  const activeHazard = useGameStore((s) => s.activeHazard);
  const shiftJobs = useGameStore((s) => s.shiftJobs);
  const currentJobIndex = useGameStore((s) => s.currentJobIndex);
  const currentStepIndex = useGameStore((s) => s.currentStepIndex);
  const torqueTargetCenter = useGameStore((s) => s.torqueTargetCenter);
  const torqueTargetWidth = useGameStore((s) => s.torqueTargetWidth);
  const frenzyActive = useGameStore((s) => s.frenzyActive);
  const tutorialStep = useGameStore((s) => s.tutorialStep);

  const needleRef = useRef<HTMLDivElement>(null);
  const holdBarRef = useRef<HTMLDivElement>(null);
  const holdPctRef = useRef<HTMLSpanElement>(null);

  const job = shiftJobs[currentJobIndex] ?? shiftJobs[0];
  const pacing = getJobPacing(currentJobIndex);
  const step = job.steps[currentStepIndex];

  const isHoldMode =
    torquePhase === 'extract_heat' ||
    (activeHazard !== 'BOLT_STRIPPED' && step?.interactionType === 'hold');

  useEffect(() => {
    if (!torqueActive) return;

    let rafId = 0;
    const syncDom = () => {
      const state = useGameStore.getState();
      if (needleRef.current && !isHoldMode) {
        needleRef.current.style.left = `calc(${state.torqueNeedle}% - 6px)`;
      }
      if (holdBarRef.current && isHoldMode) {
        holdBarRef.current.style.width = `${state.holdProgress}%`;
      }
      if (holdPctRef.current && isHoldMode) {
        holdPctRef.current.textContent = `${Math.round(state.holdProgress)}%`;
      }
      rafId = window.requestAnimationFrame(syncDom);
    };

    rafId = window.requestAnimationFrame(syncDom);
    return () => window.cancelAnimationFrame(rafId);
  }, [torqueActive, isHoldMode]);

  if (!torqueActive || !step) return null;

  const effectiveWidth = frenzyActive ? torqueTargetWidth * 0.9 : torqueTargetWidth;
  const zoneLeft = Math.max(0, torqueTargetCenter - effectiveWidth / 2);
  const activeTool =
    torquePhase === 'extract_heat'
      ? TOOL_MAP.propane_torch
      : torquePhase === 'extract_turn'
        ? TOOL_MAP.ez_out
        : TOOL_MAP[step.requiredTool];

  return (
    <div className="pointer-events-auto fixed inset-x-0 bottom-[max(11rem,calc(10.5rem+env(safe-area-inset-bottom)))] z-30 mx-auto w-[min(94dvw,540px)] px-2 sm:bottom-28 sm:px-3 [@media(max-height:500px)]:bottom-[4.8rem]">
      <div className="rounded-2xl border-4 border-black bg-amber-50 p-3.5 text-black shadow-[8px_8px_0px_#111] sm:p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-black text-white shadow-[2px_2px_0px_#000]"
              style={{ backgroundColor: activeTool.color }}
            >
              {isHoldMode ? (
                <Flame className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Gauge className="h-4 w-4" aria-hidden="true" />
              )}
            </span>
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-zinc-600">
                {HOTSPOT_LABELS[step.hotspot]} • {activeTool.shortName}
              </p>
              <h3 className="text-base font-black leading-tight">
                {torquePhase === 'extract_heat'
                  ? 'HEAT SNAPPED STUD CHERRY-RED!'
                  : torquePhase === 'extract_turn'
                    ? 'EXTRACT WITH EZ-OUT!'
                    : step.label}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={() => useGameStore.getState().cancelActiveOverlay()}
            className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-black bg-white p-1.5 hover:bg-zinc-200"
            aria-label="Step back from bike"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {isHoldMode ? (
          <div>
            <div className="mb-2 flex items-center justify-between text-xs font-extrabold">
              <span>PRESS &amp; HOLD BUTTON (OR HOLD SPACE)</span>
              <span ref={holdPctRef}>0%</span>
            </div>
            <div className="relative h-8 w-full overflow-hidden rounded-xl border-3 border-black bg-zinc-900">
              <div
                ref={holdBarRef}
                className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-lime-400 transition-none"
                style={{ width: '0%' }}
              />
            </div>
            <button
              type="button"
              onContextMenu={(e) => e.preventDefault()}
              onPointerDown={() => {
                useGameStore.getState().setHoldingActive(true);
                useGameStore.getState().attemptTorqueStop();
              }}
              onPointerUp={() => useGameStore.getState().setHoldingActive(false)}
              onPointerLeave={() => useGameStore.getState().setHoldingActive(false)}
              onPointerCancel={() => useGameStore.getState().setHoldingActive(false)}
              className="touch-hold-surface mt-3 flex min-h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-3 border-black bg-orange-500 py-3 text-sm font-black uppercase text-white shadow-[4px_4px_0px_#000] active:translate-y-0.5 sm:text-base"
            >
              <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
              Hold / Pump {activeTool.shortName}
              <span className="hidden sm:inline">[SPACE]</span>
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2 text-xs font-extrabold">
              <span>
                {frenzyActive ? 'FULL SEND 1.35X SPEED!' : 'STOP NEEDLE INSIDE GREEN SPEC ZONE'}
              </span>
              <span className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-black text-red-700">
                {isTutorialTraining(tutorialStep)
                  ? 'TRAINING • NO PENALTY'
                  : `MISS = SNAP (-${pacing.snapTimerPenalty}s)`}
              </span>
            </div>

            <div className="relative h-10 w-full overflow-hidden rounded-xl border-3 border-black bg-zinc-900">
              {/* Green sweet spot */}
              <div
                className="absolute inset-y-0 border-x-2 border-black bg-emerald-400/90"
                style={{
                  left: `${zoneLeft}%`,
                  width: `${effectiveWidth}%`,
                }}
              />
              {/* Center bullseye tick */}
              <div
                className="absolute inset-y-0 w-0.5 bg-white/80"
                style={{ left: `${torqueTargetCenter}%` }}
              />
              {/* Moving Needle */}
              <div
                ref={needleRef}
                className="absolute inset-y-0 w-3 rounded-sm border-2 border-black bg-yellow-300 shadow-[0_0_8px_rgba(250,204,21,0.9)]"
                style={{ left: '10%' }}
              />
            </div>

            <button
              type="button"
              onClick={() => useGameStore.getState().attemptTorqueStop()}
              className="mt-3 flex min-h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-3 border-black bg-emerald-500 py-3 text-sm font-black uppercase text-black shadow-[4px_4px_0px_#000] hover:bg-emerald-400 active:translate-y-0.5 sm:text-base"
            >
              <Wrench className="h-4 w-4 shrink-0" aria-hidden="true" />
              HIT TORQUE SPEC! <span className="hidden sm:inline">[SPACE]</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
