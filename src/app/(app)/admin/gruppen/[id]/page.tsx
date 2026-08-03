import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MailPlus, Pencil, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmButton } from "@/components/confirm-button";
import { GruppeDialog } from "../gruppe-dialog";
import { deleteUser, resendInvite, setGruppeActive, setUserActive } from "../gruppen-actions";
import { InviteForm } from "./invite-form";
import { AssignForm } from "./assign-form";

export const metadata: Metadata = { title: "Gruppe" };

export default async function GruppeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gruppe = await prisma.gruppe.findUnique({
    where: { id },
    include: { users: { orderBy: { name: "asc" } } },
  });
  if (!gruppe) notFound();

  const kandidaten = await prisma.user.findMany({
    where: { OR: [{ gruppeId: null }, { gruppeId: { not: id } }] },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      gruppe: { select: { name: true } },
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <span className="inline-block size-3.5 rounded-full" style={{ backgroundColor: gruppe.color }} />
          {gruppe.name}
          {!gruppe.isActive ? <Badge variant="outline">inaktiv</Badge> : null}
        </h1>
        <div className="flex gap-2">
          <GruppeDialog
            gruppe={{ id: gruppe.id, name: gruppe.name, color: gruppe.color, notiz: gruppe.notiz }}
            trigger={
              <Button variant="outline" size="sm">
                <Pencil className="size-4" /> Bearbeiten
              </Button>
            }
          />
          <ConfirmButton
            action={setGruppeActive.bind(null, gruppe.id, !gruppe.isActive)}
            confirmText={
              gruppe.isActive
                ? "Gruppe deaktivieren? Ihre Mitglieder können sich dann nicht mehr anmelden."
                : "Gruppe wieder aktivieren?"
            }
            variant="outline"
            successText={gruppe.isActive ? "Gruppe deaktiviert" : "Gruppe aktiviert"}
          >
            {gruppe.isActive ? "Deaktivieren" : "Aktivieren"}
          </ConfirmButton>
        </div>
      </div>

      {gruppe.notiz ? <p className="text-sm text-muted-foreground">{gruppe.notiz}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Neuen Zugang einladen</CardTitle>
        </CardHeader>
        <CardContent>
          <InviteForm gruppeId={gruppe.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bestehenden Zugang zuordnen</CardTitle>
        </CardHeader>
        <CardContent>
          <AssignForm
            gruppeId={gruppe.id}
            kandidaten={kandidaten.map((k) => ({
              id: k.id,
              name: k.name,
              email: k.email,
              gruppeName: k.gruppe?.name ?? null,
            }))}
          />
        </CardContent>
      </Card>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>E-Mail</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-32"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gruppe.users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Noch keine Zugänge.
                </TableCell>
              </TableRow>
            ) : (
              gruppe.users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    {!u.passwordHash ? (
                      <Badge variant="outline">eingeladen</Badge>
                    ) : u.isActive ? (
                      <Badge variant="secondary">aktiv</Badge>
                    ) : (
                      <Badge variant="outline">deaktiviert</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {!u.passwordHash ? (
                        <ConfirmButton
                          action={resendInvite.bind(null, u.id)}
                          confirmText={`Einladung erneut an ${u.email} senden?`}
                          successText="Einladung erneut verschickt"
                        >
                          <MailPlus className="size-4" />
                        </ConfirmButton>
                      ) : (
                        <ConfirmButton
                          action={setUserActive.bind(null, u.id, !u.isActive)}
                          confirmText={
                            u.isActive
                              ? `Zugang von ${u.name} deaktivieren?`
                              : `Zugang von ${u.name} wieder aktivieren?`
                          }
                          successText={u.isActive ? "Zugang deaktiviert" : "Zugang aktiviert"}
                        >
                          {u.isActive ? "Deaktivieren" : "Aktivieren"}
                        </ConfirmButton>
                      )}
                      <ConfirmButton
                        action={deleteUser.bind(null, u.id)}
                        confirmText={`Zugang von ${u.name} wirklich löschen?`}
                        successText="Zugang gelöscht"
                      >
                        <Trash2 className="size-4" />
                      </ConfirmButton>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
