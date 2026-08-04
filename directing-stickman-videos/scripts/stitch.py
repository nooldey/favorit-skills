#!/usr/bin/env python3
"""Concatenate the six stickman clip MP4s into one continuous video.

Usage:
    python stitch.py <clip_dir> <output.mp4>

The script prefers a bundled ffmpeg shipped with `imageio-ffmpeg` so no
system ffmpeg install is required. It falls back to a system `ffmpeg` on
PATH. If neither is available it prints a clear install hint and exits
without silently failing.

Detection order for ffmpeg:
    1. imageio_ffmpeg.get_ffmpeg_exe()  (bundled binary, auto-downloaded on first import)
    2. system `ffmpeg` on PATH
"""

import glob
import os
import subprocess
import sys


def find_ffmpeg():
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        pass
    from shutil import which

    return which("ffmpeg")


def main():
    if len(sys.argv) < 3:
        print("Usage: python stitch.py <clip_dir> <output.mp4>")
        sys.exit(2)

    clip_dir = sys.argv[1]
    out = sys.argv[2]

    clips = sorted(glob.glob(os.path.join(clip_dir, "*.mp4")))
    # Keep deterministic clip1..clip6 ordering
    clips = [c for c in clips if not os.path.basename(c).startswith("_")]
    if len(clips) < 2:
        print(f"Need at least 2 .mp4 clips in {clip_dir}, found {len(clips)}")
        sys.exit(1)

    ffmpeg = find_ffmpeg()
    if not ffmpeg:
        print(
            "ERROR: no ffmpeg available.\n"
            "Install with: pip install imageio-ffmpeg\n"
            "or install system ffmpeg and ensure it is on PATH."
        )
        sys.exit(1)

    list_path = os.path.join(clip_dir, "_concat.txt")
    with open(list_path, "w", encoding="utf-8") as f:
        for c in clips:
            f.write("file '%s'\n" % os.path.abspath(c))

    base_cmd = [ffmpeg, "-y", "-f", "concat", "-safe", "0", "-i", list_path]

    # Fast path: stream copy when streams are compatible.
    try:
        subprocess.run(base_cmd + ["-c", "copy", out], check=True)
    except subprocess.CalledProcessError:
        # Slow path: re-encode for mismatched codecs / durations.
        subprocess.run(
            base_cmd
            + ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", out],
            check=True,
        )

    os.remove(list_path)
    print("Stitched %d clips -> %s" % (len(clips), out))


if __name__ == "__main__":
    main()
