'use client';

import { ExternalLink, Send, ShoppingCart, X } from 'lucide-react';
import Image from 'next/image';
import { useRef, useState } from 'react';
import { resolveStaffReply } from '@/data/staffDialogue';
import { useShopStore } from '@/store/useShopStore';

export function StaffDialogueBox() {
  const activeDialogue = useShopStore((s) => s.activeDialogue);
  const products = useShopStore((s) => s.products);
  const [input, setInput] = useState('');
  const composingRef = useRef(false);

  if (!activeDialogue) return null;

  const submitQuestion = (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    const reply = resolveStaffReply(activeDialogue.staffId, clean, products);
    useShopStore.getState().setActiveDialogue(reply);
    setInput('');
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-16 z-30 flex justify-center px-3 sm:bottom-20">
      <section
        aria-label={`Chat with ${activeDialogue.speakerName}`}
        className="pointer-events-auto w-full max-w-2xl rounded-3xl border-4 border-black bg-amber-50 p-3.5 text-black shadow-[8px_8px_0px_#000] sm:p-4"
      >
        <div className="flex items-start gap-3">
          {/* Dynamic Mood Portrait */}
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-3 border-black bg-amber-200 shadow-[3px_3px_0px_#000] sm:h-24 sm:w-24">
            <Image
              src={activeDialogue.portraitId}
              alt={`${activeDialogue.speakerName} expression`}
              fill
              className="object-contain object-top pt-0.5"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-md border-2 border-black bg-zinc-900 px-2 py-0.5 text-xs font-black uppercase text-amber-300">
                  {activeDialogue.speakerName}
                </span>
                <span className="text-[11px] font-black uppercase text-zinc-600">
                  {activeDialogue.speakerRole}
                </span>
                <span className="rounded-md border border-black bg-red-600 px-1.5 py-0.5 text-[10px] font-black uppercase text-white">
                  {activeDialogue.moodLabel}
                </span>
              </div>

              <button
                type="button"
                onClick={() => useShopStore.getState().setActiveDialogue(null)}
                aria-label="Close character chat"
                className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-black bg-white p-1 hover:bg-zinc-200"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <p className="mt-2 text-xs font-bold leading-snug text-zinc-900 sm:text-sm">
              &ldquo;{activeDialogue.message}&rdquo;
            </p>
          </div>
        </div>

        {/* Inline Recommended Product Cards */}
        {activeDialogue.suggestedProducts.length > 0 ? (
          <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
            {activeDialogue.suggestedProducts.map((prod) => (
              <div
                key={prod.handle}
                className="flex items-center gap-2 rounded-xl border-2 border-black bg-white p-2 shadow-[2px_2px_0px_#000]"
              >
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-black bg-zinc-100">
                  <Image
                    src={prod.image_url}
                    alt={prod.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-black text-black">{prod.title}</p>
                  <p className="text-[10px] font-bold text-emerald-700">
                    ${prod.price_min.toFixed(2)}–${prod.price_max.toFixed(2)}
                  </p>
                </div>
                {prod.checkout_mode === 'shopify_link' && prod.external_url ? (
                  <a
                    href={prod.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border-2 border-black bg-emerald-400 px-2 py-1 text-[10px] font-black uppercase text-black hover:bg-emerald-300"
                  >
                    Buy <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      useShopStore.getState().addToCart({
                        handle: prod.handle,
                        title: prod.title,
                        image_url: prod.image_url,
                        unitPrice: prod.price_min,
                        size: prod.sizes[0] ?? 'One Size',
                        color: prod.colors[0] ?? 'Standard',
                        checkoutMode: prod.checkout_mode,
                      });
                      useShopStore.getState().setOpenDrawer('CART');
                    }}
                    className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border-2 border-black bg-amber-300 px-2 py-1 text-[10px] font-black uppercase text-black hover:bg-amber-200"
                  >
                    Add <ShoppingCart className="h-3 w-3" aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : null}

        {/* Quick-Tap Topics + Zero-API Local Question Box */}
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {activeDialogue.quickReplies.map((qr) => (
            <button
              key={qr.label}
              type="button"
              onClick={() => submitQuestion(qr.query)}
              className="cursor-pointer rounded-lg border-2 border-black bg-amber-200 px-2.5 py-1 text-[11px] font-black text-black hover:bg-amber-300"
            >
              {qr.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => submitQuestion('discount reward code')}
            className="cursor-pointer rounded-lg border-2 border-black bg-emerald-200 px-2.5 py-1 text-[11px] font-black text-black hover:bg-emerald-300"
          >
            Earn Discount Code?
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (composingRef.current) return;
            submitQuestion(input);
          }}
          className="mt-2.5 flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onCompositionStart={() => {
              composingRef.current = true;
            }}
            onCompositionEnd={() => {
              composingRef.current = false;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.nativeEvent.isComposing || composingRef.current)) {
                e.preventDefault();
              }
            }}
            placeholder={`Ask ${activeDialogue.speakerName} about hoodies, sizing, discounts, or bays...`}
            aria-label={`Ask ${activeDialogue.speakerName} a question`}
            className="min-w-0 flex-1 rounded-xl border-2 border-black bg-white px-3 py-1.5 text-xs font-bold text-black placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-400 sm:text-sm"
          />
          <button
            type="submit"
            className="flex cursor-pointer items-center gap-1 rounded-xl border-2 border-black bg-zinc-900 px-3 py-1.5 text-xs font-black uppercase text-amber-300 hover:bg-zinc-800"
          >
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
            Ask
          </button>
        </form>
      </section>
    </div>
  );
}
