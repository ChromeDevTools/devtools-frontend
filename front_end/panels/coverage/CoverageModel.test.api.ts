// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describe, it} from '../../../test/api/mocha-interface.js';
import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Bindings from '../../models/bindings/bindings.js';

// Avoid importing './coverage.js' (which drags in UI views and DOM globals in Node.js).
// eslint-disable-next-line @devtools/es-modules-import
import {CoverageModel, type EntryForExport} from './CoverageModel.js';

const {urlString} = Platform.DevToolsPath;

const COVERAGE_JS_SOURCE = `function outer(index) {

  function inner1(a) {
    return a + 1;
  }

  function inner2(a) {
    return a + 2;
  }

  function inner3(a) { return a + 3; } function inner4(a) { return a + 4; } function inner5(a) { return a + 5; }

  if (index === 7) {
    console.error('This will never happen!');
  }

  // Make sure these are not collected.
  if (!self.__funcs)
    self.__funcs = [inner1, inner2, inner3, inner4, inner5];
  return self.__funcs[index];
}

function performActions() {
  return outer(1)(0) + outer(3)(0);
} function outer2() {
  return outer(0)(0);
}
`;

const HIGHLIGHT_CSS_SOURCE = `body {
    background-color: lightblue;
}

.class {
    color: red;
}

.class2 {
    color:green;
    font-style: italic;
}

#id {
    color: blue
}

notUsed {
    color: black
}

notUsed2 {
    color: white
}`;

const EVAL_SCRIPT_URL = urlString`test://evaluations/0/coverage-export.js`;
const EVAL_EXPRESSION = `performActions()//# sourceURL=${EVAL_SCRIPT_URL}`;

async function waitForScript(debuggerModel: SDK.DebuggerModel.DebuggerModel, urlSuffix: string): Promise<void> {
  if (debuggerModel.scripts().some(script => script.sourceURL.endsWith(urlSuffix))) {
    return;
  }
  await new Promise<void>(resolve => {
    const onParsed = (event: Common.EventTarget.EventTargetEvent<SDK.Script.Script>): void => {
      if (event.data.sourceURL.endsWith(urlSuffix)) {
        debuggerModel.removeEventListener(SDK.DebuggerModel.Events.ParsedScriptSource, onParsed);
        resolve();
      }
    };
    debuggerModel.addEventListener(SDK.DebuggerModel.Events.ParsedScriptSource, onParsed);
  });
}

async function waitForStyleSheet(cssModel: SDK.CSSModel.CSSModel, urlSuffix: string): Promise<void> {
  if (cssModel.styleSheetHeaders().some(header => header.sourceURL.endsWith(urlSuffix))) {
    return;
  }
  await new Promise<void>(resolve => {
    const onAdded = (event: Common.EventTarget.EventTargetEvent<SDK.CSSStyleSheetHeader.CSSStyleSheetHeader>): void => {
      if (event.data.sourceURL.endsWith(urlSuffix)) {
        cssModel.removeEventListener(SDK.CSSModel.Events.StyleSheetAdded, onAdded);
        resolve();
      }
    };
    cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetAdded, onAdded);
  });
}

