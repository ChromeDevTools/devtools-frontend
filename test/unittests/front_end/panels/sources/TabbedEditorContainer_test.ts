// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Common from '../../../../../front_end/core/common/common.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import * as Sources from '../../../../../front_end/panels/sources/sources.js';

describe('TabbedEditorContainer', () => {
  describe('HistoryItem', () => {
    const {HistoryItem} = Sources.TabbedEditorContainer;
    const url = 'http://localhost' as Platform.DevToolsPath.UrlString;

    describe('fromObject', () => {
      it('rejects invalid resource type names', () => {
        assert.throws(() => {
          HistoryItem.fromObject({url, resourceTypeName: 'some-invalid-resource-type-name'});
        });
      });

      it('correctly deserializes resource type names', () => {
        for (const resourceType of Object.values(Common.ResourceType.resourceTypes)) {
          const resourceTypeName = resourceType.name();
          assert.propertyVal(HistoryItem.fromObject({url, resourceTypeName}), 'resourceType', resourceType);
        }
      });
    });

    describe('toObject', () => {
      it('correctly serializes resource types', () => {
        for (const resourceType of Object.values(Common.ResourceType.resourceTypes)) {
          const item = new HistoryItem(url, resourceType);
          assert.propertyVal(item.toObject(), 'resourceTypeName', resourceType.name());
        }
      });
    });
  });

  describe('History', () => {
    const {History, HistoryItem} = Sources.TabbedEditorContainer;

    describe('fromObject', () => {
      it('deserializes correctly', () => {
        const history = History.fromObject([
          {url: 'http://localhost/foo.js', resourceTypeName: 'script'},
          {url: 'webpack:///src/foo.vue', resourceTypeName: 'sm-script', scrollLineNumber: 5},
          {url: 'http://localhost/foo.js', resourceTypeName: 'sm-script'},
        ]);
        const keys = history.keys();
        assert.lengthOf(keys, 3);
        assert.propertyVal(keys[0], 'url', 'http://localhost/foo.js');
        assert.propertyVal(keys[0], 'resourceType', Common.ResourceType.resourceTypes.Script);
        assert.strictEqual(history.selectionRange(keys[0]), undefined);
        assert.strictEqual(history.scrollLineNumber(keys[0]), undefined);
        assert.propertyVal(keys[1], 'url', 'webpack:///src/foo.vue');
        assert.propertyVal(keys[1], 'resourceType', Common.ResourceType.resourceTypes.SourceMapScript);
        assert.strictEqual(history.selectionRange(keys[1]), undefined);
        assert.strictEqual(history.scrollLineNumber(keys[1]), 5);
        assert.propertyVal(keys[2], 'url', 'http://localhost/foo.js');
        assert.propertyVal(keys[2], 'resourceType', Common.ResourceType.resourceTypes.SourceMapScript);
        assert.strictEqual(history.selectionRange(keys[2]), undefined);
        assert.strictEqual(history.scrollLineNumber(keys[2]), undefined);
      });

      it('gracefully ignores items with invalid resource type names', () => {
        const history = History.fromObject([
          {url: 'http://localhost/foo.js', resourceTypeName: 'script'},
          {url: 'http://localhost/baz.js', resourceTypeName: 'some-invalid-resource-type-name'},
          {url: 'http://localhost/bar.js', resourceTypeName: 'sm-script'},
        ]);
        const keys = history.keys();
        assert.lengthOf(keys, 2);
        assert.propertyVal(keys[0], 'url', 'http://localhost/foo.js');
        assert.propertyVal(keys[1], 'url', 'http://localhost/bar.js');
      });
    });

    describe('toObject', () => {
      it('serializes correctly', () => {
        const history = new History([
          new HistoryItem(
              'http://localhost/foo.js' as Platform.DevToolsPath.UrlString, Common.ResourceType.resourceTypes.Script),
          new HistoryItem(
              'webpack:///src/foo.vue' as Platform.DevToolsPath.UrlString,
              Common.ResourceType.resourceTypes.SourceMapScript, undefined, 5),
          new HistoryItem(
              'http://localhost/foo.js' as Platform.DevToolsPath.UrlString,
              Common.ResourceType.resourceTypes.SourceMapScript),
        ]);
        const serializedHistory = history.toObject();
        assert.lengthOf(serializedHistory, 3);
        assert.propertyVal(serializedHistory[0], 'url', 'http://localhost/foo.js');
        assert.propertyVal(serializedHistory[0], 'resourceTypeName', 'script');
        assert.propertyVal(serializedHistory[1], 'url', 'webpack:///src/foo.vue');
        assert.propertyVal(serializedHistory[1], 'resourceTypeName', 'sm-script');
        assert.propertyVal(serializedHistory[1], 'scrollLineNumber', 5);
        assert.propertyVal(serializedHistory[2], 'url', 'http://localhost/foo.js');
        assert.propertyVal(serializedHistory[2], 'resourceTypeName', 'sm-script');
      });
    });

    describe('update', () => {
      it('moves items referenced by keys to the beginning', () => {
        const history = new History([
          new HistoryItem(
              'webpack:///src/foo.vue' as Platform.DevToolsPath.UrlString,
              Common.ResourceType.resourceTypes.SourceMapScript),
          new HistoryItem(
              'http://localhost/foo.js' as Platform.DevToolsPath.UrlString, Common.ResourceType.resourceTypes.Script),
          new HistoryItem(
              'http://localhost/foo.js' as Platform.DevToolsPath.UrlString,
              Common.ResourceType.resourceTypes.SourceMapScript),
        ]);
        history.update([{
          url: 'http://localhost/foo.js' as Platform.DevToolsPath.UrlString,
          resourceType: Common.ResourceType.resourceTypes.Script,
        }]);
        assert.strictEqual(
            history.index({
              url: 'http://localhost/foo.js' as Platform.DevToolsPath.UrlString,
              resourceType: Common.ResourceType.resourceTypes.Script,
            }),
            0,
        );
      });
    });
  });
});
