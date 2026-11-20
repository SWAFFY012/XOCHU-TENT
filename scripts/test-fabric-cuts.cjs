const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const localRequire = (name) => {
    if (name === 'server-only') return {};
    // resolveItems only: never call delivery APIs or notifications in these tests.
    if (name === '@/lib/delivery' || name === './source') return {};
    if (name.startsWith('@/') || name.startsWith('.')) {
      const base = name.startsWith('@/') ? path.resolve(name.slice(2)) : path.resolve(path.dirname(file), name);
      if (base.endsWith('.json')) return require(base);
      return load(base + '.ts');
    }
    return require(name);
  };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: localRequire, process, console, URL, Buffer });
  return module.exports;
}
const { resolveItems } = load('lib/orders/build.ts');
const { getSummary } = load('lib/catalog.ts');
const rules = [
  ['tkan-brezent', '0,9', 20],
  ['tkan-oxford', '1,5', 20],
  ['tkan-pvh', '2,5', 25],
];
let cases = 0;
for (const [slug, width, max] of rules) {
  const p = getSummary(slug);
  assert(p, slug);
  for (const option of p.options) {
    const line = (size) => [{ slug, option, color: p.colors[0], qty: 1, custom: true, size }];
    for (const size of [`0,99х${width}`, `${max + 0.01}х${width}`, '2х1', `2х${width}х3`, `1e1х${width}`]) {
      assert.throws(() => resolveItems(line(size)), /размер/, `${slug} / ${option} must reject ${size}`);
      cases++;
    }
    for (const length of [1, 1.25, max]) {
      const size = `${String(length).replace('.', ',')}х${width}`;
      const [item] = resolveItems(line(size));
      assert.equal(item.size, size);
      assert(item.price > 0);
      assert(item.weight > 0);
      cases++;
    }
  }
}
// Other custom products keep their existing dimensional limits.
const tent = getSummary('tent-oxford');
assert.equal(resolveItems([{ slug: tent.slug, option: tent.options[0], color: tent.colors[0], qty: 1, custom: true, size: '0,5х0,5' }]).length, 1);
console.log(`Fabric custom cuts: ${cases} boundary/width/format cases passed; other products unchanged`);
