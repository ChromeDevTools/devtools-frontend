// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Workspace from '../../models/workspace/workspace.js';

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 */

import * as Bindings from '../../models/bindings/bindings.js';
import * as Diff from '../../third_party/diff/diff.js';

export const cleanupURL = function(url) {
  if (!url.startsWith('debugger://')) {
    return url;
  }

  return url.replace(/VM\d+/g, 'VM[XXX]');
};

export const dumpWorkspace = function(previousSnapshot) {
  const uiSourceCodes = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodes().slice();
  let urls = uiSourceCodes.map(code => code.url());

  urls = urls.map(cleanupURL);

  urls.sort(Platform.StringUtilities.caseInsensetiveComparator);
  const isAdded = new Array(urls.length).fill(false);
  let removedLines = [];

  if (previousSnapshot) {
    const diff = Diff.Diff.DiffWrapper.lineDiff(previousSnapshot, urls);
    const removedEntries = diff.filter(entry => entry[0] === Diff.Diff.Operation.Delete).map(entry => entry[1]);
    removedLines = [].concat.apply([], removedEntries);
    let index = 0;

    for (const entry of diff) {
      if (entry[0] === Diff.Diff.Operation.Delete) {
        continue;
      }

      if (entry[0] === Diff.Diff.Operation.Equal) {
        index += entry[1].length;
        continue;
      }

      // eslint-disable-next-line no-unused-vars
      for (const line of entry[1]) {
        isAdded[index++] = true;
      }
    }
  }

  TestRunner.addResult(`Removed: ${removedLines.length} uiSourceCodes`);

  for (const url of removedLines) {
    TestRunner.addResult('[-] ' + url);
  }

  TestRunner.addResult(`Workspace: ${urls.length} uiSourceCodes.`);

  for (let i = 0; i < urls.length; ++i) {
    const url = urls[i];
    const prefix = (isAdded[i] ? '[+] ' : '    ');
    TestRunner.addResult(prefix + url);
  }

  return urls;
};

export const attachFrame = function(frameId, url, evalSourceURL) {
  let evalSource = `(${attachFrame.toString()})('${frameId}', '${url}')`;

  if (evalSourceURL) {
    evalSource += '//# sourceURL=' + evalSourceURL;
  }

  return TestRunner.evaluateInPageAsync(evalSource);

  function attachFrame(frameId, url) {
    const frame = document.createElement('iframe');
    frame.src = url;
    frame.id = frameId;
    document.body.appendChild(frame);
    return new Promise(x => {
      frame.onload = x;
    });
  }
};

export const detachFrame = function(frameId, evalSourceURL) {
  let evalSource = `(${detachFrame.toString()})('${frameId}')`;

  if (evalSourceURL) {
    evalSource += '//# sourceURL=' + evalSourceURL;
  }

  return TestRunner.evaluateInPageAnonymously(evalSource);

  function detachFrame(frameId) {
    const frame = document.getElementById(frameId);
    frame.remove();
  }
};

export const navigateFrame = function(frameId, navigateURL, evalSourceURL) {
  let evalSource = `(${navigateFrame.toString()})('${frameId}', '${navigateURL}')`;

  if (evalSourceURL) {
    evalSource += '//# sourceURL=' + evalSourceURL;
  }

  return TestRunner.evaluateInPageAsync(evalSource);

  function navigateFrame(frameId, url) {
    const frame = document.getElementById(frameId);
    frame.src = url;
    return new Promise(x => {
      frame.onload = x;
    });
  }
};

export const attachShadowDOM = function(id, templateSelector, evalSourceURL) {
  let evalSource = `(${createShadowDOM.toString()})('${id}', '${templateSelector}')`;

  if (evalSourceURL) {
    evalSource += '//# sourceURL=' + evalSourceURL;
  }

  return TestRunner.evaluateInPageAnonymously(evalSource);

  function createShadowDOM(id, templateSelector) {
    const shadowHost = document.createElement('div');
    shadowHost.setAttribute('id', id);

    const shadowRoot = shadowHost.attachShadow({mode: 'open'});

    const t = document.querySelector(templateSelector);
    const instance = t.content.cloneNode(true);
    shadowRoot.appendChild(instance);
    document.body.appendChild(shadowHost);
  }
};

