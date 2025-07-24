// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {TSESTree} from '@typescript-eslint/utils';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {createRule} from './utils/ruleCreator.ts';

type Node = TSESTree.Node;

// @ts-expect-error
const filename = fileURLToPath(import.meta.url);
const FILE = 'front_end/ui/visual_logging/KnownContextValues.ts';
const FRONT_END_PARENT_FOLDER = path.join(filename, '..', '..', '..', '..');
const ABSOLUTE_FILE_PATH = path.join(FRONT_END_PARENT_FOLDER, FILE);
const LICENSE_HEADER = `// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

`;
let formattedValues = new Set();

const statsCache = {
  mtimeMs: Infinity,
  size: Infinity,
};

function writeToFile() {
  const finalContents = LICENSE_HEADER + 'export const knownContextValues = new Set([\n' +
      [...formattedValues].sort().join('\n') + '\n]);\n';
  fs.writeFileSync(ABSOLUTE_FILE_PATH, finalContents, 'utf-8');
  const stats = fs.statSync(ABSOLUTE_FILE_PATH);
  statsCache.mtimeMs = stats.mtimeMs;
  statsCache.size = stats.size;
}

function updateLocalCacheIfNeeded() {
  const stats = fs.statSync(ABSOLUTE_FILE_PATH);
  let needsUpdate = false;

  if (stats.mtimeMs !== statsCache.mtimeMs) {
    statsCache.mtimeMs = stats.mtimeMs;
    needsUpdate = true;
  }

  if (stats.size !== statsCache.size) {
    statsCache.size = stats.size;
    needsUpdate = true;
  }

  if (needsUpdate) {
    formattedValues = new Set(
        fs.readFileSync(ABSOLUTE_FILE_PATH, 'utf-8').split('\n').filter(l => l.startsWith('  \'')),
    );
  }
}

export default createRule({
  name: 'jslog-context-list',
  meta: {
    type: 'problem',

    docs: {
      description: 'Puts jslog context values into KnownContextValues.ts file',
      category: 'Possible Errors',
    },
    messages: {
      unknownJslogContextValue: 'Found jslog context value \'{{ value }}\' that is not listed in ' + FILE,
    },
    fixable: 'code',
    schema: [],  // no options
  },
  defaultOptions: [],
  create: function(context) {
    let valuesAdded = false;
    const checkValue = (value: unknown, node: Node) => {
      if (typeof value !== 'string') {
        return;
      }
      if (!value.length) {
        return;
      }
      const formattedValue = '  ' + JSON.stringify(value).replaceAll('"', '\'') + ',';
      if (formattedValues.has(formattedValue)) {
        return;
      }
      formattedValues.add(formattedValue);
      valuesAdded = true;
      if (process.env.ESLINT_FAIL_ON_UNKNOWN_JSLOG_CONTEXT_VALUE) {
        context.report({
          node,
          messageId: 'unknownJslogContextValue',
          data: {value},
        });
      }
    };

    const checkPropertyValue = (propertyName: string, node: TSESTree.CallExpressionArgument) => {
      if (!('properties' in node)) {
        return;
      }

      for (const property of node.properties) {
        if (property.type === 'RestElement' || property.type === 'SpreadElement' || !('value' in property.value)) {
          continue;
        }

        if ('name' in property.key && property.key.name === propertyName) {
          checkValue(property.value?.value, node);
        } else if ('value' in property.key && property.key.value === propertyName) {
          checkValue(property.value?.value, node);
        }
      }
    };

    updateLocalCacheIfNeeded();
    return {
      CallExpression(node) {
        const firstArg = node.arguments[0];
        if (!firstArg) {
          return;
        }

        if (node.callee.type === 'MemberExpression' && node.callee.object.type === 'Identifier' &&
            node.callee.object.name === 'VisualLogging') {
          if (firstArg.type === 'Literal') {
            checkValue(firstArg.value, node);
          }
        } else if (node.callee.type === 'MemberExpression' && node.callee.property.type === 'Identifier') {
          const propertyName = node.callee.property.name;
          if (propertyName === 'registerActionExtension') {
            checkPropertyValue('actionId', firstArg);
          } else if (propertyName === 'registerViewExtension') {
            checkPropertyValue('id', firstArg);
          } else if (propertyName === 'registerSettingExtension') {
            checkPropertyValue('settingName', firstArg);
          } else if (propertyName === 'createSetting') {
            if (firstArg.type === 'Literal') {
              checkValue(firstArg.value, node);
            }
          }
        }
      },
      ObjectExpression(node) {
        checkPropertyValue('jslogContext', node);
      },
      VariableDeclarator(node) {
        if (node.id.type === 'Identifier' && node.id.name === 'generatedProperties' &&
            node.init?.type === 'ArrayExpression') {
          for (const element of node.init.elements) {
            if (element) {
              checkPropertyValue('name', element);
            }
          }
        }
        if (node.id.type === 'Identifier' && node.id.name === 'generatedAliasesFor' &&
            node.init?.type === 'NewExpression') {
          const firstArg = node.init?.arguments?.[0];
          const elements = firstArg.type === 'ArrayExpression' ? firstArg.elements : [];

          for (const outerElement of elements) {
            const innerElements = outerElement?.type === 'ArrayExpression' ? outerElement.elements : [];
            for (const innerElement of innerElements) {
              if (innerElement && 'value' in innerElement) {
                checkValue(innerElement.value, innerElement);
              }
            }
          }
        }
      },
      'Program:exit'() {
        // Don't write to file if fail is enabled
        if (process.env.ESLINT_FAIL_ON_UNKNOWN_JSLOG_CONTEXT_VALUE) {
          return;
        }

        if (
            // If a new value is added write the update to file
            valuesAdded ||
            // If we are lint the KnownContextValues.ts file
            // unconditionally write to it
            // that ensures that manually added values are sorted
            context.filename === ABSOLUTE_FILE_PATH) {
          writeToFile();
        }
      },
    };
  },
});
