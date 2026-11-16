// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './extensions.js';

import {assert} from 'chai';
import {describe, it} from 'mocha';
import sinon from 'sinon';

import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';

import type * as Extensions from './extensions.js';

function extractPublicShape(value: unknown): unknown {
  if (typeof value === 'function') {
    return '<function>';
  }
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  const propertyNames: string[] = [];
  for (const property in value) {
    propertyNames.push(property);
  }
  propertyNames.sort();

  const shape: Record<string, unknown> = {};
  for (const prop of propertyNames) {
    shape[prop] = extractPublicShape(Reflect.get(value, prop));
  }
  return shape;
}

describe('ExtensionAPI', () => {
  it('exposes the expected public interface on webInspector', async () => {
    const extensionInfo: Extensions.ExtensionAPI.ExtensionDescriptor = {
      startPage: 'http://devtools-extensions.oopif.test:8000/devtools/resources/extension-main.html',
      name: 'test extension',
      exposeExperimentalAPIs: true,
      exposeWebInspectorNamespace: true,
    };

    const originalChromeDescriptor = Object.getOwnPropertyDescriptor(window, 'chrome');
    const warnStub = sinon.stub(console, 'warn');
    const iframe = document.createElement('iframe');
    renderElementIntoDOM(iframe);
    const targetWindow = iframe.contentWindow;
    assert.isNotNull(targetWindow);

    let clientPort: MessagePort|undefined;
    let serverPort: MessagePort|undefined;

    try {
      const testHook = (extensionServerClient: unknown, coreAPI: unknown): void => {
        if (typeof extensionServerClient === 'object' && extensionServerClient !== null) {
          const port = Reflect.get(extensionServerClient, '_port');
          if (port instanceof MessagePort) {
            clientPort = port;
          }
        }
        if (typeof coreAPI === 'object' && coreAPI !== null) {
          const panels = Reflect.get(coreAPI, 'panels');
          if (typeof panels === 'object' && panels !== null) {
            Reflect.set(panels, 'themeName', 'themeNameForTest');
          }
        }
      };

      const injectedScript = self.buildExtensionAPIInjectedScript(extensionInfo, '', 'default', [], testHook);
      assert.include(injectedScript, '(function(injectedScriptId){ (');
      assert.include(injectedScript, '"exposeWebInspectorNamespace":true');
      assert.include(injectedScript, ',null,"default",[],');
      assert.include(injectedScript, 'themeNameForTest');

      Reflect.set(window, 'chrome', {});
      const registerMessagePromise =
          new Promise<MessageEvent>(resolve => targetWindow.addEventListener('message', resolve, {once: true}));

      self.injectedExtensionAPI(extensionInfo, '', 'default', [], testHook, 1, targetWindow);

      const registerMessage = await registerMessagePromise;
      assert.strictEqual(registerMessage.data, 'registerExtension');
      assert.lengthOf(registerMessage.ports, 1);
      serverPort = registerMessage.ports[0];

      assert.exists(window.webInspector);
      assert.deepEqual(extractPublicShape(window.webInspector), {
        inspectedWindow: {
          eval: '<function>',
          getResources: '<function>',
          onResourceAdded: {
            addListener: '<function>',
            removeListener: '<function>',
          },
          onResourceContentCommitted: {
            addListener: '<function>',
            removeListener: '<function>',
          },
          reload: '<function>',
        },
        languageServices: {
          getWasmGlobal: '<function>',
          getWasmLinearMemory: '<function>',
          getWasmLocal: '<function>',
          getWasmOp: '<function>',
          registerLanguageExtensionPlugin: '<function>',
          reportResourceLoad: '<function>',
          unregisterLanguageExtensionPlugin: '<function>',
        },
        network: {
          addRequestHeaders: '<function>',
          getHAR: '<function>',
          onFinished: {
            addListener: '<function>',
            removeListener: '<function>',
          },
          onNavigated: {
            addListener: '<function>',
            removeListener: '<function>',
          },
          onRequestFinished: {
            addListener: '<function>',
            removeListener: '<function>',
          },
        },
        panels: {
          SearchAction: {
            CancelSearch: 'cancelSearch',
            NextSearchResult: 'nextSearchResult',
            PerformSearch: 'performSearch',
            PreviousSearchResult: 'previousSearchResult',
          },
          create: '<function>',
          elements: {
            createSidebarPane: '<function>',
            onSelectionChanged: {
              addListener: '<function>',
              removeListener: '<function>',
            },
          },
          network: {
            show: '<function>',
          },
          openResource: '<function>',
          setOpenResourceHandler: '<function>',
          setThemeChangeHandler: '<function>',
          sources: {
            createSidebarPane: '<function>',
            onSelectionChanged: {
              addListener: '<function>',
              removeListener: '<function>',
            },
          },
          themeName: 'themeNameForTest',
        },
        performance: {
          onProfilingStarted: {
            addListener: '<function>',
            removeListener: '<function>',
          },
          onProfilingStopped: {
            addListener: '<function>',
            removeListener: '<function>',
          },
        },
        recorder: {
          createView: '<function>',
          registerRecorderExtensionPlugin: '<function>',
          unregisterRecorderExtensionPlugin: '<function>',
        },
        resources: {
          addRequestHeaders: '<function>',
          getHAR: '<function>',
          onFinished: {
            addListener: '<function>',
            removeListener: '<function>',
          },
          onNavigated: {
            addListener: '<function>',
            removeListener: '<function>',
          },
          onRequestFinished: {
            addListener: '<function>',
            removeListener: '<function>',
          },
        },
      });

      assert.strictEqual(Reflect.get(window.webInspector, 'resources'), window.webInspector.network);
      assert.strictEqual(Reflect.get(window.webInspector.network, 'onFinished'),
                         window.webInspector.network.onRequestFinished);
      assert.deepEqual(warnStub.args, [
        ['network.onFinished is deprecated. Use network.onRequestFinished instead'],
        ['webInspector.resources is deprecated. Use webInspector.network instead'],
      ]);
    } finally {
      warnStub.restore();
      clientPort?.close();
      serverPort?.close();
      iframe.remove();
      delete window.webInspector;
      if (originalChromeDescriptor) {
        Object.defineProperty(window, 'chrome', originalChromeDescriptor);
      } else {
        Reflect.deleteProperty(window, 'chrome');
      }
    }
  });
});
