// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../../../core/i18n/i18n.js';
const UIStrings = {
    /**
     * @description Text in Network Priorities of the Performance panel
     */
    lowest: 'Lowest',
    /**
     * @description Text in Network Priorities of the Performance panel
     */
    low: 'Low',
    /**
     * @description Text in Network Priorities of the Performance panel
     */
    medium: 'Medium',
    /**
     * @description Text in Network Priorities of the Performance panel
     */
    high: 'High',
    /**
     * @description Text in Network Priorities of the Performance panel
     */
    highest: 'Highest',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/perf_ui/NetworkPriorities.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export function uiLabelForNetworkPriority(priority) {
    return priorityUILabelMap().get(priority) || '';
}
const uiLabelToPriorityMapInstance = new Map();
export function uiLabelToNetworkPriority(priorityLabel) {
    if (uiLabelToPriorityMapInstance.size === 0) {
        priorityUILabelMap().forEach((value, key) => uiLabelToPriorityMapInstance.set(value, key));
    }
    const priority = uiLabelToPriorityMapInstance.get(priorityLabel);
    if (priority) {
        return priority;
    }
    throw new Error('Priority not found');
}
const priorityUILabelMapInstance = new Map();
export function priorityUILabelMap() {
    if (priorityUILabelMapInstance.size === 0) {
        priorityUILabelMapInstance.set("VeryLow" /* Protocol.Network.ResourcePriority.VeryLow */, i18nString(UIStrings.lowest));
        priorityUILabelMapInstance.set("Low" /* Protocol.Network.ResourcePriority.Low */, i18nString(UIStrings.low));
        priorityUILabelMapInstance.set("Medium" /* Protocol.Network.ResourcePriority.Medium */, i18nString(UIStrings.medium));
        priorityUILabelMapInstance.set("High" /* Protocol.Network.ResourcePriority.High */, i18nString(UIStrings.high));
        priorityUILabelMapInstance.set("VeryHigh" /* Protocol.Network.ResourcePriority.VeryHigh */, i18nString(UIStrings.highest));
    }
    return priorityUILabelMapInstance;
}
const networkPriorityWeights = new Map();
export function networkPriorityWeight(priority) {
    if (networkPriorityWeights.size === 0) {
        networkPriorityWeights.set("VeryLow" /* Protocol.Network.ResourcePriority.VeryLow */, 1);
        networkPriorityWeights.set("Low" /* Protocol.Network.ResourcePriority.Low */, 2);
        networkPriorityWeights.set("Medium" /* Protocol.Network.ResourcePriority.Medium */, 3);
        networkPriorityWeights.set("High" /* Protocol.Network.ResourcePriority.High */, 4);
        networkPriorityWeights.set("VeryHigh" /* Protocol.Network.ResourcePriority.VeryHigh */, 5);
    }
    return networkPriorityWeights.get(priority) || 0;
}
//# sourceMappingURL=NetworkPriorities.js.map