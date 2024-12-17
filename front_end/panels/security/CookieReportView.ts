// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as LitHtml from '../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import cookieReportViewStyles from './cookieReportView.css.js';

const {render, html, Directives: {ref}} = LitHtml;

const UIStrings = {
  /**
   *@description Title in the header for the third-party cookie report in the Security & Privacy Panel
   */
  title: 'Third-party cookies',
  /**
   *@description Explaination in the header about the cookies listed in the report
   */
  body:
      'Third-party cookies that might be restricted by users, depending on their settings. If a user chooses to restrict cookies, then this site might not work for them.',
  /**
   *@description A link the user can follow to learn more about third party cookie usage
   */
  learnMoreLink: 'Learn more about how third-party cookies are used',
  /**
   *@description Column header for Cookie Report table. This column will contain the name of the cookie
   */
  name: 'Name',
  /**
   *@description Column header for Cookie Report table. This column will contain the domain of the cookie
   */
  domain: 'Domain',
  /**
   *@description Column header for Cookie Report table. This column will contain the type of the cookie. E.g. Advertisement, Marketing, etc.
   */
  type: 'Type',
  /**
   *@description Column header for Cookie Report table. This column will contain the third-party of the cookie. E.g. Amazon Analytics, etc.
   */
  platform: 'Platform',
  /**
   *@description Column header for Cookie Report table, This column will contain the actionable step the user can take (if any) for the cookie
   */
  recommendation: 'Recommendation',
  /**
   *@description Column header for Cookie Report table. This column will contain the blocked or allowed status of the cookie. See status strings below for more information on the different statuses
   */
  status: 'Status',
  /**
   *@description Status string in the cookie report for a third-party cookie that is allowed without any sort of exception. This is also used as filter chip text to allow the user to filter the table based on cookie status
   */
  allowed: 'Allowed',
  /**
   *@description Status string in the cookie report for a third-party cookie that is allowed due to a grace period or heuristic exception. Otherwise, this would have been blocked. This is also used as filter chip text to allow the user to filter the table based on cookie status
   */
  allowedByException: 'Allowed By Exception',
  /**
   *@description Status string in the cookie report for a third-party cookie that was blocked. This is also used as filter chip text to allow the user to filter the table based on cookie status
   */
  blocked: 'Blocked',
  /**
   *@description String in the Cookie Report table. This is used when any data could not be fetched and that cell is unknown
   */
  unknown: 'Unknown',
  /**
   *@description Display name for the Cookie Report table. This string is used by the data grid for accessibility.
   */
  report: 'Third-Party Cookie Report',
  /**
   *@description The main string the user sees when there are no cookie issues to show. This will take place of the table
   */
  emptyReport: 'Not a crumb left',
  /**
   *@description Explanation to the user that there were no third-party cookie related issues found which is why they are not seeing the table/report
   */
  emptyReportExplanation: 'No issues with third-party cookies found',
  /**
   *@description String in Cookie Report table. This is used when a cookie's domain has an entry in the third-party cookie migration readiness list GitHub.
   *@example {guidance} PH1
   */
  gitHubResource: 'Review {PH1} from third-party site.',
  /**
   *@description Label for a link to an entry in the third-party cookie migration readiness list GitHub.
   */
  guidance: 'guidance',
  /**
   *@description String in Cookie Report table. This is used when a cookie has a grace period exception.
   *@example {reported issues} PH1
   */
  gracePeriod: 'Review {PH1}. Grace period exception is active.',
  /**
   *@description Label for a link to third-party cookie site compatability look-up.
   */
  reportedIssues: 'reported issues',
  /**
   *@description String in Cookie Report table. This is used when a cookie has a heuristics exception.
   */
  heuristics: 'Action needed later. Heuristics based exception is active',
  /**
   *@description String in Cookie Report table. This is used when a cookie's domain does not have an entry in the third-party cookie migration readiness list Github nor a grace period nor heuristics exception.
   */
  other: 'Contact third-party site for more info',
  /**
   *@description String representing the GitHubResource insight type. Used as filter chip text to allow the user to filter the table based on recommendation.
   */
  gitHubResourceTypeString: 'Github',
  /**
   *@description String representing the GracePeriod insight type. Used as filter chip text to allow the user to filter the table based on recommendation.
   */
  gracePeriodTypeString: 'Grace Period',
  /**
   *@description String representing the GitHubResource insight type. Used as filter chip text to allow the user to filter the table based on recommendation.
   */
  heuristicsTypeString: 'Heuristics',
  /**
   *@description String representing a null insight type. Used as filter chip text to allow the user to filter the table based on recommendation.
   */
  otherTypeString: 'Other',
};
const str_ = i18n.i18n.registerUIStrings('panels/security/CookieReportView.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface ViewInput {
  gridData: DataGrid.DataGrid.DataGridNode<CookieReportNodeData>[];
  onFilterChanged: () => void;
  onSortingChanged: () => void;
}
export interface ViewOutput {
  namedBitSetFilterUI?: UI.FilterBar.NamedBitSetFilterUI;
  dataGrid?: DataGrid.DataGrid.DataGridImpl<CookieReportNodeData>;
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

const filterItems: UI.FilterBar.Item[] = [
  {
    name: UIStrings.blocked,
    label: () => i18nString(UIStrings.blocked),
    title: UIStrings.blocked,
    jslogContext: UIStrings.blocked,
  },
  {
    name: UIStrings.allowed,
    label: () => i18nString(UIStrings.allowed),
    title: UIStrings.allowed,
    jslogContext: UIStrings.allowed,
  },
  {
    name: UIStrings.allowedByException,
    label: () => i18nString(UIStrings.allowedByException),
    title: UIStrings.allowedByException,
    jslogContext: UIStrings.allowedByException,
  },
];

export class CookieReportView extends UI.Widget.VBox {
  #issuesManager?: IssuesManager.IssuesManager.IssuesManager;
  namedBitSetFilterUI?: UI.FilterBar.NamedBitSetFilterUI;
  #cookieRows: Map<string, IssuesManager.CookieIssue.CookieReportInfo> = new Map();
  #view: View;
  dataGrid?: DataGrid.DataGrid.DataGridImpl<CookieReportNodeData>;
  gridData: DataGrid.DataGrid.DataGridNode<CookieReportNodeData>[] = [];

