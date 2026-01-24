import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "app_session";
const SESSION_USER_COOKIE = "app_user";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 dias

// Lista de usuários válidos
const VALID_USERS = {
  iago: "Asfas852@",
  leticia: "123"
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const login = String(body?.login ?? "").trim().toLowerCase();
    const senha = String(body?.senha ?? "");

    // Verifica se o usuário existe e senha está correta
    if (!VALID_USERS[login as keyof typeof VALID_USERS] || VALID_USERS[login as keyof typeof VALID_USERS] !== senha) {
      const response = NextResponse.json(
        { authenticated: false, message: "Credenciais inválidas." },
        { status: 401 }
      );
      response.cookies.delete(SESSION_COOKIE_NAME);
      response.cookies.delete(SESSION_USER_COOKIE);
      return response;
    }

    const sessionToken = Buffer.from(`${login}:${senha}:${Date.now()}`).toString("base64");
    const response = NextResponse.json({ authenticated: true, user: login });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    response.cookies.set({
      name: SESSION_USER_COOKIE,
      value: login,
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
  const currentUser = request.cookies.get(SESSION_USER_COOKIE)?.value;

  if (currentToken && currentUser) {
    return NextResponse.json({ authenticated: true, user: currentUser });
  }

  return NextResponse.json({ authenticated: false }, { status: 401 });
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.delete(SESSION_COOKIE_NAME);
  response.cookies.delete(SESSION_USER_COOKIE);
  return response;
}
