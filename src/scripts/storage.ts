import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInAnonymously, type Auth } from "firebase/auth";
import {
  collection,
  deleteDoc,
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
import {
  createEntryId,
  mergeEntry,
  mergeMedicationSetup,
  type DailyEntry,
  type MedicationChange,
  type MedicationSetup
} from "./schema";

const localKey = "keith-medication-tracker-entries";
const medicationSetupKey = "keith-medication-tracker-medication-setup";
const medicationChangesKey = "keith-medication-tracker-medication-changes";
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

function readLocalMedicationSetup(): MedicationSetup {
  try {
    return mergeMedicationSetup(JSON.parse(localStorage.getItem(medicationSetupKey) || "null"));
  } catch {
    return mergeMedicationSetup(null);
  }
}

function readLocalMedicationChanges(): MedicationChange[] {
  try {
    return JSON.parse(localStorage.getItem(medicationChangesKey) || "[]");
  } catch {
    return [];
  }
}

function writeLocal(entries: DailyEntry[]) {
  localStorage.setItem(localKey, JSON.stringify(entries));
}

function writeLocalMedicationSetup(setup: MedicationSetup) {
  localStorage.setItem(medicationSetupKey, JSON.stringify(setup));
}

function writeLocalMedicationChanges(changes: MedicationChange[]) {
  localStorage.setItem(medicationChangesKey, JSON.stringify(changes));
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

export async function getMedicationSetup(): Promise<MedicationSetup> {
  const firestore = await ensureFirebase();
  if (!firestore) return readLocalMedicationSetup();
  const snapshot = await getDocs(query(collection(firestore, "medicationMeta"), where("id", "==", "setup")));
  return mergeMedicationSetup(snapshot.docs[0]?.data() as Partial<MedicationSetup> | undefined);
}

export async function saveMedicationSetup(setup: MedicationSetup): Promise<void> {
  const next = { ...mergeMedicationSetup(setup), updatedAt: new Date().toISOString() };
  const firestore = await ensureFirebase();
  if (!firestore) {
    writeLocalMedicationSetup(next);
    window.dispatchEvent(new CustomEvent("tracker-medication-change"));
    return;
  }
  await setDoc(doc(firestore, "medicationMeta", "setup"), next, { merge: true });
}

export async function getMedicationChanges(): Promise<MedicationChange[]> {
  const firestore = await ensureFirebase();
  if (!firestore) return readLocalMedicationChanges().sort(sortMedicationChanges);
  const snapshot = await getDocs(collection(firestore, "medicationChanges"));
  return snapshot.docs.map((item) => item.data() as MedicationChange).sort(sortMedicationChanges);
}

export async function saveMedicationChange(change: MedicationChange): Promise<void> {
  const next = { ...change, updatedAt: new Date().toISOString() };
  const firestore = await ensureFirebase();
  if (!firestore) {
    const changes = readLocalMedicationChanges().filter((item) => item.id !== next.id);
    changes.push(next);
    writeLocalMedicationChanges(changes);
    window.dispatchEvent(new CustomEvent("tracker-medication-change"));
    return;
  }
  await setDoc(doc(firestore, "medicationChanges", next.id), next, { merge: true });
}

export async function deleteMedicationChange(id: string): Promise<void> {
  const firestore = await ensureFirebase();
  if (!firestore) {
    writeLocalMedicationChanges(readLocalMedicationChanges().filter((item) => item.id !== id));
    window.dispatchEvent(new CustomEvent("tracker-medication-change"));
    return;
  }
  await deleteDoc(doc(firestore, "medicationChanges", id));
}

export function watchMedication(callback: (setup: MedicationSetup, changes: MedicationChange[]) => void): Unsubscribe {
  if (storageMode() === "local") {
    const emit = () => callback(readLocalMedicationSetup(), readLocalMedicationChanges().sort(sortMedicationChanges));
    window.addEventListener("tracker-medication-change", emit);
    emit();
    return () => window.removeEventListener("tracker-medication-change", emit);
  }

  let stopSetup: Unsubscribe = () => {};
  let stopChanges: Unsubscribe = () => {};
  let setup = mergeMedicationSetup(null);
  let changes: MedicationChange[] = [];
  const emit = () => callback(setup, changes.sort(sortMedicationChanges));

  ensureFirebase().then((firestore) => {
    if (!firestore) return;
    stopSetup = onSnapshot(doc(firestore, "medicationMeta", "setup"), (snapshot) => {
      setup = mergeMedicationSetup(snapshot.data() as Partial<MedicationSetup> | undefined);
      emit();
    });
    stopChanges = onSnapshot(collection(firestore, "medicationChanges"), (snapshot) => {
      changes = snapshot.docs.map((item) => item.data() as MedicationChange);
      emit();
    });
  });
  return () => {
    stopSetup();
    stopChanges();
  };
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

function sortMedicationChanges(a: MedicationChange, b: MedicationChange) {
  return `${b.date}_${b.updatedAt}`.localeCompare(`${a.date}_${a.updatedAt}`);
}
