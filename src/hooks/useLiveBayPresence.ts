'use client';

import { useCallback, useEffect, useRef } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useGameStore } from '@/store/useGameStore';
import { useShopStore } from '@/store/useShopStore';
import type { BayActivityState, LiveBayOccupant } from '@/types/shop';

interface PresencePayload {
  role: 'player' | 'observer';
  bayIndex: 1 | 2 | 3;
  playerName: string;
  bikeSprite: 'track-bagger' | 'bigwheel-bagger' | 'club-dyna';
  activity: BayActivityState;
  statusText: string;
  updatedAt: number;
}

const NPC_PRESETS: LiveBayOccupant[] = [
  {
    bayIndex: 1,
    isRealPlayer: false,
    playerName: 'NPC: Big Dale',
    bikeSprite: 'track-bagger',
    activity: 'WRENCHING',
    statusText: 'Track Bagger • Torque Spec',
    updatedAt: 0,
  },
  {
    bayIndex: 2,
    isRealPlayer: false,
    playerName: 'NPC: 10mm Johnny',
    bikeSprite: 'bigwheel-bagger',
    activity: 'SPARKS',
    statusText: 'Big-Wheel • Wiring Harness',
    updatedAt: 0,
  },
  {
    bayIndex: 3,
    isRealPlayer: false,
    playerName: 'OPEN BAY',
    bikeSprite: 'club-dyna',
    activity: 'IDLE',
    statusText: 'Click lift to clock in!',
    updatedAt: 0,
  },
];

const NPC_ACTIVITIES: { activity: BayActivityState; status: string }[] = [
  { activity: 'WRENCHING', status: 'Wrenching on V-Twin' },
  { activity: 'SPARKS', status: 'Chasing wiring short' },
  { activity: 'CHAOS_SMOKE', status: 'Torching seized stud' },
  { activity: 'JOB_DONE', status: 'Flagged flat-rate hrs!' },
];

