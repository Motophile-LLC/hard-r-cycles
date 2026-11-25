'use client';

import {
  AlertTriangle,
  Bike,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  MessageSquare,
  Search,
  Share2,
  Wrench,
  X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  SYMPTOM_OPTIONS,
  type DiagnosticSymptomCategory,
  type DiagnosticTriageResult,
} from '@/features/diagnostics/types';
import { FLAT_RATE_MASTER_REF_CODE, trackShopEvent } from '@/lib/analytics';
import { getStaffGreeting } from '@/data/staffDialogue';
import { resolveCustomerMemoryState } from '@/features/npc-memory/resolver';
import { useShopStore } from '@/store/useShopStore';
import type { CustomerMemoryRecord, GarageBike } from '@/types/shop';
import { withSpriteVersion } from '@/utils/spriteVersion';

type LookupMode = 'vin' | 'manual';

export function ServiceCounterModal() {
  const openDrawer = useShopStore((s) => s.openDrawer);
  const authAccessToken = useShopStore((s) => s.authAccessToken);
  const userProfile = useShopStore((s) => s.userProfile);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const hasInteractedRef = useRef(false);

  const isOpen = openDrawer === 'SERVICE_COUNTER';
  const garageBikes = userProfile?.garage_bikes ?? [];

  const [mode, setMode] = useState<LookupMode>('vin');
  const [vin, setVin] = useState('');
  const [year, setYear] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [symptomCategory, setSymptomCategory] =
    useState<DiagnosticSymptomCategory>('no_start');
  const [symptomText, setSymptomText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [triage, setTriage] = useState<DiagnosticTriageResult | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Pre-fill from primary garage bike on open without synchronous setState in effect
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    Promise.resolve().then(() => {
      if (cancelled || hasInteractedRef.current) return;
      const primary = useShopStore.getState().userProfile?.garage_bikes?.[0];
      if (!primary) return;

      const cleanVin = (primary.vin ?? '').trim().toUpperCase();
      setVin((prev) => prev || cleanVin);
      setYear((prev) => prev || primary.year || '');
      setMake((prev) => prev || primary.make || '');
      setModel((prev) => prev || primary.model || '');
      if (cleanVin.length === 17) {
        setMode('vin');
      } else if (primary.make || primary.model) {
        setMode('manual');
      }
      hasInteractedRef.current = true;
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Safari fallback for closedby="any" light dismiss
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || 'closedBy' in HTMLDialogElement.prototype) return;

    let pressedOutside = false;
    const isOutside = (e: PointerEvent) => {
      if (useShopStore.getState().activeRoastCard) return false;
      const card = dialog.querySelector('[data-counter-card="true"]');
      if (!card) return false;
      const r = card.getBoundingClientRect();
      return (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      );
    };

    const onDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    };
    const onUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e)) {
        dialog.close();
      }
    };

    dialog.addEventListener('pointerdown', onDown);
    dialog.addEventListener('pointerup', onUp);
    return () => {
      dialog.removeEventListener('pointerdown', onDown);
      dialog.removeEventListener('pointerup', onUp);
    };
  }, []);

  const handleClose = () => {
    hasInteractedRef.current = false;
    useShopStore.getState().setOpenDrawer(null);
  };

  const applyGarageBike = (bike: GarageBike) => {
    hasInteractedRef.current = true;
    const cleanVin = (bike.vin ?? '').trim().toUpperCase();
    setVin(cleanVin);
    setYear(bike.year ?? '');
    setMake(bike.make ?? '');
    setModel(bike.model ?? '');
    setMode(cleanVin.length === 17 ? 'vin' : 'manual');
    setErrorMessage(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    hasInteractedRef.current = true;
    setErrorMessage(null);
    setSubmitting(true);

    try {
      const payload =
        mode === 'vin'
          ? {
              mode: 'vin',
              vin: vin.trim(),
              symptomCategory,
              symptomText: symptomText.trim(),
              saveToGarage: true,
            }
          : {
              mode: 'manual',
              year: year.trim(),
              make: make.trim(),
              model: model.trim(),
              vin: vin.trim(),
              symptomCategory,
              symptomText: symptomText.trim(),
              saveToGarage: true,
            };

      const res = await fetch('/api/diagnostics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authAccessToken ? { Authorization: `Bearer ${authAccessToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const json = (await res.json()) as {
        triage?: DiagnosticTriageResult;
        customerMemory?: CustomerMemoryRecord | null;
        garageBikes?: GarageBike[] | null;
        error?: string;
        fallbackToManual?: boolean;
      };

      if (!res.ok || !json.triage) {
        if (json.fallbackToManual) {
          setMode('manual');
        }
        setErrorMessage(
          json.error ?? 'Unable to decode that bike right now. Try Year / Make / Model.',
        );
        return;
      }

      const store = useShopStore.getState();
      if (json.customerMemory) {
        store.setCustomerMemory(json.customerMemory);
      }
      if (Array.isArray(json.garageBikes)) {
        store.updateGarageBikes(json.garageBikes);
      }

      setTriage(json.triage);

      trackShopEvent(
        'diagnostic_decode',
        {
          mode,
          make: json.triage.vehicle.make || null,
          symptomCategory: json.triage.symptomCategory,
          signedIn: Boolean(authAccessToken),
          source: json.triage.vehicle.source,
        },
        authAccessToken,
      );
    } catch {
      setErrorMessage('Network error reaching the Service Counter. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleShareRoastCard = () => {
    if (!triage) return;
    useShopStore.getState().setActiveRoastCard({
      staffId: 'dick',
      speakerName: 'Dick',
      speakerRole: 'Owner & Master Mechanic',
      portraitSrc: triage.dickMoodPortrait,
      moodLabel: triage.dickMoodLabel,
      tierBadge: triage.diagnosticCount
        ? `Diag #${triage.diagnosticCount}`
        : '$100/HR Counter',
      promptHeading: 'Bike & Symptom On Lift',
      promptText: `${triage.vehicle.displayName} — ${triage.symptomSummary}`,
      roastText: triage.dickRoast,
      footerNote: triage.estimatedBayComplexity,
      source: 'diagnostics',
    });
  };

  const activeSymptomMeta =
    SYMPTOM_OPTIONS.find((opt) => opt.id === symptomCategory) ?? SYMPTOM_OPTIONS[0];

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby="service-counter-title"
      onClose={(e) => {
        e.currentTarget.returnValue = '';
        hasInteractedRef.current = false;
        if (useShopStore.getState().openDrawer === 'SERVICE_COUNTER') {
          useShopStore.getState().setOpenDrawer(null);
        }
      }}
      className="m-auto max-h-[92dvh] w-[min(95dvw,640px)] overflow-y-auto border-0 bg-transparent p-0 text-black"
    >
      <div
        data-counter-card="true"
        className="rounded-3xl border-4 border-black bg-amber-50 p-4 shadow-[12px_12px_0px_#000] sm:p-5"
      >
        <div className="flex items-start justify-between gap-3 border-b-4 border-black pb-3">
          <div className="flex items-center gap-3">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border-3 border-black bg-amber-200">
              <Image
                src={withSpriteVersion('/sprites/portraits/dick-glaring.png')}
                alt="Dick at the Service Counter"
                fill
                className="object-contain object-top"
              />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-red-700">
                CASH ONLY • NO REFUNDS
              </p>
              <h1 id="service-counter-title" className="text-xl font-black uppercase leading-tight sm:text-2xl">
                Service Counter &amp; VIN Diag
              </h1>
            </div>
          </div>

          <button
            type="button"
            autoFocus
            onClick={handleClose}
            aria-label="Close service counter"
            className="flex cursor-pointer items-center justify-center rounded-xl border-2 border-black bg-white p-2 hover:bg-zinc-200"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Labor Rate Gag Sign */}
        <div className="mt-3 rounded-2xl border-3 border-black bg-zinc-900 p-3 text-center text-white shadow-[4px_4px_0px_#000]">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-300">
            POSTED SHOP LABOR RATE
          </p>
          <p className="mt-0.5 text-lg font-black uppercase sm:text-xl">
            $100 / HR — $200 IF YOU WATCH
          </p>
          <p className="mt-0.5 text-[11px] font-bold text-zinc-400">
            $300 / HR if you already tried fixing it after watching a TikTok video.
          </p>
        </div>

        {/* Live Option B VIN Diagnostic Counter */}
        <div className="mt-3 rounded-2xl border-3 border-black bg-white p-3.5 shadow-[4px_4px_0px_#000] sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase text-sky-900">
              <ClipboardList className="h-4 w-4" aria-hidden="true" />
              VIN Diagnostic Counter (Free NHTSA Decode)
            </div>

            <div className="inline-flex rounded-xl border-2 border-black bg-zinc-100 p-0.5">
              <button
                type="button"
                onClick={() => {
                  hasInteractedRef.current = true;
                  setMode('vin');
                  setErrorMessage(null);
                }}
                className={`cursor-pointer rounded-lg px-2.5 py-1 text-[11px] font-black uppercase ${
                  mode === 'vin' ? 'bg-zinc-900 text-amber-300' : 'text-zinc-700'
                }`}
              >
                17-Digit VIN
              </button>
              <button
                type="button"
                onClick={() => {
                  hasInteractedRef.current = true;
                  setMode('manual');
                  setErrorMessage(null);
                }}
                className={`cursor-pointer rounded-lg px-2.5 py-1 text-[11px] font-black uppercase ${
                  mode === 'manual' ? 'bg-zinc-900 text-amber-300' : 'text-zinc-700'
                }`}
              >
                Year / Make / Model
              </button>
            </div>
          </div>

          {/* Saved Garage Quick-Fill */}
          {garageBikes.length > 0 ? (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-zinc-600">
                <Bike className="h-3.5 w-3.5" aria-hidden="true" />
                Garage:
              </span>
              {garageBikes.slice(0, 4).map((bike) => {
                const label =
                  [bike.year, bike.make, bike.model].filter(Boolean).join(' ') ||
                  bike.vin;
                return (
                  <button
                    key={bike.id}
                    type="button"
                    onClick={() => applyGarageBike(bike)}
                    className="cursor-pointer rounded-lg border-2 border-black bg-amber-200 px-2 py-0.5 text-[11px] font-black text-black hover:bg-amber-300"
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-3 space-y-2.5">
            {mode === 'vin' ? (
              <div>
                <label
                  htmlFor="vin-diagnostic-input"
                  className="block text-[11px] font-black uppercase text-zinc-700"
                >
                  17-Character VIN
                </label>
                <input
                  id="vin-diagnostic-input"
                  type="text"
                  value={vin}
                  onChange={(e) => {
                    hasInteractedRef.current = true;
                    setVin(e.target.value.toUpperCase());
                  }}
                  maxLength={24}
                  placeholder="e.g. 1HD1KBP10MB600001"
                  className="mt-1 w-full rounded-xl border-2 border-black bg-amber-50 px-3 py-2 font-mono text-sm font-black uppercase tracking-wider text-black placeholder:font-sans placeholder:text-xs placeholder:font-bold placeholder:normal-case placeholder:tracking-normal placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <p className="mt-1 text-[10px] font-bold text-zinc-500">
                  Pre-1981 choppers or scratched frame neck? Switch to Year / Make / Model above.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label
                      htmlFor="manual-bike-year"
                      className="block text-[10px] font-black uppercase text-zinc-700"
                    >
                      Year
                    </label>
                    <input
                      id="manual-bike-year"
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={year}
                      onChange={(e) => {
                        hasInteractedRef.current = true;
                        setYear(e.target.value.replace(/[^0-9]/g, ''));
                      }}
                      placeholder="2021"
                      className="mt-0.5 w-full rounded-xl border-2 border-black bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-black placeholder:text-zinc-400"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="manual-bike-make"
                      className="block text-[10px] font-black uppercase text-zinc-700"
                    >
                      Make *
                    </label>
                    <input
                      id="manual-bike-make"
                      type="text"
                      maxLength={40}
                      required
                      value={make}
                      onChange={(e) => {
                        hasInteractedRef.current = true;
                        setMake(e.target.value);
                      }}
                      placeholder="Harley-Davidson"
                      className="mt-0.5 w-full rounded-xl border-2 border-black bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-black placeholder:text-zinc-400"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="manual-bike-model"
                      className="block text-[10px] font-black uppercase text-zinc-700"
                    >
                      Model *
                    </label>
                    <input
                      id="manual-bike-model"
                      type="text"
                      maxLength={60}
                      required
                      value={model}
                      onChange={(e) => {
                        hasInteractedRef.current = true;
                        setModel(e.target.value);
                      }}
                      placeholder="Street Glide"
                      className="mt-0.5 w-full rounded-xl border-2 border-black bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-black placeholder:text-zinc-400"
                    />
                  </div>
                </div>
                <input
                  type="text"
                  maxLength={24}
                  value={vin}
                  onChange={(e) => {
                    hasInteractedRef.current = true;
                    setVin(e.target.value.toUpperCase());
                  }}
                  aria-label="Optional frame or VIN number"
                  placeholder="Optional VIN / Frame # (keeps linked for Flat Rate Master)"
                  className="w-full rounded-xl border-2 border-black bg-zinc-50 px-2.5 py-1.5 font-mono text-xs font-bold uppercase text-black placeholder:font-sans placeholder:normal-case placeholder:text-zinc-400"
                />
              </div>
            )}

            {/* Symptom Picker */}
            <div>
              <p className="text-[11px] font-black uppercase text-zinc-700">
                What&apos;s Broken?
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {SYMPTOM_OPTIONS.map((opt) => {
                  const selected = symptomCategory === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSymptomCategory(opt.id)}
                      className={`cursor-pointer rounded-lg border-2 border-black px-2 py-1 text-[11px] font-black transition-colors ${
                        selected
                          ? 'bg-amber-300 text-black shadow-[2px_2px_0px_#000]'
                          : 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <input
                type="text"
                maxLength={140}
                value={symptomText}
                onChange={(e) => setSymptomText(e.target.value)}
                aria-label="Describe what the bike is doing"
                placeholder={`Optional details: ${activeSymptomMeta.example}`}
                className="w-full rounded-xl border-2 border-black bg-white px-3 py-1.5 text-xs font-bold text-black placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {errorMessage ? (
              <div className="flex items-start gap-2 rounded-xl border-2 border-black bg-red-100 p-2.5 text-xs font-bold text-red-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{errorMessage}</span>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-3 border-black bg-zinc-900 px-4 py-2.5 text-xs font-black uppercase tracking-wide text-amber-300 shadow-[4px_4px_0px_#000] hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              {submitting ? 'Decoding With NHTSA...' : 'Decode & Ask Dick ($0)'}
            </button>
          </form>
        </div>

        {/* Diagnostic Output + Roast Card + Flat Rate Master Handoff */}
        {triage ? (
          <div className="mt-3 space-y-3 rounded-2xl border-3 border-black bg-white p-3.5 shadow-[4px_4px_0px_#000] sm:p-4">
            {/* Decoded Vehicle Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-black/15 pb-2.5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-sky-800">
                  {triage.vehicle.source === 'nhtsa'
                    ? 'NHTSA vPIC Verified Bike'
                    : 'Manual Bike Spec'}
                </p>
                <h2 className="text-base font-black uppercase text-black sm:text-lg">
                  {triage.vehicle.displayName}
                </h2>
                <p className="text-[11px] font-bold text-zinc-600">
                  {[
                    triage.vehicle.displacementCc,
                    triage.vehicle.engineConfig,
                    triage.vehicle.plantCountry,
                    triage.vehicle.vin ? `VIN ${triage.vehicle.vin}` : null,
                  ]
                    .filter(Boolean)
                    .join(' • ') || triage.symptomSummary}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {triage.savedToGarage ? (
                  <span className="inline-flex items-center gap-1 rounded-lg border-2 border-black bg-emerald-300 px-2 py-0.5 text-[10px] font-black uppercase text-black">
                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                    Saved To Garage
                  </span>
                ) : null}
                {triage.diagnosticCount ? (
                  <span className="rounded-lg border-2 border-black bg-amber-300 px-2 py-0.5 text-[10px] font-black uppercase text-black">
                    Diag #{triage.diagnosticCount}
                  </span>
                ) : null}
              </div>
            </div>

            {!authAccessToken ? (
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  useShopStore.getState().setAccountModalOpen(true);
                }}
                className="w-full cursor-pointer rounded-xl border-2 border-black bg-sky-100 px-3 py-1.5 text-left text-[11px] font-black text-sky-950 hover:bg-sky-200"
              >
                Sign in with Google or Apple to save this bike to your Garage &amp; teach Dick what you ride →
              </button>
            ) : null}

            {/* Dick's Roast + One-Tap Shareable Roast Card */}
            <div className="rounded-2xl border-3 border-black bg-amber-100 p-3 shadow-[3px_3px_0px_#000]">
              <div className="flex items-start gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 border-black bg-amber-200">
                  <Image
                    src={triage.dickMoodPortrait}
                    alt={`Dick ${triage.dickMoodLabel}`}
                    fill
                    className="object-contain object-top"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="inline-block rounded-md border border-black bg-red-600 px-1.5 py-0.5 text-[10px] font-black uppercase text-white">
                    {triage.dickMoodLabel}
                  </span>
                  <p className="mt-1 text-xs font-bold leading-snug text-zinc-900 sm:text-sm">
                    &ldquo;{triage.dickRoast}&rdquo;
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleShareRoastCard}
                className="mt-2.5 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border-2 border-black bg-white px-3 py-2 text-xs font-black uppercase text-black shadow-[2px_2px_0px_#000] hover:bg-amber-50"
              >
                <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                Share Roast Card (PNG)
              </button>
            </div>

            {/* Free Shop Bench Checklist */}
            <div className="rounded-2xl border-2 border-black bg-zinc-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-black uppercase text-zinc-900">
                  Dick&apos;s Free Bench Checklist
                </p>
                <span className="rounded-md border border-black bg-amber-200 px-2 py-0.5 text-[10px] font-black uppercase text-black">
                  {triage.estimatedBayComplexity}
                </span>
              </div>
              <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs font-semibold text-zinc-800">
                {triage.quickChecks.map((check) => (
                  <li key={check}>{check}</li>
                ))}
              </ol>
              <p className="mt-2 text-[10px] font-bold leading-snug text-zinc-500">
                {triage.safetyDisclaimer}
              </p>
            </div>

            {/* Option B Primary Handoff CTA to Flat Rate Master */}
            <a
              href={triage.flatRateMasterUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                trackShopEvent(
                  'diagnostic_frm_handoff',
                  {
                    ref: FLAT_RATE_MASTER_REF_CODE,
                    make: triage.vehicle.make || null,
                    symptomCategory: triage.symptomCategory,
                    hasVin: Boolean(triage.vehicle.vin),
                    source: 'service_counter',
                  },
                  authAccessToken,
                )
              }
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-4 border-black bg-emerald-400 px-4 py-3 text-center text-xs font-black uppercase tracking-wide text-black shadow-[4px_4px_0px_#000] transition-transform hover:-translate-y-0.5 hover:bg-emerald-300 sm:text-sm"
            >
              <span>Run Full AI Diagnostics &amp; Labor Guide on Flat Rate Master</span>
              <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
            </a>
          </div>
        ) : null}

        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              const store = useShopStore.getState();
              const memState = resolveCustomerMemoryState(
                store.customerMemory,
                store.userProfile,
                store.userOrders,
              );
              store.setOpenDrawer(null);
              store.setActiveDialogue(getStaffGreeting('dick', store.products, memState));
            }}
            className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-2xl border-3 border-black bg-amber-300 px-4 py-2.5 text-xs font-black uppercase text-black shadow-[4px_4px_0px_#000] hover:bg-amber-200"
          >
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            Talk to Dick
          </button>
          <button
            type="button"
            onClick={() => useShopStore.getState().enterGameBay(1)}
            className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-2xl border-3 border-black bg-emerald-400 px-4 py-2.5 text-xs font-black uppercase text-black shadow-[4px_4px_0px_#000] hover:bg-emerald-300"
          >
            <Wrench className="h-4 w-4" aria-hidden="true" />
            Clock Into Bay 1
          </button>
        </div>

        <nav
          aria-label="Shop legal and fulfillment policies"
          className="mt-4 flex flex-wrap items-center justify-center gap-3 border-t-2 border-black/15 pt-3 text-[11px] font-black uppercase text-zinc-600"
        >
          <Link
            href="/shipping-returns"
            onClick={handleClose}
            className="underline hover:text-black"
          >
            Shipping &amp; Returns
          </Link>
          <span>•</span>
          <Link
            href="/terms"
            onClick={handleClose}
            className="underline hover:text-black"
          >
            Terms of Service
          </Link>
          <span>•</span>
          <Link
            href="/privacy"
            onClick={handleClose}
            className="underline hover:text-black"
          >
            Privacy Policy
          </Link>
        </nav>
      </div>
    </dialog>
  );
}
