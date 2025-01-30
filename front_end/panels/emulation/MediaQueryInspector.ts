// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import type * as Workspace from '../../models/workspace/workspace.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import mediaQueryInspectorStyles from './mediaQueryInspector.css.legacy.js';

const UIStrings = {
  /**
   * @description A context menu item/command in the Media Query Inspector of the Device Toolbar.
   * Takes the user to the source code where this media query actually came from.
   */
  revealInSourceCode: 'Reveal in source code',
};
const str_ = i18n.i18n.registerUIStrings('panels/emulation/MediaQueryInspector.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class MediaQueryInspector extends UI.Widget.Widget implements
    SDK.TargetManager.SDKModelObserver<SDK.CSSModel.CSSModel> {
  private readonly mediaThrottler: Common.Throttler.Throttler;
  private readonly getWidthCallback: () => number;
  private readonly setWidthCallback: (arg0: number) => void;
  private scale: number;
  elementsToMediaQueryModel: WeakMap<Element, MediaQueryUIModel>;
  elementsToCSSLocations: WeakMap<Element, SDK.CSSModel.CSSLocation[]>;
  private cssModel?: SDK.CSSModel.CSSModel;
  private cachedQueryModels?: MediaQueryUIModel[];

  constructor(
      getWidthCallback: () => number, setWidthCallback: (arg0: number) => void,
      mediaThrottler: Common.Throttler.Throttler) {
    super(true);
    this.registerRequiredCSS(mediaQueryInspectorStyles);
    this.contentElement.classList.add('media-inspector-view');
    this.contentElement.setAttribute('jslog', `${VisualLogging.mediaInspectorView().track({click: true})}`);
    this.contentElement.addEventListener('click', this.onMediaQueryClicked.bind(this), false);
    this.contentElement.addEventListener('contextmenu', this.onContextMenu.bind(this), false);
    this.mediaThrottler = mediaThrottler;

    this.getWidthCallback = getWidthCallback;
    this.setWidthCallback = setWidthCallback;
    this.scale = 1;

    this.elementsToMediaQueryModel = new WeakMap();
    this.elementsToCSSLocations = new WeakMap();

    SDK.TargetManager.TargetManager.instance().observeModels(SDK.CSSModel.CSSModel, this);
    UI.ZoomManager.ZoomManager.instance().addEventListener(
        UI.ZoomManager.Events.ZOOM_CHANGED, this.renderMediaQueries.bind(this), this);
  }

  modelAdded(cssModel: SDK.CSSModel.CSSModel): void {
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

  modelRemoved(cssModel: SDK.CSSModel.CSSModel): void {
    if (cssModel !== this.cssModel) {
      return;
    }
    this.cssModel.removeEventListener(SDK.CSSModel.Events.StyleSheetAdded, this.scheduleMediaQueriesUpdate, this);
    this.cssModel.removeEventListener(SDK.CSSModel.Events.StyleSheetRemoved, this.scheduleMediaQueriesUpdate, this);
    this.cssModel.removeEventListener(SDK.CSSModel.Events.StyleSheetChanged, this.scheduleMediaQueriesUpdate, this);
    this.cssModel.removeEventListener(
        SDK.CSSModel.Events.MediaQueryResultChanged, this.scheduleMediaQueriesUpdate, this);
    delete this.cssModel;
  }

  setAxisTransform(scale: number): void {
    if (Math.abs(this.scale - scale) < 1e-8) {
      return;
    }
    this.scale = scale;
    this.renderMediaQueries();
  }

  private onMediaQueryClicked(event: Event): void {
    const mediaQueryMarker = (event.target as Node).enclosingNodeOrSelfWithClass('media-inspector-bar');
    if (!mediaQueryMarker) {
      return;
    }

    const model = this.elementsToMediaQueryModel.get(mediaQueryMarker);
    if (!model) {
      return;
    }
    const modelMaxWidth = model.maxWidthExpression();
    const modelMinWidth = model.minWidthExpression();

    if (model.section() === Section.MAX) {
      this.setWidthCallback(modelMaxWidth ? modelMaxWidth.computedLength() || 0 : 0);
      return;
    }
    if (model.section() === Section.MIN) {
      this.setWidthCallback(modelMinWidth ? modelMinWidth.computedLength() || 0 : 0);
      return;
    }
    const currentWidth = this.getWidthCallback();
    if (modelMinWidth && currentWidth !== modelMinWidth.computedLength()) {
      this.setWidthCallback(modelMinWidth.computedLength() || 0);
    } else {
      this.setWidthCallback(modelMaxWidth ? modelMaxWidth.computedLength() || 0 : 0);
    }
  }

  private onContextMenu(event: Event): void {
    if (!this.cssModel || !this.cssModel.isEnabled()) {
      return;
    }

    const mediaQueryMarker = (event.target as Node).enclosingNodeOrSelfWithClass('media-inspector-bar');
    if (!mediaQueryMarker) {
      return;
    }

    const locations = this.elementsToCSSLocations.get(mediaQueryMarker) || [];
    const uiLocations = new Map<string, Workspace.UISourceCode.UILocation>();
    for (let i = 0; i < locations.length; ++i) {
      const uiLocation =
          Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance().rawLocationToUILocation(locations[i]);
      if (!uiLocation) {
        continue;
      }
      const descriptor = typeof uiLocation.columnNumber === 'number' ?
          Platform.StringUtilities.sprintf(
              '%s:%d:%d', uiLocation.uiSourceCode.url(), uiLocation.lineNumber + 1, uiLocation.columnNumber + 1) :
          Platform.StringUtilities.sprintf('%s:%d', uiLocation.uiSourceCode.url(), uiLocation.lineNumber + 1);
      uiLocations.set(descriptor, uiLocation);
    }

    const contextMenuItems = [...uiLocations.keys()].sort();
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    const subMenuItem = contextMenu.defaultSection().appendSubMenuItem(
        i18nString(UIStrings.revealInSourceCode), undefined, 'reveal-in-source-list');
    for (let i = 0; i < contextMenuItems.length; ++i) {
      const title = contextMenuItems[i];
      subMenuItem.defaultSection().appendItem(
          title, this.revealSourceLocation.bind(this, (uiLocations.get(title) as Workspace.UISourceCode.UILocation)),
          {jslogContext: 'reveal-in-source'});
    }
    void contextMenu.show();
  }

  private revealSourceLocation(location: Workspace.UISourceCode.UILocation): void {
    void Common.Revealer.reveal(location);
  }

  private scheduleMediaQueriesUpdate(): void {
    if (!this.isShowing()) {
      return;
    }
    void this.mediaThrottler.schedule(this.refetchMediaQueries.bind(this));
  }

  private refetchMediaQueries(): Promise<void> {
    if (!this.isShowing() || !this.cssModel) {
      return Promise.resolve();
    }

    return this.cssModel.getMediaQueries().then(this.rebuildMediaQueries.bind(this));
  }

  private squashAdjacentEqual(models: MediaQueryUIModel[]): MediaQueryUIModel[] {
    const filtered = [];
    for (let i = 0; i < models.length; ++i) {
      const last = filtered[filtered.length - 1];
      if (!last || !last.equals(models[i])) {
        filtered.push(models[i]);
      }
    }
    return filtered;
  }

  private rebuildMediaQueries(cssMedias: SDK.CSSMedia.CSSMedia[]): void {
    let queryModels: MediaQueryUIModel[] = [];
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

    let allEqual: (boolean|undefined) = this.cachedQueryModels && this.cachedQueryModels.length === queryModels.length;
    for (let i = 0; allEqual && i < queryModels.length; ++i) {
      allEqual = allEqual && this.cachedQueryModels && this.cachedQueryModels[i].equals(queryModels[i]);
    }
    if (allEqual) {
      return;
    }
    this.cachedQueryModels = queryModels;
    this.renderMediaQueries();

    function compareModels(model1: MediaQueryUIModel, model2: MediaQueryUIModel): number {
      return model1.compareTo(model2);
    }
  }

  private renderMediaQueries(): void {
    if (!this.cachedQueryModels || !this.isShowing()) {
      return;
    }

    const markers = [];
    let lastMarker: {
      active: boolean,
      model: MediaQueryUIModel,
      locations: SDK.CSSModel.CSSLocation[],
    }|null = null;
    for (const model of this.cachedQueryModels) {
      if (lastMarker && lastMarker.model.dimensionsEqual(model)) {
        lastMarker.active = lastMarker.active || model.active();
      } else {
        lastMarker = {
          active: model.active(),
          model,
          locations: ([] as SDK.CSSModel.CSSLocation[]),
        };
        markers.push(lastMarker);
      }
      const rawLocation = model.rawLocation();
      if (rawLocation) {
        lastMarker.locations.push(rawLocation);
      }
    }

    this.contentElement.removeChildren();

    let container: HTMLElement|null = null;
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

  private zoomFactor(): number {
    return UI.ZoomManager.ZoomManager.instance().zoomFactor() / this.scale;
  }

  override wasShown(): void {
    super.wasShown();
    this.scheduleMediaQueriesUpdate();
  }

  private createElementFromMediaQueryModel(model: MediaQueryUIModel): Element {
    const zoomFactor = this.zoomFactor();
    const minWidthExpression = model.minWidthExpression();
    const maxWidthExpression = model.maxWidthExpression();
    const minWidthValue = minWidthExpression ? (minWidthExpression.computedLength() || 0) / zoomFactor : 0;
    const maxWidthValue = maxWidthExpression ? (maxWidthExpression.computedLength() || 0) / zoomFactor : 0;
    const result = document.createElement('div');
    result.classList.add('media-inspector-bar');

    if (model.section() === Section.MAX) {
      result.createChild('div', 'media-inspector-marker-spacer');
      const markerElement = result.createChild('div', 'media-inspector-marker media-inspector-marker-max-width');
      markerElement.style.width = maxWidthValue + 'px';
      UI.Tooltip.Tooltip.install(markerElement, model.mediaText());
      appendLabel(markerElement, model.maxWidthExpression(), false, false);
      appendLabel(markerElement, model.maxWidthExpression(), true, true);
      result.createChild('div', 'media-inspector-marker-spacer');
    }

    if (model.section() === Section.MIN_MAX) {
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

    if (model.section() === Section.MIN) {
      const leftElement = result.createChild(
          'div', 'media-inspector-marker media-inspector-marker-min-width media-inspector-marker-min-width-left');
      UI.Tooltip.Tooltip.install(leftElement, model.mediaText());
      appendLabel(leftElement, model.minWidthExpression(), false, false);
      result.createChild('div', 'media-inspector-marker-spacer').style.flex = '0 0 ' + minWidthValue + 'px';
      const rightElement = result.createChild(
          'div', 'media-inspector-marker media-inspector-marker-min-width media-inspector-marker-min-width-right');
      UI.Tooltip.Tooltip.install(rightElement, model.mediaText());
      appendLabel(rightElement, model.minWidthExpression(), true, true);
    }

    function appendLabel(
        marker: Element, expression: SDK.CSSMedia.CSSMediaQueryExpression|null, atLeft: boolean,
        leftAlign: boolean): void {
      if (!expression) {
        return;
      }
      marker
          .createChild(
              'div',
              'media-inspector-marker-label-container ' +
                  (atLeft ? 'media-inspector-marker-label-container-left' :
                            'media-inspector-marker-label-container-right'))
          .createChild(
              'span',
              'media-inspector-marker-label ' +
                  (leftAlign ? 'media-inspector-label-left' : 'media-inspector-label-right'))
          .textContent = expression.value() + expression.unit();
    }

    return result;
  }
}

export const enum Section {
  MAX = 0,
  MIN_MAX = 1,
  MIN = 2,
}

export class MediaQueryUIModel {
  private cssMedia: SDK.CSSMedia.CSSMedia;
  private readonly minWidthExpressionInternal: SDK.CSSMedia.CSSMediaQueryExpression|null;
  private readonly maxWidthExpressionInternal: SDK.CSSMedia.CSSMediaQueryExpression|null;
  private readonly activeInternal: boolean;
  private readonly sectionInternal: Section;
  private rawLocationInternal?: SDK.CSSModel.CSSLocation|null;
  constructor(
      cssMedia: SDK.CSSMedia.CSSMedia, minWidthExpression: SDK.CSSMedia.CSSMediaQueryExpression|null,
      maxWidthExpression: SDK.CSSMedia.CSSMediaQueryExpression|null, active: boolean) {
    this.cssMedia = cssMedia;
    this.minWidthExpressionInternal = minWidthExpression;
    this.maxWidthExpressionInternal = maxWidthExpression;
    this.activeInternal = active;
    if (maxWidthExpression && !minWidthExpression) {
      this.sectionInternal = Section.MAX;
    } else if (minWidthExpression && maxWidthExpression) {
      this.sectionInternal = Section.MIN_MAX;
    } else {
      this.sectionInternal = Section.MIN;
    }
  }

  static createFromMediaQuery(cssMedia: SDK.CSSMedia.CSSMedia, mediaQuery: SDK.CSSMedia.CSSMediaQuery):
      MediaQueryUIModel|null {
    let maxWidthExpression: SDK.CSSMedia.CSSMediaQueryExpression|null = null;
    let maxWidthPixels: number = Number.MAX_VALUE;
    let minWidthExpression: SDK.CSSMedia.CSSMediaQueryExpression|null = null;
    let minWidthPixels: number = Number.MIN_VALUE;
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
      } else if (feature.startsWith('min-') && pixels && pixels > minWidthPixels) {
        minWidthExpression = expression;
        minWidthPixels = pixels;
      }
    }
    if (minWidthPixels > maxWidthPixels || (!maxWidthExpression && !minWidthExpression)) {
      return null;
    }

    return new MediaQueryUIModel(cssMedia, minWidthExpression, maxWidthExpression, mediaQuery.active());
  }

  equals(other: MediaQueryUIModel): boolean {
    return this.compareTo(other) === 0;
  }

  dimensionsEqual(other: MediaQueryUIModel): boolean {
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

  compareTo(other: MediaQueryUIModel): number {
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

    if (this.section() === Section.MAX) {
      return otherMaxLength - thisMaxLength;
    }
    if (this.section() === Section.MIN) {
      return thisMinLength - otherMinLength;
    }
    return thisMinLength - otherMinLength || otherMaxLength - thisMaxLength;
  }

  section(): Section {
    return this.sectionInternal;
  }

  mediaText(): string {
    return this.cssMedia.text || '';
  }

  rawLocation(): SDK.CSSModel.CSSLocation|null {
    if (!this.rawLocationInternal) {
      this.rawLocationInternal = this.cssMedia.rawLocation();
    }
    return this.rawLocationInternal;
  }

  minWidthExpression(): SDK.CSSMedia.CSSMediaQueryExpression|null {
    return this.minWidthExpressionInternal;
  }

  maxWidthExpression(): SDK.CSSMedia.CSSMediaQueryExpression|null {
    return this.maxWidthExpressionInternal;
  }

  active(): boolean {
    return this.activeInternal;
  }
}
