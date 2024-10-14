// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import type * as Platform from '../../../core/platform/platform.js';
import * as Bindings from '../../../models/bindings/bindings.js';
import * as Trace from '../../../models/trace/trace.js';
import {
  describeWithMockConnection,
} from '../../../testing/MockConnection.js';
import {
  makeMockSamplesHandlerData,
  makeProfileCall,
} from '../../../testing/TraceHelpers.js';

import { // eslint-disable-line rulesdir/es_modules_import
  loadCodeLocationResolvingScenario,
} from './SourceMapsResolver.test.js';
import * as Utils from './utils.js';

describeWithMockConnection('isIgnoreListedEntry', () => {
  it('uses url mappings to determine if an url is ignore listed', async () => {
    const {authoredScriptURL, genScriptURL, scriptId} = await loadCodeLocationResolvingScenario();

    const LINE_NUMBER = 0;
    const COLUMN_NUMBER = 9;

    const profileCallWithMappings =
        makeProfileCall('function', 10, 100, Trace.Types.Events.ProcessID(1), Trace.Types.Events.ThreadID(1));
    profileCallWithMappings.callFrame = {
      lineNumber: LINE_NUMBER,
      columnNumber: COLUMN_NUMBER,
      functionName: 'minified',
      scriptId,
      url: genScriptURL,
    };

    const workersData: Trace.Handlers.ModelHandlers.Workers.WorkersData = {
      workerSessionIdEvents: [],
      workerIdByThread: new Map(),
      workerURLById: new Map(),
    };

    Bindings.IgnoreListManager.IgnoreListManager.instance().ignoreListURL(
        authoredScriptURL as Platform.DevToolsPath.UrlString);
    const traceWithMappings = {
      Samples: makeMockSamplesHandlerData([profileCallWithMappings]),
      Workers: workersData,
    } as Trace.Handlers.Types.ParsedTrace;
    const resolver = new Utils.SourceMapsResolver.SourceMapsResolver(traceWithMappings);
    await resolver.install();
    assert.isTrue(Utils.IgnoreList.isIgnoreListedEntry(profileCallWithMappings));
  });

  it('ignores entries with a url in the source map\'s ignoreList field when the user enables known third party ignoring',
     async () => {
       const {ignoreListedURL, scriptId} = await loadCodeLocationResolvingScenario();

       // This matches the location mapping added to the sourcemap.
       const LINE_NUMBER = 3;
       const COLUMN_NUMBER = 0;

       const profileCallWithMappings =
           makeProfileCall('function', 10, 100, Trace.Types.Events.ProcessID(1), Trace.Types.Events.ThreadID(1));
       profileCallWithMappings.callFrame = {
         lineNumber: LINE_NUMBER,
         columnNumber: COLUMN_NUMBER,
         functionName: 'ignore',
         scriptId,
         url: ignoreListedURL,
       };

       const workersData: Trace.Handlers.ModelHandlers.Workers.WorkersData = {
         workerSessionIdEvents: [],
         workerIdByThread: new Map(),
         workerURLById: new Map(),
       };
       const traceWithMappings = {
         Samples: makeMockSamplesHandlerData([profileCallWithMappings]),
         Workers: workersData,
       } as Trace.Handlers.Types.ParsedTrace;
       const resolver = new Utils.SourceMapsResolver.SourceMapsResolver(traceWithMappings);
       await resolver.install();
       assert.isTrue(Utils.IgnoreList.isIgnoreListedEntry(profileCallWithMappings));
       const ignoreKnownThirdPartySetting =
           Common.Settings.Settings.instance().moduleSetting('automatically-ignore-list-known-third-party-scripts');
       const ignoreKnownThirdPartySettingValue = ignoreKnownThirdPartySetting.get();

       ignoreKnownThirdPartySetting.set(true);
       assert.isTrue(Utils.IgnoreList.isIgnoreListedEntry(profileCallWithMappings));

       ignoreKnownThirdPartySetting.set(false);
       assert.isFalse(Utils.IgnoreList.isIgnoreListedEntry(profileCallWithMappings));

       // restore to the original value.
       ignoreKnownThirdPartySetting.set(ignoreKnownThirdPartySettingValue);
     });
  it('ignores entries belonging to content script when the user enables content script ignoring', async () => {
    const {contentScriptURL, contentScriptId: scriptId} = await loadCodeLocationResolvingScenario();

    const LINE_NUMBER = 0;
    const COLUMN_NUMBER = 0;

    const profileCallWithContentScript =
        makeProfileCall('function', 10, 100, Trace.Types.Events.ProcessID(1), Trace.Types.Events.ThreadID(1));
    profileCallWithContentScript.callFrame = {
      lineNumber: LINE_NUMBER,
      columnNumber: COLUMN_NUMBER,
      functionName: '',
      scriptId,
      url: contentScriptURL,
    };

    const workersData: Trace.Handlers.ModelHandlers.Workers.WorkersData = {
      workerSessionIdEvents: [],
      workerIdByThread: new Map(),
      workerURLById: new Map(),
    };
    const traceWithMappings = {
      Samples: makeMockSamplesHandlerData([profileCallWithContentScript]),
      Workers: workersData,
    } as Trace.Handlers.Types.ParsedTrace;
    const resolver = new Utils.SourceMapsResolver.SourceMapsResolver(traceWithMappings);
    await resolver.install();
    assert.isTrue(Utils.IgnoreList.isIgnoreListedEntry(profileCallWithContentScript));

    const ignoreContentScriptSetting = Common.Settings.Settings.instance().moduleSetting('skip-content-scripts');
    const ignoreContentScriptSettingValue = ignoreContentScriptSetting.get();

    ignoreContentScriptSetting.set(true);
    assert.isTrue(Utils.IgnoreList.isIgnoreListedEntry(profileCallWithContentScript));

    ignoreContentScriptSetting.set(false);
    assert.isFalse(Utils.IgnoreList.isIgnoreListedEntry(profileCallWithContentScript));

    // restore to the original value.
    ignoreContentScriptSetting.set(ignoreContentScriptSettingValue);
  });
});
