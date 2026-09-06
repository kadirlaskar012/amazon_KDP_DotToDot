"""
samples.py
Generates clean, high-resolution line-art sample illustrations for instant testing:
1. Dinosaur (Baby T-Rex / Bronto)
2. Space Rocket
3. Cartoon Cat
4. Teddy Bear
5. Cartoon Car
6. Sunflower
"""

import os
import math
import numpy as np
import cv2
from PIL import Image, ImageDraw


SAMPLES_DIR = os.path.join(os.path.dirname(__file__), "samples")


def generate_dinosaur(size=700) -> Image.Image:
    img = Image.new("RGB", (size, size), (255, 255, 255))
    draw = ImageDraw.Draw(img)
    stroke = 6

    # Dinosaur body points (brontosaurus / cute baby dino)
    body_pts = [
        (150, 480), # Front foot
        (150, 420),
        (220, 430),
        (230, 320), # Chest
        (240, 200), # Neck front
        (230, 150), # Chin
        (200, 130), # Snout
        (210, 100), # Top of head
        (270, 90),
        (300, 120), # Back of head
        (310, 220), # Back of neck
        (380, 280), # Back
        (480, 320), # Hip
        (600, 340), # Tail tip
        (560, 390),
        (450, 420), # Tail base
        (440, 480), # Back foot
        (380, 480),
        (370, 420), # Belly
        (260, 430),
        (250, 480),
        (190, 480),
    ]
    draw.line(body_pts + [body_pts[0]], fill=(0, 0, 0), width=stroke, joint="curve")

    # Eye
    draw.ellipse([240, 110, 255, 125], fill=(0, 0, 0))
    # Smile
    draw.arc([205, 125, 235, 145], start=0, end=180, fill=(0, 0, 0), width=stroke - 2)

    # Back plates / spikes
    spikes = [
        [(330, 240), (345, 215), (360, 250)],
        [(370, 260), (390, 235), (410, 275)],
        [(420, 285), (445, 260), (465, 305)],
        [(475, 310), (495, 290), (515, 325)],
    ]
    for sp in spikes:
        draw.line(sp, fill=(0, 0, 0), width=stroke, joint="curve")

    return img


def generate_rocket(size=700) -> Image.Image:
    img = Image.new("RGB", (size, size), (255, 255, 255))
    draw = ImageDraw.Draw(img)
    stroke = 6

    # Main rocket fuselage
    hull_pts = [
        (350, 80),   # Nose cone tip
        (430, 220),  # Right shoulder
        (440, 430),  # Right side
        (390, 470),  # Right nozzle
        (310, 470),  # Left nozzle
        (260, 430),  # Left side
        (270, 220),  # Left shoulder
        (350, 80)
    ]
    draw.line(hull_pts, fill=(0, 0, 0), width=stroke, joint="curve")

    # Nose cone divider arc
    draw.arc([275, 170, 425, 230], start=0, end=180, fill=(0, 0, 0), width=stroke)

    # Porthole window
    draw.ellipse([315, 265, 385, 335], outline=(0, 0, 0), width=stroke)
    draw.ellipse([335, 285, 365, 315], outline=(0, 0, 0), width=stroke - 2)

    # Left Fin
    left_fin = [(260, 360), (170, 460), (180, 500), (270, 450)]
    draw.line(left_fin + [(260, 360)], fill=(0, 0, 0), width=stroke, joint="curve")

    # Right Fin
    right_fin = [(440, 360), (530, 460), (520, 500), (430, 450)]
    draw.line(right_fin + [(440, 360)], fill=(0, 0, 0), width=stroke, joint="curve")

    # Exhaust flames
    flames = [
        (320, 470),
        (330, 560),
        (350, 510),
        (370, 570),
        (380, 470)
    ]
    draw.line(flames, fill=(0, 0, 0), width=stroke, joint="curve")

    return img


