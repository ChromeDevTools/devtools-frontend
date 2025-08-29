// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import '../../ui/legacy/components/data_grid/data_grid.js';

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import type * as TextUtils from '../../models/text_utils/text_utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as NetworkForward from '../network/forward/forward.js';

import cookieReportViewStyles from './cookieReportView.css.js';

const {render, html, Directives: {ref}} = Lit;

const UIStrings = {
  /**
   * @description Title in the header for the third-party cookie report in the Security & Privacy Panel
   */
  title: 'Third-party cookies',
  /**
   * @description Explanation in the header about the cookies listed in the report
   */
  body: 'This site might not work if third-party cookies and other cookies are limited in Chrome.',
  /**
   * @description A link the user can follow to learn more about third party cookie usage
   */
  learnMoreLink: 'Learn more about how third-party cookies are used',
  /**
   * @description Column header for Cookie Report table. This column will contain the name of the cookie
   */
  name: 'Name',
  /**
   * @description Column header for Cookie Report table. This column will contain the domain of the cookie
   */
  domain: 'Domain',
  /**
   * @description Column header for Cookie Report table. This column will contain the type of the cookie. E.g. Advertisement, Marketing, etc.
   */
  type: 'Type',
  /**
   * @description Column header for Cookie Report table. This column will contain the third-party of the cookie. E.g. Amazon Analytics, etc.
   */
  platform: 'Platform',
  /**
   * @description Column header for Cookie Report table, This column will contain the actionable step the user can take (if any) for the cookie
   */
  recommendation: 'Recommendation',
  /**
   * @description Column header for Cookie Report table. This column will contain the blocked or allowed status of the cookie. See status strings below for more information on the different statuses
   */
  status: 'Status',
  /**
   * @description Status string in the cookie report for a third-party cookie that is allowed without any sort of exception. This is also used as filter chip text to allow the user to filter the table based on cookie status
   */
  allowed: 'Allowed',
  /**
   * @description Status string in the cookie report for a third-party cookie that is allowed due to a grace period or heuristic exception. Otherwise, this would have been blocked. This is also used as filter chip text to allow the user to filter the table based on cookie status
   */
  allowedByException: 'Allowed by exception',
  /**
   * @description Status string in the cookie report for a third-party cookie that was blocked. This is also used as filter chip text to allow the user to filter the table based on cookie status
   */
  blocked: 'Blocked',
  /**
   * @description String in the Cookie Report table. This is used when any data could not be fetched and that cell is unknown
   */
  unknown: 'Unknown',
  /**
   * @description Display name for the Cookie Report table. This string is used by the data grid for accessibility.
   */
  report: 'Third-Party Cookie Report',
  /**
   * @description The main string the user sees when there are no cookie issues to show. This will take place of the table
   */
  emptyReport: 'Not a crumb left',
  /**
   * @description Explanation to the user that there were no third-party cookie related issues found which is why they are not seeing the table/report
   */
  emptyReportExplanation: 'No issues with third-party cookies found',
  /**
   * @description String in Cookie Report table. This is used when a cookie's domain has an entry in the third-party cookie migration readiness list GitHub.
   * @example {guidance} PH1
   */
  gitHubResource: 'Review {PH1} from third-party site',
  /**
   * @description Label for a link to an entry in the third-party cookie migration readiness list GitHub.
   */
  guidance: 'guidance',
  /**
   * @description String in Cookie Report table. This is used when a cookie has a grace period exception.
   * @example {reported issues} PH1
   */
  gracePeriod: 'Review {PH1}. Grace period exception is active.',
  /**
   * @description Label for a link to third-party cookie site compatibility look-up.
   */
  reportedIssues: 'reported issues',
  /**
   * @description String in Cookie Report table. This is used when a cookie has a heuristics exception.
   */
  heuristics: 'Action needed later. Heuristics based exception is active.',
  /**
   * @description String in Cookie Report table. This is used when a cookie's domain does not have an entry in the third-party cookie migration readiness list Github nor a grace period nor heuristics exception.
   */
  other: 'Contact third-party site for more info',
  /**
   * @description String representing the Advertising cookie type. Used to format 'ad' category from the Third Party Web dataset.
   */
  adCookieTypeString: 'Advertising',
  /**
   * @description String representing the Analytics cookie type. Used to format 'analytics' category from the Third Party Web dataset.
   */
  analyticsCookieTypeString: 'Analytics',
  /**
   * @description String representing the Social cookie type. Used to format 'social' category from the Third Party Web dataset.
   */
  socialCookieTypeString: 'Social',
  /**
   * @description String representing the Video cookie type. Used to format 'video' category from the Third Party Web dataset.
   */
  videoCookieTypeString: 'Video',
  /**
   * @description String representing the Utility cookie type. Used to format 'utility' category from the Third Party Web dataset.
   */
  utilityCookieTypeString: 'Utility',
  /**
   * @description String representing the Hosting cookie type. Used to format 'hosting' category from the Third Party Web dataset.
   */
  hostingCookieTypeString: 'Hosting',
  /**
   * @description String representing the Marketing cookie type. Used to format 'marketing' category from the Third Party Web dataset.
   */
  marketingCookieTypeString: 'Marketing',
  /**
   * @description String representing the Customer Success cookie type. Used to format 'customer-success' category from the Third Party Web dataset.
   */
  customerSuccessCookieTypeString: 'Customer Success',
  /**
   * @description String representing the Content cookie type. Used to format 'content' category from the Third Party Web dataset.
   */
  contentCookieTypeString: 'Content',
  /**
   * @description String representing the CDN cookie type. Used to format 'cdn' category from the Third Party Web dataset.
   */
  cdnCookieTypeString: 'CDN',
  /**
   * @description String representing the Tag Manager cookie type. Used to format 'tag-manager' category from the Third Party Web dataset.
   */
  tagManagerCookieTypeString: 'Tag Manager',
  /**
   * @description String representing the Consent Provider cookie type. Used to format 'consent-provider' category from the Third Party Web dataset.
   */
  consentProviderCookieTypeString: 'Consent Provider',
  /**
   * @description String representing the Other cookie type. Used to format 'other' category from the Third Party Web dataset.
   */
  otherCookieTypeString: 'Other',
  /**
   * @description String that shows up in the context menu when right clicking one of the entries in the cookie report.
   */
  showRequestsWithThisCookie: 'Show requests with this cookie',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/security/CookieReportView.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface ViewInput {
  cookieRows: IssuesManager.CookieIssue.CookieReportInfo[];
  filterItems: UI.FilterBar.Item[];
  filters: TextUtils.TextUtils.ParsedFilter[];
  searchText: string;
  onSearchFilterChanged: (e: CustomEvent<string>) => void;
  onFilterChanged: () => void;
  onSortingChanged: () => void;
  populateContextMenu: (event: CustomEvent<{menu: UI.ContextMenu.ContextMenu, element: HTMLElement}>) => void;
}
export interface ViewOutput {
  namedBitSetFilterUI?: UI.FilterBar.NamedBitSetFilterUI;
}

export interface CookieReportNodeData {
  name: string;
  domain: string;
  type: string;
  platform: string;
  status: string;
  recommendation: HTMLElement;
}

export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;

export class CookieReportView extends UI.Widget.VBox {
  #issuesManager?: IssuesManager.IssuesManager.IssuesManager;
  namedBitSetFilterUI?: UI.FilterBar.NamedBitSetFilterUI;
  #cookieRows = new Map<string, IssuesManager.CookieIssue.CookieReportInfo>();
  #view: View;
  filterItems: UI.FilterBar.Item[] = [];
  searchText: string;

  constructor(element?: HTMLElement, view: View = (input, output, target) => {
    // clang-format off
    render(html `
        <div class="report overflow-auto">
            <div class="header">
              <h1>${i18nString(UIStrings.title)}</h1>
              <div class="body">${i18nString(UIStrings.body)} <x-link class="devtools-link" href="https://developers.google.com/privacy-sandbox/cookies/prepare/audit-cookies" jslog=${VisualLogging.link('learn-more').track({click: true})}>${i18nString(UIStrings.learnMoreLink)}</x-link></div>
            </div>
            ${input.cookieRows.length > 0 ?
              html`
                <div class="filters-container">
                  <devtools-toolbar>
                    <devtools-toolbar-input
                      type="filter"
                      style="flex-grow: 0.4;"
                      @change=${input.onSearchFilterChanged}
                      value=${input.searchText}
                    ></devtools-toolbar-input>
                  </devtools-toolbar>
                  <devtools-named-bit-set-filter
                    class="filter"
                    aria-label="Third-party cookie status filters"
                    @filterChanged=${input.onFilterChanged}
                    .options=${{items: input.filterItems}}
                    ${ref((el?: Element) => {
                      if(el instanceof UI.FilterBar.NamedBitSetFilterUIElement){
                        output.namedBitSetFilterUI = el.getOrCreateNamedBitSetFilterUI();
                      }
                    })}
                  ></devtools-named-bit-set-filter>
                </div>
                <!-- @ts-ignore -->
                <devtools-data-grid
                  name=${i18nString(UIStrings.report)}
                  striped
                  .filters=${input.filters}
                  @sort=${input.onSortingChanged}
                  @contextmenu=${input.populateContextMenu.bind(input)}
                >
                  <table>
                    <tr>
                      <th id="name" sortable>${i18nString(UIStrings.name)}</th>
                      <th id="domain" sortable>${i18nString(UIStrings.domain)}</th>
                      <th id="type" sortable>${i18nString(UIStrings.type)}</th>
                      <th id="platform" sortable>${i18nString(UIStrings.platform)}</th>
                      <th id="status" sortable>${i18nString(UIStrings.status)}</th>
                      <th id="recommendation" sortable>${i18nString(UIStrings.recommendation)}</th>
                    </tr>
                    ${[...input.cookieRows.values()].map(row => html`
                      <tr data-name=${row.name} data-domain=${row.domain}>
                        <td>${row.name}</td>
                        <td>${row.domain}</td>
                        <td>${CookieReportView.getCookieTypeString(row.type)}</td>
                        <td>${row.platform ?? i18nString(UIStrings.unknown)}</td>
                        <td>${CookieReportView.getStatusString(row.status)}</td>
                        <td>${CookieReportView.getRecommendation(row.domain, row.insight)}</td>
                      </tr>
                    `)}
                  </table>
                </devtools-data-grid>
              ` :
              html `
                <div class="empty-report">
                  <devtools-icon
                    class="cookie-off"
                    name="cookie_off"
                  ></devtools-icon>
                  <div class="empty-report-title">
                    ${i18nString(UIStrings.emptyReport)}
                  </div>
                  <div class="body">
                    ${i18nString(UIStrings.emptyReportExplanation)}
                  </div>
                </div>
              `
            }

        </div>
    `, target, {host: this});
    // clang-format on
  }) {
    super(element, {useShadowDom: true});
    this.#view = view;
    this.registerRequiredCSS(cookieReportViewStyles);
    this.searchText = Common.Settings.Settings.instance().createSetting('cookie-report-search-query', '').get();

    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.PrimaryPageChanged,
        this.#onPrimaryPageChanged, this);

    this.#issuesManager = IssuesManager.IssuesManager.IssuesManager.instance();
    this.#issuesManager.addEventListener(
        IssuesManager.IssuesManager.Events.ISSUE_ADDED, this.#onIssueEventReceived, this);
    for (const issue of this.#issuesManager.issues()) {
      if (issue instanceof IssuesManager.CookieIssue.CookieIssue) {
        this.#onIssueAdded(issue);
      }
    }

    this.requestUpdate();
  }

  override performUpdate(): void {
    this.filterItems = this.#buildFilterItems();
    const viewInput = {
      cookieRows: [...this.#cookieRows.values()].filter(row => {
        if (this.namedBitSetFilterUI) {
          return this.namedBitSetFilterUI.accept(CookieReportView.getStatusString(row.status));
        }
        return true;
      }),
      filters: [{
        key: 'name,domain',
        regex: RegExp(Platform.StringUtilities.escapeForRegExp(this.searchText), 'i'),
        negative: false,
      }],
      searchText: this.searchText,
      filterItems: this.filterItems,
      onSearchFilterChanged: (e: CustomEvent<string>) => this.onSearchFilterChanged(e),
      onFilterChanged: () => this.requestUpdate(),
      onSortingChanged: () => this.requestUpdate(),
      populateContextMenu: this.populateContextMenu.bind(this),
    };
    this.#view(viewInput, this, this.contentElement);
  }

  #onPrimaryPageChanged(): void {
    this.#cookieRows.clear();
    this.namedBitSetFilterUI = undefined;
    this.requestUpdate();
  }

  #onIssueEventReceived(event: Common.EventTarget.EventTargetEvent<IssuesManager.IssuesManager.IssueAddedEvent>): void {
    if (event.data.issue instanceof IssuesManager.CookieIssue.CookieIssue) {
      if (this.#cookieRows.has(event.data.issue.cookieId())) {
        return;
      }
      this.#onIssueAdded(event.data.issue);
      this.requestUpdate();
    }
  }

  #onIssueAdded(issue: IssuesManager.CookieIssue.CookieIssue): void {
    const info = issue.makeCookieReportEntry();
    if (info) {
      this.#cookieRows.set(issue.cookieId(), info);
    }
  }

  onSearchFilterChanged(e: CustomEvent<string>): void {
    this.searchText = e.detail ? e.detail : '';
    Common.Settings.Settings.instance().createSetting('cookie-report-search-query', '').set(this.searchText);
    this.requestUpdate();
  }

  #buildFilterItems(): UI.FilterBar.Item[] {
    const filterItems: UI.FilterBar.Item[] = [];

    if (this.#cookieRows.values().some(n => n.status === IssuesManager.CookieIssue.CookieStatus.BLOCKED)) {
      filterItems.push({
        name: UIStrings.blocked,
        label: () => i18nString(UIStrings.blocked),
        title: UIStrings.blocked,
        jslogContext: 'blocked',
      });
    }
    if (this.#cookieRows.values().some(n => n.status === IssuesManager.CookieIssue.CookieStatus.ALLOWED)) {
      filterItems.push({
        name: UIStrings.allowed,
        label: () => i18nString(UIStrings.allowed),
        title: UIStrings.allowed,
        jslogContext: 'allowed',
      });
    }
    if (this.#cookieRows.values().some(
            n => n.status === IssuesManager.CookieIssue.CookieStatus.ALLOWED_BY_GRACE_PERIOD ||
                n.status === IssuesManager.CookieIssue.CookieStatus.ALLOWED_BY_HEURISTICS)) {
      filterItems.push({
        name: UIStrings.allowedByException,
        label: () => i18nString(UIStrings.allowedByException),
        title: UIStrings.allowedByException,
        jslogContext: 'allowed-by-exception',
      });
    }

    return filterItems;
  }

  populateContextMenu(event: CustomEvent<{menu: UI.ContextMenu.ContextMenu, element: HTMLElement}>): void {
    const {menu, element} = event.detail;
    const {domain, name} = element?.dataset;
    if (!domain || !name) {
      return;
    }

    menu.revealSection().appendItem(i18nString(UIStrings.showRequestsWithThisCookie), () => {
      const requestFilter = NetworkForward.UIFilter.UIRequestFilter.filters([
        {
          filterType: NetworkForward.UIFilter.FilterType.CookieDomain,
          filterValue: domain,
        },
        {
          filterType: NetworkForward.UIFilter.FilterType.CookieName,
          filterValue: name,
        },
      ]);
      void Common.Revealer.reveal(requestFilter);
    }, {jslogContext: 'show-requests-with-this-cookie'});
  }

  static getStatusString(status: IssuesManager.CookieIssue.CookieStatus): string {
    switch (status) {
      case IssuesManager.CookieIssue.CookieStatus.BLOCKED:
        return i18nString(UIStrings.blocked);
      case IssuesManager.CookieIssue.CookieStatus.ALLOWED_BY_GRACE_PERIOD:
      case IssuesManager.CookieIssue.CookieStatus.ALLOWED_BY_HEURISTICS:
        return i18nString(UIStrings.allowedByException);
      case IssuesManager.CookieIssue.CookieStatus.ALLOWED:
        return i18nString(UIStrings.allowed);
    }
  }

  static getRecommendation(domain: string, insight?: Protocol.Audits.CookieIssueInsight): HTMLElement {
    const recElem = document.createElement('div');

    render(CookieReportView.getRecommendationText(domain, insight), recElem, {host: this});
    return recElem;
  }

  static getRecommendationText(domain: string, insight?: Protocol.Audits.CookieIssueInsight): Lit.TemplateResult {
    if (!insight) {
      return html`${i18nString(UIStrings.other)}`;
    }

    switch (insight.type) {
      case Protocol.Audits.InsightType.GitHubResource: {
        const githubLink = UI.XLink.XLink.create(
            insight.tableEntryUrl ?
                insight.tableEntryUrl :
                'https://github.com/privacysandbox/privacy-sandbox-dev-support/blob/main/3pc-migration-readiness.md',
            i18nString(UIStrings.guidance), undefined, undefined, 'readiness-list-link');

        return html`${i18n.i18n.getFormatLocalizedString(str_, UIStrings.gitHubResource, {
          PH1: githubLink,
        })}`;
      }
      case Protocol.Audits.InsightType.GracePeriod: {
        const url = SDK.TargetManager.TargetManager.instance().primaryPageTarget()?.inspectedURL();
        const gracePeriodLink = UI.XLink.XLink.create(
            'https://developers.google.com/privacy-sandbox/cookies/dashboard?url=' +
                // The order of the URLs matters - needs to be 1P + 3P.
                (url ? Common.ParsedURL.ParsedURL.fromString(url)?.host + '+' : '') +
                (domain.charAt(0) === '.' ? domain.substring(1) : domain),
            i18nString(UIStrings.reportedIssues), undefined, undefined, 'compatibility-lookup-link');

        return html`${i18n.i18n.getFormatLocalizedString(str_, UIStrings.gracePeriod, {
          PH1: gracePeriodLink,
        })}`;
      }
      case Protocol.Audits.InsightType.Heuristics:
        return html`${i18nString(UIStrings.heuristics)}`;
      default:
        return html`${i18nString(UIStrings.other)}`;
    }
  }

  static getCookieTypeString(type?: string): string {
    if (!type) {
      return i18nString(UIStrings.otherCookieTypeString);
    }

    switch (type) {
      case 'ad':
        return i18nString(UIStrings.adCookieTypeString);
      case 'analytics':
        return i18nString(UIStrings.analyticsCookieTypeString);
      case 'social':
        return i18nString(UIStrings.socialCookieTypeString);
      case 'video':
        return i18nString(UIStrings.videoCookieTypeString);
      case 'utility':
        return i18nString(UIStrings.utilityCookieTypeString);
      case 'hosting':
        return i18nString(UIStrings.hostingCookieTypeString);
      case 'marketing':
        return i18nString(UIStrings.marketingCookieTypeString);
      case 'customer-success':
        return i18nString(UIStrings.customerSuccessCookieTypeString);
      case 'content':
        return i18nString(UIStrings.contentCookieTypeString);
      case 'cdn':
        return i18nString(UIStrings.cdnCookieTypeString);
      case 'tag-manager':
        return i18nString(UIStrings.tagManagerCookieTypeString);
      case 'consent-provider':
        return i18nString(UIStrings.consentProviderCookieTypeString);
      default:
        return i18nString(UIStrings.otherCookieTypeString);
    }
  }
}
