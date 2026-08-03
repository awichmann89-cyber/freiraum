import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Anfrage gesendet" };

export default function DankePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="space-y-4 pt-6 text-center">
          <CircleCheck className="mx-auto size-10 text-emerald-600" />
          <h1 className="text-xl font-semibold">Vielen Dank!</h1>
          <p className="text-sm text-muted-foreground">
            Deine Anfrage ist bei uns eingegangen. Du erhältst in Kürze eine Eingangsbestätigung
            per E-Mail — wir melden uns, sobald wir die Verfügbarkeit geprüft haben.
          </p>
          <Button variant="outline" asChild className="w-full">
            <Link href="/belegung">Zur Belegungsübersicht</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
