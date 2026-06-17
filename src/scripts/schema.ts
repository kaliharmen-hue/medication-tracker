export type FieldType = "score" | "select" | "chips" | "textarea" | "time";

export interface FieldDefinition {
  id: keyof DailyEntry;
  label: string;
  type: FieldType;
  options?: string[];
  min?: number;
  max?: number;
  optionalLabel?: string;
}

export interface SectionDefinition {
  id: string;
  title: string;
  fields: FieldDefinition[];
}

export interface MedicationSetup {
  id: "setup";
  medicationName: string;
  currentDose: string;
  dateStarted: string;
  usualTimeTaken: string;
  reasonForStarting: string[];
  notes: string;
  updatedAt: string;
}

export interface MedicationChange {
  id: string;
  date: string;
  medicationName: string;
  dose: string;
  timeUsuallyTaken: string;
  changeType: string;
  reason: string;
  notes: string;
  updatedAt: string;
}

export interface DailyEntry {
  id: string;
  date: string;
  medicationTaken: string;
  doseTaken: string;
  timeTaken: string;
  sleepQuality: number | "";
  morningGrogginess: number | "";
  nightmares: string;
  nightWaking: string;
  morningEnergy: number | "";
  afternoonEnergy: number | "";
  morningMood: number | "";
  afternoonMood: number | "";
  daytimeEnergy?: number | "";
  mood?: number | "";
  anxietyAgitation: number | "";
  tattooingToday: string;
  tattooConcentration: number | "";
  episodeToday: string;
  episodeSeverity: string;
  episodeDuration: string;
  appetite: string;
  sideEffects: string[];
  sideEffectSeverity: string;
  warningSigns: string;
  warningDetails: string[];
  warningNote: string;
  oneLineNote: string;
  updatedAt: string;
}

export const sections: SectionDefinition[] = [
  {
    id: "basic",
    title: "Medication",
    fields: [
      { id: "medicationTaken", label: "Medication taken?", type: "select", options: ["Yes", "No", "Late"] },
      { id: "doseTaken", label: "Dose taken", type: "select", options: ["7.5mg", "15mg", "30mg", "45mg", "Other"] },
      { id: "timeTaken", label: "Time taken last night", type: "time" }
    ]
  },
  {
    id: "sleep",
    title: "Sleep",
    fields: [
      { id: "sleepQuality", label: "Sleep quality", type: "score", min: 0, max: 10 },
      { id: "morningGrogginess", label: "Morning grogginess", type: "score", min: 0, max: 10 },
      { id: "nightmares", label: "Intense dreams", type: "select", options: ["None", "Mild", "Moderate", "Severe"] },
      { id: "nightWaking", label: "Woke during the night?", type: "select", options: ["No", "Once", "Multiple times"] }
    ]
  },
  {
    id: "daytime",
    title: "Daytime",
    fields: [
      { id: "morningEnergy", label: "Morning energy", type: "score", min: 0, max: 10 },
      { id: "afternoonEnergy", label: "Afternoon energy", type: "score", min: 0, max: 10 },
      { id: "morningMood", label: "Morning mood", type: "score", min: 0, max: 10 },
      { id: "afternoonMood", label: "Afternoon mood", type: "score", min: 0, max: 10 },
      { id: "anxietyAgitation", label: "Anxiety / agitation", type: "score", min: 0, max: 10 },
      { id: "tattooingToday", label: "Tattooing today?", type: "select", options: ["No", "Yes, 1-2 hours", "Yes, 3-4 hours", "Yes, 4+ hours"] },
      { id: "tattooConcentration", label: "Concentration for tattooing", type: "score", min: 0, max: 10 }
    ]
  },
  {
    id: "episodes",
    title: "Episodes",
    fields: [
      { id: "episodeToday", label: "Episode today?", type: "select", options: ["No", "Yes"] },
      { id: "episodeSeverity", label: "If yes, severity", type: "select", options: ["Mild", "Moderate", "Severe", "Crisis"] },
      { id: "episodeDuration", label: "How long did it affect the day?", type: "select", options: ["Under 1 hour", "1 to 3 hours", "Most of the day", "Carried into the night"] }
    ]
  },
  {
    id: "appetite",
    title: "Appetite",
    fields: [
      { id: "appetite", label: "Appetite today", type: "select", options: ["Less hungry than usual", "About the same", "More hungry than usual", "Much more hungry than usual"] }
    ]
  },
  {
    id: "side-effects",
    title: "Side effects",
    fields: [
      { id: "sideEffects", label: "What showed up today?", type: "chips", options: ["Very sleepy / sedated", "Morning hangover feeling", "Dry mouth", "Dizziness", "Constipation", "Nausea", "Headache", "Brain fog / confused", "Restless legs / twitchy body", "Swollen ankles / fluid retention", "Other"] },
      { id: "sideEffectSeverity", label: "Side effect severity", type: "select", options: ["None", "Mild", "Moderate", "Severe"] }
    ]
  },
  {
    id: "safety",
    title: "Safety flag",
    fields: [
      { id: "warningSigns", label: "Any serious warning signs today?", type: "select", options: ["No", "Yes"] },
      { id: "warningDetails", label: "What happened?", type: "chips", options: ["Suicidal thoughts or thoughts of self-harm", "Severe agitation, panic or feeling out of control", "Unusual high energy, racing thoughts, risk-taking or not sleeping", "Severe confusion", "Allergic reaction symptoms", "Seizure", "Fever, sore throat or mouth ulcers", "Severe abdominal pain", "Yellowing skin/eyes or dark urine", "Other worrying symptom"] },
      { id: "warningNote", label: "Extra safety note", type: "textarea" }
    ]
  },
  {
    id: "note",
    title: "Notes",
    fields: [
      { id: "oneLineNote", label: "Anything important today?", type: "textarea" }
    ]
  }
];

