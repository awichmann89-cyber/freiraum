import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AnfrageErfolgPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">Vielen Dank für Ihre Anfrage!</h1>
      <p className="text-muted-foreground">
        Wir haben Ihre Anfrage erhalten und prüfen die Verfügbarkeit. Sie erhalten in Kürze eine
        Bestätigung per E-Mail.
      </p>
      <Button render={<Link href="/" />}>Zur Startseite</Button>
    </div>
  );
}
