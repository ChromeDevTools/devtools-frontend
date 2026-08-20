// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Protocol from '../../generated/protocol.js';
import type {Icon} from '../../ui/kit/kit.js';
import * as UI from '../../ui/legacy/legacy.js';
import {html, nothing, render, type TemplateResult} from '../../ui/lit/lit.js';

import lockIconStyles from './lockIcon.css.js';
import {OriginTreeElement} from './OriginTreeElement.js';
import {
  createHighlightedUrl,
  getSecurityStateIconForDetailedView,
  getSecurityStateIconForOverview,
  OriginGroup,
} from './SecurityPanel.js';
import type {SecurityPanelSidebarTreeElement} from './SecurityPanelSidebarTreeElement.js';
import sidebarStyles from './sidebar.css.js';

const UIStrings = {
  /**
   * @description Section title for the Security panel's sidebar.
   */
  security: 'Security',
  /**
   * @description Title of the tree item in the Security panel sidebar representing the main origin.
   */
  mainOrigin: 'Main origin',
  /**
   * @description Title of the tree group in the Security panel sidebar for non-secure origins.
   */
  nonsecureOrigins: 'Non-secure origins',
  /**
   * @description Title of the tree group in the Security panel sidebar for secure origins.
   */
  secureOrigins: 'Secure origins',
  /**
   * @description Title of the tree group in the Security panel sidebar for unknown or canceled origins.
   */
  unknownCanceled: 'Unknown / canceled',
  /**
   * @description Title of the overview tree item in the Security panel sidebar.
   */
  overview: 'Overview',
  /**
   * @description Message shown in the Security panel sidebar prompting the user to reload the page to record origins.
   */
  reloadToViewDetails: 'Reload to view details',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/security/SecurityPanelSidebar.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface ViewInput {
  mainOrigin: string|null;
  origins: Map<Platform.DevToolsPath.UrlString, Protocol.Security.SecurityState>;
  originsHidden: boolean;
  showOriginsUnconditionally: boolean;
  overviewSecurityState: Protocol.Security.SecurityState;
  selectedElementId: string;
}

export interface ViewOutput {
  onElementSelected: (id: string) => void;
  onShowOrigin: (origin: Platform.DevToolsPath.UrlString|null) => void;
}

export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, output, target) => {
  const renderIcon = (icon: Icon): TemplateResult => html`${icon}`;

  const renderOrigin =
      (origin: Platform.DevToolsPath.UrlString, state: Protocol.Security.SecurityState): TemplateResult => {
        const icon = getSecurityStateIconForDetailedView(state, `security-property security-property-${state}`);
        const selected = input.selectedElementId === origin;
        // clang-format off
        return html`
          <li role="treeitem"
              class="security-sidebar-tree-item"
              title=${origin}
              ?selected=${selected}
              @click=${() => {
                output.onElementSelected(origin);
                output.onShowOrigin(origin);
              }}>
            ${renderIcon(icon)}
            ${createHighlightedUrl(origin, state)}
          </li>
        `;
        // clang-format on
      };

  const getGroupTitle = (group: OriginGroup): string => {
    switch (group) {
      case OriginGroup.MainOrigin:
        return i18nString(UIStrings.mainOrigin);
      case OriginGroup.NonSecure:
        return i18nString(UIStrings.nonsecureOrigins);
      case OriginGroup.Secure:
        return i18nString(UIStrings.secureOrigins);
      case OriginGroup.Unknown:
        return i18nString(UIStrings.unknownCanceled);
    }
  };

  const getGroupIcon = (group: OriginGroup, mainOriginState = Protocol.Security.SecurityState.Unknown): Icon|null => {
    switch (group) {
      case OriginGroup.MainOrigin:
        return getSecurityStateIconForOverview(mainOriginState, `lock-icon lock-icon-${mainOriginState}`);
      case OriginGroup.NonSecure:
        return getSecurityStateIconForDetailedView(Protocol.Security.SecurityState.Insecure,
                                                   `lock-icon lock-icon-${Protocol.Security.SecurityState.Insecure}`);
      case OriginGroup.Secure:
        return getSecurityStateIconForDetailedView(Protocol.Security.SecurityState.Secure,
                                                   `lock-icon lock-icon-${Protocol.Security.SecurityState.Secure}`);
      case OriginGroup.Unknown:
        return getSecurityStateIconForDetailedView(Protocol.Security.SecurityState.Unknown,
                                                   `lock-icon lock-icon-${Protocol.Security.SecurityState.Unknown}`);
    }
  };

  const originsByGroup =
      new Map<OriginGroup, Array<{origin: Platform.DevToolsPath.UrlString, state: Protocol.Security.SecurityState}>>();
  for (const group of Object.values(OriginGroup)) {
    originsByGroup.set(group, []);
  }

  let mainOriginState = Protocol.Security.SecurityState.Unknown;
  const overviewIcon = getSecurityStateIconForOverview(input.overviewSecurityState,
                                                       'lock-icon lock-icon-' + input.overviewSecurityState);
  for (const [origin, state] of input.origins) {
    if (origin === input.mainOrigin) {
      originsByGroup.get(OriginGroup.MainOrigin)?.push({origin, state});
      mainOriginState = state;
    } else {
      switch (state) {
        case Protocol.Security.SecurityState.Secure:
          originsByGroup.get(OriginGroup.Secure)?.push({origin, state});
          break;
        case Protocol.Security.SecurityState.Unknown:
          originsByGroup.get(OriginGroup.Unknown)?.push({origin, state});
          break;
        default:
          originsByGroup.get(OriginGroup.NonSecure)?.push({origin, state});
          break;
      }
    }
  }

  const renderGroup = (group: OriginGroup): TemplateResult => {
    const origins = originsByGroup.get(group) || [];
    const title = getGroupTitle(group);
    const icon = getGroupIcon(group, mainOriginState);
    const isHidden = input.originsHidden ||
        (!input.showOriginsUnconditionally && group !== OriginGroup.MainOrigin && origins.length === 0);
    const showReloadMessage = group === OriginGroup.MainOrigin && input.origins.size === 0;

    // clang-format off
    return html`
      <li role="treeitem" class="security-sidebar-origins" open ?hidden=${isHidden}>
        ${icon ? renderIcon(icon) : nothing}
        <span class="security-sidebar-origins-title">${title}</span>
        <ul role="group" aria-label=${title}>
          ${showReloadMessage ? html`
            <li role="treeitem" class="security-main-view-reload-message" aria-disabled="true">
              ${i18nString(UIStrings.reloadToViewDetails)}
            </li>
          ` : nothing}
          ${origins.map(o => renderOrigin(o.origin, o.state))}
        </ul>
      </li>
    `;
    // clang-format on
  };

  // clang-format off
  render(html`
    <devtools-tree class="security-sidebar" navigation-variant .template=${html`
      <ul role="tree">
        <li role="treeitem" class="security-group-list-item" aria-level="3" aria-label=${i18nString(UIStrings.security)}>
          ${i18nString(UIStrings.security)}
          <ul role="group">
            <li role="treeitem"
                class="security-main-view-sidebar-tree-item"
                title=${i18nString(UIStrings.overview)}
                ?selected=${input.selectedElementId === 'overview'}
                @click=${() => {
                  output.onElementSelected('overview');
                  output.onShowOrigin(null);
                }}>
              ${renderIcon(overviewIcon)}
              <span title=${i18nString(UIStrings.overview)}>${i18nString(UIStrings.overview)}</span>
            </li>
            ${Object.values(OriginGroup).map(group => renderGroup(group))}
          </ul>
        </li>
      </ul>
    `}></devtools-tree>
  `, target);
  // clang-format on
};

