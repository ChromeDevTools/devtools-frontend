// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

const fs = require('fs');

const FILE = 'front_end/ui/visual_logging/KnownContextValues.ts';

module.exports = {
  meta: {
    type: 'problem',

    docs: {
      description: 'Puts jslog context values into KnownContextValues.ts file',
      category: 'Possible Errors',
    },
    fixable: 'code',
    schema: []  // no options
  },
  create: function(context) {
    const formattedValues = new Set(fs.readFileSync(FILE, 'utf-8')
        .split('\n')
        .filter(l=>l.startsWith('  \'')));
    const checkValue = (value, node) => {
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
      if (process.env.ESLINT_FAIL_ON_UNKNOWN_JSLOG_CONTEXT_VALUE) {
        context.report({node, message: `Found jslog context value '${value}' that is not listed in ${FILE}`});
      }
    };

    const checkPropertyValue = (propertyName, node) => {
      for (const property of node?.properties || []) {
        if (property.key?.name === propertyName) {
          checkValue(property.value?.value, node);
        }
      }
    };
    return {
      CallExpression(node) {
        if (node.callee?.object?.name === 'VisualLogging') {
          checkValue(node.arguments[0]?.value, node);
        } else {
          const propertyName = node.callee?.property?.name;
          if (propertyName === 'registerActionExtension') {
            checkPropertyValue('actionId', node.arguments[0]);
          } else if (propertyName === 'registerViewExtension') {
            checkPropertyValue('id', node.arguments[0]);
          } else if (propertyName === 'registerSettingExtension') {
            checkPropertyValue('settingName', node.arguments[0]);
          } else if (propertyName === 'createSetting') {
            checkValue(node.arguments[0]?.value, node);
          }
        }

      },
      ObjectExpression(node) {
        checkPropertyValue('jslogContext', node);
      },
      'Program:exit'() {
        if (process.env.ESLINT_FAIL_ON_UNKNOWN_JSLOG_CONTEXT_VALUE) {
          return;
        }
        const finalContents = 'export const knownContextValues = new Set([\n'
            + [...formattedValues].sort().join('\n')
            + '\n]);';
        fs.writeFileSync(FILE, finalContents, 'utf-8');
      }
    };
  }
};
