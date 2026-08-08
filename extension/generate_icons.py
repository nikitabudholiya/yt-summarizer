"""
Run this once to generate the extension icons:
  pip install cairosvg
  python generate_icons.py
"""
import os

SVG_TEMPLATE = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {s} {s}">
  <rect width="{s}" height="{s}" rx="{r}" fill="#ff0000"/>
  <polygon points="{pts}" fill="white"/>
</svg>"""

def play_triangle(s):
    cx, cy = s / 2, s / 2
    h = s * 0.40
    w = s * 0.34
    x1, y1 = cx - w * 0.4, cy - h / 2
    x2, y2 = cx - w * 0.4, cy + h / 2
    x3, y3 = cx + w * 0.6, cy
    return f"{x1},{y1} {x2},{y2} {x3},{y3}"

try:
    import cairosvg

    for size in [16, 48, 128]:
        svg = SVG_TEMPLATE.format(
            s=size, r=size * 0.18, pts=play_triangle(size)
        )
        cairosvg.svg2png(
            bytestring=svg.encode(),
            write_to=f"icons/icon{size}.png",
            output_width=size,
            output_height=size,
        )
        print(f"✓ icons/icon{size}.png")
    print("Done!")
except ImportError:
    print("cairosvg not installed. Saving SVG fallbacks instead.")
    for size in [16, 48, 128]:
        svg = SVG_TEMPLATE.format(
            s=size, r=size * 0.18, pts=play_triangle(size)
        )
        with open(f"icons/icon{size}.svg", "w") as f:
            f.write(svg)
        print(f"✓ icons/icon{size}.svg  (rename to .png or use cairosvg)")
