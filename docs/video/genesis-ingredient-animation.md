# Genesis ingredient animation

The demo at `/genesis-demo/` uses the user's original bottle photograph (`public/images/genesis-original-reference.png`) in two CSS-clipped layers. The cap lifts away and returns while the bottle floats. Horizontal dragging tilts the layered composition, limited to 18 degrees.

Photorealistic botanical imagery is generated separately using the built-in image generation tool; the original bottle and its lettering are never regenerated. The transparent sprite atlas is `public/images/genesis-ingredients-atlas.png`.

Atlas prompt: "A photorealistic transparent PNG sprite atlas, exactly a 3 by 3 grid of isolated ingredients with equal cells and transparent padding: bergamot half, pink peppercorn cluster, green cardamom pods; cashmere-like wood, pale lavender iris, frankincense resin; sandalwood chips, translucent amber resin, vanilla pods and blossom. Warm studio lighting, detailed natural materials, no background, no text, no perfume bottle."

LIGHT displays bergamot and pink pepper. EARTH displays cardamom, wood, iris and frankincense. LIFE displays sandalwood, amber and vanilla. Wood and amber imagery visualize fragrance accords. Iso E Super remains in the supplied note list and is not represented as a botanical ingredient.

This is a photo-based 2.5D web composition, not a physically rendered 360-degree bottle or an AI-generated video. Real video generation was blocked by the selected Runway account's Free plan. Animation pauses via the button and respects reduced-motion preferences.

## Silver spray and cap revision

The user supplied a silver atomizer and a straight cylindrical silver cap as hardware references. These replace the previous gold cap layer. `public/images/genesis-silver-hardware.png` is a two-cell transparent atlas made with the built-in image generation tool from those two references. The left cell contains the exposed atomizer (button and collar); the right contains the removable cap, upright. The cap moves away to reveal the atomizer, which stays attached to the bottle. The bottle body and label still use the user's original photograph.

Hardware prompt: "Two isolated upright chrome perfume components in two equally sized side-by-side square cells, true transparent background. Left: reference atomizer's front-facing spray button and chrome collar, omit internal plastic pump and tube. Right: the tall plain straight cylindrical chrome cap from the second reference, upright, omit the separate ring. Preserve chrome silver, cylindrical proportions and vertical black/white reflections; no gold, no rounded dome, no decoration; generous transparent padding; no bottle, no text."

The generated hardware follows the references visually; it is not a dimensionally verified CAD model or an exact product photograph extraction.

## Plain silver finish

Follow-up edit via built-in imagegen removes the dark vertical reflections from both hardware components while preserving their canvas layout, silhouette, alpha and circular spray opening. Edit prompt: "Remove all black and dark vertical stripes and reflections from the atomizer and cylindrical cap; replace with clean light silver metal, soft white and pale gray reflections. Preserve exact positions, dimensions, transparent padding, silhouettes and the spray opening. No gold or new objects."

The live asset is `public/images/genesis-silver-hardware-clean.png`. The cap is compressed vertically to 78% around its lower edge to match the user's shorter-cap request.

## Product-specific reveal and neck finish

The latest sequence uses a synchronized 12-second cycle: closed bottle, cap lift, fragrance-note reveal, and reassembly. Each selected fragrance chapter retains its own ingredient recipe. The original glass neck protrusions are clipped; a silver transition ring bridges the trimmed glass to the chrome spray assembly. Glass, transition ring and atomizer move as one unit. The cap stays short and chrome silver with the reference's dark reflections. Motion and ingredient reveals pause together.

## Light-particle introduction

The user-supplied `doxa-hero-3d.html` is a visual reference only. The demo now begins with a 6.5-second canvas sequence of 1,350 warm light particles outlining the product. Particles expand into three elliptical fragrance bands with light rings, return to the bottle silhouette, then crossfade into the existing photo-based bottle animation. The existing product cycle starts after the intro. Skip and replay controls are available; the pause button pauses both timelines. Reduced-motion users bypass the light intro.

## Full-screen opening revision

The light sequence now fills the entire viewport as a dedicated overlay for 10 seconds, then fades into the existing product scene. The original reference's LIGHT, EARTH and LIFE headings and English note descriptions are reproduced verbatim, together with “The Genesis” and “Be part of the beginning”. Ring bands extend across the screen. Skip, replay, pause and reduced-motion support remain available. Visual verification confirmed the full-screen ring phase and all three note blocks.

## Integrated website demo

`/website-demo/` combines the Genesis scroll experience with the existing homepage in one document. A shadow root isolates the animation styling. The closed-bottle ending scrolls naturally into the existing newsletter, about section and footer. The original homepage remains at `/`; the standalone animation remains at `/genesis-demo/`. Both demos reuse `genesis-demo/mount.js`. The integrated demo intercepts newsletter submission so preview interactions do not create registrations.
