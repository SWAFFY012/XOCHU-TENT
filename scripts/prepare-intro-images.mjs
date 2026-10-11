import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
await mkdir(`${root}public/intro`, { recursive: true });

// Keep generated originals separately. 4K exports are upscaled, not native 4K.
const processNames = ["01-material", "02-cut", "03-weld", "04-sew", "05-grommets", "06-ready"];
for (const name of ["curtains", "tarp", "welding", "sewing", ...processNames, "video-start"]) {
  const source = `${root}assets/${processNames.includes(name) ? "process-restored" : "intro-originals"}/${name}.png`;
  for (const width of [960, 1920, 3840]) {
    const result = await sharp(source)
      .resize(width, (width * 9) / 16, { fit: "cover", kernel: "lanczos3" })
      .webp({ quality: width === 3840 ? 90 : 82, effort: 6 })
      .toFile(`${root}public/intro/${name}-${width}.webp`);
    console.log(`${name}-${width}.webp: ${result.width}×${result.height}, ${Math.round(result.size / 1024)} KB`);
  }
  if (processNames.includes(name)) {
    await sharp(source).resize(3840, 2160, { fit: "cover", kernel: "lanczos3" }).webp({ quality: 90, effort: 6 }).toFile(`${root}public/process/${name}-4k.webp`);
  }
}
