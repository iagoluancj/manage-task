import { NextResponse } from 'next/server';

/**
 * Middleware desativado intencionalmente.
 * Mantemos a função exportada apenas para deixar explícito
 * que nenhuma lógica adicional é executada durante as requisições.
 */
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
