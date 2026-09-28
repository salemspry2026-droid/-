import { readFile, stat } from 'fs/promises';
import { join } from 'path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GITHUB_RELEASE_APK_URL = 'https://github.com/salemspry2026-droid/-/releases/latest/download/Flowexa.apk';
const GITHUB_RELEASE_API_URL = 'https://api.github.com/repos/salemspry2026-droid/-/releases/latest';

type GitHubRelease = {
  assets?: Array<{ name?: string }>;
};

async function hasPublishedApk(): Promise<boolean> {
  try {
    const response = await fetch(GITHUB_RELEASE_API_URL, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Flowexa-download-endpoint' },
      cache: 'no-store',
    });
    if (!response.ok) return false;
    const release = (await response.json()) as GitHubRelease;
    return release.assets?.some((asset) => asset.name === 'Flowexa.apk') ?? false;
  } catch {
    return false;
  }
}

export async function GET() {
  const apkPath = join(process.cwd(), 'public', 'downloads', 'flowexa.apk');
  try {
    const [file, info] = await Promise.all([readFile(apkPath), stat(apkPath)]);
    return new NextResponse(new Uint8Array(file), { status: 200, headers: { 'Content-Type': 'application/vnd.android.package-archive', 'Content-Disposition': 'attachment; filename="Flowexa.apk"', 'Content-Length': String(info.size), 'Cache-Control': 'no-store' } });
  } catch {
    if (!(await hasPublishedApk())) return NextResponse.json({ error: 'APK release is not available yet.' }, { status: 404 });
    return NextResponse.redirect(GITHUB_RELEASE_APK_URL, { status: 307, headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function HEAD() {
  const apkPath = join(process.cwd(), 'public', 'downloads', 'flowexa.apk');
  try {
    const info = await stat(apkPath);
    return new NextResponse(null, { status: 200, headers: { 'Content-Type': 'application/vnd.android.package-archive', 'Content-Length': String(info.size) } });
  } catch {
    if (!(await hasPublishedApk())) return new NextResponse(null, { status: 404 });
    return new NextResponse(null, { status: 307, headers: { 'Content-Type': 'application/vnd.android.package-archive', Location: GITHUB_RELEASE_APK_URL, 'Cache-Control': 'no-store' } });
  }
}
