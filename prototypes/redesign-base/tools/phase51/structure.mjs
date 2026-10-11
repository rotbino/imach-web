// فاز ۵۱ — اعتبارسنج ساختار دائمی (درس فاز ۵۰): بالانس تگ با حذف کامنت‌ها و <script>
// پیش از اسکن + خودبسته‌های SVG + containment: همهٔ scr داخل #phone/#stage.
// اجرا: node tools/phase51/structure.mjs
import { readFileSync } from 'fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RB = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
let s = readFileSync(resolve(RB, 'index.html'), 'utf8');

/* کامنت‌ها و بدنهٔ اسکریپت‌ها اسکن نمی‌شوند (متن literal مثل «</div>» مثبت کاذب می‌دهد) */
s = s.replace(/<!--[\s\S]*?-->/g, '').replace(/<script[\s\S]*?<\/script>/g, '');

const stack = [];
const re = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g;
const voids = new Set(['img','input','br','hr','use','path','circle','rect','line','ellipse','polyline','polygon','meta','link','source','col','area','base','embed','track','wbr','stop','lineargradient','radialgradient','feGaussianblur','feoffset','fecomposite','flood','clippath']);
let m, bad = 0, opens = 0, closes = 0;
while ((m = re.exec(s))) {
  const closing = m[1] === '/';
  const tag = m[2].toLowerCase();
  const attrs = m[3] || '';
  const selfClosing = /\/\s*$/.test(attrs);
  if (voids.has(tag) || selfClosing) continue;
  if (!closing) { stack.push({ tag, i: m.index }); opens++; }
  else {
    closes++;
    const top = stack.pop();
    if (!top || top.tag !== tag) {
      bad++;
      const near = s.slice(Math.max(0, m.index - 70), m.index + 10).replace(/\n/g, ' ');
      console.log('MISMATCH: expected </' + (top ? top.tag : 'EOF') + '> got </' + tag + '> … ' + near);
      if (bad > 6) break;
    }
  }
}
if (stack.length) {
  bad++;
  console.log('UNCLOSED:', stack.slice(-6).map(x => x.tag + '@' + x.i).join(' · '));
}
console.log('opens=' + opens + ' closes=' + closes + ' residual=' + stack.length);
console.log(bad === 0 && stack.length === 0 ? 'TAG BALANCE OK' : 'TAG BALANCE FAIL (' + bad + ')');
process.exit(bad || stack.length ? 1 : 0);
