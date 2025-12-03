// Copyright 2013 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import layerDetailsViewStyles from './layerDetailsView.css.js';
import {
  type LayerView,
  type LayerViewHost,
  ScrollRectSelection,
  type Selection,
  type SnapshotSelection,
  Type,
} from './LayerViewHost.js';

const {html, nothing} = Lit;

const UIStrings = {
  /**
   * @description Text in Layer Details View of the Layers panel
   */
  selectALayerToSeeItsDetails: 'Select a layer to see its details',
  /**
   * @description Text in Layer Details View of the Layers panel if no layer is selected for viewing its content
   */
  noLayerSelected: 'No layer selected',
  /**
   * @description Element text content in Layer Details View of the Layers panel
   * @example {Touch event handler} PH1
   * @example {10} PH2
   * @example {10} PH3
   * @example {10} PH4
   * @example {10} PH5
   */
  scrollRectangleDimensions: '{PH1} {PH2} × {PH3} (at {PH4}, {PH5})',
  /**
   * @description Text in Layer Details View of the Layers panel. Used to indicate that a particular
   * layer of the website is unnamed (was not given a name/doesn't have one).
   */
  unnamed: '<unnamed>',
  /**
   * @description Text in Layer Details View of the Layers panel
   * @example {Nearest Layer Shifting Sticky Box} PH1
   * @example {&lt;unnamed&gt;} PH2
   * @example {5} PH3
   */
  stickyAncestorLayersS: '{PH1}: {PH2} ({PH3})',
  /**
   * @description Sticky box rect element text content in Layer Details View of the Layers panel
   * @example {10} PH1
   * @example {10} PH2
   * @example {10} PH3
   * @example {10} PH4
   */
  stickyBoxRectangleDimensions: 'Sticky Box {PH1} × {PH2} (at {PH3}, {PH4})',
  /**
   * @description Containing block rect element text content in Layer Details View of the Layers panel.
   * The placeholder are width, height, x position, and y position respectively.
   * @example {10} PH1
   * @example {10} PH2
   * @example {10} PH3
   * @example {10} PH4
   */
  containingBlocRectangleDimensions: 'Containing Block {PH1} × {PH2} (at {PH3}, {PH4})',
  /**
   * @description Text in Layer Details View of the Layers panel. This also means "The nearest sticky
   * box that causes a layer shift".
   */
  nearestLayerShiftingStickyBox: 'Nearest Layer Shifting Sticky Box',
  /**
   * @description Text in Layer Details View of the Layers panel. This also means "The nearest block
   * that causes a layer shift".
   */
  nearestLayerShiftingContaining: 'Nearest Layer Shifting Containing Block',
  /**
   * @description Size cell text content in Layer Details View of the Layers panel
   * @example {10} PH1
   * @example {10} PH2
   * @example {10} PH3
   * @example {10} PH4
   */
  updateRectangleDimensions: '{PH1} × {PH2} (at {PH3}, {PH4})',
  /**
   * @description Text for the size of something
   */
  size: 'Size',
  /**
   * @description Text in Layer Details View of the Layers panel
   */
  compositingReasons: 'Compositing Reasons',
  /**
   * @description Text in Layer Details View of the Layers panel
   */
  memoryEstimate: 'Memory estimate',
  /**
   * @description Text in Layer Details View of the Layers panel
   */
  paintCount: 'Paint count',
  /**
   * @description Text in Layer Details View of the Layers panel
   */
  slowScrollRegions: 'Slow scroll regions',
  /**
   * @description Text in Layer Details View of the Layers panel
   */
  stickyPositionConstraint: 'Sticky position constraint',
  /**
   * @description Title of the paint profiler, old name of the performance pane
   */
  paintProfiler: 'Paint Profiler',
  /**
   * @description Text in Layer Details View of the Layers panel
   */
  nonFastScrollable: 'Non fast scrollable',
  /**
   * @description Text in Layer Details View of the Layers panel
   */
  touchEventHandler: 'Touch event handler',
  /**
   * @description Text in Layer Details View of the Layers panel
   */
  wheelEventHandler: 'Wheel event handler',
  /**
   * @description Text in Layer Details View of the Layers panel. Means that this rectangle needs to
   * be repainted when the webpage is scrolled. 'repaints' means that the browser engine needs to
   * draw the pixels for this rectangle to the user's monitor again.
   */
  repaintsOnScroll: 'Repaints on scroll',
  /**
   * @description Text in Layer Details View of the Layers panel
   */
  mainThreadScrollingReason: 'Main thread scrolling reason',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/layer_viewer/LayerDetailsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

export interface ViewInput {
  layer: SDK.LayerTreeBase.Layer|null;
  snapshotSelection: SnapshotSelection|null;
  compositingReasons: string[];
  onScrollRectClick: (index: number, event: Event) => void;
  onPaintProfilerRequested: () => void;
}

export type ViewOutput = undefined;

export const DEFAULT_VIEW = (input: ViewInput, _output: ViewOutput, target: HTMLElement): void => {
  const {layer, snapshotSelection, compositingReasons, onScrollRectClick, onPaintProfilerRequested} = input;

  if (!layer) {
    // clang-format off
    Lit.render(html`<div class="layer-details-container">
      <devtools-widget class="learn-more" .widgetConfig=${UI.Widget.widgetConfig(UI.EmptyWidget.EmptyWidget, {
        header: i18nString(UIStrings.noLayerSelected),
        text: i18nString(UIStrings.selectALayerToSeeItsDetails)})}>
      </devtools-widget>
    </div>`, target);
    // clang-format on
    return;
  }

  const slowScrollRects = layer.scrollRects();
  const stickyPositionConstraint = layer.stickyPositionConstraint();

  const formatStickyAncestorLayer = (title: string, layer: SDK.LayerTreeBase.Layer|null): string => {
    if (!layer) {
      return '';
    }
    const node = layer.nodeForSelfOrAncestor();
    const name = node ? node.simpleSelector() : i18nString(UIStrings.unnamed);
    return i18nString(UIStrings.stickyAncestorLayersS, {PH1: title, PH2: name, PH3: layer.id()});
  };

  const renderStickyPositionConstraint = (constraint: SDK.LayerTreeBase.StickyPositionConstraint|null): Lit.LitTemplate|
                                         typeof nothing => {
    if (!constraint) {
      return nothing;
    }
    const stickyBoxRect = constraint.stickyBoxRect();
    const containingBlockRect = constraint.containingBlockRect();
    const nearestLayerShiftingStickyBox = constraint.nearestLayerShiftingStickyBox();
    const nearestLayerShiftingContainingBlock = constraint.nearestLayerShiftingContainingBlock();

    // clang-format off
    return html`
      <span>${i18nString(
        UIStrings.stickyBoxRectangleDimensions,
        {PH1: stickyBoxRect.width, PH2: stickyBoxRect.height, PH3: stickyBoxRect.x, PH4: stickyBoxRect.y})}</span>
      <span>, </span>
      <span>${i18nString(UIStrings.containingBlocRectangleDimensions, {
        PH1: containingBlockRect.width,
        PH2: containingBlockRect.height,
        PH3: containingBlockRect.x,
        PH4: containingBlockRect.y,
      })}</span>
      ${nearestLayerShiftingStickyBox ? html`, <span>${
                                            formatStickyAncestorLayer(
                                                i18nString(UIStrings.nearestLayerShiftingStickyBox),
                                                nearestLayerShiftingStickyBox)}</span>` :
                                        nothing}
      ${nearestLayerShiftingContainingBlock ? html`, <span>${
                                                  formatStickyAncestorLayer(
                                                      i18nString(UIStrings.nearestLayerShiftingContaining),
                                                      nearestLayerShiftingContainingBlock)}</span>` :
                                              nothing}
    `;
    // clang-format on
  };

  // clang-format off
  Lit.render(
      html`
    <div class="layer-details-container">
      <table>
        <tbody>
          <tr>
            <td>${i18nString(UIStrings.size)}</td>
            <td>${i18nString(
              UIStrings.updateRectangleDimensions,
              {PH1: layer.width(), PH2: layer.height(), PH3: layer.offsetX(), PH4: layer.offsetY()})}</td>
          </tr>
          <tr>
            <td>${i18nString(UIStrings.compositingReasons)}</td>
            <td>
              ${!compositingReasons.length ? 'n/a' :
                                       html`<ul>${compositingReasons.map(reason => html`<li>${reason}</li>`)}</ul>`}
            </td>
          </tr>
          <tr>
            <td>${i18nString(UIStrings.memoryEstimate)}</td>
            <td>${i18n.ByteUtilities.bytesToString(layer.gpuMemoryUsage())}</td>
          </tr>
          <tr>
            <td>${i18nString(UIStrings.paintCount)}</td>
            <td>${layer.paintCount()}</td>
          </tr>
          <tr>
            <td>${i18nString(UIStrings.slowScrollRegions)}</td>
            <td>
              ${slowScrollRects.map((scrollRect, index) => html`
                ${index > 0 ? ', ' : ''}
                <span class="scroll-rect" @click=${(e: Event) => onScrollRectClick(index, e)}
                      jslog=${VisualLogging.action('layers.select-object').track({click: true})}>
                  ${i18nString(UIStrings.scrollRectangleDimensions, {
                    PH1: String(slowScrollRectNames.get(scrollRect.type as unknown as SDK.LayerTreeBase.Layer.ScrollRectType)?.()),
                    PH2: scrollRect.rect.width,
                    PH3: scrollRect.rect.height,
                    PH4: scrollRect.rect.x,
                    PH5: scrollRect.rect.y,
                  })}
                </span>`)}
            </td>
          </tr>
          <tr>
            <td>${i18nString(UIStrings.stickyPositionConstraint)}</td>
            <td>${renderStickyPositionConstraint(stickyPositionConstraint)}</td>
          </tr>
        </tbody>
      </table>
      ${snapshotSelection ? html`
      <button class="devtools-link link-margin text-button link-style"
              @click=${onPaintProfilerRequested}
              jslog=${VisualLogging.action('layers.paint-profiler').track({click: true, keydown: 'Enter'})}>
        ${i18nString(UIStrings.paintProfiler)}
      </button>` : nothing}
    </div>`,
      target);
  // clang-format on
};

export class LayerDetailsView extends Common.ObjectWrapper.eventMixin<EventTypes, typeof UI.Widget.Widget>(
    UI.Widget.Widget) implements LayerView {
  private readonly layerViewHost: LayerViewHost;
  private layerSnapshotMap: Map<SDK.LayerTreeBase.Layer, SnapshotSelection>;
  private selection: Selection|null;
  private compositingReasons: string[] = [];
  private readonly view: typeof DEFAULT_VIEW;

  constructor(layerViewHost: LayerViewHost, view: typeof DEFAULT_VIEW = DEFAULT_VIEW) {
    super({
      jslog: `${VisualLogging.pane('layers-details')}`,
      useShadowDom: true,
    });
    this.view = view;
    this.registerRequiredCSS(layerDetailsViewStyles);
    this.layerViewHost = layerViewHost;
    this.layerViewHost.registerView(this);
    this.layerSnapshotMap = this.layerViewHost.getLayerSnapshotMap();
    this.selection = null;
  }

  hoverObject(_selection: Selection|null): void {
  }

  selectObject(selection: Selection|null): void {
    this.selection = selection;
    if (this.isShowing()) {
      this.update();
    }
  }

  setLayerTree(_layerTree: SDK.LayerTreeBase.LayerTreeBase|null): void {
  }

  override wasShown(): void {
    super.wasShown();
    this.update();
  }

  private onScrollRectClicked(index: number, event: Event): void {
    if ((event as KeyboardEvent).which !== 1) {
      return;
    }
    if (!this.selection) {
      return;
    }
    this.layerViewHost.selectObject(new ScrollRectSelection(this.selection.layer(), index));
  }

  private invokeProfilerLink(): void {
    if (!this.selection) {
      return;
    }
    const snapshotSelection =
        this.selection.type() === Type.SNAPSHOT ? this.selection : this.layerSnapshotMap.get(this.selection.layer());
    if (snapshotSelection) {
      this.dispatchEventToListeners(Events.PAINT_PROFILER_REQUESTED, snapshotSelection);
    }
  }

  update(): void {
    const layer = this.selection?.layer();
    if (layer) {
      void layer.requestCompositingReasons().then(this.updateCompositingReasons.bind(this));
    } else {
      this.compositingReasons = [];
    }
    this.requestUpdate();
  }

  private updateCompositingReasons(compositingReasons: string[]): void {
    this.compositingReasons = compositingReasons;
    this.requestUpdate();
  }

  override performUpdate(): void {
    const layer = this.selection?.layer() || null;
    const snapshotSelection = (this.selection && this.selection.type() === Type.SNAPSHOT ?
                                   (this.selection as SnapshotSelection) :
                                   (layer ? this.layerSnapshotMap.get(layer) : null)) ||
        null;

    this.view(
        {
          layer,
          snapshotSelection,
          compositingReasons: this.compositingReasons,
          onScrollRectClick: this.onScrollRectClicked.bind(this),
          onPaintProfilerRequested: this.invokeProfilerLink.bind(this),
        },
        undefined, this.contentElement);
  }
}

export const enum Events {
  PAINT_PROFILER_REQUESTED = 'PaintProfilerRequested',
}

export interface EventTypes {
  [Events.PAINT_PROFILER_REQUESTED]: Selection;
}

export const slowScrollRectNames = new Map([
  [SDK.LayerTreeBase.Layer.ScrollRectType.NON_FAST_SCROLLABLE, i18nLazyString(UIStrings.nonFastScrollable)],
  [SDK.LayerTreeBase.Layer.ScrollRectType.TOUCH_EVENT_HANDLER, i18nLazyString(UIStrings.touchEventHandler)],
  [SDK.LayerTreeBase.Layer.ScrollRectType.WHEEL_EVENT_HANDLER, i18nLazyString(UIStrings.wheelEventHandler)],
  [SDK.LayerTreeBase.Layer.ScrollRectType.REPAINTS_ON_SCROLL, i18nLazyString(UIStrings.repaintsOnScroll)],
  [
    SDK.LayerTreeBase.Layer.ScrollRectType.MAIN_THREAD_SCROLL_REASON,
    i18nLazyString(UIStrings.mainThreadScrollingReason),
  ],
]);
