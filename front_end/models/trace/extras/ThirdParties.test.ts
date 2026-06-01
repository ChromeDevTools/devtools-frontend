// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

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
      const {data} = await TraceLoader.traceEngine(this, 'load-simple.json.gz');
      const summaries = Trace.Extras.ThirdParties.summarizeByThirdParty(data, data.Meta.traceBounds);

      const results = summaries.map(s => [s.entity.name, s.mainThreadTime, s.transferSize]);
      assert.deepEqual(results, [
        ['localhost', 24.947999954223633, 1435],
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
      ]);
    });

    it('partial trace bounds', async function() {
      const {data} = await TraceLoader.traceEngine(this, 'load-simple.json.gz');

      // Font requests of load-simple.json.gz begin & end before/after this bounds.
      const min = Trace.Types.Timing.Micro(1634222300000);
      const max = Trace.Types.Timing.Micro(1634222320000);
      const bounds = {min, max, range: Trace.Types.Timing.Micro(max - min)};

      const summaries = Trace.Extras.ThirdParties.summarizeByThirdParty(data, bounds);

      const results = summaries.map(s => [s.entity.name, s.mainThreadTime, s.transferSize]);
      assert.deepEqual(results, [
        // No main thread during given bounds. Some network.
        ['localhost', 0, 419],
      ]);
    });

    it('partial trace bounds with unpkg', async function() {
      const {data} = await TraceLoader.traceEngine(this, 'cached-request-unpkg.json.gz');

      // Exclude ResourceReceiveResponse (34566926690) but include ResourceReceivedData (34567008989)
      const min = Trace.Types.Timing.Micro(34566950000);
      const max = Trace.Types.Timing.Micro(34567400000);
      const bounds = {min, max, range: Trace.Types.Timing.Micro(max - min)};

      const summaries = Trace.Extras.ThirdParties.summarizeByThirdParty(data, bounds);

      const unpkgSummary = summaries.find(summary => summary.entity.name === 'Unpkg');
      // Ensure that despite excluding the RRR, we correctly identify the cache hit and set transfer size to 0.
      // Since selfTime is also 0, the node is correctly deleted from the bottom-up tree.
      assert.isUndefined(unpkgSummary);
    });

    it('does not count uncompressed size for cache hits where ResourceFinish is excluded by trace bounds',
       async function() {
         const {data} = await TraceLoader.traceEngine(this, 'cached-request-unpkg.json.gz');

         // Include RRR (34566926690) and RRD (34567008989), but exclude ResourceFinish (34567348845)
         const min = Trace.Types.Timing.Micro(34566900000);
         const max = Trace.Types.Timing.Micro(34567100000);
         const bounds = {min, max, range: Trace.Types.Timing.Micro(max - min)};

         const summaries = Trace.Extras.ThirdParties.summarizeByThirdParty(data, bounds);

         const unpkgSummary = summaries.find(summary => summary.entity.name === 'Unpkg');
         // The first unpkg request is fully within this bounds, so it contributes its 4784 bytes.
         // The second unpkg request (cache hit) has its ResourceReceivedData in this bounds but not its ResourceFinish.
         // We ensure that the cache hit correctly contributes 0 bytes instead of the uncompressed size.
         assert.strictEqual(unpkgSummary?.transferSize, 4784);
       });

    it('no activity within trace bounds', async function() {
      const {data} = await TraceLoader.traceEngine(this, 'load-simple.json.gz');

      const min = Trace.Types.Timing.Micro(1634230000000);
      const max = Trace.Types.Timing.Micro(1634231000000);
      const bounds = {min, max, range: Trace.Types.Timing.Micro(max - min)};
      const summaries = Trace.Extras.ThirdParties.summarizeByThirdParty(data, bounds);

      const results = summaries.map(s => [s.entity.name, s.mainThreadTime, s.transferSize]);
      assert.deepEqual(results, []);
    });
  });

  describe('summarizeByURL', function() {
    it('full trace bounds', async function() {
      const {data} = await TraceLoader.traceEngine(this, 'load-simple.json.gz');
      const summaries = Trace.Extras.ThirdParties.summarizeByURL(data, data.Meta.traceBounds);

      const results = summaries.map(
          s => [s.url, s.request?.args.data.url === s.url, s.entity.name, s.mainThreadTime, s.transferSize]);
      assert.deepEqual(results, [
        ['http://localhost:8080/', true, 'localhost', 21.22599959373474, 751],
        ['http://localhost:8080/styles.css', true, 'localhost', 0, 346],
        ['http://localhost:8080/blocking.js', true, 'localhost', 2.451000213623047, 338],
        ['http://localhost:8080/module.js', true, 'localhost', 1.2710001468658447, 0],
      ]);

      // Assert that these totals match the totals as aggregated by
      // summarizeByThirdParty (see above).
      assert.strictEqual(
          summaries.filter(s => s.entity.name === 'localhost').reduce((acc, cur) => acc + cur.transferSize, 0), 1435);
      assert.strictEqual(
          summaries.filter(s => s.entity.name === 'localhost').reduce((acc, cur) => acc + cur.mainThreadTime, 0),
          24.947999954223633);
    });
  });
});
