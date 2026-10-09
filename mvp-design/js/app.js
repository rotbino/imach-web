/* iMach MVP prototype — یک فایل، بدون وابستگی. مسیرها با hash. وضعیت در localStorage. */
(function () {
  'use strict';
  const SEED = window.SEED;
  const KEY = 'imach-mvp-v1';
  const ME = SEED.meId;
  const DAY = 86400000;
  const app = document.getElementById('app');
  const phone = document.getElementById('phone');

  /* ───────── وضعیت ───────── */
  const clone = (o) => JSON.parse(JSON.stringify(o));
  function fresh() {
    return { authed: false, me: clone(SEED.businesses.find((b) => b.id === ME)), listings: clone(SEED.listings), buyList: SEED.buyList.slice(), customRefs: [] };
  }
  function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.listings) return s; } catch (e) { /* noop */ } return fresh(); }
  let st = load();
  const save = () => localStorage.setItem(KEY, JSON.stringify(st));
  const ui = { stack: [], add: {}, paste: {}, prices: null, sort: 'cheap', login: { step: 1, phone: '' } };

  /* ───────── دسترسی به داده ───────── */
  const goods = SEED.goods;
  const allRefs = () => SEED.refs.concat(st.customRefs);
  const G = (id) => goods.find((g) => g.id === id);
  const R = (id) => allRefs().find((r) => r.id === id);
  const B = (id) => (id === ME ? st.me : SEED.businesses.find((b) => b.id === id));
  const mine = () => st.listings.filter((l) => l.bizId === ME);
  const province = (c) => SEED.provinces[c] || c;

  /* ───────── قالب‌بندی ───────── */
  const FA = '۰۱۲۳۴۵۶۷۸۹';
  const fa = (s) => String(s).replace(/\d/g, (d) => FA[d]).replace(/\./g, '٫');
  const money = (n) => Math.round(n).toLocaleString('fa-IR');
  const toLatin = (s) => String(s).replace(/[۰-۹]/g, (d) => FA.indexOf(d)).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  const parseNum = (s) => { const v = toLatin(s || '').replace(/[^\d]/g, ''); return v ? +v : 0; };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const icon = (n, c) => `<svg class="i ${c || ''}"><use href="#i-${n}"/></svg>`;
  function ago(t) { const d = (Date.now() - t) / DAY; if (d < 1) return 'امروز'; if (d < 2) return 'دیروز'; return fa(Math.floor(d)) + ' روز پیش'; }
  const isStale = (l, days) => Date.now() - l.updatedAt > (days || 3) * DAY;
  const initial = (s) => esc((s || '؟').trim().charAt(0));
  const thumb = (src, cls) => (src ? `<img class="thumb ${cls || ''}" src="${src}" alt="">` : `<div class="thumb ph ${cls || ''}">${icon('tag')}</div>`);

  /* ───────── Listing ───────── */
  function lTitle(l) { if (l.refId) { const r = R(l.refId); return r ? r.name : '—'; } return G(l.goodId).name + (l.grade ? ' ' + l.grade : ''); }
  function lSub(l) { if (l.refId) { const r = R(l.refId); return (r ? r.brand + ' · ' : '') + l.pack; } return l.pack + ' · فله'; }
  function lImg(l) { const r = l.refId && R(l.refId); return (r && r.img) || G(l.goodId).img; }
  const unitPrice = (l) => (l.price / l.qty) * G(l.goodId).cmp.qty;
  function trend(l) {
    if (!l.prevPrice || l.prevPrice === l.price) return '';
    const p = ((l.price - l.prevPrice) / l.prevPrice) * 100;
    return `<span class="trend ${p < 0 ? 'green' : 'red'}">${p < 0 ? '▼' : '▲'} ${fa(Math.abs(p).toFixed(1))}٪</span>`;
  }

  /* ───────── جستجوی واحد (نوع کالا + برند + کالای مرجع) ───────── */
  function norm(s) {
    return toLatin(String(s || '')).replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[ًٌٍَُِّْ]/g, '')
      .replace(/[\u200c\u200f\-_,،٬()«»]/g, ' ').toLowerCase().replace(/\s+/g, ' ').trim();
  }
  function index() {
    const out = goods.map((g) => ({ type: 'good', id: g.id, g, text: norm(g.name + ' ' + g.aliases + ' ' + g.cat) }));
    allRefs().forEach((r) => { const g = G(r.goodId); out.push({ type: 'ref', id: r.id, r, g, text: norm(r.name + ' ' + r.brand + ' ' + g.name + ' ' + (r.barcode || '')) }); });
    return out;
  }
  function search(q) {
    const toks = norm(q).split(' ').filter(Boolean);
    if (!toks.length) return [];
    return index().map((e) => {
      const hit = toks.filter((t) => e.text.includes(t)).length;
      const brandHit = e.type === 'ref' && toks.some((t) => norm(e.r.brand).includes(t)) ? 1 : 0;
      return { e, ratio: hit / toks.length, brandHit };
    }).filter((x) => x.ratio >= 0.5)
      .sort((a, b) => b.ratio - a.ratio || b.brandHit - a.brandHit || (a.e.type === 'good' ? -1 : 1) - (b.e.type === 'good' ? -1 : 1));
  }
  const offersFor = (key) => { const [t, id] = key.split(':'); return st.listings.filter((l) => l.bizId !== ME && (t === 'r' ? l.refId === id : l.goodId === id)); };
  const goodOfKey = (key) => { const [t, id] = key.split(':'); return t === 'r' ? G(R(id).goodId) : G(id); };
  const keyTitle = (key) => { const [t, id] = key.split(':'); return t === 'r' ? R(id).name : G(id).name; };
  const keyImg = (key) => { const [t, id] = key.split(':'); return t === 'r' ? R(id).img || G(R(id).goodId).img : G(id).img; };

  /* ───────── ناوبری ───────── */
  const go = (h) => { location.hash = h; };
  function route() { const p = (location.hash.slice(1) || '/').split('/').filter(Boolean); return { name: p[0] || '', arg: p[1] ? decodeURIComponent(p[1]) : '' }; }
  function back(fallback) {
    if (ui.stack.length > 1) { ui.stack.pop(); location.hash = ui.stack.pop(); } else go(fallback || '/catalog');
  }

  function layout(o) {
    const lead = o.back ? `<button class="icon-btn" data-act="back" data-to="${o.back}" aria-label="بازگشت">${icon('back')}</button>` : '<img class="logo" src="img/logo.svg" alt="آی‌مچ">';
    return `<header class="hdr">${lead}<div class="title">${o.title ? `<b>${o.title}</b>` : ''}${o.sub ? `<small>${o.sub}</small>` : ''}</div>${o.actions || ''}</header>`
      + `<main class="main" id="main">${o.body}</main>`
      + (o.footer ? `<div class="footer-bar">${o.footer}</div>` : '')
      + (o.tab ? tabbar(o.tab) : '');
  }
  function tabbar(on) {
    const t = [['catalog', 'store', 'کاتالوگ من'], ['buy', 'list', 'لیست خرید'], ['profile', 'user', 'پروفایل']];
    return `<nav class="tabbar">${t.map(([k, i, l]) => `<button class="tab ${on === k ? 'on' : ''}" data-go="/${k}">${icon(i)}<span>${l}</span></button>`).join('')}</nav>`;
  }

  /* ───────── برگه و تُست ───────── */
  function openSheet(html) {
    closeSheet();
    const w = document.createElement('div');
    w.className = 'sheet-wrap';
    w.innerHTML = `<div class="sheet" role="dialog"><div class="grab"></div>${html}</div>`;
    w.addEventListener('click', (e) => { if (e.target === w) closeSheet(); });
    phone.appendChild(w);
    const f = w.querySelector('[data-focus]'); if (f) setTimeout(() => f.focus(), 50);
  }
  function closeSheet() { phone.querySelectorAll('.sheet-wrap').forEach((s) => s.remove()); }
  function toast(msg) {
    phone.querySelectorAll('.toast').forEach((t) => t.remove());
    const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = icon('check', 'sm') + esc(msg);
    phone.appendChild(t); setTimeout(() => t.remove(), 2400);
  }

  /* ══════════════ صفحه‌ها ══════════════ */
  const V = {};

  /* ── لندینگ ── */
  V[''] = () => `<header class="hdr"><img class="logo" src="img/logo.svg" alt="آی‌مچ"><div class="title"></div><button class="btn ghost sm" data-go="/login">ورود</button></header>
  <main class="main" id="main">
    <div class="hero">
      <div class="h1">قیمت عمده رو مقایسه کن،<br>کاتالوگت رو بفرست</div>
      <p>آی‌مچ کالای همهٔ فروشنده‌ها رو به یک «کالای مرجع» وصل می‌کنه؛ برای همین قیمت‌ها واقعاً قابل مقایسه‌ان — حتی وقتی بسته‌بندی‌ها فرق دارن.</p>
    </div>
    <div class="card stack">
      <div class="benefit"><div class="ic">${icon('store')}</div><div><b>برای فروشنده</b><div class="small muted">کاتالوگ قیمتت رو یک بار بساز، هر روز با چند لمس به‌روز کن و لینکش رو برای مشتری‌ها بفرست.</div></div></div>
      <div class="benefit dark"><div class="ic">${icon('list')}</div><div><b>برای خریدار</b><div class="small muted">کالاهایی که می‌خری رو اضافه کن؛ ارزون‌ترین و نزدیک‌ترین تأمین‌کننده رو همون‌جا ببین.</div></div></div>
    </div>
    <div class="card">
      <div class="flex small bold" style="margin-bottom:8px">${icon('scale', 'sm')} چرا «کالای مرجع» مهمه؟</div>
      <div class="small muted">یکی کیسهٔ ۵۰ کیلویی برنج هاشمی رو ${money(2780000)} می‌ده، یکی کیسهٔ ۱۰ کیلویی رو ${money(560000)}. کدوم ارزون‌تره؟</div>
      <div class="grid2" style="margin-top:10px">
        <div class="banner info" style="display:block"><div class="tiny muted">تجارت گیل‌برنج</div><b>${money(55600)}</b> <span class="tiny">هر کیلو</span></div>
        <div class="banner info" style="display:block"><div class="tiny muted">پخش سپهر</div><b>${money(56000)}</b> <span class="tiny">هر کیلو</span></div>
      </div>
    </div>
    <div class="card"><div class="h2" style="margin-bottom:10px">چطور شروع کنم؟</div>
      <ol class="how"><li>با شماره موبایل وارد شو — بدون رمز.</li><li>کالاهات رو با جستجو یا چسباندن لیست قیمت تلگرامی اضافه کن.</li><li>لینک کاتالوگت رو برای مشتری‌هات بفرست.</li></ol></div>
    <button class="link" data-go="/shop/b2" style="display:block;margin:6px auto 0">دیدن یک کاتالوگ نمونه ←</button>
  </main>
  <div class="footer-bar"><button class="btn primary block" data-go="/login">شروع با شماره موبایل</button></div>`;

  /* ── ورود ── */
  V.login = () => {
    const L = ui.login;
    let body;
    if (L.step === 1) {
      body = `<div class="h2">شماره موبایلت رو وارد کن</div>
        <div class="small muted">کد تأیید پیامک می‌شه. رمز عبور لازم نیست.</div>
        <input class="input num" id="phoneIn" inputmode="numeric" maxlength="11" placeholder="۰۹۱۲۰۰۰۰۰۰۰" value="${esc(fa(L.phone || SEED.businesses[0].phone))}" data-focus>
        <div class="banner info small">${icon('info', 'sm')}<span>برای دیدن حساب نمونه با داده، همین شمارهٔ پیش‌فرض رو نگه دار. با شمارهٔ دیگه، تجربهٔ کاربر تازه‌وارد (کاتالوگ خالی) رو می‌بینی.</span></div>`;
      return layout({ back: '/', title: 'ورود / ثبت‌نام', body, footer: '<button class="btn primary block" data-act="login-send">دریافت کد</button>' });
    }
    if (L.step === 2) {
      body = `<div class="h2">کد ۴ رقمی رو وارد کن</div>
        <div class="small muted">به شمارهٔ ${fa(L.phone)} پیامک شد. <button class="link" data-act="login-edit">ویرایش شماره</button></div>
        <div class="otp">${[0, 1, 2, 3].map((i) => `<input inputmode="numeric" maxlength="1" data-in="otp" ${i === 0 ? 'data-focus' : ''}>`).join('')}</div>
        <div class="hint" style="text-align:center">نسخهٔ نمایشی: هر کدی قبوله</div>`;
      return layout({ back: '/', title: 'تأیید شماره', body, footer: '<button class="btn primary block" data-act="login-verify">ورود</button>' });
    }
    const cities = ['رشت', 'لاهیجان', 'تهران', 'قزوین', 'اصفهان'];
    body = `<div class="h2">کسب‌وکارت چیه؟</div><div class="small muted">فقط دو سؤال. بقیه رو بعداً از پروفایل کامل کن.</div>
      <label class="field"><span>اسم فروشگاه یا شرکت</span><input class="input" id="bizName" placeholder="مثلاً بنکداری امید" data-focus></label>
      <div class="field"><span>شهر</span><div class="chips">${cities.map((c) => `<button class="chip ${L.city === c ? 'on' : ''}" data-act="login-city" data-c="${c}">${c}</button>`).join('')}</div></div>`;
    return layout({ back: '/', title: 'ثبت‌نام', body, footer: '<button class="btn primary block" data-act="login-finish">ورود به آی‌مچ</button>' });
  };

  /* ── کاتالوگ من ── */
  V.catalog = () => {
    const ls = mine().sort((a, b) => lTitle(a).localeCompare(lTitle(b), 'fa'));
    const stale = ls.filter((l) => isStale(l));
    const last = ls.reduce((m, l) => Math.max(m, l.updatedAt), 0);
    const me = st.me;
    let body = `<div class="card flex" style="gap:12px"><div class="avatar">${initial(me.name)}</div><div class="grow"><div class="bold">${esc(me.name)}</div>
      <div class="small muted">${esc(me.trade || 'کسب‌وکار')} · ${esc(me.city)}</div>
      <div class="tiny muted">${fa(ls.length)} کالا${last ? ' · آخرین به‌روزرسانی ' + ago(last) : ''}</div></div></div>`;
    if (!ls.length) {
      body += `<div class="card empty">${icon('store')}<b>کاتالوگت هنوز خالیه</b>اولین کالات رو اضافه کن؛ کمتر از یک دقیقه طول می‌کشه.
        <div class="stack" style="margin-top:14px"><button class="btn primary block" data-go="/add">${icon('plus')} افزودن کالا</button>
        <button class="btn ghost block" data-go="/paste">${icon('clip')} چسباندن لیست قیمت</button></div></div>`;
      return layout({ title: 'کاتالوگ من', body, tab: 'catalog' });
    }
    body += `<div class="grid2"><button class="btn primary" data-go="/add">${icon('plus')} افزودن کالا</button><button class="btn ghost" data-go="/prices">${icon('refresh')} به‌روزرسانی قیمت‌ها</button></div>`;
    if (stale.length) body += `<button class="banner amber" data-go="/prices">${icon('clock')}<span class="grow">قیمت <b>${fa(stale.length)} کالا</b> بیش از ۳ روزه به‌روز نشده. خریدارها قیمت تازه رو بالاتر می‌بینن.</span>${icon('chev', 'sm')}</button>`;
    body += `<div class="list">${ls.map((l) => `<button class="row" data-act="edit" data-id="${l.id}">${thumb(lImg(l))}
      <div class="body"><div class="name">${esc(lTitle(l))}</div><div class="sub">${esc(lSub(l))}</div>
      <div class="flex tiny muted" style="gap:6px">${l.inStock ? '<span class="badge green">موجود</span>' : '<span class="badge muted">تمام شد</span>'}<span class="${isStale(l) ? 'orange' : ''}">${ago(l.updatedAt)}</span></div></div>
      <div class="end"><div class="price">${money(l.price)}<small>تومان</small></div>${trend(l)}</div></button>`).join('')}</div>`;
    body += `<button class="banner orange" data-act="share">${icon('share')}<span class="grow">لینک کاتالوگت رو برای مشتری‌هات بفرست — قیمت‌ها همیشه به‌روز می‌مونن.</span>${icon('chev', 'sm')}</button>`;
    const actions = `<button class="icon-btn" data-go="/shop/${ME}" aria-label="نمای مشتری">${icon('eye')}</button><button class="icon-btn" data-act="share" aria-label="اشتراک">${icon('share')}</button>`;
    return layout({ title: 'کاتالوگ من', actions, body, tab: 'catalog' });
  };

  /* ── افزودن کالا: جستجوی واحد ← قیمت ── */
  function resultsHtml(q, mode) {
    const owned = new Set(mine().map((l) => l.refId).filter(Boolean));
    const watched = new Set(st.buyList);
    let res = search(q).map((x) => x.e);
    let heading = '';
    if (!q.trim()) { res = ['g1', 'g2', 'r1', 'r3', 'g6'].map((id) => index().find((e) => e.id === id)); heading = 'پرتکرار در صنف شما'; }
    const row = (e) => {
      const key = (e.type === 'ref' ? 'r:' : 'g:') + e.id;
      const n = offersFor(key).length;
      let sub, badge = '';
      if (e.type === 'ref') { sub = `${esc(e.r.brand)} · ${esc(e.r.pack)}`; if (e.r.pending) badge = '<span class="badge amber">در انتظار تأیید</span>'; }
      else sub = mode === 'buy' ? 'هر برند و هر بسته‌بندی' : 'فله / بدون برند · بسته‌بندی دلخواه';
      if (mode === 'add' && e.type === 'ref' && owned.has(e.id)) badge = '<span class="badge green">در کاتالوگ</span>';
      if (mode === 'buy') { if (watched.has(key)) badge = '<span class="badge green">در لیست</span>'; sub += ` · ${fa(n)} فروشنده`; }
      const act = mode === 'buy' ? `data-act="buy-pick" data-key="${key}"` : mode === 'sheet' ? `data-act="sheet-pick" data-type="${e.type}" data-id="${e.id}"` : `data-act="pick" data-type="${e.type}" data-id="${e.id}"`;
      return `<button class="row res" ${act}>${thumb(e.type === 'ref' ? e.r.img || e.g.img : e.g.img)}<div class="body"><div class="name">${esc(e.type === 'ref' ? e.r.name : e.g.name)}</div><div class="sub">${sub}</div></div>${badge}${icon('chev', 'sm')}</button>`;
    };
    if (!res.length) {
      return `<div class="card empty" style="padding:22px">${icon('search')}<b>«${esc(q)}» پیدا نشد</b>${mode === 'add' ? 'می‌تونی همین الان به‌عنوان کالای جدید ثبتش کنی.' : 'املای دیگه‌ای رو امتحان کن.'}</div>`
        + (mode === 'add' ? `<button class="btn ghost block" data-act="new-item">${icon('plus')} ثبت «${esc(q)}» به‌عنوان کالای جدید</button>` : '');
    }
    if (heading) return `<div class="res-group">${heading}</div><div class="list">${res.map(row).join('')}</div>`;
    const refs = res.filter((e) => e.type === 'ref');
    const gs = res.filter((e) => e.type === 'good');
    let html = '';
    const branded = mode === 'buy' ? 'یک برند مشخص' : 'برنددار — عکس و مشخصات آماده';
    const bulk = mode === 'buy' ? 'هر برندی (مقایسهٔ همه)' : 'فله / بدون برند';
    const groups = [[gs, bulk], [refs, branded]];
    if (refs.length && refs[0] === res[0]) groups.reverse();
    groups.forEach(([arr, title]) => { if (arr.length) html += `<div class="res-group">${title}</div><div class="list">${arr.map(row).join('')}</div>`; });
    if (mode === 'add') html += `<button class="btn ghost block" data-act="new-item" style="margin-top:12px">پیدا نکردی؟ ثبت کالای جدید</button>`;
    return html;
  }

  V.add = () => {
    const A = ui.add;
    if (!A.sel) {
      const body = (A.last ? `<div class="banner green">${icon('check')}<span class="grow"><b>${esc(A.last)}</b> اضافه شد. کالای بعدی؟</span><button class="link" data-go="/catalog">کاتالوگ</button></div>` : '')
        + `<label class="search">${icon('search')}<input id="q" data-in="addq" placeholder="چی می‌فروشی؟ مثلاً «هاشمی» یا «پفک مینو»" value="${esc(A.q || '')}" autocomplete="off" data-focus>
          <button class="icon-btn" style="border:0;width:34px" data-act="scan" aria-label="اسکن بارکد">${icon('scan')}</button></label>
        <button class="banner info" data-go="/paste">${icon('clip')}<span class="grow">لیست قیمت تلگرام یا واتس‌اپت رو داری؟ <b>بچسبونش</b>، خودمون تطبیق می‌دیم.</span>${icon('chev', 'sm')}</button>
        <div id="res">${resultsHtml(A.q || '', 'add')}</div>`;
      return layout({ back: '/catalog', title: 'افزودن کالا', sub: 'مرحلهٔ ۱ از ۲ — کالا رو پیدا کن', body });
    }
    return layout({ back: '/add', title: 'افزودن کالا', sub: 'مرحلهٔ ۲ از ۲ — قیمت', body: addForm(), footer: `<button class="btn primary block" data-act="add-save">${A.dupId ? 'به‌روزرسانی قیمت' : 'افزودن به کاتالوگ'}</button>` })
      .replace('data-act="back" data-to="/add"', 'data-act="add-reset"');
  };

  function marketHint(key, cmp) {
    const o = offersFor(key);
    if (!o.length) return '';
    const best = o.reduce((a, b) => (unitPrice(b) < unitPrice(a) ? b : a));
    return `<div class="banner info small">${icon('scale', 'sm')}<span>کمترین قیمت بازار: <b>${money(unitPrice(best))}</b> ${cmp.label} (${fa(o.length)} فروشنده)</span></div>`;
  }
  function priceField(label, val) {
    return `<label class="field"><span>${label}</span><div class="input-suffix"><input class="input num" id="price" inputmode="numeric" data-num data-in="price" value="${val ? money(val) : ''}" placeholder="۰" data-focus><em>تومان</em></div>
      <div class="hint" id="unitHint"></div></label>`;
  }
  const stockRow = (on) => `<div class="card between"><div><b>موجوده؟</b><div class="tiny muted">اگه تموم شد، فقط خاموشش کن.</div></div><button class="switch ${on ? 'on' : ''}" data-act="add-stock" aria-label="موجودی"></button></div>`;

  function addForm() {
    const A = ui.add, s = A.sel;
    if (s.type === 'ref') {
      const r = R(s.id), g = G(r.goodId);
      return `<div class="card flex" style="gap:12px">${thumb(r.img || g.img, 'lg')}<div class="grow"><div class="bold">${esc(r.name)}</div><div class="small muted">${esc(r.brand)} · ${esc(r.pack)}</div>
          <span class="badge green" style="margin-top:4px">${icon('check', 'sm')} کالای مرجع آی‌مچ</span></div><button class="link" data-act="add-reset">تغییر</button></div>
        ${A.dupId ? `<div class="banner amber small">${icon('info', 'sm')}<span>این کالا در کاتالوگت هست؛ با ذخیره، قیمتش به‌روز می‌شه.</span></div>` : ''}
        ${priceField('قیمت هر ' + esc(r.pack), A.price)}
        ${marketHint('r:' + r.id, g.cmp)}
        ${stockRow(A.inStock)}`;
    }
    if (s.type === 'good') {
      const g = G(s.id);
      const pack = curPack();
      return `<div class="card flex" style="gap:12px">${thumb(g.img, 'lg')}<div class="grow"><div class="bold">${esc(g.name)}</div><div class="small muted">فله / بدون برند · ${esc(g.cat)}</div>
          <span class="badge green" style="margin-top:4px">${icon('check', 'sm')} نوع کالای مرجع</span></div><button class="link" data-act="add-reset">تغییر</button></div>
        <div class="field"><span>بسته‌بندی</span><div class="chips">${g.packs.map((p, i) => `<button class="chip ${A.packIdx === i ? 'on' : ''}" data-act="add-pack" data-i="${i}">${p.label}</button>`).join('')}
          <button class="chip ${A.packIdx === -1 ? 'on' : ''}" data-act="add-pack" data-i="-1">سایر</button></div>
          ${A.packIdx === -1 ? `<div class="input-suffix" style="margin-top:8px"><input class="input num" id="customQty" inputmode="numeric" data-num data-in="customqty" value="${A.customQty ? money(A.customQty) : ''}" placeholder="چند ${g.unit}؟"><em>${g.unit}</em></div>` : ''}</div>
        ${g.grades.length ? `<div class="field"><span>کیفیت <span class="muted tiny">(اختیاری)</span></span><div class="chips">${g.grades.map((x) => `<button class="chip ${A.grade === x ? 'on' : ''}" data-act="add-grade" data-g="${x}">${x}</button>`).join('')}</div></div>` : ''}
        ${priceField('قیمت ' + (pack ? 'هر ' + esc(pack.label) : ''), A.price)}
        ${marketHint('g:' + g.id, g.cmp)}
        ${stockRow(A.inStock)}`;
    }
    /* کالای جدید: همچنان به یک «نوع کالا» وصل می‌شود تا مقایسه ممکن بماند */
    const gq = search(A.newName || '').filter((x) => x.e.type === 'good').map((x) => x.e.g);
    const opts = (A.showAllGoods || !gq.length ? goods : gq);
    const g = A.goodId && G(A.goodId);
    return `<label class="field"><span>نام کالا</span><input class="input" id="newName" data-in="newname" value="${esc(A.newName || '')}" placeholder="مثلاً رب گوجه‌فرنگی روژین ۸۰۰ گرمی"></label>
      <div class="field"><span>این کالا از چه نوعیه؟ <span class="muted tiny">(برای مقایسهٔ قیمت لازمه)</span></span>
        <div class="chips">${opts.map((x) => `<button class="chip ${A.goodId === x.id ? 'on' : ''}" data-act="new-good" data-id="${x.id}">${x.name}</button>`).join('')}
        ${!A.showAllGoods && gq.length ? '<button class="chip" data-act="new-allgoods">همه…</button>' : ''}</div></div>
      <label class="field"><span>برند <span class="muted tiny">(اگه داره)</span></span><input class="input" id="newBrand" value="${esc(A.newBrand || '')}" placeholder="مثلاً روژین"></label>
      <div class="grid2"><label class="field"><span>بسته‌بندی</span><input class="input" id="newPack" value="${esc(A.newPack || '')}" placeholder="کارتن ۱۲ عددی"></label>
        <label class="field"><span>مقدار کل بسته</span><div class="input-suffix"><input class="input num" id="customQty" inputmode="numeric" data-num data-in="customqty" value="${A.customQty ? money(A.customQty) : ''}" placeholder="۰"><em>${g ? g.unit : 'واحد'}</em></div></label></div>
      <button class="btn ghost block" data-act="photo">${icon('camera')} افزودن عکس</button>
      ${priceField('قیمت هر بسته', A.price)}
      ${stockRow(A.inStock)}
      <div class="banner info small">${icon('info', 'sm')}<span>بعد از بررسی به کالاهای مرجع اضافه می‌شه. تا اون موقع هم در کاتالوگت نمایش داده می‌شه${g ? ' و با بقیهٔ «' + esc(g.name) + '»ها مقایسه می‌شه' : ''}.</span></div>`;
  }
  function curPack() {
    const A = ui.add, g = G(A.sel.id);
    if (A.packIdx === -1) return A.customQty ? { label: fa(A.customQty) + ' ' + g.unit + 'ی', qty: A.customQty } : null;
    return g.packs[A.packIdx] || null;
  }
  function updUnitHint() {
    const el = document.getElementById('unitHint'); if (!el) return;
    const A = ui.add; let qty = 0, g;
    if (!A.sel || !A.price) { el.textContent = ''; return; }
    if (A.sel.type === 'ref') { const r = R(A.sel.id); g = G(r.goodId); qty = r.qty; }
    else if (A.sel.type === 'good') { g = G(A.sel.id); const p = curPack(); qty = p ? p.qty : 0; }
    else { g = A.goodId && G(A.goodId); qty = A.customQty; }
    el.textContent = g && qty ? `≈ ${money((A.price / qty) * g.cmp.qty)} تومان ${g.cmp.label} — خریدارها همین عدد رو مقایسه می‌کنن` : '';
  }

  /* ── چسباندن لیست قیمت ── */
  const SAMPLE = 'برنج هاشمی درجه یک کیسه ۱۰ کیلویی ۵۹۵ هزار\nروغن لادن ۱.۸ لیتری کارتن ۶ تایی ۲,۴۵۰,۰۰۰\nپفک مینو کارتن ۲۴ عددی 590000 تومان\nرب چین چین ۸۰۰ گرمی کارتنی ۱٬۱۵۰٬۰۰۰\nقند کیسه ۱۰ کیلویی ۷۷۰ هزار\nنوشابه کوکا خانواده ۳۸۰۰۰۰';
  const GRADES = ['درجه یک', 'درجه 1', 'ممتاز', 'معمولی'];
  function parseLine(line) {
    let s = norm(toLatin(line).replace(/(\d)[,٬.](?=\d{3}(\D|$))/g, '$1'));
    const nums = []; const re = /(\d+(?:\.\d+)?)\s*(میلیون|هزار)?/g; let m;
    while ((m = re.exec(s))) { let v = parseFloat(m[1]); if (m[2] === 'هزار') v *= 1e3; if (m[2] === 'میلیون') v *= 1e6; nums.push({ v, raw: m[0], idx: m.index }); }
    let price = 0;
    const cand = nums.filter((x) => x.v >= 1000);
    if (cand.length) { const b = cand.reduce((a, c) => (c.v > a.v ? c : a)); price = b.v; s = s.slice(0, b.idx) + ' ' + s.slice(b.idx + b.raw.length); }
    const km = s.match(/(\d+(?:\.\d+)?)\s*کیلو/); const kg = km ? parseFloat(km[1]) : null;
    let grade = null; GRADES.forEach((gr) => { const n = norm(gr); if (s.includes(n)) { grade = gr === 'درجه 1' ? 'درجه یک' : gr; s = s.replace(n, ' '); } });
    const q = s.replace(/تومان|تومن|ریال|کارتنی|کارتن|کیسه|تایی|عددی|عدد|کیلویی|کیلو|گرمی|لیتری|\d+(\.\d+)?/g, ' ');
    const r = search(q)[0];
    const row = { src: line, price, on: false, conf: 'none', match: null };
    if (r) {
      row.conf = r.ratio === 1 ? 'sure' : 'check';
      row.match = { type: r.e.type, id: r.e.id, grade };
      if (r.e.type === 'good') {
        const g = r.e.g; const p = kg && g.packs.find((x) => x.qty === kg);
        row.match.pack = p ? { label: p.label, qty: p.qty } : kg ? { label: fa(kg) + ' کیلویی', qty: kg } : g.packs[0] ? { label: g.packs[0].label, qty: g.packs[0].qty } : null;
      }
      row.on = !!(price && row.match && (r.e.type === 'ref' || row.match.pack));
    }
    return row;
  }
  function matchLabel(mt) {
    if (mt.type === 'ref') { const r = R(mt.id); return { img: r.img, name: r.name, sub: r.brand + ' · ' + r.pack }; }
    const g = G(mt.id); return { img: g.img, name: g.name + (mt.grade ? ' ' + mt.grade : ''), sub: (mt.pack ? mt.pack.label : 'بسته‌بندی؟') + ' · فله' };
  }
  V.paste = () => {
    const P = ui.paste;
    if (!P.rows) {
      const body = `<div class="h2">لیست قیمتت رو بچسبون</div>
        <div class="small muted">همون متنی که برای مشتری‌هات توی تلگرام یا واتس‌اپ می‌فرستی. هر خط یک کالا؛ قیمت با «هزار» یا بدونش.</div>
        <textarea class="input" id="pasteText" data-in="pastetext" placeholder="${esc(SAMPLE.split('\n').slice(0, 3).join('\n'))}" data-focus>${esc(P.text || '')}</textarea>
        <button class="link" data-act="paste-sample">استفاده از متن نمونه</button>`;
      return layout({ back: '/add', title: 'چسباندن لیست قیمت', body, footer: '<button class="btn primary block" data-act="paste-run">تطبیق خودکار</button>' });
    }
    const on = P.rows.filter((r) => r.on).length;
    const sure = P.rows.filter((r) => r.conf === 'sure').length;
    const body = `<div class="banner green small">${icon('check', 'sm')}<span>${fa(sure)} از ${fa(P.rows.length)} خط با اطمینان به کالای مرجع وصل شد. بقیه رو یه نگاه بنداز.</span></div>
      <div class="list">${P.rows.map((r, i) => {
        const conf = { sure: '<span class="badge green">مطمئن</span>', check: '<span class="badge amber">بررسی کن</span>', none: '<span class="badge red">پیدا نشد</span>' }[r.conf];
        const ml = r.match && matchLabel(r.match);
        return `<div class="paste-row"><button class="check ${r.on ? 'on' : ''}" data-act="paste-toggle" data-i="${i}" aria-label="انتخاب">${icon('check')}</button><div>
          <div class="between"><div class="src">«${esc(r.src)}»</div>${conf}</div>
          ${ml ? `<div class="match">${thumb(ml.img)}<div class="grow"><div class="small bold">${esc(ml.name)}</div><div class="tiny muted">${esc(ml.sub)}</div></div><button class="link" data-act="paste-pick" data-i="${i}">تغییر</button></div>`
            : `<button class="btn ghost sm" style="margin-top:6px" data-act="paste-pick" data-i="${i}">${icon('search', 'sm')} انتخاب کالا</button>`}
          <div class="input-suffix" style="margin-top:8px"><input class="input num" style="height:40px;font-size:14px" inputmode="numeric" data-num data-in="pasteprice" data-i="${i}" value="${r.price ? money(r.price) : ''}" placeholder="قیمت"><em>تومان</em></div>
        </div></div>`;
      }).join('')}</div>`;
    return layout({ back: '/paste', title: 'بررسی تطبیق', sub: 'تیک‌خورده‌ها به کاتالوگ اضافه می‌شن', body, footer: `<button class="btn primary block" data-act="paste-commit" ${on ? '' : 'disabled'}>افزودن ${fa(on)} کالا به کاتالوگ</button>` })
      .replace('data-to="/paste"', 'data-to="/paste" data-reset="paste"');
  };

  /* ── به‌روزرسانی گروهی قیمت ── */
  V.prices = () => {
    if (!ui.prices) { ui.prices = {}; mine().forEach((l) => { ui.prices[l.id] = { price: l.price, inStock: l.inStock }; }); }
    const ls = mine().sort((a, b) => b.updatedAt - a.updatedAt).reverse();
    const body = `<div class="card"><div class="small bold" style="margin-bottom:8px">تغییر همهٔ قیمت‌ها با یک لمس</div>
        <div class="chips nowrap">${[-5, 2, 5, 10].map((p) => `<button class="chip" data-act="bulk-pct" data-p="${p}">${p > 0 ? '+' : '−'}${fa(Math.abs(p))}٪</button>`).join('')}<button class="chip" data-act="bulk-undo">${icon('refresh', 'sm')} برگردون</button></div></div>
      <div class="list">${ls.map((l) => bulkRow(l)).join('')}</div>
      <div class="small muted" style="text-align:center">قیمت‌ها تغییری نکرده؟ «تأیید همه» رو بزن تا خریدارها بدونن قیمت‌هات تازه‌ست.</div>`;
    return layout({ back: '/catalog', title: 'به‌روزرسانی قیمت‌ها', sub: 'عوض کن و یکجا ذخیره کن', body,
      footer: `<button class="btn ghost" data-act="bulk-confirm">تأیید همه</button><button class="btn primary grow" id="bulkSave" data-act="bulk-save">${saveLabel()}</button>` });
  };
  function bulkRow(l) {
    const d = ui.prices[l.id]; const dirty = d.price !== l.price || d.inStock !== l.inStock;
    return `<div class="bulk-row ${dirty ? 'dirty' : ''}" id="br-${l.id}">${thumb(lImg(l))}<div style="min-width:0"><div class="small bold" style="line-height:1.5">${esc(lTitle(l))}</div><div class="tiny muted">${esc(l.pack)} · ${ago(l.updatedAt)}</div>
      <button class="badge ${d.inStock ? 'green' : 'muted'} stock" data-act="bulk-stock" data-id="${l.id}">${d.inStock ? 'موجود' : 'تمام شد'}</button></div>
      <input class="input num" inputmode="numeric" data-num data-in="bulkprice" data-id="${l.id}" value="${money(d.price)}"></div>`;
  }
  function dirtyCount() { return mine().filter((l) => { const d = ui.prices[l.id]; return d && (d.price !== l.price || d.inStock !== l.inStock); }).length; }
  function saveLabel() { const n = dirtyCount(); return n ? `ذخیرهٔ ${fa(n)} تغییر` : 'ذخیره'; }

  /* ── کاتالوگ عمومی (لینک اشتراکی) ── */
  V.shop = (id) => {
    const b = B(id) || B('b2');
    const own = st.authed && b.id === ME;
    const ls = st.listings.filter((l) => l.bizId === b.id && l.inStock !== false || (l.bizId === b.id && own));
    const watched = new Set(st.buyList);
    let body = own ? `<div class="banner orange small">${icon('eye', 'sm')}<span class="grow">این همون صفحه‌ایه که مشتری‌هات با لینک کاتالوگ می‌بینن.</span><button class="link" data-act="share">ارسال لینک</button></div>` : '';
    body += `<div class="card"><div class="flex" style="gap:12px"><div class="avatar">${initial(b.name)}</div><div class="grow"><div class="bold">${esc(b.name)}</div><div class="small muted">${esc(b.trade || '')} · ${icon('pin', 'sm')} ${esc(b.city)}</div></div></div>
      ${own ? '' : `<div class="grid2" style="margin-top:12px"><button class="btn dark" data-act="call" data-phone="${b.phone}">${icon('phone', 'sm')} تماس</button><button class="btn ghost" data-act="share-shop">${icon('share', 'sm')} ارسال به همکار</button></div>`}</div>`;
    body += `<div class="sec-title"><span>${fa(ls.length)} کالا</span><span class="tiny muted">قیمت‌ها به تومان</span></div>`;
    body += `<div class="list">${ls.map((l) => {
      const key = l.refId ? 'r:' + l.refId : 'g:' + l.goodId; const has = watched.has(key);
      return `<div class="row">${thumb(lImg(l))}<div class="body"><div class="name">${esc(lTitle(l))}</div><div class="sub">${esc(lSub(l))}</div><div class="tiny muted">به‌روز: ${ago(l.updatedAt)}</div></div>
        <div class="end"><div class="price">${money(l.price)}</div>${own ? '' : `<button class="btn ${has ? 'ghost' : 'soft'} sm" style="margin-top:6px" data-act="shop-add" data-key="${key}">${has ? icon('check', 'sm') + ' در لیست' : icon('plus', 'sm') + ' لیست خرید'}</button>`}</div></div>`;
    }).join('')}</div>`;
    if (!own) body += `<div class="small muted" style="text-align:center">با «لیست خرید»، قیمت این کالا رو از همهٔ فروشنده‌ها کنار هم می‌بینی.</div>`;
    return layout({ back: st.authed ? (own ? '/catalog' : '/buy') : '/', title: 'کاتالوگ', sub: 'imach.ir/c/' + b.id, body });
  };

  /* ── لیست خرید ── */
  V.buy = () => {
    const items = st.buyList.map((key) => {
      const o = offersFor(key); const g = goodOfKey(key);
      const best = o.length ? o.reduce((a, b) => (unitPrice(b) < unitPrice(a) ? b : a)) : null;
      return { key, o, g, best };
    });
    let body = `<button class="search" data-go="/buy-add" style="width:100%">${icon('plus')}<span class="muted grow" style="text-align:right">افزودن کالا به لیست خرید</span></button>`;
    if (!items.length) {
      body += `<div class="card empty">${icon('list')}<b>لیست خریدت خالیه</b>کالاهایی که مرتب می‌خری رو اضافه کن تا قیمت همهٔ فروشنده‌ها رو کنار هم ببینی.</div>`;
    } else {
      body += `<div class="banner info small">${icon('scale', 'sm')}<span>قیمت‌ها به «هر کیلو / هر لیتر» تبدیل می‌شن تا بسته‌بندی‌های مختلف قابل مقایسه باشن.</span></div>`;
      body += `<div class="list">${items.map(({ key, o, g, best }) => {
        const isRef = key[0] === 'r';
        const bb = best && B(best.bizId);
        return `<button class="row" data-go="/board/${key}">${thumb(keyImg(key))}<div class="body"><div class="name">${esc(keyTitle(key))}</div>
          <div class="sub">${isRef ? 'همین برند' : 'هر برند / فله'} · ${fa(o.length)} فروشنده</div>
          ${bb ? `<div class="tiny muted">ارزان‌ترین: ${esc(bb.name)}، ${esc(bb.city)}</div>` : ''}</div>
          <div class="end">${best ? `<div class="price">${money(unitPrice(best))}</div><div class="tiny muted">${g.cmp.label}</div>${trend(best)}` : '<span class="badge muted">بدون فروشنده</span>'}</div></button>`;
      }).join('')}</div>`;
    }
    return layout({ title: 'لیست خرید من', sub: 'قیمت همهٔ فروشنده‌ها، کنار هم', body, tab: 'buy' });
  };

  /* ── تابلوی قیمت یک کالا ── */
  V.board = (key) => {
    if (!key || !key.includes(':')) return V.buy();
    const g = goodOfKey(key); const isRef = key[0] === 'r';
    const me = st.me; const myProv = province(me.city);
    const near = (b) => (b.city === me.city ? 0 : province(b.city) === myProv ? 1 : 2);
    const o = offersFor(key).slice();
    const minU = o.length ? Math.min(...o.map(unitPrice)) : 0;
    const sorters = { cheap: (a, b) => unitPrice(a) - unitPrice(b), near: (a, b) => near(B(a.bizId)) - near(B(b.bizId)) || unitPrice(a) - unitPrice(b), fresh: (a, b) => b.updatedAt - a.updatedAt };
    o.sort(sorters[ui.sort] || sorters.cheap);
    const inList = st.buyList.includes(key);
    let body = `<div class="chips nowrap">${[['cheap', 'ارزان‌ترین'], ['near', 'نزدیک‌ترین'], ['fresh', 'تازه‌ترین']].map(([k, l]) => `<button class="chip ${ui.sort === k ? 'on' : ''}" data-act="sort" data-s="${k}">${l}</button>`).join('')}</div>`;
    body += `<div class="small muted">${isRef ? 'فقط همین محصول (همین برند و بسته‌بندی).' : `همهٔ برندها و بسته‌بندی‌های «${esc(g.name)}» — قیمت هر بسته به «${g.cmp.label}» تبدیل شده.`}</div>`;
    if (!o.length) body += `<div class="card empty">${icon('store')}<b>هنوز فروشنده‌ای نیست</b>به محض اینکه کسی این کالا رو ثبت کنه، اینجا می‌بینیش.</div>`;
    body += o.map((l) => {
      const b = B(l.bizId); const n = near(b); const best = unitPrice(l) === minU;
      const r = l.refId && R(l.refId);
      const desc = [l.pack, l.grade, !isRef && r ? r.brand : (!isRef && !l.refId ? 'فله' : '')].filter(Boolean).join(' · ');
      return `<div class="sup ${best ? 'best' : ''}"><div class="top"><div class="avatar sm">${initial(b.name)}</div>
        <div class="grow"><div class="flex" style="gap:6px;flex-wrap:wrap"><b>${esc(b.name)}</b>${n === 0 ? '<span class="badge green">هم‌شهری</span>' : n === 1 ? '<span class="badge muted">هم‌استانی</span>' : ''}${best ? '<span class="badge orange">ارزان‌ترین</span>' : ''}</div>
          <div class="tiny muted">${icon('pin', 'sm')} ${esc(b.city)} · به‌روز: <span class="${isStale(l, 7) ? 'orange' : ''}">${ago(l.updatedAt)}</span></div></div>
        <div style="text-align:left"><div class="norm">${money(unitPrice(l))}</div><div class="tiny muted">تومان ${g.cmp.label}</div></div></div>
        <div class="between small" style="margin-top:8px"><span class="muted">${esc(desc)}: <b style="color:var(--fg)">${money(l.price)}</b></span><span>${trend(l)} ${l.inStock ? '' : '<span class="badge muted">ناموجود</span>'}</span></div>
        <div class="acts"><button class="btn dark sm" data-act="call" data-phone="${b.phone}">${icon('phone', 'sm')} تماس</button><button class="btn ghost sm" data-go="/shop/${b.id}">${icon('store', 'sm')} کاتالوگ</button></div></div>`;
    }).join('');
    if (isRef) {
      const others = st.listings.filter((l) => l.bizId !== ME && l.goodId === g.id && l.refId !== key.slice(2));
      const byRef = {};
      others.forEach((l) => { const k = l.refId ? 'r:' + l.refId : 'g:' + l.goodId; if (!byRef[k] || unitPrice(l) < unitPrice(byRef[k])) byRef[k] = l; });
      const arr = Object.entries(byRef).sort((a, b) => unitPrice(a[1]) - unitPrice(b[1]));
      if (arr.length) {
        body += `<div class="sec-title" style="margin-top:20px"><span>همین کالا، برندهای دیگر</span><button class="link" data-go="/board/g:${g.id}">مقایسهٔ همه</button></div>
          <div class="list">${arr.map(([k, l]) => { const diff = minU ? ((unitPrice(l) - minU) / minU) * 100 : 0;
            return `<button class="row" data-go="/board/${k}">${thumb(lImg(l))}<div class="body"><div class="name">${esc(keyTitle(k))}</div><div class="sub">${diff < 0 ? `<span class="green bold">${fa(Math.abs(diff).toFixed(0))}٪ ارزان‌تر</span>` : `${fa(diff.toFixed(0))}٪ گران‌تر`} ${g.cmp.label}</div></div>
              <div class="end"><div class="price">${money(unitPrice(l))}</div><div class="tiny muted">${g.cmp.label}</div></div></button>`; }).join('')}</div>`;
      }
    }
    const actions = `<button class="icon-btn" data-act="${inList ? 'unwatch' : 'watch'}" data-key="${key}" aria-label="${inList ? 'حذف از لیست' : 'افزودن به لیست'}">${icon(inList ? 'trash' : 'plus')}</button>`;
    return layout({ back: '/buy', title: esc(keyTitle(key)), sub: `${fa(o.length)} فروشنده · مقایسه ${g.cmp.label}`, actions, body });
  };

  /* ── افزودن به لیست خرید ── */
  V['buy-add'] = () => {
    const body = `<label class="search">${icon('search')}<input id="bq" data-in="buyq" placeholder="چی می‌خری؟ مثلاً «روغن» یا «رب»" value="${esc(ui.bq || '')}" autocomplete="off" data-focus>
      <button class="icon-btn" style="border:0;width:34px" data-act="scan" aria-label="اسکن بارکد">${icon('scan')}</button></label>
      <div class="small muted">«هر برندی» رو انتخاب کن تا همهٔ برندها و بسته‌بندی‌ها با هم مقایسه بشن؛ یا یک برند مشخص.</div>
      <div id="res">${resultsHtml(ui.bq || '', 'buy')}</div>`;
    return layout({ back: '/buy', title: 'افزودن به لیست خرید', body });
  };

  /* ── پروفایل ── */
  V.profile = () => {
    const me = st.me; const cities = ['رشت', 'لاهیجان', 'تهران', 'قزوین', 'اصفهان'];
    const body = `<div class="card flex" style="gap:12px"><div class="avatar">${initial(me.name)}</div><div class="grow"><div class="bold">${esc(me.name)}</div><div class="small muted" dir="ltr" style="text-align:right">${fa(me.phone)}</div></div></div>
      <div class="card stack"><label class="field"><span>اسم کسب‌وکار</span><input class="input" id="pfName" value="${esc(me.name)}"></label>
        <label class="field"><span>صنف</span><input class="input" id="pfTrade" value="${esc(me.trade || '')}" placeholder="مثلاً پخش مواد غذایی"></label>
        <div class="field"><span>شهر</span><div class="chips">${cities.map((c) => `<button class="chip ${me.city === c ? 'on' : ''}" data-act="pf-city" data-c="${c}">${c}</button>`).join('')}</div></div>
        <button class="btn primary block" data-act="pf-save">ذخیره</button></div>
      <div class="list">
        <button class="row" data-act="share">${icon('link')}<div class="body"><div class="name">لینک کاتالوگ من</div><div class="sub">imach.ir/c/${ME}</div></div>${icon('chev', 'sm')}</button>
        <button class="row" data-go="/shop/${ME}">${icon('eye')}<div class="body"><div class="name">کاتالوگم از دید مشتری</div></div>${icon('chev', 'sm')}</button>
        <button class="row" data-act="about">${icon('info')}<div class="body"><div class="name">دربارهٔ این نسخهٔ MVP</div><div class="sub">چی هست، چی عمداً نیست</div></div>${icon('chev', 'sm')}</button>
        <button class="row" data-act="reset">${icon('refresh')}<div class="body"><div class="name">بازنشانی داده‌های نمایشی</div></div></button>
        <button class="row red" data-act="logout">${icon('x')}<div class="body"><div class="name">خروج</div></div></button>
      </div>`;
    return layout({ title: 'پروفایل', body, tab: 'profile' });
  };

  /* ══════════════ رندر ══════════════ */
  const PRIVATE = ['catalog', 'add', 'paste', 'prices', 'buy', 'board', 'buy-add', 'profile'];
  function render() {
    closeSheet();
    const r = route();
    if (!st.authed && PRIVATE.includes(r.name)) return go('/login');
    if (st.authed && (r.name === '' || r.name === 'login')) return go('/catalog');
    if (r.name !== 'prices') ui.prices = null;
    const h = location.hash || '#/';
    const top = ui.stack[ui.stack.length - 1];
    if (top !== h) { if (ui.stack[ui.stack.length - 2] === h) ui.stack.pop(); else ui.stack.push(h); }
    const view = V[r.name] || V.catalog;
    app.innerHTML = view(r.arg);
    const f = app.querySelector('[data-focus]');
    if (f && window.innerWidth > 480) { f.focus(); if (f.setSelectionRange && f.type !== 'number') { const n = f.value.length; try { f.setSelectionRange(n, n); } catch (e) { /* noop */ } } }
    updUnitHint();
  }
  const rerender = () => { const m = document.getElementById('main'); const y = m ? m.scrollTop : 0; render(); const m2 = document.getElementById('main'); if (m2) m2.scrollTop = y; };

  /* ══════════════ رفتارها ══════════════ */
  function addListingFrom(spec) {
    /* spec: {type:'ref'|'good', id, pack?, grade?, price, inStock} — برنددارِ تکراری = به‌روزرسانی */
    if (spec.type === 'ref') {
      const r = R(spec.id); const ex = mine().find((l) => l.refId === r.id);
      if (ex) { if (ex.price !== spec.price) ex.prevPrice = ex.price; ex.price = spec.price; ex.inStock = spec.inStock; ex.updatedAt = Date.now(); return ex; }
      const l = { id: 'l' + Date.now() + Math.random().toString(36).slice(2, 5), bizId: ME, goodId: r.goodId, refId: r.id, pack: r.pack, qty: r.qty, price: spec.price, inStock: spec.inStock, updatedAt: Date.now() };
      st.listings.push(l); return l;
    }
    const ex = mine().find((l) => !l.refId && l.goodId === spec.id && l.qty === spec.pack.qty && (l.grade || null) === (spec.grade || null));
    if (ex) { if (ex.price !== spec.price) ex.prevPrice = ex.price; ex.price = spec.price; ex.inStock = spec.inStock; ex.updatedAt = Date.now(); return ex; }
    const l = { id: 'l' + Date.now() + Math.random().toString(36).slice(2, 5), bizId: ME, goodId: spec.id, grade: spec.grade || undefined, pack: spec.pack.label, qty: spec.pack.qty, price: spec.price, inStock: spec.inStock, updatedAt: Date.now() };
    st.listings.push(l); return l;
  }

  function shareSheet() {
    openSheet(`<div class="h2">لینک کاتالوگ تو</div>
      <div class="search" style="height:48px"><input readonly value="imach.ir/c/${ME}" dir="ltr"><button class="btn soft sm" data-act="copy">${icon('copy', 'sm')} کپی</button></div>
      <div class="grid2"><button class="btn ghost" data-act="fake-send" data-to="واتس‌اپ">${icon('msg', 'sm')} واتس‌اپ</button><button class="btn ghost" data-act="fake-send" data-to="تلگرام">${icon('share', 'sm')} تلگرام</button></div>
      <div class="small muted">هر کسی با این لینک قیمت‌های به‌روزت رو می‌بینه و می‌تونه کالاهات رو به لیست خریدش اضافه کنه. هر بار قیمت عوض کنی، لینک خودش به‌روزه — لازم نیست دوباره بفرستی.</div>`);
  }

  const ACT = {
    back: (el) => (el.dataset.reset === 'paste' ? (ui.paste.rows = null, rerender()) : back(el.dataset.to)),
    /* ورود */
    'login-send': () => { const p = parseNum(document.getElementById('phoneIn').value); const s = String(p).padStart(11, '0'); if (s.length !== 11) return toast('شماره ۱۱ رقمی وارد کن'); ui.login.phone = s; ui.login.step = 2; rerender(); },
    'login-edit': () => { ui.login.step = 1; rerender(); },
    'login-verify': () => {
      const demo = ui.login.phone === SEED.businesses[0].phone;
      if (demo) { st = fresh(); st.authed = true; save(); ui.login = { step: 1 }; toast('خوش اومدی'); return go('/catalog'); }
      ui.login.step = 3; rerender();
    },
    'login-city': (el) => { ui.login.city = el.dataset.c; app.querySelectorAll('[data-act="login-city"]').forEach((c) => c.classList.toggle('on', c === el)); },
    'login-finish': () => {
      const name = document.getElementById('bizName').value.trim();
      if (!name) return toast('اسم کسب‌وکار رو بنویس');
      if (!ui.login.city) return toast('شهرت رو انتخاب کن');
      st = fresh(); st.authed = true; st.me = { id: ME, name, city: ui.login.city, phone: ui.login.phone, trade: '' };
      st.listings = st.listings.filter((l) => l.bizId !== ME); st.buyList = [];
      save(); ui.login = { step: 1 }; go('/catalog');
    },
    logout: () => { st.authed = false; save(); go('/'); },
    reset: () => { const a = st.authed; st = fresh(); st.authed = a; save(); ui.add = {}; ui.paste = {}; toast('داده‌های نمایشی بازنشانی شد'); go('/catalog'); },
    /* کاتالوگ */
    share: shareSheet,
    'share-shop': () => toast('لینک کاتالوگ کپی شد (نمایشی)'),
    copy: () => { try { navigator.clipboard.writeText('https://imach.ir/c/' + ME); } catch (e) { /* noop */ } toast('لینک کپی شد'); },
    'fake-send': (el) => { closeSheet(); toast('ارسال در ' + el.dataset.to + ' (نمایشی)'); },
    call: (el) => toast('تماس با ' + fa(el.dataset.phone) + ' (نمایشی)'),
    edit: (el) => {
      const l = st.listings.find((x) => x.id === el.dataset.id); if (!l) return;
      const r = l.refId && R(l.refId);
      openSheet(`<div class="flex" style="gap:12px">${thumb(lImg(l), 'lg')}<div class="grow"><div class="bold">${esc(lTitle(l))}</div><div class="small muted">${esc(lSub(l))}</div>
          <span class="badge green" style="margin-top:4px">${icon('check', 'sm')} ${r ? 'وصل به کالای مرجع' : 'وصل به نوع کالای «' + esc(G(l.goodId).name) + '»'}</span>${r && r.pending ? ' <span class="badge amber">در انتظار تأیید</span>' : ''}</div></div>
        <label class="field"><span>قیمت هر ${esc(l.pack)}</span><div class="input-suffix"><input class="input num" id="editPrice" inputmode="numeric" data-num value="${money(l.price)}" data-focus><em>تومان</em></div></label>
        <div class="card between"><b>موجوده؟</b><button class="switch ${l.inStock ? 'on' : ''}" id="editStock" data-act="sw" aria-label="موجودی"></button></div>
        <button class="btn primary block" data-act="edit-save" data-id="${l.id}">ذخیره</button>
        <button class="btn ghost block red" data-act="edit-del" data-id="${l.id}">${icon('trash', 'sm')} حذف از کاتالوگ</button>`);
    },
    sw: (el) => el.classList.toggle('on'),
    'edit-save': (el) => {
      const l = st.listings.find((x) => x.id === el.dataset.id); const p = parseNum(document.getElementById('editPrice').value);
      if (!p) return toast('قیمت رو وارد کن');
      if (p !== l.price) l.prevPrice = l.price;
      l.price = p; l.inStock = document.getElementById('editStock').classList.contains('on'); l.updatedAt = Date.now();
      save(); closeSheet(); rerender(); toast('ذخیره شد');
    },
    'edit-del': (el) => { st.listings = st.listings.filter((x) => x.id !== el.dataset.id); save(); closeSheet(); rerender(); toast('حذف شد'); },
    /* افزودن */
    pick: (el) => {
      const type = el.dataset.type, id = el.dataset.id;
      const dup = type === 'ref' && mine().find((l) => l.refId === id);
      ui.add = { q: ui.add.q, sel: { type, id }, inStock: true, packIdx: type === 'good' ? (G(id).packs.length ? G(id).packs.length - 1 : -1) : 0, price: dup ? dup.price : 0, dupId: dup ? dup.id : null };
      rerender();
    },
    'add-reset': () => { ui.add = { q: ui.add.q }; rerender(); },
    'add-pack': (el) => { ui.add.packIdx = +el.dataset.i; rerender(); },
    'add-grade': (el) => { ui.add.grade = ui.add.grade === el.dataset.g ? null : el.dataset.g; rerender(); },
    'add-stock': (el) => { ui.add.inStock = !ui.add.inStock; el.classList.toggle('on', ui.add.inStock); },
    'new-item': () => { ui.add = { q: ui.add.q, sel: { type: 'new' }, newName: ui.add.q || '', inStock: true }; const gq = search(ui.add.newName).find((x) => x.e.type === 'good'); if (gq) ui.add.goodId = gq.e.id; rerender(); },
    'new-good': (el) => { keepNewFields(); ui.add.goodId = el.dataset.id; rerender(); },
    'new-allgoods': () => { keepNewFields(); ui.add.showAllGoods = true; rerender(); },
    photo: () => toast('انتخاب عکس از گالری یا دوربین (نمایشی)'),
    'add-save': () => {
      const A = ui.add; A.price = parseNum((document.getElementById('price') || {}).value);
      if (!A.price) return toast('قیمت رو وارد کن');
      let name;
      if (A.sel.type === 'ref') { addListingFrom({ type: 'ref', id: A.sel.id, price: A.price, inStock: A.inStock }); name = R(A.sel.id).name; }
      else if (A.sel.type === 'good') {
        const p = curPack(); if (!p) return toast('بسته‌بندی رو مشخص کن');
        addListingFrom({ type: 'good', id: A.sel.id, pack: p, grade: A.grade, price: A.price, inStock: A.inStock }); name = G(A.sel.id).name;
      } else {
        keepNewFields();
        if (!A.newName) return toast('نام کالا رو بنویس');
        if (!A.goodId) return toast('نوع کالا رو انتخاب کن');
        if (!A.customQty) return toast('مقدار کل بسته رو وارد کن');
        const ref = { id: 'c' + Date.now(), goodId: A.goodId, brand: A.newBrand || 'بدون برند', name: A.newName, pack: A.newPack || 'بسته', qty: A.customQty, img: null, pending: true };
        st.customRefs.push(ref);
        addListingFrom({ type: 'ref', id: ref.id, price: A.price, inStock: A.inStock }); name = ref.name;
      }
      save(); ui.add = { last: name }; rerender(); toast('به کاتالوگ اضافه شد');
    },
    scan: () => {
      const buying = route().name === 'buy-add';
      openSheet(`<div class="h2">اسکن بارکد</div><div class="scanner"><div class="frame"></div></div><div class="small muted" style="text-align:center">دوربین رو روی بارکد کالا بگیر…</div>`);
      setTimeout(() => {
        if (!phone.querySelector('.scanner')) return;
        const owned = new Set(mine().map((l) => l.refId));
        const r = SEED.refs.find((x) => (buying ? !st.buyList.includes('r:' + x.id) : !owned.has(x.id))) || SEED.refs[0];
        closeSheet(); toast('بارکد شناسایی شد: ' + r.name);
        if (buying) return ACT['buy-pick']({ dataset: { key: 'r:' + r.id } });
        ACT.pick({ dataset: { type: 'ref', id: r.id } });
      }, 1500);
    },
    /* چسباندن */
    'paste-sample': () => { ui.paste.text = SAMPLE; rerender(); },
    'paste-run': () => {
      const t = document.getElementById('pasteText').value; ui.paste.text = t;
      const lines = t.split('\n').map((s) => s.trim()).filter(Boolean);
      if (!lines.length) return toast('اول لیست رو بچسبون');
      ui.paste.rows = lines.map(parseLine); rerender();
    },
    'paste-toggle': (el) => { const r = ui.paste.rows[+el.dataset.i]; if (!r.match) return toast('اول کالا رو انتخاب کن'); if (!r.price) return toast('قیمت رو وارد کن'); r.on = !r.on; rerender(); },
    'paste-pick': (el) => {
      const i = +el.dataset.i; const r = ui.paste.rows[i];
      ui.sheetPick = (type, id) => {
        r.match = { type, id, grade: r.match && r.match.grade };
        if (type === 'good') { const g = G(id); const p = g.packs[g.packs.length - 1]; r.match.pack = p ? { label: p.label, qty: p.qty } : null; }
        r.conf = 'sure'; r.on = !!(r.price && (type === 'ref' || r.match.pack)); closeSheet(); rerender();
      };
      const q = r.src.replace(/[\d۰-۹,٬.]+/g, ' ').replace(/هزار|تومان|تومن/g, ' ').trim();
      ui.sq = q;
      openSheet(`<div class="h2">انتخاب کالا</div><div class="small muted">«${esc(r.src)}»</div>
        <label class="search">${icon('search')}<input data-in="sheetq" value="${esc(q)}" autocomplete="off" data-focus></label><div id="sheetRes">${resultsHtml(q, 'sheet')}</div>`);
    },
    'sheet-pick': (el) => ui.sheetPick && ui.sheetPick(el.dataset.type, el.dataset.id),
    'paste-commit': () => {
      let n = 0;
      ui.paste.rows.filter((r) => r.on && r.match && r.price).forEach((r) => {
        if (r.match.type === 'ref') addListingFrom({ type: 'ref', id: r.match.id, price: r.price, inStock: true });
        else if (r.match.pack) addListingFrom({ type: 'good', id: r.match.id, pack: r.match.pack, grade: r.match.grade, price: r.price, inStock: true });
        n++;
      });
      save(); ui.paste = {}; toast(fa(n) + ' کالا به کاتالوگ اضافه شد'); go('/catalog');
    },
    /* گروهی */
    'bulk-pct': (el) => { const p = +el.dataset.p; mine().forEach((l) => { const d = ui.prices[l.id]; d.price = Math.round((d.price * (1 + p / 100)) / 1000) * 1000; }); rerender(); },
    'bulk-undo': () => { ui.prices = null; rerender(); },
    'bulk-stock': (el) => { const d = ui.prices[el.dataset.id]; d.inStock = !d.inStock; rerender(); },
    'bulk-save': () => {
      let n = 0;
      mine().forEach((l) => { const d = ui.prices[l.id]; if (d.price !== l.price || d.inStock !== l.inStock) { if (d.price !== l.price) l.prevPrice = l.price; l.price = d.price; l.inStock = d.inStock; l.updatedAt = Date.now(); n++; } });
      if (!n) return toast('تغییری نبود');
      save(); toast(fa(n) + ' قیمت ذخیره شد'); go('/catalog');
    },
    'bulk-confirm': () => { mine().forEach((l) => { l.updatedAt = Date.now(); }); save(); toast('همهٔ قیمت‌ها تأیید شد'); go('/catalog'); },
    /* خرید */
    'buy-pick': (el) => { const k = el.dataset.key; if (!st.buyList.includes(k)) { st.buyList.unshift(k); save(); toast('به لیست خرید اضافه شد'); } ui.bq = ''; go('/board/' + k); },
    'shop-add': (el) => {
      const k = el.dataset.key;
      if (!st.authed) { return openSheet(`<div class="h2">لیست خرید بساز</div><div class="small muted">با لیست خرید، قیمت این کالا رو از همهٔ فروشنده‌ها کنار هم می‌بینی و وقتی ارزون‌تر شد خبردار می‌شی. فقط شماره موبایل لازمه.</div><button class="btn primary block" data-go="/login">ورود با شماره موبایل</button>`); }
      if (st.buyList.includes(k)) { st.buyList = st.buyList.filter((x) => x !== k); toast('از لیست خرید حذف شد'); } else { st.buyList.unshift(k); toast('به لیست خرید اضافه شد'); }
      save(); rerender();
    },
    watch: (el) => { st.buyList.unshift(el.dataset.key); save(); rerender(); toast('به لیست خرید اضافه شد'); },
    unwatch: (el) => { st.buyList = st.buyList.filter((x) => x !== el.dataset.key); save(); toast('از لیست خرید حذف شد'); go('/buy'); },
    sort: (el) => { ui.sort = el.dataset.s; rerender(); },
    /* پروفایل */
    'pf-city': (el) => { st.me.city = el.dataset.c; app.querySelectorAll('[data-act="pf-city"]').forEach((c) => c.classList.toggle('on', c === el)); },
    'pf-save': () => { st.me.name = document.getElementById('pfName').value.trim() || st.me.name; st.me.trade = document.getElementById('pfTrade').value.trim(); save(); rerender(); toast('ذخیره شد'); },
    about: () => openSheet(`<div class="h2">دربارهٔ این نسخهٔ MVP</div>
      <div class="card"><b class="green">در MVP هست</b><ul class="small" style="padding-right:18px;margin-top:6px">
        <li>کاتالوگ فروش + لینک اشتراکی</li><li>ثبت کالا با یک جستجوی واحد، بارکد، یا چسباندن لیست قیمت — همیشه وصل به کالای مرجع</li>
        <li>به‌روزرسانی گروهی قیمت و «تأیید همه»</li><li>لیست خرید با قیمت مقایسه‌شده (هر کیلو/لیتر) بین همهٔ فروشنده‌ها</li><li>تماس مستقیم</li></ul></div>
      <div class="card"><b class="muted">عمداً بعداً</b><ul class="small muted" style="padding-right:18px;margin-top:6px">
        <li>کیف پول، کمپین و تبلیغ</li><li>درخواست قیمت و پیشنهاد</li><li>چت داخلی (فعلاً تماس/واتس‌اپ)</li><li>نظرات و امتیاز، تخفیف‌های پلکانی و همکار</li><li>سوییچ دو دستیار</li></ul></div>`),
  };
  function keepNewFields() {
    const A = ui.add; const v = (id) => (document.getElementById(id) || {}).value;
    if (v('newName') != null) A.newName = v('newName').trim();
    if (v('newBrand') != null) A.newBrand = v('newBrand').trim();
    if (v('newPack') != null) A.newPack = v('newPack').trim();
    if (v('customQty') != null) A.customQty = parseNum(v('customQty'));
    if (v('price') != null) A.price = parseNum(v('price'));
  }

  const IN = {
    addq: (el) => { ui.add.q = el.value; document.getElementById('res').innerHTML = resultsHtml(el.value, 'add'); },
    buyq: (el) => { ui.bq = el.value; document.getElementById('res').innerHTML = resultsHtml(el.value, 'buy'); },
    sheetq: (el) => { document.getElementById('sheetRes').innerHTML = resultsHtml(el.value, 'sheet'); },
    price: (el) => { ui.add.price = parseNum(el.value); updUnitHint(); },
    customqty: (el) => { ui.add.customQty = parseNum(el.value); updUnitHint(); },
    newname: (el) => { ui.add.newName = el.value; },
    pastetext: (el) => { ui.paste.text = el.value; },
    pasteprice: (el) => { const r = ui.paste.rows[+el.dataset.i]; r.price = parseNum(el.value); },
    otp: (el) => { el.value = toLatin(el.value).replace(/\D/g, ''); if (el.value && el.nextElementSibling) el.nextElementSibling.focus(); },
    bulkprice: (el) => {
      const id = el.dataset.id; ui.prices[id].price = parseNum(el.value);
      const l = st.listings.find((x) => x.id === id); const d = ui.prices[id];
      document.getElementById('br-' + id).classList.toggle('dirty', d.price !== l.price || d.inStock !== l.inStock);
      document.getElementById('bulkSave').textContent = saveLabel();
    },
  };

  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    if (a && ACT[a.dataset.act]) { e.preventDefault(); ACT[a.dataset.act](a); return; }
    const g = e.target.closest('[data-go]');
    if (g) { e.preventDefault(); closeSheet(); go(g.dataset.go); }
  });
  document.addEventListener('input', (e) => {
    const el = e.target;
    if (el.hasAttribute('data-num')) { const n = parseNum(el.value); el.value = n ? money(n) : ''; }
    const f = IN[el.dataset.in]; if (f) f(el);
  });
  document.addEventListener('change', (e) => { if (e.target.dataset.in === 'pasteprice') rerender(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });
  window.addEventListener('hashchange', render);
  render();
})();
