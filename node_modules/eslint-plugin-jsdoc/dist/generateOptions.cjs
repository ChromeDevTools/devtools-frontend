"use strict";

var _escodegen = require("@es-joy/escodegen");
var _decamelize = _interopRequireDefault(require("decamelize"));
var _espree = require("espree");
var _esquery = _interopRequireDefault(require("esquery"));
var _promises = require("node:fs/promises");
var _nodePath = require("node:path");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const rulesDir = './src/rules';
const dirContents = await (0, _promises.readdir)(rulesDir);
for (const file of dirContents) {
  if (!file.endsWith('.js')) {
    continue;
  }
  const fileContents = await (0, _promises.readFile)((0, _nodePath.join)(rulesDir, file), 'utf8');
  // console.log('file', file);
  const ast = (0, _espree.parse)(fileContents, {
    ecmaVersion: 2_024,
    sourceType: 'module'
  });
  const results = _esquery.default.query(ast, 'ExportDefaultDeclaration[declaration.callee.name="iterateJsdoc"]' + ' Property[key.name="meta"] Property[key.name="schema"]');
  if (results[0]?.value) {
    const schema = (0, _escodegen.generate)(results[0]?.value, {
      format: {
        json: true,
        quotes: 'double'
      }
    });
    const parsed = JSON.parse(schema);
    let initial = '';
    if (Array.isArray(parsed)) {
      if (!parsed.length) {
        // eslint-disable-next-line no-console -- CLI
        console.log('skipping no options', file);
        continue;
      }
      if (parsed.length >= 2) {
        if (parsed.length >= 3 || parsed[0].type !== 'string') {
          // eslint-disable-next-line no-console -- CLI
          console.log('unexpectedly large schema', file);
          continue;
          // throw new Error('Unexpected long schema array');
        }
        initial = `string (${parsed[0].enum.map(item => {
          return `"${item}"`;
        }).join(', ')}) followed by object with `;
        parsed.shift();
      }
    }
    const obj = Array.isArray(parsed) ? parsed[0] : parsed;
    const hyphenatedRule = (0, _decamelize.default)(file, {
      separator: '-'
    }).replace(/\.js$/v, '.md');
    const docPath = (0, _nodePath.join)('.README/rules', hyphenatedRule);
    const ruleDocs = (await (0, _promises.readFile)(docPath, 'utf8')).replace(/(\|\s*Options\s*\|)([^\|]*)(\|)?/v, `$1${initial + Object.keys(obj.properties).map(key => {
      return `\`${key}\``;
    }).join(', ')}$3`);
    await (0, _promises.writeFile)(docPath, ruleDocs);
  }
}
//# sourceMappingURL=generateOptions.cjs.map