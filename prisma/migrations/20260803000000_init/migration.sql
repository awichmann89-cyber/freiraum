-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'GRUPPE');

-- CreateEnum
CREATE TYPE "BuchungsArt" AS ENUM ('GRUPPE', 'VERMIETUNG');

-- CreateEnum
CREATE TYPE "BuchungsStatus" AS ENUM ('BESTAETIGT', 'STORNIERT');

-- CreateEnum
CREATE TYPE "AnfrageArt" AS ENUM ('EINZEL', 'WOECHENTLICH');

-- CreateEnum
CREATE TYPE "PostenStatus" AS ENUM ('ANGEFRAGT', 'BESTAETIGT', 'ABGELEHNT');

-- CreateEnum
CREATE TYPE "SerienStatus" AS ENUM ('AKTIV', 'BEENDET', 'STORNIERT');

-- CreateEnum
CREATE TYPE "VermietungsStatus" AS ENUM ('NEU', 'ABGELEHNT', 'VERTRAG_GESENDET', 'ABGELAUFEN', 'SIGNIERT', 'STORNIERT');

-- CreateEnum
CREATE TYPE "TokenZweck" AS ENUM ('EINLADUNG', 'PASSWORT_RESET', 'VERTRAG_SIGNATUR');

-- CreateEnum
CREATE TYPE "FormArt" AS ENUM ('RECHTECK', 'POLYGON');

