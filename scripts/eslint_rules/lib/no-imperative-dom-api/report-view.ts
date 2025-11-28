// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @file A library to identify and replace manually constructed UI.ReportView with <devtools-report>.
 */

import {isIdentifier, isIdentifierChain, type RuleCreator} from './ast.ts';
import {DomFragment} from './dom-fragment.ts';

export const reportView: RuleCreator = {
  create(context) {
    const sourceCode = context.sourceCode;
    return {
      methodCall(property, firstArg, secondArg, domFragment, call) {
        if (domFragment.tagName === 'devtools-report') {
          if (isIdentifier(property, 'setTitle')) {
            if (firstArg) {
              domFragment.bindings.push({
                key: 'data',
                value: `\${{title: ${sourceCode.getText(firstArg)}}}`,
              });
            }
            return true;
          }
          if (isIdentifier(property, 'setSubtitle')) {
            if (firstArg) {
              const subtitleFragment = domFragment.appendChild(call, sourceCode);
              subtitleFragment.tagName = 'div';
              subtitleFragment.classList.push('report-subtitle');
            }
            return true;
          }
          if (isIdentifier(property, 'appendSection')) {
            if (domFragment.children.length) {
              const dividerFragment = domFragment.appendChild(firstArg, sourceCode);
              dividerFragment.tagName = 'devtools-report-divider';
            }
            const headerFragment = domFragment.appendChild(call, sourceCode);
            headerFragment.tagName = 'devtools-report-section-header';
            if (firstArg) {
              headerFragment.textContent = firstArg;
            }
            if (secondArg && !isIdentifier(secondArg, 'undefined')) {
              headerFragment.classList.push(secondArg);
            }
            const jslogContext = call.arguments[2];
            if (jslogContext) {
              headerFragment.attributes.push({
                key: 'jslog',
                value: `\${VisualLogging.section(` + sourceCode.getText(jslogContext) + `)}`,
              });
            }
            return true;
          }
        } else if (domFragment.tagName === 'devtools-report-section-header') {
          if (isIdentifier(property, ['appendField', 'appendFlexedField'])) {
            const keyFragment = domFragment.appendSibling(firstArg, sourceCode);
            keyFragment.tagName = 'devtools-report-key';
            if (firstArg) {
              keyFragment.textContent = firstArg;
            }
            const valueFragment = domFragment.appendSibling(call, sourceCode);
            valueFragment.tagName = 'devtools-report-value';
            if (secondArg) {
              valueFragment.textContent = secondArg;
            }
            if (isIdentifier(property, 'appendFlexedField')) {
              valueFragment.classList.push('report-field-value-is-flexed');
            }
            return true;
          }
          if (isIdentifier(property, ['appendRow', 'appendSelectableRow'])) {
            const sectionFragment = domFragment.appendSibling(call, sourceCode);
            sectionFragment.tagName = 'devtools-report-section';
            if (isIdentifier(property, 'appendSelectableRow')) {
              sectionFragment.classList.push('report-row-selectable');
            }
            return true;
          }
          if (isIdentifier(property, 'setTitle')) {
            if (firstArg) {
              domFragment.textContent = firstArg;
            }
            return true;
          }
        }
        return false;
      },
      NewExpression(node) {
        if (isIdentifierChain(node.callee, ['UI', 'ReportView', 'ReportView'])) {
          const domFragment = DomFragment.getOrCreate(node, sourceCode);
          domFragment.tagName = 'devtools-report';
          const title = node.arguments[0];
          if (title && (title.type !== 'Literal' || title.value !== '')) {
            domFragment.bindings.push({
              key: 'data',
              value: `\${{title: ${sourceCode.getText(title)}}}`,
            });
          }
        }
      },
    };
  }
};
