// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {MockProtocolBackend} from '../../testing/MockScopeChain.js';
import {SnapshotTester} from '../../testing/SnapshotTester.js';
import * as Bindings from '../bindings/bindings.js';
import * as Workspace from '../workspace/workspace.js';

import * as SourceMapScopes from './source_map_scopes.js';

const {urlString} = Platform.DevToolsPath;

describeWithMockConnection('FunctionCodeResolver', function() {
  const snapshotTester = new SnapshotTester(this, import.meta);

  const URL = urlString`file:///tmp/example.js`;
  let target: SDK.Target.Target;
  let backend: MockProtocolBackend;

  beforeEach(() => {
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: true});
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      resourceMapping,
      targetManager,
      ignoreListManager,
      workspace,
    });
    backend = new MockProtocolBackend();
    target = createTarget();
  });

  // This was minified with 'esbuild --sourcemap=linked --minify' v0.25.9.
  const exampleSource =
      `"use strict";function fibonacci(e){return e<=1?1:fibonacci(e-1)+fibonacci(e-2)}const btn=document.querySelector("button"),params=new URLSearchParams(location.search);btn.addEventListener("click",()=>{console.log(fibonacci(Number(params.get("x")))),btn.style.backgroundColor="red"});const input=document.querySelector('input[type="text"]');input.addEventListener("input",()=>{console.log(fibonacci(Number(params.get("x"))))});\n//# sourceMappingURL=file:///tmp/example.js.min.map`;
  const exampleRawPerformanceData = new Map([
    [
      1, new Map([
        [1, 1],       // "use strict"
        [35, 67],     // starting } of fibonacci
        [43, 23],     // e<=1
        [50, 1000],   // fibonacci(e-1)
        [65, 999],    // fibonacci(e-2)
        [79, 13],     // ending } of fibonacci
        [213, 5000],  // fibonacci(Number(params.get("x")))
        [274, 333],   // btn.style.backgroundColor="red"
      ])
    ],
  ]);
  const exampleSourceMap = {
    version: 3,
    sources: ['index.js'],
    sourcesContent: [
      'function fibonacci(num) {\n  if (num <= 1) return 1;\n\n  return fibonacci(num - 1) + fibonacci(num - 2);\n}\n\nconst btn = document.querySelector(\'button\');\nconst params = new URLSearchParams(location.search);\n\nbtn.addEventListener(\'click\', () => {\n  console.log(fibonacci(Number(params.get(\'x\'))));\n  btn.style.backgroundColor = \'red\';\n});\n\nconst input = document.querySelector(\'input[type="text"]\');\ninput.addEventListener(\'input\', () => {\n  console.log(fibonacci(Number(params.get(\'x\'))));\n});\n'
    ],
    mappings:
        'aAAA,SAAS,UAAUA,EAAK,CACtB,OAAIA,GAAO,EAAU,EAEd,UAAUA,EAAM,CAAC,EAAI,UAAUA,EAAM,CAAC,CAC/C,CAEA,MAAM,IAAM,SAAS,cAAc,QAAQ,EACrC,OAAS,IAAI,gBAAgB,SAAS,MAAM,EAElD,IAAI,iBAAiB,QAAS,IAAM,CAClC,QAAQ,IAAI,UAAU,OAAO,OAAO,IAAI,GAAG,CAAC,CAAC,CAAC,EAC9C,IAAI,MAAM,gBAAkB,KAC9B,CAAC,EAED,MAAM,MAAQ,SAAS,cAAc,oBAAoB,EACzD,MAAM,iBAAiB,QAAS,IAAM,CACpC,QAAQ,IAAI,UAAU,OAAO,OAAO,IAAI,GAAG,CAAC,CAAC,CAAC,CAChD,CAAC',
    names: ['num']
  };

  describe('getFunctionCodeFromLocation', () => {
    const source = exampleSource;
    const sourceMapUrl = 'file:///tmp/example.js.min.map';
    const sourceMapContent = JSON.stringify(exampleSourceMap);
    const sourceMapContentButNoSources = JSON.stringify({...exampleSourceMap, sourcesContent: undefined});

    const testCases = [
      {
        name: '[no source maps] lookup named function',
        url: URL,
        line: 0,
        column: 35,
        sourceMap: null,
        expectedCode: `(e) {\n\treturn e <= 1 ? 1 : fibonacci(e - 1) + fibonacci(e - 2)\n}\n`
      },
      {
        name: '[no source maps] lookup anonymous function',
        url: URL,
        line: 0,
        column: 201,
        sourceMap: null,
        expectedCode:
            `() => {\n\tconsole.log(fibonacci(Number(params.get(\"x\")))),\n\tbtn.style.backgroundColor = \"red\"\n}\n`
      },

      {
        name: '[source maps] lookup named function with generated location',
        url: URL,
        line: 0,
        column: 35,
        sourceMap: {url: sourceMapUrl, content: sourceMapContent},
        expectedCode:
            `fibonacci(num) {\n  if (num <= 1) return 1;\n\n  return fibonacci(num - 1) + fibonacci(num - 2);\n}\n\n`
      },
      {
        name: '[source maps] lookup named function with original location',
        url: urlString`file:///tmp/index.js`,
        line: 1,
        column: 5,
        sourceMap: {url: sourceMapUrl, content: sourceMapContent},
        expectedCode:
            `fibonacci(num) {\n  if (num <= 1) return 1;\n\n  return fibonacci(num - 1) + fibonacci(num - 2);\n}\n\n`
      },

      {
        name: '[source maps, no source contents] lookup named function with generated location',
        url: URL,
        line: 0,
        column: 35,
        sourceMap: {url: sourceMapUrl, content: sourceMapContentButNoSources},
        // TODO: createFromAst does not include function identifiers in the created scope start position.
        expectedCode: `(e) {\n\treturn e <= 1 ? 1 : fibonacci(e - 1) + fibonacci(e - 2)\n}\n`
      },
      {
        name: '[source maps, no source contents] lookup named function with original location',
        url: urlString`file:///tmp/index.js`,
        line: 1,
        column: 5,
        sourceMap: {url: sourceMapUrl, content: sourceMapContentButNoSources},
        expectedCode: `(e) {\n\treturn e <= 1 ? 1 : fibonacci(e - 1) + fibonacci(e - 2)\n}\n`
      },

      {
        name: '[source maps] lookup anonymous function with generated location',
        url: URL,
        line: 0,
        column: 201,
        sourceMap: {url: sourceMapUrl, content: sourceMapContent},
        expectedCode:
            `() => {\n  console.log(fibonacci(Number(params.get('x'))));\n  btn.style.backgroundColor = 'red';\n}`
      },
      {
        name: '[source maps] lookup anonymous function with original location',
        url: urlString`file:///tmp/index.js`,
        line: 10,
        column: 3,
        sourceMap: {url: sourceMapUrl, content: sourceMapContent},
        expectedCode:
            `() => {\n  console.log(fibonacci(Number(params.get('x'))));\n  btn.style.backgroundColor = 'red';\n}`
      },

      {
        name: '[source maps, no source contents] lookup anonymous function with generated location',
        url: URL,
        line: 0,
        column: 201,
        sourceMap: {url: sourceMapUrl, content: sourceMapContentButNoSources},
        expectedCode:
            `() => {\n\tconsole.log(fibonacci(Number(params.get(\"x\")))),\n\tbtn.style.backgroundColor = \"red\"\n}\n`
      },
      {
        name: '[source maps, no source contents] lookup anonymous function with original location',
        url: urlString`file:///tmp/index.js`,
        line: 10,
        column: 3,
        sourceMap: {url: sourceMapUrl, content: sourceMapContentButNoSources},
        expectedCode:
            `() => {\n\tconsole.log(fibonacci(Number(params.get(\"x\")))),\n\tbtn.style.backgroundColor = \"red\"\n}\n`
      },
    ];

    for (const testCase of testCases) {
      it(testCase.name, async function() {
        const script = await backend.addScript(target, {url: URL, content: source}, testCase.sourceMap);

        // TODO(crbug.com/368222773): this should probably be done inside backend.addScript, but currently
        // some tests fail (BreakpointManager.test.ts, NamesResolver.test.ts)
        const sourceMap = script.sourceMap();
        if (sourceMap) {
          sourceMap.hasScopeInfo();  // Trigger source map processing.
          await sourceMap.scopesFallbackPromiseForTest;
        }

        // Add raw performance data to script's UISourceCode.
        const uiSourceCode =
            Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().uiSourceCodeForScript(script);
        assert.isOk(uiSourceCode);
        uiSourceCode.setDecorationData(Workspace.UISourceCode.DecoratorType.PERFORMANCE, exampleRawPerformanceData);

        // Add mapped performance data to source map url's UISourceCode.
        if (sourceMap) {
          const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
          assert.isOk(debuggerModel);
          const url = sourceMap.sourceURLForSourceIndex(0);
          assert.isOk(url);
          const uiSourceCode =
              Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().uiSourceCodeForSourceMapSourceURL(
                  debuggerModel, url, false);
          assert.isOk(uiSourceCode);

          const mappedPerformanceData =
              Workspace.UISourceCode.createMappedProfileData(exampleRawPerformanceData, (line, column) => {
                const entry = sourceMap.findEntry(line, column);
                if (entry?.sourceURL) {
                  return [entry.sourceLineNumber, entry.sourceColumnNumber];
                }

                return null;
              });
          uiSourceCode.setDecorationData(Workspace.UISourceCode.DecoratorType.PERFORMANCE, mappedPerformanceData);
        }

        const code = await SourceMapScopes.FunctionCodeResolver.getFunctionCodeFromLocation(
            target, testCase.url, testCase.line, testCase.column, {contextLength: 30, appendProfileData: true});
        assert.isOk(code);
        assert.strictEqual(code.code, testCase.expectedCode);
        snapshotTester.assert(this, code.codeWithContext);
      });
    }
  });
});
