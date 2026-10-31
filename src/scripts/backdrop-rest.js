import "./backdrop-foam.js";
// Art and Tech: the camera rests at one end of the clip (Art left, Tech right) with the same slow
// sway as Home, so arriving from Home's pan carries on from where it stopped.
const el = document.querySelector(".backdrop[data-pos]");
const video = el && el.querySelector(".pan");
if (video) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pos = Number(el.dataset.pos);
  let t = 0;
  let last = -1;
  let prev = performance.now();
  const frame = (now) => {
    t += Math.min(0.05, (now - prev) / 1000);
    prev = now;
    const drift = reduced ? 0 : Math.sin(t * 0.25) * 0.035 * -Math.sign(pos); // sway back toward the middle only
    const time = Math.min(1, Math.max(0, (pos + drift + 1) / 2)) * video.duration;
    if (Math.abs(time - last) > 1 / 120) {
      video.currentTime = time;
      last = time;
    }
    requestAnimationFrame(frame);
  };
  const start = () => {
    video.pause();
    requestAnimationFrame(frame);
  };
  if (video.readyState >= 1 && video.duration) start();
  else video.addEventListener("loadedmetadata", start, { once: true });
}