def generate_cat(size=700) -> Image.Image:
    img = Image.new("RGB", (size, size), (255, 255, 255))
    draw = ImageDraw.Draw(img)
    stroke = 6

    # Head and ears outline
    cat_outline = [
        (220, 220),
        (170, 110), # Left ear tip
        (280, 160),
        (350, 150), # Top head
        (420, 160),
        (530, 110), # Right ear tip
        (480, 220),
        (530, 310), # Right cheek
        (500, 420),
        (420, 470), # Chin
        (280, 470),
        (200, 420),
        (170, 310), # Left cheek
    ]
    draw.line(cat_outline + [cat_outline[0]], fill=(0, 0, 0), width=stroke, joint="curve")

    # Inner ears
    draw.line([(220, 200), (190, 140), (260, 175)], fill=(0, 0, 0), width=stroke - 2)
    draw.line([(480, 200), (510, 140), (440, 175)], fill=(0, 0, 0), width=stroke - 2)

    # Eyes
    draw.ellipse([240, 260, 290, 310], fill=(0, 0, 0))
    draw.ellipse([410, 260, 460, 310], fill=(0, 0, 0))

    # Nose
    draw.polygon([(340, 340), (360, 340), (350, 355)], fill=(0, 0, 0))

    # Mouth
    draw.arc([315, 345, 350, 375], start=0, end=180, fill=(0, 0, 0), width=stroke - 2)
    draw.arc([350, 345, 385, 375], start=0, end=180, fill=(0, 0, 0), width=stroke - 2)

    # Whiskers
    draw.line([(140, 320), (230, 335)], fill=(0, 0, 0), width=stroke - 2)
    draw.line([(130, 360), (225, 365)], fill=(0, 0, 0), width=stroke - 2)
    draw.line([(560, 320), (470, 335)], fill=(0, 0, 0), width=stroke - 2)
    draw.line([(570, 360), (475, 365)], fill=(0, 0, 0), width=stroke - 2)

    return img


def generate_teddy_bear(size=700) -> Image.Image:
    img = Image.new("RGB", (size, size), (255, 255, 255))
    draw = ImageDraw.Draw(img)
    stroke = 6

    # Ears
    draw.ellipse([180, 90, 270, 180], outline=(0, 0, 0), width=stroke)
    draw.ellipse([430, 90, 520, 180], outline=(0, 0, 0), width=stroke)

    # Head
    draw.ellipse([210, 120, 490, 370], outline=(0, 0, 0), width=stroke)

    # Snout
    draw.ellipse([300, 240, 400, 320], outline=(0, 0, 0), width=stroke - 1)
    draw.ellipse([335, 255, 365, 280], fill=(0, 0, 0)) # Nose
    draw.line([(350, 280), (350, 305)], fill=(0, 0, 0), width=stroke - 2)

    # Eyes
    draw.ellipse([270, 205, 295, 230], fill=(0, 0, 0))
    draw.ellipse([405, 205, 430, 230], fill=(0, 0, 0))

    # Body
    draw.ellipse([220, 340, 480, 580], outline=(0, 0, 0), width=stroke)

    # Arms / Paws
    draw.ellipse([140, 360, 230, 460], outline=(0, 0, 0), width=stroke)
    draw.ellipse([470, 360, 560, 460], outline=(0, 0, 0), width=stroke)

    # Feet
    draw.ellipse([190, 520, 290, 610], outline=(0, 0, 0), width=stroke)
    draw.ellipse([410, 520, 510, 610], outline=(0, 0, 0), width=stroke)

    return img


