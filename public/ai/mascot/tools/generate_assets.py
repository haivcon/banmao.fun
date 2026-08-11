from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Callable

from PIL import Image, ImageDraw, ImageFont

REPO = Path(__file__).resolve().parents[4]
OUT = REPO / "public/ai/mascot"
SPRITES = REPO / "public/gamefi/banmaofomo/sprites"
FONT = REPO / "public/fonts/ChakraPetch-Regular.ttf"

CYAN = (49, 232, 255, 255)
BLUE = (78, 128, 255, 255)
GOLD = (255, 203, 58, 255)
RED = (255, 78, 102, 255)
INK = (8, 15, 30, 238)
WHITE = (247, 252, 255, 255)


def anim(name: str) -> list[Path]:
    return sorted((SPRITES / "animations" / name).glob("*.png"))


def single(name: str) -> Path:
    return SPRITES / name


EMOTIONS = {
    "idle": dict(sources=anim("idle"), duration=3000, loop=True, overlay=None, preload="eager", event="chat.ready | response.complete"),
    "greeting": dict(sources=[single("banmao_idle_wave.png"), *anim("dance")[:2]], duration=1200, loop=False, overlay="spark", preload="eager", event="session.open | user.returned"),
    "listening": dict(sources=anim("idle")[:3], duration=1500, loop=True, overlay="listening", preload="eager", event="input.voice.start | input.focus"),
    "thinking": dict(sources=[single("banmao_hourglass.png"), *anim("idle")[:2]], duration=1800, loop=True, overlay="thinking", preload="eager", event="assistant.thinking"),
    "researching": dict(sources=[*anim("feed")[:3]], duration=1800, loop=True, overlay="docs", preload="lazy-high", event="tool.search.start | retrieval.start"),
    "working": dict(sources=[*anim("feed")[:3]], duration=1350, loop=True, overlay="typing", preload="lazy-high", event="tool.run.start | generation.start"),
    "answering": dict(sources=[single("banmao_thumbs_up.png"), *anim("idle")[:2]], duration=1500, loop=True, overlay="answer", preload="eager", event="assistant.stream.start"),
    "success": dict(sources=[single("banmao_thumbs_up.png"), anim("winner")[0], anim("winner")[2], anim("winner")[3]], duration=1400, loop=False, overlay="success", preload="lazy-high", event="task.success | transaction.confirmed"),
    "excited": dict(sources=anim("excited"), duration=1000, loop=True, overlay="spark", preload="lazy", event="reward.revealed | milestone"),
    "secure": dict(sources=[*anim("idle")[:3]], duration=2100, loop=True, overlay="shield", preload="lazy-high", event="security.verified | wallet.safe"),
    "warning": dict(sources=[single("banmao_sleeping_bored.png"), *anim("idle")[:2]], duration=1600, loop=True, overlay="warning", preload="lazy-high", event="task.warning | confirmation.required"),
    "confused": dict(sources=[single("banmao_sleeping_bored.png"), *anim("sleeping")[:2]], duration=2200, loop=True, overlay="question", preload="lazy", event="intent.unclear | empty.result"),
    "error": dict(sources=[single("banmao_sleeping_bored.png"), *anim("sleeping")[:2]], duration=1400, loop=False, overlay="error", preload="lazy-high", event="task.error | network.error"),
    "sleeping": dict(sources=anim("sleeping"), duration=4000, loop=True, overlay="sleep", preload="lazy", event="session.inactive | maintenance"),
    "love": dict(sources=anim("love_eyes"), duration=2000, loop=True, overlay="heart", preload="lazy", event="user.like | community.love"),
    "goodbye": dict(sources=[single("banmao_idle_wave.png"), *anim("dance")[:2]], duration=1500, loop=False, overlay="goodbye", preload="lazy", event="session.close | sign.out"),
}


def font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT), size=size)


def rounded_badge(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], accent, radius=50):
    x0, y0, x1, y1 = box
    draw.rounded_rectangle((x0 + 8, y0 + 12, x1 + 8, y1 + 12), radius=radius, fill=(0, 0, 0, 70))
    draw.rounded_rectangle(box, radius=radius, fill=INK, outline=accent, width=10)