describe('CoverageModel API Test', () => {
  it('exports coverage report format and used ranges', async ({inspectedPage, universe}) => {
    const primaryTarget = universe.targetManager.primaryPageTarget();
    assert.exists(primaryTarget);
    const debuggerModel = primaryTarget.model(SDK.DebuggerModel.DebuggerModel);
    const cssModel = primaryTarget.model(SDK.CSSModel.CSSModel);
    const runtimeModel = primaryTarget.model(SDK.RuntimeModel.RuntimeModel);
    assert.exists(debuggerModel);
    assert.exists(cssModel);
    assert.exists(runtimeModel);

    await Promise.all([
      debuggerModel.debuggerEnabled() ? Promise.resolve() :
                                        debuggerModel.once(SDK.DebuggerModel.Events.DebuggerWasEnabled),
      cssModel.isEnabled() ? Promise.resolve() : cssModel.once(SDK.CSSModel.Events.ModelWasEnabled),
    ]);

    const coverageScriptLoaded = waitForScript(debuggerModel, '/coverage/coverage.js');
    const highlightCssLoaded = waitForStyleSheet(cssModel, '/coverage/highlight-in-source.css');
    await inspectedPage.goToResource('coverage/basic-coverage.html');
    await Promise.all([coverageScriptLoaded, highlightCssLoaded]);
    if (!runtimeModel.defaultExecutionContext()) {
      await runtimeModel.once(SDK.RuntimeModel.Events.ExecutionContextCreated);
    }

    const coverageModel = primaryTarget.model(CoverageModel);
    assert.exists(coverageModel);
    assert.isTrue(await coverageModel.start(/* jsCoveragePerBlock= */ true));
    await coverageModel.startPolling();

    const executionContext = runtimeModel.defaultExecutionContext();
    assert.exists(executionContext);
    const evalResult = await executionContext.evaluate({
      expression: EVAL_EXPRESSION,
      objectGroup: 'test',
      includeCommandLineAPI: false,
      silent: false,
      returnByValue: true,
      generatePreview: false,
    },
                                                       /* userGesture= */ false,
                                                       /* awaitPromise= */ false);
    assert.notProperty(evalResult, 'error');
    if ('exceptionDetails' in evalResult) {
      assert.isUndefined(evalResult.exceptionDetails);
    }

    await coverageModel.stopPolling();
    await coverageModel.stop();

    const outputStream = new Common.StringOutputStream.StringOutputStream();
    await coverageModel.exportReport(outputStream as unknown as Bindings.FileUtils.FileOutputStream);

    const report = JSON.parse(outputStream.data()) as EntryForExport[];
    const resourcesPath = `${inspectedPage.getResourcesPath()}/coverage`;
    const coverageJsUrl = urlString`${resourcesPath}/coverage.js`;
    const highlightCssUrl = urlString`${resourcesPath}/highlight-in-source.css`;

    assert.deepEqual(report, [
      {
        url: coverageJsUrl,
        ranges: [
          {start: 0, end: 27},
          {start: 69, end: 119},
          {start: 155, end: 193},
          {start: 229, end: 250},
          {start: 301, end: 456},
          {start: 458, end: 523},
        ],
        text: COVERAGE_JS_SOURCE,
      },
      {
        url: highlightCssUrl,
        ranges: [
          {start: 0, end: 41},
          {start: 43, end: 69},
        ],
        text: HIGHLIGHT_CSS_SOURCE,
      },
      {
        url: EVAL_SCRIPT_URL,
        ranges: [{start: 0, end: EVAL_EXPRESSION.length}],
        text: EVAL_EXPRESSION,
      },
    ]);

    const formattedUsage =
        report.map(entry => ({
                     url: entry.url,
                     usedTexts: entry.ranges.map(range => (entry.text ?? '').substring(range.start, range.end).trim()),
                   }));
    assert.deepEqual(formattedUsage, [
      {
        url: coverageJsUrl,
        usedTexts: [
          'function outer(index) {',
          'function inner2(a) {\n    return a + 2;\n  }',
          'function inner4(a) { return a + 4; }',
          'if (index === 7)',
          '// Make sure these are not collected.\n  if (!self.__funcs)\n' +
              '    self.__funcs = [inner1, inner2, inner3, inner4, inner5];\n' +
              '  return self.__funcs[index];\n}',
          'function performActions() {\n  return outer(1)(0) + outer(3)(0);\n}',
        ],
      },
      {
        url: highlightCssUrl,
        usedTexts: [
          'body {\n    background-color: lightblue;\n}',
          '.class {\n    color: red;\n}',
        ],
      },
      {
        url: EVAL_SCRIPT_URL,
        usedTexts: [EVAL_EXPRESSION],
      },
    ]);
  });
});
