"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _index = _interopRequireDefault(require("../index.cjs"));
var _decamelize = _interopRequireDefault(require("decamelize"));
var _gitdown = _interopRequireDefault(require("gitdown"));
var _glob = require("glob");
var _nodeFs = _interopRequireDefault(require("node:fs"));
var _nodePath = _interopRequireDefault(require("node:path"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); } /**
 * This script is used to inline assertions into the README.md documents.
 */
const dirname = __dirname;

/**
 * @param {string} str
 */
const escapeDescription = str => {
  return str.replaceAll(/(?<!`|\* +|'|\/\/ )@\w+/gv, '<code>$&</code>');
};

/**
 * @param {string} code
 * @returns {string}
 */
const trimCode = code => {
  let lines = code.replace(/^\n/v, '').trimEnd().split('\n');
  const firsLineIndentation = lines[0].match(/^\s+/v);
  const lastLineIndentation = lines[lines.length - 1].match(/^\s+/v);
  const firstIndentSize = firsLineIndentation ? firsLineIndentation[0].length : 0;
  const lastIndentSize = lastLineIndentation ? lastLineIndentation[0].length : 0;
  lines = lines.map((line, index) => {
    const lineIndentSize = firstIndentSize !== 0 || index === 0 ? Math.min(firstIndentSize, lastIndentSize) : lastIndentSize;
    return line.slice(lineIndentSize);
  });
  return lines.join('\n').replaceAll('\r', '\\r');
};

/**
 * @param {import('eslint').RuleTester.InvalidTestCase|import('eslint').RuleTester.ValidTestCase} setup
 * @param {string} ruleName
 * @returns {string}
 */
const formatCodeSnippet = (setup, ruleName) => {
  const paragraphs = [];
  paragraphs.push(trimCode(setup.code));
  if (setup.settings) {
    paragraphs.push(`// Settings: ${JSON.stringify(setup.settings)}`);
  }
  if (setup.options) {
    paragraphs.push(`// "jsdoc/${ruleName}": ["error"|"warn", ${JSON.stringify(setup.options).slice(1)}`);
  }
  if ('errors' in setup) {
    paragraphs.push(`// Message: ${/** @type {Array<import('eslint').RuleTester.TestCaseError>} */setup.errors[0].message}`);
  }
  return paragraphs.join('\n');
};
const getAssertions = async () => {
  const assertionFiles = (await (0, _glob.glob)(_nodePath.default.resolve(dirname, '../../test/rules/assertions/*.js'))).filter(file => {
    return !file.includes('flatConfig');
  }).toReversed();
  const assertionNames = assertionFiles.map(filePath => {
    return _nodePath.default.basename(filePath, '.js');
  });
  const assertionCodes = await Promise.all(assertionFiles.map(async (filePath, idx) => {
    /**
     * @type {{
     *   invalid: (import('eslint').RuleTester.InvalidTestCase & {ignoreReadme?: true})[],
     *   valid: (import('eslint').RuleTester.ValidTestCase & {ignoreReadme?: true})[]
     * }}
     */
    const codes = (await (specifier => new Promise(r => r(`${specifier}`)).then(s => _interopRequireWildcard(require(s))))(filePath)).default;
    const ruleName = (0, _decamelize.default)(assertionNames[idx], {
      separator: '-'
    });
    return {
      invalid: codes.invalid.filter(({
        ignoreReadme
      }) => {
        return !ignoreReadme;
      }).map(setup => {
        return formatCodeSnippet(setup, ruleName);
      }),
      valid: codes.valid.filter(({
        ignoreReadme
      }) => {
        return !ignoreReadme;
      }).map(setup => {
        return formatCodeSnippet(setup, ruleName);
      })
    };
  }));
  return {
    assertionNames,
    assertions: Object.fromEntries(assertionNames.map((assertionName, index) => {
      return [assertionName, assertionCodes[index]];
    }))
  };
};
const getSomeBranch = () => {
  const gitConfig = _nodeFs.default.readFileSync(_nodePath.default.join(dirname, '../../.git/config')).toString();
  const [, branch] = /\[branch "([^"]+)"\]/v.exec(gitConfig) || [];
  return branch;
};

