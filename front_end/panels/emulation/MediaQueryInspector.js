// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, nothing, render } from '../../ui/lit/lit.js';
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
const { classMap } = Directives;
export const DEFAULT_VIEW = (input, _output, target) => {
    const createBarClassMap = (marker) => ({
        'media-inspector-bar': true,
        'media-inspector-marker-inactive': !marker.active,
    });
    // clang-format off
    render(html `
    <style>${mediaQueryInspectorStyles}</style>
    <div class='media-inspector-view'>
    ${input.markers.entries().map(([section, markers]) => html `
      <div class='media-inspector-marker-container'>
        ${markers.map(marker => html `
          <div
              class=${classMap(createBarClassMap(marker))}
              @click=${() => input.onMediaQueryClicked(marker.model)}
              @contextmenu=${(event) => input.onContextMenu(event, marker.locations)}
          >
            ${section === 0 /* Section.MAX */
        ? renderMaxSection(input.zoomFactor, marker.model)
        : section === 1 /* Section.MIN_MAX */
            ? renderMinMaxSection(input.zoomFactor, marker.model)
            : renderMinSection(input.zoomFactor, marker.model)}
          </div>
        `)}
      </div>
    `).toArray()}
    </div>`, target);
    // clang-format on
};
function renderMaxSection(zoomFactor, model) {
    // clang-format off
    return html `
    <div class='media-inspector-marker-spacer'></div>
    <div
        class='media-inspector-marker media-inspector-marker-max-width'
        style=${'width: ' + model.maxWidthValue(zoomFactor) + 'px'}
        title=${model.mediaText()}
    >
      ${renderLabel(model.maxWidthExpression(), false, false)}
      ${renderLabel(model.maxWidthExpression(), true, true)}
    </div>
    <div class='media-inspector-marker-spacer'></div>
  `;
    // clang-format on
}
function renderMinMaxSection(zoomFactor, model) {
    const width = (model.maxWidthValue(zoomFactor) - model.minWidthValue(zoomFactor)) * 0.5;
    // clang-format off
    return html `
    <div class='media-inspector-marker-spacer'></div>
    <div
        class='media-inspector-marker media-inspector-marker-min-max-width'
        style=${'width: ' + width + 'px'}
        title=${model.mediaText()}
    >
      ${renderLabel(model.maxWidthExpression(), true, false)}
      ${renderLabel(model.minWidthExpression(), false, true)}
    </div>
    <div class='media-inspector-marker-spacer' style=${'flex: 0 0 ' + model.minWidthValue(zoomFactor) + 'px'}></div>
    <div
        class='media-inspector-marker media-inspector-marker-min-max-width'
        style=${'width: ' + width + 'px'}
        title=${model.mediaText()}
    >
      ${renderLabel(model.minWidthExpression(), true, false)}
      ${renderLabel(model.maxWidthExpression(), false, true)}
    </div>
    <div class='media-inspector-marker-spacer'></div>
  `;
    // clang-format on
}
function renderMinSection(zoomFactor, model) {
    // clang-format off
    return html `
    <div
        class='media-inspector-marker media-inspector-marker-min-width media-inspector-marker-min-width-left'
        title=${model.mediaText()}
    >${renderLabel(model.minWidthExpression(), false, false)}</div>
    <div class='media-inspector-marker-spacer' style=${'flex: 0 0 ' + model.minWidthValue(zoomFactor) + 'px'}></div>
    <div
        class='media-inspector-marker media-inspector-marker-min-width media-inspector-marker-min-width-right'
        title=${model.mediaText()}
    >${renderLabel(model.minWidthExpression(), true, true)}</div>
  `;
    // clang-format on
}
function renderLabel(expression, atLeft, leftAlign) {
    if (!expression) {
        return nothing;
    }
    const containerClassMap = {
        'media-inspector-marker-label-container': true,
        'media-inspector-marker-label-container-left': atLeft,
        'media-inspector-marker-label-container-right': !atLeft
    };
    const labelClassMap = {
        'media-inspector-marker-label': true,
        'media-inspector-label-left': leftAlign,
        'media-inspector-label-right': !leftAlign
    };
    // clang-format off
    return html `
    <div class=${classMap(containerClassMap)}>
      <span class=${classMap(labelClassMap)}>${expression.value()}${expression.unit()}</span>
    </div>
  `;
    // clang-format on
}
export class MediaQueryInspector extends UI.Widget.Widget {
    view;
    mediaThrottler;
    getWidthCallback;
    setWidthCallback;
    scale;
    cssModel;
    cachedQueryModels;
    constructor(getWidthCallback, setWidthCallback, mediaThrottler, view = DEFAULT_VIEW) {
        super({
            jslog: `${VisualLogging.mediaInspectorView().track({ click: true })}`,
            useShadowDom: true,
        });
        this.view = view;
        this.mediaThrottler = mediaThrottler;
        this.getWidthCallback = getWidthCallback;
        this.setWidthCallback = setWidthCallback;
        this.scale = 1;
        SDK.TargetManager.TargetManager.instance().observeModels(SDK.CSSModel.CSSModel, this);
        UI.ZoomManager.ZoomManager.instance().addEventListener("ZoomChanged" /* UI.ZoomManager.Events.ZOOM_CHANGED */, this.requestUpdate.bind(this), this);
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
        this.performUpdate();
    }
    onMediaQueryClicked(model) {
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
    onContextMenu(event, locations) {
        if (!this.cssModel?.isEnabled()) {
            return;
        }
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
        this.requestUpdate();
        function compareModels(model1, model2) {
            return model1.compareTo(model2);
        }
    }
    buildMediaQueryMarkers() {
        if (!this.cachedQueryModels) {
            return [];
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
        return markers;
    }
    zoomFactor() {
        return UI.ZoomManager.ZoomManager.instance().zoomFactor() / this.scale;
    }
    wasShown() {
        super.wasShown();
        this.scheduleMediaQueriesUpdate();
        this.performUpdate(); // Trigger a manual update eagerly, DeviceModeView needs to measure our height.
    }
    performUpdate() {
        const markers = Map.groupBy(this.buildMediaQueryMarkers(), marker => marker.model.section());
        this.view({
            zoomFactor: this.zoomFactor(),
            markers,
            onMediaQueryClicked: this.onMediaQueryClicked.bind(this),
            onContextMenu: this.onContextMenu.bind(this),
        }, {}, this.contentElement);
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
    minWidthValue(zoomFactor) {
        const minWidthExpression = this.minWidthExpression();
        return minWidthExpression ? (minWidthExpression.computedLength() || 0) / zoomFactor : 0;
    }
    maxWidthValue(zoomFactor) {
        const maxWidthExpression = this.maxWidthExpression();
        return maxWidthExpression ? (maxWidthExpression.computedLength() || 0) / zoomFactor : 0;
    }
    active() {
        return this.#active;
    }
}
//# sourceMappingURL=MediaQueryInspector.js.map