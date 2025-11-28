// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import '../../../ui/kit/kit.js';
import '../../../ui/components/node_text/node_text.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as RenderCoordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import elementsBreadcrumbsStyles from './elementsBreadcrumbs.css.js';
import { crumbsToRender } from './ElementsBreadcrumbsUtils.js';
const { html } = Lit;
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
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/components/ElementsBreadcrumbs.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class NodeSelectedEvent extends Event {
    static eventName = 'breadcrumbsnodeselected';
    legacyDomNode;
    constructor(node) {
        super(NodeSelectedEvent.eventName, {});
        this.legacyDomNode = node.legacyDomNode;
    }
}
export class ElementsBreadcrumbs extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #resizeObserver = new ResizeObserver(() => this.#checkForOverflowOnResize());
    #crumbsData = [];
    #selectedDOMNode = null;
    #overflowing = false;
    #userScrollPosition = 'start';
    #isObservingResize = false;
    #userHasManuallyScrolled = false;
    set data(data) {
        this.#selectedDOMNode = data.selectedNode;
        this.#crumbsData = data.crumbs;
        this.#userHasManuallyScrolled = false;
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
    disconnectedCallback() {
        this.#isObservingResize = false;
        this.#resizeObserver.disconnect();
    }
    #onCrumbClick(node) {
        return (event) => {
            event.preventDefault();
            this.dispatchEvent(new NodeSelectedEvent(node));
        };
    }
    /*
     * When the window is resized, we need to check if we either:
     * 1) overflowing, and now the window is big enough that we don't need to
     * 2) not overflowing, and now the window is small and we do need to
     *
     * If either of these are true, we toggle the overflowing state accordingly and trigger a re-render.
     */
    async #checkForOverflowOnResize() {
        const crumbScrollContainer = this.#shadow.querySelector('.crumbs-scroll-container');
        const crumbWindow = this.#shadow.querySelector('.crumbs-window');
        if (!crumbScrollContainer || !crumbWindow) {
            return;
        }
        const crumbWindowWidth = await RenderCoordinator.read(() => {
            return crumbWindow.clientWidth;
        });
        const scrollContainerWidth = await RenderCoordinator.read(() => {
            return crumbScrollContainer.clientWidth;
        });
        if (this.#overflowing) {
            // We currently have overflow buttons.
            // If the content while displaying buttons still fits, then we can
            // rerender without overflow.
            if (scrollContainerWidth < crumbWindowWidth) {
                this.#overflowing = false;
            }
            // We currently do not have overflow buttons.
            // If the content won't fit anymore, then rerender with overflow.
        }
        else if (scrollContainerWidth > crumbWindowWidth) {
            this.#overflowing = true;
        }
        void this.#ensureSelectedNodeIsVisible();
        void this.#updateScrollState(crumbWindow);
    }
    #onCrumbMouseMove(node) {
        return () => node.highlightNode();
    }
    #onCrumbMouseLeave(node) {
        return () => node.clearHighlight();
    }
    #onCrumbFocus(node) {
        return () => node.highlightNode();
    }
    #onCrumbBlur(node) {
        return () => node.clearHighlight();
    }
    #engageResizeObserver() {
        if (!this.#resizeObserver || this.#isObservingResize === true) {
            return;
        }
        const crumbs = this.#shadow.querySelector('.crumbs');
        if (!crumbs) {
            return;
        }
        this.#resizeObserver.observe(crumbs);
        this.#isObservingResize = true;
    }
    /**
     * This method runs after render or resize and checks if the crumbs are too large
     * for their container and therefore we need to render the overflow buttons at
     * either end which the user can use to scroll back and forward through the crumbs.
     * If it finds that we are overflowing, it sets the instance variable and
     * triggers a re-render. If we are not overflowing, this method returns and
     * does nothing.
     */
    async #checkForOverflow() {
        const crumbScrollContainer = this.#shadow.querySelector('.crumbs-scroll-container');
        const crumbWindow = this.#shadow.querySelector('.crumbs-window');
        if (!crumbScrollContainer || !crumbWindow) {
            return;
        }
        const crumbWindowWidth = await RenderCoordinator.read(() => {
            return crumbWindow.clientWidth;
        });
        const scrollContainerWidth = await RenderCoordinator.read(() => {
            return crumbScrollContainer.clientWidth;
        });
        if (this.#overflowing) {
            // We currently have overflow buttons.
            // If the content while displaying buttons still fits, then we can
            // rerender without overflow.
            if (scrollContainerWidth < crumbWindowWidth) {
                this.#overflowing = false;
                void this.#render();
            }
            // We currently do not have overflow buttons.
            // If the content won't fit anymore, then rerender with overflow.
        }
        else if (scrollContainerWidth > crumbWindowWidth) {
            this.#overflowing = true;
            void this.#render();
        }
    }
    #onCrumbsWindowScroll(event) {
        if (!event.target) {
            return;
        }
        /* not all Events are DOM Events so the TS Event def doesn't have
         * .target typed as an Element but in this case we're getting this
         * from a DOM event so we're confident of having .target and it
         * being an element
         */
        const scrollWindow = event.target;
        this.#updateScrollState(scrollWindow);
    }
    #updateScrollState(scrollWindow) {
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
            this.#userScrollPosition = 'start';
        }
        else if (currentScroll >= maxScrollLeft - scrollBeginningAndEndPadding) {
            this.#userScrollPosition = 'end';
        }
        else {
            this.#userScrollPosition = 'middle';
        }
        void this.#render();
    }
    #onOverflowClick(direction) {
        return () => {
            this.#userHasManuallyScrolled = true;
            const scrollWindow = this.#shadow.querySelector('.crumbs-window');
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
    #renderOverflowButton(direction, disabled) {
        const buttonStyles = Lit.Directives.classMap({
            overflow: true,
            [direction]: true,
            hidden: !this.#overflowing,
        });
        const tooltipString = direction === 'left' ? i18nString(UIStrings.scrollLeft) : i18nString(UIStrings.scrollRight);
        // clang-format off
        return html `
      <button
        class=${buttonStyles}
        @click=${this.#onOverflowClick(direction)}
        ?disabled=${disabled}
        aria-label=${tooltipString}
        title=${tooltipString}>
        <devtools-icon name=${'triangle-' + direction} style="width: var(--sys-size-6); height: 10px;">
        </devtools-icon>
      </button>
      `;
        // clang-format on
    }
    #render() {
        const crumbs = crumbsToRender(this.#crumbsData, this.#selectedDOMNode);
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        Lit.render(html `
      <style>${elementsBreadcrumbsStyles}</style>
      <nav class="crumbs" aria-label=${i18nString(UIStrings.breadcrumbs)} jslog=${VisualLogging.elementsBreadcrumbs()}>
        ${this.#renderOverflowButton('left', this.#userScrollPosition === 'start')}

        <div class="crumbs-window" @scroll=${this.#onCrumbsWindowScroll}>
          <ul class="crumbs-scroll-container">
            ${crumbs.map(crumb => {
            const crumbClasses = {
                crumb: true,
                selected: crumb.selected,
            };
            // eslint-disable-next-line @devtools/no-a-tags-in-lit
            return html `
                <li class=${Lit.Directives.classMap(crumbClasses)}
                  data-node-id=${crumb.node.id}
                  data-crumb="true"
                >
                  <a href="#" draggable=false class="crumb-link"
                    jslog=${VisualLogging.item().track({ click: true })}
                    @click=${this.#onCrumbClick(crumb.node)}
                    @mousemove=${this.#onCrumbMouseMove(crumb.node)}
                    @mouseleave=${this.#onCrumbMouseLeave(crumb.node)}
                    @focus=${this.#onCrumbFocus(crumb.node)}
                    @blur=${this.#onCrumbBlur(crumb.node)}
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
        ${this.#renderOverflowButton('right', this.#userScrollPosition === 'end')}
      </nav>
    `, this.#shadow, { host: this });
        // clang-format on
        void this.#checkForOverflow();
        this.#engageResizeObserver();
        void this.#ensureSelectedNodeIsVisible();
    }
    async #ensureSelectedNodeIsVisible() {
        /*
         * If the user has manually scrolled the crumbs in either direction, we
         * effectively hand control over the scrolling down to them. This is to
         * prevent the user manually scrolling to the end, and then us scrolling
         * them back to the selected node. The moment they click either scroll
         * button we set userHasManuallyScrolled, and we reset it when we get new
         * data in. This means if the user clicks on a different element in the
         * tree, we will auto-scroll that element into view, because we'll get new
         * data and hence the flag will be reset.
         */
        if (!this.#selectedDOMNode || !this.#shadow || !this.#overflowing || this.#userHasManuallyScrolled) {
            return;
        }
        const activeCrumbId = this.#selectedDOMNode.id;
        const activeCrumb = this.#shadow.querySelector(`.crumb[data-node-id="${activeCrumbId}"]`);
        if (activeCrumb) {
            await RenderCoordinator.scroll(() => {
                activeCrumb.scrollIntoView({
                    // We only want to scroll smoothly when the user is clicking the
                    // buttons manually. If we are automatically scrolling, we could be
                    // scrolling a long distance, so just jump there right away. This
                    // most commonly occurs when the user first opens DevTools on a
                    // deeply nested element, and the slow scrolling of the breadcrumbs
                    // is just a distraction and not useful.
                    behavior: 'auto',
                });
            });
        }
    }
}
customElements.define('devtools-elements-breadcrumbs', ElementsBreadcrumbs);
//# sourceMappingURL=ElementsBreadcrumbs.js.map