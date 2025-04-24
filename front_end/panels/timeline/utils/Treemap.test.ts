// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';

import * as Utils from './utils.js';

describe('Treemap', () => {
  describe('makeScriptNode', () => {
    const src = 'main.js';

    it('uses node data when available', () => {
      const node = Utils.Treemap.makeScriptNode(src, '', {
        'a.js': {resourceBytes: 100},
        'b.js': {resourceBytes: 100, duplicatedNormalizedModuleName: 'blah'},
        'c.js': {resourceBytes: 100},
      });
      assert.deepEqual(node, {
        name: src,
        resourceBytes: 300,
        encodedBytes: undefined,
        children: [
          {
            name: 'a.js',
            resourceBytes: 100,
            encodedBytes: undefined,
          },
          {
            duplicatedNormalizedModuleName: 'blah',
            name: 'b.js',
            resourceBytes: 100,
            encodedBytes: undefined,
          },
          {
            name: 'c.js',
            resourceBytes: 100,
            encodedBytes: undefined,
          },
        ],
      });
    });

    it('creates directory node when multiple leaf nodes', () => {
      const node = Utils.Treemap.makeScriptNode(src, '', {
        'folder/a.js': {resourceBytes: 100},
        'folder/b.js': {resourceBytes: 100},
      });
      assert.deepEqual(node, {
        name: src,
        children: [
          {
            children: [
              {
                name: 'a.js',
                resourceBytes: 100,
                encodedBytes: undefined,
              },
              {
                name: 'b.js',
                resourceBytes: 100,
                encodedBytes: undefined,
              },
            ],
            name: '/folder',
            resourceBytes: 200,
            encodedBytes: undefined,
          },
        ],
        resourceBytes: 200,
        encodedBytes: undefined,
      });
    });

    it('flattens directory node when single leaf nodes', () => {
      const node = Utils.Treemap.makeScriptNode(src, '', {
        'root/folder1/a.js': {resourceBytes: 100},
        'root/folder2/b.js': {resourceBytes: 100},
      });
      assert.deepEqual(node, {
        name: src,
        children: [
          {
            children: [
              {
                children: undefined,
                name: 'folder1/a.js',
                resourceBytes: 100,
                encodedBytes: undefined,
              },
              {
                children: undefined,
                name: 'folder2/b.js',
                resourceBytes: 100,
                encodedBytes: undefined,
              },
            ],
            name: '/root',
            resourceBytes: 200,
            encodedBytes: undefined,
          },
        ],
        resourceBytes: 200,
        encodedBytes: undefined,
      });
    });

    it('ignores leading slashes', () => {
      const node = Utils.Treemap.makeScriptNode(src, '', {
        '/a.js': {resourceBytes: 100},
        '/b.js': {resourceBytes: 100},
      });
      assert.deepEqual(node, {
        name: src,
        resourceBytes: 200,
        encodedBytes: undefined,
        children: [
          {
            name: 'a.js',
            resourceBytes: 100,
            encodedBytes: undefined,
          },
          {
            name: 'b.js',
            resourceBytes: 100,
            encodedBytes: undefined,
          },
        ],
      });
    });

    it('ignores repeated slashes', () => {
      const node = Utils.Treemap.makeScriptNode(src, '', {
        'root//a.js': {resourceBytes: 100},
        'root//b.js': {resourceBytes: 100},
      });
      assert.deepEqual(node, {
        name: src,
        children: [
          {
            name: '/root',
            children: [
              {
                name: 'a.js',
                resourceBytes: 100,
                encodedBytes: undefined,
              },
              {
                name: 'b.js',
                resourceBytes: 100,
                encodedBytes: undefined,
              },
            ],
            resourceBytes: 200,
            encodedBytes: undefined,
          },
        ],
        resourceBytes: 200,
        encodedBytes: undefined,
      });
    });

    it('source root replaces matching prefixes', () => {
      const sourcesData = {
        'some/prefix/main.js': {resourceBytes: 100},
        'not/some/prefix/a.js': {resourceBytes: 101},
      };
      let node = Utils.Treemap.makeScriptNode(src, 'some/prefix', sourcesData);
      assert.deepEqual(node, {
        name: src,
        children: [
          {
            name: 'some/prefix',
            resourceBytes: 201,
            encodedBytes: undefined,
            children: [
              {
                name: 'main.js',
                resourceBytes: 100,
                encodedBytes: undefined,
              },
              {
                name: 'not/a.js',
                resourceBytes: 101,
                encodedBytes: undefined,
                children: undefined,
              },
            ],
          },
        ],
        resourceBytes: 201,
        encodedBytes: undefined,
      });

      expect(node.name).to.equal(src);
      expect(node.resourceBytes).to.equal(201);

      node = node.children![0];
      expect(node.name).to.equal('some/prefix');
      expect(node.resourceBytes).to.equal(201);
      expect(node.children?.[0].name).to.equal('main.js');
      expect(node.children?.[1].name).to.equal('not/a.js');
    });

    it('nodes have duplicates data', () => {
      const sourcesData = {
        'lib/folder/a.js': {resourceBytes: 100},
        'lib/node_modules/dep/a.js': {resourceBytes: 101, duplicatedNormalizedModuleName: 'dep/a.js'},
        'node_modules/dep/a.js': {resourceBytes: 100, duplicatedNormalizedModuleName: 'dep/a.js'},
        'lib/node_modules/dep/b.js': {resourceBytes: 101, duplicatedNormalizedModuleName: 'dep/b.js'},
        'node_modules/dep/b.js': {resourceBytes: 100, duplicatedNormalizedModuleName: 'dep/b.js'},
      };
      const node = Utils.Treemap.makeScriptNode(src, '', sourcesData);
      assert.deepEqual(node, {
        name: src,
        resourceBytes: 502,
        encodedBytes: undefined,
        children: [
          {
            children: [
              {
                children: undefined,
                name: 'folder/a.js',
                resourceBytes: 100,
                encodedBytes: undefined,
              },
              {
                children: [
                  {
                    duplicatedNormalizedModuleName: 'dep/a.js',
                    name: 'a.js',
                    resourceBytes: 101,
                    encodedBytes: undefined,
                  },
                  {
                    duplicatedNormalizedModuleName: 'dep/b.js',
                    name: 'b.js',
                    resourceBytes: 101,
                    encodedBytes: undefined,
                  },
                ],
                name: 'node_modules/dep',
                resourceBytes: 202,
                encodedBytes: undefined,
              },
            ],
            name: 'lib',
            resourceBytes: 302,
            encodedBytes: undefined,
          },
          {
            children: [
              {
                duplicatedNormalizedModuleName: 'dep/a.js',
                name: 'a.js',
                resourceBytes: 100,
                encodedBytes: undefined,
              },
              {
                duplicatedNormalizedModuleName: 'dep/b.js',
                name: 'b.js',
                resourceBytes: 100,
                encodedBytes: undefined,
              },
            ],
            name: 'node_modules/dep',
            resourceBytes: 200,
            encodedBytes: undefined,
          },
        ],
      });
    });
  });

  describeWithEnvironment('createTreemapData', () => {
    it('works (source maps)', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'dupe-js.json.gz');
      const data = Utils.Treemap.createTreemapData(parsedTrace.Scripts, new Map())
                       .map(d => [d.name, d.resourceBytes, d.encodedBytes, !!d.children?.length]);
      assert.deepEqual(data, [
        ['extensions::SafeBuiltins', 3204, 3204, false], ['v8/LoadTimes', 198, 198, false],
        ['https://dupe-modules-lh-2.surge.sh/bundle.js?v1', 921607, 251055, true],
        ['https://dupe-modules-lh-2.surge.sh/bundle.js?v2', 921607, 251053, true],
        ['https://dupe-modules-lh-2.surge.sh/bundle.js?v3', 921607, 251055, true],
        ['https://dupe-modules-lh-2.surge.sh/bundle.js?v4', 921607, 251055, true],
        ['chrome-extension://cgaocdmhkmfnkdkbnckgmpopcbpaaejo/library/libraries.js', 67717, 67717, false],
        ['chrome-extension://cgaocdmhkmfnkdkbnckgmpopcbpaaejo/content_scripts/detect.js', 1426, 1426, false],
        ['chrome-extension://cgaocdmhkmfnkdkbnckgmpopcbpaaejo/content_scripts/run.js', 259, 259, false],
        ['chrome-extension://pmhkaepabdniocnppdkfgifgonahhpdi/polyfills/webcomponents-ce.js', 19548, 19548, false],
        ['chrome-extension://pmhkaepabdniocnppdkfgifgonahhpdi/incognito_content_script.js', 991691, 991691, false]
      ]);
    });

    it('works (no source maps; inline scripts)', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'yahoo-news.json.gz');
      const data = Utils.Treemap.createTreemapData(parsedTrace.Scripts, new Map())
                       .filter(d => d.children?.[0].name.includes('inline'))
                       .map(d => [d.name.substring(0, 70), d.resourceBytes, d.encodedBytes, !!d.children?.length]);
      assert.deepEqual(data, [
        ['https://news.yahoo.com/', 264860, 52435, true],
        ['https://cdn.taboola.com/libtrc/static/topics/taboola-browsing-topics.h', 492, 483, true],
        ['https://cdn.taboola.com/scripts/prebid_iframe_sync.html?gdpr=0&gdpr_co', 392049, 392049, true],
        ['https://securepubads.g.doubleclick.net/static/topics/topics_frame.html', 102850, 28761, true],
        ['https://opus.analytics.yahoo.com/tag/opus-frame.html?referrer=https%3A', 5537, 2862, true],
        ['https://onetag-sys.com/usync/?gdpr=0&gdpr_consent=&pubId=69f48c2160c81', 2356, 942, true],
        ['https://sync.go.sonobi.com/uc.html?gdpr=0&gdpr_consent=&us_privacy=1YN', 3511, 4100, true],
        ['https://c841865208bc99b5e2ae14cac96331fd.safeframe.googlesyndication.c', 31008, 31008, true],
        ['https://c841865208bc99b5e2ae14cac96331fd.safeframe.googlesyndication.c', 20047, 20047, true],
        ['https://c841865208bc99b5e2ae14cac96331fd.safeframe.googlesyndication.c', 20056, 20056, true],
        ['https://c841865208bc99b5e2ae14cac96331fd.safeframe.googlesyndication.c', 41584, 41584, true],
        ['https://us-u.openx.net/w/1.0/pd?cc=1&plm=6&ph=208e6dab-f554-4b1c-b023-', 113, 123, true],
        ['https://tpc.googlesyndication.com/sodar/62bHydCX.html', 38984, 38984, true],
        ['https://u.openx.net/w/1.0/cm?cc=1&id=4241c706-9fd2-4ae4-b2d7-c9f8d34e7', 113, 123, true],
        ['https://c841865208bc99b5e2ae14cac96331fd.safeframe.googlesyndication.c', 696, 696, true],
        ['https://s0.2mdn.net/sadbundle/16824365171377590673/index.html?ev=01_25', 8181, 2709, true],
        ['https://onetag-sys.com/usync/?pubId=765b4e6bb9c8438', 2356, 942, true]
      ]);
    });
  });
});
