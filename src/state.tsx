import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState as RNAppState } from 'react-native';
import { initPurchases, getIsPro, checkPro, onProChange } from './purchases';
import { syncTrialReminder } from './reminder';
import { hasSandboxPro } from './testing';
import { setReviewGuard } from './reviews';
import { kvAll, kvGet, kvSet, loadLibrary, loadRecent, saveLibrary, saveRecent } from './store';
import { addRecent, RecentDoc, Signature } from './library';
import type { PaywallReason, Usage } from './gates';
import type { InkId } from './library';
import type { PenId, SizeStep } from './stroke';
import type { Need } from './rules';

export interface Prefs {
  pen: PenId;
  ink: InkId;
  size: SizeStep;
  fontId: string;
  /** The typed name, remembered for the next typed signature. */
  typedName: string;
  /** "What do you need today?" from onboarding. Only picks the first screen. */
  need: Need | null;
}

export const DEFAULT_PREFS: Prefs = { pen: 'ink', ink: 'black', size: 1, fontId: 'dancing', typedName: '', need: null };

const PREF_PREFIX = 'pref.';
export const ONBOARDED_KEY = 'flag.onboarded';
const USAGE_KEY = 'usage';
/** Test builds only: Pro is ignored on this phone while this is on. */
const ACT_FREE_KEY = 'test.actFree';

/** Prefs from stored rows, with defaults for anything missing or unreadable. */
export function parsePrefs(rows: Record<string, string>): Prefs {
  const raw: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rows)) {
    try {
      raw[k] = JSON.parse(v);
    } catch {
      // one bad row falls back to its default
    }
  }
  const pick = <T,>(v: unknown, ok: readonly T[], d: T): T => (ok.includes(v as T) ? (v as T) : d);
  return {
    pen: pick(raw.pen, ['ink', 'ballpoint', 'marker', 'fountain'] as const, DEFAULT_PREFS.pen),
    ink: pick(raw.ink, ['black', 'navy', 'blue', 'red'] as const, DEFAULT_PREFS.ink),
    size: pick(raw.size, [0, 1, 2] as const, DEFAULT_PREFS.size),
    fontId: typeof raw.fontId === 'string' ? raw.fontId : DEFAULT_PREFS.fontId,
    typedName: typeof raw.typedName === 'string' ? raw.typedName.slice(0, 60) : '',
    need: pick(raw.need, ['document', 'image', 'both', null] as const, null),
  };
}

export function parseUsage(json: string | null): Usage {
  try {
    const u = JSON.parse(json ?? '{}');
    return { exports: Math.max(0, Number(u.exports) || 0), documents: Math.max(0, Number(u.documents) || 0) };
  } catch {
    return { exports: 0, documents: 0 };
  }
}

