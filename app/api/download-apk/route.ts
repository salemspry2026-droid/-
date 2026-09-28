import { readFile, stat } from 'fs/promises';
import { join } from 'path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GITHUB_RELEASE_APK_URL = 'https://github.com/salemspry2026-droid/-/releases/latest/download/Flowexa.apk';

export async function GET() {
  const apkPath = join(process.cwd(), 'public', 'downloads', 'flowexa.apk');

  try {
    const [file, info] = await Promise.all([readFile(apkPath), stat(apkPath)]);
    return new NextResponse(new Uint8Array(file), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': 'attachment; filename="Flowexa.apk"',
        'Content-Length': String(info.size),
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    // If local APK is not on the server disk, redirect directly to the latest GitHub Release APK
    return NextResponse.redirect(GITHUB_RELEASE_APK_URL, {
      status: 307,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  }
}

export async function HEAD() {
  const apkPath = join(process.cwd(), 'public', 'downloads', 'flowexa.apk');
  try {
    const info = await stat(apkPath);
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Length': String(info.size),
      },
    });
  } catch {
    // Return OK status so client knows download endpoint is ready and will redirect to GitHub release
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
        'Location': GITHUB_RELEASE_APK_URL,
      },
    });
  }
}
