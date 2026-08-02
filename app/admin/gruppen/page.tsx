import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { GroupsManager } from "./groups-manager";

export default async function AdminGruppenPage() {
  const groups = await db
    .select()
    .from(users)
    .where(eq(users.role, "group"))
    .orderBy(asc(users.displayName));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Gruppen</h1>
        <p className="text-muted-foreground">
          Accounts für wiederkehrende Gruppen anlegen und verwalten.
        </p>
      </div>
      <GroupsManager initialGroups={groups.map(({ passwordHash, ...rest }) => rest)} />
    </div>
  );
}