export const detachShadowDOM = function(id, evalSourceURL) {
  let evalSource = `(${removeShadowDOM.toString()})('${id}')`;

  if (evalSourceURL) {
    evalSource += '//# sourceURL=' + evalSourceURL;
  }

  return TestRunner.evaluateInPageAnonymously(evalSource);

  function removeShadowDOM(id) {
    document.querySelector('#' + id).remove();
  }
};

export const waitForStyleSheetRemoved = function(urlSuffix) {
  let fulfill;
  const promise = new Promise(x => {
    fulfill = x;
  });
  TestRunner.cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetRemoved, onStyleSheetRemoved);
  return promise;

  function onStyleSheetRemoved(event) {
    const styleSheetHeader = event.data;

    if (!styleSheetHeader.resourceURL().endsWith(urlSuffix)) {
      return;
    }

    TestRunner.cssModel.removeEventListener(SDK.CSSModel.Events.StyleSheetRemoved, onStyleSheetRemoved);
    fulfill();
  }
};

TestRunner.addSniffer(
    Bindings.CompilerScriptMapping.CompilerScriptMapping.prototype, 'sourceMapAttachedForTest', onSourceMap, true);
TestRunner.addSniffer(
    Bindings.SASSSourceMapping.SASSSourceMapping.prototype, 'sourceMapAttachedForTest', onSourceMap, true);
const sourceMapCallbacks = new Map();

function onSourceMap(sourceMap) {
  for (const urlSuffix of sourceMapCallbacks.keys()) {
    if (sourceMap.url().endsWith(urlSuffix)) {
      const callback = sourceMapCallbacks.get(urlSuffix);
      callback.call(null);
      sourceMapCallbacks.delete(urlSuffix);
    }
  }
}

export const waitForSourceMap = function(sourceMapURLSuffix) {
  let fulfill;
  const promise = new Promise(x => {
    fulfill = x;
  });
  sourceMapCallbacks.set(sourceMapURLSuffix, fulfill);
  return promise;
};

const locationPool = new Bindings.LiveLocation.LiveLocationPool();
const nameSymbol = Symbol('LiveLocationNameForTest');
const createdSymbol = Symbol('LiveLocationCreated');

export const createDebuggerLiveLocation = function(name, urlSuffix, lineNumber, columnNumber, dumpOnUpdate = true) {
  const script = TestRunner.debuggerModel.scripts().find(script => script.sourceURL.endsWith(urlSuffix));
  const rawLocation = TestRunner.debuggerModel.createRawLocation(script, lineNumber || 0, columnNumber || 0);
  return Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().createLiveLocation(
      rawLocation, updateDelegate.bind(null, name, dumpOnUpdate), locationPool);
};

export const createCSSLiveLocation = function(name, urlSuffix, lineNumber, columnNumber, dumpOnUpdate = true) {
  const header = TestRunner.cssModel.styleSheetHeaders().find(header => header.resourceURL().endsWith(urlSuffix));
  const rawLocation = new SDK.CSSModel.CSSLocation(header, lineNumber || 0, columnNumber || 0);
  return Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance().createLiveLocation(
      rawLocation, updateDelegate.bind(null, name, dumpOnUpdate), locationPool);
};

async function updateDelegate(name, dumpOnUpdate, liveLocation) {
  liveLocation[nameSymbol] = name;
  const hint = (liveLocation[createdSymbol] ? '[ UPDATE ]' : '[ CREATE ]');
  liveLocation[createdSymbol] = true;
  if (dumpOnUpdate) {
    await dumpLocation(liveLocation, hint);
  }
}

export const dumpLocation = async function(liveLocation, hint) {
  hint = hint || '[  GET   ]';
  const prefix = `${hint}  LiveLocation-${liveLocation[nameSymbol]}: `;
  const uiLocation = await liveLocation.uiLocation();

  if (!uiLocation) {
    TestRunner.addResult(prefix + 'null');
    return;
  }

  TestRunner.addResult(
      prefix + cleanupURL(uiLocation.uiSourceCode.url()) + ':' + uiLocation.lineNumber + ':' + uiLocation.columnNumber);
};

export const GC = async () => {
  await TestRunner.evaluateInPageAsync(`new Promise(resolve =>
    GCController.asyncCollectAll(resolve))`);
};
