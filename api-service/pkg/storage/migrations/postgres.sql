CREATE TABLE IF NOT EXISTS public.companies (
    id SERIAL PRIMARY KEY,
    company_token TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    banned BOOLEAN NOT NULL DEFAULT FALSE,
    banned_at TIMESTAMPTZ,
    banned_reason TEXT
);

CREATE TABLE IF NOT EXISTS public.devices (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE,
    company_token TEXT,
    device_id TEXT,
    device_model TEXT,
    created_at TIMESTAMPTZ,
    framework TEXT,
    version TEXT,
    updated_at TIMESTAMPTZ,
    banned BOOLEAN NOT NULL DEFAULT FALSE,
    banned_at TIMESTAMPTZ,
    banned_reason TEXT
);

CREATE TABLE IF NOT EXISTS public.locations (
    id SERIAL PRIMARY KEY,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    recorded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    company_id INTEGER REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE,
    device_id INTEGER REFERENCES public.devices(id) ON UPDATE CASCADE ON DELETE CASCADE,
    data JSONB,
    uuid TEXT
);

CREATE INDEX IF NOT EXISTS devices_company_id ON public.devices (company_id);
CREATE INDEX IF NOT EXISTS devices_company_token ON public.devices (company_token);
CREATE INDEX IF NOT EXISTS devices_device_id ON public.devices (device_id);
CREATE UNIQUE INDEX IF NOT EXISTS devices_company_fingerprint ON public.devices (company_token, device_id, device_model, framework, version);
CREATE INDEX IF NOT EXISTS locations_company_id_device_id_recorded_at ON public.locations (company_id, device_id, recorded_at);
CREATE INDEX IF NOT EXISTS locations_device_id ON public.locations (device_id);
CREATE INDEX IF NOT EXISTS locations_recorded_at ON public.locations (recorded_at);
CREATE INDEX IF NOT EXISTS locations_uuid ON public.locations (uuid);
CREATE INDEX IF NOT EXISTS companies_banned ON public.companies (banned);
CREATE INDEX IF NOT EXISTS devices_banned ON public.devices (banned);
