#!/usr/bin/env python3
import os
import zlib
import struct

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(os.path.join(HERE, "..", "public"))

EMERALD = (5, 150, 105)
WHITE = (255, 255, 255)


def crc32(data):
    return zlib.crc32(data) & 0xffffffff


def png_chunk(tag, data):
    chunk = tag + data
    return struct.pack(">I", len(data)) + chunk + struct.pack(">I", crc32(chunk))


def write_png(path, size, pixels):
    raw = bytearray()
    for row in pixels:
        raw.append(0)
        for (r, g, b) in row:
            raw.extend((r, g, b))
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    idat = zlib.compress(bytes(raw), 9)
    with open(path, "wb") as f:
        f.write(sig)
        f.write(png_chunk(b"IHDR", ihdr))
        f.write(png_chunk(b"IDAT", idat))
        f.write(png_chunk(b"IEND", b""))


def make_icon(size):
    s = size
    pixels = [[EMERALD for _ in range(s)] for _ in range(s)]
    cx = s // 2
    cy = s // 2
    arm = max(1, int(s * 0.12))
    length = max(1, int(s * 0.30))
    for y in range(s):
        for x in range(s):
            in_v = abs(x - cx) <= arm and abs(y - cy) <= length
            in_h = abs(y - cy) <= arm and abs(x - cx) <= length
            if in_v or in_h:
                pixels[y][x] = WHITE
    return pixels


files = {
    "favicon-96x96.png": 96,
    "favicon-128x128.png": 128,
    "favicon-144x144.png": 144,
    "favicon-152x152.png": 152,
    "favicon-192x192.png": 192,
    "favicon-384x384.png": 384,
    "favicon-512x512.png": 512,
    "icon-72x72.png": 72,
    "icon-96x96.png": 96,
    "icon-192x192.png": 192,
    "icon-512x512.png": 512,
}

for name, size in files.items():
    write_png(os.path.join(OUT, name), size, make_icon(size))
    print("wrote", name, size)

# Generate a proper .ico file (PNG embedded inside ICO container) at 32x32
def write_ico(path, size, pixels):
    png = bytearray()
    raw = bytearray()
    for row in pixels:
        raw.append(0)
        for (r, g, b) in row:
            raw.extend((r, g, b))
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    idat = zlib.compress(bytes(raw), 9)
    png.extend(b"\x89PNG\r\n\x1a\n")
    png.extend(png_chunk(b"IHDR", ihdr))
    png.extend(png_chunk(b"IDAT", idat))
    png.extend(png_chunk(b"IEND", b""))
    # ICONDIR
    icondir = struct.pack("<HHH", 0, 1, 1)
    # ICONDIRENTRY
    entry = struct.pack("<BBBBHHII",
                        size if size < 256 else 0,  # width (0 means 256)
                        size if size < 256 else 0,  # height
                        0,   # color count
                        0,   # reserved
                        1,   # planes
                        32,  # bit count
                        len(png),  # bytes in image
                        6 + 16)    # offset to image data
    with open(path, "wb") as f:
        f.write(icondir)
        f.write(entry)
        f.write(bytes(png))


write_ico(os.path.join(OUT, "favicon.ico"), 32, make_icon(32))
print("wrote favicon.ico (valid ICO) 32")
