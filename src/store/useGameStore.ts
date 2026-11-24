import { create } from 'zustand';
import {
  HOTSPOT_LABELS,
  HOTSPOT_POSITIONS,
  SECONDS_PER_BILLED_HOUR,
  SHIFT_JOBS,
  SHOP_BUDDY_LINES,
  TOOL_MAP,
  drawShiftJobs,
  getJobPacing,
} from '@/data/shiftJobs';
import type {
  BikeHotspot,
  BuddyPose,
  GamePhase,
  HazardType,
  JobDefinition,
  MechanicPose,
  OilSpill,
  ParticleBurst,
  ParticleKind,
  ServiceWriterPose,
  ShakeIntensity,
  ShopToast,
  ToolId,
  TorquePhase,
  TutorialStep,
} from '@/types/game';
import { shopAudio } from '@/utils/audio';

interface BuddyState {
  active: boolean;
  pose: BuddyPose;
  line: string;
  patience: number;
  dismissedCount: number;
}

interface CameraShakeState {
  intensity: ShakeIntensity;
  timeLeft: number;
  maxTime: number;
}

interface SquashEvent {
  id: number;
  type: 'jump' | 'slam' | 'zap';
}

export interface GameState {
  phase: GamePhase;
  mechanicName: string;
  shiftJobs: JobDefinition[];
  currentJobIndex: number;
  currentStepIndex: number;

  // Clocks & shift metrics
  bayTimer: number;
  introTimer: number;
  jobCompleteTimer: number;
  jobElapsedSeconds: number;
  totalActualSeconds: number;
  billedHoursTotal: number;
  flatRateScore: number;
  shopDamageTotal: number;
  jobsCompleted: number;

  // Chaos & frenzy
  chaosMeter: number;
  frenzyActive: boolean;
  frenzyTimer: number;

  // Player state & pose
  equippedTool: ToolId | null;
  mechanicPose: MechanicPose;
  poseLockTimer: number;
  activeHotspotFocus: BikeHotspot | 'tool_chest' | 'breaker';
  serviceWriterPose: ServiceWriterPose;

  // Active hazard & mini-games
  activeHazard: HazardType;
  breakerBlown: boolean;
  torqueActive: boolean;
  torquePhase: TorquePhase;
  torqueNeedle: number;
  torqueDirection: 1 | -1;
  torqueTargetCenter: number;
  torqueTargetWidth: number;
  holdProgress: number;
  holdingActive: boolean;
  wiringActive: boolean;
  socketDropId: number;
  socketDropRollCooldown: number;
  oilSpills: OilSpill[];

  // Shop buddy
  buddy: BuddyState;
  nextBuddyIn: number;

  // Bonus dilemma
  pendingExtraBolt: boolean;
  extraBoltOutcome: string | null;

  // Guided Walkthrough
  tutorialStep: TutorialStep;

  // Visual juice & feedback
  toasts: ShopToast[];
  cameraShake: CameraShakeState;
  squashEvent: SquashEvent;
  particleBursts: ParticleBurst[];

  // Actions
  clockIn: (name: string, withTutorial?: boolean) => void;
  skipTutorial: () => void;
  dismissTutorialBanner: () => void;
  restartGuidedWalkthrough: () => void;
  startShiftFromIntro: () => void;
  advanceToNextJob: () => void;
  equipTool: (tool: ToolId) => void;
  interactHotspot: (hotspot: BikeHotspot) => void;
  setHoldingActive: (holding: boolean) => void;
  attemptTorqueStop: () => void;
  cancelActiveOverlay: () => void;
  resolveWiringSuccess: () => void;
  failWiring: (reason: string) => void;
  resetBreaker: () => void;
  resolveSocketHunt: () => void;
  hitOilSlick: (spillId: number) => void;
  dismissBuddy: () => void;
  chooseExtraBolt: (choice: 'toss' | 'teardown') => void;
  returnToClockIn: () => void;
  consumeParticles: () => ParticleBurst[];
  tick: (delta: number) => void;
}

let toastCounter = 1;
let burstCounter = 1;
let spillCounter = 1;
let squashCounter = 1;

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function createBurst(
  kind: ParticleKind,
  x: number,
  y: number,
  z: number,
  count = 16,
): ParticleBurst {
  return {
    id: burstCounter++,
    kind,
    x,
    y,
    z,
    count,
  };
}

function getInitialBuddyDelay(jobs: JobDefinition[], jobIndex: number): number {
  const job = jobs[jobIndex] ?? jobs[0];
  return randomBetween(job.buddyIntervalMin, job.buddyIntervalMax);
}

export function isTutorialTraining(step: TutorialStep): boolean {
  return step !== 'inactive' && step !== 'graduated';
}

function markTutorialDoneStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem('hardr_tutorial_done_v1', '1');
  } catch {
    // Ignore storage errors
  }
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'clock_in',
  mechanicName: 'Wrencher',
  shiftJobs: SHIFT_JOBS,
  currentJobIndex: 0,
  currentStepIndex: 0,

  bayTimer: SHIFT_JOBS[0].parSeconds,
  introTimer: 0,
  jobCompleteTimer: 0,
  jobElapsedSeconds: 0,
  totalActualSeconds: 0,
  billedHoursTotal: 0,
  flatRateScore: 0,
  shopDamageTotal: 0,
  jobsCompleted: 0,

  chaosMeter: 0,
  frenzyActive: false,
  frenzyTimer: 0,

  equippedTool: null,
  mechanicPose: 'idle',
  poseLockTimer: 0,
  activeHotspotFocus: 'oil_pan',
  serviceWriterPose: 'calm',

  activeHazard: 'NONE',
  breakerBlown: false,
  torqueActive: false,
  torquePhase: 'normal',
  torqueNeedle: 15,
  torqueDirection: 1,
  torqueTargetCenter: 50,
  torqueTargetWidth: 24,
  holdProgress: 0,
  holdingActive: false,
  wiringActive: false,
  socketDropId: 0,
  socketDropRollCooldown: 0,
  oilSpills: [],

  buddy: {
    active: false,
    pose: 'idle',
    line: '',
    patience: 0,
    dismissedCount: 0,
  },
  nextBuddyIn: getInitialBuddyDelay(SHIFT_JOBS, 0),

  pendingExtraBolt: false,
  extraBoltOutcome: null,

  tutorialStep: 'inactive',

  toasts: [],
  cameraShake: { intensity: 'none', timeLeft: 0, maxTime: 0.35 },
  squashEvent: { id: 0, type: 'jump' },
  particleBursts: [],

  consumeParticles: () => {
    const bursts = get().particleBursts;
    if (bursts.length === 0) return bursts;
    set({ particleBursts: [] });
    return bursts;
  },

  clockIn: (rawName: string, withTutorial = false) => {
    const cleanName = rawName.trim().slice(0, 24) || 'Grease Monkey';
    const nextJobs = drawShiftJobs(withTutorial);
    const firstJob = nextJobs[0];
    shopAudio.unlockAudio();
    shopAudio.setRadioTempo(getJobPacing(0).radioBaseTempo);
    shopAudio.startShopRadio();

    set({
      phase: 'intro',
      mechanicName: cleanName,
      shiftJobs: nextJobs,
      currentJobIndex: 0,
      currentStepIndex: 0,
      bayTimer: firstJob.parSeconds,
      introTimer: 0,
      jobCompleteTimer: 0,
      jobElapsedSeconds: 0,
      totalActualSeconds: 0,
      billedHoursTotal: 0,
      flatRateScore: 0,
      shopDamageTotal: 0,
      jobsCompleted: 0,
      chaosMeter: 0,
      frenzyActive: false,
      frenzyTimer: 0,
      equippedTool: null,
      mechanicPose: 'idle',
      poseLockTimer: 0,
      activeHotspotFocus: firstJob.steps[0].hotspot,
      serviceWriterPose: 'calm',
      activeHazard: 'NONE',
      breakerBlown: false,
      torqueActive: false,
      torquePhase: 'normal',
      torqueNeedle: 15,
      torqueDirection: 1,
      torqueTargetCenter: 50,
      torqueTargetWidth: firstJob.steps[1]?.targetWidth ?? 32,
      holdProgress: 0,
      holdingActive: false,
      wiringActive: false,
      socketDropId: 0,
      socketDropRollCooldown: 1,
      oilSpills: [],
      buddy: {
        active: false,
        pose: 'idle',
        line: '',
        patience: 0,
        dismissedCount: 0,
      },
      nextBuddyIn: getInitialBuddyDelay(nextJobs, 0),
      pendingExtraBolt: false,
      extraBoltOutcome: null,
      tutorialStep: withTutorial ? 'pick_brake_cleaner' : 'inactive',
      toasts: [
        {
          id: toastCounter++,
          text: withTutorial
            ? `Orientation started for ${cleanName}! Clock is paused while you learn.`
            : `Clocked in as ${cleanName}! Pick the highlighted tool below, then tap the bike.`,
          tone: 'good',
          ttl: 5.5,
        },
      ],
      cameraShake: { intensity: 'none', timeLeft: 0, maxTime: 0.3 },
      squashEvent: { id: squashCounter++, type: 'jump' },
      particleBursts: [],
    });
  },

  skipTutorial: () => {
    const state = get();
    markTutorialDoneStorage();
    const hideScriptedBuddy = state.buddy.active && state.buddy.patience > 20;
    set({
      tutorialStep: 'inactive',
      buddy: hideScriptedBuddy
        ? { ...state.buddy, active: false, pose: 'dismissed', patience: 0 }
        : state.buddy,
      toasts: [
        ...state.toasts.slice(-3),
        {
          id: toastCounter++,
          text: 'Orientation skipped — Flat Rate Clock is LIVE!',
          tone: 'warn',
          ttl: 4.5,
        },
      ],
    });
  },

  dismissTutorialBanner: () => {
    if (get().tutorialStep === 'graduated') {
      set({ tutorialStep: 'inactive' });
    }
  },

  restartGuidedWalkthrough: () => {
    get().clockIn(get().mechanicName, true);
  },

  startShiftFromIntro: () => {
    if (get().phase === 'intro') {
      set({ phase: 'playing', introTimer: 0 });
    }
  },

  advanceToNextJob: () => {
    const state = get();
    const nextIdx = state.currentJobIndex + 1;
    if (nextIdx >= state.shiftJobs.length) {
      set({
        phase: 'extra_bolt',
        pendingExtraBolt: true,
        torqueActive: false,
        wiringActive: false,
      });
      return;
    }

    const job = state.shiftJobs[nextIdx];
    set({
      phase: 'intro',
      currentJobIndex: nextIdx,
      currentStepIndex: 0,
      bayTimer: job.parSeconds,
      introTimer: 0,
      jobCompleteTimer: 0,
      jobElapsedSeconds: 0,
      equippedTool: null,
      oilSpills: [],
      mechanicPose: 'idle',
      poseLockTimer: 0,
      activeHotspotFocus: job.steps[0].hotspot,
      activeHazard: 'NONE',
      breakerBlown: false,
      torqueActive: false,
      torquePhase: 'normal',
      holdProgress: 0,
      holdingActive: false,
      wiringActive: false,
      nextBuddyIn: getInitialBuddyDelay(state.shiftJobs, nextIdx),
      buddy: {
        ...state.buddy,
        active: false,
        patience: 0,
      },
      squashEvent: { id: squashCounter++, type: 'jump' },
    });
  },

  equipTool: (tool: ToolId) => {
    const state = get();
    if (state.phase !== 'playing') return;

    const job = state.shiftJobs[state.currentJobIndex];
    const inTraining = isTutorialTraining(state.tutorialStep);
    const isWrench = tool === 'torque_wrench' || tool === 'impact_gun';
    const canDropSocket =
      !inTraining &&
      isWrench &&
      state.activeHazard === 'NONE' &&
      !state.torqueActive &&
      !state.wiringActive &&
      state.socketDropRollCooldown <= 0 &&
      (state.currentJobIndex > 0 || state.currentStepIndex > 0);

    if (canDropSocket && Math.random() < job.socketDropChance) {
      shopAudio.playSocketDrop();
      const extraSpill =
        state.oilSpills.length < 3
          ? [
              ...state.oilSpills,
              {
                id: spillCounter++,
                x: randomBetween(-1.9, 1.9),
                z: randomBetween(1.15, 2.35),
              },
            ]
          : state.oilSpills;

      set({
        equippedTool: tool,
        activeHazard: 'MISSING_SOCKET',
        socketDropId: state.socketDropId + 1,
        socketDropRollCooldown: 18,
        oilSpills: extraSpill,
        mechanicPose: 'panicked',
        poseLockTimer: 2.0,
        activeHotspotFocus: 'tool_chest',
        toasts: [
          ...state.toasts.slice(-3),
          {
            id: toastCounter++,
            text: '10mm SOCKET VANISHED! Click the rolling socket on the floor — dodge oil!',
            tone: 'warn',
          },
        ],
        squashEvent: { id: squashCounter++, type: 'jump' },
      });
      return;
    }

    let nextTutorial = state.tutorialStep;
    if (state.tutorialStep === 'pick_brake_cleaner' && tool === 'brake_cleaner') {
      nextTutorial = 'open_oil_pan_hold';
    } else if (state.tutorialStep === 'open_oil_pan_hold' && tool !== 'brake_cleaner') {
      nextTutorial = 'pick_brake_cleaner';
    } else if (state.tutorialStep === 'pick_torque_wrench' && tool === 'torque_wrench') {
      nextTutorial = 'open_torque_bar';
    } else if (state.tutorialStep === 'open_torque_bar' && tool !== 'torque_wrench') {
      nextTutorial = 'pick_torque_wrench';
    }

    set({
      equippedTool: tool,
      activeHotspotFocus: 'tool_chest',
      tutorialStep: nextTutorial,
    });
  },

  interactHotspot: (hotspot: BikeHotspot) => {
    const state = get();
    if (state.phase !== 'playing') return;

    const pushToast = (text: string, tone: ShopToast['tone']) => ({
      toasts: [...state.toasts.slice(-3), { id: toastCounter++, text, tone }],
    });

    if (state.breakerBlown || state.activeHazard === 'BREAKER_BLOWN') {
      shopAudio.playWrongTool();
      set({
        activeHotspotFocus: 'breaker',
        ...pushToast('Breakers blown! Click the flashing Breaker Box on the back wall!', 'bad'),
      });
      return;
    }

    if (state.activeHazard === 'MISSING_SOCKET') {
      shopAudio.playSocketDrop();
      set(pushToast('Grab your runaway 10mm socket off the floor first!', 'warn'));
      return;
    }

    if (state.buddy.active) {
      shopAudio.playBuddyBoing();
      set({
        mechanicPose: 'facepalm',
        poseLockTimer: 1.1,
        squashEvent: { id: squashCounter++, type: 'slam' },
        ...pushToast('Chatty shop buddy is blocking the lift! Click him (or press E) to shoo him!', 'warn'),
      });
      return;
    }

    const job = state.shiftJobs[state.currentJobIndex];
    const step = job.steps[state.currentStepIndex];
    if (!step) return;

    if (hotspot !== step.hotspot) {
      shopAudio.playWrongTool();
      set({
        ...pushToast(
          `Wrong zone! Work on the ${HOTSPOT_LABELS[step.hotspot]} next.`,
          'warn',
        ),
      });
      return;
    }

    const requiredTool: ToolId =
      state.activeHazard === 'BOLT_STRIPPED'
        ? state.torquePhase === 'extract_heat'
          ? 'propane_torch'
          : 'ez_out'
        : step.requiredTool;

    if (state.equippedTool !== requiredTool) {
      const pacing = getJobPacing(state.currentJobIndex);
      const usedTool = state.equippedTool ? TOOL_MAP[state.equippedTool] : null;
      const penalty = usedTool ? usedTool.wrongToolPenalty : 50;
      const timerPenalty = usedTool ? pacing.wrongToolTimerPenalty : 0;
      const quip = usedTool
        ? `${usedTool.wrongToolQuip} (+$${penalty} damage, -${timerPenalty}s)`
        : `Equip ${TOOL_MAP[requiredTool].shortName} [${TOOL_MAP[requiredTool].hotkey}] first!`;
      const [px, py, pz] = HOTSPOT_POSITIONS[hotspot];
      const nextChaos = Math.min(100, state.chaosMeter + (usedTool ? pacing.wrongToolChaos : 4));

      shopAudio.playWrongTool();
      set({
        mechanicPose: 'facepalm',
        poseLockTimer: 1.4,
        activeHotspotFocus: hotspot,
        shopDamageTotal: state.shopDamageTotal + (usedTool ? penalty : 0),
        bayTimer: Math.max(0, state.bayTimer - timerPenalty),
        chaosMeter: nextChaos,
        cameraShake: { intensity: 'small-bump', timeLeft: 0.28, maxTime: 0.28 },
        squashEvent: { id: squashCounter++, type: 'slam' },
        particleBursts: [
          ...state.particleBursts,
          createBurst(
            state.equippedTool === 'brake_cleaner' ? 'oil' : 'spark',
            px,
            py,
            pz,
            18,
          ),
        ],
        ...pushToast(quip, usedTool ? 'comedy' : 'warn'),
      });
      return;
    }

    // Correct hotspot + correct tool!
    if (state.activeHazard === 'BOLT_STRIPPED') {
      if (state.torquePhase === 'extract_heat') {
        shopAudio.playTorchHiss();
        set({
          torqueActive: true,
          holdProgress: 0,
          holdingActive: false,
          mechanicPose: 'wrenching',
          activeHotspotFocus: hotspot,
        });
        return;
      }

      set({
        torqueActive: true,
        torqueNeedle: 12,
        torqueDirection: 1,
        torqueTargetCenter: 42 + Math.random() * 18,
        torqueTargetWidth: 22,
        mechanicPose: 'wrenching',
        activeHotspotFocus: hotspot,
      });
      return;
    }

    if (step.interactionType === 'wiring') {
      set({
        wiringActive: true,
        mechanicPose: 'wrenching',
        activeHotspotFocus: hotspot,
      });
      return;
    }

    if (step.interactionType === 'hold') {
      if (requiredTool === 'propane_torch') {
        shopAudio.playTorchHiss();
      }
      set({
        torqueActive: true,
        torquePhase: 'normal',
        holdProgress: 0,
        holdingActive: false,
        mechanicPose: 'wrenching',
        activeHotspotFocus: hotspot,
        tutorialStep:
          state.tutorialStep === 'open_oil_pan_hold' ? 'complete_hold_bar' : state.tutorialStep,
      });
      return;
    }

    // Standard torque bar step
    set({
      torqueActive: true,
      torquePhase: 'normal',
      torqueNeedle: 10,
      torqueDirection: 1,
      torqueTargetCenter: 26 + Math.random() * 48,
      torqueTargetWidth: step.targetWidth ?? 22,
      mechanicPose: 'wrenching',
      activeHotspotFocus: hotspot,
      tutorialStep:
        state.tutorialStep === 'open_torque_bar' ? 'complete_torque_bar' : state.tutorialStep,
    });
  },

  setHoldingActive: (holding: boolean) => {
    set({ holdingActive: holding });
  },

  cancelActiveOverlay: () => {
    const state = get();
    let nextTutorial = state.tutorialStep;
    if (state.tutorialStep === 'complete_hold_bar') {
      nextTutorial = 'open_oil_pan_hold';
    } else if (state.tutorialStep === 'complete_torque_bar') {
      nextTutorial = 'open_torque_bar';
    }
    set({
      torqueActive: false,
      holdingActive: false,
      wiringActive: false,
      mechanicPose: 'idle',
      tutorialStep: nextTutorial,
    });
  },

  attemptTorqueStop: () => {
    const state = get();
    if (!state.torqueActive || state.phase !== 'playing') return;

    const job = state.shiftJobs[state.currentJobIndex];
    const step = job.steps[state.currentStepIndex];
    if (!step) return;

    const isHoldStep =
      state.torquePhase === 'extract_heat' ||
      (state.activeHazard !== 'BOLT_STRIPPED' && step.interactionType === 'hold');

    if (isHoldStep) {
      // Allow tapping OR holding to build progress
      if (state.equippedTool === 'propane_torch') {
        shopAudio.playTorchHiss();
      } else {
        shopAudio.playOilSpill();
      }
      const nextHold = Math.min(100, state.holdProgress + 24);
      if (nextHold < 100) {
        set({ holdProgress: nextHold });
        return;
      }

      // Hold complete!
      const [px, py, pz] = HOTSPOT_POSITIONS[step.hotspot];
      if (state.torquePhase === 'extract_heat') {
        shopAudio.playTorqueClick();
        set({
          torqueActive: false,
          holdingActive: false,
          holdProgress: 0,
          torquePhase: 'extract_turn',
          mechanicPose: 'idle',
          particleBursts: [...state.particleBursts, createBurst('smoke', px, py, pz, 14)],
          toasts: [
            ...state.toasts.slice(-3),
            {
              id: toastCounter++,
              text: 'Stud is cherry-red! Now equip EZ-Out Extractor [4] & click the hotspot!',
              tone: 'good',
            },
          ],
        });
        return;
      }

      // Normal hold task complete -> advance step
      completeCurrentStep(set, get, 100, 'spark');
      return;
    }

    // Torque timing check
    const halfWidth =
      (state.frenzyActive ? state.torqueTargetWidth * 0.9 : state.torqueTargetWidth) / 2;
    const hit = Math.abs(state.torqueNeedle - state.torqueTargetCenter) <= halfWidth;
    const [px, py, pz] = HOTSPOT_POSITIONS[step.hotspot];

    if (hit) {
      if (state.equippedTool === 'impact_gun') {
        shopAudio.playImpactGun();
      } else {
        shopAudio.playTorqueClick();
      }

      if (state.torquePhase === 'extract_turn') {
        set({
          activeHazard: 'NONE',
          torquePhase: 'normal',
        });
        completeCurrentStep(set, get, 140, 'spark', 'Extracted snapped bolt cleanly!');
      } else {
        completeCurrentStep(set, get, 120, 'spark');
      }
      return;
    }

    // Missed target!
    const pacing = getJobPacing(state.currentJobIndex);
    if (state.torquePhase === 'extract_turn') {
      const extractSlipTimer = Math.max(4, Math.round(pacing.snapTimerPenalty * 0.7));
      const extractSlipDamage = Math.round(pacing.snapDamage * 0.75);
      shopAudio.playBoltSnap();
      set({
        torqueActive: false,
        shopDamageTotal: state.shopDamageTotal + extractSlipDamage,
        bayTimer: Math.max(0, state.bayTimer - extractSlipTimer),
        chaosMeter: Math.min(100, state.chaosMeter + Math.max(8, Math.round(pacing.snapChaos * 0.8))),
        mechanicPose: 'panicked',
        poseLockTimer: 1.5,
        cameraShake: { intensity: 'small-bump', timeLeft: 0.35, maxTime: 0.35 },
        squashEvent: { id: squashCounter++, type: 'slam' },
        particleBursts: [...state.particleBursts, createBurst('spark', px, py, pz, 16)],
        toasts: [
          ...state.toasts.slice(-3),
          {
            id: toastCounter++,
            text: `EZ-Out slipped! Re-hit the target with [4] EZ-Out (+$${extractSlipDamage} damage, -${extractSlipTimer}s)!`,
            tone: 'bad',
          },
        ],
      });
      return;
    }

    // Trigger Cross-Threaded / Snapped Bolt Hazard!
    shopAudio.playBoltSnap();
    const inTraining = isTutorialTraining(state.tutorialStep);
    const extraSnapDamage = inTraining
      ? 0
      : state.frenzyActive
        ? Math.round(pacing.snapDamage * 1.25)
        : pacing.snapDamage;
    const timerPenalty = inTraining ? 0 : pacing.snapTimerPenalty;
    set({
      activeHazard: 'BOLT_STRIPPED',
      torquePhase: 'extract_heat',
      torqueActive: false,
      bayTimer: Math.max(0, state.bayTimer - timerPenalty),
      shopDamageTotal: state.shopDamageTotal + extraSnapDamage,
      chaosMeter: Math.min(100, state.chaosMeter + (inTraining ? 6 : pacing.snapChaos)),
      mechanicPose: 'panicked',
      poseLockTimer: 2.2,
      tutorialStep:
        state.tutorialStep === 'complete_torque_bar'
          ? 'rescue_snapped_bolt'
          : state.tutorialStep,
      cameraShake: { intensity: 'explosion-shake', timeLeft: 0.45, maxTime: 0.45 },
      squashEvent: { id: squashCounter++, type: 'slam' },
      particleBursts: [
        ...state.particleBursts,
        createBurst('spark', px, py, pz, 22),
        createBurst('smoke', px, py, pz, 14),
      ],
      toasts: [
        ...state.toasts.slice(-3),
        {
          id: toastCounter++,
          text: inTraining
            ? 'BOLT SNAPPED! Good practice: heat it with [3] Propane Torch then extract with [4] EZ-Out!'
            : `BOLT SNAPPED! (-${timerPenalty}s, +$${extraSnapDamage}) Heat it with [3] Propane Torch then extract with [4] EZ-Out!`,
          tone: 'bad',
        },
      ],
    });
  },

  resolveWiringSuccess: () => {
    shopAudio.playCashRegister();
    completeCurrentStep(set, get, 160, 'electric', 'Harness spliced & heat-shrunk!');
  },

  failWiring: (reason: string) => {
    const state = get();
    const job = state.shiftJobs[state.currentJobIndex];
    const step = job?.steps[state.currentStepIndex];
    const [px, py, pz] = HOTSPOT_POSITIONS[step?.hotspot ?? 'handlebars'];

    shopAudio.playElectricShort();
    set({
      wiringActive: false,
      activeHazard: 'BREAKER_BLOWN',
      breakerBlown: true,
      mechanicPose: 'electrocuted',
      poseLockTimer: 3.4,
      activeHotspotFocus: 'breaker',
      shopDamageTotal: state.shopDamageTotal + 185,
      bayTimer: Math.max(0, state.bayTimer - 10),
      chaosMeter: Math.min(100, state.chaosMeter + 25),
      cameraShake: { intensity: 'explosion-shake', timeLeft: 0.55, maxTime: 0.55 },
      squashEvent: { id: squashCounter++, type: 'zap' },
      particleBursts: [
        ...state.particleBursts,
        createBurst('electric', px, py, pz, 24),
        createBurst('smoke', px, py, pz, 16),
      ],
      toasts: [
        ...state.toasts.slice(-3),
        {
          id: toastCounter++,
          text: `${reason} Blew the shop breakers! Click the Breaker Box on the back wall!`,
          tone: 'bad',
        },
      ],
    });
  },

  resetBreaker: () => {
    const state = get();
    if (!state.breakerBlown) return;
    shopAudio.playBreakerReset();
    const job = state.shiftJobs[state.currentJobIndex];
    const step = job.steps[state.currentStepIndex];
    set({
      breakerBlown: false,
      activeHazard: 'NONE',
      mechanicPose: 'idle',
      poseLockTimer: 0,
      activeHotspotFocus: step ? step.hotspot : 'engine',
      squashEvent: { id: squashCounter++, type: 'jump' },
      toasts: [
        ...state.toasts.slice(-3),
        {
          id: toastCounter++,
          text: 'Shop lights back on! Finish splicing the harness!',
          tone: 'good',
        },
      ],
    });
  },

  resolveSocketHunt: () => {
    const state = get();
    if (state.activeHazard !== 'MISSING_SOCKET') return;
    const job = state.shiftJobs[state.currentJobIndex];
    const step = job.steps[state.currentStepIndex];
    shopAudio.playTorqueClick();

    set({
      activeHazard: 'NONE',
      flatRateScore: state.flatRateScore + 75,
      mechanicPose: 'celebrate',
      poseLockTimer: 1.0,
      activeHotspotFocus: step ? step.hotspot : 'engine',
      squashEvent: { id: squashCounter++, type: 'jump' },
      toasts: [
        ...state.toasts.slice(-3),
        {
          id: toastCounter++,
          text: 'Recovered the 10mm socket! Guard it with your life (+75 pts).',
          tone: 'good',
        },
      ],
    });
  },

  hitOilSlick: (spillId: number) => {
    const state = get();
    if (state.phase !== 'playing') return;

    if (state.activeHazard === 'MISSING_SOCKET') {
      shopAudio.playOilSpill();
      set({
        bayTimer: Math.max(0, state.bayTimer - 5),
        shopDamageTotal: state.shopDamageTotal + 45,
        chaosMeter: Math.min(100, state.chaosMeter + 10),
        mechanicPose: 'panicked',
        poseLockTimer: 1.2,
        cameraShake: { intensity: 'small-bump', timeLeft: 0.3, maxTime: 0.3 },
        squashEvent: { id: squashCounter++, type: 'slam' },
        toasts: [
          ...state.toasts.slice(-3),
          {
            id: toastCounter++,
            text: 'WHOA! Slipped on waste oil chasing the 10mm (-5s, +$45)!',
            tone: 'bad',
          },
        ],
      });
      return;
    }

    // Wipe up spill with shop rag
    shopAudio.playOilSpill();
    set({
      oilSpills: state.oilSpills.filter((s) => s.id !== spillId),
      chaosMeter: Math.max(0, state.chaosMeter - 5),
      toasts: [
        ...state.toasts.slice(-3),
        {
          id: toastCounter++,
          text: 'Wiped up oil slick with shop rag (-5% Chaos).',
          tone: 'good',
        },
      ],
    });
  },

  dismissBuddy: () => {
    const state = get();
    if (!state.buddy.active) return;
    const wasTutorialBuddy = state.tutorialStep === 'shoo_shop_buddy';
    if (wasTutorialBuddy) {
      markTutorialDoneStorage();
      shopAudio.playCelebrate();
    } else {
      shopAudio.playBuddyBoing();
    }
    set({
      buddy: {
        ...state.buddy,
        active: false,
        pose: 'dismissed',
        patience: 0,
        dismissedCount: state.buddy.dismissedCount + 1,
      },
      tutorialStep: wasTutorialBuddy ? 'graduated' : state.tutorialStep,
      chaosMeter: Math.max(0, state.chaosMeter - 6),
      squashEvent: { id: squashCounter++, type: 'jump' },
      toasts: [
        ...state.toasts.slice(-3),
        {
          id: toastCounter++,
          text: wasTutorialBuddy
            ? 'Orientation complete! Flat-Rate Clock is LIVE — finish Step 3!'
            : 'Shooed shop buddy back to the coffee pot!',
          tone: wasTutorialBuddy ? 'good' : 'comedy',
        },
      ],
    });
  },

  chooseExtraBolt: (choice: 'toss' | 'teardown') => {
    const state = get();
    if (!state.pendingExtraBolt) return;

    if (choice === 'teardown') {
      shopAudio.playTorqueClick();
      set({
        pendingExtraBolt: false,
        totalActualSeconds: state.totalActualSeconds + 15,
        extraBoltOutcome:
          'You tore the fairing back down and installed the mystery 10mm bolt (+15s, $0 comeback).',
        phase: 'shift_complete',
      });
      shopAudio.stopShopRadio();
      return;
    }

    const comeback = Math.random() < 0.5;
    if (comeback) {
      shopAudio.playBoltSnap();
      set({
        pendingExtraBolt: false,
        shopDamageTotal: state.shopDamageTotal + 320,
        extraBoltOutcome:
          'COMEBACK ALERT! That "extra" bolt held the customer’s rear brake caliper bracket! (+$320 comeback penalty)',
        phase: 'shift_complete',
      });
    } else {
      shopAudio.playCashRegister();
      set({
        pendingExtraBolt: false,
        flatRateScore: state.flatRateScore + 200,
        extraBoltOutcome:
          'Weight reduction bro! Bike rolled out clean with zero rattles (+200 bonus pts)!',
        phase: 'shift_complete',
      });
    }
    shopAudio.stopShopRadio();
  },

  returnToClockIn: () => {
    shopAudio.stopShopRadio();
    set({
      phase: 'clock_in',
      torqueActive: false,
      wiringActive: false,
      pendingExtraBolt: false,
    });
  },

  tick: (rawDelta: number) => {
    const delta = Math.min(rawDelta, 0.1);
    const state = get();

    // Update camera shake timer in all phases
    let nextShake = state.cameraShake;
    if (nextShake.timeLeft > 0) {
      const rem = Math.max(0, nextShake.timeLeft - delta);
      nextShake =
        rem === 0
          ? { intensity: 'none', timeLeft: 0, maxTime: nextShake.maxTime }
          : { ...nextShake, timeLeft: rem };
    }

    if (state.phase === 'intro') {
      if (nextShake !== state.cameraShake) {
        set({ cameraShake: nextShake });
      }
      return;
    }

    if (state.phase === 'job_complete') {
      const nextDone = state.jobCompleteTimer - delta;
      if (nextDone <= 0) {
        get().advanceToNextJob();
      } else {
        set({ jobCompleteTimer: nextDone, cameraShake: nextShake });
      }
      return;
    }

    if (state.phase !== 'playing') {
      if (nextShake !== state.cameraShake) {
        set({ cameraShake: nextShake });
      }
      return;
    }

    const job = state.shiftJobs[state.currentJobIndex];
    const pacing = getJobPacing(state.currentJobIndex);
    const step = job?.steps[state.currentStepIndex];
    const inTraining = isTutorialTraining(state.tutorialStep);

    const nextBayTimer = inTraining ? state.bayTimer : Math.max(0, state.bayTimer - delta);
    const nextJobElapsed = inTraining ? state.jobElapsedSeconds : state.jobElapsedSeconds + delta;
    const nextTotalActual = inTraining ? state.totalActualSeconds : state.totalActualSeconds + delta;
    const nextSocketCooldown = Math.max(0, state.socketDropRollCooldown - delta);

    let nextPose = state.mechanicPose;
    const nextPoseLock = Math.max(0, state.poseLockTimer - delta);
    if (nextPoseLock === 0 && !state.torqueActive && !state.wiringActive && !state.breakerBlown) {
      nextPose = 'idle';
    }

    // Chaos & Frenzy
    let nextChaos = state.chaosMeter;
    let nextFrenzy = state.frenzyActive;
    let nextFrenzyTimer = state.frenzyTimer;

    if (state.frenzyActive) {
      nextFrenzyTimer -= delta;
      if (nextFrenzyTimer <= 0) {
        nextFrenzy = false;
        nextFrenzyTimer = 0;
        nextChaos = 35;
      }
    } else if (nextChaos >= 100) {
      nextFrenzy = true;
      nextFrenzyTimer = 8.0;
    } else if (state.buddy.active && !inTraining) {
      nextChaos = Math.min(100, nextChaos + delta * pacing.buddyChaosPerSec);
    }

    // Sync audio tempo & service writer pose
    const targetTempo = nextFrenzy
      ? 1.5
      : nextChaos >= 60
        ? pacing.radioBaseTempo + 0.16
        : pacing.radioBaseTempo;
    shopAudio.setRadioTempo(targetTempo);
    const writerPose: ServiceWriterPose =
      nextChaos >= 50 || state.currentJobIndex >= state.shiftJobs.length - 1 ? 'pacing' : 'calm';

    // Torque needle & Hold progress updates (runs outside React render tree!)
    let nextNeedle = state.torqueNeedle;
    let nextDir = state.torqueDirection;
    let nextHold = state.holdProgress;
    let shouldCompleteHold = false;

    if (state.torqueActive && step) {
      const isHold =
        state.torquePhase === 'extract_heat' ||
        (state.activeHazard !== 'BOLT_STRIPPED' && step.interactionType === 'hold');

      if (isHold) {
        if (state.holdingActive) {
          const duration =
            state.torquePhase === 'extract_heat' ? 1.35 : step.holdDuration ?? 1.3;
          const speedMult = nextFrenzy ? 2.0 : 1.0;
          nextHold = Math.min(100, nextHold + (100 / duration) * delta * speedMult);
          if (nextHold >= 100) {
            shouldCompleteHold = true;
          }
        }
      } else {
        const tutorialSlowdown = state.tutorialStep === 'complete_torque_bar' ? 0.85 : 1.0;
        const extractSlowdown = state.torquePhase === 'extract_turn' ? 0.85 : 1.0;
        const speed =
          pacing.torqueSpeed * (nextFrenzy ? 1.35 : 1.0) * tutorialSlowdown * extractSlowdown;
        nextNeedle += nextDir * speed * delta;
        if (nextNeedle >= 98) {
          nextNeedle = 98;
          nextDir = -1;
        } else if (nextNeedle <= 2) {
          nextNeedle = 2;
          nextDir = 1;
        }
      }
    }

    // Buddy spawn & impatience + toast auto-expiry
    let nextBuddyState = state.buddy;
    let nextBuddyTimer = state.nextBuddyIn;
    let extraToasts: ShopToast[] = state.toasts
      .map((t) => ({ ...t, ttl: (t.ttl ?? 5.0) - delta }))
      .filter((t) => t.ttl > 0);
    let extraSpills = state.oilSpills;
    let extraDamage = state.shopDamageTotal;

    if (!inTraining && !state.buddy.active && !state.wiringActive && !state.torqueActive) {
      nextBuddyTimer -= delta;
      if (nextBuddyTimer <= 0 && job) {
        const line = SHOP_BUDDY_LINES[Math.floor(Math.random() * SHOP_BUDDY_LINES.length)];
        shopAudio.playBuddyBoing();
        nextBuddyState = {
          ...state.buddy,
          active: true,
          pose: Math.random() < 0.35 ? 'borrowing' : 'talking',
          line,
          patience: pacing.buddyPatience,
        };
        nextBuddyTimer = randomBetween(job.buddyIntervalMin, job.buddyIntervalMax);
        extraToasts = [
          ...extraToasts.slice(-3),
          {
            id: toastCounter++,
            text: 'Shop Buddy wandered into the bay! Click him or press [E] to dismiss!',
            tone: 'comedy',
          },
        ];
      }
    } else if (!inTraining && state.buddy.active) {
      const remPatience = state.buddy.patience - delta;
      if (remPatience <= 0) {
        // Knocked over oil pan!
        shopAudio.playOilSpill();
        extraDamage += 60;
        if (extraSpills.length < 4) {
          extraSpills = [
            ...extraSpills,
            {
              id: spillCounter++,
              x: randomBetween(-1.6, 1.6),
              z: randomBetween(1.1, 2.2),
            },
          ];
        }
        nextBuddyState = {
          ...state.buddy,
          active: false,
          pose: 'dismissed',
          patience: 0,
        };
        extraToasts = [
          ...extraToasts.slice(-3),
          {
            id: toastCounter++,
            text: 'Buddy knocked over an oil drain pan (+$60 damage) and wandered off!',
            tone: 'bad',
          },
        ];
      } else {
        nextBuddyState = { ...state.buddy, patience: remPatience };
      }
    }

    set({
      bayTimer: nextBayTimer,
      jobElapsedSeconds: nextJobElapsed,
      totalActualSeconds: nextTotalActual,
      socketDropRollCooldown: nextSocketCooldown,
      mechanicPose: nextPose,
      poseLockTimer: nextPoseLock,
      chaosMeter: nextChaos,
      frenzyActive: nextFrenzy,
      frenzyTimer: nextFrenzyTimer,
      serviceWriterPose: writerPose,
      torqueNeedle: nextNeedle,
      torqueDirection: nextDir,
      holdProgress: nextHold,
      buddy: nextBuddyState,
      nextBuddyIn: nextBuddyTimer,
      oilSpills: extraSpills,
      shopDamageTotal: extraDamage,
      toasts: extraToasts,
      cameraShake: nextShake,
    });

    if (shouldCompleteHold) {
      get().attemptTorqueStop();
    }
  },
}));

