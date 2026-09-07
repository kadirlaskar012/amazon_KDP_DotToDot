import type { Dot, PageItem, PageSetup, MediaItem } from '../types';

export interface WorkspaceDraftState {
  projectName: string;
  pageSetup: PageSetup;
  pages: PageItem[];
  activePageIndex: number;
  dots: Dot[];
  initialAutoDots: Dot[];
  referenceImage: string | null;
  editedIllustration: string | null;
  pageCaption: string;
  dotRadius: number;
  fontSize: number;
  referenceOpacity: number;
  referenceVisible: boolean;
  referenceLocked: boolean;
  showAnswer: boolean;
  snapEnabled: boolean;
  safeMarginsVisible: boolean;
  mediaLibrary: MediaItem[];
  saveLocation: string;
  currentProjectFilePath: string | null;
  timestamp: number;
}

const DB_NAME = 'Dot2DotAppDB';
const DB_VERSION = 1;
const STORE_NAME = 'workspace_draft';
const DRAFT_KEY = 'active_session';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB is not supported'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveWorkspaceDraft(state: WorkspaceDraftState): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(state, DRAFT_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to save draft to IndexedDB:', err);
  }
}

export async function getWorkspaceDraft(): Promise<WorkspaceDraftState | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(DRAFT_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to read draft from IndexedDB:', err);
    return null;
  }
}

export async function clearWorkspaceDraft(): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(DRAFT_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to clear draft from IndexedDB:', err);
  }
}
