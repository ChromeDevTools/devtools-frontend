// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/kit/kit.js';
import '../../../ui/components/node_text/node_text.js';

import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as UI from '../../../ui/legacy/legacy.js';
import {Directives, html, type LitTemplate, render} from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import elementsBreadcrumbsStyles from './elementsBreadcrumbs.css.js';
import {type Crumb, crumbsToRender} from './ElementsBreadcrumbsUtils.js';

const {classMap} = Directives;

const UIStrings = {
  /**
   * @description Accessible name for DOM tree breadcrumb navigation.
   */
  breadcrumbs: 'DOM tree breadcrumbs',
  /**
   * @description A label/tooltip for a button that scrolls the breadcrumbs bar to the left to show more entries.
   */
  scrollLeft: 'Scroll left',
  /**
   * @description A label/tooltip for a button that scrolls the breadcrumbs bar to the right to show more entries.
   */
  scrollRight: 'Scroll right',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/elements/components/ElementsBreadcrumbs.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class NodeSelectedEvent extends Event {
  static readonly eventName = 'breadcrumbsnodeselected';
  node: SDK.DOMModel.DOMNode;

  constructor(node: SDK.DOMModel.DOMNode) {
    super(NodeSelectedEvent.eventName, {});
    this.node = node;
  }
}

/** Geometry of the scrollable crumbs window, reported by the view. */
export interface Viewport {
  windowWidth: number;
  contentWidth: number;
  scrollLeft: number;
}

export interface ViewInput {
  crumbs: Crumb[];
  overflowing: boolean;
  canScrollLeft: boolean;
  canScrollRight: boolean;
  scrollSelectedCrumbIntoView: boolean;
  onCrumbClick: (node: SDK.DOMModel.DOMNode) => void;
  onCrumbMouseMove: (node: SDK.DOMModel.DOMNode) => void;
  onCrumbMouseLeave: () => void;
  onCrumbFocus: (node: SDK.DOMModel.DOMNode) => void;
  onCrumbBlur: () => void;
  onViewportChange: (viewport: Viewport) => void;
}

export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

function measureViewport(crumbsWindow: Element): Viewport|null {
  const content = crumbsWindow.querySelector('.crumbs-scroll-container');
  if (!content) {
    return null;
  }
  return {
    windowWidth: crumbsWindow.clientWidth,
    contentWidth: content.clientWidth,
    scrollLeft: crumbsWindow.scrollLeft,
  };
}

function renderOverflowButton(direction: 'left'|'right', disabled: boolean, overflowing: boolean,
                              target: HTMLElement): LitTemplate {
  const tooltipString = direction === 'left' ? i18nString(UIStrings.scrollLeft) : i18nString(UIStrings.scrollRight);
  const onClick = (): void => {
    const crumbsWindow = target.querySelector('.crumbs-window');
    if (!crumbsWindow) {
      return;
    }
    const amount = crumbsWindow.clientWidth / 2;
    crumbsWindow.scrollBy({left: direction === 'left' ? -amount : amount, behavior: 'smooth'});
  };
  // clang-format off
  return html`
    <button
      class=${classMap({overflow: true, [direction]: true, hidden: !overflowing})}
      @click=${onClick}
      ?disabled=${disabled}
      aria-label=${tooltipString}
      title=${tooltipString}>
      <devtools-icon name=${'triangle-' + direction} style="width: var(--sys-size-6); height: 10px;">
      </devtools-icon>
    </button>
  `;
  // clang-format on
}

export const DEFAULT_VIEW: View = (input, _output, target) => {
  // clang-format off
  render(html`
    <style>${elementsBreadcrumbsStyles}</style>
    <nav class="crumbs" aria-label=${i18nString(UIStrings.breadcrumbs)} jslog=${VisualLogging.elementsBreadcrumbs()}>
      ${renderOverflowButton('left', !input.canScrollLeft, input.overflowing, target)}

      <div class="crumbs-window"
        @scroll=${(event: Event) => {
          const viewport = event.currentTarget instanceof Element && measureViewport(event.currentTarget);
          if (viewport) {
            input.onViewportChange(viewport);
          }
        }}>
        <ul class="crumbs-scroll-container">
          ${input.crumbs.map(crumb => {
            // eslint-disable-next-line @devtools/no-a-tags-in-lit
            return html`
              <li class=${classMap({crumb: true, selected: crumb.selected})}
                data-node-id=${crumb.node.id}
                data-crumb="true"
              >
                <a href="#" draggable=false class="crumb-link"
                  jslog=${VisualLogging.item().track({click: true, resize: true})}
                  @click=${(event: Event) => {
                    event.preventDefault();
                    input.onCrumbClick(crumb.node);
                  }}
                  @mousemove=${() => input.onCrumbMouseMove(crumb.node)}
                  @mouseleave=${input.onCrumbMouseLeave}
                  @focus=${() => input.onCrumbFocus(crumb.node)}
                  @blur=${input.onCrumbBlur}
                >
                  <devtools-node-text data-node-title=${crumb.title.main} .data=${{
                    nodeTitle: crumb.title.main,
                    nodeId: crumb.title.extras.id,
                    nodeClasses: crumb.title.extras.classes,
                  }}>
                  </devtools-node-text>
                </a>
              </li>`;
          })}
        </ul>
      </div>
      ${renderOverflowButton('right', !input.canScrollRight, input.overflowing, target)}
    </nav>
  `, target, {container: {classes: ['elements-breadcrumbs']}});
  // clang-format on

  const crumbsWindow = target.querySelector('.crumbs-window');
  if (!crumbsWindow) {
    return;
  }
  if (input.scrollSelectedCrumbIntoView) {
    target.querySelector('.crumb.selected')?.scrollIntoView({
      // Jump straight to the selected crumb; smooth scrolling is only for the overflow buttons.
      behavior: 'auto',
      // Only scroll the crumbs horizontally; never scroll ancestors vertically.
      block: 'nearest',
      inline: 'nearest',
    });
  }
  const viewport = measureViewport(crumbsWindow);
  if (viewport) {
    input.onViewportChange(viewport);
  }
};

export class ElementsBreadcrumbs extends UI.Widget.Widget {
  readonly #view: View;
  readonly #resizeObserver = new ResizeObserver(() => this.requestUpdate());

  #selectedDOMNode: SDK.DOMModel.DOMNode|null = null;
  #overflowing = false;
  #canScrollLeft = false;
  #canScrollRight = false;
  // Only auto-scroll when the selection changes or the crumbs start to overflow,
  // so that DOM tree updates never override a manual scroll by the user.
  #scrollSelectedCrumbIntoView = false;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element);
    this.#view = view;
  }

  /**
   * The crumbs are derived from the selected node and its ancestors. Call
   * `requestUpdate()` to re-render them when the DOM tree changes while the
   * selection stays the same.
   */
  set selectedNode(selectedNode: SDK.DOMModel.DOMNode|null) {
    if (this.#selectedDOMNode === selectedNode) {
      return;
    }
    this.#selectedDOMNode = selectedNode;
    this.#scrollSelectedCrumbIntoView = true;
    this.requestUpdate();
  }

  override wasShown(): void {
    super.wasShown();
    this.#resizeObserver.observe(this.contentElement);
    // Hiding can remove the crumbs from the DOM, which resets their scroll
    // position, so scroll to the selected crumb again.
    this.#scrollSelectedCrumbIntoView = true;
    this.requestUpdate();
  }

  override willHide(): void {
    this.#resizeObserver.disconnect();
    super.willHide();
  }

  #onCrumbClick(node: SDK.DOMModel.DOMNode): void {
    this.element.dispatchEvent(new NodeSelectedEvent(node));
  }

  #onCrumbMouseMove(node: SDK.DOMModel.DOMNode): void {
    node.highlight();
  }

  #onCrumbMouseLeave(): void {
    SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight(SDK.TargetManager.TargetManager.instance());
  }

  #onCrumbFocus(node: SDK.DOMModel.DOMNode): void {
    node.highlight();
  }

  #onCrumbBlur(): void {
    SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight(SDK.TargetManager.TargetManager.instance());
  }

  #onViewportChange({windowWidth, contentWidth, scrollLeft}: Viewport): void {
    // The window gets narrower once the overflow buttons are shown, so the
    // buttons only disappear again once the crumbs fit next to them.
    const overflowing = contentWidth > windowWidth;
    const maxScrollLeft = contentWidth - windowWidth;
    // `scrollLeft` can be fractional, while the widths are rounded.
    const canScrollLeft = overflowing && scrollLeft > 0;
    const canScrollRight = overflowing && Math.ceil(scrollLeft) < maxScrollLeft;
    if (overflowing === this.#overflowing && canScrollLeft === this.#canScrollLeft &&
        canScrollRight === this.#canScrollRight) {
      return;
    }
    if (overflowing && !this.#overflowing) {
      this.#scrollSelectedCrumbIntoView = true;
    }
    this.#overflowing = overflowing;
    this.#canScrollLeft = canScrollLeft;
    this.#canScrollRight = canScrollRight;
    this.requestUpdate();
  }

  override performUpdate(): void {
    const nodes = [];
    for (let node = this.#selectedDOMNode; node; node = node.parentNode) {
      nodes.push(node);
    }
    const input: ViewInput = {
      crumbs: crumbsToRender(nodes, this.#selectedDOMNode),
      overflowing: this.#overflowing,
      canScrollLeft: this.#canScrollLeft,
      canScrollRight: this.#canScrollRight,
      scrollSelectedCrumbIntoView: this.#scrollSelectedCrumbIntoView,
      onCrumbClick: node => this.#onCrumbClick(node),
      onCrumbMouseMove: node => this.#onCrumbMouseMove(node),
      onCrumbMouseLeave: () => this.#onCrumbMouseLeave(),
      onCrumbFocus: node => this.#onCrumbFocus(node),
      onCrumbBlur: () => this.#onCrumbBlur(),
      onViewportChange: viewport => this.#onViewportChange(viewport),
    };
    this.#scrollSelectedCrumbIntoView = false;
    this.#view(input, undefined, this.contentElement);
  }
}

declare global {
  interface HTMLElementEventMap {
    [NodeSelectedEvent.eventName]: NodeSelectedEvent;
  }
}
