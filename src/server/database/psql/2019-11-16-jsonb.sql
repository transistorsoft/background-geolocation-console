/*

please stop application first

*/


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