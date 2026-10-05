#!/usr/bin/env python3
"""Small helpers shared by the CI scripts. Prints only public certificate fingerprints."""
import json
import re
import sys

HEX_RE = re.compile(r"^[0-9A-F]{64}$")


def normalize(value: str) -> str:
    """'ab:cd:..' / 'ABCD..' -> 64 upper-case hex digits (no colons). Raises on bad input."""
    hex_only = re.sub(r"[^0-9A-Fa-f]", "", value).upper()
    if not HEX_RE.match(hex_only):
        raise ValueError(
            "not a full SHA-256 fingerprint: expected 64 hex digits (32 bytes), got %d hex digits"
            % len(hex_only)
        )
    return hex_only


def pretty(hex64: str) -> str:
    return ":".join(hex64[i:i + 2] for i in range(0, 64, 2))


def read_expected(path: str) -> str:
    with open(path, encoding="utf-8") as fh:
        lines = [l.strip() for l in fh if l.strip() and not l.lstrip().startswith("#")]
    if len(lines) != 1:
        raise ValueError("%s must contain exactly one fingerprint line" % path)
    return normalize(lines[0])


def assetlinks_fingerprints(raw: str, package: str) -> list:
    data = json.loads(raw)
    found = []
    for entry in data:
        target = entry.get("target", {})
        if target.get("namespace") == "android_app" and target.get("package_name") == package:
            for fp in target.get("sha256_cert_fingerprints", []):
                found.append(normalize(fp))
    return found


if __name__ == "__main__":
    cmd = sys.argv[1]
    try:
        if cmd == "normalize":
            print(normalize(sys.argv[2]))
        elif cmd == "pretty":
            print(pretty(normalize(sys.argv[2])))
        elif cmd == "expected":
            print(read_expected(sys.argv[2]))
        elif cmd == "assetlinks":
            # usage: assetlinks <file-or-'-'> <package>
            src = sys.argv[2]
            raw = sys.stdin.read() if src == "-" else open(src, encoding="utf-8").read()
            for fp in assetlinks_fingerprints(raw, sys.argv[3]):
                print(fp)
        else:
            sys.exit("unknown command " + cmd)
    except (ValueError, json.JSONDecodeError, OSError) as exc:
        print("::error::" + str(exc), file=sys.stderr)
        sys.exit(1)