export class SecurityPanelSidebar extends UI.Widget.VBox {
  readonly #securitySidebarLastItemSetting: Common.Settings.Setting<string>;
  readonly sidebarTree: UI.TreeOutline.TreeOutlineInShadow;
  readonly #originGroupTitles: Map<OriginGroup, {title: string, icon?: Icon}>;
  #originGroups: Map<OriginGroup, UI.TreeOutline.TreeElement>;
  securityOverviewElement: OriginTreeElement;
  readonly #elementsByOrigin: Map<string, OriginTreeElement>;
  readonly #mainViewReloadMessage: UI.TreeOutline.TreeElement;
  #mainOrigin: string|null;

  constructor(element?: HTMLElement) {
    super(element);

    this.#securitySidebarLastItemSetting =
        Common.Settings.Settings.instance().createSetting('security-last-selected-element-path', '');
    this.#mainOrigin = null;

    this.sidebarTree = new UI.TreeOutline.TreeOutlineInShadow(UI.TreeOutline.TreeVariant.NAVIGATION_TREE);
    this.sidebarTree.registerRequiredCSS(lockIconStyles, sidebarStyles);
    this.sidebarTree.element.classList.add('security-sidebar');
    this.contentElement.appendChild(this.sidebarTree.element);

    const securitySectionTitle = i18nString(UIStrings.security);
    const securityTreeSection = this.#addSidebarSection(securitySectionTitle, 'security');

    this.securityOverviewElement =
        new OriginTreeElement('security-main-view-sidebar-tree-item', this.#renderTreeElement);
    this.securityOverviewElement.tooltip = i18nString(UIStrings.overview);
    securityTreeSection.appendChild(this.securityOverviewElement);

    this.#originGroupTitles = new Map([
      [OriginGroup.MainOrigin, {title: i18nString(UIStrings.mainOrigin)}],
      [
        OriginGroup.NonSecure,
        {
          title: i18nString(UIStrings.nonsecureOrigins),
          icon: getSecurityStateIconForDetailedView(
              Protocol.Security.SecurityState.Insecure,
              `lock-icon lock-icon-${Protocol.Security.SecurityState.Insecure}`),
        },
      ],
      [
        OriginGroup.Secure,
        {
          title: i18nString(UIStrings.secureOrigins),
          icon: getSecurityStateIconForDetailedView(
              Protocol.Security.SecurityState.Secure, `lock-icon lock-icon-${Protocol.Security.SecurityState.Secure}`),
        },
      ],
      [
        OriginGroup.Unknown,
        {
          title: i18nString(UIStrings.unknownCanceled),
          icon: getSecurityStateIconForDetailedView(
              Protocol.Security.SecurityState.Unknown,
              `lock-icon lock-icon-${Protocol.Security.SecurityState.Unknown}`),
        },
      ],
    ]);

