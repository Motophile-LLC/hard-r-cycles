'use client';

import {
  ArrowLeft,
  Bike,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  MapPin,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SsoSignInButtons } from '@/components/auth/SsoSignInButtons';
import { useShopStore } from '@/store/useShopStore';
import { AtlasMapSvg } from './AtlasMapSvg';
import type {
  AtlasGeoFeature,
  AtlasPinRecord,
  AtlasPinsApiResponse,
  AtlasSanitizedPin,
  AtlasVisibility,
} from './types';

function formatRelativeSeen(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 60_000) return 'just now';
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function ShopWallAtlasModal() {
  const openDrawer = useShopStore((s) => s.openDrawer);
  const authAccessToken = useShopStore((s) => s.authAccessToken);
  const userProfile = useShopStore((s) => s.userProfile);

  const isOpen = openDrawer === 'ATLAS';
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [zoom, setZoom] = useState(2.2);
  const [loadingPins, setLoadingPins] = useState(false);
  const [features, setFeatures] = useState<AtlasGeoFeature[]>([]);
  const [recentRiders, setRecentRiders] = useState<AtlasSanitizedPin[]>([]);
  const [totalPins, setTotalPins] = useState(0);
  const [uniqueRegions, setUniqueRegions] = useState(0);
  const [myPin, setMyPin] = useState<AtlasPinRecord | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<AtlasGeoFeature | null>(
    null,
  );
  const [focusTarget, setFocusTarget] = useState<{
    lat: number;
    lng: number;
    zoom: number;
    nonce: number;
  } | null>(null);

  // Check-in form fields
  const [bikeInput, setBikeInput] = useState('');
  const [visibility, setVisibility] = useState<AtlasVisibility>('public');
  const [checkinBusy, setCheckinBusy] = useState(false);
  const [checkinMsg, setCheckinMsg] = useState<string | null>(null);
  const [checkinErr, setCheckinErr] = useState<string | null>(null);

  const queryZoomTier = zoom < 5 ? 3 : 6;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Safari fallback for closedby="any" light dismiss
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || 'closedBy' in HTMLDialogElement.prototype) return;

    let pressedOutside = false;
    const isOutside = (e: PointerEvent) => {
      const card = dialog.querySelector('[data-atlas-card="true"]');
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

  const fetchPins = useCallback(
    async (zoomTier: number) => {
      setLoadingPins(true);
      try {
        const res = await fetch(`/api/atlas/pins?zoom=${zoomTier}`, {
          headers: authAccessToken
            ? { Authorization: `Bearer ${authAccessToken}` }
            : undefined,
        });
        if (!res.ok) return;
        const json = (await res.json()) as AtlasPinsApiResponse;
        setFeatures(json.features ?? []);
        setRecentRiders(json.recentRiders ?? []);
        setTotalPins(json.totalVisiblePins ?? 0);
        setUniqueRegions(json.uniqueRegions ?? 0);
        setMyPin(json.myPin ?? null);

        useShopStore
          .getState()
          .setAtlasSummary(
            json.boardDots ?? [],
            json.totalVisiblePins ?? 0,
            Boolean(json.myPin),
          );

        if (json.myPin) {
          setBikeInput((prev) => prev || json.myPin!.favorite_bike || '');
          setVisibility(json.myPin.visibility);
        } else if (userProfile) {
          const garageFirst = userProfile.garage_bikes?.[0];
          const formatted = garageFirst
            ? [garageFirst.year, garageFirst.make, garageFirst.model]
                .filter(Boolean)
                .join(' ')
            : '';
          setBikeInput((prev) => prev || formatted || 'Custom Chopper');
          if (userProfile.atlas_visibility) {
            setVisibility(userProfile.atlas_visibility);
          }
        }
      } catch {
        // Ignore transient offline errors
      } finally {
        setLoadingPins(false);
      }
    },
    [authAccessToken, userProfile],
  );

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) {
        void fetchPins(queryZoomTier);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, queryZoomTier, fetchPins]);

  const handleClose = () => {
    useShopStore.getState().setOpenDrawer(null);
  };

  const handleCheckIn = async () => {
    if (!authAccessToken || checkinBusy) return;
    setCheckinBusy(true);
    setCheckinErr(null);
    setCheckinMsg(null);
    try {
      const res = await fetch('/api/atlas/checkin', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          favoriteBike: bikeInput.trim() || undefined,
          visibility,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        pin?: AtlasPinRecord;
        error?: string;
      };
      if (!res.ok || !json.pin) {
        setCheckinErr(json.error ?? 'Could not drop pin right now.');
        return;
      }

      setMyPin(json.pin);
      setCheckinMsg(
        json.pin.visibility === 'hidden'
          ? 'Saved check-in with visibility set to Hidden (only visible to you).'
          : `Pinned near ${json.pin.city}, ${json.pin.region} (~11km privacy grid)!`,
      );
      setFocusTarget({
        lat: json.pin.lat_approx,
        lng: json.pin.lng_approx,
        zoom: 5.5,
        nonce: Date.now(),
      });
      setZoom(5.5);
      await fetchPins(6);
    } catch {
      setCheckinErr('Network error checking in. Please try again.');
    } finally {
      setCheckinBusy(false);
    }
  };

  const selectedId = selectedFeature
    ? selectedFeature.properties.isCluster
      ? selectedFeature.properties.clusterId
      : selectedFeature.properties.id
    : null;

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby="atlas-modal-title"
      onClose={(e) => {
        e.currentTarget.returnValue = '';
        if (useShopStore.getState().openDrawer === 'ATLAS') {
          useShopStore.getState().setOpenDrawer(null);
        }
      }}
      className="m-auto max-h-[92dvh] w-[min(96dvw,940px)] overflow-y-auto border-0 bg-transparent p-0 text-black"
    >
      <div
        data-atlas-card="true"
        className="rounded-3xl border-4 border-black bg-amber-50 p-4 shadow-[12px_12px_0px_#000] sm:p-5"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b-4 border-black pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-3 border-black bg-emerald-300 shadow-[3px_3px_0px_#000]">
              <MapPin className="h-6 w-6 text-black" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                HARD R CYCLES • GUEST BOOK
              </p>
              <h1
                id="atlas-modal-title"
                className="text-xl font-black uppercase leading-tight sm:text-2xl"
              >
                Shop Wall Atlas
              </h1>
            </div>
          </div>

          <button
            type="button"
            autoFocus
            onClick={handleClose}
            aria-label="Back to full shop"
            className="flex min-h-[38px] shrink-0 cursor-pointer items-center gap-1 rounded-xl border-2 border-black bg-amber-300 px-3 py-1.5 text-xs font-black uppercase text-black shadow-[2px_2px_0px_#000] hover:bg-amber-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Back</span>
          </button>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          {/* Left: Interactive Comic Map + Stats + Inspector */}
          <div className="space-y-3 lg:col-span-7">
            <AtlasMapSvg
              features={features}
              zoom={zoom}
              selectedId={selectedId}
              focusTarget={focusTarget}
              onZoomChange={(next) => setZoom(next)}
              onSelectFeature={(feat) => setSelectedFeature(feat)}
            />

            {/* Metrics Bar */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-xl border-2 border-black bg-white p-2 shadow-[2px_2px_0px_#000]">
                <span className="block text-[10px] font-black uppercase text-zinc-500">
                  Riders Pinned
                </span>
                <span className="text-base font-black text-black">{totalPins}</span>
              </div>
              <div className="rounded-xl border-2 border-black bg-white p-2 shadow-[2px_2px_0px_#000]">
                <span className="block text-[10px] font-black uppercase text-zinc-500">
                  Regions
                </span>
                <span className="text-base font-black text-black">{uniqueRegions}</span>
              </div>
              <div className="rounded-xl border-2 border-black bg-emerald-100 p-2 shadow-[2px_2px_0px_#000]">
                <span className="block text-[10px] font-black uppercase text-emerald-800">
                  Privacy Grid
                </span>
                <span className="text-sm font-black text-black">~11km Fuzz</span>
              </div>
            </div>

            {/* Selected Cluster or Rider Card */}
            <div className="rounded-2xl border-3 border-black bg-white p-3 text-xs shadow-[3px_3px_0px_#000]">
              {selectedFeature ? (
                selectedFeature.properties.isCluster ? (
                  <div>
                    <p className="font-black uppercase text-amber-700">
                      Cluster • {selectedFeature.properties.pointCount} Riders Nearby
                    </p>
                    <p className="mt-1 font-bold text-zinc-700">
                      Cities:{' '}
                      {selectedFeature.properties.topCities.join(', ') || 'Multiple areas'}
                    </p>
                    <p className="mt-0.5 font-bold text-zinc-600">
                      Bikes:{' '}
                      {selectedFeature.properties.sampleBikes.join(' • ') || 'Custom builds'}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-black text-black">
                        {selectedFeature.properties.displayName}
                      </p>
                      <p className="font-bold text-zinc-600">
                        {selectedFeature.properties.city}, {selectedFeature.properties.region} (
                        {selectedFeature.properties.country}) •{' '}
                        {selectedFeature.properties.visitCount} visit
                        {selectedFeature.properties.visitCount === 1 ? '' : 's'}
                      </p>
                      <p className="mt-1 inline-flex items-center gap-1 font-black text-red-700">
                        <Bike className="h-3.5 w-3.5" aria-hidden="true" />
                        {selectedFeature.properties.favoriteBike}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-lg border border-black bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase">
                      {formatRelativeSeen(selectedFeature.properties.lastSeenAt)}
                    </span>
                  </div>
                )
              ) : (
                <p className="font-bold text-zinc-600">
                  {loadingPins
                    ? 'Loading live pins across the map...'
                    : 'Tap any emerald pin or amber cluster to inspect riders and garage builds.'}
                </p>
              )}
            </div>
          </div>

          {/* Right: SSO Guest Book Check-In + Recent Riders Log */}
          <div className="space-y-3 lg:col-span-5">
            <div className="rounded-2xl border-3 border-black bg-white p-3.5 shadow-[4px_4px_0px_#000]">
              <div className="flex items-center gap-2 border-b-2 border-black/15 pb-2">
                <ShieldCheck className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                <h2 className="text-xs font-black uppercase text-black">
                  Sign the Guest Book (SSO Only)
                </h2>
              </div>

              {!authAccessToken ? (
                <div className="mt-2.5 space-y-2.5">
                  <p className="text-xs font-bold leading-snug text-zinc-700">
                    Sign in with Google or Apple to drop your rider pin. Your exact IP is dropped immediately — coordinates are fuzzed to an ~11km grid.
                  </p>
                  <SsoSignInButtons compact />
                </div>
              ) : (
                <div className="mt-2.5 space-y-2.5">
                  <div>
                    <label
                      htmlFor="atlas-bike-input"
                      className="mb-1 block text-[11px] font-black uppercase text-zinc-700"
                    >
                      Bike on Your Pin
                    </label>
                    <input
                      id="atlas-bike-input"
                      type="text"
                      maxLength={80}
                      value={bikeInput}
                      onChange={(e) => setBikeInput(e.target.value)}
                      placeholder="e.g. 2022 Harley Road Glide ST"
                      className="min-h-11 w-full rounded-xl border-2 border-black bg-amber-50 px-3 text-sm font-bold text-black"
                    />
                  </div>

                  <div>
                    <span className="mb-1 block text-[11px] font-black uppercase text-zinc-700">
                      Pin Visibility
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          ['public', 'Public', Eye],
                          ['anonymized', 'City Only', Users],
                          ['hidden', 'Hidden', EyeOff],
                        ] as const
                      ).map(([val, label, Icon]) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setVisibility(val)}
                          aria-pressed={visibility === val}
                          className={`flex min-h-10 cursor-pointer items-center justify-center gap-1 rounded-xl border-2 border-black px-2 text-[11px] font-black uppercase ${
                            visibility === val
                              ? 'bg-amber-300 text-black shadow-[2px_2px_0px_#000]'
                              : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={checkinBusy}
                    onClick={handleCheckIn}
                    className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-3 border-black bg-emerald-400 px-4 text-xs font-black uppercase text-black shadow-[4px_4px_0px_#000] hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <MapPin className="h-4 w-4" aria-hidden="true" />
                    <span>
                      {checkinBusy
                        ? 'Pinning Shop Wall...'
                        : myPin
                          ? 'Update My Wall Pin'
                          : 'Drop My Pin on Shop Wall'}
                    </span>
                  </button>

                  {checkinMsg ? (
                    <div
                      role="status"
                      className="flex items-start gap-1.5 rounded-xl border-2 border-black bg-emerald-100 px-2.5 py-2 text-[11px] font-bold text-emerald-950"
                    >
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>{checkinMsg}</span>
                    </div>
                  ) : null}

                  {checkinErr ? (
                    <div
                      role="alert"
                      className="flex items-start gap-1.5 rounded-xl border-2 border-red-700 bg-red-100 px-2.5 py-2 text-[11px] font-bold text-red-900"
                    >
                      <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>{checkinErr}</span>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Recent Riders Feed */}
            <div className="rounded-2xl border-3 border-black bg-white p-3.5 shadow-[4px_4px_0px_#000]">
              <h2 className="border-b-2 border-black/15 pb-2 text-xs font-black uppercase text-black">
                Recent Shop Check-Ins
              </h2>

              {recentRiders.length === 0 ? (
                <p className="py-4 text-center text-xs font-bold text-zinc-500">
                  No visible pins yet — sign in with SSO and drop the first pin on the wall!
                </p>
              ) : (
                <ul className="mt-2 max-h-[220px] space-y-1.5 overflow-y-auto pr-1">
                  {recentRiders.map((rider) => (
                    <li key={rider.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFeature({
                            type: 'Feature',
                            geometry: {
                              type: 'Point',
                              coordinates: [rider.lng, rider.lat],
                            },
                            properties: { isCluster: false, ...rider },
                          });
                          setZoom(6);
                          setFocusTarget({
                            lat: rider.lat,
                            lng: rider.lng,
                            zoom: 6,
                            nonce: Date.now(),
                          });
                        }}
                        className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border-2 border-black bg-amber-50 px-2.5 py-2 text-left text-xs hover:bg-amber-200"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-black text-black">
                            {rider.displayName}
                          </p>
                          <p className="truncate text-[11px] font-bold text-zinc-600">
                            {rider.city}, {rider.region} • {rider.favoriteBike}
                          </p>
                        </div>
                        <span className="shrink-0 text-[10px] font-black uppercase text-zinc-500">
                          {formatRelativeSeen(rider.lastSeenAt)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}
