// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './NodeText.js';

import * as ComponentHelpers from '../component_helpers/component_helpers.js';
import * as LitHtml from '../third_party/lit-html/lit-html.js';

import {crumbsToRender, DOMNode, NodeSelectedEvent, UserScrollPosition} from './ElementsBreadcrumbsUtils.js';

import type {NodeTextData} from './NodeText.js';

export interface ElementsBreadcrumbsData {
  selectedNode: DOMNode|null;
  crumbs: DOMNode[];
}
export class ElementsBreadcrumbs extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});
  private readonly resizeObserver = new ResizeObserver(() => this.update());

  private crumbsData: ReadonlyArray<DOMNode> = [];
  private selectedDOMNode: Readonly<DOMNode>|null = null;
  private overflowing = false;
  private userScrollPosition: UserScrollPosition = 'start';
  private isObservingResize = false;

  set data(data: ElementsBreadcrumbsData) {
    this.selectedDOMNode = data.selectedNode;
    this.crumbsData = data.crumbs;
    this.update();
  }

  disconnectedCallback() {
    this.isObservingResize = false;
    this.resizeObserver.disconnect();
  }

  private onCrumbClick(node: DOMNode) {
    return (event: Event) => {
      event.preventDefault();
      this.dispatchEvent(new NodeSelectedEvent(node));
    };
  }

  private update() {
    this.overflowing = false;
    this.userScrollPosition = 'start';
    this.render();
    this.engageResizeObserver();
    this.ensureSelectedNodeIsVisible();
  }

  private onCrumbMouseMove(node: DOMNode) {
    return () => node.highlightNode();
  }

  private onCrumbMouseLeave(node: DOMNode) {
    return () => node.clearHighlight();
  }

  private onCrumbFocus(node: DOMNode) {
    return () => node.highlightNode();
  }

  private onCrumbBlur(node: DOMNode) {
    return () => node.clearHighlight();
  }

  private engageResizeObserver() {
    if (!this.resizeObserver || this.isObservingResize === true) {
      return;
    }

    const crumbs = this.shadow.querySelector('.crumbs');

    if (!crumbs) {
      return;
    }

    this.resizeObserver.observe(crumbs);
    this.isObservingResize = true;
  }

  /**
   * This method runs after render and checks if the crumbs are too large for
   * their container and therefore we need to render the overflow buttons at
   * either end which the user can use to scroll back and forward through the crumbs.
   * If it finds that we are overflowing, it sets the instance variable and
   * triggers a re-render. If we are not overflowing, this method returns and
   * does nothing.
   */
  private checkForOverflow() {
    if (this.overflowing) {
      return;
    }

    const crumbScrollContainer = this.shadow.querySelector('.crumbs-scroll-container');
    const crumbWindow = this.shadow.querySelector('.crumbs-window');

    if (!crumbScrollContainer || !crumbWindow) {
      return;
    }

    const paddingAllowance = 20;
    const maxChildWidth = crumbWindow.clientWidth - paddingAllowance;

    if (crumbScrollContainer.clientWidth < maxChildWidth) {
      return;
    }

    this.overflowing = true;
    this.render();
  }

  private onCrumbsWindowScroll(event: Event) {
    if (!event.target) {
      return;
    }

    /* not all Events are DOM Events so the TS Event def doesn't have
     * .target typed as an Element but in this case we're getting this
     * from a DOM event so we're confident of having .target and it
     * being an element
     */
    const scrollWindow = event.target as Element;

    this.updateScrollState(scrollWindow);
  }

  private updateScrollState(scrollWindow: Element) {
    const maxScrollLeft = scrollWindow.scrollWidth - scrollWindow.clientWidth;
    const currentScroll = scrollWindow.scrollLeft;

    /**
     * When we check if the user is at the beginning or end of the crumbs (such
     * that we disable the relevant button - you can't keep scrolling right if
     * you're at the last breadcrumb) we want to not check exact numbers but
     * give a bit of padding. This means if the user has scrolled to nearly the
     * end but not quite (e.g. there are 2 more pixels they could scroll) we'll
     * mark it as them being at the end. This variable controls how much padding
     * we apply. So if a user has scrolled to within 10px of the end, we count
     * them as being at the end and disable the button.
     */
    const scrollBeginningAndEndPadding = 10;

    if (currentScroll < scrollBeginningAndEndPadding) {
      this.userScrollPosition = 'start';
    } else if (currentScroll >= maxScrollLeft - scrollBeginningAndEndPadding) {
      this.userScrollPosition = 'end';
    } else {
      this.userScrollPosition = 'middle';
    }

    this.render();
  }

  private onOverflowClick(direction: 'left'|'right') {
    return () => {
      const scrollWindow = this.shadow.querySelector('.crumbs-window');

      if (!scrollWindow) {
        return;
      }

      const amountToScrollOnClick = scrollWindow.clientWidth / 2;

      const newScrollAmount = direction === 'left' ?
          Math.max(Math.floor(scrollWindow.scrollLeft - amountToScrollOnClick), 0) :
          scrollWindow.scrollLeft + amountToScrollOnClick;

      scrollWindow.scrollTo({
        behavior: 'smooth',
        left: newScrollAmount,
      });
    };
  }

  private renderOverflowButton(direction: 'left'|'right', disabled: boolean) {
    const buttonStyles = LitHtml.Directives.classMap({
      overflow: true,
      [direction]: true,
      hidden: this.overflowing === false,
    });

    return LitHtml.html`
      <button
        class=${buttonStyles}
        @click=${this.onOverflowClick(direction)}
        ?disabled=${disabled}
        aria-label="Scroll ${direction}"
      >&hellip;</button>
      `;
  }

  private render() {
    const crumbs = crumbsToRender(this.crumbsData, this.selectedDOMNode);

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    LitHtml.render(LitHtml.html`
      <style>
        .crumbs {
          display: inline-flex;
          align-items: stretch;
          width: 100%;
          overflow: hidden;
          pointer-events: auto;
          cursor: default;
          white-space: nowrap;
          position: relative;
        }

        .crumbs-window {
          flex-grow: 2;
          overflow: hidden;
        }

        .crumbs-scroll-container {
          display: inline-flex;
          margin: 0;
          padding: 0;
        }

        .crumb {
          display: block;
          padding: 0 7px;
          line-height: 23px;
          white-space: nowrap;
        }

        .overflow {
          padding: 0 7px;
          font-weight: bold;
          display: block;
          border: none;
          flex-grow: 0;
          flex-shrink: 0;
          text-align: center;
        }

        .crumb.selected,
        .crumb:hover {
          background-color: var(--tab-selected-bg-color);
        }

        .overflow {
          background-color: var(--toolbar-bg-color);
        }

        .overflow.hidden {
          display: none;
        }

        .overflow:not(:disabled):hover {
          background-color: var(--toolbar-hover-bg-color);
          cursor: pointer;
        }

        .crumb-link {
          text-decoration: none;
          color: inherit;
        }

        ${ComponentHelpers.GetStylesheet.DARK_MODE_CLASS} .overflow:not(:disabled) {
          color: #fff;
        }
      </style>

      <nav class=${`crumbs ${ComponentHelpers.GetStylesheet.applyDarkModeClassIfNeeded()}`}>
        ${this.renderOverflowButton('left', this.userScrollPosition === 'start')}

        <div class="crumbs-window" @scroll=${this.onCrumbsWindowScroll}>
          <ul class="crumbs-scroll-container">
            ${crumbs.map(crumb => {
              const crumbClasses = {
                crumb: true,
                selected: crumb.selected,
              };
              return LitHtml.html`
                <li class=${LitHtml.Directives.classMap(crumbClasses)}
                  data-node-id=${crumb.node.id}
                  data-crumb="true"
                >
                  <a href="#"
                    class="crumb-link"
                    @click=${this.onCrumbClick(crumb.node)}
                    @mousemove=${this.onCrumbMouseMove(crumb.node)}
                    @mouseleave=${this.onCrumbMouseLeave(crumb.node)}
                    @focus=${this.onCrumbFocus(crumb.node)}
                    @blur=${this.onCrumbBlur(crumb.node)}
                  ><devtools-node-text data-node-title=${crumb.title.main} .data=${{
                    nodeTitle: crumb.title.main,
                    nodeId: crumb.title.extras.id,
                    nodeClasses: crumb.title.extras.classes,
                  } as NodeTextData}></devtools-node-text></a>
                </li>`;
            })}
          </ul>
        </div>
        ${this.renderOverflowButton('right', this.userScrollPosition === 'end')}
      </nav>
    `, this.shadow, {
      eventContext: this,
    });
    // clang-format on

    this.checkForOverflow();
  }

  private ensureSelectedNodeIsVisible() {
    if (!this.selectedDOMNode || !this.shadow || !this.overflowing) {
      return;
    }
    const activeCrumbId = this.selectedDOMNode.id;
    const activeCrumb = this.shadow.querySelector(`.crumb[data-node-id="${activeCrumbId}"]`);

    if (activeCrumb) {
      activeCrumb.scrollIntoView();
    }
  }
}

customElements.define('devtools-elements-breadcrumbs', ElementsBreadcrumbs);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-elements-breadcrumbs': ElementsBreadcrumbs;
  }
}
