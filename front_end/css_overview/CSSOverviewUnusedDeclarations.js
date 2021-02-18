// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../i18n/i18n.js';

export const UIStrings = {
  /**
  *@description Label to explain why top values are ignored
  */
  topAppliedToAStatically: '`Top` applied to a statically positioned element',
  /**
  *@description Label to explain why left (opposite to right) values are ignored.
  */
  leftAppliedToAStatically: '`Left` applied to a statically positioned element',
  /**
  *@description Label to explain why right values are ignored
  */
  rightAppliedToAStatically: '`Right` applied to a statically positioned element',
  /**
  *@description Label to explain why bottom values are ignored
  */
  bottomAppliedToAStatically: '`Bottom` applied to a statically positioned element',
  /**
  *@description Label to explain why width values are ignored
  */
  widthAppliedToAnInlineElement: '`Width` applied to an inline element',
  /**
  *@description Label to explain why height values are ignored
  */
  heightAppliedToAnInlineElement: '`Height` applied to an inline element',
  /**
  *@description Label to explain why vertical-align values are ignored
  */
  verticalAlignmentAppliedTo: 'Vertical alignment applied to element which is neither `inline` nor `table-cell`',
};
const str_ = i18n.i18n.registerUIStrings('css_overview/CSSOverviewUnusedDeclarations.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
/**
 * @typedef {{
 * declaration:string,
 * nodeId:number,
 * }}
 */
// @ts-ignore typedef
export let UnusedDeclaration;

export class CSSOverviewUnusedDeclarations {
  /**
   * @param {!Map<string,!Array<!UnusedDeclaration>>} target
   * @param {string} key
   * @param {{declaration: string, nodeId:number}} item
   */
  static _add(target, key, item) {
    const values = target.get(key) || [];
    values.push(item);
    target.set(key, values);
  }

  /**
   * @param {!Map<string, !Array<!UnusedDeclaration>>} unusedDeclarations
   * @param {number} nodeId
   * @param {!Array<string>} strings
   * @param {number} positionIdx
   * @param {number} topIdx
   * @param {number} leftIdx
   * @param {number} rightIdx
   * @param {number} bottomIdx
   */
  static checkForUnusedPositionValues(
      unusedDeclarations, nodeId, strings, positionIdx, topIdx, leftIdx, rightIdx, bottomIdx) {
    if (strings[positionIdx] !== 'static') {
      return;
    }

    if (strings[topIdx] !== 'auto') {
      const reason = i18nString(UIStrings.topAppliedToAStatically);
      this._add(unusedDeclarations, reason, {
        declaration: `top: ${strings[topIdx]}`,
        nodeId,
      });
    }

    if (strings[leftIdx] !== 'auto') {
      const reason = i18nString(UIStrings.leftAppliedToAStatically);
      this._add(unusedDeclarations, reason, {
        declaration: `left: ${strings[leftIdx]}`,
        nodeId,
      });
    }

    if (strings[rightIdx] !== 'auto') {
      const reason = i18nString(UIStrings.rightAppliedToAStatically);
      this._add(unusedDeclarations, reason, {
        declaration: `right: ${strings[rightIdx]}`,
        nodeId,
      });
    }

    if (strings[bottomIdx] !== 'auto') {
      const reason = i18nString(UIStrings.bottomAppliedToAStatically);
      this._add(unusedDeclarations, reason, {
        declaration: `bottom: ${strings[bottomIdx]}`,
        nodeId,
      });
    }
  }

  /**
   * @param {!Map<string, !Array<!UnusedDeclaration>>} unusedDeclarations
   * @param {number} nodeId
   * @param {!Array<string>} strings
   * @param {number} displayIdx
   * @param {number} widthIdx
   * @param {number} heightIdx
   */
  static checkForUnusedWidthAndHeightValues(unusedDeclarations, nodeId, strings, displayIdx, widthIdx, heightIdx) {
    if (strings[displayIdx] !== 'inline') {
      return;
    }

    if (strings[widthIdx] !== 'auto') {
      const reason = i18nString(UIStrings.widthAppliedToAnInlineElement);
      this._add(unusedDeclarations, reason, {
        declaration: `width: ${strings[widthIdx]}`,
        nodeId,
      });
    }

    if (strings[heightIdx] !== 'auto') {
      const reason = i18nString(UIStrings.heightAppliedToAnInlineElement);
      this._add(unusedDeclarations, reason, {
        declaration: `height: ${strings[heightIdx]}`,
        nodeId,
      });
    }
  }

  /**
   * @param {!Map<string, !Array<!UnusedDeclaration>>} unusedDeclarations
   * @param {number} nodeId
   * @param {!Array<string>} strings
   * @param {number} displayIdx
   * @param {number} verticalAlignIdx
   */
  static checkForInvalidVerticalAlignment(unusedDeclarations, nodeId, strings, displayIdx, verticalAlignIdx) {
    if (!strings[displayIdx] || strings[displayIdx] === 'inline' || strings[displayIdx].startsWith('table')) {
      return;
    }

    if (strings[verticalAlignIdx] !== 'baseline') {
      const reason = i18nString(UIStrings.verticalAlignmentAppliedTo);
      this._add(unusedDeclarations, reason, {
        declaration: `vertical-align: ${strings[verticalAlignIdx]}`,
        nodeId,
      });
    }
  }
}
