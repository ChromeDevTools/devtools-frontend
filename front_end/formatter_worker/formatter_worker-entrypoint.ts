// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../cm_headless/cm_headless.js';
import '../third_party/codemirror/package/mode/css/css.js';
import '../third_party/codemirror/package/mode/xml/xml.js';

import * as FormatterWorker from './formatter_worker.js';  // eslint-disable-line rulesdir/es_modules_import

self.onmessage = function(event: MessageEvent) {
  const method: string = event.data.method;
  const params: {indentString: string; content: string; mimeType: string;} = event.data.params;
  if (!method) {
    return;
  }

  switch (method) {
    case 'format':
      self.postMessage(FormatterWorker.FormatterWorker.format(params.mimeType, params.content, params.indentString));
      break;
    case 'parseCSS':
      FormatterWorker.CSSRuleParser.parseCSS(params.content, self.postMessage);
      break;
    case 'javaScriptOutline':
      self.postMessage(FormatterWorker.JavaScriptOutline.javaScriptOutline(params.content));
      break;
    case 'javaScriptIdentifiers':
      self.postMessage(FormatterWorker.FormatterWorker.javaScriptIdentifiers(params.content));
      break;
    case 'evaluatableJavaScriptSubstring':
      self.postMessage(FormatterWorker.FormatterWorker.evaluatableJavaScriptSubstring(params.content));
      break;
    case 'findLastExpression':
      self.postMessage(FormatterWorker.FormatterWorker.findLastExpression(params.content));
      break;
    case 'findLastFunctionCall':
      self.postMessage(FormatterWorker.FormatterWorker.findLastFunctionCall(params.content));
      break;
    case 'argumentsList':
      self.postMessage(FormatterWorker.FormatterWorker.argumentsList(params.content));
      break;
    default:
      console.error('Unsupport method name: ' + method);
  }
};

self.postMessage('workerReady');
