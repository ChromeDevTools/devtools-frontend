// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';

import type {Size} from './Geometry.js';
import glassPaneStyles from './glassPane.css.legacy.js';
import {deepElementFromEvent, measuredScrollbarWidth} from './UIUtils.js';
import {Widget} from './Widget.js';

export class GlassPane {
  private readonly widgetInternal: Widget;
  element: typeof Widget.prototype.element;
  contentElement: typeof Widget.prototype.contentElement;
  private readonly arrowElement: HTMLSpanElement;
  private readonly onMouseDownBound: (event: Event) => void;
  private onClickOutsideCallback: ((arg0: Event) => void)|null;
  private maxSize: Size|null;
  private positionX: number|null;
  private positionY: number|null;
  private anchorBox: AnchorBox|null;
  private anchorBehavior: AnchorBehavior;
  private sizeBehavior: SizeBehavior;
  private marginBehavior: MarginBehavior;
  #ignoreLeftMargin: boolean = false;

  constructor(jslog?: string) {
    this.widgetInternal = new Widget(true);
    this.widgetInternal.markAsRoot();
    this.element = this.widgetInternal.element;
    this.contentElement = this.widgetInternal.contentElement;
    if (jslog) {
      this.contentElement.setAttribute('jslog', jslog);
    }
    this.arrowElement = document.createElement('span');
    this.arrowElement.classList.add('arrow', 'hidden');
    if (this.element.shadowRoot) {
      this.element.shadowRoot.appendChild(this.arrowElement);
    }

    this.registerRequiredCSS(glassPaneStyles);
    this.setPointerEventsBehavior(PointerEventsBehavior.PIERCE_GLASS_PANE);

    this.onMouseDownBound = this.onMouseDown.bind(this);
    this.onClickOutsideCallback = null;
    this.maxSize = null;
    this.positionX = null;
    this.positionY = null;
    this.anchorBox = null;
    this.anchorBehavior = AnchorBehavior.PREFER_TOP;
    this.sizeBehavior = SizeBehavior.SET_EXACT_SIZE;
    this.marginBehavior = MarginBehavior.DEFAULT_MARGIN;
  }

  setJsLog(jslog: string): void {
    this.contentElement.setAttribute('jslog', jslog);
  }

  isShowing(): boolean {
    return this.widgetInternal.isShowing();
  }

  registerRequiredCSS(cssFile: {cssContent: string}): void {
    this.widgetInternal.registerRequiredCSS(cssFile);
  }

  registerCSSFiles(cssFiles: CSSStyleSheet[]): void {
    this.widgetInternal.registerCSSFiles(cssFiles);
  }

  setDefaultFocusedElement(element: Element|null): void {
    this.widgetInternal.setDefaultFocusedElement(element);
  }

  setDimmed(dimmed: boolean): void {
    this.element.classList.toggle('dimmed-pane', dimmed);
  }

  setPointerEventsBehavior(pointerEventsBehavior: PointerEventsBehavior): void {
    this.element.classList.toggle(
        'no-pointer-events', pointerEventsBehavior !== PointerEventsBehavior.BLOCKED_BY_GLASS_PANE);
    this.contentElement.classList.toggle(
        'no-pointer-events', pointerEventsBehavior === PointerEventsBehavior.PIERCE_CONTENTS);
  }

  setOutsideClickCallback(callback: ((arg0: Event) => void)|null): void {
    this.onClickOutsideCallback = callback;
  }

  setMaxContentSize(size: Size|null): void {
    this.maxSize = size;
    this.positionContent();
  }

  setSizeBehavior(sizeBehavior: SizeBehavior): void {
    this.sizeBehavior = sizeBehavior;
    this.positionContent();
  }

  setContentPosition(x: number|null, y: number|null): void {
    this.positionX = x;
    this.positionY = y;
    this.positionContent();
  }

  setContentAnchorBox(anchorBox: AnchorBox|null): void {
    this.anchorBox = anchorBox;
    this.positionContent();
  }

  setAnchorBehavior(behavior: AnchorBehavior): void {
    this.anchorBehavior = behavior;
  }

  setMarginBehavior(behavior: MarginBehavior): void {
    this.marginBehavior = behavior;
    this.arrowElement.classList.toggle('hidden', behavior !== MarginBehavior.ARROW);
  }

  setIgnoreLeftMargin(ignore: boolean): void {
    this.#ignoreLeftMargin = ignore;
  }

  show(document: Document): void {
    if (this.isShowing()) {
      return;
    }
    // TODO(crbug.com/1006759): Extract the magic number
    // Deliberately starts with 3000 to hide other z-indexed elements below.
    this.element.style.zIndex = `${3000 + 1000 * panes.size}`;
    this.element.setAttribute('data-devtools-glass-pane', '');
    document.body.addEventListener('mousedown', this.onMouseDownBound, true);
    document.body.addEventListener('pointerdown', this.onMouseDownBound, true);
    this.widgetInternal.show(document.body);
    panes.add(this);
    this.positionContent();
  }

