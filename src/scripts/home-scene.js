// Home background: three views of one bay fill the viewport behind the page. The middle view is
// the open bay; the left and right views are the coast on that side, with open ocean beyond.
// `pos` runs -1 (left coast) .. 0 (bay) .. 1 (right coast). Hovering a panel leans toward its
// side; a click turns the camera all the way there while the surf runs out toward the other
// side, then follows the link.
const root = document.querySelector("[data-scene]");
const backdrop = document.querySelector(".backdrop");
if (root && backdrop) {
  const panels = [...root.querySelectorAll(".panel")];
  const canvases = [backdrop.querySelector("canvas.surf")];
  const wins = [backdrop];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const ZOOM = 1.2; // each image is ZOOM viewports wide, leaving room to turn
  const TURN = (ZOOM - 1) / 2; // fraction of the viewport the layers slide between views
  const CELL = 8; // css px per surf pixel
  const ASPECT = 1018 / 2400;
  const MASK_W = 396;
  const MASK_H = 168;
  const LAYERS = [-1, 0, 1];
  // Sea palette: two colors, graphite water and bone-white crests
  const GRAY = "#6d6c68";
  const WHITE = "#ece8de";


  // imgs[w][k]: image for layer LAYERS[k] in window w
  const imgs = wins.map((w) => LAYERS.map((l) => w.querySelector(`img[data-layer="${l}"]`)));
  const masks = [null, null, null];
  const shores = [null, null, null];

  let pos = 0;
  let vel = 0; // spring velocity: a half-finished lean keeps its momentum if the pointer moves again
  let drift = 0; // slow idle sway so the camera is never dead still
  let target = 0;
  let dir = 1; // surf travel: 1 = toward Tech (right), -1 = toward Art (left)
  const IDLE = reduced ? 0 : 0.35; // reduced motion: the sea holds still
  let speed = IDLE;
  let speedTarget = IDLE;
  let leaving = false;

  const layout = () => {
    const W = innerWidth;
    const H = innerHeight;
    // cover the viewport: wide enough to turn, tall enough to fill
    const imgW = Math.max(W * ZOOM, H / ASPECT);
    const imgH = imgW * ASPECT;
    return { W, H, imgW, imgH, slack: (imgW - W) / 2 };
  };

  // Where surf may draw: the sea.
  const buildMask = (img, k) => {
    const c = document.createElement("canvas");
    c.width = MASK_W;
    c.height = MASK_H;
    const x = c.getContext("2d", { willReadFrequently: true });
    x.drawImage(img, 0, 0, MASK_W, MASK_H);
    const d = x.getImageData(0, 0, MASK_W, MASK_H).data;
    // Water is the one big flat patch of graphite gray (#6d6c68). Rock is also gray but textured,
    // so a cell only counts if almost its whole 5x5 neighbourhood is that gray.
    const gray = new Uint8Array(MASK_W * MASK_H);
    for (let i = 0; i < gray.length; i++) {
      const r = d[i * 4];
      const g = d[i * 4 + 1];
      const b = d[i * 4 + 2];
      gray[i] = Math.abs(r - 108) < 16 && Math.abs(g - 108) < 16 && Math.abs(b - 104) < 16 ? 1 : 0;
    }
    const m = new Uint8Array(MASK_W * MASK_H);
    for (let y = 2; y < MASK_H - 2; y++) {
      for (let x2 = 2; x2 < MASK_W - 2; x2++) {
        let n = 0;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) n += gray[(y + dy) * MASK_W + x2 + dx];
        m[y * MASK_W + x2] = n >= 23 ? 1 : 0;
      }
    }
    // Shoreline: sea cells with land to the left, right or below (not above, so the horizon stays calm).
    const e = new Uint8Array(m.length);
    for (let y = 0; y < MASK_H - 1; y++) {
      for (let x2 = 1; x2 < MASK_W - 1; x2++) {
        const i = y * MASK_W + x2;
        if (m[i] && (!m[i - 1] || !m[i + 1] || !m[i + MASK_W])) e[i] = 1;
      }
    }
    masks[k] = m;
    shores[k] = e;
  };

  // Surf weight per view; the bay fades out over whichever coast view sits fully opaque beneath it.
  const opacityOf = (layer) => (layer === 0 ? 1 - Math.abs(pos) : Math.max(0, pos * layer));
  // Layers slide the way the camera turns: toward the left coast, the scene moves right.
  const shiftOf = (layer, W) => -(pos + drift - layer) * TURN * W;
  const leftOf = (w, layer, g) => -g.slack - w * g.W + shiftOf(layer, g.W);

  const place = () => {
    const g = layout();
    // Two different images cross-fading read as two objects; a touch of blur at the midpoint
    // lets the eye take it as one scene changing.
    const m = Math.abs(pos);
    const blur = m > 0.02 && m < 0.98 ? `blur(${(10 * m * (1 - m)).toFixed(2)}px)` : "";
    imgs.forEach((row, w) =>
      row.forEach((img, k) => {
        const layer = LAYERS[k];
        img.style.filter = blur;
        img.style.width = `${g.imgW}px`;
        img.style.height = `${g.imgH}px`;
        img.style.left = `${leftOf(w, layer, g)}px`;
        img.style.top = `${-(g.imgH - g.H) / 2}px`;
        img.style.opacity = layer === 0 ? 1 - Math.abs(pos) : pos * layer > 0 ? 1 : 0;
        img.style.zIndex = layer === 0 ? 3 : layer < 0 ? 1 : 2;
      }),
    );
    return g;
  };

  const draw = (t, g) => {
    const cols = Math.ceil(g.W / CELL);
    const rows = Math.ceil(g.H / CELL);
    const top = -(g.imgH - g.H) / 2;
    canvases.forEach((cv, w) => {
      if (cv.width !== cols) {
        cv.width = cols;
        cv.height = rows;
      }
      const x = cv.getContext("2d");
      x.clearRect(0, 0, cols, rows);
      LAYERS.forEach((layer, k) => {
        const alpha = opacityOf(layer);
        const mask = masks[k];
        const shore = shores[k];
        if (alpha < 0.03 || !mask) return;
        const left = leftOf(w, layer, g);
        for (let cy = 0; cy < rows; cy++) {
          const v = (cy * CELL + CELL / 2 - top) / g.imgH;
          const my = Math.min(MASK_H - 1, Math.max(0, (v * MASK_H) | 0));
          const depth = Math.max(0.15, (v - 0.38) / 0.62);
          for (let cx = 0; cx < cols; cx++) {
            const u = (cx * CELL + CELL / 2 - left) / g.imgW;
            if (u < 0 || u > 1) continue;
            const mx = Math.min(MASK_W - 1, (u * MASK_W) | 0);
            const mi = my * MASK_W + mx;
            if (!mask[mi]) continue;
            x.globalAlpha = alpha;
            if (shore[mi]) {
              // white foam lapping the sand: each stretch of shore breathes on its own phase
              const lap = 0.5 + 0.5 * Math.sin(t * 0.9 + u * 55 + v * 30);
              x.globalAlpha = (0.35 + 0.65 * lap) * alpha;
              x.fillStyle = WHITE;
              x.fillRect(cx, cy, 1, 1);
              continue;
            }
            // The sea is two colors: gray water with white crests.
            const s = Math.sin(u * 70 - dir * t * 1.6 + Math.sin(v * 22 + u * 9) * 1.4 + v * 40 * depth);
            x.fillStyle = s > 0.84 ? WHITE : GRAY;
            x.fillRect(cx, cy, 1, 1);
          }
        }
      });
    });
  };

  let last = performance.now();
  let t = 0;
  let acc = 0;
  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    // Critically damped spring: no overshoot, and it keeps its velocity when retargeted.
    // The committed turn is slower and deliberate; the hover lean is quick.
    const k = leaving ? 55 : 110;
    const c = 2 * Math.sqrt(k) * 0.95;
    vel += ((target - pos) * k - vel * c) * dt;
    pos += vel * dt;
    speed += (speedTarget - speed) * Math.min(1, dt * 3);
    t += dt * speed * 10;
    drift = reduced || leaving ? drift * 0.9 : Math.sin(t * 0.06) * 0.025;
    acc += dt;
    const g = place();
    if (acc > 1 / 30) {
      acc = 0;
      draw(t, g);
    }
    requestAnimationFrame(frame);
  };

  panels.forEach((panel, i) => {
    const side = i === 0 ? -1 : 1;
    const enter = () => { if (!leaving && !reduced) target = side * 0.3; };
    const leave = () => { if (!leaving) target = 0; };
    // Touch fires pointerenter on tap, so only a real mouse leans; the click carries the turn.
    panel.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") enter(); });
    panel.addEventListener("focus", enter);
    panel.addEventListener("pointerleave", leave);
    panel.addEventListener("blur", leave);
    panel.addEventListener("click", (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (reduced) return;
      e.preventDefault();
      leaving = true;
      target = side;
      dir = -side; // click Art: the surf runs out to the right, and the other way for Tech
      speedTarget = 2.2;
      root.classList.add("is-turning");
      setTimeout(() => { location.href = panel.href; }, 800);
    });
  });

  addEventListener("pageshow", (e) => {
    if (!e.persisted) return;
    leaving = false;
    target = 0;
    speedTarget = IDLE;
    dir = 1;
    root.classList.remove("is-turning");
  });

  const flat = imgs[0];
  const ready = (img) =>
    img.complete && img.naturalWidth ? Promise.resolve() : new Promise((r) => img.addEventListener("load", r, { once: true }));
  Promise.all(flat.map(ready)).then(() => {
    flat.forEach(buildMask);
    requestAnimationFrame(frame);
  });
}