export function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export function createEntryId(date: string) {
  return date;
}

export function createMedicationChangeId(date: string) {
  return `${date}_${Date.now()}`;
}

export function createEmptyMedicationSetup(): MedicationSetup {
  return {
    id: "setup",
    medicationName: "Mirtazapine",
    currentDose: "15mg",
    dateStarted: "",
    usualTimeTaken: "",
    reasonForStarting: [],
    notes: "",
    updatedAt: new Date().toISOString()
  };
}

export function createEmptyEntry(date = todayString()): DailyEntry {
  return {
    id: createEntryId(date),
    date,
    medicationTaken: "",
    doseTaken: "15mg",
    timeTaken: "",
    sleepQuality: "",
    morningGrogginess: "",
    nightmares: "",
    nightWaking: "",
    morningEnergy: "",
    afternoonEnergy: "",
    morningMood: "",
    afternoonMood: "",
    anxietyAgitation: "",
    tattooingToday: "",
    tattooConcentration: "",
    episodeToday: "No",
    episodeSeverity: "",
    episodeDuration: "",
    appetite: "",
    sideEffects: [],
    sideEffectSeverity: "",
    warningSigns: "No",
    warningDetails: [],
    warningNote: "",
    oneLineNote: "",
    updatedAt: new Date().toISOString()
  };
}

export function mergeEntry(saved: Partial<DailyEntry> | null | undefined, date: string): DailyEntry {
  const empty = createEmptyEntry(date);
  const merged = { ...empty, ...saved, date, id: createEntryId(date) };
  if (merged.morningEnergy === "" && saved?.daytimeEnergy !== undefined) merged.morningEnergy = saved.daytimeEnergy;
  if (merged.morningMood === "" && saved?.mood !== undefined) merged.morningMood = saved.mood;
  merged.sideEffects = Array.isArray(merged.sideEffects) ? merged.sideEffects : [];
  merged.warningDetails = Array.isArray(merged.warningDetails) ? merged.warningDetails : [];
  return merged;
}

export function mergeMedicationSetup(saved: Partial<MedicationSetup> | null | undefined): MedicationSetup {
  const merged = { ...createEmptyMedicationSetup(), ...saved, id: "setup" as const };
  merged.reasonForStarting = Array.isArray(merged.reasonForStarting) ? merged.reasonForStarting : [];
  return merged;
}
