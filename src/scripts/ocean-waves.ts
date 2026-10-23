import foamURL from "@/assets/ocean/swell-pixel.png?url";
import swellURL from "@/assets/ocean/foam-pixel.png?url";

// Keep the original phone-scale detail; larger screens reveal more ocean.
const oceanScale = 270;

// Per-page tone, drawn from the page accent and kept low in brightness so the
// water stays a whisper under the mats: bone on Home, cyan on Tech, coral on Art.
const tones: Record<string, { shadow: number[]; crest: number[]; highlight: number[] }> = {
  bone:  { shadow: [0.045, 0.045, 0.05], crest: [0.52, 0.50, 0.46], highlight: [0.74, 0.72, 0.67] },
  cyan:  { shadow: [0.010, 0.070, 0.09], crest: [0.20, 0.52, 0.60], highlight: [0.55, 0.82, 0.88] },
  coral: { shadow: [0.130, 0.063, 0.086], crest: [0.70, 0.41, 0.35], highlight: [0.90, 0.60, 0.50] },
};

const vertexSource = `
  attribute vec2 a_position;
  varying vec2 v_uv;
  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const fragmentSource = `
  precision highp float;
  varying vec2 v_uv;
  uniform sampler2D u_foam;
  uniform sampler2D u_swell;
  uniform vec2 u_view;
  uniform float u_scale;
  uniform float u_origin;
  uniform float u_time;
  uniform vec2 u_waveOffset;
  uniform float u_smallWaveY;
  uniform vec3 u_shadow;
  uniform vec3 u_crest;
  uniform vec3 u_highlight;
  uniform vec2 u_directions;

  // The reference crest runs upper-left to lower-right (roughly 2:3).
  // Travel across that crest from the right toward the lower-left, without
  // rotating or shearing the photograph itself.
  const vec2 travelNormal = vec2(0.5547002, -0.8320503);
  vec2 mirrorUV(vec2 uv) { return 1.0 - abs(mod(uv, 2.0) - 1.0); }
  // 4x4 ordered dither threshold in [0, 1): a fixed screen-space pattern, so
  // quantised colour steps stay put instead of boiling frame to frame.
  float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
  float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float smoothNoise(vec2 p) {
    vec2 cell = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(cell), hash(cell + vec2(1.0, 0.0)), f.x),
      mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0)), f.x), f.y);
  }

  void main() {
    vec2 screen = vec2(v_uv.x * u_view.x, (1.0 - v_uv.y) * u_view.y);
    vec2 world = vec2(screen.x, screen.y + u_origin);
    float scale = u_scale;
    float waveHeight = scale * (360.0 / 540.0);
    vec2 local = world - u_waveOffset;
    vec2 p = local / vec2(scale, waveHeight) + 0.5;
    float spacing = scale * (1000.0 / 540.0);
    float distance = dot(local, travelNormal);
    // Stable parity follows each front, alternating broad/coarse and fine foam.
    float waveIndex = floor((distance + spacing * 0.5) / spacing);
    float diagonalVariant = mod(waveIndex, 2.0);
    float seed = hash(vec2(waveIndex, 7.3)) * 31.0;
    float along = dot(local, vec2(0.8320503, 0.5547002)) / scale;
    // Each crest owns a stable seed. Interpolated noise changes continuously
    // with time, rather than selecting a fresh random pattern every frame.
    float sculpt = smoothNoise(vec2(along * 2.4 + seed, u_time * 0.12 + seed));
    float billow = smoothNoise(vec2(along * 6.0 - seed, -u_time * 0.17));
    float widthShift = 0.86 + 0.28 * smoothNoise(vec2(seed, u_time * 0.10));

    // Large eddies and smaller cross-currents distort the photograph without
    // changing its grain every frame. Time is continuous and scroll-independent.
    vec2 flow = vec2(
      sin(p.y * 7.2 + u_time * 0.23) + 0.45 * sin(p.x * 12.0 - p.y * 4.1 - u_time * 0.18),
      sin(p.x * 6.3 - p.y * 3.8 - u_time * 0.19) + 0.4 * cos(p.y * 11.1 + u_time * 0.16)
    );
    // Tone comes from the page accent (see CurrentField.astro).
    vec3 shadow = u_shadow;
    vec3 crest = u_crest;
    // Repeat fronts at a regular spacing, with a calm-water gap between them.
    float edge = (mod(distance + spacing * 0.5, spacing) - spacing * 0.5)
      / (scale * mix(0.55, 0.42, diagonalVariant) * widthShift);
    edge += (sculpt - 0.5) * 0.26 + (billow - 0.5) * 0.10;
    float wash = 1.0 - smoothstep(0.30, 0.50, abs(edge));
    // Travel is toward the negative normal: foam piles up on that leading
    // side, then breaks into the darker body of the wave rather than a stripe.
    float frontBand = smoothstep(-0.49, -0.35, edge)
      * (1.0 - smoothstep(-0.17, 0.02, edge));
    // One document-anchored water surface: the crest displaces its coordinates,
    // rather than sliding an unrelated foam photograph over stationary pixels.
    float influence = wash * u_directions.x;
    vec2 displacement = (travelNormal * sin(edge * 6.2831853) * 10.0
      + flow * 3.0) * influence;
    // Snap to the 2px simulation grid so nearest-neighbour texels step
    // cleanly instead of crawling as the displacement drifts.
    vec2 waterPosition = floor((world + displacement) / 2.0) * 2.0;
    vec2 waterUV = waterPosition / vec2(scale, scale * (1456.0 / 816.0));
    float waterDetail = texture2D(u_swell, mirrorUV(waterUV)).r;
    float coarseDetail = texture2D(u_foam,
      mirrorUV(waterPosition / vec2(scale, waveHeight))).r;
    float surfaceFoam = mix(waterDetail, coarseDetail, 0.22);
    float foamClusters = smoothstep(0.12, 0.65, surfaceFoam);
    float frontFoam = frontBand * (0.18 + foamClusters * 0.82);
    vec3 foamHighlight = u_highlight;
    // The same foam remains faintly visible in the dark gaps, and catches
    // stronger light inside the passing crest. No second surface is composited.
    vec3 base = mix(vec3(6.0, 8.0, 11.0) / 255.0, shadow,
      0.38 + surfaceFoam * 0.30);
    base += crest * pow(surfaceFoam, 1.35) * 0.24;
    vec3 diagonalColor = base + crest * pow(surfaceFoam, 1.12) * influence * 0.65;
    diagonalColor += foamHighlight * frontFoam * surfaceFoam * influence * 0.65;

    // Two smaller downward versions alternate fine and coarse foam. Preserve
    // each image's aspect ratio by revealing a slice rather than squashing it.
    float smallHeight = clamp(scale * 0.20, 100.0, 220.0);
    float bow = (0.25 - pow(world.x / u_view.x - 0.5, 2.0)) * smallHeight * 0.4;
    float smallSpacing = max(scale * 0.8, 480.0);
    float downwardVariant = mod(floor((world.y - u_smallWaveY - bow + smallSpacing * 0.5)
      / smallSpacing), 2.0);
    float smallDistance = mod(world.y - u_smallWaveY - bow + smallSpacing * 0.5,
      smallSpacing) - smallSpacing * 0.5;
    vec2 smallUV = vec2(world.x / scale,
      smallDistance / (scale * (1456.0 / 816.0)) + 0.46);
    vec2 smallDistortion = vec2(sin(smallUV.y * 13.0 + u_time * 0.18),
      sin(smallUV.x * 11.0 - u_time * 0.25)) * 0.012;
    smallUV += smallDistortion;
    vec2 coarseUV = vec2(world.x / scale + 0.12,
      smallDistance / waveHeight + 0.52) + smallDistortion;
    float texelGrid = scale * 0.5;
    smallUV = floor(smallUV * texelGrid) / texelGrid;
    coarseUV = floor(coarseUV * texelGrid) / texelGrid;
    float smallFoam = mix(texture2D(u_swell, mirrorUV(smallUV)).r,
      texture2D(u_foam, mirrorUV(coarseUV)).r, downwardVariant);
    float smallEdge = smallDistance / (smallHeight * mix(1.0, 0.75, downwardVariant));
    float smallWash = (1.0 - smoothstep(0.22, 0.50, abs(smallEdge))) * 0.65;
    vec3 smallColor = mix(shadow, crest, pow(smallFoam, 1.12));
    // Max blending avoids doubling the brightness where the currents cross.
    vec3 combined = max(diagonalColor, mix(base, smallColor, smallWash * u_directions.y));
    // Quantise to a small palette with ordered dither: stable pixel-art steps.
    const float levels = 40.0;
    combined = floor(combined * levels + bayer4(gl_FragCoord.xy)) / levels;
    gl_FragColor = vec4(combined, 1.0);
  }
