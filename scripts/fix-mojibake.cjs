/* Corrige mojibake (UTF-8 lido como Latin-1/CP1252 e re-salvo) em arquivos-fonte.
   Substituicao DIRECIONADA: troca apenas sequencias ruins conhecidas, preservando
   emojis e acentos ja corretos. Rode: node scripts/fix-mojibake.cjs            */
const fs = require('fs');
const { execSync } = require('child_process');

const MAP = {
  // minusculas acentuadas
  'Ã¡':'á','Ã ':'à','Ã¢':'â','Ã£':'ã','Ã¤':'ä',
  'Ã©':'é','Ã¨':'è','Ãª':'ê','Ã«':'ë',
  'Ã­':'í','Ã¬':'ì','Ã®':'î','Ã¯':'ï',
  'Ã³':'ó','Ã²':'ò','Ã´':'ô','Ãµ':'õ','Ã¶':'ö',
  'Ãº':'ú','Ã¹':'ù','Ã»':'û','Ã¼':'ü',
  'Ã§':'ç','Ã±':'ñ','Ã½':'ý',
  // maiusculas acentuadas
  'Ã€':'À','Ã‚':'Â','Ãƒ':'Ã','Ã„':'Ä',
  'Ã‰':'É','Ãˆ':'È','ÃŠ':'Ê','Ã‹':'Ë',
  'Ã“':'Ó','Ã’':'Ò','Ã”':'Ô','Ã•':'Õ','Ã–':'Ö',
  'Ãš':'Ú','Ã™':'Ù','Ã›':'Û','Ãœ':'Ü',
  'Ã‡':'Ç','Ã‘':'Ñ',
  'Ã':'Á','Ã':'Í',
  // pontuacao (CP1252)
  'â€“':'–','â€”':'—','â€˜':'‘','â€™':'’',
  'â€œ':'“','â€':'”','â€¦':'…','â€¢':'•','â€‹':'',
  // espaco nao-quebravel e simbolos
  'Â ':' ','Â°':'°','Â®':'®','Â©':'©','Âª':'ª','Âº':'º','Â´':'´','Â·':'·',
  // box drawing (comentarios decorativos)
  'â”€':'─','â”‚':'│','â”Œ':'┌','â”':'┐','â””':'└','â”˜':'┘','â•':'═',
  // emojis comuns (melhor esforco)
  'âš ï¸':'⚠️','âš ':'⚠','âœ…':'✅','âŒ':'❌','âœ“':'✓','âœ”':'✔','âœ¨':'✨',
  'â°':'⏰','â±':'⏱','â­':'⭐','â¡':'⚡','â„¹ï¸':'ℹ️',
  'ðŸ“±':'📱','ðŸ”':'🔍','ðŸŽ¯':'🎯','ðŸ“Š':'📊','ðŸ“‹':'📋','ðŸ’°':'💰',
  'ðŸ”—':'🔗','ðŸ””':'🔔','ðŸ“¦':'📦','ðŸ“„':'📄','ðŸ‘':'👍','ðŸš€':'🚀',
  'ðŸ”’':'🔒','ðŸ”‘':'🔑','ðŸ“':'📍','ðŸ’¡':'💡','ðŸ› ï¸':'🛠️','ðŸ§¹':'🧹',
  'ðŸ’¬':'💬','ðŸŽ‰':'🎉','ðŸ†':'🏆','ðŸ•':'🕐','ðŸ§®':'🧮','ðŸ’µ':'💵',
  'ðŸ“²':'📲','ðŸ“ˆ':'📈','ðŸ“‰':'📉','ðŸ’³':'💳','ðŸ‘¤':'👤','ðŸ¢':'🏢',
  'ðŸ’¸':'💸','ðŸ›’':'🛒','ðŸ“…':'📅','â³':'⏳','ðŸ"':'🔄','ðŸ‘‹':'👋',
};

// chaves ordenadas por tamanho desc -> evita conflito de prefixo
const keys = Object.keys(MAP).sort((a, b) => b.length - a.length);

const files = execSync(
  'git ls-files "src/**/*.jsx" "src/**/*.js" "backend/src/**/*.ts" "backend/prisma/*.ts"',
  { encoding: 'utf8' }
).split('\n').filter(Boolean);

let changed = 0;
for (const f of files) {
  let c;
  try { c = fs.readFileSync(f, 'utf8'); } catch { continue; }
  let out = c;
  // loop ate estabilizar -> trata mojibake duplo (ex.: "ÃƒÂ©" -> "Ã©" -> "é")
  for (let pass = 0; pass < 5; pass++) {
    let before = out;
    for (const k of keys) {
      if (out.includes(k)) out = out.split(k).join(MAP[k]);
    }
    if (out === before) break;
  }
  if (out !== c) {
    fs.writeFileSync(f, out, 'utf8');
    changed++;
    console.log('fixed:', f);
  }
}
console.log(`\nTotal corrigido: ${changed} arquivo(s).`);
