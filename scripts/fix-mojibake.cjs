/* De-mojibake helper.
   Reverts UTF-8 text that was read as CP1252 and saved again.
   Run manually only when a file displays broken accent sequences.
   Command: node scripts/fix-mojibake.cjs */
const fs = require('fs');
const { execSync } = require('child_process');

const CP1252_HIGH = {
  0x80: 0x20ac, 0x82: 0x201a, 0x83: 0x0192, 0x84: 0x201e, 0x85: 0x2026,
  0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02c6, 0x89: 0x2030, 0x8a: 0x0160,
  0x8b: 0x2039, 0x8c: 0x0152, 0x8e: 0x017d, 0x91: 0x2018, 0x92: 0x2019,
  0x93: 0x201c, 0x94: 0x201d, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
  0x98: 0x02dc, 0x99: 0x2122, 0x9a: 0x0161, 0x9b: 0x203a, 0x9c: 0x0153,
  0x9e: 0x017e, 0x9f: 0x0178,
};

const REV = {};
for (let b = 0; b <= 0xff; b++) REV[b] = b;
for (const [b, cp] of Object.entries(CP1252_HIGH)) REV[cp] = Number(b);

function toCp1252Byte(cp) {
  if (cp <= 0xff && !(cp >= 0x80 && cp <= 0x9f)) return cp;
  if (REV[cp] !== undefined) return REV[cp];
  return null;
}

function flush(bytes, original) {
  if (!bytes.length) return '';
  const decoded = Buffer.from(bytes).toString('utf8');
  return decoded.includes('�') ? original : decoded;
}

function reverseOnce(str) {
  let result = '';
  let bytes = [];
  let original = '';

  for (const ch of str) {
    const byte = toCp1252Byte(ch.codePointAt(0));
    if (byte === null) {
      result += flush(bytes, original) + ch;
      bytes = [];
      original = '';
    } else {
      bytes.push(byte);
      original += ch;
    }
  }

  return result + flush(bytes, original);
}

const MOJIBAKE_LEADS = /[ÃÂâð]/;

function fixLine(line) {
  let output = line;
  for (let i = 0; i < 5; i += 1) {
    if (!MOJIBAKE_LEADS.test(output)) break;
    const reversed = reverseOnce(output);
    if (reversed === output) break;
    output = reversed;
  }
  return output;
}

function fix(text) {
  return text.split('\n').map(fixLine).join('\n');
}

const files = execSync('git ls-files', { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .filter((file) => /\.(vue|ts|js|cjs|css|html|md|yml|yaml)$/.test(file))
  .filter((file) =>
    file.startsWith('frontend-vue/src/') ||
    file.startsWith('frontend-vue/public/') ||
    file.startsWith('backend/src/') ||
    file.startsWith('backend/prisma/') ||
    file.startsWith('docs/') ||
    ['README.md', 'EASYPANEL.md', 'AGENTS.md', 'Dockerfile', 'docker-compose.yml'].includes(file),
  );

let changed = 0;
for (const file of files) {
  let content;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  if (!MOJIBAKE_LEADS.test(content)) continue;
  const output = fix(content);
  if (output !== content && !output.includes('�')) {
    fs.writeFileSync(file, output, 'utf8');
    changed += 1;
    console.log('fixed:', file);
  }
}

console.log(`Total: ${changed} arquivo(s).`);
