import {
  createMedicationChangeId,
  mergeMedicationSetup,
  todayString,
  type MedicationChange,
  type MedicationSetup
} from "./schema";
import {
  deleteMedicationChange,
  saveMedicationChange,
  saveMedicationSetup,
  watchMedication
} from "./storage";

const setupForm = document.querySelector<HTMLFormElement>("#setupForm")!;
const changeForm = document.querySelector<HTMLFormElement>("#changeForm")!;
const saveState = document.querySelector<HTMLElement>("#medicationSaveState")!;
const reasonForStarting = document.querySelector<HTMLElement>("#reasonForStarting")!;
const changeHistory = document.querySelector<HTMLElement>("#changeHistory")!;

const reasonOptions = ["Depression", "Anxiety / agitation", "Sleep", "Intense dreams", "Episodes / emotional dysregulation", "Other"];
let currentSetup = mergeMedicationSetup(null);
let setupSaveTimer = 0;

renderReasonChips();
watchMedication((setup, changes) => {
  currentSetup = setup;
  fillSetupForm(setup);
  fillChangeDefaults(setup);
  renderChanges(changes);
});

setupForm.addEventListener("input", scheduleSetupSave);
setupForm.addEventListener("change", scheduleSetupSave);
changeForm.addEventListener("submit", addMedicationChange);
changeHistory.addEventListener("click", deleteChange);

function renderReasonChips() {
  reasonForStarting.innerHTML = "";
  reasonOptions.forEach((option) => {
    const label = document.createElement("label");
    label.className = "chip";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = "reasonForStarting";
    input.value = option;
    label.append(input, document.createTextNode(option));
    reasonForStarting.append(label);
  });
}

function fillSetupForm(setup: MedicationSetup) {
  (setupForm.elements.namedItem("medicationName") as HTMLInputElement).value = setup.medicationName;
  (setupForm.elements.namedItem("currentDose") as HTMLSelectElement).value = setup.currentDose;
  (setupForm.elements.namedItem("dateStarted") as HTMLInputElement).value = setup.dateStarted;
  (setupForm.elements.namedItem("usualTimeTaken") as HTMLInputElement).value = setup.usualTimeTaken;
  (setupForm.elements.namedItem("notes") as HTMLTextAreaElement).value = setup.notes;
  setupForm.querySelectorAll<HTMLInputElement>('input[name="reasonForStarting"]').forEach((input) => {
    input.checked = setup.reasonForStarting.includes(input.value);
  });
}

function fillChangeDefaults(setup: MedicationSetup) {
  const date = changeForm.elements.namedItem("date") as HTMLInputElement;
  const medication = changeForm.elements.namedItem("medicationName") as HTMLInputElement;
  const dose = changeForm.elements.namedItem("dose") as HTMLSelectElement;
  const time = changeForm.elements.namedItem("timeUsuallyTaken") as HTMLInputElement;
  if (!date.value) date.value = todayString();
  if (!medication.value) medication.value = setup.medicationName;
  if (!dose.value) dose.value = setup.currentDose;
  if (!time.value) time.value = setup.usualTimeTaken;
}

function scheduleSetupSave() {
  window.clearTimeout(setupSaveTimer);
  saveState.textContent = "Saving...";
  setupSaveTimer = window.setTimeout(saveSetupNow, 550);
}

async function saveSetupNow() {
  currentSetup = collectSetup();
  await saveMedicationSetup(currentSetup);
  saveState.textContent = `Saved ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function collectSetup(): MedicationSetup {
  return {
    id: "setup",
    medicationName: (setupForm.elements.namedItem("medicationName") as HTMLInputElement).value,
    currentDose: (setupForm.elements.namedItem("currentDose") as HTMLSelectElement).value,
    dateStarted: (setupForm.elements.namedItem("dateStarted") as HTMLInputElement).value,
    usualTimeTaken: (setupForm.elements.namedItem("usualTimeTaken") as HTMLInputElement).value,
    reasonForStarting: [...setupForm.querySelectorAll<HTMLInputElement>('input[name="reasonForStarting"]:checked')].map((input) => input.value),
    notes: (setupForm.elements.namedItem("notes") as HTMLTextAreaElement).value,
    updatedAt: new Date().toISOString()
  };
}

async function addMedicationChange(event: SubmitEvent) {
  event.preventDefault();
  const change = collectChange();
  await saveMedicationChange(change);
  await saveMedicationSetup({
    ...currentSetup,
    medicationName: change.medicationName || currentSetup.medicationName,
    currentDose: change.dose || currentSetup.currentDose,
    usualTimeTaken: change.timeUsuallyTaken || currentSetup.usualTimeTaken,
    dateStarted: change.changeType === "Started medication" || change.changeType === "Switched medication"
      ? change.date
      : currentSetup.dateStarted
  });
  changeForm.reset();
  fillChangeDefaults({ ...currentSetup, medicationName: change.medicationName, currentDose: change.dose, usualTimeTaken: change.timeUsuallyTaken });
  saveState.textContent = "Medication change added";
}

function collectChange(): MedicationChange {
  const date = (changeForm.elements.namedItem("date") as HTMLInputElement).value || todayString();
  return {
    id: createMedicationChangeId(date),
    date,
    medicationName: (changeForm.elements.namedItem("medicationName") as HTMLInputElement).value,
    dose: (changeForm.elements.namedItem("dose") as HTMLSelectElement).value,
    timeUsuallyTaken: (changeForm.elements.namedItem("timeUsuallyTaken") as HTMLInputElement).value,
    changeType: (changeForm.elements.namedItem("changeType") as HTMLSelectElement).value,
    reason: (changeForm.elements.namedItem("reason") as HTMLSelectElement).value,
    notes: (changeForm.elements.namedItem("notes") as HTMLTextAreaElement).value,
    updatedAt: new Date().toISOString()
  };
}

function renderChanges(changes: MedicationChange[]) {
  if (!changes.length) {
    changeHistory.innerHTML = `<p class="empty">No medication changes logged yet.</p>`;
    return;
  }
  changeHistory.innerHTML = changes.map((change) => `
    <article class="day-card">
      <div class="panel-title">
        <h2>${formatDate(change.date)}</h2>
        <button class="button subtle" type="button" data-delete-change="${change.id}">Delete</button>
      </div>
      <div class="tag-row">
        ${change.changeType ? `<span>${escapeHtml(change.changeType)}</span>` : ""}
        ${change.medicationName ? `<span>${escapeHtml(change.medicationName)}</span>` : ""}
        ${change.dose ? `<span>${escapeHtml(change.dose)}</span>` : ""}
        ${change.timeUsuallyTaken ? `<span>${escapeHtml(change.timeUsuallyTaken)}</span>` : ""}
      </div>
      ${change.reason ? `<p><strong>Reason:</strong> ${escapeHtml(change.reason)}</p>` : ""}
      ${change.notes ? `<p>${escapeHtml(change.notes)}</p>` : ""}
    </article>
  `).join("");
}

async function deleteChange(event: MouseEvent) {
  const target = event.target as HTMLElement;
  const id = target.dataset.deleteChange;
  if (!id) return;
  await deleteMedicationChange(id);
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char] || char);
}
