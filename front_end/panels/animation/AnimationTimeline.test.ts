// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {
  createTarget,
  stubNoopSettings,
} from '../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../testing/ExpectStubCall.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import * as Elements from '../elements/elements.js';

import * as Animation from './animation.js';

const TIME_ANIMATION_PAYLOAD = {
  id: 'animation-id',
  name: 'animation-name',
  pausedState: false,
  playState: 'running',
  playbackRate: 1,
  startTime: 42,
  currentTime: 0,
  type: Protocol.Animation.AnimationType.CSSAnimation,
  source: {
    delay: 0,
    endDelay: 0,
    duration: 10000,
    backendNodeId: 42 as Protocol.DOM.BackendNodeId,
  } as Protocol.Animation.AnimationEffect,
};

const SDA_ANIMATION_PAYLOAD = {
  id: 'animation-id',
  name: 'animation-name',
  pausedState: false,
  playState: 'running',
  playbackRate: 1,
  startTime: 42,
  currentTime: 0,
  type: Protocol.Animation.AnimationType.CSSAnimation,
  source: {
    delay: 0,
    endDelay: 0,
    duration: 10000,
    backendNodeId: 42 as Protocol.DOM.BackendNodeId,
  } as Protocol.Animation.AnimationEffect,
  viewOrScrollTimeline: {
    axis: Protocol.DOM.ScrollOrientation.Vertical,
    sourceNodeId: 42 as Protocol.DOM.BackendNodeId,
    startOffset: 42,
    endOffset: 142,
  },
};

type AnimationDOMNodeStubs = {
  verticalScrollRange: sinon.SinonStub,
  horizontalScrollRange: sinon.SinonStub,
  scrollLeft: sinon.SinonStub,
  scrollTop: sinon.SinonStub,
  addScrollEventListener: sinon.SinonStub,
  removeScrollEventListener: sinon.SinonStub,
};
class ManualPromise {
  #waitPromise: Promise<void>;
  #resolveFn!: Function;
  constructor() {
    this.#waitPromise = new Promise(r => {
      this.#resolveFn = r;
    });
  }

  resolve() {
    this.#resolveFn();
    this.#waitPromise = new Promise(r => {
      this.#resolveFn = r;
    });
  }

  wait() {
    return this.#waitPromise;
  }
}

const cancelAllPendingRaf = () => {
  let rafId = window.requestAnimationFrame(() => {});
  while (rafId--) {
    window.cancelAnimationFrame(rafId);
  }
};

const stubAnimationGroup = () => {
  sinon.stub(SDK.AnimationModel.AnimationGroup.prototype, 'scrollNode')
      .resolves(new SDK.AnimationModel.AnimationDOMNode(null as unknown as SDK.DOMModel.DOMNode));
};

const stubAnimationDOMNode = (): AnimationDOMNodeStubs => {
  const verticalScrollRange =
      sinon.stub(SDK.AnimationModel.AnimationDOMNode.prototype, 'verticalScrollRange').resolves(100);
  const horizontalScrollRange =
      sinon.stub(SDK.AnimationModel.AnimationDOMNode.prototype, 'horizontalScrollRange').resolves(100);
  const scrollLeft = sinon.stub(SDK.AnimationModel.AnimationDOMNode.prototype, 'scrollLeft').resolves(10);
  const scrollTop = sinon.stub(SDK.AnimationModel.AnimationDOMNode.prototype, 'scrollTop').resolves(10);
  const addScrollEventListener =
      sinon.stub(SDK.AnimationModel.AnimationDOMNode.prototype, 'addScrollEventListener').resolves();
  const removeScrollEventListener =
      sinon.stub(SDK.AnimationModel.AnimationDOMNode.prototype, 'removeScrollEventListener').resolves();
  return {
    verticalScrollRange,
    horizontalScrollRange,
    scrollLeft,
    scrollTop,
    addScrollEventListener,
    removeScrollEventListener,
  };
};

