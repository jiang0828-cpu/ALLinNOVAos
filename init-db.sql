-- Create user if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'nova') THEN
    CREATE ROLE nova WITH LOGIN PASSWORD 'nova';
  END IF;
END
$$;

-- Create database
CREATE DATABASE nova_os OWNER nova;

-- Grant full privileges
GRANT ALL PRIVILEGES ON DATABASE nova_os TO nova;
