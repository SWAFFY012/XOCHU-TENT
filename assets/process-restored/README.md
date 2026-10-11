# Workshop image restoration

Six image-to-image restorations of the unchanged sources in `public/process/`.
The prompt preserves framing, camera angle, object placement, colour and lighting,
while removing video compression and recovering textile/metal detail.
Generated PNGs are 1672 × 941; the 3840 × 2160 WebP exports are upscaled with
Lanczos3 by `scripts/prepare-intro-images.mjs`, not native 4K captures.
AI restoration can reconstruct fine details; it is not a pixel-exact recovery.

The restored photos are used both in the six existing process panels and as
six additional rapid intro layers. Original video extracts remain available.

`assets/intro-originals/video-start.png` is a real frame at 0.60 s of
`public/hero.mp4`. The first 0.12 s are black and the opening fades in;
0.60 s retains the opening camera position with visible fabric. Hero playback
starts from this same timestamp after the final still fades away.