-- CreateEnum
CREATE TYPE "PreisTyp" AS ENUM ('STUNDE', 'TAG');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'GRUPPE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "gruppeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gruppe" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#64748b',
    "notiz" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gruppe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Etage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "floorplanPdfUrl" TEXT,
    "floorplanImageUrl" TEXT,
    "floorplanImgWidth" INTEGER,
    "floorplanImgHeight" INTEGER,

    CONSTRAINT "Etage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Raum" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "etageId" TEXT NOT NULL,
    "sizeSqm" DECIMAL(6,1),
    "capacity" INTEGER,
    "priceHourly" DECIMAL(10,2),
    "priceDaily" DECIMAL(10,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Raum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaumForm" (
    "id" TEXT NOT NULL,
    "etageId" TEXT NOT NULL,
    "raumId" TEXT NOT NULL,
    "kind" "FormArt" NOT NULL DEFAULT 'POLYGON',
    "points" JSONB NOT NULL,

    CONSTRAINT "RaumForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuchungsAnfrage" (
    "id" TEXT NOT NULL,
    "gruppeId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "notiz" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "BuchungsAnfrage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnfragePosten" (
    "id" TEXT NOT NULL,
    "anfrageId" TEXT NOT NULL,
    "raumId" TEXT NOT NULL,
    "titel" TEXT NOT NULL,
    "art" "AnfrageArt" NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "weekday" INTEGER,
    "startTime" TEXT,
    "endTime" TEXT,
    "firstDate" DATE,
    "endDate" DATE,
    "status" "PostenStatus" NOT NULL DEFAULT 'ANGEFRAGT',
    "decidedAt" TIMESTAMP(3),
    "decidedById" TEXT,
    "rejectReason" TEXT,
    "serieId" TEXT,

    CONSTRAINT "AnfragePosten_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuchungsSerie" (
    "id" TEXT NOT NULL,
    "raumId" TEXT NOT NULL,
    "gruppeId" TEXT NOT NULL,
    "titel" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "firstDate" DATE NOT NULL,
    "endDate" DATE,
    "materializedUntil" DATE NOT NULL,
    "status" "SerienStatus" NOT NULL DEFAULT 'AKTIV',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuchungsSerie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Buchung" (
    "id" TEXT NOT NULL,
    "raumId" TEXT NOT NULL,
    "art" "BuchungsArt" NOT NULL,
    "status" "BuchungsStatus" NOT NULL DEFAULT 'BESTAETIGT',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "titel" TEXT NOT NULL,
    "gruppeId" TEXT,
    "serieId" TEXT,
    "anfragePostenId" TEXT,
    "vermietungId" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Buchung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vermietung" (
    "id" TEXT NOT NULL,
    "nummer" TEXT NOT NULL,
    "status" "VermietungsStatus" NOT NULL DEFAULT 'NEU',
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "organization" TEXT,
    "purpose" TEXT NOT NULL,
    "message" TEXT,
    "raumId" TEXT,
    "requestedStart" TIMESTAMP(3) NOT NULL,
    "requestedEnd" TIMESTAMP(3) NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "priceType" "PreisTyp",
    "basePrice" DECIMAL(10,2),
    "discountPercent" DECIMAL(5,2),
    "finalPrice" DECIMAL(10,2),
    "vorlageId" TEXT,
    "contractText" TEXT,
    "contractPdfUrl" TEXT,
    "signatureUrl" TEXT,
    "signedAt" TIMESTAMP(3),
    "signedName" TEXT,
    "signerIp" TEXT,
    "sentAt" TIMESTAMP(3),
    "declineReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vermietung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vertragsvorlage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vertragsvorlage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "ActionToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "purpose" "TokenZweck" NOT NULL,
    "userId" TEXT,
    "vermietungId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Gruppe_name_key" ON "Gruppe"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Etage_level_key" ON "Etage"("level");

-- CreateIndex
CREATE UNIQUE INDEX "Raum_etageId_name_key" ON "Raum"("etageId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "RaumForm_etageId_raumId_key" ON "RaumForm"("etageId", "raumId");

-- CreateIndex
CREATE INDEX "BuchungsAnfrage_gruppeId_createdAt_idx" ON "BuchungsAnfrage"("gruppeId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AnfragePosten_serieId_key" ON "AnfragePosten"("serieId");

-- CreateIndex
CREATE INDEX "AnfragePosten_anfrageId_idx" ON "AnfragePosten"("anfrageId");

-- CreateIndex
CREATE INDEX "AnfragePosten_raumId_status_idx" ON "AnfragePosten"("raumId", "status");

-- CreateIndex
CREATE INDEX "BuchungsSerie_status_materializedUntil_idx" ON "BuchungsSerie"("status", "materializedUntil");

-- CreateIndex
CREATE INDEX "Buchung_raumId_startsAt_idx" ON "Buchung"("raumId", "startsAt");

-- CreateIndex
CREATE INDEX "Buchung_startsAt_idx" ON "Buchung"("startsAt");

-- CreateIndex
CREATE INDEX "Buchung_serieId_idx" ON "Buchung"("serieId");

-- CreateIndex
CREATE INDEX "Buchung_gruppeId_startsAt_idx" ON "Buchung"("gruppeId", "startsAt");

-- CreateIndex
CREATE INDEX "Buchung_vermietungId_idx" ON "Buchung"("vermietungId");

-- CreateIndex
CREATE UNIQUE INDEX "Vermietung_nummer_key" ON "Vermietung"("nummer");

-- CreateIndex
CREATE INDEX "Vermietung_status_createdAt_idx" ON "Vermietung"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Vertragsvorlage_name_key" ON "Vertragsvorlage"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ActionToken_tokenHash_key" ON "ActionToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ActionToken_userId_idx" ON "ActionToken"("userId");

-- CreateIndex
CREATE INDEX "ActionToken_vermietungId_idx" ON "ActionToken"("vermietungId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_gruppeId_fkey" FOREIGN KEY ("gruppeId") REFERENCES "Gruppe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Raum" ADD CONSTRAINT "Raum_etageId_fkey" FOREIGN KEY ("etageId") REFERENCES "Etage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaumForm" ADD CONSTRAINT "RaumForm_etageId_fkey" FOREIGN KEY ("etageId") REFERENCES "Etage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaumForm" ADD CONSTRAINT "RaumForm_raumId_fkey" FOREIGN KEY ("raumId") REFERENCES "Raum"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuchungsAnfrage" ADD CONSTRAINT "BuchungsAnfrage_gruppeId_fkey" FOREIGN KEY ("gruppeId") REFERENCES "Gruppe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuchungsAnfrage" ADD CONSTRAINT "BuchungsAnfrage_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnfragePosten" ADD CONSTRAINT "AnfragePosten_anfrageId_fkey" FOREIGN KEY ("anfrageId") REFERENCES "BuchungsAnfrage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnfragePosten" ADD CONSTRAINT "AnfragePosten_raumId_fkey" FOREIGN KEY ("raumId") REFERENCES "Raum"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnfragePosten" ADD CONSTRAINT "AnfragePosten_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnfragePosten" ADD CONSTRAINT "AnfragePosten_serieId_fkey" FOREIGN KEY ("serieId") REFERENCES "BuchungsSerie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuchungsSerie" ADD CONSTRAINT "BuchungsSerie_raumId_fkey" FOREIGN KEY ("raumId") REFERENCES "Raum"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuchungsSerie" ADD CONSTRAINT "BuchungsSerie_gruppeId_fkey" FOREIGN KEY ("gruppeId") REFERENCES "Gruppe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Buchung" ADD CONSTRAINT "Buchung_raumId_fkey" FOREIGN KEY ("raumId") REFERENCES "Raum"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Buchung" ADD CONSTRAINT "Buchung_gruppeId_fkey" FOREIGN KEY ("gruppeId") REFERENCES "Gruppe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Buchung" ADD CONSTRAINT "Buchung_serieId_fkey" FOREIGN KEY ("serieId") REFERENCES "BuchungsSerie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Buchung" ADD CONSTRAINT "Buchung_anfragePostenId_fkey" FOREIGN KEY ("anfragePostenId") REFERENCES "AnfragePosten"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Buchung" ADD CONSTRAINT "Buchung_vermietungId_fkey" FOREIGN KEY ("vermietungId") REFERENCES "Vermietung"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vermietung" ADD CONSTRAINT "Vermietung_raumId_fkey" FOREIGN KEY ("raumId") REFERENCES "Raum"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vermietung" ADD CONSTRAINT "Vermietung_vorlageId_fkey" FOREIGN KEY ("vorlageId") REFERENCES "Vertragsvorlage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionToken" ADD CONSTRAINT "ActionToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionToken" ADD CONSTRAINT "ActionToken_vermietungId_fkey" FOREIGN KEY ("vermietungId") REFERENCES "Vermietung"("id") ON DELETE CASCADE ON UPDATE CASCADE;

