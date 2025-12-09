import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "app_session";
const VALID_LOGIN = "iago";
const VALID_PASSWORD = "Asfas852@";
const SESSION_TOKEN = Buffer.from(`${VALID_LOGIN}:${VALID_PASSWORD}`).toString("base64");
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 dias

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const login = String(body?.login ?? "").trim();
    const senha = String(body?.senha ?? "");

    if (login !== VALID_LOGIN || senha !== VALID_PASSWORD) {
      const response = NextResponse.json(
        { authenticated: false, message: "Credenciais inválidas." },
        { status: 401 }
      );
      response.cookies.delete(SESSION_COOKIE_NAME);
      return response;
    }

    const response = NextResponse.json({ authenticated: true });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: SESSION_TOKEN,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    console.error("Erro ao processar login:", error);
    return NextResponse.json(
      { authenticated: false, message: "Não foi possível processar o login." },
      { status: 400 }
    );
  }
}

export async function GET(request: NextRequest) {
  const currentToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (currentToken === SESSION_TOKEN) {
    return NextResponse.json({ authenticated: true });
  }

  return NextResponse.json({ authenticated: false }, { status: 401 });
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
