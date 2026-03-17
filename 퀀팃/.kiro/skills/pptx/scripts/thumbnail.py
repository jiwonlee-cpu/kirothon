"""Create thumbnail grids from PowerPoint presentation slides.

Creates a grid layout of slide thumbnails for quick visual analysis.
Labels each thumbnail with its XML filename (e.g., slide1.xml).

Usage:
    python thumbnail.py input.pptx [output_prefix] [--cols N]

Examples:
    python thumbnail.py presentation.pptx
    # Creates: thumbnails.jpg

    python thumbnail.py template.pptx grid --cols 4
    # Creates: grid.jpg
"""

import argparse
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

import defusedxml.minidom

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("Error: Pillow is required. Install with: pip install Pillow", file=sys.stderr)
    sys.exit(1)

THUMBNAIL_WIDTH = 300
CONVERSION_DPI = 100
MAX_COLS = 6
DEFAULT_COLS = 3
JPEG_QUALITY = 95
GRID_PADDING = 20
BORDER_WIDTH = 2
FONT_SIZE_RATIO = 0.10
LABEL_PADDING_RATIO = 0.4


def get_slide_info(pptx_path: Path) -> list[dict]:
    with zipfile.ZipFile(pptx_path, "r") as zf:
        rels_content = zf.read("ppt/_rels/presentation.xml.rels").decode("utf-8")
        rels_dom = defusedxml.minidom.parseString(rels_content)

        rid_to_slide = {}
        for rel in rels_dom.getElementsByTagName("Relationship"):
            rid = rel.getAttribute("Id")
            target = rel.getAttribute("Target")
            rel_type = rel.getAttribute("Type")
            if "slide" in rel_type and target.startswith("slides/"):
                rid_to_slide[rid] = target.replace("slides/", "")

        pres_content = zf.read("ppt/presentation.xml").decode("utf-8")
        pres_dom = defusedxml.minidom.parseString(pres_content)

        slides = []
        for sld_id in pres_dom.getElementsByTagName("p:sldId"):
            rid = sld_id.getAttribute("r:id")
            if rid in rid_to_slide:
                hidden = sld_id.getAttribute("show") == "0"
                slides.append({"name": rid_to_slide[rid], "hidden": hidden})

        return slides


def convert_to_images(pptx_path: Path, output_dir: Path) -> list[Path]:
    """Convert PPTX to images using LibreOffice."""
    try:
        result = subprocess.run(
            ["soffice", "--headless", "--convert-to", "png", "--outdir", str(output_dir), str(pptx_path)],
            capture_output=True, text=True, timeout=60
        )
        if result.returncode != 0:
            print(f"Warning: LibreOffice conversion failed: {result.stderr}", file=sys.stderr)
            return []
        return sorted(output_dir.glob("*.png"))
    except (subprocess.TimeoutExpired, FileNotFoundError):
        print("Warning: LibreOffice (soffice) not found. Install it for thumbnail generation.", file=sys.stderr)
        return []


def create_placeholder(size: tuple[int, int]) -> Image.Image:
    img = Image.new("RGB", size, color=(200, 200, 200))
    draw = ImageDraw.Draw(img)
    draw.text((size[0] // 2, size[1] // 2), "[hidden]", fill=(100, 100, 100), anchor="mm")
    return img


def create_grid(slides: list[tuple], cols: int, thumb_width: int, output_path: Path) -> None:
    if not slides:
        return

    # 썸네일 크기 계산
    sample_img = Image.open(slides[0][0]) if slides[0][0] else None
    if sample_img:
        aspect = sample_img.height / sample_img.width
        thumb_height = int(thumb_width * aspect)
    else:
        thumb_height = int(thumb_width * 9 / 16)

    font_size = max(12, int(thumb_width * FONT_SIZE_RATIO))
    label_height = int(font_size * (1 + LABEL_PADDING_RATIO))

    rows = (len(slides) + cols - 1) // cols
    grid_w = cols * thumb_width + (cols + 1) * GRID_PADDING
    grid_h = rows * (thumb_height + label_height) + (rows + 1) * GRID_PADDING

    grid = Image.new("RGB", (grid_w, grid_h), color=(240, 240, 240))
    draw = ImageDraw.Draw(grid)

    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
    except Exception:
        font = ImageFont.load_default()

    for idx, (img_path, label) in enumerate(slides):
        row, col = divmod(idx, cols)
        x = GRID_PADDING + col * (thumb_width + GRID_PADDING)
        y = GRID_PADDING + row * (thumb_height + label_height + GRID_PADDING)

        if img_path and img_path.exists():
            img = Image.open(img_path).resize((thumb_width, thumb_height), Image.LANCZOS)
        else:
            img = create_placeholder((thumb_width, thumb_height))

        grid.paste(img, (x, y))
        draw.rectangle([x, y, x + thumb_width, y + thumb_height], outline=(100, 100, 100), width=BORDER_WIDTH)
        draw.text((x + thumb_width // 2, y + thumb_height + label_height // 2), label, fill=(50, 50, 50), anchor="mm", font=font)

    grid.save(output_path, "JPEG", quality=JPEG_QUALITY)


def main():
    parser = argparse.ArgumentParser(description="Create thumbnail grids from PowerPoint slides.")
    parser.add_argument("input", help="Input PowerPoint file (.pptx)")
    parser.add_argument("output_prefix", nargs="?", default="thumbnails", help="Output prefix (default: thumbnails)")
    parser.add_argument("--cols", type=int, default=DEFAULT_COLS, help=f"Number of columns (default: {DEFAULT_COLS})")
    args = parser.parse_args()

    cols = min(args.cols, MAX_COLS)
    input_path = Path(args.input)

    if not input_path.exists() or input_path.suffix.lower() != ".pptx":
        print(f"Error: Invalid PowerPoint file: {args.input}", file=sys.stderr)
        sys.exit(1)

    output_path = Path(f"{args.output_prefix}.jpg")

    slide_info = get_slide_info(input_path)

    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        visible_images = convert_to_images(input_path, temp_path)

        slides = []
        visible_idx = 0
        for info in slide_info:
            if info["hidden"]:
                slides.append((None, info["name"]))
            else:
                img = visible_images[visible_idx] if visible_idx < len(visible_images) else None
                slides.append((img, info["name"]))
                visible_idx += 1

        if not slides:
            print("Error: No slides found", file=sys.stderr)
            sys.exit(1)

        create_grid(slides, cols, THUMBNAIL_WIDTH, output_path)

    print(f"Created: {output_path}")


if __name__ == "__main__":
    main()
