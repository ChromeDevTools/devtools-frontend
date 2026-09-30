// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {waitForTarget} from '../../testing/TargetHelpers.js';
import type * as Common from '../common/common.js';

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
  const contentDoc = node.contentDocument();
  if (contentDoc) {
    const result = findNode(contentDoc, predicate);
    if (result) {
      return result;
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

describe('DOMModel queries, search, frames, markers, and attributes', () => {
  it('queries elements via querySelector and querySelectorAll', async ({inspectedPage, universe}) => {
    const primaryTarget = universe.targetManager.primaryPageTarget();
    assert.isNotNull(primaryTarget);
    const domModel = primaryTarget.model(SDK.DOMModel.DOMModel);
    assert.isNotNull(domModel);

    await inspectedPage.goToHtml(`
      <div id="id1" class="foo"></div>
      <div id="id2" class="foo"></div>

      <div id="container">
          <div id="id3" class="foo"></div>
          <div id="id4" class="foo"></div>
          <div id="id5" class="foo"></div>
          <div id="id6" class="foo"></div>
      </div>
    `);

    const doc = await domModel.requestDocument();
    assert.isNotNull(doc);
    await doc.getSubtree(10, true);

    const container = findNode(doc, n => n.getAttribute('id') === 'container');
    assert.isNotNull(container);

    const docFirstId = await domModel.querySelector(doc.id, 'div.foo');
    assert.isNotNull(docFirstId);
    assert.strictEqual(domModel.nodeForId(docFirstId)?.getAttribute('id'), 'id1');

    const docAllIds = await domModel.querySelectorAll(doc.id, 'div.foo');
    assert.deepEqual(docAllIds?.map(id => domModel.nodeForId(id)?.getAttribute('id')),
                     ['id1', 'id2', 'id3', 'id4', 'id5', 'id6']);

    const containerFirstId = await domModel.querySelector(container.id, 'div.foo');
    assert.isNotNull(containerFirstId);
    assert.strictEqual(domModel.nodeForId(containerFirstId)?.getAttribute('id'), 'id3');

    const containerAllIds = await domModel.querySelectorAll(container.id, 'div.foo');
    assert.deepEqual(containerAllIds?.map(id => domModel.nodeForId(id)?.getAttribute('id')),
                     ['id3', 'id4', 'id5', 'id6']);
  });

  it('requests document cleanly after reloading page with shadow DOM and radio inputs',
     async ({inspectedPage, universe}) => {
       const primaryTarget = universe.targetManager.primaryPageTarget();
       assert.isNotNull(primaryTarget);
       const domModel = primaryTarget.model(SDK.DOMModel.DOMModel);
       assert.isNotNull(domModel);

       await inspectedPage.goToHtml(`
         <input type="radio" name="group" id="radio-input" checked>
         <div id="shadow-host"></div>
         <script>
           document.getElementById('shadow-host').attachShadow({mode: 'open'}).innerHTML = '<span>shadow</span>';
         </script>
       `);

       const docBefore = await domModel.requestDocument();
       assert.isNotNull(docBefore);
       await docBefore.getSubtree(5, true);

       const documentUpdated = domModel.once(SDK.DOMModel.Events.DocumentUpdated);
       await inspectedPage.reload();
       await documentUpdated;

       const docAfter = await domModel.requestDocument();
       assert.isNotNull(docAfter);
       await docAfter.getSubtree(5, true);
       const radioAfter = findNode(docAfter, n => n.getAttribute('id') === 'radio-input');
       assert.isNotNull(radioAfter);
     });

  it('performs search, retrieves searchResult nodes, and cancels search across DOM and UA shadow DOM',
     async ({inspectedPage, universe}) => {
       const primaryTarget = universe.targetManager.primaryPageTarget();
       assert.isNotNull(primaryTarget);
       const domModel = primaryTarget.model(SDK.DOMModel.DOMModel);
       assert.isNotNull(domModel);

       await inspectedPage.goToHtml(`
         <div>FooBar</div>
         <div class="divclass"><span>Found by selector</span></div>
         <div id="shadow-host"></div>
         <details id="ua-shadow-host"><summary>Summary</summary></details>
       `);
       await inspectedPage.evaluate(() => {
         const host = document.getElementById('shadow-host');
         if (host) {
           host.attachShadow({mode: 'open'}).innerHTML = '<div id="shadow-host-content"></div>';
         }
       });
       await domModel.requestDocument();

       async function runSearch(model: SDK.DOMModel.DOMModel, query: string, includeUA = false): Promise<string[]> {
         try {
           const count = await model.performSearch(query, includeUA);
           const results: string[] = [];
           for (let i = 0; i < count; ++i) {
             const node = await model.searchResult(i);
             results.push(node ? `<${node.localName()} id="${node.getAttribute('id') ?? ''}">` : '');
           }
           return results;
         } finally {
           SDK.DOMModel.DOMModel.cancelSearch(universe.targetManager);
         }
       }

       assert.deepEqual(await runSearch(domModel, 'div.divclass span'), ['<span id="">']);
       assert.deepEqual(await runSearch(domModel, 'shadow-host-content'), ['<div id="shadow-host-content">']);
       assert.deepEqual(await runSearch(domModel, 'details-content', false), []);
       assert.deepEqual(await runSearch(domModel, 'details-content', true), ['<slot id="details-content">']);
     });

  it('updates child iframe contentDocument after dynamic load', async ({inspectedPage, universe}) => {
    const primaryTarget = universe.targetManager.primaryPageTarget();
    assert.isNotNull(primaryTarget);
    const domModel = primaryTarget.model(SDK.DOMModel.DOMModel);
    assert.isNotNull(domModel);

    await inspectedPage.goToHtml('<iframe id="myframe" srcdoc="<div id=\'initial\'>Initial</div>"></iframe>');
    const doc = await domModel.requestDocument();
    assert.isNotNull(doc);
    await doc.getSubtree(10, true);

    const iframeNode = findNode(doc, n => n.getAttribute('id') === 'myframe');
    assert.isNotNull(iframeNode);
    assert.isNotNull(findNode(doc, n => n.getAttribute('id') === 'initial'));

    const nodeInserted = domModel.once(SDK.DOMModel.Events.NodeInserted);
    await inspectedPage.evaluate(async () => {
      const frame = document.getElementById('myframe') as HTMLIFrameElement;
      const loaded = new Promise<void>(resolve => {
        frame.onload = () => resolve();
      });
      frame.srcdoc = '<div id="updated-frame-node">Loaded</div>';
      await loaded;
    });
    await nodeInserted;

    const updatedIframe = findNode(doc, n => n.getAttribute('id') === 'myframe');
    assert.isNotNull(updatedIframe);
    assert.notStrictEqual(updatedIframe, iframeNode);
    await updatedIframe.contentDocument()?.getSubtree(10, true);
    assert.isNull(findNode(doc, n => n.getAttribute('id') === 'initial'));
    assert.isNotNull(findNode(doc, n => n.getAttribute('id') === 'updated-frame-node'));
  });

  it('resolves alien node from createHTMLDocument without crashing', async ({inspectedPage, universe}) => {
    const primaryTarget = universe.targetManager.primaryPageTarget();
    assert.isNotNull(primaryTarget);
    const domModel = primaryTarget.model(SDK.DOMModel.DOMModel);
    assert.isNotNull(domModel);
    const runtimeModel = primaryTarget.model(SDK.RuntimeModel.RuntimeModel);
    assert.isNotNull(runtimeModel);

    await inspectedPage.goToHtml('<div id="main"></div>');
    await domModel.requestDocument();

    const evalResult = await runtimeModel.defaultExecutionContext()?.evaluate({
      expression:
          'var doc = document.implementation.createHTMLDocument(\'\'); doc.lastChild.innerHTML = \'<span></span>\'; doc.lastChild',
      objectGroup: 'test',
      includeCommandLineAPI: false,
      silent: true,
      returnByValue: false,
      generatePreview: false,
    },
                                                                              false, false);
    assert.isDefined(evalResult);
    assert.property(evalResult, 'object');
    const remoteObj = (evalResult as {object: SDK.RemoteObject.RemoteObject}).object;
    const alienNode = await domModel.pushObjectAsNodeToFrontend(remoteObj);
    assert.isNotNull(alienNode);
    const resolved = await alienNode.resolveToObject();
    assert.isNull(resolved);
  });

  it('tracks node markers and ancestor subtree marker counts across modifications and removals',
     async ({inspectedPage, universe}) => {
       const primaryTarget = universe.targetManager.primaryPageTarget();
       assert.isNotNull(primaryTarget);
       const domModel = primaryTarget.model(SDK.DOMModel.DOMModel);
       assert.isNotNull(domModel);

       await inspectedPage.goToHtml(`
         <!DOCTYPE html>
         <div id="container">
           <div id="child1"></div>
           <div id="child2"><a href="#" id="aNode">Third-level node</a></div>
         </div>
       `);
       const doc = await domModel.requestDocument();
       assert.isNotNull(doc);
       await doc.getSubtree(10, true);

       const container = findNode(doc, n => n.getAttribute('id') === 'container');
       const child1 = findNode(doc, n => n.getAttribute('id') === 'child1');
       const child2 = findNode(doc, n => n.getAttribute('id') === 'child2');
       const aNode = findNode(doc, n => n.getAttribute('id') === 'aNode');
       assert.isNotNull(container);
       assert.isNotNull(child1);
       assert.isNotNull(child2);
       assert.isNotNull(aNode);

       aNode.setMarker('attr1', true);
       assert.strictEqual(aNode.marker('attr1'), true);
       assert.deepEqual(
           [
             container.subtreeMarkerCount,
             child1.subtreeMarkerCount,
             child2.subtreeMarkerCount,
             aNode.subtreeMarkerCount,
           ],
           [1, 0, 1, 1]);

       child2.setMarker('attr2', 'value');
       assert.strictEqual(child2.marker('attr2'), 'value');
       assert.strictEqual(aNode.marker('attr1'), true);
       assert.deepEqual([container.subtreeMarkerCount, child2.subtreeMarkerCount, aNode.subtreeMarkerCount], [2, 2, 1]);

       child2.setMarker('attr1', true);
       assert.strictEqual(child2.marker('attr2'), 'value');
       assert.strictEqual(child2.marker('attr1'), true);
       assert.strictEqual(aNode.marker('attr1'), true);
       assert.deepEqual([container.subtreeMarkerCount, child2.subtreeMarkerCount, aNode.subtreeMarkerCount], [3, 3, 1]);

       aNode.setMarker('attr1', 'anotherValue');
       child2.setMarker('attr2', 'anotherValue');
       assert.strictEqual(aNode.marker('attr1'), 'anotherValue');
       assert.strictEqual(child2.marker('attr2'), 'anotherValue');
       assert.strictEqual(child2.marker('attr1'), true);
       assert.deepEqual([container.subtreeMarkerCount, child2.subtreeMarkerCount, aNode.subtreeMarkerCount], [3, 3, 1]);

       aNode.setMarker('attr1', null);
       assert.isNull(aNode.marker('attr1'));
       assert.strictEqual(child2.marker('attr2'), 'anotherValue');
       assert.strictEqual(child2.marker('attr1'), true);
       assert.deepEqual([container.subtreeMarkerCount, child2.subtreeMarkerCount, aNode.subtreeMarkerCount], [2, 2, 0]);

       const aRemoved = domModel.once(SDK.DOMModel.Events.NodeRemoved);
       await aNode.removeNode();
       await aRemoved;
       assert.strictEqual(child2.marker('attr2'), 'anotherValue');
       assert.strictEqual(child2.marker('attr1'), true);
       assert.deepEqual([container.subtreeMarkerCount, child2.subtreeMarkerCount], [2, 2]);

       const child2Removed = domModel.once(SDK.DOMModel.Events.NodeRemoved);
       await child2.removeNode();
       await child2Removed;
       assert.strictEqual(container.subtreeMarkerCount, 0);
       assert.strictEqual(doc.subtreeMarkerCount, 2);
     });

  it('sets and removes attributes on DOMNode while firing AttrModified and AttrRemoved events',
     async ({inspectedPage, universe}) => {
       const primaryTarget = universe.targetManager.primaryPageTarget();
       assert.isNotNull(primaryTarget);
       const domModel = primaryTarget.model(SDK.DOMModel.DOMModel);
       assert.isNotNull(domModel);

       await inspectedPage.goToHtml('<div id="node"></div>');
       const doc = await domModel.requestDocument();
       assert.isNotNull(doc);
       await doc.getSubtree(10, true);

       const node = findNode(doc, n => n.getAttribute('id') === 'node');
       assert.isNotNull(node);

       let modPromise = domModel.once(SDK.DOMModel.Events.AttrModified);
       await inspectedPage.evaluate(() => document.getElementById('node')?.setAttribute('name', 'value'));
       assert.strictEqual((await modPromise).name, 'name');
       assert.strictEqual(node.getAttribute('name'), 'value');

       const modifiedValues: string[] = [];
       const onModified = (e: {data: {node: SDK.DOMModel.DOMNode, name: string}}): void => {
         modifiedValues.push(`${e.data.name}=${e.data.node.getAttribute(e.data.name)}`);
       };
       domModel.addEventListener(SDK.DOMModel.Events.AttrModified, onModified);
       const modNewValuePromise = domModel.once(SDK.DOMModel.Events.AttrModified);
       await inspectedPage.evaluate(() => {
         const el = document.getElementById('node');
         el?.setAttribute('name', 'value');
         el?.setAttribute('name', 'value');
         el?.setAttribute('name', 'newValue');
       });
       await modNewValuePromise;
       domModel.removeEventListener(SDK.DOMModel.Events.AttrModified, onModified);
       assert.deepEqual(modifiedValues, ['name=newValue']);

       const remPromise = domModel.once(SDK.DOMModel.Events.AttrRemoved);
       await inspectedPage.evaluate(() => document.getElementById('node')?.removeAttribute('name'));
       assert.strictEqual((await remPromise).name, 'name');

       modPromise = domModel.once(SDK.DOMModel.Events.AttrModified);
       node.setAttributeValue('foo', 'bar');
       await modPromise;
       assert.strictEqual(node.getAttribute('foo'), 'bar');

       await new Promise<void>(resolve => node.setAttribute('foo', 'foo2=\'baz2\' foo3=\'baz3\'', () => resolve()));
       assert.isUndefined(node.getAttribute('foo'));
       assert.strictEqual(node.getAttribute('foo2'), 'baz2');
       assert.strictEqual(node.getAttribute('foo3'), 'baz3');

       await new Promise<void>(resolve => node.setAttribute('foo3', '', () => resolve()));
       assert.isUndefined(node.getAttribute('foo3'));

       const malformedErr = await new Promise<string|null>(
           resolve => node.setAttribute('foo2', 'foo2=\'missingquote', err => resolve(err)));
       assert.include(malformedErr ?? '', 'Could not parse value as attributes');
       assert.strictEqual(node.getAttribute('foo2'), 'baz2');
     });

  it('retrieves event listeners on elements and ancestors inside an about:blank iframe',
     async ({inspectedPage, universe}) => {
       const primaryTarget = universe.targetManager.primaryPageTarget();
       assert.isNotNull(primaryTarget);
       const domModel = primaryTarget.model(SDK.DOMModel.DOMModel);
       assert.isNotNull(domModel);
       const domDebuggerModel = primaryTarget.model(SDK.DOMDebuggerModel.DOMDebuggerModel);
       assert.isNotNull(domDebuggerModel);
       const runtimeModel = primaryTarget.model(SDK.RuntimeModel.RuntimeModel);
       assert.isNotNull(runtimeModel);

       await inspectedPage.goToHtml('<iframe id="myframe"></iframe>');
       await inspectedPage.evaluate(() => {
         function f(): void {
         }
         const frame = document.getElementById('myframe') as HTMLIFrameElement;
         const body = frame.contentDocument?.body;
         body?.addEventListener('click', f, true);
         body?.insertAdjacentHTML('beforeend', '<div id="div-in-iframe"></div>');
         body?.querySelector('#div-in-iframe')?.addEventListener('hover', f, {capture: true, once: true});
         body?.addEventListener('wheel', f, {passive: true});
       });

       const doc = await domModel.requestDocument();
       assert.isNotNull(doc);
       await doc.getSubtree(10, true);

       const divInIframe = findNode(doc, n => n.getAttribute('id') === 'div-in-iframe');
       assert.isNotNull(divInIframe);
       assert.isTrue(runtimeModel.executionContexts().some(ctx => ctx.frameId === divInIframe.frameId()));
       const divObj = await divInIframe.resolveToObject('listeners');
       assert.isNotNull(divObj);
       const divListeners = await domDebuggerModel.eventListeners(divObj);
       assert.deepEqual(
           divListeners.map(l => ({type: l.type(), useCapture: l.useCapture(), passive: l.passive(), once: l.once()})),
           [{type: 'hover', useCapture: true, passive: false, once: true}]);

       const bodyNode = divInIframe.parentNode;
       assert.isNotNull(bodyNode);
       const bodyObj = await bodyNode.resolveToObject('listeners');
       assert.isNotNull(bodyObj);
       const bodyListeners = await domDebuggerModel.eventListeners(bodyObj);
       assert.deepEqual(
           bodyListeners.map(l => ({type: l.type(), useCapture: l.useCapture(), passive: l.passive(), once: l.once()})),
           [
             {type: 'click', useCapture: true, passive: false, once: false},
             {type: 'wheel', useCapture: false, passive: true, once: false},
           ]);
     });

  it('resolves DOM node remote object and execution contexts with service worker script',
     async ({inspectedPage, universe}) => {
       const primaryTarget = universe.targetManager.primaryPageTarget();
       assert.isNotNull(primaryTarget);
       new SDK.ChildTargetManager.ChildTargetManager(primaryTarget);
       const domModel = primaryTarget.model(SDK.DOMModel.DOMModel);
       assert.isNotNull(domModel);
       const runtimeModel = primaryTarget.model(SDK.RuntimeModel.RuntimeModel);
       assert.isNotNull(runtimeModel);
       const domDebuggerModel = primaryTarget.model(SDK.DOMDebuggerModel.DOMDebuggerModel);
       assert.isNotNull(domDebuggerModel);

       const swTargetPromise = waitForTarget(universe, t => t.type() === SDK.Target.Type.ServiceWorker);

       await inspectedPage.goToResource('network/service-worker.html');
       await inspectedPage.evaluate(async () => {
         await navigator.serviceWorker.ready;
         (window as unknown as {testFunction: () => void}).testFunction = function(): void {};
         document.body.setAttribute('onload', 'testFunction()');
         document.body.insertAdjacentHTML('beforeend', '<button id="btn">Click</button>');
         document.getElementById('btn')?.addEventListener('click', function handler() {});
       });

       const swTarget = await swTargetPromise;
       assert.strictEqual(swTarget.type(), SDK.Target.Type.ServiceWorker);
       const swRuntimeModel = swTarget.model(SDK.RuntimeModel.RuntimeModel);
       assert.isNotNull(swRuntimeModel);
       let swContext = swRuntimeModel.defaultExecutionContext();
       if (!swContext) {
         swContext = await swRuntimeModel.once(SDK.RuntimeModel.Events.ExecutionContextCreated);
       }
       assert.strictEqual(swContext.target().type(), SDK.Target.Type.ServiceWorker);
       const swSelfResult = await swContext.evaluate({
         expression: 'self',
         objectGroup: 'event-listeners-panel',
         includeCommandLineAPI: false,
         silent: true,
         returnByValue: false,
         generatePreview: false,
       },
                                                     false, false);
       assert.isDefined(swSelfResult);
       if (!('object' in swSelfResult)) {
         assert.fail('Expected RemoteObject');
       }
       assert.isNull(swSelfResult.object.runtimeModel().target().model(SDK.DOMDebuggerModel.DOMDebuggerModel));

       const mainContext = runtimeModel.defaultExecutionContext();
       assert.isNotNull(mainContext);
       assert.notStrictEqual(mainContext.target().type(), SDK.Target.Type.ServiceWorker);
       const windowResult = await mainContext.evaluate({
         expression: 'self',
         objectGroup: 'event-listeners-panel',
         includeCommandLineAPI: false,
         silent: true,
         returnByValue: false,
         generatePreview: false,
       },
                                                       false, false);
       assert.isDefined(windowResult);
       if (!('object' in windowResult)) {
         assert.fail('Expected RemoteObject for window');
       }
       const windowListeners = await domDebuggerModel.eventListeners(windowResult.object);
       assert.deepEqual(windowListeners.map(
                            l => ({type: l.type(), useCapture: l.useCapture(), passive: l.passive(), once: l.once()})),
                        [{type: 'load', useCapture: false, passive: false, once: false}]);

       const doc = await domModel.requestDocument();
       assert.isNotNull(doc);
       await doc.getSubtree(5, true);

       const btn = findNode(doc, n => n.getAttribute('id') === 'btn');
       assert.isNotNull(btn);
       const resolved = await btn.resolveToObject('event-listeners-panel');
       assert.isNotNull(resolved);
       assert.strictEqual(resolved.description, 'button#btn');
       const btnListeners = await domDebuggerModel.eventListeners(resolved);
       assert.deepEqual(
           btnListeners.map(l => ({type: l.type(), useCapture: l.useCapture(), passive: l.passive(), once: l.once()})),
           [{type: 'click', useCapture: false, passive: false, once: false}]);

       await inspectedPage.evaluate(async () => {
         const registrations = await navigator.serviceWorker.getRegistrations();
         for (const reg of registrations) {
           await reg.unregister();
         }
       });
     });
});

describe('DOMModel setOuterHTML and undo/redo edits', () => {
  function recordDOMModelEvents(domModel: SDK.DOMModel.DOMModel): string[] {
    const events: string[] = [];
    for (const key of Object.keys(SDK.DOMModel.Events) as Array<keyof typeof SDK.DOMModel.Events>) {
      const eventName = SDK.DOMModel.Events[key];
      if (eventName === SDK.DOMModel.Events.MarkersChanged || eventName === SDK.DOMModel.Events.DOMMutated) {
        continue;
      }
      domModel.addEventListener(eventName, (event: {data: unknown}) => {
        const data = event.data as SDK.DOMModel.DOMNode | {node: SDK.DOMModel.DOMNode};
        const node = 'node' in data && data.node ? data.node : (data as SDK.DOMModel.DOMNode);
        events.push(`Event ${String(eventName)}: ${node.nodeName()}`);
      });
    }
    return events;
  }

  it('updates DOMModel tree, dispatches DOMModel events, and integrates with DOMModelUndoStack via setOuterHTML',
     async ({inspectedPage, universe}) => {
       const primaryTarget = universe.targetManager.primaryPageTarget();
       assert.isNotNull(primaryTarget);
       const domModel = primaryTarget.model(SDK.DOMModel.DOMModel);
       assert.isNotNull(domModel);
       const undoStack = universe.domModelUndoStack;

       await inspectedPage.goToHtml(`
         <div id="container">
           <p>WebKit is used by <a href="http://www.apple.com/safari/">Safari</a></p>
           <h2>Getting involved</h2>
           <p id="identity">There are many ways to get involved.</p>
         </div>
       `);
       const doc = await domModel.requestDocument();
       assert.isNotNull(doc);
       await doc.getSubtree(10, true);
       const container = findNode(doc, n => n.getAttribute('id') === 'container');
       assert.isNotNull(container);
       const containerText = await container.getOuterHTML();
       assert.isNotNull(containerText);
       const events = recordDOMModelEvents(domModel);

       const cases: Array<{
         oldStr: string,
         newStr: string,
         forwardEvents: string[],
         undoEvents: string[],
       }> =
           [
             {
               oldStr: 'Getting involved',
               newStr: 'Getting not involved',
               forwardEvents: ['Event CharacterDataModified: #text'],
               undoEvents: ['Event CharacterDataModified: #text'],
             },
             {
               oldStr: '<a href',
               newStr: '<a foo="bar" href',
               forwardEvents: ['Event AttrModified: A', 'Event AttrModified: A', 'Event AttrRemoved: A'],
               undoEvents: ['Event AttrModified: A', 'Event AttrRemoved: A', 'Event AttrRemoved: A'],
             },
             {
               oldStr: 'Getting involved',
               newStr: '',
               forwardEvents: ['Event NodeRemoved: #text'],
               undoEvents: ['Event NodeInserted: #text'],
             },
             {
               oldStr: 'Getting involved',
               newStr: 'Getting</h2><h2>involved',
               forwardEvents: ['Event NodeInserted: H2', 'Event NodeInserted: H2', 'Event NodeRemoved: H2'],
               undoEvents: ['Event NodeInserted: H2', 'Event NodeRemoved: H2', 'Event NodeRemoved: H2'],
             },
             {
               oldStr: '<h2>Getting involved</h2>',
               newStr: '<h3>Getting involved</h3>',
               forwardEvents: ['Event NodeInserted: H3', 'Event NodeRemoved: H2'],
               undoEvents: ['Event NodeInserted: H2', 'Event NodeRemoved: H3'],
             },
           ];

       for (const {oldStr, newStr, forwardEvents, undoEvents} of cases) {
         const patched = containerText.replace(oldStr, newStr);
         events.length = 0;
         await new Promise<void>(resolve => container.setOuterHTML(patched, () => resolve()));
         assert.deepEqual(events.splice(0).sort(), forwardEvents);
         assert.strictEqual(await container.getOuterHTML(), patched);

         await undoStack.undo();
         assert.deepEqual(events.splice(0).sort(), undoEvents);
         assert.strictEqual(await container.getOuterHTML(), containerText);
       }
     });

  /**
   * Returns a signature of the direct children of `node` as seen by the frontend DOMModel.
   * Whitespace-only text nodes are skipped because the backend does not report them.
   */
  function modelChildSignature(node: SDK.DOMModel.DOMNode|null): string[] {
    assert.isNotNull(node);
    const children = node.children();
    assert.isNotNull(children, `children of ${node.nodeName()} are not loaded in the DOMModel`);
    const isText = (child: SDK.DOMModel.DOMNode): boolean => child.nodeType() === SDK.DOMModel.NodeType.TEXT_NODE;
    return children.filter(child => !isText(child) || child.nodeValue().trim())
        .map(child => isText(child) ? `#text:${child.nodeValue()}` : child.nodeName());
  }

  /**
   * Returns the same signature as `modelChildSignature`, but computed from the live DOM of the inspected page.
   */
  async function pageChildSignature(inspectedPage: API.InspectedPage, selector: string): Promise<string[]> {
    return await inspectedPage.evaluate((selector: string) => {
      const element = document.querySelector(selector);
      if (!element) {
        throw new Error(`No element for ${selector}`);
      }
      return [...element.childNodes]
          .filter(child => child.nodeType !== Node.TEXT_NODE || child.nodeValue?.trim())
          .map(child => child.nodeType === Node.TEXT_NODE ? `#text:${child.nodeValue}` : child.nodeName);
    }, selector);
  }

  function findById(root: SDK.DOMModel.DOMNode, id: string): SDK.DOMModel.DOMNode|null {
    return findNode(root, n => n.getAttribute('id') === id);
  }

  it('keeps the DOMModel tree consistent when applying and undoing multi-node setOuterHTML edits',
     async ({inspectedPage, universe}) => {
       const primaryTarget = universe.targetManager.primaryPageTarget();
       assert.isNotNull(primaryTarget);
       const domModel = primaryTarget.model(SDK.DOMModel.DOMModel);
       assert.isNotNull(domModel);
       const undoStack = universe.domModelUndoStack;

       await inspectedPage.goToHtml(`
         <div id="container" style="display:none">
         <p>WebKit is used by <a href="http://www.apple.com/safari/">Safari</a>, Dashboard, etc..</p>
         <h2>Getting involved</h2>
         <p id="identity">There are many ways to get involved. You can:</p>
         <ul>
            <li></li>
         </ul>
         <ul>
            <li></li>
         </ul>
         </div>
       `);
       const doc = await domModel.requestDocument();
       assert.isNotNull(doc);
       await doc.getSubtree(10, true);
       const container = findById(doc, 'container');
       assert.isNotNull(container);
       const body = container.parentNode;
       assert.isNotNull(body);
       const identity = findById(doc, 'identity');
       assert.isNotNull(identity);
       const containerText = await container.getOuterHTML();
       assert.isNotNull(containerText);
       const events = recordDOMModelEvents(domModel);

       async function assertModelMatchesPage(): Promise<void> {
         assert.deepEqual(modelChildSignature(body), await pageChildSignature(inspectedPage, 'body'));
         assert.deepEqual(modelChildSignature(container), await pageChildSignature(inspectedPage, '#container'));
         // The node that was not touched by the edit must keep its DOMModel identity.
         assert.strictEqual(findById(container as SDK.DOMModel.DOMNode, 'identity'), identity);
       }

       const cases: Array<{
         name: string,
         patch: (text: string) => string,
         forwardEvents: string[],
         // Omitted where the exact undo mutation sequence differs between Chrome versions; the backend
         // sequence is covered by inspector-protocol/dom/undo-set-outer-html-2.js in Chromium.
         undoEvents?: string[],
       }> =
           [
             {
               name: 'change multiple things',
               patch: text => text.replace(/<li>.*<\/li>/, '').replace('<h2>', '<h2 foo="bar" bar="baz">'),
               forwardEvents: [
                 'Event AttrModified: H2',
                 'Event AttrModified: H2',
                 'Event NodeInserted: UL',
                 'Event NodeRemoved: UL',
               ],
               undoEvents: [
                 'Event AttrRemoved: H2',
                 'Event AttrRemoved: H2',
                 'Event NodeInserted: UL',
                 'Event NodeRemoved: UL',
               ],
             },
             {
               name: 'change nesting level',
               patch: text => text.replace('<ul>', '<div><ul>').replace('</ul>', '</ul></div>'),
               forwardEvents: ['Event NodeInserted: DIV', 'Event NodeRemoved: UL'],
               undoEvents: ['Event NodeInserted: UL', 'Event NodeRemoved: DIV'],
             },
             {
               name: 'swap nodes',
               patch: text =>
                   text.replace('<h2>Getting involved</h2>', '').replace('</div>', '<h2>Getting involved</h2></div>'),
               forwardEvents: ['Event NodeInserted: H2', 'Event NodeRemoved: H2'],
               undoEvents: ['Event NodeInserted: H2', 'Event NodeRemoved: H2'],
             },
             {
               name: 'edit two roots',
               patch: text => text + '<div>Additional node</div>',
               forwardEvents: ['Event NodeInserted: DIV'],
               undoEvents: ['Event NodeRemoved: DIV'],
             },
             {
               name: 'duplicate node',
               patch: text =>
                   text.replace('<h2>Getting involved</h2>', '<h2>Getting involved</h2><h2>Getting involved</h2>'),
               forwardEvents: ['Event NodeInserted: H2', 'Event NodeInserted: H2', 'Event NodeRemoved: H2'],
             },
           ];

       for (const {name, patch, forwardEvents, undoEvents} of cases) {
         events.length = 0;
         await new Promise<void>(resolve => container.setOuterHTML(patch(containerText), () => resolve()));
         assert.deepEqual(events.splice(0).sort(), forwardEvents, `forward events for "${name}"`);
         await assertModelMatchesPage();

         await undoStack.undo();
         const actualUndoEvents = events.splice(0).sort();
         if (undoEvents) {
           assert.deepEqual(actualUndoEvents, undoEvents, `undo events for "${name}"`);
         }
         assert.strictEqual(await container.getOuterHTML(), containerText, `undo result for "${name}"`);
         await assertModelMatchesPage();
       }
     });

  it('handles whitespace-only text nodes in setOuterHTML edits', async ({inspectedPage, universe}) => {
    const primaryTarget = universe.targetManager.primaryPageTarget();
    assert.isNotNull(primaryTarget);
    const domModel = primaryTarget.model(SDK.DOMModel.DOMModel);
    assert.isNotNull(domModel);

    await inspectedPage.goToHtml(`
      <div id="container" style="display:none">
        <child id="identity"></child>
      </div>
    `);
    const doc = await domModel.requestDocument();
    assert.isNotNull(doc);
    await doc.getSubtree(10, true);
    const container = findById(doc, 'container');
    assert.isNotNull(container);
    const identity = findById(doc, 'identity');
    assert.isNotNull(identity);
    const containerText = await container.getOuterHTML();
    assert.isNotNull(containerText);
    const events = recordDOMModelEvents(domModel);

    const steps: Array<{textContent: string, expectedEvents: string[]}> = [
      {textContent: ' ', expectedEvents: []},
      {textContent: 'NOT_WHITESPACE', expectedEvents: ['Event NodeInserted: #text']},
      {textContent: 'OTHER_NOT_WHITESPACE', expectedEvents: ['Event CharacterDataModified: #text']},
      {textContent: '   ', expectedEvents: ['Event NodeRemoved: #text']},
      {textContent: '', expectedEvents: []},
    ];
    for (const {textContent, expectedEvents} of steps) {
      events.length = 0;
      const text =
          containerText.replace(/<child id="identity">.*<\/child>/, `<child id="identity">${textContent}</child>`);
      await new Promise<void>(resolve => container.setOuterHTML(text, () => resolve()));
      assert.deepEqual(events.splice(0).sort(), expectedEvents, `events for textContent "${textContent}"`);
      assert.strictEqual(findById(container, 'identity'), identity);
      assert.deepEqual(modelChildSignature(identity), await pageChildSignature(inspectedPage, '#identity'));
    }
  });

  it('applies setOuterHTML edits in an XHTML document', async ({inspectedPage, universe}) => {
    const primaryTarget = universe.targetManager.primaryPageTarget();
    assert.isNotNull(primaryTarget);
    const domModel = primaryTarget.model(SDK.DOMModel.DOMModel);
    assert.isNotNull(domModel);

    const xhtml = `<html id="html" xmlns="http://www.w3.org/1999/xhtml">
<body>
<div id="container" style="display:none">
<p>WebKit is used by <a href="http://www.apple.com/safari/">Safari</a>, Dashboard, etc.</p>
<h2>Getting involved</h2>
<p id="identity">There are many ways to get involved. You can:</p>
</div>
</body>
</html>`;
    await inspectedPage.goTo(`data:application/xhtml+xml;charset=utf-8,${encodeURIComponent(xhtml)}`);
    const doc = await domModel.requestDocument();
    assert.isNotNull(doc);
    await doc.getSubtree(10, true);
    const container = findById(doc, 'container');
    assert.isNotNull(container);
    assert.isTrue(container.isXMLNode());
    assert.strictEqual(container.nodeName(), 'div');
    const identity = findById(doc, 'identity');
    assert.isNotNull(identity);
    const containerText = await container.getOuterHTML();
    assert.isNotNull(containerText);
    const events = recordDOMModelEvents(domModel);

    const cases: Array<{oldStr: string, newStr: string, forwardEvents: string[], restoreEvents: string[]}> = [
      {
        oldStr: 'Getting involved',
        newStr: 'Getting not involved',
        forwardEvents: [
          'Event AttrModified: div',
          'Event AttrModified: div',
          'Event AttrModified: div',
          'Event AttrRemoved: div',
          'Event AttrRemoved: div',
          'Event CharacterDataModified: #text',
        ],
        restoreEvents: ['Event CharacterDataModified: #text'],
      },
      {
        oldStr: '<a href',
        newStr: '<a foo="bar" href',
        forwardEvents: ['Event AttrModified: a', 'Event AttrModified: a', 'Event AttrRemoved: a'],
        restoreEvents: ['Event AttrModified: a', 'Event AttrRemoved: a', 'Event AttrRemoved: a'],
      },
      {
        oldStr: 'Getting involved',
        newStr: '',
        forwardEvents: ['Event NodeRemoved: #text'],
        restoreEvents: ['Event NodeInserted: #text'],
      },
      {
        oldStr: 'Getting involved',
        newStr: 'Getting</h2><h2>involved',
        forwardEvents: ['Event NodeInserted: h2', 'Event NodeInserted: h2', 'Event NodeRemoved: h2'],
        restoreEvents: ['Event NodeInserted: h2', 'Event NodeRemoved: h2', 'Event NodeRemoved: h2'],
      },
      {
        oldStr: '<h2>Getting involved</h2>',
        newStr: '<h3>Getting involved</h3>',
        forwardEvents: ['Event NodeInserted: h3', 'Event NodeRemoved: h2'],
        restoreEvents: ['Event NodeInserted: h2', 'Event NodeRemoved: h3'],
      },
    ];

    for (const {oldStr, newStr, forwardEvents, restoreEvents} of cases) {
      events.length = 0;
      await new Promise<void>(resolve =>
                                  container.setOuterHTML(containerText.replace(oldStr, newStr), () => resolve()));
      assert.deepEqual(events.splice(0).sort(), forwardEvents, `forward events for "${newStr}"`);
      assert.deepEqual(modelChildSignature(container), await pageChildSignature(inspectedPage, '#container'));
      assert.strictEqual(findById(container, 'identity'), identity);

      await new Promise<void>(resolve => container.setOuterHTML(containerText, () => resolve()));
      assert.deepEqual(events.splice(0).sort(), restoreEvents, `restore events for "${newStr}"`);
      assert.deepEqual(modelChildSignature(container), await pageChildSignature(inspectedPage, '#container'));
      assert.strictEqual(findById(container, 'identity'), identity);
    }
  });

  it('undoes and redoes removeNode, setNodeName, setNodeValue, and setOuterHTML edits',
     async ({inspectedPage, universe}) => {
       const primaryTarget = universe.targetManager.primaryPageTarget();
       assert.isNotNull(primaryTarget);
       const domModel = primaryTarget.model(SDK.DOMModel.DOMModel);
       assert.isNotNull(domModel);
       const undoStack = universe.domModelUndoStack;

       await inspectedPage.goToHtml(`
         <div style="display:none">
           <div id="testRemove"><div id="node-to-remove"></div></div>
           <div id="testSetNodeName"><div id="node-to-set-name"></div></div>
           <div id="testSetNodeValue"><div id="node-to-set-value">Text</div></div>
           <div id="testEditAsHTML"><div id="node-to-edit-as-html"><span id="span">Text</span></div></div>
         </div>
       `);
       const doc = await domModel.requestDocument();
       assert.isNotNull(doc);
       await doc.getSubtree(10, true);

       // 1. testRemove
       const testRemove = findNode(doc, n => n.getAttribute('id') === 'testRemove');
       assert.isNotNull(testRemove);
       assert.strictEqual(testRemove.children()?.length, 1);
       const removeMe = findNode(testRemove, n => n.getAttribute('id') === 'node-to-remove');
       assert.isNotNull(removeMe);
       await removeMe.removeNode();
       assert.strictEqual(testRemove.children()?.length, 0);
       await undoStack.undo();
       assert.strictEqual(testRemove.children()?.length, 1);
       assert.strictEqual(testRemove.children()?.[0].getAttribute('id'), 'node-to-remove');
       await undoStack.redo();
       assert.strictEqual(testRemove.children()?.length, 0);

       // 2. testSetNodeName
       const testSetNodeName = findNode(doc, n => n.getAttribute('id') === 'testSetNodeName');
       assert.isNotNull(testSetNodeName);
       assert.strictEqual(testSetNodeName.children()?.[0].nodeName(), 'DIV');
       const renameMe = findNode(testSetNodeName, n => n.getAttribute('id') === 'node-to-set-name');
       assert.isNotNull(renameMe);
       await new Promise<void>(resolve => renameMe.setNodeName('span', () => resolve()));
       assert.strictEqual(testSetNodeName.children()?.[0].nodeName(), 'SPAN');
       await undoStack.undo();
       assert.strictEqual(testSetNodeName.children()?.[0].nodeName(), 'DIV');
       await undoStack.redo();
       assert.strictEqual(testSetNodeName.children()?.[0].nodeName(), 'SPAN');

       // 3. testSetNodeValue
       const setValueNode = findNode(doc, n => n.getAttribute('id') === 'node-to-set-value');
       assert.isNotNull(setValueNode);
       assert.strictEqual(setValueNode.firstChild?.nodeValue(), 'Text');
       await new Promise<void>(resolve => setValueNode.firstChild?.setNodeValue('New Text', () => resolve()));
       assert.strictEqual(setValueNode.firstChild?.nodeValue(), 'New Text');
       await undoStack.undo();
       assert.strictEqual(setValueNode.firstChild?.nodeValue(), 'Text');
       await undoStack.redo();
       assert.strictEqual(setValueNode.firstChild?.nodeValue(), 'New Text');

       // 4. testEditAsHTML
       const testEditAsHTML = findNode(doc, n => n.getAttribute('id') === 'testEditAsHTML');
       assert.isNotNull(testEditAsHTML);
       const editHtmlNode = findNode(testEditAsHTML, n => n.getAttribute('id') === 'node-to-edit-as-html');
       assert.isNotNull(editHtmlNode);
       assert.strictEqual(testEditAsHTML.children()?.length, 1);
       await new Promise<void>(
           resolve => editHtmlNode.setOuterHTML(
               '<div id="node-to-edit-as-html"><div id="span2">Text2</div></div><span>Second node</span>',
               () => resolve()));
       await testEditAsHTML.getSubtree(5, true);
       assert.deepEqual(testEditAsHTML.children()?.map(n => n.nodeName()), ['DIV', 'SPAN']);
       assert.isNotNull(findNode(testEditAsHTML, n => n.getAttribute('id') === 'span2'));
       await undoStack.undo();
       await testEditAsHTML.getSubtree(5, true);
       assert.deepEqual(testEditAsHTML.children()?.map(n => n.nodeName()), ['DIV']);
       assert.isNotNull(findNode(testEditAsHTML, n => n.getAttribute('id') === 'span'));
       await undoStack.redo();
       await testEditAsHTML.getSubtree(5, true);
       assert.deepEqual(testEditAsHTML.children()?.map(n => n.nodeName()), ['DIV', 'SPAN']);
       assert.isNotNull(findNode(testEditAsHTML, n => n.getAttribute('id') === 'span2'));
     });

  it('undoes and redoes setAttribute, removeAttribute, and addAttribute edits', async ({inspectedPage, universe}) => {
    const primaryTarget = universe.targetManager.primaryPageTarget();
    assert.isNotNull(primaryTarget);
    const domModel = primaryTarget.model(SDK.DOMModel.DOMModel);
    assert.isNotNull(domModel);
    const undoStack = universe.domModelUndoStack;

    await inspectedPage.goToHtml(`
      <div style="display:none">
        <div id="testSetAttribute"><div foo="attribute value" id="node-to-set-attribute"></div></div>
        <div id="testRemoveAttribute"><div foo="attribute value" id="node-to-remove-attribute"></div></div>
        <div id="testAddAttribute"><div id="node-to-add-attribute"></div></div>
      </div>
    `);
    const doc = await domModel.requestDocument();
    assert.isNotNull(doc);
    await doc.getSubtree(5, true);

    // 1. testSetAttribute
    const setAttrNode = findNode(doc, n => n.getAttribute('id') === 'node-to-set-attribute');
    assert.isNotNull(setAttrNode);
    assert.strictEqual(setAttrNode.getAttribute('foo'), 'attribute value');
    await new Promise<void>(resolve => setAttrNode.setAttribute('foo', 'bar="edited attribute"', () => resolve()));
    assert.isUndefined(setAttrNode.getAttribute('foo'));
    assert.strictEqual(setAttrNode.getAttribute('bar'), 'edited attribute');
    await undoStack.undo();
    assert.strictEqual(setAttrNode.getAttribute('foo'), 'attribute value');
    assert.isUndefined(setAttrNode.getAttribute('bar'));
    await undoStack.redo();
    assert.isUndefined(setAttrNode.getAttribute('foo'));
    assert.strictEqual(setAttrNode.getAttribute('bar'), 'edited attribute');

    // 2. testRemoveAttribute
    const removeAttrNode = findNode(doc, n => n.getAttribute('id') === 'node-to-remove-attribute');
    assert.isNotNull(removeAttrNode);
    assert.strictEqual(removeAttrNode.getAttribute('foo'), 'attribute value');
    await removeAttrNode.removeAttribute('foo');
    assert.isUndefined(removeAttrNode.getAttribute('foo'));
    await undoStack.undo();
    assert.strictEqual(removeAttrNode.getAttribute('foo'), 'attribute value');
    await undoStack.redo();
    assert.isUndefined(removeAttrNode.getAttribute('foo'));

    // 3. testAddAttribute
    const addAttrNode = findNode(doc, n => n.getAttribute('id') === 'node-to-add-attribute');
    assert.isNotNull(addAttrNode);
    assert.isUndefined(addAttrNode.getAttribute('newattr'));
    await new Promise<void>(resolve => addAttrNode.setAttribute('', 'newattr="new-value"', () => resolve()));
    assert.strictEqual(addAttrNode.getAttribute('newattr'), 'new-value');
    await undoStack.undo();
    assert.isUndefined(addAttrNode.getAttribute('newattr'));
    await undoStack.redo();
    assert.strictEqual(addAttrNode.getAttribute('newattr'), 'new-value');
  });
});
