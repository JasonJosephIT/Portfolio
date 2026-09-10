# Jason’s gallery style lock

Source: user-authorized docs/portfolio-design-brief.md, 2026-09-07. Explicit brief values govern generic specialist defaults. This is a gallery, not a sales landing page; no invented work, stock images, scroll storytelling, GSAP, full-screen replacement hero or typography imports.

## Direction contract
Thesis: quiet, image-led rooms with precise alignment and captions. First viewport: compact identity, Selected Works and real work when supplied; intentional empty message otherwise. System: existing static HTML/CSS/JS with native controls and one dependency-free generator. Risk: currently no public artwork; validate populated layouts with isolated labelled test fixtures only.
Reference board: .tastemaker/reference-board.md (brief-described inspiration, no screenshot/live site available or viewed). Mode Experience; variance3, motion1, density3, art direction7. No global taste profile found or promoted.

## Palette and contrast
Art canvas #000000; Tech #0a0a0b preserved; surface #141416; text #f2f2f0; muted #a5a5a0; Art accent #ff7a4d; Tech accent #4dc3ff. All new tokens scoped under gallery page classes; do not modify Home/admin through globals.
Measured using tastemaker check_contrast.py: text/black18.73, text/surface16.41, muted/black8.49, muted/surface7.44, Art accent/black8.14, accent/surface7.13, Tech accent/black10.57, accent/surface9.26. All clear4.5 text floor. Neutral outlined controls; white focus outline on dark backdrops. Light text on accent fills is forbidden (2.30 Art,1.77 Tech); use black on any accent fill. Hairlines decorative only. Full matrix in .superpowers/sdd/contrast.txt. Dark single mode; no theme switch.

## Typography
System sans stack inherited from --font. Title clamp(2.5rem,5vw,4.5rem),600,1.08. Section clamp(1.75rem,3vw,2.5rem),500–600. Cards18–20px; body16–18px/1.5–1.65; metadata>=14px. 65ch reading measure. Natural wrapping, balance headings, pretty concise captions, overflow-wrap:anywhere for long tokens. No artificial truncation or invented biographies.

## Structure and spacing
Art: editorial gallery with identity rail, Selected Works → Projects → Explore by Style → About Me → Contact. Rail links Projects/Styles/Home/About Me/Contact, separate Tech. >=1100 rail200px, gap48px, outer48px; gallery max1400px. Compact wrapping top identity below1100. Art two columns>=700 and one below; square uncropped art. No sticky rail when too short to show links.
Tech: compact global nav, Tech intro, Starred Projects/Projects anchors, curated two columns and project3>=1100/2>=700/1 below700. Max1200px; gutters20/32/48; gaps24/32/40; section gaps64/80/112. Project preview frame4:3; Art contain, Tech focal point supported; full views uncropped. Quiet back-to-top footer. Single cards retain normal grid width.
No card fill/border/shadow by default; image-only surface; square Art,8px Tech. Control minimum44px with distinct borders/zone. Card captions beneath image. Selected curation up to4 with enhancement expansion, all entries readable without JS.

## Assets and motion
Preserve assets/wave-pattern.svg. Bard mark is assets/bard-mark.png at 36x36 beside JASON with empty alt, intrinsic attributes matching the rendered size (updated 2026-09-10: this replaced assets/bard.svg, which Jason removed — it cost 1,000,965 bytes per page to draw a 36px figure; recoverable from git history). Wave552x304 repeating behind Art only, white at4%, no overlay onto media. Tile joins checked 2026-09-10: the supplied artwork is NOT seamless (faint horizontal seams and specks visible when boosted to 50%), but invisible at the locked 4% on near-black — do not tune the opacity to compensate. No cultural provenance claims. Home hero untouched. No external photographs or illustrations.
Art preview image filter grayscale(1), hover-capable card hover and keyboard focus restore grayscale(0), 240ms ease. Show original colors button toggles aria-pressed. Touch first tap navigates; details always source color. Reduced motion immediate. No lifting, scaling, parallax, scroll snapping or reveal delays.

## Memory
User-selected rules stored from brief; final implementation judgment pending visual review. .tastemaker/decisions.log records the result without claiming user approval. Personal profile unchanged.
