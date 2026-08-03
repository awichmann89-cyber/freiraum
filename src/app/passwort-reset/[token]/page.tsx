import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { findValidToken } from "@/lib/tokens";
import { setPasswordWithToken } from "@/lib/actions/password-actions";
import { SetPasswordForm } from "@/components/set-password-form";

export const metadata: Metadata = { title: "Passwort zurücksetzen" };

export default async function PasswortResetPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token: rawToken } = await params;
  const token = await findValidToken(rawToken, "PASSWORT_RESET");

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Passwort zurücksetzen</CardTitle>
          <CardDescription>
            {token?.user ? `Hallo ${token.user.name}, lege ein neues Passwort fest.` : "Link prüfen"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {token?.user ? (
            <SetPasswordForm action={setPasswordWithToken.bind(null, "PASSWORT_RESET", rawToken)} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Dieser Link ist ungültig oder abgelaufen. Bitte fordere unter „Passwort
              vergessen&ldquo; einen neuen an.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
