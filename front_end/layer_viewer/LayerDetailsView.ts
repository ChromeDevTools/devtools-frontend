/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/* eslint-disable rulesdir/no_underscored_properties */

import * as i18n from '../i18n/i18n.js';
import * as Platform from '../platform/platform.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import {LayerView, LayerViewHost, ScrollRectSelection, Selection, SnapshotSelection, Type} from './LayerViewHost.js';  // eslint-disable-line no-unused-vars

export const UIStrings = {
  /**
  *@description Text in Layer Details View of the Layers panel
  */
  selectALayerToSeeItsDetails: 'Select a layer to see its details',
  /**
  *@description Element text content in Layer Details View of the Layers panel
  *@example {Touch event handler} PH1
  *@example {10} PH2
  *@example {10} PH3
  *@example {10} PH4
  *@example {10} PH5
  */
  scrollRectangleDimensions: '{PH1} {PH2} × {PH3} (at {PH4}, {PH5})',
  /**
  *@description Text in Layer Details View of the Layers panel
  */
  unnamed: '<unnamed>',
  /**
  *@description Text in Layer Details View of the Layers panel
  *@example {Nearest Layer Shifting Sticky Box} PH1
  *@example {&lt;unnamed&gt;} PH2
  *@example {5} PH3
  */
  stickyAncenstorLayersS: '{PH1}: {PH2} ({PH3})',
  /**
  *@description Sticky box rect element text content in Layer Details View of the Layers panel
  *@example {10} PH1
  *@example {10} PH2
  *@example {10} PH3
  *@example {10} PH4
  */
  stickyBoxRectangleDimensions: 'Sticky Box {PH1} × {PH2} (at {PH3}, {PH4})',
  /**
  *@description Containing block rect element text content in Layer Details View of the Layers panel
  *@example {10} PH1
  *@example {10} PH2
  *@example {10} PH3
  *@example {10} PH4
  */
  containingBlocRectangleDimensions: 'Containing Block {PH1} × {PH2} (at {PH3}, {PH4})',
  /**
  *@description Text in Layer Details View of the Layers panel
  */
  nearestLayerShiftingStickyBox: 'Nearest Layer Shifting Sticky Box',
  /**
  *@description Text in Layer Details View of the Layers panel
  */
  nearestLayerShiftingContaining: 'Nearest Layer Shifting Containing Block',
  /**
  *@description Size cell text content in Layer Details View of the Layers panel
  *@example {10} PH1
  *@example {10} PH2
  *@example {10} PH3
  *@example {10} PH4
  */
  updateRectangleDimensions: '{PH1} × {PH2} (at {PH3},{PH4})',
  /**
  *@description Text for the size of something
  */
  size: 'Size',
  /**
  *@description Text in Layer Details View of the Layers panel
  */
  compositingReasons: 'Compositing Reasons',
  /**
  *@description Text in Layer Details View of the Layers panel
  */
  memoryEstimate: 'Memory estimate',
  /**
  *@description Text in Layer Details View of the Layers panel
  */
  paintCount: 'Paint count',
  /**
  *@description Text in Layer Details View of the Layers panel
  */
  slowScrollRegions: 'Slow scroll regions',
  /**
  *@description Text in Layer Details View of the Layers panel
  */
  stickyPositionConstraint: 'Sticky position constraint',
  /**
  *@description Title of the paint profiler, old name of the performance pane
  */
  paintProfiler: 'Paint Profiler',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  hasADTransform: 'Has a 3d transform.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  isAnAcceleratedVideo: 'Is an accelerated video.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  isAnAcceleratedCanvasOrIsA:
      'Is an accelerated canvas, or is a display list backed canvas that was promoted to a layer based on a performance heuristic.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  isAnAcceleratedPlugin: 'Is an accelerated plugin.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  isAnAcceleratedIframe: 'Is an accelerated iFrame.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  hasBackfacevisibilityHidden: 'Has backface-visibility: hidden.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  hasAnActiveAcceleratedTransform: 'Has an active accelerated transform animation or transition.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  hasAnActiveAcceleratedOpacity: 'Has an active accelerated opacity animation or transition.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  hasAnActiveAcceleratedFilter: 'Has an active accelerated filter animation or transition.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  hasAnActiveAcceleratedBackdrop: 'Has an active accelerated backdrop filter animation or transition.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  isDomOverlayForWebxrImmersivear: 'Is DOM overlay for WebXR immersive-ar mode.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  isFixedOrStickyPosition: 'Is fixed or sticky position.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  isAScrollableOverflowElement: 'Is a scrollable overflow element.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  scrollParentIsNotAnAncestor: 'Scroll parent is not an ancestor.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  hasClippingAncestor: 'Has clipping ancestor.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  isOverlayControlsForVideo: 'Is overlay controls for video.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  hasAWillchangeTransform: 'Has a will-change: transform compositing hint.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  hasAWillchangeOpacityCompositing: 'Has a will-change: opacity compositing hint.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  hasAWillchangeCompositingHint: 'Has a will-change compositing hint other than transform and opacity.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  hasABackdropFilter: 'Has a backdrop filter.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  isTheDocumentrootscroller: 'Is the document.rootScroller.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  mightOverlapOtherComposited: 'Might overlap other composited content.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  overlapsOtherCompositedContent: 'Overlaps other composited content.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  parentWithCompositedNegative: 'Parent with composited negative z-index content.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  layerWasSeparatelyComposited: 'Layer was separately composited because it could not be squashed.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  hasOpacityThatNeedsToBeAppliedBy:
      'Has opacity that needs to be applied by compositor because of composited descendants.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  hasAMaskThatNeedsToBeKnownBy: 'Has a mask that needs to be known by compositor because of composited descendants.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  hasAReflectionThatNeedsToBeKnown:
      'Has a reflection that needs to be known by compositor because of composited descendants.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  hasAFilterEffectThatNeedsToBe:
      'Has a filter effect that needs to be known by compositor because of composited descendants.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  hasABlendingEffectThatNeedsToBe:
      'Has a blending effect that needs to be known by compositor because of composited descendants.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  hasAClipThatNeedsToBeKnownBy: 'Has a clip that needs to be known by compositor because of composited descendants.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  hasAPerspectiveTransformThat:
      'Has a perspective transform that needs to be known by compositor because of 3d descendants.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  hasAPreservesdPropertyThatNeeds:
      'Has a preserves-3d property that needs to be known by compositor because of 3d descendants.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  shouldIsolateDescendantsToApplyA: 'Should isolate descendants to apply a blend effect.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  isAPositionfixedElementWith: 'Is a position:fixed element with composited descendants.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  isTheRootLayer: 'Is the root layer.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  secondaryLayerTheHorizontal: 'Secondary layer, the horizontal scrollbar layer.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  secondaryLayerTheVertical: 'Secondary layer, the vertical scrollbar layer.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  secondaryLayerTheOverflow: 'Secondary layer, the overflow controls host layer.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  secondaryLayerTheScrollCorner: 'Secondary layer, the scroll corner layer.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  secondaryLayerToHouseContents: 'Secondary layer, to house contents that can be scrolled.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  secondaryLayerUsedToPositionThe: 'Secondary layer, used to position the scrolling contents while scrolling.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  secondaryLayerHomeForAGroupOf: 'Secondary layer, home for a group of squashable content.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  secondaryLayerNoopLayerToPlace:
      'Secondary layer, no-op layer to place the squashing layer correctly in the composited layer tree.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  secondaryLayerToContainAnyNormal:
      'Secondary layer, to contain any normal flow and positive z-index contents on top of a negative z-index layer.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  secondaryLayerToContainTheMask: 'Secondary layer, to contain the mask contents.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  layerPaintedOnTopOfOtherLayersAs: 'Layer painted on top of other layers as decoration.',
  /**
  *@description Compositing reason description displayed in the Layer Details View of the Layers panel
  */
  layerForLinkHighlightFrame: 'Layer for link highlight, frame overlay, etc.',
  /**
  *@description Text in Layer Details View of the Layers panel
  */
  nonFastScrollable: 'Non fast scrollable',
  /**
  *@description Text in Layer Details View of the Layers panel
  */
  touchEventHandler: 'Touch event handler',
  /**
  *@description Text in Layer Details View of the Layers panel
  */
  wheelEventHandler: 'Wheel event handler',
  /**
  *@description Text in Layer Details View of the Layers panel
  */
  repaintsOnScroll: 'Repaints on scroll',
  /**
  *@description Text in Layer Details View of the Layers panel
  */
  mainThreadScrollingReason: 'Main thread scrolling reason',
};
const str_ = i18n.i18n.registerUIStrings('layer_viewer/LayerDetailsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class LayerDetailsView extends UI.Widget.Widget implements LayerView {
  _layerViewHost: LayerViewHost;
  _emptyWidget: UI.EmptyWidget.EmptyWidget;
  _layerSnapshotMap: Map<SDK.LayerTreeBase.Layer, SnapshotSelection>;
  _tableElement!: HTMLElement;
  _tbodyElement!: HTMLElement;
  _sizeCell!: HTMLElement;
  _compositingReasonsCell!: HTMLElement;
  _memoryEstimateCell!: HTMLElement;
  _paintCountCell!: HTMLElement;
  _scrollRectsCell!: HTMLElement;
  _stickyPositionConstraintCell!: HTMLElement;
  _paintProfilerLink!: HTMLElement;
  _selection: Selection|null;

  constructor(layerViewHost: LayerViewHost) {
    super(true);
    this.registerRequiredCSS('layer_viewer/layerDetailsView.css', {enableLegacyPatching: true});
    this._layerViewHost = layerViewHost;
    this._layerViewHost.registerView(this);
    this._emptyWidget = new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.selectALayerToSeeItsDetails));
    this._layerSnapshotMap = this._layerViewHost.getLayerSnapshotMap();

    this._buildContent();
    this._selection = null;
  }

  hoverObject(_selection: Selection|null): void {
  }

  selectObject(selection: Selection|null): void {
    this._selection = selection;
    if (this.isShowing()) {
      this.update();
    }
  }

  setLayerTree(_layerTree: SDK.LayerTreeBase.LayerTreeBase|null): void {
  }

  wasShown(): void {
    super.wasShown();
    this.update();
  }

  _onScrollRectClicked(index: number, event: Event): void {
    if ((event as KeyboardEvent).which !== 1) {
      return;
    }
    if (!this._selection) {
      return;
    }
    this._layerViewHost.selectObject(new ScrollRectSelection(this._selection.layer(), index));
  }

  _invokeProfilerLink(): void {
    if (!this._selection) {
      return;
    }
    const snapshotSelection = this._selection.type() === Type.Snapshot ?
        this._selection :
        this._layerSnapshotMap.get(this._selection.layer());
    if (snapshotSelection) {
      this.dispatchEventToListeners(Events.PaintProfilerRequested, snapshotSelection);
    }
  }

  _createScrollRectElement(scrollRect: Protocol.LayerTree.ScrollRect, index: number): void {
    if (index) {
      UI.UIUtils.createTextChild(this._scrollRectsCell, ', ');
    }
    const element = this._scrollRectsCell.createChild('span', 'scroll-rect');
    if (this._selection && (this._selection as ScrollRectSelection).scrollRectIndex === index) {
      element.classList.add('active');
    }
    element.textContent = i18nString(UIStrings.scrollRectangleDimensions, {
      PH1: slowScrollRectNames.get(scrollRect.type),
      PH2: scrollRect.rect.width,
      PH3: scrollRect.rect.height,
      PH4: scrollRect.rect.x,
      PH5: scrollRect.rect.y,
    });
    element.addEventListener('click', this._onScrollRectClicked.bind(this, index), false);
  }

  _formatStickyAncestorLayer(title: string, layer: SDK.LayerTreeBase.Layer|null): string {
    if (!layer) {
      return '';
    }

    const node = layer.nodeForSelfOrAncestor();
    const name = node ? node.simpleSelector() : i18nString(UIStrings.unnamed);
    return i18nString(UIStrings.stickyAncenstorLayersS, {PH1: title, PH2: name, PH3: layer.id()});
  }

  _createStickyAncestorChild(title: string, layer: SDK.LayerTreeBase.Layer|null): void {
    if (!layer) {
      return;
    }

    UI.UIUtils.createTextChild(this._stickyPositionConstraintCell, ', ');
    const child = this._stickyPositionConstraintCell.createChild('span');
    child.textContent = this._formatStickyAncestorLayer(title, layer);
  }

  _populateStickyPositionConstraintCell(constraint: SDK.LayerTreeBase.StickyPositionConstraint|null): void {
    this._stickyPositionConstraintCell.removeChildren();
    if (!constraint) {
      return;
    }

    const stickyBoxRect = constraint.stickyBoxRect();
    const stickyBoxRectElement = this._stickyPositionConstraintCell.createChild('span');
    stickyBoxRectElement.textContent = i18nString(
        UIStrings.stickyBoxRectangleDimensions,
        {PH1: stickyBoxRect.width, PH2: stickyBoxRect.height, PH3: stickyBoxRect.x, PH4: stickyBoxRect.y});

    UI.UIUtils.createTextChild(this._stickyPositionConstraintCell, ', ');

    const containingBlockRect = constraint.containingBlockRect();
    const containingBlockRectElement = this._stickyPositionConstraintCell.createChild('span');
    containingBlockRectElement.textContent = i18nString(UIStrings.containingBlocRectangleDimensions, {
      PH1: containingBlockRect.width,
      PH2: containingBlockRect.height,
      PH3: containingBlockRect.x,
      PH4: containingBlockRect.y,
    });

    this._createStickyAncestorChild(
        i18nString(UIStrings.nearestLayerShiftingStickyBox), constraint.nearestLayerShiftingStickyBox());
    this._createStickyAncestorChild(
        i18nString(UIStrings.nearestLayerShiftingContaining), constraint.nearestLayerShiftingContainingBlock());
  }

  update(): void {
    const layer = this._selection && this._selection.layer();
    if (!layer) {
      this._tableElement.remove();
      this._paintProfilerLink.remove();
      this._emptyWidget.show(this.contentElement);
      return;
    }
    this._emptyWidget.detach();
    this.contentElement.appendChild(this._tableElement);
    this.contentElement.appendChild(this._paintProfilerLink);
    this._sizeCell.textContent = i18nString(
        UIStrings.updateRectangleDimensions,
        {PH1: layer.width(), PH2: layer.height(), PH3: layer.offsetX(), PH4: layer.offsetY()});
    if (this._paintCountCell.parentElement) {
      this._paintCountCell.parentElement.classList.toggle('hidden', !layer.paintCount());
    }
    this._paintCountCell.textContent = String(layer.paintCount());
    this._memoryEstimateCell.textContent = Platform.NumberUtilities.bytesToString(layer.gpuMemoryUsage());
    layer.requestCompositingReasonIds().then(this._updateCompositingReasons.bind(this));
    this._scrollRectsCell.removeChildren();
    layer.scrollRects().forEach(this._createScrollRectElement.bind(this));
    this._populateStickyPositionConstraintCell(layer.stickyPositionConstraint());
    const snapshot = this._selection && this._selection.type() === Type.Snapshot ?
        (this._selection as SnapshotSelection).snapshot() :
        null;

    this._paintProfilerLink.classList.toggle('hidden', !(this._layerSnapshotMap.has(layer) || snapshot));
  }

  _buildContent(): void {
    this._tableElement = this.contentElement.createChild('table') as HTMLElement;
    this._tbodyElement = this._tableElement.createChild('tbody') as HTMLElement;
    this._sizeCell = this._createRow(i18nString(UIStrings.size));
    this._compositingReasonsCell = this._createRow(i18nString(UIStrings.compositingReasons));
    this._memoryEstimateCell = this._createRow(i18nString(UIStrings.memoryEstimate));
    this._paintCountCell = this._createRow(i18nString(UIStrings.paintCount));
    this._scrollRectsCell = this._createRow(i18nString(UIStrings.slowScrollRegions));
    this._stickyPositionConstraintCell = this._createRow(i18nString(UIStrings.stickyPositionConstraint));
    this._paintProfilerLink =
        this.contentElement.createChild('span', 'hidden devtools-link link-margin') as HTMLElement;
    UI.ARIAUtils.markAsLink(this._paintProfilerLink);
    this._paintProfilerLink.textContent = i18nString(UIStrings.paintProfiler);
    this._paintProfilerLink.tabIndex = 0;
    this._paintProfilerLink.addEventListener('click', e => {
      e.consume(true);
      this._invokeProfilerLink();
    });
    this._paintProfilerLink.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.consume();
        this._invokeProfilerLink();
      }
    });
  }

  _createRow(title: string): HTMLElement {
    const tr = this._tbodyElement.createChild('tr');
    const titleCell = tr.createChild('td');
    titleCell.textContent = title;
    return tr.createChild('td');
  }

  _updateCompositingReasons(compositingReasonIds: string[]): void {
    if (!compositingReasonIds || !compositingReasonIds.length) {
      this._compositingReasonsCell.textContent = 'n/a';
      return;
    }
    this._compositingReasonsCell.removeChildren();
    const list = this._compositingReasonsCell.createChild('ul');
    const compositingReasons = LayerDetailsView.getCompositingReasons(compositingReasonIds);
    for (const compositingReason of compositingReasons) {
      list.createChild('li').textContent = compositingReason;
    }
  }

  static getCompositingReasons(compositingReasonIds: string[]): Platform.UIString.LocalizedString[] {
    const compositingReasons = [];
    for (const compositingReasonId of compositingReasonIds) {
      const compositingReason = compositingReasonIdToReason.get(compositingReasonId);
      if (compositingReason) {
        compositingReasons.push(compositingReason);
      } else {
        console.error(`Compositing reason id '${compositingReasonId}' is not recognized.`);
      }
    }
    return compositingReasons;
  }
}

