import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: "admin" | "group";
    mustChangePassword: boolean;
  }

  interface Session {
    user: {
      id: string;
      role: "admin" | "group";
      mustChangePassword: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "admin" | "group";
    mustChangePassword: boolean;
  }
}
