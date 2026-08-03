"use client";

import { Hand, MousePointer2, Pentagon, Save, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type EditorMode = "pan" | "rect" | "polygon" | "edit";

const MODES: { mode: EditorMode; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { mode: "pan", icon: Hand, label: "Bewegen" },
  { mode: "edit", icon: MousePointer2, label: "Auswählen" },
  { mode: "rect", icon: Square, label: "Rechteck" },
  { mode: "polygon", icon: Pentagon, label: "Polygon" },
];

export function EditorToolbar({
  mode,
  onModeChange,
  onSave,
  dirty,
  isSaving,
}: {
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  onSave: () => void;
  dirty: boolean;
  isSaving: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {MODES.map(({ mode: m, icon: Icon, label }) => (
          <Button
            key={m}
            type="button"
            variant="ghost"
            size="sm"
            className={cn(m === mode && "bg-background shadow-sm")}
            onClick={() => onModeChange(m)}
            title={label}
          >
            <Icon className="size-4" />
            <span className="hidden lg:inline">{label}</span>
          </Button>
        ))}
      </div>
      <Button type="button" size="sm" onClick={onSave} disabled={!dirty || isSaving}>
        <Save className="size-4" />
        {isSaving ? "Speichern…" : dirty ? "Speichern" : "Gespeichert"}
      </Button>
      <p className="w-full text-xs text-muted-foreground sm:w-auto">
        {mode === "rect"
          ? "Rechteck über einen Raum aufziehen"
          : mode === "polygon"
            ? "Ecken anklicken · Enter oder erster Punkt schließt · Esc bricht ab"
            : mode === "edit"
              ? "Form anklicken zum Bearbeiten · Entf löscht"
              : "Ziehen zum Verschieben, Scrollen zum Zoomen"}
      </p>
    </div>
  );
}
