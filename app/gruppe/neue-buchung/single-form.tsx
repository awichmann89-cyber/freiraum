"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { groupSingleBookingSchema, type GroupSingleBookingInput } from "@/lib/validation/booking";
import type { Room } from "@/lib/db/types";
import { RoomCheckboxGroup } from "@/components/booking/room-checkbox-group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function GruppeSingleBookingForm({ rooms }: { rooms: Room[] }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<GroupSingleBookingInput>({
    resolver: zodResolver(groupSingleBookingSchema),
    defaultValues: { roomIds: [], date: "", startTime: "", endTime: "", message: "" },
  });

  async function onSubmit(values: GroupSingleBookingInput) {
    setServerError(null);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setServerError(
        typeof data?.error === "string" ? data.error : "Anfrage konnte nicht gesendet werden."
      );
      return;
    }
    router.push("/gruppe?erfolg=1");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label>Gewünschte Räume</Label>
        <Controller
          name="roomIds"
          control={control}
          render={({ field }) => (
            <RoomCheckboxGroup rooms={rooms} value={field.value} onChange={field.onChange} />
          )}
        />
        {errors.roomIds ? (
          <p className="text-sm text-destructive">{errors.roomIds.message}</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="date">Datum</Label>
          <Input id="date" type="date" {...register("date")} />
          {errors.date ? <p className="text-sm text-destructive">{errors.date.message}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="startTime">Startzeit</Label>
          <Input id="startTime" type="time" {...register("startTime")} />
          {errors.startTime ? (
            <p className="text-sm text-destructive">{errors.startTime.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime">Endzeit</Label>
          <Input id="endTime" type="time" {...register("endTime")} />
          {errors.endTime ? (
            <p className="text-sm text-destructive">{errors.endTime.message}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Nachricht (optional)</Label>
        <Textarea id="message" rows={4} {...register("message")} />
      </div>

      {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Wird gesendet…" : "Buchung anfragen"}
      </Button>
    </form>
  );
}
