#!/usr/bin/env bash
# iMach — راه‌اندازی کامل استک در سندباکس (idempotent)
#   mongod (rs0) → init RS → بک‌اند (:4000) → فرانت dev (:3000)
# استفاده: bash /home/z/my-project/scripts/start-imach.sh
set -u
MONGO_BIN="${MONGO_BIN:-/home/z/mongo-dist}"
DATA=/home/z/mongo-data
BACK=/home/z/imach-back
FRONT=/home/z/my-project
DB_URL="mongodb://127.0.0.1:27017/imach?replicaSet=rs0"

echo "── ۱) mongod"
if ! curl -s --max-time 1 "http://127.0.0.1:27017" >/dev/null 2>&1 && ! pgrep -f "mongod.*27017" >/dev/null; then
  "$MONGO_BIN/mongod" --dbpath "$DATA" --replSet rs0 --bind_ip 127.0.0.1 --port 27017 --fork --logpath "$DATA/mongod.log"
fi
pgrep -f "mongod.*27017" >/dev/null && echo "mongod: up" || { echo "mongod FAILED"; exit 1; }

echo "── ۲) replica set"
NODE_PATH="$BACK/node_modules" node "$FRONT/scripts/mongo-rs-init.js"

echo "── ۳) بک‌اند"
if [ ! -d "$BACK/node_modules" ]; then (cd "$BACK" && npm install --no-audit --no-fund); fi
(cd "$BACK" && DATABASE_URL="$DB_URL" npx prisma db push >/dev/null 2>&1 || DATABASE_URL="$DB_URL" npx prisma db push)
pkill -f "node dist/main.js" 2>/dev/null; sleep 1
(cd "$BACK" && npm run build >/dev/null 2>&1)
setsid --fork env DATABASE_URL="$DB_URL" node "$BACK/dist/main.js" > "$BACK/back.log" 2>&1

echo "── ۴) فرانت"
if [ ! -d "$FRONT/node_modules" ]; then (cd "$FRONT" && npm install --no-audit --no-fund); fi
pkill -f "next dev" 2>/dev/null; sleep 1
(cd "$FRONT" && setsid --fork npm run dev > "$FRONT/front.log" 2>&1)

echo "── ۵) سلامت"
for i in $(seq 1 20); do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:4000/api/v1/goods/getCategories" || true)
  [ "$code" = "200" ] && break; sleep 2
done
echo "backend: $code"
for i in $(seq 1 20); do
  fcode=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:3000" || true)
  [ "$fcode" = "200" ] && break; sleep 2
done
echo "frontend: $fcode"
echo "── دمو: 09120000001 / ImachDemo1234"