function completeCurrentStep(
  set: (partial: Partial<GameState>) => void,
  get: () => GameState,
  bonusPoints: number,
  particleKind: ParticleKind,
  customToast?: string,
) {
  const state = get();
  const job = state.shiftJobs[state.currentJobIndex];
  const step = job.steps[state.currentStepIndex];
  const [px, py, pz] = HOTSPOT_POSITIONS[step.hotspot];
  const nextStepIdx = state.currentStepIndex + 1;

  if (nextStepIdx < job.steps.length) {
    const nextStep = job.steps[nextStepIdx];
    const inTraining = isTutorialTraining(state.tutorialStep);
    let nextTutorial: TutorialStep = state.tutorialStep;
    let nextBuddy = state.buddy;

    if (inTraining && state.currentStepIndex === 0) {
      nextTutorial = 'pick_torque_wrench';
    } else if (
      (state.tutorialStep === 'complete_torque_bar' ||
        state.tutorialStep === 'rescue_snapped_bolt') &&
      state.currentStepIndex === 1
    ) {
      nextTutorial = 'shoo_shop_buddy';
      shopAudio.playBuddyBoing();
      nextBuddy = {
        ...state.buddy,
        active: true,
        pose: 'talking',
        line: 'Hey rookie! Click me or press [E] to shoo me out of your bay!',
        patience: 99,
      };
    }

    set({
      currentStepIndex: nextStepIdx,
      torqueActive: false,
      holdingActive: false,
      holdProgress: 0,
      wiringActive: false,
      activeHazard: 'NONE',
      torquePhase: 'normal',
      flatRateScore: state.flatRateScore + bonusPoints,
      chaosMeter: Math.max(0, state.chaosMeter - 8),
      mechanicPose: 'celebrate',
      poseLockTimer: 0.9,
      activeHotspotFocus: nextStep.hotspot,
      tutorialStep: nextTutorial,
      buddy: nextBuddy,
      squashEvent: { id: squashCounter++, type: 'jump' },
      particleBursts: [...state.particleBursts, createBurst(particleKind, px, py, pz, 18)],
      toasts: [
        ...state.toasts.slice(-3),
        {
          id: toastCounter++,
          text: customToast ?? `Step done: ${step.label}! Next: ${nextStep.label}.`,
          tone: 'good',
        },
      ],
    });
    return;
  }

  // Job finished!
  shopAudio.playCelebrate();
  const isLastJob = state.currentJobIndex >= state.shiftJobs.length - 1;
  const underParBonus = state.bayTimer > 0 ? Math.round(state.bayTimer * 6) : 0;

  set({
    torqueActive: false,
    holdingActive: false,
    holdProgress: 0,
    wiringActive: false,
    activeHazard: 'NONE',
    torquePhase: 'normal',
    tutorialStep: state.tutorialStep === 'graduated' ? 'inactive' : state.tutorialStep,
    billedHoursTotal: Number((state.billedHoursTotal + job.billedHours).toFixed(2)),
    jobsCompleted: state.jobsCompleted + 1,
    flatRateScore: state.flatRateScore + bonusPoints + 250 + underParBonus,
    chaosMeter: Math.max(0, state.chaosMeter - 15),
    mechanicPose: 'celebrate',
    poseLockTimer: 2.0,
    squashEvent: { id: squashCounter++, type: 'jump' },
    particleBursts: [
      ...state.particleBursts,
      createBurst('spark', 0, 1.6, 0, 26),
      createBurst(particleKind, px, py, pz, 18),
    ],
    phase: isLastJob ? 'extra_bolt' : 'job_complete',
    pendingExtraBolt: isLastJob,
    jobCompleteTimer: isLastJob ? 0 : 2.1,
    toasts: [
      ...state.toasts.slice(-3),
      {
        id: toastCounter++,
        text: isLastJob
          ? 'WAIT A SECOND! There is one mystery bolt left in the tray...'
          : `${job.title} FLAGGED (+${job.billedHours.toFixed(1)} billed hrs)!`,
        tone: 'good',
      },
    ],
  });
}

export function computeActualHours(totalActualSeconds: number): number {
  return Math.max(0.1, Number((totalActualSeconds / SECONDS_PER_BILLED_HOUR).toFixed(2)));
}

export function computeEfficiencyRating(billedHours: number, totalActualSeconds: number): number {
  const actual = computeActualHours(totalActualSeconds);
  const raw = (billedHours / actual) * 100;
  return Math.max(0, Math.min(300, Number(raw.toFixed(2))));
}
