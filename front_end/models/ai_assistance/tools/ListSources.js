// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Workspace from '../../workspace/workspace.js';
import { FileContext } from '../contexts/FileContext.js';
import { isOriginAllowedByLock, } from './Tool.js';
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
    description = 'Lists deployed and authored source files in the workspace (including source-mapped files) with their display name and unique numeric ID.';
    static lastSourceId = 0;
    static uiSourceCodeId = new WeakMap();
    static reset() {
        ListSourcesTool.lastSourceId = 0;
        ListSourcesTool.uiSourceCodeId = new WeakMap();
    }
    static getUISourceCodes(establishedOrigin, 
    // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
    workspace = Workspace.Workspace.WorkspaceImpl.instance()) {
        if (establishedOrigin.isOpaque()) {
            return [];
        }
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
        return [...uiSourceCodes.values()].filter(file => isOriginAllowedByLock(establishedOrigin, FileContext.originForUISourceCode(file)));
    }
    static getSourceById(id, establishedOrigin, 
    // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
    workspace = Workspace.Workspace.WorkspaceImpl.instance()) {
        if (establishedOrigin.isOpaque()) {
            return undefined;
        }
        return ListSourcesTool.getUISourceCodes(establishedOrigin, workspace)
            .find(file => ListSourcesTool.uiSourceCodeId.get(file) === id);
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
        const establishedOrigin = context.getEstablishedOrigin();
        if (!establishedOrigin || establishedOrigin.isOpaque()) {
            return {
                error: 'Opaque origin not allowed',
            };
        }
        const files = ListSourcesTool.getUISourceCodes(establishedOrigin);
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