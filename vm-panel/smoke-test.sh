#!/usr/bin/env bash
# Smoke test for the VM panel API (CLAUDE.md step 7). Usage: smoke.sh <base-url> <super-user> <super-pass>
set -u
B=${1:-http://127.0.0.1:3000}; SU=${2:-superadmin}; SP=${3:?super password}
pass=0; fail=0
ok(){ if [ "$1" = "$2" ]; then echo "PASS  $3 (got $1)"; pass=$((pass+1)); else echo "FAIL  $3 (want $2, got $1)"; fail=$((fail+1)); fi; }
code(){ curl -s -o /tmp/smoke.body -w '%{http_code}' "$@"; }
j(){ node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const o=JSON.parse(s);console.log(eval("o"+process.argv[1]))})' "$1" </tmp/smoke.body; }
CU="smoke$RANDOM"; CP="cust-pass-$RANDOM$RANDOM"
yesterday=$(date -d yesterday +%F); plus30=$(date -d '+30 days' +%F)

ok "$(code "$B/api/me")" 401 "no token -> 401"
ok "$(code -X POST "$B/api/login" -H 'content-type: application/json' -d "{\"username\":\"$SU\",\"password\":\"wrong-password\"}")" 401 "wrong password -> 401"
ok "$(code -X POST "$B/api/login" -H 'content-type: application/json' -d "{\"username\":\"$SU\",\"password\":\"$SP\"}")" 200 "super admin login"
ST=$(j .token); ok "$(j .user.role)" super "super admin role"
SA=(-H "authorization: Bearer $ST")

ok "$(code -X POST "$B/api/admin/users" "${SA[@]}" -H 'content-type: application/json' \
  -d "{\"username\":\"$CU\",\"password\":\"$CP\",\"name\":\"Smoke Co\",\"pkg\":\"Pro\",\"ram\":8,\"cpu\":4,\"disk\":100,\"ip\":\"203.0.113.10\"}")" 200 "admin creates customer"
CID=$(j .id)
ok "$(code -X POST "$B/api/login" -H 'content-type: application/json' -d "{\"username\":\"$CU\",\"password\":\"$CP\"}")" 200 "customer login"
CT=$(j .token); CA=(-H "authorization: Bearer $CT")
ok "$(code "$B/api/me" "${CA[@]}")" 200 "customer /api/me"; ok "$(j .ram)/$(j .cpu)/$(j .disk)/$(j .expired)" "8/4/100/false" "customer sees admin-set values"

# Customer must not be able to change config
ok "$(code -X PUT "$B/api/admin/users/$CID" "${CA[@]}" -H 'content-type: application/json' -d '{"ram":64,"exp":"2099-01-01"}')" 403 "customer PUT own config -> 403"
ok "$(code -X POST "$B/api/admin/users" "${CA[@]}" -H 'content-type: application/json' -d '{"username":"evil1","password":"evilevil1"}')" 403 "customer create user -> 403"
ok "$(code "$B/api/admin/users" "${CA[@]}")" 403 "customer list users -> 403"
ok "$(code -X DELETE "$B/api/admin/users/$CID" "${CA[@]}")" 403 "customer delete self -> 403"
ok "$(code -X PUT "$B/api/me" "${CA[@]}" -H 'content-type: application/json' -d '{"ram":64}')" 404 "no other write route on /api/me"
code "$B/api/me" "${CA[@]}" >/dev/null; ok "$(j .ram)/$(j .exp)" "8/$plus30" "config unchanged after attempts"

# Files: upload, list, folder escape
echo hello >/tmp/smoke-up.txt
ok "$(code -X POST "$B/api/files/src" "${CA[@]}" -F "file=@/tmp/smoke-up.txt;filename=index.html")" 200 "upload to src/"
ok "$(code "$B/api/files/src" "${CA[@]}")" 200 "list src/"; ok "$(j '[0].name')" index.html "uploaded file listed"
ok "$(code -X POST "$B/api/files/src" "${CA[@]}" -F "file=@/tmp/smoke-up.txt;filename=../../../escape.txt")" 200 "upload with ../ name (stored as basename)"
ok "$(code "$B/api/files/src" "${CA[@]}")" 200 "list src/ again"; ok "$(j '.map(f=>f.name).sort().join(",")')" "escape.txt,index.html" "../ name stayed inside src/"
ok "$(code "$B/api/files/etc" "${CA[@]}")" 400 "folder other than src/public -> 400"
ok "$(code "$B/api/files/..%2F..%2Fdata" "${CA[@]}")" 400 "encoded ../ folder -> 400"
ok "$(code -X DELETE "$B/api/files/src/..%2F..%2F..%2Fdb.json" "${CA[@]}")" 200 "delete ../db.json resolves to src/db.json (no-op)"
ok "$(code "$B/api/me" "${SA[@]}")" 200 "db.json intact (super still authenticates)"
ok "$(code "$B/api/files/src" "${SA[@]}")" 403 "super admin cannot use customer file routes"

# Expiry: admin backdates the plan -> uploads/deletes refused
ok "$(code -X PUT "$B/api/admin/users/$CID" "${SA[@]}" -H 'content-type: application/json' -d "{\"exp\":\"$yesterday\"}")" 200 "admin sets expiry to yesterday"
ok "$(code "$B/api/me" "${CA[@]}")" 200 "customer /api/me after expiry"; ok "$(j .expired)" true "customer shows expired"
ok "$(code -X POST "$B/api/files/public" "${CA[@]}" -F "file=@/tmp/smoke-up.txt;filename=late.txt")" 403 "upload after expiry -> 403"
ok "$(code -X DELETE "$B/api/files/src/index.html" "${CA[@]}")" 403 "delete after expiry -> 403"
ok "$(code "$B/api/files/src" "${CA[@]}")" 200 "listing still allowed after expiry"
ok "$(code -X PUT "$B/api/admin/users/$CID" "${SA[@]}" -H 'content-type: application/json' -d "{\"exp\":\"$plus30\"}")" 200 "admin renews"
ok "$(code -X POST "$B/api/files/public" "${CA[@]}" -F "file=@/tmp/smoke-up.txt;filename=late.txt")" 200 "upload works again after renewal"

# Clean up the test customer
ok "$(code -X DELETE "$B/api/admin/users/$CID" "${SA[@]}")" 200 "admin deletes test customer"
ok "$(code "$B/api/me" "${CA[@]}")" 401 "deleted customer's token rejected"

echo "---- $pass passed, $fail failed"; [ "$fail" = 0 ]
