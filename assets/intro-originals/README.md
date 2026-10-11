# Opening photographs

Generated with the built-in ImageGen tool using the existing product image and video frames as visual references. These are AI-generated illustrations of manufacturing, not documentary photographs of the actual premises.

All four original PNG files are 1672 × 941 pixels. Website exports in `public/intro` are 960 × 540, 1920 × 1080 and 3840 × 2160 WebP. The 4K files are upscaled exports, not native 4K generations. Run `node scripts/prepare-intro-images.mjs` to recreate them without changing the originals.

## Prompt set

Common prompt: “Use case: photorealistic-natural. Asset type: full-screen opening animation photograph for Russian tent and insulated curtain manufacturer Хочу Тент. Generate ONE single cinematic documentary photograph, horizontal 16:9, 3840x2160 pixels (4K). Natural real factory lighting, physical material texture, subtle warm highlights and neutral industrial shadows. Photography not CGI, no text, no typography, no watermark, no montage, no collage. Reference images show the actual product or actual workshop frames; use them as technical and visual references, not as a literal edit.”

- `curtains.png`: “Subject: large heavy insulated dark navy Oxford curtains with thick quilted horizontal sections and metal eyelets hanging from steel tracks inside a working warehouse doorway; one curtain pulled slightly aside. Match the curtain construction of the reference. Wide documentary factory composition, tangible fabric folds and stitched edges, low camera at human eye level. Hero-scale image.” Reference: `hero-tents-curtains.png`.
- `tarp.png`: “Subject: freshly fabricated olive canvas and brown PVC tarpaulins with reinforced folded hems and neat large silver eyelets on a long wooden cutting table in a genuine tent sewing workshop. A broad expanse of olive fabric fills foreground, finished rolled tarps and functional industrial workstations behind. Realistic dense woven fabric and subtle PVC sheen. Wide cinematic composition, no staged catalog studio.” Reference: `hero-tents-curtains.png`.
- `welding.png`: “Subject: macro documentary close-up of a real green automatic hot-air PVC seam welding machine with black handle, red roller and metal heating nozzle working along overlapping grey PVC fabric on a wooden production table, based on the real video frame. Technically credible equipment, NO arc welder, NO fire, NO sparks: this is hot air welding of flexible tent cloth. Detail on roller and fused seam, workshop context softly out of focus.” Reference: `public/process/03-weld.webp`.
- `sewing.png`: “Subject: close-up of a real industrial walking-foot sewing machine needle and presser foot stitching a reinforced folded edge of thick olive-grey Oxford curtain fabric. A craftsperson's natural hands guide fabric safely to either side of needle. Based on real supplied sewing video frame. Clear sturdy woven texture, parallel seam, metallic machine bed, warm authentic factory light, coherent anatomy, machinery realistic.” Reference: `public/process/04-sew.webp`.

## Motion

The opening adapts Codrops Rapid Image Layers Animation to React and the Web Animations API. Four full-screen panels rise with a 220 ms stagger; their images counter-translate to stay visually stationary. Once the last panel fills the screen, earlier layers are hidden and the last panel rises away to reveal the hero. The hero headline starts at that reveal point.

The intro runs once per page load, including an explicit refresh. Returning to the home route during the same document session, following an anchor, or requesting reduced motion skips it. Slow image decoding has a 2-second deadline, and the overlay has both JavaScript and CSS release fallbacks. The visible skip control, Escape and Tab release the page immediately.

Source: https://github.com/codrops/RapidLayersAnimation
License: `public/licenses/codrops-rapid-layers.txt`.
