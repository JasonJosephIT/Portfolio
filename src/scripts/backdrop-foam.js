// Waves over the bay. The clip (Kling 4.0) is scrubbed, so its own water only moves with the
// camera; this layer keeps the sea alive on its own with thin wave fronts rolling in from the horizon. It reads the current video frame to find the water (the one
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
  const dark = new Uint8Array(MW * MH);
  const fig = new Uint8Array(MW * MH); // the figure: skin plus the dark hair and shirt joined to it
  const stack = new Int32Array(MW * MH);
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
      dark[i] = d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2] < 210 ? 1 : 0;
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
    // Figure: start from the skin and grow through any dark pixel touching it, so the hair and shirt
    // outline count as figure too (otherwise the shore detector rims them with foam).
    // Only the largest patch of skin seeds it (the face and neck): warm house walls are small patches,
    // and growing from them through the dark rock would mask the whole coast.
    fig.fill(0);
    let sp = 0;
    let seed = -1;
    let seedSize = 0;
    for (let i = 0; i < skin.length; i++) {
      if (!skin[i] || fig[i]) continue;
      let size = 0;
      fig[i] = 2;
      stack[sp++] = i;
      while (sp) {
        const k = stack[--sp];
        size++;
        for (const j of [k - 1, k + 1, k - MW, k + MW]) {
          if (j < 0 || j >= fig.length || fig[j] || !skin[j]) continue;
          fig[j] = 2;
          stack[sp++] = j;
        }
      }
      if (size > seedSize) { seedSize = size; seed = i; }
    }
    fig.fill(0);
    if (seed >= 0) { fig[seed] = 1; stack[sp++] = seed; }
    while (sp) {
      const i = stack[--sp];
      const xx = i % MW;
      for (const j of [i - 1, i + 1, i - MW, i + MW]) {
        if (j < 0 || j >= fig.length || fig[j] || !(dark[j] || skin[j])) continue;
        if ((j === i - 1 && xx === 0) || (j === i + 1 && xx === MW - 1)) continue;
        fig[j] = 1;
        stack[sp++] = j;
      }
    }
    near.fill(0);
    for (let y = 4; y < MH - 4; y++) {
      for (let xx = 4; xx < MW - 4; xx++) {
        if (!fig[y * MW + xx]) continue;
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
    const tick = (t * 3) | 0; // foam flecks reshuffle a few times a second so none sits still
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
          if (hash(cx + tick, cy) % 100 < 35 + 55 * lap) {
            x.globalAlpha = Math.min(1, 0.3 + 0.4 * lap + 0.4 * arrive);
            x.fillRect(cx, cy, 1, 1);
          }
          continue;
        }
      }
    }
    // Wave fronts: each is a thin half-ellipse bowing toward the viewer (a half circle seen at a low
    // angle) with a fainter second line just inside it. It starts small near the horizon and swells as
    // it rolls forward, its ends tapering away; a new cycle picks a new centre along the bay.
    const horizonRow = Math.max(0, (oy + HORIZON * vh * s) / CELL);
    const plot = (px_, py_, a) => {
      const cx = px_ | 0;
      const cy = py_ | 0;
      if (cx < 0 || cx >= cols || cy < 0 || cy >= rows) return;
      const u = ((cx * CELL + CELL / 2 - ox) / s) / vw;
      const v = ((cy * CELL + CELL / 2 - oy) / s) / vh;
      if (u < 0 || u >= 1 || v < 0 || v >= 1) return;
      const i = ((v * MH) | 0) * MW + ((u * MW) | 0);
      if (!water[i] || near[i]) return;
      x.globalAlpha = a;
      x.fillRect(cx, cy, 1, 1);
    };
    for (let k = 0; k < WAVES; k++) {
      const phase = t / PERIOD + k / WAVES;
      const cycle = Math.floor(phase);
      const p = phase - cycle;
      const cu = cols * (0.3 + 0.4 * ((hash(cycle, k + 11) % 1000) / 1000));
      const ax = cols * (0.04 + 0.55 * Math.pow(p, 1.15));
      const cv = horizonRow + p * rows * 0.1;
      const life = Math.min(1, p / 0.12) * Math.min(1, (1 - p) / 0.15);
      for (const [dr, fade] of [[0, 1], [3, 0.5]]) {
        const rx = ax - dr;
        const ry = rx * 0.42 - dr * 0.6;
        if (rx < 2 || ry < 1) continue;
        const lo = dr ? 0.12 : 0;
        const dTheta = 0.5 / Math.max(rx, 8);
        for (let th = lo * Math.PI; th <= Math.PI * (1 - lo); th += dTheta) {
          const taper = Math.pow(Math.sin(th), 0.45); // the ends thin out and fade
          plot(cu + rx * Math.cos(th), cv + ry * Math.sin(th), 0.95 * fade * life * taper);
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