`;

const loadImage = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = reject;
  image.src = url;
});

document.querySelectorAll<HTMLElement>("[data-current-field]").forEach(async field => {
  const water = field.querySelector<HTMLElement>("[data-current-water]");
  const canvas = field.querySelector<HTMLCanvasElement>("[data-ocean-canvas]");
  if (!water || !canvas || field.dataset.ready) return;
  field.dataset.ready = "true";

  const gl = canvas.getContext("webgl", {
    alpha: false, antialias: false, depth: false, stencil: false,
    powerPreference: "low-power", preserveDrawingBuffer: false,
  });
  if (!gl) return; // The original image remains visible as the CSS fallback.

  const compile = (kind: number, source: string) => {
    const shader = gl.createShader(kind);
    if (!shader) throw new Error("Could not allocate ocean shader");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(info || "Could not compile ocean shader");
    }
    return shader;
  };

  let frame = 0;
  let previousTime: number | undefined;
  let elapsed = 0;
  let lastPaint = -Infinity;
  let contextUnavailable = false;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");

  try {
    const [foam, swell] = await Promise.all([loadImage(foamURL), loadImage(swellURL)]);
    if (!field.isConnected) return;
    const vertex = compile(gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    if (!program) throw new Error("Could not allocate ocean program");
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("Could not link ocean program");
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    [foam, swell].forEach((image, index) => {
      const texture = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + index);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    });
    gl.uniform1i(gl.getUniformLocation(program, "u_foam"), 0);
    gl.uniform1i(gl.getUniformLocation(program, "u_swell"), 1);
    gl.uniform1f(gl.getUniformLocation(program, "u_scale"), oceanScale);
    const tone = tones[field.dataset.tone ?? ""] ?? tones.bone;
    gl.uniform3f(gl.getUniformLocation(program, "u_shadow"), ...(tone.shadow as [number, number, number]));
    gl.uniform3f(gl.getUniformLocation(program, "u_crest"), ...(tone.crest as [number, number, number]));
    gl.uniform3f(gl.getUniformLocation(program, "u_highlight"), ...(tone.highlight as [number, number, number]));
    // Diagonal is the selected site-wide treatment; retain the comparison link.
    const requestedDirection = new URLSearchParams(window.location.search).get("wave");
    const direction = requestedDirection === "down" || requestedDirection === "diagonal"
      ? requestedDirection : "diagonal";
    field.dataset.direction = direction;
    gl.uniform2f(gl.getUniformLocation(program, "u_directions"),
      direction === "down" ? 0 : 1, direction === "diagonal" ? 0 : 1);
    const viewUniform = gl.getUniformLocation(program, "u_view");
    const originUniform = gl.getUniformLocation(program, "u_origin");
    const timeUniform = gl.getUniformLocation(program, "u_time");
    const waveUniform = gl.getUniformLocation(program, "u_waveOffset");
    const smallWaveUniform = gl.getUniformLocation(program, "u_smallWaveY");
    let width = 0;
    let height = 0;

    const draw = () => {
      if (contextUnavailable || gl.isContextLost()) return;
      // A small rendering window over a full-document field. Source coordinates
      // use document position, so scrolling never resets or duplicates the flow.
      // The canvas is position: fixed, so the browser pins it natively; this
      // only tells the shader which slice of the document it is showing.
      const fieldTop = field.getBoundingClientRect().top + scrollY;
      const origin = Math.max(0, Math.min(scrollY - fieldTop, field.clientHeight - height));
      gl.uniform2f(viewUniform, width, height);
      gl.uniform1f(originUniform, origin);
      gl.uniform1f(timeUniform, elapsed);
      // Advance continuously; the shader repeats fronts in document space.
      // Neither animation waits for the footer or jumps back to its start.
      const normalX = 0.5547002;
      const normalY = -0.8320503;
      const bandWidth = oceanScale * 0.55;
      const position = oceanScale * normalX + bandWidth * 0.15 - elapsed * 10;
      gl.uniform2f(waveUniform, normalX * position, normalY * position);
      const smallHeight = Math.min(220, Math.max(100, oceanScale * 0.20));
      const smallY = smallHeight * 0.8 + elapsed * 6;
      gl.uniform1f(smallWaveUniform, smallY);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      water.dataset.renderer = "webgl";
      lastPaint = elapsed;
    };

    const resize = () => {
      const nextWidth = field.clientWidth;
      const nextHeight = Math.max(1, Math.min(innerHeight, field.clientHeight));
      if (width !== nextWidth || height !== nextHeight) {
        width = nextWidth;
        height = nextHeight;
        // Two CSS pixels per simulated pixel, independent of device DPR.
        canvas.width = Math.ceil(width / 2);
        canvas.height = Math.ceil(height / 2);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
      draw();
    };
    const tick = (now: number) => {
      if (previousTime !== undefined) elapsed += (now - previousTime) / 1000;
      previousTime = now;
      if (elapsed - lastPaint >= 1 / 30) draw();
      frame = requestAnimationFrame(tick);
    };
    const resume = () => {
      cancelAnimationFrame(frame);
      previousTime = undefined;
      if (!contextUnavailable && !document.hidden && !reduced.matches && !gl.isContextLost()) frame = requestAnimationFrame(tick);
      else if (!contextUnavailable && !gl.isContextLost()) draw();
    };

    canvas.addEventListener("webglcontextlost", event => {
      event.preventDefault();
      contextUnavailable = true;
      cancelAnimationFrame(frame);
      delete water.dataset.renderer;
    });
    window.addEventListener("scroll", draw, { passive: true });
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", resume);
    reduced.addEventListener("change", resume);
    new ResizeObserver(resize).observe(field);
    resize();
    resume();
  } catch (error) {
    cancelAnimationFrame(frame);
    delete water.dataset.renderer;
    console.warn("Ocean animation unavailable; showing the still reference.", error);
  }
});
