import { readFile, stat } from 'fs/promises';
import { join } from 'path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
    return NextResponse.json({ error: 'APK not available' }, { status: 404 });
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
    return new NextResponse(null, { status: 404 });
  }
}
