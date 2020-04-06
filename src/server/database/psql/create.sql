-- please create DB
--
-- CREATE DATABASE geolocation;
-- \connect geolocation

CREATE TABLE if not exists public.companies (
    id integer NOT NULL,
    company_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


CREATE SEQUENCE if not exists public.companies_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.companies_id_seq OWNED BY public.companies.id;

CREATE TABLE if not exists public.devices (
    id integer NOT NULL,
    company_id integer,
    company_token text,
    device_id text,
    device_model text,
    created_at timestamp with time zone,
    framework text,
    version text,
    updated_at timestamp with time zone
);


CREATE SEQUENCE if not exists public.devices_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE public.devices_id_seq OWNED BY public.devices.id;

CREATE SEQUENCE if not exists public.locations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE if not exists public.locations (
    id integer DEFAULT nextval('public.locations_id_seq'::regclass) NOT NULL,
    latitude double precision,
    longitude double precision,
    recorded_at timestamp with time zone,
    created_at timestamp with time zone,
    company_id integer,
    device_id integer,
    data jsonb,
    uuid text
);


ALTER TABLE ONLY public.companies ALTER COLUMN id SET DEFAULT nextval('public.companies_id_seq'::regclass);
ALTER TABLE ONLY public.devices ALTER COLUMN id SET DEFAULT nextval('public.devices_id_seq'::regclass);

DO $$
BEGIN

  BEGIN
    ALTER TABLE ONLY public.companies ADD CONSTRAINT companies_pkey PRIMARY KEY (id);
  EXCEPTION
    WHEN others THEN RAISE NOTICE 'Table constraint public.companies already exists';
  END;

END $$;


DO $$
BEGIN

  BEGIN
    ALTER TABLE ONLY public.devices ADD CONSTRAINT devices_pkey PRIMARY KEY (id);
  EXCEPTION
    WHEN others THEN RAISE NOTICE 'Table constraint public.devices already exists';
  END;

END $$;


DO $$
BEGIN

  BEGIN
    ALTER TABLE ONLY public.locations ADD CONSTRAINT locations_pkey PRIMARY KEY (id);
  EXCEPTION
    WHEN others THEN RAISE NOTICE 'Table constraint public.locations already exists';
  END;

END $$;



CREATE INDEX if not exists devices_company_id ON public.devices USING btree (company_id);
CREATE INDEX if not exists devices_company_token ON public.devices USING btree (company_token);
CREATE INDEX if not exists devices_device_id ON public.devices USING btree (device_id);
CREATE INDEX if not exists locations_company_id_device_id_recorded_at ON public.locations USING btree (company_id, device_id, recorded_at);
CREATE INDEX if not exists locations_company_id_device_ref_id_recorded_at ON public.locations USING btree (company_id, device_id, recorded_at);
CREATE INDEX if not exists locations_device_id ON public.locations USING btree (device_id);
CREATE INDEX if not exists locations_recorded_at ON public.locations USING btree (recorded_at);

DO $$
BEGIN

  BEGIN
    ALTER TABLE ONLY public.devices
       ADD CONSTRAINT devices_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;
  EXCEPTION
    WHEN others THEN RAISE NOTICE 'Table fk constraint public.devices already exists';
  END;

END $$;

DO $$
BEGIN

  BEGIN
	ALTER TABLE ONLY public.locations
       ADD CONSTRAINT locations_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;
  EXCEPTION
    WHEN others THEN RAISE NOTICE 'Table fk constraint public.locations:company already exists';
  END;

END $$;


DO $$
BEGIN

  BEGIN
    ALTER TABLE ONLY public.locations
       ADD CONSTRAINT locations_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id) ON UPDATE CASCADE ON DELETE CASCADE;
  EXCEPTION
    WHEN others THEN RAISE NOTICE 'Table fk constraint public.locations:device already exists';
  END;

END $$;


GRANT SELECT,USAGE ON SEQUENCE public.companies_id_seq TO main;
GRANT SELECT,USAGE ON SEQUENCE public.devices_id_seq TO main;
GRANT SELECT,USAGE ON SEQUENCE public.locations_id_seq TO main;
