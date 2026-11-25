#!/usr/bin/env bash
set -euo pipefail

repo=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
pg_bin=${IH2_NATIVE_PG_BIN:?Set IH2_NATIVE_PG_BIN to the PostgreSQL 16 bin directory}
createdb_bin=${IH2_NATIVE_CREATEDB:-createdb}
port=56371
work=$(mktemp -d /tmp/ih2-new-db.XXXXXX)
data="$work/data"

cleanup() {
  local result=$?
  trap - EXIT
  if [[ -s "$data/postmaster.pid" ]] && ! "$pg_bin/pg_ctl" -D "$data" -m fast -w stop; then
    result=1
  fi
  if [[ "$result" == 0 ]]; then
    rm -rf -- "$work"
  else
    printf 'Disposable fixture logs retained in %s\n' "$work" >&2
  fi
  exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

"$pg_bin/postgres" --version | grep -Eq 'PostgreSQL\) 16\.'
"$pg_bin/initdb" -D "$data" -U ih2 -A trust --no-locale > "$work/initdb.log" 2>&1
"$pg_bin/pg_ctl" -D "$data" -l "$work/postgres.log" -o "-h 127.0.0.1 -p $port -k $work" -w start
"$createdb_bin" -h 127.0.0.1 -p "$port" -U ih2 ih2_test

cd -- "$repo"
IH2_TEST_DATABASE_URL="postgres://ih2@127.0.0.1:$port/ih2_test" \
IH2_GLASSHOUSE_TEMP_DATA="$data" \
  node --experimental-strip-types --test tests/server-glasshouse-funding.test.ts
