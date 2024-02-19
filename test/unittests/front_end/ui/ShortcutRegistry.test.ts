// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as UI from '../../../../front_end/ui/legacy/legacy.js';

describe('ShortcutTreeNode', () => {
  it('can be instantiated without issues', () => {
    const node = new UI.ShortcutRegistry.ShortcutTreeNode(0, 0);
    assert.isEmpty(node.actions(), 'node should not have any actions upon instantiation');
    assert.isFalse(node.hasChords(), 'node should not have any chords');
    assert.strictEqual(node.key(), 0, 'node should set key property');
  });

  it('can add a mapping', () => {
    const node = new UI.ShortcutRegistry.ShortcutTreeNode(0, 0);
    node.addKeyMapping([12, 154, 36], 'test action');
    const leafNode = node.getNode(12)?.getNode(154)?.getNode(36);
    assert.ok(leafNode, 'node should have a descendant for the mapping');
    assert.include(
        leafNode?.actions() || [], 'test action', 'the mapping\'s node should have the \'test action\' action');
    assert.isTrue(node.hasChords(), 'node should have chords');
    assert.ok(node.getNode(12), 'node should have a child for key=12');
    assert.notOk(node.getNode(154), 'node should not have a direct child for key=154');
  });

  it('can clear itself', () => {
    const node = new UI.ShortcutRegistry.ShortcutTreeNode(0, 0);
    node.addKeyMapping([12, 154, 36], 'test action');
    node.addAction('another action');
    node.clear();
    assert.isEmpty(node.actions(), 'node should not have any actions after being cleared');
    assert.isFalse(node.hasChords(), 'node should not have any chords after being cleared');
  });
});
