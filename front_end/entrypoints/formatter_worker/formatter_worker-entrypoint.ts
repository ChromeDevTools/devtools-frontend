// Copyright 2019 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';

import * as FormatterWorker from './formatter_worker.js';
import {FormatterActions} from './FormatterActions.js';

self.onmessage = function(event: MessageEvent): void {
  const method: FormatterActions = event.data.method;
  const params: {
    indentString: string,
    content: string,
    mimeType: string,
    mapping: Map<string, string|null>,
    sourceType: 'module'|'script',
  } = event.data.params;
  if (!method) {
    return;
  }

  switch (method) {
    case FormatterActions.FORMAT:
      self.postMessage(FormatterWorker.FormatterWorker.format(params.mimeType, params.content, params.indentString));
      break;
    case FormatterActions.PARSE_CSS:
      FormatterWorker.CSSRuleParser.parseCSS(params.content, self.postMessage);
      break;
    case FormatterActions.JAVASCRIPT_SUBSTITUTE: {
      self.postMessage(FormatterWorker.Substitute.substituteExpression(params.content, params.mapping));
      break;
    }
    case FormatterActions.JAVASCRIPT_SCOPE_TREE: {
      self.postMessage(FormatterWorker.ScopeParser.parseScopes(params.content, params.sourceType)?.export());
      break;
    }
    default:
      Platform.assertNever(method, `Unsupport method name: ${method}`);
  }
};

self.postMessage('workerReady');
