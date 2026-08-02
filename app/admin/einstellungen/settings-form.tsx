"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { settingsSchema, type SettingsInput } from "@/lib/validation/settings";
import type { Settings } from "@/lib/db/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function SettingsForm({ settings }: { settings: Settings | null }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SettingsInput>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      adminNotificationEmail: settings?.adminNotificationEmail ?? "",
      senderEmail: settings?.senderEmail ?? "",
      senderName: settings?.senderName ?? "",
      orgName: settings?.orgName ?? "",
      orgAddress: settings?.orgAddress ?? "",
      contractFooterText: settings?.contractFooterText ?? "",
    },
  });

  async function onSubmit(values: SettingsInput) {
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error(data?.error ?? "Speichern fehlgeschlagen.");
      return;
    }
    toast.success("Einstellungen gespeichert.");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-xl">
      <div className="space-y-2">
        <Label htmlFor="adminNotificationEmail">Benachrichtigungs-E-Mail (Admin)</Label>
        <Input id="adminNotificationEmail" type="email" {...register("adminNotificationEmail")} />
        <p className="text-xs text-muted-foreground">
          Hierhin gehen alle neuen Anfragen aus dem öffentlichen Formular.
        </p>
        {errors.adminNotificationEmail ? (
          <p className="text-sm text-destructive">{errors.adminNotificationEmail.message}</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="senderEmail">Absender-E-Mail</Label>
          <Input id="senderEmail" type="email" {...register("senderEmail")} />
          <p className="text-xs text-muted-foreground">
            Muss eine bei Resend verifizierte Domain nutzen.
          </p>
          {errors.senderEmail ? (
            <p className="text-sm text-destructive">{errors.senderEmail.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="senderName">Absendername</Label>
          <Input id="senderName" {...register("senderName")} />
          {errors.senderName ? (
            <p className="text-sm text-destructive">{errors.senderName.message}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="orgName">Name der Organisation</Label>
        <Input id="orgName" {...register("orgName")} />
        {errors.orgName ? (
          <p className="text-sm text-destructive">{errors.orgName.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="orgAddress">Adresse (erscheint im Vertrag)</Label>
        <Textarea id="orgAddress" rows={2} {...register("orgAddress")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contractFooterText">Vertragstext / Bedingungen (optional)</Label>
        <Textarea id="contractFooterText" rows={5} {...register("contractFooterText")} />
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Speichern…" : "Speichern"}
      </Button>
    </form>
  );
}