    this.#originGroups = new Map();
    for (const group of Object.values(OriginGroup)) {
      const element = this.#createOriginGroupElement(
          this.#originGroupTitles.get(group)?.title as string, this.#originGroupTitles.get(group)?.icon);
      this.#originGroups.set(group, element);
      securityTreeSection.appendChild(element);
    }

    this.#mainViewReloadMessage = new UI.TreeOutline.TreeElement(i18nString(UIStrings.reloadToViewDetails));
    this.#mainViewReloadMessage.selectable = false;
    this.#mainViewReloadMessage.listItemElement.classList.add('security-main-view-reload-message');
    const treeElement = this.#originGroups.get(OriginGroup.MainOrigin);
    (treeElement as UI.TreeOutline.TreeElement).appendChild(this.#mainViewReloadMessage);

    this.#clearOriginGroups();

    this.#elementsByOrigin = new Map();

    this.element.addEventListener('update-sidebar-selection', (event: Event) => {
      const id: string = (event as CustomEvent).detail.id;
      this.#securitySidebarLastItemSetting.set(id);
    });
    this.showLastSelectedElement();
  }

  // Used in web tests
  elementsByOrigin(): Map<string, OriginTreeElement> {
    return this.#elementsByOrigin;
  }

  showLastSelectedElement(): void {
    this.securityOverviewElement.select();
    this.securityOverviewElement.showElement();
  }

