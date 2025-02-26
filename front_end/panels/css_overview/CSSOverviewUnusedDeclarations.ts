// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as Protocol from '../../generated/protocol.js';

const UIStrings = {
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
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/css_overview/CSSOverviewUnusedDeclarations.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export interface UnusedDeclaration {
  declaration: string;
  nodeId: Protocol.DOM.BackendNodeId;
}

export class CSSOverviewUnusedDeclarations {
  private static add(target: Map<string, UnusedDeclaration[]>, key: string, item: {
    declaration: string,
    nodeId: Protocol.DOM.BackendNodeId,
  }): void {
    const values = target.get(key) || [];
    values.push(item);
    target.set(key, values);
  }

  static checkForUnusedPositionValues(
      unusedDeclarations: Map<string, UnusedDeclaration[]>, nodeId: Protocol.DOM.BackendNodeId, strings: string[],
      positionIdx: number, topIdx: number, leftIdx: number, rightIdx: number, bottomIdx: number): void {
    if (strings[positionIdx] !== 'static') {
      return;
    }

    if (strings[topIdx] !== 'auto') {
      const reason = i18nString(UIStrings.topAppliedToAStatically);
      this.add(unusedDeclarations, reason, {
        declaration: `top: ${strings[topIdx]}`,
        nodeId,
      });
    }

    if (strings[leftIdx] !== 'auto') {
      const reason = i18nString(UIStrings.leftAppliedToAStatically);
      this.add(unusedDeclarations, reason, {
        declaration: `left: ${strings[leftIdx]}`,
        nodeId,
      });
    }

    if (strings[rightIdx] !== 'auto') {
      const reason = i18nString(UIStrings.rightAppliedToAStatically);
      this.add(unusedDeclarations, reason, {
        declaration: `right: ${strings[rightIdx]}`,
        nodeId,
      });
    }

    if (strings[bottomIdx] !== 'auto') {
      const reason = i18nString(UIStrings.bottomAppliedToAStatically);
      this.add(unusedDeclarations, reason, {
        declaration: `bottom: ${strings[bottomIdx]}`,
        nodeId,
      });
    }
  }

  static checkForUnusedWidthAndHeightValues(
      unusedDeclarations: Map<string, UnusedDeclaration[]>, nodeId: Protocol.DOM.BackendNodeId, strings: string[],
      displayIdx: number, widthIdx: number, heightIdx: number): void {
    if (strings[displayIdx] !== 'inline') {
      return;
    }

    if (strings[widthIdx] !== 'auto') {
      const reason = i18nString(UIStrings.widthAppliedToAnInlineElement);
      this.add(unusedDeclarations, reason, {
        declaration: `width: ${strings[widthIdx]}`,
        nodeId,
      });
    }

    if (strings[heightIdx] !== 'auto') {
      const reason = i18nString(UIStrings.heightAppliedToAnInlineElement);
      this.add(unusedDeclarations, reason, {
        declaration: `height: ${strings[heightIdx]}`,
        nodeId,
      });
    }
  }

  static checkForInvalidVerticalAlignment(
      unusedDeclarations: Map<string, UnusedDeclaration[]>, nodeId: Protocol.DOM.BackendNodeId, strings: string[],
      displayIdx: number, verticalAlignIdx: number): void {
    if (!strings[displayIdx] || strings[displayIdx].startsWith('inline') || strings[displayIdx].startsWith('table')) {
      return;
    }

    if (strings[verticalAlignIdx] !== 'baseline') {
      const reason = i18nString(UIStrings.verticalAlignmentAppliedTo);
      this.add(unusedDeclarations, reason, {
        declaration: `vertical-align: ${strings[verticalAlignIdx]}`,
        nodeId,
      });
    }
  }
}
