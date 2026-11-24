'use client';

import { useSyncExternalStore } from 'react';

function subscribeCoarsePointer(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }
  const mq = window.matchMedia('(pointer: coarse)');
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

function getCoarsePointerSnapshot(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(pointer: coarse)').matches;
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * React-compiler safe hook returning true when the primary input is coarse/touch.
 */
export function useCoarsePointer(): boolean {
  return useSyncExternalStore(subscribeCoarsePointer, getCoarsePointerSnapshot, getServerSnapshot);
}
