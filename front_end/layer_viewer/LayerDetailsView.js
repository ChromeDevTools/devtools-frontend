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

import {LayerView, LayerViewHost, ScrollRectSelection, Selection, SnapshotSelection, Type,} from './LayerViewHost.js';  // eslint-disable-line no-unused-vars

/**
 * @implements {LayerView}
 * @unrestricted
 */
export class LayerDetailsView extends UI.Widget {
  /**
   * @param {!LayerViewHost} layerViewHost
   */
  constructor(layerViewHost) {
    super(true);
    this.registerRequiredCSS('layer_viewer/layerDetailsView.css');
    this._layerViewHost = layerViewHost;
    this._layerViewHost.registerView(this);
    this._emptyWidget = new UI.EmptyWidget(Common.UIString('Select a layer to see its details'));
    this._layerSnapshotMap = this._layerViewHost.getLayerSnapshotMap();
    this._buildContent();
  }

  /**
   * @param {?Selection} selection
   * @override
   */
  hoverObject(selection) {
  }

  /**
   * @param {?Selection} selection
   * @override
   */
  selectObject(selection) {
    this._selection = selection;
    if (this.isShowing()) {
      this.update();
    }
  }

  /**
   * @param {?SDK.LayerTreeBase} layerTree
   * @override
   */
  setLayerTree(layerTree) {
  }

  /**
   * @override
   */
  wasShown() {
    super.wasShown();
    this.update();
  }

  /**
   * @param {number} index
   * @param {!Event} event
   */
  _onScrollRectClicked(index, event) {
    if (event.which !== 1) {
      return;
    }
    this._layerViewHost.selectObject(new ScrollRectSelection(this._selection.layer(), index));
  }

  _invokeProfilerLink() {
    const snapshotSelection = this._selection.type() === Type.Snapshot ?
        this._selection :
        this._layerSnapshotMap.get(this._selection.layer());
    if (snapshotSelection) {
      this.dispatchEventToListeners(Events.PaintProfilerRequested, snapshotSelection);
    }
  }

  /**
   * @param {!Protocol.LayerTree.ScrollRect} scrollRect
   * @param {number} index
   */
  _createScrollRectElement(scrollRect, index) {
    if (index) {
      this._scrollRectsCell.createTextChild(', ');
    }
    const element = this._scrollRectsCell.createChild('span', 'scroll-rect');
    if (this._selection.scrollRectIndex === index) {
      element.classList.add('active');
    }
    element.textContent = Common.UIString(
        '%s %d × %d (at %d, %d)', slowScrollRectNames.get(scrollRect.type), scrollRect.rect.width,
        scrollRect.rect.height, scrollRect.rect.x, scrollRect.rect.y);
    element.addEventListener('click', this._onScrollRectClicked.bind(this, index), false);
  }

  /**
   * @param {string} title
   * @param {?SDK.Layer} layer
   * @return {string}
   */
  _formatStickyAncestorLayer(title, layer) {
    if (!layer) {
      return '';
    }

    const node = layer.nodeForSelfOrAncestor();
    const name = node ? node.simpleSelector() : Common.UIString('<unnamed>');
    return Common.UIString('%s: %s (%s)', title, name, layer.id());
  }

  /**
   * @param {string} title
   * @param {?SDK.Layer} layer
   */
  _createStickyAncestorChild(title, layer) {
    if (!layer) {
      return;
    }

    this._stickyPositionConstraintCell.createTextChild(', ');
    const child = this._stickyPositionConstraintCell.createChild('span');
    child.textContent = this._formatStickyAncestorLayer(title, layer);
  }

  /**
   * @param {?SDK.Layer.StickyPositionConstraint} constraint
   */
  _populateStickyPositionConstraintCell(constraint) {
    this._stickyPositionConstraintCell.removeChildren();
    if (!constraint) {
      return;
    }

    const stickyBoxRect = constraint.stickyBoxRect();
    const stickyBoxRectElement = this._stickyPositionConstraintCell.createChild('span');
    stickyBoxRectElement.textContent = Common.UIString(
        'Sticky Box %d × %d (at %d, %d)', stickyBoxRect.width, stickyBoxRect.height, stickyBoxRect.x, stickyBoxRect.y);

    this._stickyPositionConstraintCell.createTextChild(', ');

    const containingBlockRect = constraint.containingBlockRect();
    const containingBlockRectElement = this._stickyPositionConstraintCell.createChild('span');
    containingBlockRectElement.textContent = Common.UIString(
        'Containing Block %d × %d (at %d, %d)', containingBlockRect.width, containingBlockRect.height,
        containingBlockRect.x, containingBlockRect.y);

    this._createStickyAncestorChild(
        Common.UIString('Nearest Layer Shifting Sticky Box'), constraint.nearestLayerShiftingStickyBox());
    this._createStickyAncestorChild(
        Common.UIString('Nearest Layer Shifting Containing Block'), constraint.nearestLayerShiftingContainingBlock());
  }

