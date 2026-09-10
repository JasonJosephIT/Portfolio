// admin/content.js — the owner's structured content editor.
//
// It edits a copy of the canonical document held in this browser. A browser
// cannot write to the git repository, so the honest loop is: open the file,
// edit records, export the file, save it over content/portfolio.json yourself,
// then build. Nothing here publishes or deploys anything.
//
// Every canonical rule — validation, publication, curation, deletion — comes
// from lib/portfolio-content.mjs. This file is the interface over it.

import { requireAuth, signOut } from "./auth.js";
import { getClient, SUPABASE_URL, BUCKET } from "./config.js";
import {
  RECORD_KINDS,
  kindOf,
  slugify,
  uniqueSlug,
  nextRecordId,
  parseCanonical,
  serializeCanonical,
  upsertRecord,
  setMembership,
  curatedView,
  structuredLayout,
  inboxAssetPath,
  recordErrors,
  fieldOfError,
} from "./content-model.mjs";
import {
  createEmptyPortfolio,
  validatePortfolio,
  setPublication,
  toggleCurated,
  moveCurated,
  removeRecord,
} from "../lib/portfolio-content.mjs";

/* ------------------------------------------------------------------ *
 * Authentication first: no editor UI and no client call before it.
 * ------------------------------------------------------------------ */

const main = document.getElementById("main");
main.hidden = true;
try {
  await requireAuth("../login/");
} catch (error) {
  // requireAuth redirects when there is no session, so reaching here means it
  // could not tell either way — Supabase unreachable, say. Dying quietly behind
  // a hidden #main would leave the owner staring at an empty page, so show the
  // page far enough to carry the reason, then stop before any client call.
  main.hidden = false;
  document.getElementById("file-status").textContent =
    `The editor could not start: your sign-in could not be checked (${error.message}). Reload the page, or sign in again from the login page. Nothing has been loaded and nothing has changed.`;
  throw error;
}
main.hidden = false;
document.getElementById("signout").addEventListener("click", () => signOut("../login/"));

