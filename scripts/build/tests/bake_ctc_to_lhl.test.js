// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import * as fs from 'node:fs';
import * as path from 'node:path';

import {IntlMessageFormat} from '../../../front_end/third_party/intl-messageformat/package/intl-messageformat.esm.js';
import {bakePlaceholders} from '../../../third_party/i18n/bake-ctc-to-lhl.js';

const LOCALES_DIR = path.resolve(import.meta.dirname, '..', '..', '..', 'front_end', 'core', 'i18n', 'locales');

const KNOWN_UNPARSEABLE_KEYS = new Set([
  'generated/Deprecation.ts | ObsoleteCreateImageBitmapImageOrientationNone',
  'panels/protocol_monitor/ProtocolMonitor.ts | sendRawCDPCommandExplanation',
]);

/**
 * Recursively collects any `{identifier}` substrings found inside AST literal nodes.
 * @param {Array<{type: number, value?: string, options?: Record<string, {value?: unknown[]}>, children?: unknown[]}>} nodes
 * @returns {string[]}
 */
function findPlaceholdersInLiterals(nodes) {
  const matches = [];
  for (const node of nodes) {
    if (node.type === 0 && typeof node.value === 'string') {
      const found = node.value.match(/\{[A-Za-z0-9_]+\}/g);
      if (found) {
        matches.push(...found);
      }
    } else if (node.options) {
      for (const option of Object.values(node.options)) {
        if (option.value) {
          matches.push(...findPlaceholdersInLiterals(option.value));
        }
      }
    } else if (node.children) {
      matches.push(...findPlaceholdersInLiterals(node.children));
    }
  }
  return matches;
}

