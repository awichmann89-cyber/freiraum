"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export async function authenticate(_prevState: string | undefined, formData: FormData) {
  try {
    await signIn("credentials", formData);
  } catch (error) {
    if (error instanceof AuthError) {
      return "E-Mail oder Passwort ist falsch.";
    }
    throw error; // NEXT_REDIRECT u.ä. durchreichen
  }
}
