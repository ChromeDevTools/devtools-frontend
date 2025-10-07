"use strict";

var _index = _interopRequireDefault(require("../index.cjs"));
var _jsonSchemaToTypescript = require("json-schema-to-typescript");
var _promises = require("node:fs/promises");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
let str = 'export interface Rules {\n';
for (const [ruleName, rule] of Object.entries(/** @type {Record<string, import('@eslint/core').RuleDefinition<import('@eslint/core').RuleDefinitionTypeOptions>>} */
_index.default.rules)) {
  str += `  /** ${rule.meta?.docs?.description ?? ''} */\n`;
  str += `  "jsdoc/${ruleName}": `;
  const ts = await (0, _jsonSchemaToTypescript.compile)({
    items: rule?.meta?.schema || [],
    type: 'array'
  }, 'Test', {
    bannerComment: ''
  });
  str += ts.replace(/^export type Test = ?/v, '').replace(/^export interface Test /v, '').replaceAll('\n', '\n  ').trimEnd().replace(/;$/v, '') + ';\n\n';
}
str = str.replace(/\n$/v, '') + '}\n';
await (0, _promises.writeFile)(__dirname + '/../rules.d.ts', str);

// console.log('str', str);
//# sourceMappingURL=generateRuleTypes.cjs.map