const sb = getClient();
const publicUrl = (path) => `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;

/* ------------------------------------------------------------------ *
 * DOM helpers. Record text is always set as text, never as markup.
 * ------------------------------------------------------------------ */

const $ = (id) => document.getElementById(id);

function el(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(options)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === "text") node.textContent = value;
    else if (key === "class") node.className = value;
    else if (key === "dataset") Object.assign(node.dataset, value);
    else if (key === "on") for (const [event, handler] of Object.entries(value)) node.addEventListener(event, handler);
    else if (key in node && key !== "list") node[key] = value;
    else node.setAttribute(key, value === true ? "" : value);
  }
  for (const child of children) if (child) node.append(child);
  return node;
}

const clear = (node) => {
  while (node.firstChild) node.firstChild.remove();
  return node;
};

const list = (items, className) => el("ul", { class: className }, items);

/** Hand the browser a file. This is a download, not a write to the repository. */
function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const anchor = el("a", { href: url, download: name });
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ------------------------------------------------------------------ *
 * State
 * ------------------------------------------------------------------ */

const state = {
  doc: null,
  origin: null, // the file name the document came from
  editing: null, // { type, id } while a record form is open
  focus: null, // data-focus value to restore after the next render
  submissions: [],
  kind: "photo",
};

const say = (id, message) => {
  $(id).textContent = message;
};

const fileStatus = (message) => say("file-status", message);

function commit(next, message) {
  state.doc = next;
  render();
  if (message) fileStatus(message);
}

/**
 * Store a change the field that made it is already showing.
 *
 * Re-rendering on every `change` event would rebuild the input the owner just
 * left and throw their place in the form away, so only the checks are redrawn.
 */
function apply(next) {
  state.doc = next;
  renderChecks();
}

/* ------------------------------------------------------------------ *
 * Fields
 * ------------------------------------------------------------------ */

const imageFields = (base, label) => [
  {
    name: `${base}.src`,
    label: `${label} path`,
    hint: "A repo-relative path such as assets/harbour-lights.jpg, or an https address. No spaces, accents or query strings.",
  },
  {
    name: `${base}.alt`,
    label: `${label} alt text`,
    type: "textarea",
    hint: "Describe what this image shows, in your own words. Required before publishing, and never a filename.",
  },
  { name: `${base}.width`, label: "Width in pixels", type: "number" },
  { name: `${base}.height`, label: "Height in pixels", type: "number" },
  { name: `${base}.focalPoint.x`, label: "Focal point across", type: "number", step: "0.01", hint: "0 to 1. Set both, or neither." },
  { name: `${base}.focalPoint.y`, label: "Focal point down", type: "number", step: "0.01" },
];

const IDENTITY = [
  { name: "title", label: "Title", hint: "Required before publishing." },
  {
    name: "slug",
    label: "Slug",
    hint: "Lowercase words joined by hyphens. It becomes the detail page address, so changing it changes a public link.",
  },
];

const FIELDS = {
  piece: [
    ...IDENTITY,
    ...imageFields("image", "Image"),
    { name: "year", label: "Year", hint: "Text, so a range such as 2019–2021 works." },
    { name: "medium", label: "Medium" },
    { name: "dimensions", label: "Dimensions", hint: "The physical size of the artwork." },
    { name: "caption", label: "Caption", type: "textarea" },
    { name: "styleIds", label: "Styles", type: "styles" },
  ],
  "art-project": [
    ...IDENTITY,
    ...imageFields("cover", "Cover"),
    { name: "summary", label: "Summary", type: "textarea" },
    { name: "year", label: "Year" },
  ],
  "tech-project": [
    ...IDENTITY,
    ...imageFields("cover", "Cover"),
    { name: "summary", label: "Summary", type: "textarea", hint: "Required before publishing. Around 15 to 30 words reads well." },
    { name: "role", label: "Role" },
    { name: "year", label: "Year" },
    { name: "technologies", label: "Technologies", type: "commas", hint: "Separate them with commas." },
    { name: "liveUrl", label: "Live address", type: "url", hint: "A full https address, or leave it empty." },
    { name: "repositoryUrl", label: "Repository address", type: "url" },
    { name: "sections", label: "Case study sections", type: "sections" },
    { name: "screenshots", label: "Screenshots", type: "screenshots" },
  ],
};

const getPath = (source, path) =>
  path.split(".").reduce((value, key) => (value === undefined || value === null ? undefined : value[key]), source);

function setPath(target, path, value) {
  if (value === undefined) return;
  const keys = path.split(".");
  let node = target;
  for (const key of keys.slice(0, -1)) {
    if (typeof node[key] !== "object" || node[key] === null) node[key] = {};
    node = node[key];
  }
  node[keys.at(-1)] = value;
}

const textValue = (input) => {
  const value = input.value.trim();
  return value === "" ? undefined : value;
};

const numberValue = (input) => {
  const value = input.value.trim();
  if (value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value; // a non-number is passed on so validation names it
};

/* ------------------------------------------------------------------ *
 * Building a record form
 * ------------------------------------------------------------------ */

let fieldSeed = 0;
const fieldId = () => `f${(fieldSeed += 1)}`;

function control(field, value, { register = true } = {}) {
  const id = fieldId();
  const shared = register ? { id, name: field.name } : { id };
  const input =
    field.type === "textarea"
      ? el("textarea", { ...shared, rows: 3, value: value ?? "" })
      : el("input", {
          ...shared,
          type: field.type === "number" ? "number" : field.type === "url" ? "url" : "text",
          step: field.step,
          value: value ?? "",
        });
  const parts = [el("label", { for: id, text: field.label }), input];
  if (field.hint) {
    const hintId = `${id}-hint`;
    input.setAttribute("aria-describedby", hintId);
    parts.push(el("p", { class: "admin-hint", id: hintId, text: field.hint }));
  }
  return el("div", { class: "admin-field", dataset: register ? { field: field.name } : {} }, parts);
}

/** A repeated group of sub-fields (case study sections, screenshots, contacts). */
function repeater({ legend, hint, rows, fields, onChange }) {
  const host = el("div", { class: "admin-repeat" });
  const draw = () => {
    clear(host);
    rows.forEach((row, index) => {
      const inputs = fields.map((field) => {
        const wrapper = control(field, getPath(row, field.name) ?? "", { register: false });
        const input = wrapper.querySelector("input, textarea");
        input.addEventListener("change", () => {
          setPath(row, field.name, field.type === "number" ? numberValue(input) : textValue(input));
          onChange();
        });
        return wrapper;
      });
      host.append(
        el("div", { class: "admin-repeat__row" }, [
          ...inputs,
          el("button", {
            type: "button",
            class: "admin-danger",
            text: `Remove ${legend.toLowerCase()} ${index + 1}`,
            on: {
              click: () => {
                rows.splice(index, 1);
                onChange();
                draw();
                host.querySelector("button")?.focus();
              },
            },
          }),
        ]),
      );
    });
    host.append(
      el("button", {
        type: "button",
        text: `Add ${legend.toLowerCase()}`,
        on: {
          click: () => {
            rows.push({});
            onChange();
            draw();
            host.querySelector(".admin-repeat__row input, .admin-repeat__row textarea")?.focus();
          },
        },
      }),
    );
  };
  draw();
  return el("fieldset", { class: "admin-group" }, [
    el("legend", { text: legend }),
    hint ? el("p", { class: "admin-hint", text: hint }) : null,
    host,
  ]);
}

/**
 * The structured form for one record. `record` is the current values; the form
 * buffers edits until Save, so a half-typed field never lands in the document.
 */
function recordForm(type, record, { submitLabel, onSubmit, onCancel }) {
  const form = el("form", { class: "admin-form admin-record-form", novalidate: true });
  const errorBox = el("div", { class: "admin-errors", role: "alert" });
  const repeats = { sections: structuredClone(record.sections ?? []), screenshots: structuredClone(record.screenshots ?? []) };

  for (const field of FIELDS[type]) {
    if (field.type === "styles") {
      const styles = state.doc?.styles ?? [];
      form.append(
        el("fieldset", { class: "admin-group" }, [
          el("legend", { text: field.label }),
          styles.length === 0
            ? el("p", { class: "admin-hint", text: "No styles defined yet. Add one under Styles below." })
            : el(
                "div",
                { class: "admin-checks" },
                styles.map((style) => {
                  const id = fieldId();
                  return el("div", { class: "admin-check" }, [
                    el("input", {
                      type: "checkbox",
                      id,
                      name: "styleIds",
                      value: style.id,
                      checked: (record.styleIds ?? []).includes(style.id),
                    }),
                    el("label", { for: id, text: style.name || style.id }),
                  ]);
                }),
              ),
        ]),
      );
      continue;
    }
    if (field.type === "sections") {
      form.append(
        repeater({
          legend: "Section",
          hint: "Both a title and a body are needed; an empty section is rejected rather than rendered.",
          rows: repeats.sections,
          fields: [
            { name: "title", label: "Section title" },
            { name: "body", label: "Section body", type: "textarea" },
          ],
          onChange: () => {},
        }),
      );
      continue;
    }
    if (field.type === "screenshots") {
      form.append(
        repeater({
          legend: "Screenshot",
          hint: "Each screenshot needs its own alt text before this project can be published.",
          rows: repeats.screenshots,
          fields: [
            { name: "src", label: "Screenshot path" },
            { name: "alt", label: "Screenshot alt text", type: "textarea" },
            { name: "width", label: "Width in pixels", type: "number" },
            { name: "height", label: "Height in pixels", type: "number" },
          ],
          onChange: () => {},
        }),
      );
      continue;
    }
    const current =
      field.type === "commas" ? (record[field.name] ?? []).join(", ") : getPath(record, field.name) ?? "";
    form.append(control(field, current));
  }

  form.append(
    errorBox,
    el("div", { class: "admin-actions" }, [
      el("button", { type: "submit", text: submitLabel, dataset: { focus: "record-submit" } }),
      onCancel ? el("button", { type: "button", class: "admin-quiet", text: "Cancel", on: { click: onCancel } }) : null,
    ]),
  );

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    onSubmit(readForm(form, type, repeats), { form, errorBox });
  });

  return form;
}

/** Collect the form into a record body: blank optional fields are left out entirely. */
function readForm(form, type, repeats) {
  const value = {};
  for (const field of FIELDS[type]) {
    if (field.type === "styles") {
      const checked = [...form.querySelectorAll('input[name="styleIds"]:checked')].map((input) => input.value);
      if (checked.length > 0) value.styleIds = checked;
      continue;
    }
    if (field.type === "sections" || field.type === "screenshots") continue;
    const input = form.elements[field.name];
    if (!input) continue;
    if (field.type === "commas") {
      const parts = input.value.split(",").map((part) => part.trim()).filter((part) => part !== "");
      if (parts.length > 0) value[field.name] = [...new Set(parts)];
      continue;
    }
    setPath(value, field.name, field.type === "number" ? numberValue(input) : textValue(input));
  }

  const sections = repeats.sections.filter((row) => row.title || row.body);
  if (sections.length > 0) value.sections = sections;
  const screenshots = repeats.screenshots.filter((row) => row.src || row.alt);
  if (screenshots.length > 0) value.screenshots = screenshots;

  // A focal point needs both coordinates or neither.
  for (const base of ["image", "cover"]) {
    const point = value[base]?.focalPoint;
    if (point && !(typeof point.x === "number" && typeof point.y === "number")) delete value[base].focalPoint;
    if (value[base] && Object.keys(value[base]).length === 0) delete value[base];
  }
  return value;
}

/** The ids in `aria-describedby`, minus any error text from an earlier pass. */
const describedBy = (input) =>
  (input.getAttribute("aria-describedby") ?? "").split(/\s+/).filter((id) => id !== "" && !id.endsWith("-error"));

/** Put validation messages beside the fields they name, and focus the first one. */
function showFormErrors(form, errorBox, messages) {
  clear(errorBox);
  for (const wrapper of form.querySelectorAll(".admin-field")) {
    const input = wrapper.querySelector("input, textarea");
    if (input) {
      input.removeAttribute("aria-invalid");
      // Back to the field's own hint, dropping whatever the last pass attached.
      const base = describedBy(input);
      if (base.length > 0) input.setAttribute("aria-describedby", base.join(" "));
      else input.removeAttribute("aria-describedby");
    }
    for (const stale of wrapper.querySelectorAll(".admin-field-error")) stale.remove();
  }
  if (messages.length === 0) return;

  let firstInvalid = null;
  const unattached = [];
  for (const message of messages) {
    const field = fieldOfError(message);
    const wrapper = field ? form.querySelector(`.admin-field[data-field="${CSS.escape(field)}"]`) : null;
    if (wrapper === null) {
      unattached.push(message);
      continue;
    }
    const input = wrapper.querySelector("input, textarea");
    input.setAttribute("aria-invalid", "true");
    // The message has to be reachable from the field itself: `aria-invalid`
    // alone announces "invalid" without saying what to do about it.
    const errorId = `${input.id}-${wrapper.querySelectorAll(".admin-field-error").length}-error`;
    wrapper.append(el("p", { class: "admin-field-error", id: errorId, text: message }));
    // Append, so a field carrying two messages describes both.
    const described = (input.getAttribute("aria-describedby") ?? "").split(/\s+/).filter((id) => id !== "");
    input.setAttribute("aria-describedby", [...described, errorId].join(" "));
    if (firstInvalid === null) firstInvalid = input;
  }
  if (unattached.length > 0) errorBox.append(list(unattached.map((message) => el("li", { text: message })), null));
  if (firstInvalid !== null) {
    firstInvalid.focus();
    return;
  }
  errorBox.setAttribute("tabindex", "-1");
  errorBox.focus();
}

/* ------------------------------------------------------------------ *
 * Record editing
 * ------------------------------------------------------------------ */

const calmMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

function openRecord(type, id) {
  state.editing = { type, id };
  render();
  $("record-editor").scrollIntoView({ behavior: calmMotion() ? "auto" : "smooth", block: "nearest" });
  $("record-form-host").querySelector("input, textarea")?.focus();
}

function closeRecord(message) {
  state.editing = null;
  render();
  if (message) fileStatus(message);
}

/**
 * The image keys this form actually renders an input for.
 *
 * Everything else on an image — `sources` today, whatever the schema grows
 * tomorrow — has no input here, so the form cannot carry it and must not be
 * read as having deleted it. Anything in this set is the form's to own: a
 * cleared focal point really is a cleared focal point.
 */
const FORM_IMAGE_KEYS = new Set(["src", "alt", "width", "height", "focalPoint"]);

function saveRecord(type, id, body, { form, errorBox }) {
  const kind = kindOf(type);
  const existing = id === null ? null : (state.doc[kind.collection] ?? []).find((record) => record.id === id);
  const submittedSlug = body.slug || body.title || kind.idPrefix;
  const record = {
    ...body,
    id: existing?.id ?? nextRecordId(state.doc, kind.idPrefix),
    state: existing?.state ?? "draft",
    slug: uniqueSlug(state.doc, type, submittedSlug, existing?.id ?? null),
  };
  if (existing?.sourceSubmissionId) record.sourceSubmissionId = existing.sourceSubmissionId;
  if (existing?.projectId) record.projectId = existing.projectId;
  if (type === "art-project") record.pieceIds = existing?.pieceIds ?? [];

  // Keep the parts of the image the form never showed. `sources` (the
  // responsive srcset candidates) has no input, so without this one save
  // through the form would silently delete it. Screenshot rows already survive
  // because the form clones whole rows; this gives the single image the same
  // treatment. An image cleared away entirely takes its extras with it.
  const submittedImage = body[kind.imageField];
  if (submittedImage !== undefined) {
    const previous = existing?.[kind.imageField];
    const carried =
      previous && typeof previous === "object" && !Array.isArray(previous)
        ? Object.fromEntries(Object.entries(previous).filter(([key]) => !FORM_IMAGE_KEYS.has(key)))
        : {};
    record[kind.imageField] = { ...carried, ...submittedImage };
  }

  const next = upsertRecord(state.doc, type, record);
  const problems = recordErrors(next, type, record.id);
  if (problems.length > 0) {
    showFormErrors(form, errorBox, problems);
    return;
  }
  // Only this record's own problems may block its own save. A document is loaded
  // even when it does not validate, precisely so the owner can repair it here —
  // and refusing every save while any other record is broken makes that repair
  // impossible: with two broken records, neither can ever be fixed first. What
  // is left is real, so the status line says so and the Checks panel names it.
  const elsewhere = validatePortfolio(next).length;

  // `uniqueSlug` tidies and de-duplicates, so the stored slug is not always the
  // one that was typed — and the slug is the public detail address. Saying so
  // is the difference between a link the owner chose and one they discover.
  const slugChanged = record.slug !== submittedSlug;

  state.editing = { type, id: record.id };
  state.focus = "record-submit";
  commit(
    next,
    `Saved ${kind.label.toLowerCase()} “${record.title ?? record.slug}”. Export the file to keep the change.${
      slugChanged ? ` Its address is “${record.slug}”, not “${submittedSlug}” — that slug was taken or not URL-safe.` : ""
    }${
      elsewhere === 0
        ? ""
        : ` ${elsewhere} problem${elsewhere === 1 ? " remains" : "s remain"} elsewhere in this document; see Checks.`
    }`,
  );
}

/** Apply a canonical transform, surfacing its refusal instead of swallowing it. */
function attempt(action, message, focus) {
  try {
    const next = action();
    state.focus = focus ?? null;
    commit(next, message);
  } catch (error) {
    fileStatus(error.message);
  }
}

/* ------------------------------------------------------------------ *
 * Rendering
 * ------------------------------------------------------------------ */

function renderChecks() {
  const host = clear($("checks"));
  if (state.doc === null) {
    host.append(el("p", { class: "admin-hint", text: "Open a content file to see its checks." }));
    return;
  }
  const problems = validatePortfolio(state.doc);
  if (problems.length === 0) {
    host.append(el("p", { class: "admin-ok", text: "No problems. This document is safe to build from." }));
    return;
  }
  host.append(
    el("p", { class: "admin-warn", text: `${problems.length} problem${problems.length === 1 ? "" : "s"} to fix before building:` }),
    list(problems.map((problem) => el("li", { text: problem })), "admin-errors"),
  );
}

/** What the status line says after a curation change, in the buttons' own words. */
const curationMessage = (collection, name, curated) =>
  collection === "techStarred"
    ? curated
      ? `“${name}” is starred.`
      : `“${name}” is no longer starred.`
    : curated
      ? `“${name}” is in Favorites.`
      : `“${name}” is no longer in Favorites.`;

function curatedState(type, id) {
  const kind = kindOf(type);
  const entries = state.doc[kind.curated] ?? [];
  return entries.some((entry) => entry.id === id && (kind.curated === "techStarred" || entry.type === type));
}

function recordRow(kind, record) {
  const curated = curatedState(kind.type, record.id);
  const published = record.state === "published";
  const meta = [record.slug, kind.type === "art-project" ? `${(record.pieceIds ?? []).length} pieces` : null]
    .filter(Boolean)
    .join(" · ");
  const problems = recordErrors(state.doc, kind.type, record.id);

  const actions = [
    el("button", {
      type: "button",
      text: "Edit",
      dataset: { focus: `edit:${record.id}` },
      on: { click: () => openRecord(kind.type, record.id) },
    }),
    el("button", {
      type: "button",
      text: published ? "Return to draft" : "Publish",
      dataset: { focus: `publish:${record.id}` },
      on: {
        click: () =>
          attempt(
            () => setPublication(state.doc, kind.type, record.id, published ? "draft" : "published"),
            published ? `“${record.title ?? record.slug}” is a draft again.` : `“${record.title ?? record.slug}” is published.`,
            `publish:${record.id}`,
          ),
      },
    }),
    el("button", {
      type: "button",
      text:
        kind.curated === "techStarred"
          ? curated
            ? "Unstar project"
            : "Star project"
          : curated
            ? "Remove from Favorites"
            : "Add to Favorites",
      dataset: { focus: `curate:${record.id}` },
      on: {
        click: () =>
          attempt(
            () => toggleCurated(state.doc, kind.type, record.id),
            curationMessage(kind.curated, record.title ?? record.slug, !curated),
            `curate:${record.id}`,
          ),
      },
    }),
    el("button", {
      type: "button",
      class: "admin-danger",
      text: "Delete",
      on: {
        click: () => {
          const name = record.title ?? record.slug;
          if (!confirm(`Delete “${name}”? It is also removed from Favorites and from any project.`)) return;
          if (state.editing?.id === record.id) state.editing = null;
          attempt(() => removeRecord(state.doc, kind.type, record.id), `Deleted “${name}”.`, `add:${kind.type}`);
        },
      },
    }),
  ];

  return el("li", { class: "admin-record" }, [
    el("div", { class: "admin-record__head" }, [
      el("span", { class: "admin-record__title", text: record.title || "(untitled)" }),
      el("span", { class: published ? "badge placed" : "badge", text: published ? "Published" : "Draft" }),
      curated ? el("span", { class: "badge ready_to_place", text: kind.curated === "techStarred" ? "Starred" : "Favorite" }) : null,
    ]),
    meta ? el("p", { class: "admin-record__meta", text: meta }) : null,
    el("div", { class: "admin-record__actions" }, actions),
    problems.length > 0 ? list(problems.map((problem) => el("li", { text: problem })), "admin-errors") : null,
  ]);
}

function renderRecords() {
  const host = clear($("records"));
  if (state.doc === null) {
    host.append(el("p", { class: "admin-hint", text: "Open a content file, or start an empty one, to add records." }));
    return;
  }
  for (const kind of RECORD_KINDS) {
    const records = state.doc[kind.collection] ?? [];
    host.append(
      el("div", { class: "admin-group" }, [
        el("h3", { text: kind.plural }),
        el("div", { class: "admin-actions" }, [
          el("button", {
            type: "button",
            text: `Add ${kind.label.toLowerCase()}`,
            dataset: { focus: `add:${kind.type}` },
            on: { click: () => openRecord(kind.type, null) },
          }),
        ]),
        records.length === 0
          ? el("p", { class: "admin-hint", text: `No ${kind.plural.toLowerCase()} yet.` })
          : list(records.map((record) => recordRow(kind, record)), "admin-records"),
      ]),
    );
  }
}

/** Membership is applied immediately, so it is kept out of the buffered form. */
function membershipPanel(project) {
  const members = project.pieceIds ?? [];
  const pieces = state.doc.artPieces ?? [];
  const available = pieces.filter((piece) => !members.includes(piece.id));
  const applyMembership = (ids, message, focus) =>
    attempt(() => setMembership(state.doc, project.id, ids), message, focus);
  const pieceName = (id) => pieces.find((candidate) => candidate.id === id)?.title || id;

  const rows = members.map((id, index) => {
    const piece = pieces.find((candidate) => candidate.id === id);
    return el("li", { class: "admin-record" }, [
      el("span", { class: "admin-record__title", text: piece?.title || id }),
      el("div", { class: "admin-record__actions" }, [
        el("button", {
          type: "button",
          text: "Move up",
          disabled: index === 0,
          dataset: { focus: `member-up:${id}` },
          on: {
            click: () => {
              const next = members.slice();
              [next[index - 1], next[index]] = [next[index], next[index - 1]];
              applyMembership(next, `Moved “${pieceName(id)}” up, to position ${index} of ${members.length}.`, `member-up:${id}`);
            },
          },
        }),
        el("button", {
          type: "button",
          text: "Move down",
          disabled: index === members.length - 1,
          dataset: { focus: `member-down:${id}` },
          on: {
            click: () => {
              const next = members.slice();
              [next[index + 1], next[index]] = [next[index], next[index + 1]];
              applyMembership(next, `Moved “${pieceName(id)}” down, to position ${index + 2} of ${members.length}.`, `member-down:${id}`);
            },
          },
        }),
        el("button", {
          type: "button",
          text: "Remove from project",
          on: {
            click: () =>
              applyMembership(
                members.filter((member) => member !== id),
                `Removed “${pieceName(id)}” from this project. The piece itself is untouched.`,
                "add-member",
              ),
          },
        }),
      ]),
    ]);
  });

  const select = el("select", { id: "add-member-select", "aria-label": "Piece to add" }, [
    el("option", { value: "", text: available.length === 0 ? "No unassigned pieces" : "Choose a piece" }),
    ...available.map((piece) => el("option", { value: piece.id, text: piece.title || piece.slug })),
  ]);

  return el("fieldset", { class: "admin-group" }, [
    el("legend", { text: "Pieces in this project" }),
    el("p", {
      class: "admin-hint",
      text: "This order is the project's gallery order. Changes here apply straight away, not on Save.",
    }),
    members.length === 0 ? el("p", { class: "admin-hint", text: "No pieces yet. A project stays a draft until it holds a published piece." }) : list(rows, "admin-records"),
    el("div", { class: "admin-actions" }, [
      select,
      el("button", {
        type: "button",
        text: "Add piece",
        dataset: { focus: "add-member" },
        disabled: available.length === 0,
        on: {
          click: () => {
            if (select.value === "") return;
            applyMembership([...members, select.value], `Added “${pieceName(select.value)}” to this project.`, "add-member");
          },
        },
      }),
    ]),
  ]);
}

function renderRecordEditor() {
  const section = $("record-editor");
  const host = clear($("record-form-host"));
  if (state.doc === null || state.editing === null) {
    section.hidden = true;
    return;
  }
  section.hidden = false;
  const { type, id } = state.editing;
  const kind = kindOf(type);
  const record = id === null ? {} : (state.doc[kind.collection] ?? []).find((candidate) => candidate.id === id) ?? {};
  $("editor-title").textContent = id === null ? `New ${kind.label.toLowerCase()}` : `${kind.label}: ${record.title || record.slug}`;

  const form = recordForm(type, record, {
    submitLabel: id === null ? `Add ${kind.label.toLowerCase()}` : "Save record",
    onSubmit: (body, context) => saveRecord(type, id, body, context),
    onCancel: () => closeRecord(null),
  });
  host.append(form);
  if (type === "art-project" && id !== null) host.append(membershipPanel(record));
}

function curatedList(collection, heading, removeLabel) {
  const rows = curatedView(state.doc, collection);
  if (rows.length === 0) {
    return el("div", { class: "admin-group" }, [
      el("h3", { text: heading }),
      el("p", { class: "admin-hint", text: "Nothing selected yet. Publish a record, then add it from the list above." }),
    ]);
  }
  return el("div", { class: "admin-group" }, [
    el("h3", { text: heading }),
    el(
      "ol",
      { class: "admin-records" },
      rows.map((row) => {
        const name = row.title ?? row.id;
        const move = (direction) =>
          attempt(
            () => moveCurated(state.doc, collection, row.index, direction),
            `Moved “${name}” ${direction}, to position ${row.index + (direction === "up" ? 0 : 2)} of ${rows.length}.`,
            `${direction}:${collection}:${row.id}`,
          );
        return el("li", { class: "admin-record" }, [
          el("div", { class: "admin-record__head" }, [
            el("span", { class: "admin-record__title", text: row.title ?? `(missing record ${row.id})` }),
            // Art Favorites mix pieces and whole projects, so the list has to
            // say which of the two each row opens.
            el("span", { class: "badge", text: kindOf(row.type)?.label ?? row.type }),
          ]),
          el("div", { class: "admin-record__actions" }, [
            el("button", {
              type: "button",
              text: "Move up",
              disabled: !row.canMoveUp,
              dataset: { focus: `up:${collection}:${row.id}` },
              on: { click: () => move("up") },
            }),
            el("button", {
              type: "button",
              text: "Move down",
              disabled: !row.canMoveDown,
              dataset: { focus: `down:${collection}:${row.id}` },
              on: { click: () => move("down") },
            }),
            el("button", {
              type: "button",
              text: removeLabel,
              on: {
                click: () =>
                  attempt(
                    () => toggleCurated(state.doc, row.type, row.id),
                    curationMessage(collection, name, false),
                    `curate:${row.id}`,
                  ),
              },
            }),
          ]),
        ]);
      }),
    ),
  ]);
}

function renderCurated() {
  const host = clear($("curated"));
  if (state.doc === null) {
    host.append(el("p", { class: "admin-hint", text: "Open a content file to curate it." }));
    return;
  }
  host.append(
    curatedList("artFavorites", "Art Favorites", "Remove from Favorites"),
    curatedList("techStarred", "Starred projects", "Unstar project"),
  );
}

function renderStyles() {
  const host = clear($("styles"));
  if (state.doc === null) return;
  const styles = state.doc.styles ?? [];

  const rows = styles.map((style, index) => {
    const nameId = fieldId();
    const descriptionId = fieldId();
    const update = (key, input) => {
      const next = structuredClone(state.doc);
      const value = input.value.trim();
      if (value === "") delete next.styles[index][key];
      else next.styles[index][key] = value;
      apply(next);
    };
    const name = el("input", { id: nameId, type: "text", value: style.name ?? "" });
    const description = el("input", { id: descriptionId, type: "text", value: style.description ?? "" });
    name.addEventListener("change", () => update("name", name));
    description.addEventListener("change", () => update("description", description));
    return el("li", { class: "admin-record" }, [
      el("div", { class: "admin-field" }, [el("label", { for: nameId, text: `Name (${style.id})` }), name]),
      el("div", { class: "admin-field" }, [el("label", { for: descriptionId, text: "Description" }), description]),
      el("div", { class: "admin-record__actions" }, [
        el("button", {
          type: "button",
          class: "admin-danger",
          text: "Remove style",
          on: {
            click: () => {
              if (!confirm(`Remove the style “${style.name || style.id}”? It is also removed from every piece using it.`)) return;
              const next = structuredClone(state.doc);
              next.styles.splice(index, 1);
              for (const piece of next.artPieces ?? []) {
                if (Array.isArray(piece.styleIds)) piece.styleIds = piece.styleIds.filter((id) => id !== style.id);
              }
              state.focus = "add-style";
              commit(next, `Removed the style “${style.name || style.id}”.`);
            },
          },
        }),
      ]),
    ]);
  });

  const newName = el("input", { id: "new-style", type: "text", placeholder: "Long exposure" });
  host.append(
    styles.length === 0 ? el("p", { class: "admin-hint", text: "No styles yet." }) : list(rows, "admin-records"),
    el("div", { class: "admin-actions" }, [
      el("div", { class: "admin-field" }, [el("label", { for: "new-style", text: "New style name" }), newName]),
      el("button", {
        type: "button",
        text: "Add style",
        dataset: { focus: "add-style" },
        on: {
          click: () => {
            const name = newName.value.trim();
            if (name === "") return fileStatus("Give the style a name first.");
            const base = slugify(name) || "style";
            const taken = new Set((state.doc.styles ?? []).map((style) => style.id));
            let id = `style-${base}`;
            for (let suffix = 2; taken.has(id); suffix += 1) id = `style-${base}-${suffix}`;
            const next = structuredClone(state.doc);
            next.styles = [...(next.styles ?? []), { id, name }];
            state.focus = "add-style";
            commit(next, `Added the style “${name}”.`);
          },
        },
      }),
    ]),
  );
}

function renderAbout() {
  const host = clear($("about"));
  if (state.doc === null) return;

  const about = el("textarea", { id: "about-text", rows: 5, value: state.doc.about ?? "" });
  about.addEventListener("change", () => {
    const next = structuredClone(state.doc);
    next.about = about.value;
    apply(next);
    fileStatus("About updated. Export the file to keep the change.");
  });

  const contacts = structuredClone(state.doc.contacts ?? []);
  const saveContacts = () => {
    const next = structuredClone(state.doc);
    next.contacts = contacts.filter((contact) => contact.label || contact.url);
    apply(next);
  };

  host.append(
    el("div", { class: "admin-field" }, [
      el("label", { for: "about-text", text: "About" }),
      about,
      el("p", { class: "admin-hint", text: "Your own words. Leave it empty rather than inventing a biography." }),
    ]),
    repeater({
      legend: "Contact",
      hint: "A label and a destination, such as mailto: or an https address. Leave the list empty until you have real details.",
      rows: contacts,
      fields: [
        { name: "label", label: "Label" },
        { name: "url", label: "Destination" },
      ],
      onChange: saveContacts,
    }),
  );
}

function render() {
  renderChecks();
  renderRecords();
  renderRecordEditor();
  renderCurated();
  renderStyles();
  renderAbout();
  $("export-file").disabled = state.doc === null;
  if (state.focus !== null) {
    const target = document.querySelector(`[data-focus="${CSS.escape(state.focus)}"]`);
    const usable = target?.disabled ? target.parentElement?.querySelector("button:not(:disabled)") : target;
    usable?.focus();
    state.focus = null;
  }
}

/* ------------------------------------------------------------------ *
 * Opening and exporting the file
 * ------------------------------------------------------------------ */

$("open-file").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  let text;
  try {
    text = await file.text();
  } catch (error) {
    // A file that cannot be read at all — moved, or permission withdrawn since
    // the picker closed — must say so rather than leave the editor looking idle.
    fileStatus(`Could not read ${file.name}: ${error.message}. Nothing was opened.`);
    event.target.value = "";
    return;
  }
  const result = parseCanonical(text);
  if (result.document === null) {
    fileStatus(result.errors.join(" "));
    return;
  }
  state.doc = result.document;
  state.origin = file.name;
  state.editing = null;
  render();
  fileStatus(
    result.errors.length === 0
      ? `Opened ${file.name}. Changes stay in this browser until you export.`
      : `Opened ${file.name} with ${result.errors.length} problem${result.errors.length === 1 ? "" : "s"} to fix. See Checks.`,
  );
  event.target.value = "";
});

$("start-empty").addEventListener("click", () => {
  if (state.doc !== null && !confirm("Start an empty file? Anything you have not exported is discarded.")) return;
  state.doc = createEmptyPortfolio();
  state.origin = null;
  state.editing = null;
  render();
  fileStatus("Started an empty content file. Nothing is saved until you export it.");
});

/** Export under the name the owner opened, so the file they save back matches. */
const exportName = () =>
  typeof state.origin === "string" && state.origin.toLowerCase().endsWith(".json") ? state.origin : "portfolio.json";

$("export-file").addEventListener("click", () => {
  if (state.doc === null) return;
  download(exportName(), serializeCanonical(state.doc));
  fileStatus(
    "Exported to your downloads. Save it over content/portfolio.json in the repository, then run node scripts/build-portfolio.mjs. Exporting is not deploying.",
  );
});

/* ------------------------------------------------------------------ *
 * Inbox
 * ------------------------------------------------------------------ */

const inboxRoot = $("inbox-root");
const inboxList = inboxRoot.querySelector(".sub-list");

async function loadInbox() {
  clear(inboxList).append(el("p", { class: "sub-empty", text: "Loading…" }));
  const { data: rows, error } = await sb
    .from("submissions")
    .select("*")
    .eq("kind", state.kind)
    .order("created_at", { ascending: false });

  if (error) {
    state.submissions = [];
    clear(inboxList).append(el("p", { class: "sub-empty", text: `Unable to load submissions: ${error.message}` }));
    return;
  }
  state.submissions = rows;
  renderInbox();
}

function renderInbox() {
  clear(inboxList);
  if (state.submissions.length === 0) {
    inboxList.append(
      el("p", { class: "sub-empty", text: `No ${state.kind === "photo" ? "photos" : "projects"} in the inbox yet.` }),
    );
    return;
  }
  for (const row of state.submissions) {
    const structured = row.layout?.mode === "structured";
    inboxList.append(
      el("div", { class: "sub-row" }, [
        row.image_path
          ? el("img", { src: publicUrl(row.image_path), alt: "", loading: "lazy" })
          : el("div", { class: "no-thumb", text: "no image" }),
        el("div", { class: "sub-meta" }, [
          el("h3", { text: row.title }),
          el("p", {
            text: [row.target_page, new Date(row.created_at).toLocaleDateString(), row.tags?.length ? row.tags.join(", ") : null]
              .filter(Boolean)
              .join(" · "),
          }),
        ]),
        el("span", { class: `badge ${row.status}`, text: row.status.replaceAll("_", " ") }),
        el("button", {
          type: "button",
          text: structured ? "Edit draft" : "Write draft",
          dataset: { focus: `proposal:${row.id}` },
          on: { click: () => openProposal(row) },
        }),
      ]),
    );
  }
}

for (const button of inboxRoot.querySelectorAll(".kind-toggle button")) {
  button.addEventListener("click", () => {
    state.kind = button.dataset.kind;
    for (const other of inboxRoot.querySelectorAll(".kind-toggle button")) {
      const selected = other.dataset.kind === state.kind;
      // The class is only paint. `aria-pressed` is what says which one is on.
      other.classList.toggle("active", selected);
      other.setAttribute("aria-pressed", String(selected));
    }
    loadInbox();
  });
}

/** The record a submission proposes, prefilled from what was actually supplied. */
function proposalRecord(row, type) {
  const stored = row.layout?.mode === "structured" ? structuredClone(row.layout.record ?? {}) : {};
  const kind = kindOf(type);
  const record = { title: row.title ?? "", ...stored };
  delete record.type;
  const derived = row.image_path ? inboxAssetPath(row.image_path, row.id) : null;
  const image = record[kind.imageField] ?? {};
  if (!image.src && derived) image.src = derived;
  if (Object.keys(image).length > 0) record[kind.imageField] = image;
  return record;
}

function openProposal(row) {
  const host = clear($("proposal-host"));
  const stored = row.layout?.mode === "structured" ? row.layout.record?.type : null;
  let type = stored ?? (row.kind === "photo" ? "piece" : "tech-project");

  const draw = () => {
    clear(host);
    const select = el(
      "select",
      { id: "proposal-type", "aria-label": "Record type" },
      RECORD_KINDS.map((kind) => el("option", { value: kind.type, text: kind.label, selected: kind.type === type })),
    );
    select.addEventListener("change", () => {
      type = select.value;
      draw();
    });

    const form = recordForm(type, proposalRecord(row, type), {
      submitLabel: "Save proposal to submission",
      onSubmit: (body, context) => saveProposal(row, type, body, context),
      onCancel: () => clear(host),
    });

    host.append(
      el("div", { class: "admin-group" }, [
        el("h3", { text: `Draft for “${row.title}”` }),
        el("p", {
          class: "admin-hint",
          text: row.tags?.length
            ? `Submitted tags: ${row.tags.join(", ")}. Tags are not styles; assign styles yourself after import.`
            : "Alt text and every other value must be your own. Nothing is derived from the filename.",
        }),
        el("div", { class: "admin-field" }, [el("label", { for: "proposal-type", text: "Record type" }), select]),
        form,
      ]),
    );
    form.querySelector("input, textarea")?.focus();
  };

  draw();
}

async function saveProposal(row, type, body, { form, errorBox }) {
  const kind = kindOf(type);
  // Validate the proposal the way the importer will, on a throwaway document.
  const probe = createEmptyPortfolio();
  probe.styles = structuredClone(state.doc?.styles ?? []);
  const candidate = {
    ...body,
    id: `probe-${kind.idPrefix}`,
    slug: uniqueSlug(probe, type, body.slug || body.title || kind.idPrefix),
    state: "draft",
  };
  if (type === "art-project") candidate.pieceIds = [];
  const problems = recordErrors(upsertRecord(probe, type, candidate), type, candidate.id);
  if (problems.length > 0) {
    showFormErrors(form, errorBox, problems);
    return;
  }

  const record = { type, ...body };
  const { error } = await sb
    .from("submissions")
    .update({ layout: structuredLayout(record, row.layout), status: "ready_to_place" })
    .eq("id", row.id);

  if (error) {
    say("inbox-status", `Unable to save the proposal: ${error.message}`);
    return;
  }
  // Close the draft. This form closed over the row as it stood before the save,
  // so a second save from it would compute `replaces` from a stale snapshot of
  // `layout`. Re-opening it from the reloaded inbox gives the row as it now is.
  clear($("proposal-host"));
  say(
    "inbox-status",
    `Saved the draft for “${row.title}” on its submission. The uploaded file is untouched, and nothing is public. Export the proposal file, then run the import script in the repository.`,
  );
  await loadInbox();
  document.querySelector(`[data-focus="${CSS.escape(`proposal:${row.id}`)}"]`)?.focus();
}

$("export-proposals").addEventListener("click", async () => {
  const { data: rows, error } = await sb.from("submissions").select("*").eq("status", "ready_to_place");
  if (error) return say("inbox-status", `Unable to load proposals: ${error.message}`);

  const records = rows
    .filter((row) => row.layout?.mode === "structured")
    .map((row) => ({
      id: row.id,
      kind: row.kind,
      title: row.title,
      image_path: row.image_path ?? null,
      image_url: row.image_path ? publicUrl(row.image_path) : null,
      layout: row.layout,
    }));

  if (records.length === 0) {
    return say("inbox-status", "No structured proposals to export. Write a draft for a submission first.");
  }
  download("submission-proposals.json", `${JSON.stringify({ records }, null, 2)}\n`);
  say(
    "inbox-status",
    `Exported ${records.length} proposal${records.length === 1 ? "" : "s"}. Run node scripts/import-portfolio.mjs --input FILE --download in the repository to add them as drafts.`,
  );
});

/* ------------------------------------------------------------------ *
 * Start
 * ------------------------------------------------------------------ */

const fromPage = new URLSearchParams(location.search).get("page");
render();
fileStatus(
  fromPage === "art.html" || fromPage === "tech.html"
    ? `Opened from ${fromPage}. Open your content file to edit it; this editor cannot read the site's own content.`
    : "Open your content file to begin.",
);
inboxRoot.querySelector('.kind-toggle button[data-kind="photo"]').classList.add("active");
await loadInbox();