  constructor(element?: HTMLElement, view: View = (input, output, target) => {
    const dataGridOptions: DataGrid.DataGrid.DataGridWidgetOptions<CookieReportNodeData> = {
      nodes: input.gridData,
      displayName: i18nString(UIStrings.report),
      columns: [
        {id: 'name', title: i18nString(UIStrings.name), weight: 1, sortable: true},
        {id: 'domain', title: i18nString(UIStrings.domain), weight: 1, sortable: true},
        {id: 'type', title: i18nString(UIStrings.type), weight: 1, sortable: true},
        {id: 'platform', title: i18nString(UIStrings.platform), weight: 1, sortable: true},
        {id: 'status', title: i18nString(UIStrings.status), weight: 1, sortable: true},
        {id: 'recommendation', title: i18nString(UIStrings.recommendation), weight: 1, sortable: true},
      ],
      striped: true,
    };

    // clang-format off
    render(html `
        <div class="report overflow-auto">
            <div class="header">
              <div class="title">${i18nString(UIStrings.title)}</div>
              <div class="body">${i18nString(UIStrings.body)} <x-link class="x-link" href="https://developers.google.com/privacy-sandbox/cookies/prepare/audit-cookies" jslog=${VisualLogging.link('learn-more').track({click: true})}>${i18nString(UIStrings.learnMoreLink)}</x-link></div>
            </div>
            ${input.gridData.length > 0 ?
              html`
                <devtools-named-bit-set-filter
                  class="filter"
                  @filterChanged=${input.onFilterChanged}
                  .options=${{items: filterItems}}
                  ${ref((el?: Element) => {
                    if(el instanceof UI.FilterBar.NamedBitSetFilterUIElement){
                      output.namedBitSetFilterUI = el.getOrCreateNamedBitSetFilterUI();
                    }
                  })}
                ></devtools-named-bit-set-filter>
                <!-- @ts-ignore -->
                <devtools-data-grid-widget
                  @sortingChanged=${input.onSortingChanged}
                  .options=${dataGridOptions}
                  ${UI.Widget.widgetRef(DataGrid.DataGrid.DataGridWidget, w => {
                    output.dataGrid = w.dataGrid;
                  })}
                ></devtools-data-grid-widget>
              ` :
              html `
                <div class="empty-report">
                  <devtools-icon
                    class="cookie-off"
                    .name=${'cookie_off'}
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
    super(true, undefined, element);
    this.#view = view;

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

    this.update();
  }

  override async doUpdate(): Promise<void> {
    this.gridData = this.#buildNodes();
    this.#view(this, this, this.contentElement);
  }

  onFilterChanged(): void {
    this.update();
  }

  onSortingChanged(): void {
    this.update();
  }

  #onPrimaryPageChanged(): void {
    this.#cookieRows.clear();
    this.update();
  }

  #onIssueEventReceived(event: Common.EventTarget.EventTargetEvent<IssuesManager.IssuesManager.IssueAddedEvent>): void {
    if (event.data.issue instanceof IssuesManager.CookieIssue.CookieIssue) {
      if (this.#cookieRows.has(event.data.issue.cookieId())) {
        return;
      }
      this.#onIssueAdded(event.data.issue);
      this.update();
    }
  }

