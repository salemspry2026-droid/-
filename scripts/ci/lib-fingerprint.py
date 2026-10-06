#!/usr/bin/env python3
"""Small helpers shared by the CI scripts. Prints only public certificate fingerprints."""
import json
import re
import sys

HEX_RE = re.compile(r"^[0-9A-F]{64}$")

# Marker used by every apksigner/build-tools version for the signer certificate digest.
# Both the modern format ("Signer #1 certificate SHA-256 digest: <hex>") and the older
# scheme format ("V2 Signer: certificate SHA-256 digest: <hex>" / "V3 Signer: ...") share
# this exact context marker. We parse based on this context, never on a bare hex regex.
CERT_DIGEST_MARKER = "certificate sha-256 digest:"


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


def extract_cert_digests(apksigner_output: str) -> list:
    """All unique signer certificate SHA-256 digests in raw apksigner output.

    Parses every line containing the certificate-digest context marker and normalizes the
    value. Ignores the public-key digest and the source-stamp signer (that is not the APK
    signer identity). If apksigner output has multiple certificate digests that normalize
    to the same fingerprint they are deduplicated safely; different values are all kept so
    the caller can reject the conflict (fail closed) instead of silently picking one.
    """
    found = []
    for line in apksigner_output.splitlines():
        low = line.lower()
        idx = low.find(CERT_DIGEST_MARKER)
        if idx < 0:
            continue  # not a certificate-digest context line (public keys etc. are excluded)
        prefix = low[:idx].strip()
        if "stamp" in prefix:
            continue  # source-stamp signer is not the APK signer
        value = line[idx + len(CERT_DIGEST_MARKER):].strip()
        try:
            norm = normalize(value)
        except ValueError:
            continue  # malformed candidate; if nothing valid remains the caller fails closed
        if norm not in found:
            found.append(norm)
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
        elif cmd == "certs":
            # usage: certs <file-or-'-'> ; reads apksigner output and prints the single
            # normalized signer certificate SHA-256 digest. Fails closed on no digest,
            # malformed digest, or conflicting digests.
            src = sys.argv[2]
            raw = sys.stdin.read() if src == "-" else open(src, encoding="utf-8").read()
            found = extract_cert_digests(raw)
            if not found:
                raise ValueError(
                    "no signer certificate SHA-256 digest found in apksigner output: "
                    "certificate context missing; refusing to continue"
                )
            if len(found) > 1:
                raise ValueError(
                    "multiple conflicting signer certificate SHA-256 digests found in "
                    "apksigner output: %s; refusing to pick one" % ", ".join(found)
                )
            print(found[0])
        else:
            sys.exit("unknown command " + cmd)
    except (ValueError, json.JSONDecodeError, OSError) as exc:
        print("::error::" + str(exc), file=sys.stderr)
        sys.exit(1)
