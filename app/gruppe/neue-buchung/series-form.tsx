"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { groupSeriesBookingSchema, type GroupSeriesBookingInput } from "@/lib/validation/booking";
import type { Room } from "@/lib/db/types";
import { RoomCheckboxGroup } from "@/components/booking/room-checkbox-group";
import { WeekdayPicker } from "@/components/booking/weekday-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export function GruppeSeriesBookingForm({ rooms }: { rooms: Room[] }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<GroupSeriesBookingInput>({
    resolver: zodResolver(groupSeriesBookingSchema),
    defaultValues: {
      roomIds: [],
      startTime: "",
      endTime: "",
      seriesStartDate: "",
      message: "",
      recurrence: {
        frequency: "WEEKLY",
        interval: 1,
        byWeekday: [],
        endType: "on_date",
        endDate: "",
        count: undefined,
      },
    },
  });

  const frequency = watch("recurrence.frequency");
  const endType = watch("recurrence.endType");

  async function onSubmit(values: GroupSeriesBookingInput) {
    setServerError(null);
    const res = await fetch("/api/series", {
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
          <Label htmlFor="seriesStartDate">Erster Termin</Label>
          <Input id="seriesStartDate" type="date" {...register("seriesStartDate")} />
          {errors.seriesStartDate ? (
            <p className="text-sm text-destructive">{errors.seriesStartDate.message}</p>
          ) : null}
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

      <div className="space-y-4 rounded-md border p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Häufigkeit</Label>
            <Controller
              name="recurrence.frequency"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">Täglich</SelectItem>
                    <SelectItem value="WEEKLY">Wöchentlich</SelectItem>
                    <SelectItem value="MONTHLY">Monatlich</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="interval">
              Alle wie viele{" "}
              {frequency === "DAILY" ? "Tage" : frequency === "MONTHLY" ? "Monate" : "Wochen"}
            </Label>
            <Input
              id="interval"
              type="number"
              min={1}
              max={52}
              {...register("recurrence.interval", { setValueAs: (v) => (v === "" ? 1 : Number(v)) })}
            />
          </div>
        </div>

        {frequency === "WEEKLY" ? (
          <div className="space-y-2">
            <Label>Wochentage</Label>
            <Controller
              name="recurrence.byWeekday"
              control={control}
              render={({ field }) => (
                <WeekdayPicker value={field.value ?? []} onChange={field.onChange} />
              )}
            />
            {errors.recurrence?.byWeekday ? (
              <p className="text-sm text-destructive">{errors.recurrence.byWeekday.message}</p>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-2">
          <Label>Ende der Serie</Label>
          <Controller
            name="recurrence.endType"
            control={control}
            render={({ field }) => (
              <RadioGroup value={field.value} onValueChange={field.onChange} className="gap-3">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="on_date" id="g-endType-date" />
                  <Label htmlFor="g-endType-date" className="font-normal">
                    an einem bestimmten Datum
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="after_count" id="g-endType-count" />
                  <Label htmlFor="g-endType-count" className="font-normal">
                    nach einer Anzahl von Terminen
                  </Label>
                </div>
              </RadioGroup>
            )}
          />
        </div>

        {endType === "on_date" ? (
          <div className="space-y-2 sm:w-64">
            <Label htmlFor="endDate">Enddatum</Label>
            <Input id="endDate" type="date" {...register("recurrence.endDate")} />
            {errors.recurrence?.endDate ? (
              <p className="text-sm text-destructive">{errors.recurrence.endDate.message}</p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-2 sm:w-64">
            <Label htmlFor="count">Anzahl Termine</Label>
            <Input
              id="count"
              type="number"
              min={1}
              max={200}
              {...register("recurrence.count", {
                setValueAs: (v) => (v === "" ? undefined : Number(v)),
              })}
            />
            {errors.recurrence?.count ? (
              <p className="text-sm text-destructive">{errors.recurrence.count.message}</p>
            ) : null}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Aus Planungsgründen werden Serien auf maximal 2 Jahre bzw. 200 Termine begrenzt.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Nachricht (optional)</Label>
        <Textarea id="message" rows={4} {...register("message")} />
      </div>

      {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Wird gesendet…" : "Serienbuchung anfragen"}
      </Button>
    </form>
  );
}
