// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../trace.js';

describeWithEnvironment('ThirdParties', function() {
  describe('byTraceBounds', function() {
    it('full trace bounds', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'load-simple.json.gz');

      const requests = parsedTrace.NetworkRequests.byTime.filter(
          request => Trace.Helpers.Timing.eventIsInBounds(request, parsedTrace.Meta.traceBounds));
      const thirdPartySummary =
          Trace.Extras.ThirdParties.summarizeThirdParties(parsedTrace, parsedTrace.Meta.traceBounds, requests);

      const results = [...thirdPartySummary.byEntity.entries()].map(([entity, summary]) => [entity.name, summary]);
      assert.deepEqual(results, [
        ['localhost', {mainThreadTime: 26381, transferSize: 751}],
        ['Google Fonts', {mainThreadTime: 0, transferSize: 0}],
      ]);

      assert.deepEqual([...thirdPartySummary.byUrl.entries()], [
        ['extensions::SafeBuiltins', {mainThreadTime: 1448, transferSize: 0}],
        ['http://localhost:8080/', {mainThreadTime: 21674, transferSize: 751}],
        ['http://localhost:8080/blocking.js', {mainThreadTime: 2451, transferSize: 0}],
        ['http://localhost:8080/module.js', {mainThreadTime: 2256, transferSize: 0}],
        ['https://fonts.googleapis.com/css2?family=Orelega+One&display=swap', {mainThreadTime: 0, transferSize: 0}],
        ['http://localhost:8080/styles.css', {mainThreadTime: 0, transferSize: 0}],
        [
          'https://fonts.gstatic.com/s/orelegaone/v1/3qTpojOggD2XtAdFb-QXZFt93kY.woff2',
          {mainThreadTime: 0, transferSize: 0}
        ],
      ]);

      const urls = [...thirdPartySummary.urlsByEntity.entries()].map(([entity, urls]) => [entity.name, [...urls]]);
      assert.deepEqual(urls, [
        [
          'localhost',
          [
            'http://localhost:8080/',
            'http://localhost:8080/blocking.js',
            'http://localhost:8080/module.js',
            'http://localhost:8080/styles.css',
          ]
        ],
        [
          'Google Fonts',
          [
            'https://fonts.googleapis.com/css2?family=Orelega+One&display=swap',
            'https://fonts.gstatic.com/s/orelegaone/v1/3qTpojOggD2XtAdFb-QXZFt93kY.woff2',
          ]
        ],
      ]);
    });

    it('works even without network requests', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'load-simple.json.gz');

      const thirdPartySummary =
          Trace.Extras.ThirdParties.summarizeThirdParties(parsedTrace, parsedTrace.Meta.traceBounds, []);

      const results = [...thirdPartySummary.byEntity.entries()].map(([entity, summary]) => [entity.name, summary]);
      assert.deepEqual(results, [
        // Since network requests were not given, there is no transfer size.
        ['localhost', {mainThreadTime: 26381, transferSize: 0}],
      ]);

      assert.deepEqual([...thirdPartySummary.byUrl.entries()], [
        ['extensions::SafeBuiltins', {mainThreadTime: 1448, transferSize: 0}],
        ['http://localhost:8080/', {mainThreadTime: 21674, transferSize: 0}],
        ['http://localhost:8080/blocking.js', {mainThreadTime: 2451, transferSize: 0}],
        ['http://localhost:8080/module.js', {mainThreadTime: 2256, transferSize: 0}],
      ]);

      const urls = [...thirdPartySummary.urlsByEntity.entries()].map(([entity, urls]) => [entity.name, [...urls]]);
      assert.deepEqual(urls, [
        [
          'localhost',
          [
            'http://localhost:8080/',
            'http://localhost:8080/blocking.js',
            'http://localhost:8080/module.js',
          ]
        ],
      ]);
    });

    it('partial trace bounds', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'load-simple.json.gz');

      // Font requests of load-simple.json.gz begin & end before/after this bounds.
      const min = Trace.Types.Timing.Micro(1634222300000);
      const max = Trace.Types.Timing.Micro(1634222320000);
      const bounds = {min, max, range: Trace.Types.Timing.Micro(max - min)};

      const requests =
          parsedTrace.NetworkRequests.byTime.filter(request => Trace.Helpers.Timing.eventIsInBounds(request, bounds));
      const thirdPartySummary = Trace.Extras.ThirdParties.summarizeThirdParties(parsedTrace, bounds, requests);

      const results = [...thirdPartySummary.byEntity.entries()].map(([entity, summary]) => [entity.name, summary]);
      assert.deepEqual(results, [
        // No main thread during given bounds. Some network.
        ['localhost', {mainThreadTime: 0, transferSize: 751}],
      ]);
    });

    it('no activity within trace bounds', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'load-simple.json.gz');

      const min = Trace.Types.Timing.Micro(1634230000000);
      const max = Trace.Types.Timing.Micro(1634231000000);
      const bounds = {min, max, range: Trace.Types.Timing.Micro(max - min)};

      const requests =
          parsedTrace.NetworkRequests.byTime.filter(request => Trace.Helpers.Timing.eventIsInBounds(request, bounds));
      const thirdPartySummary = Trace.Extras.ThirdParties.summarizeThirdParties(parsedTrace, bounds, requests);

      const results = [...thirdPartySummary.byEntity.entries()].map(([entity, summary]) => [entity.name, summary]);
      assert.deepEqual(results, []);
    });
  });
});
