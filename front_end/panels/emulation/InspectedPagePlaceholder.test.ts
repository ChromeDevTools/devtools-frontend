// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Host from '../../core/host/host.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {beforeEachWithTeardown} from '../../testing/TestTeardown.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Emulation from './emulation.js';

describe('InspectedPagePlaceholder', () => {
  let placeholder: Emulation.InspectedPagePlaceholder.InspectedPagePlaceholder|undefined;

  beforeEachWithTeardown(
      () => {
        UI.ZoomManager.ZoomManager.instance({
          forceNew: true,
          win: window,
          frontendHost: Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        });
      },
      () => {
        UI.ZoomManager.ZoomManager.removeInstance();
      },
  );

  afterEach(() => {
    placeholder?.detach();
    placeholder = undefined;
    Emulation.InspectedPagePlaceholder.InspectedPagePlaceholder.instance({forceNew: true});
  });

  it('returns a cached singleton from instance unless forceNew is set', () => {
    const first = Emulation.InspectedPagePlaceholder.InspectedPagePlaceholder.instance();
    assert.strictEqual(Emulation.InspectedPagePlaceholder.InspectedPagePlaceholder.instance(), first);
    assert.notStrictEqual(Emulation.InspectedPagePlaceholder.InspectedPagePlaceholder.instance({forceNew: true}),
                          first);
  });

  it('initializes minimum size and schedules a view update into its shadow root when shown', async () => {
    const view = createViewFunctionStub(Emulation.InspectedPagePlaceholder.InspectedPagePlaceholder);
    placeholder = new Emulation.InspectedPagePlaceholder.InspectedPagePlaceholder(undefined, view);

    sinon.assert.notCalled(view);
    assert.strictEqual(placeholder.constraints().minimum.width, 150);
    assert.strictEqual(placeholder.constraints().minimum.height, 150);

    const nextInputPromise = view.nextInput;
    renderElementIntoDOM(placeholder);
    const nextInput = await nextInputPromise;

    sinon.assert.calledOnce(view);
    assert.isUndefined(nextInput);
    assert.strictEqual(view.firstCall.args[2], placeholder.element.shadowRoot);
  });

  it('re-schedules the initial render if detached before performUpdate runs', async () => {
    const view = createViewFunctionStub(Emulation.InspectedPagePlaceholder.InspectedPagePlaceholder);
    const parent = new UI.Widget.Widget();
    renderElementIntoDOM(parent);
    placeholder = new Emulation.InspectedPagePlaceholder.InspectedPagePlaceholder(undefined, view);

    placeholder.show(parent.contentElement);
    placeholder.detach();
    await UI.Widget.Widget.allUpdatesComplete;
    sinon.assert.notCalled(view);

    placeholder.show(parent.contentElement);
    await placeholder.updateComplete;
    sinon.assert.calledOnce(view);
  });

  it('does not report bounds while detached from the document', () => {
    const view = createViewFunctionStub(Emulation.InspectedPagePlaceholder.InspectedPagePlaceholder);
    placeholder = new Emulation.InspectedPagePlaceholder.InspectedPagePlaceholder(undefined, view);
    const onUpdate = sinon.spy();
    placeholder.addEventListener(Emulation.InspectedPagePlaceholder.Events.UPDATE, onUpdate);

    placeholder.update();
    placeholder.update(/* force= */ true);
    sinon.assert.notCalled(onUpdate);

    renderElementIntoDOM(placeholder, {includeCommonStyles: true, width: 800, height: 600});
    placeholder.update();
    sinon.assert.calledOnce(onUpdate);
    assert.deepEqual(onUpdate.firstCall.args[0].data, {x: 0, y: 0, width: 800, height: 600});
  });

  it('clamps reported DIP bounds to document body and applies zoom factor', () => {
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'zoomFactor').returns(2);
    UI.ZoomManager.ZoomManager.instance({
      forceNew: true,
      win: window,
      frontendHost: Host.InspectorFrontendHost.InspectorFrontendHostInstance,
    });
    const view = createViewFunctionStub(Emulation.InspectedPagePlaceholder.InspectedPagePlaceholder);
    placeholder = new Emulation.InspectedPagePlaceholder.InspectedPagePlaceholder(undefined, view);
    renderElementIntoDOM(placeholder);
    sinon.stub(placeholder.element, 'getBoundingClientRect').returns(new DOMRect(-10, 20, 300, 250));
    sinon.stub(document.body, 'getBoundingClientRect').returns(new DOMRect(0, 0, 500, 400));

    const updates: Emulation.InspectedPagePlaceholder.Bounds[] = [];
    placeholder.addEventListener(Emulation.InspectedPagePlaceholder.Events.UPDATE, ({data}) => {
      updates.push({...data});
    });

    placeholder.update();

    assert.deepEqual(updates, [{x: 0, y: 40, width: 580, height: 500}]);
  });

  it('dispatches a decremented-height update before the final bounds when forced', () => {
    const view = createViewFunctionStub(Emulation.InspectedPagePlaceholder.InspectedPagePlaceholder);
    placeholder = new Emulation.InspectedPagePlaceholder.InspectedPagePlaceholder(undefined, view);
    renderElementIntoDOM(placeholder);
    sinon.stub(placeholder.element, 'getBoundingClientRect').returns(new DOMRect(10, 20, 400, 300));
    sinon.stub(document.body, 'getBoundingClientRect').returns(new DOMRect(0, 0, 800, 600));

    const updates: Emulation.InspectedPagePlaceholder.Bounds[] = [];
    placeholder.addEventListener(Emulation.InspectedPagePlaceholder.Events.UPDATE, ({data}) => {
      updates.push({...data});
    });

    placeholder.update(true);

    assert.deepEqual(updates, [
      {x: 10, y: 20, width: 400, height: 299},
      {x: 10, y: 20, width: 400, height: 300},
    ]);
  });

  it('projects host textContent via slot and preserves shadow styles across re-renders', async () => {
    placeholder = new Emulation.InspectedPagePlaceholder.InspectedPagePlaceholder();
    placeholder.element.textContent = 'Inspected Page Placeholder';
    renderElementIntoDOM(placeholder, {includeCommonStyles: true});
    await placeholder.updateComplete;

    placeholder.element.textContent = 'Updated Placeholder';
    placeholder.requestUpdate();
    await placeholder.updateComplete;

    const slot = placeholder.element.shadowRoot?.querySelector('slot');
    assert.instanceOf(slot, HTMLSlotElement);
    assert.deepEqual(slot.assignedNodes().map(node => node.textContent), ['Updated Placeholder']);
    assert.notStrictEqual(getComputedStyle(placeholder.element).backgroundColor, 'rgba(0, 0, 0, 0)');
  });
});

describe('InspectedPagePlaceholder DEFAULT_VIEW', () => {
  it('renders stylesheet and default slot', () => {
    const host = renderElementIntoDOM(document.createElement('div'), {includeCommonStyles: true});
    const shadowRoot = host.attachShadow({mode: 'open'});

    Emulation.InspectedPagePlaceholder.DEFAULT_VIEW(undefined, undefined, shadowRoot);

    assert.isOk(shadowRoot.querySelector('style'));
    assert.isOk(shadowRoot.querySelector('slot'));
    assert.notStrictEqual(getComputedStyle(host).backgroundColor, 'rgba(0, 0, 0, 0)');
  });
});
