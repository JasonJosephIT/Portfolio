// Shared camera state for the bay backdrop. backdrop.js runs the spring; home-scene.js steers it on Home.
export const bay = {
  pos: 0, // -1 left coast .. 0 open sea .. 1 right coast
  vel: 0, // spring velocity: a half-finished move keeps its momentum if retargeted
  target: 0,
  k: 28, // spring stiffness (speed squared)
  busy: false, // a sweep or a committed pan: no idle sway
  mode: "home", // "home" sways around the middle, "rest" sways back from a coast
  ready: false,
};
