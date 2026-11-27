#!/usr/bin/env bash
# Levanta un Supabase local (Postgres + Auth + REST + Storage + Realtime) y el gateway en :54321.
# Uso: bash dev/stack.sh        (desde la carpeta organizador/)
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f dev/.env.local-stack ] || node dev/keys.mjs > dev/.env.local-stack
set -a; source dev/.env.local-stack; set +a

docker network create orgnet >/dev/null 2>&1 || true
docker rm -f orgdb orgauth orgrest orgstorage orgrt >/dev/null 2>&1 || true

docker run -d --name orgdb --network orgnet -p 54322:5432 -e POSTGRES_PASSWORD=postgres supabase/postgres:15.8.1.085 >/dev/null
until PGPASSWORD=postgres psql -h localhost -p 54322 -U supabase_admin -d postgres -c 'select 1' >/dev/null 2>&1; do sleep 2; done
PGPASSWORD=postgres psql -h localhost -p 54322 -U supabase_admin -d postgres -q -c \
  "alter user authenticator with password 'postgres'; alter user supabase_auth_admin with password 'postgres'; alter user supabase_storage_admin with password 'postgres'; create schema if not exists _realtime; alter schema _realtime owner to supabase_admin;"

docker run -d --name orgauth --network orgnet -p 9999:9999 \
 -e GOTRUE_API_HOST=0.0.0.0 -e GOTRUE_API_PORT=9999 -e API_EXTERNAL_URL=http://localhost:54321 \
 -e GOTRUE_DB_DRIVER=postgres -e GOTRUE_DB_DATABASE_URL="postgres://supabase_auth_admin:postgres@orgdb:5432/postgres" \
 -e GOTRUE_SITE_URL=http://localhost:5173 -e GOTRUE_URI_ALLOW_LIST="*" -e GOTRUE_DISABLE_SIGNUP=false \
 -e GOTRUE_JWT_ADMIN_ROLES=service_role -e GOTRUE_JWT_AUD=authenticated -e GOTRUE_JWT_EXP=3600 -e GOTRUE_JWT_SECRET="$JWT_SECRET" \
 -e GOTRUE_EXTERNAL_EMAIL_ENABLED=true -e GOTRUE_MAILER_AUTOCONFIRM=true \
 -e GOTRUE_SMTP_ADMIN_EMAIL=admin@example.com -e GOTRUE_SMTP_HOST=localhost -e GOTRUE_SMTP_PORT=2500 \
 supabase/gotrue:v2.177.0 >/dev/null
# esperar a que Auth cree su esquema antes de las migraciones (usan auth.users)
until PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -tAc "select to_regclass('auth.users') is not null and exists(select 1 from auth.schema_migrations)" 2>/dev/null | grep -q t; do sleep 2; done
sleep 3

docker run -d --name orgrest --network orgnet -p 3000:3000 \
 -e PGRST_DB_URI="postgres://authenticator:postgres@orgdb:5432/postgres" -e PGRST_DB_SCHEMAS=public,storage,graphql_public \
 -e PGRST_DB_ANON_ROLE=anon -e PGRST_JWT_SECRET="$JWT_SECRET" -e PGRST_DB_USE_LEGACY_GUCS=false \
 postgrest/postgrest:v12.2.12 >/dev/null

docker run -d --name orgstorage --network orgnet -p 5000:5000 \
 -e ANON_KEY="$ANON_KEY" -e SERVICE_KEY="$SERVICE_KEY" -e POSTGREST_URL=http://orgrest:3000 -e PGRST_JWT_SECRET="$JWT_SECRET" \
 -e DATABASE_URL="postgres://supabase_storage_admin:postgres@orgdb:5432/postgres" -e FILE_SIZE_LIMIT=52428800 \
 -e STORAGE_BACKEND=file -e FILE_STORAGE_BACKEND_PATH=/var/lib/storage -e TENANT_ID=stub -e REGION=stub -e GLOBAL_S3_BUCKET=stub \
 -e ENABLE_IMAGE_TRANSFORMATION=false supabase/storage-api:v1.25.7 >/dev/null
until PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -tAc "select to_regclass('storage.buckets') is not null" 2>/dev/null | grep -q t; do sleep 2; done
sleep 2

for f in supabase/migrations/*.sql; do
  PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -q -v ON_ERROR_STOP=1 -f "$f" 2>&1 | grep -v NOTICE || true
done

# Realtime necesita IPv4 en este entorno
docker run --rm --entrypoint cat supabase/realtime:v2.34.47 /app/releases/2.34.47/runtime.exs > dev/rt-runtime.exs
sed -i '97s/\[:inet6\]/[:inet]/' dev/rt-runtime.exs
docker run -d --name orgrt --network orgnet -p 4000:4000 -v "$PWD/dev/rt-runtime.exs:/app/releases/2.34.47/runtime.exs:ro" \
 -e PORT=4000 -e DB_HOST=orgdb -e DB_PORT=5432 -e DB_USER=supabase_admin -e DB_PASSWORD=postgres -e DB_NAME=postgres -e DB_IP_VERSION=ipv4 \
 -e DB_AFTER_CONNECT_QUERY='SET search_path TO _realtime' -e DB_ENC_KEY=supabaserealtime -e API_JWT_SECRET="$JWT_SECRET" \
 -e SECRET_KEY_BASE=UpNVntn3cDxHJpq99YMc1T1AQgQpc8kfYTuRgBiYa15BLrx8etQoXz3gZv1/u2oq -e ERL_AFLAGS="-proto_dist inet_tcp" -e DNS_NODES="''" \
 -e RLIMIT_NOFILE=10000 -e APP_NAME=realtime -e SEED_SELF_HOST=true -e RUN_JANITOR=true supabase/realtime:v2.34.47 >/dev/null

docker kill -s SIGUSR1 orgrest >/dev/null
pgrep -f dev/gateway.mjs >/dev/null || (nohup node dev/gateway.mjs >/tmp/org-gateway.log 2>&1 &)
echo "Stack local listo en http://localhost:54321 (correr 'npm run dev' para la app)"
