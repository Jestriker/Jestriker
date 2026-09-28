"""Remaster Liam's lightning-bolt avatar and render many animated / still variants.

Usage: python pfp.py <grid24.json> <out_dir>
"""
import json, math, os, random, sys
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance, ImageChops

GRID = json.load(open(sys.argv[1]))
OUT = sys.argv[2]
N = 24          # avatar grid
CELL = 48       # px per avatar pixel for animations -> 1152px
SUB = 4         # effects are drawn on a 4x finer pixel grid (still pixel art)

def classify(p):
    r, g, b = p
    # bolt = bright yellow/orange, or its dark shading, which is far more saturated than dirt (r/b ~2.4)
    if (r > 115 and r - b > 70 and g > 45) or (r > 50 and r / (b + 1) > 3.2):
        return 'B'
    if r + g + b < 115:
        return 'K'
    return '.'

KIND = [[classify(p) for p in row] for row in GRID]
# Only count dark pixels as outline when they touch the bolt; the rest is dirt shading.
def near_bolt(x, y):
    return any(0 <= x+dx < N and 0 <= y+dy < N and KIND[y+dy][x+dx] == 'B'
               for dx in (-1, 0, 1) for dy in (-1, 0, 1))
KIND = [[('K' if k == 'K' and near_bolt(x, y) else ('.' if k == 'K' else k))
         for x, k in enumerate(row)] for y, row in enumerate(KIND)]
BOLT = [(x, y) for y in range(N) for x in range(N) if KIND[y][x] == 'B']
OUTL = [(x, y) for y in range(N) for x in range(N) if KIND[y][x] == 'K']
TOP = min(BOLT, key=lambda p: (p[1], p[0]))
BOT = max(BOLT, key=lambda p: (p[1], -p[0]))


# ───────────── layers ─────────────

