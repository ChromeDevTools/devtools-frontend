// Copyright 2013 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import layerDetailsViewStyles from './layerDetailsView.css.js';
import { ScrollRectSelection, } from './LayerViewHost.js';
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
};
const str_ = i18n.i18n.registerUIStrings('panels/layer_viewer/LayerDetailsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
export class LayerDetailsView extends Common.ObjectWrapper.eventMixin(UI.Widget.Widget) {
    layerViewHost;
    emptyWidget;
    layerSnapshotMap;
    tableElement;
    tbodyElement;
    sizeCell;
    compositingReasonsCell;
    memoryEstimateCell;
    paintCountCell;
    scrollRectsCell;
    stickyPositionConstraintCell;
    paintProfilerLink;
    selection;
    constructor(layerViewHost) {
        super({
            jslog: `${VisualLogging.pane('layers-details')}`,
            useShadowDom: true,
        });
        this.registerRequiredCSS(layerDetailsViewStyles);
        this.contentElement.classList.add('layer-details-container');
        this.layerViewHost = layerViewHost;
        this.layerViewHost.registerView(this);
        this.emptyWidget = new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.noLayerSelected), i18nString(UIStrings.selectALayerToSeeItsDetails));
        this.layerSnapshotMap = this.layerViewHost.getLayerSnapshotMap();
        this.buildContent();
        this.selection = null;
    }
    hoverObject(_selection) {
    }
    selectObject(selection) {
        this.selection = selection;
        if (this.isShowing()) {
            this.update();
        }
    }
    setLayerTree(_layerTree) {
    }
    wasShown() {
        super.wasShown();
        this.update();
    }
    onScrollRectClicked(index, event) {
        if (event.which !== 1) {
            return;
        }
        if (!this.selection) {
            return;
        }
        this.layerViewHost.selectObject(new ScrollRectSelection(this.selection.layer(), index));
    }
    invokeProfilerLink() {
        if (!this.selection) {
            return;
        }
        const snapshotSelection = this.selection.type() === "Snapshot" /* Type.SNAPSHOT */ ? this.selection : this.layerSnapshotMap.get(this.selection.layer());
        if (snapshotSelection) {
            this.dispatchEventToListeners("PaintProfilerRequested" /* Events.PAINT_PROFILER_REQUESTED */, snapshotSelection);
        }
    }
    createScrollRectElement(scrollRect, index) {
        if (index) {
            UI.UIUtils.createTextChild(this.scrollRectsCell, ', ');
        }
        const element = this.scrollRectsCell.createChild('span', 'scroll-rect');
        if (this.selection && this.selection.scrollRectIndex === index) {
            element.classList.add('active');
        }
        element.textContent = i18nString(UIStrings.scrollRectangleDimensions, {
            PH1: String(slowScrollRectNames.get(scrollRect.type)?.()),
            PH2: scrollRect.rect.width,
            PH3: scrollRect.rect.height,
            PH4: scrollRect.rect.x,
            PH5: scrollRect.rect.y,
        });
        element.addEventListener('click', this.onScrollRectClicked.bind(this, index), false);
        element.setAttribute('jslog', `${VisualLogging.action('layers.select-object').track({ click: true })}`);
    }
    formatStickyAncestorLayer(title, layer) {
        if (!layer) {
            return '';
        }
        const node = layer.nodeForSelfOrAncestor();
        const name = node ? node.simpleSelector() : i18nString(UIStrings.unnamed);
        return i18nString(UIStrings.stickyAncestorLayersS, { PH1: title, PH2: name, PH3: layer.id() });
    }
    createStickyAncestorChild(title, layer) {
        if (!layer) {
            return;
        }
        UI.UIUtils.createTextChild(this.stickyPositionConstraintCell, ', ');
        const child = this.stickyPositionConstraintCell.createChild('span');
        child.textContent = this.formatStickyAncestorLayer(title, layer);
    }
    populateStickyPositionConstraintCell(constraint) {
        this.stickyPositionConstraintCell.removeChildren();
        if (!constraint) {
            return;
        }
        const stickyBoxRect = constraint.stickyBoxRect();
        const stickyBoxRectElement = this.stickyPositionConstraintCell.createChild('span');
        stickyBoxRectElement.textContent = i18nString(UIStrings.stickyBoxRectangleDimensions, { PH1: stickyBoxRect.width, PH2: stickyBoxRect.height, PH3: stickyBoxRect.x, PH4: stickyBoxRect.y });
        UI.UIUtils.createTextChild(this.stickyPositionConstraintCell, ', ');
        const containingBlockRect = constraint.containingBlockRect();
        const containingBlockRectElement = this.stickyPositionConstraintCell.createChild('span');
        containingBlockRectElement.textContent = i18nString(UIStrings.containingBlocRectangleDimensions, {
            PH1: containingBlockRect.width,
            PH2: containingBlockRect.height,
            PH3: containingBlockRect.x,
            PH4: containingBlockRect.y,
        });
        this.createStickyAncestorChild(i18nString(UIStrings.nearestLayerShiftingStickyBox), constraint.nearestLayerShiftingStickyBox());
        this.createStickyAncestorChild(i18nString(UIStrings.nearestLayerShiftingContaining), constraint.nearestLayerShiftingContainingBlock());
    }
    update() {
        const layer = this.selection?.layer();
        if (!layer) {
            this.tableElement.remove();
            this.paintProfilerLink.remove();
            this.emptyWidget.show(this.contentElement);
            return;
        }
        this.emptyWidget.detach();
        this.contentElement.appendChild(this.tableElement);
        this.contentElement.appendChild(this.paintProfilerLink);
        this.sizeCell.textContent = i18nString(UIStrings.updateRectangleDimensions, { PH1: layer.width(), PH2: layer.height(), PH3: layer.offsetX(), PH4: layer.offsetY() });
        if (this.paintCountCell.parentElement) {
            this.paintCountCell.parentElement.classList.toggle('hidden', !layer.paintCount());
        }
        this.paintCountCell.textContent = String(layer.paintCount());
        this.memoryEstimateCell.textContent = i18n.ByteUtilities.bytesToString(layer.gpuMemoryUsage());
        void layer.requestCompositingReasons().then(this.updateCompositingReasons.bind(this));
        this.scrollRectsCell.removeChildren();
        layer.scrollRects().forEach(this.createScrollRectElement.bind(this));
        this.populateStickyPositionConstraintCell(layer.stickyPositionConstraint());
        const snapshot = this.selection && this.selection.type() === "Snapshot" /* Type.SNAPSHOT */ ?
            this.selection.snapshot() :
            null;
        this.paintProfilerLink.classList.toggle('hidden', !(this.layerSnapshotMap.has(layer) || snapshot));
    }
    buildContent() {
        this.tableElement = this.contentElement.createChild('table');
        this.tbodyElement = this.tableElement.createChild('tbody');
        this.sizeCell = this.createRow(i18nString(UIStrings.size));
        this.compositingReasonsCell = this.createRow(i18nString(UIStrings.compositingReasons));
        this.memoryEstimateCell = this.createRow(i18nString(UIStrings.memoryEstimate));
        this.paintCountCell = this.createRow(i18nString(UIStrings.paintCount));
        this.scrollRectsCell = this.createRow(i18nString(UIStrings.slowScrollRegions));
        this.stickyPositionConstraintCell = this.createRow(i18nString(UIStrings.stickyPositionConstraint));
        this.paintProfilerLink =
            this.contentElement.createChild('button', 'hidden devtools-link link-margin text-button link-style');
        UI.ARIAUtils.markAsLink(this.paintProfilerLink);
        this.paintProfilerLink.textContent = i18nString(UIStrings.paintProfiler);
        this.paintProfilerLink.tabIndex = 0;
        this.paintProfilerLink.addEventListener('click', e => {
            e.consume(true);
            this.invokeProfilerLink();
        });
        this.paintProfilerLink.setAttribute('jslog', `${VisualLogging.action('layers.paint-profiler').track({ click: true, keydown: 'Enter' })}`);
    }
    createRow(title) {
        const tr = this.tbodyElement.createChild('tr');
        const titleCell = tr.createChild('td');
        titleCell.textContent = title;
        return tr.createChild('td');
    }
    updateCompositingReasons(compositingReasons) {
        if (!compositingReasons?.length) {
            this.compositingReasonsCell.textContent = 'n/a';
            return;
        }
        this.compositingReasonsCell.removeChildren();
        const list = this.compositingReasonsCell.createChild('ul');
        for (const compositingReason of compositingReasons) {
            list.createChild('li').textContent = compositingReason;
        }
    }
}
export const slowScrollRectNames = new Map([
    ["NonFastScrollable" /* SDK.LayerTreeBase.Layer.ScrollRectType.NON_FAST_SCROLLABLE */, i18nLazyString(UIStrings.nonFastScrollable)],
    ["TouchEventHandler" /* SDK.LayerTreeBase.Layer.ScrollRectType.TOUCH_EVENT_HANDLER */, i18nLazyString(UIStrings.touchEventHandler)],
    ["WheelEventHandler" /* SDK.LayerTreeBase.Layer.ScrollRectType.WHEEL_EVENT_HANDLER */, i18nLazyString(UIStrings.wheelEventHandler)],
    ["RepaintsOnScroll" /* SDK.LayerTreeBase.Layer.ScrollRectType.REPAINTS_ON_SCROLL */, i18nLazyString(UIStrings.repaintsOnScroll)],
    [
        "MainThreadScrollingReason" /* SDK.LayerTreeBase.Layer.ScrollRectType.MAIN_THREAD_SCROLL_REASON */,
        i18nLazyString(UIStrings.mainThreadScrollingReason),
    ],
]);
//# sourceMappingURL=LayerDetailsView.js.map