// The compositing reason IDs are defined in third_party/blink/renderer/platform/graphics/compositing_reasons.cc
const compositingReasonIdToReason = new Map([
  ['transform3D', i18nString(UIStrings.hasADTransform)],
  ['video', i18nString(UIStrings.isAnAcceleratedVideo)],
  ['canvas', i18nString(UIStrings.isAnAcceleratedCanvasOrIsA)],
  ['plugin', i18nString(UIStrings.isAnAcceleratedPlugin)],
  ['iFrame', i18nString(UIStrings.isAnAcceleratedIframe)],
  ['backfaceVisibilityHidden', i18nString(UIStrings.hasBackfacevisibilityHidden)],
  ['activeTransformAnimation', i18nString(UIStrings.hasAnActiveAcceleratedTransform)],
  ['activeOpacityAnimation', i18nString(UIStrings.hasAnActiveAcceleratedOpacity)],
  ['activeFilterAnimation', i18nString(UIStrings.hasAnActiveAcceleratedFilter)],
  ['activeBackdropFilterAnimation', i18nString(UIStrings.hasAnActiveAcceleratedBackdrop)],
  ['immersiveArOverlay', i18nString(UIStrings.isDomOverlayForWebxrImmersivear)],
  ['scrollDependentPosition', i18nString(UIStrings.isFixedOrStickyPosition)],
  ['overflowScrolling', i18nString(UIStrings.isAScrollableOverflowElement)],
  ['overflowScrollingParent', i18nString(UIStrings.scrollParentIsNotAnAncestor)],
  ['outOfFlowClipping', i18nString(UIStrings.hasClippingAncestor)],
  ['videoOverlay', i18nString(UIStrings.isOverlayControlsForVideo)],
  ['willChangeTransform', i18nString(UIStrings.hasAWillchangeTransform)],
  ['willChangeOpacity', i18nString(UIStrings.hasAWillchangeOpacityCompositing)],
  ['willChangeOther', i18nString(UIStrings.hasAWillchangeCompositingHint)],
  ['backdropFilter', i18nString(UIStrings.hasABackdropFilter)],
  ['rootScroller', i18nString(UIStrings.isTheDocumentrootscroller)],
  ['assumedOverlap', i18nString(UIStrings.mightOverlapOtherComposited)],
  ['overlap', i18nString(UIStrings.overlapsOtherCompositedContent)],
  ['negativeZIndexChildren', i18nString(UIStrings.parentWithCompositedNegative)],
  ['squashingDisallowed', i18nString(UIStrings.layerWasSeparatelyComposited)],
  ['opacityWithCompositedDescendants', i18nString(UIStrings.hasOpacityThatNeedsToBeAppliedBy)],
  ['maskWithCompositedDescendants', i18nString(UIStrings.hasAMaskThatNeedsToBeKnownBy)],
  ['reflectionWithCompositedDescendants', i18nString(UIStrings.hasAReflectionThatNeedsToBeKnown)],
  ['filterWithCompositedDescendants', i18nString(UIStrings.hasAFilterEffectThatNeedsToBe)],
  ['blendingWithCompositedDescendants', i18nString(UIStrings.hasABlendingEffectThatNeedsToBe)],
  ['clipsCompositingDescendants', i18nString(UIStrings.hasAClipThatNeedsToBeKnownBy)],
  ['perspectiveWith3DDescendants', i18nString(UIStrings.hasAPerspectiveTransformThat)],
  ['preserve3DWith3DDescendants', i18nString(UIStrings.hasAPreservesdPropertyThatNeeds)],
  ['isolateCompositedDescendants', i18nString(UIStrings.shouldIsolateDescendantsToApplyA)],
  ['positionFixedWithCompositedDescendants', i18nString(UIStrings.isAPositionfixedElementWith)],
  ['root', i18nString(UIStrings.isTheRootLayer)],
  ['layerForHorizontalScrollbar', i18nString(UIStrings.secondaryLayerTheHorizontal)],
  ['layerForVerticalScrollbar', i18nString(UIStrings.secondaryLayerTheVertical)],
  ['layerForOverflowControlsHost', i18nString(UIStrings.secondaryLayerTheOverflow)],
  ['layerForScrollCorner', i18nString(UIStrings.secondaryLayerTheScrollCorner)],
  ['layerForScrollingContents', i18nString(UIStrings.secondaryLayerToHouseContents)],
  ['layerForScrollingContainer', i18nString(UIStrings.secondaryLayerUsedToPositionThe)],
  ['layerForSquashingContents', i18nString(UIStrings.secondaryLayerHomeForAGroupOf)],
  ['layerForSquashingContainer', i18nString(UIStrings.secondaryLayerNoopLayerToPlace)],
  ['layerForForeground', i18nString(UIStrings.secondaryLayerToContainAnyNormal)],
  ['layerForMask', i18nString(UIStrings.secondaryLayerToContainTheMask)],
  ['layerForDecoration', i18nString(UIStrings.layerPaintedOnTopOfOtherLayersAs)],
  ['layerForOther', i18nString(UIStrings.layerForLinkHighlightFrame)],
]);

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  PaintProfilerRequested = 'PaintProfilerRequested',
}

export const slowScrollRectNames = new Map([
  [SDK.LayerTreeBase.Layer.ScrollRectType.NonFastScrollable, i18nString(UIStrings.nonFastScrollable)],
  [SDK.LayerTreeBase.Layer.ScrollRectType.TouchEventHandler, i18nString(UIStrings.touchEventHandler)],
  [SDK.LayerTreeBase.Layer.ScrollRectType.WheelEventHandler, i18nString(UIStrings.wheelEventHandler)],
  [SDK.LayerTreeBase.Layer.ScrollRectType.RepaintsOnScroll, i18nString(UIStrings.repaintsOnScroll)],
  [SDK.LayerTreeBase.Layer.ScrollRectType.MainThreadScrollingReason, i18nString(UIStrings.mainThreadScrollingReason)],
]);
