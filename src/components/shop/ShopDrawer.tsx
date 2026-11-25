'use client';

import {
  CheckCircle2,
  ExternalLink,
  Lock,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Tag,
  Trash2,
  Truck,
  Wrench,
  X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  VIP_ORDER_THRESHOLD,
  VIP_SPEND_THRESHOLD,
  resolveCustomerMemoryState,
} from '@/features/npc-memory/resolver';
import { useShopStore } from '@/store/useShopStore';
import type { RackFilter, ShopProduct } from '@/types/shop';
import { withSpriteVersion } from '@/utils/spriteVersion';

const RACK_TABS: { id: RackFilter; label: string }[] = [
  { id: 'ALL', label: 'All Merch' },
  { id: 'hard_r_originals', label: 'Hard R Originals' },
  { id: 'vip_secret_stash', label: 'VIP Stash' },
  { id: 'rack_1_humor', label: 'Rack 1: Humor' },
  { id: 'rack_2_definition', label: 'Rack 2: Definition' },
  { id: 'wall_braap', label: 'Wall: Braap' },
];

const FREE_SHIPPING_THRESHOLD = 125;
const FLAT_SHIPPING_COST = 9.95;

function ProductCatalogCard({
  product,
  featured = false,
}: {
  product: ShopProduct;
  featured?: boolean;
}) {
  const addToCart = useShopStore((s) => s.addToCart);
  const defaultSize = product.sizes[0] ?? 'One Size';
  const defaultColor = product.colors[0] ?? 'Standard';
  const [selectedSize, setSelectedSize] = useState(defaultSize);
  const [selectedColor, setSelectedColor] = useState(defaultColor);
  const [addedPulse, setAddedPulse] = useState(false);
  const isDirectStripe =
    product.checkout_mode === 'stripe_diy' || product.checkout_mode === 'stripe_pod';

  const handleAdd = () => {
    addToCart({
      handle: product.handle,
      title: product.title,
      image_url: product.image_url,
      unitPrice: product.price_min,
      size: selectedSize,
      color: selectedColor,
      checkoutMode: product.checkout_mode,
    });
    setAddedPulse(true);
    window.setTimeout(() => setAddedPulse(false), 1600);
  };

  return (
    <article
      className={`flex gap-3 rounded-2xl border-3 p-3 shadow-[4px_4px_0px_#000] ${
        featured
          ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-400'
          : 'border-black bg-white'
      }`}
    >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border-2 border-black bg-zinc-100">
        <Image src={product.image_url} alt={product.title} fill className="object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-1.5">
          <div className="flex flex-wrap items-center gap-1">
            {featured ? (
              <span className="rounded border border-black bg-orange-500 px-1.5 py-0.5 text-[10px] font-black uppercase text-white">
                Featured Drop
              </span>
            ) : null}
            <span className="rounded border border-black bg-amber-200 px-1.5 py-0.5 text-[10px] font-black uppercase text-black">
              {product.collection}
            </span>
            {product.checkout_mode === 'stripe_diy' ? (
              <span className="rounded border border-black bg-cyan-200 px-1.5 py-0.5 text-[10px] font-black uppercase text-black">
                Shop Stocked
              </span>
            ) : product.checkout_mode === 'stripe_pod' ? (
              <span className="rounded border border-black bg-purple-200 px-1.5 py-0.5 text-[10px] font-black uppercase text-black">
                Made to Order
              </span>
            ) : null}
          </div>
          <span className="shrink-0 text-xs font-black text-emerald-700">
            {product.price_min === product.price_max
              ? `$${product.price_min.toFixed(2)}`
              : `$${product.price_min.toFixed(2)}–$${product.price_max.toFixed(2)}`}
          </span>
        </div>

        <h2 className="mt-1 text-sm font-black leading-tight text-black">
          {product.title}
        </h2>
        <p className="mt-1 text-[11px] font-semibold text-zinc-600">
          {product.fit_notes}
        </p>

        {isDirectStripe ? (
          <div className="mt-2 space-y-1.5">
            {product.sizes.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[10px] font-black uppercase text-zinc-500">Size:</span>
                {product.sizes.map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    aria-pressed={selectedSize === sz}
                    onClick={() => setSelectedSize(sz)}
                    className={`cursor-pointer rounded border px-1.5 py-0.5 text-[10px] font-black ${
                      selectedSize === sz
                        ? 'border-black bg-black text-amber-300'
                        : 'border-zinc-300 bg-zinc-100 text-zinc-800 hover:bg-zinc-200'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            ) : null}

            {product.colors.length > 1 ? (
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[10px] font-black uppercase text-zinc-500">Color:</span>
                {product.colors.map((clr) => (
                  <button
                    key={clr}
                    type="button"
                    aria-pressed={selectedColor === clr}
                    onClick={() => setSelectedColor(clr)}
                    className={`cursor-pointer rounded border px-1.5 py-0.5 text-[10px] font-black ${
                      selectedColor === clr
                        ? 'border-black bg-amber-300 text-black'
                        : 'border-zinc-300 bg-zinc-100 text-zinc-800 hover:bg-zinc-200'
                    }`}
                  >
                    {clr}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleAdd}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border-2 border-black bg-amber-400 px-3 py-1.5 text-xs font-black uppercase text-black shadow-[2px_2px_0px_#000] hover:bg-amber-300"
              >
                {addedPulse ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Added to Cart
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
                    Add to Cart
                  </>
                )}
              </button>
              {addedPulse ? (
                <button
                  type="button"
                  onClick={() => useShopStore.getState().setOpenDrawer('CART')}
                  className="cursor-pointer rounded-xl border-2 border-black bg-black px-2.5 py-1.5 text-[11px] font-black uppercase text-amber-300 hover:bg-zinc-800"
                >
                  Open Cart →
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {product.sizes.map((sz) => (
                <span
                  key={sz}
                  className="rounded border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 text-[10px] font-black text-zinc-800"
                >
                  {sz}
                </span>
              ))}
            </div>
            {product.external_url ? (
              <a
                href={product.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl border-2 border-black bg-emerald-400 px-3 py-1.5 text-xs font-black uppercase text-black shadow-[2px_2px_0px_#000] hover:bg-emerald-300"
              >
                Buy on Shopify
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            ) : null}
          </>
        )}
      </div>
    </article>
  );
}

export function ShopDrawer() {
  const hasHydrated = useShopStore((s) => s.hasHydrated);
  const openDrawer = useShopStore((s) => s.openDrawer);
  const activeRackFilter = useShopStore((s) => s.activeRackFilter);
  const products = useShopStore((s) => s.products);
  const productsSource = useShopStore((s) => s.productsSource);
  const cart = useShopStore((s) => s.cart);
  const appliedPromoCode = useShopStore((s) => s.appliedPromoCode);
  const unlockedRewards = useShopStore((s) => s.unlockedRewards);
  const highlightedDropHandle = useShopStore((s) => s.highlightedDropHandle);
  const highlightedDropQuery = useShopStore((s) => s.highlightedDropQuery);
  const customerMemory = useShopStore((s) => s.customerMemory);
  const userProfile = useShopStore((s) => s.userProfile);
  const userOrders = useShopStore((s) => s.userOrders);

  const memState = useMemo(
    () => resolveCustomerMemoryState(customerMemory, userProfile, userOrders),
    [customerMemory, userProfile, userOrders],
  );

  const [query, setQuery] = useState('');
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const isOpen =
    openDrawer === 'APPAREL' ||
    openDrawer === 'PARTS' ||
    openDrawer === 'QUICK_SHOP' ||
    openDrawer === 'CART';

  const cartItemCount = hasHydrated
    ? cart.reduce((sum, item) => sum + item.quantity, 0)
    : 0;
  const cartSubtotal = hasHydrated
    ? cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    : 0;
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - cartSubtotal);

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
      const sheet = dialog.querySelector('[data-drawer-sheet="true"]');
      if (!sheet) return false;
      const r = sheet.getBoundingClientRect();
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

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = products.filter((p) => {
      if (!p.active) return false;
      if (p.rack_slot === 'vip_secret_stash' && !memState.hasVipAccess) {
        return false;
      }
      if (openDrawer === 'PARTS' && activeRackFilter === 'ALL') {
        return p.department === 'PARTS' || p.rack_slot === 'hard_r_originals';
      }
      if (activeRackFilter !== 'ALL' && p.rack_slot !== activeRackFilter) {
        return false;
      }
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.collection.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    });

    if (highlightedDropHandle) {
      return [...list].sort((a, b) => {
        if (a.handle === highlightedDropHandle && b.handle !== highlightedDropHandle) {
          return -1;
        }
        if (b.handle === highlightedDropHandle && a.handle !== highlightedDropHandle) {
          return 1;
        }
        return 0;
      });
    }

    return list;
  }, [
    products,
    openDrawer,
    activeRackFilter,
    query,
    highlightedDropHandle,
    memState.hasVipAccess,
  ]);

  const handleClose = () => {
    useShopStore.getState().setOpenDrawer(null);
  };

  const handleStripeCheckout = async () => {
    if (cart.length === 0 || checkoutBusy) return;
    setCheckoutBusy(true);
    setCheckoutError(null);
    try {
      const token = useShopStore.getState().authAccessToken;
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          items: cart.map((item) => ({
            handle: item.handle,
            quantity: item.quantity,
            size: item.size,
            color: item.color,
          })),
          promoCode: appliedPromoCode || undefined,
        }),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        setCheckoutError(
          json.error ?? 'Could not initialize Stripe Checkout. Please try again.',
        );
        return;
      }
      window.location.href = json.url;
    } catch {
      setCheckoutError('Network error reaching checkout service. Please try again.');
    } finally {
      setCheckoutBusy(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby="shop-drawer-title"
      onClose={(e) => {
        e.currentTarget.returnValue = '';
        if (useShopStore.getState().openDrawer !== null) {
          useShopStore.getState().setOpenDrawer(null);
        }
      }}
      className="m-0 ml-auto h-dvh max-h-none w-[min(94dvw,500px)] max-w-none overflow-visible border-0 bg-transparent p-0 text-black"
    >
      <div
        data-drawer-sheet="true"
        className="flex h-full w-full flex-col border-l-4 border-black bg-amber-50 shadow-[-10px_0px_0px_#000]"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b-4 border-black bg-zinc-900 px-4 py-3 text-white">
          <div className="flex items-center gap-2.5">
            {openDrawer === 'CART' ? (
              <ShoppingCart className="h-5 w-5 text-amber-300" aria-hidden="true" />
            ) : openDrawer === 'PARTS' ? (
              <Wrench className="h-5 w-5 text-amber-300" aria-hidden="true" />
            ) : (
              <ShoppingBag className="h-5 w-5 text-amber-300" aria-hidden="true" />
            )}
            <div>
              <h1 id="shop-drawer-title" className="text-lg font-black uppercase leading-none">
                {openDrawer === 'CART'
                  ? `Shop Bag (${cartItemCount})`
                  : openDrawer === 'PARTS'
                    ? 'Parts & Hard R Originals'
                    : openDrawer === 'QUICK_SHOP'
                      ? 'Quick Shop Catalog'
                      : "V's Apparel Racks"}
              </h1>
              <p className="mt-0.5 text-[11px] font-bold text-zinc-400">
                {productsSource === 'supabase'
                  ? `${products.length} live items via Supabase`
                  : `${products.length} stocked shop items`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                useShopStore
                  .getState()
                  .setOpenDrawer(openDrawer === 'CART' ? 'APPAREL' : 'CART')
              }
              className="flex cursor-pointer items-center gap-1 rounded-xl border-2 border-white bg-amber-400 px-2.5 py-1.5 text-xs font-black uppercase text-black hover:bg-amber-300"
            >
              {openDrawer === 'CART' ? (
                <span>Browse Merch</span>
              ) : (
                <>
                  <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Cart ({cartItemCount})</span>
                </>
              )}
            </button>

            <button
              type="button"
              autoFocus
              onClick={handleClose}
              aria-label="Close catalog drawer"
              className="flex cursor-pointer items-center justify-center rounded-xl border-2 border-white bg-zinc-800 p-2 text-white hover:bg-red-600"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Cart View */}
        {openDrawer === 'CART' ? (
          <div className="flex flex-1 flex-col overflow-y-auto p-3 sm:p-4">
            {/* Free shipping meter */}
            <div className="rounded-2xl border-3 border-black bg-white p-3 shadow-[3px_3px_0px_#000]">
              <div className="flex items-center justify-between text-xs font-black">
                <span className="flex items-center gap-1.5">
                  <Truck className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                  {remainingForFreeShipping === 0
                    ? 'FREE Garage Ground Shipping Unlocked!'
                    : `$${remainingForFreeShipping.toFixed(2)} away from FREE shipping ($125+)`}
                </span>
                <span className="text-zinc-600">
                  Flat ${FLAT_SHIPPING_COST.toFixed(2)}
                </span>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full border-2 border-black bg-zinc-200">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{
                    width: `${Math.min(100, (cartSubtotal / FREE_SHIPPING_THRESHOLD) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Cart items */}
            <div className="mt-3 flex-1 space-y-2.5">
              {!hasHydrated ? null : cart.length === 0 ? (
                <div className="rounded-2xl border-3 border-black bg-white p-6 text-center">
                  <p className="text-sm font-black uppercase text-zinc-700">
                    Your Direct Bag Is Empty
                  </p>
                  <p className="mt-1 text-xs font-bold text-zinc-500">
                    Add Hard R Originals (stocked merch &amp; POD gear) here, or shop MotophileUSA partner shirts directly from any rack.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      useShopStore.getState().setOpenDrawer('APPAREL', 'hard_r_originals')
                    }
                    className="mt-4 cursor-pointer rounded-xl border-3 border-black bg-amber-300 px-4 py-2 text-xs font-black uppercase text-black shadow-[3px_3px_0px_#000] hover:bg-amber-200"
                  >
                    Browse Hard R Originals
                  </button>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={`${item.handle}-${item.size}-${item.color}`}
                    className="flex gap-3 rounded-2xl border-3 border-black bg-white p-3 shadow-[3px_3px_0px_#000]"
                  >
                    <div className="relative h-18 w-18 shrink-0 overflow-hidden rounded-xl border-2 border-black bg-zinc-100">
                      <Image
                        src={item.image_url}
                        alt={item.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-xs font-black text-black">{item.title}</h3>
                        <button
                          type="button"
                          onClick={() =>
                            useShopStore
                              .getState()
                              .removeFromCart(item.handle, item.size, item.color)
                          }
                          aria-label={`Remove ${item.title}`}
                          className="cursor-pointer rounded-lg border border-zinc-300 p-1 text-zinc-500 hover:bg-red-100 hover:text-red-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                      <p className="mt-0.5 text-[11px] font-bold text-zinc-500">
                        {item.size} • {item.color}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="inline-flex items-center gap-1 rounded-lg border-2 border-black bg-zinc-100 px-1 py-0.5">
                          <button
                            type="button"
                            aria-label="Decrease quantity"
                            onClick={() =>
                              useShopStore
                                .getState()
                                .updateCartQuantity(
                                  item.handle,
                                  item.size,
                                  item.color,
                                  item.quantity - 1,
                                )
                            }
                            className="cursor-pointer rounded p-1 hover:bg-white"
                          >
                            <Minus className="h-3 w-3" aria-hidden="true" />
                          </button>
                          <span className="min-w-5 text-center text-xs font-black">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            aria-label="Increase quantity"
                            onClick={() =>
                              useShopStore
                                .getState()
                                .updateCartQuantity(
                                  item.handle,
                                  item.size,
                                  item.color,
                                  item.quantity + 1,
                                )
                            }
                            className="cursor-pointer rounded p-1 hover:bg-white"
                          >
                            <Plus className="h-3 w-3" aria-hidden="true" />
                          </button>
                        </div>
                        <span className="text-xs font-black text-emerald-700">
                          ${(item.unitPrice * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Unlocked Flat Rate Panic Rewards & Promo Input */}
            <div className="mt-4 space-y-2.5 border-t-3 border-black pt-3">
              {hasHydrated && unlockedRewards.length > 0 ? (
                <div className="rounded-xl border-2 border-black bg-emerald-50 p-2.5">
                  <p className="text-[10px] font-black uppercase text-emerald-800">
                    Your Unlocked Flat Rate Panic Discounts
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {unlockedRewards.map((rw) => (
                      <button
                        key={rw.promoCode}
                        type="button"
                        onClick={() =>
                          useShopStore.getState().setAppliedPromoCode(rw.promoCode)
                        }
                        className={`cursor-pointer rounded-lg border-2 border-black px-2 py-1 text-[11px] font-black ${
                          appliedPromoCode === rw.promoCode
                            ? 'bg-emerald-500 text-white'
                            : 'bg-white text-black hover:bg-emerald-100'
                        }`}
                      >
                        {rw.promoCode} ({rw.discountPercent}% OFF)
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div>
                <label
                  htmlFor="cart-promo-input"
                  className="mb-1 flex items-center gap-1 text-[11px] font-black uppercase text-zinc-700"
                >
                  <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                  Promo / Shift Reward Code
                </label>
                <input
                  id="cart-promo-input"
                  type="text"
                  value={appliedPromoCode}
                  onChange={(e) =>
                    useShopStore.getState().setAppliedPromoCode(e.target.value)
                  }
                  placeholder="FLATRATE-10-XXXXXX"
                  className="w-full rounded-xl border-3 border-black bg-white px-3 py-2 text-sm font-black uppercase text-black placeholder:font-semibold placeholder:normal-case placeholder:text-zinc-400"
                />
              </div>

              {checkoutError ? (
                <div
                  role="alert"
                  className="rounded-xl border-2 border-red-700 bg-red-50 px-3 py-2 text-xs font-bold text-red-800"
                >
                  {checkoutError}
                </div>
              ) : null}

              <div className="flex items-center justify-between text-sm font-black">
                <span>Subtotal</span>
                <span>${cartSubtotal.toFixed(2)}</span>
              </div>

              <button
                type="button"
                disabled={cart.length === 0 || checkoutBusy}
                onClick={handleStripeCheckout}
                className="w-full cursor-pointer rounded-2xl border-4 border-black bg-emerald-400 py-3 text-sm font-black uppercase text-black shadow-[4px_4px_0px_#000] hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {checkoutBusy ? 'Connecting to Stripe...' : 'Checkout with Stripe →'}
              </button>

              <nav
                aria-label="Checkout policies"
                className="flex flex-wrap items-center justify-center gap-2.5 pt-1 text-[10px] font-black uppercase text-zinc-500"
              >
                <Link
                  href="/shipping-returns"
                  onClick={() => useShopStore.getState().setOpenDrawer(null)}
                  className="underline hover:text-black"
                >
                  Shipping &amp; Returns
                </Link>
                <span>•</span>
                <Link
                  href="/terms"
                  onClick={() => useShopStore.getState().setOpenDrawer(null)}
                  className="underline hover:text-black"
                >
                  Terms
                </Link>
                <span>•</span>
                <Link
                  href="/privacy"
                  onClick={() => useShopStore.getState().setOpenDrawer(null)}
                  className="underline hover:text-black"
                >
                  Privacy
                </Link>
              </nav>
            </div>
          </div>
        ) : (
          <>
            {/* Search & Rack Filters */}
            <search className="block border-b-3 border-black bg-amber-100 p-3">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search tees, hoodies, Dyna, Braap..."
                  aria-label="Search shop catalog"
                  className="w-full rounded-xl border-3 border-black bg-white py-2 pr-3 pl-9 text-sm font-bold text-black placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {RACK_TABS.map((tab) => {
                  const active = activeRackFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => useShopStore.getState().setActiveRackFilter(tab.id)}
                      className={`cursor-pointer rounded-lg border-2 border-black px-2.5 py-1 text-[11px] font-black uppercase transition-colors ${
                        active
                          ? 'bg-amber-300 text-black shadow-[2px_2px_0px_#000]'
                          : 'bg-white text-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </search>

            {/* Product List */}
            <div className="flex-1 space-y-3 overflow-y-auto p-3 sm:p-4">
              {activeRackFilter === 'vip_secret_stash' && memState.hasVipAccess ? (
                <div className="flex items-center gap-2.5 rounded-2xl border-3 border-black bg-amber-300 px-3.5 py-2.5 text-xs font-black text-black shadow-[3px_3px_0px_#000]">
                  <Sparkles className="h-4 w-4 shrink-0 text-black" aria-hidden="true" />
                  <span>
                    VIP Secret Stash Unlocked for {memState.riderName}! Dick kept the good stuff off the public floor.
                  </span>
                </div>
              ) : null}

              {highlightedDropQuery && !highlightedDropHandle ? (
                <div className="flex items-center justify-between gap-2 rounded-2xl border-2 border-black bg-amber-200 px-3 py-2 text-xs font-bold text-black shadow-[3px_3px_0px_#000]">
                  <span>
                    Drop Link: <strong>{highlightedDropQuery}</strong> — Browse the latest drops &amp; stocked gear below.
                  </span>
                  <button
                    type="button"
                    onClick={() => useShopStore.getState().setHighlightedDrop(null, null)}
                    aria-label="Dismiss drop notice"
                    className="shrink-0 cursor-pointer rounded-lg border border-black bg-white p-1 text-black hover:bg-zinc-200"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              ) : null}

              {activeRackFilter === 'vip_secret_stash' && !memState.hasVipAccess ? (
                <div className="rounded-2xl border-3 border-black bg-white p-4 shadow-[4px_4px_0px_#000]">
                  <div className="flex items-start gap-3">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 border-black bg-amber-200">
                      <Image
                        src={withSpriteVersion('/sprites/portraits/dick-glaring.png')}
                        alt="Dick guarding VIP Secret Stash"
                        fill
                        className="object-contain object-top pt-0.5"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-xs font-black uppercase text-red-700">
                        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>VIP Secret Stash Locked</span>
                      </div>
                      <p className="mt-1 text-xs font-bold leading-snug text-zinc-800">
                        {memState.isSignedIn
                          ? `Dick locks the Secret Stash behind ${VIP_ORDER_THRESHOLD} verified Hard R orders or $${VIP_SPEND_THRESHOLD} total spend.`
                          : `Sign in with Google or Apple so Dick can track your orders and unlock the VIP Secret Stash.`}
                      </p>
                      <div className="mt-2.5 flex flex-wrap gap-2 text-[11px] font-black uppercase">
                        <span className="rounded-lg border border-black bg-amber-100 px-2 py-1">
                          Orders: {memState.memory?.total_orders ?? 0} / {VIP_ORDER_THRESHOLD}
                        </span>
                        <span className="rounded-lg border border-black bg-amber-100 px-2 py-1">
                          Spend: ${Number(memState.memory?.lifetime_spend ?? 0).toFixed(2)} / ${VIP_SPEND_THRESHOLD}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {!memState.isSignedIn ? (
                      <button
                        type="button"
                        onClick={() => {
                          useShopStore.getState().setOpenDrawer(null);
                          useShopStore.getState().setAccountModalOpen(true);
                        }}
                        className="flex-1 cursor-pointer rounded-xl border-3 border-black bg-emerald-400 px-4 py-2 text-xs font-black uppercase text-black shadow-[3px_3px_0px_#000] hover:bg-emerald-300"
                      >
                        Sign In with Google / Apple
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => useShopStore.getState().setActiveRackFilter('ALL')}
                      className="flex-1 cursor-pointer rounded-xl border-3 border-black bg-amber-300 px-4 py-2 text-xs font-black uppercase text-black shadow-[3px_3px_0px_#000] hover:bg-amber-200"
                    >
                      Browse Open Racks
                    </button>
                  </div>
                </div>
              ) : openDrawer === 'PARTS' && activeRackFilter === 'ALL' ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-2xl border-3 border-black bg-white p-3.5 shadow-[4px_4px_0px_#000]">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 border-black bg-amber-100">
                      <Image
                        src={withSpriteVersion('/sprites/portraits/scooter-pop.png')}
                        alt="Scooter"
                        fill
                        className="object-contain object-top"
                      />
                    </div>
                    <div className="text-xs font-bold leading-snug text-zinc-800">
                      <p className="font-black uppercase text-orange-700">
                        Scooter&apos;s Parts &amp; Originals Counter
                      </p>
                      <p className="mt-0.5">
                        &ldquo;Direct shop-stocked Hard R Originals checkout right here in the Cart—and V keeps the full MotophileUSA apparel racks loaded next door!&rdquo;
                      </p>
                    </div>
                  </div>
                  {filteredProducts.map((product) => (
                    <ProductCatalogCard
                      key={product.handle}
                      product={product}
                      featured={product.handle === highlightedDropHandle}
                    />
                  ))}
                  {filteredProducts.length === 0 ? (
                    <div className="rounded-2xl border-3 border-black bg-white p-4 text-center text-xs font-bold text-zinc-600">
                      No direct Hard R Originals parts stocked yet—check back soon or add items via Admin!
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => useShopStore.getState().setOpenDrawer('APPAREL', 'ALL')}
                    className="w-full cursor-pointer rounded-2xl border-3 border-black bg-amber-300 py-3 text-sm font-black uppercase text-black shadow-[4px_4px_0px_#000] hover:bg-amber-200"
                  >
                    Browse All {products.length} Merch Items →
                  </button>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="rounded-2xl border-3 border-black bg-white p-6 text-center text-sm font-bold text-zinc-600">
                  {activeRackFilter === 'vip_secret_stash' && !query
                    ? 'VIP Secret Stash is unlocked — exclusive Hard R VIP drops will appear right here as soon as they hit the rack.'
                    : activeRackFilter === 'hard_r_originals' && !query
                      ? 'No Hard R Originals stocked yet—add your first direct Stripe item in the Admin Dashboard!'
                      : `No merch matched "${query || activeRackFilter}". Clear the filter to browse all ${products.length} items.`}
                </div>
              ) : (
                filteredProducts.map((product) => (
                  <ProductCatalogCard
                    key={product.handle}
                    product={product}
                    featured={product.handle === highlightedDropHandle}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
