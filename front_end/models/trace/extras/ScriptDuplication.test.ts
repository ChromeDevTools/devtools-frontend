// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {fetchFixture} from '../../../testing/TraceLoader.js';
import * as Trace from '../trace.js';

async function loadScriptFixture(
    name: string, modify?: (fixture: {content: string, sourceMapJson: SDK.SourceMap.SourceMapV3Object}) => void):
    Promise<Trace.Handlers.ModelHandlers.Scripts.Script> {
  const content =
      await fetchFixture(new URL(`../../../panels/timeline/fixtures/traces/scripts/${name}.js.gz`, import.meta.url));
  const mapText = await fetchFixture(
      new URL(`../../../panels/timeline/fixtures/traces/scripts/${name}.js.map.gz`, import.meta.url));
  const sourceMapJson = JSON.parse(mapText) as SDK.SourceMap.SourceMapV3Object;
  const fixture = {content, sourceMapJson};
  if (modify) {
    modify(fixture);
  }

  const compiledUrl = Platform.DevToolsPath.urlString`${name}.js`;
  const mapUrl = Platform.DevToolsPath.urlString`${name}.js.map`;
  return {
    scriptId: `1.${name}` as Protocol.Runtime.ScriptId,
    frame: 'abcdef',
    ts: 0 as Trace.Types.Timing.Micro,
    content: fixture.content,
    sourceMap: new SDK.SourceMap.SourceMap(compiledUrl, mapUrl, fixture.sourceMapJson),
  };
}

