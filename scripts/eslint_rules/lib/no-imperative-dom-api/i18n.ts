// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @file A library to identify and templatize i18n-related calls.
 */

import {isIdentifierChain, type RuleCreator} from './ast.ts';
import {DomFragment} from './dom-fragment.ts';

export const i18n: RuleCreator = {
  create(context) {
    const sourceCode = context.sourceCode;

    return {
      CallExpression(node) {
        if (isIdentifierChain(node.callee, ['uiI18n', 'getFormatLocalizedString'])) {
          const params = node.arguments[2]?.type === 'ObjectExpression' ? node.arguments[2] : null;
          if (!params) {
            return;
          }
          const domFragment = DomFragment.getOrCreate(node, sourceCode);
          domFragment.expression = (indent: number) => {
            const paramsString = ['{\n'];
            for (const property of params.properties) {
              if (property.type !== 'Property') {
                continue;
              }
              paramsString.push(`${' '.repeat(indent + 2)}`);
              paramsString.push(sourceCode.getText(property.key), ': ');
              const paramFragment = DomFragment.getOrCreate(property.value, sourceCode);
              if (paramFragment.tagName) {
                paramsString.push('html`');
                paramsString.push(...paramFragment.toTemplateLiteral(sourceCode, indent + 2));
                paramsString.push('`');
              } else {
                paramsString.push(sourceCode.getText(property.value));
              }
              paramsString.push(',\n');
            }
            paramsString.push(`${' '.repeat(indent)}}`);
            return `i18nTemplate(${sourceCode.getText(node.arguments[0])}, ${sourceCode.getText(node.arguments[1])}, ${
                paramsString.join('')})`;
          };
        }
      }
    };
  }
};
