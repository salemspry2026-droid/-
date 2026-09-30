import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GITHUB_RELEASE_APK_URL = 'https://github.com/salemspry2026-droid/-/releases/latest/download/Flowexa.apk';

/**
 * Fast direct redirect to GitHub Releases CDN asset.
 * Zero memory buffering, zero byte streaming through Vercel.
 */
export async function GET() {
  return NextResponse.redirect(GITHUB_RELEASE_APK_URL, {
    status: 307,
    headers: {
      'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
    },
  });
}

export async function HEAD() {
  return new NextResponse(null, {
    status: 307,
    headers: {
      'Location': GITHUB_RELEASE_APK_URL,
      'Content-Type': 'application/vnd.android.package-archive',
      'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
