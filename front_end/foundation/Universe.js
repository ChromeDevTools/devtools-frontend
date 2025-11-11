// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../core/common/common.js';
export class Universe {
    constructor(options) {
        // TODO(crbug.com/458180550): Store instance on a "DevToolsContext" instead.
        //                            For now the global is fine as we don't anticipate the MCP server to change settings.
        Common.Settings.Settings.instance({
            forceNew: true,
            ...options.settingsCreationOptions,
        });
    }
}
//# sourceMappingURL=Universe.js.map