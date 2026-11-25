'use client';

import {
  Bike,
  Gift,
  LogOut,
  PackageCheck,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { SsoSignInButtons } from '@/components/auth/SsoSignInButtons';
import { getSupabaseBrowserAuthClient } from '@/lib/supabaseClient';
import { useShopStore } from '@/store/useShopStore';
import type {
  AtlasVisibility,
  CustomerMemoryRecord,
  CustomerOrderStatus,
  CustomerOrderSummary,
  GarageBike,
  ShippingAddress,
  UserProfile,
} from '@/types/shop';

interface ProfileOrderRow extends CustomerOrderSummary {
  stripe_session_id: string;
  currency: string;
  status: CustomerOrderStatus;
}

interface ProfileRewardRow {
  id: string;
  repair_order_id: string;
  promo_code: string;
  discount_percent: number;
  efficiency_rating: number;
  redeemed: boolean;
  created_at: string;
}

interface ProfileShiftRow {
  id: string;
  mechanic_name: string;
  efficiency_rating: number;
  shop_damage_cost: number;
  rank_badge: string;
  created_at: string;
}

export function AccountModal() {
  const isOpen = useShopStore((s) => s.accountModalOpen);
  const authAccessToken = useShopStore((s) => s.authAccessToken);
  const userProfile = useShopStore((s) => s.userProfile);
  const isAdminUser = useShopStore((s) => s.isAdminUser);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<'profile' | 'activity'>('profile');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Editable fields initialized from userProfile when loaded
  const [displayName, setDisplayName] = useState('');
  const [mechanicHandle, setMechanicHandle] = useState('');
  const [phone, setPhone] = useState('');
  const [shirtSize, setShirtSize] = useState('');
  const [socialHandle, setSocialHandle] = useState('');
  const [atlasVisibility, setAtlasVisibility] = useState<AtlasVisibility>('public');
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [address, setAddress] = useState<ShippingAddress>({
    name: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US',
  });
  const [bikes, setBikes] = useState<GarageBike[]>([]);

  // Quick-add bike fields
  const [bikeYear, setBikeYear] = useState('');
  const [bikeMake, setBikeMake] = useState('');
  const [bikeModel, setBikeModel] = useState('');
  const [bikeVin, setBikeVin] = useState('');
  const [bikeNotes, setBikeNotes] = useState('');

  // Account activity lists
  const [orders, setOrders] = useState<ProfileOrderRow[]>([]);
  const [rewards, setRewards] = useState<ProfileRewardRow[]>([]);
  const [shifts, setShifts] = useState<ProfileShiftRow[]>([]);

  const applyProfileToForm = useCallback((p: UserProfile) => {
    setDisplayName(p.display_name || p.full_name || '');
    setMechanicHandle(p.mechanic_handle || '');
    setPhone(p.phone || '');
    setShirtSize(p.shirt_size || '');
    setSocialHandle(p.social_handle || '');
    setAtlasVisibility(p.atlas_visibility ?? 'public');
    setMarketingOptIn(Boolean(p.marketing_opt_in));
    setAddress({
      name: p.default_shipping_address?.name ?? p.full_name ?? '',
      line1: p.default_shipping_address?.line1 ?? '',
      line2: p.default_shipping_address?.line2 ?? '',
      city: p.default_shipping_address?.city ?? '',
      state: p.default_shipping_address?.state ?? '',
      postal_code: p.default_shipping_address?.postal_code ?? '',
      country: p.default_shipping_address?.country ?? 'US',
    });
    setBikes(Array.isArray(p.garage_bikes) ? p.garage_bikes : []);
  }, []);

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
      const card = dialog.querySelector('[data-account-card="true"]');
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

  useEffect(() => {
    if (!isOpen || !authAccessToken) return;
    let active = true;

    const load = async () => {
      setLoading(true);
      setSaveNotice(null);
      setSaveError(null);
      try {
        const res = await fetch('/api/profile', {
          headers: { Authorization: `Bearer ${authAccessToken}` },
        });
        if (!res.ok) return;
        const json = (await res.json()) as {
          profile?: UserProfile;
          isAdmin?: boolean;
          customerMemory?: CustomerMemoryRecord | null;
          orders?: ProfileOrderRow[];
          rewards?: ProfileRewardRow[];
          repairOrders?: ProfileShiftRow[];
        };
        if (!active || !json.profile) return;
        const store = useShopStore.getState();
        store.setAuthState(
          authAccessToken,
          json.profile,
          Boolean(json.isAdmin),
          json.customerMemory ?? store.customerMemory,
          json.orders ?? store.userOrders,
        );
        applyProfileToForm(json.profile);
        setOrders(json.orders ?? []);
        setRewards(json.rewards ?? []);
        setShifts(json.repairOrders ?? []);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [isOpen, authAccessToken, applyProfileToForm]);

  const handleClose = () => {
    useShopStore.getState().setAccountModalOpen(false);
  };

  const handleAddBike = () => {
    if (!bikeMake.trim() && !bikeModel.trim() && !bikeVin.trim()) return;
    const nextBike: GarageBike = {
      id: `bike-${Date.now()}`,
      year: bikeYear.trim(),
      make: bikeMake.trim(),
      model: bikeModel.trim(),
      vin: bikeVin.trim().toUpperCase(),
      notes: bikeNotes.trim(),
    };
    setBikes((prev) => [nextBike, ...prev].slice(0, 10));
    setBikeYear('');
    setBikeMake('');
    setBikeModel('');
    setBikeVin('');
    setBikeNotes('');
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!authAccessToken || saving) return;
    setSaving(true);
    setSaveNotice(null);
    setSaveError(null);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${authAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          display_name: displayName,
          mechanic_handle: mechanicHandle,
          phone,
          shirt_size: shirtSize,
          social_handle: socialHandle,
          atlas_visibility: atlasVisibility,
          marketing_opt_in: marketingOptIn,
          default_shipping_address: address,
          garage_bikes: bikes,
        }),
      });
      const json = (await res.json()) as { profile?: UserProfile; error?: string };
      if (!res.ok || !json.profile) {
        setSaveError(json.error ?? 'Could not update profile.');
        return;
      }
      const store = useShopStore.getState();
      store.setAuthState(
        authAccessToken,
        json.profile,
        isAdminUser,
        store.customerMemory,
      );
      applyProfileToForm(json.profile);
      setSaveNotice('Saved your rider profile & garage!');
    } catch {
      setSaveError('Network error saving profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    const client = getSupabaseBrowserAuthClient();
    if (client) {
      await client.auth.signOut();
    }
    useShopStore.getState().setAuthState('', null, false);
    useShopStore.getState().setAccountModalOpen(false);
  };

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby="account-modal-title"
      onClose={(e) => {
        e.currentTarget.returnValue = '';
        if (useShopStore.getState().accountModalOpen) {
          useShopStore.getState().setAccountModalOpen(false);
        }
      }}
      className="m-auto max-h-[92dvh] w-[min(95dvw,680px)] overflow-y-auto border-0 bg-transparent p-0 text-black"
    >
      <div
        data-account-card="true"
        className="rounded-3xl border-4 border-black bg-amber-50 p-4 shadow-[12px_12px_0px_#000] sm:p-6"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b-4 border-black pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-3 border-black bg-amber-300">
              <UserCheck className="h-6 w-6 text-black" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
                HARD R CYCLES PASS
              </p>
              <h1 id="account-modal-title" className="text-xl font-black uppercase leading-tight">
                {authAccessToken
                  ? userProfile?.display_name || userProfile?.email || 'Your Garage Pass'
                  : 'Sign In to Your Garage'}
              </h1>
            </div>
          </div>

          <button
            type="button"
            autoFocus
            onClick={handleClose}
            aria-label="Close account modal"
            className="flex cursor-pointer items-center justify-center rounded-xl border-2 border-black bg-white p-2 hover:bg-zinc-200"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {!authAccessToken ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border-3 border-black bg-white p-4 text-xs font-bold leading-relaxed text-zinc-700 shadow-[4px_4px_0px_#000]">
              Sign in with Google or Apple to save your bikes &amp; VINs (for the upcoming VIN Diagnostic Terminal), keep your shirt size &amp; shipping info handy, track Direct Cart orders, and sync your Flat Rate Panic rewards across devices.
            </div>
            <SsoSignInButtons nextPath="/" />
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {/* Account Meta Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border-3 border-black bg-white p-3 text-xs">
              <div className="space-y-0.5">
                <p className="font-black text-black">{userProfile?.email}</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded border border-black bg-amber-100 px-1.5 py-0.5 text-[10px] font-black uppercase">
                    {userProfile?.auth_provider || 'sso'}
                  </span>
                  {isAdminUser ? (
                    <span className="rounded border border-black bg-emerald-300 px-1.5 py-0.5 text-[10px] font-black uppercase text-black">
                      Admin Access Enabled
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {isAdminUser ? (
                  <Link
                    href="/admin"
                    onClick={handleClose}
                    className="flex min-h-12 items-center gap-1.5 rounded-xl border-2 border-black bg-emerald-400 px-3 text-xs font-black uppercase text-black shadow-[2px_2px_0px_#000] hover:bg-emerald-300"
                  >
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    Admin Console →
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex min-h-12 cursor-pointer items-center gap-1.5 rounded-xl border-2 border-black bg-zinc-100 px-3 text-xs font-black uppercase hover:bg-red-100"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Sign Out
                </button>
              </div>
            </div>

            {/* Sub-Tabs */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTab('profile')}
                className={`min-h-12 flex-1 cursor-pointer rounded-2xl border-3 border-black px-3 text-xs font-black uppercase ${
                  tab === 'profile'
                    ? 'bg-zinc-900 text-amber-300 shadow-[3px_3px_0px_#000]'
                    : 'bg-white text-black hover:bg-amber-100'
                }`}
              >
                Profile &amp; Garage ({bikes.length})
              </button>
              <button
                type="button"
                onClick={() => setTab('activity')}
                className={`min-h-12 flex-1 cursor-pointer rounded-2xl border-3 border-black px-3 text-xs font-black uppercase ${
                  tab === 'activity'
                    ? 'bg-zinc-900 text-amber-300 shadow-[3px_3px_0px_#000]'
                    : 'bg-white text-black hover:bg-amber-100'
                }`}
              >
                Orders &amp; Rewards ({orders.length + rewards.length})
              </button>
            </div>

            {saveNotice ? (
              <div
                role="status"
                className="rounded-xl border-2 border-black bg-emerald-200 px-3 py-2 text-xs font-black text-emerald-950"
              >
                {saveNotice}
              </div>
            ) : null}
            {saveError ? (
              <div
                role="alert"
                className="rounded-xl border-2 border-red-700 bg-red-100 px-3 py-2 text-xs font-black text-red-900"
              >
                {saveError}
              </div>
            ) : null}

            {loading ? (
              <div className="rounded-2xl border-3 border-black bg-white p-6 text-center text-xs font-black uppercase text-zinc-500">
                Loading your garage data...
              </div>
            ) : tab === 'profile' ? (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <fieldset className="space-y-3 rounded-2xl border-3 border-black bg-white p-4">
                  <legend className="px-1 text-xs font-black uppercase text-black">
                    Rider Profile &amp; Shipping Defaults
                  </legend>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="prof-display" className="mb-1 block text-xs font-black uppercase">
                        Display Name
                      </label>
                      <input
                        id="prof-display"
                        type="text"
                        autoComplete="name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="min-h-12 w-full rounded-xl border-2 border-black bg-white px-3 text-base font-bold"
                      />
                    </div>
                    <div>
                      <label htmlFor="prof-handle" className="mb-1 block text-xs font-black uppercase">
                        Bay Leaderboard Handle
                      </label>
                      <input
                        id="prof-handle"
                        type="text"
                        maxLength={24}
                        value={mechanicHandle}
                        onChange={(e) => setMechanicHandle(e.target.value)}
                        className="min-h-12 w-full rounded-xl border-2 border-black bg-white px-3 text-base font-bold"
                      />
                    </div>
                    <div>
                      <label htmlFor="prof-phone" className="mb-1 block text-xs font-black uppercase">
                        Phone
                      </label>
                      <input
                        id="prof-phone"
                        type="tel"
                        autoComplete="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(555) 123-4567"
                        className="min-h-12 w-full rounded-xl border-2 border-black bg-white px-3 text-base font-bold"
                      />
                    </div>
                    <div>
                      <label htmlFor="prof-shirt" className="mb-1 block text-xs font-black uppercase">
                        Default Apparel Size
                      </label>
                      <select
                        id="prof-shirt"
                        value={shirtSize}
                        onChange={(e) => setShirtSize(e.target.value)}
                        className="min-h-12 w-full rounded-xl border-2 border-black bg-white px-3 text-base font-bold"
                      >
                        <option value="">Select Size...</option>
                        {['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'].map((sz) => (
                          <option key={sz} value={sz}>
                            {sz}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="prof-social" className="mb-1 block text-xs font-black uppercase">
                        Social Handle (Optional)
                      </label>
                      <input
                        id="prof-social"
                        type="text"
                        maxLength={40}
                        value={socialHandle}
                        onChange={(e) => setSocialHandle(e.target.value)}
                        placeholder="@yourhandle"
                        className="min-h-12 w-full rounded-xl border-2 border-black bg-white px-3 text-base font-bold"
                      />
                    </div>
                    <div>
                      <label htmlFor="prof-atlas-vis" className="mb-1 block text-xs font-black uppercase">
                        Shop Wall Atlas Visibility
                      </label>
                      <select
                        id="prof-atlas-vis"
                        value={atlasVisibility}
                        onChange={(e) =>
                          setAtlasVisibility(e.target.value as AtlasVisibility)
                        }
                        className="min-h-12 w-full rounded-xl border-2 border-black bg-white px-3 text-base font-bold"
                      >
                        <option value="public">Public (Handle + City + Bike)</option>
                        <option value="anonymized">City Only (&ldquo;Rider from [City]&rdquo;)</option>
                        <option value="hidden">Hidden from Public Atlas</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label htmlFor="prof-addr1" className="mb-1 block text-xs font-black uppercase">
                        Street Address
                      </label>
                      <input
                        id="prof-addr1"
                        type="text"
                        autoComplete="street-address"
                        value={address.line1 ?? ''}
                        onChange={(e) =>
                          setAddress((prev) => ({ ...prev, line1: e.target.value }))
                        }
                        placeholder="123 V-Twin Way"
                        className="min-h-12 w-full rounded-xl border-2 border-black bg-white px-3 text-base font-bold"
                      />
                    </div>
                    <div>
                      <label htmlFor="prof-city" className="mb-1 block text-xs font-black uppercase">
                        City
                      </label>
                      <input
                        id="prof-city"
                        type="text"
                        autoComplete="address-level2"
                        value={address.city ?? ''}
                        onChange={(e) =>
                          setAddress((prev) => ({ ...prev, city: e.target.value }))
                        }
                        className="min-h-12 w-full rounded-xl border-2 border-black bg-white px-3 text-base font-bold"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label htmlFor="prof-state" className="mb-1 block text-xs font-black uppercase">
                          State
                        </label>
                        <input
                          id="prof-state"
                          type="text"
                          autoComplete="address-level1"
                          value={address.state ?? ''}
                          onChange={(e) =>
                            setAddress((prev) => ({ ...prev, state: e.target.value }))
                          }
                          className="min-h-12 w-full rounded-xl border-2 border-black bg-white px-3 text-base font-bold"
                        />
                      </div>
                      <div>
                        <label htmlFor="prof-zip" className="mb-1 block text-xs font-black uppercase">
                          ZIP
                        </label>
                        <input
                          id="prof-zip"
                          type="text"
                          autoComplete="postal-code"
                          value={address.postal_code ?? ''}
                          onChange={(e) =>
                            setAddress((prev) => ({
                              ...prev,
                              postal_code: e.target.value,
                            }))
                          }
                          className="min-h-12 w-full rounded-xl border-2 border-black bg-white px-3 text-base font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <label className="flex min-h-12 cursor-pointer items-center gap-2 text-xs font-bold text-zinc-800">
                    <input
                      type="checkbox"
                      checked={marketingOptIn}
                      onChange={(e) => setMarketingOptIn(e.target.checked)}
                      className="h-5 w-5 accent-amber-500"
                    />
                    Notify me about limited Hard R Originals merch drops
                  </label>
                </fieldset>

                {/* Saved Garage Bikes / VINs */}
                <fieldset className="space-y-3 rounded-2xl border-3 border-black bg-white p-4">
                  <legend className="flex items-center gap-1.5 px-1 text-xs font-black uppercase text-black">
                    <Bike className="h-4 w-4 text-red-700" aria-hidden="true" />
                    Your Bikes &amp; VINs (VIN Terminal Ready)
                  </legend>

                  {bikes.length > 0 ? (
                    <ul className="space-y-2">
                      {bikes.map((bk) => (
                        <li
                          key={bk.id}
                          className="flex items-center justify-between gap-2 rounded-xl border-2 border-black bg-amber-50 px-3 py-2 text-xs"
                        >
                          <div>
                            <p className="font-black text-black">
                              {[bk.year, bk.make, bk.model].filter(Boolean).join(' ') || 'Saved Bike'}
                            </p>
                            {bk.vin ? (
                              <p className="font-bold text-zinc-600">
                                VIN: <code>{bk.vin}</code>
                              </p>
                            ) : null}
                            {bk.notes ? (
                              <p className="text-[11px] font-semibold text-zinc-600">{bk.notes}</p>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setBikes((prev) => prev.filter((item) => item.id !== bk.id))
                            }
                            aria-label="Remove saved bike"
                            className="flex min-h-12 min-w-12 cursor-pointer items-center justify-center rounded-xl border-2 border-black bg-white text-red-700 hover:bg-red-100"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs font-bold text-zinc-500">
                      Save your Year / Make / Model / VIN now so Phase 5 diagnostics prefill your bike automatically.
                    </p>
                  )}

                  <div className="grid gap-2 sm:grid-cols-4">
                    <input
                      type="text"
                      aria-label="Bike Year"
                      placeholder="Year (2021)"
                      value={bikeYear}
                      onChange={(e) => setBikeYear(e.target.value)}
                      className="min-h-12 rounded-xl border-2 border-black bg-white px-3 text-base font-bold"
                    />
                    <input
                      type="text"
                      aria-label="Bike Make"
                      placeholder="Make (Harley)"
                      value={bikeMake}
                      onChange={(e) => setBikeMake(e.target.value)}
                      className="min-h-12 rounded-xl border-2 border-black bg-white px-3 text-base font-bold"
                    />
                    <input
                      type="text"
                      aria-label="Bike Model"
                      placeholder="Model (Road Glide)"
                      value={bikeModel}
                      onChange={(e) => setBikeModel(e.target.value)}
                      className="min-h-12 sm:col-span-2 rounded-xl border-2 border-black bg-white px-3 text-base font-bold"
                    />
                    <input
                      type="text"
                      aria-label="Bike VIN"
                      placeholder="VIN (optional)"
                      value={bikeVin}
                      onChange={(e) => setBikeVin(e.target.value)}
                      className="min-h-12 sm:col-span-2 rounded-xl border-2 border-black bg-white px-3 text-base font-bold uppercase"
                    />
                    <input
                      type="text"
                      aria-label="Bike Build Notes"
                      placeholder="Notes (cam, pipe, etc.)"
                      value={bikeNotes}
                      onChange={(e) => setBikeNotes(e.target.value)}
                      className="min-h-12 rounded-xl border-2 border-black bg-white px-3 text-base font-bold"
                    />
                    <button
                      type="button"
                      onClick={handleAddBike}
                      className="flex min-h-12 cursor-pointer items-center justify-center gap-1 rounded-xl border-2 border-black bg-amber-300 px-3 text-xs font-black uppercase hover:bg-amber-200"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Add Bike
                    </button>
                  </div>
                </fieldset>

                <button
                  type="submit"
                  disabled={saving}
                  className="min-h-12 w-full cursor-pointer rounded-2xl border-4 border-black bg-emerald-400 px-5 text-sm font-black uppercase text-black shadow-[4px_4px_0px_#000] hover:bg-emerald-300 disabled:opacity-50"
                >
                  {saving ? 'Saving Profile...' : 'Save Profile & Garage'}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border-3 border-black bg-white p-4">
                  <h2 className="flex items-center gap-1.5 text-sm font-black uppercase">
                    <Gift className="h-4 w-4 text-red-700" aria-hidden="true" />
                    Your Claimed Discount Codes ({rewards.length})
                  </h2>
                  {rewards.length === 0 ? (
                    <p className="mt-2 text-xs font-bold text-zinc-500">
                      Clock into a service bay and score 90%+ flat-rate efficiency to unlock 5%–15% Hard R Originals codes!
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-2 text-xs">
                      {rewards.map((rw) => (
                        <li
                          key={rw.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-black bg-amber-50 p-2.5"
                        >
                          <div>
                            <code className="font-black text-black">{rw.promo_code}</code>
                            <span className="ml-2 font-bold text-zinc-600">
                              {rw.discount_percent}% OFF ({Number(rw.efficiency_rating).toFixed(1)}%)
                            </span>
                          </div>
                          {rw.redeemed ? (
                            <span className="rounded border border-zinc-400 bg-zinc-200 px-2 py-0.5 text-[10px] font-black uppercase">
                              Redeemed
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                useShopStore.getState().setAppliedPromoCode(rw.promo_code);
                                useShopStore.getState().setAccountModalOpen(false);
                                useShopStore.getState().setOpenDrawer('CART');
                              }}
                              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border-2 border-black bg-emerald-300 px-2.5 py-1 text-[10px] font-black uppercase hover:bg-emerald-200"
                            >
                              <ShoppingCart className="h-3 w-3" aria-hidden="true" />
                              Apply to Cart
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-2xl border-3 border-black bg-white p-4">
                  <h2 className="flex items-center gap-1.5 text-sm font-black uppercase">
                    <PackageCheck className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                    Direct Order History ({orders.length})
                  </h2>
                  {orders.length === 0 ? (
                    <p className="mt-2 text-xs font-bold text-zinc-500">
                      No Hard R Originals Stripe orders under this account yet.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-2 text-xs">
                      {orders.map((ord) => (
                        <li
                          key={ord.id}
                          className="rounded-xl border-2 border-black bg-amber-50 p-3 font-bold"
                        >
                          <div className="flex items-center justify-between">
                            <span className="uppercase">
                              {ord.status} • {ord.fulfillment_mode}
                            </span>
                            <span className="font-black text-emerald-700">
                              ${Number(ord.total).toFixed(2)} {ord.currency.toUpperCase()}
                            </span>
                          </div>
                          {ord.tracking_number ? (
                            <p className="mt-1 text-[11px] text-zinc-700">
                              Tracking: <code>{ord.tracking_number}</code>
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-2xl border-3 border-black bg-white p-4">
                  <h2 className="text-sm font-black uppercase">
                    Recent Flat Rate Panic Shifts ({shifts.length})
                  </h2>
                  {shifts.length === 0 ? (
                    <p className="mt-2 text-xs font-bold text-zinc-500">
                      Play a shift while signed in to save your scores permanently to your profile.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1.5 text-xs">
                      {shifts.map((s) => (
                        <li
                          key={s.id}
                          className="flex items-center justify-between rounded-xl border border-zinc-200 px-3 py-2 font-bold"
                        >
                          <span>
                            {s.mechanic_name} • {s.rank_badge}
                          </span>
                          <span className="font-black text-emerald-700">
                            {Number(s.efficiency_rating).toFixed(1)}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </dialog>
  );
}
