import { Badge } from "@/components/ui/badge";
import type { VermietungsStatus } from "@prisma/client";

export function VermietungStatusBadge({ status }: { status: VermietungsStatus }) {
  switch (status) {
    case "NEU":
      return <Badge>Neu</Badge>;
    case "VERTRAG_GESENDET":
      return <Badge className="bg-amber-500 text-white hover:bg-amber-500">Vertrag gesendet</Badge>;
    case "SIGNIERT":
      return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Signiert</Badge>;
    case "ABGELEHNT":
      return <Badge variant="outline">Abgelehnt</Badge>;
    case "ABGELAUFEN":
      return <Badge variant="outline">Abgelaufen</Badge>;
    case "STORNIERT":
      return <Badge variant="destructive">Storniert</Badge>;
  }
}
