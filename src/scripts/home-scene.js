// Home background: one clip of the camera panning around the figure, scrubbed rather than played.
// Its start is the left coast (head turned left), its middle the open sea looking straight out, and
// its end the right coast (head turned right). `pos` runs -1 .. 0 .. 1 along it, so the camera angle
// moves with the figure. Hovering a panel leans toward its side; a click pans all the way there and
// follows the link. Once per visit the camera sweeps the whole clip on load.
const root = document.querySelector("[data-scene]");
const video = document.querySelector(".backdrop .pan");
if (root && video) {
  const panels = [...root.querySelectorAll(".panel")];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let pos = 0;
  let vel = 0; // spring velocity: a half-finished move keeps its momentum if retargeted
  let drift = 0; // slow idle sway so the camera is never dead still
  let target = 0;
  let t = 0;
  let leaving = false;
  let sweeping = false;
  let sweepTimers = [];
  let lastTime = -1;

  const clamp = (v) => Math.min(1, Math.max(0, v));

  const render = () => {
    const d = video.duration;
    if (!d) return;
    const time = clamp((pos + drift + 1) / 2) * d;
    if (Math.abs(time - lastTime) > 1 / 120) {
      video.currentTime = time;
      lastTime = time;
    }
  };

  let prev = performance.now();
  const frame = (now) => {
    const dt = Math.min(0.05, (now - prev) / 1000);
    prev = now;
    // Critically damped spring: no overshoot. Hover is quick, the committed pan deliberate, the
    // intro sweep slow.
    const k = leaving ? 31 : sweeping ? 8 : 62; // stiffness scales with speed squared: 0.75x speed
    const c = 2 * Math.sqrt(k) * 0.95;
    vel += ((target - pos) * k - vel * c) * dt;
    pos += vel * dt;
    t += dt;
    drift = reduced || leaving || sweeping ? drift * 0.9 : Math.sin(t * 0.375) * 0.035;
    render();
    requestAnimationFrame(frame);
  };

  // Intro: the camera glides across the whole clip once per visit, then settles looking straight out.
  // Any touch hands the camera back at once; the spring keeps its momentum, so there is no snap.
  const endSweep = () => {
    if (!sweeping) return;
    sweepTimers.forEach(clearTimeout);
    sweepTimers = [];
    sweeping = false;
    target = 0;
  };

  const startSweep = () => {
    if (reduced) return;
    try {
      if (sessionStorage.getItem("sceneSwept")) return;
      sessionStorage.setItem("sceneSwept", "1");
    } catch (e) {
      // storage blocked: sweep anyway
    }
    sweeping = true;
    pos = -1;
    target = -1;
    const at = (ms, fn) => sweepTimers.push(setTimeout(() => sweeping && fn(), ms));
    at(1200, () => { target = 1; });
    at(5200, () => { target = 0; });
    at(8300, () => { sweeping = false; });
  };

  panels.forEach((panel, i) => {
    const side = i === 0 ? -1 : 1;
    const enter = () => { endSweep(); if (!leaving && !reduced) target = side * 0.3; };
    const leave = () => { if (!leaving) target = 0; };
    // Touch fires pointerenter on tap, so only a real mouse leans; the click carries the pan.
    panel.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") enter(); });
    panel.addEventListener("focus", enter);
    panel.addEventListener("pointerleave", leave);
    panel.addEventListener("blur", leave);
    panel.addEventListener("click", (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (reduced) return;
      e.preventDefault();
      endSweep();
      leaving = true;
      target = side;
      root.classList.add("is-turning");
      setTimeout(() => { location.href = panel.href; }, 1070);
    });
  });

  addEventListener("pageshow", (e) => {
    if (!e.persisted) return;
    leaving = false;
    target = 0;
    root.classList.remove("is-turning");
  });

  const start = () => {
    video.pause();
    startSweep();
    render();
    requestAnimationFrame(frame);
  };
  if (video.readyState >= 1 && video.duration) start();
  else video.addEventListener("loadedmetadata", start, { once: true });
}
