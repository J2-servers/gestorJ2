/* De-mojibake definitivo: reverte UTF-8-lido-como-CP1252-e-re-salvo.
   Reencoda a string usando a tabela CP1252 (Windows-1252) e decodifica como
   UTF-8. Cobre acentos, aspas/travessoes e emojis. Idempotente e seguro:
   so grava se o resultado for UTF-8 valido (sem U+FFFD) e tiver menos mojibake.
   Rode: node scripts/fix-mojibake.cjs                                          */
const fs = require('fs');
const { execSync } = require('child_process');

// CP1252 0x80-0x9F -> Unicode (bytes que diferem de Latin-1)
const CP1252_HIGH = {
  0x80: 0x20ac, 0x82: 0x201a, 0x83: 0x0192, 0x84: 0x201e, 0x85: 0x2026,
  0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02c6, 0x89: 0x2030, 0x8a: 0x0160,
  0x8b: 0x2039, 0x8c: 0x0152, 0x8e: 0x017d, 0x91: 0x2018, 0x92: 0x2019,
  0x93: 0x201c, 0x94: 0x201d, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
  0x98: 0x02dc, 0x99: 0x2122, 0x9a: 0x0161, 0x9b: 0x203a, 0x9c: 0x0153,
  0x9e: 0x017e, 0x9f: 0x0178,
};
// inverso: codePoint -> byte
const REV = {};
for (let b = 0; b <= 0xff; b++) REV[b] = b; // latin1 base
for (const [b, cp] of Object.entries(CP1252_HIGH)) REV[cp] = Number(b);

// reencoda 1 char em seu byte CP1252; null se nao representavel (emoji real, etc.)
function toCp1252Byte(cp) {
  if (cp <= 0xff && !(cp >= 0x80 && cp <= 0x9f)) return cp; // latin1 puro
  if (REV[cp] !== undefined) return REV[cp];
  return null;
}

// decodifica um run de bytes CP1252 como UTF-8; se invalido, devolve o texto original
function flush(bytes, original) {
  if (!bytes.length) return '';
  const dec = Buffer.from(bytes).toString('utf8');
  return dec.includes('�') ? original : dec;
}

function reverseOnce(str) {
  let result = '';
  let bytes = [];
  let orig = '';
  for (const ch of str) {
    const b = toCp1252Byte(ch.codePointAt(0));
    if (b === null) {
      result += flush(bytes, orig) + ch; // char real -> passa intacto
      bytes = []; orig = '';
    } else {
      bytes.push(b); orig += ch;
    }
  }
  result += flush(bytes, orig);
  return result;
}

const MOJI = /[ÃÂâð]/; // Ã Â â ð (leads de mojibake)
function fixLine(line) {
  let out = line;
  for (let i = 0; i < 5; i++) {
    if (!MOJI.test(out)) break;
    const rev = reverseOnce(out);
    if (rev === out) break;
    out = rev;
  }
  return out;
}
// Reverso POR LINHA: isola falhas — uma linha problematica nao reverte o arquivo todo.
function fix(str) {
  return str.split('\n').map(fixLine).join('\n');
}

const files = execSync('git ls-files', { encoding: 'utf8' })
  .split('\n').filter(Boolean)
  .filter((f) => /\.(jsx?|tsx?|css|html)$/.test(f) &&
    (f.startsWith('src/') || f.startsWith('backend/src/') || f.startsWith('backend/prisma/') || f === 'index.html'));

let changed = 0;
for (const f of files) {
  let c; try { c = fs.readFileSync(f, 'utf8'); } catch { continue; }
  if (!MOJI.test(c)) continue;
  const out = fix(c);
  if (out !== c && !out.includes('�')) {
    fs.writeFileSync(f, out, 'utf8');
    changed++;
    console.log('fixed:', f);
  }
}
console.log(`\nTotal: ${changed} arquivo(s).`);
