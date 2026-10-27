// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import type * as SDK from '../../core/sdk/sdk.js';
import type * as ChangeTracker from '../change_tracker/change_tracker.js';

import {buildAnchor, trimValue} from './ChangeTrackingUtils.js';

const STYLES_PANE_VE_PATH = 'Panel: elements > Pane: styles';

function formatRuleSuffix(preposition: 'in'|'to'|'from', ruleHeader?: string): string {
  const trimmedRule = ruleHeader ? Platform.StringUtilities.collapseWhitespace(ruleHeader.trim()) : '';
  return trimmedRule ? ` ${preposition} rule "${trimValue(trimmedRule)}"` : '';
}

export interface StylePropertyEdit {
  /** Rule header or selector containing the property (e.g. 'element.style' or '.btn:hover'). */
  ruleHeader?: string;
  /** Property name before the edit, or an empty string when a new property is added. */
  oldName: string;
  /** Property value before the edit (including '!important' if present). */
  oldValue: string;
  /** Committed property name, or an empty string when the property is removed. */
  newName: string;
  /** Committed property value (including '!important' if present). */
  newValue: string;
}

export interface StylePropertyToggle {
  /** Rule header or selector containing the property (e.g. 'element.style' or '.btn:hover'). */
  ruleHeader?: string;
  name: string;
  value: string;
  /** Whether the property is now disabled. */
  disabled: boolean;
}

/**
 * These strings are for consumption by AI agents and do not need to be translated.
 */
function describeStylePropertyEdit({ruleHeader, oldName, oldValue, newName, newValue}: StylePropertyEdit): string {
  if (!newName) {
    return `Removed style property "${trimValue(oldName)}: ${trimValue(oldValue)}"${
        formatRuleSuffix('from', ruleHeader)}`;
  }

  if (!oldName) {
    return `Added style property "${trimValue(newName)}: ${trimValue(newValue)}"${formatRuleSuffix('to', ruleHeader)}`;
  }

  if (oldName !== newName) {
    return `Changed style property from "${trimValue(oldName)}: ${trimValue(oldValue)}" to "${trimValue(newName)}: ${
        trimValue(newValue)}"${formatRuleSuffix('in', ruleHeader)}`;
  }

  return `Changed style property "${trimValue(newName)}" from "${trimValue(oldValue)}" to "${trimValue(newValue)}"${
      formatRuleSuffix('in', ruleHeader)}`;
}

function describeStylePropertyToggle({ruleHeader, name, value, disabled}: StylePropertyToggle): string {
  const action = disabled ? 'Disabled' : 'Enabled';
  return `${action} style property "${trimValue(name)}: ${trimValue(value)}"${formatRuleSuffix('in', ruleHeader)}`;
}

export function trackStylePropertyEdit(
    tracker: ChangeTracker.ChangeTracker.ChangeTracker|undefined,
    node: SDK.DOMModel.DOMNode,
    edit: StylePropertyEdit,
    ): void {
  if (!tracker?.isTracking) {
    return;
  }
  const oldName = edit.oldName.trim();
  const oldValue = edit.oldValue.trim();
  const newName = edit.newName.trim();
  const newValue = edit.newValue.trim();
  if (oldName === newName && oldValue === newValue) {
    return;
  }
  tracker.trackChange(
      describeStylePropertyEdit({ruleHeader: edit.ruleHeader, oldName, oldValue, newName, newValue}),
      buildAnchor(STYLES_PANE_VE_PATH, node),
  );
}

export function trackStylePropertyToggle(
    tracker: ChangeTracker.ChangeTracker.ChangeTracker|undefined,
    node: SDK.DOMModel.DOMNode,
    toggle: StylePropertyToggle,
    ): void {
  if (!tracker?.isTracking) {
    return;
  }
  tracker.trackChange(describeStylePropertyToggle(toggle), buildAnchor(STYLES_PANE_VE_PATH, node));
}

