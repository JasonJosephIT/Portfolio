// Home: one panorama split across the two panels. Hover leans the view toward a side;
// a click slides the whole scene over (like turning on a globe) while the surf runs out
// toward the other side, then follows the link.
const root = document.querySelector("[data-scene]");
if (root) {
  const panels = [...root.querySelectorAll(".panel")];
  const imgs = [...root.querySelectorAll("img.scene")];
  const canvases = [...root.querySelectorAll("canvas.surf")];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const ZOOM = 2.3; // each window shows 1/ZOOM of the panorama's width, leaving room to pan
  const MAX_PAN = (ZOOM - 2) / 2; // fraction of a window the scene can slide
  const CELL = 6; // css px per surf pixel
  let pan = 0; // -1 .. 1, smoothed toward target
  let target = 0;
  let dir = 1; // surf travel: 1 = toward Tech (right), -1 = toward Art (left)
  let speed = 0.35; // surf speed, eased
  let speedTarget = 0.35;
  let leaving = false;
  let mask = null; // sea mask at MASK_W x MASK_H
  const MASK_W = 396;
  const MASK_H = 168;

  const layout = () => {
    const win = canvases[0].parentElement.getBoundingClientRect();
    const W = win.width;
    const H = win.height;
    const imgW = W * ZOOM;
    const imgH = Math.max(imgW * (1018 / 2400), H);
    return { W, H, imgW, imgH };
  };

  // The panorama is cyan wherever it is sea: sample it once to find where surf may draw.
  const buildMask = () => {
    const src = imgs[0];
    const c = document.createElement("canvas");
    c.width = MASK_W;
    c.height = MASK_H;
    const x = c.getContext("2d", { willReadFrequently: true });
    x.drawImage(src, 0, 0, MASK_W, MASK_H);
    const d = x.getImageData(0, 0, MASK_W, MASK_H).data;
    mask = new Uint8Array(MASK_W * MASK_H);
    for (let i = 0; i < mask.length; i++) {
      const r = d[i * 4];
      const g = d[i * 4 + 1];
      const b = d[i * 4 + 2];
      mask[i] = b > 150 && g > 110 && b > r + 50 ? 1 : 0;
    }
  };

  const place = () => {
    const { W, H, imgW, imgH } = layout();
    const slack = (imgW - 2 * W) / 2; // base offset keeps the panorama centred across both windows
    imgs.forEach((img, i) => {
      const left = -slack - i * W + pan * MAX_PAN * W * -1;
      img.style.width = `${imgW}px`;
      img.style.height = `${imgH}px`;
      img.style.left = `${left}px`;
      img.style.top = `${-(imgH - H) / 2}px`;
    });
    return { W, H, imgW, imgH, slack };
  };

  const draw = (t, geo) => {
    const { W, H, imgW, imgH, slack } = geo;
    const cols = Math.ceil(W / CELL);
    const rows = Math.ceil(H / CELL);
    canvases.forEach((cv, i) => {
      const dpr = 1;
      if (cv.width !== cols * dpr) {
        cv.width = cols;
        cv.height = rows;
      }
      const x = cv.getContext("2d");
      x.clearRect(0, 0, cols, rows);
      const left = -slack - i * W - pan * MAX_PAN * W;
      const top = -(imgH - H) / 2;
      for (let cy = 0; cy < rows; cy++) {
        const py = cy * CELL + CELL / 2;
        const v = (py - top) / imgH;
        const my = Math.min(MASK_H - 1, Math.max(0, (v * MASK_H) | 0));
        // surf bands get tighter toward the horizon so the water has depth
        const depth = Math.max(0.15, (v - 0.38) / 0.62);
        for (let cx = 0; cx < cols; cx++) {
          const px = cx * CELL + CELL / 2;
          const u = (px - left) / imgW;
          if (u < 0 || u > 1) continue;
          const mx = Math.min(MASK_W - 1, (u * MASK_W) | 0);
          if (!mask[my * MASK_W + mx]) continue;
          const phase = u * 70 - dir * t * 1.6 + Math.sin(v * 22 + u * 9) * 1.4 + v * 40 * depth;
          const s = Math.sin(phase);
          if (s > 0.92) {
            x.fillStyle = "rgba(236,232,222,0.7)";
            x.fillRect(cx, cy, 1, 1);
          } else if (s > 0.8 && ((cx + cy) & 1) === 0) {
            x.fillStyle = "rgba(236,232,222,0.28)";
            x.fillRect(cx, cy, 1, 1);
          }
        }
      }
    });
  };

  let last = performance.now();
  let t = 0;
  let acc = 0;
  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    pan += (target - pan) * Math.min(1, dt * (leaving ? 3.2 : 4));
    speed += (speedTarget - speed) * Math.min(1, dt * 3);
    t += dt * speed * 10;
    acc += dt;
    const geo = place();
    if (mask && acc > 1 / 30) {
      acc = 0;
      draw(t, geo);
    }
    requestAnimationFrame(frame);
  };

  const lean = (i, amount) => {
    if (leaving) return;
    target = i < 0 ? 0 : (i === 0 ? -1 : 1) * amount;
  };

  panels.forEach((panel, i) => {
    const enter = () => lean(i, 0.28);
    const leave = () => lean(-1, 0);
    panel.addEventListener("pointerenter", enter);
    panel.addEventListener("focus", enter);
    panel.addEventListener("pointerleave", leave);
    panel.addEventListener("blur", leave);
    panel.addEventListener("click", (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (reduced) return;
      e.preventDefault();
      leaving = true;
      // Click Art: the view turns left and the surf runs out to the right, and the other way for Tech.
      target = i === 0 ? -1 : 1;
      dir = i === 0 ? 1 : -1;
      speedTarget = 2.2;
      root.classList.add("is-turning");
      setTimeout(() => { location.href = panel.href; }, 850);
    });
  });

  addEventListener("pageshow", (e) => {
    if (!e.persisted) return;
    leaving = false;
    target = 0;
    speedTarget = 0.35;
    dir = 1;
    root.classList.remove("is-turning");
  });

  const start = () => {
    buildMask();
    requestAnimationFrame(frame);
  };
  if (imgs[0].complete && imgs[0].naturalWidth) start();
  else imgs[0].addEventListener("load", start, { once: true });
}
