import { sections, type DailyEntry, type FieldDefinition } from "./schema";

export function renderField(field: FieldDefinition, entry: DailyEntry) {
  const value = entry[field.id] as string | number | string[];
  const wrapper = document.createElement("div");
  wrapper.className = "field";
  wrapper.dataset.field = String(field.id);

  const label = document.createElement("label");
  label.textContent = field.label;
  wrapper.append(label);

  if (field.type === "score") {
    const row = document.createElement("div");
    row.className = "range-row";
    const input = document.createElement("input");
    input.type = "range";
    input.min = String(field.min ?? 0);
    input.max = String(field.max ?? 10);
    input.step = "1";
    input.name = String(field.id);
    input.value = value === "" ? "5" : String(value);
    input.dataset.empty = value === "" ? "true" : "false";
    const output = document.createElement("output");
    output.textContent = value === "" ? "Not set" : String(value);
    input.addEventListener("input", () => {
      input.dataset.empty = "false";
      output.textContent = input.value;
    });
    row.append(input, output);
    wrapper.append(row);
    if (field.optionalLabel) {
      const optional = document.createElement("button");
      optional.type = "button";
      optional.className = "chip";
      optional.textContent = field.optionalLabel;
      optional.addEventListener("click", () => {
        input.dataset.empty = "true";
        output.textContent = field.optionalLabel || "Not set";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      wrapper.append(optional);
    }
    return wrapper;
  }

  if (field.type === "select") {
    const select = document.createElement("select");
    select.name = String(field.id);
    select.append(new Option("Not set", ""));
    field.options?.forEach((option) => select.append(new Option(option, option)));
    select.value = String(value || "");
    wrapper.append(select);
    return wrapper;
  }

  if (field.type === "chips") {
    const chipGroup = document.createElement("div");
    chipGroup.className = "chip-group";
    const selected = Array.isArray(value) ? value : [];
    field.options?.forEach((option) => {
      const chip = document.createElement("label");
      chip.className = "chip";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = String(field.id);
      input.value = option;
      input.checked = selected.includes(option);
      chip.append(input, document.createTextNode(option));
      chipGroup.append(chip);
    });
    wrapper.append(chipGroup);
    return wrapper;
  }

  if (field.type === "textarea") {
    const textarea = document.createElement("textarea");
    textarea.name = String(field.id);
    textarea.rows = 3;
    textarea.value = String(value || "");
    wrapper.append(textarea);
    return wrapper;
  }

  const input = document.createElement("input");
  input.name = String(field.id);
  input.type = field.type;
  input.value = String(value || "");
  wrapper.append(input);
  return wrapper;
}

export function entryToMarkdown(entry: DailyEntry) {
  const lines = [`# Daily check-in: ${entry.date}`, ""];
  sections.forEach((section) => {
    lines.push(`## ${section.title}`);
    section.fields.forEach((field) => {
      const raw = entry[field.id] as string | number | string[];
      const value = Array.isArray(raw) ? (raw.length ? raw.join(", ") : "Not set") : raw === "" ? "Not set" : String(raw);
      lines.push(`- ${field.label}: ${value}`);
    });
    lines.push("");
  });
  return lines.join("\n");
}

export function entriesToMarkdown(entries: DailyEntry[], title: string) {
  if (!entries.length) return `${title}\n\nNo entries found.`;
  return [`# ${title}`, "", ...entries.map(entryToMarkdown)].join("\n---\n");
}

export function entriesToChatGptPrompt(entries: DailyEntry[], selectedDate: string) {
  const title = entries.length === 1
    ? `Medication tracker day export for ChatGPT`
    : `Medication tracker trend export for ChatGPT`;
  const scope = entries.length === 1 ? "1 saved entry" : `${entries.length} saved entries`;
  return [
    `# ${title}`,
    "",
    `Export scope: ${selectedDate}`,
    `Included data: ${scope}`,
    "",
    "Please review this medication tracker data cautiously.",
    "",
    "What I need back:",
    "- Plain-English patterns worth noticing",
    "- Possible links between sleep, grogginess, mood, anxiety, tattooing/concentration, episodes, appetite, and side effects",
    "- Whether things appear to be improving, staying broadly the same, or getting worse over time",
    "- Anything that may be useful to mention to a GP/prescriber",
    "- Questions to ask the doctor",
    "- Please avoid diagnosis or certainty; use careful language like 'may be worth watching'",
    "",
    entriesToMarkdown(entries, "Tracker entries")
  ].join("\n");
}

export function entriesToCsv(entries: DailyEntry[]) {
  const fields = ["date", ...sections.flatMap((section) => section.fields.map((field) => String(field.id))), "updatedAt"];
  const rows = [fields.join(",")];
  entries.forEach((entry) => {
    rows.push(fields.map((field) => csvCell((entry as unknown as Record<string, unknown>)[field])).join(","));
  });
  return rows.join("\n");
}

function csvCell(value: unknown) {
  const text = Array.isArray(value) ? value.join("; ") : value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}
