import { todayString, type DailyEntry } from "./schema";
import { watchMonth, storageMode } from "./storage";

const monthInput = document.querySelector<HTMLInputElement>("#monthInput")!;
const grid = document.querySelector<HTMLElement>("#historyGrid")!;
let stopWatch = () => {};

monthInput.value = todayString().slice(0, 7);
monthInput.addEventListener("change", startWatch);
startWatch();

function startWatch() {
  stopWatch();
  grid.innerHTML = `<p class="empty">Loading entries...</p>`;
  stopWatch = watchMonth(monthInput.value, render);
}

function render(entries: DailyEntry[]) {
  if (!entries.length) {
    grid.innerHTML = `<p class="empty">No entries saved for this month yet${storageMode() === "local" ? " in this browser" : ""}.</p>`;
    return;
  }

  grid.innerHTML = "";
  entries.forEach((entry) => {
    const card = document.createElement("article");
    card.className = "day-card";
    card.innerHTML = `<h2>${formatDate(entry.date)}</h2>${entryCard(entry)}`;
    grid.append(card);
  });
}

function entryCard(entry: DailyEntry) {
  const flags = [
    entry.medicationTaken && `Medication: ${entry.medicationTaken}`,
    entry.sleepQuality !== "" && `Sleep ${entry.sleepQuality}/10`,
    entry.mood !== "" && `Mood ${entry.mood}/10`,
    entry.anxietyAgitation !== "" && `Anxiety ${entry.anxietyAgitation}/10`,
    entry.tattooingToday && `Tattooing: ${entry.tattooingToday}`,
    entry.episodeToday === "Yes" && `Episode: ${entry.episodeSeverity || "Yes"}`,
    entry.sideEffectSeverity && `Side effects: ${entry.sideEffectSeverity}`,
    entry.warningSigns === "Yes" && "Safety flag"
  ].filter(Boolean);
  return `
    <section class="history-entry">
      <div class="tag-row">${flags.map((flag) => `<span>${flag}</span>`).join("") || "<span>No fields filled yet</span>"}</div>
      ${entry.oneLineNote ? `<p>${escapeHtml(entry.oneLineNote)}</p>` : ""}
      ${entry.kaliNotes ? `<p><strong>Kali notes:</strong> ${escapeHtml(entry.kaliNotes)}</p>` : ""}
    </section>
  `;
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char] || char);
}
