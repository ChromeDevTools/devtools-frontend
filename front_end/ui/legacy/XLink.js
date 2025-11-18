// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as UIHelpers from '../helpers/helpers.js';
import * as VisualLogging from '../visual_logging/visual_logging.js';
import * as ARIAUtils from './ARIAUtils.js';
import { html as xhtml } from './Fragment.js';
import { Tooltip } from './Tooltip.js';
import { copyLinkAddressLabel, MaxLengthForDisplayedURLs, openLinkExternallyLabel, } from './UIUtils.js';
import { XElement } from './XElement.js';
export class XLink extends XElement {
    #href;
    clickable;
    onClick;
    onKeyDown;
    static create(url, linkText, className, preventClick, jsLogContext, tabindex = '0') {
        if (!linkText) {
            linkText = url;
        }
        className = className || '';
        // clang-format off
        // TODO(dgozman): migrate css from 'devtools-link' to 'x-link'.
        const element = xhtml `
  <x-link href='${url}' tabindex='${tabindex}' class='${className} devtools-link' ${preventClick ? 'no-click' : ''}
  jslog=${VisualLogging.link().track({ click: true, keydown: 'Enter|Space' }).context(jsLogContext)}>${Platform.StringUtilities.trimMiddle(linkText, MaxLengthForDisplayedURLs)}</x-link>`;
        // clang-format on
        return element;
    }
    constructor() {
        super();
        this.style.setProperty('display', 'inline');
        ARIAUtils.markAsLink(this);
        this.setAttribute('tabindex', '0');
        this.setAttribute('target', '_blank');
        this.setAttribute('rel', 'noopener');
        this.#href = null;
        this.clickable = true;
        this.onClick = (event) => {
            event.consume(true);
            if (this.#href) {
                UIHelpers.openInNewTab(this.#href);
            }
        };
        this.onKeyDown = (event) => {
            if (Platform.KeyboardUtilities.isEnterOrSpaceKey(event)) {
                event.consume(true);
                if (this.#href) {
                    UIHelpers.openInNewTab(this.#href);
                }
            }
        };
    }
    static get observedAttributes() {
        // TODO(dgozman): should be super.observedAttributes, but it does not compile.
        return XElement.observedAttributes.concat(['href', 'no-click', 'title', 'tabindex']);
    }
    get href() {
        return this.#href;
    }
    attributeChangedCallback(attr, oldValue, newValue) {
        if (attr === 'no-click') {
            this.clickable = !newValue;
            this.updateClick();
            return;
        }
        if (attr === 'href') {
            // For invalid or non-absolute URLs, `href` should remain `null`.
            if (!newValue) {
                newValue = '';
            }
            let href = null;
            try {
                const url = new URL(newValue);
                if (url.protocol !== 'javascript:') {
                    href = Platform.DevToolsPath.urlString `${url}`;
                }
            }
            catch {
            }
            this.#href = href;
            if (!this.hasAttribute('title')) {
                Tooltip.install(this, newValue);
            }
            this.updateClick();
            return;
        }
        if (attr === 'tabindex') {
            if (oldValue !== newValue) {
                this.setAttribute('tabindex', newValue || '0');
            }
            return;
        }
        super.attributeChangedCallback(attr, oldValue, newValue);
    }
    updateClick() {
        if (this.#href !== null && this.clickable) {
            this.addEventListener('click', this.onClick, false);
            this.addEventListener('keydown', this.onKeyDown, false);
            this.style.setProperty('cursor', 'pointer');
        }
        else {
            this.removeEventListener('click', this.onClick, false);
            this.removeEventListener('keydown', this.onKeyDown, false);
            this.style.removeProperty('cursor');
        }
    }
}
export class ContextMenuProvider {
    appendApplicableItems(_event, contextMenu, target) {
        let targetNode = target;
        while (targetNode && !(targetNode instanceof XLink)) {
            targetNode = targetNode.parentNodeOrShadowHost();
        }
        if (!targetNode?.href) {
            return;
        }
        const node = targetNode;
        contextMenu.revealSection().appendItem(openLinkExternallyLabel(), () => {
            if (node.href) {
                UIHelpers.openInNewTab(node.href);
            }
        }, { jslogContext: 'open-in-new-tab' });
        contextMenu.revealSection().appendItem(copyLinkAddressLabel(), () => {
            if (node.href) {
                Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(node.href);
            }
        }, { jslogContext: 'copy-link-address' });
    }
}
// eslint-disable-next-line @devtools/enforce-custom-element-prefix
customElements.define('x-link', XLink);
//# sourceMappingURL=XLink.js.map