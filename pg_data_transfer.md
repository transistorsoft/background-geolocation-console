Here is the same explanation in clean, ASCII-only markdown.

---

# Merging OLD (PostgreSQL 9.6) into NEW (PostgreSQL 18)

Yes, this is possible, and it is a standard "merge two databases with the same schema" job. But there is one crux that makes it more than a plain `pg_restore`:

You cannot just restore OLD into NEW, because both databases have `id` columns that start at 1. OLD's `companies.id = 5` and NEW's `companies.id = 5` are different companies. A naive load collides on every primary key, and even if it did not, it would scramble the foreign-key relationships (`locations.company_id`, `locations.device_id`).

The solution is id remapping: load OLD's rows but let NEW assign fresh ids, while keeping a translation table so the child rows (locations) get repointed correctly. Here is the whole approach.

## Step 0 - back up NEW first (non-negotiable)

You are about to mutate the database you want to keep. Snapshot it so a botched merge is recoverable:

```sh
pg_dump -Fc -d new_db > new_before_merge.dump
```

## Step 1 - get OLD's data into NEW as staging tables

CSV is the most robust transport across 9.6 to 18 (no `pg_dump` version concerns). On OLD:

```sql
\copy companies TO 'companies.csv' CSV HEADER
\copy devices   TO 'devices.csv'   CSV HEADER
\copy locations TO 'locations.csv' CSV HEADER
```

