import { ApiError, http, setSessionCookies, setTokens } from "@/lib/http";

export interface SignupPayload {
  businessName: string;
  fullName: string;
  email: string;
  countryCode: string;
  phone: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  dashboardAccessGranted?: boolean;
  user?: {
    id: string | number;
    email: string;
    name: string;
    role: string;
    access_status?: string;
  };
}

export async function signupUser(payload: SignupPayload): Promise<AuthResponse> {
  const backendBody = {
    business_name: payload.businessName.trim(),
    client_name: payload.businessName.trim(),
    name: payload.fullName.trim(),
    full_name: payload.fullName.trim(),
    email: payload.email.trim().toLowerCase(),
    country_code: payload.countryCode,
    phone: payload.phone.trim(),
    password: payload.password,
  };

  const res = await http<any>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(backendBody),
    requiresAuth: false,
  });

  const user = res.user || res.data?.user;
  const tokens = res.tokens || res.data?.tokens;

  if (!tokens?.access_token || !user) {
    throw new ApiError("The server did not return a complete authenticated session.", 502, "INVALID_AUTH_RESPONSE");
  }
  setTokens(tokens.access_token, tokens.refresh_token);
  await setSessionCookies(user, tokens.access_token);

  return {
    success: true,
    message: res.message || "Registration successful",
    token: tokens?.access_token,
    dashboardAccessGranted: user?.access_status === "active",
    user,
  };
}

export async function loginUser(payload: LoginPayload): Promise<AuthResponse> {
  const res = await http<any>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
    }),
    requiresAuth: false,
  });

  const user = res.user || res.data?.user;
  const tokens = res.tokens || res.data?.tokens;

  if (!tokens?.access_token || !user) {
    throw new ApiError("The server did not return a complete authenticated session.", 502, "INVALID_AUTH_RESPONSE");
  }
  setTokens(tokens.access_token, tokens.refresh_token);
  await setSessionCookies(user, tokens.access_token);

  const isSuper = user?.role === "super_admin";
  const isActive = user?.access_status === "active";

  return {
    success: true,
    message: res.message || "Login successful",
    token: tokens?.access_token,
    dashboardAccessGranted: isSuper || isActive,
    user,
  };
}
