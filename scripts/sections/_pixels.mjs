// Pixel-map helper shared by hero and footer: merges horizontal runs of the same colour into one <rect>,
// which keeps big sprites (clouds, bosses, umbrellas) several times smaller than one rect per pixel.
// rows: array of strings, '.' = transparent, any other char is looked up in `fills`.
export function runs(rows, x0, y0, s, fills, extra = '') {
  const out = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const c = row[x];
      if (c === '.' || !fills[c]) { x++; continue; }
      let e = x;
      while (e < row.length && row[e] === c) e++;
      out.push(`<rect x="${x0 + x * s}" y="${y0 + y * s}" width="${(e - x) * s}" height="${s}" fill="${fills[c]}"${extra}/>`);
      x = e;
    }
  });
  return out.join('');
}
