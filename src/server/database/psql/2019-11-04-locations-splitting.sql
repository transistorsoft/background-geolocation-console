/*

please stop application first

*/


CREATE SEQUENCE if not exists public.devices_id_seq;
CREATE SEQUENCE if not exists public.companies_id_seq;

ALTER SEQUENCE public.devices_id_seq OWNER TO main;
ALTER SEQUENCE public.companies_id_seq OWNER TO main;

CREATE TABLE IF NOT EXISTS public.companies
(
  id integer NOT NULL DEFAULT nextval('companies_id_seq'::regclass),
  company_token text,
  created_at timestamp with time zone,
  CONSTRAINT companies_pkey PRIMARY KEY (id)
) WITH (
  OIDS=FALSE
);
ALTER TABLE public.companies
  OWNER TO main;
GRANT ALL ON TABLE public.companies TO main;
GRANT ALL ON TABLE public.companies TO dev;

CREATE TABLE IF NOT EXISTS public.devices
(
  id integer NOT NULL DEFAULT nextval('devices_id_seq'::regclass),
  company_id integer,
  company_token text,
  device_id text,
  device_model text,
  created_at timestamp with time zone,
  CONSTRAINT devices_pkey PRIMARY KEY (id),
  CONSTRAINT devices_company_id_fkey FOREIGN KEY (company_id)
      REFERENCES public.companies (id) MATCH SIMPLE
      ON UPDATE CASCADE ON DELETE CASCADE
)
WITH (
  OIDS=FALSE
);
ALTER TABLE public.devices OWNER TO main;
GRANT ALL ON TABLE public.devices TO main;
GRANT ALL ON TABLE public.devices TO dev;

DROP INDEX IF EXISTS devices_company_id;

CREATE INDEX devices_company_id ON public.devices
  USING btree (company_id);

DROP INDEX IF EXISTS devices_company_token;
CREATE INDEX devices_company_token
  ON public.devices USING btree (company_token COLLATE pg_catalog."default");

DROP INDEX IF EXISTS devices_device_id;
CREATE INDEX devices_device_id ON public.devices
  USING btree (device_id COLLATE pg_catalog."default");

ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS "company_id" INTEGER;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS "device_ref_id" INTEGER;

ALTER TABLE public.locations DROP CONSTRAINT IF EXISTS locations_devices_id_fkey;

ALTER TABLE public.locations DROP CONSTRAINT IF EXISTS locations_companies_id_fkey;
ALTER TABLE public.locations ADD CONSTRAINT locations_companies_id_fkey FOREIGN KEY (company_id)
      REFERENCES public.companies (id) MATCH SIMPLE
      ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.locations ADD CONSTRAINT locations_devices_id_fkey FOREIGN KEY (device_ref_id)
      REFERENCES public.devices (id) MATCH SIMPLE
      ON UPDATE CASCADE ON DELETE CASCADE;


DO $BODY$
BEGIN
  if not exists(select 1 from public.companies limit 1) then

    insert into public.companies (company_token, created_at)
    select company_token, min(created_at) as created_at
      from public.locations
     where company_id is null
       and company_token is not null
    group by company_token;

  end if;

  if not exists(select 1 from public.locations where company_id is not null limit 1) then

    with comps as (
	    select id, company_token from public.companies
    )
    update public.locations l
       set company_id = c.id
    from comps c
    where c.company_token=l.company_token
      and l.company_id is null
      and l.company_token is not null;

  end if;

END $BODY$ LANGUAGE plpgsql;

DO $BODY2$
DECLARE
  _count int;
  _iterator int := 0;
  _step int := 100000;
BEGIN
  --  4125400
  -- 29718808
  _count := max(id)
    from public.locations
  where device_ref_id is null;

  WHILE _iterator < _count LOOP

    WITH loc_comp_data as (
      select company_id, device_id, device_model, company_token, device_ref_id
        from public.locations
      where
         id between _iterator and _iterator + _step
        and device_ref_id is null
        and company_id is not null
      order by id
      FOR UPDATE SKIP LOCKED
    ),
    comp_data as (
      select company_id, device_id, device_model, company_token
      from loc_comp_data
      group by company_id, device_id, device_model, company_token
    )
    insert into public.devices as d (company_id, device_id, device_model, company_token)
    select cd.company_id, cd.device_id, cd.device_model, cd.company_token
      from comp_data cd
      where not exists (
        select 1
          from public.devices dd
          where dd.company_id = cd.company_id
            and dd.device_id = cd.device_id
      );

    update public.locations l
       set device_ref_id = d.id
      from public.devices d
    where l.id between _iterator and _iterator + _step
      and l.device_ref_id is null
      and l.company_id = d.company_id
      and l.device_id = d.device_id;

    _iterator := _iterator + _step;

  END LOOP;

 END $BODY2$ LANGUAGE plpgsql;
