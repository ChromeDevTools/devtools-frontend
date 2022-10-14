// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export const buildPropertyDefinitionText = (property: string, value?: string): string => {
  if (value === undefined) {
    return buildPropertyName(property);
  }
  return '<code class="unbreakable-text"><span class="property">' + property + '</span>: ' + value + '</code>';
};

export const buildPropertyName = (property: string): string => {
  return '<code class="unbreakable-text"><span class="property">' + property + '</span></code>';
};

export const buildPropertyValue = (property: string): string => {
  return '<code class="unbreakable-text">' + property + '</code>';
};

export const isFlexContainer = (computedStyles?: Map<string, string>): boolean => {
  if (!computedStyles) {
    return false;
  }
  const display = computedStyles.get('display');
  return display === 'flex' || display === 'inline-flex';
};

export const isInlineElement = (computedStyles?: Map<string, string>): boolean => {
  if (!computedStyles) {
    return false;
  }
  return computedStyles.get('display') === 'inline';
};

// See https://html.spec.whatwg.org/multipage/rendering.html#replaced-elements
const possiblyReplacedElements = new Set([
  'audio',
  'canvas',
  'embed',
  'iframe',
  'img',
  'input',
  'object',
  'video',
]);

export const isPossiblyReplacedElement = (nodeName?: string): boolean => {
  if (!nodeName) {
    return false;
  }
  return possiblyReplacedElements.has(nodeName);
};

export const isGridContainer = (computedStyles?: Map<string, string>): boolean => {
  if (!computedStyles) {
    return false;
  }
  const display = computedStyles.get('display');
  return display === 'grid' || display === 'inline-grid';
};

export const isMulticolContainer = (computedStyles?: Map<string, string>): boolean => {
  if (!computedStyles) {
    return false;
  }
  const columnWidth = computedStyles.get('column-width');
  const columnCount = computedStyles.get('column-count');

  return columnWidth !== 'auto' || columnCount !== 'auto';
};
