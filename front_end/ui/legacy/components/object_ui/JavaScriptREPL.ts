// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import * as UI from '../../legacy.js';

import {RemoteObjectPreviewFormatter} from './RemoteObjectPreviewFormatter.js';

export class JavaScriptREPL {
  static wrapObjectLiteral(code: string): string {
    // Only parenthesize what appears to be an object literal.
    if (!(/^\s*\{/.test(code) && /\}\s*$/.test(code))) {
      return code;
    }

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
      text: string, throwOnSideEffect: boolean, replMode: boolean, timeout?: number, allowErrors?: boolean,
      objectGroup?: string, awaitPromise: boolean = false): Promise<{
    preview: DocumentFragment,
    result: SDK.RuntimeModel.EvaluationResult|null,
  }> {
    const executionContext = UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext);
    const isTextLong = text.length > maxLengthForEvaluation;
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
      replMode: replMode,
      silent: undefined,
      returnByValue: undefined,
      allowUnsafeEvalBlockedByCSP: undefined,
    };
    const result = await executionContext.evaluate(options, false /* userGesture */, awaitPromise);
    const preview = JavaScriptREPL.buildEvaluationPreview(result, allowErrors);
    return {preview, result};
  }

  private static buildEvaluationPreview(result: SDK.RuntimeModel.EvaluationResult, allowErrors?: boolean):
      DocumentFragment {
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

let maxLengthForEvaluation: number = 2000;

export function setMaxLengthForEvaluation(value: number): void {
  maxLengthForEvaluation = value;
}

export function getMaxLengthForEvaluation(): number {
  return maxLengthForEvaluation;
}
