-- Rhythmus für wöchentliche Serien (1 = jede Woche, 2 = alle 2 Wochen, ...)
ALTER TABLE "AnfragePosten" ADD COLUMN "intervalWeeks" INTEGER;

ALTER TABLE "BuchungsSerie" ADD COLUMN "intervalWeeks" INTEGER NOT NULL DEFAULT 1;
