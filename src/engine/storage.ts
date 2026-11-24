import { createNewSaveState, SAVE_SCHEMA_VERSION } from './progression';
import { GameSaveState } from './types';

const LS_KEY = 'tub_infinite_possibility_save_v1';
const IDB_NAME = 'tub_multiverse_db';
const IDB_STORE = 'saves';
const IDB_KEY = 'primary_slot';

let cachedDbPromise: Promise<IDBDatabase | null> | null = null;
let idbPersistTimer: number | null = null;
let pendingIdbState: GameSaveState | null = null;

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  if (cachedDbPromise) {
    return cachedDbPromise;
  }
  cachedDbPromise = new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => {
          db.close();
          cachedDbPromise = null;
        };
        resolve(db);
      };
      req.onerror = () => {
        cachedDbPromise = null;
        resolve(null);
      };
    } catch {
      cachedDbPromise = null;
      resolve(null);
    }
  });
  return cachedDbPromise;
}

function sanitizeNumberMap(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'number' && Number.isFinite(v)) {
      out[k] = v;
    }
  }
  return out;
}

function sanitizeStringMap(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'string') {
      out[k] = v;
    }
  }
  return out;
}

export function validateAndRecoverSave(raw: unknown): GameSaveState | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Partial<GameSaveState>;
  if (typeof candidate.tubLevel !== 'number' || !candidate.attributes) {
    return null;
  }
  const base = createNewSaveState();
  const mergedAttributes = { ...base.attributes };
  for (const key of Object.keys(base.attributes) as Array<keyof typeof base.attributes>) {
    const incoming = candidate.attributes[key];
    if (incoming && typeof incoming.level === 'number' && Number.isFinite(incoming.level)) {
      mergedAttributes[key] = {
        id: key,
        level: Math.max(1, Math.round(incoming.level)),
        xp: typeof incoming.xp === 'number' && Number.isFinite(incoming.xp) ? Math.max(0, incoming.xp) : 0,
      };
    }
  }

  const mergedBookIds = Array.from(
    new Set([
      ...(Array.isArray(candidate.unlockedArchiveIds)
        ? candidate.unlockedArchiveIds.filter((x): x is string => typeof x === 'string')
        : []),
      ...(Array.isArray(candidate.unlockedBookIds)
        ? candidate.unlockedBookIds.filter((x): x is string => typeof x === 'string')
        : []),
    ])
  );

  const rawClarityMax =
    typeof candidate.clarityMax === 'number' && Number.isFinite(candidate.clarityMax)
      ? Math.max(40, Math.min(120, Math.round(candidate.clarityMax)))
      : 100;

  return {
    ...base,
    ...candidate,
    version: SAVE_SCHEMA_VERSION,
    tubLevel: Math.max(1, Math.round(candidate.tubLevel)),
    xp: typeof candidate.xp === 'number' ? Math.max(0, candidate.xp) : 0,
    ip: typeof candidate.ip === 'number' ? Math.max(0, candidate.ip) : base.ip,
    kp: typeof candidate.kp === 'number' ? Math.max(0, candidate.kp) : base.kp,
    ep: typeof candidate.ep === 'number' ? Math.max(0, candidate.ep) : 0,
    clarityMax: rawClarityMax,
    clarity:
      typeof candidate.clarity === 'number' && Number.isFinite(candidate.clarity)
        ? Math.max(0, Math.min(rawClarityMax, Math.round(candidate.clarity)))
        : rawClarityMax,
    transcendenceRank:
      typeof candidate.transcendenceRank === 'number' ? Math.max(0, candidate.transcendenceRank) : 0,
    unlockedStage:
      typeof candidate.unlockedStage === 'number'
        ? Math.max(1, Math.min(7, Math.round(candidate.unlockedStage)))
        : 1,
    activeUniverseStage:
      typeof candidate.activeUniverseStage === 'number'
        ? Math.max(1, Math.min(6, Math.round(candidate.activeUniverseStage)))
        : 1,
    attributes: mergedAttributes,
    abilities: sanitizeNumberMap(candidate.abilities),
    bossPhaseProgress: sanitizeNumberMap(candidate.bossPhaseProgress),
    puzzleNotes: sanitizeStringMap(candidate.puzzleNotes),
    mistakePatterns: sanitizeNumberMap(candidate.mistakePatterns),
    settings: {
      ...base.settings,
      ...(candidate.settings ?? {}),
    },
    completedNodeIds: Array.isArray(candidate.completedNodeIds)
      ? candidate.completedNodeIds.filter((x): x is string => typeof x === 'string')
      : [],
    defeatedBossIds: Array.isArray(candidate.defeatedBossIds)
      ? candidate.defeatedBossIds.filter((x): x is string => typeof x === 'string')
      : [],
    discoveredItemIds: Array.isArray(candidate.discoveredItemIds)
      ? candidate.discoveredItemIds.filter((x): x is string => typeof x === 'string')
      : [],
    unlockedArchiveIds: mergedBookIds,
    unlockedBookIds: mergedBookIds,
    unlockedStoryEvents: Array.isArray(candidate.unlockedStoryEvents)
      ? candidate.unlockedStoryEvents.filter((x): x is string => typeof x === 'string')
      : [],
    completedQuestIds: Array.isArray(candidate.completedQuestIds)
      ? candidate.completedQuestIds.filter((x): x is string => typeof x === 'string')
      : [],
    performanceHistory: Array.isArray(candidate.performanceHistory)
      ? candidate.performanceHistory.slice(-240)
      : [],
    prologueCompleted: (() => {
      if (typeof candidate.prologueCompleted === 'boolean') return candidate.prologueCompleted;
      const hasLegacyProgress =
        (Array.isArray(candidate.completedNodeIds) && candidate.completedNodeIds.length > 0) ||
        (Array.isArray(candidate.performanceHistory) && candidate.performanceHistory.length > 0);
      return hasLegacyProgress;
    })(),
    prologueBeatIndex:
      typeof candidate.prologueBeatIndex === 'number' && Number.isFinite(candidate.prologueBeatIndex)
        ? Math.max(0, Math.min(10, Math.round(candidate.prologueBeatIndex)))
        : 0,
    tutorialCompleted: (() => {
      if (typeof candidate.tutorialCompleted === 'boolean') return candidate.tutorialCompleted;
      const hasLegacyProgress =
        (Array.isArray(candidate.completedNodeIds) && candidate.completedNodeIds.length > 0) ||
        (Array.isArray(candidate.performanceHistory) && candidate.performanceHistory.length > 0);
      return hasLegacyProgress;
    })(),
    tutorialStageIndex:
      typeof candidate.tutorialStageIndex === 'number' && Number.isFinite(candidate.tutorialStageIndex)
        ? Math.max(0, Math.min(6, Math.round(candidate.tutorialStageIndex)))
        : 0,
    completedTutorialStageNumbers: (() => {
      if (Array.isArray(candidate.completedTutorialStageNumbers)) {
        return Array.from(
          new Set(
            candidate.completedTutorialStageNumbers.filter(
              (n): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 6
            )
          )
        ).sort((a, b) => a - b);
      }
      const isTutDone =
        candidate.tutorialCompleted === true ||
        (candidate.tutorialCompleted === undefined &&
          ((Array.isArray(candidate.completedNodeIds) && candidate.completedNodeIds.length > 0) ||
            (Array.isArray(candidate.performanceHistory) && candidate.performanceHistory.length > 0)));
      if (isTutDone) return [1, 2, 3, 4, 5, 6];
      const idx =
        typeof candidate.tutorialStageIndex === 'number' && Number.isFinite(candidate.tutorialStageIndex)
          ? Math.max(0, Math.min(6, Math.round(candidate.tutorialStageIndex)))
          : 0;
      return Array.from({ length: idx }, (_, i) => i + 1);
    })(),
    unlockedChronicleIds: Array.isArray(candidate.unlockedChronicleIds)
      ? candidate.unlockedChronicleIds.filter((x): x is string => typeof x === 'string')
      : [],
    completedStoryEncounterIds: Array.isArray(candidate.completedStoryEncounterIds)
      ? candidate.completedStoryEncounterIds.filter((x): x is string => typeof x === 'string')
      : [],
    errorJournal: Array.isArray(candidate.errorJournal) ? candidate.errorJournal.slice(-120) : [],
    confidenceStats: {
      ...base.confidenceStats,
      ...(candidate.confidenceStats && typeof candidate.confidenceStats === 'object'
        ? candidate.confidenceStats
        : {}),
    },
    bookBookmarks: Array.isArray(candidate.bookBookmarks)
      ? candidate.bookBookmarks.filter((x): x is string => typeof x === 'string')
      : [],
    bookMarginNotes:
      candidate.bookMarginNotes && typeof candidate.bookMarginNotes === 'object'
        ? candidate.bookMarginNotes
        : {},
    bookTextSize:
      candidate.bookTextSize === 'sm' || candidate.bookTextSize === 'base' || candidate.bookTextSize === 'lg'
        ? candidate.bookTextSize
        : 'base',
    chapterRatings: sanitizeNumberMap(candidate.chapterRatings),
    bookInlineChoices: sanitizeStringMap(candidate.bookInlineChoices),
    evidenceBoards:
      candidate.evidenceBoards && typeof candidate.evidenceBoards === 'object'
        ? candidate.evidenceBoards
        : {},
    opponentMemory: {
      ...base.opponentMemory,
      ...(candidate.opponentMemory && typeof candidate.opponentMemory === 'object'
        ? candidate.opponentMemory
        : {}),
    },
    secondOrderReflections:
      candidate.secondOrderReflections && typeof candidate.secondOrderReflections === 'object'
        ? candidate.secondOrderReflections
        : {},
    planDecisions: Array.isArray(candidate.planDecisions) ? candidate.planDecisions.slice(-40) : [],
  };
}