export function trackStyleRuleAdded(
    tracker: ChangeTracker.ChangeTracker.ChangeTracker|undefined,
    node: SDK.DOMModel.DOMNode,
    selector: string,
    ): void {
  if (!tracker?.isTracking) {
    return;
  }
  const trimmedSelector = Platform.StringUtilities.collapseWhitespace(selector.trim());
  if (!trimmedSelector) {
    return;
  }
  tracker.trackChange(
      `Added style rule "${trimValue(trimmedSelector)}"`,
      buildAnchor(STYLES_PANE_VE_PATH, node),
  );
}

function trackRuleHeaderChange(
    tracker: ChangeTracker.ChangeTracker.ChangeTracker|undefined,
    node: SDK.DOMModel.DOMNode,
    headerDescription: string,
    oldText: string,
    newText: string,
    ): void {
  if (!tracker?.isTracking) {
    return;
  }
  const trimmedOld = Platform.StringUtilities.collapseWhitespace(oldText.trim());
  const trimmedNew = Platform.StringUtilities.collapseWhitespace(newText.trim());
  if (!trimmedOld || !trimmedNew || trimmedOld === trimmedNew) {
    return;
  }
  tracker.trackChange(
      `Changed ${headerDescription} from "${trimValue(trimmedOld)}" to "${trimValue(trimmedNew)}"`,
      buildAnchor(STYLES_PANE_VE_PATH, node),
  );
}

export function trackStyleSelectorChange(
    tracker: ChangeTracker.ChangeTracker.ChangeTracker|undefined,
    node: SDK.DOMModel.DOMNode,
    oldSelector: string,
    newSelector: string,
    ): void {
  trackRuleHeaderChange(tracker, node, 'style rule selector', oldSelector, newSelector);
}

export function trackPropertyRuleNameChange(
    tracker: ChangeTracker.ChangeTracker.ChangeTracker|undefined,
    node: SDK.DOMModel.DOMNode,
    oldName: string,
    newName: string,
    ): void {
  trackRuleHeaderChange(tracker, node, '@property rule name', oldName, newName);
}

export function trackKeyframeKeyChange(
    tracker: ChangeTracker.ChangeTracker.ChangeTracker|undefined,
    node: SDK.DOMModel.DOMNode,
    oldKey: string,
    newKey: string,
    ): void {
  trackRuleHeaderChange(tracker, node, 'keyframe key', oldKey, newKey);
}

export type StyleQueryType = '@media'|'@container'|'@supports'|'@scope'|'@navigation';

function describeStyleQueryChange(queryType: StyleQueryType, oldQuery: string, newQuery: string): string {
  if (!newQuery) {
    return `Cleared ${queryType} query "${trimValue(oldQuery)}"`;
  }
  return `Changed ${queryType} query from "${trimValue(oldQuery)}" to "${trimValue(newQuery)}"`;
}

export function trackStyleQueryChange(
    tracker: ChangeTracker.ChangeTracker.ChangeTracker|undefined,
    node: SDK.DOMModel.DOMNode,
    queryType: StyleQueryType,
    oldQuery: string,
    newQuery: string,
    ): void {
  if (!tracker?.isTracking) {
    return;
  }
  const trimmedOld = Platform.StringUtilities.collapseWhitespace(oldQuery.trim());
  const trimmedNew = Platform.StringUtilities.collapseWhitespace(newQuery.trim());
  if (trimmedOld === trimmedNew) {
    return;
  }
  // Empty `trimmedOld` is unreachable as empty queries are not editable in the Styles pane.
  if (!trimmedOld) {
    return;
  }
  // Only `@media` and `@scope` allow empty query text in CSS.
  if (!trimmedNew && queryType !== '@media' && queryType !== '@scope') {
    return;
  }
  tracker.trackChange(
      describeStyleQueryChange(queryType, trimmedOld, trimmedNew),
      buildAnchor(STYLES_PANE_VE_PATH, node),
  );
}
