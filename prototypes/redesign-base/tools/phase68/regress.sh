#!/bin/bash
# فاز ۶۸ — رگرسیون کامل: همهٔ سوئیت‌های QA + structure
# فرمت‌های خروجی نسل‌ها:
#  «RESULT: 39 pass / 0 fail» · «PASS: 34 / FAIL: 0» · «66 PASS / 0 FAIL» · «PASS: 83 / 83» · «RESULT: 43/43»
cd /home/z/my-project/imach-web/prototypes/redesign-base
PASS=0; FAIL=0; FAILED=""
for d in $(ls tools/ | sort -V); do
  s="tools/$d/qa.mjs"
  [ -f "$s" ] || continue
  out=$(timeout 300 node "$s" 2>&1)
  if echo "$out" | grep -q "TimeoutError\|uncaughtException"; then
    echo "✗ p$d CRASH"; FAIL=$((FAIL+1)); FAILED="$FAILED p$d"
    echo "$out" | grep -B1 "TimeoutError\|uncaughtException" | head -4
    continue
  fi
  # آخرین خط خلاصه
  line=$(echo "$out" | grep -E "RESULT:|PASS.*FAIL|PASS: [0-9]+ / [0-9]+" | tail -1)
  verdict="?"
  if echo "$line" | grep -qi "fail"; then
    f=$(echo "$line" | grep -oE "FAIL: *[0-9]+" | grep -oE "[0-9]+" | tail -1)
    [ -z "$f" ] && f=$(echo "$line" | grep -oiE "[0-9]+ *FAIL" | grep -oE "[0-9]+" | tail -1)
    [ -z "$f" ] && f=99
    [ "$f" = "0" ] && verdict="ok"
    line="$line (fail=$f)"
  elif echo "$line" | grep -qE "RESULT: *[0-9]+/[0-9]+"; then
    g=$(echo "$line" | grep -oE "[0-9]+/[0-9]+")
    a=${g%/*}; b=${g#*/}; [ "$a" = "$b" ] && verdict="ok"; line="$line"
  elif echo "$line" | grep -qE "PASS: *[0-9]+ */ *[0-9]+"; then
    g=$(echo "$line" | grep -oE "[0-9]+ */ *[0-9]+")
    a=$(echo "$g" | cut -d'/' -f1 | tr -d ' '); b=$(echo "$g" | cut -d'/' -f2 | tr -d ' ')
    [ "$a" = "$b" ] && verdict="ok"
  fi
  # خطای کنسول/صفحه مستقل (سوئیت‌های جدید)
  if echo "$out" | grep -q "^ERRORS:"; then verdict="err"; fi
  if [ "$verdict" = "ok" ]; then
    echo "✓ p$d — $line"; PASS=$((PASS+1))
  else
    echo "✗ p$d — $line [$verdict]"; FAIL=$((FAIL+1)); FAILED="$FAILED p$d"
    echo "$out" | grep '✗' | head -5
  fi
done
echo "--- structure ---"
node tools/phase51/structure.mjs 2>&1 | tail -2
echo "=== SUMMARY: $PASS pass / $FAIL fail ==="
[ -n "$FAILED" ] && echo "FAILED:$FAILED"
exit $FAIL
