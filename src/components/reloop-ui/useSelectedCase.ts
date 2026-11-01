'use client';

import { useSyncExternalStore } from 'react';
import { validCaseId } from '@/lib/frontend/case-navigation';

// Navigation metadata only. Tokens and case content are never stored here.
const key = 'reloop.selected-case';
const eventName = 'reloop-case-selection';
let memoryCaseId: string | null = null;

function snapshot() {
  try { return validCaseId(sessionStorage.getItem(key)); }
  catch { return memoryCaseId; }
}

function subscribe(listener: () => void) {
  window.addEventListener(eventName, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(eventName, listener);
    window.removeEventListener('storage', listener);
  };
}

export function rememberCase(id: string | null) {
  memoryCaseId = validCaseId(id);
  try {
    if (memoryCaseId) sessionStorage.setItem(key, memoryCaseId);
    else sessionStorage.removeItem(key);
  } catch { /* Navigation still works in memory when browser storage is unavailable. */ }
  window.dispatchEvent(new Event(eventName));
}

export function useSelectedCase() {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}
