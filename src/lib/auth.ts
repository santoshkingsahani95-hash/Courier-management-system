import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { IUser, UserRole } from "./types";
import { getUserByEmail } from "./store";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || "courier-management-system-super-secret-key-2026";
const COOKIE_NAME = "courier_auth_token";

export interface TokenPayload {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (e) {
    return null;
  }
}

export async function getCurrentUser(): Promise<IUser | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload?.email) return null;

    const user = await getUserByEmail(payload.email);
    if (!user || user.status === "inactive") return null;

    return user;
  } catch (e) {
    return null;
  }
}

export function comparePassword(plain: string, hash: string): boolean {
  try {
    return bcrypt.compareSync(plain, hash);
  } catch (e) {
    return false;
  }
}

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}

export const AUTH_COOKIE_NAME = COOKIE_NAME;

