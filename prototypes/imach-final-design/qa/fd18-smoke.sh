#!/bin/bash
# FD-18 smoke — ۴۰ اسکرین روی مبدأ تازه: صفر خطا + نمایش + بدون سرریز افقی
set -u
PORT=8160
cd /home/z/my-project/imach-web/prototypes/imach-final-design

SCREENS="s-landing s-signup s-login s-home-sell s-catalog s-catalog-share s-contacts s-customers s-customer-view s-sell-orders s-sell-order-view s-sell-rfqs s-sell-offer s-sell-add s-sell-edit s-network-score s-edit-business s-notifs s-profile s-home-buy s-buy-list s-buy-list-add s-buy-product-suppliers s-buy-suppliers s-supplier-view s-buy-rfqs s-buy-rfq-new s-buy-offers s-buy-offer-view s-buy-orders s-buy-order-view s-msgs s-chat s-catalog-guest s-product-view s-buy-list-guest s-sell-bulk s-sell-promo s-charge s-cat-edit s-salesrep"

agent-browser open "http://127.0.0.1:$PORT/index.html" >/dev/null 2>&1
sleep 1.8
agent-browser eval "window.__errs=[];window.addEventListener('error',function(e){window.__errs.push('ERR:'+e.message)});window.addEventListener('unhandledrejection',function(e){window.__errs.push('REJ:'+String(e.reason))});'ok'" >/dev/null 2>&1

FAIL=0; PASS=0
for s in $SCREENS; do
  OUTP=$(agent-browser eval "iMach.show('$s', false); 'ok'" 2>&1 | tr -d '"')
  sleep 0.45
  ERRS=$(agent-browser eval "window.__errs && window.__errs.length ? window.__errs.join('||') : 'CLEAN'" 2>&1 | tr -d '"')
  CUR=$(agent-browser eval "var el=document.querySelector('.screen:not('+String.fromCharCode(91)+'hidden'+String.fromCharCode(93)+')'); el?el.id:'none'" 2>&1 | tr -d '"')
  OVF=$(agent-browser eval "var b=document.querySelector('.screen:not('+String.fromCharCode(91)+'hidden'+String.fromCharCode(93)+') .body'); b? (b.scrollWidth - b.clientWidth > 2 ? 'OVF:'+ (b.scrollWidth-b.clientWidth) : 'ok') : 'ok'" 2>&1 | tr -d '"')
  if [[ "$OUTP" != *"ok"* || "$ERRS" != "CLEAN" || "$CUR" != "$s" || "$OVF" != "ok" ]]; then
    echo "X $s -> screen=$CUR errs=$ERRS ovf=$OVF"; FAIL=$((FAIL+1))
  else
    echo "OK $s"; PASS=$((PASS+1))
  fi
done
echo ""
echo "=== FD-18 SMOKE: $PASS OK / $FAIL FAIL ==="
