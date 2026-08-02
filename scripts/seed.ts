import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { settings, users } from "../lib/db/schema";

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error(
      "SEED_ADMIN_EMAIL und SEED_ADMIN_PASSWORD müssen gesetzt sein (siehe .env.example)."
    );
  }

  const [existingAdmin] = await db
    .select()
    .from(users)
    .where(eq(users.email, adminEmail.toLowerCase().trim()))
    .limit(1);

  if (existingAdmin) {
    console.log(`Admin-Konto existiert bereits: ${adminEmail}`);
  } else {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await db.insert(users).values({
      email: adminEmail.toLowerCase().trim(),
      passwordHash,
      role: "admin",
      displayName: "Administrator",
      mustChangePassword: true,
    });
    console.log(`Admin-Konto angelegt: ${adminEmail}`);
  }

  const [existingSettings] = await db
    .select()
    .from(settings)
    .where(eq(settings.id, 1))
    .limit(1);

  if (existingSettings) {
    console.log("Einstellungen existieren bereits, überspringe.");
  } else {
    await db.insert(settings).values({
      id: 1,
      adminNotificationEmail: adminEmail.toLowerCase().trim(),
      senderEmail: process.env.EMAIL_FROM ?? "no-reply@example.org",
      senderName: "Freiraum",
      orgName: "Freiraum",
    });
    console.log("Initiale Einstellungen angelegt.");
  }

  console.log("Seed abgeschlossen.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
