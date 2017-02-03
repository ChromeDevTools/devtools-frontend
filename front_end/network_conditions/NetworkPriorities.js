// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @param {!Protocol.Network.ResourcePriority} priority
 * @return {string}
 */
NetworkConditions.uiLabelForPriority = function(priority) {
  var map = NetworkConditions.priorityUiLabelMap();
  return map.get(priority) || '';
};

/**
 * @param {string} priorityLabel
 * @return {string}
 */
NetworkConditions.uiLabelToPriority = function(priorityLabel) {
  /** @type {!Map<string, !Protocol.Network.ResourcePriority>} */
  var labelToPriorityMap = NetworkConditions.uiLabelToPriority._uiLabelToPriorityMap;

  if (labelToPriorityMap)
    return labelToPriorityMap.get(priorityLabel);

  labelToPriorityMap = new Map();
  NetworkConditions.priorityUiLabelMap().forEach((value, key) => labelToPriorityMap.set(value, key));
  NetworkConditions.uiLabelToPriority._uiLabelToPriorityMap = labelToPriorityMap;
  return labelToPriorityMap.get(priorityLabel) || '';
};

/**
 * @return {!Map<!Protocol.Network.ResourcePriority, string>}
 */
NetworkConditions.priorityUiLabelMap = function() {
  /** @type {!Map<!Protocol.Network.ResourcePriority, string>} */
  var map = NetworkConditions.priorityUiLabelMap._priorityUiLabelMap;

  if (map)
    return map;

  map = new Map();
  map.set(Protocol.Network.ResourcePriority.VeryLow, Common.UIString('Lowest'));
  map.set(Protocol.Network.ResourcePriority.Low, Common.UIString('Low'));
  map.set(Protocol.Network.ResourcePriority.Medium, Common.UIString('Medium'));
  map.set(Protocol.Network.ResourcePriority.High, Common.UIString('High'));
  map.set(Protocol.Network.ResourcePriority.VeryHigh, Common.UIString('Highest'));
  NetworkConditions.priorityUiLabelMap._priorityUiLabelMap = map;

  return map;
};

/**
 * @return {!Map<!Protocol.Network.ResourcePriority, number>}
 */
NetworkConditions.prioritySymbolToNumericMap = function() {
  /** @type {!Map<!Protocol.Network.ResourcePriority, number>} */
  var priorityMap = NetworkConditions.prioritySymbolToNumericMap._symbolicToNumericPriorityMap;

  if (priorityMap)
    return priorityMap;

  priorityMap = new Map();
  priorityMap.set(Protocol.Network.ResourcePriority.VeryLow, 1);
  priorityMap.set(Protocol.Network.ResourcePriority.Low, 2);
  priorityMap.set(Protocol.Network.ResourcePriority.Medium, 3);
  priorityMap.set(Protocol.Network.ResourcePriority.High, 4);
  priorityMap.set(Protocol.Network.ResourcePriority.VeryHigh, 5);
  NetworkConditions.prioritySymbolToNumericMap._symbolicToNumericPriorityMap = priorityMap;

  return priorityMap;
};