export function useLiveBayPresence() {
  const viewMode = useShopStore((s) => s.viewMode);
  const activeBayIndex = useShopStore((s) => s.activeBayIndex);

  const phase = useGameStore((s) => s.phase);
  const mechanicName = useGameStore((s) => s.mechanicName);
  const currentJobIndex = useGameStore((s) => s.currentJobIndex);
  const shiftJobs = useGameStore((s) => s.shiftJobs);
  const activeHazard = useGameStore((s) => s.activeHazard);
  const breakerBlown = useGameStore((s) => s.breakerBlown);
  const torqueActive = useGameStore((s) => s.torqueActive);
  const wiringActive = useGameStore((s) => s.wiringActive);

  const channelRef = useRef<ReturnType<NonNullable<ReturnType<typeof getSupabaseClient>>['channel']> | null>(null);
  const sessionKeyRef = useRef('');
  const remotePlayersRef = useRef<PresencePayload[]>([]);
  const npcCycleRef = useRef(0);

  // Sync merged bay array (real players first, NPC fill on empty bays)
  const rebuildLiveBays = useCallback(() => {
    const remotes = remotePlayersRef.current;
    const bays: [LiveBayOccupant, LiveBayOccupant, LiveBayOccupant] = [
      {
        ...NPC_PRESETS[0],
        activity: NPC_ACTIVITIES[npcCycleRef.current % NPC_ACTIVITIES.length].activity,
        statusText: NPC_ACTIVITIES[npcCycleRef.current % NPC_ACTIVITIES.length].status,
      },
      {
        ...NPC_PRESETS[1],
        activity: NPC_ACTIVITIES[(npcCycleRef.current + 1) % NPC_ACTIVITIES.length].activity,
        statusText: NPC_ACTIVITIES[(npcCycleRef.current + 1) % NPC_ACTIVITIES.length].status,
      },
      { ...NPC_PRESETS[2] },
    ];

    const occupied = new Set<number>();
    const overflow: PresencePayload[] = [];

    for (const p of remotes) {
      if (!occupied.has(p.bayIndex)) {
        occupied.add(p.bayIndex);
        bays[p.bayIndex - 1] = {
          bayIndex: p.bayIndex,
          isRealPlayer: true,
          playerName: p.playerName,
          bikeSprite: p.bikeSprite,
          activity: p.activity,
          statusText: p.statusText,
          updatedAt: p.updatedAt,
        };
      } else {
        overflow.push(p);
      }
    }

    for (const p of overflow) {
      const openIdx = ([1, 2, 3] as const).find((idx) => !occupied.has(idx));
      if (!openIdx) break;
      occupied.add(openIdx);
      bays[openIdx - 1] = {
        bayIndex: openIdx,
        isRealPlayer: true,
        playerName: p.playerName,
        bikeSprite: p.bikeSprite,
        activity: p.activity,
        statusText: p.statusText,
        updatedAt: p.updatedAt,
      };
    }

    useShopStore.getState().setLiveBays(bays, remotes.length);
  }, []);

  // Ambient NPC rotation when on Shop Floor so lifts feel alive even at 2 AM
  useEffect(() => {
    const interval = window.setInterval(() => {
      npcCycleRef.current = (npcCycleRef.current + 1) % NPC_ACTIVITIES.length;
      if (useShopStore.getState().viewMode === 'FLOOR') {
        rebuildLiveBays();
      }
    }, 4500);
    return () => window.clearInterval(interval);
  }, [rebuildLiveBays]);

  // Connect to Supabase Realtime Presence channel
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      rebuildLiveBays();
      return;
    }

    if (!sessionKeyRef.current) {
      sessionKeyRef.current = `tech-${Math.random().toString(36).slice(2, 10)}`;
    }

    const channel = supabase.channel('hardr-service-bays', {
      config: { presence: { key: sessionKeyRef.current } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresencePayload>();
        const active: PresencePayload[] = [];
        for (const entries of Object.values(state)) {
          for (const entry of entries) {
            if (entry && entry.role === 'player') {
              active.push(entry);
            }
          }
        }
        remotePlayersRef.current = active;
        rebuildLiveBays();
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            role: 'observer',
            bayIndex: 1,
            playerName: '',
            bikeSprite: 'track-bagger',
            activity: 'IDLE',
            statusText: 'Browsing Floor',
            updatedAt: Date.now(),
          } satisfies PresencePayload);
        }
      });

    channelRef.current = channel;

    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [rebuildLiveBays]);

  // Push throttled presence state when playing inside a Service Bay
  useEffect(() => {
    const channel = channelRef.current;
    if (!channel) return;

    if (viewMode !== 'GAME_BAY') {
      void channel.track({
        role: 'observer',
        bayIndex: activeBayIndex,
        playerName: '',
        bikeSprite: 'track-bagger',
        activity: 'IDLE',
        statusText: 'Browsing Floor',
        updatedAt: Date.now(),
      } satisfies PresencePayload);
      return;
    }

    const currentJob = shiftJobs[currentJobIndex] ?? shiftJobs[0];
    let activity: BayActivityState = 'WRENCHING';
    let statusText = currentJob?.bikeName ?? 'On the lift';

    if (phase === 'clock_in') {
      activity = 'IDLE';
      statusText = 'Clocking in...';
    } else if (breakerBlown || activeHazard === 'BREAKER_BLOWN') {
      activity = 'BREAKER_BLOWN';
      statusText = 'Breaker blown!';
    } else if (wiringActive) {
      activity = 'SPARKS';
      statusText = 'Tracing wiring short';
    } else if (activeHazard === 'BOLT_STRIPPED') {
      activity = 'CHAOS_SMOKE';
      statusText = 'Snapped bolt rescue!';
    } else if (phase === 'job_complete' || phase === 'shift_complete') {
      activity = 'JOB_DONE';
      statusText = 'Repair ticket flagged!';
    } else if (torqueActive) {
      activity = 'WRENCHING';
      statusText = currentJob?.title ?? 'Torquing to spec';
    }

    const timer = window.setTimeout(() => {
      void channel.track({
        role: 'player',
        bayIndex: activeBayIndex,
        playerName: mechanicName || 'Wrencher',
        bikeSprite: currentJob?.bikeSprite ?? 'track-bagger',
        activity,
        statusText,
        updatedAt: Date.now(),
      } satisfies PresencePayload);
    }, 180);

    return () => window.clearTimeout(timer);
  }, [
    viewMode,
    activeBayIndex,
    phase,
    mechanicName,
    currentJobIndex,
    shiftJobs,
    activeHazard,
    breakerBlown,
    torqueActive,
    wiringActive,
  ]);
}
