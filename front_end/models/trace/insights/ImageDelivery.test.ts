// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {getFirstOrError, getInsightOrError, processTrace} from '../../../testing/InsightHelpers.js';

import * as Insights from './insights.js';

const {ImageOptimizationType} = Insights.Models.ImageDelivery;

describeWithEnvironment('ImageDelivery', function() {
  it('finds requests for remote fonts', async () => {
    // See the following for a description of each test case:
    // https://gist.github.com/adamraine/397e2bd08665f9e45f6072e446715115
    const {data, insights} = await processTrace(this, 'image-delivery.json.gz');

    const imageRequests = data.NetworkRequests.byTime.filter(r => r.args.data.resourceType === 'Image');
    assert.deepEqual(imageRequests.map(r => r.args.data.url), [
      'https://images.ctfassets.net/u275ja1nivmq/6T6z40ay5GFCUtwV7DONgh/0e23606ed1692d9721ab0f39a8d8a99e/yeti_cover.jpg',
      'https://raw.githubusercontent.com/GoogleChrome/lighthouse/refs/heads/main/cli/test/fixtures/dobetterweb/lighthouse-rotating.gif',
      'https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/5d52a2ab-7be3-4931-9e82-8728d1f55620/d51jfzi-b0efc925-7704-44bb-a3b8-8d98545af693.gif?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7InBhdGgiOiJcL2ZcLzVkNTJhMmFiLTdiZTMtNDkzMS05ZTgyLTg3MjhkMWY1NTYyMFwvZDUxamZ6aS1iMGVmYzkyNS03NzA0LTQ0YmItYTNiOC04ZDk4NTQ1YWY2OTMuZ2lmIn1dXSwiYXVkIjpbInVybjpzZXJ2aWNlOmZpbGUuZG93bmxvYWQiXX0.T898HUlAbGFPboxRE43H5JujnDGl0zd_T128PnGLlpg',
      'https://images.ctfassets.net/u275ja1nivmq/6T6z40ay5GFCUtwV7DONgh/0e23606ed1692d9721ab0f39a8d8a99e/yeti_cover.jpg?fm=webp',
      'https://images.ctfassets.net/u275ja1nivmq/6T6z40ay5GFCUtwV7DONgh/0e23606ed1692d9721ab0f39a8d8a99e/yeti_cover.jpg?fm=avif',
      'https://raw.githubusercontent.com/GoogleChrome/lighthouse/refs/heads/main/cli/test/fixtures/byte-efficiency/lighthouse-2048x1356.webp',
      'https://raw.githubusercontent.com/GoogleChrome/lighthouse/refs/heads/main/cli/test/fixtures/byte-efficiency/lighthouse-480x320.webp',
      'https://onlinepngtools.com/images/examples-onlinepngtools/elephant-hd-quality.png',
      'https://raw.githubusercontent.com/GoogleChrome/lighthouse/refs/heads/main/cli/test/fixtures/dobetterweb/lighthouse-480x318.jpg',
    ]);

    const insight =
        getInsightOrError('ImageDelivery', insights, getFirstOrError(data.Meta.navigationsByNavigationId.values()));
    assert.strictEqual(insight.wastedBytes, 2007125);
    assert.strictEqual(insight.metricSavings!.FCP, 0);
    assert.strictEqual(insight.metricSavings!.LCP, 100);
    assert.deepEqual(
        insight.optimizableImages.map(
            o => ({url: o.request.args.data.url, optimizations: o.optimizations, byteSavings: o.byteSavings})),
        [
          {
            byteSavings: 1057876,
            optimizations: [
              {
                byteSavings: 1057876,
                type: ImageOptimizationType.MODERN_FORMAT_OR_COMPRESSION,
              },
            ],
            url:
                'https://images.ctfassets.net/u275ja1nivmq/6T6z40ay5GFCUtwV7DONgh/0e23606ed1692d9721ab0f39a8d8a99e/yeti_cover.jpg',
          },
          {
            byteSavings: 682028,
            optimizations: [
              {
                byteSavings: 682028,
                type: ImageOptimizationType.VIDEO_FORMAT,
              },
            ],
            url:
                'https://raw.githubusercontent.com/GoogleChrome/lighthouse/refs/heads/main/cli/test/fixtures/dobetterweb/lighthouse-rotating.gif',
          },
          {
            byteSavings: 176040,
            optimizations: [
              {
                byteSavings: 134075,
                type: ImageOptimizationType.MODERN_FORMAT_OR_COMPRESSION,
              },
              {
                byteSavings: 162947,
                type: ImageOptimizationType.RESPONSIVE_SIZE,
                fileDimensions: {width: 640, height: 436},
                displayDimensions: {width: 200, height: 136},
              },
            ],
            url: 'https://onlinepngtools.com/images/examples-onlinepngtools/elephant-hd-quality.png',
          },
          {
            byteSavings: 49760,
            optimizations: [
              {
                byteSavings: 49760,
                type: ImageOptimizationType.ADJUST_COMPRESSION,
              },
            ],
            url:
                'https://images.ctfassets.net/u275ja1nivmq/6T6z40ay5GFCUtwV7DONgh/0e23606ed1692d9721ab0f39a8d8a99e/yeti_cover.jpg?fm=webp',
          },
          {
            byteSavings: 41421,
            optimizations: [
              {
                byteSavings: 41421,
                type: ImageOptimizationType.RESPONSIVE_SIZE,
                fileDimensions: {width: 2048, height: 1356},
                displayDimensions: {width: 200, height: 132},
              },
            ],
            url:
                'https://raw.githubusercontent.com/GoogleChrome/lighthouse/refs/heads/main/cli/test/fixtures/byte-efficiency/lighthouse-2048x1356.webp',
          },
        ],
    );
  });

  it('handles responsive image exceptions', async () => {
    const {data, insights} = await processTrace(this, 'byte-efficiency.json.gz');

    const insight =
        getInsightOrError('ImageDelivery', insights, getFirstOrError(data.Meta.navigationsByNavigationId.values()));
    assert.deepEqual(
        insight.optimizableImages.map(o => o.request.args.data.url).sort(),
        [
          // Several additional images would be in this list if we did not ignore them
          // - A <picture> image
          // - An image with `srcset`
          // - CSS background images
          'http://localhost:10200/byte-efficiency/lighthouse-1024x680.jpg',
          'http://localhost:10200/byte-efficiency/lighthouse-480x320.jpg',
          'http://localhost:10200/byte-efficiency/lighthouse-480x320.jpg?attributesized',
          'http://localhost:10200/byte-efficiency/lighthouse-480x320.webp',
          // TODO(b/400518751): Assume 2 viewport size for image that isn't rendered.
          // https://github.com/GoogleChrome/lighthouse/issues/7236
          // 'localhost:10200/byte-efficiency/lighthouse-2048x1356.webp?size0'
        ],
    );
  });
});
