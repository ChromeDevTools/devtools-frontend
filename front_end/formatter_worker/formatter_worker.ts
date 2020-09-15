// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as CSSRuleParser from './CSSRuleParser.js';
import * as FormatterWorker from './FormatterWorker.js';
import * as JavaScriptOutline from './JavaScriptOutline.js';

self.onmessage = function(event: MessageEvent) {
  const method: string = event.data.method;
  const params: {indentString: string; content: string; mimeType: string;} = event.data.params;
  if (!method) {
    return;
  }

  switch (method) {
    case 'format':
      self.postMessage(FormatterWorker.format(params.mimeType, params.content, params.indentString));
      break;
    case 'parseCSS':
      CSSRuleParser.parseCSS(params.content, self.postMessage);
      break;
    case 'javaScriptOutline':
      self.postMessage(JavaScriptOutline.javaScriptOutline(params.content));
      break;
    case 'javaScriptIdentifiers':
      self.postMessage(FormatterWorker.javaScriptIdentifiers(params.content));
      break;
    case 'evaluatableJavaScriptSubstring':
      self.postMessage(FormatterWorker.evaluatableJavaScriptSubstring(params.content));
      break;
    case 'findLastExpression':
      self.postMessage(FormatterWorker.findLastExpression(params.content));
      break;
    case 'findLastFunctionCall':
      self.postMessage(FormatterWorker.findLastFunctionCall(params.content));
      break;
    case 'argumentsList':
      self.postMessage(FormatterWorker.argumentsList(params.content));
      break;
    default:
      console.error('Unsupport method name: ' + method);
  }
};

self.postMessage('workerReady');
