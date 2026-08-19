-- Equipment cleaning log schema.
-- Written to be safely re-runnable (used both for local setup and before test runs).

DO $$ BEGIN
  CREATE TYPE equipment_status AS ENUM ('active', 'retired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE cleaning_record_status AS ENUM ('pending', 'verified');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE audit_action AS ENUM ('create', 'update');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS equipment (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  code       TEXT NOT NULL UNIQUE,
  status     equipment_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cleaning_records (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  cleaned_by   TEXT NOT NULL,
  cleaned_at   TIMESTAMPTZ NOT NULL,
  method       TEXT NOT NULL,
  notes        TEXT,
  status       cleaning_record_status NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cleaning_records_equipment ON cleaning_records(equipment_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_records_equipment_status ON cleaning_records(equipment_id, status);

CREATE TABLE IF NOT EXISTS audit_logs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cleaning_record_id UUID NOT NULL REFERENCES cleaning_records(id) ON DELETE CASCADE,
  action             audit_action NOT NULL,
  changed_by         TEXT NOT NULL,
  changed_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  changes            JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON audit_logs(cleaning_record_id);

-- keep updated_at honest without relying on the application layer to set it
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS equipment_set_updated_at ON equipment;
CREATE TRIGGER equipment_set_updated_at
  BEFORE UPDATE ON equipment
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS cleaning_records_set_updated_at ON cleaning_records;
CREATE TRIGGER cleaning_records_set_updated_at
  BEFORE UPDATE ON cleaning_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
