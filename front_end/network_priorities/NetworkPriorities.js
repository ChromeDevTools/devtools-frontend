// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @param {!Protocol.Network.ResourcePriority} priority
 * @return {string}
 */
NetworkPriorities.uiLabelForPriority = function(priority) {
  var map = NetworkPriorities.priorityUiLabelMap();
  return map.get(priority) || '';
};

/**
 * @param {string} priorityLabel
 * @return {string}
 */
NetworkPriorities.uiLabelToPriority = function(priorityLabel) {
  /** @type {!Map<string, !Protocol.Network.ResourcePriority>} */
  var labelToPriorityMap = NetworkPriorities.uiLabelToPriority._uiLabelToPriorityMap;

  if (labelToPriorityMap)
    return labelToPriorityMap.get(priorityLabel);

  labelToPriorityMap = new Map();
  NetworkPriorities.priorityUiLabelMap().forEach((value, key) => labelToPriorityMap.set(value, key));
  NetworkPriorities.uiLabelToPriority._uiLabelToPriorityMap = labelToPriorityMap;
  return labelToPriorityMap.get(priorityLabel) || '';
};

/**
 * @return {!Map<!Protocol.Network.ResourcePriority, string>}
 */
NetworkPriorities.priorityUiLabelMap = function() {
  /** @type {!Map<!Protocol.Network.ResourcePriority, string>} */
  var map = NetworkPriorities.priorityUiLabelMap._priorityUiLabelMap;

  if (map)
    return map;

  map = new Map();
  map.set(Protocol.Network.ResourcePriority.VeryLow, Common.UIString('Lowest'));
  map.set(Protocol.Network.ResourcePriority.Low, Common.UIString('Low'));
  map.set(Protocol.Network.ResourcePriority.Medium, Common.UIString('Medium'));
  map.set(Protocol.Network.ResourcePriority.High, Common.UIString('High'));
  map.set(Protocol.Network.ResourcePriority.VeryHigh, Common.UIString('Highest'));
  NetworkPriorities.priorityUiLabelMap._priorityUiLabelMap = map;

  return map;
};

/**
 * @return {!Map<!Protocol.Network.ResourcePriority, number>}
 */
NetworkPriorities.prioritySymbolToNumericMap = function() {
  /** @type {!Map<!Protocol.Network.ResourcePriority, number>} */
  var priorityMap = NetworkPriorities.prioritySymbolToNumericMap._symbolicToNumericPriorityMap;

  if (priorityMap)
    return priorityMap;

  priorityMap = new Map();
  priorityMap.set(Protocol.Network.ResourcePriority.VeryLow, 1);
  priorityMap.set(Protocol.Network.ResourcePriority.Low, 2);
  priorityMap.set(Protocol.Network.ResourcePriority.Medium, 3);
  priorityMap.set(Protocol.Network.ResourcePriority.High, 4);
  priorityMap.set(Protocol.Network.ResourcePriority.VeryHigh, 5);
  NetworkPriorities.prioritySymbolToNumericMap._symbolicToNumericPriorityMap = priorityMap;

  return priorityMap;
};
