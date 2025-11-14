// Copyright 2018 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, nothing, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import domLinkifierStyles from './domLinkifier.css.js';
const { classMap } = Directives;
const UIStrings = {
    /**
     * @description Text displayed when trying to create a link to a node in the UI, but the node
     * location could not be found so we display this placeholder instead. Node refers to a DOM node.
     * This should be translated if appropriate.
     */
    node: '<node>',
};
const str_ = i18n.i18n.registerUIStrings('panels/common/DOMLinkifier.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const DEFAULT_VIEW = (input, _output, target) => {
    // clang-format off
    render(html `${(input.tagName || input.pseudo) ? html `
    <style>${domLinkifierStyles}</style>
    <span class="monospace">
      <button class="node-link text-button link-style ${classMap({
        'dynamic-link': Boolean(input.dynamic),
        disabled: Boolean(input.disabled)
    })}"
          jslog=${VisualLogging.link('node').track({ click: true, keydown: 'Enter' })}
          tabindex=${input.preventKeyboardFocus ? -1 : 0}
          @click=${input.onClick}
          @mouseover=${input.onMouseOver}
          @mouseleave=${input.onMouseLeave}
          title=${[
        input.tagName ?? '',
        input.id ? `#${input.id}` : '',
        ...input.classes.map(c => `.${c}`),
        input.pseudo ? `::${input.pseudo}` : '',
    ].join(' ')}>${[
        input.tagName ? html `<span class="node-label-name">${input.tagName}</span>` : nothing,
        input.id ? html `<span class="node-label-id">#${input.id}</span>` : nothing,
        ...input.classes.map(className => html `<span class="extra node-label-class">.${className}</span>`),
        input.pseudo ? html `<span class="extra node-label-pseudo">${input.pseudo}</span>` : nothing,
    ]}</button>
    </span>` : i18nString(UIStrings.node)}`, target);
    // clang-format on
};
export class DOMNodeLink extends UI.Widget.Widget {
    #node = undefined;
    #options = undefined;
    #view;
    constructor(element, node, options, view = DEFAULT_VIEW) {
        super(element, { useShadowDom: true });
        this.element.classList.remove('vbox');
        this.#node = node;
        this.#options = options;
        this.#view = view;
        this.performUpdate();
    }
    set node(node) {
        this.#node = node;
        this.performUpdate();
    }
    set options(options) {
        this.#options = options;
        this.performUpdate();
    }
    performUpdate() {
        const options = this.#options ?? {
            tooltip: undefined,
            preventKeyboardFocus: undefined,
            textContent: undefined,
            isDynamicLink: false,
            disabled: false,
        };
        const viewInput = {
            dynamic: options.isDynamicLink,
            disabled: options.disabled,
            preventKeyboardFocus: options.preventKeyboardFocus,
            classes: [],
            onClick: () => {
                void Common.Revealer.reveal(this.#node);
                void this.#node?.scrollIntoView();
                return false;
            },
            onMouseOver: () => {
                this.#node?.highlight?.();
            },
            onMouseLeave: () => {
                SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
            },
        };
        if (!this.#node) {
            this.#view(viewInput, {}, this.contentElement);
            return;
        }
        let node = this.#node;
        const isPseudo = node.nodeType() === Node.ELEMENT_NODE && node.pseudoType();
        if (isPseudo && node.parentNode) {
            node = node.parentNode;
        }
        // Special case rendering the node links for view transition pseudo elements.
        // We don't include the ancestor name in the node link because
        // they always have the same ancestor. See crbug.com/340633630.
        if (node.isViewTransitionPseudoNode()) {
            viewInput.pseudo = `::${this.#node.pseudoType()}(${this.#node.pseudoIdentifier()})`;
            this.#view(viewInput, {}, this.contentElement);
            return;
        }
        if (options.textContent) {
            viewInput.tagName = options.textContent;
            this.#view(viewInput, {}, this.contentElement);
            return;
        }
        viewInput.tagName = node.nodeNameInCorrectCase();
        const idAttribute = node.getAttribute('id');
        if (idAttribute) {
            viewInput.id = idAttribute;
        }
        const classAttribute = node.getAttribute('class');
        if (classAttribute) {
            const classes = classAttribute.split(/\s+/);
            if (classes.length) {
                const foundClasses = new Set();
                for (let i = 0; i < classes.length; ++i) {
                    const className = classes[i];
                    if (className && !options.hiddenClassList?.includes(className) && !foundClasses.has(className)) {
                        foundClasses.add(className);
                    }
                }
                viewInput.classes = [...foundClasses];
            }
        }
        if (isPseudo) {
            const pseudoIdentifier = this.#node.pseudoIdentifier();
            let pseudoText = '::' + this.#node.pseudoType();
            if (pseudoIdentifier) {
                pseudoText += `(${pseudoIdentifier})`;
            }
            viewInput.pseudo = pseudoText;
        }
        this.#view(viewInput, {}, this.contentElement);
    }
}
const DEFERRED_DEFAULT_VIEW = (input, _output, target) => {
    // clang-format off
    render(html `
      <style>${domLinkifierStyles}</style>
      <button class="node-link text-button link-style"
          jslog=${VisualLogging.link('node').track({ click: true })}
          tabindex=${input.preventKeyboardFocus ? -1 : 0}
          @click=${input.onClick}
          @mousedown=${(e) => e.consume()}>
        <slot></slot>
      </button>`, target);
    // clang-format on
};
export class DeferredDOMNodeLink extends UI.Widget.Widget {
    #deferredNode = undefined;
    #options = undefined;
    #view;
    constructor(element, deferredNode, options, view = DEFERRED_DEFAULT_VIEW) {
        super(element, { useShadowDom: true });
        this.element.classList.remove('vbox');
        this.#deferredNode = deferredNode;
        this.#options = options;
        this.#view = view;
        this.performUpdate();
    }
    performUpdate() {
        const viewInput = {
            preventKeyboardFocus: this.#options?.preventKeyboardFocus,
            onClick: () => {
                this.#deferredNode?.resolve?.(node => {
                    void Common.Revealer.reveal(node);
                    void node?.scrollIntoView();
                });
            },
        };
        this.#view(viewInput, {}, this.contentElement);
    }
}
let linkifierInstance;
export class Linkifier {
    static instance(opts = { forceNew: null }) {
        const { forceNew } = opts;
        if (!linkifierInstance || forceNew) {
            linkifierInstance = new Linkifier();
        }
        return linkifierInstance;
    }
    linkify(node, options) {
        if (node instanceof SDK.DOMModel.DOMNode) {
            const link = document.createElement('devtools-widget');
            link.widgetConfig = UI.Widget.widgetConfig(e => new DOMNodeLink(e, node, options));
            return link;
        }
        if (node instanceof SDK.DOMModel.DeferredDOMNode) {
            const link = document.createElement('devtools-widget');
            link.widgetConfig = UI.Widget.widgetConfig(e => new DeferredDOMNodeLink(e, node, options));
            return link;
        }
        throw new Error('Can\'t linkify non-node');
    }
}
//# sourceMappingURL=DOMLinkifier.js.map