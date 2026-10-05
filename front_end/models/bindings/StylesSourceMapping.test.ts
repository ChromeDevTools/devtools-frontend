// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import type * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as ProtocolClient from '../../core/protocol_client/protocol_client.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import * as Protocol from '../../generated/protocol.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {getMainFrame} from '../../testing/ResourceTreeHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import {createFileSystemUISourceCode} from '../../testing/UISourceCodeHelpers.js';
import * as Persistence from '../persistence/persistence.js';
import * as Workspace from '../workspace/workspace.js';

import * as Bindings from './bindings.js';

const {urlString} = Platform.DevToolsPath;

describe('StylesSourceMapping', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  let universe: TestUniverse;

  beforeEach(() => {
    universe = new TestUniverse();
  });

  it('does not overwrite CSS files when CSS model reports error on getStyleSheetText', async () => {
    const connection = new MockCDPConnection();

    // Stub DOM.enable and CSS.enable to succeed
    connection.setSuccessHandler('DOM.enable', () => ({}));
    connection.setSuccessHandler('CSS.enable', () => ({}));

    // Stub CSS.setStyleSheetText to succeed
    connection.setSuccessHandler('CSS.setStyleSheetText', () => ({sourceMapURL: ''}));

    // Stub CSS.getStyleSheetText to fail
    connection.setFailureHandler('CSS.getStyleSheetText',
                                 () => ({
                                   message: 'FAKE PROTOCOL ERROR',
                                   code: ProtocolClient.CDPConnection.CDPErrorStatus.DEVTOOLS_STUB_ERROR,
                                 }));

    const target = universe.createTarget({connection});
    const cssModel = target.model(SDK.CSSModel.CSSModel);
    assert.exists(cssModel);

    // Eagerly instantiate bindings and persistence
    void universe.cssWorkspaceBinding;
    const persistence = universe.persistence;

    const styleSheetId = 'stylesheet' as Protocol.DOM.StyleSheetId;
    const frameId = 'frame' as Protocol.Page.FrameId;
    const sourceURL = urlString`http://example.com/simple.css`;

    const headerPayload: Protocol.CSS.CSSStyleSheetHeader = {
      styleSheetId,
      frameId,
      sourceURL,
      origin: Protocol.CSS.StyleSheetOrigin.Regular,
      title: 'simple.css',
      disabled: false,
      isInline: false,
      isMutable: false,
      isConstructed: false,
      loadingFailed: false,
      startLine: 0,
      startColumn: 0,
      length: 0,
      endLine: 0,
      endColumn: 0,
    };

    // Wait for the StylesSourceMapping to create the network UISourceCode
    const networkUISourceCodePromise = new Promise<Workspace.UISourceCode.UISourceCode>(resolve => {
      const listener = (event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.UISourceCode>) => {
        if (event.data.project().type() === Workspace.Workspace.projectTypes.Network &&
            event.data.url() === sourceURL) {
          universe.workspace.removeEventListener(Workspace.Workspace.Events.UISourceCodeAdded, listener);
          resolve(event.data);
        }
      };
      universe.workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded, listener);
    });

    cssModel.styleSheetAdded(headerPayload);
    const networkUISourceCode = await networkUISourceCodePromise;

    // Create filesystem UISourceCode
    const fileSystemPath = urlString`file://path/to/filesystem`;
    const fileSystemFileUrl = urlString`${fileSystemPath + '/simple.css'}`;
    const origContent = 'body {\n    color: red;\n}\n';

    const {uiSourceCode: fileSystemUiSourceCode, project} = createFileSystemUISourceCode({
      url: fileSystemFileUrl,
      mimeType: 'text/css',
      content: origContent,
      fileSystemPath,
      autoMapping: true,
      type: Persistence.PlatformFileSystem.PlatformFileSystemType.WORKSPACE_PROJECT,
      universe,
    });

    // Verify binding is created.
    // Manually bind them.
    const binding = new Persistence.Persistence.PersistenceBinding(networkUISourceCode, fileSystemUiSourceCode);
    await persistence.addBindingForTest(binding);

    // Verify initial content of filesystem
    await fileSystemUiSourceCode.requestContentData();
    assert.strictEqual(fileSystemUiSourceCode.workingCopy(), origContent);

    const styleFileProto = Bindings.StylesSourceMapping.StyleFile.prototype as unknown as {
      styleFileSyncedForTest: () => void,
    };
    const syncStub = sinon.stub(styleFileProto, 'styleFileSyncedForTest');
    const syncPromise = new Promise<void>(resolve => {
      syncStub.callsFake(() => {
        resolve();
      });
    });

    // Call setStyleSheetText on CSSModel
    const setStyleSheetTextPromise = cssModel.setStyleSheetText(styleSheetId, 'body {color: blue}', true);

    // Wait for sync (which should fail and return early)
    await syncPromise;
    await setStyleSheetTextPromise;

    // Verify filesystem content is NOT changed
    assert.strictEqual(fileSystemUiSourceCode.workingCopy(), origContent);

    // Restore stubs
    syncStub.restore();
    project.dispose();
  });

  it('marks UISourceCode as having synthesized sourceURL if header hasSourceURL', async () => {
    const connection = new MockCDPConnection();
    const target = universe.createTarget({connection});
    const cssModel = target.model(SDK.CSSModel.CSSModel);
    assert.exists(cssModel);
    void universe.cssWorkspaceBinding;

    const styleSheetId = 'stylesheet-source-url' as Protocol.DOM.StyleSheetId;
    const frameId = 'frame' as Protocol.Page.FrameId;
    const sourceURL = urlString`http://example.com/custom-style.css`;

    const headerPayload: Protocol.CSS.CSSStyleSheetHeader = {
      styleSheetId,
      frameId,
      sourceURL,
      hasSourceURL: true,
      origin: Protocol.CSS.StyleSheetOrigin.Regular,
      title: 'custom-style.css',
      disabled: false,
      isInline: false,
      isMutable: false,
      isConstructed: false,
      loadingFailed: false,
      startLine: 0,
      startColumn: 0,
      length: 0,
      endLine: 0,
      endColumn: 0,
    };

    const networkUISourceCodePromise = new Promise<Workspace.UISourceCode.UISourceCode>(resolve => {
      const listener = (event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.UISourceCode>) => {
        if (event.data.project().type() === Workspace.Workspace.projectTypes.Network &&
            event.data.url() === sourceURL) {
          universe.workspace.removeEventListener(Workspace.Workspace.Events.UISourceCodeAdded, listener);
          resolve(event.data);
        }
      };
      universe.workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded, listener);
    });

    cssModel.styleSheetAdded(headerPayload);
    const networkUISourceCode = await networkUISourceCodePromise;

    assert.isTrue(Bindings.NetworkProject.NetworkProject.isSourceURLSynthesized(networkUISourceCode));
    assert.isFalse(universe.networkPersistenceManager.isUISourceCodeOverridable(networkUISourceCode));
  });

  it('marks UISourceCode as having synthesized sourceURL when a header with hasSourceURL is added to an existing StyleFile',
     async () => {
       const connection = new MockCDPConnection();
       const target = universe.createTarget({connection});
       const cssModel = target.model(SDK.CSSModel.CSSModel);
       assert.exists(cssModel);
       void universe.cssWorkspaceBinding;

       const styleSheetId1 = 'stylesheet1' as Protocol.DOM.StyleSheetId;
       const styleSheetId2 = 'stylesheet2' as Protocol.DOM.StyleSheetId;
       const frameId = 'frame' as Protocol.Page.FrameId;
       const sourceURL = urlString`http://example.com/spoofed.css`;

       const headerPayload1: Protocol.CSS.CSSStyleSheetHeader = {
         styleSheetId: styleSheetId1,
         frameId,
         sourceURL,
         hasSourceURL: false,
         origin: Protocol.CSS.StyleSheetOrigin.Regular,
         title: 'spoofed.css',
         disabled: false,
         isInline: false,
         isMutable: false,
         isConstructed: false,
         loadingFailed: false,
         startLine: 0,
         startColumn: 0,
         length: 0,
         endLine: 0,
         endColumn: 0,
       };

       const headerPayload2: Protocol.CSS.CSSStyleSheetHeader = {
         styleSheetId: styleSheetId2,
         frameId,
         sourceURL,
         hasSourceURL: true,
         origin: Protocol.CSS.StyleSheetOrigin.Regular,
         title: 'spoofed.css',
         disabled: false,
         isInline: false,
         isMutable: false,
         isConstructed: false,
         loadingFailed: false,
         startLine: 0,
         startColumn: 0,
         length: 0,
         endLine: 0,
         endColumn: 0,
       };

       const networkUISourceCodePromise = waitForNetworkUISourceCode(uiSourceCode => uiSourceCode.url() === sourceURL);

       cssModel.styleSheetAdded(headerPayload1);
       const networkUISourceCode = await networkUISourceCodePromise;

       assert.isFalse(Bindings.NetworkProject.NetworkProject.isSourceURLSynthesized(networkUISourceCode));
       assert.isTrue(universe.networkPersistenceManager.isUISourceCodeOverridable(networkUISourceCode));

       cssModel.styleSheetAdded(headerPayload2);
       cssModel.styleSheetRemoved(styleSheetId1);

       assert.isTrue(Bindings.NetworkProject.NetworkProject.isSourceURLSynthesized(networkUISourceCode));
       assert.isFalse(universe.networkPersistenceManager.isUISourceCodeOverridable(networkUISourceCode));
     });

  function waitForNetworkUISourceCode(predicate: (uiSourceCode: Workspace.UISourceCode.UISourceCode) =>
                                          boolean): Promise<Workspace.UISourceCode.UISourceCode> {
    return new Promise<Workspace.UISourceCode.UISourceCode>(resolve => {
      const listener = (event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.UISourceCode>) => {
        if (event.data.project().type() === Workspace.Workspace.projectTypes.Network && predicate(event.data)) {
          universe.workspace.removeEventListener(Workspace.Workspace.Events.UISourceCodeAdded, listener);
          resolve(event.data);
        }
      };
      universe.workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded, listener);
    });
  }

  function stubStyleFileSynced(): {promise: Promise<void>, stub: sinon.SinonStub} {
    const styleFileProto = Bindings.StylesSourceMapping.StyleFile.prototype as unknown as {
      styleFileSyncedForTest: () => void,
    };
    const {promise, resolve} = Promise.withResolvers<void>();
    const stub = sinon.stub(styleFileProto, 'styleFileSyncedForTest').callsFake(() => resolve());
    return {promise, stub};
  }

  async function addInspectorStyleSheet(
      target: SDK.Target.Target, cssModel: SDK.CSSModel.CSSModel,
      styleSheetId: Protocol.DOM.StyleSheetId): Promise<Workspace.UISourceCode.UISourceCode> {
    // The inspector stylesheet URL is derived from the URL of the frame it belongs to.
    const frame = getMainFrame(target);
    const uiSourceCodePromise =
        waitForNetworkUISourceCode(uiSourceCode => uiSourceCode.url().startsWith('inspector://'));
    cssModel.styleSheetAdded({
      styleSheetId,
      frameId: frame.id,
      sourceURL: '',
      origin: Protocol.CSS.StyleSheetOrigin.Inspector,
      title: '',
      disabled: false,
      isInline: false,
      isMutable: true,
      isConstructed: false,
      loadingFailed: false,
      startLine: 0,
      startColumn: 0,
      length: 0,
      endLine: 0,
      endColumn: 0,
    });
    const uiSourceCode = await uiSourceCodePromise;
    assert.strictEqual(uiSourceCode.displayName(), 'inspector-stylesheet');
    await uiSourceCode.requestContentData();
    assert.strictEqual(uiSourceCode.workingCopy(), '');
    return uiSourceCode;
  }

  it('pushes committed working copy of the inspector stylesheet UISourceCode to the backend', async () => {
    const connection = new MockCDPConnection();
    connection.setSuccessHandler('DOM.enable', () => ({}));
    connection.setSuccessHandler('CSS.enable', () => ({}));
    connection.setSuccessHandler('DOM.markUndoableState', () => ({}));
    let styleSheetText = '';
    connection.setSuccessHandler('CSS.getStyleSheetText', () => ({text: styleSheetText}));
    const setStyleSheetTextCalls: Array<{styleSheetId: string, text: string}> = [];
    connection.setSuccessHandler('CSS.setStyleSheetText', ({styleSheetId, text}) => {
      setStyleSheetTextCalls.push({styleSheetId, text});
      styleSheetText = text;
      return {sourceMapURL: ''};
    });

    const target = universe.createTarget({connection});
    const cssModel = target.model(SDK.CSSModel.CSSModel);
    assert.exists(cssModel);
    void universe.cssWorkspaceBinding;

    const styleSheetId = 'inspector-sheet' as Protocol.DOM.StyleSheetId;
    const uiSourceCode = await addInspectorStyleSheet(target, cssModel, styleSheetId);

    const setStyleSheetTextSpy = sinon.spy(cssModel, 'setStyleSheetText');
    const {promise: syncPromise, stub: syncStub} = stubStyleFileSynced();
    const newContent = '#inspected { background-color: green; }';
    uiSourceCode.setWorkingCopy(newContent);
    uiSourceCode.commitWorkingCopy();
    await syncPromise;

    // The commit is mirrored to the backend as a single major change.
    sinon.assert.calledOnceWithExactly(setStyleSheetTextSpy, styleSheetId, newContent, true);
    assert.deepEqual(setStyleSheetTextCalls, [{styleSheetId, text: newContent}]);
    assert.isFalse(uiSourceCode.isDirty());
    assert.strictEqual(uiSourceCode.workingCopy(), newContent);
    syncStub.restore();
  });

  it('mirrors CSS edits of an inline stylesheet with sourceURL into the UISourceCode working copy', async () => {
    const sourceURL = urlString`http://localhost:8000/inspector/elements/styles/foo.css`;
    const sourceURLComment = `/*# sourceURL=${sourceURL} */`;
    const connection = new MockCDPConnection();
    connection.setSuccessHandler('DOM.enable', () => ({}));
    connection.setSuccessHandler('CSS.enable', () => ({}));
    connection.setSuccessHandler('DOM.markUndoableState', () => ({}));
    let styleSheetText = `#inspected {\n    color: red;\n}\n${sourceURLComment}`;
    connection.setSuccessHandler('CSS.getStyleSheetText', () => ({text: styleSheetText}));
    connection.setSuccessHandler('CSS.setStyleTexts', ({edits}) => {
      assert.lengthOf(edits, 1);
      assert.strictEqual(edits[0].text, 'color: green;');
      styleSheetText = `#inspected {\n    color: green;\n}\n${sourceURLComment}`;
      return {styles: [{cssProperties: [], shorthandEntries: []}]};
    });
    const setStyleSheetTextStub = sinon.stub().returns({sourceMapURL: ''});
    connection.setSuccessHandler('CSS.setStyleSheetText', setStyleSheetTextStub);

    const target = universe.createTarget({connection});
    const cssModel = target.model(SDK.CSSModel.CSSModel);
    assert.exists(cssModel);
    void universe.cssWorkspaceBinding;

    const styleSheetId = 'inline-sheet' as Protocol.DOM.StyleSheetId;
    const uiSourceCodePromise = waitForNetworkUISourceCode(uiSourceCode => uiSourceCode.url() === sourceURL);
    cssModel.styleSheetAdded({
      styleSheetId,
      frameId: 'frame' as Protocol.Page.FrameId,
      sourceURL,
      hasSourceURL: true,
      origin: Protocol.CSS.StyleSheetOrigin.Regular,
      title: '',
      disabled: false,
      isInline: true,
      isMutable: false,
      isConstructed: false,
      loadingFailed: false,
      startLine: 1,
      startColumn: 13,
      length: styleSheetText.length,
      endLine: 5,
      endColumn: 0,
    });
    const uiSourceCode = await uiSourceCodePromise;
    assert.strictEqual(uiSourceCode.displayName(), 'foo.css');
    await uiSourceCode.requestContentData();
    // The sourceURL comment is stripped from the UISourceCode content.
    assert.strictEqual(uiSourceCode.workingCopy(), '#inspected {\n    color: red;\n}');
    assert.isFalse(uiSourceCode.isDirty());

    const {promise: syncPromise, stub: syncStub} = stubStyleFileSynced();
    const success = await cssModel.setStyleText(styleSheetId, new TextUtils.TextRange.TextRange(1, 4, 1, 15),
                                                'color: green;', /* majorChange */ true);
    assert.isTrue(success);
    await syncPromise;

    const workingCopy = uiSourceCode.workingCopy();
    assert.strictEqual(workingCopy, '#inspected {\n    color: green;\n}');
    assert.notInclude(workingCopy, 'sourceURL');
    assert.isTrue(uiSourceCode.isDirty());
    // The origin link is rendered as dirty ('*foo.css:1').
    assert.strictEqual(uiSourceCode.uiLocation(0).linkText(), '*foo.css:1');
    // The edit came from the only header, so it is not pushed back to the backend.
    sinon.assert.notCalled(setStyleSheetTextStub);
    syncStub.restore();
  });

  it('updates the inspector stylesheet UISourceCode when rules are added to it', async () => {
    const connection = new MockCDPConnection();
    connection.setSuccessHandler('DOM.enable', () => ({}));
    connection.setSuccessHandler('CSS.enable', () => ({}));
    connection.setSuccessHandler('DOM.markUndoableState', () => ({}));
    let styleSheetText = '';
    connection.setSuccessHandler('CSS.getStyleSheetText', () => ({text: styleSheetText}));
    const styleSheetId = 'inspector-sheet' as Protocol.DOM.StyleSheetId;
    connection.setSuccessHandler('CSS.addRule', ({ruleText}) => {
      styleSheetText += ruleText;
      const selector = ruleText.substring(0, ruleText.indexOf('{')).trim();
      return {
        rule: {
          styleSheetId,
          selectorList: {selectors: [{text: selector}], text: selector},
          origin: Protocol.CSS.StyleSheetOrigin.Inspector,
          style: {cssProperties: [], shorthandEntries: []},
        },
      };
    });
    const setStyleSheetTextStub = sinon.stub().returns({sourceMapURL: ''});
    connection.setSuccessHandler('CSS.setStyleSheetText', setStyleSheetTextStub);

    const target = universe.createTarget({connection});
    const cssModel = target.model(SDK.CSSModel.CSSModel);
    assert.exists(cssModel);
    void universe.cssWorkspaceBinding;

    const uiSourceCode = await addInspectorStyleSheet(target, cssModel, styleSheetId);

    const firstRuleText = 'foo, div#inspected, bar {}';
    let {promise: syncPromise, stub: syncStub} = stubStyleFileSynced();
    const firstRule =
        await cssModel.addRule(styleSheetId, firstRuleText, TextUtils.TextRange.TextRange.createFromLocation(0, 0));
    assert.exists(firstRule);
    await syncPromise;
    assert.strictEqual(uiSourceCode.workingCopy(), firstRuleText);
    syncStub.restore();

    const secondRuleText = '\n\ndiv#other {}';
    ({promise: syncPromise, stub: syncStub} = stubStyleFileSynced());
    const secondRule =
        await cssModel.addRule(styleSheetId, secondRuleText, TextUtils.TextRange.TextRange.createFromLocation(0, 26));
    assert.exists(secondRule);
    await syncPromise;
    assert.strictEqual(uiSourceCode.workingCopy(), firstRuleText + secondRuleText);
    assert.isTrue(uiSourceCode.isDirty());
    // The change originates from the backend, so it is not echoed back via setStyleSheetText.
    sinon.assert.notCalled(setStyleSheetTextStub);
    syncStub.restore();
  });
});
