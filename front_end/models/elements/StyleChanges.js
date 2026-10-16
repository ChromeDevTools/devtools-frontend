// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Platform from '../../core/platform/platform.js';
import { buildAnchor, trimValue } from './ChangeTrackingUtils.js';
const STYLES_PANE_VE_PATH = 'Panel: elements > Pane: styles';
function formatRuleSuffix(preposition, ruleHeader) {
    const trimmedRule = ruleHeader ? Platform.StringUtilities.collapseWhitespace(ruleHeader.trim()) : '';
    return trimmedRule ? ` ${preposition} rule "${trimValue(trimmedRule)}"` : '';
}
/**
 * These strings are for consumption by AI agents and do not need to be translated.
 */
function describeStylePropertyEdit({ ruleHeader, oldName, oldValue, newName, newValue }) {
    if (!newName) {
        return `Removed style property "${trimValue(oldName)}: ${trimValue(oldValue)}"${formatRuleSuffix('from', ruleHeader)}`;
    }
    if (!oldName) {
        return `Added style property "${trimValue(newName)}: ${trimValue(newValue)}"${formatRuleSuffix('to', ruleHeader)}`;
    }
    if (oldName !== newName) {
        return `Changed style property from "${trimValue(oldName)}: ${trimValue(oldValue)}" to "${trimValue(newName)}: ${trimValue(newValue)}"${formatRuleSuffix('in', ruleHeader)}`;
    }
    return `Changed style property "${trimValue(newName)}" from "${trimValue(oldValue)}" to "${trimValue(newValue)}"${formatRuleSuffix('in', ruleHeader)}`;
}
function describeStylePropertyToggle({ ruleHeader, name, value, disabled }) {
    const action = disabled ? 'Disabled' : 'Enabled';
    return `${action} style property "${trimValue(name)}: ${trimValue(value)}"${formatRuleSuffix('in', ruleHeader)}`;
}
export function trackStylePropertyEdit(tracker, node, edit) {
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
    tracker.trackChange(describeStylePropertyEdit({ ruleHeader: edit.ruleHeader, oldName, oldValue, newName, newValue }), buildAnchor(STYLES_PANE_VE_PATH, node));
}
export function trackStylePropertyToggle(tracker, node, toggle) {
    if (!tracker?.isTracking) {
        return;
    }
    tracker.trackChange(describeStylePropertyToggle(toggle), buildAnchor(STYLES_PANE_VE_PATH, node));
}
//# sourceMappingURL=StyleChanges.js.map