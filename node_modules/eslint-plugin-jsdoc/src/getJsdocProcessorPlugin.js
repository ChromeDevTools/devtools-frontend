import {
  forEachPreferredTag,
  getPreferredTagName,
  getRegexFromString,
  getTagDescription,
  hasTag,
} from './jsdocUtils.js';
import {
  parseComment,
} from '@es-joy/jsdoccomment';
import * as espree from 'espree';
import {
  readFileSync,
} from 'node:fs';
import {
  join,
} from 'node:path';

const {
  version,
} = JSON.parse(
  // @ts-expect-error `Buffer` is ok for `JSON.parse`
  readFileSync(join(import.meta.dirname, '../package.json')),
);

// const zeroBasedLineIndexAdjust = -1;
const likelyNestedJSDocIndentSpace = 1;
const preTagSpaceLength = 1;

// If a space is present, we should ignore it
const firstLinePrefixLength = preTagSpaceLength;

const hasCaptionRegex = /^\s*<caption>([\s\S]*?)<\/caption>/u;

/**
 * @param {string} str
 * @returns {string}
 */
const escapeStringRegexp = (str) => {
  return str.replaceAll(/[.*+?^${}()|[\]\\]/gu, '\\$&');
};

/**
 * @param {string} str
 * @param {string} ch
 * @returns {import('./iterateJsdoc.js').Integer}
 */
const countChars = (str, ch) => {
  return (str.match(new RegExp(escapeStringRegexp(ch), 'gu')) || []).length;
};

/**
 * @param {string} text
 * @returns {[
 *   import('./iterateJsdoc.js').Integer,
 *   import('./iterateJsdoc.js').Integer
 * ]}
 */
const getLinesCols = (text) => {
  const matchLines = countChars(text, '\n');

  const colDelta = matchLines ?
    text.slice(text.lastIndexOf('\n') + 1).length :
    text.length;

  return [
    matchLines, colDelta,
  ];
};

/**
 * @typedef {number} Integer
 */

/**
 * @typedef {object} JsdocProcessorOptions
 * @property {boolean} [captionRequired] Require captions for example tags
 * @property {Integer} [paddedIndent] See docs
 * @property {boolean} [checkDefaults] See docs
 * @property {boolean} [checkParams] See docs
 * @property {boolean} [checkExamples] See docs
 * @property {boolean} [checkProperties] See docs
 * @property {string} [matchingFileName] See docs
 * @property {string} [matchingFileNameDefaults] See docs
 * @property {string} [matchingFileNameParams] See docs
 * @property {string} [matchingFileNameProperties] See docs
 * @property {string|RegExp} [exampleCodeRegex] See docs
 * @property {string|RegExp} [rejectExampleCodeRegex] See docs
 * @property {string[]} [allowedLanguagesToProcess] See docs
 * @property {"script"|"module"} [sourceType] See docs
 * @property {import('eslint').Linter.ESTreeParser|import('eslint').Linter.NonESTreeParser} [parser] See docs
 */

/**
 * We use a function for the ability of the user to pass in a config, but
 * without requiring all users of the plugin to do so.
 * @param {JsdocProcessorOptions} [options]
 */
