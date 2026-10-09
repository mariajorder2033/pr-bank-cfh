-- Typo-tolerant product search (spec §3: Postgres search replaces Meilisearch).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "products_title_en_trgm_idx" ON "products" USING GIN (lower("titleEn") gin_trgm_ops);
