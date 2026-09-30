"""
Utility script to crop outer square borders and apply anti-aliased rounded corners
with transparency to all raster favicon files in frontend/public.
"""

from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np

PUBLIC_DIR = Path(__file__).resolve().parent.parent / "frontend" / "public"


def round_image(filepath: Path, corner_radius_ratio: float = 0.22, crop_inset_ratio: float = 0.075):
    if not filepath.exists():
        print(f"File not found: {filepath}")
        return

    with Image.open(filepath) as img:
        img = img.convert("RGBA")
        w, h = img.size

        # Crop out square border padding around the inner rounded artwork
        if crop_inset_ratio > 0:
            left = int(w * crop_inset_ratio)
            top = int(h * (crop_inset_ratio * 0.9))
            right = int(w * (1.0 - crop_inset_ratio))
            bottom = int(h * (1.0 - crop_inset_ratio))
            img = img.crop((left, top, right, bottom))
            img = img.resize((w, h), Image.Resampling.LANCZOS)

        # Create 4x supersampled mask for ultra-smooth rounded corners
        scale = 4
        sw, sh = w * scale, h * scale
        mask = Image.new("L", (sw, sh), 0)
        draw = ImageDraw.Draw(mask)
        radius = int(sw * corner_radius_ratio)
        draw.rounded_rectangle([(0, 0), (sw, sh)], radius=radius, fill=255)
        mask = mask.resize((w, h), Image.Resampling.LANCZOS)

        # Combine alpha channel with anti-aliased mask
        r, g, b, a = img.split()
        a_arr = np.array(a, dtype=np.float32)
        m_arr = np.array(mask, dtype=np.float32) / 255.0
        final_a = Image.fromarray((a_arr * m_arr).astype(np.uint8), mode="L")
        img.putalpha(final_a)

        img.save(filepath, format="PNG")
        print(f"  ✅ Rounded: {filepath.name} ({w}x{h})")


def main():
    print("=" * 60)
    print("🎨 Processing and rounding raster favicons in frontend/public...")
    print("=" * 60)

    targets = [
        "favicon-96x96.png",
        "apple-touch-icon.png",
        "web-app-manifest-192x192.png",
        "web-app-manifest-512x512.png",
    ]

    for name in targets:
        round_image(PUBLIC_DIR / name)

    # Re-generate multi-resolution favicon.ico (16x16, 32x32, 48x48) with transparency
    master = Image.open(PUBLIC_DIR / "favicon-96x96.png")
    ico_path = PUBLIC_DIR / "favicon.ico"
    master.save(ico_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
    print(f"  ✅ Generated multi-size rounded: favicon.ico (16x16, 32x32, 48x48)")
    print("=" * 60)
    print("✨ All favicons successfully cropped and rounded with smooth transparent corners!")


if __name__ == "__main__":
    main()
