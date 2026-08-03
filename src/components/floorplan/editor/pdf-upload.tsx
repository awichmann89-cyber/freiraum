"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { loadPdfInfo, renderPdfPageToPng, type PdfInfo } from "@/lib/pdf-render";
import { saveFloorplan } from "@/app/(app)/admin/etagen/[id]/plan/plan-actions";

async function uploadFile(data: Blob, filename: string, type: string, useBlob: boolean): Promise<string> {
  if (useBlob) {
    const { upload } = await import("@vercel/blob/client");
    const result = await upload(`floorplans/${filename}`, data, {
      access: "public",
      handleUploadUrl: "/api/floorplan-upload",
      contentType: type,
    });
    return result.url;
  }
  const fd = new FormData();
  fd.append("file", new File([data], filename, { type }));
  const res = await fetch("/api/floorplan-upload/local", { method: "POST", body: fd });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Upload fehlgeschlagen");
  return json.url as string;
}

type Step =
  | { phase: "idle" }
  | { phase: "analysiere" }
  | { phase: "seitenwahl"; file: File; info: PdfInfo }
  | { phase: "rendere"; file: File }
  | { phase: "vorschau"; file: File; page: number; previewUrl: string; width: number; height: number; png: Blob };

export function PdfUpload({ etageId, useBlobUpload }: { etageId: string; useBlobUpload: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ phase: "idle" });
  const [isSaving, startSaving] = useTransition();
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      toast.error("Bitte eine PDF-Datei wählen.");
      return;
    }
    setStep({ phase: "analysiere" });
    try {
      const info = await loadPdfInfo(file);
      if (info.numPages > 1) {
        setStep({ phase: "seitenwahl", file, info });
      } else {
        await renderPage(file, 1);
      }
    } catch (e) {
      console.error(e);
      toast.error("PDF konnte nicht gelesen werden.");
      setStep({ phase: "idle" });
    }
  };

  const renderPage = async (file: File, page: number) => {
    setStep({ phase: "rendere", file });
    try {
      const rendered = await renderPdfPageToPng(file, page);
      setStep({
        phase: "vorschau",
        file,
        page,
        previewUrl: URL.createObjectURL(rendered.blob),
        width: rendered.width,
        height: rendered.height,
        png: rendered.blob,
      });
    } catch (e) {
      console.error(e);
      toast.error("Seite konnte nicht gerendert werden.");
      setStep({ phase: "idle" });
    }
  };

  const save = () => {
    if (step.phase !== "vorschau") return;
    startSaving(async () => {
      try {
        const stamp = Date.now();
        const [imageUrl, pdfUrl] = await Promise.all([
          uploadFile(step.png, `etage-${etageId}-${stamp}.png`, "image/png", useBlobUpload),
          uploadFile(step.file, `etage-${etageId}-${stamp}.pdf`, "application/pdf", useBlobUpload),
        ]);
        const result = await saveFloorplan(etageId, {
          pdfUrl,
          imageUrl,
          width: step.width,
          height: step.height,
        });
        if (result && "error" in result) {
          toast.error(result.error);
          return;
        }
        toast.success("Floorplan gespeichert");
        setStep({ phase: "idle" });
        router.refresh();
      } catch (e) {
        console.error(e);
        toast.error(e instanceof Error ? e.message : "Upload fehlgeschlagen");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Floorplan-PDF hochladen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {step.phase === "idle" ? (
          <div
            className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center text-sm text-muted-foreground transition-colors",
              dragOver && "border-primary bg-accent/50"
            )}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) void handleFile(file);
            }}
          >
            <FileUp className="size-8" />
            <p>PDF hierher ziehen oder klicken zum Auswählen</p>
            <p className="text-xs">
              Das PDF wird im Browser in ein hochauflösendes Bild umgewandelt — nichts verlässt
              den Rechner, bevor du speicherst.
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.target.value = "";
              }}
            />
          </div>
        ) : null}

        {step.phase === "analysiere" || step.phase === "rendere" ? (
          <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {step.phase === "analysiere" ? "PDF wird gelesen…" : "Seite wird gerendert…"}
          </div>
        ) : null}

        {step.phase === "seitenwahl" ? (
          <div className="space-y-2">
            <p className="text-sm">
              Das PDF hat {step.info.numPages} Seiten — welche zeigt diese Etage?
            </p>
            <div className="flex flex-wrap gap-3">
              {step.info.previews.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => void renderPage(step.file, i + 1)}
                  className="rounded-md border p-1 transition-colors hover:border-primary"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Seite ${i + 1}`} className="h-40 w-auto" />
                  <span className="block py-1 text-center text-xs">Seite {i + 1}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step.phase === "vorschau" ? (
          <div className="space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={step.previewUrl}
              alt="Vorschau des gerenderten Plans"
              className="max-h-96 w-auto rounded-md border"
            />
            <p className="text-xs text-muted-foreground">
              {step.width} × {step.height} px
            </p>
            <div className="flex gap-2">
              <Button onClick={save} disabled={isSaving}>
                {isSaving ? "Wird hochgeladen…" : "Hochladen & speichern"}
              </Button>
              <Button variant="outline" onClick={() => setStep({ phase: "idle" })} disabled={isSaving}>
                Abbrechen
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
