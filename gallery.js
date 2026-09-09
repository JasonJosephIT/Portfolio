/**
 * Gallery runtime — progressive enhancement only.
 *
 * Every page this file touches is complete static HTML: all cards, sections,
 * pieces and links are already in the DOM and readable with JavaScript
 * disabled or broken. This script only adds conveniences on top:
 *
 *   - the "Show original colors" toggle for Art previews
 *   - collapsing a curated list to four entries behind a Show all control
 *   - filtering Explore by Style, with an announced result count
 *   - a quiet "Image unavailable" state when an image fails to load
 *   - upgrading a detail page's Back link to the section the visitor came from
 *
 * It never loads an admin or authentication module. Scroll position is left to
 * the browser: history.scrollRestoration already puts a visitor back where they
 * were when they press Back.
 */

const RETURN_KEY = 'portfolio:return';

/** Only these sections may ever be used to build a return link. */
const SECTION_LABELS = {
  art: {
    'selected-works': 'Selected Works',
    projects: 'Projects',
    explore: 'Explore by Style',
    about: 'About Me',
    contact: 'Contact',
  },
  tech: {
    starred: 'Starred Projects',
    projects: 'Projects',
  },
};

const readStore = (key) => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
};

const writeStore = (key, value) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Private browsing, or storage is full: the static links still work. */
  }
};

/** A stored section is usable only when it is one this site actually renders. */
const sectionLabel = (page, section) =>
  Object.hasOwn(SECTION_LABELS, page) && Object.hasOwn(SECTION_LABELS[page], section)
    ? SECTION_LABELS[page][section]
    : null;

/* ------------------------------------------------------------------ *
 * Failed images keep their frame, their size and their title
 * ------------------------------------------------------------------ */

function watchImages() {
  for (const image of document.querySelectorAll('.card__image, .detail__image')) {
    const markMissing = () => image.closest('.card__frame, .detail__frame')?.classList.add('is-missing');
    if (image.complete && image.naturalWidth === 0) markMissing();
    else image.addEventListener('error', markMissing, { once: true });
  }
}

/* ------------------------------------------------------------------ *
 * Show original colors
 * ------------------------------------------------------------------ */

function wireColorToggle() {
  const toggle = document.querySelector('[data-color-toggle]');
  if (toggle === null) return;
  toggle.hidden = false;
  toggle.addEventListener('click', () => {
    const pressed = toggle.getAttribute('aria-pressed') === 'true';
    toggle.setAttribute('aria-pressed', String(!pressed));
    document.body.classList.toggle('show-color', !pressed);
  });
}

/* ------------------------------------------------------------------ *
 * Curated expansion: up to four entries, the rest one click away
 * ------------------------------------------------------------------ */

function wireExpansion() {
  for (const button of document.querySelectorAll('[data-expand]')) {
    const grid = document.getElementById(button.dataset.expand);
    if (grid === null || grid.querySelector('[data-overflow="true"]') === null) continue;

    const showAll = button.textContent;
    const showFewer = showAll.replace(/^Show all\b/, 'Show fewer');
    grid.classList.add('is-collapsed');
    button.hidden = false;

    button.addEventListener('click', () => {
      const expanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!expanded));
      grid.classList.toggle('is-collapsed', expanded);
      button.textContent = expanded ? showAll : showFewer;
    });
  }
}

/* ------------------------------------------------------------------ *
 * Explore by Style filtering
 * ------------------------------------------------------------------ */

function wireFilters() {
  for (const bar of document.querySelectorAll('[data-filters]')) {
    const gridId = bar.dataset.filters;
    const grid = document.getElementById(gridId);
    if (grid === null) continue;

    const cards = [...grid.querySelectorAll('.card')];
    const buttons = [...bar.querySelectorAll('[data-style]')];
    if (cards.length === 0 || buttons.length === 0) continue;

    const status = document.querySelector(`[data-filter-status="${CSS.escape(gridId)}"]`);
    bar.hidden = false;

    const apply = (style) => {
      let shown = 0;
      for (const card of cards) {
        const styleIds = (card.dataset.styleIds ?? '').split(' ').filter(Boolean);
        const visible = style === 'all' || styleIds.includes(style);
        card.hidden = !visible;
        if (visible) shown += 1;
      }
      for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.style === style));
      if (status !== null) {
        status.textContent =
          shown === 0
            ? 'No published pieces carry this style yet.'
            : `Showing ${shown} of ${cards.length} ${cards.length === 1 ? 'piece' : 'pieces'}.`;
      }
    };

    for (const button of buttons) button.addEventListener('click', () => apply(button.dataset.style));
  }
}

/* ------------------------------------------------------------------ *
 * Return context: an ordinary link, remembered
 * ------------------------------------------------------------------ */

function wireListingReturn(page) {
  for (const link of document.querySelectorAll('[data-detail-link]')) {
    link.addEventListener('click', () => {
      const section = link.dataset.returnSection ?? '';
      if (sectionLabel(page, section) === null) return;
      // The target is recorded so a stale context from an earlier click cannot
      // relabel the Back link of a detail page reached some other way.
      let target;
      try {
        target = new URL(link.getAttribute('href'), location.href).pathname;
      } catch {
        return;
      }
      writeStore(RETURN_KEY, { page, section, target });
    });
  }
}

function wireDetailReturn() {
  const link = document.querySelector('[data-back-link]');
  if (link === null) return;

  const href = link.getAttribute('href') ?? '';
  const match = href.match(/^(.*?)(art|tech)\.html/);
  if (match === null) return;

  const context = readStore(RETURN_KEY);
  if (context === null || context.page !== match[2] || context.target !== location.pathname) return;
  const label = sectionLabel(context.page, context.section);
  if (label === null) return;

  link.setAttribute('href', `${match[1]}${context.page}.html#${context.section}`);
  link.textContent = `Back to ${label}`;
}

/* ------------------------------------------------------------------ *
 * Start
 * ------------------------------------------------------------------ */

watchImages();
wireColorToggle();
wireExpansion();
wireFilters();

const returnPage = document.body.dataset.returnPage ?? '';
if (returnPage === 'art' || returnPage === 'tech') wireListingReturn(returnPage);
else wireDetailReturn();
