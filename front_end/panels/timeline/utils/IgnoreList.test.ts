// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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
});
