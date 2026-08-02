"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { singleBookingSchema, type SingleBookingInput } from "@/lib/validation/booking";
import type { Room } from "@/lib/db/types";
import { RoomCheckboxGroup } from "@/components/booking/room-checkbox-group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function SingleBookingForm({ rooms }: { rooms: Room[] }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SingleBookingInput>({
    resolver: zodResolver(singleBookingSchema),
    defaultValues: {
      requesterName: "",
      requesterEmail: "",
      requesterPhone: "",
      message: "",
      roomIds: [],
      date: "",
      startTime: "",
      endTime: "",
    },
  });

  async function onSubmit(values: SingleBookingInput) {
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
    router.push("/anfrage/erfolg");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="requesterName">Name</Label>
          <Input id="requesterName" {...register("requesterName")} />
          {errors.requesterName ? (
            <p className="text-sm text-destructive">{errors.requesterName.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="requesterEmail">E-Mail</Label>
          <Input id="requesterEmail" type="email" {...register("requesterEmail")} />
          {errors.requesterEmail ? (
            <p className="text-sm text-destructive">{errors.requesterEmail.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="requesterPhone">Telefon (optional)</Label>
          <Input id="requesterPhone" {...register("requesterPhone")} />
        </div>
      </div>

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
        {isSubmitting ? "Wird gesendet…" : "Anfrage senden"}
      </Button>
    </form>
  );
}