def layer(cells, size_cell, dim=1.0, recolor=None):
    im = Image.new('RGBA', (N * size_cell, N * size_cell), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for (x, y) in cells:
        c = recolor(x, y) if recolor else GRID[y][x]
        c = tuple(min(255, int(v * dim)) for v in c)
        d.rectangle([x * size_cell, y * size_cell, (x + 1) * size_cell - 1, (y + 1) * size_cell - 1], fill=c + (255,))
    return im

ALL = [(x, y) for y in range(N) for x in range(N)]
DIRT = [(x, y) for (x, y) in ALL if KIND[y][x] == '.']

class Art:
    def __init__(self, cell):
        self.cell = cell
        self.size = N * cell
        self.full = layer(ALL, cell)
        # full dirt block: cells under the bolt get a seeded pick of real dirt pixels, so nothing shows through
        rnd = random.Random(24)
        safe = [(x, y) for (x, y) in DIRT if GRID[y][x][0] / (GRID[y][x][2] + 1) < 3 and 110 < sum(GRID[y][x]) < 260]
        pick = lambda: rnd.choice(safe)
        fill = {c: (lambda p: GRID[p[1]][p[0]])(pick()) for c in ALL}
        self.dirt = layer(ALL, cell, recolor=lambda x, y: tuple(GRID[y][x]) if KIND[y][x] == '.' else tuple(fill[(x, y)]))
        self.bolt = layer(BOLT + OUTL, cell)
        self.core = layer(BOLT, cell)
        self.mask = self.core.getchannel('A')

    def glow(self, strength, radius=None, color=(255, 196, 60)):
        radius = radius or self.cell * 1.6
        a = self.mask.filter(ImageFilter.GaussianBlur(radius))
        a = a.point(lambda v: min(255, int(v * strength * 1.6)))
        g = Image.new('RGBA', (self.size, self.size), color + (0,))
        g.putalpha(a)
        return g

    def canvas(self, bg):
        if bg == 'dirt':
            return self.dirt.copy()
        if bg == 'night':
            return ImageEnhance.Brightness(self.dirt).enhance(0.35)
        if bg == 'black':
            return Image.new('RGBA', (self.size, self.size), (9, 8, 12, 255))
        return Image.new('RGBA', (self.size, self.size), (0, 0, 0, 0))

    def bright_bolt(self, k):
        """Bolt layer with the yellow pixels brightened by factor k (1 = original)."""
        b = self.bolt.copy()
        c = ImageEnhance.Brightness(self.core).enhance(k)
        b.alpha_composite(c)
        return b


def comp(*layers):
    base = layers[0].copy()
    for l in layers[1:]:
        if l is not None:
            base.alpha_composite(l)
    return base


# ───────────── pixel lightning ─────────────

def jag(p0, p1, rnd, rough=0.45, depth=5):
    pts = [p0, p1]
    for _ in range(depth):
        out = [pts[0]]
        for a, b in zip(pts, pts[1:]):
            mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
            L = math.hypot(b[0] - a[0], b[1] - a[1])
            nx, ny = -(b[1] - a[1]) / (L or 1), (b[0] - a[0]) / (L or 1)
            off = (rnd.random() - 0.5) * L * rough
            out += [(mx + nx * off, my + ny * off), b]
        pts = out
    return pts

def raster(pts):
    cells = set()
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        steps = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        for i in range(steps + 1):
            t = i / steps
            cells.add((round(x0 + (x1 - x0) * t), round(y0 + (y1 - y0) * t)))
    return cells

def strike_cells(seed, start, end, branches=3):
    rnd = random.Random(seed)
    main = jag(start, end, rnd)
    cells = raster(main)
    for _ in range(branches):
        i = rnd.randrange(len(main) // 4, len(main) - 3)
        a = main[i]
        ang = math.atan2(end[1] - start[1], end[0] - start[0]) + rnd.choice([-1, 1]) * rnd.uniform(0.5, 1.1)
        L = rnd.uniform(8, 22)
        cells |= raster(jag(a, (a[0] + math.cos(ang) * L, a[1] + math.sin(ang) * L), rnd, 0.6, 3))
    return cells

def draw_cells(cells, px, color, size, fade=1.0):
    im = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for (x, y) in cells:
        d.rectangle([x * px, y * px, x * px + px - 1, y * px + px - 1], fill=color + (int(255 * fade),))
    return im

def glow_of(im, radius, strength, color):
    a = im.getchannel('A').filter(ImageFilter.GaussianBlur(radius)).point(lambda v: min(255, int(v * strength)))
    g = Image.new('RGBA', im.size, color + (0,))
    g.putalpha(a)
    return g

def flash(size, a, color=(255, 250, 225)):
    return Image.new('RGBA', (size, size), color + (int(255 * a),))

def arcs(seed, art, count=5, length=(5, 12)):
    """Short crackling random walks leaving the bolt's outline, on the fine grid."""
    rnd = random.Random(seed)
    cells = set()
    for _ in range(count):
        x, y = rnd.choice(OUTL)
        fx, fy = x * SUB + rnd.randrange(SUB), y * SUB + rnd.randrange(SUB)
        dx, dy = rnd.choice([(-1, 0), (1, 0), (0, -1), (0, 1), (1, 1), (-1, -1), (1, -1), (-1, 1)])
        for _ in range(rnd.randint(*length)):
            cells.add((fx, fy))
            if rnd.random() < 0.45:
                dx, dy = rnd.choice([(dx, dy), (dy, dx), (-dy, dx), (dx, 0) if dx else (0, dy)])
            fx += dx or rnd.choice([-1, 1]); fy += dy
    return cells


# ───────────── animations ─────────────
# Each returns (frames, duration_ms). `bg` in {'dirt','night','black','clear'}.

def anim_pulse(art, bg, n=40):
    fr = []
    for i in range(n):
        s = 0.5 + 0.5 * math.sin(i / n * 2 * math.pi - math.pi / 2)
        fr.append(comp(art.canvas(bg), art.glow(0.25 + 0.75 * s), art.bright_bolt(1 + 0.25 * s), art.glow(0.35 * s, art.cell * 0.6, (255, 240, 170))))
    return fr, 50

def anim_fade(art, bg, n=64):
    fr = []
    for i in range(n):
        t = i / n
        a = min(1, t / 0.3) if t < 0.3 else (1 if t < 0.65 else max(0, 1 - (t - 0.65) / 0.3))
        a = a * a * (3 - 2 * a)  # smoothstep
        top = comp(Image.new('RGBA', (art.size,) * 2, (0, 0, 0, 0)), art.glow(0.8 * a), art.bolt)
        top.putalpha(top.getchannel('A').point(lambda v: int(v * a)))
        base = art.canvas(bg)
        if bg in ('dirt', 'night'):
            base = ImageEnhance.Brightness(base).enhance(0.25 + 0.75 * a)
        fr.append(comp(base, top))
    return fr, 45

def anim_strike(art, bg, n=56, rain=False):
    size, px = art.size, art.cell // SUB
    G = N * SUB
    tx, ty = TOP[0] * SUB + SUB // 2, TOP[1] * SUB
    s1 = strike_cells(7, (tx + 34, -30), (tx, ty), 5)
    s2 = strike_cells(21, (-30, G * 0.2), (OUTL[len(OUTL) // 2][0] * SUB, OUTL[len(OUTL) // 2][1] * SUB), 2)
    rnd = random.Random(3)
    drops = [(rnd.randrange(G + 20), rnd.randrange(G), rnd.randint(2, 4)) for _ in range(90)] if rain else []
    fr = []
    for i in range(n):
        # charge builds until the strike at frame 14, then decays; a smaller side-strike at 34
        charge = min(1, i / 14) * 0.35 if i < 14 else max(0.35, 1 - (i - 14) / 30)
        layers = [art.canvas(bg)]
        if rain:
            r = draw_cells({(x - (i * 2) % (G + 20) // 1 - k, (y + i * 5 + k * 2) % G) for x, y, L in drops for k in range(L)}, px, (120, 150, 190), size, 0.5)
            layers.append(r)
        layers += [art.glow(charge), art.bright_bolt(1 + 0.5 * max(0, charge - 0.35))]
        if i in (14, 15):
            layers.append(flash(size, 0.45 if i == 14 else 0.2))
        if i == 34:
            layers.append(flash(size, 0.15))
        for at, cells in ((14, s1), (15, s1), (17, s1), (34, s2), (35, s2)):
            if i == at:
                b = draw_cells(cells, px, (255, 255, 240), size)
                layers += [glow_of(b, px * 4, 3.0, (255, 214, 90)), glow_of(b, px, 2.5, (255, 255, 200)), b]
        if 14 <= i < 30 and i % 2 == 0:
            a = draw_cells(arcs(i, art, 6), px, (255, 250, 210), size)
            layers += [glow_of(a, px * 2, 2.5, (255, 200, 60)), a]
        fr.append(comp(*layers))
    return fr, 55

def anim_arcs(art, bg, n=32):
    size, px = art.size, art.cell // SUB
    fr = []
    for i in range(n):
        a = draw_cells(arcs(i * 13 + 5, art, 7, (4, 11)), px, (255, 252, 220), size)
        s = 0.6 + 0.4 * ((i * 7919) % 10) / 10
        fr.append(comp(art.canvas(bg), art.glow(s), art.bright_bolt(1.15), glow_of(a, px * 2.2, 2.6, (255, 205, 70)), a))
    return fr, 60

def anim_charge(art, bg, n=60):
    ys = sorted({y for _, y in BOLT})
    fill_frames = 30
    fr = []
    for i in range(n):
        if i < fill_frames:
            level = ys[-1] - (ys[-1] - ys[0] + 1) * (i / fill_frames)  # fills bottom -> top
            lit = [(x, y) for x, y in BOLT if y >= level]
            k, g = 1.0, 0.15 + 0.5 * i / fill_frames
        else:
            lit, t = BOLT, (i - fill_frames) / (n - fill_frames)
            k, g = 1.3 - 0.3 * t, 1.2 * (1 - t) + 0.4
        dim = layer(BOLT, art.cell, 0.35)
        on = layer(lit, art.cell, k)
        layers = [art.canvas(bg), art.glow(g), art.bolt, dim, on]
        if i == fill_frames:
            layers.append(flash(art.size, 0.5))
        if fill_frames <= i < fill_frames + 8:
            a = draw_cells(arcs(i, art, 9), art.cell // SUB, (255, 252, 220), art.size)
            layers += [glow_of(a, art.cell // 2, 2.5, (255, 205, 70)), a]
        fr.append(comp(*layers))
    return fr, 50

def anim_assemble(art, bg, n=70):
    rnd = random.Random(9)
    cells = BOLT + OUTL
    order = {c: (c[1] * 0.9 + rnd.random() * 6) for c in cells}
    tmax = max(order.values())
    fr = []
    for i in range(n):
        im = Image.new('RGBA', (art.size,) * 2, (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        done = True
        for (x, y) in cells:
            t = (i - order[(x, y)] * 1.2) / 8  # each pixel drops for 8 frames
            if t <= 0:
                done = False
                continue
            t = min(1, t)
            bounce = 1 - (1 - t) ** 3 + (math.sin(t * math.pi) * 0.08 if t < 1 else 0)
            oy = (1 - bounce) * -art.size * 0.6
            c = GRID[y][x]
            d.rectangle([x * art.cell, y * art.cell + oy, (x + 1) * art.cell - 1, (y + 1) * art.cell - 1 + oy], fill=tuple(c) + (255,))
        settled = max(0, i - (tmax * 1.2 + 8))
        g = min(1, settled / 10) * (0.7 + 0.3 * math.sin(settled / 5)) if settled else 0
        fr.append(comp(art.canvas(bg), art.glow(g), im))
    return fr, 40

def anim_glitch(art, bg, n=40):
    rnd = random.Random(4)
    base = comp(art.canvas(bg), art.glow(0.7), art.bolt)
    fr = []
    for i in range(n):
        if i % 10 in (3, 4) or i in (17, 31):
            r, g, b, a = base.split()
            sh = art.cell // 3 * (1 if i % 2 else -1)
            im = Image.merge('RGBA', (ImageChops.offset(r, sh, 0), g, ImageChops.offset(b, -sh, 0), a))
            d = ImageDraw.Draw(im)
            for _ in range(4):  # tear a few horizontal bands sideways
                y = rnd.randrange(art.size - art.cell)
                h = rnd.randint(art.cell // 4, art.cell)
                band = im.crop((0, y, art.size, y + h))
                im.paste(ImageChops.offset(band, rnd.randint(-art.cell, art.cell), 0), (0, y))
            fr.append(im)
        else:
            fr.append(base.copy())
    return fr, 70

def anim_spin(art, bg, n=48):
    """Minecraft dropped-item: spins on its vertical axis and bobs."""
    fr = []
    src = comp(Image.new('RGBA', (art.size,) * 2, (0, 0, 0, 0)), art.bolt)
    for i in range(n):
        t = i / n
        sx = abs(math.cos(t * 2 * math.pi))
        w = max(art.cell // 2, int(art.size * 0.8 * sx))
        item = src.resize((art.size, art.size), Image.NEAREST).resize((w, int(art.size * 0.8)), Image.NEAREST)
        # darken the back face
        if math.cos(t * 2 * math.pi) < 0:
            item = ImageEnhance.Brightness(item).enhance(0.7)
        layer_ = Image.new('RGBA', (art.size,) * 2, (0, 0, 0, 0))
        bob = int(math.sin(t * 2 * math.pi * 2) * art.cell * 0.6)
        layer_.alpha_composite(item, ((art.size - w) // 2, int(art.size * 0.1) + bob))
        glow = glow_of(layer_, art.cell * 1.4, 1.2 * (0.5 + 0.5 * sx), (255, 196, 60))
        fr.append(comp(art.canvas(bg), glow, layer_))
    return fr, 45

def anim_overcharge(art, bg, n=48):
    """Bolt shifts from gold to electric blue and back, with arcs at peak."""
    fr = []
    for i in range(n):
        s = 0.5 - 0.5 * math.cos(i / n * 2 * math.pi)
        def ramp(x, y):
            o = GRID[y][x]
            L = min(1, (0.3 * o[0] + 0.59 * o[1] + 0.11 * o[2]) / 210)
            b = (int(30 + 190 * L), int(80 + 170 * L), int(200 + 55 * L))
            return tuple(int(a * (1 - s) + c * s) for a, c in zip(o, b))
        blue = layer(BOLT, art.cell, 1, ramp)
        col = tuple(int(a * (1 - s) + b * s) for a, b in zip((255, 196, 60), (90, 180, 255)))
        layers = [art.canvas(bg), art.glow(0.5 + 0.6 * s, color=col), art.bolt, blue]
        if s > 0.6 and i % 2 == 0:
            a = draw_cells(arcs(i, art, 6), art.cell // SUB, (225, 245, 255), art.size)
            layers += [glow_of(a, art.cell // 2, 2.5, (90, 180, 255)), a]
        fr.append(comp(*layers))
    return fr, 50


# ───────────── export ─────────────

def save(name, frames, dur, gif_size=576):
    d = os.path.join(OUT, 'animated')
    os.makedirs(os.path.join(d, 'webp'), exist_ok=True)
    os.makedirs(os.path.join(d, 'gif'), exist_ok=True)
    transparent = frames[0].getchannel('A').getextrema()[0] < 255
    frames[0].save(os.path.join(d, 'webp', name + '.webp'), save_all=True, append_images=frames[1:],
                   duration=dur, loop=0, quality=92, method=6)
    if transparent:
        os.makedirs(os.path.join(d, 'apng'), exist_ok=True)
        small = [f.resize((gif_size,) * 2, Image.LANCZOS) for f in frames]
        small[0].save(os.path.join(d, 'apng', name + '.png'), save_all=True, append_images=small[1:], duration=dur, loop=0, disposal=1)
    else:
        pal = [f.convert('RGB').resize((gif_size,) * 2, Image.LANCZOS).quantize(255, Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE) for f in frames]
        pal[0].save(os.path.join(d, 'gif', name + '.gif'), save_all=True, append_images=pal[1:], duration=dur, loop=0, disposal=1)
    print(f'  {name}: {len(frames)} frames')

def stills():
    big = Art(96)  # 2304 px
    d = os.path.join(OUT, 'stills')
    os.makedirs(d, exist_ok=True)
    items = {
        '01-remastered-2304.png': big.full,
        '02-bolt-transparent-2304.png': big.bolt,
        '03-bolt-glow-transparent-2304.png': comp(big.canvas('clear'), big.glow(0.9), big.bolt),
        '04-bolt-glow-black-2304.png': comp(big.canvas('black'), big.glow(0.9), big.bolt),
        '05-glow-on-dirt-2304.png': comp(big.canvas('dirt'), big.glow(0.8), big.bright_bolt(1.1)),
        '06-night-2304.png': comp(big.canvas('night'), big.glow(1.0), big.bright_bolt(1.15)),
        '07-overcharged-blue-2304.png': anim_overcharge(big, 'night', 2)[0][1],
    }
    for k, v in items.items():
        v.save(os.path.join(d, k))
    for k in ('01-remastered', '05-glow-on-dirt'):
        items[k + '-2304.png'].resize((512, 512), Image.NEAREST if k.startswith('01') else Image.LANCZOS).save(os.path.join(d, k + '-512.png'))
    print(f'  stills: {len(items) + 2}')
    return items

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    print('\n'.join(''.join(r) for r in KIND))
    stills()
    art = Art(CELL)
    jobs = [
        ('01-glow-pulse', anim_pulse, 'dirt'), ('02-glow-pulse-black', anim_pulse, 'black'), ('03-glow-pulse-transparent', anim_pulse, 'clear'),
        ('04-fade-in-out', anim_fade, 'dirt'), ('05-fade-in-out-transparent', anim_fade, 'clear'),
        ('06-lightning-strike', anim_strike, 'dirt'), ('07-lightning-strike-black', anim_strike, 'black'),
        ('08-storm-night', lambda a, b: anim_strike(a, b, rain=True), 'night'),
        ('09-electric-arcs', anim_arcs, 'dirt'), ('10-electric-arcs-transparent', anim_arcs, 'clear'),
        ('11-charge-up', anim_charge, 'dirt'), ('12-charge-up-black', anim_charge, 'black'),
        ('13-pixel-assemble', anim_assemble, 'dirt'), ('14-glitch', anim_glitch, 'dirt'),
        ('15-item-spin', anim_spin, 'dirt'), ('16-item-spin-transparent', anim_spin, 'clear'),
        ('17-overcharge-blue', anim_overcharge, 'night'), ('18-overcharge-blue-transparent', anim_overcharge, 'clear'),
    ]
    only = sys.argv[3:]  # optional: render a subset by name prefix
    for name, fn, bg in jobs:
        if only and not any(name.startswith(o) for o in only):
            continue
        frames, dur = fn(art, bg)
        save(name, frames, dur)
