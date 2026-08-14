// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import { areOriginsEquivalent, isOpaqueOrigin } from '../AiOrigins.js';
const lockedString = i18n.i18n.lockedString;
export class ListPageOriginsTool {
    name = "listPageOrigins" /* ToolName.LIST_PAGE_ORIGINS */;
    description = 'Lists all active, non-empty frame origins loaded by the page. Use this first when generic category context is active to discover all page origins, then pass them to listCookies or listStorageKeys, unless the user\'s explicit request hints at focusing only on the primary page.';
    parameters = {
        type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
        description: '',
        nullable: false,
        properties: {},
        required: [],
    };
    displayInfoFromArgs() {
        return {
            title: lockedString('Listing page origins'),
            action: 'listPageOrigins()',
        };
    }
    /**
     * Retrieves the set of unique frame origins loaded within the primary page's target tree.
     *
     * To prevent data leakage across different tabs/windows, this tool:
     * 1. Restricts the frame search to those belonging to the `primaryPageTarget`'s outermost target tree.
     * 2. Filters out any origins that are not equivalent to the established allowed origin.
     *    Note: Under site isolation, frames may be hosted on different sub-targets or processes,
     *    so we check `frame.securityOrigin` directly instead of the frame's target origin.
     */
    async handler(_args, context) {
        // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
        const targetManager = SDK.TargetManager.TargetManager.instance();
        const primaryPageTarget = targetManager.primaryPageTarget();
        const allowedOrigin = context.getEstablishedOrigin();
        if (!allowedOrigin || isOpaqueOrigin(allowedOrigin)) {
            return { error: 'No origin available or not allowed.' };
        }
        const pageOrigin = primaryPageTarget ? Common.ParsedURL.ParsedURL.extractOrigin(primaryPageTarget.inspectedURL()) : '';
        const isAllowed = pageOrigin !== '' && areOriginsEquivalent(pageOrigin, allowedOrigin);
        if (!isAllowed) {
            return { error: 'No origin available or not allowed.' };
        }
        const origins = new Set();
        for (const frame of SDK.ResourceTreeModel.ResourceTreeModel.frames(targetManager)) {
            if (frame.resourceTreeModel().target().outermostTarget() !== primaryPageTarget) {
                continue;
            }
            const origin = frame.securityOrigin;
            // Filter out frames that are not same-origin to the page's allowed origin.
            // Under site isolation, frames can be hosted on different targets/processes,
            // so we check the security origin of the frame directly instead of the target.
            if (!origin || !areOriginsEquivalent(origin, allowedOrigin)) {
                continue;
            }
            if (origins.has(origin)) {
                continue;
            }
            origins.add(origin);
        }
        return { result: { origins: Array.from(origins) } };
    }
}
//# sourceMappingURL=ListPageOrigins.js.map