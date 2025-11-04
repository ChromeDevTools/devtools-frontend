// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Platform from '../../../../core/platform/platform.js';
import * as TimelineUtils from '../../utils/utils.js';
import { eventRef } from './EventRef.js';
export function scriptRef(script) {
    // The happy path is that we have a network request associated with this script.
    if (script.request) {
        if (script.inline) {
            return eventRef(script.request, {
                text: `(inline) ${Platform.StringUtilities.trimEndWithMaxLength(script.content ?? '', 15)}`,
            });
        }
        return eventRef(script.request);
    }
    if (script.url) {
        try {
            const parsedUrl = new URL(script.url);
            return TimelineUtils.Helpers.shortenUrl(parsedUrl);
        }
        catch {
        }
    }
    if (script.inline) {
        return `(inline) ${Platform.StringUtilities.trimEndWithMaxLength(script.content ?? '', 15)}`;
    }
    return `script id: ${script.scriptId}`;
}
//# sourceMappingURL=ScriptRef.js.map