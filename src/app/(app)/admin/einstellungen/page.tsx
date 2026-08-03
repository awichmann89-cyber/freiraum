import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSettings } from "@/lib/settings";
import { EinstellungenForm } from "./einstellungen-form";

export const metadata: Metadata = { title: "Einstellungen" };

export default async function EinstellungenPage() {
  const settings = await getSettings();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Einstellungen</h1>
      <EinstellungenForm
        values={{
          hausName: settings.hausName,
          contractTokenDays: settings.contractTokenDays,
        }}
      />
      <div className="space-y-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/einstellungen/vorlagen">
            <FileText className="size-4" /> Vertragsvorlagen verwalten
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">
          Mietpreise werden pro Raum unter „Räume&ldquo; gepflegt.
        </p>
      </div>
    </div>
  );
}