describe('bakePlaceholders', () => {
  it('doubles single quotes around an ICU placeholder', () => {
    const baked = bakePlaceholders({
      'test.ts | prompt': {
        message: 'Type \'$ICU_0$\'',
        description: 'Prompt',
        placeholders: {
          ICU_0: {content: '{PH1}', example: 'allow pasting'},
        },
      },
    });
    const message = baked['test.ts | prompt'].message;
    assert.strictEqual(message, 'Type \'\'{PH1}\'\'');
    const mf = new IntlMessageFormat(message, 'en-GB', undefined, {ignoreTag: true});
    assert.strictEqual(mf.format({PH1: 'allow pasting'}), 'Type \'allow pasting\'');
  });

  it('doubles a preceding apostrophe elision before an ICU placeholder', () => {
    const baked = bakePlaceholders({
      'test.ts | elision': {
        message: 'Activez l\'$ICU_0$ pour obtenir de l\'aide',
        description: 'Elision',
        placeholders: {
          ICU_0: {content: '{PH1}', example: 'allow pasting'},
        },
      },
    });
    const message = baked['test.ts | elision'].message;
    assert.strictEqual(message, 'Activez l\'\'{PH1} pour obtenir de l\'aide');
    const mf = new IntlMessageFormat(message, 'fr-CA', undefined, {ignoreTag: true});
    assert.strictEqual(mf.format({PH1: 'allow pasting'}), 'Activez l\'allow pasting pour obtenir de l\'aide');
  });

  it('preserves already escaped double single quotes around an ICU placeholder', () => {
    const baked = bakePlaceholders({
      'test.ts | escaped': {
        message: 'Profile \'\'$ICU_0$\'\' started',
        description: 'Already escaped',
        placeholders: {
          ICU_0: {content: '{PH1}', example: 'Default'},
        },
      },
    });
    const message = baked['test.ts | escaped'].message;
    assert.strictEqual(message, 'Profile \'\'{PH1}\'\' started');
    const mf = new IntlMessageFormat(message, 'en-GB', undefined, {ignoreTag: true});
    assert.strictEqual(mf.format({PH1: 'Default'}), 'Profile \'Default\' started');
  });

  it('preserves a possessive apostrophe after an unquoted ICU placeholder', () => {
    const baked = bakePlaceholders({
      'test.ts | possessive': {
        message: '$ICU_0$\'s value',
        description: 'Possessive',
        placeholders: {
          ICU_0: {content: '{PH1}', example: 'foo'},
        },
      },
    });
    const message = baked['test.ts | possessive'].message;
    assert.strictEqual(message, '{PH1}\'s value');
    const mf = new IntlMessageFormat(message, 'en-US', undefined, {ignoreTag: true});
    assert.strictEqual(mf.format({PH1: 'foo'}), 'foo\'s value');
  });

  it('doubles single quotes around ICU placeholders inside plural branches', () => {
    const baked = bakePlaceholders({
      'test.ts | plural': {
        message: '{n, plural, =1 {Type \'$ICU_0$\'} other {Type \'$ICU_0$\'}}',
        description: 'Plural',
        placeholders: {
          ICU_0: {content: '{PH1}', example: 'foo'},
        },
      },
    });
    const message = baked['test.ts | plural'].message;
    assert.strictEqual(message, '{n, plural, =1 {Type \'\'{PH1}\'\'} other {Type \'\'{PH1}\'\'}}');
    const mf = new IntlMessageFormat(message, 'en-GB', undefined, {ignoreTag: true});
    assert.strictEqual(mf.format({n: 1, PH1: 'foo'}), 'Type \'foo\'');
    assert.strictEqual(mf.format({n: 2, PH1: 'foo'}), 'Type \'foo\'');
  });

  it('fixes an unmatched odd opening single quote with existing double closing quotes', () => {
    const baked = bakePlaceholders({
      'test.ts | unmatched': {
        message: '\'$ICU_0$\'\'',
        description: 'Unmatched quote',
        placeholders: {
          ICU_0: {content: '{PH1}', example: 'foo'},
        },
      },
    });
    const message = baked['test.ts | unmatched'].message;
    assert.strictEqual(message, '\'\'{PH1}\'\'');
    const mf = new IntlMessageFormat(message, 'kn', undefined, {ignoreTag: true});
    assert.strictEqual(mf.format({PH1: 'foo'}), '\'foo\'');
  });

  it('does not double quotes around non-ICU placeholder content', () => {
    const baked = bakePlaceholders({
      'test.ts | locked': {
        message: 'Type \'$ICU_0$\'',
        description: 'Locked term',
        placeholders: {
          ICU_0: {content: 'allow pasting'},
        },
      },
    });
    assert.strictEqual(baked['test.ts | locked'].message, 'Type \'allow pasting\'');
  });

  it('does not double quotes around MARKDOWN_SNIPPET placeholders starting with {', () => {
    const baked = bakePlaceholders({
      'test.ts | snippet': {
        message: 'Object \'$MARKDOWN_SNIPPET_0$\'',
        description: 'Markdown snippet',
        placeholders: {
          MARKDOWN_SNIPPET_0: {content: '{a: 1}', example: '{a: 1}'},
        },
      },
    });
    assert.strictEqual(baked['test.ts | snippet'].message, 'Object \'{a: 1}\'');
  });

  it('handles multiple and adjacent single-quoted ICU placeholders', () => {
    const baked = bakePlaceholders({
      'test.ts | multipleQuoted': {
        message: 'Replace \'$ICU_0$\' with \'$ICU_1$\'',
        description: 'Two quoted placeholders',
        placeholders: {
          ICU_0: {content: '{PH1}', example: 'A'},
          ICU_1: {content: '{PH2}', example: 'B'},
        },
      },
      'test.ts | adjacentNoMiddleQuote': {
        message: '\'$ICU_0$$ICU_1$\'',
        description: 'Adjacent placeholders directly inside single quotes',
        placeholders: {
          ICU_0: {content: '{PH1}', example: 'A'},
          ICU_1: {content: '{PH2}', example: 'B'},
        },
      },
      'test.ts | trailingQuoteBeforeBrace': {
        message: '{n, plural, =1 {Value $ICU_0$\'} other {Values}}',
        description: 'Trailing quote before closing ICU brace',
        placeholders: {
          ICU_0: {content: '{PH1}', example: 'A'},
        },
      },
    });

    assert.strictEqual(baked['test.ts | multipleQuoted'].message, 'Replace \'\'{PH1}\'\' with \'\'{PH2}\'\'');
    assert.strictEqual(new IntlMessageFormat(baked['test.ts | multipleQuoted'].message, 'en-GB', undefined, {
                         ignoreTag: true,
                       }).format({PH1: 'A', PH2: 'B'}),
                       'Replace \'A\' with \'B\'');

    assert.strictEqual(baked['test.ts | adjacentNoMiddleQuote'].message, '\'\'{PH1}{PH2}\'\'');
    assert.strictEqual(new IntlMessageFormat(baked['test.ts | adjacentNoMiddleQuote'].message, 'en-GB', undefined, {
                         ignoreTag: true,
                       }).format({PH1: 'A', PH2: 'B'}),
                       '\'AB\'');

    assert.strictEqual(baked['test.ts | trailingQuoteBeforeBrace'].message,
                       '{n, plural, =1 {Value {PH1}\'\'} other {Values}}');
    assert.strictEqual(new IntlMessageFormat(baked['test.ts | trailingQuoteBeforeBrace'].message, 'en-GB', undefined, {
                         ignoreTag: true,
                       }).format({n: 1, PH1: 'A'}),
                       'Value A\'');
  });

  it('throws on placeholder names containing non-identifier characters', () => {
    assert.throws(() => {
      bakePlaceholders({
        'test.ts | invalidName': {
          message: 'Hello $ICU-0$',
          description: 'Invalid name',
          placeholders: {
            'ICU-0': {content: '{PH1}'},
          },
        },
      });
    }, /Invalid placeholder name "ICU-0"/);
  });

  it('has no unescaped single-quoted placeholders in checked-in locale files', function() {
    this.timeout(10_000);
    const violations = [];
    for (const filename of fs.readdirSync(LOCALES_DIR).sort()) {
      if (!filename.endsWith('.json')) {
        continue;
      }
      const entries = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, filename), 'utf8'));
      for (const [key, entry] of Object.entries(entries)) {
        if (!entry.message.includes('\'') || !entry.message.includes('{')) {
          continue;
        }
        let ast;
        try {
          ast = IntlMessageFormat.__parse(entry.message, {ignoreTag: true});
        } catch (err) {
          if (KNOWN_UNPARSEABLE_KEYS.has(key)) {
            continue;
          }
          throw new Error(`Unexpected IntlMessageFormat parse error in ${filename} | ${key}: ${err}`);
        }
        const literalPlaceholders = findPlaceholdersInLiterals(ast);
        if (literalPlaceholders.length > 0) {
          violations.push(`${filename} | ${key}: ${entry.message}`);
        }
      }
    }
    assert.deepEqual(violations, []);
  });
});
