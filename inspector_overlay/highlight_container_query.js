// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { buildPath, drawPathWithLineStyle, emptyBounds } from './highlight_common.js';
export function drawContainerQueryHighlight(highlight, context, emulationScaleFactor) {
    const config = highlight.containerQueryContainerHighlightConfig;
    const bounds = emptyBounds();
    const borderPath = buildPath(highlight.containerBorder, bounds, emulationScaleFactor);
    drawPathWithLineStyle(context, borderPath, config.containerBorder, 2 /* thicker container outline */);
    if (!highlight.queryingDescendants) {
        return;
    }
    for (const descendant of highlight.queryingDescendants) {
        const descendantBounds = emptyBounds();
        const descendantBorderPath = buildPath(descendant.descendantBorder, descendantBounds, emulationScaleFactor);
        drawPathWithLineStyle(context, descendantBorderPath, config.descendantBorder);
    }
}
//# sourceMappingURL=highlight_container_query.js.map