describeWithEnvironment('ScriptDuplication', function() {
  describe('computeGeneratedFileSizes', () => {
    it('works (simple map)', async function() {
      const script = await loadScriptFixture('foo.min');
      const results = Trace.Extras.ScriptDuplication.computeGeneratedFileSizes(script);
      assert.deepEqual(results, {
        files: {
          'node_modules/browser-pack/_prelude.js': 480,
          'src/bar.js': 104,
          'src/foo.js': 98,
        },
        totalBytes: 718,
        unmappedBytes: 36,
      });
    });

    it('works (complex map)', async function() {
      const script = await loadScriptFixture('squoosh');
      const results = Trace.Extras.ScriptDuplication.computeGeneratedFileSizes(script);
      assert.deepEqual(results, {
        files: {
          'webpack:///node_modules/comlink/comlink.js': 4117,
          'webpack:///node_modules/linkstate/dist/linkstate.es.js': 412,
          'webpack:///node_modules/pointer-tracker/dist/PointerTracker.mjs': 2672,
          'webpack:///node_modules/pretty-bytes/index.js': 635,
          'webpack:///src/codecs/browser-bmp/encoder-meta.ts': 343,
          'webpack:///src/codecs/browser-bmp/encoder.ts': 101,
          'webpack:///src/codecs/browser-gif/encoder-meta.ts': 343,
          'webpack:///src/codecs/browser-gif/encoder.ts': 101,
          'webpack:///src/codecs/browser-jp2/encoder-meta.ts': 349,
          'webpack:///src/codecs/browser-jp2/encoder.ts': 101,
          'webpack:///src/codecs/browser-jpeg/encoder-meta.ts': 282,
          'webpack:///src/codecs/browser-jpeg/encoder.ts': 115,
          'webpack:///src/codecs/browser-jpeg/options.ts': 35,
          'webpack:///src/codecs/browser-pdf/encoder-meta.ts': 349,
          'webpack:///src/codecs/browser-pdf/encoder.ts': 101,
          'webpack:///src/codecs/browser-png/encoder-meta.ts': 268,
          'webpack:///src/codecs/browser-png/encoder.tsx': 101,
          'webpack:///src/codecs/browser-tiff/encoder-meta.ts': 347,
          'webpack:///src/codecs/browser-tiff/encoder.ts': 101,
          'webpack:///src/codecs/browser-webp/encoder-meta.ts': 358,
          'webpack:///src/codecs/browser-webp/encoder.ts': 115,
          'webpack:///src/codecs/browser-webp/options.ts': 34,
          'webpack:///src/codecs/decoders.ts': 206,
          'webpack:///src/codecs/encoders.ts': 336,
          'webpack:///src/codecs/generic/quality-option.tsx': 398,
          'webpack:///src/codecs/generic/util.ts': 159,
          'webpack:///src/codecs/identity/encoder-meta.ts': 46,
          'webpack:///src/codecs/imagequant/options.tsx': 1052,
          'webpack:///src/codecs/imagequant/processor-meta.ts': 40,
          'webpack:///src/codecs/input-processors.ts': 11,
          'webpack:///src/codecs/mozjpeg/encoder-meta.ts': 436,
          'webpack:///src/codecs/mozjpeg/options.tsx': 4416,
          'webpack:///src/codecs/optipng/encoder-meta.ts': 59,
          'webpack:///src/codecs/optipng/options.tsx': 366,
          'webpack:///src/codecs/preprocessors.ts': 75,
          'webpack:///src/codecs/processor-worker/index.ts': 50,
          'webpack:///src/codecs/processor.ts': 2380,
          'webpack:///src/codecs/resize/options.tsx': 3970,
          'webpack:///src/codecs/resize/processor-meta.ts': 225,
          'webpack:///src/codecs/resize/processor-sync.ts': 462,
          'webpack:///src/codecs/resize/util.ts': 134,
          'webpack:///src/codecs/rotate/processor-meta.ts': 18,
          'webpack:///src/codecs/tiny.webp': 89,
          'webpack:///src/codecs/webp/encoder-meta.ts': 660,
          'webpack:///src/codecs/webp/options.tsx': 5114,
          'webpack:///src/components/Options/index.tsx': 2176,
          'webpack:///src/components/Options/style.scss': 410,
          'webpack:///src/components/Output/custom-els/PinchZoom/index.ts': 3653,
          'webpack:///src/components/Output/custom-els/TwoUp/index.ts': 2088,
          'webpack:///src/components/Output/custom-els/TwoUp/styles.css': 75,
          'webpack:///src/components/Output/index.tsx': 5199,
          'webpack:///src/components/Output/style.scss': 447,
          'webpack:///src/components/checkbox/index.tsx': 247,
          'webpack:///src/components/checkbox/style.scss': 106,
          'webpack:///src/components/compress/custom-els/MultiPanel/index.ts': 3461,
          'webpack:///src/components/compress/custom-els/MultiPanel/styles.css': 105,
          'webpack:///src/components/compress/index.tsx': 8782,
          'webpack:///src/components/compress/result-cache.ts': 611,
          'webpack:///src/components/compress/style.scss': 132,
          'webpack:///src/components/expander/index.tsx': 901,
          'webpack:///src/components/expander/style.scss': 66,
          'webpack:///src/components/range/index.tsx': 566,
          'webpack:///src/components/range/style.scss': 200,
          'webpack:///src/components/results/FileSize.tsx': 445,
          'webpack:///src/components/results/index.tsx': 1538,
          'webpack:///src/components/results/style.scss': 780,
          'webpack:///src/components/select/index.tsx': 291,
          'webpack:///src/components/select/style.scss': 103,
          'webpack:///src/custom-els/RangeInput/index.ts': 2138,
          'webpack:///src/custom-els/RangeInput/styles.css': 180,
          'webpack:///src/lib/clean-modify.ts': 331,
          'webpack:///src/lib/icons.tsx': 2531,
          'webpack:///src/lib/util.ts': 4043,
        },
        totalBytes: 83748,
        unmappedBytes: 10061,
      });
    });

    it('fault tolerance (null source)', async function() {
      const script = await loadScriptFixture('foo.min', fixture => {
        const map = fixture.sourceMapJson;
        // @ts-expect-error
        map.sources[1] = null;
      });
      const results = Trace.Extras.ScriptDuplication.computeGeneratedFileSizes(script);
      assert.deepEqual(results, {
        files: {
          'node_modules/browser-pack/_prelude.js': 480,
          null: 104,
          'src/foo.js': 98,
        },
        totalBytes: 718,
        unmappedBytes: 36,
      });
    });

    it('fault tolerance (bogus mappings)', async function() {
      const script = await loadScriptFixture('foo.min', fixture => {
        fixture.sourceMapJson.mappings = 'blahblah blah';
      });
      const results = Trace.Extras.ScriptDuplication.computeGeneratedFileSizes(script);
      assert.deepEqual(results, {
        files: {},
        totalBytes: 718,
        unmappedBytes: 718,
      });
    });

    it('fault tolerance (mismatched content/map 1)', async function() {
      const script = await loadScriptFixture('foo.min', fixture => {
        fixture.content = 'blahblah blah';
      });
      const results = Trace.Extras.ScriptDuplication.computeGeneratedFileSizes(script);
      assert.deepEqual(results, {
        errorMessage: 'foo.min.js.map mapping for last column out of bounds: 1:14',
      });
    });

    it('fault tolerance (mismatched content/map 2)', async function() {
      const script = await loadScriptFixture('foo.min', fixture => {
        fixture.content = '';
      });
      const results = Trace.Extras.ScriptDuplication.computeGeneratedFileSizes(script);
      assert.deepEqual(results, {
        errorMessage: 'foo.min.js.map mapping for column out of bounds: 1:1',
      });
    });

    it('fault tolerance (mismatched content/map 3)', async function() {
      const script = await loadScriptFixture('foo.min', fixture => {
        const newMappings = fixture.sourceMapJson.mappings.split(',');
        assert.strictEqual(newMappings[1], 'SAAAA');
        // Make the column offset very big, force out of bounds.
        // See https://www.mattzeunert.com/2016/02/14/how-do-source-maps-work.html
        newMappings[1] = 'kD' +
            'AAAA';
        fixture.sourceMapJson.mappings = newMappings.join(',');
      });
      const results = Trace.Extras.ScriptDuplication.computeGeneratedFileSizes(script);
      assert.deepEqual(results, {
        errorMessage: 'foo.min.js.map mapping for last column out of bounds: 1:685',
      });
    });

    it('fault tolerance (mismatched content/map 4)', async function() {
      const script = await loadScriptFixture('foo.min', fixture => {
        const newMappings = fixture.sourceMapJson.mappings.split(',');
        assert.strictEqual(newMappings[1], 'SAAAA');
        // Make the line offset very big, force out of bounds.
        // See https://sourcemaps.info/spec.html#:~:text=broken%20down%20as%20follows
        fixture.sourceMapJson.mappings = ';'.repeat(10) + fixture.sourceMapJson.mappings;
      });
      const results = Trace.Extras.ScriptDuplication.computeGeneratedFileSizes(script);
      assert.deepEqual(results, {
        errorMessage: 'foo.min.js.map mapping for line out of bounds: 11',
      });
    });

    it('fault tolerance (bad names)', async function() {
      const script = await loadScriptFixture('foo.min', fixture => {
        fixture.sourceMapJson.names = ['blah'];
      });
      const results = Trace.Extras.ScriptDuplication.computeGeneratedFileSizes(script);
      assert.deepEqual(results, {
        files: {
          'node_modules/browser-pack/_prelude.js': 480,
          'src/bar.js': 104,
          'src/foo.js': 98,
        },
        totalBytes: 718,
        unmappedBytes: 36,
      });
    });
  });

  describe('computeScriptDuplication', () => {
    it('works (simple, no duplication)', async () => {
      const scripts = [await loadScriptFixture('foo.min')];
      const scriptsData: Trace.Handlers.ModelHandlers.Scripts.ScriptsData = {
        scripts: new Map(scripts.map(s => ([s.scriptId, s]))),
      };

      const results = Object.fromEntries(Trace.Extras.ScriptDuplication.computeScriptDuplication(scriptsData));
      assert.deepEqual(results, {});
    });

    it('works (complex, lots of duplication)', async () => {
      const scripts = [await loadScriptFixture('coursehero-bundle-1'), await loadScriptFixture('coursehero-bundle-2')];
      const scriptsData: Trace.Handlers.ModelHandlers.Scripts.ScriptsData = {
        scripts: new Map(scripts.map(s => ([s.scriptId, s]))),
      };

      const results = Object.fromEntries(Trace.Extras.ScriptDuplication.computeScriptDuplication(scriptsData));
      assert.deepEqual(results, {
        'coursehero:///Control/assets/js/vendor/ng/select/select.js': [
          {scriptId: '1.coursehero-bundle-1', resourceSize: 48513},
          {scriptId: '1.coursehero-bundle-2', resourceSize: 48513}
        ],
        'coursehero:///Control/assets/js/vendor/ng/select/angular-sanitize.js': [
          {scriptId: '1.coursehero-bundle-1', resourceSize: 9135},
          {scriptId: '1.coursehero-bundle-2', resourceSize: 9135}
        ],
        'node_modules/@babel/runtime/helpers/inherits.js': [
          {scriptId: '1.coursehero-bundle-1', resourceSize: 528}, {scriptId: '1.coursehero-bundle-2', resourceSize: 528}
        ],
        'node_modules/@babel/runtime/helpers/typeof.js': [
          {scriptId: '1.coursehero-bundle-1', resourceSize: 992}, {scriptId: '1.coursehero-bundle-2', resourceSize: 992}
        ],
        'coursehero:///js/src/utils/service/amplitude-service.ts': [
          {scriptId: '1.coursehero-bundle-1', resourceSize: 1348},
          {scriptId: '1.coursehero-bundle-2', resourceSize: 1325}
        ],
        'coursehero:///js/src/utils/service/gsa-inmeta-tags.ts': [
          {scriptId: '1.coursehero-bundle-1', resourceSize: 591}, {scriptId: '1.coursehero-bundle-2', resourceSize: 563}
        ],
        'coursehero:///js/src/search/results/store/filter-actions.ts': [
          {scriptId: '1.coursehero-bundle-2', resourceSize: 956}, {scriptId: '1.coursehero-bundle-1', resourceSize: 946}
        ],
        'coursehero:///js/src/search/results/store/item/resource-types.ts': [
          {scriptId: '1.coursehero-bundle-1', resourceSize: 783}, {scriptId: '1.coursehero-bundle-2', resourceSize: 775}
        ],
        'coursehero:///js/src/search/results/store/filter-store.ts': [
          {scriptId: '1.coursehero-bundle-1', resourceSize: 12717},
          {scriptId: '1.coursehero-bundle-2', resourceSize: 12650}
        ],
        'coursehero:///js/src/search/results/view/filter/autocomplete-list.tsx': [
          {scriptId: '1.coursehero-bundle-2', resourceSize: 1143},
          {scriptId: '1.coursehero-bundle-1', resourceSize: 1134}
        ],
        'coursehero:///js/src/search/results/view/filter/autocomplete-filter.tsx': [
          {scriptId: '1.coursehero-bundle-1', resourceSize: 3823},
          {scriptId: '1.coursehero-bundle-2', resourceSize: 3812}
        ],
        'coursehero:///js/src/search/results/view/filter/autocomplete-filter-with-icon.tsx': [
          {scriptId: '1.coursehero-bundle-1', resourceSize: 2696},
          {scriptId: '1.coursehero-bundle-2', resourceSize: 2693}
        ],
        'coursehero:///js/src/search/results/service/api/filter-api-service.ts': [
          {scriptId: '1.coursehero-bundle-1', resourceSize: 554}, {scriptId: '1.coursehero-bundle-2', resourceSize: 534}
        ],
        'coursehero:///js/src/common/component/school-search.tsx': [
          {scriptId: '1.coursehero-bundle-2', resourceSize: 5840},
          {scriptId: '1.coursehero-bundle-1', resourceSize: 5316}
        ],
        'coursehero:///js/src/common/component/search/abstract-taxonomy-search.tsx': [
          {scriptId: '1.coursehero-bundle-1', resourceSize: 3103},
          {scriptId: '1.coursehero-bundle-2', resourceSize: 3098}
        ],
        'coursehero:///js/src/common/component/search/course-search.tsx': [
          {scriptId: '1.coursehero-bundle-2', resourceSize: 545}, {scriptId: '1.coursehero-bundle-1', resourceSize: 544}
        ]
      });
    });
  });

  describe('normalizeDuplication', () => {
    it('removes entries with just one value', () => {
      const duplication = new Map([['1', [{resourceSize: 100}]]]) as Trace.Extras.ScriptDuplication.ScriptDuplication;
      Trace.Extras.ScriptDuplication.normalizeDuplication(duplication);
      const results = Object.fromEntries(duplication);
      assert.deepEqual(results, {});
    });

    it('sorts entries based on resource size', () => {
      const duplication = new Map([
                            ['1', [{resourceSize: 250}, {resourceSize: 200}]],
                            ['2', [{resourceSize: 200}, {resourceSize: 250}]],
                          ]) as Trace.Extras.ScriptDuplication.ScriptDuplication;
      Trace.Extras.ScriptDuplication.normalizeDuplication(duplication);
      const results = Object.fromEntries(duplication);
      assert.deepEqual(results, {});
    });

    it('removes duplication if size is much smaller than the largest', () => {
      const duplication = new Map([
                            ['1', [{resourceSize: 200}, {resourceSize: 1}, {resourceSize: 250}]],
                            ['2', [{resourceSize: 250}, {resourceSize: 1}]],
                          ]) as Trace.Extras.ScriptDuplication.ScriptDuplication;
      Trace.Extras.ScriptDuplication.normalizeDuplication(duplication);
      const results = Object.fromEntries(duplication);
      assert.deepEqual(results, {});
    });
  });

  it('normalizeSource', () => {
    const testCases = [
      ['test.js', 'test.js'],
      ['node_modules/othermodule.js', 'node_modules/othermodule.js'],
      ['node_modules/somemodule/node_modules/othermodule.js', 'node_modules/othermodule.js'],
      [
        'node_modules/somemodule/node_modules/somemodule2/node_modules/othermodule.js',
        'node_modules/othermodule.js',
      ],
      ['webpack.js?', 'webpack.js'],
    ];
    for (const [input, expected] of testCases) {
      assert.strictEqual(Trace.Extras.ScriptDuplication.normalizeSource(input), expected);
    }
  });
});
