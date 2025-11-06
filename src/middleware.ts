import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const allowedIPs = ['192.168.1.128'];

function extractClientIp(request: NextRequest): string | null {
  if (request.ip) {
    return request.ip;
  }

  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() ?? null;
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
