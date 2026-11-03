import { bay } from "./bay.js";
import { navigate } from "astro:transitions/client";
// Home background: the shared backdrop (backdrop.js) scrubs one clip of the camera panning around the
// figure. Its start is the left coast (head turned left), its middle the open sea looking straight
// out, its end the right coast. This steers it: hovering a panel leans toward its side; a click pans
// all the way there and follows the link. Once per visit the camera sweeps the whole clip on load.
// The backdrop persists across pages, so this wires itself up on every visit to Home.
let sweepTimers = [];
const stopTimers = () => {
  sweepTimers.forEach(clearTimeout);
  sweepTimers = [];
};
document.addEventListener("astro:before-swap", stopTimers);

document.addEventListener("astro:page-load", () => {
  const root = document.querySelector("[data-scene]");
  if (!root) return;
  const panels = [...root.querySelectorAll(".panel")];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let leaving = false;
  let sweeping = false;
  stopTimers();

  // Hover is quick, the committed pan deliberate, the intro sweep slow (0.5x speed).
  const steer = () => {
    bay.k = leaving ? 14 : sweeping ? 3.5 : 28;
    bay.busy = leaving || sweeping;
  };

  // Intro: the camera glides across the whole clip once per visit, then settles looking straight out.
  // Any touch hands the camera back at once; the spring keeps its momentum, so there is no snap.
  const endSweep = () => {
    if (!sweeping) return;
    stopTimers();
    sweeping = false;
    bay.target = 0;
    steer();
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
    bay.pos = -1;
    bay.vel = 0;
    bay.target = -1;
    steer();
    const at = (ms, fn) => sweepTimers.push(setTimeout(() => sweeping && fn(), ms));
    at(1800, () => { bay.target = 1; });
    at(7800, () => { bay.target = 0; });
    at(12400, () => { sweeping = false; steer(); });
  };

  panels.forEach((panel, i) => {
    const side = i === 0 ? -1 : 1;
    const enter = () => { endSweep(); if (!leaving && !reduced) bay.target = side * 0.3; };
    const leave = () => { if (!leaving) bay.target = 0; };
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
      bay.target = side;
      steer();
      root.classList.add("is-turning");
      setTimeout(() => navigate(panel.href), 1600);
    });
  });

  bay.mode = "home";
  bay.target = 0; // arriving from a coast pans back to the open sea
  steer();
  startSweep();
});
