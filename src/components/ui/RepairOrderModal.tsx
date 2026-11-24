'use client';

import { ArrowLeft, Award, CheckCircle2, Copy, Gift, RotateCcw, ShoppingCart, Trophy } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { computeRankBadge, FALLBACK_LEADERBOARD } from '@/data/shiftJobs';
import {
  computeActualHours,
  computeEfficiencyRating,
  useGameStore,
} from '@/store/useGameStore';
import { useShopStore } from '@/store/useShopStore';
import type { RepairOrderRecord } from '@/types/game';
import type { UnlockedReward } from '@/types/shop';

const LOCAL_STORAGE_KEY = 'hardr_repair_orders_v1';

function readLocalScores(): RepairOrderRecord[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RepairOrderRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalScore(entry: RepairOrderRecord): void {
  try {
    const existing = readLocalScores();
    const merged = [entry, ...existing].slice(0, 20);
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // Ignore storage quota errors
  }
}

export function RepairOrderModal() {
  const viewMode = useShopStore((s) => s.viewMode);
  const phase = useGameStore((s) => s.phase);
  const mechanicName = useGameStore((s) => s.mechanicName);
  const billedHoursTotal = useGameStore((s) => s.billedHoursTotal);
  const totalActualSeconds = useGameStore((s) => s.totalActualSeconds);
  const shopDamageTotal = useGameStore((s) => s.shopDamageTotal);
  const flatRateScore = useGameStore((s) => s.flatRateScore);
  const jobsCompleted = useGameStore((s) => s.jobsCompleted);
  const extraBoltOutcome = useGameStore((s) => s.extraBoltOutcome);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const submittedForShiftRef = useRef(false);

  const [tab, setTab] = useState<'ticket' | 'leaderboard'>('ticket');
  const [submitting, setSubmitting] = useState(false);
  const [submitSource, setSubmitSource] = useState<'supabase' | 'local' | null>(null);
  const [savedOrderId, setSavedOrderId] = useState<string | null>(null);
  const [claimingReward, setClaimingReward] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimedReward, setClaimedReward] = useState<UnlockedReward | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [leaderboard, setLeaderboard] = useState<RepairOrderRecord[]>(FALLBACK_LEADERBOARD);

  const isOpen = viewMode === 'GAME_BAY' && phase === 'shift_complete';

  const actualHours = computeActualHours(totalActualSeconds);
  const efficiency = computeEfficiencyRating(billedHoursTotal || 1, totalActualSeconds);
  const rankBadge = computeRankBadge(efficiency, shopDamageTotal);
  const earnedDiscount =
    jobsCompleted < 1
      ? 0
      : efficiency >= 130
        ? 15
        : efficiency >= 110
          ? 10
          : efficiency >= 90
            ? 5
            : 0;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
      submittedForShiftRef.current = false;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || submittedForShiftRef.current) return;
    submittedForShiftRef.current = true;
    setTab('ticket');

    const payload: RepairOrderRecord = {
      mechanic_name: mechanicName,
      billed_hours: billedHoursTotal || 1,
      actual_hours: actualHours,
      efficiency_rating: efficiency,
      shop_damage_cost: shopDamageTotal,
      rank_badge: rankBadge.title,
      jobs_completed: jobsCompleted,
    };

    const submitAndLoad = async () => {
      setSubmitting(true);
      setClaimError(null);
      setClaimedReward(null);
      setCopiedCode(false);
      try {
        const token = useShopStore.getState().authAccessToken;
        const postRes = await fetch('/api/repair-orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });
        const postJson = (await postRes.json()) as {
          source?: 'supabase' | 'local';
          record?: RepairOrderRecord;
        };
        if (postJson.source === 'local' && postJson.record) {
          saveLocalScore(postJson.record);
        }
        setSavedOrderId(
          postJson.source === 'supabase' && postJson.record?.id
            ? String(postJson.record.id)
            : null,
        );
        setSubmitSource(postJson.source ?? 'local');
      } catch {
        saveLocalScore({ ...payload, id: `local-${Date.now()}` });
        setSavedOrderId(null);
        setSubmitSource('local');
      }

      try {
        const getRes = await fetch('/api/repair-orders');
        const getJson = (await getRes.json()) as {
          source?: 'supabase' | 'local';
          records?: RepairOrderRecord[];
        };
        const remote = getJson.records ?? [];
        const combined =
          getJson.source === 'supabase'
            ? remote
            : [...readLocalScores(), ...remote].sort(
                (a, b) =>
                  b.efficiency_rating - a.efficiency_rating ||
                  a.shop_damage_cost - b.shop_damage_cost,
              );
        setLeaderboard(combined.slice(0, 15));
      } catch {
        setLeaderboard([...readLocalScores(), ...FALLBACK_LEADERBOARD].slice(0, 15));
      } finally {
        setSubmitting(false);
      }
    };

    void submitAndLoad();
  }, [
    isOpen,
    mechanicName,
    billedHoursTotal,
    actualHours,
    efficiency,
    shopDamageTotal,
    rankBadge.title,
    jobsCompleted,
  ]);

  const handleClaimReward = async () => {
    if (!savedOrderId || claimingReward) return;
    setClaimingReward(true);
    setClaimError(null);
    try {
      const token = useShopStore.getState().authAccessToken;
      const res = await fetch('/api/rewards/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ repairOrderId: savedOrderId }),
      });
      const json = (await res.json()) as {
        claim?: {
          id: string;
          repair_order_id: string;
          promo_code: string;
          discount_percent: number;
          redeemed: boolean;
          created_at: string;
        };
        tierLabel?: string;
        error?: string;
      };
      if (!res.ok || !json.claim) {
        setClaimError(json.error ?? 'Could not issue shop discount code right now.');
        return;
      }
      const reward: UnlockedReward = {
        id: json.claim.id,
        repairOrderId: json.claim.repair_order_id,
        promoCode: json.claim.promo_code,
        discountPercent: json.claim.discount_percent,
        tierLabel: json.tierLabel ?? `${json.claim.discount_percent}% OFF Shop Reward`,
        redeemed: Boolean(json.claim.redeemed),
        createdAt: json.claim.created_at,
      };
      useShopStore.getState().addUnlockedReward(reward);
      setClaimedReward(reward);
    } catch {
      setClaimError('Network error while claiming your shop discount code.');
    } finally {
      setClaimingReward(false);
    }
  };

  const handleCopyAndOpenCart = () => {
    if (claimedReward && typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(claimedReward.promoCode).catch(() => {});
      setCopiedCode(true);
    }
    dialogRef.current?.close();
    useGameStore.getState().returnToClockIn();
    useShopStore.getState().exitBayToFloor();
    useShopStore.getState().setOpenDrawer('CART');
  };

  const handleReplay = () => {
    dialogRef.current?.close();
    useGameStore.getState().returnToClockIn();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="repair-order-title"
      onClose={(e) => {
        e.currentTarget.returnValue = '';
        if (useGameStore.getState().phase === 'shift_complete') {
          useGameStore.getState().returnToClockIn();
        }
      }}
      className="m-auto max-h-[92dvh] w-[min(94dvw,640px)] overflow-y-auto rounded-3xl border-4 border-black bg-amber-50 p-4 text-black shadow-[12px_12px_0px_#111] sm:p-6"
    >
      {/* Service Counter Banner */}
      <div className="relative mb-3 h-20 w-full overflow-hidden rounded-2xl border-3 border-black bg-stone-900 shadow-[4px_4px_0px_#000]">
        <Image
          src="/backgrounds/service-counter.jpg"
          alt="Hard R Cycles Service Counter"
          fill
          className="object-cover object-[50%_20%]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
        <span className="absolute bottom-2 left-3 rounded-md border-2 border-black bg-amber-300 px-2 py-0.5 text-[10px] font-black uppercase text-black">
          CASH ONLY • NO REFUNDS
        </span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-4 border-black pb-3">
        <div className="flex items-center gap-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-3 border-black bg-amber-200">
            <Image
              src={
                shopDamageTotal >= 250
                  ? '/sprites/portraits/dick-wtf.png'
                  : '/sprites/portraits/dick-front.png'
              }
              alt="Dick Reaction"
              fill
              className="object-contain object-top"
            />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-zinc-600">
              HARD R CYCLES • REPAIR ORDER SCORECARD
            </p>
            <h2 id="repair-order-title" className="text-2xl font-black uppercase">
              Shift Complete — {mechanicName}
            </h2>
          </div>
        </div>

        <span
          className="-rotate-3 rounded-xl border-3 border-black px-3 py-1 text-xs font-black uppercase text-white shadow-[3px_3px_0px_#000]"
          style={{ backgroundColor: rankBadge.accentColor }}
        >
          {rankBadge.stamp}
        </span>
      </div>

      {/* Tabs */}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setTab('ticket')}
          className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border-3 border-black py-2 text-xs font-black uppercase ${
            tab === 'ticket' ? 'bg-amber-300 shadow-[3px_3px_0px_#000]' : 'bg-white'
          }`}
        >
          <Award className="h-4 w-4" /> Repair Order Ticket
        </button>
        <button
          type="button"
          onClick={() => setTab('leaderboard')}
          className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border-3 border-black py-2 text-xs font-black uppercase ${
            tab === 'leaderboard' ? 'bg-amber-300 shadow-[3px_3px_0px_#000]' : 'bg-white'
          }`}
        >
          <Trophy className="h-4 w-4" /> Shop Leaderboard
        </button>
      </div>

      {tab === 'ticket' ? (
        <div className="mt-4 space-y-3">
          {/* Mechanic Rank Badge */}
          <div className="rounded-2xl border-3 border-black bg-white p-4 shadow-[4px_4px_0px_#000]">
            <p className="text-[11px] font-black uppercase text-zinc-500">
              MECHANIC RANK EARNED
            </p>
            <h3 className="text-xl font-black" style={{ color: rankBadge.accentColor }}>
              {rankBadge.title}
            </h3>
            <p className="mt-0.5 text-sm font-bold text-zinc-700">{rankBadge.subtitle}</p>
          </div>

          {extraBoltOutcome ? (
            <div className="rounded-xl border-3 border-black bg-amber-200 px-3.5 py-2 text-xs font-black text-black">
              {extraBoltOutcome}
            </div>
          ) : null}

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div className="rounded-xl border-3 border-black bg-white p-3">
              <p className="text-[10px] font-black uppercase text-zinc-500">Billed Hours</p>
              <p className="text-xl font-black">{billedHoursTotal.toFixed(2)}h</p>
            </div>
            <div className="rounded-xl border-3 border-black bg-white p-3">
              <p className="text-[10px] font-black uppercase text-zinc-500">Actual Hours</p>
              <p className="text-xl font-black">{actualHours.toFixed(2)}h</p>
            </div>
            <div className="rounded-xl border-3 border-black bg-emerald-100 p-3">
              <p className="text-[10px] font-black uppercase text-emerald-800">Efficiency</p>
              <p className="text-xl font-black text-emerald-800">{efficiency.toFixed(1)}%</p>
            </div>
            <div className="rounded-xl border-3 border-black bg-red-100 p-3">
              <p className="text-[10px] font-black uppercase text-red-800">Shop Damage</p>
              <p className="text-xl font-black text-red-700">${shopDamageTotal.toFixed(0)}</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border-2 border-black bg-zinc-900 px-3.5 py-2 text-xs font-bold text-white">
            <span>Arcade Score: {flatRateScore} pts</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              {submitting
                ? 'Filing RO...'
                : submitSource === 'supabase'
                  ? 'Saved to Supabase Leaderboard'
                  : 'Saved to Local Shop Clipboard'}
            </span>
          </div>

          {/* Flat Rate Panic Shop Discount Reward */}
          <div className="rounded-2xl border-3 border-black bg-amber-100 p-3.5 shadow-[4px_4px_0px_#000]">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-red-700" aria-hidden="true" />
              <p className="text-xs font-black uppercase text-black">
                Hard R Originals Shop Reward
              </p>
            </div>

            {earnedDiscount === 0 ? (
              <p className="mt-1 text-xs font-bold text-zinc-700">
                Finish with 90%+ flat-rate efficiency on at least 1 repair job next shift to earn a 5%–15% Hard R Originals promo code!
              </p>
            ) : claimedReward ? (
              <div className="mt-2 space-y-2">
                <p className="text-xs font-black text-emerald-800">
                  Unlocked {claimedReward.discountPercent}% OFF Code ({claimedReward.tierLabel}):
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <code className="rounded-xl border-2 border-black bg-white px-3 py-1.5 text-sm font-black tracking-wide text-black">
                    {claimedReward.promoCode}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyAndOpenCart}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border-2 border-black bg-emerald-400 px-3 py-1.5 text-xs font-black uppercase text-black shadow-[2px_2px_0px_#000] hover:bg-emerald-300"
                  >
                    {copiedCode ? (
                      <>
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                        Copied &amp; Opening Cart
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
                        Use in Shop Cart →
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                <p className="text-xs font-bold text-zinc-800">
                  Your {efficiency.toFixed(1)}% shift qualifies for a{' '}
                  <span className="font-black text-red-700">{earnedDiscount}% OFF</span>{' '}
                  single-use shop code!
                </p>
                {savedOrderId ? (
                  <button
                    type="button"
                    disabled={claimingReward}
                    onClick={handleClaimReward}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border-2 border-black bg-amber-300 px-3.5 py-2 text-xs font-black uppercase text-black shadow-[3px_3px_0px_#000] hover:bg-amber-200 disabled:opacity-50"
                  >
                    <Gift className="h-4 w-4" aria-hidden="true" />
                    {claimingReward
                      ? 'Generating Verified Code...'
                      : `Claim ${earnedDiscount}% Off Shop Code`}
                  </button>
                ) : (
                  <p className="text-[11px] font-bold text-zinc-600">
                    {submitting
                      ? 'Verifying shift record on Supabase...'
                      : 'Verified promo codes require Supabase recording on shift finish.'}
                  </p>
                )}
              </div>
            )}

            {claimError ? (
              <p role="alert" className="mt-2 text-xs font-bold text-red-700">
                {claimError}
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <div
          tabIndex={0}
          role="region"
          aria-label="Shop Leaderboard"
          className="mt-4 overflow-x-auto rounded-2xl border-3 border-black bg-white"
        >
          <table className="w-full min-w-[440px] border-collapse text-left text-xs">
            <thead className="border-b-3 border-black bg-zinc-900 text-amber-300">
              <tr>
                <th className="px-3 py-2 font-black">#</th>
                <th className="px-3 py-2 font-black">Mechanic</th>
                <th className="px-3 py-2 font-black">Badge</th>
                <th className="px-3 py-2 font-black text-right">Eff %</th>
                <th className="px-3 py-2 font-black text-right">Dmg</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row, i) => (
                <tr
                  key={row.id ?? `${row.mechanic_name}-${i}`}
                  className="border-b border-zinc-200 font-bold last:border-b-0"
                >
                  <td className="px-3 py-2 font-black">{i + 1}</td>
                  <td className="px-3 py-2 font-black">{row.mechanic_name}</td>
                  <td className="px-3 py-2 text-zinc-600">{row.rank_badge}</td>
                  <td className="px-3 py-2 text-right font-black text-emerald-700">
                    {Number(row.efficiency_rating).toFixed(1)}%
                  </td>
                  <td className="px-3 py-2 text-right font-black text-red-700">
                    ${Number(row.shop_damage_cost).toFixed(0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
        <button
          type="button"
          onClick={() => {
            dialogRef.current?.close();
            useGameStore.getState().returnToClockIn();
            useShopStore.getState().exitBayToFloor();
          }}
          className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-4 border-black bg-white px-5 py-3 text-sm font-black uppercase text-black shadow-[5px_5px_0px_#000] hover:bg-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Shop Floor
        </button>
        <button
          type="button"
          autoFocus
          onClick={handleReplay}
          className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl border-4 border-black bg-amber-300 py-3 text-base font-black uppercase text-black shadow-[5px_5px_0px_#000] hover:bg-amber-200"
        >
          <RotateCcw className="h-5 w-5" aria-hidden="true" />
          CLOCK BACK IN FOR NEXT SHIFT
        </button>
      </div>
    </dialog>
  );
}
