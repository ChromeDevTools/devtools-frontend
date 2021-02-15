// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Platform from '../platform/platform.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import {RemoteObjectPreviewFormatter} from './RemoteObjectPreviewFormatter.js';

export class JavaScriptREPL {
  static wrapObjectLiteral(code: string): string {
    // Only parenthesize what appears to be an object literal.
    if (!(/^\s*\{/.test(code) && /\}\s*$/.test(code))) {
      return code;
    }

    // TODO: Remove next line once crbug.com/1177242 is solved.
    // eslint-disable-next-line @typescript-eslint/space-before-function-paren
    const parse = (async(): Promise<number> => 0).constructor;
    try {
      // Check if the code can be interpreted as an expression.
      parse('return ' + code + ';');

      // No syntax error! Does it work parenthesized?
      const wrappedCode = '(' + code + ')';
      parse(wrappedCode);

      return wrappedCode;
    } catch (e) {
      return code;
    }
  }

  static preprocessExpression(text: string): string {
    return JavaScriptREPL.wrapObjectLiteral(text);
  }

  static async evaluateAndBuildPreview(
      text: string, throwOnSideEffect: boolean, timeout?: number, allowErrors?: boolean,
      objectGroup?: string): Promise<{
    preview: DocumentFragment,
    result: SDK.RuntimeModel.EvaluationResult|null,
  }> {
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const globalObject = (window as any);
    const replInstance = globalObject.ObjectUI.JavaScriptREPL;
    const executionContext = UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext);
    const maxLength = typeof replInstance._MaxLengthForEvaluation !== 'undefined' ?
        replInstance._MaxLengthForEvaluation as number :
        MaxLengthForEvaluation;
    const isTextLong = text.length > maxLength;
    if (!text || !executionContext || (throwOnSideEffect && isTextLong)) {
      return {preview: document.createDocumentFragment(), result: null};
    }

    const expression = JavaScriptREPL.preprocessExpression(text);
    const options = {
      expression: expression,
      generatePreview: true,
      includeCommandLineAPI: true,
      throwOnSideEffect: throwOnSideEffect,
      timeout: timeout,
      objectGroup: objectGroup,
      disableBreaks: true,
      replMode: true,
      silent: undefined,
      returnByValue: undefined,
      allowUnsafeEvalBlockedByCSP: undefined,
    };
    const result = await executionContext.evaluate(options, false /* userGesture */, false /* awaitPromise */);
    const preview = JavaScriptREPL._buildEvaluationPreview(result, allowErrors);
    return {preview, result};
  }

  static _buildEvaluationPreview(result: SDK.RuntimeModel.EvaluationResult, allowErrors?: boolean): DocumentFragment {
    const fragment = document.createDocumentFragment();
    if ('error' in result) {
      return fragment;
    }

    if (result.exceptionDetails && result.exceptionDetails.exception && result.exceptionDetails.exception.description) {
      const exception = result.exceptionDetails.exception.description;
      if (exception.startsWith('TypeError: ') || allowErrors) {
        fragment.createChild('span').textContent = result.exceptionDetails.text + ' ' + exception;
      }
      return fragment;
    }

    const formatter = new RemoteObjectPreviewFormatter();
    const {preview, type, subtype, className, description} = result.object;
    if (preview && type === 'object' && subtype !== 'node' && subtype !== 'trustedtype') {
      formatter.appendObjectPreview(fragment, preview, false /* isEntry */);
    } else {
      const nonObjectPreview = formatter.renderPropertyPreview(
          type, subtype, className, Platform.StringUtilities.trimEndWithMaxLength(description || '', 400));
      fragment.appendChild(nonObjectPreview);
    }
    return fragment;
  }
}

/**
 * @const
 */
export const MaxLengthForEvaluation: number = 2000;