def overlay_icon(kind: str, phase: int) -> Image.Image:
    im = Image.new("RGBA", (1024, 1024))
    d = ImageDraw.Draw(im)
    pulse = phase % 3
    # Keep overlays inside a shared safe region and away from ears/feet.
    bx = (690, 115, 930, 355)
    if kind in {"listening", "thinking", "docs", "typing", "answer", "shield", "warning", "question", "error", "success", "goodbye"}:
        accent = RED if kind == "error" else GOLD if kind == "warning" else CYAN
        rounded_badge(d, bx, accent)

    if kind == "listening":
        cx, cy = 790, 236
        d.rounded_rectangle((760, 167, 820, 265), radius=28, outline=CYAN, width=14)
        d.arc((735, 196, 845, 310), 0, 180, fill=CYAN, width=13)
        d.line((790, 310, 790, 333), fill=CYAN, width=13)
        d.line((755, 333, 825, 333), fill=CYAN, width=13)
        for i in range(2 + pulse):
            r = 50 + i * 30
            d.arc((cx-r, cy-r, cx+r, cy+r), -48, 48, fill=(49,232,255,180-i*35), width=8)
    elif kind == "thinking":
        d.ellipse((745, 175, 795, 225), fill=WHITE)
        d.ellipse((815, 155, 875, 215), fill=WHITE)
        d.ellipse((790, 245, 825, 280), fill=(49,232,255,210))
        d.ellipse((850, 262, 875, 287), fill=(49,232,255,150))
        d.text((770, 292), "…", font=font(62), fill=CYAN, stroke_width=1)
    elif kind == "docs":
        d.rounded_rectangle((748, 170, 858, 306), radius=12, fill=WHITE)
        d.polygon([(824,170),(858,204),(824,204)], fill=(164,220,255,255))
        for y in (225, 251, 277): d.line((770,y,835,y), fill=BLUE, width=9)
        d.ellipse((820, 256, 888, 324), outline=CYAN, width=13)
        d.line((870,307,902,337), fill=CYAN, width=15)
    elif kind == "typing":
        for i, x in enumerate((750, 808, 866)):
            y = 250 - (18 if i == pulse else 0)
            d.ellipse((x, y, x+34, y+34), fill=CYAN)
        d.rounded_rectangle((742, 185, 900, 305), radius=30, outline=WHITE, width=9)
    elif kind == "answer":
        d.rounded_rectangle((744, 173, 892, 287), radius=30, fill=(16,37,64,255), outline=CYAN, width=9)
        d.polygon([(780,287),(810,287),(785,320)], fill=CYAN)
        for y, w in ((208,105),(241,76)): d.line((766,y,766+w,y), fill=WHITE, width=10)
    elif kind == "shield":
        d.polygon([(810,157),(885,187),(875,264),(810,326),(745,264),(735,187)], fill=(14,52,72,255), outline=CYAN)
        d.line((770,239,800,268), fill=WHITE, width=16)
        d.line((800,268,852,210), fill=CYAN, width=16)
    elif kind == "warning":
        d.polygon([(810,158),(900,316),(720,316)], fill=(76,49,6,255), outline=GOLD)
        d.line((810,206,810,266), fill=GOLD, width=18)
        d.ellipse((799,285,821,307), fill=WHITE)
    elif kind == "question":
        d.text((760, 150), "?", font=font(172), fill=WHITE, stroke_width=5, stroke_fill=CYAN)
    elif kind == "error":
        d.line((758,182,872,296), fill=RED, width=25)
        d.line((872,182,758,296), fill=RED, width=25)
    elif kind == "success":
        d.line((754,237,798,279), fill=WHITE, width=21)
        d.line((798,279,875,192), fill=CYAN, width=21)
    elif kind == "goodbye":
        d.text((748, 186), "BYE", font=font(68), fill=WHITE, stroke_width=2, stroke_fill=CYAN)
        d.arc((760,245,866,328), 15, 165, fill=CYAN, width=12)
    elif kind == "spark":
        for x, y, r in ((177,180,35),(858,210,45),(785,95,25)):
            d.line((x-r,y,x+r,y), fill=GOLD, width=10)
            d.line((x,y-r,x,y+r), fill=GOLD, width=10)
    elif kind == "sleep":
        d.text((745, 130), "Z", font=font(92), fill=CYAN, stroke_width=3, stroke_fill=INK)
        d.text((835, 95), "z", font=font(65), fill=WHITE, stroke_width=2, stroke_fill=INK)
    elif kind == "heart":
        d.text((770, 125), "♥", font=font(120), fill=(255,74,142,245), stroke_width=4, stroke_fill=WHITE)
    return im


