// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import type * as Common from '../common/common.js';

// eslint-disable-next-line @devtools/es-modules-import
import * as SDK from './sdk.js';

function findNode(node: SDK.DOMModel.DOMNode, predicate: (node: SDK.DOMModel.DOMNode) => boolean): SDK.DOMModel.DOMNode|
    null {
  if (predicate(node)) {
    return node;
  }
  const children = node.children();
  if (children) {
    for (const child of children) {
      const result = findNode(child, predicate);
      if (result) {
        return result;
      }
    }
  }
  return null;
}

describe('DOMModel API Test', () => {
  it('generates attribute updated event only when attribute is actually changed', async ({inspectedPage, universe}) => {
    const primaryTarget = universe.targetManager.primaryPageTarget();
    assert.isNotNull(primaryTarget);

    const domModel = primaryTarget.model(SDK.DOMModel.DOMModel);
    assert.isNotNull(domModel);

    await inspectedPage.goToHtml(`
      <div id="container">
          <div id="node-set-new-value" style="color:red"></div>
          <div id="node-set-same-value" style="color:red"></div>
      </div>
    `);

    const documentNode = await domModel.requestDocument();
    assert.isNotNull(documentNode);

    // Retrieve the subtree to populate the DOMModel cache.
    await documentNode.getSubtree(5, true);

    const container = findNode(documentNode, n => n.getAttribute('id') === 'container');
    assert.isNotNull(container);

    const nodeSetNewValue = findNode(documentNode, n => n.getAttribute('id') === 'node-set-new-value');
    assert.isNotNull(nodeSetNewValue);

    const nodeSetSameValue = findNode(documentNode, n => n.getAttribute('id') === 'node-set-same-value');
    assert.isNotNull(nodeSetSameValue);

    if (!nodeSetNewValue || !nodeSetSameValue) {
      assert.fail('Could not find test nodes');
    }

    // Verifies that setting a new style attribute value triggers the AttrModified event.
    let attrModifiedPromise = domModel.once(SDK.DOMModel.Events.AttrModified);

    await inspectedPage.evaluate(() => {
      (document.getElementById('node-set-new-value') as HTMLElement).style.setProperty('color', 'blue');
    });

    let eventData = await attrModifiedPromise;
    assert.strictEqual(eventData.node, nodeSetNewValue);
    assert.strictEqual(eventData.name, 'style');
    assert.strictEqual(nodeSetNewValue.getAttribute('style'), 'color: blue;');

    // Verifies that setting the style attribute to the same value does not trigger the AttrModified event.
    let attrModifiedFired = false;
    const listener =
        (event: Common.EventTarget
             .EventTargetEvent<SDK.DOMModel.EventTypes[SDK.DOMModel.Events.AttrModified], SDK.DOMModel.EventTypes>):
            void => {
              if (event.data.node === nodeSetSameValue) {
                attrModifiedFired = true;
              }
            };
    domModel.addEventListener(SDK.DOMModel.Events.AttrModified, listener);

    await inspectedPage.evaluate(() => {
      (document.getElementById('node-set-same-value') as HTMLElement).style.setProperty('color', 'red');
    });

    // Flushes pending events by triggering a style change on the new value node.
    attrModifiedPromise = domModel.once(SDK.DOMModel.Events.AttrModified);

    await inspectedPage.evaluate(() => {
      (document.getElementById('node-set-new-value') as HTMLElement).style.setProperty('color', 'green');
    });

    eventData = await attrModifiedPromise;
    assert.strictEqual(eventData.node, nodeSetNewValue);
    assert.isFalse(attrModifiedFired, 'AttrModified should not have fired for same value');

    domModel.removeEventListener(SDK.DOMModel.Events.AttrModified, listener);
  });

  it('saves node to temporary variable', async ({inspectedPage, universe}) => {
    const primaryTarget = universe.targetManager.primaryPageTarget();
    assert.isNotNull(primaryTarget);

    const domModel = primaryTarget.model(SDK.DOMModel.DOMModel);
    assert.isNotNull(domModel);

    const consoleModel = primaryTarget.model(SDK.ConsoleModel.ConsoleModel);
    assert.isNotNull(consoleModel);

    await inspectedPage.goToHtml('<div id="node"></div>');

    const documentNode = await domModel.requestDocument();
    assert.isNotNull(documentNode);

    // Retrieve the subtree to populate the DOMModel cache.
    await documentNode.getSubtree(5, true);

    const node = findNode(documentNode, n => n.getAttribute('id') === 'node');
    assert.isNotNull(node);
    if (!node) {
      assert.fail('Could not find test node');
    }

    const commandEvaluatedPromise = consoleModel.once(SDK.ConsoleModel.Events.CommandEvaluated);
    await node.saveNodeToTempVariable();
    const {result, commandMessage} = await commandEvaluatedPromise;

    assert.strictEqual(commandMessage.messageText, 'temp1');
    assert.strictEqual(result?.description, 'div#node');

    const evaluatedId = await inspectedPage.evaluate(() => {
      return (window as unknown as {temp1?: HTMLElement}).temp1?.id;
    });
    assert.strictEqual(evaluatedId, 'node');
  });
});
