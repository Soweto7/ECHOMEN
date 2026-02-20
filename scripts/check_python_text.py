#!/usr/bin/env python3
"""Fail if tracked Python files are non-UTF-8 text or contain U+FFFD corruption."""

from __future__ import annotations

import subprocess
from pathlib import Path


def tracked_python_files() -> list[Path]:
    result = subprocess.run(
        ["git", "ls-files", "*.py"],
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    return [Path(line) for line in result.stdout.splitlines() if line.strip()]


def main() -> int:
    bad: list[str] = []

    for path in tracked_python_files():
        raw = path.read_bytes()

        if b"\x00" in raw:
            bad.append(f"{path}: contains null bytes (likely binary)")
            continue

        try:
            text = raw.decode("utf-8")
        except UnicodeDecodeError as exc:
            bad.append(f"{path}: invalid UTF-8 ({exc})")
            continue

        if "\ufffd" in text:
            bad.append(f"{path}: contains replacement character (U+FFFD)")

    if bad:
        print("Python text integrity check failed:")
        for issue in bad:
            print(f" - {issue}")
        return 1

    print("Python text integrity check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
