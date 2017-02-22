// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

UI.ARIAUtils = {};

/**
 * @param {!Element} element
 */
UI.ARIAUtils.markAsGroup = function(element) {
  element.setAttribute('role', 'group');
};

/**
 * @param {!Element} element
 */
UI.ARIAUtils.markAsTab = function(element) {
  element.setAttribute('role', 'tab');
};

/**
 * @param {!Element} element
 */
UI.ARIAUtils.markAsTree = function(element) {
  element.setAttribute('role', 'tree');
};

/**
 * @param {!Element} element
 */
UI.ARIAUtils.markAsTreeitem = function(element) {
  element.setAttribute('role', 'treeitem');
};

/**
 * @param {!Element} element
 */
UI.ARIAUtils.markAsPresentation = function(element) {
  element.setAttribute('role', 'presentation');
};

/**
 * @param {!Element} element
 * @param {boolean} value
 */
UI.ARIAUtils.setExpanded = function(element, value) {
  element.setAttribute('aria-expanded', !!value);
};

/**
 * @param {!Element} element
 */
UI.ARIAUtils.unsetExpanded = function(element) {
  element.removeAttribute('aria-expanded');
};

/**
 * @param {!Element} element
 * @param {boolean} value
 */
UI.ARIAUtils.setSelected = function(element, value) {
  // aria-selected behaves differently for false and undefined.
  // Often times undefined values are unintentionally typed as booleans.
  // Use !! to make sure this is true or false.
  element.setAttribute('aria-selected', !!value);
};

/**
 * @param {!Element} element
 * @param {boolean} value
 */
UI.ARIAUtils.setPressed = function(element, value) {
  // aria-pressed behaves differently for false and undefined.
  // Often times undefined values are unintentionally typed as booleans.
  // Use !! to make sure this is true or false.
  element.setAttribute('aria-pressed', !!value);
};

/**
 * @param {!Element} element
 * @param {string} name
 */
UI.ARIAUtils.setAccessibleName = function(element, name) {
  element.setAttribute('aria-label', name);
};
