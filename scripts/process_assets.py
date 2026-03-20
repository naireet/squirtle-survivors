"""
Asset processor for Squirtle Survivors.
- Removes backgrounds from sprites (player, enemies, pickups) using rembg
- Downscales to target sizes for 16-bit pixelated feel
- Resizes splash screens to game resolution
- Saves all as PNG with transparency where needed
"""
from pathlib import Path
from PIL import Image
from rembg import remove

SRC = Path(r"C:\Code\squirtle-game resources")
DST = Path(r"C:\Code\squirtle-survivors\public\assets")

# Processing configs: (source, dest, size, remove_bg)
SPRITES = [
    # Player
    (SRC / "main character strat" / "Default pose.png",     DST / "player" / "default.png",    64, True),
    (SRC / "main character strat" / "mega power up state.jpg", DST / "player" / "mega.png",    64, True),
    (SRC / "main character strat" / "ultra power up state.png", DST / "player" / "ultra.png",  64, True),
    # Enemies
    (SRC / "enemy" / "rocket regular enemy.png",             DST / "enemies" / "rocket.png",    64, True),
    (SRC / "enemy" / "Elite Clacky Nemesis.png",             DST / "enemies" / "clacky.png",    64, True),
    (SRC / "enemy" / "Tom King boss.jpg",                    DST / "enemies" / "tom-king.png",  128, True),
    # Pickups
    (SRC / "power ups" / "powerup 1x.jpg",                  DST / "pickups" / "powerup-1x.png", 32, True),
    (SRC / "power ups" / "power-up 2x.jpg",                 DST / "pickups" / "powerup-2x.png", 32, True),
    (SRC / "power ups" / "ih debuff.jpg",                    DST / "pickups" / "debuff.png",    32, True),
]

SCREENS = [
    (SRC / "Splash Screens" / "Boosh briefing.png",  DST / "screens" / "briefing.png",  (800, 600)),
    (SRC / "Splash Screens" / "sad game over.png",   DST / "screens" / "game-over.png", (800, 600)),
    (SRC / "Splash Screens" / "Ending Splash.jpg",   DST / "screens" / "ending.png",    (800, 600)),
]

def process_sprite(src: Path, dst: Path, size: int, remove_bg: bool):
    """Remove background, downscale to size x size for pixel art effect."""
    img = Image.open(src).convert("RGBA")
    
    if remove_bg:
        img = remove(img)
    
    # Downscale with LANCZOS for clean pixel art
    img = img.resize((size, size), Image.LANCZOS)
    
    dst.parent.mkdir(parents=True, exist_ok=True)
    img.save(dst, "PNG")
    print(f"  > {dst.name} ({size}x{size})")

def process_screen(src: Path, dst: Path, size: tuple):
    """Resize splash screen to game resolution, no bg removal."""
    img = Image.open(src).convert("RGBA")
    img = img.resize(size, Image.LANCZOS)
    dst.parent.mkdir(parents=True, exist_ok=True)
    img.save(dst, "PNG")
    print(f"  > {dst.name} ({size[0]}x{size[1]})")

if __name__ == "__main__":
    print("Processing sprites (bg removal + pixelation)...")
    for src, dst, size, rm_bg in SPRITES:
        try:
            process_sprite(src, dst, size, rm_bg)
        except Exception as e:
            print(f"  X {dst.name}: {e}")
    
    print("\nProcessing splash screens (resize only)...")
    for src, dst, size in SCREENS:
        try:
            process_screen(src, dst, size)
        except Exception as e:
            print(f"  X {dst.name}: {e}")
    
    print("\nDone! All assets in:", DST)
