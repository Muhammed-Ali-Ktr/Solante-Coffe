const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../public/js/main.js');
let s = fs.readFileSync(file, 'utf8');
const d = 'div';

if (!s.includes('${badge}')) {
  const needle = '      <' + d + ' class="item-info">\n        <' + d + ' class="item-name">';
  const repl = '      <' + d + ' class="item-info">\n        ${badge}\n        <' + d + ' class="item-name">';
  if (s.includes(needle)) s = s.replace(needle, repl);
}

if (!s.includes('const loadChefPicks')) {
  const loadFn =
    'const loadChefPicks = async () => {\n' +
    '  try {\n' +
    '    const response = await fetch(`${API_BASE}/promotions/chef-picks`);\n' +
    '    if (!response.ok) return;\n' +
    '    const data = await response.json();\n' +
    '    chefPicksTitle.tr = data.title_tr || chefPicksTitle.tr;\n' +
    '    chefPicksTitle.en = data.title_en || chefPicksTitle.en;\n' +
    '    const normalized = {};\n' +
    '    const raw = data.by_category || {};\n' +
    '    Object.entries(raw).forEach(([catId, product]) => {\n' +
    '      const id = parseInt(catId, 10);\n' +
    '      if (!isNaN(id) && product) normalized[id] = product;\n' +
    '    });\n' +
    '    chefPicksByCategory = normalized;\n' +
    '  } catch (e) {\n' +
    "    console.warn('Şefin önerileri yüklenemedi:', e);\n" +
    '  }\n' +
    '};\n\n';

  s = s.replace('function escapeHtml(s) {', loadFn + 'function escapeHtml(s) {');
}

if (!s.includes('chefPickProduct')) {
  s = s.replace(
    '    const list = productsForCategory(cat.id);',
    '    const chefPickProduct = chefPicksByCategory[cat.id];\n' +
      '    const pickId = chefPickProduct ? Number(chefPickProduct.id) : null;\n' +
      '    const list = productsForCategory(cat.id).filter((p) => Number(p.id) !== pickId);'
  );

  s = s.replace(
    '          list.length\n            ? list.map((p) => renderMenuItem(p)).join(\'\')\n            :',
    '          (chefPickProduct ? renderMenuItem(chefPickProduct, { chefPick: true }) : \'\') +\n' +
      '          (list.length\n            ? list.map((p) => renderMenuItem(p)).join(\'\')\n            : chefPickProduct\n              ? \'\'\n            :'
  );
}

if (!s.includes('await loadChefPicks()')) {
  s = s.replace(
    'const loadMenuListing = async () => {\n  const container',
    'const loadMenuListing = async () => {\n  await loadChefPicks();\n  const container'
  );
}

fs.writeFileSync(file, s);
console.log('done', {
  badge: s.includes('${badge}'),
  loadChefPicks: s.includes('loadChefPicks'),
  chefPickProduct: s.includes('chefPickProduct')
});
