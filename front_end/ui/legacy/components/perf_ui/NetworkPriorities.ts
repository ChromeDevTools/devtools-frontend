// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../../core/i18n/i18n.js';
import type * as Platform from '../../../../core/platform/platform.js';
import * as Protocol from '../../../../generated/protocol.js';

const UIStrings = {
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
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/perf_ui/NetworkPriorities.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export function uiLabelForNetworkPriority(priority: Protocol.Network.ResourcePriority): string {
  return priorityUILabelMap().get(priority) || '';
}

const uiLabelToPriorityMapInstance = new Map<string, Protocol.Network.ResourcePriority>();

export function uiLabelToNetworkPriority(priorityLabel: string): string {
  if (uiLabelToPriorityMapInstance.size === 0) {
    priorityUILabelMap().forEach((value, key) => uiLabelToPriorityMapInstance.set(value, key));
  }
  return uiLabelToPriorityMapInstance.get(priorityLabel) || '';
}

// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
// eslint-disable-next-line @typescript-eslint/naming-convention
let _priorityUILabelMapInstance: Map<Protocol.Network.ResourcePriority, string>;

export function priorityUILabelMap(): Map<Protocol.Network.ResourcePriority, string> {
  if (_priorityUILabelMapInstance) {
    return _priorityUILabelMapInstance;
  }

  const map = new Map<Protocol.Network.ResourcePriority, Platform.UIString.LocalizedString>();
  map.set(Protocol.Network.ResourcePriority.VeryLow, i18nString(UIStrings.lowest));
  map.set(Protocol.Network.ResourcePriority.Low, i18nString(UIStrings.low));
  map.set(Protocol.Network.ResourcePriority.Medium, i18nString(UIStrings.medium));
  map.set(Protocol.Network.ResourcePriority.High, i18nString(UIStrings.high));
  map.set(Protocol.Network.ResourcePriority.VeryHigh, i18nString(UIStrings.highest));
  _priorityUILabelMapInstance = map;
  return map;
}

const networkPriorityWeights = new Map<Protocol.Network.ResourcePriority, number>();

export function networkPriorityWeight(priority: Protocol.Network.ResourcePriority): number {
  if (networkPriorityWeights.size === 0) {
    networkPriorityWeights.set(Protocol.Network.ResourcePriority.VeryLow, 1);
    networkPriorityWeights.set(Protocol.Network.ResourcePriority.Low, 2);
    networkPriorityWeights.set(Protocol.Network.ResourcePriority.Medium, 3);
    networkPriorityWeights.set(Protocol.Network.ResourcePriority.High, 4);
    networkPriorityWeights.set(Protocol.Network.ResourcePriority.VeryHigh, 5);
  }
  return networkPriorityWeights.get(priority) || 0;
}
