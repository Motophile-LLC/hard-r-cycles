'use client';

import {
  AlertTriangle,
  ArrowLeft,
  Flame,
  HelpCircle,
  Music,
  Volume2,
  VolumeX,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { HOTSPOT_LABELS, TOOL_MAP, TOOLS, getJobPacing } from '@/data/shiftJobs';
import { isTutorialTraining, useGameStore } from '@/store/useGameStore';
import { useShopStore } from '@/store/useShopStore';
import { shopAudio } from '@/utils/audio';

export function GameHUD() {
  const viewMode = useShopStore((s) => s.viewMode);
  const phase = useGameStore((s) => s.phase);
  const mechanicName = useGameStore((s) => s.mechanicName);
  const shiftJobs = useGameStore((s) => s.shiftJobs);
  const currentJobIndex = useGameStore((s) => s.currentJobIndex);
  const currentStepIndex = useGameStore((s) => s.currentStepIndex);
  const bayTimer = useGameStore((s) => Math.ceil(s.bayTimer));
  const shopDamageTotal = useGameStore((s) => s.shopDamageTotal);
  const flatRateScore = useGameStore((s) => s.flatRateScore);
  const chaosMeter = useGameStore((s) => Math.round(s.chaosMeter));
  const frenzyActive = useGameStore((s) => s.frenzyActive);
  const equippedTool = useGameStore((s) => s.equippedTool);
  const activeHazard = useGameStore((s) => s.activeHazard);
  const torquePhase = useGameStore((s) => s.torquePhase);
  const torqueActive = useGameStore((s) => s.torqueActive);
  const wiringActive = useGameStore((s) => s.wiringActive);
  const breakerBlown = useGameStore((s) => s.breakerBlown);
  const buddyActive = useGameStore((s) => s.buddy.active);
  const buddyLine = useGameStore((s) => s.buddy.line);
  const buddyPatience = useGameStore((s) => Math.ceil(s.buddy.patience * 2) / 2);
  const tutorialStep = useGameStore((s) => s.tutorialStep);
  const toasts = useGameStore((s) => s.toasts);

  const [sfxMuted, setSfxMuted] = useState(false);
  const [musicMuted, setMusicMuted] = useState(false);
  const helpDialogRef = useRef<HTMLDialogElement>(null);

  const job = shiftJobs[currentJobIndex] ?? shiftJobs[0];
  const step = job.steps[currentStepIndex];

  // Global keyboard shortcuts (1-6 tools, Space torque/hold, E dismiss buddy)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (useShopStore.getState().viewMode !== 'GAME_BAY') return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      const state = useGameStore.getState();
      if (state.phase === 'intro' && e.code === 'Space') {
        e.preventDefault();
        state.startShiftFromIntro();
        return;
      }

      if (state.phase !== 'playing') return;

      if (e.key >= '1' && e.key <= '6') {
        const idx = Number(e.key) - 1;
        const tool = TOOLS[idx];
        if (tool) {
          e.preventDefault();
          state.equipTool(tool.id);
        }
        return;
      }

      if (e.key === 'e' || e.key === 'E') {
        if (state.buddy.active) {
          e.preventDefault();
          state.dismissBuddy();
        }
        return;
      }

      if (e.code === 'Space') {
        if (state.torqueActive) {
          e.preventDefault();
          if (!e.repeat) {
            state.attemptTorqueStop();
          }
          state.setHoldingActive(true);
        } else if (step) {
          e.preventDefault();
          state.interactHotspot(step.hotspot);
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        useGameStore.getState().setHoldingActive(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [step]);

  const toggleSfx = () => {
    const next = !sfxMuted;
    setSfxMuted(next);
    shopAudio.setMuted(next, musicMuted);
  };

  const toggleMusic = () => {
    const next = !musicMuted;
    setMusicMuted(next);
    shopAudio.setMuted(sfxMuted, next);
  };

  if (viewMode !== 'GAME_BAY' || phase === 'clock_in' || phase === 'shift_complete') return null;

  const requiredToolId =
    activeHazard === 'BOLT_STRIPPED'
      ? torquePhase === 'extract_heat'
        ? 'propane_torch'
        : 'ez_out'
      : step?.requiredTool;

  const requiredTool = requiredToolId ? TOOL_MAP[requiredToolId] : null;
  const roundedTimer = Math.ceil(bayTimer);
  const inTraining = isTutorialTraining(tutorialStep);
  const buddyMaxPatience = getJobPacing(currentJobIndex).buddyPatience;
  const buddyPatiencePct = Math.max(0, Math.min(100, (buddyPatience / buddyMaxPatience) * 100));

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] sm:p-4">
      {/* Frenzy Border Vignette */}
      {frenzyActive ? (
        <div className="pointer-events-none fixed inset-0 animate-pulse border-8 border-red-500/80 shadow-[inset_0_0_80px_rgba(239,68,68,0.45)]" />
      ) : null}

      {/* Top HUD Bar */}
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-2 [@media(max-height:500px)]:flex-row [@media(max-height:500px)]:items-start">
        {/* Work Order Ticket Card (second on portrait mobile, first on tablet/desktop) */}
        <div className="order-2 pointer-events-auto min-w-0 w-full rounded-2xl border-3 border-black bg-amber-50 px-2.5 py-1 text-black shadow-[4px_4px_0px_#111] sm:order-1 sm:w-auto sm:max-w-xs sm:border-4 sm:px-3 sm:py-1.5 sm:shadow-[5px_5px_0px_#111] lg:max-w-sm [@media(max-height:500px)]:order-1 [@media(max-height:500px)]:max-w-[235px]">
          <div className="flex flex-wrap items-center justify-between gap-1.5 [@media(max-height:500px)]:hidden">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-md border-2 border-black bg-red-600 px-1.5 py-0.5 text-[10px] font-black uppercase text-white">
                {job.dayLabel}
              </span>
              <span className="hidden text-[11px] font-black uppercase text-zinc-700 sm:inline">
                {job.bikeName} • {job.billedHours.toFixed(1)}h
              </span>
            </div>
            <span className="rounded-full border-2 border-black bg-amber-200 px-2 py-0.5 text-[10px] font-black sm:hidden">
              Step {Math.min(currentStepIndex + 1, job.steps.length)}/{job.steps.length}
            </span>
          </div>

          <div className="mt-0.5 hidden items-center justify-between gap-2 sm:flex [@media(max-height:500px)]:hidden">
            <h2 className="text-sm font-black leading-snug">{job.title}</h2>
            <span className="shrink-0 rounded-full border-2 border-black bg-amber-200 px-2 py-0.5 text-[10px] font-black">
              Step {Math.min(currentStepIndex + 1, job.steps.length)}/{job.steps.length}
            </span>
          </div>

          {step ? (
            <div className="mt-1 flex flex-wrap items-center gap-1 rounded-lg border-2 border-black bg-white px-2 py-0.5 text-[11px] font-extrabold sm:py-1 [@media(max-height:500px)]:mt-0">
              {breakerBlown ? (
                <span className="flex items-center gap-1 text-red-600">
                  <Zap className="h-4 w-4 shrink-0" aria-hidden="true" /> Tap flashing BREAKER BOX on the back wall!
                </span>
              ) : activeHazard === 'MISSING_SOCKET' ? (
                <span className="flex items-center gap-1 text-sky-700">
                  <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" /> Tap the rolling 10mm socket on the floor!
                </span>
              ) : buddyActive ? (
                <span className="flex items-center gap-1 text-orange-700">
                  <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" /> Tap Chatty Buddy to clear the bay!
                </span>
              ) : (
                <>
                  <span className="text-zinc-600">NEXT:</span>
                  {requiredTool ? (
                    <span
                      className="rounded border border-black px-1.5 py-0.5 text-[11px] text-black"
                      style={{ backgroundColor: requiredTool.color }}
                    >
                      <span className="hidden sm:inline">[{requiredTool.hotkey}] </span>
                      {requiredTool.shortName}
                    </span>
                  ) : null}
                  <span>→ Tap</span>
                  <span className="underline decoration-2 underline-offset-2">
                    {HOTSPOT_LABELS[step.hotspot]}
                  </span>
                </>
              )}
            </div>
          ) : null}
        </div>

        {/* Metrics + Audio (first row on portrait mobile) */}
        <div className="order-1 flex w-full shrink-0 items-center justify-between gap-1.5 sm:order-2 sm:w-auto sm:flex-wrap sm:items-start sm:justify-end [@media(max-height:500px)]:order-2 [@media(max-height:500px)]:w-auto">
          {/* Flat Rate Clock */}
          <div
            className={`pointer-events-auto rounded-2xl border-3 border-black px-2 py-1 text-center shadow-[4px_4px_0px_#111] sm:border-4 sm:px-2.5 sm:py-1.5 ${
              inTraining
                ? 'bg-emerald-300 text-black'
                : roundedTimer <= 10
                  ? 'animate-pulse bg-red-500 text-white'
                  : 'bg-white text-black'
            }`}
          >
            <p className="text-[9px] font-black uppercase tracking-wider opacity-80">
              {inTraining ? 'TRAINING' : roundedTimer <= 0 ? 'OVERTIME' : 'CLOCK'}
            </p>
            <p className="text-base font-black tabular-nums leading-none sm:text-xl">
              {inTraining ? 'PAUSED' : roundedTimer <= 0 ? 'OT!' : `${roundedTimer}s`}
            </p>
          </div>

          {/* Chaos Meter */}
          <div className="pointer-events-auto min-w-0 flex-1 rounded-2xl border-3 border-black bg-zinc-900 px-2 py-1 text-white shadow-[4px_4px_0px_#111] sm:w-36 sm:flex-none sm:border-4 sm:px-2.5 sm:py-1.5">
            <div className="mb-1 flex items-center justify-between text-[9px] font-black uppercase">
              <span className="flex items-center gap-1 text-amber-300">
                <Flame className="h-3 w-3 shrink-0" aria-hidden="true" />
                {frenzyActive ? 'FULL SEND!' : 'CHAOS'}
              </span>
              <span>{Math.round(chaosMeter)}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full border-2 border-black bg-zinc-700">
              <div
                className={`h-full transition-all ${
                  frenzyActive
                    ? 'bg-red-500'
                    : chaosMeter >= 50
                      ? 'bg-orange-400'
                      : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.min(100, chaosMeter)}%` }}
              />
            </div>
          </div>

          {/* Damage & Score */}
          <div className="pointer-events-auto rounded-2xl border-3 border-black bg-amber-100 px-2 py-1 text-black shadow-[4px_4px_0px_#111] sm:border-4 sm:px-2.5 sm:py-1.5">
            <p className="max-w-[74px] truncate text-[9px] font-black uppercase text-zinc-600 sm:max-w-none">
              {mechanicName}
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs font-black text-red-700 sm:text-sm">
                ${shopDamageTotal.toFixed(0)}
              </span>
              <span className="text-[10px] font-extrabold text-zinc-700 sm:text-[11px]">
                {flatRateScore}p
              </span>
            </div>
          </div>

          {/* Audio + Help + Floor Toggles */}
          <div className="pointer-events-auto flex shrink-0 gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={() => {
                useGameStore.getState().returnToClockIn();
                useShopStore.getState().exitBayToFloor();
              }}
              title="Back to Shop Floor"
              aria-label="Back to Shop Floor"
              className="flex cursor-pointer items-center gap-1 rounded-xl border-3 border-black bg-amber-300 px-2.5 py-2 text-[11px] font-black uppercase text-black shadow-[3px_3px_0px_#111] hover:bg-amber-200"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Floor</span>
            </button>
            <button
              type="button"
              onClick={toggleSfx}
              title={sfxMuted ? 'Unmute SFX' : 'Mute SFX'}
              aria-label={sfxMuted ? 'Unmute sound effects' : 'Mute sound effects'}
              className="flex cursor-pointer items-center justify-center rounded-xl border-3 border-black bg-white p-2 text-black shadow-[3px_3px_0px_#111] hover:bg-zinc-100"
            >
              {sfxMuted ? (
                <VolumeX className="h-4 w-4 text-red-600" aria-hidden="true" />
              ) : (
                <Volume2 className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              onClick={toggleMusic}
              title={musicMuted ? 'Unmute Shop Radio' : 'Mute Shop Radio'}
              aria-label={musicMuted ? 'Unmute shop radio' : 'Mute shop radio'}
              className={`flex cursor-pointer items-center justify-center rounded-xl border-3 border-black p-2 shadow-[3px_3px_0px_#111] ${
                musicMuted ? 'bg-zinc-300 text-red-700' : 'bg-amber-300 text-black'
              }`}
            >
              <Music className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => helpDialogRef.current?.showModal()}
              title="How to Play"
              aria-label="How to Play"
              className="flex cursor-pointer items-center justify-center rounded-xl border-3 border-black bg-sky-300 p-2 text-black shadow-[3px_3px_0px_#111] hover:bg-sky-200"
            >
              <HelpCircle className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Comic Toast Feed */}
      <div className="pointer-events-none fixed inset-x-3 top-[7.8rem] z-20 mx-auto flex w-[min(92dvw,340px)] flex-col gap-1.5 sm:inset-x-auto sm:top-auto sm:bottom-36 sm:left-3 sm:mx-0 sm:w-64 [@media(max-height:500px)]:left-auto [@media(max-height:500px)]:right-3 [@media(max-height:500px)]:top-[4.4rem] [@media(max-height:500px)]:bottom-auto [@media(max-height:500px)]:mx-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-xl border-3 border-black px-3 py-1.5 text-xs font-black shadow-[4px_4px_0px_#000] ${
              toast.tone === 'bad'
                ? 'bg-red-500 text-white'
                : toast.tone === 'good'
                  ? 'bg-emerald-300 text-black'
                  : toast.tone === 'comedy'
                    ? 'bg-amber-300 text-black'
                    : 'bg-sky-200 text-black'
            }`}
          >
            {toast.text}
          </div>
        ))}
      </div>

      {/* Job Intro Card */}
      {phase === 'intro' ? (
        <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-3 sm:p-4">
          <div className="max-h-[92dvh] w-[min(94dvw,520px)] overflow-y-auto rounded-2xl border-4 border-black bg-amber-50 p-4 text-black shadow-[10px_10px_0px_#111] sm:p-5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="rounded-lg border-2 border-black bg-red-600 px-2.5 py-0.5 text-xs font-black text-white">
                {job.dayLabel}
              </span>
              <span className="text-xs font-black uppercase text-zinc-700">
                PAYS {job.billedHours.toFixed(1)} FLAT-RATE HRS
              </span>
            </div>
            <h2 className="text-xl font-black leading-tight sm:text-2xl">{job.title}</h2>
            <p className="mt-0.5 text-xs font-bold text-zinc-700 sm:text-sm">
              {job.bikeName} • Customer: <span className="font-black text-black">{job.customerName}</span>
            </p>

            {/* Real Motorcycle + Customer Preview */}
            <div className="mt-2.5 grid grid-cols-[1fr_80px] items-center gap-2.5 rounded-xl border-3 border-black bg-white p-2 sm:mt-3 sm:grid-cols-[1fr_92px] sm:gap-3 sm:p-2.5">
              <div className="relative h-20 w-full sm:h-28 [@media(max-height:500px)]:h-16">
                <Image
                  src={`/sprites/bikes/${job.bikeSprite}.png`}
                  alt={job.bikeName}
                  fill
                  className="object-contain"
                />
              </div>
              <div className="relative h-20 w-[80px] overflow-hidden rounded-xl border-2 border-black bg-amber-100 sm:h-24 sm:w-[92px] [@media(max-height:500px)]:h-16">
                <Image
                  src={job.customerPortrait}
                  alt={job.customerName}
                  fill
                  className="object-contain object-bottom"
                />
              </div>
            </div>

            <p className="mt-2.5 rounded-xl border-2 border-black bg-white p-2.5 text-xs font-bold italic text-zinc-900 sm:text-sm">
              {job.customerNote}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-1.5 text-center text-[11px] font-black">
              <div className="rounded-lg border-2 border-black bg-amber-200 px-2 py-1.5">
                1. Pick Tool [1–6]
              </div>
              <div className="rounded-lg border-2 border-black bg-emerald-200 px-2 py-1.5">
                2. Click Bike Part [Space]
              </div>
              <div className="rounded-lg border-2 border-black bg-sky-200 px-2 py-1.5">
                3. Beat Bar &amp; Hazards
              </div>
            </div>
            <button
              type="button"
              onClick={() => useGameStore.getState().startShiftFromIntro()}
              className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-3 border-black bg-emerald-400 py-2.5 text-base font-black uppercase text-black shadow-[4px_4px_0px_#000] hover:bg-emerald-300"
            >
              <Wrench className="h-5 w-5" />
              PULL INTO BAY [SPACE]
            </button>
          </div>
        </div>
      ) : null}

      {/* Job Complete Rubber Stamp Overlay */}
      {phase === 'job_complete' ? (
        <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center">
          <div className="-rotate-6 rounded-2xl border-4 border-black bg-emerald-400 px-8 py-5 text-center text-black shadow-[10px_10px_0px_#000]">
            <p className="text-xs font-black uppercase tracking-widest">REPAIR ORDER COMPLETE</p>
            <h2 className="text-3xl font-black uppercase">FLAGGED +{job.billedHours.toFixed(1)} HRS!</h2>
            <p className="mt-1 text-sm font-extrabold">Rolling next bike onto the lift...</p>
          </div>
        </div>
      ) : null}

      {/* Bottom Action Banner + Tool Belt Stack */}
      <div className="flex flex-col items-center gap-1.5 sm:gap-2">
        {phase === 'playing' && !torqueActive && !wiringActive && step ? (
          <div className="pointer-events-auto w-full max-w-md sm:w-auto sm:max-w-none">
            {breakerBlown ? (
              <button
                type="button"
                onClick={() => useGameStore.getState().resetBreaker()}
                className="flex min-h-[44px] w-full animate-bounce cursor-pointer items-center justify-center rounded-2xl border-4 border-black bg-red-500 px-3 py-1.5 text-center text-[11px] font-black uppercase text-white shadow-[5px_5px_0px_#000] sm:w-auto sm:px-4 sm:py-2 sm:text-sm"
              >
                ⚡ POWER OUT! Tap Breaker Box on Wall (or Tap Here)
              </button>
            ) : activeHazard === 'MISSING_SOCKET' ? (
              <div className="flex min-h-[44px] w-full animate-pulse items-center justify-center rounded-2xl border-4 border-black bg-sky-300 px-3 py-1.5 text-center text-[11px] font-black uppercase text-black shadow-[5px_5px_0px_#000] sm:w-auto sm:px-4 sm:py-2 sm:text-sm">
                🔍 CATCH YOUR 10MM SOCKET! Tap it on the floor (dodge oil!)
              </div>
            ) : buddyActive ? (
              <>
                {/* Mobile Portrait: Readable Comic Speech Popup Card for Dyna Bro */}
                <button
                  type="button"
                  onClick={() => useGameStore.getState().dismissBuddy()}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border-4 border-black bg-amber-50 p-3 text-left text-black shadow-[6px_6px_0px_#000] active:translate-y-0.5 md:hidden [@media(orientation:portrait)]:flex"
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border-2 border-black bg-amber-200">
                    <Image
                      src="/sprites/portraits/dynabro.png"
                      alt="Dyna Bro"
                      fill
                      className="object-contain object-top"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-black uppercase tracking-wide text-orange-700">
                        DYNA BRO
                      </span>
                      <span className="rounded bg-black px-2 py-0.5 text-[10px] font-black uppercase text-amber-300">
                        TAP TO SHOO
                      </span>
                    </div>
                    <p className="text-[13px] font-extrabold leading-snug text-zinc-900">
                      &ldquo;{buddyLine || 'Hey bro, got a quick question!'}&rdquo;
                    </p>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full border border-black bg-zinc-200">
                      <div
                        className="h-full bg-red-500 transition-all"
                        style={{ width: `${buddyPatiencePct}%` }}
                      />
                    </div>
                  </div>
                </button>

                {/* Tablet/Desktop Landscape: Existing compact orange shoo bar */}
                <button
                  type="button"
                  onClick={() => useGameStore.getState().dismissBuddy()}
                  className="hidden min-h-[44px] animate-bounce cursor-pointer items-center justify-center rounded-2xl border-4 border-black bg-orange-400 px-4 py-2 text-center text-sm font-black uppercase text-black shadow-[5px_5px_0px_#000] md:flex [@media(orientation:portrait)]:hidden"
                >
                  🗣️ CHATTY BUDDY! Click Him or Click Here [E] to SHOO!
                </button>
              </>
            ) : requiredTool && equippedTool !== requiredToolId ? (
              <div className="flex min-h-[44px] w-full items-center justify-center rounded-2xl border-4 border-black bg-amber-300 px-3 py-1.5 text-center text-[11px] font-black uppercase text-black shadow-[5px_5px_0px_#000] sm:w-auto sm:px-4 sm:py-2 sm:text-sm">
                STEP 1 OF 2: Tap {requiredTool.shortName} below
                <span className="hidden sm:inline">&nbsp;(or press {requiredTool.hotkey})</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => useGameStore.getState().interactHotspot(step.hotspot)}
                className="flex min-h-[44px] w-full animate-bounce cursor-pointer items-center justify-center rounded-2xl border-4 border-black bg-emerald-400 px-3 py-1.5 text-center text-[11px] font-black uppercase text-black shadow-[5px_5px_0px_#000] hover:bg-emerald-300 sm:w-auto sm:px-4 sm:py-2 sm:text-sm"
              >
                STEP 2 OF 2: Tap {HOTSPOT_LABELS[step.hotspot]} — OR TAP HERE!
                <span className="hidden sm:inline">&nbsp;[SPACE]</span>
              </button>
            )}
          </div>
        ) : null}

        {/* Bottom Tool Belt Bar (2x3 thumb grid on mobile portrait, horizontal bar on sm+/landscape) */}
        <div className="pointer-events-auto mx-auto grid w-full max-w-md grid-cols-3 gap-1.5 rounded-2xl border-4 border-black bg-zinc-900/95 p-1.5 shadow-[6px_6px_0px_#000] sm:flex sm:w-auto sm:max-w-full sm:flex-wrap sm:items-center sm:justify-center sm:gap-1 md:flex-nowrap [@media(max-height:500px)]:flex [@media(max-height:500px)]:w-auto [@media(max-height:500px)]:max-w-full">
          {TOOLS.map((tool) => {
            const isSelected = equippedTool === tool.id;
            const isNeeded = requiredToolId === tool.id;

            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => useGameStore.getState().equipTool(tool.id)}
                title={tool.description}
                className={`relative flex min-h-[44px] cursor-pointer items-center justify-center gap-1 rounded-xl border-3 px-1.5 py-1 text-left transition-transform sm:justify-start sm:px-2 ${
                  isSelected
                    ? '-translate-y-0.5 sm:-translate-y-1 border-black bg-amber-300 text-black shadow-[3px_3px_0px_#000]'
                    : isNeeded
                      ? 'border-yellow-300 bg-zinc-700 text-white ring-2 ring-yellow-300 hover:bg-zinc-600'
                      : 'border-black bg-zinc-800 text-white hover:bg-zinc-700'
                }`}
              >
                <span
                  className="hidden h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-black text-[11px] font-black text-black sm:flex"
                  style={{ backgroundColor: tool.color }}
                >
                  {tool.hotkey}
                </span>
                <Image
                  src={`/sprites/props/tools/${tool.id}.png`}
                  alt={tool.shortName}
                  width={24}
                  height={24}
                  className="h-6 w-6 shrink-0 object-contain drop-shadow-[1px_1px_0px_#000]"
                />
                <span className="truncate text-[10px] font-black sm:whitespace-nowrap sm:text-[11px]">
                  {tool.shortName}
                </span>
                {isNeeded && !isSelected ? (
                  <span className="absolute -right-1 -top-2 animate-bounce rounded-full border-2 border-black bg-yellow-300 px-1.5 py-0.5 text-[9px] font-black uppercase text-black sm:-right-1.5 sm:-top-2.5">
                    PICK
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Native <dialog> How-to-Play Modal */}
      <dialog
        ref={helpDialogRef}
        closedby="any"
        aria-labelledby="how-to-play-title"
        onClose={(e) => {
          e.currentTarget.returnValue = '';
        }}
        className="pointer-events-auto m-auto max-h-[90dvh] w-[min(92dvw,520px)] overflow-y-auto rounded-3xl border-4 border-black bg-amber-50 p-4 text-black shadow-[12px_12px_0px_#111] sm:p-5"
      >
        <div className="flex items-center justify-between border-b-3 border-black pb-2.5">
          <h2 id="how-to-play-title" className="text-xl font-black uppercase">
            How to Wrench &amp; Survive the Shift
          </h2>
          <form method="dialog">
            <button
              type="submit"
              aria-label="Close help"
              className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-black bg-white p-1.5 hover:bg-zinc-200"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        </div>

        <ol className="mt-3 space-y-2 text-xs font-bold leading-relaxed text-zinc-800 sm:text-sm">
          <li>
            <span className="font-black text-black">1. Pick the Right Tool [1–6]:</span> Look at the{' '}
            <span className="rounded border border-black bg-yellow-300 px-1 font-black">PICK</span> badge on the bottom tool belt (or tap the rolling tool chest). Using the wrong tool triggers slapstick damage!
          </li>
          <li>
            <span className="font-black text-black">2. Tap the Glowing Bike Part [Space]:</span> Tap the bouncing beacon on the bike (or tap the green Step 2 banner) to start the work mini-game.
          </li>
          <li>
            <span className="font-black text-black">3. Beat the Mini-Game:</span> Stop the Torque Bar needle inside the green zone, hold Propane/Brake Kleen to 100%, or match 4 wire colors before the battery fuse blows.
          </li>
          <li>
            <span className="font-black text-black">4. Clear Shop Hazards:</span> Shoo Chatty Buddies with <span className="font-black">[E]</span>, click escaped 10mm sockets on the floor (dodge oil puddles!), and reset the wall Breaker Box if the lights go out.
          </li>
        </ol>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              helpDialogRef.current?.close();
              useGameStore.getState().restartGuidedWalkthrough();
            }}
            className="flex-1 cursor-pointer rounded-2xl border-3 border-black bg-sky-300 py-2.5 text-sm font-black uppercase text-black shadow-[4px_4px_0px_#000] hover:bg-sky-200"
          >
            Replay Guided Walkthrough
          </button>
          <form method="dialog" className="flex-1">
            <button
              type="submit"
              autoFocus
              className="w-full cursor-pointer rounded-2xl border-3 border-black bg-emerald-400 py-2.5 text-sm font-black uppercase text-black shadow-[4px_4px_0px_#000] hover:bg-emerald-300"
            >
              Got It — Back to Bay
            </button>
          </form>
        </div>
      </dialog>
    </div>
  );
}
