import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const allowedIPs = ['192.168.1.128'];

function normalizeIp(ip: string): string {
  if (!ip) {
    return ip;
  }

  const withoutPort = ip.includes(':') && ip.includes('.') ? ip.split(':').pop() ?? ip : ip;
  if (withoutPort?.startsWith('::ffff:')) {
    return withoutPort.replace('::ffff:', '');
  }

  return withoutPort ?? ip;
}

function extractClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const rawIp = forwardedFor.split(',')[0]?.trim();
    return rawIp ? normalizeIp(rawIp) : null;
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return normalizeIp(realIp);
  }

  const vercelIp = request.headers.get('x-vercel-ip');
  if (vercelIp) {
    return normalizeIp(vercelIp);
  }

  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return normalizeIp(cfConnectingIp);
  }

  return null;
}

export function middleware(request: NextRequest) {
  const clientIp = extractClientIp(request);

  if (!clientIp || !allowedIPs.includes(clientIp)) {
    return new NextResponse('Acesso não autorizado.', { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
