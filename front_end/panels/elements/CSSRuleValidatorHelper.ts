// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export const buildStyledRuleText = (property: String, value: String|undefined): string => {
  if (value === undefined) {
    return buildStyledPropertyText(property);
  }
  return '<code class="unbreakable-text"><span class="property">' + property + '</span>: ' + value + '</code>';
};

export const buildStyledPropertyText = (property: String): string => {
  return '<code class="unbreakable-text"><span class="property">' + property + '</span></code>';
};

export const isFlexContainer = (computedStyles: Map<String, String>|null): boolean => {
  if (computedStyles === null) {
    return false;
  }
  const display = computedStyles.get('display');
  return display === 'flex' || display === 'inline-flex';
};

export const isGridContainer = (computedStyles: Map<String, String>): boolean => {
  const display = computedStyles.get('display');
  return display === 'grid' || display === 'inline-grid';
};

export const isMulticolContainer = (computedStyles: Map<String, String>): boolean => {
  const columnWidth = computedStyles.get('column-width');
  const columnCount = computedStyles.get('column-count');

  return columnWidth !== 'auto' || columnCount !== 'auto';
};
