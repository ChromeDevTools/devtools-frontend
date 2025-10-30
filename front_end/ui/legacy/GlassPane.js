import glassPaneStyles from './glassPane.css.js';
import { deepElementFromEvent, measuredScrollbarWidth } from './UIUtils.js';
import { Widget } from './Widget.js';
export class GlassPane {
    #widget;
    element;
    contentElement;
    onMouseDownBound;
    onClickOutsideCallback = null;
    #onHideCallback = null;
    maxSize = null;
    positionX = null;
    positionY = null;
    anchorBox = null;
    anchorBehavior = "PreferTop" /* AnchorBehavior.PREFER_TOP */;
    sizeBehavior = "SetExactSize" /* SizeBehavior.SET_EXACT_SIZE */;
    marginBehavior = "DefaultMargin" /* MarginBehavior.DEFAULT_MARGIN */;
    #ignoreLeftMargin = false;
    constructor(jslog) {
        this.#widget = new Widget({ jslog, useShadowDom: true });
        this.#widget.markAsRoot();
        this.#widget.onDetach = this.#onDetach.bind(this);
        this.element = this.#widget.element;
        this.contentElement = this.#widget.contentElement;
        this.registerRequiredCSS(glassPaneStyles);
        this.setPointerEventsBehavior("PierceGlassPane" /* PointerEventsBehavior.PIERCE_GLASS_PANE */);
        this.onMouseDownBound = this.onMouseDown.bind(this);
    }
    setJsLog(jslog) {
        this.contentElement.setAttribute('jslog', jslog);
    }
    isShowing() {
        return this.#widget.isShowing();
    }
    registerRequiredCSS(...cssFiles) {
        this.#widget.registerRequiredCSS(...cssFiles);
    }
    setDefaultFocusedElement(element) {
        this.#widget.setDefaultFocusedElement(element);
    }
    setDimmed(dimmed) {
        this.element.classList.toggle('dimmed-pane', dimmed);
    }
    setPointerEventsBehavior(pointerEventsBehavior) {
        this.element.classList.toggle('no-pointer-events', pointerEventsBehavior !== "BlockedByGlassPane" /* PointerEventsBehavior.BLOCKED_BY_GLASS_PANE */);
        this.contentElement.classList.toggle('no-pointer-events', pointerEventsBehavior === "PierceContents" /* PointerEventsBehavior.PIERCE_CONTENTS */);
    }
    setOutsideClickCallback(callback) {
        this.onClickOutsideCallback = callback;
    }
    setOnHideCallback(cb) {
        this.#onHideCallback = cb;
    }
    setMaxContentSize(size) {
        this.maxSize = size;
        this.positionContent();
    }
    setSizeBehavior(sizeBehavior) {
        this.sizeBehavior = sizeBehavior;
        this.positionContent();
    }
    setContentPosition(x, y) {
        this.positionX = x;
        this.positionY = y;
        this.positionContent();
    }
    setContentAnchorBox(anchorBox) {
        this.anchorBox = anchorBox;
        this.positionContent();
    }
    setAnchorBehavior(behavior) {
        this.anchorBehavior = behavior;
    }
    setMarginBehavior(behavior) {
        this.marginBehavior = behavior;
    }
    setIgnoreLeftMargin(ignore) {
        this.#ignoreLeftMargin = ignore;
    }
    show(document) {
        if (this.isShowing()) {
            return;
        }
        // TODO(crbug.com/1006759): Extract the magic number
        // Deliberately starts with 3000 to hide other z-indexed elements below.
        this.element.style.zIndex = `${3000 + 1000 * panes.size}`;
        this.element.setAttribute('data-devtools-glass-pane', '');
        document.body.addEventListener('mousedown', this.onMouseDownBound, true);
        document.body.addEventListener('pointerdown', this.onMouseDownBound, true);
        this.#widget.show(document.body);
        panes.add(this);
        this.positionContent();
    }
    hide() {
        if (!this.isShowing()) {
            return;
        }
        this.#widget.detach();
        if (this.#onHideCallback) {
            this.#onHideCallback();
        }
    }
    #onDetach() {
        panes.delete(this);
        this.element.ownerDocument.body.removeEventListener('mousedown', this.onMouseDownBound, true);
        this.element.ownerDocument.body.removeEventListener('pointerdown', this.onMouseDownBound, true);
    }
    onMouseDown(event) {
        if (!this.onClickOutsideCallback) {
            return;
        }
        const node = deepElementFromEvent(event);
        if (!node || this.contentElement.isSelfOrAncestor(node)) {
            return;
        }
        this.onClickOutsideCallback.call(null, event);
    }
    positionContent() {
        if (!this.isShowing()) {
            return;
        }
        const gutterSize = this.marginBehavior === "NoMargin" /* MarginBehavior.NO_MARGIN */ ? 0 : 3;
        const scrollbarSize = measuredScrollbarWidth(this.element.ownerDocument);
        const offsetSize = 10;
        const container = (containers.get((this.element.ownerDocument)));
        if (this.sizeBehavior === "MeasureContent" /* SizeBehavior.MEASURE_CONTENT */) {
            this.contentElement.positionAt(0, 0);
            this.contentElement.style.width = '';
            this.contentElement.style.maxWidth = '';
            this.contentElement.style.height = '';
            this.contentElement.style.maxHeight = '';
        }
        const containerWidth = container.offsetWidth;
        const containerHeight = container.offsetHeight;
        let width = containerWidth - gutterSize * 2;
        let height = containerHeight - gutterSize * 2;
        let positionX = gutterSize;
        let positionY = gutterSize;
        if (this.maxSize) {
            width = Math.min(width, this.maxSize.width);
            height = Math.min(height, this.maxSize.height);
        }
        if (this.sizeBehavior === "MeasureContent" /* SizeBehavior.MEASURE_CONTENT */) {
            const measuredRect = this.contentElement.getBoundingClientRect();
            const widthOverflow = height < measuredRect.height ? scrollbarSize : 0;
            const heightOverflow = width < measuredRect.width ? scrollbarSize : 0;
            width = Math.min(width, measuredRect.width + widthOverflow);
            height = Math.min(height, measuredRect.height + heightOverflow);
        }
        if (this.anchorBox) {
            const anchorBox = this.anchorBox.relativeToElement(container);
            let behavior = this.anchorBehavior;
            if (behavior === "PreferTop" /* AnchorBehavior.PREFER_TOP */ || behavior === "PreferBottom" /* AnchorBehavior.PREFER_BOTTOM */) {
                const top = anchorBox.y - 2 * gutterSize;
                const bottom = containerHeight - anchorBox.y - anchorBox.height - 2 * gutterSize;
                if (behavior === "PreferTop" /* AnchorBehavior.PREFER_TOP */ && top < height && bottom > top) {
                    behavior = "PreferBottom" /* AnchorBehavior.PREFER_BOTTOM */;
                }
                if (behavior === "PreferBottom" /* AnchorBehavior.PREFER_BOTTOM */ && bottom < height && top > bottom) {
                    behavior = "PreferTop" /* AnchorBehavior.PREFER_TOP */;
                }
                let enoughHeight = true;
                if (behavior === "PreferTop" /* AnchorBehavior.PREFER_TOP */) {
                    positionY = Math.max(gutterSize, anchorBox.y - height - gutterSize);
                    const spaceTop = anchorBox.y - positionY - gutterSize;
                    if (this.sizeBehavior === "MeasureContent" /* SizeBehavior.MEASURE_CONTENT */) {
                        if (height > spaceTop) {
                            enoughHeight = false;
                        }
                    }
                    else {
                        height = Math.min(height, spaceTop);
                    }
                }
                else {
                    positionY = anchorBox.y + anchorBox.height + gutterSize;
                    const spaceBottom = containerHeight - positionY - gutterSize;
                    if (this.sizeBehavior === "MeasureContent" /* SizeBehavior.MEASURE_CONTENT */) {
                        if (height > spaceBottom) {
                            positionY = containerHeight - gutterSize - height;
                            enoughHeight = false;
                        }
                    }
                    else {
                        height = Math.min(height, spaceBottom);
                    }
                }
                const naturalPositionX = Math.min(anchorBox.x, containerWidth - width - gutterSize);
                positionX = Math.max(gutterSize, naturalPositionX);
                if (this.#ignoreLeftMargin && gutterSize > naturalPositionX) {
                    positionX = 0;
                }
                if (!enoughHeight) {
                    positionX = Math.min(positionX + offsetSize, containerWidth - width - gutterSize);
                }
                else if (positionX - offsetSize >= gutterSize) {
                    positionX -= offsetSize;
                }
                width = Math.min(width, containerWidth - positionX - gutterSize);
            }
            else {
                const left = anchorBox.x - 2 * gutterSize;
                const right = containerWidth - anchorBox.x - anchorBox.width - 2 * gutterSize;
                if (behavior === "PreferLeft" /* AnchorBehavior.PREFER_LEFT */ && left < width && right > left) {
                    behavior = "PreferRight" /* AnchorBehavior.PREFER_RIGHT */;
                }
                if (behavior === "PreferRight" /* AnchorBehavior.PREFER_RIGHT */ && right < width && left > right) {
                    behavior = "PreferLeft" /* AnchorBehavior.PREFER_LEFT */;
                }
                let enoughWidth = true;
                if (behavior === "PreferLeft" /* AnchorBehavior.PREFER_LEFT */) {
                    positionX = Math.max(gutterSize, anchorBox.x - width - gutterSize);
                    const spaceLeft = anchorBox.x - positionX - gutterSize;
                    if (this.sizeBehavior === "MeasureContent" /* SizeBehavior.MEASURE_CONTENT */) {
                        if (width > spaceLeft) {
                            enoughWidth = false;
                        }
                    }
                    else {
                        width = Math.min(width, spaceLeft);
                    }
                }
                else {
                    positionX = anchorBox.x + anchorBox.width + gutterSize;
                    const spaceRight = containerWidth - positionX - gutterSize;
                    if (this.sizeBehavior === "MeasureContent" /* SizeBehavior.MEASURE_CONTENT */) {
                        if (width > spaceRight) {
                            positionX = containerWidth - gutterSize - width;
                            enoughWidth = false;
                        }
                    }
                    else {
                        width = Math.min(width, spaceRight);
                    }
                }
                positionY = Math.max(gutterSize, Math.min(anchorBox.y, containerHeight - height - gutterSize));
                if (!enoughWidth) {
                    positionY = Math.min(positionY + offsetSize, containerHeight - height - gutterSize);
                }
                else if (positionY - offsetSize >= gutterSize) {
                    positionY -= offsetSize;
                }
                height = Math.min(height, containerHeight - positionY - gutterSize);
            }
        }
        else {
            positionX = this.positionX !== null ? this.positionX : (containerWidth - width) / 2;
            positionY = this.positionY !== null ? this.positionY : (containerHeight - height) / 2;
            width = Math.min(width, containerWidth - positionX - gutterSize);
            height = Math.min(height, containerHeight - positionY - gutterSize);
        }
        this.contentElement.style.width = width + 'px';
        if (this.sizeBehavior === "SetExactWidthMaxHeight" /* SizeBehavior.SET_EXACT_WIDTH_MAX_HEIGHT */) {
            this.contentElement.style.maxHeight = height + 'px';
        }
        else {
            this.contentElement.style.height = height + 'px';
        }
        this.contentElement.positionAt(positionX, positionY, container);
        this.#widget.doResize();
    }
    widget() {
        return this.#widget;
    }
    static setContainer(element) {
        containers.set((element.ownerDocument), element);
        GlassPane.containerMoved(element);
    }
    static container(document) {
        return containers.get(document);
    }
    static containerMoved(element) {
        for (const pane of panes) {
            if (pane.isShowing() && pane.element.ownerDocument === element.ownerDocument) {
                pane.positionContent();
            }
        }
    }
}
const containers = new Map();
const panes = new Set();
/** Exported for layout tests. **/
export const GlassPanePanes = panes;
//# sourceMappingURL=GlassPane.js.map