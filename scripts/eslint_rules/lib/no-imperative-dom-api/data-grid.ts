// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @file A library to identify and templatize manually constructed DataGrid.
 */

import type {TSESTree} from '@typescript-eslint/utils';

import {isIdentifier, isIdentifierChain, isMemberExpression, type RuleCreator} from './ast.ts';
import {DomFragment} from './dom-fragment.ts';

type Identifier = TSESTree.Identifier;

export const dataGrid: RuleCreator = {
  create(context) {
    const sourceCode = context.sourceCode;
    return {
      methodCall(property, firstArg, _secondArg, domFragment) {
        if (domFragment.tagName !== 'devtools-data-grid') {
          return false;
        }
        if (isIdentifier(property, 'setRowContextMenuCallback')) {
          domFragment.eventListeners.push({
            key: 'contextmenu',
            value: firstArg,
          });
          return true;
        }
        if (isIdentifier(property, 'setStriped')) {
          domFragment.booleanAttributes.push({
            key: 'striped',
            value: firstArg,
          });
          return true;
        }
        if (isIdentifier(property, 'renderInline')) {
          domFragment.booleanAttributes.push({
            key: 'inline',
            value: 'true',
          });
          return true;
        }
        return false;
      },
      getEvent(event) {
        switch (sourceCode.getText(event)) {
          case 'DataGrid.DataGrid.Events.SELECTED_NODE':
          case 'DataGrid.DataGrid.Events.DESELECTED_NODE':
            return 'select';
          case 'DataGrid.DataGrid.Events.SORTING_CHANGED':
            return 'sort';
          default:
            return null;
        }
      },
      NewExpression(node) {
        if (isIdentifierChain(node.callee, ['DataGrid', 'DataGrid', 'DataGridImpl']) ||
            isIdentifierChain(node.callee, ['DataGrid', 'ViewportDataGrid', 'ViewportDataGrid']) ||
            isIdentifierChain(node.callee, ['DataGrid', 'SortableDataGrid', 'SortableDataGrid'])) {
          const domFragment = DomFragment.getOrCreate(node, sourceCode);
          domFragment.tagName = 'devtools-data-grid';
          if (!node.arguments.length) {
            return;
          }
          const tableFragment = domFragment.appendChild(node.arguments[0], sourceCode);
          tableFragment.tagName = 'table';
          const params = tableFragment.initializer ?? node.arguments[0];
          if (params.type !== 'ObjectExpression') {
            return;
          }
          for (const property of params.properties) {
            if (property.type !== 'Property') {
              continue;
            }
            if (isIdentifier(property.key, 'displayName')) {
              domFragment.attributes.push({key: 'name', value: property.value});
            } else if (isIdentifier(property.key, 'columns')) {
              const columnsFragment = tableFragment.appendChild(property.value, sourceCode);
              columnsFragment.tagName = 'tr';
              const columns = columnsFragment.initializer ?? property.value;
              if (columns?.type !== 'ArrayExpression') {
                continue;
              }
              for (const column of columns.elements) {
                if (column?.type !== 'ObjectExpression') {
                  continue;
                }
                const columnFragment = columnsFragment.appendChild(column, sourceCode);
                columnFragment.tagName = 'th';
                for (const property of column.properties) {
                  if (property.type !== 'Property' || isIdentifier(property.value, 'undefined') ||
                      property.key.type !== 'Identifier') {
                    continue;
                  }

                  if (isIdentifier(property.key, ['id', 'weight', 'width'])) {
                    columnFragment.attributes.push({key: property.key.name, value: property.value});
                  } else if (isIdentifier(property.key, 'align')) {
                    const value = isMemberExpression(
                        property.value, n => isIdentifierChain(n, ['DataGrid', 'DataGrid', 'Align']),
                        n => n.type === 'Identifier');
                    columnFragment.attributes.push({
                      key: property.key.name,
                      value: value ? (value as Identifier).name.toLowerCase() : property.value
                    });
                  } else if (isIdentifier(property.key, ['sortable', 'editable'])) {
                    columnFragment.booleanAttributes.push({key: property.key.name, value: property.value});
                  } else if (isIdentifier(property.key, 'fixedWidth')) {
                    columnFragment.booleanAttributes.push({key: 'fixed', value: property.value});
                  } else if (isIdentifier(property.key, 'dataType')) {
                    const value = isMemberExpression(
                        property.value, n => isIdentifierChain(n, ['DataGrid', 'DataGrid', 'DataType']),
                        n => n.type === 'Identifier');
                    columnFragment.attributes.push({
                      key: property.key.name,
                      value: value ? (value as Identifier).name.toLowerCase() : property.value
                    });
                  } else if (isIdentifier(property.key, ['title', 'titleDOMFragment'])) {
                    columnFragment.textContent = property.value;
                  }
                }
              }
            } else if (isIdentifier(property.key, 'refreshCallback') && !isIdentifier(property.value, 'undefined')) {
              domFragment.eventListeners.push({
                key: 'refresh',
                value: property.value,
              });
            } else if (isIdentifier(property.key, 'deleteCallback') && !isIdentifier(property.value, 'undefined')) {
              domFragment.eventListeners.push({
                key: 'delete',
                value: property.value,
              });
            }
          }
        }
      },
      CallExpression(node) {
        if (node.callee.type !== 'MemberExpression' ||
            !isIdentifier(node.callee.property, ['createTD', 'createTDWithClass', 'createCell'])) {
          return;
        }
        const domFragment = DomFragment.getOrCreate(node, sourceCode);
        domFragment.tagName = 'td';
        if (isIdentifier(node.callee.property, 'createTDWithClass')) {
          domFragment.classList.push(node.arguments[0]);
        }
      },
    };
  }
};
