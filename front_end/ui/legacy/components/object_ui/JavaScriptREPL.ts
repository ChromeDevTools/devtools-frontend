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
    const result = /^\s*\{\s*(.*)\s*\}[\s;]*$/.exec(code);
    if (result === null) {
      return code;
    }
    const [, body] = result;
    let level = 0;
    for (const c of body) {
      if (c === '{') {
        level++;
      } else if (c === '}' && --level < 0) {
        return code;
      }
    }

    const parse = (async(): Promise<number> => 0).constructor;
    try {
      // Check if the body can be interpreted as an expression.
      parse('return {' + body + '};');

      // No syntax error! Does it work parenthesized?
      const wrappedCode = '({' + body + '})';
      parse(wrappedCode);

      return wrappedCode;
    } catch (e) {
      return code;
    }
  }

  static async evaluateAndBuildPreview(
      text: string, throwOnSideEffect: boolean, replMode: boolean, timeout?: number, allowErrors?: boolean,
      objectGroup?: string, awaitPromise: boolean = false, silent: boolean = false): Promise<{
    preview: DocumentFragment,
    result: SDK.RuntimeModel.EvaluationResult|null,
  }> {
    const executionContext = UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext);
    const isTextLong = text.length > maxLengthForEvaluation;
    if (!text || !executionContext || (throwOnSideEffect && isTextLong)) {
      return {preview: document.createDocumentFragment(), result: null};
    }

    const expression = JavaScriptREPL.wrapObjectLiteral(text);
    const options = {
      expression: expression,
      generatePreview: true,
      includeCommandLineAPI: true,
      throwOnSideEffect: throwOnSideEffect,
      timeout: timeout,
      objectGroup: objectGroup,
      disableBreaks: true,
      replMode: replMode,
      silent: silent,
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
