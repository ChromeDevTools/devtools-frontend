// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import mediaQueryInspectorStyles from './mediaQueryInspector.css.js';
const UIStrings = {
    /**
     * @description A context menu item/command in the Media Query Inspector of the Device Toolbar.
     * Takes the user to the source code where this media query actually came from.
     */
    revealInSourceCode: 'Reveal in source code',
};
const str_ = i18n.i18n.registerUIStrings('panels/emulation/MediaQueryInspector.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class MediaQueryInspector extends UI.Widget.Widget {
    mediaThrottler;
    getWidthCallback;
    setWidthCallback;
    scale;
    elementsToMediaQueryModel;
    elementsToCSSLocations;
    cssModel;
    cachedQueryModels;
    constructor(getWidthCallback, setWidthCallback, mediaThrottler) {
        super({
            jslog: `${VisualLogging.mediaInspectorView().track({ click: true })}`,
            useShadowDom: true,
        });
        this.registerRequiredCSS(mediaQueryInspectorStyles);
        this.contentElement.classList.add('media-inspector-view');
        this.contentElement.addEventListener('click', this.onMediaQueryClicked.bind(this), false);
        this.contentElement.addEventListener('contextmenu', this.onContextMenu.bind(this), false);
        this.mediaThrottler = mediaThrottler;
        this.getWidthCallback = getWidthCallback;
        this.setWidthCallback = setWidthCallback;
        this.scale = 1;
        this.elementsToMediaQueryModel = new WeakMap();
        this.elementsToCSSLocations = new WeakMap();
        SDK.TargetManager.TargetManager.instance().observeModels(SDK.CSSModel.CSSModel, this);
        UI.ZoomManager.ZoomManager.instance().addEventListener("ZoomChanged" /* UI.ZoomManager.Events.ZOOM_CHANGED */, this.renderMediaQueries.bind(this), this);
    }
    modelAdded(cssModel) {
        // FIXME: adapt this to multiple targets.
        if (cssModel.target() !== SDK.TargetManager.TargetManager.instance().primaryPageTarget()) {
            return;
        }
        this.cssModel = cssModel;
        this.cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetAdded, this.scheduleMediaQueriesUpdate, this);
        this.cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetRemoved, this.scheduleMediaQueriesUpdate, this);
        this.cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetChanged, this.scheduleMediaQueriesUpdate, this);
        this.cssModel.addEventListener(SDK.CSSModel.Events.MediaQueryResultChanged, this.scheduleMediaQueriesUpdate, this);
    }
    modelRemoved(cssModel) {
        if (cssModel !== this.cssModel) {
            return;
        }
        this.cssModel.removeEventListener(SDK.CSSModel.Events.StyleSheetAdded, this.scheduleMediaQueriesUpdate, this);
        this.cssModel.removeEventListener(SDK.CSSModel.Events.StyleSheetRemoved, this.scheduleMediaQueriesUpdate, this);
        this.cssModel.removeEventListener(SDK.CSSModel.Events.StyleSheetChanged, this.scheduleMediaQueriesUpdate, this);
        this.cssModel.removeEventListener(SDK.CSSModel.Events.MediaQueryResultChanged, this.scheduleMediaQueriesUpdate, this);
        delete this.cssModel;
    }
    setAxisTransform(scale) {
        if (Math.abs(this.scale - scale) < 1e-8) {
            return;
        }
        this.scale = scale;
        this.renderMediaQueries();
    }
    onMediaQueryClicked(event) {
        const mediaQueryMarker = event.target.enclosingNodeOrSelfWithClass('media-inspector-bar');
        if (!mediaQueryMarker) {
            return;
        }
        const model = this.elementsToMediaQueryModel.get(mediaQueryMarker);
        if (!model) {
            return;
        }
        const modelMaxWidth = model.maxWidthExpression();
        const modelMinWidth = model.minWidthExpression();
        if (model.section() === 0 /* Section.MAX */) {
            this.setWidthCallback(modelMaxWidth ? modelMaxWidth.computedLength() || 0 : 0);
            return;
        }
        if (model.section() === 2 /* Section.MIN */) {
            this.setWidthCallback(modelMinWidth ? modelMinWidth.computedLength() || 0 : 0);
            return;
        }
        const currentWidth = this.getWidthCallback();
        if (modelMinWidth && currentWidth !== modelMinWidth.computedLength()) {
            this.setWidthCallback(modelMinWidth.computedLength() || 0);
        }
        else {
            this.setWidthCallback(modelMaxWidth ? modelMaxWidth.computedLength() || 0 : 0);
        }
    }
    onContextMenu(event) {
        if (!this.cssModel?.isEnabled()) {
            return;
        }
        const mediaQueryMarker = event.target.enclosingNodeOrSelfWithClass('media-inspector-bar');
        if (!mediaQueryMarker) {
            return;
        }
        const locations = this.elementsToCSSLocations.get(mediaQueryMarker) || [];
        const uiLocations = new Map();
        for (let i = 0; i < locations.length; ++i) {
            const uiLocation = Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance().rawLocationToUILocation(locations[i]);
            if (!uiLocation) {
                continue;
            }
            const descriptor = typeof uiLocation.columnNumber === 'number' ?
                Platform.StringUtilities.sprintf('%s:%d:%d', uiLocation.uiSourceCode.url(), uiLocation.lineNumber + 1, uiLocation.columnNumber + 1) :
                Platform.StringUtilities.sprintf('%s:%d', uiLocation.uiSourceCode.url(), uiLocation.lineNumber + 1);
            uiLocations.set(descriptor, uiLocation);
        }
        const contextMenuItems = [...uiLocations.keys()].sort();
        const contextMenu = new UI.ContextMenu.ContextMenu(event);
        const subMenuItem = contextMenu.defaultSection().appendSubMenuItem(i18nString(UIStrings.revealInSourceCode), undefined, 'reveal-in-source-list');
        for (let i = 0; i < contextMenuItems.length; ++i) {
            const title = contextMenuItems[i];
            subMenuItem.defaultSection().appendItem(title, this.revealSourceLocation.bind(this, uiLocations.get(title)), { jslogContext: 'reveal-in-source' });
        }
        void contextMenu.show();
    }
    revealSourceLocation(location) {
        void Common.Revealer.reveal(location);
    }
    scheduleMediaQueriesUpdate() {
        if (!this.isShowing()) {
            return;
        }
        void this.mediaThrottler.schedule(this.refetchMediaQueries.bind(this));
    }
    refetchMediaQueries() {
        if (!this.isShowing() || !this.cssModel) {
            return Promise.resolve();
        }
        return this.cssModel.getMediaQueries().then(this.rebuildMediaQueries.bind(this));
    }
    squashAdjacentEqual(models) {
        const filtered = [];
        for (let i = 0; i < models.length; ++i) {
            const last = filtered[filtered.length - 1];
            if (!last?.equals(models[i])) {
                filtered.push(models[i]);
            }
        }
        return filtered;
    }
    rebuildMediaQueries(cssMedias) {
        let queryModels = [];
        for (let i = 0; i < cssMedias.length; ++i) {
            const cssMedia = cssMedias[i];
            if (!cssMedia.mediaList) {
                continue;
            }
            for (let j = 0; j < cssMedia.mediaList.length; ++j) {
                const mediaQuery = cssMedia.mediaList[j];
                const queryModel = MediaQueryUIModel.createFromMediaQuery(cssMedia, mediaQuery);
                if (queryModel) {
                    queryModels.push(queryModel);
                }
            }
        }
        queryModels.sort(compareModels);
        queryModels = this.squashAdjacentEqual(queryModels);
        let allEqual = this.cachedQueryModels && this.cachedQueryModels.length === queryModels.length;
        for (let i = 0; allEqual && i < queryModels.length; ++i) {
            allEqual = allEqual && this.cachedQueryModels?.[i].equals(queryModels[i]);
        }
        if (allEqual) {
            return;
        }
        this.cachedQueryModels = queryModels;
        this.renderMediaQueries();
        function compareModels(model1, model2) {
            return model1.compareTo(model2);
        }
    }
    renderMediaQueries() {
        if (!this.cachedQueryModels || !this.isShowing()) {
            return;
        }
        const markers = [];
        let lastMarker = null;
        for (const model of this.cachedQueryModels) {
            if (lastMarker?.model.dimensionsEqual(model)) {
                lastMarker.active = lastMarker.active || model.active();
            }
            else {
                lastMarker = {
                    active: model.active(),
                    model,
                    locations: [],
                };
                markers.push(lastMarker);
            }
            const rawLocation = model.rawLocation();
            if (rawLocation) {
                lastMarker.locations.push(rawLocation);
            }
        }
        this.contentElement.removeChildren();
        let container = null;
        for (let i = 0; i < markers.length; ++i) {
            if (!i || markers[i].model.section() !== markers[i - 1].model.section()) {
                container = this.contentElement.createChild('div', 'media-inspector-marker-container');
            }
            const marker = markers[i];
            const bar = this.createElementFromMediaQueryModel(marker.model);
            this.elementsToMediaQueryModel.set(bar, marker.model);
            this.elementsToCSSLocations.set(bar, marker.locations);
            bar.classList.toggle('media-inspector-marker-inactive', !marker.active);
            if (!container) {
                throw new Error('Could not find container to render media queries into.');
            }
            container.appendChild(bar);
        }
    }
    zoomFactor() {
        return UI.ZoomManager.ZoomManager.instance().zoomFactor() / this.scale;
    }
    wasShown() {
        super.wasShown();
        this.scheduleMediaQueriesUpdate();
    }
    createElementFromMediaQueryModel(model) {
        const zoomFactor = this.zoomFactor();
        const minWidthExpression = model.minWidthExpression();
        const maxWidthExpression = model.maxWidthExpression();
        const minWidthValue = minWidthExpression ? (minWidthExpression.computedLength() || 0) / zoomFactor : 0;
        const maxWidthValue = maxWidthExpression ? (maxWidthExpression.computedLength() || 0) / zoomFactor : 0;
        const result = document.createElement('div');
        result.classList.add('media-inspector-bar');
        if (model.section() === 0 /* Section.MAX */) {
            result.createChild('div', 'media-inspector-marker-spacer');
            const markerElement = result.createChild('div', 'media-inspector-marker media-inspector-marker-max-width');
            markerElement.style.width = maxWidthValue + 'px';
            UI.Tooltip.Tooltip.install(markerElement, model.mediaText());
            appendLabel(markerElement, model.maxWidthExpression(), false, false);
            appendLabel(markerElement, model.maxWidthExpression(), true, true);
            result.createChild('div', 'media-inspector-marker-spacer');
        }
        if (model.section() === 1 /* Section.MIN_MAX */) {
            result.createChild('div', 'media-inspector-marker-spacer');
            const leftElement = result.createChild('div', 'media-inspector-marker media-inspector-marker-min-max-width');
            leftElement.style.width = (maxWidthValue - minWidthValue) * 0.5 + 'px';
            UI.Tooltip.Tooltip.install(leftElement, model.mediaText());
            appendLabel(leftElement, model.maxWidthExpression(), true, false);
            appendLabel(leftElement, model.minWidthExpression(), false, true);
            result.createChild('div', 'media-inspector-marker-spacer').style.flex = '0 0 ' + minWidthValue + 'px';
            const rightElement = result.createChild('div', 'media-inspector-marker media-inspector-marker-min-max-width');
            rightElement.style.width = (maxWidthValue - minWidthValue) * 0.5 + 'px';
            UI.Tooltip.Tooltip.install(rightElement, model.mediaText());
            appendLabel(rightElement, model.minWidthExpression(), true, false);
            appendLabel(rightElement, model.maxWidthExpression(), false, true);
            result.createChild('div', 'media-inspector-marker-spacer');
        }
        if (model.section() === 2 /* Section.MIN */) {
            const leftElement = result.createChild('div', 'media-inspector-marker media-inspector-marker-min-width media-inspector-marker-min-width-left');
            UI.Tooltip.Tooltip.install(leftElement, model.mediaText());
            appendLabel(leftElement, model.minWidthExpression(), false, false);
            result.createChild('div', 'media-inspector-marker-spacer').style.flex = '0 0 ' + minWidthValue + 'px';
            const rightElement = result.createChild('div', 'media-inspector-marker media-inspector-marker-min-width media-inspector-marker-min-width-right');
            UI.Tooltip.Tooltip.install(rightElement, model.mediaText());
            appendLabel(rightElement, model.minWidthExpression(), true, true);
        }
        function appendLabel(marker, expression, atLeft, leftAlign) {
            if (!expression) {
                return;
            }
            marker
                .createChild('div', 'media-inspector-marker-label-container ' +
                (atLeft ? 'media-inspector-marker-label-container-left' :
                    'media-inspector-marker-label-container-right'))
                .createChild('span', 'media-inspector-marker-label ' +
                (leftAlign ? 'media-inspector-label-left' : 'media-inspector-label-right'))
                .textContent = expression.value() + expression.unit();
        }
        return result;
    }
}
export class MediaQueryUIModel {
    cssMedia;
    #minWidthExpression;
    #maxWidthExpression;
    #active;
    #section;
    #rawLocation;
    constructor(cssMedia, minWidthExpression, maxWidthExpression, active) {
        this.cssMedia = cssMedia;
        this.#minWidthExpression = minWidthExpression;
        this.#maxWidthExpression = maxWidthExpression;
        this.#active = active;
        if (maxWidthExpression && !minWidthExpression) {
            this.#section = 0 /* Section.MAX */;
        }
        else if (minWidthExpression && maxWidthExpression) {
            this.#section = 1 /* Section.MIN_MAX */;
        }
        else {
            this.#section = 2 /* Section.MIN */;
        }
    }
    static createFromMediaQuery(cssMedia, mediaQuery) {
        let maxWidthExpression = null;
        let maxWidthPixels = Number.MAX_VALUE;
        let minWidthExpression = null;
        let minWidthPixels = Number.MIN_VALUE;
        const expressions = mediaQuery.expressions();
        if (!expressions) {
            return null;
        }
        for (let i = 0; i < expressions.length; ++i) {
            const expression = expressions[i];
            const feature = expression.feature();
            if (feature.indexOf('width') === -1) {
                continue;
            }
            const pixels = expression.computedLength();
            if (feature.startsWith('max-') && pixels && pixels < maxWidthPixels) {
                maxWidthExpression = expression;
                maxWidthPixels = pixels;
            }
            else if (feature.startsWith('min-') && pixels && pixels > minWidthPixels) {
                minWidthExpression = expression;
                minWidthPixels = pixels;
            }
        }
        if (minWidthPixels > maxWidthPixels || (!maxWidthExpression && !minWidthExpression)) {
            return null;
        }
        return new MediaQueryUIModel(cssMedia, minWidthExpression, maxWidthExpression, mediaQuery.active());
    }
    equals(other) {
        return this.compareTo(other) === 0;
    }
    dimensionsEqual(other) {
        const thisMinWidthExpression = this.minWidthExpression();
        const otherMinWidthExpression = other.minWidthExpression();
        const thisMaxWidthExpression = this.maxWidthExpression();
        const otherMaxWidthExpression = other.maxWidthExpression();
        const sectionsEqual = this.section() === other.section();
        // If there isn't an other min width expression, they aren't equal, so the optional chaining operator is safe to use here.
        const minWidthEqual = !thisMinWidthExpression ||
            thisMinWidthExpression.computedLength() === otherMinWidthExpression?.computedLength();
        const maxWidthEqual = !thisMaxWidthExpression ||
            thisMaxWidthExpression.computedLength() === otherMaxWidthExpression?.computedLength();
        return sectionsEqual && minWidthEqual && maxWidthEqual;
    }
    compareTo(other) {
        if (this.section() !== other.section()) {
            return this.section() - other.section();
        }
        if (this.dimensionsEqual(other)) {
            const myLocation = this.rawLocation();
            const otherLocation = other.rawLocation();
            if (!myLocation && !otherLocation) {
                return Platform.StringUtilities.compare(this.mediaText(), other.mediaText());
            }
            if (myLocation && !otherLocation) {
                return 1;
            }
            if (!myLocation && otherLocation) {
                return -1;
            }
            if (this.active() !== other.active()) {
                return this.active() ? -1 : 1;
            }
            if (!myLocation || !otherLocation) {
                // This conditional never runs, because it's dealt with above, but
                // TypeScript can't follow that by this point both myLocation and
                // otherLocation must exist.
                return 0;
            }
            return Platform.StringUtilities.compare(myLocation.url, otherLocation.url) ||
                myLocation.lineNumber - otherLocation.lineNumber || myLocation.columnNumber - otherLocation.columnNumber;
        }
        const thisMaxWidthExpression = this.maxWidthExpression();
        const otherMaxWidthExpression = other.maxWidthExpression();
        const thisMaxLength = thisMaxWidthExpression ? thisMaxWidthExpression.computedLength() || 0 : 0;
        const otherMaxLength = otherMaxWidthExpression ? otherMaxWidthExpression.computedLength() || 0 : 0;
        const thisMinWidthExpression = this.minWidthExpression();
        const otherMinWidthExpression = other.minWidthExpression();
        const thisMinLength = thisMinWidthExpression ? thisMinWidthExpression.computedLength() || 0 : 0;
        const otherMinLength = otherMinWidthExpression ? otherMinWidthExpression.computedLength() || 0 : 0;
        if (this.section() === 0 /* Section.MAX */) {
            return otherMaxLength - thisMaxLength;
        }
        if (this.section() === 2 /* Section.MIN */) {
            return thisMinLength - otherMinLength;
        }
        return thisMinLength - otherMinLength || otherMaxLength - thisMaxLength;
    }
    section() {
        return this.#section;
    }
    mediaText() {
        return this.cssMedia.text || '';
    }
    rawLocation() {
        if (!this.#rawLocation) {
            this.#rawLocation = this.cssMedia.rawLocation();
        }
        return this.#rawLocation;
    }
    minWidthExpression() {
        return this.#minWidthExpression;
    }
    maxWidthExpression() {
        return this.#maxWidthExpression;
    }
    active() {
        return this.#active;
    }
}
//# sourceMappingURL=MediaQueryInspector.js.map