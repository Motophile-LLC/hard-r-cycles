'use client';

import { Check, Copy, Download, Share2, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { trackShopEvent } from '@/lib/analytics';
import { useShopStore } from '@/store/useShopStore';
import {
  buildRoastShareCaption,
  downloadRoastCardAsset,
  renderRoastCardAsset,
  shareRoastCardAsset,
  type RenderedRoastCardAsset,
} from './canvasRenderer';
import type { RoastCardAspect } from './types';

interface RenderedState extends RenderedRoastCardAsset {
  renderKey: string;
}

export function RoastCardModal() {
  const activeRoastCard = useShopStore((s) => s.activeRoastCard);
  const authAccessToken = useShopStore((s) => s.authAccessToken);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [aspect, setAspect] = useState<RoastCardAspect>('square');
  const [rendered, setRendered] = useState<RenderedState | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [copiedCaption, setCopiedCaption] = useState(false);

  const isOpen = Boolean(activeRoastCard);

  const currentRenderKey = activeRoastCard
    ? `${aspect}:${activeRoastCard.staffId}:${activeRoastCard.moodLabel}:${activeRoastCard.promptText}:${activeRoastCard.roastText}`
    : '';

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
      const card = dialog.querySelector('[data-roast-card-modal="true"]');
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

  // Track card open analytics
  useEffect(() => {
    if (!activeRoastCard) return;
    trackShopEvent(
      'roast_card_open',
      {
        staffId: activeRoastCard.staffId,
        source: activeRoastCard.source,
      },
      authAccessToken,
    );
  }, [activeRoastCard, authAccessToken]);

  // Render PNG preview asynchronously inside Promise callbacks (React 19 ESLint clean)
  useEffect(() => {
    if (!activeRoastCard || !currentRenderKey) return;
    let cancelled = false;

    renderRoastCardAsset(activeRoastCard, aspect)
      .then((asset) => {
        if (cancelled) return;
        setRenderError(null);
        setRendered({
          ...asset,
          renderKey: currentRenderKey,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setRenderError(
          err instanceof Error ? err.message : 'Unable to generate Roast Card.',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [activeRoastCard, aspect, currentRenderKey]);

  const handleClose = () => {
    setShareFeedback(null);
    setCopiedCaption(false);
    useShopStore.getState().setActiveRoastCard(null);
  };

  const activeAsset =
    rendered && rendered.renderKey === currentRenderKey ? rendered : null;
  const isRendering = Boolean(activeRoastCard) && !activeAsset && !renderError;

  const handleShare = async () => {
    if (!activeRoastCard || !activeAsset) return;
    const outcome = await shareRoastCardAsset(activeAsset, activeRoastCard);
    if (outcome === 'cancelled') return;

    trackShopEvent(
      'roast_card_share',
      {
        staffId: activeRoastCard.staffId,
        source: activeRoastCard.source,
        aspect,
        method: outcome,
      },
      authAccessToken,
    );

    setShareFeedback(
      outcome === 'shared' ? 'Opened share sheet!' : 'Saved PNG to downloads!',
    );
    window.setTimeout(() => setShareFeedback(null), 2600);
  };

  const handleDownload = () => {
    if (!activeRoastCard || !activeAsset) return;
    downloadRoastCardAsset(activeAsset);
    trackShopEvent(
      'roast_card_share',
      {
        staffId: activeRoastCard.staffId,
        source: activeRoastCard.source,
        aspect,
        method: 'download_button',
      },
      authAccessToken,
    );
    setShareFeedback('Downloaded PNG!');
    window.setTimeout(() => setShareFeedback(null), 2400);
  };

  const handleCopyCaption = async () => {
    if (!activeRoastCard) return;
    const caption = buildRoastShareCaption(activeRoastCard);
    try {
      await navigator.clipboard.writeText(caption);
      setCopiedCaption(true);
      window.setTimeout(() => setCopiedCaption(false), 2200);
    } catch {
      setShareFeedback('Select & copy caption manually if blocked.');
    }
  };

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby="roast-card-modal-title"
      onClose={(e) => {
        e.currentTarget.returnValue = '';
        if (useShopStore.getState().activeRoastCard) {
          useShopStore.getState().setActiveRoastCard(null);
        }
      }}
      className="m-auto max-h-[92dvh] w-[min(95dvw,560px)] overflow-y-auto border-0 bg-transparent p-0 text-black"
    >
      <div
        data-roast-card-modal="true"
        className="rounded-3xl border-4 border-black bg-amber-50 p-4 shadow-[12px_12px_0px_#000] sm:p-5"
      >
        <div className="flex items-start justify-between gap-3 border-b-4 border-black pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-3 border-black bg-amber-300 shadow-[2px_2px_0px_#000]">
              <Sparkles className="h-5 w-5 text-black" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-red-700">
                $0 Local Comic Exporter
              </p>
              <h1
                id="roast-card-modal-title"
                className="text-xl font-black uppercase leading-tight"
              >
                Shareable Roast Card
              </h1>
            </div>
          </div>

          <button
            type="button"
            autoFocus
            onClick={handleClose}
            aria-label="Close Roast Card"
            className="flex cursor-pointer items-center justify-center rounded-xl border-2 border-black bg-white p-2 hover:bg-zinc-200"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Format Aspect Toggle */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="inline-flex rounded-xl border-2 border-black bg-white p-0.5 shadow-[2px_2px_0px_#000]">
            <button
              type="button"
              onClick={() => setAspect('square')}
              className={`cursor-pointer rounded-lg px-3 py-1 text-xs font-black uppercase ${
                aspect === 'square'
                  ? 'bg-zinc-900 text-amber-300'
                  : 'text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              Square (1:1)
            </button>
            <button
              type="button"
              onClick={() => setAspect('story')}
              className={`cursor-pointer rounded-lg px-3 py-1 text-xs font-black uppercase ${
                aspect === 'story'
                  ? 'bg-zinc-900 text-amber-300'
                  : 'text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              Story (9:16)
            </button>
          </div>

          {shareFeedback ? (
            <span className="rounded-lg border-2 border-black bg-emerald-300 px-2.5 py-1 text-[11px] font-black uppercase text-black">
              {shareFeedback}
            </span>
          ) : null}
        </div>

        {/* Live Rendered PNG Preview */}
        <div className="mt-3 flex items-center justify-center rounded-2xl border-3 border-black bg-zinc-900 p-3 shadow-[4px_4px_0px_#000]">
          {isRendering ? (
            <div className="flex h-64 w-full flex-col items-center justify-center gap-2 text-amber-300">
              <div className="h-7 w-7 animate-spin rounded-full border-4 border-amber-300 border-t-transparent" />
              <p className="text-xs font-black uppercase tracking-wider">
                Inking comic PNG...
              </p>
            </div>
          ) : renderError ? (
            <p className="py-12 text-center text-xs font-bold text-red-400">
              {renderError}
            </p>
          ) : activeAsset ? (
            // Data URL PNG exported dynamically from HTML5 Canvas
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activeAsset.dataUrl}
              alt={`${activeRoastCard?.speakerName ?? 'Staff'} Roast Card preview`}
              className={`rounded-xl border-2 border-black bg-amber-50 object-contain ${
                aspect === 'story' ? 'max-h-[46dvh]' : 'max-h-[42dvh]'
              }`}
            />
          ) : null}
        </div>

        {/* Action Buttons */}
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={!activeAsset}
            onClick={handleShare}
            className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-2xl border-3 border-black bg-amber-300 px-4 py-2.5 text-xs font-black uppercase text-black shadow-[4px_4px_0px_#000] hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
            Share / Save PNG
          </button>

          <button
            type="button"
            disabled={!activeAsset}
            onClick={handleDownload}
            className="flex cursor-pointer items-center justify-center gap-1.5 rounded-2xl border-3 border-black bg-emerald-400 px-4 py-2.5 text-xs font-black uppercase text-black shadow-[4px_4px_0px_#000] hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Download
          </button>

          <button
            type="button"
            disabled={!activeRoastCard}
            onClick={handleCopyCaption}
            className="flex cursor-pointer items-center justify-center gap-1.5 rounded-2xl border-3 border-black bg-white px-3.5 py-2.5 text-xs font-black uppercase text-black shadow-[4px_4px_0px_#000] hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copiedCaption ? (
              <>
                <Check className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" aria-hidden="true" />
                Caption
              </>
            )}
          </button>
        </div>
      </div>
    </dialog>
  );
}
