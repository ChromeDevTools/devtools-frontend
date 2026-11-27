// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../../core/common/common.js';
import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as TextUtils from '../../../core/text_utils/text_utils.js';
import {assertIsError, assertIsResult} from '../../../testing/AiAssistanceHelpers.js';
import {setupLocaleHooks} from '../../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../../testing/TestUniverse.js';
import {
  createContentProviderUISourceCodes,
  createFileSystemUISourceCode,
} from '../../../testing/UISourceCodeHelpers.js';
import * as Bindings from '../../bindings/bindings.js';
import * as Workspace from '../../workspace/workspace.js';
import * as AiAssistance from '../ai_assistance.js';

const {urlString} = Platform.DevToolsPath;

describe('SearchInSources helpers', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  const exampleOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com');
  const establishedLock: AiAssistance.Tool.OriginLockState = {
    status: 'ESTABLISHED_ORIGIN',
    origin: exampleOrigin,
  };

  let getContentTool: AiAssistance.GetSourceContent.GetSourceContentTool;
  let universe: TestUniverse;

  function originContext(
      originLock: AiAssistance.Tool.OriginLockState = establishedLock,
      ): AiAssistance.Tool.BaseToolCapability&AiAssistance.Tool.OriginLockCapability {
    return {getOriginLock: () => originLock};
  }

  function createWorkspaceSources(
      items: Array<{
        url: Platform.DevToolsPath.UrlString,
        mimeType?: string,
        content?: string,
        resourceType?: Common.ResourceType.ResourceType,
      }>,
      projectId = 'PROJECT_ID',
      ): {
    project: Bindings.ContentProviderBasedProject.ContentProviderBasedProject,
    uiSourceCodes: Workspace.UISourceCode.UISourceCode[],
  } {
    return createContentProviderUISourceCodes({
      items: items.map(item => ({...item, mimeType: item.mimeType ?? 'application/javascript'})),
      projectType: Workspace.Workspace.projectTypes.Network,
      projectId,
      universe,
    });
  }

  function registerSourceOrFail(uiSourceCode: Workspace.UISourceCode.UISourceCode): number {
    const id = AiAssistance.ListSources.ListSourcesTool.registerSource(uiSourceCode);
    if (id === null) {
      assert.fail(`Expected numeric ID for ${uiSourceCode.url()}`);
    }
    return id;
  }

  function runWorkspace(
      query: string,
      opts: Partial<AiAssistance.SearchInSources.SearchWorkspaceSourcesOptions> = {},
      ): Promise<AiAssistance.Tool.DataHandlerResult<string>> {
    return AiAssistance.SearchInSources.searchWorkspaceSources({
      query,
      caseSensitive: false,
      context: originContext(),
      originLock: establishedLock,
      establishedOrigin: exampleOrigin,
      ...opts,
    });
  }

  function runSingle(
      id: number,
      query: string,
      opts: Partial<AiAssistance.SearchInSources.SearchSingleSourceOptions> = {},
      ): Promise<AiAssistance.Tool.DataHandlerResult<string>> {
    return AiAssistance.SearchInSources.searchSingleSource({
      id,
      query,
      caseSensitive: false,
      context: originContext(),
      originLock: establishedLock,
      establishedOrigin: exampleOrigin,
      ...opts,
    });
  }

  beforeEach(() => {
    getContentTool = new AiAssistance.GetSourceContent.GetSourceContentTool();
    AiAssistance.ListSources.ListSourcesTool.reset();

    universe = new TestUniverse();
    const {workspace, ignoreListManager, debuggerWorkspaceBinding} = universe;

    sinon.stub(Workspace.Workspace.WorkspaceImpl, 'instance').returns(workspace);
    sinon.stub(Workspace.IgnoreListManager.IgnoreListManager, 'instance').returns(ignoreListManager);
    sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, 'instance')
        .returns(debuggerWorkspaceBinding);
  });

  afterEach(() => {
    AiAssistance.ListSources.ListSourcesTool.reset();
  });

  it('returns empty workspace message when no source files exist for origin', async () => {
    const response = await runWorkspace('foo');
    assertIsResult(response);
    assert.strictEqual(response.result, 'No source files found for the current origin.');
  });

  it('searches workspace files before listSources is called and registers IDs compatible with getSourceContent',
     async () => {
       createWorkspaceSources([
         {url: urlString`https://example.com/a.js`, content: 'const a = 1;\nfetch("/api/checkout");'},
         {url: urlString`https://example.com/b.js`, content: 'function checkout() { return true; }'},
       ]);

       const response = await runWorkspace('checkout');
       assertIsResult(response);
       assert.strictEqual(response.result, [
         'line;offset;preview',
         '# 1;/a.js',
         '2;25;fetch("/api/checkout");',
         '# 2;/b.js',
         '1;9;function checkout() { return true; }',
       ].join('\n'));

       const contentResponse = await getContentTool.handler({id: 1, offset: 25}, originContext());
       assertIsResult(contentResponse);
       assert.include(contentResponse.result.content, '```\ncheckout");\n```');
     });

  it('excludes cross-origin, ignore-listed, cross-origin source-map, and binary files from workspace search',
     async () => {
       const {uiSourceCodes: sameOrigin} = createWorkspaceSources([
         {url: urlString`https://example.com/app.js`, content: 'const secret = "ok";'},
         {url: urlString`https://example.com/ignored.js`, content: 'const secret = "ignored";'},
         {url: urlString`https://example.com/logo.png`, mimeType: 'image/png', content: 'secret-binary'},
       ]);
       sinon.stub(sameOrigin[1], 'isIgnoreListed').returns(true);

       const {project: smProject, uiSourceCodes: crossSm} =
           createWorkspaceSources([{
                                    url: urlString`https://victim.example/secret.ts`,
                                    mimeType: 'text/typescript',
                                    resourceType: Common.ResourceType.resourceTypes.SourceMapScript,
                                    content: 'const secret = "cross";',
                                  }],
                                  'jsSourceMaps::target:https://example.com');
       sinon.stub(smProject, 'securityOrigin').returns(exampleOrigin);

       const {uiSourceCodes: crossOrigin} = createWorkspaceSources(
           [{url: urlString`https://other.example/app.js`, content: 'const secret = "other";'}], 'OTHER_PROJECT');

       const excluded = [sameOrigin[1], sameOrigin[2], crossSm[0], crossOrigin[0]];
       const searchSpies = excluded.map(file => sinon.spy(file, 'searchInContent'));
       const loadSpies = excluded.map(file => sinon.spy(file, 'requestContentData'));

       const response = await runWorkspace('secret');
       assertIsResult(response);
       assert.strictEqual(response.result,
                          ['line;offset;preview', '# 1;/app.js', '1;6;const secret = "ok";'].join('\n'));
       assert.isFalse(searchSpies.some(spy => spy.called));
       assert.isFalse(loadSpies.some(spy => spy.called));
     });

  it('skips loading uncached files that fail Phase 1 pre-filter', async () => {
    const {uiSourceCodes} = createWorkspaceSources([
      {url: urlString`https://example.com/match.js`, content: 'const needle = 42;'},
      {url: urlString`https://example.com/miss.js`, content: 'const haystack = 0;'},
    ]);
    const matchLoadSpy = sinon.spy(uiSourceCodes[0], 'requestContentData');
    const missLoadSpy = sinon.spy(uiSourceCodes[1], 'requestContentData');

    const response = await runWorkspace('needle');
    assertIsResult(response);
    assert.strictEqual(response.result, ['line;offset;preview', '# 1;/match.js', '1;6;const needle = 42;'].join('\n'));
    sinon.assert.calledOnce(matchLoadSpy);
    sinon.assert.notCalled(missLoadSpy);
  });

  it('searches dirty working copy content with offsets aligned to getSourceContent', async () => {
    const {uiSourceCodes} =
        createWorkspaceSources([{url: urlString`https://example.com/dirty.js`, content: 'const original = 1;'}]);
    uiSourceCodes[0].setWorkingCopy('const edited = 1;');

    const response = await runWorkspace('edited');
    assertIsResult(response);
    assert.strictEqual(response.result, ['line;offset;preview', '# 1;/dirty.js', '1;6;const edited = 1;'].join('\n'));

    const contentResponse = await getContentTool.handler({id: 1, offset: 6}, originContext());
    assertIsResult(contentResponse);
    assert.include(contentResponse.result.content, '```\nedited = 1;\n```');
  });

  it('skips errored or rejected files during workspace search without aborting remaining files', async () => {
    const {uiSourceCodes} = createWorkspaceSources([
      {url: urlString`https://example.com/rejects.js`, content: 'const target = 1;'},
      {url: urlString`https://example.com/errors.js`, content: 'const target = 2;'},
      {url: urlString`https://example.com/ok.js`, content: 'const target = 3;'},
    ]);
    sinon.stub(uiSourceCodes[0], 'searchInContent').rejects(new Error('search failed'));
    sinon.stub(uiSourceCodes[1], 'requestContentData').resolves({error: 'boom'});

    const response = await runWorkspace('target');
    assertIsResult(response);
    assert.strictEqual(response.result, ['line;offset;preview', '# 3;/ok.js', '1;6;const target = 3;'].join('\n'));
  });

  it('supports case-insensitive, case-sensitive, and literal regex-metacharacter queries', async () => {
    createWorkspaceSources([
      {url: urlString`https://example.com/case.js`, content: 'foo\nFoo\na.b(c)+[0]\naxbc0'},
    ]);

    const insensitive = await runWorkspace('Foo');
    assertIsResult(insensitive);
    assert.strictEqual(insensitive.result, ['line;offset;preview', '# 1;/case.js', '1;0;foo', '2;4;Foo'].join('\n'));

    const sensitive = await runWorkspace('Foo', {caseSensitive: true});
    assertIsResult(sensitive);
    assert.strictEqual(sensitive.result, ['line;offset;preview', '# 1;/case.js', '2;4;Foo'].join('\n'));

    const literal = await runWorkspace('a.b(c)+[0]');
    assertIsResult(literal);
    assert.strictEqual(literal.result, ['line;offset;preview', '# 1;/case.js', '3;8;a.b(c)+[0]'].join('\n'));
  });

  it('aligns offsets with getSourceContent across LF, CRLF, and multi-match single lines', async () => {
    createWorkspaceSources([
      {url: urlString`https://example.com/lf.js`, content: 'line1\n  const markerLF = 1;'},
      {url: urlString`https://example.com/crlf.js`, content: 'line1\r\n  const markerCRLF = 2;\r\nline3'},
      {url: urlString`https://example.com/multi.js`, content: 'const a = "dup", b = "dup";'},
    ]);

    const lfResponse = await runWorkspace('markerLF');
    assertIsResult(lfResponse);
    assert.include(lfResponse.result, '2;14;const markerLF = 1;');
    const lfSlice = await getContentTool.handler({id: 1, offset: 14}, originContext());
    assertIsResult(lfSlice);
    assert.include(lfSlice.result.content, '```\nmarkerLF = 1;\n```');

    const crlfResponse = await runWorkspace('markerCRLF');
    assertIsResult(crlfResponse);
    assert.include(crlfResponse.result, '2;15;const markerCRLF = 2;');
    const crlfSlice = await getContentTool.handler({id: 2, offset: 15}, originContext());
    assertIsResult(crlfSlice);
    assert.include(crlfSlice.result.content, '```\nmarkerCRLF = 2;\r\nline3\n```');

    const multiResponse = await runWorkspace('dup');
    assertIsResult(multiResponse);
    assert.strictEqual(multiResponse.result, [
      'line;offset;preview',
      '# 3;/multi.js',
      '1;11;const a = "dup", b = "dup";',
      '1;22;const a = "dup", b = "dup";',
    ].join('\n'));
    const multiSlice = await getContentTool.handler({id: 3, offset: 22}, originContext());
    assertIsResult(multiSlice);
    assert.include(multiSlice.result.content, '```\ndup";\n```');
  });

  it('searches registered non-network and ignore-listed files by id without calling listSources', async () => {
    const {uiSourceCode: fsFile} = createFileSystemUISourceCode({
      url: urlString`file:///workspace/local.js`,
      mimeType: 'application/javascript',
      content: 'const target = "fs";',
      fileSystemPath: 'file:///workspace',
      universe,
    });
    const fsId = registerSourceOrFail(fsFile);

    const {uiSourceCodes} = createWorkspaceSources(
        [{url: urlString`https://example.com/ignored.js`, content: 'const target = "ignored";'}]);
    sinon.stub(uiSourceCodes[0], 'isIgnoreListed').returns(true);
    const ignoredId = registerSourceOrFail(uiSourceCodes[0]);

    const fileOrigin = SDK.SecurityOrigin.SecurityOrigin.create('file:///workspace/local.js');
    const fileLock: AiAssistance.Tool.OriginLockState = {status: 'ESTABLISHED_ORIGIN', origin: fileOrigin};
    const fsResponse = await runSingle(fsId, 'target', {
      context: originContext(fileLock),
      originLock: fileLock,
      establishedOrigin: fileOrigin,
    });
    assertIsResult(fsResponse);
    assert.strictEqual(fsResponse.result,
                       ['line;offset;preview', `# ${fsId};workspace/local.js`, '1;6;const target = "fs";'].join('\n'));

    const ignoredResponse = await runSingle(ignoredId, 'target');
    assertIsResult(ignoredResponse);
    assert.strictEqual(
        ignoredResponse.result,
        ['line;offset;preview', `# ${ignoredId};/ignored.js`, '1;6;const target = "ignored";'].join('\n'));
  });

  it('rejects invalid, unknown, or cross-origin file IDs without loading content', async () => {
    assertIsError(await runSingle(0, 'foo'), 'Unable to find file.');
    assertIsError(await runSingle(999, 'foo'), 'Unable to find file.');

    const {uiSourceCodes} =
        createWorkspaceSources([{url: urlString`https://attacker.com/secret.js`, content: 'const foo = 1;'}]);
    const crossId = registerSourceOrFail(uiSourceCodes[0]);
    const loadSpy = sinon.spy(uiSourceCodes[0], 'requestContentData');

    assertIsError(await runSingle(crossId, 'foo'), 'Unable to find file.');
    sinon.assert.notCalled(loadSpy);
  });

  it('propagates load errors and rejects non-text content in single-file search', async () => {
    const {uiSourceCodes} = createWorkspaceSources([
      {url: urlString`https://example.com/fail.js`, content: 'const x = 1;'},
      {url: urlString`https://example.com/binary.js`, content: ''},
    ]);
    sinon.stub(uiSourceCodes[0], 'requestContentData').resolves({error: 'Failed'});
    assertIsError(await runSingle(registerSourceOrFail(uiSourceCodes[0]), 'x'), 'Failed to load file content: Failed');

    const binaryData = new TextUtils.ContentData.ContentData('AAAA', true, 'image/png');
    sinon.stub(uiSourceCodes[1], 'requestContentData').resolves(binaryData);
    sinon.stub(uiSourceCodes[1], 'workingCopyContentData').returns(binaryData);
    assertIsError(await runSingle(registerSourceOrFail(uiSourceCodes[1]), 'A'), 'File content is not text.');
  });

  it('clips long minified previews while omitting leading ellipsis on indented lines', async () => {
    createWorkspaceSources([
      {
        url: urlString`https://example.com/bundle.min.js`,
        content: 'x'.repeat(1_000) + 'needle' +
            'y'.repeat(994),
      },
      {url: urlString`https://example.com/indented.js`, content: '    const needle = 1;'},
    ]);

    const response = await runWorkspace('needle');
    assertIsResult(response);
    const lines = response.result.split('\n');
    const [lineStr, offsetStr, preview] = lines[2].split(';');
    assert.strictEqual(lineStr, '1');
    assert.strictEqual(offsetStr, '1000');
    assert.isAtMost(preview.length, 122);
    assert.isTrue(preview.startsWith('…'));
    assert.isTrue(preview.endsWith('…'));
    assert.include(preview, 'needle');
    assert.strictEqual(lines[4], '1;10;const needle = 1;');
  });

  it('returns no matches message in both workspace and single-file modes', async () => {
    const {uiSourceCodes} =
        createWorkspaceSources([{url: urlString`https://example.com/app.js`, content: 'const present = 1;'}]);
    const id = registerSourceOrFail(uiSourceCodes[0]);

    const workspaceResponse = await runWorkspace('absent');
    assertIsResult(workspaceResponse);
    assert.strictEqual(workspaceResponse.result, 'No matches found.');

    const singleResponse = await runSingle(id, 'absent');
    assertIsResult(singleResponse);
    assert.strictEqual(singleResponse.result, 'No matches found.');
  });

  it('caps matches at 5 per file in workspace mode and 50 in single-file mode', async () => {
    const tenLines = Array.from({length: 10}, (_, index) => `const hit${index} = 1;`).join('\n');
    const sixtyLines = Array.from({length: 60}, (_, index) => `const hit${index} = 1;`).join('\n');
    const {uiSourceCodes} = createWorkspaceSources([
      {url: urlString`https://example.com/many.js`, content: tenLines},
      {url: urlString`https://example.com/few.js`, content: 'const hitA = 1;\nconst hitB = 2;'},
      {url: urlString`https://example.com/huge.js`, content: sixtyLines},
    ]);

    const workspaceResponse = await runWorkspace('hit');
    assertIsResult(workspaceResponse);
    assert.include(workspaceResponse.result, 'const hit4 = 1;');
    assert.notInclude(workspaceResponse.result, 'const hit5 = 1;');
    assert.include(workspaceResponse.result, 'const hitB = 2;');
    assert.include(workspaceResponse.result, 'Omitted 60 additional matches');

    const singleTenResponse = await runSingle(registerSourceOrFail(uiSourceCodes[0]), 'hit');
    assertIsResult(singleTenResponse);
    assert.include(singleTenResponse.result, 'const hit9 = 1;');
    assert.notInclude(singleTenResponse.result, 'Omitted');

    const singleSixtyResponse = await runSingle(registerSourceOrFail(uiSourceCodes[2]), 'hit');
    assertIsResult(singleSixtyResponse);
    assert.include(singleSixtyResponse.result, 'const hit49 = 1;');
    assert.notInclude(singleSixtyResponse.result, 'const hit50 = 1;');
    assert.include(singleSixtyResponse.result, 'Omitted 10 additional matches');
  });

  it('stops scanning later batches and skips excess Phase 2 loads after 50 total matches', async () => {
    const fiveMatches = Array.from({length: 5}, (_, index) => `const boom${index} = 1;`).join('\n');
    const {uiSourceCodes} = createWorkspaceSources(Array.from(
        {length: 25}, (_, index) => ({url: urlString`https://example.com/file-${index}.js`, content: fiveMatches})));
    const searchSpies = uiSourceCodes.map(file => sinon.spy(file, 'searchInContent'));
    const loadSpies = uiSourceCodes.map(file => sinon.spy(file, 'requestContentData'));

    const response = await runWorkspace('boom');
    assertIsResult(response);
    assert.include(response.result, '# 10;/file-9.js');
    assert.notInclude(response.result, '# 11;/file-10.js');
    assert.include(response.result, '15 remaining files were not scanned');

    assert.isTrue(loadSpies.slice(0, 10).every(spy => spy.calledOnce));
    assert.isFalse(loadSpies.slice(10, 20).some(spy => spy.called));
    assert.isFalse(searchSpies.slice(20, 25).some(spy => spy.called));
    assert.isFalse(loadSpies.slice(20, 25).some(spy => spy.called));
  });

  it('emits total-cap footer without per-file notice when total cap truncates a file with five or fewer matches',
     async () => {
       const fourMatches = Array.from({length: 4}, (_, index) => `const capHit${index} = 1;`).join('\n');
       createWorkspaceSources(Array.from(
           {length: 13}, (_, index) => ({url: urlString`https://example.com/file-${index}.js`, content: fourMatches})));

       const response = await runWorkspace('capHit');
       assertIsResult(response);
       const [, lastFileSection] = response.result.split('# 13;/file-12.js');
       assert.isDefined(lastFileSection);
       assert.include(lastFileSection, 'const capHit1 = 1;');
       assert.notInclude(lastFileSection, 'const capHit2 = 1;');
       assert.notInclude(response.result, 'exceeding 5 matches each');
       assert.include(
           response.result,
           '(Stopped after reaching 50 total matches; omitted 2 additional matches in the last matched file. ' +
               'Refine query or pass id to search a specific file.)');
       assert.notInclude(response.result, 'remaining files were not scanned');
     });

  it('skips unloaded external source-map files in workspace search while allowing search by id or after loading',
     async () => {
       const project = new Bindings.ContentProviderBasedProject.ContentProviderBasedProject(
           universe.workspace, 'SOURCEMAP_PROJECT', Workspace.Workspace.projectTypes.Network, 'Test', false);
       const externalUrl = urlString`https://example.com/src/external.ts`;
       const externalFile = project.createUISourceCode(externalUrl, Common.ResourceType.resourceTypes.SourceMapScript);
       const pageResourceLoader = sinon.createStubInstance(SDK.PageResourceLoader.PageResourceLoader);
       pageResourceLoader.loadResource.resolves({content: 'const sharedToken = "external";'});
       const externalProvider = new SDK.CompilerSourceMappingContentProvider.CompilerSourceMappingContentProvider(
           externalUrl,
           Common.ResourceType.resourceTypes.SourceMapScript,
           {target: universe.createTarget(), frameId: null, initiatorUrl: urlString`https://example.com/app.js`},
           pageResourceLoader,
       );
       project.addUISourceCodeWithProvider(externalFile, externalProvider, null, 'text/typescript');

       const inlineUrl = urlString`https://example.com/src/inline.ts`;
       const inlineFile = project.createUISourceCode(inlineUrl, Common.ResourceType.resourceTypes.SourceMapScript);
       const inlineProvider = TextUtils.StaticContentProvider.StaticContentProvider.fromString(
           inlineUrl, Common.ResourceType.resourceTypes.SourceMapScript, 'const sharedToken = "inline";');
       project.addUISourceCodeWithProvider(inlineFile, inlineProvider, null, 'text/typescript');

       const externalSearchSpy = sinon.spy(externalFile, 'searchInContent');
       const externalLoadSpy = sinon.spy(externalFile, 'requestContentData');

       const workspaceResponse = await runWorkspace('sharedToken');
       assertIsResult(workspaceResponse);
       assert.strictEqual(workspaceResponse.result, [
         'line;offset;preview',
         '# 2;/src/inline.ts',
         '1;6;const sharedToken = "inline";',
         '(Skipped 1 unloaded external source-map files; pass their id from listSources to search a specific file.)',
       ].join('\n'));
       sinon.assert.notCalled(externalSearchSpy);
       sinon.assert.notCalled(externalLoadSpy);

       const singleResponse = await runSingle(1, 'sharedToken');
       assertIsResult(singleResponse);
       assert.strictEqual(
           singleResponse.result,
           ['line;offset;preview', '# 1;/src/external.ts', '1;6;const sharedToken = "external";'].join('\n'));

       const loadedWorkspaceResponse = await runWorkspace('sharedToken');
       assertIsResult(loadedWorkspaceResponse);
       assert.include(loadedWorkspaceResponse.result, '# 1;/src/external.ts');
       assert.include(loadedWorkspaceResponse.result, '# 2;/src/inline.ts');
       assert.notInclude(loadedWorkspaceResponse.result, 'Skipped');
     });

  it('prioritizes authored source-mapped files ahead of deployed bundles', async () => {
    const {project} = createWorkspaceSources([
      {url: urlString`https://example.com/bundle.js`, content: 'const shared = "bundle";'},
      {
        url: urlString`webpack:///./src/index.ts`,
        mimeType: 'text/typescript',
        resourceType: Common.ResourceType.resourceTypes.SourceMapScript,
        content: 'const shared = "authored";',
      },
    ]);
    sinon.stub(project, 'securityOrigin').returns(exampleOrigin);

    const response = await runWorkspace('shared');
    assertIsResult(response);
    assert.strictEqual(response.result, [
      'line;offset;preview',
      '# 2;webpack:///./src/index.ts',
      '1;6;const shared = "authored";',
      '# 1;/bundle.js',
      '1;6;const shared = "bundle";',
    ].join('\n'));
  });

  it('halts after awaited single-file read when aborted mid-flight', async () => {
    const {uiSourceCodes} =
        createWorkspaceSources([{url: urlString`https://example.com/single.js`, content: 'const singleTarget = 1;'}]);
    const id = registerSourceOrFail(uiSourceCodes[0]);
    const controller = new AbortController();
    sinon.stub(uiSourceCodes[0], 'requestContentData').callsFake(async () => {
      controller.abort();
      return new TextUtils.ContentData.ContentData('const singleTarget = 1;', false, 'application/javascript');
    });

    assertIsError(await runSingle(id, 'singleTarget', {signal: controller.signal}), 'Aborted');
  });

  it('halts after Phase 1 chunk when aborted or navigated mid-scan', async () => {
    const batch1Items = Array.from(
        {length: 20}, (_, index) => ({url: urlString`https://example.com/b1-${index}.js`, content: 'const miss = 1;'}));
    const {uiSourceCodes} = createWorkspaceSources(
        [...batch1Items, {url: urlString`https://example.com/b2-0.js`, content: 'const target = 2;'}]);
    const batch2SearchSpy = sinon.spy(uiSourceCodes[20], 'searchInContent');

    let originLock: AiAssistance.Tool.OriginLockState = establishedLock;
    sinon.stub(uiSourceCodes[0], 'searchInContent').callsFake(async () => {
      originLock = {status: 'BLOCKED_BY_NAVIGATION'};
      return [];
    });

    assertIsError(await runWorkspace('target', {context: {getOriginLock: () => originLock}}),
                  'Cross-origin access blocked due to navigation.');
    sinon.assert.notCalled(batch2SearchSpy);
  });

  it('halts after Phase 2 file load when cross-origin navigation occurs mid-scan', async () => {
    const {uiSourceCodes} = createWorkspaceSources([
      {url: urlString`https://example.com/p2-a.js`, content: 'const phase2Target = 1;'},
      {url: urlString`https://example.com/p2-b.js`, content: 'const phase2Target = 2;'},
    ]);
    let originLock: AiAssistance.Tool.OriginLockState = establishedLock;
    sinon.stub(uiSourceCodes[0], 'requestContentData').callsFake(async () => {
      originLock = {status: 'BLOCKED_BY_NAVIGATION'};
      return new TextUtils.ContentData.ContentData('const phase2Target = 1;', false, 'application/javascript');
    });
    const loadBSpy = sinon.spy(uiSourceCodes[1], 'requestContentData');

    assertIsError(await runWorkspace('phase2Target', {context: {getOriginLock: () => originLock}}),
                  'Cross-origin access blocked due to navigation.');
    sinon.assert.notCalled(loadBSpy);
  });

  describe('SearchInSourcesTool', () => {
    let tool: AiAssistance.SearchInSources.SearchInSourcesTool;

    beforeEach(() => {
      tool = new AiAssistance.SearchInSources.SearchInSourcesTool();
    });

    it('rejects uninitialized, navigation-blocked, and opaque origin locks', async () => {
      assertIsError(await tool.handler({query: 'foo'}, originContext({status: 'UNINITIALIZED'})),
                    'No origin established for this conversation.');
      assertIsError(await tool.handler({query: 'foo'}, originContext({status: 'BLOCKED_BY_NAVIGATION'})),
                    'Cross-origin access blocked due to navigation.');
      const opaqueOrigin = SDK.SecurityOrigin.SecurityOrigin.create('about:blank');
      assertIsError(
          await tool.handler({query: 'foo'}, originContext({status: 'ESTABLISHED_ORIGIN', origin: opaqueOrigin})),
          'No origin available or not allowed.');
    });

    it('rejects empty and multi-line queries', async () => {
      assertIsError(await tool.handler({query: ''}, originContext()), 'Query must be a non-empty string.');
      assertIsError(await tool.handler({query: 'foo\nbar'}, originContext()), 'Query must be a single line.');
      assertIsError(await tool.handler({query: 'foo\rbar'}, originContext()), 'Query must be a single line.');
    });

    it('halts immediately when abort signal is already aborted', async () => {
      const {uiSourceCodes} =
          createWorkspaceSources([{url: urlString`https://example.com/app.js`, content: 'const target = 1;'}]);
      const searchSpy = sinon.spy(uiSourceCodes[0], 'searchInContent');
      const loadSpy = sinon.spy(uiSourceCodes[0], 'requestContentData');

      const controller = new AbortController();
      controller.abort();

      assertIsError(await tool.handler({query: 'target'}, originContext(), {signal: controller.signal}), 'Aborted');
      sinon.assert.notCalled(searchSpy);
      sinon.assert.notCalled(loadSpy);
    });

    it('handles explicit null id and caseSensitive values from model calls', async () => {
      createWorkspaceSources([{url: urlString`https://example.com/app.js`, content: 'const CHECKOUT = true;'}]);
      const args: AiAssistance.SearchInSources.SearchInSourcesArgs = {
        query: 'checkout',
        id: null,
        caseSensitive: null,
      };
      assert.deepEqual(tool.displayInfoFromArgs(args), {
        title: 'Searching sources for "checkout"',
        action: 'searchInSources({query: "checkout"})',
      });

      const response = await tool.handler(args, originContext());
      assertIsResult(response);
      assert.include(response.result, '1;6;const CHECKOUT = true;');
    });

    it('rejects id 0 without scanning workspace', async () => {
      const {uiSourceCodes} = createWorkspaceSources([
        {url: urlString`https://example.com/a.js`, content: 'const target = "a";'},
      ]);
      const searchSpy = sinon.spy(uiSourceCodes[0], 'searchInContent');
      assertIsError(await tool.handler({query: 'target', id: 0}, originContext()), 'Unable to find file.');
      sinon.assert.notCalled(searchSpy);
    });

    it('dispatches single-file search for numeric ids', async () => {
      const {uiSourceCodes} = createWorkspaceSources([
        {url: urlString`https://example.com/a.js`, content: 'const target = "a";'},
        {url: urlString`https://example.com/b.js`, content: 'const target = "b";'},
      ]);
      const idB = registerSourceOrFail(uiSourceCodes[1]);
      const singleResponse = await tool.handler({query: 'target', id: idB}, originContext());
      assertIsResult(singleResponse);
      assert.strictEqual(singleResponse.result,
                         ['line;offset;preview', `# ${idB};/b.js`, '1;6;const target = "b";'].join('\n'));
    });

    it('formats workspace and single-file titles and actions in displayInfoFromArgs', () => {
      const {uiSourceCodes} =
          createWorkspaceSources([{url: urlString`https://example.com/app.js`, content: 'const x = 1;'}]);
      const id = registerSourceOrFail(uiSourceCodes[0]);

      assert.deepEqual(tool.displayInfoFromArgs({query: 'foo'}), {
        title: 'Searching sources for "foo"',
        action: 'searchInSources({query: "foo"})',
      });
      assert.deepEqual(tool.displayInfoFromArgs({query: 'foo', id}), {
        title: 'Searching app.js for "foo"',
        action: `searchInSources({query: "foo", id: ${id}})`,
      });
      assert.deepEqual(tool.displayInfoFromArgs({query: 'foo', id: 999}), {
        title: 'Searching sources for "foo"',
        action: 'searchInSources({query: "foo", id: 999})',
      });
      assert.deepEqual(tool.displayInfoFromArgs({query: 'foo', caseSensitive: true}), {
        title: 'Searching sources for "foo"',
        action: 'searchInSources({query: "foo", caseSensitive: true})',
      });
      const longQuery = 'a'.repeat(50);
      assert.deepEqual(tool.displayInfoFromArgs({query: longQuery}), {
        title: `Searching sources for "${'a'.repeat(39)}…"`,
        action: `searchInSources({query: "${longQuery}"})`,
      });
      assert.deepEqual(tool.displayInfoFromArgs({query: ''}), {
        title: 'Searching workspace sources',
        action: 'searchInSources({query: ""})',
      });
    });
  });
});
