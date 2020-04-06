/*

please stop application first

*/

-- # step 1

DO $BODY$
BEGIN
  if exists(
    SELECT 1
    FROM information_schema.columns
    WHERE table_name='locations' and column_name='provider' and data_type='text'
    limit 1
  ) then

    ALTER TABLE public.locations ADD COLUMN provider_new JSONB;
    ALTER TABLE public.locations ADD COLUMN geofence_new JSONB;
    ALTER TABLE public.locations ADD COLUMN extras_new JSONB;
    ALTER TABLE public.locations ADD COLUMN data JSONB;

    update public.locations set provider_new = provider::jsonb;
    update public.locations set geofence_new = geofence::jsonb;
    update public.locations set extras_new = extras::jsonb;

    ALTER TABLE public.locations DROP COLUMN IF EXISTS provider;
    ALTER TABLE public.locations DROP COLUMN IF EXISTS geofence;
    ALTER TABLE public.locations DROP COLUMN IF EXISTS extras;

    ALTER TABLE public.locations RENAME COLUMN provider_new TO provider;
    ALTER TABLE public.locations RENAME COLUMN geofence_new TO geofence;
    ALTER TABLE public.locations RENAME COLUMN extras_new TO extras;

  end if;
END $BODY$ LANGUAGE plpgsql;

ALTER TABLE public.locations DROP COLUMN if exists company_token;
ALTER TABLE public.locations DROP COLUMN if exists device_model;

-- # step 2

DO $BODY$
BEGIN
  if exists(
    SELECT 1
    FROM information_schema.columns
    WHERE table_name='locations' and column_name='device_ref_id'
    limit 1
  ) then

    ALTER TABLE public.locations DROP COLUMN if exists device_id;
    ALTER TABLE public.locations RENAME COLUMN device_ref_id TO device_id;

  end if;
END $BODY$ LANGUAGE plpgsql;

-- # step 3

update public.locations l
  set data = to_jsonb(l)
where data is null;

ALTER TABLE public.locations DROP COLUMN if exists accuracy;
ALTER TABLE public.locations DROP COLUMN if exists altitude;
ALTER TABLE public.locations DROP COLUMN if exists speed;
ALTER TABLE public.locations DROP COLUMN if exists heading;
ALTER TABLE public.locations DROP COLUMN if exists odometer;
ALTER TABLE public.locations DROP COLUMN if exists event;
ALTER TABLE public.locations DROP COLUMN if exists activity_type;
ALTER TABLE public.locations DROP COLUMN if exists activity_confidence;
ALTER TABLE public.locations DROP COLUMN if exists battery_level;
ALTER TABLE public.locations DROP COLUMN if exists battery_is_charging;
ALTER TABLE public.locations DROP COLUMN if exists is_moving;
ALTER TABLE public.locations DROP COLUMN if exists geofence;
ALTER TABLE public.locations DROP COLUMN if exists provider;
ALTER TABLE public.locations DROP COLUMN if exists extras;

-- # step 4

ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone;
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS framework text;
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS version text;
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS uuid text;

update public.locations set uuid=data->>'uuid' where uuid is null;