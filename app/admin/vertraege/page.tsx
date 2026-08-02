import Link from "next/link";
import { listContractsWithContext } from "@/lib/queries/contracts";
import { CONTRACT_STATUS_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminVertraegePage() {
  const contracts = await listContractsWithContext();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Verträge</h1>
        <p className="text-muted-foreground">Alle erstellten Mietverträge und ihr Status.</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mieter:in</TableHead>
            <TableHead>Räume</TableHead>
            <TableHead>Erstellt am</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contracts.map(({ contract, context }) => (
            <TableRow key={contract.id}>
              <TableCell>
                <Link href={`/admin/vertraege/${contract.id}`} className="hover:underline">
                  {context?.renterName ?? "–"}
                </Link>
              </TableCell>
              <TableCell>{context?.roomNames.join(", ") ?? "–"}</TableCell>
              <TableCell>{formatDate(contract.createdAt)}</TableCell>
              <TableCell>
                <Badge variant="secondary">{CONTRACT_STATUS_LABELS[contract.status]}</Badge>
              </TableCell>
            </TableRow>
          ))}
          {contracts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Noch keine Verträge erstellt.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}
