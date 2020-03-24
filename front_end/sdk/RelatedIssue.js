// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars

const connectedIssueSymbol = Symbol('issue');

export const IssueCategory = {
  CrossOriginEmbedderPolicy: Symbol('CrossOriginEmbedderPolicy'),
  SameSiteCookie: Symbol('SameSiteCookie'),
  Other: Symbol('Other')
};

/**
 * @param {*} obj
 * @param {symbol} category
 * @param {*} issue
 */
export function connect(obj, category, issue) {
  if (!obj) {
    return;
  }
  if (!obj[connectedIssueSymbol]) {
    obj[connectedIssueSymbol] = new Map();
  }
  const map = obj[connectedIssueSymbol];
  if (!map.has(category)) {
    map.set(category, new Set());
  }
  const set = map.get(category);
  set.add(issue);
}

/**
 * @param {*} obj
 * @param {symbol} category
 * @param {*} issue
 */
export function disconnect(obj, category, issue) {
  if (!obj || !obj[connectedIssueSymbol]) {
    return;
  }
  const map = obj[connectedIssueSymbol];
  if (!map.has(category)) {
    return;
  }
  const set = map.get(category);
  set.delete(issue);
}

/**
 * @param {*} obj
 * @return {boolean}
 */
export function hasIssues(obj) {
  if (!obj || !obj[connectedIssueSymbol]) {
    return false;
  }
  const map = obj[connectedIssueSymbol];
  if (map.size === 0) {
    return false;
  }
  for (const set of map.values()) {
    if (set.size > 0) {
      return true;
    }
  }
  return false;
}

/**
 * @param {*} obj
 * @param {symbol} category
 * @return {boolean}
 */
export function hasIssueOfCategory(obj, category) {
  if (!obj || !obj[connectedIssueSymbol]) {
    return false;
  }
  const map = obj[connectedIssueSymbol];
  if (!map.has(category)) {
    return false;
  }
  const set = map.get(category);
  return set.size > 0;
}

/**
 * @param {*} obj
 * @param {symbol} category
 * @return {!Promise<undefined>}
 */
export async function reveal(obj, category) {
  if (!obj || !obj[connectedIssueSymbol]) {
    return;
  }
  const map = obj[connectedIssueSymbol];
  if (!map.has(category)) {
    return;
  }
  const set = map.get(category);
  if (set.size === 0) {
    return;
  }
  return Common.Revealer.reveal(set.values().next().value);
}
