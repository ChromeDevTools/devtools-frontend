// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as ElementsModule from '../../../../../front_end/panels/elements/elements.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Diff from '../../../../../front_end/third_party/diff/diff.js';
import {createUISourceCode} from '../../helpers/UISourceCodeHelpers.js';
import {describeWithRealConnection} from '../../helpers/RealConnection.js';
import * as Workspace from '../../../../../front_end/models/workspace/workspace.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as Bindings from '../../../../../front_end/models/bindings/bindings.js';

const {assert} = chai;

describeWithRealConnection('StylesSidebarPane', async () => {
  let Elements: typeof ElementsModule;
  before(async () => {
    Elements = await import('../../../../../front_end/panels/elements/elements.js');
  });

  it('unescapes CSS strings', () => {
    assert.strictEqual(
        Elements.StylesSidebarPane.unescapeCssString(
            String.raw`"I\F1 t\EB rn\E2 ti\F4 n\E0 liz\E6 ti\F8 n\2603 \1F308  can be \t\r\ic\k\y"`),
        '"I\xF1t\xEBrn\xE2ti\xF4n\xE0liz\xE6ti\xF8n\u2603\u{1F308} can be tricky"');
    assert.strictEqual(
        Elements.StylesSidebarPane.unescapeCssString(String.raw`"_\DBFF_\\DBFF_\\\DBFF_\\\\DBFF_\\\\\DBFF_"`),
        '"_\uFFFD_\\DBFF_\\\\DBFF_\\\\\\DBFF_\\\\\\\\DBFF_"');
    assert.strictEqual(
        Elements.StylesSidebarPane.unescapeCssString(String.raw`"\0_\DBFF_\DFFF_\110000"`),
        '"\uFFFD_\uFFFD_\uFFFD_\uFFFD"', 'U+0000, lone surrogates, and values above U+10FFFF should become U+FFFD');
    assert.strictEqual(
        Elements.StylesSidebarPane.unescapeCssString(String.raw`"_\D83C\DF08_"`), '"_\uFFFD\uFFFD_"',
        'surrogates should not be combined');
    assert.strictEqual(
        Elements.StylesSidebarPane.unescapeCssString('"_\\41\n_\\41\t_\\41\x20_"'), '"_A_A_A_"',
        'certain trailing whitespace characters should be consumed as part of the escape sequence');
  });

  it('formats CSS changes from diff arrays', async () => {
    const original = `
      .container {
        width: 10px;
        height: 10px;
      }

      .child {
        display: grid;
      }
      `;
    const current = `
      .container {
        width: 15px;
        margin: 0;
      }

      .child {
        display: grid;
        padding: 10px;
      }`;
    const diff = Diff.Diff.DiffWrapper.lineDiff(original.split('\n'), current.split('\n'));
    const changes = await Elements.StylesSidebarPane.formatCSSChangesFromDiff(diff);
    assert.strictEqual(
        changes, `.container {
  /* width: 10px; */
  /* height: 10px; */
  width: 15px;
  margin: 0;
}

.child {
  padding: 10px;
}`,
        'formatted CSS changes are not correct');
  });

  it('escapes URL as CSS comments', () => {
    assert.strictEqual(Elements.StylesSidebarPane.escapeUrlAsCssComment('https://abc.com/'), 'https://abc.com/');
    assert.strictEqual(Elements.StylesSidebarPane.escapeUrlAsCssComment('https://abc.com/*/'), 'https://abc.com/*/');
    assert.strictEqual(
        Elements.StylesSidebarPane.escapeUrlAsCssComment('https://abc.com/*/?q=*'), 'https://abc.com/*/?q=*');
    assert.strictEqual(
        Elements.StylesSidebarPane.escapeUrlAsCssComment('https://abc.com/*/?q=*/'), 'https://abc.com/*/?q=*%2F');
    assert.strictEqual(
        Elements.StylesSidebarPane.escapeUrlAsCssComment('https://abc.com/*/?q=*/#hash'),
        'https://abc.com/*/?q=*%2F#hash');
  });

  it('tracks property changes with formatting', async () => {
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const URL = 'file:///tmp/example.html' as Platform.DevToolsPath.UrlString;
    const {uiSourceCode, project} = createUISourceCode({
      url: URL,
      content: '.rule{display:none}',
      mimeType: 'text/css',
      projectType: Workspace.Workspace.projectTypes.FileSystem,
    });

    uiSourceCode.setWorkingCopy('.rule{display:block}');

    const stylesSidebarPane = Elements.StylesSidebarPane.StylesSidebarPane.instance();
    await stylesSidebarPane.trackURLForChanges(URL);
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const target = targetManager.mainTarget();
    assertNotNullOrUndefined(target);

    const resourceURL = () => URL;
    const cssModel = new SDK.CSSModel.CSSModel(target);
    cssModel.styleSheetHeaderForId = () => ({
      lineNumberInSource: (line: number) => line,
      columnNumberInSource: (_line: number, column: number) => column,
      cssModel: () => cssModel,
      resourceURL,
      isConstructedByNew: () => false,
    } as unknown as SDK.CSSStyleSheetHeader.CSSStyleSheetHeader);

    const cssWorksapceBinding = Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance();
    cssWorksapceBinding.modelAdded(cssModel);
    cssWorksapceBinding.addSourceMapping({
      rawLocationToUILocation: (loc: SDK.CSSModel.CSSLocation) => new Workspace.UISourceCode.UILocation(
          uiSourceCode as Workspace.UISourceCode.UISourceCode, loc.lineNumber, loc.columnNumber),
      uiLocationToRawLocations: (_: Workspace.UISourceCode.UILocation): SDK.CSSModel.CSSLocation[] => [],
    });

    const cssProperty = {
      ownerStyle: {
        type: SDK.CSSStyleDeclaration.Type.Regular,
        styleSheetId: 'STYLE_SHEET_ID' as Protocol.CSS.StyleSheetId,
        cssModel: () => cssModel,
        parentRule: {resourceURL},
      },
      nameRange: () => ({startLine: 0, startColumn: '.rule{'.length}),
    } as unknown as SDK.CSSProperty.CSSProperty;

    assert.isTrue(stylesSidebarPane.isPropertyChanged(cssProperty));

    Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance().modelRemoved(cssModel);
    workspace.removeProject(project);
    await stylesSidebarPane.trackURLForChanges(URL);  // Clean up diff subscription
  });
});