  update() {
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
    this._sizeCell.textContent =
        Common.UIString('%d × %d (at %d,%d)', layer.width(), layer.height(), layer.offsetX(), layer.offsetY());
    this._paintCountCell.parentElement.classList.toggle('hidden', !layer.paintCount());
    this._paintCountCell.textContent = layer.paintCount();
    this._memoryEstimateCell.textContent = Number.bytesToString(layer.gpuMemoryUsage());
    layer.requestCompositingReasons().then(this._updateCompositingReasons.bind(this));
    this._scrollRectsCell.removeChildren();
    layer.scrollRects().forEach(this._createScrollRectElement.bind(this));
    this._populateStickyPositionConstraintCell(layer.stickyPositionConstraint());
    const snapshot = this._selection.type() === Type.Snapshot ?
        /** @type {!SnapshotSelection} */ (this._selection).snapshot() :
        null;

    this._paintProfilerLink.classList.toggle('hidden', !(this._layerSnapshotMap.has(layer) || snapshot));
  }

  _buildContent() {
    this._tableElement = this.contentElement.createChild('table');
    this._tbodyElement = this._tableElement.createChild('tbody');
    this._sizeCell = this._createRow(Common.UIString('Size'));
    this._compositingReasonsCell = this._createRow(Common.UIString('Compositing Reasons'));
    this._memoryEstimateCell = this._createRow(Common.UIString('Memory estimate'));
    this._paintCountCell = this._createRow(Common.UIString('Paint count'));
    this._scrollRectsCell = this._createRow(Common.UIString('Slow scroll regions'));
    this._stickyPositionConstraintCell = this._createRow(Common.UIString('Sticky position constraint'));
    this._paintProfilerLink = this.contentElement.createChild('span', 'hidden devtools-link link-margin');
    UI.ARIAUtils.markAsLink(this._paintProfilerLink);
    this._paintProfilerLink.textContent = ls`Paint Profiler`;
    this._paintProfilerLink.tabIndex = 0;
    this._paintProfilerLink.addEventListener('click', e => {
      e.consume(true);
      this._invokeProfilerLink();
    });
    this._paintProfilerLink.addEventListener('keydown', event => {
      if (isEnterKey(event)) {
        event.consume();
        this._invokeProfilerLink();
      }
    });
  }

  /**
   * @param {string} title
   */
  _createRow(title) {
    const tr = this._tbodyElement.createChild('tr');
    const titleCell = tr.createChild('td');
    titleCell.textContent = title;
    return tr.createChild('td');
  }

  /**
   * @param {!Array.<string>} compositingReasons
   */
  _updateCompositingReasons(compositingReasons) {
    if (!compositingReasons || !compositingReasons.length) {
      this._compositingReasonsCell.textContent = 'n/a';
      return;
    }
    this._compositingReasonsCell.removeChildren();
    const list = this._compositingReasonsCell.createChild('ul');
    for (let i = 0; i < compositingReasons.length; ++i) {
      // The reason is coming straight from third_party/blink/renderer/platform/graphics/compositing_reasons.cc
      let text = compositingReasons[i];
      // If the text is more than one word but does not terminate with period, add the period.
      if (/\s.*[^.]$/.test(text)) {
        text += '.';
      }
      list.createChild('li').textContent = text;
    }
  }
}

/** @enum {symbol} */
export const Events = {
  PaintProfilerRequested: Symbol('PaintProfilerRequested')
};

export const slowScrollRectNames = new Map([
  [SDK.Layer.ScrollRectType.NonFastScrollable, Common.UIString('Non fast scrollable')],
  [SDK.Layer.ScrollRectType.TouchEventHandler, Common.UIString('Touch event handler')],
  [SDK.Layer.ScrollRectType.WheelEventHandler, Common.UIString('Wheel event handler')],
  [SDK.Layer.ScrollRectType.RepaintsOnScroll, Common.UIString('Repaints on scroll')],
  [SDK.Layer.ScrollRectType.MainThreadScrollingReason, Common.UIString('Main thread scrolling reason')]
]);