  hide(): void {
    if (!this.isShowing()) {
      return;
    }
    panes.delete(this);
    this.element.ownerDocument.body.removeEventListener('mousedown', this.onMouseDownBound, true);
    this.element.ownerDocument.body.removeEventListener('pointerdown', this.onMouseDownBound, true);
    this.widgetInternal.detach();
  }

  private onMouseDown(event: Event): void {
    if (!this.onClickOutsideCallback) {
      return;
    }
    const node = deepElementFromEvent(event);
    if (!node || this.contentElement.isSelfOrAncestor(node)) {
      return;
    }
    this.onClickOutsideCallback.call(null, event);
  }

  positionContent(): void {
    if (!this.isShowing()) {
      return;
    }

    const showArrow = this.marginBehavior === MarginBehavior.ARROW;
    const gutterSize = showArrow ? 8 : (this.marginBehavior === MarginBehavior.NO_MARGIN ? 0 : 3);
    const scrollbarSize = measuredScrollbarWidth(this.element.ownerDocument);
    const arrowSize = 10;

    const container = (containers.get((this.element.ownerDocument as Document))) as HTMLElement;
    if (this.sizeBehavior === SizeBehavior.MEASURE_CONTENT) {
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

    if (this.sizeBehavior === SizeBehavior.MEASURE_CONTENT) {
      const measuredRect = this.contentElement.getBoundingClientRect();
      const widthOverflow = height < measuredRect.height ? scrollbarSize : 0;
      const heightOverflow = width < measuredRect.width ? scrollbarSize : 0;
      width = Math.min(width, measuredRect.width + widthOverflow);
      height = Math.min(height, measuredRect.height + heightOverflow);
    }

    if (this.anchorBox) {
      const anchorBox = this.anchorBox.relativeToElement(container);
      let behavior: AnchorBehavior.PREFER_BOTTOM|AnchorBehavior.PREFER_TOP|AnchorBehavior.PREFER_RIGHT|
          AnchorBehavior.PREFER_LEFT|AnchorBehavior = this.anchorBehavior;
      this.arrowElement.classList.remove('arrow-none', 'arrow-top', 'arrow-bottom', 'arrow-left', 'arrow-right');

      if (behavior === AnchorBehavior.PREFER_TOP || behavior === AnchorBehavior.PREFER_BOTTOM) {
        const top = anchorBox.y - 2 * gutterSize;
        const bottom = containerHeight - anchorBox.y - anchorBox.height - 2 * gutterSize;
        if (behavior === AnchorBehavior.PREFER_TOP && top < height && bottom > top) {
          behavior = AnchorBehavior.PREFER_BOTTOM;
        }
        if (behavior === AnchorBehavior.PREFER_BOTTOM && bottom < height && top > bottom) {
          behavior = AnchorBehavior.PREFER_TOP;
        }

        let arrowY;
        let enoughHeight = true;
        if (behavior === AnchorBehavior.PREFER_TOP) {
          positionY = Math.max(gutterSize, anchorBox.y - height - gutterSize);
          const spaceTop = anchorBox.y - positionY - gutterSize;
          if (this.sizeBehavior === SizeBehavior.MEASURE_CONTENT) {
            if (height > spaceTop) {
              this.arrowElement.classList.add('arrow-none');
              enoughHeight = false;
            }
          } else {
            height = Math.min(height, spaceTop);
          }
          this.arrowElement.classList.add('arrow-bottom');
          arrowY = anchorBox.y - gutterSize;
        } else {
          positionY = anchorBox.y + anchorBox.height + gutterSize;
          const spaceBottom = containerHeight - positionY - gutterSize;
          if (this.sizeBehavior === SizeBehavior.MEASURE_CONTENT) {
            if (height > spaceBottom) {
              this.arrowElement.classList.add('arrow-none');
              positionY = containerHeight - gutterSize - height;
              enoughHeight = false;
            }
          } else {
            height = Math.min(height, spaceBottom);
          }
          this.arrowElement.classList.add('arrow-top');
          arrowY = anchorBox.y + anchorBox.height + gutterSize;
        }

        const naturalPositionX = Math.min(anchorBox.x, containerWidth - width - gutterSize);
        positionX = Math.max(gutterSize, naturalPositionX);
        if (this.#ignoreLeftMargin && gutterSize > naturalPositionX) {
          positionX = 0;
        }

        if (!enoughHeight) {
          positionX = Math.min(positionX + arrowSize, containerWidth - width - gutterSize);
        } else if (showArrow && positionX - arrowSize >= gutterSize) {
          positionX -= arrowSize;
        }
        width = Math.min(width, containerWidth - positionX - gutterSize);
        if (2 * arrowSize >= width) {
          this.arrowElement.classList.add('arrow-none');
        } else {
          let arrowX: number = anchorBox.x + Math.min(50, Math.floor(anchorBox.width / 2));
          arrowX = Platform.NumberUtilities.clamp(arrowX, positionX + arrowSize, positionX + width - arrowSize);
          this.arrowElement.positionAt(arrowX, arrowY, container);
        }
      } else {
        const left = anchorBox.x - 2 * gutterSize;
        const right = containerWidth - anchorBox.x - anchorBox.width - 2 * gutterSize;
        if (behavior === AnchorBehavior.PREFER_LEFT && left < width && right > left) {
          behavior = AnchorBehavior.PREFER_RIGHT;
        }
        if (behavior === AnchorBehavior.PREFER_RIGHT && right < width && left > right) {
          behavior = AnchorBehavior.PREFER_LEFT;
        }

        let arrowX;
        let enoughWidth = true;
        if (behavior === AnchorBehavior.PREFER_LEFT) {
          positionX = Math.max(gutterSize, anchorBox.x - width - gutterSize);
          const spaceLeft = anchorBox.x - positionX - gutterSize;
          if (this.sizeBehavior === SizeBehavior.MEASURE_CONTENT) {
            if (width > spaceLeft) {
              this.arrowElement.classList.add('arrow-none');
              enoughWidth = false;
            }
          } else {
            width = Math.min(width, spaceLeft);
          }
          this.arrowElement.classList.add('arrow-right');
          arrowX = anchorBox.x - gutterSize;
        } else {
          positionX = anchorBox.x + anchorBox.width + gutterSize;
          const spaceRight = containerWidth - positionX - gutterSize;
          if (this.sizeBehavior === SizeBehavior.MEASURE_CONTENT) {
            if (width > spaceRight) {
              this.arrowElement.classList.add('arrow-none');
              positionX = containerWidth - gutterSize - width;
              enoughWidth = false;
            }
          } else {
            width = Math.min(width, spaceRight);
          }
          this.arrowElement.classList.add('arrow-left');
          arrowX = anchorBox.x + anchorBox.width + gutterSize;
        }

        positionY = Math.max(gutterSize, Math.min(anchorBox.y, containerHeight - height - gutterSize));
        if (!enoughWidth) {
          positionY = Math.min(positionY + arrowSize, containerHeight - height - gutterSize);
        } else if (showArrow && positionY - arrowSize >= gutterSize) {
          positionY -= arrowSize;
        }
        height = Math.min(height, containerHeight - positionY - gutterSize);
        if (2 * arrowSize >= height) {
          this.arrowElement.classList.add('arrow-none');
        } else {
          let arrowY: number = anchorBox.y + Math.min(50, Math.floor(anchorBox.height / 2));
          arrowY = Platform.NumberUtilities.clamp(arrowY, positionY + arrowSize, positionY + height - arrowSize);
          this.arrowElement.positionAt(arrowX, arrowY, container);
        }
      }
    } else {
      positionX = this.positionX !== null ? this.positionX : (containerWidth - width) / 2;
      positionY = this.positionY !== null ? this.positionY : (containerHeight - height) / 2;
      width = Math.min(width, containerWidth - positionX - gutterSize);
      height = Math.min(height, containerHeight - positionY - gutterSize);
      this.arrowElement.classList.add('arrow-none');
    }

    this.contentElement.style.width = width + 'px';
    if (this.sizeBehavior === SizeBehavior.SET_EXACT_WIDTH_MAX_HEIGHT) {
      this.contentElement.style.maxHeight = height + 'px';
    } else {
      this.contentElement.style.height = height + 'px';
    }

    this.contentElement.positionAt(positionX, positionY, container);
    this.widgetInternal.doResize();
  }

  widget(): Widget {
    return this.widgetInternal;
  }

  static setContainer(element: Element): void {
    containers.set((element.ownerDocument as Document), element);
    GlassPane.containerMoved(element);
  }

  static container(document: Document): Element {
    return containers.get(document) as Element;
  }

  static containerMoved(element: Element): void {
    for (const pane of panes) {
      if (pane.isShowing() && pane.element.ownerDocument === element.ownerDocument) {
        pane.positionContent();
      }
    }
  }
}

export const enum PointerEventsBehavior {
  BLOCKED_BY_GLASS_PANE = 'BlockedByGlassPane',
  PIERCE_GLASS_PANE = 'PierceGlassPane',
  PIERCE_CONTENTS = 'PierceContents',
}

export const enum AnchorBehavior {
  PREFER_TOP = 'PreferTop',
  PREFER_BOTTOM = 'PreferBottom',
  PREFER_LEFT = 'PreferLeft',
  PREFER_RIGHT = 'PreferRight',
}

export const enum SizeBehavior {
  SET_EXACT_SIZE = 'SetExactSize',
  SET_EXACT_WIDTH_MAX_HEIGHT = 'SetExactWidthMaxHeight',
  MEASURE_CONTENT = 'MeasureContent',
}

export const enum MarginBehavior {
  ARROW = 'Arrow',
  DEFAULT_MARGIN = 'DefaultMargin',
  NO_MARGIN = 'NoMargin',
}

const containers = new Map<Document, Element>();
const panes = new Set<GlassPane>();

// Exported for layout tests.
export const GlassPanePanes = panes;
