// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.


import * as i18n from '../i18n/i18n.js';
export const UIStrings = {
  /**
  *@description Text in Network Priorities of the Performance panel
  */
  lowest: 'Lowest',
  /**
  *@description Text in Network Priorities of the Performance panel
  */
  low: 'Low',
  /**
  *@description Text in Network Priorities of the Performance panel
  */
  medium: 'Medium',
  /**
  *@description Text in Network Priorities of the Performance panel
  */
  high: 'High',
  /**
  *@description Text in Network Priorities of the Performance panel
  */
  highest: 'Highest',
};
const str_ = i18n.i18n.registerUIStrings('perf_ui/NetworkPriorities.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
/**
 * @param {!Protocol.Network.ResourcePriority} priority
 * @return {string}
 */
export function uiLabelForNetworkPriority(priority) {
  return priorityUILabelMap().get(priority) || '';
}

/** @type {!Map<string, !Protocol.Network.ResourcePriority>} */
const uiLabelToPriorityMapInstance = new Map();

/**
 * @param {string} priorityLabel
 * @return {string}
 */
export function uiLabelToNetworkPriority(priorityLabel) {
  if (uiLabelToPriorityMapInstance.size === 0) {
    priorityUILabelMap().forEach((value, key) => uiLabelToPriorityMapInstance.set(value, key));
  }
  return uiLabelToPriorityMapInstance.get(priorityLabel) || '';
}

/** @type {!Map<!Protocol.Network.ResourcePriority, string>} */
let _priorityUILabelMapInstance;

/**
 * @return {!Map<!Protocol.Network.ResourcePriority, string>}
 */
export function priorityUILabelMap() {
  if (_priorityUILabelMapInstance) {
    return _priorityUILabelMapInstance;
  }

  /** @type {!Map<!Protocol.Network.ResourcePriority, string>} */
  const map = new Map();
  map.set(Protocol.Network.ResourcePriority.VeryLow, i18nString(UIStrings.lowest));
  map.set(Protocol.Network.ResourcePriority.Low, i18nString(UIStrings.low));
  map.set(Protocol.Network.ResourcePriority.Medium, i18nString(UIStrings.medium));
  map.set(Protocol.Network.ResourcePriority.High, i18nString(UIStrings.high));
  map.set(Protocol.Network.ResourcePriority.VeryHigh, i18nString(UIStrings.highest));
  _priorityUILabelMapInstance = map;
  return map;
}

/** @type {!Map<!Protocol.Network.ResourcePriority, number>} */
const networkPriorityWeights = new Map();

/**
 * @param {!Protocol.Network.ResourcePriority} priority
 * @return {number}
 */
export function networkPriorityWeight(priority) {
  if (networkPriorityWeights.size === 0) {
    networkPriorityWeights.set(Protocol.Network.ResourcePriority.VeryLow, 1);
    networkPriorityWeights.set(Protocol.Network.ResourcePriority.Low, 2);
    networkPriorityWeights.set(Protocol.Network.ResourcePriority.Medium, 3);
    networkPriorityWeights.set(Protocol.Network.ResourcePriority.High, 4);
    networkPriorityWeights.set(Protocol.Network.ResourcePriority.VeryHigh, 5);
  }
  return networkPriorityWeights.get(priority) || 0;
}
