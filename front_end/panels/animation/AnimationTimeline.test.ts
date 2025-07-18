// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {
  createTarget,
  stubNoopSettings,
} from '../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../testing/ExpectStubCall.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {createViewFunctionStub, type ViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
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

interface AnimationDOMNodeStubs {
  verticalScrollRange: sinon.SinonStub;
  horizontalScrollRange: sinon.SinonStub;
  scrollLeft: sinon.SinonStub;
  scrollTop: sinon.SinonStub;
  addScrollEventListener: sinon.SinonStub;
  removeScrollEventListener: sinon.SinonStub;
}
class ManualPromise {
  #waitPromise: Promise<void>;
  #resolveFn: () => void;
  constructor() {
    const {resolve, promise} = Promise.withResolvers<void>();

    this.#waitPromise = promise;
    this.#resolveFn = resolve;
  }

  resolve() {
    this.#resolveFn();
    const {resolve, promise} = Promise.withResolvers<void>();

    this.#waitPromise = promise;
    this.#resolveFn = resolve;
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

const waitFor = async(selector: string, root?: Element|ShadowRoot): Promise<Element|null> => {
  let element = null;
  while (!element) {
    element = root ? root.querySelector(selector) : document.querySelector(selector);
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  return element;
};

const waitForAll = async(selector: string, root?: Element|ShadowRoot): Promise<NodeListOf<Element>|null> => {
  let elements = root ? root.querySelectorAll(selector) : document.querySelectorAll(selector);
  let tryCount = 0;
  while (!elements || tryCount < 50) {
    await new Promise(resolve => setTimeout(resolve, 10));
    elements = root ? root.querySelectorAll(selector) : document.querySelectorAll(selector);
    tryCount++;
  }
  return elements || null;
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
    renderElementIntoDOM(view);
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
    const preview = await waitForAll('.animation-buffer-preview', previewContainer) as NodeListOf<HTMLElement>;
    assert.strictEqual(preview.length || 0, inScope ? 1 : 0);
  };

  it('updates UI on in scope animation group start', updatesUiOnEvent(true));
  it('does not update UI on out of scope animation group start', updatesUiOnEvent(false));

  describe('resizing time controls', () => {
    it('updates --timeline-controls-width and calls onResize', async () => {
      view = Animation.AnimationTimeline.AnimationTimeline.instance({forceNew: true});
      view.markAsRoot();
      renderElementIntoDOM(view);
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
      sinon.assert.calledOnce(onResizeStub);
    });
  });

  describe('Animation group nodes are removed', () => {
    const waitForPreviewsManualPromise = new ManualPromise();
    const waitForAnimationGroupSelectedPromise = new ManualPromise();

    let domModel: SDK.DOMModel.DOMModel;
    let animationModel: SDK.AnimationModel.AnimationModel;
    let contentDocument: SDK.DOMModel.DOMDocument;
    beforeEach(async () => {
      view = Animation.AnimationTimeline.AnimationTimeline.instance({forceNew: true});
      view.markAsRoot();
      renderElementIntoDOM(view);

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

    describe('when the animation group is already selected', () => {
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

        const preview = await waitFor('.animation-buffer-preview', view.element.shadowRoot!) as HTMLElement;
        preview.click();
        await waitForAnimationGroupSelectedPromise.wait();

        const gridHeader = view.element.shadowRoot!.querySelector('.animation-grid-header');
        assert.exists(gridHeader);
        assert.isTrue(gridHeader.classList.contains('scrubber-enabled'));

        const scrubber = view.element.shadowRoot!.querySelector('.animation-scrubber');
        assert.exists(scrubber);
        assert.isFalse(scrubber.classList.contains('hidden'));

        const controlButton =
            view.element.shadowRoot!.querySelector('.animation-controls-toolbar')?.querySelector('.toolbar-button') as
            HTMLButtonElement;
        assert.exists(controlButton);
        assert.isFalse(controlButton.disabled);

        const currentTime = view.element.shadowRoot!.querySelector('.animation-timeline-current-time');
        assert.exists(currentTime);

        domModel.dispatchEventToListeners(SDK.DOMModel.Events.NodeRemoved, {node: domNode, parent: contentDocument});
        assert.isFalse(gridHeader.classList.contains('scrubber-enabled'));
        assert.isTrue(scrubber.classList.contains('hidden'));
        assert.isTrue(controlButton.disabled);
        assert.strictEqual(currentTime.textContent, '');
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

        const preview = await waitFor('.animation-buffer-preview', view.element.shadowRoot!) as HTMLElement;
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

    describe('when the animation group is not selected and the nodes are removed', () => {
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

        const preview = await waitFor('.animation-buffer-preview', view.element.shadowRoot!) as HTMLElement;
        preview.click();
        await waitForAnimationGroupSelectedPromise.wait();

        const gridHeader = view.element.shadowRoot!.querySelector('.animation-grid-header');
        assert.exists(gridHeader);
        assert.isFalse(gridHeader.classList.contains('scrubber-enabled'));

        const scrubber = view.element.shadowRoot!.querySelector('.animation-scrubber');
        assert.exists(scrubber);
        assert.isTrue(scrubber.classList.contains('hidden'));

        const controlButton =
            view.element.shadowRoot!.querySelector('.animation-controls-toolbar')?.querySelector('.toolbar-button') as
            HTMLButtonElement;
        assert.exists(controlButton);
        assert.isTrue(controlButton.disabled);

        const currentTime = view.element.shadowRoot!.querySelector('.animation-timeline-current-time');
        assert.exists(currentTime);
        assert.strictEqual(currentTime.textContent, '');
      });
    });
  });

  describe('time animations', () => {
    const waitForPreviewsManualPromise = new ManualPromise();
    const waitForAnimationGroupSelectedPromise = new ManualPromise();
    const waitForScheduleRedrawAfterAnimationGroupUpdated = new ManualPromise();
    const waitForScrubberOnFinish = new ManualPromise();

    let domModel: SDK.DOMModel.DOMModel;
    let animationModel: SDK.AnimationModel.AnimationModel;
    let contentDocument: SDK.DOMModel.DOMDocument;
    beforeEach(async () => {
      view = Animation.AnimationTimeline.AnimationTimeline.instance({forceNew: true});
      view.markAsRoot();
      renderElementIntoDOM(view);

      sinon.stub(view, 'animationGroupSelectedForTest').callsFake(() => {
        waitForAnimationGroupSelectedPromise.resolve();
      });
      sinon.stub(view, 'previewsCreatedForTest').callsFake(() => {
        waitForPreviewsManualPromise.resolve();
      });
      sinon.stub(view, 'scheduledRedrawAfterAnimationGroupUpdatedForTest').callsFake(() => {
        waitForScheduleRedrawAfterAnimationGroupUpdated.resolve();
      });

      sinon.stub(view, 'scrubberOnFinishForTest').callsFake(() => {
        waitForScrubberOnFinish.resolve();
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

    describe('animationGroupUpdated', () => {
      it('should update duration on animationGroupUpdated', async () => {
        const preview = await waitFor('.animation-buffer-preview', view.element.shadowRoot!) as HTMLElement;
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
        await waitForScrubberOnFinish.wait();
      });

      it('should schedule re-draw on animationGroupUpdated', async () => {
        const preview = await waitFor('.animation-buffer-preview', view.element.shadowRoot!) as HTMLElement;
        assert.isNotNull(preview);
        preview.click();
        await waitForAnimationGroupSelectedPromise.wait();

        void animationModel.animationUpdated(TIME_ANIMATION_PAYLOAD);
        await waitForScheduleRedrawAfterAnimationGroupUpdated.wait();
        await waitForScrubberOnFinish.wait();
      });
    });
  });

  describe('scroll driven animations', () => {
    let stubbedAnimationDOMNode: AnimationDOMNodeStubs;
    const waitForPreviewsManualPromise = new ManualPromise();
    const waitForAnimationGroupSelectedPromise = new ManualPromise();
    const waitForScheduleRedrawAfterAnimationGroupUpdated = new ManualPromise();

    let toolbarViewStub: ViewFunctionStub<typeof Animation.AnimationTimeline.AnimationTimeline>;
    let domModel: SDK.DOMModel.DOMModel;
    let animationModel: SDK.AnimationModel.AnimationModel;
    let contentDocument: SDK.DOMModel.DOMDocument;
    beforeEach(async () => {
      stubbedAnimationDOMNode = stubAnimationDOMNode();
      stubAnimationGroup();

      toolbarViewStub = createViewFunctionStub(Animation.AnimationTimeline.AnimationTimeline);
      view = new Animation.AnimationTimeline.AnimationTimeline(toolbarViewStub);
      view.markAsRoot();
      renderElementIntoDOM(view);

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
      const preview = await waitFor('.animation-buffer-preview', view.element.shadowRoot!) as HTMLElement;
      preview.click();

      const toolbarViewInput = await toolbarViewStub.nextInput;

      assert.isTrue(toolbarViewInput.playbackRateButtonsDisabled);
      cancelAllPendingRaf();
    });

    it('should show current time text in pixels', async () => {
      const preview = await waitFor('.animation-buffer-preview', view.element.shadowRoot!) as HTMLElement;
      preview.click();
      await waitForAnimationGroupSelectedPromise.wait();

      const currentTimeElement = view.element.shadowRoot!.querySelector('.animation-timeline-current-time')!;
      assert.isTrue(currentTimeElement.textContent?.includes('px'));
    });

    it('should show timeline grid values in pixels', async () => {
      const preview = await waitFor('.animation-buffer-preview', view.element.shadowRoot!) as HTMLElement;
      preview.click();
      await waitForAnimationGroupSelectedPromise.wait();

      const labelElements = [...view.element.shadowRoot!.querySelectorAll('.animation-timeline-grid-label')];
      assert.isTrue(
          labelElements.every(el => el.textContent?.includes('px')),
          'Label is expected to be a pixel value but it is not');
    });

    describe('animationGroupUpdated', () => {
      it('should re-draw preview after receiving animationGroupUpdated', async () => {
        const preview = await waitFor('.animation-buffer-preview', view.element.shadowRoot!) as HTMLElement;
        preview.click();
        await waitForAnimationGroupSelectedPromise.wait();
        const initialPreviewLine = preview.querySelector('line');
        const s = new XMLSerializer();
        const initialLine = s.serializeToString(initialPreviewLine!);
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

        let currentPreviewLine = preview.querySelector('line');
        while (initialLine === s.serializeToString(currentPreviewLine!)) {
          await new Promise(resolve => setTimeout(resolve, 10));
          currentPreviewLine = preview.querySelector('line');
        }
        assert.isNotNull(currentPreviewLine);
        const currentPreviewLineLength = Number.parseInt(currentPreviewLine.getAttribute('x2')!, 10) -
            Number.parseInt(currentPreviewLine.getAttribute('x1')!, 10);
        assert.isTrue(currentPreviewLineLength < initialPreviewLineLength);
      });

      it('should update duration if the scroll range is changed on animationGroupUpdated', async () => {
        const SCROLL_RANGE = 20;
        const preview = await waitFor('.animation-buffer-preview', view.element.shadowRoot!) as HTMLElement;
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
        const preview = await waitFor('.animation-buffer-preview', view.element.shadowRoot!) as HTMLElement;
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
        const preview = await waitFor('.animation-buffer-preview', view.element.shadowRoot!) as HTMLElement;
        const timelineScrubberElement = view.element.shadowRoot!.querySelector('.animation-scrubber') as HTMLElement;
        preview.click();
        await waitForAnimationGroupSelectedPromise.wait();

        void animationModel.animationUpdated(SDA_ANIMATION_PAYLOAD);

        await waitForScheduleRedrawAfterAnimationGroupUpdated.wait();
        const translateX = Number.parseFloat(timelineScrubberElement.style.transform.match(/translateX\((.*)px\)/)![1]);
        assert.closeTo(translateX, SCROLL_TOP * view.pixelTimeRatio(), 0.5);
      });

      it('should schedule re-draw selected group after receiving animationGroupUpdated', async () => {
        const preview = await waitFor('.animation-buffer-preview', view.element.shadowRoot!) as HTMLElement;
        preview.click();
        await waitForAnimationGroupSelectedPromise.wait();

        void animationModel.animationUpdated(SDA_ANIMATION_PAYLOAD);

        await waitForScheduleRedrawAfterAnimationGroupUpdated.wait();
      });
    });
  });
});

describeWithMockConnection('AnimationTimeline', () => {
  it('shows placeholder showing that the panel is waiting for animations', async () => {
    const view = Animation.AnimationTimeline.AnimationTimeline.instance({forceNew: true});
    const placeholder = await waitFor('.animation-timeline-buffer-hint', view.element.shadowRoot!) as HTMLElement;
    assert.exists(placeholder);

    // Render into document in order to see the computed styles.
    view.markAsRoot();
    renderElementIntoDOM(view);
    assert.deepEqual(window.getComputedStyle(placeholder).display, 'flex');

    assert.deepEqual(placeholder.querySelector('.empty-state-header')?.textContent, 'Currently waiting for animations');
    assert.deepEqual(
        placeholder.querySelector('.empty-state-description span')?.textContent,
        'On this page you can inspect and modify animations.');

    view.detach();
  });

  it('shows placeholder if no animation has been selected', async () => {
    const target = createTarget();
    const model = target.model(SDK.AnimationModel.AnimationModel);
    assert.exists(model);

    const dummyGroups = new Map<string, SDK.AnimationModel.AnimationGroup>();
    sinon.stub(model, 'animationGroups').value(dummyGroups);
    dummyGroups.set('dummy', new SDK.AnimationModel.AnimationGroup(model, 'dummy', []));

    // Render into document in order to update the shown empty state.
    const view = Animation.AnimationTimeline.AnimationTimeline.instance({forceNew: true});
    view.markAsRoot();
    renderElementIntoDOM(view);

    const previewUpdatePromise = new ManualPromise();
    sinon.stub(view, 'previewsCreatedForTest').callsFake(() => {
      previewUpdatePromise.resolve();
    });

    await previewUpdatePromise.wait();
    const placeholder = view.contentElement.querySelector('.animation-timeline-rows-hint');
    assert.exists(placeholder);

    assert.deepEqual(window.getComputedStyle(placeholder).display, 'flex');
    assert.deepEqual(placeholder.querySelector('.empty-state-header')?.textContent, 'No animation effect selected');
    assert.deepEqual(
        placeholder.querySelector('.empty-state-description span')?.textContent,
        'Select an effect above to inspect and modify');

    view.detach();
  });
});
