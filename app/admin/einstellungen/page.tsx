import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { SettingsForm } from "./settings-form";

export default async function AdminEinstellungenPage() {
  const [row] = await db.select().from(settings).limit(1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Einstellungen</h1>
        <p className="text-muted-foreground">
          E-Mail-Konfiguration und Organisationsdaten für Verträge.
        </p>
      </div>
      <SettingsForm settings={row ?? null} />
    </div>
  );
}