On NEW, create staging tables that mirror OLD (including OLD's `id`), and load:

```sql
CREATE TABLE companies_old (LIKE companies INCLUDING DEFAULTS);
CREATE TABLE devices_old   (LIKE devices   INCLUDING DEFAULTS);
CREATE TABLE locations_old (LIKE locations INCLUDING DEFAULTS);

\copy companies_old FROM 'companies.csv' CSV HEADER
\copy devices_old   FROM 'devices.csv'   CSV HEADER
\copy locations_old FROM 'locations.csv' CSV HEADER
```

Now you have both datasets side by side in NEW and can merge with plain SQL. Do the rest inside a transaction (`BEGIN; ...` and only `COMMIT` once you have verified counts) so you can `ROLLBACK` if anything looks wrong.

## Step 2 - merge parents first, building id-maps

The natural key for a company is `company_token` (one company per token), so we dedupe on it: tokens already in NEW map to the existing row; new tokens get inserted with a fresh id.

```sql
CREATE TEMP TABLE map_company (old_id int PRIMARY KEY, new_id int);

-- (a) companies that already exist in NEW: map old id to the existing new id
INSERT INTO map_company
SELECT o.id, n.id
FROM companies_old o
JOIN companies n ON n.company_token = o.company_token;

-- (b) companies new to NEW: insert (NEW assigns id), capture the mapping via the unique token
WITH ins AS (
  INSERT INTO companies (company_token, created_at, updated_at /*, ...other cols*/)
  SELECT o.company_token, o.created_at, o.updated_at
  FROM companies_old o
  WHERE NOT EXISTS (SELECT 1 FROM companies n WHERE n.company_token = o.company_token)
  RETURNING id, company_token
)
INSERT INTO map_company
SELECT o.id, ins.id
FROM ins JOIN companies_old o ON o.company_token = ins.company_token;
```

The `RETURNING ... company_token` then joining back to `companies_old` is the trick that lets you recover "which old id became which new id" without carrying the old ids over.

## Step 3 - devices, remapping company_id and deduping on the natural key

Devices are keyed by the tuple `(company_token, device_id, device_model, framework, version)` (per `FindOrCreateDevice`). Same two-part pattern, but the insert translates `company_id` through `map_company`:

```sql
CREATE TEMP TABLE map_device (old_id int PRIMARY KEY, new_id int);

-- already-present devices
INSERT INTO map_device
SELECT o.id, n.id
FROM devices_old o
JOIN devices n USING (company_token, device_id, device_model, framework, version);

WITH ins AS (
  INSERT INTO devices (company_id, company_token, device_id, device_model, framework, version, created_at, updated_at)
  SELECT mc.new_id, o.company_token, o.device_id, o.device_model, o.framework, o.version, o.created_at, o.updated_at
  FROM devices_old o
  JOIN map_company mc ON mc.old_id = o.company_id
  WHERE NOT EXISTS (
    SELECT 1 FROM devices n
    WHERE n.company_token = o.company_token
      AND n.device_id     = o.device_id
      AND n.device_model  = o.device_model
      AND n.framework     = o.framework
      AND n.version       = o.version)
  RETURNING id, company_token, device_id, device_model, framework, version
)
INSERT INTO map_device
SELECT o.id, ins.id
FROM ins JOIN devices_old o USING (company_token, device_id, device_model, framework, version);
```

(Note: `NOT EXISTS` cannot use `USING`, so it is written as a correlated subquery matching all five columns.)

## Step 4 - locations, remapping both FKs (the payoff)

Locations get brand-new ids (let the sequence assign), with `company_id` and `device_id` translated through the maps.

**Two things must be repaired during this insert, or the migrated rows arrive broken:**

1. **OLD's `data` is double-encoded JSON.** The legacy console stored the location payload as a *stringified* JSON value, so `data` is a JSONB **string scalar**, not an object. Copied verbatim, `data->>'uuid'`, `data->'coords'`, and every other key access return null on NEW, and only the Go read path (which un-stringifies as a fallback) can see inside it. Normalize it to a real object on the way in with `(o.data #>> '{}')::jsonb`.
2. **OLD's `uuid` column is empty.** The legacy console only kept the uuid *inside* the payload, never in the column. Copying `o.uuid` verbatim leaves NEW's `uuid` column null — and makes the `n.uuid = o.uuid` dedupe useless (every legacy row has `o.uuid IS NULL`, so re-running double-inserts everything). Derive the uuid from the (decoded) payload instead.

```sql
INSERT INTO locations (latitude, longitude, recorded_at, created_at, company_id, device_id, data, uuid)
SELECT o.latitude, o.longitude, o.recorded_at, o.created_at,
       mc.new_id, md.new_id,
       -- (1) normalize double-encoded payloads to real JSONB objects
       CASE WHEN jsonb_typeof(o.data) = 'string'
            THEN (o.data #>> '{}')::jsonb
            ELSE o.data END                                            AS data,
       -- (2) prefer the OLD column, else derive uuid from the decoded payload
       COALESCE(
         NULLIF(o.uuid, ''),
         CASE WHEN jsonb_typeof(o.data) = 'string'
              THEN (o.data #>> '{}')::jsonb ->> 'uuid'
              ELSE o.data ->> 'uuid' END
       )                                                               AS uuid
FROM locations_old o
JOIN map_company mc ON mc.old_id = o.company_id
JOIN map_device  md ON md.old_id = o.device_id
WHERE NOT EXISTS (
        SELECT 1 FROM locations n
        WHERE n.uuid = COALESCE(
          NULLIF(o.uuid, ''),
          CASE WHEN jsonb_typeof(o.data) = 'string'
               THEN (o.data #>> '{}')::jsonb ->> 'uuid'
               ELSE o.data ->> 'uuid' END)
      )
   OR COALESCE(
        NULLIF(o.uuid, ''),
        CASE WHEN jsonb_typeof(o.data) = 'string'
             THEN (o.data #>> '{}')::jsonb ->> 'uuid'
             ELSE o.data ->> 'uuid' END) IS NULL;
```

Note we omit `id` entirely so NEW's sequence assigns clean values: no collisions, and the sequence auto-advances, so nothing to reset afterward.

If you have **already** run the old (verbatim) version of this insert, repair the rows in place instead of re-importing — normalize then backfill:

```sql
-- normalize double-encoded payloads (repeat if any rows were multiply-stringified)
UPDATE locations
SET data = (data #>> '{}')::jsonb
WHERE jsonb_typeof(data) = 'string'
  AND left(ltrim(data #>> '{}'), 1) IN ('{', '[');

-- backfill the uuid column from the normalized payload
UPDATE locations
SET uuid = data ->> 'uuid'
WHERE (uuid IS NULL OR uuid = '')
  AND jsonb_typeof(data) = 'object'
  AND data ? 'uuid'
  AND (data ->> 'uuid') <> '';
```

## Step 5 - verify, then commit and clean up

```sql
SELECT count(*) FROM locations;     -- sanity-check the totals look right
-- if good:
COMMIT;
DROP TABLE companies_old, devices_old, locations_old;
```

## Important caveats

- Adjust every column list to your real schema. The lists above are inferred from earlier `\d` output. Double-check the actual FK columns (does `devices` carry `company_id`, `company_token`, or both?) before running.
- Dedupe decisions are yours. I assumed "same `company_token` = same company", "same 5-tuple = same device", and "same `uuid` = same location". Confirm those are the right notions of identity for your data before trusting the merge.
- Do not carry over any `id` values. That is the whole point. If you ever did, you would have to run `setval()` on every sequence past its new max afterward.
- pg_dump 18 to 9.6 alternative: PG 18's `pg_dump` can read a 9.6 server if you would rather not use CSV, but CSV-per-table into staging is simpler and sidesteps version edge cases, and your OLD is already minimized, so sizes are manageable.
- Run the whole Step 2 to Step 4 block in one transaction and verify counts before `COMMIT`.

## Summary

Yes, merge-with-preservation is very doable. The mental model is: load OLD into staging, re-insert with fresh ids while translating foreign keys through map tables, and dedupe on natural keys. NEW's existing data is never touched except to have OLD's rows appended alongside it.

If you paste `\d companies`, `\d devices`, and `\d locations` from NEW, I can write the merge script precisely instead of with inferred columns.