// Scan the directory for these instead?
const extraFiles = ['settings.md', 'advanced.md', 'processors.md', 'README.md'];
const otherPaths = extraFiles.map(extraFile => {
  return _nodePath.default.join(dirname, '..', '..', '.README', extraFile);
});
const generateDocs = async () => {
  const {
    assertionNames,
    assertions
  } = await getAssertions();

  /** @type {import('json-schema').JSONSchema4[][]} */
  const schemas = [];

  /**
   * @type {{
   *   decamelized: string,
   *   row: string
   * }[]}
   */
  const tableRows = [];
  const docContents = await Promise.all([...assertionNames.map(assertionName => {
    const decamelized = (0, _decamelize.default)(assertionName, {
      separator: '-'
    });
    schemas.push(/** @type {import('json-schema').JSONSchema4[]} */
    _index.default.rules?.[decamelized].meta?.schema);
    const ruleDescription = _index.default.rules?.[decamelized]?.meta?.docs?.description;
    if (ruleDescription === undefined) {
      throw new Error(`Rule ${assertionName} missing description`);
    }
    const fixable = _index.default.rules?.[decamelized]?.meta?.fixable ?? null;
    const recommended = _index.default.configs['flat/recommended'].rules?.['jsdoc/' + decamelized] !== 'off';
    const tsRecommended = _index.default.configs['flat/recommended-typescript'].rules?.['jsdoc/' + decamelized] !== 'off';
    const tsRecommendedFlavor = _index.default.configs['flat/recommended-typescript-flavor'].rules?.['jsdoc/' + decamelized] !== 'off';
    tableRows.push({
      decamelized,
      row: `|${recommended ? tsRecommended && tsRecommendedFlavor ? ':heavy_check_mark:' : ':heavy_check_mark: (' + (tsRecommended ? 'On in TS' : 'Off in TS') + '; ' + (tsRecommendedFlavor ? 'On in TS flavor' : 'Off in TS flavor') + ')' : tsRecommended || tsRecommendedFlavor ? (tsRecommended ? 'On in TS' : 'Off in TS') + '; ' + (tsRecommendedFlavor ? 'On in TS flavor' : 'Off in TS flavor') : ''}|${fixable ? ':wrench:' : ''}| [${decamelized}](./docs/rules/${decamelized}.md#readme) | ${ruleDescription} |`
    });
    return _nodePath.default.join(dirname, '..', '..', '.README', 'rules', decamelized + '.md');
  }), ...otherPaths].map(async (docPath, idx) => {
    const gitdown = await _gitdown.default.readFile(docPath);
    gitdown.setConfig({
      gitinfo: {
        defaultBranchName: getSomeBranch() || 'master',
        gitPath: _nodePath.default.join(dirname, '../../.git')
      }
    });
    gitdown.registerHelper('rules-table', {
      compile() {
        return tableRows.toSorted(({
          decamelized
        }, {
          decamelized: dc
        }) => {
          return decamelized < dc ? -1 : decamelized > dc ? 1 : 0;
        }).map(({
          row
        }) => {
          return row;
        }).join('\n');
      }
    });
    gitdown.registerHelper('options', {
      compile() {
        if (!schemas[idx]) {
          return '';
        }

        /**
         * @param {import('json-schema').JSONSchema4} schema
         * @param {number} jIdx
         * @param {import('json-schema').JSONSchema4[]} arr
         * @param {number} [nesting]
         */
        const convertFromSchema = (schema, jIdx, arr, nesting = 3) => {
          let ret = '';
          switch (schema.type) {
            case 'array':
              ret += convertFromSchema(/** @type {import('json-schema').JSONSchema4} */schema.items, 0, [], nesting + 1);
              break;
            case 'object':
              if (!schema.properties) {
                break;
              }
              if (jIdx === 0) {
                ret += (nesting > 3 ? '\n' : '') + (arr.length <= 1 ? 'A single' : 'An') + ' options object has the following properties.\n';
              } else {
                ret += '\n\nThe next option is an object with the following properties.\n';
              }
              if (schema.description) {
                ret += `\n${escapeDescription(schema.description)}\n`;
              }
              for (const [property, innerSchema] of Object.entries(schema.properties)) {
                const {
                  description,
                  type
                } = innerSchema;
                if (!description) {
                  throw new Error('Missing description for property ' + property + ' for rule ' + assertionNames[idx] + ' with schema ' + JSON.stringify(innerSchema));
                }
                ret += '\n' + '#'.repeat(nesting) + ` \`${property}\`

${type === 'object' && innerSchema.properties ? '' : escapeDescription(description) + '\n'}`;
                if (type === 'object' || type === 'array') {
                  ret += convertFromSchema(innerSchema, 0, [], nesting + 1);
                }
              }
              break;
            case 'string':
              if (jIdx !== 0) {
                throw new Error('Unexpected string schema');
              }

              // If a simple string, should be documented by parent
              if (schema.enum) {
                ret += 'The first option is a string with the following possible values: ';
                ret += schema.enum?.map(val => {
                  return `"${val}"`;
                }).join(', ') + '.\n';
              }
              if (schema.description) {
                ret += escapeDescription(schema.description);
              }
              break;
            default:
              // Describe on parent object
              if (schema.anyOf) {
                break;
              }
              throw new Error('Unrecognized type ' + schema.type + ' for schema: ' + JSON.stringify(schema));
          }
          return ret;
        };
        return schemas[idx].map((schema, jIdx, arr) => {
          return convertFromSchema(schema, jIdx, arr);
        }).join('');
      }
    });
    return gitdown.get();
  }));
  return docContents.map(docContent => {
    return docContent.replaceAll(/<!-- assertions-(passing|failing) ([a-z]+?) -->/gvi,
    /**
     * @param {string} _assertionsBlock
     * @param {string} passingFailing
     * @param {string} ruleName
     * @returns {string}
     */
    (_assertionsBlock, passingFailing, ruleName) => {
      const ruleAssertions = assertions[ruleName];
      if (!ruleAssertions) {
        throw new Error(`No assertions available for rule "${ruleName}".`);
      }
      return passingFailing === 'failing' ? 'The following patterns are considered problems:\n\n````ts\n' + ruleAssertions.invalid.join('\n\n') + '\n````\n\n' : 'The following patterns are not considered problems:\n\n````ts\n' + ruleAssertions.valid.join('\n\n') + '\n````\n';
    }
    // Allow relative paths in source for #902 but generate compiled file in
    //   manner compatible with GitHub and npmjs.com
    ).replaceAll('(../#', '(#user-content-eslint-plugin-jsdoc-');
  });
};

