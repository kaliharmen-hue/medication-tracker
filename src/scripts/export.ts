import { todayString, type DailyEntry } from "./schema";
import { entriesToChatGptPrompt, entriesToCsv, entriesToMarkdown } from "./render";
import { getAllEntries, importEntries } from "./storage";

const dateInput = document.querySelector<HTMLInputElement>("#dateInput")!;
const monthInput = document.querySelector<HTMLInputElement>("#monthInput")!;
const preview = document.querySelector<HTMLTextAreaElement>("#previewText")!;
const copyDay = document.querySelector<HTMLButtonElement>("#copyDay")!;
const copyMonth = document.querySelector<HTMLButtonElement>("#copyMonth")!;
const copyAllChatGpt = document.querySelector<HTMLButtonElement>("#copyAllChatGpt")!;
const downloadCsv = document.querySelector<HTMLButtonElement>("#downloadCsv")!;
const downloadJson = document.querySelector<HTMLButtonElement>("#downloadJson")!;
const importJson = document.querySelector<HTMLInputElement>("#importJson")!;
const selectPreview = document.querySelector<HTMLButtonElement>("#selectPreview")!;

let entries: DailyEntry[] = [];
const params = new URLSearchParams(window.location.search);
dateInput.value = params.get("date") || todayString();
monthInput.value = dateInput.value.slice(0, 7);

refresh();
dateInput.addEventListener("change", updatePreviewForDay);
monthInput.addEventListener("change", updatePreviewForMonth);
copyDay.addEventListener("click", async () => copyText(updatePreviewForDay()));
copyMonth.addEventListener("click", async () => copyText(updatePreviewForMonth()));
copyAllChatGpt.addEventListener("click", async () => copyText(updatePreviewForAllChatGpt()));
downloadCsv.addEventListener("click", () => download("medication-tracker.csv", entriesToCsv(entries), "text/csv"));
downloadJson.addEventListener("click", () => download("medication-tracker-backup.json", JSON.stringify(entries, null, 2), "application/json"));
selectPreview.addEventListener("click", () => preview.select());
importJson.addEventListener("change", importBackup);

async function refresh() {
  entries = await getAllEntries();
  updatePreviewForDay();
}

function updatePreviewForDay() {
  const selected = entries.filter((entry) => entry.date === dateInput.value);
  const text = entriesToMarkdown(selected, `Entries for ${dateInput.value}`);
  preview.value = text;
  return text;
}

function updatePreviewForMonth() {
  const selected = entries.filter((entry) => entry.date.startsWith(monthInput.value));
  const text = entriesToMarkdown(selected, `Entries for ${monthInput.value}`);
  preview.value = text;
  return text;
}

function updatePreviewForAllChatGpt() {
  const ordered = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const text = entriesToChatGptPrompt(ordered, "All saved diary entries");
  preview.value = text;
  return text;
}

async function copyText(text: string) {
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return;
    } catch {
      // Fall back to clipboard or manual select.
    }
  }
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    preview.select();
  }
}

function download(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function importBackup() {
  const file = importJson.files?.[0];
  if (!file) return;
  const parsed = JSON.parse(await file.text()) as DailyEntry[];
  await importEntries(parsed);
  await refresh();
}
