import { sections, todayString, createEntryId, mergeEntry, type DailyEntry } from "./schema";
import { entriesToChatGptPrompt, renderField } from "./render";
import { getEntry, getMedicationChanges, getMedicationSetup, saveEntry, storageMode } from "./storage";

const form = document.querySelector<HTMLFormElement>("#dailyForm")!;
const dateInput = document.querySelector<HTMLInputElement>("#dateInput")!;
const saveState = document.querySelector<HTMLElement>("#saveState")!;
const syncText = document.querySelector<HTMLElement>("#syncText")!;
const exportLink = document.querySelector<HTMLAnchorElement>("#exportLink")!;
const copyChatGpt = document.querySelector<HTMLButtonElement>("#copyChatGpt")!;
const copyStatus = document.querySelector<HTMLElement>("#copyStatus")!;
const copyFallback = document.querySelector<HTMLTextAreaElement>("#copyFallback")!;
const base = import.meta.env.BASE_URL.endsWith("/") ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;

let currentEntry: DailyEntry;
let saveTimer = 0;

dateInput.value = new URLSearchParams(window.location.search).get("date") || todayString();

syncText.textContent = storageMode() === "firebase"
  ? "Firebase is configured. Entries autosave into a shared realtime collection."
  : "Firebase keys are not set yet. This preview saves locally in this browser only.";

loadEntry();

dateInput.addEventListener("change", loadEntry);

form.addEventListener("input", scheduleSave);
form.addEventListener("change", scheduleSave);
copyChatGpt.addEventListener("click", copyForChatGpt);

async function loadEntry() {
  currentEntry = await getEntry(dateInput.value);
  renderForm(currentEntry);
  updateExportLink();
  saveState.textContent = "Autosaves as I go";
}

function renderForm(entry: DailyEntry) {
  form.innerHTML = "";
  sections.forEach((section) => {
    const fieldset = document.createElement("fieldset");
    const legend = document.createElement("legend");
    legend.textContent = section.title;
    fieldset.append(legend);
    section.fields.forEach((field) => fieldset.append(renderField(field, entry)));
    form.append(fieldset);
  });
}

function scheduleSave() {
  window.clearTimeout(saveTimer);
  saveState.textContent = "Saving...";
  saveTimer = window.setTimeout(saveNow, 550);
}

async function saveNow() {
  const entry = collectEntry();
  await saveEntry(entry);
  currentEntry = entry;
  saveState.textContent = `Saved ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

async function copyForChatGpt() {
  window.clearTimeout(saveTimer);
  copyChatGpt.disabled = true;
  copyStatus.textContent = "Preparing copy...";
  let text = "";

  try {
    await saveNow();
    const selectedDate = dateInput.value;
    const [medicationSetup, medicationChanges] = await Promise.all([getMedicationSetup(), getMedicationChanges()]);
    text = entriesToChatGptPrompt([currentEntry], `Selected day: ${selectedDate}`, medicationSetup, medicationChanges);

    await copyText(text);
    copyStatus.textContent = "Copied. Paste it into ChatGPT when you are ready.";
    copyFallback.hidden = true;
  } catch {
    if (!text) text = entriesToChatGptPrompt([currentEntry], `Selected day: ${dateInput.value}`);
    copyFallback.hidden = false;
    copyFallback.value = text;
    copyFallback.select();
    copyStatus.textContent = "Copy was blocked here, so the text is selected below for manual copy.";
  } finally {
    copyChatGpt.disabled = false;
  }
}

function collectEntry(): DailyEntry {
  const next = mergeEntry(currentEntry, dateInput.value);
  next.id = createEntryId(next.date);

  sections.flatMap((section) => section.fields).forEach((field) => {
    if (field.type === "chips") {
      const checked = [...form.querySelectorAll<HTMLInputElement>(`input[name="${String(field.id)}"]:checked`)].map((input) => input.value);
      (next as unknown as Record<string, unknown>)[field.id] = checked;
      return;
    }
    const element = form.elements.namedItem(String(field.id)) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
    if (!element) return;
    if (field.type === "score") {
      (next as unknown as Record<string, unknown>)[field.id] = element.dataset.empty === "true" ? "" : Number(element.value);
      return;
    }
    (next as unknown as Record<string, unknown>)[field.id] = element.value;
  });

  return next;
}

function updateExportLink() {
  exportLink.href = `${base}export/?date=${encodeURIComponent(dateInput.value)}`;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    if (navigator.share) {
      await navigator.share({ text });
      return;
    }
    throw new Error("No clipboard or share support");
  }
}
