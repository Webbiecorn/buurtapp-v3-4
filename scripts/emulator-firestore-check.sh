#!/usr/bin/env bash
set -euo pipefail
PROJECT="buurtapp-v3-4"
HOST="127.0.0.1"
PORT="8083"
BASE="http://${HOST}:${PORT}/v1/projects/${PROJECT}/databases/(default)/documents"
COL="quickcheck"
DOCID="doc1"

echo "Firestore emulator quick-check"
echo "POST (unauthenticated) -> create document ${COL}/${DOCID}"
HTTP_CODE=$(curl -s -o /tmp/_emulator_write_resp -w "%{http_code}" -X POST "${BASE}/${COL}?documentId=${DOCID}" -H "Content-Type: application/json" -d '{"fields":{"hello":{"stringValue":"world"}}}')
RESP=$(cat /tmp/_emulator_write_resp || true)
if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "201" ]]; then
  echo "WRITE ALLOWED: HTTP $HTTP_CODE"
  echo "Response: $RESP"
else
  echo "WRITE DENIED or error: HTTP $HTTP_CODE"
  echo "Response: $RESP"
fi

# Try read
echo "\nGET -> read document ${COL}/${DOCID}"
HTTP_CODE_READ=$(curl -s -o /tmp/_emulator_read_resp -w "%{http_code}" "${BASE}/${COL}/${DOCID}")
RESP_READ=$(cat /tmp/_emulator_read_resp || true)
if [[ "$HTTP_CODE_READ" == "200" ]]; then
  echo "READ ALLOWED"
  echo "Response: $RESP_READ"
else
  echo "READ DENIED or error: HTTP $HTTP_CODE_READ"
  echo "Response: $RESP_READ"
fi

# Clean up: delete the doc (best-effort)
curl -s -X DELETE "${BASE}/${COL}/${DOCID}" >/dev/null || true

echo "\nQuick-check finished"
exit 0
