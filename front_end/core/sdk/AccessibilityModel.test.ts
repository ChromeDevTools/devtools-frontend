// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import type * as Protocol from '../../generated/protocol.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {SnapshotTester} from '../../testing/SnapshotTester.js';
import {TestUniverse} from '../../testing/TestUniverse.js';

import * as SDK from './sdk.js';

describe('AccessibilityModel', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  it('can be instantiated', () => {
    const universe = new TestUniverse();
    assert.doesNotThrow(() => {
      const target = universe.createTarget();
      new SDK.AccessibilityModel.AccessibilityModel(target);
    });
  });

  it('returns empty array when requesting children for a node not in the model', async () => {
    const universe = new TestUniverse();
    const target = universe.createTarget();
    const model = new SDK.AccessibilityModel.AccessibilityModel(target);
    const children = await model.requestAXChildren('non-existent-id' as Protocol.Accessibility.AXNodeId);
    assert.deepEqual(children, []);
  });

  describe('axNodeToText', function() {
    const snapshotTester = new SnapshotTester(this, import.meta);

    it('correctly formats an accessibility node tree to text', async function() {
      const childNode = {
        id: () => '1',
        getFrameId: () => 'frame1',
        role: () => ({value: 'button'}),
        name: () => ({value: 'Submit'}),
        properties: () => [{name: 'focusable', value: {type: 'boolean', value: true}}],
        ignored: () => false,
        accessibilityModel: () => ({
          requestAXChildren: async () => [],
        }),
        getChildren: SDK.AccessibilityModel.AccessibilityNode.prototype.getChildren,
        axNodeToText: SDK.AccessibilityModel.AccessibilityNode.prototype.axNodeToText,
      } as unknown as SDK.AccessibilityModel.AccessibilityNode;

      const parentNode = {
        id: () => '0',
        getFrameId: () => 'frame1',
        role: () => ({value: 'dialog'}),
        name: () => ({value: 'Confirmation'}),
        properties: () => [],
        ignored: () => false,
        accessibilityModel: () => ({
          requestAXChildren: async () => [childNode],
        }),
        getChildren: SDK.AccessibilityModel.AccessibilityNode.prototype.getChildren,
        axNodeToText: SDK.AccessibilityModel.AccessibilityNode.prototype.axNodeToText,
      } as unknown as SDK.AccessibilityModel.AccessibilityNode;

      const text = await parentNode.axNodeToText();
      snapshotTester.assert(this, text);
    });

    it('correctly formats when the root node is ignored', async function() {
      const childNode = {
        id: () => '1',
        getFrameId: () => 'frame1',
        role: () => ({value: 'button'}),
        name: () => ({value: 'Submit'}),
        properties: () => [{name: 'focusable', value: {type: 'boolean', value: true}}],
        ignored: () => false,
        accessibilityModel: () => ({
          requestAXChildren: async () => [],
        }),
        getChildren: SDK.AccessibilityModel.AccessibilityNode.prototype.getChildren,
        axNodeToText: SDK.AccessibilityModel.AccessibilityNode.prototype.axNodeToText,
      } as unknown as SDK.AccessibilityModel.AccessibilityNode;

      const parentNode = {
        id: () => '0',
        getFrameId: () => 'frame1',
        role: () => null,
        name: () => null,
        properties: () => [],
        ignored: () => true,
        accessibilityModel: () => ({
          requestAXChildren: async () => [childNode],
        }),
        getChildren: SDK.AccessibilityModel.AccessibilityNode.prototype.getChildren,
        axNodeToText: SDK.AccessibilityModel.AccessibilityNode.prototype.axNodeToText,
      } as unknown as SDK.AccessibilityModel.AccessibilityNode;

      const text = await parentNode.axNodeToText();
      snapshotTester.assert(this, text);
    });

    it('correctly formats when a nested node is ignored', async function() {
      const nestedNode = {
        id: () => '2',
        getFrameId: () => 'frame1',
        role: () => ({value: 'button'}),
        name: () => ({value: 'Submit'}),
        properties: () => [{name: 'focusable', value: {type: 'boolean', value: true}}],
        ignored: () => false,
        accessibilityModel: () => ({
          requestAXChildren: async () => [],
        }),
        getChildren: SDK.AccessibilityModel.AccessibilityNode.prototype.getChildren,
        axNodeToText: SDK.AccessibilityModel.AccessibilityNode.prototype.axNodeToText,
      } as unknown as SDK.AccessibilityModel.AccessibilityNode;

      const childNode = {
        id: () => '1',
        getFrameId: () => 'frame1',
        role: () => null,
        name: () => null,
        properties: () => [],
        ignored: () => true,
        accessibilityModel: () => ({
          requestAXChildren: async () => [nestedNode],
        }),
        getChildren: SDK.AccessibilityModel.AccessibilityNode.prototype.getChildren,
        axNodeToText: SDK.AccessibilityModel.AccessibilityNode.prototype.axNodeToText,
      } as unknown as SDK.AccessibilityModel.AccessibilityNode;

      const parentNode = {
        id: () => '0',
        getFrameId: () => 'frame1',
        role: () => ({value: 'dialog'}),
        name: () => ({value: 'Confirmation'}),
        properties: () => [],
        ignored: () => false,
        accessibilityModel: () => ({
          requestAXChildren: async () => [childNode],
        }),
        getChildren: SDK.AccessibilityModel.AccessibilityNode.prototype.getChildren,
        axNodeToText: SDK.AccessibilityModel.AccessibilityNode.prototype.axNodeToText,
      } as unknown as SDK.AccessibilityModel.AccessibilityNode;

      const text = await parentNode.axNodeToText();
      snapshotTester.assert(this, text);
    });
  });
});
