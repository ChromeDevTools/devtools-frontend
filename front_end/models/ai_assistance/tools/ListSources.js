// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as Workspace from '../../workspace/workspace.js';
import { isOriginAllowedByLock, resolveOriginFromLock, } from './Tool.js';
const UIStringsNotTranslate = {
    listingSources: 'Listing workspace sources',
};
const lockedString = i18n.i18n.lockedString;
/**
 * A tool that lists readable text network source files in the workspace, excluding binary assets.
 * Each file is returned with its displayName and a unique session-based numeric ID.
 * The output is a semicolon-delimited list with an `id;name` header, plus an omitted-count footer when binary files are skipped.
 */
export class ListSourcesTool {
    name = "listSources" /* ToolName.LIST_SOURCES */;
    permissionPrompt = "never" /* PermissionPrompt.NEVER */;
    description = 'Lists deployed and authored source files in the workspace (including source-mapped files) with their display name and unique numeric ID.';
    static lastSourceId = 0;
    static uiSourceCodeId = new WeakMap();
    static idToUiSourceCode = new Map();
    static reset() {
        ListSourcesTool.lastSourceId = 0;
        ListSourcesTool.uiSourceCodeId = new WeakMap();
        ListSourcesTool.idToUiSourceCode = new Map();
    }
    /**
     * Collects readable text network `UISourceCode`s allowed by the origin lock, skipping ignore-listed and binary files.
     * Returns the deduplicated files alongside the count of distinct omitted binary URLs that have no readable counterpart.
     */
    static getUISourceCodes(originLock, 
    // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
    workspace = Workspace.Workspace.WorkspaceImpl.instance()) {
        if (originLock.status !== 'ESTABLISHED_ORIGIN' || originLock.origin.isOpaque()) {
            return { files: [], omittedBinaryCount: 0 };
        }
        const uiSourceCodes = new Map();
        const omittedBinaryUrls = new Set();
        for (const project of workspace.projectsForType(Workspace.Workspace.projectTypes.Network)) {
            const projectOrigin = project.securityOrigin?.();
            if (projectOrigin && !isOriginAllowedByLock(originLock, projectOrigin)) {
                continue;
            }
            for (const uiSourceCode of project.uiSourceCodes()) {
                if (uiSourceCode.isIgnoreListed()) {
                    continue;
                }
                // A source map on an allowed page can still point to cross-origin URLs,
                // so a file's origin may differ from its project's origin.
                if (!isOriginAllowedByLock(originLock, uiSourceCode.securityOrigin())) {
                    continue;
                }
                // Check `mimeType` first to match `ContentData#isTextContent`, which `FileFormatter` uses to decode content.
                // `contentType().isTextType()` reports `.wasm` scripts and binary `Fetch`/`XHR` payloads as text, and
                // `image/svg+xml` as binary.
                const mimeType = uiSourceCode.mimeType();
                const isReadable = mimeType ? Platform.MimeType.isTextType(mimeType) : uiSourceCode.contentType().isTextType();
                const url = uiSourceCode.url();
                if (!isReadable) {
                    omittedBinaryUrls.add(url);
                    continue;
                }
                if (!uiSourceCodes.get(url) || uiSourceCode.contentType().isFromSourceMap()) {
                    uiSourceCodes.set(url, uiSourceCode);
                    if (!ListSourcesTool.uiSourceCodeId.has(uiSourceCode)) {
                        const id = ++ListSourcesTool.lastSourceId;
                        ListSourcesTool.uiSourceCodeId.set(uiSourceCode, id);
                        ListSourcesTool.idToUiSourceCode.set(id, uiSourceCode);
                    }
                }
            }
        }
        // Projects can register the same URL in any order, so only count omitted URLs without a readable file.
        for (const url of uiSourceCodes.keys()) {
            omittedBinaryUrls.delete(url);
        }
        return {
            files: Array.from(uiSourceCodes.values()),
            omittedBinaryCount: omittedBinaryUrls.size,
        };
    }
    static getSourceById(id, originLock) {
        if (!Number.isInteger(id) || id <= 0) {
            return undefined;
        }
        const file = ListSourcesTool.idToUiSourceCode.get(id);
        if (!file || !isOriginAllowedByLock(originLock, file.securityOrigin())) {
            return undefined;
        }
        return file;
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
        const originLock = context.getOriginLock();
        const originResult = resolveOriginFromLock(originLock);
        if ('error' in originResult) {
            return originResult;
        }
        const { files, omittedBinaryCount } = ListSourcesTool.getUISourceCodes(originLock);
        const lines = files.length === 0 ? ['No source files found for the current origin.'] : [
            'id;name',
            ...files.map(file => {
                const id = ListSourcesTool.uiSourceCodeId.get(file) ?? 0;
                return `${id};${formatSourceName(file, originResult.origin)}`;
            }),
        ];
        if (omittedBinaryCount > 0) {
            lines.push(`(Omitted ${omittedBinaryCount} binary image/font/media/wasm files; load the network skill and call listNetworkRequests to inspect binary asset URLs.)`);
        }
        return { result: lines.join('\n') };
    }
}
/**
 * Formats a source file name for the `listSources` output.
 *
 * `fullDisplayName()` already strips `https?://` for network files while keeping the host,
 * and decodes URI sequences (`%0D`, `%0A`) into raw `\r` and `\n`. Re-encode carriage returns
 * and newlines so filenames cannot break the line-delimited `id;name` output.
 */
function formatSourceName(file, establishedOrigin) {
    const fullName = file.fullDisplayName().replace(/\r/g, '%0D').replace(/\n/g, '%0A');
    const siteId = establishedOrigin.siteId();
    if (/^https?:\/\//.test(siteId) && file.origin().toLowerCase() === siteId) {
        const hostPrefix = siteId.replace(/^https?:\/\//, '');
        if (fullName.slice(0, hostPrefix.length).toLowerCase() === hostPrefix && fullName[hostPrefix.length] === '/') {
            return fullName.slice(hostPrefix.length);
        }
    }
    return fullName;
}
//# sourceMappingURL=ListSources.js.map