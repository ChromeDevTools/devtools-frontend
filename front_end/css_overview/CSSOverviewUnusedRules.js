// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @unrestricted
 */
CssOverview.CSSOverviewUnusedRules = class {
  static checkForUnusedPositionValues(unusedRules, nodeId, strings, positionIdx, topIdx, leftIdx, rightIdx, bottomIdx) {
    if (strings[positionIdx] !== 'static') {
      return;
    }

    if (strings[topIdx] !== 'auto') {
      unusedRules.push({
        reason: ls`Top applied to a statically positioned element`,
        rule: `top: ${strings[topIdx]}`,
        nodeId,
      });
    }

    if (strings[leftIdx] !== 'auto') {
      unusedRules.push({
        reason: ls`Left applied to a statically positioned element`,
        rule: `left: ${strings[leftIdx]}`,
        nodeId,
      });
    }

    if (strings[rightIdx] !== 'auto') {
      unusedRules.push({
        reason: ls`Right applied to a statically positioned element`,
        rule: `right: ${strings[rightIdx]}`,
        nodeId,
      });
    }

    if (strings[bottomIdx] !== 'auto') {
      unusedRules.push({
        reason: ls`Bottom applied to a statically positioned element`,
        rule: `bottom: ${strings[bottomIdx]}`,
        nodeId,
      });
    }
  }

  static checkForUnusedWidthAndHeightValues(unusedRules, nodeId, strings, displayIdx, widthIdx, heightIdx) {
    if (strings[displayIdx] !== 'inline') {
      return;
    }

    if (strings[widthIdx] !== 'auto') {
      unusedRules.push({
        reason: ls`Width applied to an inline element`,
        rule: `width: ${strings[widthIdx]}`,
        nodeId,
      });
    }

    if (strings[heightIdx] !== 'auto') {
      unusedRules.push({
        reason: ls`Height applied to an inline element`,
        rule: `height: ${strings[heightIdx]}`,
        nodeId,
      });
    }
  }

  static checkForInvalidVerticalAlignment(unusedRules, nodeId, strings, displayIdx, verticalAlignIdx) {
    if (strings[displayIdx] === 'inline' || strings[displayIdx].startsWith('table')) {
      return;
    }

    if (strings[verticalAlignIdx] !== 'baseline') {
      unusedRules.push({
        reason: ls`Vertical alignment applied to element which is neither inline nor table-cell`,
        rule: `vertical-align: ${strings[verticalAlignIdx]}`,
        nodeId,
      });
    }
  }
};
