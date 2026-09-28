"""Write gallery.html into the PFP folder: every variant, animating, with sizes and links."""
import os, sys, html

ROOT = sys.argv[1]

def items(sub, exts):
    d = os.path.join(ROOT, sub)
    if not os.path.isdir(d):
        return []
    return sorted(f for f in os.listdir(d) if f.lower().endswith(exts))

def kb(p):
    return f"{os.path.getsize(os.path.join(ROOT, p)) / 1024:,.0f} KB"

def label(f):
    base = os.path.splitext(f)[0]
    num, _, rest = base.partition('-')
    return num, rest.replace('-', ' ')

cards = []
for f in items('animated/webp', '.webp'):
    num, name = label(f)
    stem = os.path.splitext(f)[0]
    alts = [(fmt, f'animated/{fmt}/{stem}.{ext}') for fmt, ext in (('gif', 'gif'), ('apng', 'png'))
            if os.path.exists(os.path.join(ROOT, 'animated', fmt, f'{stem}.{ext}'))]
    links = ' · '.join(f'<a href="{html.escape(p)}">{fmt.upper()} {kb(p)}</a>' for fmt, p in [('webp', f'animated/webp/{f}')] + alts)
    cards.append(('Animated', num, name, f'animated/webp/{f}', links))
for f in items('stills', '.png'):
    num, name = label(f)
    cards.append(('Stills', num, name, f'stills/{f}', f'<a href="stills/{html.escape(f)}">PNG {kb("stills/" + f)}</a>'))

sections = {}
for kind, num, name, src, links in cards:
    sections.setdefault(kind, []).append(f'''
    <figure>
      <div class="frame"><img src="{html.escape(src)}" alt="{html.escape(name)}" loading="lazy"></div>
      <figcaption><b>{num}</b> {html.escape(name)}<span>{links}</span></figcaption>
    </figure>''')

page = f'''<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Liam+ Lightning PFP</title>
<style>
  :root{{--bg:#07090a;--panel:#0d1210;--line:#1b2a22;--text:#d7e4dc;--muted:#6b8577;--gold:#ffc43c}}
  *{{box-sizing:border-box}} body{{margin:0;background:var(--bg);color:var(--text);font:14px/1.5 ui-monospace,Consolas,monospace;padding:32px 16px}}
  h1{{font-size:28px;margin:0 0 4px;color:var(--gold);letter-spacing:2px}} p.sub{{color:var(--muted);margin:0 0 28px}}
  h2{{font-size:13px;letter-spacing:4px;color:var(--muted);border-bottom:1px solid var(--line);padding-bottom:8px;margin:36px 0 18px}}
  .grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:18px}}
  figure{{margin:0;background:var(--panel);border:1px solid var(--line);border-radius:14px;overflow:hidden}}
  .frame{{aspect-ratio:1;background:repeating-conic-gradient(#151a18 0 25%,#0f1412 0 50%) 0 0/24px 24px}}
  .frame img{{width:100%;height:100%;display:block;image-rendering:pixelated}}
  figcaption{{padding:10px 12px;font-size:13px}} figcaption b{{color:var(--gold)}}
  figcaption span{{display:block;color:var(--muted);font-size:11px;margin-top:4px}} a{{color:var(--muted)}} a:hover{{color:var(--gold)}}
  .round .frame img{{border-radius:50%}}
</style></head><body>
<h1>LIAM+ ⚡ LIGHTNING PFP</h1>
<p class="sub">Remastered from the original 24×24 avatar. WebP/APNG keep full quality &amp; transparency; GIFs are 576px for max compatibility (Discord, etc.).
<label><input type="checkbox" onchange="document.body.classList.toggle('round',this.checked)"> preview as circle</label></p>
{''.join(f'<h2>{k.upper()}</h2><div class="grid">{"".join(v)}</div>' for k, v in sections.items())}
</body></html>'''
open(os.path.join(ROOT, 'gallery.html'), 'w', encoding='utf-8').write(page)
print('gallery:', sum(len(v) for v in sections.values()), 'items')
