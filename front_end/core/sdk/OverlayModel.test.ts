// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../generated/protocol.js';
import {
  createTarget,
} from '../../testing/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
  setMockConnectionResponseHandler,
} from '../../testing/MockConnection.js';
import type * as Platform from '../platform/platform.js';

import * as SDK from './sdk.js';

describeWithMockConnection('OverlayModel', () => {
  const DOCUMENT_URL_FOR_TEST = 'https://example.com/' as Platform.DevToolsPath.UrlString;

  let cssModel: SDK.CSSModel.CSSModel|null;
  let windowControls: SDK.OverlayModel.WindowControls|null;
  let overlayModel: SDK.OverlayModel.OverlayModel|null;

  const header: Protocol.CSS.CSSStyleSheetHeader = {
    styleSheetId: 'stylesheet' as Protocol.CSS.StyleSheetId,
    frameId: 'frame' as Protocol.Page.FrameId,
    sourceURL: `${DOCUMENT_URL_FOR_TEST}styles.css`,
    origin: Protocol.CSS.StyleSheetOrigin.Regular,
    title: 'title',
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

  const defaultStyleSheet = `.titlebar {
    left: env(titlebar-area-x);
    top: env(titlebar-area-y);
    width: env(titlebar-area-width);
    height: env(titlebar-area-height);}`;

  beforeEach(() => {
    const target = createTarget({url: DOCUMENT_URL_FOR_TEST});
    overlayModel = target.model(SDK.OverlayModel.OverlayModel);
    cssModel = target.model(SDK.CSSModel.CSSModel);
    assert.exists(cssModel);
    windowControls = new SDK.OverlayModel.WindowControls(cssModel);

    // Set up mock response handler to get the default style sheet
    setMockConnectionResponseHandler('CSS.getStyleSheetText', () => {
      return {text: defaultStyleSheet};
    });
  });

  it('toggles controls toolbar', async () => {
    assert.exists(overlayModel);
    let config;

    // Set up mock response handler to set the configuration
    setMockConnectionResponseHandler('Overlay.setShowWindowControlsOverlay', request => {
      config = request;
      return request;
    });

    // Verify the config is empty when toggling toolbar to be false
    await overlayModel.toggleWindowControlsToolbar(false);
    assert.deepEqual(config, {}, 'Expect config to be empty when toolbar is toggled false');

    // Verify the current config is sent when toggling toolbar to be true
    await overlayModel.toggleWindowControlsToolbar(true);
    const expectedDefaultConfig = {windowControlsOverlayConfig: overlayModel.getWindowControlsConfig()};
    assert.deepEqual(config, expectedDefaultConfig, 'Expect default config sent when toolbar is toggled true');
  });

  it('initializes the style sheet text', async () => {
    assert.exists(cssModel);
    assert.exists(windowControls);

    // Verify the style sheet is not initialized when no styles are present
    const checkStyleSheet = await windowControls.initializeStyleSheetText(DOCUMENT_URL_FOR_TEST);
    assert.isFalse(checkStyleSheet, 'Style should not be initialized if no CSS stylesheets are present');

    // Add a style sheet and verify it gets added
    cssModel.styleSheetAdded(header);
    const styleSheetIds =
        cssModel.getStyleSheetIdsForURL(`${DOCUMENT_URL_FOR_TEST}styles.css` as Platform.DevToolsPath.UrlString);
    assert.deepEqual(styleSheetIds, ['stylesheet']);

    // Verify style sheet gets initialized
    const isInitialized = await windowControls.initializeStyleSheetText(DOCUMENT_URL_FOR_TEST);
    assert.isTrue(isInitialized, 'Expect the style sheet to be initialized when CSS stylesheets are present');
  });

  it('toggles the emulated overlay', async () => {
    assert.exists(cssModel);
    assert.exists(windowControls);
    let styleSheet;

    // Set up mock response handler to set the style sheet
    setMockConnectionResponseHandler('CSS.setStyleSheetText', req => {
      styleSheet = req.text;
      return req;
    });

    // Toggle emulated overlay and verify no emulated overlay when no styles are preset
    await windowControls.toggleEmulatedOverlay(true);
    assert.isUndefined(styleSheet, 'Expect overlay to not be toggled if no styles are present');

    // Add style sheet and verify it gets added
    cssModel.styleSheetAdded(header);
    const styleSheetIds =
        cssModel.getStyleSheetIdsForURL(`${DOCUMENT_URL_FOR_TEST}styles.css` as Platform.DevToolsPath.UrlString);
    assert.deepEqual(styleSheetIds, ['stylesheet']);

    // Initialize style sheet & verify it gets initialized
    const isInitialized = await windowControls.initializeStyleSheetText(DOCUMENT_URL_FOR_TEST);
    assert.isTrue(isInitialized);

    // Toggle the emulated overlay and verify original style sheet gets replaced with emulated overlay
    await windowControls.toggleEmulatedOverlay(true);
    const expectedWindowsOverlay = `.titlebar {
    left: env(titlebar-area-x, 0px);
    top: env(titlebar-area-y, 0px);
    width: env(titlebar-area-width, calc(100% - 238px));
    height: env(titlebar-area-height, 33px);}`;

    assert.strictEqual(styleSheet, expectedWindowsOverlay, 'Expect emulated overlay stylesheet to be used');

    // Toggle the emulated overlay off and verify original style sheet is used
    await windowControls.toggleEmulatedOverlay(false);
    assert.strictEqual(styleSheet, defaultStyleSheet, 'Expect original default stylesheet to be used');
  });

  it('parses styles and replaces variables for style sheet correctly', () => {
    assert.exists(windowControls);

    const x = 85;
    const y = 0;
    const width = 185;
    const height = 40;

    let originalStyleSheet = `.titlebar {
      position: absolute;
      left: env(titlebar-area-x);
      top: env(titlebar-area-y);
      width: env(titlebar-area-width);
      height: env(titlebar-area-height);
    }`;

    let expectedStyleSheet = `.titlebar {
      position: absolute;
      left: env(titlebar-area-x, ${x}px);
      top: env(titlebar-area-y, ${y}px);
      width: env(titlebar-area-width, calc(100% - ${width}px));
      height: env(titlebar-area-height, ${height}px);
    }`;

    // Verify the original style sheet gets transformed to the expected style sheet for the given x, y, width, and height dimensions
    let parsedStyleSheet = windowControls.transformStyleSheetforTesting(x, y, width, height, originalStyleSheet);
    assert.strictEqual(parsedStyleSheet, expectedStyleSheet);

    // Verify the original style sheet does not get transformed when no original stylesheet
    originalStyleSheet = '';
    parsedStyleSheet = windowControls.transformStyleSheetforTesting(x, y, width, height, originalStyleSheet);
    assert.isUndefined(parsedStyleSheet);

    // Verify the original style sheet gets transformed to the expected style sheet for partial CSS properties
    originalStyleSheet = ': env(titlebar-area-xxx, 9px); width: env(titlebar-area-width);';
    expectedStyleSheet = `: env(titlebar-area-xxx, 9px); width: env(titlebar-area-width, calc(100% - ${width}px));`;
    parsedStyleSheet = windowControls.transformStyleSheetforTesting(x, y, width, height, originalStyleSheet);
    assert.strictEqual(parsedStyleSheet, expectedStyleSheet);
  });
});
