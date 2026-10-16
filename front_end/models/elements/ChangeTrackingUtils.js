// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Platform from '../../core/platform/platform.js';
/**
 * Maximum number of characters of page or author controlled data (tag names, attribute names
 * and values, text node values, HTML, CSS property names/values, and selectors) that a change
 * description embeds.
 */
export const MAX_VALUE_LENGTH = 100;
/** Shortens page or author controlled data so that both its start and end stay recognizable. */
export function trimValue(value) {
    return Platform.StringUtilities.trimMiddle(value.trim(), MAX_VALUE_LENGTH);
}
export function buildAnchor(vePath, node, textSignature) {
    return {
        vePath,
        ...(textSignature ? { textSignature } : {}),
        ...(node ? {
            node: {
                backendNodeId: node.backendNodeId(),
                targetId: node.domModel().target().id(),
            },
        } :
            {}),
    };
}
//# sourceMappingURL=ChangeTrackingUtils.js.map