// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import type * as Protocol from '../../generated/protocol.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {encodeSourceMap} from '../../testing/SourceMapEncoder.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import * as Workspace from '../workspace/workspace.js';

import type * as Bindings from './bindings.js';

const {urlString} = Platform.DevToolsPath;

describe('CSSWorkspaceBinding', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  let universe: TestUniverse;
  let cssWorkspaceBinding: Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding;
  let workspace: Workspace.Workspace.WorkspaceImpl;

  const styleSheetURL = urlString`http://example.com/example.css`;
  const sourceURLString = urlString`http://example.com/example.scss`;

  const scssContent = '/* Comment */\nline 2\nline 3\nline 4\nline 5';

  const mappings = [
    '1:0 => example.scss:1:0',
    '2:4 => example.scss:2:2',
    '2:6 => example.scss:2:5',
    '2:9 => example.scss:2:7',
    '3:7 => example.scss:2:10',
    '4:8 => example.scss:4:2',
    '4:10 => example.scss:4:2',
    '4:11 => example.scss:4:11',
    '4:15 => example.scss:4:13',
    '4:20 => example.scss:4:17',
  ];

  const sourceMapContent = encodeSourceMap(mappings, 'http://example.com');

  beforeEach(() => {
    sourceMapContent.sourcesContent = [scssContent];
    universe = new TestUniverse({
      pageResourceLoaderOptions: {
        loadOverride: async (url: string) => {
          if (url === 'http://example.com/example.css.map') {
            return {
              success: true,
              content: JSON.stringify(sourceMapContent),
              errorDescription: {message: '', statusCode: 0, netError: 0, netErrorName: '', urlValid: true},
            };
          }
          return {
            success: false,
            content: '',
            errorDescription: {message: 'Not found', statusCode: 404, netError: 0, netErrorName: '', urlValid: true},
          };
        },
      },
    });
    cssWorkspaceBinding = universe.cssWorkspaceBinding;
    workspace = universe.workspace;
  });

  const waitForUISourceCodeAdded =
      (url: Platform.DevToolsPath.UrlString): Promise<Workspace.UISourceCode.UISourceCode> => new Promise(resolve => {
        const uiSourceCode = workspace.uiSourceCodeForURL(url);
        if (uiSourceCode) {
          resolve(uiSourceCode);
          return;
        }
        const {eventType, listener} =
            workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded, event => {
              if (event.data.url() === url) {
                workspace.removeEventListener(eventType, listener);
                resolve(event.data);
              }
            });
      });

  it('correctly maps locations using source map', async () => {
    const target = universe.createTarget();
    const cssModel = target.model(SDK.CSSModel.CSSModel);
    assert.exists(cssModel);

    const headerPayload: Protocol.CSS.CSSStyleSheetHeader = {
      styleSheetId: 'stylesheet' as Protocol.DOM.StyleSheetId,
      frameId: 'frame' as Protocol.Page.FrameId,
      sourceURL: styleSheetURL,
      origin: 'regular' as Protocol.CSS.StyleSheetOrigin,
      title: 'example.css',
      disabled: false,
      isInline: false,
      isMutable: false,
      isConstructed: false,
      loadingFailed: false,
      startLine: 0,
      startColumn: 0,
      length: 100,
      endLine: 10,
      endColumn: 10,
      sourceMapURL: 'http://example.com/example.css.map',
    };

    const cssUISourceCodePromise = waitForUISourceCodeAdded(styleSheetURL);
    const scssUISourceCodePromise = waitForUISourceCodeAdded(sourceURLString);

    cssModel.styleSheetAdded(headerPayload);

    const cssUISourceCode = await cssUISourceCodePromise;
    const scssUISourceCode = await scssUISourceCodePromise;

    assert.exists(cssUISourceCode);
    assert.exists(scssUISourceCode);

    await cssWorkspaceBinding.pendingLiveLocationChangesPromise();
    assert.deepEqual(cssWorkspaceBinding.sourceMapURLsForUISourceCode(scssUISourceCode),
                     [urlString`http://example.com/example.css.map`]);

    const header = cssModel.styleSheetHeaderForId(headerPayload.styleSheetId);
    assert.exists(header);

    const testLocation =
        (line: number, column: number, expectedUISourceCode: Workspace.UISourceCode.UISourceCode, expectedLine: number,
         expectedColumn: number, expectedReverseLine: number, expectedReverseColumn: number) => {
          const rawLocation = new SDK.CSSModel.CSSLocation(header, line, column);
          const uiLocation = cssWorkspaceBinding.rawLocationToUILocation(rawLocation);
          assert.exists(uiLocation, `Could not map raw location ${line}:${column}`);
          assert.strictEqual(uiLocation.uiSourceCode, expectedUISourceCode,
                             `Mismatched UISourceCode for ${line}:${column}`);
          assert.strictEqual(uiLocation.lineNumber, expectedLine, `Mismatched line number for ${line}:${column}`);
          assert.strictEqual(uiLocation.columnNumber, expectedColumn, `Mismatched column number for ${line}:${column}`);

          const reverseRawLocations = cssWorkspaceBinding.uiLocationToRawLocations(uiLocation);
          assert.isNotEmpty(reverseRawLocations,
                            `Could not reverse map UI location ${uiLocation.lineNumber}:${uiLocation.columnNumber}`);
          const reverseRaw = reverseRawLocations[0];
          assert.strictEqual(reverseRaw.lineNumber, expectedReverseLine,
                             `Mismatched reverse line number for ${line}:${column}`);
          assert.strictEqual(reverseRaw.columnNumber, expectedReverseColumn,
                             `Mismatched reverse column number for ${line}:${column}`);
        };

    testLocation(0, 3, cssUISourceCode, 0, 3, 0, 3);
    testLocation(1, 0, scssUISourceCode, 1, 0, 1, 0);
    testLocation(2, 4, scssUISourceCode, 2, 2, 2, 4);
    testLocation(2, 6, scssUISourceCode, 2, 5, 2, 6);
    testLocation(2, 9, scssUISourceCode, 2, 7, 2, 9);
    testLocation(3, 7, scssUISourceCode, 2, 10, 3, 7);
    testLocation(4, 8, scssUISourceCode, 4, 2, 4, 8);
    testLocation(4, 10, scssUISourceCode, 4, 2, 4, 8);
    testLocation(4, 11, scssUISourceCode, 4, 11, 4, 11);
    testLocation(4, 15, scssUISourceCode, 4, 13, 4, 15);
    testLocation(4, 20, scssUISourceCode, 4, 17, 4, 20);

    const contentData = await scssUISourceCode.requestContentData();
    assert.instanceOf(contentData, TextUtils.ContentData.ContentData);
    assert.isTrue(contentData.text.startsWith('/* Comment */'));
  });

  it('correctly maps property UI locations', async () => {
    const target = universe.createTarget();
    const cssModel = target.model(SDK.CSSModel.CSSModel);
    assert.exists(cssModel);

    const headerPayload: Protocol.CSS.CSSStyleSheetHeader = {
      styleSheetId: 'stylesheet' as Protocol.DOM.StyleSheetId,
      frameId: 'frame' as Protocol.Page.FrameId,
      sourceURL: styleSheetURL,
      origin: 'regular' as Protocol.CSS.StyleSheetOrigin,
      title: 'example.css',
      disabled: false,
      isInline: false,
      isMutable: false,
      isConstructed: false,
      loadingFailed: false,
      startLine: 0,
      startColumn: 0,
      length: 100,
      endLine: 10,
      endColumn: 10,
      sourceMapURL: 'http://example.com/example.css.map',
    };

    const scssUISourceCodePromise = waitForUISourceCodeAdded(sourceURLString);
    cssModel.styleSheetAdded(headerPayload);
    const scssUISourceCode = await scssUISourceCodePromise;
    assert.exists(scssUISourceCode);

    await cssWorkspaceBinding.pendingLiveLocationChangesPromise();

    const header = cssModel.styleSheetHeaderForId(headerPayload.styleSheetId);
    assert.exists(header);

    const mockOwnerStyle = {
      type: SDK.CSSStyleDeclaration.Type.Regular,
      styleSheetId: header.id,
      cssModel: () => cssModel,
    } as SDK.CSSStyleDeclaration.CSSStyleDeclaration;

    const mockProperty = (forName: boolean, line: number, column: number) => {
      const range = new TextUtils.TextRange.TextRange(line, column, line, column + 5);
      return {
        ownerStyle: mockOwnerStyle,
        nameRange: () => forName ? range : null,
        valueRange: () => !forName ? range : null,
      } as SDK.CSSProperty.CSSProperty;
    };

    const testPropertyUILocation =
        (forName: boolean, line: number, column: number, expectedUISourceCode: Workspace.UISourceCode.UISourceCode,
         expectedLine: number, expectedColumn: number) => {
          const uiLocation = cssWorkspaceBinding.propertyUILocation(mockProperty(forName, line, column), forName);
          assert.exists(uiLocation, `Could not map property UI location ${line}:${column}`);
          assert.strictEqual(uiLocation.uiSourceCode, expectedUISourceCode,
                             `Mismatched UISourceCode for ${line}:${column}`);
          assert.strictEqual(uiLocation.lineNumber, expectedLine, `Mismatched line number for ${line}:${column}`);
          assert.strictEqual(uiLocation.columnNumber, expectedColumn, `Mismatched column number for ${line}:${column}`);
        };

    // Value mapping (tests nameRange/valueRange extraction combined with rawLocationToUILocation)
    testPropertyUILocation(true, 2, 4, scssUISourceCode, 2, 2);
    testPropertyUILocation(false, 2, 6, scssUISourceCode, 2, 5);
  });
});
