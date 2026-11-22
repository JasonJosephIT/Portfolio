# Two-axis project explorer studies

Standalone interactive studies in `public/explore-demo/`, on branch `redesign/astro-tech`.

- A: `/explore-demo/?view=panels` — a large active panel with visible neighboring projects.
- B: `/explore-demo/?view=rail` — a persistent project shelf and a wider active panel.

Both share three illustrative project stories: Open Thoughts, Know Your Vote, and Portfolio. Each contains Overview, Features, Try it, and Decisions sections. Content and visuals are prototype material, not a live Open Thoughts export. The interactive samples are deliberately small working examples, not the complete products.

Horizontal trackpad movement, touch swipes, previous/next controls, keyboard left/right arrows, and clicking a neighboring panel switch projects. B also offers project shelf buttons. Vertical wheel or touch scrolling explores the current project independently. Returning restores its vertical position. Footer section controls jump within the active project. Interactive samples open in a native dialog and close with Escape or Close. Reduced motion uses immediate transitions.

Preview without requiring a valid production bundle:

```sh
python3 -m http.server 4332 --bind 127.0.0.1 --directory public
```

Open `http://127.0.0.1:4332/explore-demo/?view=panels` and switch concepts in the header. Astro also serves these files from `public/` when its regular build has a valid bundle.

Verified in headless Chromium at 1440 × 940 and mobile touch emulation at 390 × 844: independent vertical scroll, horizontal wheel switching, exact saved/restored scroll positions, keyboard switching, touch swipe switching, section jumps, opening and interacting with a sample, closing it using Escape, no document width overflow, and no desktop JavaScript errors. Native vertical touch scrolling was also exercised. This is not a real-device Safari test.

Reference: Aparelho Studio's project shelf, combined with independent vertical reading panels. No reference assets were copied.
