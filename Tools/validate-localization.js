const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sources = ['ru', 'en'].map((name) => ({
  name,
  content: path.join(root, 'Assets', '_Project', 'Content', 'Localization', `${name}.json`),
  resource: path.join(root, 'Assets', 'Resources', 'Localization', `${name}.json`),
}));

function readDocument(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const document = JSON.parse(raw);
  if (!document.locale || !Array.isArray(document.entries)) throw new Error(`invalid localization document: ${file}`);
  const keys = new Set();
  for (const entry of document.entries) {
    if (!entry || typeof entry.key !== 'string' || !entry.key.includes('.') || !entry.key.trim()) throw new Error(`invalid semantic key in ${file}`);
    if (typeof entry.value !== 'string' || !entry.value.trim()) throw new Error(`empty localization value for ${entry.key}`);
    if (keys.has(entry.key)) throw new Error(`duplicate localization key ${entry.key} in ${file}`);
    keys.add(entry.key);
  }
  return { raw, keys };
}

const documents = sources.map((source) => ({ source, ...readDocument(source.content) }));
const [ru, en] = documents;
for (const key of ru.keys) if (!en.keys.has(key)) throw new Error(`missing en-US key: ${key}`);
for (const key of en.keys) if (!ru.keys.has(key)) throw new Error(`missing ru-RU key: ${key}`);
for (const document of documents) {
  const resource = fs.readFileSync(document.source.resource, 'utf8');
  if (resource !== document.raw) throw new Error(`Resources localization diverges from canonical content: ${document.source.name}`);
}
console.log(`LOCALIZATION_CONTRACT: PASS (${ru.keys.size} semantic keys)`);
