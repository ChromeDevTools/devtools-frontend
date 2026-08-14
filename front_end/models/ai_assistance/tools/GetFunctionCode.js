// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import { canResourceContentsBeReadForTrace } from '../AiOrigins.js';
import { PerformanceTraceContext } from '../contexts/PerformanceTraceContext.js';
const UIStringsNotTranslate = {
    lookingUpFunctionCode: 'Looking up function code',
};
const lockedString = i18n.i18n.lockedString;
export class GetFunctionCodeTool {
    name = "getFunctionCode" /* ToolName.GET_FUNCTION_CODE */;
    description = 'Returns the code for a function defined at the given location. The result is annotated with the runtime performance of each line of code.';
    parameters = {
        type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
        description: 'Arguments for looking up function code.',
        nullable: false,
        properties: {
            scriptUrl: {
                type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                description: 'The url of the function.',
                nullable: false,
            },
            line: {
                type: 3 /* Host.AidaClient.ParametersTypes.INTEGER */,
                description: 'The line number where the function is defined.',
                nullable: false,
            },
            column: {
                type: 3 /* Host.AidaClient.ParametersTypes.INTEGER */,
                description: 'The column number where the function is defined.',
                nullable: false,
            },
        },
        required: ['scriptUrl', 'line', 'column'],
    };
    displayInfoFromArgs(params) {
        return {
            title: lockedString(UIStringsNotTranslate.lookingUpFunctionCode),
            action: `getFunctionCode('${params.scriptUrl}', ${params.line}, ${params.column})`,
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
        if (!params.scriptUrl) {
            return { error: 'Missing arg: scriptUrl' };
        }
        const allowedOrigin = conversationContext.getOrigin();
        if (!canResourceContentsBeReadForTrace(params.scriptUrl, allowedOrigin)) {
            return { error: 'Script not found' };
        }
        if (params.line === undefined) {
            return { error: 'Missing arg: line' };
        }
        if (params.column === undefined) {
            return { error: 'Missing arg: column' };
        }
        const formatter = conversationContext.createFormatter();
        const url = params.scriptUrl;
        const code = await formatter.resolveFunctionCodeAtLocation(url, params.line, params.column);
        if (!code) {
            return { error: 'Could not find code' };
        }
        const result = formatter.formatFunctionCode(code);
        return {
            result,
            widgets: [{
                    name: 'SOURCE_CODE',
                    data: {
                        url,
                        line: params.line,
                        column: params.column,
                        code: code.code,
                    },
                }],
        };
    }
}
//# sourceMappingURL=GetFunctionCode.js.map