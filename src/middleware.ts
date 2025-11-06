import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const allowedIPs = ['192.168.1.128', '164.163.69.170'];

function normalizeIp(ip: string): string {
  let value = ip.trim();

  if (!value) {
    return value;
  }

  if (value.startsWith('[')) {
    const closingBracketIndex = value.indexOf(']');
    if (closingBracketIndex !== -1) {
      value = value.slice(1, closingBracketIndex);
    }
  }

  if (value.startsWith('::ffff:')) {
    value = value.replace('::ffff:', '');
  }

  const lastColonIndex = value.lastIndexOf(':');
  if (lastColonIndex !== -1 && value.includes('.') && !value.includes('::')) {
    value = value.slice(0, lastColonIndex);
  }

  return value;
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
  console.log('[middleware] Verificando IP', {
    clientIp,
    forwardedFor: request.headers.get('x-forwarded-for'),
    realIp: request.headers.get('x-real-ip'),
    vercelIp: request.headers.get('x-vercel-ip'),
    cfConnectingIp: request.headers.get('cf-connecting-ip'),
  });

  if (!clientIp || !allowedIPs.includes(clientIp)) {
    return new NextResponse('Acesso não autorizado.', { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
