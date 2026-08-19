from __future__ import annotations

import gzip
import json
from pathlib import Path


ASSET_DIR = (
    Path(__file__).resolve().parents[1]
    / "artifacts"
    / "mockup-sandbox"
    / "public"
    / "images"
    / "goldace-custom"
)

# These source layers contain the original mascot face. Their layer indices
# are stable in the downloaded pack, while the surrounding layers are the
# animation effects we want to preserve.
ORIGINAL_MASCOT_LAYER_INDICES = {
    "01.tgs": {4},
    "02.tgs": {1},
    "03.tgs": {8},
    "04.tgs": {3},
    "05.tgs": {5},
}


def static_value(value):
    return {"a": 0, "k": value}


def transform(rotation: float = 0, position: list[float] | None = None):
    return {
        "ty": "tr",
        "p": static_value(position or [0, 0]),
        "a": static_value([0, 0]),
        "s": static_value([100, 100]),
        "r": static_value(rotation),
        "o": static_value(100),
    }


def fill(name: str, color: list[float], opacity: float = 100):
    return {
        "ty": "fl",
        "nm": name,
        "c": static_value(color),
        "o": static_value(opacity),
        "r": 1,
    }


def ellipse(
    name: str,
    size: list[float],
    position: list[float],
    color: list[float],
    opacity: float = 100,
):
    return {
        "ty": "gr",
        "nm": name,
        "it": [
            {
                "ty": "el",
                "nm": name,
                "p": static_value(position),
                "s": static_value(size),
            },
            fill(f"{name} fill", color, opacity),
            transform(),
        ],
    }


def path_shape(
    vertices: list[list[float]],
    in_tangents: list[list[float]],
    out_tangents: list[list[float]],
):
    path = {
        "a": 0,
        "k": {
            "i": in_tangents,
            "o": out_tangents,
            "v": vertices,
            "c": True,
        },
    }
    return {"ty": "sh", "ks": path}


def path_group(
    name: str,
    vertices: list[list[float]],
    in_tangents: list[list[float]],
    out_tangents: list[list[float]],
    color: list[float],
    opacity: float = 100,
):
    return {
        "ty": "gr",
        "nm": name,
        "it": [
            {
                **path_shape(vertices, in_tangents, out_tangents),
                "nm": name,
            },
            fill(f"{name} fill", color, opacity),
            transform(),
        ],
    }


def rotated_ellipse(
    name: str,
    size: list[float],
    position: list[float],
    rotation: float,
    color: list[float],
):
    group = ellipse(name, size, position, color)
    group["it"][-1]["r"] = static_value(rotation)
    return group


def penguin_shapes():
    navy = [0.055, 0.095, 0.14, 1]
    navy_deep = [0.025, 0.05, 0.075, 1]
    navy_highlight = [0.12, 0.18, 0.24, 1]
    white = [0.97, 0.975, 0.96, 1]
    white_shadow = [0.84, 0.87, 0.88, 1]
    eye = [0.015, 0.025, 0.035, 1]
    eye_glint = [1, 1, 1, 1]
    orange = [1.0, 0.32, 0.02, 1]
    orange_shadow = [0.62, 0.12, 0.015, 1]

    # Keep the proportions of the supplied reference: a broad navy head/body,
    # two oversized white face patches, and a belly that reaches the bottom
    # without a pointed tail or feet.
    body = ellipse("penguin body", [378, 412], [256, 257], navy)
    left_face = ellipse("penguin left face patch", [178, 210], [176, 220], white)
    right_face = ellipse("penguin right face patch", [178, 210], [336, 220], white)
    face_bridge = ellipse("penguin face bridge", [160, 156], [256, 235], white)
    belly = ellipse("penguin white belly", [252, 262], [256, 353], white)

    details = [
        # The flippers sit behind the body and fall straight down alongside it.
        rotated_ellipse(
            "penguin left flipper", [96, 210], [102, 320], -16, navy
        ),
        rotated_ellipse(
            "penguin right flipper", [96, 210], [410, 320], 16, navy
        ),
        ellipse(
            "penguin contact shadow",
            [344, 48],
            [256, 448],
            navy_deep,
            28,
        ),
        ellipse("penguin body highlight", [180, 290], [158, 214], navy_highlight, 18),
        body,
        ellipse("penguin face soft shadow", [330, 204], [256, 235], white_shadow, 20),
        belly,
        left_face,
        right_face,
        face_bridge,
        ellipse("penguin belly soft shadow", [138, 182], [309, 363], white_shadow, 16),
        ellipse("penguin left eye", [34, 58], [211, 218], eye),
        ellipse("penguin right eye", [34, 58], [301, 218], eye),
        ellipse("penguin left eye glint", [9, 14], [204, 207], eye_glint),
        ellipse("penguin right eye glint", [9, 14], [294, 207], eye_glint),
        ellipse("penguin beak lower", [66, 50], [256, 276], orange_shadow),
        ellipse("penguin beak", [92, 60], [256, 255], orange),
        ellipse("penguin beak highlight", [34, 13], [239, 244], [1, 0.55, 0.1, 1], 52),
    ]

    # Lottie draws earlier items above later items. Reverse the list so the
    # details stay in front while the flippers and contact shadow stay behind.
    return list(reversed(details))


def shake_position(duration: float):
    # The background artwork is intentionally removed below. This compact
    # transform gives the replacement mascot its own sticker-native wobble,
    # keeping every part of the penguin locked together as one embedded object.
    frames = [
        (0, [0, 0, 0]),
        (duration * 0.16, [4, -2, 0]),
        (duration * 0.32, [-4, 2, 0]),
        (duration * 0.48, [3, 1, 0]),
        (duration * 0.64, [-2, -1, 0]),
        (duration * 0.82, [1, 1, 0]),
        (duration, [0, 0, 0]),
    ]
    return {
        "a": 1,
        "k": [{"t": time, "s": value} for time, value in frames],
        "ix": 2,
    }


def rebuild(path: Path):
    animation = json.loads(gzip.decompress(path.read_bytes()))
    source_layers = ORIGINAL_MASCOT_LAYER_INDICES.get(path.name, set())
    mascot = next(
        layer
        for layer in animation["layers"]
        if layer.get("nm") == "GoldAce yellow penguin mascot"
    )
    if mascot.get("ind") in source_layers:
        mascot["ind"] = 1000
    # Give the replacement a neutral identity. The source mascot is never
    # retained as a layer, precomp, or asset in the uploaded sticker.
    mascot["nm"] = "embedded penguin artwork"
    mascot["shapes"] = penguin_shapes()
    mascot["ks"] = {
        "o": {"a": 0, "k": 100},
        "r": {"a": 0, "k": 0},
        "p": shake_position(float(animation["op"])),
        "a": {"a": 0, "k": [0, 0, 0]},
        "s": {"a": 0, "k": [100, 100, 100]},
    }

    # Do not leave the source pack's precomps, frames, or old mascot behind.
    # The replacement is the complete sticker artwork and owns the motion.
    animation["layers"] = [mascot]
    animation["assets"] = []
    path.write_bytes(
        gzip.compress(
            json.dumps(animation, separators=(",", ":")).encode("utf-8"),
            mtime=0,
        )
    )


if __name__ == "__main__":
    for tgs_path in sorted(ASSET_DIR.glob("*.tgs")):
        rebuild(tgs_path)
        print(f"rebuilt {tgs_path.name}")