from pathlib import Path
import json
from PIL import Image

root = Path(__file__).resolve().parent.parent / 'output' / 'intro-v2'
paths = sorted(root.glob('frame-*.png'), key=lambda path: int(path.stem.split('-')[1]))
times = json.loads((root / 'timings.json').read_text())
frames = []
indices = list(range(0, len(paths), 2))
for index in indices:
    path = paths[index]
    image = Image.open(path).convert('RGB')
    image.thumbnail((640, 465))
    frames.append(image.quantize(colors=128))
durations = [max(20, times[indices[i + 1]] - times[indices[i]]) for i in range(len(indices) - 1)] + [1000]
frames[0].save(root / 'intro.gif', save_all=True, append_images=frames[1:], duration=durations, loop=0)