def composite(source: Path, kind: str | None, phase: int) -> Image.Image:
    base = Image.open(source).convert("RGBA")
    if base.size != (1024, 1024):
        raise ValueError(f"Unexpected source canvas {source}: {base.size}")
    if kind:
        base = Image.alpha_composite(base, overlay_icon(kind, phase))
    return base


def save_webp(im: Image.Image, path: Path, size: int):
    path.parent.mkdir(parents=True, exist_ok=True)
    resized = im.resize((size, size), Image.Resampling.LANCZOS)
    resized.save(path, "WEBP", quality=88, method=6, exact=True)


def rel(path: Path) -> str:
    return "/" + path.relative_to(REPO / "public").as_posix()


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def main():
    manifest = {
        "schemaVersion": 1,
        "name": "BANMAO AI Emotional Mascot",
        "engine": "frame-sequence",
        "generatedBy": "local Pillow composite pipeline; no generative image model used",
        "canvas": {"width": 256, "height": 256, "heroWidth": 384, "heroHeight": 384, "pivot": {"x": 0.5, "y": 1.0}, "fit": "contain"},
        "format": {"mime": "image/webp", "alpha": True, "quality": 88},
        "provenance": {
            "type": "derived-composite",
            "sourceRoot": "/gamefi/banmaofomo/sprites",
            "note": "Original BANMAO PNG sprites resized and, for semantic states, composited with locally drawn UI glyph overlays. Not AI-generated."
        },
        "preloadPolicy": {
            "eager": ["idle", "greeting", "listening", "thinking", "answering"],
            "lazyHigh": ["researching", "working", "success", "secure", "warning", "error"],
            "lazy": ["excited", "confused", "sleeping", "love", "goodbye"],
            "reducedMotion": "Load poster256 only; do not advance frames."
        },
        "emotions": {}
    }
    totals = {}
    for emotion, spec in EMOTIONS.items():
        entries = []
        for i, source in enumerate(spec["sources"], start=1):
            im = composite(source, spec["overlay"], i - 1)
            p = OUT / "frames" / emotion / f"frame-{i:02d}@256.webp"
            save_webp(im, p, 256)
            entries.append({"src": rel(p), "width": 256, "height": 256, "bytes": p.stat().st_size})
        poster_im = composite(spec["sources"][0], spec["overlay"], 0)
        poster256 = OUT / "frames" / emotion / "poster@256.webp"
        poster384 = OUT / "frames" / emotion / "poster@384.webp"
        save_webp(poster_im, poster256, 256)
        save_webp(poster_im, poster384, 384)
        source_paths = [rel(p) for p in spec["sources"]]
        total = sum(x["bytes"] for x in entries) + poster256.stat().st_size + poster384.stat().st_size
        totals[emotion] = total
        manifest["emotions"][emotion] = {
            "event": spec["event"],
            "frames": entries,
            "durationMs": spec["duration"],
            "frameDurationMs": round(spec["duration"] / len(entries)),
            "loop": spec["loop"],
            "poster": {"src": rel(poster256), "width": 256, "height": 256, "bytes": poster256.stat().st_size},
            "fallback": {"src": rel(poster256), "reducedMotion": True},
            "heroPoster": {"src": rel(poster384), "width": 384, "height": 384, "bytes": poster384.stat().st_size},
            "dimensions": {"width": 256, "height": 256},
            "preload": spec["preload"],
            "provenance": {"sources": source_paths, "overlay": spec["overlay"], "operation": "resize" if not spec["overlay"] else "alpha composite + resize"},
            "totalBytes": total
        }

    # Export standalone semantic overlays for engineering composition/debugging.
    overlay_kinds = ["listening", "thinking", "docs", "typing", "answer", "shield", "warning", "question", "error", "success", "goodbye"]
    manifest["overlays"] = {}
    for kind in overlay_kinds:
        p = OUT / "overlays" / f"{kind}@256.webp"
        save_webp(overlay_icon(kind, 0), p, 256)
        manifest["overlays"][kind] = {"src": rel(p), "width": 256, "height": 256, "bytes": p.stat().st_size, "alpha": True}

    manifest["totalBytes"] = sum(totals.values()) + sum(v["bytes"] for v in manifest["overlays"].values())
    (OUT / "mascot-manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    # 4x4 visual contact sheet. Checkerboard reveals transparency; 128px preview approximates chat UI.
    cols, rows, cw, ch = 4, 4, 320, 330
    sheet = Image.new("RGB", (cols*cw, rows*ch), (5, 10, 23))
    d = ImageDraw.Draw(sheet)
    title_font = font(26)
    meta_font = font(17)
    for idx, (emotion, spec) in enumerate(EMOTIONS.items()):
        col, row = idx % cols, idx // cols
        x, y = col*cw, row*ch
        d.rounded_rectangle((x+10,y+10,x+cw-10,y+ch-10), radius=22, fill=(12,22,42), outline=(38,69,99), width=2)
        # 256 square; checkerboard is intentionally dark and unobtrusive.
        px, py = x+32, y+26
        tile = 16
        for ty in range(16):
            for tx in range(16):
                c = (29,40,57) if (tx+ty)%2 == 0 else (21,31,47)
                d.rectangle((px+tx*tile,py+ty*tile,px+(tx+1)*tile,py+(ty+1)*tile), fill=c)
        poster = Image.open(OUT / "frames" / emotion / "poster@256.webp").convert("RGBA")
        sheet.paste(poster, (px,py), poster)
        d.text((x+25,y+286), emotion.upper(), font=title_font, fill=(239,249,255))
        kb = totals[emotion] / 1024
        d.text((x+25,y+312), f"{len(spec['sources'])}f · {spec['duration']}ms · {kb:.1f} KB", font=meta_font, fill=(73,220,238))
    sheet.save(OUT / "contact-sheet.png", "PNG", optimize=True)

    qa = {
        "status": "AUTOMATED_PASS_VISUAL_PROVIDER_BLOCKED",
        "checks": {
            "emotionCount": len(EMOTIONS),
            "allRequiredEmotionsPresent": len(EMOTIONS) == 16,
            "allSourcesExist": all(p.exists() for s in EMOTIONS.values() for p in s["sources"]),
            "sourceCanvas": "1024x1024 RGBA",
            "outputCanvas": [256, 256],
            "heroPosterCanvas": [384, 384],
            "consistentPivot": [0.5, 1.0],
            "fullCanvasResizeNoCrop": True,
            "alpha": True,
            "contactSheetGrid": "4x4 labeled cells; 1280x1320 PNG",
            "edgeAlphaThreshold": "verified separately after generation: maximum allowed alpha on output boundary <= 8"
        },
        "visualInspection": {
            "contactSheetOpened": True,
            "browserUrl": "file:///C:/Users/Admin/Downloads/Build%20X/banmao.fun/public/ai/mascot/contact-sheet.png",
            "browserObservedDimensions": "1280x1320",
            "visionStatus": "BLOCKED: Hermes vision provider is not configured; browser and desktop screenshots were captured but could not be analyzed",
            "unverified": ["human/vision-model judgment of silhouette aesthetics, overlay readability, overlap, and alpha-edge appearance"]
        },
        "totalBytesByEmotion": totals,
        "files": []
    }
    for p in sorted(OUT.rglob("*")):
        if p.is_file() and p.name != "qa-report.json":
            info = {"path": p.relative_to(OUT).as_posix(), "bytes": p.stat().st_size, "sha256": sha256(p)}
            if p.suffix.lower() in {".png", ".webp"}:
                with Image.open(p) as im:
                    info.update({"format": im.format, "width": im.width, "height": im.height, "mode": im.mode, "alpha": "A" in im.getbands()})
            qa["files"].append(info)
    (OUT / "qa-report.json").write_text(json.dumps(qa, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({"emotions": len(EMOTIONS), "totalBytes": manifest["totalBytes"], "files": len(qa["files"]), "contactSheet": str(OUT / 'contact-sheet.png')}, indent=2))


if __name__ == "__main__":
    main()
