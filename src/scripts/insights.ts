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
  const latest = entries[0];
  const commonSideEffects = topSideEffects(entries);
  const doctorNotes = buildDoctorNotes(entries, commonSideEffects);
  const cards = [
    countCard("Recent check-ins", `${entries.length}`, `Latest saved day: ${formatDate(latest.date)}.`),
    countCard("Current dose", latest.doseTaken || "Not set", latest.timeTaken ? `Usually logged at ${latest.timeTaken}.` : "Based on the latest saved entry."),
    averageCard("Sleep quality", entries.map((entry) => entry.sleepQuality), trendNote(entries, "sleepQuality", "sleep quality")),
    averageCard("Morning grogginess", entries.map((entry) => entry.morningGrogginess), "Higher scores may be worth comparing with dose time and sleep quality."),
    averageCard("Morning energy", entries.map((entry) => entry.morningEnergy), trendNote(entries, "morningEnergy", "morning energy")),
    averageCard("Afternoon energy", entries.map((entry) => entry.afternoonEnergy), trendNote(entries, "afternoonEnergy", "afternoon energy")),
    averageCard("Morning mood", entries.map((entry) => entry.morningMood), trendNote(entries, "morningMood", "morning mood")),
    averageCard("Afternoon mood", entries.map((entry) => entry.afternoonMood), trendNote(entries, "afternoonMood", "afternoon mood")),
    averageCard("Anxiety / agitation", entries.map((entry) => entry.anxietyAgitation), trendNote(entries, "anxietyAgitation", "anxiety / agitation")),
    averageCard("Tattoo concentration", entries.filter((entry) => entry.tattooingToday && entry.tattooingToday !== "No").map((entry) => entry.tattooConcentration), "Only includes days marked as tattooing days."),
    countCard("Tattooing days", String(entries.filter((entry) => entry.tattooingToday && entry.tattooingToday !== "No").length), "Days where tattooing time was logged."),
    countCard("Episode days", String(entries.filter((entry) => entry.episodeToday === "Yes").length), "Days where an episode was recorded."),
    countCard("Side effects to mention", commonSideEffects || "None repeated", "Most repeated side effects in the recent entries."),
    countCard("Moderate/severe side effects", String(entries.filter((entry) => ["Moderate", "Severe"].includes(entry.sideEffectSeverity)).length), "Persistent or severe side effects are worth raising with the prescriber."),
    safetyCard(entries)
  ];

  board.innerHTML = [
    ...cards,
    `<article class="insight-card wide"><h2>Doctor conversation notes</h2><ul>${doctorNotes.map((note) => `<li>${note}</li>`).join("")}</ul></article>`
  ].join("");
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

function trendNote(entries: DailyEntry[], field: keyof DailyEntry, label: string) {
  const recent = average(entries.slice(0, 7).map((entry) => entry[field]));
  const previous = average(entries.slice(7, 14).map((entry) => entry[field]));
  if (recent == null || previous == null) return `Not enough recent data yet to compare ${label}.`;
  const change = recent - previous;
  if (Math.abs(change) < 0.8) return `Recent ${label} looks broadly similar to the previous week.`;
  return change > 0
    ? `Recent ${label} is higher than the previous week.`
    : `Recent ${label} is lower than the previous week.`;
}

function average(values: unknown[]) {
  const numbers = values.filter((value): value is number => typeof value === "number");
  if (!numbers.length) return null;
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

function topSideEffects(entries: DailyEntry[]) {
  const counts = new Map<string, number>();
  entries.forEach((entry) => {
    entry.sideEffects.forEach((effect) => counts.set(effect, (counts.get(effect) || 0) + 1));
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([effect, count]) => `${effect} (${count})`)
    .join(", ");
}

function buildDoctorNotes(entries: DailyEntry[], commonSideEffects: string) {
  const notes = [];
  const episodeDays = entries.filter((entry) => entry.episodeToday === "Yes").length;
  const safetyFlags = entries.filter((entry) => entry.warningSigns === "Yes").length;
  const moderateSevereSideEffects = entries.filter((entry) => ["Moderate", "Severe"].includes(entry.sideEffectSeverity)).length;
  const lateOrMissed = entries.filter((entry) => ["No", "Late"].includes(entry.medicationTaken)).length;

  notes.push(`Recent window covers ${entries.length} saved check-ins from ${formatDate(entries[entries.length - 1].date)} to ${formatDate(entries[0].date)}.`);
  if (lateOrMissed) notes.push(`${lateOrMissed} day(s) were logged as missed or late medication.`);
  const tattooDays = entries.filter((entry) => entry.tattooingToday && entry.tattooingToday !== "No").length;
  if (tattooDays) notes.push(`${tattooDays} day(s) included tattooing; concentration scores may help track work functioning.`);
  if (episodeDays) notes.push(`${episodeDays} day(s) included an episode; compare these with sleep, anxiety, and side-effect notes.`);
  if (moderateSevereSideEffects) notes.push(`${moderateSevereSideEffects} entry/entries had moderate or severe side effects.`);
  if (commonSideEffects) notes.push(`Repeated side effects: ${commonSideEffects}.`);
  if (safetyFlags) notes.push(`${safetyFlags} safety flag(s) were recorded and should be discussed directly.`);
  if (!episodeDays && !moderateSevereSideEffects && !safetyFlags) notes.push("No episode days, safety flags, or moderate/severe side effects are recorded in this recent window.");
  notes.push("Useful doctor question: does the dose timing or dose level fit the sleep, grogginess, morning/afternoon energy, mood, and side-effect pattern?");

  return notes;
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString([], { month: "short", day: "numeric" });
}
