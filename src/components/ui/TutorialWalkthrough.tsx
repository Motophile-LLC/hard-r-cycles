'use client';

import { CheckCircle2, PauseCircle, X } from 'lucide-react';
import Image from 'next/image';
import { isTutorialTraining, useGameStore } from '@/store/useGameStore';
import type { TutorialStep } from '@/types/game';

interface StepCopy {
  stepNum: number;
  title: string;
  body: string;
}

const STEP_COPY: Record<
  Exclude<TutorialStep, 'inactive' | 'graduated' | 'rescue_snapped_bolt'>,
  StepCopy
> = {
  pick_brake_cleaner: {
    stepNum: 1,
    title: 'Step 1 of 6: Grab [6] Brake Kleen',
    body: 'First, equip the right tool for the job. Click [6] Brake Kleen on the bottom tool belt (or press 6 on your keyboard).',
  },
  open_oil_pan_hold: {
    stepNum: 2,
    title: 'Step 2 of 6: Target the Oil Drain Pan',
    body: 'Great! Now click the glowing green "▼ CLICK: OIL DRAIN PAN" badge on the bike (or press Space) to start blasting off sludge.',
  },
  complete_hold_bar: {
    stepNum: 3,
    title: 'Step 3 of 6: Hold to Spray Cleaner',
    body: 'Hold Space (or press & hold / tap the orange button below) until the bar reaches 100%.',
  },
  pick_torque_wrench: {
    stepNum: 4,
    title: 'Step 4 of 6: Switch to [1] Torque Wrench',
    body: 'Drain pan is clean! Now pick [1] Torque Wrench (press 1) so you don’t strip the aluminum drain plug.',
  },
  open_torque_bar: {
    stepNum: 5,
    title: 'Step 5 of 6: Open the Torque Spec Bar',
    body: 'Click the Oil Drain Pan on the bike (or press Space) to line up your torque wrench.',
  },
  complete_torque_bar: {
    stepNum: 5,
    title: 'Step 5 of 6: Hit the Green Sweet Spot!',
    body: 'Press Space (or click the green button) right when the yellow needle enters the green zone. We slowed it down for orientation!',
  },
  shoo_shop_buddy: {
    stepNum: 6,
    title: 'Step 6 of 6: Shoo Dyna Bro Out of the Bay!',
    body: 'Dyna Bro wandered in and is blocking the lift! Click him (or his speech bubble, or press E) to shoo him back out.',
  },
};

export function TutorialWalkthrough() {
  const phase = useGameStore((s) => s.phase);
  const tutorialStep = useGameStore((s) => s.tutorialStep);
  const torquePhase = useGameStore((s) => s.torquePhase);

  if (phase !== 'playing' || tutorialStep === 'inactive') return null;

  if (tutorialStep === 'graduated') {
    return (
      <div className="pointer-events-none fixed left-1/2 top-[7.6rem] z-30 w-[min(94dvw,490px)] -translate-x-1/2 sm:top-24 [@media(max-height:500px)]:top-[4.4rem]">
        <div className="pointer-events-auto flex items-center justify-between gap-2.5 rounded-2xl border-4 border-black bg-emerald-300 px-3 py-2 text-black shadow-[6px_6px_0px_#111] sm:gap-3 sm:px-4 sm:py-2.5">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-900" aria-hidden="true" />
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-emerald-900">
                ORIENTATION COMPLETE • CLOCK IS LIVE!
              </p>
              <p className="text-xs font-extrabold">
                Finish Step 3 (V-Twin Block) and tackle Bikes 2–4. Watch out for crossed wires &amp; 10mm sockets!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => useGameStore.getState().dismissTutorialBanner()}
            className="shrink-0 cursor-pointer rounded-xl border-2 border-black bg-white px-2.5 py-1 text-xs font-black uppercase hover:bg-zinc-100"
          >
            Got It
          </button>
        </div>
      </div>
    );
  }

  const inTraining = isTutorialTraining(tutorialStep);
  const copy: StepCopy =
    tutorialStep === 'rescue_snapped_bolt'
      ? {
          stepNum: 5,
          title: 'Bonus Rescue: Snapped Bolt Drill!',
          body:
            torquePhase === 'extract_heat'
              ? 'You missed the green zone and snapped the head! Great practice: equip [3] Propane Torch, click Oil Drain Pan, and heat it to 100%.'
              : 'Bolt is cherry-red! Now equip [4] EZ-Out Extractor, click Oil Drain Pan, and nail the green zone to pull the stud out.',
        }
      : STEP_COPY[tutorialStep];

  const progressPct = Math.round((copy.stepNum / 6) * 100);
  const portraitSrc =
    tutorialStep === 'rescue_snapped_bolt'
      ? '/sprites/portraits/dick-wtf.png'
      : '/sprites/portraits/dick-front.png';

  return (
    <div className="pointer-events-none fixed left-1/2 top-[7.6rem] z-30 w-[min(94dvw,520px)] -translate-x-1/2 sm:top-24 [@media(max-height:500px)]:top-[4.4rem]">
      <div className="pointer-events-auto flex items-center gap-2.5 rounded-2xl border-4 border-black bg-sky-100 px-2.5 py-2 text-black shadow-[6px_6px_0px_#111] sm:gap-3 sm:px-3.5 sm:py-2.5">
        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border-3 border-black bg-amber-100 sm:h-14 sm:w-14">
          <Image src={portraitSrc} alt="Dick Foreman Guide" fill className="object-contain object-top" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-sky-900">
                DICK&apos;S ORIENTATION • {copy.stepNum}/6
              </span>
              {inTraining ? (
                <span className="inline-flex items-center gap-1 rounded-full border-2 border-black bg-emerald-300 px-2 py-0.5 text-[10px] font-black uppercase text-black">
                  <PauseCircle className="h-3 w-3" aria-hidden="true" /> CLOCK PAUSED
                </span>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => useGameStore.getState().skipTutorial()}
              aria-label="Skip orientation walkthrough"
              className="flex cursor-pointer items-center justify-center gap-1 rounded-lg border-2 border-black bg-white px-2.5 py-1 text-[10px] font-black uppercase hover:bg-zinc-200"
            >
              <X className="h-3 w-3" aria-hidden="true" /> Skip
            </button>
          </div>

          <h3 className="mt-0.5 text-xs font-black leading-tight sm:text-sm">{copy.title}</h3>
          <p className="mt-0.5 text-[11px] font-bold leading-snug text-zinc-800 sm:text-xs">{copy.body}</p>

          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full border-2 border-black bg-white">
            <div
              className="h-full bg-sky-500 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