  #onIssueAdded(issue: IssuesManager.CookieIssue.CookieIssue): void {
    const info = issue.makeCookieReportEntry();
    if (info) {
      this.#cookieRows.set(issue.cookieId(), info);
    }
  }

  #buildNodes(): DataGrid.DataGrid.DataGridNode<CookieReportNodeData>[] {
    return [...this.#cookieRows.values()]
        .filter(row => {
          if (this.namedBitSetFilterUI) {
            return this.namedBitSetFilterUI.accept(CookieReportView.getStatusString(row.status));
          }
          return true;
        })
        .sort((a, b) => {
          if (!this.dataGrid) {
            return 0;
          }
          const columnId = this.dataGrid.sortColumnId();
          let result = 0;
          if (columnId === 'name') {
            result = a.name.localeCompare(b.name);
          } else if (columnId === 'domain') {
            result = a.domain.localeCompare(b.domain);
          } else if (columnId === 'type') {
            result = (a.type ?? i18nString(UIStrings.unknown)).localeCompare((b.type ?? i18nString(UIStrings.unknown)));
          } else if (columnId === 'platform') {
            result = (a.platform ?? i18nString(UIStrings.unknown))
                         .localeCompare((b.platform ?? i18nString(UIStrings.unknown)));
          } else if (columnId === 'status') {
            result =
                CookieReportView.getStatusString(a.status).localeCompare(CookieReportView.getStatusString(b.status));
          } else if (columnId === 'recommendation') {
            result = CookieReportView.getInsightTypeString(a.insight).localeCompare(
                CookieReportView.getInsightTypeString(b.insight));
          }
          return this.dataGrid.isSortOrderAscending() ? result : -result;
        })
        .map(
            row => new DataGrid.DataGrid.DataGridNode<CookieReportNodeData>(
                {
                  name: row.name,
                  domain: row.domain,
                  type: row.type ?? i18nString(UIStrings.unknown),
                  platform: row.platform ?? i18nString(UIStrings.unknown),
                  status: CookieReportView.getStatusString(row.status),
                  recommendation: CookieReportView.getRecommendation(row.domain, row.insight),
                } as CookieReportNodeData,
                ));
  }

  override wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([cookieReportViewStyles]);
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

  static getInsightTypeString(insight?: Protocol.Audits.CookieIssueInsight): string {
    if (!insight) {
      return i18nString(UIStrings.otherTypeString);
    }

    switch (insight.type) {
      case Protocol.Audits.InsightType.GitHubResource:
        return i18nString(UIStrings.gitHubResourceTypeString);
      case Protocol.Audits.InsightType.GracePeriod:
        return i18nString(UIStrings.gracePeriodTypeString);
      case Protocol.Audits.InsightType.Heuristics:
        return i18nString(UIStrings.heuristicsTypeString);
      default:
        return i18nString(UIStrings.otherTypeString);
    }
  }

  static getRecommendation(domain: string, insight?: Protocol.Audits.CookieIssueInsight): HTMLElement {
    const recElem = document.createElement('div');

    render(CookieReportView.getRecommendationText(domain, insight), recElem, {host: this});
    return recElem;
  }

  static getRecommendationText(domain: string, insight?: Protocol.Audits.CookieIssueInsight): LitHtml.TemplateResult {
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
        const gracePeriodLink = UI.XLink.XLink.create(
            'https://developers.google.com/privacy-sandbox/cookies/dashboard?url=' +
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
}
