// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Sources from './sources.js';

const {CSSPlugin} = Sources.CSSPlugin;

describe('CSSPlugin', () => {
  describe('accepts', () => {
    it('holds true for documents', () => {
      const uiSourceCode = sinon.createStubInstance(Workspace.UISourceCode.UISourceCode);
      uiSourceCode.contentType.returns(Common.ResourceType.resourceTypes.Document);
      assert.isTrue(CSSPlugin.accepts(uiSourceCode));
    });

    it('holds true for style sheets', () => {
      const uiSourceCode = sinon.createStubInstance(Workspace.UISourceCode.UISourceCode);
      uiSourceCode.contentType.returns(Common.ResourceType.resourceTypes.Stylesheet);
      assert.isTrue(CSSPlugin.accepts(uiSourceCode));
    });
  });
});

describeWithMockConnection('CSSPlugin', () => {
  beforeEach(() => {
    sinon.stub(UI.ShortcutRegistry.ShortcutRegistry, 'instance').returns({
      shortcutTitleForAction: () => {},
      shortcutsForAction: () => [],
      getShortcutListener: () => {},
    } as unknown as UI.ShortcutRegistry.ShortcutRegistry);
    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    createTarget({parentTarget: tabTarget, subtype: 'prerender'});
    createTarget({parentTarget: tabTarget});
  });

  type CompletionProvider = (cx: CodeMirror.CompletionContext) => Promise<CodeMirror.CompletionResult|null>;
  type ExtensionOrFacetProvider = {value: {override: CompletionProvider[]}}|ExtensionOrFacetProvider[]|
                                  CodeMirror.Extension;
  function findAutocompletion(extensions: ExtensionOrFacetProvider): CompletionProvider|null {
    if ('value' in extensions && extensions.value.override) {
      return extensions.value.override[0] || null;
    }
    if ('length' in extensions) {
      for (let i = 0; i < extensions.length; ++i) {
        const result = findAutocompletion(extensions[i]);
        if (result) {
          return result;
        }
      }
    }
    return null;
  }

  it('suggests CSS class names from the stylesheet', async () => {
    const URL = 'http://example.com/styles.css' as Platform.DevToolsPath.UrlString;
    const uiSourceCode = sinon.createStubInstance(Workspace.UISourceCode.UISourceCode);
    uiSourceCode.url.returns(URL);
    const plugin = new CSSPlugin(uiSourceCode);
    const autocompletion = findAutocompletion(plugin.editorExtension());
    const FROM = 42;
    sinon.stub(CodeMirror.Tree.prototype, 'resolveInner')
        .returns({name: 'ClassName', from: FROM} as CodeMirror.SyntaxNode);
    const STYLESHEET_ID = 'STYLESHEET_ID' as Protocol.CSS.StyleSheetId;
    sinon.stub(SDK.CSSModel.CSSModel.prototype, 'getStyleSheetIdsForURL').withArgs(URL).returns([STYLESHEET_ID]);
    const CLASS_NAMES = ['foo', 'bar', 'baz'];
    sinon.stub(SDK.CSSModel.CSSModel.prototype, 'getClassNames').withArgs(STYLESHEET_ID).resolves(CLASS_NAMES);
    const completionResult =
        await autocompletion!({state: {field: () => {}}} as unknown as CodeMirror.CompletionContext);
    assert.deepStrictEqual(completionResult, {
      from: FROM,
      options: [
        {type: 'constant', label: CLASS_NAMES[0]},
        {type: 'constant', label: CLASS_NAMES[1]},
        {type: 'constant', label: CLASS_NAMES[2]},
      ],
    });
  });
});
