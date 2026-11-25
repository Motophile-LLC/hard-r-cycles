'use client';

import {
  Bike,
  Gift,
  LogOut,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { SsoSignInButtons } from '@/components/auth/SsoSignInButtons';
import { resolveCustomerMemoryState } from '@/features/npc-memory/resolver';
import { getSupabaseBrowserAuthClient } from '@/lib/supabaseClient';
import type {
  CheckoutMode,
  CustomerMemoryRecord,
  RackSlot,
  ShopDepartment,
  ShopProduct,
  UserProfile,
} from '@/types/shop';

interface AdminStatusPayload {
  authenticated: boolean;
  authorizedAdmin: boolean;
  isSuperAdmin?: boolean;
  adminEmail?: string;
  authError?: string;
}

interface AdminUserRow extends UserProfile {
  notes: string;
  isSuperAdmin: boolean;
  orderCount: number;
  lifetimeSpend: number;
  shiftCount: number;
  bestEfficiency: number;
  rewardCount: number;
  customerMemory?: CustomerMemoryRecord | null;
}

interface AdminOrderRow {
  id: string;
  stripe_session_id: string;
  customer_email: string;
  shipping_name: string | null;
  shipping_address: {
    line1?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  } | null;
  items: Array<{
    title: string;
    quantity: number;
    size?: string;
    color?: string;
    checkoutMode?: CheckoutMode;
  }>;
  subtotal: number;
  shipping_cost: number;
  total: number;
  currency: string;
  fulfillment_mode: 'diy' | 'pod' | 'hybrid';
  status: 'paid' | 'fulfilling' | 'shipped' | 'cancelled' | 'refunded';
  tracking_number: string | null;
  created_at: string;
}

interface AdminRewardClaimRow {
  id: string;
  repair_order_id: string;
  mechanic_name: string;
  efficiency_rating: number;
  discount_percent: number;
  promo_code: string;
  redeemed: boolean;
  created_at: string;
}

interface AdminLeaderboardRow {
  id: string;
  mechanic_name: string;
  efficiency_rating: number;
  shop_damage_cost: number;
  rank_badge: string;
  jobs_completed: number;
}

export function AdminDashboardClient() {
  const [status, setStatus] = useState<AdminStatusPayload | null>(null);
  const [accessToken, setAccessToken] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'users' | 'products' | 'orders' | 'rewards'>('users');
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Admin workspace data
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [memoryTableReady, setMemoryTableReady] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [adminProducts, setAdminProducts] = useState<ShopProduct[]>([]);
  const [orders, setOrders] = useState<AdminOrderRow[]>([]);
  const [trackingDrafts, setTrackingDrafts] = useState<Record<string, string>>({});
  const [statusDrafts, setStatusDrafts] = useState<Record<string, AdminOrderRow['status']>>({});
  const [rewardClaims, setRewardClaims] = useState<AdminRewardClaimRow[]>([]);
  const [leaderboard, setLeaderboard] = useState<AdminLeaderboardRow[]>([]);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);

  // New Product form state
  const [newTitle, setNewTitle] = useState('');
  const [newCollection, setNewCollection] = useState('Hard R Originals');
  const [newRackSlot, setNewRackSlot] = useState<RackSlot>('hard_r_originals');
  const [newDept, setNewDept] = useState<ShopDepartment>('APPAREL');
  const [newMode, setNewMode] = useState<CheckoutMode>('stripe_diy');
  const [newExternalUrl, setNewExternalUrl] = useState('');
  const [newPrice, setNewPrice] = useState('34.99');
  const [newSizes, setNewSizes] = useState('S, M, L, XL, 2XL');
  const [newColors, setNewColors] = useState('Black, Charcoal');
  const [newFitNotes, setNewFitNotes] = useState('Heavyweight 100% cotton shop cut.');
  const [newImageUrl, setNewImageUrl] = useState('/brand/hard-r-cycles-logo.png');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);

  const refreshStatus = useCallback(async (token?: string) => {
    try {
      const res = await fetch('/api/admin/status', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (res.ok) {
        const json = (await res.json()) as AdminStatusPayload;
        setStatus(json);
        return json;
      }
    } catch {
      // Ignore transient status fetch issues
    }
    return null;
  }, []);

  const loadWorkspaceData = useCallback(async (token: string) => {
    if (!token) return;
    setLoadingWorkspace(true);
    setActionError(null);
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [usrRes, prodRes, ordRes, rewRes] = await Promise.all([
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/products', { headers }),
        fetch('/api/admin/orders', { headers }),
        fetch('/api/admin/rewards', { headers }),
      ]);

      if (usrRes.ok) {
        const uJson = (await usrRes.json()) as {
          users?: AdminUserRow[];
          memoryTableReady?: boolean;
        };
        const loadedUsers = uJson.users ?? [];
        setUsers(loadedUsers);
        setMemoryTableReady(uJson.memoryTableReady !== false);
        const nextNotes: Record<string, string> = {};
        for (const u of loadedUsers) {
          nextNotes[u.id] = u.notes ?? '';
        }
        setNoteDrafts(nextNotes);
      }
      if (prodRes.ok) {
        const pJson = (await prodRes.json()) as { products?: ShopProduct[] };
        setAdminProducts(pJson.products ?? []);
      }
      if (ordRes.ok) {
        const oJson = (await ordRes.json()) as { orders?: AdminOrderRow[] };
        const loadedOrders = oJson.orders ?? [];
        setOrders(loadedOrders);
        const nextTrack: Record<string, string> = {};
        const nextStatus: Record<string, AdminOrderRow['status']> = {};
        for (const o of loadedOrders) {
          nextTrack[o.id] = o.tracking_number ?? '';
          nextStatus[o.id] = o.status;
        }
        setTrackingDrafts(nextTrack);
        setStatusDrafts(nextStatus);
      }
      if (rewRes.ok) {
        const rJson = (await rewRes.json()) as {
          claims?: AdminRewardClaimRow[];
          leaderboard?: AdminLeaderboardRow[];
        };
        setRewardClaims(rJson.claims ?? []);
        setLeaderboard(rJson.leaderboard ?? []);
      }
    } catch {
      setActionError('Unable to load protected admin records.');
    } finally {
      setLoadingWorkspace(false);
    }
  }, []);

  useEffect(() => {
    const authClient = getSupabaseBrowserAuthClient();
    let mounted = true;

    const init = async () => {
      if (!authClient) {
        await refreshStatus();
        return;
      }
      const { data } = await authClient.auth.getSession();
      const token = data.session?.access_token ?? '';
      if (!mounted) return;
      setAccessToken(token);
      const nextStatus = await refreshStatus(token || undefined);
      if (mounted && nextStatus?.authorizedAdmin && token) {
        void loadWorkspaceData(token);
      }
    };

    void init();

    if (!authClient) return;
    const { data: sub } = authClient.auth.onAuthStateChange((_event, session) => {
      const nextToken = session?.access_token ?? '';
      setAccessToken(nextToken);
      void refreshStatus(nextToken || undefined).then((nextStatus) => {
        if (nextStatus?.authorizedAdmin && nextToken) {
          void loadWorkspaceData(nextToken);
        }
      });
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [refreshStatus, loadWorkspaceData]);

  const handleSignOut = async () => {
    const authClient = getSupabaseBrowserAuthClient();
    if (authClient) {
      await authClient.auth.signOut();
    }
    setAccessToken('');
    setUsers([]);
    setAdminProducts([]);
    setOrders([]);
    setRewardClaims([]);
    setActionNotice(null);
    setActionError(null);
    await refreshStatus();
  };

  const handleToggleUserRole = async (userRow: AdminUserRow) => {
    if (!accessToken || userRow.isSuperAdmin) return;
    const nextRole = userRow.role === 'admin' ? 'customer' : 'admin';
    setActionError(null);
    setActionNotice(null);
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: userRow.id, role: nextRole }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      setActionError(json.error ?? 'Unable to update user role.');
      return;
    }
    setActionNotice(
      nextRole === 'admin'
        ? `Granted Admin SSO access to ${userRow.email}.`
        : `Revoked Admin access for ${userRow.email}.`,
    );
    await loadWorkspaceData(accessToken);
  };

  const handleSaveUserNote = async (userId: string) => {
    if (!accessToken) return;
    setActionError(null);
    setActionNotice(null);
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: userId,
        notes: noteDrafts[userId] ?? '',
      }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      setActionError(json.error ?? 'Unable to save note.');
      return;
    }
    setActionNotice('Saved internal rider note.');
    await loadWorkspaceData(accessToken);
  };

  const handleApplyMemoryPreset = async (
    userRow: AdminUserRow,
    memoryPreset:
      | 'reset'
      | 'window_shopper'
      | 'first_time_buyer'
      | 'vip_supporter'
      | 'repeat_diagnostic',
  ) => {
    if (!accessToken) return;
    setActionError(null);
    setActionNotice(null);
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: userRow.id, memoryPreset }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      setActionError(json.error ?? 'Unable to apply customer memory preset.');
      return;
    }
    setActionNotice(
      `Applied "${memoryPreset}" Dick memory preset for ${userRow.display_name || userRow.email}.`,
    );
    await loadWorkspaceData(accessToken);
  };

  const handleUploadFile = async (file: File | undefined) => {
    if (!file || !accessToken) return;
    setUploadingImage(true);
    setActionError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });
      const json = (await res.json()) as { publicUrl?: string; error?: string };
      if (!res.ok || !json.publicUrl) {
        setActionError(json.error ?? 'Image upload failed.');
        return;
      }
      setNewImageUrl(json.publicUrl);
      setActionNotice('Image uploaded to Supabase product-images bucket.');
    } catch {
      setActionError('Network error uploading product image.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreateProduct = async (e: FormEvent) => {
    e.preventDefault();
    if (!accessToken || creatingProduct) return;
    setCreatingProduct(true);
    setActionError(null);
    setActionNotice(null);
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newTitle,
          collection: newCollection,
          rack_slot: newRackSlot,
          department: newDept,
          checkout_mode: newMode,
          external_url: newMode === 'shopify_link' ? newExternalUrl : null,
          price_min: Number(newPrice),
          price_max: Number(newPrice),
          sizes: newSizes,
          colors: newColors,
          fit_notes: newFitNotes,
          image_url: newImageUrl,
          active: true,
        }),
      });
      const json = (await res.json()) as { product?: ShopProduct; error?: string };
      if (!res.ok || !json.product) {
        setActionError(json.error ?? 'Could not create product.');
        return;
      }
      setNewTitle('');
      setActionNotice(`Added "${json.product.title}" to Supabase catalog.`);
      await loadWorkspaceData(accessToken);
    } finally {
      setCreatingProduct(false);
    }
  };

  const handleToggleProductActive = async (prod: ShopProduct) => {
    if (!accessToken) return;
    const res = await fetch('/api/admin/products', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: prod.id, active: !prod.active }),
    });
    if (res.ok) {
      await loadWorkspaceData(accessToken);
    }
  };

  const handleDeleteProduct = async (prod: ShopProduct) => {
    if (!accessToken) return;
    const res = await fetch(`/api/admin/products?id=${encodeURIComponent(prod.id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      setActionNotice(`Removed "${prod.title}".`);
      await loadWorkspaceData(accessToken);
    }
  };

  const handleSaveOrderUpdate = async (orderId: string) => {
    if (!accessToken) return;
    const res = await fetch('/api/admin/orders', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: orderId,
        status: statusDrafts[orderId],
        tracking_number: trackingDrafts[orderId] ?? '',
      }),
    });
    if (res.ok) {
      setActionNotice('Updated order fulfillment status & tracking.');
      await loadWorkspaceData(accessToken);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return true;
    const bikesText = Array.isArray(u.garage_bikes)
      ? u.garage_bikes
          .map((b) => `${b.year} ${b.make} ${b.model} ${b.vin} ${b.notes}`)
          .join(' ')
          .toLowerCase()
      : '';
    return (
      u.email.toLowerCase().includes(q) ||
      u.display_name.toLowerCase().includes(q) ||
      u.mechanic_handle.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      u.phone.toLowerCase().includes(q) ||
      bikesText.includes(q)
    );
  });

  return (
    <section className="space-y-4">
      {/* Notifications */}
      {actionNotice ? (
        <div
          role="status"
          className="rounded-2xl border-3 border-black bg-emerald-200 px-4 py-3 text-xs font-black text-emerald-950"
        >
          {actionNotice}
        </div>
      ) : null}
      {actionError ? (
        <div
          role="alert"
          className="rounded-2xl border-3 border-black bg-red-100 px-4 py-3 text-xs font-black text-red-900"
        >
          {actionError}
        </div>
      ) : null}

      {/* Gate: Google & Apple SSO vs Authenticated Admin Workspace */}
      {!status?.authorizedAdmin ? (
        <div className="space-y-4 rounded-3xl border-4 border-black bg-amber-50 p-5 shadow-[6px_6px_0px_#000]">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-black uppercase text-black">
                Admin Access — Sign In with Google or Apple
              </h2>
              <p className="mt-1 text-xs font-bold text-zinc-700">
                Sign in with an owner email or any user granted Admin access in{' '}
                <code className="rounded bg-white px-1">Users &amp; Admins</code>.
              </p>
            </div>
          </div>

          {status?.authenticated && status.authError ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-black bg-amber-100 p-3 text-xs font-bold text-amber-950">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0 text-amber-800" aria-hidden="true" />
                <span>{status.authError}</span>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex min-h-12 cursor-pointer items-center gap-1.5 rounded-xl border-2 border-black bg-white px-3 text-xs font-black uppercase hover:bg-red-100"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign Out
              </button>
            </div>
          ) : null}

          <SsoSignInButtons nextPath="/admin" compact />
        </div>
      ) : (
        <div className="space-y-4 rounded-3xl border-4 border-black bg-amber-50 p-5 shadow-[6px_6px_0px_#000]">
          {/* Authenticated Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-black/15 pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-xl border-2 border-black bg-emerald-300 px-3 py-1.5 text-xs font-black text-black">
                {status.isSuperAdmin ? 'Super Admin' : 'Admin'}: {status.adminEmail}
              </span>
              <span className="text-xs font-bold text-zinc-600">
                {users.length} Registered Rider{users.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => loadWorkspaceData(accessToken)}
                disabled={loadingWorkspace}
                className="flex min-h-12 cursor-pointer items-center gap-1.5 rounded-xl border-2 border-black bg-white px-3 text-xs font-black uppercase hover:bg-zinc-100"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loadingWorkspace ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                Refresh
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex min-h-12 cursor-pointer items-center gap-1.5 rounded-xl border-2 border-black bg-white px-3 text-xs font-black uppercase hover:bg-red-100"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign Out
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { id: 'users' as const, label: `Users & Admins (${users.length})` },
              { id: 'products' as const, label: `Products & Upload (${adminProducts.length})` },
              { id: 'orders' as const, label: `Orders & DIY Queue (${orders.length})` },
              { id: 'rewards' as const, label: `Rewards & Scores (${rewardClaims.length})` },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`min-h-12 cursor-pointer rounded-2xl border-3 border-black px-4 text-xs font-black uppercase ${
                  activeTab === t.id
                    ? 'bg-zinc-900 text-amber-300 shadow-[3px_3px_0px_#000]'
                    : 'bg-white text-black hover:bg-amber-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* TAB 1: USERS & ADMIN ACCESS */}
          {activeTab === 'users' ? (
            <div className="space-y-3">
              {!memoryTableReady ? (
                <div className="rounded-2xl border-3 border-black bg-amber-200 p-3.5 text-xs font-bold text-black shadow-[3px_3px_0px_#000]">
                  Run <code>supabase/migrations/005_phase2_memory_atlas_and_racks.sql</code> in the Supabase SQL Editor to enable live <strong>Dick&apos;s Customer Memory</strong> persistence and 1-click tier testing presets.
                </div>
              ) : null}

              <search className="block">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-500"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search riders by email, name, handle, VIN, or admin role..."
                    aria-label="Search registered users"
                    className="min-h-12 w-full rounded-2xl border-3 border-black bg-white py-2 pr-4 pl-10 text-base font-bold text-black placeholder:text-zinc-400"
                  />
                </div>
              </search>

              {filteredUsers.length === 0 ? (
                <div className="rounded-2xl border-3 border-black bg-white p-6 text-center text-xs font-bold text-zinc-600">
                  No matching riders yet. Users appear here automatically the moment they sign in via Google or Apple SSO.
                </div>
              ) : (
                filteredUsers.map((usr) => {
                  const bikes = Array.isArray(usr.garage_bikes) ? usr.garage_bikes : [];
                  const memState = resolveCustomerMemoryState(
                    usr.customerMemory ?? null,
                    usr,
                  );
                  const memOrders = usr.customerMemory?.total_orders ?? usr.orderCount;
                  const memSpend =
                    usr.customerMemory?.lifetime_spend ?? usr.lifetimeSpend;
                  const memDiags = usr.customerMemory?.diagnostic_count ?? 0;
                  const memKicks = usr.customerMemory?.loiter_kick_count ?? 0;
                  return (
                    <div
                      key={usr.id}
                      className="space-y-3 rounded-2xl border-3 border-black bg-white p-4 shadow-[4px_4px_0px_#000]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Users className="h-4 w-4 text-zinc-700" aria-hidden="true" />
                            <span className="text-sm font-black text-black">
                              {usr.display_name || usr.full_name || usr.email}
                            </span>
                            <span className="rounded border border-black bg-amber-100 px-1.5 py-0.5 text-[10px] font-black uppercase">
                              {usr.auth_provider}
                            </span>
                            <span
                              className={`rounded border border-black px-2 py-0.5 text-[10px] font-black uppercase ${
                                usr.isSuperAdmin
                                  ? 'bg-emerald-400 text-black'
                                  : usr.role === 'admin'
                                    ? 'bg-sky-300 text-black'
                                    : 'bg-zinc-200 text-zinc-700'
                              }`}
                            >
                              {usr.isSuperAdmin
                                ? 'Super Admin'
                                : usr.role === 'admin'
                                  ? 'Admin'
                                  : 'Customer'}
                            </span>
                            <span
                              className={`rounded border border-black px-2 py-0.5 text-[10px] font-black uppercase ${
                                memState.tier === 'VIP_SUPPORTER'
                                  ? 'bg-amber-400 text-black'
                                  : memState.tier === 'WINDOW_SHOPPER'
                                    ? 'bg-red-200 text-red-950'
                                    : memState.tier === 'FIRST_TIME_BUYER'
                                      ? 'bg-emerald-200 text-black'
                                      : memState.tier === 'REPEAT_DIAGNOSTIC'
                                        ? 'bg-cyan-200 text-black'
                                        : 'bg-zinc-100 text-zinc-700'
                              }`}
                            >
                              Dick: {memState.tierBadge}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-zinc-600">
                            {usr.email} • Handle:{' '}
                            <span className="text-black">{usr.mechanic_handle || '—'}</span> •
                            Visits:{' '}
                            <span className="text-black">{memState.visitCount}</span> •
                            Memory Orders:{' '}
                            <span className="text-black">{memOrders}</span> ($
                            {Number(memSpend).toFixed(2)}) • Diags:{' '}
                            <span className="text-black">{memDiags}</span> • Loiter Kicks:{' '}
                            <span className="text-black">{memKicks}</span>
                          </p>
                        </div>

                        {!usr.isSuperAdmin ? (
                          <button
                            type="button"
                            onClick={() => handleToggleUserRole(usr)}
                            className={`flex min-h-12 cursor-pointer items-center gap-1.5 rounded-xl border-2 border-black px-3.5 text-xs font-black uppercase ${
                              usr.role === 'admin'
                                ? 'bg-red-100 text-red-900 hover:bg-red-200'
                                : 'bg-emerald-300 text-black hover:bg-emerald-200'
                            }`}
                          >
                            {usr.role === 'admin' ? (
                              <>
                                <ShieldOff className="h-4 w-4" aria-hidden="true" />
                                Remove Admin
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                                Make Admin (SSO)
                              </>
                            )}
                          </button>
                        ) : null}
                      </div>

                      <div className="grid gap-2 rounded-xl border border-zinc-200 bg-amber-50 p-3 text-xs font-bold sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <span className="block text-[10px] uppercase text-zinc-500">
                            Orders &amp; Spend
                          </span>
                          <span>
                            {usr.orderCount} order(s) • ${usr.lifetimeSpend.toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase text-zinc-500">
                            Flat Rate Panic
                          </span>
                          <span>
                            {usr.shiftCount} shift(s) • Best {usr.bestEfficiency.toFixed(1)}% •{' '}
                            {usr.rewardCount} promo(s)
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase text-zinc-500">
                            Contact &amp; Size
                          </span>
                          <span>
                            {usr.phone || 'No phone'} • Size {usr.shirt_size || '—'}
                            {usr.marketing_opt_in ? ' • Drops Opt-In' : ''}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase text-zinc-500">
                            Shipping City / ZIP
                          </span>
                          <span>
                            {usr.default_shipping_address?.city
                              ? `${usr.default_shipping_address.city}, ${usr.default_shipping_address.state ?? ''} ${usr.default_shipping_address.postal_code ?? ''}`
                              : 'Not saved yet'}
                          </span>
                        </div>
                      </div>

                      {bikes.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
                          {bikes.map((bk) => (
                            <span
                              key={bk.id}
                              className="inline-flex items-center gap-1 rounded-lg border border-black bg-zinc-100 px-2 py-1"
                            >
                              <Bike className="h-3.5 w-3.5 text-red-700" aria-hidden="true" />
                              {[bk.year, bk.make, bk.model].filter(Boolean).join(' ')}
                              {bk.vin ? ` (${bk.vin})` : ''}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          aria-label={`Internal admin note for ${usr.email}`}
                          placeholder="Internal customer note (bike preferences, promo notes, VIP status...)"
                          value={noteDrafts[usr.id] ?? ''}
                          onChange={(e) =>
                            setNoteDrafts((prev) => ({
                              ...prev,
                              [usr.id]: e.target.value,
                            }))
                          }
                          className="min-h-12 min-w-[220px] flex-1 rounded-xl border-2 border-black bg-white px-3 text-base font-bold"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveUserNote(usr.id)}
                          className="min-h-12 cursor-pointer rounded-xl border-2 border-black bg-amber-300 px-4 text-xs font-black uppercase hover:bg-amber-200"
                        >
                          Save Note
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-dashed border-black/30 bg-zinc-50 px-3 py-2 text-[11px] font-bold">
                        <span className="mr-1 font-black uppercase text-zinc-600">
                          Test Dick&apos;s Tier:
                        </span>
                        {(
                          [
                            ['reset', 'Reset'],
                            ['window_shopper', 'Window Shopper'],
                            ['first_time_buyer', 'Buyer'],
                            ['vip_supporter', 'VIP'],
                            ['repeat_diagnostic', 'Repeat Diag'],
                          ] as const
                        ).map(([presetKey, label]) => (
                          <button
                            key={presetKey}
                            type="button"
                            disabled={!memoryTableReady}
                            onClick={() => handleApplyMemoryPreset(usr, presetKey)}
                            className="cursor-pointer rounded-lg border-2 border-black bg-white px-2.5 py-1 text-[10px] font-black uppercase text-black hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : null}

          {/* TAB 2: PRODUCTS CRUD + UPLOAD */}
          {activeTab === 'products' ? (
            <div className="space-y-5">
              <form
                onSubmit={handleCreateProduct}
                className="rounded-2xl border-3 border-black bg-white p-4 shadow-[4px_4px_0px_#000]"
              >
                <fieldset className="space-y-3">
                  <legend className="text-sm font-black uppercase text-black">
                    Add New Product (Direct Stripe or Shopify Link)
                  </legend>

                  <div className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-dashed border-black/30 bg-amber-50 p-2.5">
                    <span className="text-[11px] font-black uppercase text-zinc-600">
                      Quick-Fill Starters:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setNewTitle('Hard R Cycles Die-Cut Garage Slap Sticker Pack');
                        setNewCollection('Hard R Originals');
                        setNewRackSlot('hard_r_originals');
                        setNewDept('PARTS');
                        setNewMode('stripe_diy');
                        setNewExternalUrl('');
                        setNewPrice('9.99');
                        setNewSizes('3-Pack');
                        setNewColors('Black/White');
                        setNewFitNotes('Heavy matte UV-resistant vinyl slap pack. Ships straight from the shop bench.');
                      }}
                      className="min-h-12 cursor-pointer rounded-xl border-2 border-black bg-white px-3 text-xs font-black uppercase hover:bg-amber-200"
                    >
                      Sticker Pack ($9.99 DIY)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewTitle('Hard R Cycles Stencil Shop Tee');
                        setNewCollection('Hard R Originals');
                        setNewRackSlot('hard_r_originals');
                        setNewDept('APPAREL');
                        setNewMode('stripe_diy');
                        setNewExternalUrl('');
                        setNewPrice('34.99');
                        setNewSizes('S, M, L, XL, 2XL, 3XL');
                        setNewColors('Jet Black, Oil Charcoal');
                        setNewFitNotes('6.5oz heavyweight combed ring-spun shop tee.');
                      }}
                      className="min-h-12 cursor-pointer rounded-xl border-2 border-black bg-white px-3 text-xs font-black uppercase hover:bg-amber-200"
                    >
                      Logo Shop Tee ($34.99 DIY)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewTitle('Hard R Cycles Heavyweight Stencil Shop Hoodie');
                        setNewCollection('Hard R Originals');
                        setNewRackSlot('hard_r_originals');
                        setNewDept('APPAREL');
                        setNewMode('stripe_pod');
                        setNewExternalUrl('');
                        setNewPrice('64.99');
                        setNewSizes('S, M, L, XL, 2XL, 3XL');
                        setNewColors('Black, Charcoal Heather');
                        setNewFitNotes('10oz fleece-lined garage hoodie printed on demand.');
                      }}
                      className="min-h-12 cursor-pointer rounded-xl border-2 border-black bg-white px-3 text-xs font-black uppercase hover:bg-amber-200"
                    >
                      Stencil Hoodie ($64.99 POD)
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <label htmlFor="prod-title" className="mb-1 block text-xs font-black uppercase">
                        Title
                      </label>
                      <input
                        id="prod-title"
                        type="text"
                        required
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Hard R Shop Grease Rag Tee"
                        className="form-control min-h-12 w-full rounded-xl border-2 border-black bg-white px-3 text-base font-bold"
                      />
                    </div>
                    <div>
                      <label htmlFor="prod-collection" className="mb-1 block text-xs font-black uppercase">
                        Collection Label
                      </label>
                      <input
                        id="prod-collection"
                        type="text"
                        value={newCollection}
                        onChange={(e) => setNewCollection(e.target.value)}
                        className="form-control min-h-12 w-full rounded-xl border-2 border-black bg-white px-3 text-base font-bold"
                      />
                    </div>
                    <div>
                      <label htmlFor="prod-price" className="mb-1 block text-xs font-black uppercase">
                        Price (USD)
                      </label>
                      <input
                        id="prod-price"
                        type="number"
                        step="0.01"
                        min="1"
                        required
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        className="form-control min-h-12 w-full rounded-xl border-2 border-black bg-white px-3 text-base font-bold"
                      />
                    </div>
                    <div>
                      <label htmlFor="prod-rack" className="mb-1 block text-xs font-black uppercase">
                        Rack Slot
                      </label>
                      <select
                        id="prod-rack"
                        value={newRackSlot}
                        onChange={(e) => setNewRackSlot(e.target.value as RackSlot)}
                        className="min-h-12 w-full rounded-xl border-2 border-black bg-white px-3 text-base font-bold"
                      >
                        <option value="hard_r_originals">Hard R Originals</option>
                        <option value="episode_drops">Episode Drops</option>
                        <option value="vip_secret_stash">VIP Secret Stash</option>
                        <option value="motophile_partner">Motophile Partner Rack</option>
                        <option value="rack_1_humor">Rack 1: Humor</option>
                        <option value="rack_2_definition">Rack 2: Definition</option>
                        <option value="wall_braap">Wall: Braap</option>
                        <option value="parts_shelf">Parts Shelf</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="prod-dept" className="mb-1 block text-xs font-black uppercase">
                        Department
                      </label>
                      <select
                        id="prod-dept"
                        value={newDept}
                        onChange={(e) => setNewDept(e.target.value as ShopDepartment)}
                        className="min-h-12 w-full rounded-xl border-2 border-black bg-white px-3 text-base font-bold"
                      >
                        <option value="APPAREL">APPAREL</option>
                        <option value="PARTS">PARTS</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="prod-mode" className="mb-1 block text-xs font-black uppercase">
                        Checkout &amp; Fulfillment
                      </label>
                      <select
                        id="prod-mode"
                        value={newMode}
                        onChange={(e) => setNewMode(e.target.value as CheckoutMode)}
                        className="min-h-12 w-full rounded-xl border-2 border-black bg-white px-3 text-base font-bold"
                      >
                        <option value="stripe_diy">Stripe Direct (DIY Stock)</option>
                        <option value="stripe_pod">Stripe Direct (POD Printful)</option>
                        <option value="shopify_link">External Shopify Link</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="prod-sizes" className="mb-1 block text-xs font-black uppercase">
                        Sizes (comma separated)
                      </label>
                      <input
                        id="prod-sizes"
                        type="text"
                        value={newSizes}
                        onChange={(e) => setNewSizes(e.target.value)}
                        className="min-h-12 w-full rounded-xl border-2 border-black bg-white px-3 text-base font-bold"
                      />
                    </div>
                    <div>
                      <label htmlFor="prod-colors" className="mb-1 block text-xs font-black uppercase">
                        Colors (comma separated)
                      </label>
                      <input
                        id="prod-colors"
                        type="text"
                        value={newColors}
                        onChange={(e) => setNewColors(e.target.value)}
                        className="min-h-12 w-full rounded-xl border-2 border-black bg-white px-3 text-base font-bold"
                      />
                    </div>
                    <div>
                      <label htmlFor="prod-fit" className="mb-1 block text-xs font-black uppercase">
                        Fit / Description Notes
                      </label>
                      <input
                        id="prod-fit"
                        type="text"
                        value={newFitNotes}
                        onChange={(e) => setNewFitNotes(e.target.value)}
                        className="min-h-12 w-full rounded-xl border-2 border-black bg-white px-3 text-base font-bold"
                      />
                    </div>
                  </div>

                  {newMode === 'shopify_link' ? (
                    <div>
                      <label htmlFor="prod-url" className="mb-1 block text-xs font-black uppercase">
                        Shopify External URL
                      </label>
                      <input
                        id="prod-url"
                        type="url"
                        required
                        value={newExternalUrl}
                        onChange={(e) => setNewExternalUrl(e.target.value)}
                        placeholder="https://motophileusa.com/products/..."
                        className="form-control min-h-12 w-full rounded-xl border-2 border-black bg-white px-3 text-base font-bold"
                      />
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-[240px] flex-1">
                      <label htmlFor="prod-img-url" className="mb-1 block text-xs font-black uppercase">
                        Image URL or Upload to Storage
                      </label>
                      <input
                        id="prod-img-url"
                        type="text"
                        value={newImageUrl}
                        onChange={(e) => setNewImageUrl(e.target.value)}
                        className="min-h-12 w-full rounded-xl border-2 border-black bg-white px-3 text-base font-bold"
                      />
                    </div>
                    <label className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border-2 border-black bg-amber-200 px-4 text-xs font-black uppercase hover:bg-amber-300">
                      <Upload className="h-4 w-4" aria-hidden="true" />
                      <span>{uploadingImage ? 'Uploading...' : 'Upload Image'}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={(e) => {
                          void handleUploadFile(e.target.files?.[0]);
                        }}
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={creatingProduct}
                      className="flex min-h-12 cursor-pointer items-center gap-1.5 rounded-xl border-3 border-black bg-emerald-400 px-5 text-xs font-black uppercase text-black shadow-[3px_3px_0px_#000] hover:bg-emerald-300"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      {creatingProduct ? 'Saving...' : 'Add Product'}
                    </button>
                  </div>
                </fieldset>
              </form>

              <div className="space-y-2">
                {adminProducts.map((prod) => (
                  <div
                    key={prod.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-black bg-white px-3.5 py-2.5 text-xs"
                  >
                    <div>
                      <span className="font-black text-black">{prod.title}</span>
                      <span className="ml-2 rounded border border-black bg-amber-100 px-1.5 py-0.5 text-[10px] font-black">
                        {prod.checkout_mode} • ${Number(prod.price_min).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleProductActive(prod)}
                        className={`min-h-12 cursor-pointer rounded-xl border-2 border-black px-3 text-[11px] font-black uppercase ${
                          prod.active ? 'bg-emerald-200 text-black' : 'bg-zinc-200 text-zinc-700'
                        }`}
                      >
                        {prod.active ? 'Active' : 'Hidden'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(prod)}
                        aria-label={`Delete ${prod.title}`}
                        className="flex min-h-12 min-w-12 cursor-pointer items-center justify-center rounded-xl border-2 border-black bg-red-100 text-red-700 hover:bg-red-200"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* TAB 2: ORDERS & DIY PACKING LIST */}
          {activeTab === 'orders' ? (
            <div className="space-y-3">
              {orders.length === 0 ? (
                <div className="rounded-2xl border-3 border-black bg-white p-6 text-center text-xs font-bold text-zinc-600">
                  No direct Stripe orders yet. Once customers check out from the Cart, DIY &amp; POD packing tickets appear here automatically.
                </div>
              ) : (
                orders.map((ord) => (
                  <div
                    key={ord.id}
                    className="space-y-2.5 rounded-2xl border-3 border-black bg-white p-4 shadow-[4px_4px_0px_#000]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 font-black">
                        <Package className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                        <span>{ord.shipping_name || ord.customer_email}</span>
                        <span className="rounded border border-black bg-cyan-200 px-1.5 py-0.5 text-[10px] uppercase">
                          {ord.fulfillment_mode}
                        </span>
                      </div>
                      <span className="font-black text-emerald-700">
                        Total ${Number(ord.total).toFixed(2)} {ord.currency.toUpperCase()}
                      </span>
                    </div>

                    {ord.shipping_address ? (
                      <p className="text-[11px] font-bold text-zinc-600">
                        Ship To: {ord.shipping_address.line1}, {ord.shipping_address.city},{' '}
                        {ord.shipping_address.state} {ord.shipping_address.postal_code}{' '}
                        {ord.shipping_address.country}
                      </p>
                    ) : null}

                    <ul className="space-y-1 rounded-xl border border-zinc-300 bg-amber-50 p-2.5 text-xs font-bold">
                      {ord.items.map((item, idx) => (
                        <li key={`${ord.id}-item-${idx}`}>
                          {item.quantity}x {item.title} ({item.size || 'One Size'} /{' '}
                          {item.color || 'Standard'})
                        </li>
                      ))}
                    </ul>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        aria-label={`Order ${ord.id} status`}
                        value={statusDrafts[ord.id] ?? ord.status}
                        onChange={(e) =>
                          setStatusDrafts((prev) => ({
                            ...prev,
                            [ord.id]: e.target.value as AdminOrderRow['status'],
                          }))
                        }
                        className="min-h-12 rounded-xl border-2 border-black bg-white px-3 text-base font-bold"
                      >
                        <option value="paid">paid</option>
                        <option value="fulfilling">fulfilling</option>
                        <option value="shipped">shipped</option>
                        <option value="cancelled">cancelled</option>
                        <option value="refunded">refunded</option>
                      </select>

                      <input
                        type="text"
                        aria-label={`Tracking number for ${ord.id}`}
                        placeholder="USPS / UPS Tracking #"
                        value={trackingDrafts[ord.id] ?? ''}
                        onChange={(e) =>
                          setTrackingDrafts((prev) => ({
                            ...prev,
                            [ord.id]: e.target.value,
                          }))
                        }
                        className="min-h-12 min-w-[200px] flex-1 rounded-xl border-2 border-black bg-white px-3 text-base font-bold"
                      />

                      <button
                        type="button"
                        onClick={() => handleSaveOrderUpdate(ord.id)}
                        className="min-h-12 cursor-pointer rounded-xl border-2 border-black bg-amber-300 px-4 text-xs font-black uppercase hover:bg-amber-200"
                      >
                        Save Packing Update
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : null}

          {/* TAB 3: REWARDS & LEADERBOARD */}
          {activeTab === 'rewards' ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border-3 border-black bg-white p-4">
                <h3 className="flex items-center gap-1.5 text-sm font-black uppercase">
                  <Gift className="h-4 w-4 text-red-700" aria-hidden="true" />
                  Issued Shop Discount Codes
                </h3>
                {rewardClaims.length === 0 ? (
                  <p className="mt-2 text-xs font-bold text-zinc-500">
                    No Flat Rate Panic codes claimed yet.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2 text-xs">
                    {rewardClaims.map((rc) => (
                      <li
                        key={rc.id}
                        className="flex items-center justify-between rounded-xl border border-black bg-amber-50 px-3 py-2 font-bold"
                      >
                        <div>
                          <code className="font-black text-black">{rc.promo_code}</code>
                          <span className="ml-2 text-zinc-600">
                            {rc.mechanic_name} ({Number(rc.efficiency_rating).toFixed(1)}%)
                          </span>
                        </div>
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-black uppercase ${
                            rc.redeemed ? 'bg-zinc-300 text-zinc-700' : 'bg-emerald-300 text-black'
                          }`}
                        >
                          {rc.redeemed ? 'Redeemed' : `${rc.discount_percent}% Active`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-2xl border-3 border-black bg-white p-4">
                <h3 className="text-sm font-black uppercase">Top Shift Repair Orders</h3>
                <ul className="mt-2 space-y-1.5 text-xs">
                  {leaderboard.map((row, idx) => (
                    <li
                      key={row.id}
                      className="flex items-center justify-between rounded-xl border border-zinc-200 px-3 py-2 font-bold"
                    >
                      <span>
                        #{idx + 1} {row.mechanic_name} ({row.rank_badge})
                      </span>
                      <span className="font-black text-emerald-700">
                        {Number(row.efficiency_rating).toFixed(1)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