/**
 * @returns {string[]}
 */
const getDocPaths = () => {
  const basePath = _nodePath.default.join(dirname, '..', '..', '.README');
  const writeBasePath = _nodePath.default.join(dirname, '..', '..', 'docs');
  const docPaths = /** @type {string[]} */_nodeFs.default.readdirSync(basePath).flatMap(docFile => {
    if (extraFiles.includes(docFile)) {
      // Will get path separately below
      return null;
    }
    if (docFile === '.DS_Store') {
      return null;
    }
    const innerBasePath = _nodePath.default.join(basePath, docFile);
    const writeInnerBasePath = _nodePath.default.join(writeBasePath, docFile);
    const stat = _nodeFs.default.statSync(innerBasePath);
    if (stat.isFile()) {
      // Currently settings and advanced
      return writeInnerBasePath;
    }
    if (stat.isDirectory()) {
      return _nodeFs.default.readdirSync(innerBasePath).map(innerDocFile => {
        return _nodePath.default.join(writeInnerBasePath, innerDocFile);
      }).sort((a, b) => {
        const newA = a.replace(/\.md/v, '');
        const newB = b.replace(/\.md/v, '');
        return newA < newB ? -1 : newB > newA ? 1 : 0;
      });
    }
    return null;
  }).filter(Boolean);
  return [...docPaths, ...extraFiles.slice(0, -1).map(extraFile => {
    return _nodePath.default.join(dirname, '..', '..', 'docs', extraFile);
  }), _nodePath.default.join(dirname, '..', '..', 'README.md')];
};
const generateDocsAndWriteToDisk = async () => {
  const [docContents, docPaths] = await Promise.all([generateDocs(), getDocPaths()]);
  for (const [idx, docContent] of docContents.entries()) {
    const destPath = docPaths[idx];
    _nodeFs.default.writeFileSync(destPath, docContent);
  }
};
const assertDocsAreUpToDate = async () => {
  const [docContents, docPaths] = await Promise.all([generateDocs(), getDocPaths()]);
  for (const [idx, docContent] of docContents.entries()) {
    const docPath = docPaths[idx];
    const isUpToDate = _nodeFs.default.readFileSync(docPath, 'utf8') === docContent;
    if (!isUpToDate) {
      throw new Error('Docs are not up to date, please run `pnpm run create-docs` to update it.');
    }
  }
};
const main = async () => {
  try {
    const hasCheckFlag = process.argv.includes('--check');
    if (hasCheckFlag) {
      await assertDocsAreUpToDate();
    } else {
      await generateDocsAndWriteToDisk();
    }
  } catch (error) {
    /* eslint-disable-next-line no-console */
    console.error(error);
    process.exit(1);
  }
};
main();
var _default = exports.default = generateDocs;
module.exports = exports.default;
//# sourceMappingURL=generateDocs.cjs.map