// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @file A library to identify and templatize UI.ARIAUtils calls.
 */

import type {TSESTree} from '@typescript-eslint/utils';

import {isIdentifier, isIdentifierChain, isMemberExpression, type RuleCreator} from './ast.ts';

type Identifier = TSESTree.Identifier;

export const ariaUtils: RuleCreator = {
  create() {
    return {
      functionCall(call, _firstArg, secondArg, domFragment) {
        const func = isMemberExpression(
            call.callee, n => isIdentifierChain(n, ['UI', 'ARIAUtils']), n => n.type === 'Identifier');
        if (!func) {
          return false;
        }
        if (isIdentifier(func, [
              'markAsAlert',      'markAsApplication',   'markAsButton',       'markAsCheckbox',
              'markAsCombobox',   'markAsComplementary', 'markAsGroup',        'markAsHeading',
              'markAsLink',       'markAsList',          'markAsListBox',      'markAsListItem',
              'markAsMain',       'markAsMenu',          'markAsMenuItem',     'markAsMenuItemCheckBox',
              'markAsNavigation', 'markAsOption',        'markAsPresentation', 'markAsProgressBar',
              'markAsRadioGroup', 'markAsSlider',        'markAsStatus',       'markAsTab',
              'markAsTablist',    'markAsTabpanel',      'markAsTextbox',      'markAsTree',
              'markAsTreeitem',
            ])) {
          domFragment.attributes.push({
            key: 'role',
            value: (func as Identifier).name.substr('markAs'.length).toLowerCase(),
          });
          if (isIdentifier(func, 'markAsAlert')) {
            domFragment.attributes.push({
              key: 'aria-live',
              value: 'polite',
            });
          } else if (isIdentifier(func, ['markAsProgressBar', 'markAsSlider'])) {
            domFragment.attributes.push({key: 'aria-valuemin', value: call.arguments[1] ?? '0'});
            domFragment.attributes.push({key: 'aria-valuemax', value: call.arguments[2] ?? '100'});
          } else if (isIdentifier(func, 'markAsHeading')) {
            domFragment.attributes.push({key: 'aria-level', value: secondArg});
          }
        } else if (isIdentifier(func, 'markAsModalDialog')) {
          domFragment.attributes.push({key: 'role', value: 'dialog'});
          domFragment.attributes.push({key: 'aria-modal', value: 'true'});
        } else if (isIdentifier(func, 'markAsMenuButton')) {
          domFragment.attributes.push({key: 'role', value: 'button'});
          domFragment.attributes.push({key: 'aria-haspopup', value: 'true'});
        } else if (isIdentifier(func, 'markAsMenuItemSubMenu')) {
          domFragment.attributes.push({key: 'role', value: 'menuitem'});
          domFragment.attributes.push({key: 'aria-haspopup', value: 'true'});
        } else if (isIdentifier(func, 'markAsPoliteLiveRegion')) {
          domFragment.attributes.push({key: 'aria-live', value: 'polite'});
          domFragment.attributes.push({key: 'aria-atomic', value: secondArg});
        } else if (isIdentifier(func, [
                     'setAutocomplete', 'setChecked', 'setDescription', 'setDisabled', 'setExpanded', 'setHasPopup',
                     'setHidden', 'setInvalid', 'setLabel', 'setLevel', 'setPlaceholder', 'setPressed', 'setSelected',
                     'setSetSize', 'setValueNow', 'setValueText'
                   ])) {
          domFragment.attributes.push({
            key: `aria-${(func as Identifier).name.substr('set'.length).toLowerCase()}`,
            value: secondArg,
          });
        } else if (isIdentifier(func, 'setPositionInSet')) {
          domFragment.attributes.push({
            key: 'aria-posinset',
            value: secondArg,
          });
        } else if (isIdentifier(func, 'setCheckboxAsIndeterminate')) {
          domFragment.attributes.push({
            key: 'aria-checked',
            value: 'mixed',
          });
        } else if (isIdentifier(func, 'setProgressBarValue')) {
          domFragment.attributes.push({key: 'aria-valuenow', value: secondArg});
          const valueText = call.arguments[2];
          if (valueText) {
            domFragment.attributes.push({
              key: 'aria-valuetext',
              value: valueText,
            });
          }
        } else if (isIdentifier(func, ['setAriaValueNow', 'setAriaValueText'])) {
          domFragment.attributes.push({
            key: `aria-${(func as Identifier).name.substr('setAria'.length).toLowerCase()}`,
            value: secondArg,
          });
        } else if (isIdentifier(func, 'setAriaValueMinMax')) {
          domFragment.attributes.push({
            key: 'aria-valuemin',
            value: call.arguments[1],
          });
          domFragment.attributes.push({
            key: 'aria-valuemax',
            value: call.arguments[2],
          });
        } else {
          return false;
        }
        return true;
      },
    };
  }
};
