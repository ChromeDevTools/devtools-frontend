// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as UI from '../../ui/legacy/legacy.js';
import { CookieControlsTreeElement } from './CookieControlsTreeElement.js';
import { CookieReportTreeElement } from './CookieReportTreeElement.js';
import { IPProtectionTreeElement } from './IPProtectionTreeElement.js';
import lockIconStyles from './lockIcon.css.js';
import { OriginTreeElement } from './OriginTreeElement.js';
import { createHighlightedUrl, getSecurityStateIconForDetailedView, getSecurityStateIconForOverview, OriginGroup, } from './SecurityPanel.js';
import sidebarStyles from './sidebar.css.js';
const UIStrings = {
    /**
     * @description Section title for the the Security Panel's sidebar
     */
    security: 'Security',
    /**
     * @description Section title for the the Security Panel's sidebar
     */
    privacy: 'Privacy',
    /**
     * @description Sidebar element text in the Security panel
     */
    cookieReport: 'Third-party cookies',
    /**
     * @description Sidebar element text in the Security panel
     */
    flagControls: 'Controls',
    /**
     * @description Sidebar element text in the Security panel
     */
    ipProtection: 'IP Protection',
    /**
     * @description Text in Security Panel of the Security panel
     */
    mainOrigin: 'Main origin',
    /**
     * @description Text in Security Panel of the Security panel
     */
    nonsecureOrigins: 'Non-secure origins',
    /**
     * @description Text in Security Panel of the Security panel
     */
    secureOrigins: 'Secure origins',
    /**
     * @description Text in Security Panel of the Security panel
     */
    unknownCanceled: 'Unknown / canceled',
    /**
     * @description Title text content in Security Panel of the Security panel
     */
    overview: 'Overview',
    /**
     * @description Text in Security Panel of the Security panel
     */
    reloadToViewDetails: 'Reload to view details',
};
const str_ = i18n.i18n.registerUIStrings('panels/security/SecurityPanelSidebar.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class SecurityPanelSidebar extends UI.Widget.VBox {
    #securitySidebarLastItemSetting;
    sidebarTree;
    #originGroupTitles;
    #originGroups;
    securityOverviewElement;
    #cookieControlsTreeElement;
    cookieReportTreeElement;
    ipProtectionTreeElement;
    #elementsByOrigin;
    #mainViewReloadMessage;
    #mainOrigin;
    constructor(element) {
        super(element);
        this.#securitySidebarLastItemSetting =
            Common.Settings.Settings.instance().createSetting('security-last-selected-element-path', '');
        this.#mainOrigin = null;
        this.sidebarTree = new UI.TreeOutline.TreeOutlineInShadow("NavigationTree" /* UI.TreeOutline.TreeVariant.NAVIGATION_TREE */);
        this.sidebarTree.registerRequiredCSS(lockIconStyles, sidebarStyles);
        this.sidebarTree.element.classList.add('security-sidebar');
        this.contentElement.appendChild(this.sidebarTree.element);
        if (Root.Runtime.hostConfig.devToolsPrivacyUI?.enabled) {
            const privacyTreeSection = this.#addSidebarSection(i18nString(UIStrings.privacy), 'privacy');
            this.#cookieControlsTreeElement =
                new CookieControlsTreeElement(i18nString(UIStrings.flagControls), 'cookie-flag-controls');
            privacyTreeSection.appendChild(this.#cookieControlsTreeElement);
            this.cookieReportTreeElement = new CookieReportTreeElement(i18nString(UIStrings.cookieReport), 'cookie-report');
            privacyTreeSection.appendChild(this.cookieReportTreeElement);
            if (Root.Runtime.hostConfig.devToolsIpProtectionPanelInDevTools?.enabled) {
                this.ipProtectionTreeElement = new IPProtectionTreeElement(i18nString(UIStrings.ipProtection), 'ip-protection');
                privacyTreeSection.appendChild(this.ipProtectionTreeElement);
            }
            // If this if the first time this setting is set, go to the controls tool
            if (this.#securitySidebarLastItemSetting.get() === '') {
                this.#securitySidebarLastItemSetting.set(this.#cookieControlsTreeElement.elemId);
            }
        }
        const securitySectionTitle = i18nString(UIStrings.security);
        const securityTreeSection = this.#addSidebarSection(securitySectionTitle, 'security');
        this.securityOverviewElement =
            new OriginTreeElement('security-main-view-sidebar-tree-item', this.#renderTreeElement);
        this.securityOverviewElement.tooltip = i18nString(UIStrings.overview);
        securityTreeSection.appendChild(this.securityOverviewElement);
        this.#originGroupTitles = new Map([
            [OriginGroup.MainOrigin, { title: i18nString(UIStrings.mainOrigin) }],
            [
                OriginGroup.NonSecure,
                {
                    title: i18nString(UIStrings.nonsecureOrigins),
                    icon: getSecurityStateIconForDetailedView("insecure" /* Protocol.Security.SecurityState.Insecure */, `lock-icon lock-icon-${"insecure" /* Protocol.Security.SecurityState.Insecure */}`),
                },
            ],
            [
                OriginGroup.Secure,
                {
                    title: i18nString(UIStrings.secureOrigins),
                    icon: getSecurityStateIconForDetailedView("secure" /* Protocol.Security.SecurityState.Secure */, `lock-icon lock-icon-${"secure" /* Protocol.Security.SecurityState.Secure */}`),
                },
            ],
            [
                OriginGroup.Unknown,
                {
                    title: i18nString(UIStrings.unknownCanceled),
                    icon: getSecurityStateIconForDetailedView("unknown" /* Protocol.Security.SecurityState.Unknown */, `lock-icon lock-icon-${"unknown" /* Protocol.Security.SecurityState.Unknown */}`),
                },
            ],
        ]);
        this.#originGroups = new Map();
        for (const group of Object.values(OriginGroup)) {
            const element = this.#createOriginGroupElement(this.#originGroupTitles.get(group)?.title, this.#originGroupTitles.get(group)?.icon);
            this.#originGroups.set(group, element);
            securityTreeSection.appendChild(element);
        }
        this.#mainViewReloadMessage = new UI.TreeOutline.TreeElement(i18nString(UIStrings.reloadToViewDetails));
        this.#mainViewReloadMessage.selectable = false;
        this.#mainViewReloadMessage.listItemElement.classList.add('security-main-view-reload-message');
        const treeElement = this.#originGroups.get(OriginGroup.MainOrigin);
        treeElement.appendChild(this.#mainViewReloadMessage);
        this.#clearOriginGroups();
        this.#elementsByOrigin = new Map();
        this.element.addEventListener('update-sidebar-selection', (event) => {
            const id = event.detail.id;
            this.#securitySidebarLastItemSetting.set(id);
        });
        this.showLastSelectedElement();
    }
    showLastSelectedElement() {
        if (this.#cookieControlsTreeElement &&
            this.#securitySidebarLastItemSetting.get() === this.#cookieControlsTreeElement.elemId) {
            this.#cookieControlsTreeElement.select();
            this.#cookieControlsTreeElement.showElement();
        }
        else if (this.cookieReportTreeElement &&
            this.#securitySidebarLastItemSetting.get() === this.cookieReportTreeElement.elemId) {
            this.cookieReportTreeElement.select();
            this.cookieReportTreeElement.showElement();
        }
        else if (this.ipProtectionTreeElement &&
            this.#securitySidebarLastItemSetting.get() === this.ipProtectionTreeElement.elemId) {
            this.ipProtectionTreeElement.select();
            this.ipProtectionTreeElement.showElement();
        }
        else {
            this.securityOverviewElement.select();
            this.securityOverviewElement.showElement();
        }
    }
    #addSidebarSection(title, jslogContext) {
        const treeElement = new UI.TreeOutline.TreeElement(title, true, jslogContext);
        treeElement.listItemElement.classList.add('security-group-list-item');
        treeElement.setCollapsible(false);
        treeElement.selectable = false;
        this.sidebarTree.appendChild(treeElement);
        UI.ARIAUtils.markAsHeading(treeElement.listItemElement, 3);
        UI.ARIAUtils.setLabel(treeElement.childrenListElement, title);
        return treeElement;
    }
    #originGroupTitle(originGroup) {
        return this.#originGroupTitles.get(originGroup)?.title;
    }
    #originGroupElement(originGroup) {
        return this.#originGroups.get(originGroup);
    }
    #createOriginGroupElement(originGroupTitle, originGroupIcon) {
        const originGroup = new UI.TreeOutline.TreeElement(originGroupTitle, true);
        originGroup.selectable = false;
        originGroup.expand();
        originGroup.listItemElement.classList.add('security-sidebar-origins');
        if (originGroupIcon) {
            originGroup.setLeadingIcons([originGroupIcon]);
        }
        UI.ARIAUtils.setLabel(originGroup.childrenListElement, originGroupTitle);
        return originGroup;
    }
    toggleOriginsList(hidden) {
        for (const element of this.#originGroups.values()) {
            element.hidden = hidden;
        }
    }
    addOrigin(origin, securityState) {
        this.#mainViewReloadMessage.hidden = true;
        const originElement = new OriginTreeElement('security-sidebar-tree-item', this.#renderTreeElement, origin);
        originElement.tooltip = origin;
        this.#elementsByOrigin.set(origin, originElement);
        this.updateOrigin(origin, securityState);
    }
    setMainOrigin(origin) {
        this.#mainOrigin = origin;
    }
    get mainOrigin() {
        return this.#mainOrigin;
    }
    get originGroups() {
        return this.#originGroups;
    }
    updateOrigin(origin, securityState) {
        const originElement = this.#elementsByOrigin.get(origin);
        originElement.setSecurityState(securityState);
        let newParent;
        if (origin === this.#mainOrigin) {
            newParent = this.#originGroups.get(OriginGroup.MainOrigin);
            newParent.title = i18nString(UIStrings.mainOrigin);
            if (securityState === "secure" /* Protocol.Security.SecurityState.Secure */) {
                newParent.setLeadingIcons([getSecurityStateIconForOverview(securityState, `lock-icon lock-icon-${securityState}`)]);
            }
            else {
                newParent.setLeadingIcons([getSecurityStateIconForOverview(securityState, `lock-icon lock-icon-${securityState}`)]);
            }
            UI.ARIAUtils.setLabel(newParent.childrenListElement, newParent.title);
        }
        else {
            switch (securityState) {
                case "secure" /* Protocol.Security.SecurityState.Secure */:
                    newParent = this.#originGroupElement(OriginGroup.Secure);
                    break;
                case "unknown" /* Protocol.Security.SecurityState.Unknown */:
                    newParent = this.#originGroupElement(OriginGroup.Unknown);
                    break;
                default:
                    newParent = this.#originGroupElement(OriginGroup.NonSecure);
                    break;
            }
        }
        const oldParent = originElement.parent;
        if (oldParent !== newParent) {
            if (oldParent) {
                oldParent.removeChild(originElement);
                if (oldParent.childCount() === 0) {
                    oldParent.hidden = true;
                }
            }
            newParent.appendChild(originElement);
            newParent.hidden = false;
        }
    }
    #clearOriginGroups() {
        for (const [originGroup, originGroupElement] of this.#originGroups) {
            if (originGroup === OriginGroup.MainOrigin) {
                for (let i = originGroupElement.childCount() - 1; i > 0; i--) {
                    originGroupElement.removeChildAtIndex(i);
                }
                originGroupElement.title = this.#originGroupTitle(OriginGroup.MainOrigin);
                originGroupElement.hidden = false;
                this.#mainViewReloadMessage.hidden = false;
            }
            else {
                originGroupElement.removeChildren();
                originGroupElement.hidden = true;
            }
        }
    }
    clearOrigins() {
        this.#clearOriginGroups();
        this.#elementsByOrigin.clear();
    }
    focus() {
        this.sidebarTree.focus();
    }
    #renderTreeElement(element) {
        if (element instanceof OriginTreeElement) {
            const securityState = element.securityState() ?? "unknown" /* Protocol.Security.SecurityState.Unknown */;
            const isOverviewElement = element.listItemElement.classList.contains('security-main-view-sidebar-tree-item');
            const icon = isOverviewElement ?
                getSecurityStateIconForOverview(securityState, `lock-icon lock-icon-${securityState}`) :
                getSecurityStateIconForDetailedView(securityState, `security-property security-property-${securityState}`);
            const elementTitle = isOverviewElement ? (() => {
                const title = document.createElement('span');
                title.classList.add('title');
                title.textContent = i18nString(UIStrings.overview);
                return title;
            })() : createHighlightedUrl(element.origin() ?? Platform.DevToolsPath.EmptyUrlString, securityState);
            element.setLeadingIcons([icon]);
            if (element.listItemElement.lastChild) {
                element.listItemElement.removeChild(element.listItemElement.lastChild);
            }
            element.listItemElement.appendChild(elementTitle);
        }
    }
}
//# sourceMappingURL=SecurityPanelSidebar.js.map