  #addSidebarSection(title: string, jslogContext: string): UI.TreeOutline.TreeElement {
    const treeElement = new UI.TreeOutline.TreeElement(title, true, jslogContext);
    treeElement.listItemElement.classList.add('security-group-list-item');
    treeElement.setCollapsible(false);
    treeElement.selectable = false;
    this.sidebarTree.appendChild(treeElement);
    UI.ARIAUtils.markAsHeading(treeElement.listItemElement, 3);
    UI.ARIAUtils.setLabel(treeElement.childrenListElement, title);
    return treeElement;
  }

  #originGroupTitle(originGroup: OriginGroup): string {
    return this.#originGroupTitles.get(originGroup)?.title as string;
  }

  #originGroupElement(originGroup: OriginGroup): UI.TreeOutline.TreeElement {
    return this.#originGroups.get(originGroup) as UI.TreeOutline.TreeElement;
  }

  #createOriginGroupElement(originGroupTitle: string, originGroupIcon?: Icon): UI.TreeOutline.TreeElement {
    const originGroup = new UI.TreeOutline.TreeElement(originGroupTitle, true);
    originGroup.expand();
    originGroup.listItemElement.classList.add('security-sidebar-origins');
    if (originGroupIcon) {
      originGroup.setLeadingIcons([originGroupIcon]);
    }
    UI.ARIAUtils.setLabel(originGroup.childrenListElement, originGroupTitle);
    return originGroup;
  }

  toggleOriginsList(hidden: boolean): void {
    for (const element of this.#originGroups.values()) {
      element.hidden = hidden;
    }
  }

  addOrigin(origin: Platform.DevToolsPath.UrlString, securityState: Protocol.Security.SecurityState): void {
    this.#mainViewReloadMessage.hidden = true;
    const originElement = new OriginTreeElement('security-sidebar-tree-item', this.#renderTreeElement, origin);
    originElement.tooltip = origin;
    this.#elementsByOrigin.set(origin, originElement);
    this.updateOrigin(origin, securityState);
  }

  setMainOrigin(origin: string): void {
    this.#mainOrigin = origin;
  }

  get mainOrigin(): string|null {
    return this.#mainOrigin;
  }

  get originGroups(): Map<OriginGroup, UI.TreeOutline.TreeElement> {
    return this.#originGroups;
  }

  updateOrigin(origin: string, securityState: Protocol.Security.SecurityState): void {
    const originElement = this.#elementsByOrigin.get(origin) as OriginTreeElement;
    originElement.setSecurityState(securityState);

    let newParent: UI.TreeOutline.TreeElement;
    if (origin === this.#mainOrigin) {
      newParent = this.#originGroups.get(OriginGroup.MainOrigin) as UI.TreeOutline.TreeElement;
      newParent.title = i18nString(UIStrings.mainOrigin);
      if (securityState === Protocol.Security.SecurityState.Secure) {
        newParent.setLeadingIcons(
            [getSecurityStateIconForOverview(securityState, `lock-icon lock-icon-${securityState}`)]);
      } else {
        newParent.setLeadingIcons(
            [getSecurityStateIconForOverview(securityState, `lock-icon lock-icon-${securityState}`)]);
      }
      UI.ARIAUtils.setLabel(newParent.childrenListElement, newParent.title);
    } else {
      switch (securityState) {
        case Protocol.Security.SecurityState.Secure:
          newParent = this.#originGroupElement(OriginGroup.Secure);
          break;
        case Protocol.Security.SecurityState.Unknown:
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

  #clearOriginGroups(): void {
    for (const [originGroup, originGroupElement] of this.#originGroups) {
      if (originGroup === OriginGroup.MainOrigin) {
        for (let i = originGroupElement.childCount() - 1; i > 0; i--) {
          originGroupElement.removeChildAtIndex(i);
        }
        originGroupElement.title = this.#originGroupTitle(OriginGroup.MainOrigin);
        originGroupElement.hidden = false;
        this.#mainViewReloadMessage.hidden = false;
      } else {
        originGroupElement.removeChildren();
        originGroupElement.hidden = true;
      }
    }
  }

  clearOrigins(): void {
    this.#clearOriginGroups();
    this.#elementsByOrigin.clear();
  }

  override focus(): void {
    this.sidebarTree.focus();
  }

  #renderTreeElement(element: SecurityPanelSidebarTreeElement): void {
    if (element instanceof OriginTreeElement) {
      const securityState = element.securityState() ?? Protocol.Security.SecurityState.Unknown;

      const isOverviewElement = element.listItemElement.classList.contains('security-main-view-sidebar-tree-item');

      const icon = isOverviewElement ?
          getSecurityStateIconForOverview(securityState, `lock-icon lock-icon-${securityState}`) :
          getSecurityStateIconForDetailedView(securityState, `security-property security-property-${securityState}`);

      element.setLeadingIcons([icon]);

      if (isOverviewElement) {
        element.title = i18nString(UIStrings.overview);
      } else {
        const elementTitle =
            createHighlightedUrl(element.origin() ?? Platform.DevToolsPath.EmptyUrlString, securityState);
        if (element.listItemElement.lastChild) {
          element.listItemElement.removeChild(element.listItemElement.lastChild);
        }
        element.listItemElement.appendChild(elementTitle);
      }
    }
  }
}
