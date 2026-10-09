"""Builds imach-mvp.html: a single self-contained file (CSS, JS, fonts, images inlined).
Run from mvp-design/: python3 build-standalone.py"""
import base64, re, pathlib

root = pathlib.Path(__file__).parent
MIME = {'.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2'}


def data_uri(rel):
    f = root / rel
    return f'data:{MIME[f.suffix]};base64,' + base64.b64encode(f.read_bytes()).decode()


def inline_assets(text):
    return re.sub(r'(?:\.\./)?((?:img|fonts)/[\w.-]+)', lambda m: data_uri(m.group(1)), text)


html = inline_assets((root / 'index.html').read_text(encoding='utf-8'))
css = inline_assets((root / 'css/app.css').read_text(encoding='utf-8'))
html = html.replace('<link rel="stylesheet" href="css/app.css">', '<style>\n' + css + '\n</style>')
for js in ('js/data.js', 'js/app.js'):
    code = inline_assets((root / js).read_text(encoding='utf-8')).replace('</script', '<\\/script')
    html = html.replace(f'<script src="{js}"></script>', '<script>\n' + code + '\n</script>')
assert 'src="js/' not in html and 'href="css/' not in html
(root / 'imach-mvp.html').write_text(html, encoding='utf-8')
print('imach-mvp.html', round(len(html) / 1024), 'KB')
