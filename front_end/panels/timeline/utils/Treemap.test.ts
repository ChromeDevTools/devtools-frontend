// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Utils from './utils.js';

describe('Treemap', () => {
  describe('.makeScriptNode', () => {
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
        children: [
          {
            name: 'a.js',
            resourceBytes: 100,
          },
          {
            duplicatedNormalizedModuleName: 'blah',
            name: 'b.js',
            resourceBytes: 100,
          },
          {
            name: 'c.js',
            resourceBytes: 100,
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
              },
              {
                name: 'b.js',
                resourceBytes: 100,
              },
            ],
            name: '/folder',
            resourceBytes: 200,
          },
        ],
        resourceBytes: 200,
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
              },
              {
                children: undefined,
                name: 'folder2/b.js',
                resourceBytes: 100,
              },
            ],
            name: '/root',
            resourceBytes: 200,
          },
        ],
        resourceBytes: 200,
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
        children: [
          {
            name: 'a.js',
            resourceBytes: 100,
          },
          {
            name: 'b.js',
            resourceBytes: 100,
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
              },
              {
                name: 'b.js',
                resourceBytes: 100,
              },
            ],
            resourceBytes: 200,
          },
        ],
        resourceBytes: 200,
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
            children: [
              {
                name: 'main.js',
                resourceBytes: 100,
              },
              {
                name: 'not/a.js',
                resourceBytes: 101,
                children: undefined,
              },
            ],
          },
        ],
        resourceBytes: 201,
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
        children: [
          {
            children: [
              {
                children: undefined,
                name: 'folder/a.js',
                resourceBytes: 100,
              },
              {
                children: [
                  {
                    duplicatedNormalizedModuleName: 'dep/a.js',
                    name: 'a.js',
                    resourceBytes: 101,
                  },
                  {
                    duplicatedNormalizedModuleName: 'dep/b.js',
                    name: 'b.js',
                    resourceBytes: 101,
                  },
                ],
                name: 'node_modules/dep',
                resourceBytes: 202,
              },
            ],
            name: 'lib',
            resourceBytes: 302,
          },
          {
            children: [
              {
                duplicatedNormalizedModuleName: 'dep/a.js',
                name: 'a.js',
                resourceBytes: 100,
              },
              {
                duplicatedNormalizedModuleName: 'dep/b.js',
                name: 'b.js',
                resourceBytes: 100,
              },
            ],
            name: 'node_modules/dep',
            resourceBytes: 200,
          },
        ],
      });
    });
  });
});
