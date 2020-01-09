// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @unrestricted
 */
export class CSSOverviewUnusedDeclarations {
  static _add(target, key, item) {
    const values = target.get(key) || [];
    values.push(item);
    target.set(key, values);
  }

  static checkForUnusedPositionValues(
      unusedDeclarations, nodeId, strings, positionIdx, topIdx, leftIdx, rightIdx, bottomIdx) {
    if (strings[positionIdx] !== 'static') {
      return;
    }

    if (strings[topIdx] !== 'auto') {
      const reason = ls`Top applied to a statically positioned element`;
      this._add(unusedDeclarations, reason, {
        declaration: `top: ${strings[topIdx]}`,
        nodeId,
      });
    }

    if (strings[leftIdx] !== 'auto') {
      const reason = ls`Left applied to a statically positioned element`;
      this._add(unusedDeclarations, reason, {
        declaration: `left: ${strings[leftIdx]}`,
        nodeId,
      });
    }

    if (strings[rightIdx] !== 'auto') {
      const reason = ls`Right applied to a statically positioned element`;
      this._add(unusedDeclarations, reason, {
        declaration: `right: ${strings[rightIdx]}`,
        nodeId,
      });
    }

    if (strings[bottomIdx] !== 'auto') {
      const reason = ls`Bottom applied to a statically positioned element`;
      this._add(unusedDeclarations, reason, {
        declaration: `bottom: ${strings[bottomIdx]}`,
        nodeId,
      });
    }
  }

  static checkForUnusedWidthAndHeightValues(unusedDeclarations, nodeId, strings, displayIdx, widthIdx, heightIdx) {
    if (strings[displayIdx] !== 'inline') {
      return;
    }

    if (strings[widthIdx] !== 'auto') {
      const reason = ls`Width applied to an inline element`;
      this._add(unusedDeclarations, reason, {
        declaration: `width: ${strings[widthIdx]}`,
        nodeId,
      });
    }

    if (strings[heightIdx] !== 'auto') {
      const reason = ls`Height applied to an inline element`;
      this._add(unusedDeclarations, reason, {
        declaration: `height: ${strings[heightIdx]}`,
        nodeId,
      });
    }
  }

  static checkForInvalidVerticalAlignment(unusedDeclarations, nodeId, strings, displayIdx, verticalAlignIdx) {
    if (strings[displayIdx] === 'inline' || strings[displayIdx].startsWith('table')) {
      return;
    }

    if (strings[verticalAlignIdx] !== 'baseline') {
      const reason = ls`Vertical alignment applied to element which is neither inline nor table-cell`;
      this._add(unusedDeclarations, reason, {
        declaration: `vertical-align: ${strings[verticalAlignIdx]}`,
        nodeId,
      });
    }
  }
}
