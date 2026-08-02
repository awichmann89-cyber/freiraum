"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createGroupSchema, type CreateGroupInput } from "@/lib/validation/group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface SafeGroupUser {
  id: string;
  email: string;
  displayName: string;
  isActive: boolean;
  mustChangePassword: boolean;
}

function CreateGroupDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateGroupInput>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: { email: "", displayName: "", password: "" },
  });

  async function onSubmit(values: CreateGroupInput) {
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error(data?.error ?? "Anlegen fehlgeschlagen.");
      return;
    }
    toast.success("Gruppen-Account angelegt. Bitte Zugangsdaten manuell weitergeben.");
    setOpen(false);
    reset();
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Neue Gruppe</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neue Gruppe anlegen</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Name der Gruppe</Label>
            <Input id="displayName" {...register("displayName")} />
            {errors.displayName ? (
              <p className="text-sm text-destructive">{errors.displayName.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail (Login)</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email ? <p className="text-sm text-destructive">{errors.email.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Initiales Passwort</Label>
            <Input id="password" type="text" {...register("password")} />
            {errors.password ? (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Die Gruppe muss dieses Passwort beim ersten Login ändern.
            </p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Anlegen…" : "Anlegen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({ groupId }: { groupId: string }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (password.length < 8) {
      toast.error("Mindestens 8 Zeichen.");
      return;
    }
    setSubmitting(true);
    const res = await fetch(`/api/groups/${groupId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error("Zurücksetzen fehlgeschlagen.");
      return;
    }
    toast.success("Passwort zurückgesetzt. Bitte neu weitergeben.");
    setOpen(false);
    setPassword("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm">Passwort zurücksetzen</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Passwort zurücksetzen</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">Neues Passwort</Label>
            <Input
              id="newPassword"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? "Speichern…" : "Speichern"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function GroupsManager({ initialGroups }: { initialGroups: SafeGroupUser[] }) {
  const router = useRouter();

  async function toggleActive(group: SafeGroupUser) {
    const res = await fetch(`/api/groups/${group.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !group.isActive }),
    });
    if (!res.ok) {
      toast.error("Aktualisieren fehlgeschlagen.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CreateGroupDialog onCreated={() => router.refresh()} />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>E-Mail</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialGroups.map((group) => (
            <TableRow key={group.id}>
              <TableCell className="font-medium">{group.displayName}</TableCell>
              <TableCell>{group.email}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Switch checked={group.isActive} onCheckedChange={() => toggleActive(group)} />
                  {group.mustChangePassword ? (
                    <Badge variant="secondary">Passwort ausstehend</Badge>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <ResetPasswordDialog groupId={group.id} />
              </TableCell>
            </TableRow>
          ))}
          {initialGroups.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Noch keine Gruppen angelegt.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}
