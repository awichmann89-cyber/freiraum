import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/confirm-button";
import { parsePoints } from "@/lib/floorplan-geometry";
import { PdfUpload } from "@/components/floorplan/editor/pdf-upload";
import { FloorplanEditor } from "@/components/floorplan/editor/floorplan-editor";
import { removeFloorplan } from "./plan-actions";

export const metadata: Metadata = { title: "Floorplan-Editor" };

export default async function PlanEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const etage = await prisma.etage.findUnique({
    where: { id },
    include: {
      raeume: { where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } },
      formen: true,
    },
  });
  if (!etage) notFound();

  const useBlobUpload = !!process.env.BLOB_READ_WRITE_TOKEN;
  const hasPlan = !!(etage.floorplanImageUrl && etage.floorplanImgWidth && etage.floorplanImgHeight);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href="/admin/etagen" aria-label="Zurück zu Etagen">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="text-xl font-semibold">Floorplan: {etage.name}</h1>
        </div>
        {hasPlan ? (
          <ConfirmButton
            action={removeFloorplan.bind(null, etage.id)}
            confirmText="Plan entfernen? Die gezeichneten Raumformen bleiben erhalten und passen wieder, sobald du denselben Plan erneut hochlädst."
            variant="outline"
            successText="Plan entfernt"
          >
            Plan entfernen
          </ConfirmButton>
        ) : null}
      </div>

      {hasPlan ? (
        <>
          <FloorplanEditor
            etageId={etage.id}
            image={{
              url: etage.floorplanImageUrl!,
              width: etage.floorplanImgWidth!,
              height: etage.floorplanImgHeight!,
            }}
            raeume={etage.raeume}
            initialShapes={etage.formen.map((f) => ({
              raumId: f.raumId,
              kind: f.kind,
              points: parsePoints(f.points),
            }))}
          />
          <details className="rounded-lg border">
            <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
              Plan durch neues PDF ersetzen
            </summary>
            <div className="p-3">
              <PdfUpload etageId={etage.id} useBlobUpload={useBlobUpload} />
              <p className="mt-2 text-xs text-muted-foreground">
                Die Raumformen sind relativ zum Plan gespeichert — bei gleichem Grundriss passen
                sie nach dem Ersetzen weiterhin.
              </p>
            </div>
          </details>
        </>
      ) : (
        <>
          {etage.raeume.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Tipp: Lege zuerst die Räume dieser Etage an, damit du die Formen direkt verknüpfen
              kannst.
            </p>
          ) : null}
          <PdfUpload etageId={etage.id} useBlobUpload={useBlobUpload} />
        </>
      )}
    </div>
  );
}