def generate_car(size=700) -> Image.Image:
    img = Image.new("RGB", (size, size), (255, 255, 255))
    draw = ImageDraw.Draw(img)
    stroke = 6

    # Car body silhouette
    body = [
        (100, 420),
        (120, 360),
        (190, 340), # Front hood
        (260, 220), # Windshield
        (420, 220), # Roof
        (510, 310), # Rear window
        (580, 340), # Trunk
        (600, 420), # Rear bumper
        (540, 420),
        # Rear wheel well
        (530, 390), (460, 390), (450, 420),
        (260, 420),
        # Front wheel well
        (250, 390), (180, 390), (170, 420),
        (100, 420)
    ]
    draw.line(body, fill=(0, 0, 0), width=stroke, joint="curve")

    # Windows
    draw.polygon([(275, 235), (345, 235), (345, 330), (215, 330)], outline=(0, 0, 0), width=stroke - 2)
    draw.polygon([(360, 235), (415, 235), (490, 330), (360, 330)], outline=(0, 0, 0), width=stroke - 2)

    # Wheels
    draw.ellipse([180, 370, 240, 430], fill=(0, 0, 0))
    draw.ellipse([195, 385, 225, 415], fill=(255, 255, 255))
    draw.ellipse([460, 370, 520, 430], fill=(0, 0, 0))
    draw.ellipse([475, 385, 505, 415], fill=(255, 255, 255))

    # Headlight
    draw.ellipse([110, 365, 135, 395], outline=(0, 0, 0), width=stroke - 2)

    return img


def generate_flower(size=700) -> Image.Image:
    img = Image.new("RGB", (size, size), (255, 255, 255))
    draw = ImageDraw.Draw(img)
    stroke = 6

    # Stem
    draw.line([(350, 370), (345, 500), (355, 620)], fill=(0, 0, 0), width=stroke + 2)

    # Leaves
    leaf_left = [(345, 470), (260, 450), (230, 420), (270, 420), (345, 450)]
    draw.line(leaf_left, fill=(0, 0, 0), width=stroke, joint="curve")
    leaf_right = [(350, 520), (430, 500), (470, 460), (430, 470), (350, 500)]
    draw.line(leaf_right, fill=(0, 0, 0), width=stroke, joint="curve")

    # Petals around center (350, 250)
    cx, cy = 350, 250
    center_r = 65
    petal_len = 110
    num_petals = 12

    for i in range(num_petals):
        ang = i * (2 * math.pi / num_petals)
        px1 = cx + center_r * math.cos(ang - 0.2)
        py1 = cy + center_r * math.sin(ang - 0.2)
        tip_x = cx + (center_r + petal_len) * math.cos(ang)
        tip_y = cy + (center_r + petal_len) * math.sin(ang)
        px2 = cx + center_r * math.cos(ang + 0.2)
        py2 = cy + center_r * math.sin(ang + 0.2)
        draw.line([(px1, py1), (tip_x, tip_y), (px2, py2)], fill=(0, 0, 0), width=stroke, joint="curve")

    # Flower center
    draw.ellipse([cx - center_r, cy - center_r, cx + center_r, cy + center_r], fill=(255, 255, 255), outline=(0, 0, 0), width=stroke)

    # Face in flower center
    draw.ellipse([cx - 30, cy - 20, cx - 15, cy - 5], fill=(0, 0, 0))
    draw.ellipse([cx + 15, cy - 20, cx + 30, cy - 5], fill=(0, 0, 0))
    draw.arc([cx - 25, cy - 5, cx + 25, cy + 25], start=0, end=180, fill=(0, 0, 0), width=stroke - 2)

    return img


def create_all_samples():
    os.makedirs(SAMPLES_DIR, exist_ok=True)
    generators = {
        "dinosaur": ("Cute Dinosaur", generate_dinosaur),
        "rocket": ("Space Rocket", generate_rocket),
        "cat": ("Cartoon Cat", generate_cat),
        "teddy_bear": ("Teddy Bear", generate_teddy_bear),
        "car": ("Cartoon Car", generate_car),
        "flower": ("Sunflower", generate_flower)
    }

    metadata = []
    for key, (title, gen_func) in generators.items():
        filepath = os.path.join(SAMPLES_DIR, f"{key}.png")
        img = gen_func()
        img.save(filepath, format="PNG")
        metadata.append({
            "id": key,
            "title": title,
            "filename": f"{key}.png",
            "url": f"/api/samples/{key}.png"
        })

    print(f"Generated {len(metadata)} sample illustrations in {SAMPLES_DIR}")
    return metadata


if __name__ == "__main__":
    create_all_samples()
