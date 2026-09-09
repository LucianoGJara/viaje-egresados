"""
Genera los íconos PWA (icons/icon-*.png) con un degradé índigo y las
iniciales "VE" (Viaje de Egresados). No es necesario correr esto de nuevo
salvo que quieras cambiar el diseño del ícono: los PNG ya quedan en icons/.
"""
import math
import os
from PIL import Image, ImageDraw, ImageFont

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "icons")
os.makedirs(OUT_DIR, exist_ok=True)

COLOR_START = (79, 70, 229)   # #4F46E5
COLOR_END = (124, 110, 246)   # #7C6EF6

SIZES = [72, 96, 128, 144, 152, 192, 384, 512]
MASKABLE_SIZES = [192, 512]


def make_gradient(size):
    img = Image.new("RGB", (size, size), COLOR_START)
    draw = ImageDraw.Draw(img)
    for y in range(size):
        t = y / size
        r = int(COLOR_START[0] + (COLOR_END[0] - COLOR_START[0]) * t)
        g = int(COLOR_START[1] + (COLOR_END[1] - COLOR_START[1]) * t)
        b = int(COLOR_START[2] + (COLOR_END[2] - COLOR_START[2]) * t)
        draw.line([(0, y), (size, y)], fill=(r, g, b))
    return img


def rounded_mask(size, radius_ratio=0.22):
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    radius = int(size * radius_ratio)
    d.rounded_rectangle([0, 0, size, size], radius=radius, fill=255)
    return mask


def get_font(size):
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def draw_icon(size, maskable=False):
    canvas_size = size
    img = make_gradient(canvas_size).convert("RGBA")

    draw = ImageDraw.Draw(img)

    # Brillo sutil arriba a la derecha
    glow = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse(
        [canvas_size * 0.55, -canvas_size * 0.25, canvas_size * 1.35, canvas_size * 0.55],
        fill=(255, 255, 255, 40),
    )
    img = Image.alpha_composite(img, glow)
    draw = ImageDraw.Draw(img)

    text = "VE"
    # Para maskable dejamos más margen de seguridad (zona segura ~80%)
    font_ratio = 0.34 if not maskable else 0.28
    font = get_font(int(canvas_size * font_ratio))
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    pos = ((canvas_size - tw) / 2 - bbox[0], (canvas_size - th) / 2 - bbox[1])
    draw.text(pos, text, font=font, fill=(255, 255, 255, 255))

    if not maskable:
        mask = rounded_mask(canvas_size)
        out = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
        out.paste(img, (0, 0), mask)
        img = out

    return img


def main():
    for size in SIZES:
        icon = draw_icon(size, maskable=False)
        icon.save(os.path.join(OUT_DIR, f"icon-{size}.png"))
        print(f"icon-{size}.png ok")

    for size in MASKABLE_SIZES:
        icon = draw_icon(size, maskable=True)
        icon.save(os.path.join(OUT_DIR, f"icon-{size}-maskable.png"))
        print(f"icon-{size}-maskable.png ok")


if __name__ == "__main__":
    main()
