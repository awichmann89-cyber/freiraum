import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Anmelden" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Freiraum</CardTitle>
          <CardDescription>Mit deinem Zugang anmelden</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Suspense>
            <LoginForm />
          </Suspense>
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <Link href="/passwort-vergessen" className="hover:underline">
              Passwort vergessen?
            </Link>
            <Link href="/belegung" className="hover:underline">
              Zur öffentlichen Belegungsübersicht
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