interface AppState {
  ready: boolean;
  prefs: Prefs;
  setPrefs: (patch: Partial<Prefs>) => void;
  isPro: boolean;
  setIsPro: (v: boolean) => void;
  testBuild: boolean;
  actFree: boolean;
  setActFree: (v: boolean) => Promise<void>;
  /** Why the in-app paywall is open, or null. */
  paywall: PaywallReason | null;
  /** Opens the paywall; resolves with whether Pro is on once it closes. */
  askPro: (reason: PaywallReason) => Promise<boolean>;
  hidePaywall: () => void;
  usage: Usage;
  /** Counts a finished export or signed document (only the first ones matter to the gates). */
  countUsage: (what: keyof Usage) => void;
  resetUsage: () => void;
  library: Signature[];
  setLibrary: (next: Signature[]) => void;
  recent: RecentDoc[];
  addRecentDoc: (doc: RecentDoc) => void;
  setRecent: (next: RecentDoc[]) => void;
  /** A document is open for signing (no rating prompt then). */
  setDocOpen: (v: boolean) => void;
  notice: string | null;
  say: (text: string) => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [prefs, setPrefsState] = useState<Prefs>(DEFAULT_PREFS);
  const prefsRef = useRef(prefs);
  const [storePro, setStorePro] = useState(false);
  const [sandbox, setSandbox] = useState(false);
  const [actFree, setActFreeState] = useState(false);
  const [paywall, setPaywall] = useState<PaywallReason | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const [usage, setUsage] = useState<Usage>({ exports: 0, documents: 0 });
  const [library, setLibraryState] = useState<Signature[]>([]);
  const [recent, setRecentState] = useState<RecentDoc[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const docOpenRef = useRef(false);

  const say = useCallback((text: string) => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice(text);
    noticeTimer.current = setTimeout(() => setNotice(null), 4200);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const p = parsePrefs(await kvAll(PREF_PREFIX));
        prefsRef.current = p;
        setPrefsState(p);
        setUsage(parseUsage(await kvGet(USAGE_KEY)));
        setActFreeState((await kvGet(ACT_FREE_KEY)) === '1');
        setLibraryState(loadLibrary());
        setRecentState(loadRecent());
      } catch {
        // unreadable storage -> defaults
      }
      try {
        await initPurchases();
        setStorePro(await getIsPro());
        setSandbox(await hasSandboxPro());
      } catch {
        setStorePro(false);
      }
      setReady(true);
    })();
  }, []);

  // Keep Pro in step with the store without a relaunch (renewals, expiries,
  // refunds), and re-check after a real trip to the background. The same
  // foreground check drops the trial reminder once the trial is over.
  useEffect(() => {
    if (!ready) return;
    syncTrialReminder();
    const unsubscribe = onProChange((v) => {
      setStorePro(v);
      hasSandboxPro().then(setSandbox);
    });
    let wasBackground = false;
    const sub = RNAppState.addEventListener('change', (s) => {
      if (s === 'background') wasBackground = true;
      if (s !== 'active' || !wasBackground) return;
      wasBackground = false;
      checkPro().then((v) => {
        if (v !== null) setStorePro(v);
      });
      syncTrialReminder();
    });
    return () => {
      unsubscribe();
      sub.remove();
    };
  }, [ready]);

  useEffect(() => setReviewGuard(() => docOpenRef.current), []);

  const testBuild = __DEV__ || sandbox;
  const isPro = storePro && !(testBuild && actFree);
  const proRef = useRef(isPro);
  proRef.current = isPro;

  const setPrefs = useCallback((patch: Partial<Prefs>) => {
    const next = { ...prefsRef.current, ...patch };
    prefsRef.current = next;
    setPrefsState(next);
    (async () => {
      for (const [k, v] of Object.entries(patch)) await kvSet(PREF_PREFIX + k, JSON.stringify(v));
    })().catch(() => {});
  }, []);

  const askPro = useCallback((reason: PaywallReason) => {
    if (proRef.current) return Promise.resolve(true);
    resolver.current?.(false);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setPaywall(reason);
    });
  }, []);

  const hidePaywall = useCallback(() => {
    setPaywall(null);
    const r = resolver.current;
    resolver.current = null;
    // After the purchase sets Pro, on the next tick.
    setTimeout(() => r?.(proRef.current), 0);
  }, []);

  const setIsPro = useCallback((v: boolean) => {
    proRef.current = v && !(testBuild && actFree);
    setStorePro(v);
  }, [testBuild, actFree]);

  const countUsage = useCallback((what: keyof Usage) => {
    setUsage((u) => {
      const next = { ...u, [what]: u[what] + 1 };
      kvSet(USAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const resetUsage = useCallback(() => {
    const next = { exports: 0, documents: 0 };
    setUsage(next);
    kvSet(USAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const setLibrary = useCallback((next: Signature[]) => {
    setLibraryState(next);
    try {
      saveLibrary(next);
    } catch {
      // kept in memory for this launch
    }
  }, []);

  const recentRef = useRef(recent);
  recentRef.current = recent;
  const addRecentDoc = useCallback((doc: RecentDoc) => {
    const { list, dropped } = addRecent(recentRef.current, doc);
    setRecentState(list);
    try {
      saveRecent(list, dropped);
    } catch {
      // harmless
    }
  }, []);
  const setRecent = useCallback((next: RecentDoc[]) => {
    setRecentState(next);
    try {
      saveRecent(next);
    } catch {
      // harmless
    }
  }, []);

  const setActFree = useCallback(
    async (v: boolean) => {
      if (!testBuild) return;
      setActFreeState(v);
      await kvSet(ACT_FREE_KEY, v ? '1' : '0').catch(() => {});
    },
    [testBuild]
  );

  const setDocOpen = useCallback((v: boolean) => {
    docOpenRef.current = v;
  }, []);

  const value = useMemo<AppState>(
    () => ({
      ready,
      prefs,
      setPrefs,
      isPro,
      setIsPro,
      testBuild,
      actFree: testBuild && actFree,
      setActFree,
      paywall,
      askPro,
      hidePaywall,
      usage,
      countUsage,
      resetUsage,
      library,
      setLibrary,
      recent,
      addRecentDoc,
      setRecent,
      setDocOpen,
      notice,
      say,
    }),
    [ready, prefs, setPrefs, isPro, setIsPro, testBuild, actFree, setActFree, paywall, askPro, hidePaywall, usage, countUsage, resetUsage, library, setLibrary, recent, addRecentDoc, setRecent, setDocOpen, notice, say]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
