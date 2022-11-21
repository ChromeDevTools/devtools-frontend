// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as ElementsModule from '../../../../../front_end/panels/elements/elements.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import {createFileSystemUISourceCode} from '../../helpers/UISourceCodeHelpers.js';
import {describeWithRealConnection} from '../../helpers/RealConnection.js';
import * as Workspace from '../../../../../front_end/models/workspace/workspace.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as Bindings from '../../../../../front_end/models/bindings/bindings.js';
import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';

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
    const {uiSourceCode, project} = createFileSystemUISourceCode({
      url: URL,
      content: '.rule{display:none}',
      mimeType: 'text/css',
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

    const cssWorkspaceBinding = Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance();
    cssWorkspaceBinding.modelAdded(cssModel);
    cssWorkspaceBinding.addSourceMapping({
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

describeWithEnvironment('StylesSidebarPropertyRenderer', () => {
  let Elements: typeof ElementsModule;
  before(async () => {
    Elements = await import('../../../../../front_end/panels/elements/elements.js');
  });

  it('parses animation-name correctly', () => {
    const throwingHandler = () => {
      throw new Error('Invalid handler called');
    };
    const renderer =
        new Elements.StylesSidebarPane.StylesSidebarPropertyRenderer(null, null, 'animation-name', 'foobar');
    renderer.setColorHandler(throwingHandler);
    renderer.setBezierHandler(throwingHandler);
    renderer.setFontHandler(throwingHandler);
    renderer.setShadowHandler(throwingHandler);
    renderer.setGridHandler(throwingHandler);
    renderer.setVarHandler(throwingHandler);
    renderer.setAngleHandler(throwingHandler);
    renderer.setLengthHandler(throwingHandler);

    const nodeContents = `NAME: ${name}`;
    renderer.setAnimationNameHandler(() => document.createTextNode(nodeContents));

    const node = renderer.renderValue();
    assert.deepEqual(node.textContent, nodeContents);
  });
});

describe('IdleCallbackManager', () => {
  let Elements: typeof ElementsModule;
  before(async () => {
    Elements = await import('../../../../../front_end/panels/elements/elements.js');
  });

  // IdleCallbackManager delegates work using requestIdleCallback, which does not generally execute requested callbacks
  // in order. This test verifies that callbacks do happen in order even if timeouts are run out.
  it('schedules callbacks in order', async () => {
    // Override the default timeout with a very short one
    class QuickIdleCallbackManager extends Elements.StylesSidebarPane.IdleCallbackManager {
      protected scheduleIdleCallback(_: number): void {
        super.scheduleIdleCallback(1);
      }
    }

    const timeout = (time: number) => new Promise<void>(resolve => setTimeout(resolve, time));

    const elements: number[] = [];

    const callbacks = new QuickIdleCallbackManager();
    callbacks.schedule(() => elements.push(0));
    callbacks.schedule(() => elements.push(1));
    callbacks.schedule(() => elements.push(2));
    callbacks.schedule(() => elements.push(3));
    await timeout(10);
    callbacks.schedule(() => elements.push(4));
    callbacks.schedule(() => elements.push(5));
    callbacks.schedule(() => elements.push(6));
    callbacks.schedule(() => elements.push(7));
    await timeout(10);

    await callbacks.awaitDone();

    assert.deepEqual(elements, [0, 1, 2, 3, 4, 5, 6, 7]);
  });
});
