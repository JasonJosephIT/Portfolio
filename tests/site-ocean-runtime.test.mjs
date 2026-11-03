import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { runInNewContext } from "node:vm";

const source = stripTypeScriptTypes(
  readFileSync(new URL("../src/scripts/ocean-waves.ts", import.meta.url), "utf8")
    .replace(/^import foamURL[^\n]+$/m, 'const foamURL = "/foam.png";')
    .replace(/^import swellURL[^\n]+$/m, 'const swellURL = "/swell.png";'),
);

class Events {
  listeners = new Map();
  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }
  dispatch(type, event = {}) {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

// Exercise the real initialization and scheduling code, replacing only browser
// boundaries. No shader math is reproduced by this harness.
async function mount({ webgl = true, reduced = false, compile = true, pageHeight = 18000, search = "" } = {}) {
  const uniforms = {};
  const draws = [];
  const warnings = [];
  const frames = new Map();
  let nextFrame = 1;
  let contextLost = false;
  const gl = {};
  const constants = ["VERTEX_SHADER", "FRAGMENT_SHADER", "COMPILE_STATUS", "LINK_STATUS", "ARRAY_BUFFER", "STATIC_DRAW", "FLOAT", "TEXTURE0", "TEXTURE_2D", "TEXTURE_WRAP_S", "TEXTURE_WRAP_T", "CLAMP_TO_EDGE", "TEXTURE_MIN_FILTER", "TEXTURE_MAG_FILTER", "NEAREST", "RGBA", "UNSIGNED_BYTE", "TRIANGLES"];
  constants.forEach((constant, index) => { gl[constant] = index + 1; });
  for (const method of ["shaderSource", "compileShader", "deleteShader", "attachShader", "linkProgram", "useProgram", "bindBuffer", "bufferData", "enableVertexAttribArray", "vertexAttribPointer", "activeTexture", "bindTexture", "texParameteri", "texImage2D"]) gl[method] = () => {};
  for (const method of ["createShader", "createProgram", "createBuffer", "createTexture"]) gl[method] = () => ({});
  gl.getShaderParameter = () => compile;
  gl.getShaderInfoLog = () => "Test shader compile failure";
  gl.getProgramParameter = () => true;
  gl.getAttribLocation = () => 0;
  gl.getUniformLocation = (_program, name) => name;
  gl.uniform1i = (name, value) => { uniforms[name] = value; };
  gl.uniform1f = (name, value) => { uniforms[name] = value; };
  gl.uniform2f = (name, x, y) => { uniforms[name] = [x, y]; };
  gl.uniform3f = (name, x, y, z) => { uniforms[name] = [x, y, z]; };
  gl.viewport = (_x, _y, width, height) => { gl.viewportSize = [width, height]; };
  gl.isContextLost = () => contextLost;
  gl.drawArrays = () => { draws.push({ ...uniforms }); };

  const water = { dataset: {}, style: {} };
  const canvas = Object.assign(new Events(), {
    style: {}, width: 0, height: 0,
    getContext: () => webgl ? gl : null,
  });
  const field = {
    dataset: {}, isConnected: true, clientWidth: 1200, clientHeight: pageHeight,
    querySelector: selector => selector === "[data-current-water]" ? water : canvas,
    getBoundingClientRect: () => ({ top: -sandbox.scrollY }),
  };
  const document = Object.assign(new Events(), { hidden: false, querySelectorAll: () => [field] });
  const window = new Events();
  window.location = { search };
  const media = Object.assign(new Events(), { matches: reduced });
  const sandbox = {
    document, window, URLSearchParams, scrollY: 0, innerHeight: 800,
    matchMedia: () => media,
    Image: class {
      set src(value) {
        this.url = value;
        queueMicrotask(() => this.onload());
      }
    },
    ResizeObserver: class { observe() {} },
    requestAnimationFrame: callback => {
      const id = nextFrame++;
      frames.set(id, callback);
      return id;
    },
    cancelAnimationFrame: id => { frames.delete(id); },
    console: { warn: (...args) => warnings.push(args) },
  };
  runInNewContext(source, sandbox, { filename: "ocean-waves.ts" });
  await new Promise(setImmediate);

  return {
    water, canvas, field, document, window, media, gl, draws, frames, warnings,
    advance(timestamp) {
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach(callback => callback(timestamp));
    },
    scrollTo(y) { sandbox.scrollY = y; window.dispatch("scroll"); },
    setContextLost(value) { contextLost = value; },
  };
}

test("unavailable WebGL leaves the still fallback active without scheduling work", async () => {
  const ocean = await mount({ webgl: false });
  assert.equal(ocean.water.dataset.renderer, undefined);
  assert.equal(ocean.draws.length, 0);
  assert.equal(ocean.frames.size, 0);
});

test("diagonal is the selected default while downward remains a comparison option", async () => {
  for (const [search, direction, expected] of [
    ["?wave=down", "down", [0, 1]],
    ["?wave=diagonal", "diagonal", [1, 0]],
    ["", "diagonal", [1, 0]],
    ["?wave=invalid", "diagonal", [1, 0]],
  ]) {
    const ocean = await mount({ search });
    assert.equal(ocean.field.dataset.direction, direction);
    assert.deepEqual(ocean.draws.at(-1).u_directions, expected);
  }
});

test("reduced motion draws a static view and still follows document scrolling", async () => {
  const ocean = await mount({ reduced: true });
  assert.equal(ocean.water.dataset.renderer, "webgl");
  assert.ok(ocean.draws.length > 0);
  assert.equal(ocean.frames.size, 0);
  ocean.scrollTo(2400);
  assert.equal(ocean.draws.at(-1).u_origin, 2400);
  assert.equal(ocean.draws.at(-1).u_time, 0);
  const frozenSmallY = ocean.draws.at(-1).u_smallWaveY;
  ocean.scrollTo(3600);
  assert.equal(ocean.draws.at(-1).u_smallWaveY, frozenSmallY);
  assert.equal(ocean.frames.size, 0);
});

test("time advances continuously while scrolling changes only document origin", async () => {
  const ocean = await mount();
  assert.equal(ocean.frames.size, 1);
  ocean.advance(100);
  ocean.advance(1100);
  const beforeScroll = ocean.draws.at(-1);
  assert.equal(beforeScroll.u_time, 1);
  assert.equal(beforeScroll.u_origin, 0);
  ocean.scrollTo(6000);
  const afterScroll = ocean.draws.at(-1);
  assert.equal(afterScroll.u_origin, 6000);
  assert.equal(afterScroll.u_time, beforeScroll.u_time);
  assert.deepEqual(afterScroll.u_waveOffset, beforeScroll.u_waveOffset);
  assert.equal(afterScroll.u_smallWaveY, beforeScroll.u_smallWaveY);
  ocean.advance(2100);
  assert.equal(ocean.draws.at(-1).u_time, 2);
  const nextOffset = ocean.draws.at(-1).u_waveOffset;
  assert.equal(ocean.draws.at(-1).u_smallWaveY - beforeScroll.u_smallWaveY, 6);
  assert.ok(nextOffset[0] < beforeScroll.u_waveOffset[0], "wave must move left");
  assert.ok(nextOffset[1] > beforeScroll.u_waveOffset[1], "wave must slope downward while moving left");
  assert.ok(Math.abs((nextOffset[1] - beforeScroll.u_waveOffset[1]) / (nextOffset[0] - beforeScroll.u_waveOffset[0]) + 1.5) < 0.00001);
  assert.equal(ocean.draws.at(-1).u_origin, 6000);
});

test("the smaller repeating wash uses the second texture and never jumps backward", async () => {
  const ocean = await mount({ pageHeight: 3000 });
  assert.equal(ocean.draws.at(-1).u_swell, 1);
  ocean.advance(0);
  ocean.advance(504000);
  assert.ok(ocean.draws.at(-1).u_smallWaveY > 3000);
  const before = ocean.draws.at(-1).u_smallWaveY;
  ocean.advance(514000);
  assert.equal(ocean.draws.at(-1).u_smallWaveY - before, 60);
});

test("repeating diagonal fronts advance without a page-length reset", async () => {
  const ocean = await mount({ pageHeight: 3000 });
  ocean.advance(0);
  ocean.advance(372000);
  const cleared = ocean.draws.at(-1).u_waveOffset;
  assert.ok(cleared[0] < -1600);
  assert.ok(cleared[1] > 2400);
  ocean.advance(410000);
  const later = ocean.draws.at(-1).u_waveOffset;
  assert.ok(later[0] < cleared[0]);
  assert.ok(later[1] > cleared[1]);
  const longPage = await mount({ pageHeight: 250000 });
  longPage.advance(0);
  longPage.advance(410000);
  assert.deepEqual(longPage.draws.at(-1).u_waveOffset, later);
});

test("render dimensions stay bounded by the viewport on a very long page", async () => {
  const ocean = await mount({ pageHeight: 250000 });
  assert.equal(ocean.canvas.width, 600);
  assert.equal(ocean.canvas.height, 400);
  assert.equal(ocean.canvas.style.height, "800px");
  assert.deepEqual(ocean.gl.viewportSize, [600, 400]);
  ocean.scrollTo(249200);
  assert.equal(ocean.draws.at(-1).u_origin, 249200);
  assert.equal(ocean.canvas.height, 400);
});

test("context loss cancels animation and retains fallback after restoration events", async () => {
  const ocean = await mount();
  ocean.setContextLost(true);
  let prevented = false;
  ocean.canvas.dispatch("webglcontextlost", { preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(ocean.frames.size, 0);
  assert.equal(ocean.water.dataset.renderer, undefined);
  const drawsBefore = ocean.draws.length;
  ocean.scrollTo(500);
  assert.equal(ocean.draws.length, drawsBefore);
  ocean.setContextLost(false);
  ocean.canvas.dispatch("webglcontextrestored");
  ocean.scrollTo(1000);
  ocean.document.dispatch("visibilitychange");
  assert.equal(ocean.draws.length, drawsBefore);
  assert.equal(ocean.water.dataset.renderer, undefined);
  assert.equal(ocean.frames.size, 0);
});

test("shader failure preserves the still fallback without a running animation", async () => {
  const ocean = await mount({ compile: false });
  assert.equal(ocean.water.dataset.renderer, undefined);
  assert.equal(ocean.frames.size, 0);
  assert.equal(ocean.draws.length, 0);
  assert.equal(ocean.warnings.length, 1);
});
