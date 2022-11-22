// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../../front_end/core/common/common.js';
import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Workspace from '../../../../../front_end/models/workspace/workspace.js';
import * as Sources from '../../../../../front_end/panels/sources/sources.js';
import * as CodeMirror from '../../../../../front_end/third_party/codemirror.next/codemirror.next.js';
import * as UI from '../../../../../front_end/ui/legacy/legacy.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

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
  const classNameCompletion = (targetFactory: () => SDK.Target.Target) => {
    let target: SDK.Target.Target;
    beforeEach(() => {
      sinon.stub(UI.ShortcutRegistry.ShortcutRegistry, 'instance').returns({
        shortcutTitleForAction: () => {},
        shortcutsForAction: () => [],
        getShortcutListener: () => {},
      } as unknown as UI.ShortcutRegistry.ShortcutRegistry);
      target = targetFactory();
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
      assertNotNullOrUndefined(autocompletion);
      const FROM = 42;
      sinon.stub(CodeMirror.Tree.prototype, 'resolveInner')
          .returns({name: 'ClassName', from: FROM} as CodeMirror.SyntaxNode);
      const cssModel = target.model(SDK.CSSModel.CSSModel);
      assertNotNullOrUndefined(cssModel);
      const STYLESHEET_ID = 'STYLESHEET_ID' as Protocol.CSS.StyleSheetId;
      sinon.stub(cssModel, 'getStyleSheetIdsForURL').withArgs(URL).returns([STYLESHEET_ID]);
      const CLASS_NAMES = ['foo', 'bar', 'baz'];
      sinon.stub(cssModel, 'getClassNames').withArgs(STYLESHEET_ID).resolves(CLASS_NAMES);
      const completionResult =
          await autocompletion({state: {field: () => {}}} as unknown as CodeMirror.CompletionContext);
      assert.deepStrictEqual(completionResult, {
        from: FROM,
        options: [
          {type: 'constant', label: CLASS_NAMES[0]},
          {type: 'constant', label: CLASS_NAMES[1]},
          {type: 'constant', label: CLASS_NAMES[2]},
        ],
      });
    });
  };
  describe('class name completion without tab target', () => classNameCompletion(createTarget));
  describe('class name completion with tab target', () => classNameCompletion(() => {
                                                      const tabTarget = createTarget({type: SDK.Target.Type.Tab});
                                                      createTarget({parentTarget: tabTarget, subtype: 'prerender'});
                                                      return createTarget({parentTarget: tabTarget});
                                                    }));
});
