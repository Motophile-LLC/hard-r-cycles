'use client';

import { ArrowLeft, Award, Compass, Play, SlidersHorizontal } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { FALLBACK_LEADERBOARD } from '@/data/shiftJobs';
import { useGameStore } from '@/store/useGameStore';
import { useShopStore } from '@/store/useShopStore';
import type { RepairOrderRecord } from '@/types/game';
import { shopAudio } from '@/utils/audio';

const noopSubscribe = () => () => {};
const getDefaultTutorialSnapshot = () =>
  window.localStorage.getItem('hardr_tutorial_done_v1') !== '1';
const getServerTutorialSnapshot = () => true;

export function ClockInModal() {
  const viewMode = useShopStore((s) => s.viewMode);
  const activeBayIndex = useShopStore((s) => s.activeBayIndex);
  const phase = useGameStore((s) => s.phase);
  const defaultTutorial = useSyncExternalStore(
    noopSubscribe,
    getDefaultTutorialSnapshot,
    getServerTutorialSnapshot,
  );
  const [name, setName] = useState('Wrencher');
  const [tutorialOverride, setTutorialOverride] = useState<boolean | null>(null);
  const [sfxVol, setSfxVol] = useState(0.75);
  const [musicVol, setMusicVol] = useState(0.35);
  const [leaders, setLeaders] = useState<RepairOrderRecord[]>(FALLBACK_LEADERBOARD.slice(0, 3));

  const withTutorial = tutorialOverride ?? defaultTutorial;

  useEffect(() => {
    if (viewMode !== 'GAME_BAY' || phase !== 'clock_in') return;
    let active = true;
    fetch('/api/repair-orders')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { records?: RepairOrderRecord[] } | null) => {
        if (active && data?.records && data.records.length > 0) {
          setLeaders(data.records.slice(0, 3));
        }
      })
      .catch(() => {
        // Keep seeded fallback preview
      });
    return () => {
      active = false;
    };
  }, [phase, viewMode]);

  if (viewMode !== 'GAME_BAY' || phase !== 'clock_in') return null;

  const handleClockIn = (e: React.FormEvent) => {
    e.preventDefault();
    shopAudio.setVolumes(sfxVol, musicVol);
    useGameStore.getState().clockIn(name, withTutorial);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-3 backdrop-blur-xs sm:p-4">
      <form
        onSubmit={handleClockIn}
        className="max-h-[94dvh] w-[min(94dvw,640px)] overflow-y-auto rounded-3xl border-4 border-black bg-amber-50 p-4 text-black shadow-[12px_12px_0px_#111] sm:p-6"
      >
        <div className="relative mb-3 h-28 w-full overflow-hidden rounded-2xl border-3 border-black bg-stone-900 shadow-[4px_4px_0px_#000]">
          <Image
            src="/backgrounds/exterior-storefront.jpg"
            alt="Hard R Cycles Storefront"
            fill
            className="object-cover object-[50%_22%]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
          <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between gap-2 text-white">
            <span className="rounded-md border-2 border-black bg-red-600 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider">
              BAY {activeBayIndex} TIMECLOCK
            </span>
            <button
              type="button"
              onClick={() => useShopStore.getState().exitBayToFloor()}
              className="flex cursor-pointer items-center gap-1 rounded-md border-2 border-black bg-amber-300 px-2.5 py-0.5 text-[11px] font-black uppercase text-black shadow-[2px_2px_0px_#000] hover:bg-amber-200"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to Shop Floor
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-b-4 border-black pb-3">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight sm:text-3xl">
              Hard R Cycles: Flat Rate Panic
            </h1>
            <p className="mt-0.5 text-xs font-extrabold uppercase tracking-wide text-zinc-600">
              Starring Dick, The Apprentice &amp; Dyna Bro
            </p>
          </div>
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-3 border-black bg-amber-200 shadow-[3px_3px_0px_#000]">
            <Image
              src="/sprites/portraits/dick-front.png"
              alt="Dick the Shop Mechanic"
              fill
              className="object-contain object-top pt-0.5"
            />
          </div>
        </div>

        <p className="mt-3 text-sm font-bold leading-snug text-zinc-800">
          Knock out 4 escalating motorcycle tickets from Monday morning to Friday&apos;s 4:45 PM waiter.
          Match the right tools <span className="font-black">[1–6]</span>, nail torque specs{' '}
          <span className="font-black">[Space]</span>, survive crossed wires, catch runaway 10mm sockets, and shoo chatty shop buddies <span className="font-black">[E]</span>!
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="mechanic-name-input"
              className="block text-xs font-black uppercase tracking-wider text-zinc-700"
            >
              Mechanic Timecard Name (max 24)
            </label>
            <input
              id="mechanic-name-input"
              type="text"
              maxLength={24}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Big Dale"
              className="mt-1 w-full rounded-xl border-3 border-black bg-white px-3 py-2 text-base font-black text-black shadow-[3px_3px_0px_#000] focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="rounded-xl border-3 border-black bg-white p-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase text-zinc-700">
              <SlidersHorizontal className="h-3.5 w-3.5" /> Audio &amp; Shop Radio
            </div>
            <label className="flex items-center justify-between gap-2 text-xs font-bold">
              <span>SFX</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={sfxVol}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setSfxVol(val);
                  shopAudio.setVolumes(val, musicVol);
                }}
                className="w-32 accent-red-600"
              />
            </label>
            <label className="mt-1 flex items-center justify-between gap-2 text-xs font-bold">
              <span>Radio</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={musicVol}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setMusicVol(val);
                  shopAudio.setVolumes(sfxVol, val);
                }}
                className="w-32 accent-amber-500"
              />
            </label>
          </div>
        </div>

        {/* Top 3 Leaderboard Preview */}
        <div className="mt-4 rounded-2xl border-3 border-black bg-zinc-900 p-3 text-white">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase text-amber-300">
            <Award className="h-4 w-4" /> Shop Top Flagged Mechanics
          </div>
          <div className="grid gap-1.5 text-xs">
            {leaders.map((entry, idx) => (
              <div
                key={entry.id ?? `${entry.mechanic_name}-${idx}`}
                className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5"
              >
                <span className="font-black">
                  #{idx + 1} {entry.mechanic_name}{' '}
                  <span className="font-semibold text-zinc-400">({entry.rank_badge})</span>
                </span>
                <span className="font-black text-emerald-400">
                  {Number(entry.efficiency_rating).toFixed(0)}% • ${Number(entry.shop_damage_cost).toFixed(0)} dmg
                </span>
              </div>
            ))}
          </div>
        </div>

        <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-2xl border-3 border-black bg-sky-100 p-3 shadow-[3px_3px_0px_#000]">
          <input
            type="checkbox"
            checked={withTutorial}
            onChange={(e) => setTutorialOverride(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-sky-600"
          />
          <div className="text-xs leading-snug">
            <span className="flex items-center gap-1 font-black uppercase text-black">
              <Compass className="h-3.5 w-3.5 text-sky-700" />
              Guided First-Shift Walkthrough (Recommended for New Mechanics)
            </span>
            <span className="mt-0.5 block font-bold text-zinc-700">
              Clock stays paused on Bike 1 while the Foreman walks you through each step.
            </span>
          </div>
        </label>

        <button
          type="submit"
          className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-4 border-black bg-emerald-400 py-3 text-lg font-black uppercase tracking-wide text-black shadow-[6px_6px_0px_#000] transition-transform hover:-translate-y-0.5 hover:bg-emerald-300 active:translate-y-0"
        >
          <Play className="h-5 w-5 fill-black" />
          PUNCH IN — START SHIFT
        </button>
      </form>
    </div>
  );
}
