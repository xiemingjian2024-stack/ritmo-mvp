from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "interaction-demo-v1" / "evidence-v11"

PAIRS = [
    (ROOT / "output/core-hifi-v1/active-set.png", OUT / "training-active.png", "compare-training.png"),
    (ROOT / "output/scheme-home-v2/state-a.png", OUT / "scheme-home.png", "compare-scheme.png"),
    (ROOT / "output/core-hifi-v1/records-home.png", OUT / "records-today.png", "compare-records.png"),
]

for source_path, implementation_path, filename in PAIRS:
    source = Image.open(source_path).convert("RGB").resize((393, 852), Image.Resampling.LANCZOS)
    implementation = Image.open(implementation_path).convert("RGB").resize((393, 852), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (810, 892), "#f1f1ed")
    canvas.paste(source, (8, 32))
    canvas.paste(implementation, (409, 32))
    draw = ImageDraw.Draw(canvas)
    draw.text((12, 9), "SOURCE BASELINE", fill="#111111")
    draw.text((413, 9), "V1.1 IMPLEMENTATION", fill="#111111")
    canvas.save(OUT / filename, quality=94)
