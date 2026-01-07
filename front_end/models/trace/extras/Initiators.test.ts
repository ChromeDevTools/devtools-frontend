// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import type * as Handlers from '../handlers/handlers.js';
import type * as Types from '../types/types.js';

import * as Extras from './extras.js';

/**
 * If you want to see the web page that all these examples are based on, you
 * can find it here:
 * https://github.com/ChromeDevTools/performance-stories/tree/main/resource-initiators
 */
describeWithEnvironment('getNetworkInitiator', () => {
  const {getNetworkInitiator} = Extras.Initiators;

  let parsedTrace: Handlers.Types.HandlerData;
  let documentRequest: Types.Events.SyntheticNetworkRequest;

  before(async function() {
    const {data} = await TraceLoader.traceEngine(this, 'resource-initiators.json.gz');
    parsedTrace = data;
    documentRequest = parsedTrace.NetworkRequests.byTime[0];
  });

  function networkRequest(urlEndsWith: string): Types.Events.SyntheticNetworkRequest {
    const req = parsedTrace.NetworkRequests.byTime.find(e => e.args.data.url.endsWith(urlEndsWith));
    assert.isOk(req, `could not find network request ending with ${urlEndsWith}`);
    return req;
  }

  describe('images', () => {
    it('is the document for <img src=""> in the HTML', async function() {
      const imageRequest = networkRequest('images/standard.png');
      const initiator = getNetworkInitiator(parsedTrace, imageRequest);
      assert.strictEqual(initiator, documentRequest);
    });

    it('is the document for an img preload in the HTML', async function() {
      const imageRequest = networkRequest('images/preloaded.png');
      const initiator = getNetworkInitiator(parsedTrace, imageRequest);
      assert.strictEqual(initiator, documentRequest);
    });

    it('is the stylesheet for an image defined in CSS with url(...)', async () => {
      const imageRequest = networkRequest('images/background.png');
      const stylesheetRequest = networkRequest('stylesheets/style.css');
      const initiator = getNetworkInitiator(parsedTrace, imageRequest);
      assert.strictEqual(initiator, stylesheetRequest);
    });

    it('is the script that creates it if it was dynamically injected with JS', async () => {
      const imageRequest = networkRequest('images/js-created.png');
      const appScriptRequest = networkRequest('app.js');
      const initiator = getNetworkInitiator(parsedTrace, imageRequest);
      assert.strictEqual(initiator, appScriptRequest);
    });
  });

  describe('scripts', () => {
    it('is the document for a <script src...> in the HTML', async () => {
      const scriptRequest = networkRequest('scripts/standard.js');
      const initiator = getNetworkInitiator(parsedTrace, scriptRequest);
      assert.strictEqual(initiator, documentRequest);
    });

    it('is the document for a <script src...async> in the HTML', async () => {
      const scriptRequest = networkRequest('scripts/async.js');
      const initiator = getNetworkInitiator(parsedTrace, scriptRequest);
      assert.strictEqual(initiator, documentRequest);
    });

    it('is the document for a <script src...defer> in the HTML', async () => {
      const scriptRequest = networkRequest('scripts/defer.js');
      const initiator = getNetworkInitiator(parsedTrace, scriptRequest);
      assert.strictEqual(initiator, documentRequest);
    });

    it('is the document for a <script type=module> in the HTML', async () => {
      const scriptRequest = networkRequest('scripts/module.js');
      const initiator = getNetworkInitiator(parsedTrace, scriptRequest);
      assert.strictEqual(initiator, documentRequest);
    });

    it('is the document for a <script type=module async> in the HTML', async () => {
      const scriptRequest = networkRequest('scripts/module-async.js');
      const initiator = getNetworkInitiator(parsedTrace, scriptRequest);
      assert.strictEqual(initiator, documentRequest);
    });

    it('is the script for a script node injected dynamically', async () => {
      const scriptRequest = networkRequest('scripts/dynamic.js');
      const appScriptRequest = networkRequest('app.js');
      const initiator = getNetworkInitiator(parsedTrace, scriptRequest);
      assert.strictEqual(initiator, appScriptRequest);
    });

    it('is the script for a script injected via document.write', async () => {
      const scriptRequest = networkRequest('scripts/document-write.js');
      const appScriptRequest = networkRequest('app.js');
      const initiator = getNetworkInitiator(parsedTrace, scriptRequest);
      assert.strictEqual(initiator, appScriptRequest);
    });

    it('is the script for an ESM script that is statically imported', async () => {
      const scriptRequest = networkRequest('scripts/another-module.js');
      const parentModuleRequest = networkRequest('scripts/module.js');
      const initiator = getNetworkInitiator(parsedTrace, scriptRequest);
      assert.strictEqual(initiator, parentModuleRequest);
    });

    it('is the script for an ESM script that is lazily imported', async () => {
      const scriptRequest = networkRequest('scripts/lazy-import-module.js');
      const parentModuleRequest = networkRequest('app.js');
      const initiator = getNetworkInitiator(parsedTrace, scriptRequest);
      assert.strictEqual(initiator, parentModuleRequest);
    });
  });

  describe('stylesheets', () => {
    it('is the document for a <link rel=stylesheet> in the HTML', async () => {
      const styleRequest = networkRequest('stylesheets/style.css');
      const initiator = getNetworkInitiator(parsedTrace, styleRequest);
      assert.strictEqual(initiator, documentRequest);
    });

    it('is the parent CSS sheet for a @import in a CSS sheet', async () => {
      const styleRequest = networkRequest('stylesheets/import.css');
      const parentStyleRequest = networkRequest('stylesheets/style.css');
      const initiator = getNetworkInitiator(parsedTrace, styleRequest);
      assert.strictEqual(initiator, parentStyleRequest);
    });

    it('is the script for a sheet injected from JS', async () => {
      const styleRequest = networkRequest('stylesheets/dynamic.css');
      const scriptRequest = networkRequest('app.js');
      const initiator = getNetworkInitiator(parsedTrace, styleRequest);
      assert.strictEqual(initiator, scriptRequest);
    });
  });

  describe('fonts', () => {
    it('is the document for a preloaded font', async () => {
      const fontRequest = networkRequest('fonts/preloaded.ttf');
      const initiator = getNetworkInitiator(parsedTrace, fontRequest);
      assert.strictEqual(initiator, documentRequest);
    });

    it('is the document for a <link href=> font', async () => {
      const fontRequest = networkRequest('https://fonts.googleapis.com/css?family=Roboto');
      const initiator = getNetworkInitiator(parsedTrace, fontRequest);
      assert.strictEqual(initiator, documentRequest);
    });

    it('is the stylesheet for a @font-face src: font', async () => {
      const fontRequest = networkRequest('font-face.ttf');
      const sheetRequest = networkRequest('style.css');
      const initiator = getNetworkInitiator(parsedTrace, fontRequest);
      assert.strictEqual(initiator, sheetRequest);
    });
  });
});
