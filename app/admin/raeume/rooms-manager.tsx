"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { roomSchema, type RoomInput } from "@/lib/validation/room";
import type { Room } from "@/lib/db/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function RoomForm({
  room,
  onSaved,
  trigger,
}: {
  room?: Room;
  onSaved: () => void;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<RoomInput>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      name: room?.name ?? "",
      description: room?.description ?? "",
      capacity: room?.capacity ?? undefined,
      sortOrder: room?.sortOrder ?? 0,
      isActive: room?.isActive ?? true,
    },
  });

  async function onSubmit(values: RoomInput) {
    const endpoint = room ? `/api/rooms/${room.id}` : "/api/rooms";
    const method = room ? "PATCH" : "POST";
    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error(data?.error ?? "Speichern fehlgeschlagen.");
      return;
    }
    toast.success(room ? "Raum aktualisiert." : "Raum angelegt.");
    setOpen(false);
    reset();
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{room ? "Raum bearbeiten" : "Neuer Raum"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register("name")} />
            {errors.name ? (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Beschreibung</Label>
            <Textarea id="description" rows={3} {...register("description")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="capacity">Kapazität</Label>
              <Input
                id="capacity"
                type="number"
                min={1}
                {...register("capacity", {
                  setValueAs: (v) => (v === "" || v === null ? undefined : Number(v)),
                })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sortOrder">Reihenfolge</Label>
              <Input
                id="sortOrder"
                type="number"
                {...register("sortOrder", { setValueAs: (v) => (v === "" ? 0 : Number(v)) })}
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="isActive">Aktiv (im Anfrageformular sichtbar)</Label>
            <Switch
              id="isActive"
              checked={watch("isActive")}
              onCheckedChange={(checked) => setValue("isActive", checked)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Speichern…" : "Speichern"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RoomsManager({ initialRooms }: { initialRooms: Room[] }) {
  const router = useRouter();

  async function handleDelete(room: Room) {
    if (!confirm(`Raum "${room.name}" wirklich löschen?`)) return;
    const res = await fetch(`/api/rooms/${room.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error(data?.error ?? "Löschen fehlgeschlagen.");
      return;
    }
    toast.success("Raum gelöscht.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <RoomForm onSaved={() => router.refresh()} trigger={<Button>Neuer Raum</Button>} />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Kapazität</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialRooms.map((room) => (
            <TableRow key={room.id}>
              <TableCell className="font-medium">{room.name}</TableCell>
              <TableCell>{room.capacity ?? "–"}</TableCell>
              <TableCell>
                <Badge variant={room.isActive ? "default" : "secondary"}>
                  {room.isActive ? "Aktiv" : "Inaktiv"}
                </Badge>
              </TableCell>
              <TableCell className="text-right space-x-2">
                <RoomForm
                  room={room}
                  onSaved={() => router.refresh()}
                  trigger={
                    <Button variant="outline" size="sm">
                      Bearbeiten
                    </Button>
                  }
                />
                <Button variant="destructive" size="sm" onClick={() => handleDelete(room)}>
                  Löschen
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {initialRooms.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Noch keine Räume angelegt.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}
