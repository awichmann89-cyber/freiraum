import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <div className="mb-12 space-y-3 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          Raumplanung im Freiraum
        </h1>
        <p className="text-muted-foreground mx-auto max-w-xl">
          Stellen Sie eine Anfrage für die Vermietung eines oder mehrerer Räume,
          oder werfen Sie einen Blick in den Belegungskalender.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Raum anfragen</CardTitle>
            <CardDescription>
              Kontaktdaten, gewünschte Räume, Datum und Nachricht angeben.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<Link href="/anfrage" />}>Zur Anfrage</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Belegungskalender</CardTitle>
            <CardDescription>
              Verfügbarkeit der Räume pro Raum oder im Überblick einsehen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<Link href="/kalender" />} variant="outline">
              Zum Kalender
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