export const getJsdocProcessorPlugin = (options = {}) => {
  const {
    allowedLanguagesToProcess = [
      'js', 'ts', 'javascript', 'typescript',
    ],
    captionRequired = false,
    checkDefaults = false,
    checkExamples = true,
    checkParams = false,
    checkProperties = false,
    exampleCodeRegex = null,
    matchingFileName = null,
    matchingFileNameDefaults = null,
    matchingFileNameParams = null,
    matchingFileNameProperties = null,
    paddedIndent = 0,
    parser = undefined,
    rejectExampleCodeRegex = null,
    sourceType = 'module',
  } = options;

  /** @type {RegExp} */
  let exampleCodeRegExp;
  /** @type {RegExp} */
  let rejectExampleCodeRegExp;

  if (exampleCodeRegex) {
    exampleCodeRegExp = typeof exampleCodeRegex === 'string' ?
      getRegexFromString(exampleCodeRegex) :
      exampleCodeRegex;
  }

  if (rejectExampleCodeRegex) {
    rejectExampleCodeRegExp = typeof rejectExampleCodeRegex === 'string' ?
      getRegexFromString(rejectExampleCodeRegex) :
      rejectExampleCodeRegex;
  }

  /**
   * @type {{
   *   targetTagName: string,
   *   ext: string,
   *   codeStartLine: number,
   *   codeStartCol: number,
   *   nonJSPrefacingCols: number,
   *   commentLineCols: [number, number]
   * }[]}
   */
  const otherInfo = [];

  /** @type {import('eslint').Linter.LintMessage[]} */
  let extraMessages = [];

  /**
   * @param {import('./iterateJsdoc.js').JsdocBlockWithInline} jsdoc
   * @param {string} jsFileName
   * @param {[number, number]} commentLineCols
   */
  const getTextsAndFileNames = (jsdoc, jsFileName, commentLineCols) => {
    /**
     * @type {{
     *   text: string,
     *   filename: string|null|undefined
     * }[]}
     */
    const textsAndFileNames = [];

    /**
     * @param {{
     *   filename: string|null,
     *   defaultFileName: string|undefined,
     *   source: string,
     *   targetTagName: string,
     *   rules?: import('eslint').Linter.RulesRecord|undefined,
     *   lines?: import('./iterateJsdoc.js').Integer,
     *   cols?: import('./iterateJsdoc.js').Integer,
     *   skipInit?: boolean,
     *   ext: string,
     *   sources?: {
     *     nonJSPrefacingCols: import('./iterateJsdoc.js').Integer,
     *     nonJSPrefacingLines: import('./iterateJsdoc.js').Integer,
     *     string: string,
     *   }[],
     *   tag?: import('comment-parser').Spec & {
     *     line?: import('./iterateJsdoc.js').Integer,
     *   }|{
     *     line: import('./iterateJsdoc.js').Integer,
     *   }
     * }} cfg
     */
    const checkSource = ({
      cols = 0,
      defaultFileName,
      ext,
      filename,
      lines = 0,
      skipInit,
      source,
      sources = [],
      tag = {
        line: 0,
      },
      targetTagName,
    }) => {
      if (!skipInit) {
        sources.push({
          nonJSPrefacingCols: cols,
          nonJSPrefacingLines: lines,
          string: source,
        });
      }

      /**
       * @param {{
       *   nonJSPrefacingCols: import('./iterateJsdoc.js').Integer,
       *   nonJSPrefacingLines: import('./iterateJsdoc.js').Integer,
       *   string: string
       * }} cfg
       */
      const addSourceInfo = function ({
        nonJSPrefacingCols,
        nonJSPrefacingLines,
        string,
      }) {
        const src = paddedIndent ?
          string.replaceAll(new RegExp(`(^|\n) {${paddedIndent}}(?!$)`, 'gu'), '\n') :
          string;

        // Programmatic ESLint API: https://eslint.org/docs/developer-guide/nodejs-api
        const file = filename || defaultFileName;

        if (!('line' in tag)) {
          tag.line = tag.source[0].number;
        }

        // NOTE: `tag.line` can be 0 if of form `/** @tag ... */`
        const codeStartLine = /**
                               * @type {import('comment-parser').Spec & {
                               *     line: import('./iterateJsdoc.js').Integer,
                               * }}
                               */ (tag).line + nonJSPrefacingLines;
        const codeStartCol = likelyNestedJSDocIndentSpace;

        textsAndFileNames.push({
          filename: file,
          text: src,
        });
        otherInfo.push({
          codeStartCol,
          codeStartLine,
          commentLineCols,
          ext,
          nonJSPrefacingCols,
          targetTagName,
        });
      };

      for (const targetSource of sources) {
        addSourceInfo(targetSource);
      }
    };

    /**
     *
     * @param {string|null} filename
     * @param {string} [ext] Since `eslint-plugin-markdown` v2, and
     *   ESLint 7, this is the default which other JS-fenced rules will used.
     *   Formerly "md" was the default.
     * @returns {{
     *   defaultFileName: string|undefined,
     *   filename: string|null,
     *   ext: string
     * }}
     */
    const getFilenameInfo = (filename, ext = 'md/*.js') => {
      let defaultFileName;
      if (!filename) {
        if (typeof jsFileName === 'string' && jsFileName.includes('.')) {
          defaultFileName = jsFileName.replace(/\.[^.]*$/u, `.${ext}`);
        } else {
          defaultFileName = `dummy.${ext}`;
        }
      }

      return {
        defaultFileName,
        ext,
        filename,
      };
    };

    if (checkDefaults) {
      const filenameInfo = getFilenameInfo(matchingFileNameDefaults, 'jsdoc-defaults');
      forEachPreferredTag(jsdoc, 'default', (tag, targetTagName) => {
        if (!tag.description.trim()) {
          return;
        }

        checkSource({
          source: `(${getTagDescription(tag)})`,
          targetTagName,
          ...filenameInfo,
        });
      });
    }

    if (checkParams) {
      const filenameInfo = getFilenameInfo(matchingFileNameParams, 'jsdoc-params');
      forEachPreferredTag(jsdoc, 'param', (tag, targetTagName) => {
        if (!tag.default || !tag.default.trim()) {
          return;
        }

        checkSource({
          source: `(${tag.default})`,
          targetTagName,
          ...filenameInfo,
        });
      });
    }

    if (checkProperties) {
      const filenameInfo = getFilenameInfo(matchingFileNameProperties, 'jsdoc-properties');
      forEachPreferredTag(jsdoc, 'property', (tag, targetTagName) => {
        if (!tag.default || !tag.default.trim()) {
          return;
        }

        checkSource({
          source: `(${tag.default})`,
          targetTagName,
          ...filenameInfo,
        });
      });
    }

    if (!checkExamples) {
      return textsAndFileNames;
    }

    const tagName = /** @type {string} */ (getPreferredTagName(jsdoc, {
      tagName: 'example',
    }));
    if (!hasTag(jsdoc, tagName)) {
      return textsAndFileNames;
    }

    const matchingFilenameInfo = getFilenameInfo(matchingFileName);

    forEachPreferredTag(jsdoc, 'example', (tag, targetTagName) => {
      let source = /** @type {string} */ (getTagDescription(tag));
      const match = source.match(hasCaptionRegex);

      if (captionRequired && (!match || !match[1].trim())) {
        extraMessages.push({
          column: commentLineCols[1] + 1,
          line: 1 + commentLineCols[0] + (tag.line ?? tag.source[0].number),
          message: `@${targetTagName} error - Caption is expected for examples.`,
          ruleId: 'jsdoc/example-missing-caption',
          severity: 2,
        });
        return;
      }

      source = source.replace(hasCaptionRegex, '');
      const [
        lines,
        cols,
      ] = match ? getLinesCols(match[0]) : [
        0, 0,
      ];

      if (exampleCodeRegex && !exampleCodeRegExp.test(source) ||
        rejectExampleCodeRegex && rejectExampleCodeRegExp.test(source)
      ) {
        return;
      }

      // If `allowedLanguagesToProcess` is falsy, all languages should be processed.
      if (allowedLanguagesToProcess) {
        const matches = (/^\s*```(?<language>\S+)([\s\S]*)```\s*$/u).exec(source);
        if (matches?.groups && !allowedLanguagesToProcess.includes(
          matches.groups.language.toLowerCase(),
        )) {
          return;
        }
      }

      const sources = [];
      let skipInit = false;
      if (exampleCodeRegex) {
        let nonJSPrefacingCols = 0;
        let nonJSPrefacingLines = 0;

        let startingIndex = 0;
        let lastStringCount = 0;

        let exampleCode;
        exampleCodeRegExp.lastIndex = 0;
        while ((exampleCode = exampleCodeRegExp.exec(source)) !== null) {
          const {
            '0': n0,
            '1': n1,
            index,
          } = exampleCode;

          // Count anything preceding user regex match (can affect line numbering)
          const preMatch = source.slice(startingIndex, index);

          const [
            preMatchLines,
            colDelta,
          ] = getLinesCols(preMatch);

          let nonJSPreface;
          let nonJSPrefaceLineCount;
          if (n1) {
            const idx = n0.indexOf(n1);
            nonJSPreface = n0.slice(0, idx);
            nonJSPrefaceLineCount = countChars(nonJSPreface, '\n');
          } else {
            nonJSPreface = '';
            nonJSPrefaceLineCount = 0;
          }

          nonJSPrefacingLines += lastStringCount + preMatchLines + nonJSPrefaceLineCount;

          // Ignore `preMatch` delta if newlines here
          if (nonJSPrefaceLineCount) {
            const charsInLastLine = nonJSPreface.slice(nonJSPreface.lastIndexOf('\n') + 1).length;

            nonJSPrefacingCols += charsInLastLine;
          } else {
            nonJSPrefacingCols += colDelta + nonJSPreface.length;
          }

          const string = n1 || n0;
          sources.push({
            nonJSPrefacingCols,
            nonJSPrefacingLines,
            string,
          });
          startingIndex = exampleCodeRegExp.lastIndex;
          lastStringCount = countChars(string, '\n');
          if (!exampleCodeRegExp.global) {
            break;
          }
        }

        skipInit = true;
      }

      checkSource({
        cols,
        lines,
        skipInit,
        source,
        sources,
        tag,
        targetTagName,
        ...matchingFilenameInfo,
      });
    });

    return textsAndFileNames;
  };

  // See https://eslint.org/docs/latest/extend/plugins#processors-in-plugins
  // See https://eslint.org/docs/latest/extend/custom-processors
  // From https://github.com/eslint/eslint/issues/14745#issuecomment-869457265
  /*
    {
      "files": ["*.js", "*.ts"],
      "processor": "jsdoc/example" // a pretended value here
    },
    {
      "files": [
        "*.js/*_jsdoc-example.js",
        "*.ts/*_jsdoc-example.js",
        "*.js/*_jsdoc-example.ts"
      ],
      "rules": {
        // specific rules for examples in jsdoc only here
        // And other rules for `.js` and `.ts` will also be enabled for them
      }
    }
  */
  return {
    meta: {
      name: 'eslint-plugin-jsdoc/processor',
      version,
    },
    processors: {
      examples: {
        meta: {
          name: 'eslint-plugin-jsdoc/preprocessor',
          version,
        },
        /**
         * @param {import('eslint').Linter.LintMessage[][]} messages
         * @param {string} filename
         */
        postprocess ([
          jsMessages,
          ...messages
        // eslint-disable-next-line no-unused-vars -- Placeholder
        ], filename) {
          for (const [
            idx,
            message,
          ] of messages.entries()) {
            const {
              codeStartCol,
              codeStartLine,
              commentLineCols,
              nonJSPrefacingCols,
              targetTagName,
            } = otherInfo[idx];

            for (const msg of message) {
              const {
                column,
                endColumn,
                endLine,
                fatal,
                line,
                message: messageText,
                ruleId,
                severity,

                // Todo: Make fixable
                // fix
                // fix: {range: [number, number], text: string}
                // suggestions: {desc: , messageId:, fix: }[],
              } = msg;

              const [
                codeCtxLine,
                codeCtxColumn,
              ] = commentLineCols;
              const startLine = codeCtxLine + codeStartLine + line;

              // Seems to need one more now
              const startCol = 1 +
                codeCtxColumn + codeStartCol + (
              // This might not work for line 0, but line 0 is unlikely for examples
                line <= 1 ? nonJSPrefacingCols + firstLinePrefixLength : preTagSpaceLength
              ) + column;

              msg.message = '@' + targetTagName + ' ' + (severity === 2 ? 'error' : 'warning') +
                (ruleId ? ' (' + ruleId + ')' : '') + ': ' +
                (fatal ? 'Fatal: ' : '') +
                messageText;
              msg.line = startLine;
              msg.column = startCol;
              msg.endLine = endLine ? startLine + endLine : startLine;
              // added `- column` to offset what `endColumn` already seemed to include
              msg.endColumn = endColumn ? startCol - column + endColumn : startCol;
            }
          }

          const ret = [
            ...jsMessages,
          ].concat(...messages, ...extraMessages);
          extraMessages = [];
          return ret;
        },

        /**
         * @param {string} text
         * @param {string} filename
         */
        preprocess (text, filename) {
          try {
            let ast;

            // May be running a second time so catch and ignore
            try {
              ast = parser ?
                // @ts-expect-error Should be present
                parser.parseForESLint(text, {
                  comment: true,
                  ecmaVersion: 'latest',
                  sourceType,
                }).ast :
                espree.parse(text, {
                  comment: true,
                  ecmaVersion: 'latest',
                  sourceType,
                });
            } catch {
              return [
                text,
              ];
            }

            /** @type {[number, number][]} */
            const commentLineCols = [];
            const jsdocComments = /** @type {import('estree').Comment[]} */ (
              /**
               * @type {import('estree').Program & {
               *   comments?: import('estree').Comment[]
               * }}
               */
              (ast).comments
            ).filter((comment) => {
              return (/^\*\s/u).test(comment.value);
            }).map((comment) => {
              const [
                start,
                /* c8 ignore next -- Unsupporting processors only? */
              ] = comment.range ?? [];
              const textToStart = text.slice(0, start);

              const [
                lines,
                cols,
              ] = getLinesCols(textToStart);

              // const lines = [...textToStart.matchAll(/\n/gu)].length
              // const lastLinePos = textToStart.lastIndexOf('\n');
              // const cols = lastLinePos === -1
              //   ? 0
              //   : textToStart.slice(lastLinePos).length;
              commentLineCols.push([
                lines, cols,
              ]);
              return parseComment(comment);
            });

            return [
              text,
              ...jsdocComments.flatMap((jsdoc, idx) => {
                return getTextsAndFileNames(
                  jsdoc,
                  filename,
                  commentLineCols[idx],
                );
              }).filter(Boolean),
            ];
          /* c8 ignore next 6 */
          } catch (error) {
            // eslint-disable-next-line no-console -- Debugging
            console.log('err', filename, error);
          }

          return [];
        },
        // Todo: Reenable
        supportsAutofix: false,
      },
    },
  };
};
