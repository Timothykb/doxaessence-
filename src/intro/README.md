# Doxa Essence — 25-second story

Preview: start the local Vite server, open http://127.0.0.1:5173/ and select WATCH THE BEGINNING. A first visit plays once per browser session. No paid services or external fonts/music are used.

## Story
0–1.5: single line, joined by flowing contours.
1.5–4.5: bottle weave and decelerating orbit.
4.5–6: cap lift, atomizer reveal.
6–9: hand approaches from lower left, grips/lifts, index presses.
9–11.5: spray; hand and bottle leave left while camera travels right.
11.5–14: depth/parallax journey through 240 ribbons (100 on mobile).
14–16: shared geometry resolves into two figures.
16–21: four conversation lines beside heads (above on mobile).
21–23.5: figure contours release right and converge on the real logo contours.
23.5–25: measured logo transition into the header and overlay disposal.

## Files
- config.js: palette, scene boundaries, dialogue, music and swappable logo source/crop.
- scene.js: Three.js world, shared ribbons, camera moves, depth-only hand occlusion.
- hand-paths.js: authored SVG palm/thumb/finger/cuff groups, approach/hold/press poses, independent index.
- people-paths.js: replaceable SVG path strings for the two figures.
- paths.js: bottle and figure geometry helpers.
- logo.js: traces ivory boundaries from the existing /brand/doxa-logo.png; no substitute wordmark.
- handover.js: projected intro bounds to measured header bounds, exact image swap.
- music.js: opt-in audio, a composed bright piano motif with rests, major/Lydian chord changes, reverb, quiet pump/spray cues.
- mount.js / intro.css: overlay lifecycle, captions, controls, focus/scroll restoration.
- index.html: data-intro-logo-target on the existing header brand link. No header restyle.

## Own assets
Place a licensed track at public/assets/music/intro.mp3, then rebuild. If absent, Web Audio synthesizes the bright fallback locally. Sound starts only when requested with Sound off/on, and remembered mute preferences are respected. The sound cues follow the common film clock.

Logo source and crop: INTRO.logo in config.js. Currently uses the existing PNG. A replacement rasterizable SVG or PNG can use that single source setting; set the crop to its artwork bounds. The actual header image is cloned for the final swap, so update its source too when rebranding.

## Checks
Local keyframe inspector: /.tools/intro-preview.html (not bundled). It shares the production renderer and handover code.
Frames: output/intro-story/ at 1440×900 and 390×844, including holding/pressing, macro, dialogue, logo gathering and header landing.
Skip/Escape remove the overlay immediately. Reduced motion avoids the overlay, WebGL and audio entirely. Keyboard navigation is not trapped. A 27-second watchdog handles loading/GPU stalls; the animation itself is capped at 25 seconds. Resize and replay are supported. All renderer resources, audio nodes, listeners and scroll/header overrides are disposed/restored.

The five-second conversation is intentionally brief to honor the requested 25-second cut; the longer questions have slightly more screen time than the short reply.

Latest grip follows the supplied spray-bottle reference: bent index above the pump, near-side thumb, three curled fingers on the opposite edge. The enlarged plume originates at the lateral atomizer outlet and follows it during departure.

Music revision: original 92 BPM cue in music-score.js, recurring piano melody, alternating stereo plucks, shorter room ambience, spray lift and quiet dialogue passage. The sound toggle remains opt-in.
