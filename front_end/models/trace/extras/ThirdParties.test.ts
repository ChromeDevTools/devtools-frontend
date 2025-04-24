// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../trace.js';

function extractUrlsFromSummaries(summaries: Trace.Extras.ThirdParties.EntitySummary[]): Array<[string, string[]]> {
  return summaries.map(s => {
    const uniqueUrls = new Set<string>();
    s.relatedEvents.forEach(e => {
      const url = e.args?.data?.url;
      if (url) {
        uniqueUrls.add(url);
      }
    });
    return [s.entity.name, Array.from(uniqueUrls)];
  });
}

describeWithEnvironment('ThirdParties', function() {
  describe('summarizeByThirdParty', function() {
    it('full trace bounds', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'load-simple.json.gz');
      const summaries = Trace.Extras.ThirdParties.summarizeByThirdParty(parsedTrace, parsedTrace.Meta.traceBounds);

      const results = summaries.map(s => [s.entity.name, s.mainThreadTime, s.transferSize]);
      assert.deepEqual(results, [
        ['localhost', 24.947999954223633, 1503],
        ['Google Fonts', 0, 25325],
      ]);
      const urls = extractUrlsFromSummaries(summaries);
      assert.deepEqual(urls, [
        [
          'localhost',
          [
            'http://localhost:8080/',
            'http://localhost:8080/styles.css',
            'http://localhost:8080/blocking.js',
            'http://localhost:8080/module.js',
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

    it('partial trace bounds', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'load-simple.json.gz');

      // Font requests of load-simple.json.gz begin & end before/after this bounds.
      const min = Trace.Types.Timing.Micro(1634222300000);
      const max = Trace.Types.Timing.Micro(1634222320000);
      const bounds = {min, max, range: Trace.Types.Timing.Micro(max - min)};

      const summaries = Trace.Extras.ThirdParties.summarizeByThirdParty(parsedTrace, bounds);

      const results = summaries.map(s => [s.entity.name, s.mainThreadTime, s.transferSize]);
      assert.deepEqual(results, [
        // No main thread during given bounds. Some network.
        ['localhost', 0, 419],
      ]);
    });

    it('no activity within trace bounds', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'load-simple.json.gz');

      const min = Trace.Types.Timing.Micro(1634230000000);
      const max = Trace.Types.Timing.Micro(1634231000000);
      const bounds = {min, max, range: Trace.Types.Timing.Micro(max - min)};
      const summaries = Trace.Extras.ThirdParties.summarizeByThirdParty(parsedTrace, bounds);

      const results = summaries.map(s => [s.entity.name, s.mainThreadTime, s.transferSize]);
      assert.deepEqual(results, []);
    });
  });

  describe('summarizeByURL', function() {
    it('full trace bounds', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'load-simple.json.gz');
      const summaries = Trace.Extras.ThirdParties.summarizeByURL(parsedTrace, parsedTrace.Meta.traceBounds);

      const results = summaries.map(
          s => [s.url, s.request?.args.data.url === s.url, s.entity.name, s.mainThreadTime, s.transferSize]);
      assert.deepEqual(results, [
        ['http://localhost:8080/', true, 'localhost', 21.22599959373474, 751],
        ['https://fonts.googleapis.com/css2?family=Orelega+One&display=swap', true, 'Google Fonts', 0, 1373],
        ['http://localhost:8080/styles.css', true, 'localhost', 0, 346],
        ['http://localhost:8080/blocking.js', true, 'localhost', 2.451000213623047, 338],
        ['https://fonts.gstatic.com/s/orelegaone/v1/3qTpojOggD2XtAdFb-QXZFt93kY.woff2', true, 'Google Fonts', 0, 23952],
        ['http://localhost:8080/module.js', true, 'localhost', 1.2710001468658447, 68],
      ]);

      // Assert that these totals match the totals as aggregated by
      // summarizeByThirdParty (see above).
      assert.strictEqual(
          summaries.filter(s => s.entity.name === 'localhost').reduce((acc, cur) => acc + cur.transferSize, 0), 1503);
      assert.strictEqual(
          summaries.filter(s => s.entity.name === 'localhost').reduce((acc, cur) => acc + cur.mainThreadTime, 0),
          24.947999954223633);
      assert.strictEqual(
          summaries.filter(s => s.entity.name === 'Google Fonts').reduce((acc, cur) => acc + cur.transferSize, 0),
          25325);
      assert.strictEqual(
          summaries.filter(s => s.entity.name === 'Google Fonts').reduce((acc, cur) => acc + cur.mainThreadTime, 0), 0);
    });
  });
});
