import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { findValidToken } from "@/lib/tokens";
import { setPasswordWithToken } from "@/lib/actions/password-actions";
import { SetPasswordForm } from "@/components/set-password-form";

export const metadata: Metadata = { title: "Einladung" };

export default async function EinladungPage({ params }: { params: Promise<{ token: string }> }) {
  const { token: rawToken } = await params;
  const token = await findValidToken(rawToken, "EINLADUNG");

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Willkommen bei Freiraum</CardTitle>
          <CardDescription>
            {token?.user
              ? `Hallo ${token.user.name}, lege dein Passwort fest.`
              : "Einladungslink prüfen"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {token?.user ? (
            <SetPasswordForm action={setPasswordWithToken.bind(null, "EINLADUNG", rawToken)} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Dieser Einladungslink ist ungültig oder abgelaufen. Bitte wende dich an die
              Verwaltung, um eine neue Einladung zu erhalten.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
