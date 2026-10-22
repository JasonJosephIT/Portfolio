export function initProjectExplorer(root: HTMLElement) {
  root.classList.add("pe-ready");
  const track = root.querySelector<HTMLElement>("[data-track]")!;
  const panels = [...root.querySelectorAll<HTMLElement>("[data-panel]")];
  const nav = root.querySelector<HTMLElement>("[data-section-nav]")!;
  const previous = root.querySelector<HTMLButtonElement>("[data-prev]")!;
  const next = root.querySelector<HTMLButtonElement>("[data-next]")!;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const key = "portfolio-project-explorer-v1";
  let active = 0;
  let frame = 0;
  let ready = document.readyState === "complete";
  let positions: Record<string, number> = {};
  try { const stored = JSON.parse(sessionStorage.getItem(key) ?? "{}"); if (stored && typeof stored === "object") positions = Object.fromEntries(Object.entries(stored).filter(([, value]) => typeof value === "number" && Number.isFinite(value) && value >= 0)) as Record<string, number>; } catch { /* Storage is optional. */ }
  const scroll = (p: HTMLElement) => p.querySelector<HTMLElement>("[data-scroll]")!;
  const sections = (p: HTMLElement) => [...p.querySelectorAll<HTMLElement>("[data-section]")];
  const save = () => { try { sessionStorage.setItem(key, JSON.stringify(positions)); } catch { /* Storage is optional. */ } };
  function updateSection() {
    if (!panels.length) return;
    const panel = panels[active];
    const y = scroll(panel).scrollTop;
    positions[panel.dataset.slug!] = y;
    const list = sections(panel);
    const section = list.reduce((best, s) => Math.abs(s.offsetTop - 54 - y) < Math.abs(best.offsetTop - 54 - y) ? s : best, list[0]);
    panel.querySelector("[data-current-section]")!.textContent = section.dataset.label!;
    nav.querySelectorAll<HTMLButtonElement>("button").forEach(button => button.setAttribute("aria-current", String(button.dataset.jump === section.dataset.section)));
  }
  function activate(index: number) {
    const changed = active !== index;
    if (changed) { positions[panels[active].dataset.slug!] = scroll(panels[active]).scrollTop; save(); }
    active = index;
    panels.forEach((p, i) => { p.toggleAttribute("data-active", i === index); p.inert = i !== index; scroll(p).tabIndex = i === index ? 0 : -1; });
    if (changed) scroll(panels[index]).scrollTo({ top: positions[panels[index].dataset.slug!] ?? 0, behavior: "instant" });
    root.querySelector("[data-position]")!.textContent = `${index + 1} / ${panels.length}`;
    root.querySelector("[data-project-name]")!.textContent = panels[index].getAttribute("aria-label");
    previous.disabled = index === 0;
    next.disabled = index === panels.length - 1;
    root.querySelectorAll<HTMLButtonElement>(".pe-picker button").forEach((b, i) => b.setAttribute("aria-pressed", String(index === i)));
    const picker = root.querySelector<HTMLElement>(".pe-picker")!;
    const selected = picker.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (selected) picker.scrollTo({left: selected.offsetLeft - (picker.clientWidth - selected.offsetWidth) / 2, behavior: "instant"});
    nav.replaceChildren(...sections(panels[index]).map(s => {
      const button = document.createElement("button"); button.type = "button"; button.dataset.jump = s.dataset.section; button.textContent = s.dataset.label!; return button;
    }));
    updateSection();
    history.replaceState(null, "", `#project=${encodeURIComponent(panels[index].dataset.slug!)}`);
  }
  function go(index: number, instant = false) {
    if (!panels.length) return;
    index = Math.max(0, Math.min(panels.length - 1, index));
    const p = panels[index];
    track.scrollTo({ left: p.offsetLeft - track.offsetLeft - (track.clientWidth - p.offsetWidth) / 2, behavior: instant || reduced.matches ? "instant" : "smooth" });
    activate(index);
  }
  previous.onclick = () => go(active - 1);
  next.onclick = () => go(active + 1);
  root.addEventListener("click", event => {
    const button = (event.target as Element).closest<HTMLElement>("[data-select],[data-jump]");
    if (button?.dataset.select !== undefined) go(Number(button.dataset.select));
    if (button?.dataset.jump) { const s = sections(panels[active]).find(s => s.dataset.section === button.dataset.jump); if (s) scroll(panels[active]).scrollTo({ top: s.offsetTop - 54, behavior: reduced.matches ? "instant" : "smooth" }); }
  });
  track.addEventListener("click", e => { const index = panels.findIndex(p => { const r = p.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right; }); if (index >= 0 && index !== active) go(index); });
  track.addEventListener("scroll", () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => {
    if (!panels.length || !ready) return;
    const center = track.getBoundingClientRect().left + track.clientWidth / 2;
    const distance = (p: HTMLElement) => Math.abs(p.getBoundingClientRect().left + p.clientWidth / 2 - center);
    const p = panels.reduce((a, b) => distance(a) < distance(b) ? a : b);
    const index = panels.indexOf(p); if (index !== active) activate(index);
  }); }, { passive: true });
  track.addEventListener("wheel", e => { if (!e.ctrlKey && Math.abs(e.deltaX) > Math.abs(e.deltaY)) { e.preventDefault(); track.scrollLeft += e.deltaX; } }, { passive: false });
  panels.forEach(p => scroll(p).addEventListener("scroll", () => { if (p === panels[active]) updateSection(); }, { passive: true }));
  document.addEventListener("keydown", e => { if (document.querySelector("dialog[open],:popover-open") || e.altKey || e.ctrlKey || e.metaKey || (e.target as Element).closest("input,textarea,video,[contenteditable]")) return; if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); go(active + (e.key === "ArrowRight" ? 1 : -1)); } });
  let touch: { x: number; y: number; index: number } | null = null;
  track.addEventListener("touchstart", e => { if (e.touches.length === 1) touch = { x: e.touches[0].clientX, y: e.touches[0].clientY, index: active }; }, { passive: true });
  track.addEventListener("touchmove", e => { if (!touch || e.touches.length !== 1) return; const dx = e.touches[0].clientX - touch.x, dy = e.touches[0].clientY - touch.y; if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5) e.preventDefault(); }, { passive: false });
  track.addEventListener("touchend", e => { if (!touch) return; const dx = e.changedTouches[0].clientX - touch.x, dy = e.changedTouches[0].clientY - touch.y; if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.5) go(touch.index + (dx < 0 ? 1 : -1)); touch = null; }, { passive: true });
  track.addEventListener("touchcancel", () => { touch = null; }, { passive: true });
  window.addEventListener("resize", () => go(active, true));
  window.addEventListener("pageshow", () => { go(active, true); requestAnimationFrame(() => { ready = true; }); });
  window.addEventListener("pagehide", save);
  const about = document.querySelector<HTMLDialogElement>("[data-about-dialog]")!;
  const aboutButton = root.querySelector<HTMLButtonElement>("[data-about]");
  if (aboutButton) aboutButton.onclick = () => about.showModal();
  const lightbox = document.querySelector<HTMLDialogElement>("[data-media-dialog]")!;
  root.querySelectorAll<HTMLButtonElement>("[data-expand-image]").forEach(button => button.onclick = () => { const img = lightbox.querySelector("img")!; img.src = button.dataset.src!; img.alt = button.dataset.caption!; lightbox.querySelector("p")!.textContent = button.dataset.caption!; lightbox.showModal(); });
  [about, lightbox].forEach(dialog => dialog.querySelector<HTMLButtonElement>("[data-close]")!.onclick = () => dialog.close());
  if (panels.length) { const slug = decodeURIComponent(location.hash.replace(/^#project=/, "")); const initial = panels.findIndex(p => p.dataset.slug === slug); active = Math.max(0, initial); scroll(panels[active]).scrollTop = positions[panels[active].dataset.slug!] ?? 0; go(active, true); }
  else { previous.disabled = next.disabled = true; }
}
