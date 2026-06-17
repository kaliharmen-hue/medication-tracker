import type { DailyEntry } from "./schema";
import { watchEntries } from "./storage";

const board = document.querySelector<HTMLElement>("#insightBoard")!;

watchEntries((entries) => {
  const recent = entries.slice(0, 30);
  if (!recent.length) {
    board.innerHTML = `<p class="empty">No entries yet. Once a few days are saved, this page will start showing gentle pattern notes.</p>`;
    return;
  }
  renderInsights(recent);
});

function renderInsights(entries: DailyEntry[]) {
  const cards = [
    countCard("Recent check-ins", `${entries.length}`, "Saved daily entries from the latest days."),
    averageCard("Sleep quality", entries.map((entry) => entry.sleepQuality), "Lower sleep scores may be worth comparing with grogginess and episodes."),
    averageCard("Mood", entries.map((entry) => entry.mood), "This is only a rough marker, not a diagnosis."),
    countCard("Episode days", String(entries.filter((entry) => entry.episodeToday === "Yes").length), "Days where an episode was recorded."),
    countCard("Moderate or severe side effects", String(entries.filter((entry) => ["Moderate", "Severe"].includes(entry.sideEffectSeverity)).length), "These may be worth raising with the GP or prescriber if they persist."),
    safetyCard(entries)
  ];

  board.innerHTML = cards.join("");
}

function averageCard(title: string, values: Array<number | "">, note: string) {
  const numbers = values.filter((value): value is number => typeof value === "number");
  const body = numbers.length ? (numbers.reduce((sum, value) => sum + value, 0) / numbers.length).toFixed(1) : "Not enough data";
  return card(title, body, note);
}

function countCard(title: string, body: string, note: string) {
  return card(title, body, note);
}

function safetyCard(entries: DailyEntry[]) {
  const count = entries.filter((entry) => entry.warningSigns === "Yes").length;
  const note = count ? "Safety flags deserve direct attention outside the app." : "No safety flags in the recent saved entries.";
  return card("Safety flags", String(count), note);
}

function card(title: string, body: string, note: string) {
  return `<article class="insight-card"><h2>${title}</h2><strong>${body}</strong><p>${note}</p></article>`;
}