export function hasSavedGameSync(): boolean {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return false;
    return validateAndRecoverSave(JSON.parse(raw)) !== null;
  } catch {
    return false;
  }
}

export function loadSaveSync(): GameSaveState | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return validateAndRecoverSave(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function loadSaveAsync(): Promise<GameSaveState | null> {
  const syncState = loadSaveSync();
  const db = await openDatabase();
  if (!db) return syncState;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(IDB_KEY);
      req.onsuccess = () => {
        const idbState = validateAndRecoverSave(req.result);
        if (idbState && (!syncState || idbState.lastSavedAt >= syncState.lastSavedAt)) {
          resolve(idbState);
        } else {
          resolve(syncState);
        }
      };
      req.onerror = () => resolve(syncState);
    } catch {
      resolve(syncState);
    }
  });
}

async function writeToIndexedDb(stamped: GameSaveState): Promise<void> {
  const db = await openDatabase();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
      tx.objectStore(IDB_STORE).put(stamped, IDB_KEY);
    } catch {
      resolve();
    }
  });
}

export async function persistSave(state: GameSaveState, immediate = false): Promise<void> {
  const stamped: GameSaveState = {
    ...state,
    lastSavedAt: Date.now(),
    performanceHistory: state.performanceHistory.slice(-240),
  };

  try {
    localStorage.setItem(LS_KEY, JSON.stringify(stamped));
  } catch {
    // Fallback if localStorage quota is tight: persist slimmer history copy
    try {
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({ ...stamped, performanceHistory: stamped.performanceHistory.slice(-60) })
      );
    } catch {
      // Ignore unrecoverable storage quota errors
    }
  }

  pendingIdbState = stamped;

  if (typeof window === 'undefined') {
    await writeToIndexedDb(stamped);
    return;
  }

  if (idbPersistTimer !== null) {
    window.clearTimeout(idbPersistTimer);
    idbPersistTimer = null;
  }

  if (immediate) {
    const toWrite = pendingIdbState;
    pendingIdbState = null;
    await writeToIndexedDb(toWrite);
    return;
  }

  // Coalesce burst IDB writes (e.g. rapid note saves or attribute clicks)
  idbPersistTimer = window.setTimeout(() => {
    idbPersistTimer = null;
    const toWrite = pendingIdbState;
    pendingIdbState = null;
    if (toWrite) {
      void writeToIndexedDb(toWrite);
    }
  }, 180);
}

export async function clearSavedGame(): Promise<void> {
  pendingIdbState = null;
  if (typeof window !== 'undefined' && idbPersistTimer !== null) {
    window.clearTimeout(idbPersistTimer);
    idbPersistTimer = null;
  }
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    // ignore
  }
  const db = await openDatabase();
  if (!db) return;
  try {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(IDB_KEY);
  } catch {
    // ignore
  }
}
