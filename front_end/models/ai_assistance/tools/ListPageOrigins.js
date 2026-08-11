// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import { isOpaqueOrigin } from '../AiOrigins.js';
import { isSamePageOrigin } from '../contexts/StorageContext.js';
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
    async handler(_args, context) {
        // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
        const targetManager = SDK.TargetManager.TargetManager.instance();
        const primaryPageTarget = targetManager.primaryPageTarget();
        const pageOrigin = primaryPageTarget && context.conversationContext ?
            Common.ParsedURL.ParsedURL.extractOrigin(primaryPageTarget.inspectedURL()) :
            '';
        const isAllowed = pageOrigin !== '' && context.conversationContext?.isOriginAllowed(pageOrigin);
        if (!isAllowed) {
            return { error: 'No origin available or not allowed.' };
        }
        const origins = new Set();
        for (const frame of SDK.ResourceTreeModel.ResourceTreeModel.frames(targetManager)) {
            if (!isSamePageOrigin(frame.resourceTreeModel().target().outermostTarget(), context.conversationContext ?? undefined)) {
                continue;
            }
            const origin = frame.securityOrigin;
            if (!origin || isOpaqueOrigin(origin) || origins.has(origin)) {
                continue;
            }
            origins.add(origin);
        }
        return { result: { origins: Array.from(origins) } };
    }
}
//# sourceMappingURL=ListPageOrigins.js.map