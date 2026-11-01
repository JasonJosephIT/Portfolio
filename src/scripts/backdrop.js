import "./backdrop-foam.js";
import { bay } from "./bay.js";
// The bay backdrop persists across navigation (transition:persist), so this runs once per visit to
// the site: one video, one spring, one rAF loop. It scrubs the clip to bay.pos. On a content page the
// camera rests at that page's coast (Art left, Tech right) with a slow sway back toward the middle;
// moving between Art and Tech leaves it where it is, and only going to or from Home pans it.
const el = document.querySelector(".backdrop");
const video = el && el.querySelector(".pan");
if (video) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let t = 0;
  let drift = 0;
  let last = -1;
  let prev = performance.now();

  const clamp = (v) => Math.min(1, Math.max(0, v));

  const render = () => {
    const d = video.duration;
    if (!d) return;
    const time = clamp((bay.pos + drift + 1) / 2) * d;
    if (Math.abs(time - last) > 1 / 120) {
      video.currentTime = time;
      last = time;
    }
  };

  const frame = (now) => {
    const dt = Math.min(0.05, (now - prev) / 1000);
    prev = now;
    const c = 2 * Math.sqrt(bay.k) * 0.95; // critically damped: no overshoot
    bay.vel += ((bay.target - bay.pos) * bay.k - bay.vel * c) * dt;
    bay.pos += bay.vel * dt;
    t += dt;
    const sway = bay.mode === "home" ? 1 : -Math.sign(bay.target || 1);
    drift = reduced || bay.busy ? drift * 0.9 : Math.sin(t * 0.25) * 0.035 * sway;
    render();
    requestAnimationFrame(frame);
  };

  // Every page load: a content page sends the camera to its coast the first time, or when it comes
  // from Home. Home steers the camera itself (home-scene.js).
  document.addEventListener("astro:page-load", () => {
    const marker = document.querySelector("[data-bay-pos]");
    const here = marker ? Number(marker.dataset.bayPos) : 0;
    const wasHome = bay.mode === "home";
    if (here === 0) {
      bay.mode = "home";
      bay.ready = true;
      return;
    }
    bay.mode = "rest";
    bay.busy = false;
    bay.k = 28;
    if (!bay.ready) {
      bay.pos = bay.target = here;
      bay.vel = 0;
    } else if (wasHome) {
      bay.target = here;
    }
    bay.ready = true;
  });

  const start = () => {
    video.pause();
    requestAnimationFrame(frame);
  };
  if (video.readyState >= 1 && video.duration) start();
  else video.addEventListener("loadedmetadata", start, { once: true });
}
