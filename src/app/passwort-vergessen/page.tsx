import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Passwort vergessen" };

export default function PasswortVergessenPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Passwort vergessen</CardTitle>
          <CardDescription>Wir schicken dir einen Link zum Zurücksetzen.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ForgotForm />
          <Link href="/login" className="block text-sm text-muted-foreground hover:underline">
            Zurück zur Anmeldung
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
