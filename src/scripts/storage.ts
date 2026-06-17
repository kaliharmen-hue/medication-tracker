import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInAnonymously, type Auth } from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  onSnapshot,
  query,
  setDoc,
  where,
  type Firestore,
  type Unsubscribe
} from "firebase/firestore";
import { createEntryId, mergeEntry, type DailyEntry } from "./schema";

const localKey = "keith-medication-tracker-entries";
const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let authReady: Promise<void> | null = null;

function hasFirebaseConfig() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId);
}

export function storageMode() {
  return hasFirebaseConfig() ? "firebase" : "local";
}

function readLocal(): DailyEntry[] {
  try {
    return JSON.parse(localStorage.getItem(localKey) || "[]");
  } catch {
    return [];
  }
}

function writeLocal(entries: DailyEntry[]) {
  localStorage.setItem(localKey, JSON.stringify(entries));
}

async function ensureFirebase() {
  if (!hasFirebaseConfig()) return null;
  if (!app) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    authReady = new Promise((resolve, reject) => {
      const stop = onAuthStateChanged(auth!, (user) => {
        if (user) {
          stop();
          resolve();
        }
      });
      signInAnonymously(auth!).catch(reject);
    });
  }
  await authReady;
  return db;
}

export async function getEntry(date: string): Promise<DailyEntry> {
  const id = createEntryId(date);
  if (storageMode() === "local") {
    const found = readLocal().find((entry) => entry.id === id);
    return mergeEntry(found, date);
  }

  const all = await getAllEntries();
  return mergeEntry(all.find((entry) => entry.id === id), date);
}

export async function saveEntry(entry: DailyEntry): Promise<void> {
  const next = { ...entry, id: createEntryId(entry.date), updatedAt: new Date().toISOString() };
  const firestore = await ensureFirebase();
  if (!firestore) {
    const entries = readLocal().filter((item) => item.id !== next.id);
    entries.push(next);
    writeLocal(entries);
    window.dispatchEvent(new CustomEvent("tracker-local-change"));
    return;
  }
  await setDoc(doc(firestore, "dailyEntries", next.id), next, { merge: true });
}

export async function getAllEntries(): Promise<DailyEntry[]> {
  const firestore = await ensureFirebase();
  if (!firestore) return readLocal().sort(sortEntries);
  const snapshot = await getDocs(collection(firestore, "dailyEntries"));
  return snapshot.docs.map((item) => item.data() as DailyEntry).sort(sortEntries);
}

export async function importEntries(entries: DailyEntry[]) {
  for (const entry of entries) {
    await saveEntry(entry);
  }
}

export function watchEntries(callback: (entries: DailyEntry[]) => void): Unsubscribe {
  if (storageMode() === "local") {
    const emit = () => callback(readLocal().sort(sortEntries));
    window.addEventListener("tracker-local-change", emit);
    emit();
    return () => window.removeEventListener("tracker-local-change", emit);
  }

  let stop: Unsubscribe = () => {};
  ensureFirebase().then((firestore) => {
    if (!firestore) return;
    stop = onSnapshot(collection(firestore, "dailyEntries"), (snapshot) => {
      callback(snapshot.docs.map((item) => item.data() as DailyEntry).sort(sortEntries));
    });
  });
  return () => stop();
}

export function watchMonth(month: string, callback: (entries: DailyEntry[]) => void): Unsubscribe {
  if (storageMode() === "local") {
    const emit = () => callback(readLocal().filter((entry) => entry.date.startsWith(month)).sort(sortEntries));
    window.addEventListener("tracker-local-change", emit);
    emit();
    return () => window.removeEventListener("tracker-local-change", emit);
  }

  let stop: Unsubscribe = () => {};
  ensureFirebase().then((firestore) => {
    if (!firestore) return;
    const monthQuery = query(
      collection(firestore, "dailyEntries"),
      where("date", ">=", `${month}-01`),
      where("date", "<=", `${month}-31`)
    );
    stop = onSnapshot(monthQuery, (snapshot) => {
      callback(snapshot.docs.map((item) => item.data() as DailyEntry).sort(sortEntries));
    });
  });
  return () => stop();
}

function sortEntries(a: DailyEntry, b: DailyEntry) {
  return b.date.localeCompare(a.date);
}
