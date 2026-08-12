// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Workspace from '../../workspace/workspace.js';
import { isOpaqueOrigin } from '../AiOrigins.js';
const UIStringsNotTranslate = {
    listingSources: 'Listing workspace sources',
};
const lockedString = i18n.i18n.lockedString;
/**
 * A tool that lists all network source files in the workspace.
 * Each file is returned with its displayName and a unique session-based numeric ID.
 */
export class ListSourcesTool {
    name = "listSources" /* ToolName.LIST_SOURCES */;
    description = 'Lists all source files in the workspace with their name and a unique ID.';
    static lastSourceId = 0;
    static uiSourceCodeId = new WeakMap();
    static reset() {
        ListSourcesTool.lastSourceId = 0;
        ListSourcesTool.uiSourceCodeId = new WeakMap();
    }
    // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
    static getUISourceCodes(workspace = Workspace.Workspace.WorkspaceImpl.instance()) {
        const projects = workspace.projects().filter(project => project.type() === Workspace.Workspace.projectTypes.Network);
        const uiSourceCodes = new Map();
        for (const project of projects) {
            for (const uiSourceCode of project.uiSourceCodes()) {
                if (uiSourceCode.isIgnoreListed()) {
                    continue;
                }
                const url = uiSourceCode.url();
                if (!uiSourceCodes.get(url) || uiSourceCode.contentType().isFromSourceMap()) {
                    uiSourceCodes.set(url, uiSourceCode);
                    if (!ListSourcesTool.uiSourceCodeId.has(uiSourceCode)) {
                        ListSourcesTool.uiSourceCodeId.set(uiSourceCode, ++ListSourcesTool.lastSourceId);
                    }
                }
            }
        }
        return [...uiSourceCodes.values()];
    }
    parameters = {
        type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
        description: '',
        nullable: true,
        required: [],
        properties: {},
    };
    displayInfoFromArgs() {
        return {
            title: lockedString(UIStringsNotTranslate.listingSources),
            action: 'listSources()',
        };
    }
    async handler(_params, context) {
        const origin = context.getEstablishedOrigin();
        if (origin && isOpaqueOrigin(origin)) {
            return {
                error: 'Opaque origin not allowed',
            };
        }
        const files = ListSourcesTool.getUISourceCodes().filter(file => {
            const fileUrl = file.url();
            const fileOrigin = Common.ParsedURL.ParsedURL.extractOrigin(fileUrl);
            return !origin || fileOrigin === origin;
        });
        return {
            result: {
                files: files.map(file => ({
                    id: ListSourcesTool.uiSourceCodeId.get(file) ?? 0,
                    name: file.fullDisplayName(),
                })),
            },
        };
    }
}
//# sourceMappingURL=ListSources.js.map