describeWithMockConnection('AnimationTimeline', () => {
  let target: SDK.Target.Target;
  let view: Animation.AnimationTimeline.AnimationTimeline;

  beforeEach(() => {
    Common.Linkifier.registerLinkifier({
      contextTypes() {
        return [SDK.DOMModel.DOMNode];
      },
      async loadLinkifier() {
        return Elements.DOMLinkifier.Linkifier.instance();
      },
    });

    stubNoopSettings();
    target = createTarget();

    const runtimeAgent = target.model(SDK.RuntimeModel.RuntimeModel)?.agent!;

    const stub = sinon.stub(runtimeAgent, 'invoke_evaluate');
    stub.callsFake(params => {
      if (params.expression === 'window.devicePixelRatio') {
        return Promise.resolve({
          result: {
            type: 'number' as Protocol.Runtime.RemoteObjectType,
            value: 1,
          },
          getError: () => undefined,
        });
      }

      return stub.wrappedMethod(params);
    });
  });

  afterEach(() => {
    cancelAllPendingRaf();
    view.detach();
  });

  const updatesUiOnEvent = (inScope: boolean) => async () => {
    SDK.TargetManager.TargetManager.instance().setScopeTarget(inScope ? target : null);
    const model = target.model(SDK.AnimationModel.AnimationModel);
    assert.exists(model);

    view = Animation.AnimationTimeline.AnimationTimeline.instance({forceNew: true});
    view.markAsRoot();
    view.show(document.body);
    await new Promise<void>(resolve => setTimeout(resolve, 0));

    const previewContainer = (view.contentElement.querySelector('.animation-timeline-buffer') as HTMLElement);

    await model.animationStarted({
      id: 'id',
      name: 'name',
      pausedState: false,
      playState: 'playState',
      playbackRate: 1,
      startTime: 42,
      currentTime: 43,
      type: Protocol.Animation.AnimationType.CSSAnimation,
      source: {
        delay: 0,
        duration: 1001,
        backendNodeId: 42 as Protocol.DOM.BackendNodeId,
      } as Protocol.Animation.AnimationEffect,
    });

    if (inScope) {
      await expectCall(sinon.stub(view, 'previewsCreatedForTest'));
    }
    assert.strictEqual(previewContainer.querySelectorAll('.animation-buffer-preview').length, inScope ? 1 : 0);
  };

  // Failing on the toolbar button CL together with some ApplicationSidebarPanel tests
  it.skip('[crbug.com/354673294] updates UI on in scope animation group start', updatesUiOnEvent(true));
  // Failing on the toolbar button CL together with some ApplicationSidebarPanel tests
  it.skip('[crbug.com/354673294] does not update UI on out of scope animation group start', updatesUiOnEvent(false));

  // Flaking on multiple bots on CQ.
  describe.skip('[crbug.com/334003901] resizing time controls', () => {
    it('updates --timeline-controls-width and calls onResize', async () => {
      view = Animation.AnimationTimeline.AnimationTimeline.instance({forceNew: true});
      view.markAsRoot();
      view.show(document.body);
      const onResizeStub = sinon.stub(view, 'onResize');
      await new Promise<void>(resolve => setTimeout(resolve, 0));

      const resizer = view.contentElement.querySelector('.timeline-controls-resizer');
      assert.exists(resizer);

      const initialWidth = view.element.style.getPropertyValue('--timeline-controls-width');
      assert.strictEqual(initialWidth, '150px');

      const resizerRect = resizer.getBoundingClientRect();
      resizer.dispatchEvent(
          new PointerEvent('pointerdown', {
            clientX: resizerRect.x + resizerRect.width / 2,
            clientY: resizerRect.y + resizerRect.height / 2,
          }),
      );
      resizer.ownerDocument.dispatchEvent(
          new PointerEvent('pointermove', {
            buttons: 1,
            clientX: (resizerRect.x + resizerRect.width / 2) + 20,
            clientY: resizerRect.y + resizerRect.height / 2,
          }),
      );
      resizer.ownerDocument.dispatchEvent(new PointerEvent('pointerup'));

      const afterResizeWidth = view.element.style.getPropertyValue('--timeline-controls-width');
      assert.notStrictEqual(initialWidth, afterResizeWidth);
      assert.isTrue(onResizeStub.calledOnce);
    });
  });

  // Flaking on multiple bots on CQ.
  describe.skip('[crbug.com/334003901] Animation group nodes are removed', () => {
    const waitForPreviewsManualPromise = new ManualPromise();
    const waitForAnimationGroupSelectedPromise = new ManualPromise();

    let domModel: SDK.DOMModel.DOMModel;
    let animationModel: SDK.AnimationModel.AnimationModel;
    let contentDocument: SDK.DOMModel.DOMDocument;
    beforeEach(async () => {
      view = Animation.AnimationTimeline.AnimationTimeline.instance({forceNew: true});
      view.markAsRoot();
      view.show(document.body);

      sinon.stub(view, 'animationGroupSelectedForTest').callsFake(() => {
        waitForAnimationGroupSelectedPromise.resolve();
      });
      sinon.stub(view, 'previewsCreatedForTest').callsFake(() => {
        waitForPreviewsManualPromise.resolve();
      });

      const model = target.model(SDK.AnimationModel.AnimationModel);
      assert.exists(model);
      animationModel = model;

      const modelForDom = target.model(SDK.DOMModel.DOMModel);
      assert.exists(modelForDom);
      domModel = modelForDom;

      contentDocument = SDK.DOMModel.DOMDocument.create(domModel, null, false, {
        nodeId: 0 as Protocol.DOM.NodeId,
        backendNodeId: 0 as Protocol.DOM.BackendNodeId,
        nodeType: Node.DOCUMENT_NODE,
        nodeName: '#document',
        localName: 'document',
        nodeValue: '',
      }) as SDK.DOMModel.DOMDocument;

      void animationModel.animationStarted(TIME_ANIMATION_PAYLOAD);

      await waitForPreviewsManualPromise.wait();
    });

    // Failing on the toolbar button CL together with some ApplicationSidebarPanel tests
    describe.skip('[crbug.com/354673294] when the animation group is already selected', () => {
      it('should hide scrubber, disable control button and make current time empty', async () => {
        const domNode = SDK.DOMModel.DOMNode.create(domModel, contentDocument, false, {
          nodeId: 1 as Protocol.DOM.NodeId,
          backendNodeId: 1 as Protocol.DOM.BackendNodeId,
          nodeType: Node.ELEMENT_NODE,
          nodeName: 'div',
          localName: 'div',
          nodeValue: '',
        });
        sinon.stub(SDK.DOMModel.DeferredDOMNode.prototype, 'resolvePromise').resolves(domNode);

        const preview = view.element.shadowRoot!.querySelector('.animation-buffer-preview') as HTMLElement;
        preview.click();
        await waitForAnimationGroupSelectedPromise.wait();

        const gridHeader = view.element.shadowRoot!.querySelector('.animation-grid-header');
        assert.exists(gridHeader);
        assert.isTrue(gridHeader.classList.contains('scrubber-enabled'));

        const scrubber = view.element.shadowRoot!.querySelector('.animation-scrubber');
        assert.exists(scrubber);
        assert.isFalse(scrubber.classList.contains('hidden'));

        const controlButton = view.element.shadowRoot!.querySelector('.animation-controls-toolbar')
                                  ?.shadowRoot!.querySelector('.toolbar-button') as HTMLButtonElement;
        assert.exists(controlButton);
        assert.isFalse(controlButton.disabled);

        const currentTime = view.element.shadowRoot!.querySelector('.animation-timeline-current-time');
        assert.exists(currentTime);

        domModel.dispatchEventToListeners(SDK.DOMModel.Events.NodeRemoved, {node: domNode, parent: contentDocument});
        assert.isFalse(gridHeader.classList.contains('scrubber-enabled'));
        assert.isTrue(scrubber.classList.contains('hidden'));
        assert.isTrue(controlButton.disabled);
        assert.isTrue(currentTime.textContent === '');
      });

      it('should mark the animation node as removed in the NodeUI', async () => {
        const domNode = SDK.DOMModel.DOMNode.create(domModel, contentDocument, false, {
          nodeId: 1 as Protocol.DOM.NodeId,
          backendNodeId: 1 as Protocol.DOM.BackendNodeId,
          nodeType: Node.ELEMENT_NODE,
          nodeName: 'div',
          localName: 'div',
          nodeValue: '',
        });
        sinon.stub(SDK.DOMModel.DeferredDOMNode.prototype, 'resolvePromise').resolves(domNode);

        const preview = view.element.shadowRoot!.querySelector('.animation-buffer-preview') as HTMLElement;
        preview.click();
        await waitForAnimationGroupSelectedPromise.wait();

        // Wait for the animation group to be fully selected and scrubber enabled.
        const gridHeader = view.element.shadowRoot!.querySelector('.animation-grid-header');
        assert.exists(gridHeader);
        assert.isTrue(gridHeader.classList.contains('scrubber-enabled'));

        const animationNodeRow = view.element.shadowRoot!.querySelector('.animation-node-row') as HTMLElement;
        assert.exists(animationNodeRow);
        assert.isFalse(animationNodeRow.classList.contains('animation-node-removed'));

        domModel.dispatchEventToListeners(SDK.DOMModel.Events.NodeRemoved, {node: domNode, parent: contentDocument});
        assert.isTrue(animationNodeRow.classList.contains('animation-node-removed'));
      });
    });

    // Failing on the toolbar button CL together with some ApplicationSidebarPanel tests
    describe.skip('[crbug.com/354673294] when the animation group is not selected and the nodes are removed', () => {
      it('should scrubber be hidden, control button be disabled and current time be empty', async () => {
        // Owner document is null for the resolved deferred nodes that are already removed from the DOM.
        const domNode = SDK.DOMModel.DOMNode.create(domModel, null, false, {
          nodeId: 1 as Protocol.DOM.NodeId,
          backendNodeId: 1 as Protocol.DOM.BackendNodeId,
          nodeType: Node.ELEMENT_NODE,
          nodeName: 'div',
          localName: 'div',
          nodeValue: '',
        });
        sinon.stub(SDK.DOMModel.DeferredDOMNode.prototype, 'resolvePromise').resolves(domNode);

        const preview = view.element.shadowRoot!.querySelector('.animation-buffer-preview') as HTMLElement;
        preview.click();
        await waitForAnimationGroupSelectedPromise.wait();

        const gridHeader = view.element.shadowRoot!.querySelector('.animation-grid-header');
        assert.exists(gridHeader);
        assert.isFalse(gridHeader.classList.contains('scrubber-enabled'));

        const scrubber = view.element.shadowRoot!.querySelector('.animation-scrubber');
        assert.exists(scrubber);
        assert.isTrue(scrubber.classList.contains('hidden'));

        const controlButton = view.element.shadowRoot!.querySelector('.animation-controls-toolbar')
                                  ?.shadowRoot!.querySelector('.toolbar-button') as HTMLButtonElement;
        assert.exists(controlButton);
        assert.isTrue(controlButton.disabled);

        const currentTime = view.element.shadowRoot!.querySelector('.animation-timeline-current-time');
        assert.exists(currentTime);
        assert.isTrue(currentTime.textContent === '');
      });
    });
  });

  // Flaking on multiple bots on CQ.
  describe.skip('[crbug.com/334003901] time animations', () => {
    const waitForPreviewsManualPromise = new ManualPromise();
    const waitForAnimationGroupSelectedPromise = new ManualPromise();
    const waitForScheduleRedrawAfterAnimationGroupUpdated = new ManualPromise();

    let domModel: SDK.DOMModel.DOMModel;
    let animationModel: SDK.AnimationModel.AnimationModel;
    let contentDocument: SDK.DOMModel.DOMDocument;
    beforeEach(async () => {
      view = Animation.AnimationTimeline.AnimationTimeline.instance({forceNew: true});
      view.markAsRoot();
      view.show(document.body);

      sinon.stub(view, 'animationGroupSelectedForTest').callsFake(() => {
        waitForAnimationGroupSelectedPromise.resolve();
      });
      sinon.stub(view, 'previewsCreatedForTest').callsFake(() => {
        waitForPreviewsManualPromise.resolve();
      });
      sinon.stub(view, 'scheduledRedrawAfterAnimationGroupUpdatedForTest').callsFake(() => {
        waitForScheduleRedrawAfterAnimationGroupUpdated.resolve();
      });

      const model = target.model(SDK.AnimationModel.AnimationModel);
      assert.isNotNull(model);
      animationModel = model;

      const modelForDom = target.model(SDK.DOMModel.DOMModel);
      assert.isNotNull(modelForDom);
      domModel = modelForDom;

      contentDocument = SDK.DOMModel.DOMDocument.create(domModel, null, false, {
        nodeId: 0 as Protocol.DOM.NodeId,
        backendNodeId: 0 as Protocol.DOM.BackendNodeId,
        nodeType: Node.DOCUMENT_NODE,
        nodeName: '#document',
        localName: 'document',
        nodeValue: '',
      }) as SDK.DOMModel.DOMDocument;

      const domNode = SDK.DOMModel.DOMNode.create(domModel, contentDocument, false, {
        nodeId: 1 as Protocol.DOM.NodeId,
        backendNodeId: 1 as Protocol.DOM.BackendNodeId,
        nodeType: Node.ELEMENT_NODE,
        nodeName: 'div',
        localName: 'div',
        nodeValue: '',
      });
      sinon.stub(SDK.DOMModel.DeferredDOMNode.prototype, 'resolvePromise').resolves(domNode);

      void animationModel.animationStarted(TIME_ANIMATION_PAYLOAD);

      await waitForPreviewsManualPromise.wait();
    });

    // Failing on the toolbar button CL together with some ApplicationSidebarPanel tests
    describe.skip('[crbug.com/354673294] animationGroupUpdated', () => {
      it('should update duration on animationGroupUpdated', async () => {
        const preview = view.element.shadowRoot!.querySelector('.animation-buffer-preview') as HTMLElement;
        assert.isNotNull(preview);
        preview.click();
        await waitForAnimationGroupSelectedPromise.wait();

        void animationModel.animationUpdated({
          ...TIME_ANIMATION_PAYLOAD,
          source: {
            ...TIME_ANIMATION_PAYLOAD.source,
            iterations: 3,
            duration: 10,
          },
        });

        await waitForScheduleRedrawAfterAnimationGroupUpdated.wait();
        // 3 (iterations) * 10 (iteration duration)
        assert.strictEqual(view.duration(), 30);
      });

      it('should schedule re-draw on animationGroupUpdated', async () => {
        const preview = view.element.shadowRoot!.querySelector('.animation-buffer-preview') as HTMLElement;
        assert.isNotNull(preview);
        preview.click();
        await waitForAnimationGroupSelectedPromise.wait();

        void animationModel.animationUpdated(TIME_ANIMATION_PAYLOAD);

        await waitForScheduleRedrawAfterAnimationGroupUpdated.wait();
      });
    });
  });

  // Flaking on multiple bots on CQ.
  describe.skip('[crbug.com/334003901] scroll driven animations', () => {
    let stubbedAnimationDOMNode: AnimationDOMNodeStubs;
    const waitForPreviewsManualPromise = new ManualPromise();
    const waitForAnimationGroupSelectedPromise = new ManualPromise();
    const waitForScheduleRedrawAfterAnimationGroupUpdated = new ManualPromise();

    let domModel: SDK.DOMModel.DOMModel;
    let animationModel: SDK.AnimationModel.AnimationModel;
    let contentDocument: SDK.DOMModel.DOMDocument;
    beforeEach(async () => {
      stubbedAnimationDOMNode = stubAnimationDOMNode();
      stubAnimationGroup();

      view = Animation.AnimationTimeline.AnimationTimeline.instance({forceNew: true});
      view.markAsRoot();
      view.show(document.body);

      sinon.stub(view, 'animationGroupSelectedForTest').callsFake(() => {
        waitForAnimationGroupSelectedPromise.resolve();
      });
      sinon.stub(view, 'previewsCreatedForTest').callsFake(() => {
        waitForPreviewsManualPromise.resolve();
      });
      sinon.stub(view, 'scheduledRedrawAfterAnimationGroupUpdatedForTest').callsFake(() => {
        waitForScheduleRedrawAfterAnimationGroupUpdated.resolve();
      });

      const model = target.model(SDK.AnimationModel.AnimationModel);
      assert.exists(model);
      animationModel = model;

      const modelForDom = target.model(SDK.DOMModel.DOMModel);
      assert.exists(modelForDom);
      domModel = modelForDom;

      contentDocument = SDK.DOMModel.DOMDocument.create(domModel, null, false, {
        nodeId: 0 as Protocol.DOM.NodeId,
        backendNodeId: 0 as Protocol.DOM.BackendNodeId,
        nodeType: Node.DOCUMENT_NODE,
        nodeName: '#document',
        localName: 'document',
        nodeValue: '',
      }) as SDK.DOMModel.DOMDocument;

      const domNode = SDK.DOMModel.DOMNode.create(domModel, contentDocument, false, {
        nodeId: 1 as Protocol.DOM.NodeId,
        backendNodeId: 1 as Protocol.DOM.BackendNodeId,
        nodeType: Node.ELEMENT_NODE,
        nodeName: 'div',
        localName: 'div',
        nodeValue: '',
      });
      sinon.stub(SDK.DOMModel.DeferredDOMNode.prototype, 'resolvePromise').resolves(domNode);

      void animationModel.animationStarted({
        id: 'animation-id',
        name: 'animation-name',
        pausedState: false,
        playState: 'running',
        playbackRate: 1,
        startTime: 42,
        currentTime: 0,
        type: Protocol.Animation.AnimationType.CSSAnimation,
        source: {
          delay: 0,
          endDelay: 0,
          duration: 10000,
          backendNodeId: 42 as Protocol.DOM.BackendNodeId,
        } as Protocol.Animation.AnimationEffect,
        viewOrScrollTimeline: {
          axis: Protocol.DOM.ScrollOrientation.Vertical,
          sourceNodeId: 42 as Protocol.DOM.BackendNodeId,
          startOffset: 42,
          endOffset: 142,
        },
      });

      await waitForPreviewsManualPromise.wait();
    });

    it('should disable global controls after a scroll driven animation is selected', async () => {
      const preview = view.element.shadowRoot!.querySelector('.animation-buffer-preview') as HTMLElement;
      preview.click();
      await waitForAnimationGroupSelectedPromise.wait();

      const playbackRateButtons = [...view.element.shadowRoot!.querySelectorAll('.animation-playback-rate-button')!];
      assert.isTrue(
          playbackRateButtons.every(button => button.getAttribute('disabled')),
          'All the playback rate buttons are disabled');

      const timelineToolbar = view.element.shadowRoot!.querySelector('.animation-timeline-toolbar')!;
      const pauseAllButton = timelineToolbar.shadowRoot!.querySelector('[aria-label=\'Pause all\']');
      assert.exists(pauseAllButton?.getAttribute('disabled'), 'Pause all button is disabled');

      const controlsToolbar = view.element.shadowRoot!.querySelector('.animation-controls-toolbar')!;
      const replayButton = controlsToolbar.shadowRoot!.querySelector('[aria-label=\'Replay timeline\']');
      assert.exists(replayButton?.getAttribute('disabled'), 'Replay button is disabled');
    });

    it('should show current time text in pixels', async () => {
      const preview = view.element.shadowRoot!.querySelector('.animation-buffer-preview') as HTMLElement;
      preview.click();
      await waitForAnimationGroupSelectedPromise.wait();

      const currentTimeElement = view.element.shadowRoot!.querySelector('.animation-timeline-current-time')!;
      assert.isTrue(currentTimeElement.textContent?.includes('px'));
    });

    it('should show timeline grid values in pixels', async () => {
      const preview = view.element.shadowRoot!.querySelector('.animation-buffer-preview') as HTMLElement;
      preview.click();
      await waitForAnimationGroupSelectedPromise.wait();

      const labelElements = [...view.element.shadowRoot!.querySelectorAll('.animation-timeline-grid-label')!];
      assert.isTrue(
          labelElements.every(el => el.textContent?.includes('px')),
          'Label is expected to be a pixel value but it is not');
    });

    // Failing on the toolbar button CL together with some ApplicationSidebarPanel tests
    describe.skip('[crbug.com/354673294] animationGroupUpdated', () => {
      it('should re-draw preview after receiving animationGroupUpdated', async () => {
        const preview = view.element.shadowRoot!.querySelector('.animation-buffer-preview') as HTMLElement;
        preview.click();
        await waitForAnimationGroupSelectedPromise.wait();
        const initialPreviewLine = preview.querySelector('line');
        assert.isNotNull(initialPreviewLine);
        const initialPreviewLineLength = Number.parseInt(initialPreviewLine.getAttribute('x2')!, 10) -
            Number.parseInt(initialPreviewLine.getAttribute('x1')!, 10);

        void animationModel.animationUpdated({
          ...SDA_ANIMATION_PAYLOAD,
          source: {
            ...SDA_ANIMATION_PAYLOAD.source,
            duration: 50,
          },
        });
        await waitForScheduleRedrawAfterAnimationGroupUpdated.wait();

        const currentPreviewLine = preview.querySelector('line');
        assert.isNotNull(currentPreviewLine);
        const currentPreviewLineLength = Number.parseInt(currentPreviewLine.getAttribute('x2')!, 10) -
            Number.parseInt(currentPreviewLine.getAttribute('x1')!, 10);
        assert.isTrue(currentPreviewLineLength < initialPreviewLineLength);
      });

      it('should update duration if the scroll range is changed on animationGroupUpdated', async () => {
        const SCROLL_RANGE = 20;
        const preview = view.element.shadowRoot!.querySelector('.animation-buffer-preview') as HTMLElement;
        preview.click();
        await waitForAnimationGroupSelectedPromise.wait();

        stubbedAnimationDOMNode.verticalScrollRange.resolves(SCROLL_RANGE);
        void animationModel.animationUpdated(SDA_ANIMATION_PAYLOAD);

        await waitForScheduleRedrawAfterAnimationGroupUpdated.wait();
        assert.strictEqual(view.duration(), SCROLL_RANGE);
      });

      it('should update current time text if the scroll top is changed on animationGroupUpdated', async () => {
        const SCROLL_TOP = 5;
        stubbedAnimationDOMNode.scrollTop.resolves(SCROLL_TOP);
        const preview = view.element.shadowRoot!.querySelector('.animation-buffer-preview') as HTMLElement;
        const currentTimeElement = view.element.shadowRoot!.querySelector('.animation-timeline-current-time');
        assert.isNotNull(currentTimeElement);
        assert.isNotNull(preview);

        preview.click();
        await waitForAnimationGroupSelectedPromise.wait();
        void animationModel.animationUpdated(SDA_ANIMATION_PAYLOAD);

        await waitForScheduleRedrawAfterAnimationGroupUpdated.wait();
        assert.strictEqual(currentTimeElement.textContent, '5px');
      });

      it('should update scrubber position if the scroll top is changed on animationGroupUpdated', async () => {
        const SCROLL_TOP = 5;
        stubbedAnimationDOMNode.scrollTop.resolves(SCROLL_TOP);
        const preview = view.element.shadowRoot!.querySelector('.animation-buffer-preview') as HTMLElement;
        const timelineScrubberElement = view.element.shadowRoot!.querySelector('.animation-scrubber') as HTMLElement;
        preview.click();
        await waitForAnimationGroupSelectedPromise.wait();

        void animationModel.animationUpdated(SDA_ANIMATION_PAYLOAD);

        await waitForScheduleRedrawAfterAnimationGroupUpdated.wait();
        const translateX = Number.parseFloat(timelineScrubberElement.style.transform.match(/translateX\((.*)px\)/)![1]);
        assert.closeTo(translateX, SCROLL_TOP * view.pixelTimeRatio(), 0.5);
      });

      it('should schedule re-draw selected group after receiving animationGroupUpdated', async () => {
        const preview = view.element.shadowRoot!.querySelector('.animation-buffer-preview') as HTMLElement;
        preview.click();
        await waitForAnimationGroupSelectedPromise.wait();

        void animationModel.animationUpdated(SDA_ANIMATION_PAYLOAD);

        await waitForScheduleRedrawAfterAnimationGroupUpdated.wait();
      });
    });
  });
});
