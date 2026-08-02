import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NichtBerechtigtPage() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">Kein Zugriff</h1>
      <p className="text-muted-foreground max-w-md">
        Ihr Konto hat keine Berechtigung, diese Seite anzuzeigen.
      </p>
      <Button render={<Link href="/" />}>Zur Startseite</Button>
    </div>
  );
}
