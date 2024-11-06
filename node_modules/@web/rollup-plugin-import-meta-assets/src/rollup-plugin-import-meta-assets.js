/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use strict';

const fs = require('fs');
const path = require('path');
const { createFilter } = require('@rollup/pluginutils');
const { asyncWalk } = require('estree-walker');
const MagicString = require('magic-string');
const {
  dynamicImportToGlob: dynamicURLToGlob,
  VariableDynamicImportError: VariableURLError,
} = require('@rollup/plugin-dynamic-import-vars');

/**
 * Extract the relative path from an AST node representing this kind of expression `new URL('./path/to/asset.ext', import.meta.url)`.
 *
 * @param {import('estree').Node} node - The AST node
 * @returns {string} The relative path
 */
function getRelativeAssetPath(node) {
  // either normal string expression or else it would be Template Literal with a single quasi
  const browserPath = node.arguments[0].value ?? node.arguments[0].quasis[0].value.cooked;
  return browserPath.split('/').join(path.sep);
}

/**
 * Checks if a AST node represents this kind of expression: `new URL('./path/to/asset.ext', import.meta.url)`.
 *
 * @param {import('estree').Node} node - The AST node
 * @returns {undefined | 'static' | 'dynamic'}
 */
function getImportMetaUrlType(node) {
  const isNewURL =
    node.type === 'NewExpression' &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'URL' &&
    node.arguments.length === 2 &&
    (node.arguments[0].type === 'Literal' ||
      // Allow template literals, reuses @rollup/plugin-dynamic-import-vars logic
      node.arguments[0].type === 'TemplateLiteral') &&
    typeof getRelativeAssetPath(node) === 'string' &&
    node.arguments[1].type === 'MemberExpression' &&
    node.arguments[1].object.type === 'MetaProperty' &&
    node.arguments[1].property.type === 'Identifier' &&
    node.arguments[1].property.name === 'url';

  if (!isNewURL) {
    return undefined;
  }

  if (node.arguments[0].type === 'TemplateLiteral' && node.arguments[0].expressions.length > 0) {
    return 'dynamic';
  }

  return 'static';
}

/**
 * Detects assets references relative to modules using patterns such as `new URL('./path/to/asset.ext', import.meta.url)`.
 * The assets are added to the rollup pipeline, allowing them to be transformed and hash the filenames.
 * Patterns that represent directories are skipped.
 *
 * @param {object} options
 * @param {string|string[]} [options.include] A picomatch pattern, or array of patterns, which specifies the files in the build the plugin should operate on. By default all files are targeted.
 * @param {string|string[]} [options.exclude] A picomatch pattern, or array of patterns, which specifies the files in the build the plugin should _ignore_. By default no files are ignored.
 * @param {boolean} [options.warnOnError] By default, the plugin quits the build process when it encounters an error. If you set this option to true, it will throw a warning instead and leave the code untouched.
 * @param {function} [options.transform] A function to transform assets.
 * @return {import('rollup').Plugin} A Rollup Plugin
 */
function importMetaAssets({ include, exclude, warnOnError, transform } = {}) {
  const filter = createFilter(include, exclude);

  return {
    name: 'rollup-plugin-import-meta-assets',
    async transform(code, id) {
      if (!filter(id)) {
        return null;
      }

      // Part 1: resolve dynamic template literal expressions
      const parsed = this.parse(code);

      let dynamicURLIndex = -1;
      let ms;

      await asyncWalk(parsed, {
        enter: async node => {
          const importMetaUrlType = getImportMetaUrlType(node);

          if (importMetaUrlType !== 'dynamic') {
            return;
          }
          dynamicURLIndex += 1;

          try {
            // see if this is a Template Literal with expressions inside, and generate a glob expression
            const glob = dynamicURLToGlob(node.arguments[0], code.substring(node.start, node.end));

            if (!glob) {
              // this was not a variable dynamic url
              return;
            }

            const { globby } = await import('globby');
            // execute the glob
            const result = await globby(glob, { cwd: path.dirname(id) });
            const paths = result.map(r =>
              r.startsWith('./') || r.startsWith('../') ? r : `./${r}`,
            );

            // create magic string if it wasn't created already
            ms = ms || new MagicString(code);
            // unpack variable dynamic url into a function with url statements per file, rollup
            // will turn these into chunks automatically
            ms.prepend(
              `function __variableDynamicURLRuntime${dynamicURLIndex}__(path) {
  switch (path) {
${paths.map(p => `    case '${p}': return new URL('${p}', import.meta.url);`).join('\n')}
${`    default: return new Promise(function(resolve, reject) {
      (typeof queueMicrotask === 'function' ? queueMicrotask : setTimeout)(
        reject.bind(null, new Error("Unknown variable dynamic new URL statement: " + path))
      );
    })\n`}   }
 }\n\n`,
            );
            // call the runtime function instead of doing a dynamic url, the url specifier will
            // be evaluated at runtime and the correct url will be returned by the injected function
            ms.overwrite(
              node.start,
              node.start + 7,
              `__variableDynamicURLRuntime${dynamicURLIndex}__`,
            );
          } catch (error) {
            if (error instanceof VariableURLError && warnOnError) {
              this.warn(error);
            } else {
              this.error(error);
            }
          }
        },
      });

      let newCode = code;
      if (ms && dynamicURLIndex !== -1) {
        newCode = ms.toString();
      }

      // Part 2: emit asset files
      const ast = this.parse(newCode);
      const magicString = new MagicString(newCode);
      let modifiedCode = false;

      await asyncWalk(ast, {
        enter: async node => {
          const importMetaUrlType = getImportMetaUrlType(node);
          if (!importMetaUrlType) {
            return;
          }

          if (importMetaUrlType === 'static') {
            const absoluteScriptDir = path.dirname(id);
            const relativeAssetPath = getRelativeAssetPath(node);
            const absoluteAssetPath = path.resolve(absoluteScriptDir, relativeAssetPath);
            const assetName = path.basename(absoluteAssetPath);

            try {
              const assetContents = await fs.promises.readFile(absoluteAssetPath);
              const transformedAssetContents =
                transform != null
                  ? await transform(assetContents, absoluteAssetPath)
                  : assetContents;
              if (transformedAssetContents === null) {
                return;
              }
              const ref = this.emitFile({
                type: 'asset',
                name: assetName,
                source: transformedAssetContents,
              });
              magicString.overwrite(
                node.arguments[0].start,
                node.arguments[0].end,
                `import.meta.ROLLUP_FILE_URL_${ref}`,
              );
              modifiedCode = true;
            } catch (error) {
              // Do not process directories, just skip
              if (error.code !== 'EISDIR') {
                if (warnOnError) {
                  this.warn(error, node.arguments[0].start);
                } else {
                  this.error(error, node.arguments[0].start);
                }
              }
            }
          }
        },
      });

      return {
        code: magicString.toString(),
        map: modifiedCode ? magicString.generateMap({ hires: true, includeContent: true }) : null,
      };
    },
  };
}

module.exports = { importMetaAssets };
