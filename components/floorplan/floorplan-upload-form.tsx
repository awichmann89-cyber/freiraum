"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function FloorplanUploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/floorplans/upload", { method: "POST", body: formData });
    setUploading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error(data?.error ?? "Upload fehlgeschlagen.");
      return;
    }
    toast.success("Lageplan hochgeladen.");
    setFile(null);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="max-w-xs"
      />
      <Button disabled={!file || uploading} onClick={handleUpload}>
        {uploading ? "Wird hochgeladen…" : "Hochladen"}
      </Button>
    </div>
  );
}
