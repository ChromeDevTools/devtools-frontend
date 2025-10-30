// Copyright 2012 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as Geometry from '../../models/geometry/geometry.js';
import * as VisualLogging from '../visual_logging/visual_logging.js';
import * as ARIAUtils from './ARIAUtils.js';
import { SimpleResizerWidget } from './ResizerWidget.js';
import splitWidgetStyles from './splitWidget.css.js';
import { ToolbarButton } from './Toolbar.js';
import { Widget, WidgetElement } from './Widget.js';
import { ZoomManager } from './ZoomManager.js';
export class SplitWidget extends Common.ObjectWrapper.eventMixin(Widget) {
    #sidebarElement;
    #mainElement;
    #resizerElement;
    #resizerElementSize = null;
    #resizerWidget;
    #defaultSidebarWidth;
    #defaultSidebarHeight;
    #constraintsInDip;
    #resizeStartSizeDIP = 0;
    // TODO: Used in WebTests
    setting;
    #totalSizeCSS = 0;
    #totalSizeOtherDimensionCSS = 0;
    #mainWidget = null;
    #sidebarWidget = null;
    #animationFrameHandle = 0;
    #animationCallback = null;
    #showSidebarButtonTitle = Common.UIString.LocalizedEmptyString;
    #hideSidebarButtonTitle = Common.UIString.LocalizedEmptyString;
    #shownSidebarString = Common.UIString.LocalizedEmptyString;
    #hiddenSidebarString = Common.UIString.LocalizedEmptyString;
    #showHideSidebarButton = null;
    #isVertical = false;
    #sidebarMinimized = false;
    #detaching = false;
    #sidebarSizeDIP = -1;
    #savedSidebarSizeDIP;
    #secondIsSidebar = false;
    #shouldSaveShowMode = false;
    #savedVerticalMainSize = null;
    #savedHorizontalMainSize = null;
    #showMode = "Both" /* ShowMode.BOTH */;
    #savedShowMode;
    #autoAdjustOrientation = false;
    constructor(isVertical, secondIsSidebar, settingName, defaultSidebarWidth, defaultSidebarHeight, constraintsInDip, element) {
        super(element, { useShadowDom: true });
        this.element.classList.add('split-widget');
        this.registerRequiredCSS(splitWidgetStyles);
        this.contentElement.classList.add('shadow-split-widget');
        this.#sidebarElement =
            this.contentElement.createChild('div', 'shadow-split-widget-contents shadow-split-widget-sidebar vbox');
        this.#mainElement =
            this.contentElement.createChild('div', 'shadow-split-widget-contents shadow-split-widget-main vbox');
        const mainSlot = this.#mainElement.createChild('slot');
        mainSlot.name = 'main';
        mainSlot.addEventListener('slotchange', (_) => {
            const assignedNode = mainSlot.assignedNodes()[0];
            const widget = assignedNode instanceof HTMLElement ? Widget.getOrCreateWidget(assignedNode) : null;
            if (widget && widget !== this.#mainWidget) {
                this.setMainWidget(widget);
            }
        });
        const sidebarSlot = this.#sidebarElement.createChild('slot');
        sidebarSlot.name = 'sidebar';
        sidebarSlot.addEventListener('slotchange', (_) => {
            const assignedNode = sidebarSlot.assignedNodes()[0];
            const widget = assignedNode instanceof HTMLElement ? Widget.getOrCreateWidget(assignedNode) : null;
            if (widget && widget !== this.#sidebarWidget) {
                this.setSidebarWidget(widget);
            }
        });
        this.#resizerElement = this.contentElement.createChild('div', 'shadow-split-widget-resizer');
        this.#resizerWidget = new SimpleResizerWidget();
        this.#resizerWidget.setEnabled(true);
        this.#resizerWidget.addEventListener("ResizeStart" /* ResizerWidgetEvents.RESIZE_START */, this.#onResizeStart, this);
        this.#resizerWidget.addEventListener("ResizeUpdatePosition" /* ResizerWidgetEvents.RESIZE_UPDATE_POSITION */, this.#onResizeUpdate, this);
        this.#resizerWidget.addEventListener("ResizeEnd" /* ResizerWidgetEvents.RESIZE_END */, this.#onResizeEnd, this);
        this.#defaultSidebarWidth = defaultSidebarWidth || 200;
        this.#defaultSidebarHeight = defaultSidebarHeight || this.#defaultSidebarWidth;
        this.#constraintsInDip = Boolean(constraintsInDip);
        this.setting = settingName ? Common.Settings.Settings.instance().createSetting(settingName, {}) : null;
        this.#savedSidebarSizeDIP = this.#sidebarSizeDIP;
        this.setSecondIsSidebar(secondIsSidebar);
        this.#setVertical(isVertical);
        this.#savedShowMode = this.#showMode;
        // Should be called after isVertical has the right value.
        this.installResizer(this.#resizerElement);
    }
    isVertical() {
        return this.#isVertical;
    }
    setVertical(isVertical) {
        if (this.#isVertical === isVertical) {
            return;
        }
        this.#setVertical(isVertical);
        if (this.isShowing()) {
            this.#updateLayout();
        }
    }
    setAutoAdjustOrientation(autoAdjustOrientation) {
        this.#autoAdjustOrientation = autoAdjustOrientation;
        this.#maybeAutoAdjustOrientation();
    }
    #setVertical(isVertical) {
        this.contentElement.classList.toggle('vbox', !isVertical);
        this.contentElement.classList.toggle('hbox', isVertical);
        this.#isVertical = isVertical;
        this.#resizerElementSize = null;
        this.#sidebarSizeDIP = -1;
        this.#restoreSidebarSizeFromSettings();
        if (this.#shouldSaveShowMode) {
            this.#restoreAndApplyShowModeFromSettings();
        }
        this.#updateShowHideSidebarButton();
        // FIXME: reverse SplitWidget.isVertical meaning.
        this.#resizerWidget.setVertical(!isVertical);
        this.invalidateConstraints();
    }
    #updateLayout(animate) {
        this.#totalSizeCSS = 0; // Lazy update.
        this.#totalSizeOtherDimensionCSS = 0;
        // Remove properties that might affect total size calculation.
        this.#mainElement.style.removeProperty('width');
        this.#mainElement.style.removeProperty('height');
        this.#sidebarElement.style.removeProperty('width');
        this.#sidebarElement.style.removeProperty('height');
        this.#setSidebarSizeDIP(this.#preferredSidebarSizeDIP(), Boolean(animate));
    }
    setMainWidget(widget) {
        if (this.#mainWidget === widget) {
            return;
        }
        this.suspendInvalidations();
        if (this.#mainWidget) {
            this.#mainWidget.detach();
        }
        this.#mainWidget = widget;
        if (widget) {
            widget.element.slot = 'main';
            if (this.#showMode === "OnlyMain" /* ShowMode.ONLY_MAIN */ || this.#showMode === "Both" /* ShowMode.BOTH */) {
                widget.show(this.element);
            }
        }
        this.resumeInvalidations();
    }
    setSidebarWidget(widget) {
        if (this.#sidebarWidget === widget) {
            return;
        }
        this.suspendInvalidations();
        if (this.#sidebarWidget) {
            this.#sidebarWidget.detach();
        }
        this.#sidebarWidget = widget;
        if (widget) {
            widget.element.slot = 'sidebar';
            if (this.#showMode === "OnlySidebar" /* ShowMode.ONLY_SIDEBAR */ || this.#showMode === "Both" /* ShowMode.BOTH */) {
                widget.show(this.element);
            }
        }
        this.resumeInvalidations();
    }
    mainWidget() {
        return this.#mainWidget;
    }
    sidebarWidget() {
        return this.#sidebarWidget;
    }
    sidebarElement() {
        return this.#sidebarElement;
    }
    childWasDetached(widget) {
        if (this.#detaching) {
            return;
        }
        if (this.#mainWidget === widget) {
            this.#mainWidget = null;
        }
        if (this.#sidebarWidget === widget) {
            this.#sidebarWidget = null;
        }
        this.invalidateConstraints();
    }
    isSidebarSecond() {
        return this.#secondIsSidebar;
    }
    enableShowModeSaving() {
        this.#shouldSaveShowMode = true;
        this.#restoreAndApplyShowModeFromSettings();
    }
    showMode() {
        return this.#showMode;
    }
    sidebarIsShowing() {
        return this.#showMode !== "OnlyMain" /* ShowMode.ONLY_MAIN */;
    }
    setSecondIsSidebar(secondIsSidebar) {
        if (secondIsSidebar === this.#secondIsSidebar) {
            return;
        }
        this.#secondIsSidebar = secondIsSidebar;
        if (!this.#mainWidget?.shouldHideOnDetach()) {
            if (secondIsSidebar) {
                this.contentElement.insertBefore(this.#mainElement, this.#sidebarElement);
            }
            else {
                this.contentElement.insertBefore(this.#mainElement, this.#resizerElement);
            }
        }
        else if (!this.#sidebarWidget?.shouldHideOnDetach()) {
            if (secondIsSidebar) {
                this.contentElement.insertBefore(this.#sidebarElement, this.#resizerElement);
            }
            else {
                this.contentElement.insertBefore(this.#sidebarElement, this.#mainElement);
            }
        }
        else {
            console.error('Could not swap split widget side. Both children widgets contain iframes.');
            this.#secondIsSidebar = !secondIsSidebar;
        }
    }
    resizerElement() {
        return this.#resizerElement;
    }
    hideMain(animate) {
        this.#showOnly(this.#sidebarWidget, this.#mainWidget, this.#sidebarElement, this.#mainElement, animate);
        this.#updateShowMode("OnlySidebar" /* ShowMode.ONLY_SIDEBAR */);
    }
    hideSidebar(animate) {
        this.#showOnly(this.#mainWidget, this.#sidebarWidget, this.#mainElement, this.#sidebarElement, animate);
        this.#updateShowMode("OnlyMain" /* ShowMode.ONLY_MAIN */);
    }
    setSidebarMinimized(minimized) {
        this.#sidebarMinimized = minimized;
        this.invalidateConstraints();
    }
    isSidebarMinimized() {
        return this.#sidebarMinimized;
    }
    #showOnly(sideToShow, sideToHide, shadowToShow, shadowToHide, animate) {
        this.#cancelAnimation();
        function callback() {
            if (sideToShow) {
                // Make sure main is first in the children list.
                if (sideToShow === this.#mainWidget) {
                    this.#mainWidget.show(this.element, this.#sidebarWidget ? this.#sidebarWidget.element : null);
                }
                else if (this.#sidebarWidget) {
                    this.#sidebarWidget.show(this.element);
                }
            }
            if (sideToHide) {
                this.#detaching = true;
                sideToHide.detach();
                this.#detaching = false;
            }
            this.#resizerElement.classList.add('hidden');
            shadowToShow.classList.remove('hidden');
            shadowToShow.classList.add('maximized');
            shadowToHide.classList.add('hidden');
            shadowToHide.classList.remove('maximized');
            this.#removeAllLayoutProperties();
            this.doResize();
            this.showFinishedForTest();
        }
        if (animate) {
            this.#animate(true, callback.bind(this));
        }
        else {
            callback.call(this);
        }
        this.#sidebarSizeDIP = -1;
        this.setResizable(false);
    }
    showFinishedForTest() {
        // This method is sniffed in tests.
    }
    #removeAllLayoutProperties() {
        this.#sidebarElement.style.removeProperty('flexBasis');
        this.#mainElement.style.removeProperty('width');
        this.#mainElement.style.removeProperty('height');
        this.#sidebarElement.style.removeProperty('width');
        this.#sidebarElement.style.removeProperty('height');
        this.#resizerElement.style.removeProperty('left');
        this.#resizerElement.style.removeProperty('right');
        this.#resizerElement.style.removeProperty('top');
        this.#resizerElement.style.removeProperty('bottom');
        this.#resizerElement.style.removeProperty('margin-left');
        this.#resizerElement.style.removeProperty('margin-right');
        this.#resizerElement.style.removeProperty('margin-top');
        this.#resizerElement.style.removeProperty('margin-bottom');
    }
    showBoth(animate) {
        if (this.#showMode === "Both" /* ShowMode.BOTH */) {
            animate = false;
        }
        this.#cancelAnimation();
        this.#mainElement.classList.remove('maximized', 'hidden');
        this.#sidebarElement.classList.remove('maximized', 'hidden');
        this.#resizerElement.classList.remove('hidden');
        this.setResizable(true);
        // Make sure main is the first in the children list.
        this.suspendInvalidations();
        if (this.#sidebarWidget) {
            this.#sidebarWidget.show(this.element);
        }
        if (this.#mainWidget) {
            this.#mainWidget.show(this.element, this.#sidebarWidget ? this.#sidebarWidget.element : null);
        }
        this.resumeInvalidations();
        // Order widgets in DOM properly.
        this.setSecondIsSidebar(this.#secondIsSidebar);
        this.#sidebarSizeDIP = -1;
        this.#updateShowMode("Both" /* ShowMode.BOTH */);
        this.#updateLayout(animate);
    }
    setResizable(resizable) {
        this.#resizerWidget.setEnabled(resizable);
    }
    // Currently unused
    forceSetSidebarWidth(width) {
        this.#defaultSidebarWidth = width;
        this.#savedSidebarSizeDIP = width;
        this.#updateLayout();
    }
    isResizable() {
        return this.#resizerWidget.isEnabled();
    }
    setSidebarSize(size) {
        const sizeDIP = ZoomManager.instance().cssToDIP(size);
        this.#savedSidebarSizeDIP = sizeDIP;
        this.#saveSetting();
        this.#setSidebarSizeDIP(sizeDIP, false, true);
    }
    sidebarSize() {
        const sizeDIP = Math.max(0, this.#sidebarSizeDIP);
        return ZoomManager.instance().dipToCSS(sizeDIP);
    }
    totalSize() {
        const sizeDIP = Math.max(0, this.#totalSizeDIP());
        return ZoomManager.instance().dipToCSS(sizeDIP);
    }
    /**
     * Returns total size in DIP.
     */
    #totalSizeDIP() {
        if (!this.#totalSizeCSS) {
            this.#totalSizeCSS = this.#isVertical ? this.contentElement.offsetWidth : this.contentElement.offsetHeight;
            this.#totalSizeOtherDimensionCSS =
                this.#isVertical ? this.contentElement.offsetHeight : this.contentElement.offsetWidth;
        }
        return ZoomManager.instance().cssToDIP(this.#totalSizeCSS);
    }
    #updateShowMode(showMode) {
        this.#showMode = showMode;
        this.#saveShowModeToSettings();
        this.#updateShowHideSidebarButton();
        this.dispatchEventToListeners("ShowModeChanged" /* Events.SHOW_MODE_CHANGED */, showMode);
        this.invalidateConstraints();
    }
    #setSidebarSizeDIP(sizeDIP, animate, userAction) {
        if (this.#showMode !== "Both" /* ShowMode.BOTH */ || !this.isShowing()) {
            return;
        }
        sizeDIP = this.#applyConstraints(sizeDIP, userAction);
        if (this.#sidebarSizeDIP === sizeDIP) {
            return;
        }
        if (!this.#resizerElementSize) {
            this.#resizerElementSize =
                this.#isVertical ? this.#resizerElement.offsetWidth : this.#resizerElement.offsetHeight;
        }
        // Invalidate layout below.
        this.#removeAllLayoutProperties();
        // this.#totalSizeDIP is available below since we successfully applied constraints.
        const roundSizeCSS = Math.round(ZoomManager.instance().dipToCSS(sizeDIP));
        const sidebarSizeValue = roundSizeCSS + 'px';
        const mainSizeValue = (this.#totalSizeCSS - roundSizeCSS) + 'px';
        this.#sidebarElement.style.flexBasis = sidebarSizeValue;
        // Make both sides relayout boundaries.
        if (this.#isVertical) {
            this.#sidebarElement.style.width = sidebarSizeValue;
            this.#mainElement.style.width = mainSizeValue;
            this.#sidebarElement.style.height = this.#totalSizeOtherDimensionCSS + 'px';
            this.#mainElement.style.height = this.#totalSizeOtherDimensionCSS + 'px';
        }
        else {
            this.#sidebarElement.style.height = sidebarSizeValue;
            this.#mainElement.style.height = mainSizeValue;
            this.#sidebarElement.style.width = this.#totalSizeOtherDimensionCSS + 'px';
            this.#mainElement.style.width = this.#totalSizeOtherDimensionCSS + 'px';
        }
        // Position resizer.
        if (this.#isVertical) {
            if (this.#secondIsSidebar) {
                this.#resizerElement.style.right = sidebarSizeValue;
                this.#resizerElement.style.marginRight = -this.#resizerElementSize / 2 + 'px';
            }
            else {
                this.#resizerElement.style.left = sidebarSizeValue;
                this.#resizerElement.style.marginLeft = -this.#resizerElementSize / 2 + 'px';
            }
        }
        else if (this.#secondIsSidebar) {
            this.#resizerElement.style.bottom = sidebarSizeValue;
            this.#resizerElement.style.marginBottom = -this.#resizerElementSize / 2 + 'px';
        }
        else {
            this.#resizerElement.style.top = sidebarSizeValue;
            this.#resizerElement.style.marginTop = -this.#resizerElementSize / 2 + 'px';
        }
        this.#sidebarSizeDIP = sizeDIP;
        // Force layout.
        if (animate) {
            this.#animate(false);
        }
        else {
            // No need to recalculate this.sidebarSizeDIP and this.#totalSizeDIP again.
            this.doResize();
            this.dispatchEventToListeners("SidebarSizeChanged" /* Events.SIDEBAR_SIZE_CHANGED */, this.sidebarSize());
        }
    }
    #animate(reverse, callback) {
        const animationTime = 50;
        this.#animationCallback = callback || null;
        let animatedMarginPropertyName;
        if (this.#isVertical) {
            animatedMarginPropertyName = this.#secondIsSidebar ? 'margin-right' : 'margin-left';
        }
        else {
            animatedMarginPropertyName = this.#secondIsSidebar ? 'margin-bottom' : 'margin-top';
        }
        const marginFrom = reverse ? '0' : '-' + ZoomManager.instance().dipToCSS(this.#sidebarSizeDIP) + 'px';
        const marginTo = reverse ? '-' + ZoomManager.instance().dipToCSS(this.#sidebarSizeDIP) + 'px' : '0';
        // This order of things is important.
        // 1. Resize main element early and force layout.
        this.contentElement.style.setProperty(animatedMarginPropertyName, marginFrom);
        this.contentElement.style.setProperty('overflow', 'hidden');
        if (!reverse) {
            suppressUnused(this.#mainElement.offsetWidth);
            suppressUnused(this.#sidebarElement.offsetWidth);
        }
        // 2. Issue onresize to the sidebar element, its size won't change.
        if (!reverse && this.#sidebarWidget) {
            this.#sidebarWidget.doResize();
        }
        // 3. Configure and run animation
        this.contentElement.style.setProperty('transition', animatedMarginPropertyName + ' ' + animationTime + 'ms linear');
        const boundAnimationFrame = animationFrame.bind(this);
        let startTime = null;
        function animationFrame() {
            this.#animationFrameHandle = 0;
            if (!startTime) {
                // Kick animation on first frame.
                this.contentElement.style.setProperty(animatedMarginPropertyName, marginTo);
                startTime = window.performance.now();
            }
            else if (window.performance.now() < startTime + animationTime) {
                // Process regular animation frame.
                if (this.#mainWidget) {
                    this.#mainWidget.doResize();
                }
            }
            else {
                // Complete animation.
                this.#cancelAnimation();
                if (this.#mainWidget) {
                    this.#mainWidget.doResize();
                }
                this.dispatchEventToListeners("SidebarSizeChanged" /* Events.SIDEBAR_SIZE_CHANGED */, this.sidebarSize());
                return;
            }
            this.#animationFrameHandle = this.contentElement.window().requestAnimationFrame(boundAnimationFrame);
        }
        this.#animationFrameHandle = this.contentElement.window().requestAnimationFrame(boundAnimationFrame);
    }
    #cancelAnimation() {
        this.contentElement.style.removeProperty('margin-top');
        this.contentElement.style.removeProperty('margin-right');
        this.contentElement.style.removeProperty('margin-bottom');
        this.contentElement.style.removeProperty('margin-left');
        this.contentElement.style.removeProperty('transition');
        this.contentElement.style.removeProperty('overflow');
        if (this.#animationFrameHandle) {
            this.contentElement.window().cancelAnimationFrame(this.#animationFrameHandle);
            this.#animationFrameHandle = 0;
        }
        if (this.#animationCallback) {
            this.#animationCallback();
            this.#animationCallback = null;
        }
    }
    #applyConstraints(sidebarSize, userAction) {
        const totalSize = this.#totalSizeDIP();
        const zoomFactor = this.#constraintsInDip ? 1 : ZoomManager.instance().zoomFactor();
        let constraints = this.#sidebarWidget ? this.#sidebarWidget.constraints() : new Geometry.Constraints();
        let minSidebarSize = this.isVertical() ? constraints.minimum.width : constraints.minimum.height;
        if (!minSidebarSize) {
            minSidebarSize = MinPadding;
        }
        minSidebarSize *= zoomFactor;
        if (this.#sidebarMinimized) {
            sidebarSize = minSidebarSize;
        }
        let preferredSidebarSize = this.isVertical() ? constraints.preferred.width : constraints.preferred.height;
        if (!preferredSidebarSize) {
            preferredSidebarSize = MinPadding;
        }
        preferredSidebarSize *= zoomFactor;
        // Allow sidebar to be less than preferred by explicit user action.
        if (sidebarSize < preferredSidebarSize) {
            preferredSidebarSize = Math.max(sidebarSize, minSidebarSize);
        }
        preferredSidebarSize += zoomFactor; // 1 css pixel for splitter border.
        constraints = this.#mainWidget ? this.#mainWidget.constraints() : new Geometry.Constraints();
        let minMainSize = this.isVertical() ? constraints.minimum.width : constraints.minimum.height;
        if (!minMainSize) {
            minMainSize = MinPadding;
        }
        minMainSize *= zoomFactor;
        let preferredMainSize = this.isVertical() ? constraints.preferred.width : constraints.preferred.height;
        if (!preferredMainSize) {
            preferredMainSize = MinPadding;
        }
        preferredMainSize *= zoomFactor;
        const savedMainSize = this.isVertical() ? this.#savedVerticalMainSize : this.#savedHorizontalMainSize;
        if (savedMainSize !== null) {
            preferredMainSize = Math.min(preferredMainSize, savedMainSize * zoomFactor);
        }
        if (userAction) {
            preferredMainSize = minMainSize;
        }
        // Enough space for preferred.
        const totalPreferred = preferredMainSize + preferredSidebarSize;
        if (totalPreferred <= totalSize) {
            return Platform.NumberUtilities.clamp(sidebarSize, preferredSidebarSize, totalSize - preferredMainSize);
        }
        // Enough space for minimum.
        if (minMainSize + minSidebarSize <= totalSize) {
            const delta = totalPreferred - totalSize;
            const sidebarDelta = delta * preferredSidebarSize / totalPreferred;
            sidebarSize = preferredSidebarSize - sidebarDelta;
            return Platform.NumberUtilities.clamp(sidebarSize, minSidebarSize, totalSize - minMainSize);
        }
        // Not enough space even for minimum sizes.
        return Math.max(0, totalSize - minMainSize);
    }
    wasShown() {
        super.wasShown();
        this.#forceUpdateLayout();
        ZoomManager.instance().addEventListener("ZoomChanged" /* ZoomManagerEvents.ZOOM_CHANGED */, this.onZoomChanged, this);
    }
    willHide() {
        super.willHide();
        ZoomManager.instance().removeEventListener("ZoomChanged" /* ZoomManagerEvents.ZOOM_CHANGED */, this.onZoomChanged, this);
    }
    onResize() {
        this.#maybeAutoAdjustOrientation();
        this.#updateLayout();
    }
    onLayout() {
        this.#updateLayout();
    }
    calculateConstraints() {
        if (this.#showMode === "OnlyMain" /* ShowMode.ONLY_MAIN */) {
            return this.#mainWidget ? this.#mainWidget.constraints() : new Geometry.Constraints();
        }
        if (this.#showMode === "OnlySidebar" /* ShowMode.ONLY_SIDEBAR */) {
            return this.#sidebarWidget ? this.#sidebarWidget.constraints() : new Geometry.Constraints();
        }
        let mainConstraints = this.#mainWidget ? this.#mainWidget.constraints() : new Geometry.Constraints();
        let sidebarConstraints = this.#sidebarWidget ? this.#sidebarWidget.constraints() : new Geometry.Constraints();
        const min = MinPadding;
        if (this.#isVertical) {
            mainConstraints = mainConstraints.widthToMax(min).addWidth(1); // 1 for splitter
            sidebarConstraints = sidebarConstraints.widthToMax(min);
            return mainConstraints.addWidth(sidebarConstraints).heightToMax(sidebarConstraints);
        }
        mainConstraints = mainConstraints.heightToMax(min).addHeight(1); // 1 for splitter
        sidebarConstraints = sidebarConstraints.heightToMax(min);
        return mainConstraints.widthToMax(sidebarConstraints).addHeight(sidebarConstraints);
    }
    #maybeAutoAdjustOrientation() {
        if (this.#autoAdjustOrientation) {
            const width = this.isVertical() ? this.#totalSizeCSS : this.#totalSizeOtherDimensionCSS;
            const height = this.isVertical() ? this.#totalSizeOtherDimensionCSS : this.#totalSizeCSS;
            if (width <= 600 && height >= 600) {
                this.setVertical(false);
            }
            else {
                this.setVertical(true);
            }
        }
    }
    #onResizeStart() {
        this.#resizeStartSizeDIP = this.#sidebarSizeDIP;
    }
    #onResizeUpdate(event) {
        const offset = event.data.currentPosition - event.data.startPosition;
        const offsetDIP = ZoomManager.instance().cssToDIP(offset);
        const newSizeDIP = this.#secondIsSidebar ? this.#resizeStartSizeDIP - offsetDIP : this.#resizeStartSizeDIP + offsetDIP;
        const constrainedSizeDIP = this.#applyConstraints(newSizeDIP, true);
        this.#savedSidebarSizeDIP = constrainedSizeDIP;
        this.#saveSetting();
        this.#setSidebarSizeDIP(constrainedSizeDIP, false, true);
        if (this.isVertical()) {
            this.#savedVerticalMainSize = this.#totalSizeDIP() - this.#sidebarSizeDIP;
        }
        else {
            this.#savedHorizontalMainSize = this.#totalSizeDIP() - this.#sidebarSizeDIP;
        }
    }
    #onResizeEnd() {
        this.#resizeStartSizeDIP = 0;
    }
    hideDefaultResizer(noSplitter) {
        this.#resizerElement.classList.toggle('hidden', Boolean(noSplitter));
        this.uninstallResizer(this.#resizerElement);
        this.#sidebarElement.classList.toggle('no-default-splitter', Boolean(noSplitter));
    }
    installResizer(resizerElement) {
        this.#resizerWidget.addElement(resizerElement);
    }
    uninstallResizer(resizerElement) {
        this.#resizerWidget.removeElement(resizerElement);
    }
    toggleResizer(resizer, on) {
        if (on) {
            this.installResizer(resizer);
        }
        else {
            this.uninstallResizer(resizer);
        }
    }
    #settingForOrientation() {
        const state = this.setting ? this.setting.get() : {};
        const orientationState = this.#isVertical ? state.vertical : state.horizontal;
        return orientationState ?? null;
    }
    #preferredSidebarSizeDIP() {
        let size = this.#savedSidebarSizeDIP;
        if (!size) {
            size = this.#isVertical ? this.#defaultSidebarWidth : this.#defaultSidebarHeight;
            // If we have default value in percents, calculate it on first use.
            if (0 < size && size < 1) {
                size *= this.#totalSizeDIP();
            }
        }
        return size;
    }
    #restoreSidebarSizeFromSettings() {
        const settingForOrientation = this.#settingForOrientation();
        this.#savedSidebarSizeDIP = settingForOrientation ? settingForOrientation.size : 0;
    }
    #restoreAndApplyShowModeFromSettings() {
        const orientationState = this.#settingForOrientation();
        this.#savedShowMode = orientationState?.showMode ? orientationState.showMode : this.#showMode;
        this.#showMode = this.#savedShowMode;
        switch (this.#savedShowMode) {
            case "Both" /* ShowMode.BOTH */:
                this.showBoth();
                break;
            case "OnlyMain" /* ShowMode.ONLY_MAIN */:
                this.hideSidebar();
                break;
            case "OnlySidebar" /* ShowMode.ONLY_SIDEBAR */:
                this.hideMain();
                break;
        }
    }
    #saveShowModeToSettings() {
        this.#savedShowMode = this.#showMode;
        this.#saveSetting();
    }
    #saveSetting() {
        if (!this.setting) {
            return;
        }
        const state = this.setting.get();
        const orientationState = (this.#isVertical ? state.vertical : state.horizontal) || {};
        orientationState.size = this.#savedSidebarSizeDIP;
        if (this.#shouldSaveShowMode) {
            orientationState.showMode = this.#savedShowMode;
        }
        if (this.#isVertical) {
            state.vertical = orientationState;
        }
        else {
            state.horizontal = orientationState;
        }
        this.setting.set(state);
    }
    #forceUpdateLayout() {
        // Force layout even if sidebar size does not change.
        this.#sidebarSizeDIP = -1;
        this.#updateLayout();
    }
    onZoomChanged() {
        this.#forceUpdateLayout();
    }
    createShowHideSidebarButton(showTitle, hideTitle, shownString, hiddenString, jslogContext) {
        this.#showSidebarButtonTitle = showTitle;
        this.#hideSidebarButtonTitle = hideTitle;
        this.#shownSidebarString = shownString;
        this.#hiddenSidebarString = hiddenString;
        this.#showHideSidebarButton = new ToolbarButton('', 'right-panel-open');
        this.#showHideSidebarButton.addEventListener("Click" /* ToolbarButton.Events.CLICK */, buttonClicked, this);
        if (jslogContext) {
            this.#showHideSidebarButton.element.setAttribute('jslog', `${VisualLogging.toggleSubpane().track({ click: true }).context(jslogContext)}`);
        }
        this.#updateShowHideSidebarButton();
        function buttonClicked() {
            this.toggleSidebar();
        }
        return this.#showHideSidebarButton;
    }
    /**
     * @returns true if this call makes the sidebar visible, and false otherwise.
     */
    toggleSidebar() {
        if (this.#showMode !== "Both" /* ShowMode.BOTH */) {
            this.showBoth(true);
            ARIAUtils.LiveAnnouncer.alert(this.#shownSidebarString);
            return true;
        }
        this.hideSidebar(true);
        ARIAUtils.LiveAnnouncer.alert(this.#hiddenSidebarString);
        return false;
    }
    #updateShowHideSidebarButton() {
        if (!this.#showHideSidebarButton) {
            return;
        }
        const sidebarHidden = this.#showMode === "OnlyMain" /* ShowMode.ONLY_MAIN */;
        let glyph = '';
        if (sidebarHidden) {
            glyph = this.isVertical() ? (this.isSidebarSecond() ? 'right-panel-open' : 'left-panel-open') :
                (this.isSidebarSecond() ? 'bottom-panel-open' : 'top-panel-open');
        }
        else {
            glyph = this.isVertical() ? (this.isSidebarSecond() ? 'right-panel-close' : 'left-panel-close') :
                (this.isSidebarSecond() ? 'bottom-panel-close' : 'top-panel-close');
        }
        this.#showHideSidebarButton.setGlyph(glyph);
        this.#showHideSidebarButton.setTitle(sidebarHidden ? this.#showSidebarButtonTitle : this.#hideSidebarButtonTitle);
    }
}
export class SplitWidgetElement extends WidgetElement {
    static observedAttributes = ['direction', 'sidebar-position', 'sidebar-initial-size', 'sidebar-visibility'];
    createWidget() {
        const vertical = this.getAttribute('direction') === 'column';
        const autoAdjustOrientation = this.getAttribute('direction') === 'auto';
        const secondIsSidebar = this.getAttribute('sidebar-position') === 'second';
        const settingName = this.getAttribute('name') ?? undefined;
        const sidebarSize = parseInt(this.getAttribute('sidebar-initial-size') || '', 10);
        const defaultSidebarWidth = !isNaN(sidebarSize) ? sidebarSize : undefined;
        const defaultSidebarHeight = !isNaN(sidebarSize) ? sidebarSize : undefined;
        const widget = new SplitWidget(vertical, secondIsSidebar, settingName, defaultSidebarWidth, defaultSidebarHeight, 
        /* constraintsInDip=*/ false, this);
        if (this.getAttribute('sidebar-initial-size') === 'minimized') {
            widget.setSidebarMinimized(true);
        }
        if (autoAdjustOrientation) {
            widget.setAutoAdjustOrientation(true);
        }
        const sidebarHidden = this.getAttribute('sidebar-visibility') === 'hidden';
        if (sidebarHidden) {
            widget.hideSidebar();
        }
        widget.addEventListener("ShowModeChanged" /* Events.SHOW_MODE_CHANGED */, () => {
            this.dispatchEvent(new CustomEvent('change', { detail: widget.showMode() }));
        });
        return widget;
    }
    attributeChangedCallback(name, _oldValue, newValue) {
        const widget = Widget.get(this);
        if (!widget) {
            return;
        }
        if (name === 'direction') {
            widget.setVertical(newValue === 'column');
            widget.setAutoAdjustOrientation(newValue === 'auto');
        }
        else if (name === 'sidebar-position') {
            widget.setSecondIsSidebar(newValue === 'second');
        }
        else if (name === 'sidebar-visibility') {
            if (newValue === 'hidden') {
                widget.hideSidebar();
            }
            else {
                widget.showBoth();
            }
        }
    }
}
customElements.define('devtools-split-view', SplitWidgetElement);
const MinPadding = 20;
const suppressUnused = function (_value) { };
//# sourceMappingURL=SplitWidget.js.map