// Foamy waves over the bay, recreated from a locked-camera Kling 4.0 reference (a wave forms as a
// thin white line at the horizon, swells into a thick crescent as it rolls toward the viewer and the
// figure, breaks into foam and flecks near the shore, and leaves lace behind). The clip is scrubbed,
// so its own waves only move with the camera; this layer keeps the sea alive on its own. It reads the current video frame to find the water (the one
// big flat patch of graphite gray), so it follows the camera wherever the clip is scrubbed to.
const el = document.querySelector(".backdrop");
const video = el && el.querySelector(".pan");
const cv = el && el.querySelector("canvas.foam");
if (video && cv && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const CELL = 6; // css px per foam pixel
  const MW = 240; // water-mask resolution
  const MH = 102;
  const WHITE = "#ece8de";
  const probe = document.createElement("canvas");
  probe.width = MW;
  probe.height = MH;
  const px = probe.getContext("2d", { willReadFrequently: true });
  const x = cv.getContext("2d");
  const gray = new Uint8Array(MW * MH);
  const water = new Uint8Array(MW * MH);
  const edge = new Uint8Array(MW * MH);
  const skin = new Uint8Array(MW * MH);
  const near = new Uint8Array(MW * MH); // within a few cells of the figure: no foam there

  const WAVES = 3; // wave fronts in flight at once
  const PERIOD = 11; // seconds for one front to cross the bay (slow)
  const HORIZON = 0.35; // where the water starts, as a fraction of the clip height
  const hash = (a, b) => ((a * 73856093) ^ (b * 19349663)) >>> 0;
  let t = 0;
  let prev = performance.now();
  let acc = 0;
  let frameKey = -1;

  const readFrame = () => {
    px.drawImage(video, 0, 0, MW, MH);
    const d = px.getImageData(0, 0, MW, MH).data;
    for (let i = 0; i < gray.length; i++) {
      skin[i] = d[i * 4] - d[i * 4 + 2] > 14 && d[i * 4] < 120 && d[i * 4 + 1] < 85 ? 1 : 0;
      gray[i] = Math.abs(d[i * 4] - 108) < 20 && Math.abs(d[i * 4 + 1] - 108) < 20 && Math.abs(d[i * 4 + 2] - 104) < 20 ? 1 : 0;
    }
    // Water only where almost the whole 5x5 neighbourhood is that flat gray: rock is gray but textured.
    for (let y = 2; y < MH - 2; y++) {
      for (let xx = 2; xx < MW - 2; xx++) {
        let n = 0;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) n += gray[(y + dy) * MW + xx + dx];
        water[y * MW + xx] = n >= 22 ? 1 : 0;
      }
    }
    near.fill(0);
    for (let y = 4; y < MH - 4; y++) {
      for (let xx = 4; xx < MW - 4; xx++) {
        if (!skin[y * MW + xx]) continue;
        for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) near[(y + dy) * MW + xx + dx] = 1;
      }
    }
    // Shore: water with land to the left, right or below (not above, so the horizon stays calm).
    for (let y = 0; y < MH - 1; y++) {
      for (let xx = 1; xx < MW - 1; xx++) {
        const i = y * MW + xx;
        edge[i] = water[i] && (!water[i - 1] || !water[i + 1] || !water[i + MW]) ? 1 : 0;
      }
    }
  };

  const draw = () => {
    const W = innerWidth;
    const H = innerHeight;
    const cols = Math.ceil(W / CELL);
    const rows = Math.ceil(H / CELL);
    if (cv.width !== cols) {
      cv.width = cols;
      cv.height = rows;
    }
    x.clearRect(0, 0, cols, rows);
    // Map screen -> video: object-fit: cover, anchored to the bottom (object-position 50% 100%).
    const vw = video.videoWidth || 1600;
    const vh = video.videoHeight || 678;
    const s = Math.max(W / vw, H / vh);
    const ox = (W - vw * s) / 2;
    const oy = H - vh * s;
    x.fillStyle = WHITE;
    // The shoreline foam swells as each front reaches the shore (p near 0.9) and settles after.
    let arrive = 0;
    for (let k = 0; k < WAVES; k++) {
      const p = (t / PERIOD + k / WAVES) % 1;
      arrive = Math.max(arrive, Math.max(0, 1 - Math.abs(p - 0.9) / 0.12));
    }
    for (let cy = 0; cy < rows; cy++) {
      const sy = cy * CELL + CELL / 2;
      const v = (sy - oy) / s / vh;
      if (v < 0 || v >= 1) continue;
      const my = (v * MH) | 0;
      for (let cx = 0; cx < cols; cx++) {
        const u = ((cx * CELL + CELL / 2 - ox) / s) / vw;
        if (u < 0 || u >= 1) continue;
        const i = my * MW + ((u * MW) | 0);
        if (!water[i] || near[i]) continue;
        if (edge[i]) {
          // foam lapping the sand, each stretch breathing on its own slow phase
          const lap = 0.5 + 0.5 * Math.sin(t * 0.7 + u * 60 + v * 28);
          x.globalAlpha = Math.min(1, 0.25 + 0.45 * lap + 0.4 * arrive);
          x.fillRect(cx, cy, 1, 1);
          continue;
        }
        // Each front: thin line at the horizon -> thick crescent up close, accelerating as it comes
        // (perspective), its middle leading so it bows toward the viewer like the reference.
        const span = v - HORIZON;
        if (span < 0) continue;
        const bow = 1 - Math.pow((u - 0.5) * 2, 2);
        const wob = Math.sin(u * 11 + v * 7) * 0.012;
        for (let k = 0; k < WAVES; k++) {
          const p = (t / PERIOD + k / WAVES) % 1;
          const front = HORIZON + (1 - HORIZON) * Math.pow(p, 1.7) + bow * 0.06 * p + wob * p;
          const behind = front - v; // > 0 means this cell is behind the crest
          if (behind < 0) continue;
          const thick = 0.006 + 0.05 * p;
          const life = p < 0.12 ? p / 0.12 : p > 0.9 ? Math.max(0, (1 - p) / 0.1) : 1;
          if (behind < thick) {
            x.globalAlpha = 0.92 * life;
            x.fillRect(cx, cy, 1, 1);
          } else if (behind < thick + 0.07 * p && hash(cx, cy) % 100 < 38 * (1 - (behind - thick) / (0.07 * p + 1e-4))) {
            // lacy foam trailing behind the crest, thinning out
            x.globalAlpha = 0.55 * life;
            x.fillRect(cx, cy, 1, 1);
          } else if (p > 0.78 && behind < thick + 0.025 && hash(cx + 3, cy + (t * 6) | 0) % 100 < 6) {
            // breaking: flecks thrown up just ahead of the crest as it reaches the shore
            x.globalAlpha = 0.8 * life;
            x.fillRect(cx, cy, 1, 1);
          }
        }
      }
    }
    x.globalAlpha = 1;
  };

  const frame = (now) => {
    const dt = Math.min(0.05, (now - prev) / 1000);
    prev = now;
    t += dt;
    acc += dt;
    if (acc > 1 / 20 && video.readyState >= 2) {
      acc = 0;
      // The water only needs re-reading when the camera has actually moved.
      const key = Math.round(video.currentTime * 60);
      if (key !== frameKey) {
        frameKey = key;
        readFrame();
      }
      draw();
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
