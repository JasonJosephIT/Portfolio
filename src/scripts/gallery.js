/**
 * Art pages runtime (loaded by src/layouts/Rail.astro) — progressive enhancement only.
 *
 * Every Art page is complete static HTML and works with JavaScript off.
 * This script only adds conveniences on top:
 *
 *   - the "Show original colors" toggle for Art previews
 *   - a quiet "Image unavailable" state when an image fails to load
 *   - upgrading a piece page's Back link to the /art section the visitor came from
 *
 * Scroll position is left to the browser: history.scrollRestoration already
 * puts a visitor back where they were when they press Back.
 */

const RETURN_KEY = 'portfolio:return';

/** Only these sections may ever be used to build a return link. */
const SECTION_LABELS = {
  art: {
    'selected-works': 'Selected Works',
    explore: 'Explore by Style',
    about: 'About Me',
    contact: 'Contact',
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
 * Return context: an ordinary link, remembered
 * ------------------------------------------------------------------ */

function wireListingReturn(page) {
  for (const link of document.querySelectorAll('[data-detail-link]')) {
    link.addEventListener('click', () => {
      const section = link.dataset.returnSection ?? '';
      if (sectionLabel(page, section) === null) return;
      // The target is recorded so a stale context from an earlier click cannot
      // relabel the Back link of a detail page reached some other way.
      writeStore(RETURN_KEY, { page, section, target: link.pathname });
    });
  }
}

function wireDetailReturn() {
  const link = document.querySelector('[data-back-link]');
  if (link === null) return;

  if (link.getAttribute('href') !== '/art') return;

  // A host may add a trailing slash to the piece path.
  const context = readStore(RETURN_KEY);
  const here = location.pathname.replace(/\/$/, '');
  if (context === null || context.page !== 'art' || context.target.replace(/\/$/, '') !== here) return;
  const label = sectionLabel(context.page, context.section);
  if (label === null) return;

  link.setAttribute('href', `/${context.page}#${context.section}`);
  link.textContent = `Back to ${label}`;
}

/* ------------------------------------------------------------------ *
 * Start
 * ------------------------------------------------------------------ */

watchImages();
wireColorToggle();

if (document.body.dataset.returnPage) wireListingReturn('art');
else wireDetailReturn();
