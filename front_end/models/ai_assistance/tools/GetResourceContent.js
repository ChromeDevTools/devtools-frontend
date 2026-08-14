// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Root from '../../../core/root/root.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as TextUtils from '../../../core/text_utils/text_utils.js';
import { canResourceContentsBeReadForTrace } from '../AiOrigins.js';
import { PerformanceTraceContext } from '../contexts/PerformanceTraceContext.js';
const UIStringsNotTranslate = {
    lookingAtResourceContent: 'Looking at resource content',
};
const lockedString = i18n.i18n.lockedString;
export class GetResourceContentTool {
    name = "getResourceContent" /* ToolName.GET_RESOURCE_CONTENT */;
    description = 'Returns the content of the resource with the given url. Only use this for text resource types.';
    parameters = {
        type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
        description: 'Arguments for looking up resource content.',
        nullable: false,
        properties: {
            url: {
                type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                description: 'The url for the resource.',
                nullable: false,
            },
        },
        required: ['url'],
    };
    displayInfoFromArgs(params) {
        return {
            title: lockedString(UIStringsNotTranslate.lookingAtResourceContent),
            action: `getResourceContent('${params.url}')`,
        };
    }
    async handler(params, capabilities) {
        const conversationContext = capabilities.conversationContext;
        if (!conversationContext || !(conversationContext instanceof PerformanceTraceContext)) {
            return { error: 'Performance trace context is not available.' };
        }
        if (conversationContext.getOrigin().startsWith('imported-trace://')) {
            return { error: 'Cannot use this tool on an imported file.' };
        }
        const allowedOrigin = conversationContext.getOrigin();
        if (!canResourceContentsBeReadForTrace(params.url, allowedOrigin)) {
            return { error: 'Resource not found' };
        }
        const focus = conversationContext.getItem();
        const { parsedTrace } = focus;
        let content;
        const url = params.url;
        const script = parsedTrace.data.Scripts?.scripts.find(script => script.url === params.url);
        if (script?.content !== undefined) {
            content = script.content;
        }
        else {
            const target = capabilities.getTarget();
            const isTraceApp = Root.Runtime.Runtime.isTraceApp();
            if (target || isTraceApp) {
                const targetManager = target?.targetManager() ??
                    // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
                    SDK.TargetManager.TargetManager.instance();
                const resource = SDK.ResourceTreeModel.ResourceTreeModel.resourceForURL(targetManager, url);
                if (!resource) {
                    return { error: 'Resource not found' };
                }
                const data = await resource.requestContentData();
                if (TextUtils.ContentData.ContentData.isError(data)) {
                    return { error: `Could not get resource content: ${data.error}` };
                }
                if (!data.isTextContent) {
                    return { error: 'Cannot retrieve content for non-text resource' };
                }
                content = data.text;
            }
            else {
                return { error: 'Resource not found' };
            }
        }
        return {
            result: { content },
            widgets: [{
                    name: 'SOURCE_CODE',
                    data: {
                        url,
                        code: content,
                    },
                }],
        };
    }
}
//# sourceMappingURL=GetResourceContent.js.map