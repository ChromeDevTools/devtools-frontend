// Copyright 2018 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Platform from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import * as Formatter from '../../../../models/formatter/formatter.js';
import * as SourceMapScopes from '../../../../models/source_map_scopes/source_map_scopes.js';
import * as Acorn from '../../../../third_party/acorn/acorn.js';
import { render } from '../../../lit/lit.js';
import * as UI from '../../legacy.js';
import { RemoteObjectPreviewFormatter } from './RemoteObjectPreviewFormatter.js';
export class JavaScriptREPL {
    static wrapObjectLiteral(code) {
        // Only parenthesize what appears to be an object literal.
        const result = /^\s*\{\s*(.*)\s*\}[\s;]*$/.exec(code);
        if (result === null) {
            return code;
        }
        const [, body] = result;
        let level = 0;
        for (const c of body) {
            if (c === '{') {
                level++;
            }
            else if (c === '}' && --level < 0) {
                return code;
            }
        }
        const parse = (expression) => void Acorn.parse(expression, { ecmaVersion: 2022, allowAwaitOutsideFunction: true, ranges: false, allowReturnOutsideFunction: true });
        try {
            // Check if the body can be interpreted as an expression.
            parse('return {' + body + '};');
            // No syntax error! Does it work parenthesized?
            const wrappedCode = '({' + body + '})';
            parse(wrappedCode);
            return wrappedCode;
        }
        catch {
            return code;
        }
    }
    static async evaluateAndBuildPreview(text, throwOnSideEffect, replMode, timeout, allowErrors, objectGroup, awaitPromise = false, silent = false) {
        const executionContext = UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext);
        const isTextLong = text.length > maxLengthForEvaluation;
        if (!text || !executionContext || (throwOnSideEffect && isTextLong)) {
            return { preview: document.createDocumentFragment(), result: null };
        }
        let expression = text;
        const callFrame = executionContext.debuggerModel.selectedCallFrame();
        if (callFrame?.script.isJavaScript()) {
            const nameMap = await SourceMapScopes.NamesResolver.allVariablesInCallFrame(callFrame);
            try {
                expression =
                    await Formatter.FormatterWorkerPool.formatterWorkerPool().javaScriptSubstitute(expression, nameMap);
            }
            catch {
            }
        }
        expression = JavaScriptREPL.wrapObjectLiteral(expression);
        const options = {
            expression,
            generatePreview: true,
            includeCommandLineAPI: true,
            throwOnSideEffect,
            timeout,
            objectGroup,
            disableBreaks: true,
            replMode,
            silent,
        };
        const result = await executionContext.evaluate(options, false /* userGesture */, awaitPromise);
        const preview = JavaScriptREPL.buildEvaluationPreview(result, allowErrors);
        return { preview, result };
    }
    static buildEvaluationPreview(result, allowErrors) {
        const fragment = document.createDocumentFragment();
        if ('error' in result) {
            return fragment;
        }
        if (result.exceptionDetails?.exception?.description) {
            const exception = result.exceptionDetails.exception.description;
            if (exception.startsWith('TypeError: ') || allowErrors) {
                fragment.createChild('span').textContent = result.exceptionDetails.text + ' ' + exception;
            }
            return fragment;
        }
        const formatter = new RemoteObjectPreviewFormatter();
        const { preview, type, subtype, className, description } = result.object;
        if (preview && type === 'object' && subtype !== 'node' && subtype !== 'trustedtype') {
            /* eslint-disable-next-line  @devtools/no-lit-render-outside-of-view */
            render(formatter.renderObjectPreview(preview), fragment);
        }
        else {
            /* eslint-disable-next-line  @devtools/no-lit-render-outside-of-view */
            render(formatter.renderPropertyPreview(type, subtype, className, Platform.StringUtilities.trimEndWithMaxLength(description || '', 400)), fragment);
        }
        return fragment;
    }
}
const maxLengthForEvaluation = 2000;
//# sourceMappingURL=JavaScriptREPL.js.map