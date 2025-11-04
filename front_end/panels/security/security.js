var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/security/CookieControlsView.js
var CookieControlsView_exports = {};
__export(CookieControlsView_exports, {
  CookieControlsView: () => CookieControlsView,
  i18nFormatString: () => i18nFormatString,
  i18nString: () => i18nString,
  showInfobar: () => showInfobar
});
import "./../../ui/components/switch/switch.js";
import "./../../ui/components/cards/cards.js";
import "./../../ui/components/chrome_link/chrome_link.js";
import * as Common from "./../../core/common/common.js";
import * as Host from "./../../core/host/host.js";
import * as i18n from "./../../core/i18n/i18n.js";
import * as Root from "./../../core/root/root.js";
import * as SDK from "./../../core/sdk/sdk.js";
import * as Buttons from "./../../ui/components/buttons/buttons.js";
import * as Input from "./../../ui/components/input/input.js";
import * as uiI18n from "./../../ui/i18n/i18n.js";
import * as UI from "./../../ui/legacy/legacy.js";
import { Directives, html, nothing, render } from "./../../ui/lit/lit.js";
import * as VisualLogging from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/security/cookieControlsView.css.js
var cookieControlsView_css_default = `/*
 * Copyright 2024 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.overflow-auto {
  height: 100%;
}

.controls {
  display: flex;
  flex-direction: column;
  padding: var(--sys-size-5) var(--sys-size-3) var(--sys-size-5) var(--sys-size-5);
  min-width: var(--sys-size-33);
}

.header {
  display: flex;
  flex-direction: column;
  gap: var(--sys-size-2);
  padding-left: var(--sys-size-5);
}

h1 {
  margin: 0;
  font: var(--sys-typescale-headline4);
}

.card-container {
  max-width: 100%;
}

.card {
  display: flex;
  flex-direction: column;
  padding: var(--sys-size-6) var(--sys-size-8);
  gap: var(--sys-size-6);

  &.enterprise-disabled {
    color: var(--sys-color-token-subtle);
  }
}

.card-header {
  display: flex;
  align-items: center;
}

.card-header > .lhs {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-right: var(--sys-size-9);

  & > devtools-icon {
    height: var(--sys-size-11);
    width: var(--sys-size-11);
  }
}

.text {
  display: flex;
  flex-direction: column;
  gap: var(--sys-size-2);
}

h2 {
  font: var(--sys-typescale-headline5);
  margin: 0;
}

.body {
  font: var(--sys-typescale-body4-regular);
}

.checkbox-label {
  gap: var(--sys-size-8);
  display: flex;
  align-items: center;
}

.card-row {
  padding-top: var(--sys-size-4);
  padding-bottom: var(--sys-size-4);
  padding-left: var(--sys-size-8);
}

h3 {
  font: var(--sys-typescale-body4-medium);
  margin: 0;
}

.x-link {
  color: var(--sys-color-primary);
  text-decoration-line: underline;
  cursor: pointer;
}

.enterprise {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: var(--sys-size-9);
  padding: var(--sys-size-6) var(--sys-size-8) var(--sys-size-6) var(--sys-size-11);
  align-items: center;

  > .anchor{
    display: flex;
    flex-direction: row;
    gap: var(--sys-size-9);
  }
}

input[type="checkbox"] {
  flex-shrink: 0;
}

.main-text {
  color: var(--sys-color-on-surface);
}

.subtext {
  color: var(--sys-color-on-surface-subtle);
}

/*# sourceURL=${import.meta.resolve("./cookieControlsView.css")} */`;

// gen/front_end/panels/security/CookieControlsView.js
var { ref } = Directives;
var UIStrings = {
  /**
   * @description Title in the view's header for the controls tool in the Privacy & Security panel
   */
  viewTitle: "Controls",
  /**
   * @description Explanation in the view's header about the purpose of this controls tool
   */
  viewExplanation: "Test how this site will perform if third-party cookies are limited in Chrome",
  /**
   * @description Title in the card within the controls tool
   */
  cardTitle: "Temporarily limit third-party cookies",
  /**
   * @description Disclaimer beneath the card title to tell the user that the controls will only persist while devtools is open
   */
  cardDisclaimer: "Only when DevTools is open",
  /**
   * @description Message as part of the banner that prompts the user to reload the page to see the changes take effect. This appears when the user makes any change within the tool
   */
  siteReloadMessage: "To apply your updated controls, reload the page",
  /**
   * @description Title of controls section. These are exceptions that the user will be able to override to test their site
   */
  exceptions: "Exceptions",
  /**
   * @description Explanation of what exceptions are in this context
   */
  exceptionsExplanation: "Scenarios that grant access to third-party cookies",
  /**
   * @description Title for the grace period exception control
   */
  gracePeriodTitle: "Third-party cookie grace period",
  /**
   * @description Explanation of the grace period and a link to learn more
   * @example {grace period} PH1
   */
  gracePeriodExplanation: "If this site or a site embedded on it is enrolled in the {PH1}, then the site can access third-party cookies",
  /**
   * @description Text shown when a site and its embedded resources are not enrolled in a grace period.
   * @example {grace period} PH1
   */
  enrollGracePeriod: "To use this, enroll this site or sites embedded on it in the {PH1}",
  /**
   * @description Text used for link within gracePeriodExplanation and enrollGracePeriod to let the user learn more about the grace period
   */
  gracePeriod: "grace period",
  /**
   * @description Title for the heuristic exception control
   */
  heuristicTitle: "Heuristics based exception",
  /**
   * @description Explanation of the heuristics with a link to learn more about the scenarios in which they apply
   * @example {predefined scenarios} PH1
   */
  heuristicExplanation: "In {PH1} like pop-ups or redirects, a site embedded on this site can access third-party cookies",
  /**
   * @description Text used for link within the heuristicExplanation to let the user learn more about the heuristic exception
   */
  scenarios: "predefined scenarios",
  /**
   * @description Note at the bottom of the controls tool telling the user that their organization has an enterprise policy that controls cookies. This may disable the tool
   */
  enterpriseDisclaimer: "Your organization manages third-party cookie access for this site",
  /**
   * @description Tooltip that appears when the user hovers over the card's enterprise icon
   */
  enterpriseTooltip: "This setting is managed by your organization",
  /**
   * +*@description Button with the enterpise disclaimer that takes the user to the relevant enterprise cookie chrome setting
   */
  viewDetails: "View details",
  /**
   * @description Text shown when the Third-party Cookie Metadata Grants flag or Third-party Cookie Heuristics Grants flag is disabled with a link to the flag in chrome://flags/.
   * @example {#tpcd-heuristics-grants} PH1
   */
  enableFlag: "To use this, set {PH1} to Default",
  /**
   * @description Text used for link within the enableFlag to show users where they can enable the Third-party Cookie Metadata Grants flag.
   */
  tpcdMetadataGrants: "#tpcd-metadata-grants",
  /**
   * @description Text used for link within the enableFlag to show users where they can enable the Third-party Cookie Heuristics Grants flag.
   */
  tpcdHeuristicsGrants: "#tpcd-heuristics-grants"
};
var str_ = i18n.i18n.registerUIStrings("panels/security/CookieControlsView.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var i18nFormatString = uiI18n.getFormatLocalizedString.bind(void 0, str_);
function getChromeFlagsLink(flag) {
  return html`
    <devtools-chrome-link href="chrome://flags/#${flag}" tabindex="0">
     ${flag}
    </devtools-chrome-link>`;
}
var DEFAULT_VIEW = (input, _output, target) => {
  const enterpriseEnabledSetting = Common.Settings.Settings.instance().createSetting(
    "enterprise-enabled",
    input.thirdPartyControlsDict && input.thirdPartyControlsDict.managedBlockThirdPartyCookies && typeof input.thirdPartyControlsDict.managedBlockThirdPartyCookies === "boolean" ? input.thirdPartyControlsDict.managedBlockThirdPartyCookies : false,
    "Global"
    /* Common.Settings.SettingStorageType.GLOBAL */
  );
  const toggleEnabledSetting = Common.Settings.Settings.instance().createSetting(
    "cookie-control-override-enabled",
    input.thirdPartyControlsDict?.thirdPartyCookieRestrictionEnabled ? input.thirdPartyControlsDict.thirdPartyCookieRestrictionEnabled : false,
    "Global"
    /* Common.Settings.SettingStorageType.GLOBAL */
  );
  const gracePeriodDisabledSetting = Common.Settings.Settings.instance().createSetting(
    "grace-period-mitigation-disabled",
    input.thirdPartyControlsDict?.thirdPartyCookieMetadataEnabled ? input.thirdPartyControlsDict.thirdPartyCookieMetadataEnabled : true,
    "Global"
    /* Common.Settings.SettingStorageType.GLOBAL */
  );
  const heuristicsDisabledSetting = Common.Settings.Settings.instance().createSetting(
    "heuristic-mitigation-disabled",
    input.thirdPartyControlsDict?.thirdPartyCookieHeuristicsEnabled ? input.thirdPartyControlsDict.thirdPartyCookieHeuristicsEnabled : true,
    "Global"
    /* Common.Settings.SettingStorageType.GLOBAL */
  );
  const cardHeader = html`
      <div class="card-header">
        <div class="lhs">
          <div class="text">
            <h2 class="main-text">${i18nString(UIStrings.cardTitle)}</h2>
            <div class="body subtext">${i18nString(UIStrings.cardDisclaimer)}</div>
          </div>
          ${Boolean(enterpriseEnabledSetting.get()) ? html`
            <devtools-icon
              tabindex="0"
              name="domain"
              ${ref((el) => {
    UI.Tooltip.Tooltip.install(el, i18nString(UIStrings.enterpriseTooltip));
    el.role = "img";
  })}>
            </devtools-icon>` : nothing}
        </div>
        <div>
          <devtools-switch
            .checked=${Boolean(toggleEnabledSetting.get())}
            .disabled=${Boolean(enterpriseEnabledSetting.get())}
            .label=${"Temporarily limit third-party cookies, only when DevTools is open"}
            data-testid="cookie-control-override"
            @switchchange=${() => {
    input.inputChanged(!toggleEnabledSetting.get(), toggleEnabledSetting);
  }}
            jslog=${VisualLogging.toggle(toggleEnabledSetting.name).track({ click: true })}
          >
          </devtools-switch>
        </div>
      </div>
    `;
  const gracePeriodControlDisabled = (input.thirdPartyControlsDict ? !input.thirdPartyControlsDict.thirdPartyCookieMetadataEnabled : false) || enterpriseEnabledSetting.get() || !toggleEnabledSetting.get() || !input.isGracePeriodActive;
  const gracePeriodControl = html`
      <div class="card-row">
        <label class='checkbox-label'>
          <input type='checkbox'
            .disabled=${gracePeriodControlDisabled}
            .checked=${!gracePeriodControlDisabled && !Boolean(gracePeriodDisabledSetting.get())}
            @change=${() => {
    input.inputChanged(!gracePeriodDisabledSetting.get(), gracePeriodDisabledSetting);
  }}
            jslog=${VisualLogging.toggle(gracePeriodDisabledSetting.name).track({ click: true })}
          >
          <div class="text">
            <div class="body main-text">${i18nString(UIStrings.gracePeriodTitle)}</div>
            <div class="body subtext">
              ${Boolean(enterpriseEnabledSetting.get()) ? i18nFormatString(UIStrings.gracePeriodExplanation, {
    PH1: i18nString(UIStrings.gracePeriod)
  }) : (input.thirdPartyControlsDict ? !input.thirdPartyControlsDict?.thirdPartyCookieMetadataEnabled : false) ? i18nFormatString(UIStrings.enableFlag, {
    PH1: getChromeFlagsLink(UIStrings.tpcdMetadataGrants)
  }) : i18nFormatString(input.isGracePeriodActive ? UIStrings.gracePeriodExplanation : UIStrings.enrollGracePeriod, {
    PH1: UI.Fragment.html`<x-link class="devtools-link" href="https://developers.google.com/privacy-sandbox/cookies/temporary-exceptions/grace-period" jslog=${VisualLogging.link("grace-period-link").track({ click: true })}>${i18nString(UIStrings.gracePeriod)}</x-link>`
  })}
            </div>
          </div>
        </label>
      </div>
    `;
  const heuristicsControlDisabled = (input.thirdPartyControlsDict ? !input.thirdPartyControlsDict.thirdPartyCookieHeuristicsEnabled : false) || enterpriseEnabledSetting.get() || !toggleEnabledSetting.get();
  const heuristicControl = html`
      <div class="card-row">
        <label class='checkbox-label'>
          <input type='checkbox'
            .disabled=${heuristicsControlDisabled}
            .checked=${!heuristicsControlDisabled && !Boolean(heuristicsDisabledSetting.get())}
            @change=${() => {
    input.inputChanged(!heuristicsDisabledSetting.get(), heuristicsDisabledSetting);
  }}
            jslog=${VisualLogging.toggle(heuristicsDisabledSetting.name).track({ click: true })}
          >
          <div class='text'>
            <div class="body main-text">${i18nString(UIStrings.heuristicTitle)}</div>
            <div class="body subtext">
              ${Boolean(enterpriseEnabledSetting.get()) ? i18nFormatString(UIStrings.heuristicExplanation, {
    PH1: i18nString(UIStrings.scenarios)
  }) : (input.thirdPartyControlsDict ? !input.thirdPartyControlsDict.thirdPartyCookieHeuristicsEnabled : false) ? i18nFormatString(UIStrings.enableFlag, {
    PH1: getChromeFlagsLink(UIStrings.tpcdHeuristicsGrants)
  }) : i18nFormatString(UIStrings.heuristicExplanation, {
    PH1: UI.Fragment.html`<x-link class="devtools-link" href="https://developers.google.com/privacy-sandbox/cookies/temporary-exceptions/heuristics-based-exceptions" jslog=${VisualLogging.link("heuristic-link").track({ click: true })}>${i18nString(UIStrings.scenarios)}</x-link>`
  })}
            </div>
          </div>
        </label>
      </div>
    `;
  const enterpriseDisclaimer = html`
      <div class="enterprise">
        <div class="text body">${i18nString(UIStrings.enterpriseDisclaimer)}</div>
          <div class="anchor">
            <devtools-icon
            name="domain"
            ></devtools-icon>
            <devtools-button
            @click=${input.openChromeCookieSettings}
            aria-label="View details of third-party cookie access in Settings"
            .variant=${"outlined"}
            jslog=${VisualLogging.action("view-details").track({ click: true })}>
            ${i18nString(UIStrings.viewDetails)}
          </devtools-button>
        </div>
      </div>
    `;
  render(html`
      <div class="overflow-auto">
        <div class="controls">
          <div class="header">
            <h1>${i18nString(UIStrings.viewTitle)}</h1>
            <div class="body">${i18nString(UIStrings.viewExplanation)}</div>
          </div>
          <devtools-card class="card-container">
            <div class=${Boolean(enterpriseEnabledSetting.get()) ? "card enterprise-disabled" : "card"}>
              ${cardHeader}
              <div>
                <div class="card-row text">
                  <h3 class="main-text">${i18nString(UIStrings.exceptions)}</h3>
                  <div class="body subtext">${i18nString(UIStrings.exceptionsExplanation)}</div>
                </div>
                ${gracePeriodControl}
                ${heuristicControl}
              </div>
            </div>
          </devtools-card>
          ${Boolean(enterpriseEnabledSetting.get()) ? enterpriseDisclaimer : nothing}
        </div>
      </div>
    `, target);
};
function showInfobar() {
  UI.InspectorView.InspectorView.instance().displayDebuggedTabReloadRequiredWarning(i18nString(UIStrings.siteReloadMessage));
}
var CookieControlsView = class extends UI.Widget.VBox {
  #view;
  #isGracePeriodActive;
  #thirdPartyControlsDict;
  constructor(element, view = DEFAULT_VIEW) {
    super(element, { useShadowDom: true });
    this.#view = view;
    this.#isGracePeriodActive = false;
    this.#thirdPartyControlsDict = Root.Runtime.hostConfig.thirdPartyCookieControls;
    this.registerRequiredCSS(Input.checkboxStyles, cookieControlsView_css_default);
    SDK.TargetManager.TargetManager.instance().addModelListener(SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.PrimaryPageChanged, this.#onPrimaryPageChanged, this);
    SDK.TargetManager.TargetManager.instance().addModelListener(SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.ResourceAdded, this.checkGracePeriodActive, this);
    this.checkGracePeriodActive().catch((error) => {
      console.error(error);
    });
    this.requestUpdate();
  }
  performUpdate() {
    this.#view({
      thirdPartyControlsDict: this.#thirdPartyControlsDict,
      isGracePeriodActive: this.#isGracePeriodActive,
      inputChanged: this.inputChanged.bind(this),
      openChromeCookieSettings: this.openChromeCookieSettings.bind(this)
    }, this, this.contentElement);
  }
  inputChanged(newValue, setting) {
    setting.set(newValue);
    showInfobar();
    this.requestUpdate();
  }
  openChromeCookieSettings() {
    const rootTarget = SDK.TargetManager.TargetManager.instance().rootTarget();
    if (rootTarget === null) {
      return;
    }
    const url = "chrome://settings/cookies";
    void rootTarget.targetAgent().invoke_createTarget({ url }).then((result) => {
      if (result.getError()) {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(url);
      }
    });
  }
  #onPrimaryPageChanged() {
    this.#isGracePeriodActive = false;
    this.checkGracePeriodActive().catch((error) => {
      console.error(error);
    });
  }
  async checkGracePeriodActive(event) {
    if (!this.#thirdPartyControlsDict || !this.#thirdPartyControlsDict.thirdPartyCookieMetadataEnabled) {
      return;
    }
    if (this.#isGracePeriodActive) {
      return;
    }
    const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!mainTarget) {
      return;
    }
    const urls = [];
    if (!event) {
      for (const resourceTreeModel of SDK.TargetManager.TargetManager.instance().models(SDK.ResourceTreeModel.ResourceTreeModel)) {
        resourceTreeModel.forAllResources((r) => {
          urls.push(r.url);
          return true;
        });
      }
    } else {
      urls.push(event.data.url);
    }
    const result = await mainTarget.storageAgent().invoke_getAffectedUrlsForThirdPartyCookieMetadata({ firstPartyUrl: mainTarget.inspectedURL(), thirdPartyUrls: urls });
    if (result.matchedUrls && result.matchedUrls.length > 0) {
      this.#isGracePeriodActive = true;
      this.requestUpdate();
    }
  }
};

// gen/front_end/panels/security/CookieReportView.js
var CookieReportView_exports = {};
__export(CookieReportView_exports, {
  CookieReportView: () => CookieReportView,
  i18nString: () => i18nString2
});
import "./../../ui/legacy/components/data_grid/data_grid.js";
import * as Common2 from "./../../core/common/common.js";
import * as i18n3 from "./../../core/i18n/i18n.js";
import * as Platform from "./../../core/platform/platform.js";
import * as SDK2 from "./../../core/sdk/sdk.js";
import * as IssuesManager from "./../../models/issues_manager/issues_manager.js";
import * as uiI18n2 from "./../../ui/i18n/i18n.js";
import * as UI2 from "./../../ui/legacy/legacy.js";
import * as Lit from "./../../ui/lit/lit.js";
import * as VisualLogging2 from "./../../ui/visual_logging/visual_logging.js";
import * as NetworkForward from "./../network/forward/forward.js";

// gen/front_end/panels/security/cookieReportView.css.js
var cookieReportView_css_default = `/*
 * Copyright 2024 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.report {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  max-height: 100%;
  gap: var(--sys-size-6);
  padding-top: var(--sys-size-5);
}

.header {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  gap: var(--sys-size-2);
  padding-left: var(--sys-size-6);
  padding-right: var(--sys-size-6);
  min-width: var(--sys-size-31);

  h1 {
    font: var(--sys-typescale-headline4);
    margin: 0;
  }
}

.body {
  font: var(--sys-typescale-body4-regular);
}

.x-link {
  color: var(--sys-color-primary);
  text-decoration-line: underline;
  cursor: pointer;
}

.filter {
  padding-right: var(--sys-size-6);
  flex-shrink: 0;
}

.filters-container {
  display: flex;
  padding-left: var(--sys-size-5);
}

devtools-data-grid {
  flex: auto;
  margin-left: -1px;
}

.empty-report {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sys-size-2);
  padding: var(--sys-size-11) var(--sys-size-6) 0 var(--sys-size-6);
  flex-shrink: 0;
  min-width: var(--sys-size-31);
}

.empty-report-title {
  font: var(--sys-typescale-headline5);
}

.cookie-off {
  width: var(--sys-size-11);
  height: var(--sys-size-11);
}

/*# sourceURL=${import.meta.resolve("./cookieReportView.css")} */`;

// gen/front_end/panels/security/CookieReportView.js
var { render: render2, html: html2, Directives: { ref: ref2 } } = Lit;
var UIStrings2 = {
  /**
   * @description Title in the header for the third-party cookie report in the Security & Privacy Panel
   */
  title: "Third-party cookies",
  /**
   * @description Explanation in the header about the cookies listed in the report
   */
  body: "This site might not work if third-party cookies and other cookies are limited in Chrome.",
  /**
   * @description A link the user can follow to learn more about third party cookie usage
   */
  learnMoreLink: "Learn more about how third-party cookies are used",
  /**
   * @description Column header for Cookie Report table. This column will contain the name of the cookie
   */
  name: "Name",
  /**
   * @description Column header for Cookie Report table. This column will contain the domain of the cookie
   */
  domain: "Domain",
  /**
   * @description Column header for Cookie Report table. This column will contain the type of the cookie. E.g. Advertisement, Marketing, etc.
   */
  type: "Type",
  /**
   * @description Column header for Cookie Report table. This column will contain the third-party of the cookie. E.g. Amazon Analytics, etc.
   */
  platform: "Platform",
  /**
   * @description Column header for Cookie Report table, This column will contain the actionable step the user can take (if any) for the cookie
   */
  recommendation: "Recommendation",
  /**
   * @description Column header for Cookie Report table. This column will contain the blocked or allowed status of the cookie. See status strings below for more information on the different statuses
   */
  status: "Status",
  /**
   * @description Status string in the cookie report for a third-party cookie that is allowed without any sort of exception. This is also used as filter chip text to allow the user to filter the table based on cookie status
   */
  allowed: "Allowed",
  /**
   * @description Status string in the cookie report for a third-party cookie that is allowed due to a grace period or heuristic exception. Otherwise, this would have been blocked. This is also used as filter chip text to allow the user to filter the table based on cookie status
   */
  allowedByException: "Allowed by exception",
  /**
   * @description Status string in the cookie report for a third-party cookie that was blocked. This is also used as filter chip text to allow the user to filter the table based on cookie status
   */
  blocked: "Blocked",
  /**
   * @description String in the Cookie Report table. This is used when any data could not be fetched and that cell is unknown
   */
  unknown: "Unknown",
  /**
   * @description Display name for the Cookie Report table. This string is used by the data grid for accessibility.
   */
  report: "Third-Party Cookie Report",
  /**
   * @description The main string the user sees when there are no cookie issues to show. This will take place of the table
   */
  emptyReport: "Not a crumb left",
  /**
   * @description Explanation to the user that there were no third-party cookie related issues found which is why they are not seeing the table/report
   */
  emptyReportExplanation: "No issues with third-party cookies found",
  /**
   * @description String in Cookie Report table. This is used when a cookie's domain has an entry in the third-party cookie migration readiness list GitHub.
   * @example {guidance} PH1
   */
  gitHubResource: "Review {PH1} from third-party site",
  /**
   * @description Label for a link to an entry in the third-party cookie migration readiness list GitHub.
   */
  guidance: "guidance",
  /**
   * @description String in Cookie Report table. This is used when a cookie has a grace period exception.
   * @example {reported issues} PH1
   */
  gracePeriod: "Review {PH1}. Grace period exception is active.",
  /**
   * @description Label for a link to third-party cookie site compatibility look-up.
   */
  reportedIssues: "reported issues",
  /**
   * @description String in Cookie Report table. This is used when a cookie has a heuristics exception.
   */
  heuristics: "Action needed later. Heuristics based exception is active.",
  /**
   * @description String in Cookie Report table. This is used when a cookie's domain does not have an entry in the third-party cookie migration readiness list Github nor a grace period nor heuristics exception.
   */
  other: "Contact third-party site for more info",
  /**
   * @description String representing the Advertising cookie type. Used to format 'ad' category from the Third Party Web dataset.
   */
  adCookieTypeString: "Advertising",
  /**
   * @description String representing the Analytics cookie type. Used to format 'analytics' category from the Third Party Web dataset.
   */
  analyticsCookieTypeString: "Analytics",
  /**
   * @description String representing the Social cookie type. Used to format 'social' category from the Third Party Web dataset.
   */
  socialCookieTypeString: "Social",
  /**
   * @description String representing the Video cookie type. Used to format 'video' category from the Third Party Web dataset.
   */
  videoCookieTypeString: "Video",
  /**
   * @description String representing the Utility cookie type. Used to format 'utility' category from the Third Party Web dataset.
   */
  utilityCookieTypeString: "Utility",
  /**
   * @description String representing the Hosting cookie type. Used to format 'hosting' category from the Third Party Web dataset.
   */
  hostingCookieTypeString: "Hosting",
  /**
   * @description String representing the Marketing cookie type. Used to format 'marketing' category from the Third Party Web dataset.
   */
  marketingCookieTypeString: "Marketing",
  /**
   * @description String representing the Customer Success cookie type. Used to format 'customer-success' category from the Third Party Web dataset.
   */
  customerSuccessCookieTypeString: "Customer Success",
  /**
   * @description String representing the Content cookie type. Used to format 'content' category from the Third Party Web dataset.
   */
  contentCookieTypeString: "Content",
  /**
   * @description String representing the CDN cookie type. Used to format 'cdn' category from the Third Party Web dataset.
   */
  cdnCookieTypeString: "CDN",
  /**
   * @description String representing the Tag Manager cookie type. Used to format 'tag-manager' category from the Third Party Web dataset.
   */
  tagManagerCookieTypeString: "Tag Manager",
  /**
   * @description String representing the Consent Provider cookie type. Used to format 'consent-provider' category from the Third Party Web dataset.
   */
  consentProviderCookieTypeString: "Consent Provider",
  /**
   * @description String representing the Other cookie type. Used to format 'other' category from the Third Party Web dataset.
   */
  otherCookieTypeString: "Other",
  /**
   * @description String that shows up in the context menu when right clicking one of the entries in the cookie report.
   */
  showRequestsWithThisCookie: "Show requests with this cookie"
};
var str_2 = i18n3.i18n.registerUIStrings("panels/security/CookieReportView.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var DEFAULT_VIEW2 = (input, output, target) => {
  render2(html2`
        <div class="report overflow-auto">
            <div class="header">
              <h1>${i18nString2(UIStrings2.title)}</h1>
              <div class="body">${i18nString2(UIStrings2.body)} <x-link class="devtools-link" href="https://developers.google.com/privacy-sandbox/cookies/prepare/audit-cookies" jslog=${VisualLogging2.link("learn-more").track({ click: true })}>${i18nString2(UIStrings2.learnMoreLink)}</x-link></div>
            </div>
            ${input.cookieRows.length > 0 ? html2`
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
                    .options=${{ items: input.filterItems }}
                    ${ref2((el) => {
    if (el instanceof UI2.FilterBar.NamedBitSetFilterUIElement) {
      output.namedBitSetFilterUI = el.getOrCreateNamedBitSetFilterUI();
    }
  })}
                  ></devtools-named-bit-set-filter>
                </div>
                <!-- @ts-ignore -->
                <devtools-data-grid
                  name=${i18nString2(UIStrings2.report)}
                  striped
                  .filters=${input.filters}
                  @sort=${input.onSortingChanged}
                  @contextmenu=${input.populateContextMenu.bind(input)}
                >
                  <table>
                    <tr>
                      <th id="name" sortable>${i18nString2(UIStrings2.name)}</th>
                      <th id="domain" sortable>${i18nString2(UIStrings2.domain)}</th>
                      <th id="type" sortable>${i18nString2(UIStrings2.type)}</th>
                      <th id="platform" sortable>${i18nString2(UIStrings2.platform)}</th>
                      <th id="status" sortable>${i18nString2(UIStrings2.status)}</th>
                      <th id="recommendation" sortable>${i18nString2(UIStrings2.recommendation)}</th>
                    </tr>
                    ${[...input.cookieRows.values()].map((row) => html2`
                      <tr data-name=${row.name} data-domain=${row.domain}>
                        <td>${row.name}</td>
                        <td>${row.domain}</td>
                        <td>${CookieReportView.getCookieTypeString(row.type)}</td>
                        <td>${row.platform ?? i18nString2(UIStrings2.unknown)}</td>
                        <td>${CookieReportView.getStatusString(row.status)}</td>
                        <td>${CookieReportView.getRecommendation(row.domain, row.insight)}</td>
                      </tr>
                    `)}
                  </table>
                </devtools-data-grid>
              ` : html2`
                <div class="empty-report">
                  <devtools-icon
                    class="cookie-off"
                    name="cookie_off"
                  ></devtools-icon>
                  <div class="empty-report-title">
                    ${i18nString2(UIStrings2.emptyReport)}
                  </div>
                  <div class="body">
                    ${i18nString2(UIStrings2.emptyReportExplanation)}
                  </div>
                </div>
              `}

        </div>
    `, target);
};
var CookieReportView = class _CookieReportView extends UI2.Widget.VBox {
  #issuesManager;
  namedBitSetFilterUI;
  #cookieRows = /* @__PURE__ */ new Map();
  #view;
  filterItems = [];
  searchText;
  constructor(element, view = DEFAULT_VIEW2) {
    super(element, { useShadowDom: true });
    this.#view = view;
    this.registerRequiredCSS(cookieReportView_css_default);
    this.searchText = Common2.Settings.Settings.instance().createSetting("cookie-report-search-query", "").get();
    SDK2.TargetManager.TargetManager.instance().addModelListener(SDK2.ResourceTreeModel.ResourceTreeModel, SDK2.ResourceTreeModel.Events.PrimaryPageChanged, this.#onPrimaryPageChanged, this);
    this.#issuesManager = IssuesManager.IssuesManager.IssuesManager.instance();
    this.#issuesManager.addEventListener("IssueAdded", this.#onIssueEventReceived, this);
    for (const issue of this.#issuesManager.issues()) {
      if (issue instanceof IssuesManager.CookieIssue.CookieIssue) {
        this.#onIssueAdded(issue);
      }
    }
    this.requestUpdate();
  }
  performUpdate() {
    this.filterItems = this.#buildFilterItems();
    const viewInput = {
      cookieRows: [...this.#cookieRows.values()].filter((row) => {
        if (this.namedBitSetFilterUI) {
          return this.namedBitSetFilterUI.accept(_CookieReportView.getStatusString(row.status));
        }
        return true;
      }),
      filters: [{
        key: "name,domain",
        regex: RegExp(Platform.StringUtilities.escapeForRegExp(this.searchText), "i"),
        negative: false
      }],
      searchText: this.searchText,
      filterItems: this.filterItems,
      onSearchFilterChanged: (e) => this.onSearchFilterChanged(e),
      onFilterChanged: () => this.requestUpdate(),
      onSortingChanged: () => this.requestUpdate(),
      populateContextMenu: this.populateContextMenu.bind(this)
    };
    this.#view(viewInput, this, this.contentElement);
  }
  #onPrimaryPageChanged() {
    this.#cookieRows.clear();
    this.namedBitSetFilterUI = void 0;
    this.requestUpdate();
  }
  #onIssueEventReceived(event) {
    if (event.data.issue instanceof IssuesManager.CookieIssue.CookieIssue) {
      if (this.#cookieRows.has(event.data.issue.cookieId())) {
        return;
      }
      this.#onIssueAdded(event.data.issue);
      this.requestUpdate();
    }
  }
  #onIssueAdded(issue) {
    const info = issue.makeCookieReportEntry();
    if (info) {
      this.#cookieRows.set(issue.cookieId(), info);
    }
  }
  onSearchFilterChanged(e) {
    this.searchText = e.detail ? e.detail : "";
    Common2.Settings.Settings.instance().createSetting("cookie-report-search-query", "").set(this.searchText);
    this.requestUpdate();
  }
  #buildFilterItems() {
    const filterItems = [];
    if (this.#cookieRows.values().some(
      (n) => n.status === 0
      /* IssuesManager.CookieIssue.CookieStatus.BLOCKED */
    )) {
      filterItems.push({
        name: UIStrings2.blocked,
        label: () => i18nString2(UIStrings2.blocked),
        title: UIStrings2.blocked,
        jslogContext: "blocked"
      });
    }
    if (this.#cookieRows.values().some(
      (n) => n.status === 1
      /* IssuesManager.CookieIssue.CookieStatus.ALLOWED */
    )) {
      filterItems.push({
        name: UIStrings2.allowed,
        label: () => i18nString2(UIStrings2.allowed),
        title: UIStrings2.allowed,
        jslogContext: "allowed"
      });
    }
    if (this.#cookieRows.values().some(
      (n) => n.status === 2 || n.status === 3
      /* IssuesManager.CookieIssue.CookieStatus.ALLOWED_BY_HEURISTICS */
    )) {
      filterItems.push({
        name: UIStrings2.allowedByException,
        label: () => i18nString2(UIStrings2.allowedByException),
        title: UIStrings2.allowedByException,
        jslogContext: "allowed-by-exception"
      });
    }
    return filterItems;
  }
  populateContextMenu(event) {
    const { menu, element } = event.detail;
    const { domain, name } = element?.dataset;
    if (!domain || !name) {
      return;
    }
    menu.revealSection().appendItem(i18nString2(UIStrings2.showRequestsWithThisCookie), () => {
      const requestFilter = NetworkForward.UIFilter.UIRequestFilter.filters([
        {
          filterType: NetworkForward.UIFilter.FilterType.CookieDomain,
          filterValue: domain
        },
        {
          filterType: NetworkForward.UIFilter.FilterType.CookieName,
          filterValue: name
        }
      ]);
      void Common2.Revealer.reveal(requestFilter);
    }, { jslogContext: "show-requests-with-this-cookie" });
  }
  static getStatusString(status) {
    switch (status) {
      case 0:
        return i18nString2(UIStrings2.blocked);
      case 2:
      case 3:
        return i18nString2(UIStrings2.allowedByException);
      case 1:
        return i18nString2(UIStrings2.allowed);
    }
  }
  static getRecommendation(domain, insight) {
    const recElem = document.createElement("div");
    render2(_CookieReportView.getRecommendationText(domain, insight), recElem, { host: this });
    return recElem;
  }
  static getRecommendationText(domain, insight) {
    if (!insight) {
      return html2`${i18nString2(UIStrings2.other)}`;
    }
    switch (insight.type) {
      case "GitHubResource": {
        const githubLink = UI2.XLink.XLink.create(insight.tableEntryUrl ? insight.tableEntryUrl : "https://github.com/privacysandbox/privacy-sandbox-dev-support/blob/main/3pc-migration-readiness.md", i18nString2(UIStrings2.guidance), void 0, void 0, "readiness-list-link");
        return html2`${uiI18n2.getFormatLocalizedString(str_2, UIStrings2.gitHubResource, {
          PH1: githubLink
        })}`;
      }
      case "GracePeriod": {
        const url = SDK2.TargetManager.TargetManager.instance().primaryPageTarget()?.inspectedURL();
        const gracePeriodLink = UI2.XLink.XLink.create("https://developers.google.com/privacy-sandbox/cookies/dashboard?url=" + // The order of the URLs matters - needs to be 1P + 3P.
        (url ? Common2.ParsedURL.ParsedURL.fromString(url)?.host + "+" : "") + (domain.charAt(0) === "." ? domain.substring(1) : domain), i18nString2(UIStrings2.reportedIssues), void 0, void 0, "compatibility-lookup-link");
        return html2`${uiI18n2.getFormatLocalizedString(str_2, UIStrings2.gracePeriod, {
          PH1: gracePeriodLink
        })}`;
      }
      case "Heuristics":
        return html2`${i18nString2(UIStrings2.heuristics)}`;
      default:
        return html2`${i18nString2(UIStrings2.other)}`;
    }
  }
  static getCookieTypeString(type) {
    if (!type) {
      return i18nString2(UIStrings2.otherCookieTypeString);
    }
    switch (type) {
      case "ad":
        return i18nString2(UIStrings2.adCookieTypeString);
      case "analytics":
        return i18nString2(UIStrings2.analyticsCookieTypeString);
      case "social":
        return i18nString2(UIStrings2.socialCookieTypeString);
      case "video":
        return i18nString2(UIStrings2.videoCookieTypeString);
      case "utility":
        return i18nString2(UIStrings2.utilityCookieTypeString);
      case "hosting":
        return i18nString2(UIStrings2.hostingCookieTypeString);
      case "marketing":
        return i18nString2(UIStrings2.marketingCookieTypeString);
      case "customer-success":
        return i18nString2(UIStrings2.customerSuccessCookieTypeString);
      case "content":
        return i18nString2(UIStrings2.contentCookieTypeString);
      case "cdn":
        return i18nString2(UIStrings2.cdnCookieTypeString);
      case "tag-manager":
        return i18nString2(UIStrings2.tagManagerCookieTypeString);
      case "consent-provider":
        return i18nString2(UIStrings2.consentProviderCookieTypeString);
      default:
        return i18nString2(UIStrings2.otherCookieTypeString);
    }
  }
};

// gen/front_end/panels/security/IPProtectionView.js
var IPProtectionView_exports = {};
__export(IPProtectionView_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW3,
  IPProtectionView: () => IPProtectionView,
  i18nString: () => i18nString3
});
import "./../../ui/components/switch/switch.js";
import "./../../ui/components/cards/cards.js";
import "./../../ui/legacy/components/data_grid/data_grid.js";
import "./../../ui/components/buttons/buttons.js";
import * as i18n5 from "./../../core/i18n/i18n.js";
import * as Root2 from "./../../core/root/root.js";
import * as SDK3 from "./../../core/sdk/sdk.js";
import * as UI3 from "./../../ui/legacy/legacy.js";
import * as Lit2 from "./../../ui/lit/lit.js";

// gen/front_end/panels/security/ipProtectionView.css.js
var ipProtectionView_css_default = `/*
 * Copyright 2025 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

@scope to (devtools-widget > *) {
  :scope {
    width: 100%;
    box-shadow: none;
  }

  .overflow-auto {
    height: 100%;
  }

  .ip-protection {
    display: flex;
    flex-direction: column;
    padding: var(--sys-size-5) var(--sys-size-3) var(--sys-size-5) var(--sys-size-5);
    min-width: fit-content;
    min-height: fit-content;
    height: 100%;
  }

  .header {
    display: flex;
    flex-direction: column;
    gap: var(--sys-size-2);
    padding-left: var(--sys-size-5);
  }

  h1 {
    margin: 0;
    font: var(--sys-typescale-headline4);
  }

  .card-container {
    max-width: 100%;
  }

  .card {
    display: flex;
    flex-direction: column;
    padding: var(--sys-size-6) var(--sys-size-8);
    gap: var(--sys-size-6);

    &.enterprise-disabled {
      color: var(--sys-color-token-subtle);
    }
  }

  .card-header {
    display: flex;
    align-items: center;
  }

  .card-header > .lhs {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-right: var(--sys-size-9);

    & > devtools-icon {
      height: var(--sys-size-11);
      width: var(--sys-size-11);
    }
  }

  .text {
    display: flex;
    flex-direction: column;
    gap: var(--sys-size-2);
  }

  h2 {
    font: var(--sys-typescale-headline5);
    margin: 0;
  }

  .body {
    font: var(--sys-typescale-body4-regular);
  }

  .card-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: var(--sys-size-4);
    padding-bottom: var(--sys-size-4);
    padding-left: var(--sys-size-8);
  }

  h3 {
    font: var(--sys-typescale-body4-medium);
    margin: 0;
  }

  .main-text {
    color: var(--sys-color-on-surface);
  }

  .subtext {
    color: var(--sys-color-on-surface-subtle);
  }

  .empty-report {
    margin: var(--sys-size-5);
    display: flex;
    flex-grow: 1;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    text-align: center;
    min-height: fit-content;
    min-width: fit-content;
  }

  devtools-data-grid {
    flex: auto;
  }

  .status-badge {
    display: flex;
    align-items: center;
  }

  .status-icon {
    width: 1.5rem;
    height: 1.5rem;
  }

  .green-status-icon {
    color: var(--sys-color-green);
  }

  .red-status-icon {
    color: var(--sys-color-error);
  }
}

/*# sourceURL=${import.meta.resolve("./ipProtectionView.css")} */`;

// gen/front_end/panels/security/IPProtectionView.js
var { render: render3, html: html3 } = Lit2;
var { widgetConfig } = UI3.Widget;
var UIStrings3 = {
  /**
   *@description Title in the view's header for the IP Protection tool in the Privacy & Security panel
   */
  viewTitle: "IP Protection Proxy Controls",
  /**
   *@description Explanation in the view's header about the purpose of this IP Protection tool
   */
  viewExplanation: "Test how this site will perform if IP Proxy is enabled in Chrome",
  /**
   *@description Title in the card within the IP Protection tool
   */
  cardTitle: "IP Protection Proxy Status",
  /**
   *@description Subheading for bypassing IP protection toggle
   */
  bypassTitle: "Bypass IP Protection",
  /**
   *@description Description of bypass IP protection toggle
   */
  bypassDescription: "Temporarily bypass IP protection for testing",
  /**
   * @description Text informing the user that IP Proxy is not available
   */
  notInIncognito: "IP proxy unavailable",
  /**
   * @description Description in the widget instructing users to open site in incognito
   */
  openIncognito: "IP proxy is only available within incognito mode. Open site in incognito.",
  /**
   * @description Column header for the ID of a proxy request in the Proxy Request View panel.
   */
  idColumn: "ID",
  /**
   * @description Column header for the URL of a proxy request in the Proxy Request View panel.
   */
  urlColumn: "URL",
  /**
   * @description Column header for the HTTP method of a proxy request in the Proxy Request View panel.
   */
  methodColumn: "Method",
  /**
   * @description Column header for the status code of a proxy request in the Proxy Request View panel.
   */
  statusColumn: "Status",
  /**
   * @description Title for the grid of proxy requests.
   */
  proxyRequests: "Proxy Requests",
  /**
   * @description The status text for the available status of the IP protection proxy.
   */
  Available: "IP Protection is enabled and active.",
  /**
   * @description The status text for when the feature is not enabled.
   */
  FeatureNotEnabled: "IP Protection feature is not enabled.",
  /**
   * @description The status text for when the masked domain list is not enabled.
   */
  MaskedDomainListNotEnabled: "Masked Domain List feature is not enabled.",
  /**
   * @description The status text for when the masked domain list is not populated.
   */
  MaskedDomainListNotPopulated: "Masked Domain List is not populated.",
  /**
   * @description The status text for when authentication tokens are unavailable.
   */
  AuthTokensUnavailable: "Limit for authentication tokens was reached. IP Protection will be paused.",
  /**
   * @description The status text for when the proxy is unavailable for another reason.
   */
  Unavailable: "IP Protection is unavailable.",
  /**
   * @description The status text for when the proxy is bypassed by DevTools.
   */
  BypassedByDevTools: "IP Protection is being bypassed by DevTools.",
  /**
   * @description The status text for when the status is unknown or being loaded.
   */
  statusUnknown: "Status unknown"
};
var str_3 = i18n5.i18n.registerUIStrings("panels/security/IPProtectionView.ts", UIStrings3);
var i18nString3 = i18n5.i18n.getLocalizedString.bind(void 0, str_3);
var allStatusStrings = [
  UIStrings3.Available,
  UIStrings3.FeatureNotEnabled,
  UIStrings3.MaskedDomainListNotEnabled,
  UIStrings3.MaskedDomainListNotPopulated,
  UIStrings3.AuthTokensUnavailable,
  UIStrings3.Unavailable,
  UIStrings3.BypassedByDevTools,
  UIStrings3.statusUnknown
];
var INCOGNITO_EXPLANATION_URL = "https://support.google.com/chrome/answer/95464?hl=en&co=GENIE.Platform%3DDesktop";
var DEFAULT_VIEW3 = (input, _output, target) => {
  const { status } = input;
  const statusText = status ? i18nString3(UIStrings3[status]) : i18nString3(UIStrings3.statusUnknown);
  const cardHeader = html3`
    <div class="card-header">
      <div class="lhs">
        <div class="text">
          <h2 class="main-text">${i18nString3(UIStrings3.cardTitle)}</h2>
          <div class="body subtext">${statusText}</div>
        </div>
      </div>
      <div class="status-badge">
       ${status === "Available" ? html3`<devtools-icon class="status-icon green-status-icon" role="presentation" name="check-circle"></devtools-icon>` : html3`<devtools-icon class="status-icon red-status-icon" role="presentation" name="cross-circle-filled"></devtools-icon>`}
      </div>
    </div>
  `;
  render3(html3`
    <style>
      ${ipProtectionView_css_default}
    </style>
    ${Root2.Runtime.hostConfig.isOffTheRecord ? html3`
      <div class="overflow-auto">
        <div class="ip-protection">
          <div class="header">
            <h1>${i18nString3(UIStrings3.viewTitle)}</h1>
            <div class="body">${i18nString3(UIStrings3.viewExplanation)}</div>
          </div>
          <devtools-card class="card-container">
            <div class="card">
              ${cardHeader}
              <div>
                <div class="card-row">
                  <div class="lhs">
                    <h3 class="main-text">${i18nString3(UIStrings3.bypassTitle)}</h3>
                    <div class="body subtext">${i18nString3(UIStrings3.bypassDescription)}</div>
                  </div>
                  <div>
                    <devtools-switch></devtools-switch>
                  </div>
                </div>
              </div>
            </div>
          </devtools-card>
          <devtools-data-grid striped name=${i18nString3(UIStrings3.proxyRequests)}>
          <table>
            <thead>
              <tr>
                <th id="id" sortable>${i18nString3(UIStrings3.idColumn)}</th>
                <th id="url" sortable>${i18nString3(UIStrings3.urlColumn)}</th>
                <th id="method" sortable>${i18nString3(UIStrings3.methodColumn)}</th>
                <th id="status" sortable>${i18nString3(UIStrings3.statusColumn)}</th>
              </tr>
            </thead>
            <tbody id="proxy-requests-body">
              ${input.proxyRequests.map((request, index) => html3`
                <tr data-request-id=${request.requestId}>
                  <td>${index + 1}</td>
                  <td>${request.url}</td>
                  <td>${request.requestMethod}</td>
                  <td>${String(request.statusCode)}</td>
                </tr>
              `)}
            </tbody>
          </table>
        </devtools-data-grid>
        </div>
      </div>
    ` : html3`
      <div class="empty-report">
        <devtools-widget
          class="learn-more"
          .widgetConfig=${widgetConfig(UI3.EmptyWidget.EmptyWidget, {
    header: i18nString3(UIStrings3.notInIncognito),
    text: i18nString3(UIStrings3.openIncognito),
    link: INCOGNITO_EXPLANATION_URL
  })}>
        </devtools-widget>
      </div>
    `}
  `, target);
};
var IPProtectionView = class extends UI3.Widget.VBox {
  #view;
  #proxyRequests = [];
  #status = null;
  constructor(element, view = DEFAULT_VIEW3) {
    super(element, { useShadowDom: true });
    this.#view = view;
    this.#proxyRequests = [
      { requestId: "1", url: "https://example.com/api/data", requestMethod: "GET", statusCode: 200 },
      { requestId: "2", url: "https://example.com/api/submit", requestMethod: "POST", statusCode: 404 },
      { requestId: "3", url: "https://example.com/assets/style.css", requestMethod: "GET", statusCode: 200 }
    ];
  }
  async wasShown() {
    super.wasShown();
    SDK3.TargetManager.TargetManager.instance().addModelListener(SDK3.ResourceTreeModel.ResourceTreeModel, SDK3.ResourceTreeModel.Events.PrimaryPageChanged, this.#updateIpProtectionStatus, this);
    await this.#updateIpProtectionStatus();
  }
  willHide() {
    SDK3.TargetManager.TargetManager.instance().removeModelListener(SDK3.ResourceTreeModel.ResourceTreeModel, SDK3.ResourceTreeModel.Events.PrimaryPageChanged, this.#updateIpProtectionStatus, this);
    super.willHide();
  }
  async #updateIpProtectionStatus() {
    const target = SDK3.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!target) {
      this.#status = null;
      this.requestUpdate();
      return;
    }
    const model = target.model(SDK3.NetworkManager.NetworkManager);
    if (!model) {
      this.#status = null;
      this.requestUpdate();
      return;
    }
    const status = await model.getIpProtectionProxyStatus();
    this.#status = status;
    this.requestUpdate();
  }
  get proxyRequests() {
    return this.#proxyRequests;
  }
  performUpdate() {
    const input = { status: this.#status, proxyRequests: this.#proxyRequests };
    this.#view(input, this, this.contentElement);
  }
};

// gen/front_end/panels/security/SecurityModel.js
var SecurityModel_exports = {};
__export(SecurityModel_exports, {
  CertificateSecurityState: () => CertificateSecurityState,
  Events: () => Events,
  PageVisibleSecurityState: () => PageVisibleSecurityState,
  SecurityModel: () => SecurityModel,
  SecurityStyleExplanation: () => SecurityStyleExplanation,
  SummaryMessages: () => SummaryMessages,
  securityStateCompare: () => securityStateCompare
});
import * as i18n7 from "./../../core/i18n/i18n.js";
import * as SDK4 from "./../../core/sdk/sdk.js";
var UIStrings4 = {
  /**
   * @description Text in Security Panel of the Security panel
   */
  theSecurityOfThisPageIsUnknown: "The security of this page is unknown.",
  /**
   * @description Text in Security Panel of the Security panel
   */
  thisPageIsNotSecure: "This page is not secure.",
  /**
   * @description Text in Security Panel of the Security panel
   */
  thisPageIsSecureValidHttps: "This page is secure (valid HTTPS).",
  /**
   * @description Text in Security Panel of the Security panel
   */
  thisPageIsNotSecureBrokenHttps: "This page is not secure (broken HTTPS).",
  /**
   * @description Description of an SSL cipher that contains a separate (bulk) cipher and MAC.
   * @example {AES_256_CBC} PH1
   * @example {HMAC-SHA1} PH2
   */
  cipherWithMAC: "{PH1} with {PH2}",
  /**
   * @description Description of an SSL Key and its Key Exchange Group.
   * @example {ECDHE_RSA} PH1
   * @example {X25519} PH2
   */
  keyExchangeWithGroup: "{PH1} with {PH2}"
};
var str_4 = i18n7.i18n.registerUIStrings("panels/security/SecurityModel.ts", UIStrings4);
var i18nString4 = i18n7.i18n.getLocalizedString.bind(void 0, str_4);
var i18nLazyString = i18n7.i18n.getLazilyComputedLocalizedString.bind(void 0, str_4);
var SecurityModel = class extends SDK4.SDKModel.SDKModel {
  dispatcher;
  securityAgent;
  constructor(target) {
    super(target);
    this.dispatcher = new SecurityDispatcher(this);
    this.securityAgent = target.securityAgent();
    target.registerSecurityDispatcher(this.dispatcher);
    void this.securityAgent.invoke_enable();
  }
  resourceTreeModel() {
    return this.target().model(SDK4.ResourceTreeModel.ResourceTreeModel);
  }
  networkManager() {
    return this.target().model(SDK4.NetworkManager.NetworkManager);
  }
};
function securityStateCompare(a, b) {
  const SECURITY_STATE_ORDER = [
    "info",
    "insecure-broken",
    "insecure",
    "neutral",
    "secure",
    "unknown"
  ];
  return SECURITY_STATE_ORDER.indexOf(a) - SECURITY_STATE_ORDER.indexOf(b);
}
SDK4.SDKModel.SDKModel.register(SecurityModel, { capabilities: 512, autostart: false });
var Events;
(function(Events2) {
  Events2["VisibleSecurityStateChanged"] = "VisibleSecurityStateChanged";
})(Events || (Events = {}));
var SummaryMessages = {
  [
    "unknown"
    /* Protocol.Security.SecurityState.Unknown */
  ]: i18nLazyString(UIStrings4.theSecurityOfThisPageIsUnknown),
  [
    "insecure"
    /* Protocol.Security.SecurityState.Insecure */
  ]: i18nLazyString(UIStrings4.thisPageIsNotSecure),
  [
    "neutral"
    /* Protocol.Security.SecurityState.Neutral */
  ]: i18nLazyString(UIStrings4.thisPageIsNotSecure),
  [
    "secure"
    /* Protocol.Security.SecurityState.Secure */
  ]: i18nLazyString(UIStrings4.thisPageIsSecureValidHttps),
  [
    "insecure-broken"
    /* Protocol.Security.SecurityState.InsecureBroken */
  ]: i18nLazyString(UIStrings4.thisPageIsNotSecureBrokenHttps)
};
var PageVisibleSecurityState = class {
  securityState;
  certificateSecurityState;
  safetyTipInfo;
  securityStateIssueIds;
  constructor(securityState, certificateSecurityState, safetyTipInfo, securityStateIssueIds) {
    this.securityState = securityState;
    this.certificateSecurityState = certificateSecurityState ? new CertificateSecurityState(certificateSecurityState) : null;
    this.safetyTipInfo = safetyTipInfo ? new SafetyTipInfo(safetyTipInfo) : null;
    this.securityStateIssueIds = securityStateIssueIds;
  }
};
var CertificateSecurityState = class {
  protocol;
  keyExchange;
  keyExchangeGroup;
  cipher;
  mac;
  certificate;
  subjectName;
  issuer;
  validFrom;
  validTo;
  certificateNetworkError;
  certificateHasWeakSignature;
  certificateHasSha1Signature;
  modernSSL;
  obsoleteSslProtocol;
  obsoleteSslKeyExchange;
  obsoleteSslCipher;
  obsoleteSslSignature;
  constructor(certificateSecurityState) {
    this.protocol = certificateSecurityState.protocol;
    this.keyExchange = certificateSecurityState.keyExchange;
    this.keyExchangeGroup = certificateSecurityState.keyExchangeGroup || null;
    this.cipher = certificateSecurityState.cipher;
    this.mac = certificateSecurityState.mac || null;
    this.certificate = certificateSecurityState.certificate;
    this.subjectName = certificateSecurityState.subjectName;
    this.issuer = certificateSecurityState.issuer;
    this.validFrom = certificateSecurityState.validFrom;
    this.validTo = certificateSecurityState.validTo;
    this.certificateNetworkError = certificateSecurityState.certificateNetworkError || null;
    this.certificateHasWeakSignature = certificateSecurityState.certificateHasWeakSignature;
    this.certificateHasSha1Signature = certificateSecurityState.certificateHasSha1Signature;
    this.modernSSL = certificateSecurityState.modernSSL;
    this.obsoleteSslProtocol = certificateSecurityState.obsoleteSslProtocol;
    this.obsoleteSslKeyExchange = certificateSecurityState.obsoleteSslKeyExchange;
    this.obsoleteSslCipher = certificateSecurityState.obsoleteSslCipher;
    this.obsoleteSslSignature = certificateSecurityState.obsoleteSslSignature;
  }
  isCertificateExpiringSoon() {
    const expiryDate = new Date(this.validTo * 1e3).getTime();
    return expiryDate < new Date(Date.now()).setHours(48) && expiryDate > Date.now();
  }
  getKeyExchangeName() {
    if (this.keyExchangeGroup) {
      return this.keyExchange ? i18nString4(UIStrings4.keyExchangeWithGroup, { PH1: this.keyExchange, PH2: this.keyExchangeGroup }) : this.keyExchangeGroup;
    }
    return this.keyExchange;
  }
  getCipherFullName() {
    return this.mac ? i18nString4(UIStrings4.cipherWithMAC, { PH1: this.cipher, PH2: this.mac }) : this.cipher;
  }
};
var SafetyTipInfo = class {
  safetyTipStatus;
  safeUrl;
  constructor(safetyTipInfo) {
    this.safetyTipStatus = safetyTipInfo.safetyTipStatus;
    this.safeUrl = safetyTipInfo.safeUrl || null;
  }
};
var SecurityStyleExplanation = class {
  securityState;
  title;
  summary;
  description;
  certificate;
  mixedContentType;
  recommendations;
  constructor(securityState, title, summary, description, certificate = [], mixedContentType = "none", recommendations = []) {
    this.securityState = securityState;
    this.title = title;
    this.summary = summary;
    this.description = description;
    this.certificate = certificate;
    this.mixedContentType = mixedContentType;
    this.recommendations = recommendations;
  }
};
var SecurityDispatcher = class {
  model;
  constructor(model) {
    this.model = model;
  }
  securityStateChanged(_event) {
  }
  visibleSecurityStateChanged({ visibleSecurityState }) {
    const pageVisibleSecurityState = new PageVisibleSecurityState(visibleSecurityState.securityState, visibleSecurityState.certificateSecurityState || null, visibleSecurityState.safetyTipInfo || null, visibleSecurityState.securityStateIssueIds);
    this.model.dispatchEventToListeners(Events.VisibleSecurityStateChanged, pageVisibleSecurityState);
  }
  certificateError(_event) {
  }
};

// gen/front_end/panels/security/SecurityPanel.js
var SecurityPanel_exports = {};
__export(SecurityPanel_exports, {
  OriginGroup: () => OriginGroup,
  SecurityDetailsTable: () => SecurityDetailsTable,
  SecurityMainView: () => SecurityMainView,
  SecurityOriginView: () => SecurityOriginView,
  SecurityPanel: () => SecurityPanel,
  SecurityRevealer: () => SecurityRevealer,
  createHighlightedUrl: () => createHighlightedUrl,
  getSecurityStateIconForDetailedView: () => getSecurityStateIconForDetailedView,
  getSecurityStateIconForOverview: () => getSecurityStateIconForOverview
});
import * as Common4 from "./../../core/common/common.js";
import * as Host2 from "./../../core/host/host.js";
import * as i18n11 from "./../../core/i18n/i18n.js";
import * as SDK5 from "./../../core/sdk/sdk.js";
import * as NetworkForward2 from "./../network/forward/forward.js";
import * as IconButton4 from "./../../ui/components/icon_button/icon_button.js";
import * as UI6 from "./../../ui/legacy/legacy.js";
import { html as html4, render as render4 } from "./../../ui/lit/lit.js";
import * as VisualLogging3 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/security/lockIcon.css.js
var lockIcon_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.lock-icon,
.security-property {
  height: var(--sys-size-9);
  width: var(--sys-size-9);
}

.lock-icon-secure {
  color: var(--sys-color-green);
}

.lock-icon-insecure {
  color: var(--sys-color-error);
}

.lock-icon-insecure-broken {
  color: var(--sys-color-error);
}

.security-property-secure {
  color: var(--sys-color-green);
}

.security-property-neutral {
  color: var(--sys-color-error);
}

.security-property-insecure {
  color: var(--sys-color-error);
}

.security-property-insecure-broken {
  color: var(--sys-color-error);
}

.security-property-info {
  color: var(--sys-color-on-surface-subtle);
}

.security-property-unknown {
  color: var(--sys-color-on-surface-subtle);
}

.url-scheme-secure {
  color: var(--sys-color-green);
}

.url-scheme-neutral,
.url-scheme-insecure,
.url-scheme-insecure-broken {
  color: var(--sys-color-error);
}

/*# sourceURL=${import.meta.resolve("./lockIcon.css")} */`;

// gen/front_end/panels/security/mainView.css.js
var mainView_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.devtools-link {
  display: inline-block;
}

.security-main-view {
  overflow: hidden auto;
  background-color: var(--sys-color-cdt-base-container);
}

.security-main-view > div {
  flex-shrink: 0;
}

.security-summary-section-title {
  font-size: 15px;
  margin: 12px 16px;
  user-select: text;
}

.lock-spectrum {
  margin: 8px 16px;
  display: flex;
  align-items: flex-start;
}

.security-summary .lock-icon {
  flex: none;
  width: 16px;
  height: 16px;
  margin: 0;
}
/* Separate the middle icon from the other two. */

.security-summary .lock-icon-neutral {
  margin: 0 16px;
}

.security-summary:not(.security-summary-secure) .lock-icon-secure,
.security-summary:not(.security-summary-neutral) .lock-icon-neutral,
.security-summary:not(.security-summary-insecure) .lock-icon-insecure,
.security-summary:not(.security-summary-insecure-broken) .lock-icon-insecure-broken {
  color: var(--sys-color-state-disabled);
}

@media (forced-colors: active) {
  .security-summary-neutral .lock-icon-neutral {
    color: Highlight;
  }

  .security-summary:not(.security-summary-secure) .lock-icon-secure,
  .security-summary:not(.security-summary-neutral) .lock-icon-neutral,
  .security-summary:not(.security-summary-insecure) .lock-icon-insecure,
  .security-summary:not(.security-summary-insecure-broken) .lock-icon-insecure-broken {
    color: canvastext;
  }
}

.triangle-pointer-container {
  margin: 8px 24px 0;
  padding: 0;
}

.triangle-pointer-wrapper {
  /* Defaults for dynamic properties. */
  transform: translateX(0);
  transition: transform 0.3s;
}

.triangle-pointer {
  width: 12px;
  height: 12px;
  margin-bottom: -6px;
  margin-left: -6px;
  transform: rotate(-45deg);
  border-style: solid;
  border-width: 1px 1px 0 0;
  background: var(--sys-color-cdt-base-container);
  border-color: var(--sys-color-neutral-outline);
}

.security-summary-secure .triangle-pointer-wrapper {
  transform: translateX(0);
}

.security-summary-neutral .triangle-pointer-wrapper {
  transform: translateX(32px);
}

.security-summary-insecure .triangle-pointer-wrapper {
  transform: translateX(64px);
}

.security-summary-insecure-broken .triangle-pointer-wrapper {
  transform: translateX(64px);
}

.security-summary-text {
  padding: 16px 24px;
  border-style: solid;
  border-width: 1px 0;
  font-size: 15px;
  background: var(--sys-color-cdt-base-container);
  border-color: var(--sys-color-neutral-outline);
  user-select: text;
}

.security-summary-secure .triangle-pointer,
.security-summary-secure .security-summary-text,
.security-explanation-title-secure {
  color: var(--sys-color-green);
}

.security-summary-insecure-broken .triangle-pointer,
.security-summary-insecure-broken .security-summary-text,
.security-explanation-title-neutral,
.security-explanation-title-insecure,
.security-explanation-title-insecure-broken {
  color: var(--sys-color-error);
}

.security-explanation-list {
  padding-bottom: 16px;
}

.security-explanation-list:empty {
  border-bottom: none;
  padding: 0;
}

.security-explanations-main {
  margin-top: -5px;
  background-color: var(--sys-color-cdt-base-container);
  border-bottom: 1px solid var(--sys-color-divider);
}

.security-explanations-extra {
  background-color: transparent;
}

.security-explanation {
  padding: 11px;
  display: flex;
  white-space: nowrap;
  border: none;
  color: var(--sys-color-token-subtle);
}

.security-explanation-text {
  flex: auto;
  white-space: normal;
  max-width: 400px;
}

.origin-button {
  margin-top: var(--sys-size-4);
}

.security-explanation .security-property {
  flex: none;
  width: 16px;
  height: 16px;
  margin-right: 16px;
}

.security-explanation-title {
  color: var(--sys-color-token-subtle);
  margin-top: 1px;
  margin-bottom: 8px;
}

.security-mixed-content {
  margin-top: 8px;
}

.security-explanation-recommendations {
  padding-inline-start: 16px;
}

.security-explanation-recommendations > li {
  margin-bottom: 4px;
}

/*# sourceURL=${import.meta.resolve("./mainView.css")} */`;

// gen/front_end/panels/security/SecurityPanelSidebarTreeElement.js
import * as UI4 from "./../../ui/legacy/legacy.js";
var SecurityPanelSidebarTreeElement = class extends UI4.TreeOutline.TreeElement {
  constructor(title = "", expandable = false, jslogContext) {
    super(title, expandable, jslogContext);
    UI4.ARIAUtils.setLabel(this.listItemElement, title);
  }
  get elemId() {
    return "overview";
  }
  showElement() {
    throw new Error("Unimplemented Method");
  }
  onselect(selectedByUser) {
    if (selectedByUser) {
      const id = this.elemId;
      this.listItemElement.dispatchEvent(new CustomEvent("update-sidebar-selection", { bubbles: true, composed: true, detail: { id } }));
      this.showElement();
    }
    return false;
  }
};

// gen/front_end/panels/security/OriginTreeElement.js
var ShowOriginEvent = class _ShowOriginEvent extends Event {
  static eventName = "showorigin";
  origin;
  constructor(origin) {
    super(_ShowOriginEvent.eventName, { bubbles: true, composed: true });
    this.origin = origin;
  }
};
var OriginTreeElement = class extends SecurityPanelSidebarTreeElement {
  #securityState;
  #renderTreeElement;
  #origin = null;
  constructor(className, renderTreeElement, origin = null) {
    super();
    this.#renderTreeElement = renderTreeElement;
    this.#origin = origin;
    this.listItemElement.classList.add(className);
    this.#securityState = null;
    this.setSecurityState(
      "unknown"
      /* Protocol.Security.SecurityState.Unknown */
    );
  }
  setSecurityState(newSecurityState) {
    this.#securityState = newSecurityState;
    this.#renderTreeElement(this);
  }
  securityState() {
    return this.#securityState;
  }
  origin() {
    return this.#origin;
  }
  showElement() {
    this.listItemElement.dispatchEvent(new ShowOriginEvent(this.#origin));
  }
};

// gen/front_end/panels/security/originView.css.js
var originView_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.title-section {
  padding: 16px 0 24px;
  border-bottom: 1px solid var(--sys-color-divider);
}

.title-section-header {
  padding-left: 16px;
  padding-bottom: 10px;
  font-size: 14px;
}

.security-origin-view {
  overflow: hidden scroll;
  display: block;
  user-select: text;
}

.security-origin-view .origin-view-section {
  border-bottom: 1px solid var(--sys-color-divider);
  padding: 12px 6px 12px  24px;
  font-size: 12px;
}

.origin-view-notes {
  margin-top: 2px;
  color: var(--sys-color-token-subtle);
}

.origin-view-section-notes {
  margin-top: 6px;
  color: var(--sys-color-token-subtle);
}

.security-origin-view .origin-display {
  font-size: 12px;
  padding-left: var(--sys-size-8);
  display: flex;
  align-items: center;
}

.title-section > .view-network-button {
  padding: 6px 0 0 16px;
}

.security-origin-view .origin-display devtools-icon {
  width: var(--sys-size-8);
  height: var(--sys-size-8);
  margin-right: var(--sys-size-6);
}

.security-origin-view .origin-view-section-title {
  margin-top: 4px;
  margin-bottom: 4px;
  font-weight: bold;
}

.security-origin-view .details-table {
  border-spacing: 0;
}

.security-origin-view .details-table-row {
  white-space: nowrap;
  overflow: hidden;
  line-height: 22px;
  vertical-align: top;
}

.security-origin-view .details-table-row > td {
  padding: 0;
}

.security-origin-view .details-table-row > td:first-child {
  color: var(--sys-color-token-subtle);
  width: calc(120px + 1em);
  text-align: right;
  padding-right: 1em;
}

.security-origin-view .details-table-row > td:nth-child(2) {
  white-space: normal;
}

.security-origin-view .sct-details .details-table .details-table-row:last-child td:last-child {
  border-bottom: 1px solid var(--sys-color-divider);
  padding-bottom: 10px;
}

.security-origin-view .sct-details .details-table:last-child .details-table-row:last-child td:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.security-origin-view .details-toggle {
  margin-left: 126px;
}

.security-origin-view .sct-toggle {
  margin-left: 145px;
  padding-top: 5px;
}

.security-origin-view .details-table .empty-san {
  color: var(--sys-color-state-disabled);
}

.security-origin-view .details-table .san-entry {
  display: block;
}

.security-origin-view .truncated-san .truncated-entry {
  display: none;
}

.origin-view-section:last-child {
  border-bottom: none;
}

.devtools-link {
  display: inline-flex;
}

/*# sourceURL=${import.meta.resolve("./originView.css")} */`;

// gen/front_end/panels/security/SecurityPanelSidebar.js
import * as Common3 from "./../../core/common/common.js";
import * as i18n9 from "./../../core/i18n/i18n.js";
import * as Platform2 from "./../../core/platform/platform.js";
import * as Root3 from "./../../core/root/root.js";
import * as UI5 from "./../../ui/legacy/legacy.js";

// gen/front_end/panels/security/CookieControlsTreeElement.js
import * as IconButton from "./../../ui/components/icon_button/icon_button.js";
var CookieControlsTreeElement = class extends SecurityPanelSidebarTreeElement {
  constructor(title, jslogContext) {
    super(title, false, jslogContext);
    this.setLeadingIcons([IconButton.Icon.create("gear", "cookie-icon")]);
  }
  get elemId() {
    return "controls";
  }
  showElement() {
    this.listItemElement.dispatchEvent(new CustomEvent("showFlagControls", { bubbles: true, composed: true }));
  }
};

// gen/front_end/panels/security/CookieReportTreeElement.js
import * as IconButton2 from "./../../ui/components/icon_button/icon_button.js";
var CookieReportTreeElement = class extends SecurityPanelSidebarTreeElement {
  constructor(title, jslogContext) {
    super(title, false, jslogContext);
    this.setLeadingIcons([IconButton2.Icon.create("cookie", "cookie-icon")]);
  }
  get elemId() {
    return "report";
  }
  showElement() {
    this.listItemElement.dispatchEvent(new CustomEvent("showCookieReport", { bubbles: true, composed: true }));
  }
};

// gen/front_end/panels/security/IPProtectionTreeElement.js
import * as IconButton3 from "./../../ui/components/icon_button/icon_button.js";
var IPProtectionTreeElement = class extends SecurityPanelSidebarTreeElement {
  constructor(title, jslogContext) {
    super(title, false, jslogContext);
    this.setLeadingIcons([IconButton3.Icon.create("shield", "shield-icon")]);
  }
  get elemId() {
    return "protection";
  }
  showElement() {
    this.listItemElement.dispatchEvent(new CustomEvent("showIPProtection", { bubbles: true, composed: true }));
  }
};

// gen/front_end/panels/security/sidebar.css.js
var sidebar_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.tree-outline-disclosure {
  width: 100%;
}

.tree-outline li.security-group-list-item {
  & + ol {
    padding-left: 0;
  }

  &::before {
    display: none;
  }

  &:not(:first-child) {
    margin-top: var(--sys-size-6);
  }
}

.security-main-view-reload-message {
  color: var(--sys-color-token-subtle);
}

.tree-outline li.security-sidebar-origins + .children > li {
  &.selected {
    .url-scheme-secure {
      color: var(--sys-color-green);
    }

    .url-scheme-neutral,
    .url-scheme-insecure,
    .url-scheme-insecure-broken {
      color: var(--sys-color-error);
    }
  }
}

.security-main-view-reload-message,
.tree-outline li.security-sidebar-origins,
.tree-outline li.security-group-list-item,
.tree-outline span {
  font: var(--sys-typescale-body4-medium);

  &:hover:not(:has(devtools-checkbox)) .selection {
    background: transparent;
  }
}

.tree-outline li {
  & .leading-icons {
    flex: none;
  }

  & .tree-element-title,
  .highlighted-url,
  .title {
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

/*# sourceURL=${import.meta.resolve("./sidebar.css")} */`;

// gen/front_end/panels/security/SecurityPanelSidebar.js
var UIStrings5 = {
  /**
   * @description Section title for the the Security Panel's sidebar
   */
  security: "Security",
  /**
   * @description Section title for the the Security Panel's sidebar
   */
  privacy: "Privacy",
  /**
   * @description Sidebar element text in the Security panel
   */
  cookieReport: "Third-party cookies",
  /**
   * @description Sidebar element text in the Security panel
   */
  flagControls: "Controls",
  /**
   * @description Sidebar element text in the Security panel
   */
  ipProtection: "IP Protection",
  /**
   * @description Text in Security Panel of the Security panel
   */
  mainOrigin: "Main origin",
  /**
   * @description Text in Security Panel of the Security panel
   */
  nonsecureOrigins: "Non-secure origins",
  /**
   * @description Text in Security Panel of the Security panel
   */
  secureOrigins: "Secure origins",
  /**
   * @description Text in Security Panel of the Security panel
   */
  unknownCanceled: "Unknown / canceled",
  /**
   * @description Title text content in Security Panel of the Security panel
   */
  overview: "Overview",
  /**
   * @description Text in Security Panel of the Security panel
   */
  reloadToViewDetails: "Reload to view details"
};
var str_5 = i18n9.i18n.registerUIStrings("panels/security/SecurityPanelSidebar.ts", UIStrings5);
var i18nString5 = i18n9.i18n.getLocalizedString.bind(void 0, str_5);
var SecurityPanelSidebar = class extends UI5.Widget.VBox {
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
    this.#securitySidebarLastItemSetting = Common3.Settings.Settings.instance().createSetting("security-last-selected-element-path", "");
    this.#mainOrigin = null;
    this.sidebarTree = new UI5.TreeOutline.TreeOutlineInShadow(
      "NavigationTree"
      /* UI.TreeOutline.TreeVariant.NAVIGATION_TREE */
    );
    this.sidebarTree.registerRequiredCSS(lockIcon_css_default, sidebar_css_default);
    this.sidebarTree.element.classList.add("security-sidebar");
    this.contentElement.appendChild(this.sidebarTree.element);
    if (Root3.Runtime.hostConfig.devToolsPrivacyUI?.enabled) {
      const privacyTreeSection = this.#addSidebarSection(i18nString5(UIStrings5.privacy), "privacy");
      this.#cookieControlsTreeElement = new CookieControlsTreeElement(i18nString5(UIStrings5.flagControls), "cookie-flag-controls");
      privacyTreeSection.appendChild(this.#cookieControlsTreeElement);
      this.cookieReportTreeElement = new CookieReportTreeElement(i18nString5(UIStrings5.cookieReport), "cookie-report");
      privacyTreeSection.appendChild(this.cookieReportTreeElement);
      if (Root3.Runtime.hostConfig.devToolsIpProtectionPanelInDevTools?.enabled) {
        this.ipProtectionTreeElement = new IPProtectionTreeElement(i18nString5(UIStrings5.ipProtection), "ip-protection");
        privacyTreeSection.appendChild(this.ipProtectionTreeElement);
      }
      if (this.#securitySidebarLastItemSetting.get() === "") {
        this.#securitySidebarLastItemSetting.set(this.#cookieControlsTreeElement.elemId);
      }
    }
    const securitySectionTitle = i18nString5(UIStrings5.security);
    const securityTreeSection = this.#addSidebarSection(securitySectionTitle, "security");
    this.securityOverviewElement = new OriginTreeElement("security-main-view-sidebar-tree-item", this.#renderTreeElement);
    this.securityOverviewElement.tooltip = i18nString5(UIStrings5.overview);
    securityTreeSection.appendChild(this.securityOverviewElement);
    this.#originGroupTitles = /* @__PURE__ */ new Map([
      [OriginGroup.MainOrigin, { title: i18nString5(UIStrings5.mainOrigin) }],
      [
        OriginGroup.NonSecure,
        {
          title: i18nString5(UIStrings5.nonsecureOrigins),
          icon: getSecurityStateIconForDetailedView("insecure", `lock-icon lock-icon-${"insecure"}`)
        }
      ],
      [
        OriginGroup.Secure,
        {
          title: i18nString5(UIStrings5.secureOrigins),
          icon: getSecurityStateIconForDetailedView("secure", `lock-icon lock-icon-${"secure"}`)
        }
      ],
      [
        OriginGroup.Unknown,
        {
          title: i18nString5(UIStrings5.unknownCanceled),
          icon: getSecurityStateIconForDetailedView("unknown", `lock-icon lock-icon-${"unknown"}`)
        }
      ]
    ]);
    this.#originGroups = /* @__PURE__ */ new Map();
    for (const group of Object.values(OriginGroup)) {
      const element2 = this.#createOriginGroupElement(this.#originGroupTitles.get(group)?.title, this.#originGroupTitles.get(group)?.icon);
      this.#originGroups.set(group, element2);
      securityTreeSection.appendChild(element2);
    }
    this.#mainViewReloadMessage = new UI5.TreeOutline.TreeElement(i18nString5(UIStrings5.reloadToViewDetails));
    this.#mainViewReloadMessage.selectable = false;
    this.#mainViewReloadMessage.listItemElement.classList.add("security-main-view-reload-message");
    const treeElement = this.#originGroups.get(OriginGroup.MainOrigin);
    treeElement.appendChild(this.#mainViewReloadMessage);
    this.#clearOriginGroups();
    this.#elementsByOrigin = /* @__PURE__ */ new Map();
    this.element.addEventListener("update-sidebar-selection", (event) => {
      const id = event.detail.id;
      this.#securitySidebarLastItemSetting.set(id);
    });
    this.showLastSelectedElement();
  }
  showLastSelectedElement() {
    if (this.#cookieControlsTreeElement && this.#securitySidebarLastItemSetting.get() === this.#cookieControlsTreeElement.elemId) {
      this.#cookieControlsTreeElement.select();
      this.#cookieControlsTreeElement.showElement();
    } else if (this.cookieReportTreeElement && this.#securitySidebarLastItemSetting.get() === this.cookieReportTreeElement.elemId) {
      this.cookieReportTreeElement.select();
      this.cookieReportTreeElement.showElement();
    } else if (this.ipProtectionTreeElement && this.#securitySidebarLastItemSetting.get() === this.ipProtectionTreeElement.elemId) {
      this.ipProtectionTreeElement.select();
      this.ipProtectionTreeElement.showElement();
    } else {
      this.securityOverviewElement.select();
      this.securityOverviewElement.showElement();
    }
  }
  #addSidebarSection(title, jslogContext) {
    const treeElement = new UI5.TreeOutline.TreeElement(title, true, jslogContext);
    treeElement.listItemElement.classList.add("security-group-list-item");
    treeElement.setCollapsible(false);
    treeElement.selectable = false;
    this.sidebarTree.appendChild(treeElement);
    UI5.ARIAUtils.markAsHeading(treeElement.listItemElement, 3);
    UI5.ARIAUtils.setLabel(treeElement.childrenListElement, title);
    return treeElement;
  }
  #originGroupTitle(originGroup) {
    return this.#originGroupTitles.get(originGroup)?.title;
  }
  #originGroupElement(originGroup) {
    return this.#originGroups.get(originGroup);
  }
  #createOriginGroupElement(originGroupTitle, originGroupIcon) {
    const originGroup = new UI5.TreeOutline.TreeElement(originGroupTitle, true);
    originGroup.selectable = false;
    originGroup.expand();
    originGroup.listItemElement.classList.add("security-sidebar-origins");
    if (originGroupIcon) {
      originGroup.setLeadingIcons([originGroupIcon]);
    }
    UI5.ARIAUtils.setLabel(originGroup.childrenListElement, originGroupTitle);
    return originGroup;
  }
  toggleOriginsList(hidden) {
    for (const element of this.#originGroups.values()) {
      element.hidden = hidden;
    }
  }
  addOrigin(origin, securityState) {
    this.#mainViewReloadMessage.hidden = true;
    const originElement = new OriginTreeElement("security-sidebar-tree-item", this.#renderTreeElement, origin);
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
      newParent.title = i18nString5(UIStrings5.mainOrigin);
      if (securityState === "secure") {
        newParent.setLeadingIcons([getSecurityStateIconForOverview(securityState, `lock-icon lock-icon-${securityState}`)]);
      } else {
        newParent.setLeadingIcons([getSecurityStateIconForOverview(securityState, `lock-icon lock-icon-${securityState}`)]);
      }
      UI5.ARIAUtils.setLabel(newParent.childrenListElement, newParent.title);
    } else {
      switch (securityState) {
        case "secure":
          newParent = this.#originGroupElement(OriginGroup.Secure);
          break;
        case "unknown":
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
      } else {
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
      const securityState = element.securityState() ?? "unknown";
      const isOverviewElement = element.listItemElement.classList.contains("security-main-view-sidebar-tree-item");
      const icon = isOverviewElement ? getSecurityStateIconForOverview(securityState, `lock-icon lock-icon-${securityState}`) : getSecurityStateIconForDetailedView(securityState, `security-property security-property-${securityState}`);
      const elementTitle = isOverviewElement ? (() => {
        const title = document.createElement("span");
        title.classList.add("title");
        title.textContent = i18nString5(UIStrings5.overview);
        return title;
      })() : createHighlightedUrl(element.origin() ?? Platform2.DevToolsPath.EmptyUrlString, securityState);
      element.setLeadingIcons([icon]);
      if (element.listItemElement.lastChild) {
        element.listItemElement.removeChild(element.listItemElement.lastChild);
      }
      element.listItemElement.appendChild(elementTitle);
    }
  }
};

// gen/front_end/panels/security/SecurityPanel.js
var { widgetConfig: widgetConfig2 } = UI6.Widget;
var UIStrings6 = {
  /**
   * @description Summary div text content in Security Panel of the Security panel
   */
  securityOverview: "Security overview",
  /**
   * @description Text to show something is secure
   */
  secure: "Secure",
  /**
   * @description Sdk console message message level info of level Labels in Console View of the Console panel
   */
  info: "Info",
  /**
   * @description Not secure div text content in Security Panel of the Security panel
   */
  notSecure: "Not secure",
  /**
   * @description Text to view a security certificate
   */
  viewCertificate: "View certificate",
  /**
   * @description Text in Security Panel of the Security panel
   */
  notSecureBroken: "Not secure (broken)",
  /**
   * @description Main summary for page when it has been deemed unsafe by the SafeBrowsing service.
   */
  thisPageIsDangerousFlaggedBy: "This page is dangerous (flagged by Google Safe Browsing).",
  /**
   * @description Summary phrase for a security problem where the site is deemed unsafe by the SafeBrowsing service.
   */
  flaggedByGoogleSafeBrowsing: "Flagged by Google Safe Browsing",
  /**
   * @description Description of a security problem where the site is deemed unsafe by the SafeBrowsing service.
   */
  toCheckThisPagesStatusVisit: "To check this page's status, visit g.co/safebrowsingstatus.",
  /**
   * @description Main summary for a non cert error page.
   */
  thisIsAnErrorPage: "This is an error page.",
  /**
   * @description Main summary for where the site is non-secure HTTP.
   */
  thisPageIsInsecureUnencrypted: "This page is insecure (unencrypted HTTP).",
  /**
   * @description Main summary for where the site has a non-cryptographic secure origin.
   */
  thisPageHasANonhttpsSecureOrigin: "This page has a non-HTTPS secure origin.",
  /**
   * @description Message to display in devtools security tab when the page you are on triggered a safety tip.
   */
  thisPageIsSuspicious: "This page is suspicious",
  /**
   * @description Body of message to display in devtools security tab when you are viewing a page that triggered a safety tip.
   */
  chromeHasDeterminedThatThisSiteS: "Chrome has determined that this site could be fake or fraudulent.",
  /**
   * @description Second part of the body of message to display in devtools security tab when you are viewing a page that triggered a safety tip.
   */
  ifYouBelieveThisIsShownIn: "If you believe this is shown in error please visit https://g.co/chrome/lookalike-warnings.",
  /**
   * @description Summary of a warning when the user visits a page that triggered a Safety Tip because the domain looked like another domain.
   */
  possibleSpoofingUrl: "Possible spoofing URL",
  /**
   * @description Body of a warning when the user visits a page that triggered a Safety Tip because the domain looked like another domain.
   * @example {wikipedia.org} PH1
   */
  thisSitesHostnameLooksSimilarToP: "This site's hostname looks similar to {PH1}. Attackers sometimes mimic sites by making small, hard-to-see changes to the domain name.",
  /**
   * @description second part of body of a warning when the user visits a page that triggered a Safety Tip because the domain looked like another domain.
   */
  ifYouBelieveThisIsShownInErrorSafety: "If you believe this is shown in error please visit https://g.co/chrome/lookalike-warnings.",
  /**
   * @description Title of the devtools security tab when the page you are on triggered a safety tip.
   */
  thisPageIsSuspiciousFlaggedBy: "This page is suspicious (flagged by Chrome).",
  /**
   * @description Text for a security certificate
   */
  certificate: "Certificate",
  /**
   * @description Summary phrase for a security problem where the site's certificate chain contains a SHA1 signature.
   */
  insecureSha: "insecure (SHA-1)",
  /**
   * @description Description of a security problem where the site's certificate chain contains a SHA1 signature.
   */
  theCertificateChainForThisSite: "The certificate chain for this site contains a certificate signed using SHA-1.",
  /**
   * @description Summary phrase for a security problem where the site's certificate is missing a subjectAltName extension.
   */
  subjectAlternativeNameMissing: "`Subject Alternative Name` missing",
  /**
   * @description Description of a security problem where the site's certificate is missing a subjectAltName extension.
   */
  theCertificateForThisSiteDoesNot: "The certificate for this site does not contain a `Subject Alternative Name` extension containing a domain name or IP address.",
  /**
   * @description Summary phrase for a security problem with the site's certificate.
   */
  missing: "missing",
  /**
   * @description Description of a security problem with the site's certificate.
   * @example {net::ERR_CERT_AUTHORITY_INVALID} PH1
   */
  thisSiteIsMissingAValidTrusted: "This site is missing a valid, trusted certificate ({PH1}).",
  /**
   * @description Summary phrase for a site that has a valid server certificate.
   */
  validAndTrusted: "valid and trusted",
  /**
   * @description Description of a site that has a valid server certificate.
   * @example {Let's Encrypt Authority X3} PH1
   */
  theConnectionToThisSiteIsUsingA: "The connection to this site is using a valid, trusted server certificate issued by {PH1}.",
  /**
   * @description Summary phrase for a security state where Private Key Pinning is ignored because the certificate chains to a locally-trusted root.
   */
  publickeypinningBypassed: "Public-Key-Pinning bypassed",
  /**
   * @description Description of a security state where Private Key Pinning is ignored because the certificate chains to a locally-trusted root.
   */
  publickeypinningWasBypassedByA: "Public-Key-Pinning was bypassed by a local root certificate.",
  /**
   * @description Summary phrase for a site with a certificate that is expiring soon.
   */
  certificateExpiresSoon: "Certificate expires soon",
  /**
   * @description Description for a site with a certificate that is expiring soon.
   */
  theCertificateForThisSiteExpires: "The certificate for this site expires in less than 48 hours and needs to be renewed.",
  /**
   * @description Text that refers to the network connection
   */
  connection: "Connection",
  /**
   * @description Summary phrase for a site that uses a modern, secure TLS protocol and cipher.
   */
  secureConnectionSettings: "secure connection settings",
  /**
   * @description Description of a site's TLS settings.
   * @example {TLS 1.2} PH1
   * @example {ECDHE_RSA} PH2
   * @example {AES_128_GCM} PH3
   */
  theConnectionToThisSiteIs: "The connection to this site is encrypted and authenticated using {PH1}, {PH2}, and {PH3}.",
  /**
   * @description A recommendation to the site owner to use a modern TLS protocol
   * @example {TLS 1.0} PH1
   */
  sIsObsoleteEnableTlsOrLater: "{PH1} is obsolete. Enable TLS 1.2 or later.",
  /**
   * @description A recommendation to the site owner to use a modern TLS key exchange
   */
  rsaKeyExchangeIsObsoleteEnableAn: "RSA key exchange is obsolete. Enable an ECDHE-based cipher suite.",
  /**
   * @description A recommendation to the site owner to use a modern TLS cipher
   * @example {3DES_EDE_CBC} PH1
   */
  sIsObsoleteEnableAnAesgcmbased: "{PH1} is obsolete. Enable an AES-GCM-based cipher suite.",
  /**
   * @description A recommendation to the site owner to use a modern TLS server signature
   */
  theServerSignatureUsesShaWhichIs: "The server signature uses SHA-1, which is obsolete. Enable a SHA-2 signature algorithm instead. (Note this is different from the signature in the certificate.)",
  /**
   * @description Summary phrase for a site that uses an outdated SSL settings (protocol, key exchange, or cipher).
   */
  obsoleteConnectionSettings: "obsolete connection settings",
  /**
   * @description A title of the 'Resources' action category
   */
  resources: "Resources",
  /**
   * @description Summary for page when there is active mixed content
   */
  activeMixedContent: "active mixed content",
  /**
   * @description Description for page when there is active mixed content
   */
  youHaveRecentlyAllowedNonsecure: "You have recently allowed non-secure content (such as scripts or iframes) to run on this site.",
  /**
   * @description Summary for page when there is mixed content
   */
  mixedContent: "mixed content",
  /**
   * @description Description for page when there is mixed content
   */
  thisPageIncludesHttpResources: "This page includes HTTP resources.",
  /**
   * @description Summary for page when there is a non-secure form
   */
  nonsecureForm: "non-secure form",
  /**
   * @description Description for page when there is a non-secure form
   */
  thisPageIncludesAFormWithA: 'This page includes a form with a non-secure "action" attribute.',
  /**
   * @description Summary for the page when it contains active content with certificate error
   */
  activeContentWithCertificate: "active content with certificate errors",
  /**
   * @description Description for the page when it contains active content with certificate error
   */
  youHaveRecentlyAllowedContent: "You have recently allowed content loaded with certificate errors (such as scripts or iframes) to run on this site.",
  /**
   * @description Summary for page when there is active content with certificate errors
   */
  contentWithCertificateErrors: "content with certificate errors",
  /**
   * @description Description for page when there is content with certificate errors
   */
  thisPageIncludesResourcesThat: "This page includes resources that were loaded with certificate errors.",
  /**
   * @description Summary for page when all resources are served securely
   */
  allServedSecurely: "all served securely",
  /**
   * @description Description for page when all resources are served securely
   */
  allResourcesOnThisPageAreServed: "All resources on this page are served securely.",
  /**
   * @description Text in Security Panel of the Security panel
   */
  blockedMixedContent: "Blocked mixed content",
  /**
   * @description Text in Security Panel of the Security panel
   */
  yourPageRequestedNonsecure: "Your page requested non-secure resources that were blocked.",
  /**
   * @description Refresh prompt text content in Security Panel of the Security panel
   */
  reloadThePageToRecordRequestsFor: "Reload the page to record requests for HTTP resources.",
  /**
   * @description Link text in the Security Panel. Clicking the link navigates the user to the
   * Network panel. Requests refers to network requests. Each request is a piece of data transmitted
   * from the current user's browser to a remote server.
   */
  viewDRequestsInNetworkPanel: "{n, plural, =1 {View # request in Network Panel} other {View # requests in Network Panel}}",
  /**
   * @description Text for the origin of something
   */
  origin: "Origin",
  /**
   * @description Text in Security Panel of the Security panel
   */
  viewRequestsInNetworkPanel: "View requests in Network Panel",
  /**
   * @description Text for security or network protocol
   */
  protocol: "Protocol",
  /**
   * @description Text in the Security panel that refers to how the TLS handshake
   *established encryption keys.
   */
  keyExchange: "Key exchange",
  /**
   * @description Text in Security Panel that refers to how the TLS handshake
   *encrypted data.
   */
  cipher: "Cipher",
  /**
   * @description Text in Security Panel that refers to the signature algorithm
   *used by the server for authenticate in the TLS handshake.
   */
  serverSignature: "Server signature",
  /**
   * @description Text in Security Panel that refers to whether the ClientHello
   *message in the TLS handshake was encrypted.
   */
  encryptedClientHello: "Encrypted ClientHello",
  /**
   * @description Sct div text content in Security Panel of the Security panel
   */
  certificateTransparency: "Certificate Transparency",
  /**
   * @description Text that refers to the subject of a security certificate
   */
  subject: "Subject",
  /**
   * @description Text to show since when an item is valid
   */
  validFrom: "Valid from",
  /**
   * @description Text to indicate the expiry date
   */
  validUntil: "Valid until",
  /**
   * @description Text for the issuer of an item
   */
  issuer: "Issuer",
  /**
   * @description Text in Security Panel of the Security panel
   */
  openFullCertificateDetails: "Open full certificate details",
  /**
   * @description Text in Security Panel of the Security panel
   */
  sct: "SCT",
  /**
   * @description Text in Security Panel of the Security panel
   */
  logName: "Log name",
  /**
   * @description Text in Security Panel of the Security panel
   */
  logId: "Log ID",
  /**
   * @description Text in Security Panel of the Security panel
   */
  validationStatus: "Validation status",
  /**
   * @description Text for the source of something
   */
  source: "Source",
  /**
   * @description Label for a date/time string in the Security panel. It indicates the time at which
   * a security certificate was issued (created by an authority and distributed).
   */
  issuedAt: "Issued at",
  /**
   * @description Text in Security Panel of the Security panel
   */
  hashAlgorithm: "Hash algorithm",
  /**
   * @description Text in Security Panel of the Security panel
   */
  signatureAlgorithm: "Signature algorithm",
  /**
   * @description Text in Security Panel of the Security panel
   */
  signatureData: "Signature data",
  /**
   * @description Toggle scts details link text content in Security Panel of the Security panel
   */
  showFullDetails: "Show full details",
  /**
   * @description Toggle scts details link text content in Security Panel of the Security panel
   */
  hideFullDetails: "Hide full details",
  /**
   * @description Text in Security Panel of the Security panel
   */
  thisRequestCompliesWithChromes: "This request complies with `Chrome`'s Certificate Transparency policy.",
  /**
   * @description Text in Security Panel of the Security panel
   */
  thisRequestDoesNotComplyWith: "This request does not comply with `Chrome`'s Certificate Transparency policy.",
  /**
   * @description Text in Security Panel of the Security panel
   */
  thisResponseWasLoadedFromCache: "This response was loaded from cache. Some security details might be missing.",
  /**
   * @description Text in Security Panel of the Security panel
   */
  theSecurityDetailsAboveAreFrom: "The security details above are from the first inspected response.",
  /**
   * @description Main summary for where the site has a non-cryptographic secure origin.
   */
  thisOriginIsANonhttpsSecure: "This origin is a non-HTTPS secure origin.",
  /**
   * @description Text in Security Panel of the Security panel
   */
  yourConnectionToThisOriginIsNot: "Your connection to this origin is not secure.",
  /**
   * @description No info div text content in Security Panel of the Security panel
   */
  noSecurityInformation: "No security information",
  /**
   * @description Text in Security Panel of the Security panel
   */
  noSecurityDetailsAreAvailableFor: "No security details are available for this origin.",
  /**
   * @description San div text content in Security Panel of the Security panel
   */
  na: "(n/a)",
  /**
   * @description Text to show less content
   */
  showLess: "Show less",
  /**
   * @description Truncated santoggle text content in Security Panel of the Security panel
   * @example {2} PH1
   */
  showMoreSTotal: "Show more ({PH1} total)",
  /**
   * @description Shown when a field refers to an option that is unknown to the frontend.
   */
  unknownField: "unknown",
  /**
   * @description Shown when a field refers to a TLS feature which was enabled.
   */
  enabled: "enabled"
};
var str_6 = i18n11.i18n.registerUIStrings("panels/security/SecurityPanel.ts", UIStrings6);
var i18nString6 = i18n11.i18n.getLocalizedString.bind(void 0, str_6);
var securityPanelInstance;
var SignatureSchemeStrings = /* @__PURE__ */ new Map([
  // The full name for these schemes is RSASSA-PKCS1-v1_5, sometimes
  // "PKCS#1 v1.5", but those are very long, so let "RSA" vs "RSA-PSS"
  // disambiguate.
  [513, "RSA with SHA-1"],
  [1025, "RSA with SHA-256"],
  [1281, "RSA with SHA-384"],
  [1537, "RSA with SHA-512"],
  // We omit the curve from these names because in TLS 1.2 these code points
  // were not specific to a curve. Saying "P-256" for a server that used a P-384
  // key with SHA-256 in TLS 1.2 would be confusing.
  [1027, "ECDSA with SHA-256"],
  [1283, "ECDSA with SHA-384"],
  [2052, "RSA-PSS with SHA-256"],
  [2053, "RSA-PSS with SHA-384"],
  [2054, "RSA-PSS with SHA-512"]
]);
var LOCK_ICON_NAME = "lock";
var WARNING_ICON_NAME = "warning";
var UNKNOWN_ICON_NAME = "indeterminate-question-box";
function getSecurityStateIconForDetailedView(securityState, className) {
  let iconName;
  switch (securityState) {
    case "neutral":
    // fallthrough
    case "insecure":
    // fallthrough
    case "insecure-broken":
      iconName = WARNING_ICON_NAME;
      break;
    case "secure":
      iconName = LOCK_ICON_NAME;
      break;
    case "info":
    // fallthrough
    case "unknown":
      iconName = UNKNOWN_ICON_NAME;
      break;
  }
  return IconButton4.Icon.create(iconName, className);
}
function getSecurityStateIconForOverview(securityState, className) {
  let iconName;
  switch (securityState) {
    case "unknown":
    // fallthrough
    case "neutral":
      iconName = UNKNOWN_ICON_NAME;
      break;
    case "insecure":
    // fallthrough
    case "insecure-broken":
      iconName = WARNING_ICON_NAME;
      break;
    case "secure":
      iconName = LOCK_ICON_NAME;
      break;
    case "info":
      throw new Error(`Unexpected security state ${securityState}`);
  }
  return IconButton4.Icon.create(iconName, className);
}
function createHighlightedUrl(url, securityState) {
  const schemeSeparator = "://";
  const index = url.indexOf(schemeSeparator);
  if (index === -1) {
    const text = document.createElement("span");
    text.textContent = url;
    return text;
  }
  const highlightedUrl = document.createElement("span");
  highlightedUrl.classList.add("highlighted-url");
  const scheme = url.substr(0, index);
  const content = url.substr(index + schemeSeparator.length);
  highlightedUrl.createChild("span", "url-scheme-" + securityState).textContent = scheme;
  highlightedUrl.createChild("span", "url-scheme-separator").textContent = schemeSeparator;
  highlightedUrl.createChild("span").textContent = content;
  return highlightedUrl;
}
var DEFAULT_VIEW4 = (input, output, target) => {
  render4(html4`
    <devtools-split-view direction="column" name="security"
      ${UI6.Widget.widgetRef(UI6.SplitWidget.SplitWidget, (e) => {
    output.splitWidget = e;
  })}>
      <devtools-widget
        slot="sidebar"
        .widgetConfig=${widgetConfig2(SecurityPanelSidebar)}
        @showIPProtection=${() => output.setVisibleView(new IPProtectionView())}
        @showCookieReport=${() => output.setVisibleView(new CookieReportView())}
        @showFlagControls=${() => output.setVisibleView(new CookieControlsView())}
        ${UI6.Widget.widgetRef(SecurityPanelSidebar, (e) => {
    output.sidebar = e;
  })}>
      </devtools-widget>
  </devtools-split-view>`, target);
};
var SecurityPanel = class _SecurityPanel extends UI6.Panel.Panel {
  view;
  mainView;
  sidebar;
  lastResponseReceivedForLoaderId;
  origins;
  filterRequestCounts;
  visibleView;
  eventListeners;
  securityModel;
  splitWidget;
  constructor(view = DEFAULT_VIEW4) {
    super("security");
    this.view = view;
    this.update();
    this.sidebar.setMinimumSize(100, 25);
    this.sidebar.element.classList.add("panel-sidebar");
    this.sidebar.element.setAttribute("jslog", `${VisualLogging3.pane("sidebar").track({ resize: true })}`);
    this.mainView = new SecurityMainView();
    this.mainView.panel = this;
    this.element.addEventListener(ShowOriginEvent.eventName, (event) => {
      if (event.origin) {
        this.showOrigin(event.origin);
      } else {
        this.setVisibleView(this.mainView);
      }
    });
    this.lastResponseReceivedForLoaderId = /* @__PURE__ */ new Map();
    this.origins = /* @__PURE__ */ new Map();
    this.filterRequestCounts = /* @__PURE__ */ new Map();
    this.visibleView = null;
    this.eventListeners = [];
    this.securityModel = null;
    SDK5.TargetManager.TargetManager.instance().observeModels(SecurityModel, this, { scoped: true });
    SDK5.TargetManager.TargetManager.instance().addModelListener(SDK5.ResourceTreeModel.ResourceTreeModel, SDK5.ResourceTreeModel.Events.PrimaryPageChanged, this.onPrimaryPageChanged, this);
    this.sidebar.showLastSelectedElement();
  }
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!securityPanelInstance || forceNew) {
      securityPanelInstance = new _SecurityPanel();
    }
    return securityPanelInstance;
  }
  static createCertificateViewerButtonForOrigin(text, origin) {
    const certificateButton = UI6.UIUtils.createTextButton(text, async (e) => {
      e.consume();
      const names = await SDK5.NetworkManager.MultitargetNetworkManager.instance().getCertificate(origin);
      if (names.length > 0) {
        Host2.InspectorFrontendHost.InspectorFrontendHostInstance.showCertificateViewer(names);
      }
    }, { className: "origin-button", jslogContext: "security.view-certificate-for-origin", title: text });
    UI6.ARIAUtils.markAsButton(certificateButton);
    return certificateButton;
  }
  static createCertificateViewerButtonForCert(text, names) {
    const certificateButton = UI6.UIUtils.createTextButton(text, (e) => {
      e.consume();
      Host2.InspectorFrontendHost.InspectorFrontendHostInstance.showCertificateViewer(names);
    }, { className: "origin-button", jslogContext: "security.view-certificate" });
    UI6.ARIAUtils.markAsButton(certificateButton);
    return certificateButton;
  }
  update() {
    this.view({ panel: this }, this, this.contentElement);
  }
  updateVisibleSecurityState(visibleSecurityState) {
    this.sidebar.securityOverviewElement.setSecurityState(visibleSecurityState.securityState);
    this.mainView.updateVisibleSecurityState(visibleSecurityState);
  }
  onVisibleSecurityStateChanged({ data }) {
    this.updateVisibleSecurityState(data);
  }
  showOrigin(origin) {
    const originState = this.origins.get(origin);
    if (!originState) {
      return;
    }
    if (!originState.originView) {
      originState.originView = new SecurityOriginView(origin, originState);
    }
    this.setVisibleView(originState.originView);
  }
  wasShown() {
    super.wasShown();
    if (!this.visibleView) {
      this.sidebar.showLastSelectedElement();
    }
  }
  focus() {
    this.sidebar.focus();
  }
  setVisibleView(view) {
    if (this.visibleView === view) {
      return;
    }
    if (this.visibleView) {
      this.visibleView.detach();
    }
    this.visibleView = view;
    if (view) {
      this.splitWidget.setMainWidget(view);
    }
  }
  onResponseReceived(event) {
    const request = event.data.request;
    if (request.resourceType() === Common4.ResourceType.resourceTypes.Document && request.loaderId) {
      this.lastResponseReceivedForLoaderId.set(request.loaderId, request);
    }
  }
  processRequest(request) {
    const origin = Common4.ParsedURL.ParsedURL.extractOrigin(request.url());
    if (!origin) {
      return;
    }
    let securityState = request.securityState();
    if (request.mixedContentType === "blockable" || request.mixedContentType === "optionally-blockable") {
      securityState = "insecure";
    }
    const originState = this.origins.get(origin);
    if (originState) {
      if (securityStateCompare(securityState, originState.securityState) < 0) {
        originState.securityState = securityState;
        const securityDetails = request.securityDetails();
        if (securityDetails) {
          originState.securityDetails = securityDetails;
        }
        this.sidebar.updateOrigin(origin, securityState);
        if (originState.originView) {
          originState.originView.setSecurityState(securityState);
        }
      }
    } else {
      const newOriginState = {
        securityState,
        securityDetails: request.securityDetails(),
        loadedFromCache: request.cached(),
        originView: void 0
      };
      this.origins.set(origin, newOriginState);
      this.sidebar.addOrigin(origin, securityState);
    }
  }
  onRequestFinished(event) {
    const request = event.data;
    this.updateFilterRequestCounts(request);
    this.processRequest(request);
  }
  updateFilterRequestCounts(request) {
    if (request.mixedContentType === "none") {
      return;
    }
    let filterKey = "all";
    if (request.wasBlocked()) {
      filterKey = "blocked";
    } else if (request.mixedContentType === "blockable") {
      filterKey = "block-overridden";
    } else if (request.mixedContentType === "optionally-blockable") {
      filterKey = "displayed";
    }
    const currentCount = this.filterRequestCounts.get(filterKey);
    if (!currentCount) {
      this.filterRequestCounts.set(filterKey, 1);
    } else {
      this.filterRequestCounts.set(filterKey, currentCount + 1);
    }
    this.mainView.refreshExplanations();
  }
  filterRequestCount(filterKey) {
    return this.filterRequestCounts.get(filterKey) || 0;
  }
  modelAdded(securityModel) {
    if (securityModel.target() !== securityModel.target().outermostTarget()) {
      return;
    }
    this.securityModel = securityModel;
    const resourceTreeModel = securityModel.resourceTreeModel();
    const networkManager = securityModel.networkManager();
    if (this.eventListeners.length) {
      Common4.EventTarget.removeEventListeners(this.eventListeners);
    }
    this.eventListeners = [
      securityModel.addEventListener(Events.VisibleSecurityStateChanged, this.onVisibleSecurityStateChanged, this),
      resourceTreeModel.addEventListener(SDK5.ResourceTreeModel.Events.InterstitialShown, this.onInterstitialShown, this),
      resourceTreeModel.addEventListener(SDK5.ResourceTreeModel.Events.InterstitialHidden, this.onInterstitialHidden, this),
      networkManager.addEventListener(SDK5.NetworkManager.Events.ResponseReceived, this.onResponseReceived, this),
      networkManager.addEventListener(SDK5.NetworkManager.Events.RequestFinished, this.onRequestFinished, this)
    ];
    if (resourceTreeModel.isInterstitialShowing) {
      this.onInterstitialShown();
    }
  }
  modelRemoved(securityModel) {
    if (this.securityModel !== securityModel) {
      return;
    }
    this.securityModel = null;
    Common4.EventTarget.removeEventListeners(this.eventListeners);
  }
  onPrimaryPageChanged(event) {
    const { frame } = event.data;
    const request = this.lastResponseReceivedForLoaderId.get(frame.loaderId);
    this.sidebar.showLastSelectedElement();
    this.sidebar.clearOrigins();
    this.origins.clear();
    this.lastResponseReceivedForLoaderId.clear();
    this.filterRequestCounts.clear();
    this.mainView.refreshExplanations();
    const origin = Common4.ParsedURL.ParsedURL.extractOrigin(request ? request.url() : frame.url);
    this.sidebar.setMainOrigin(origin);
    if (request) {
      this.processRequest(request);
    }
  }
  onInterstitialShown() {
    this.sidebar.showLastSelectedElement();
    this.sidebar.toggleOriginsList(
      true
      /* hidden */
    );
  }
  onInterstitialHidden() {
    this.sidebar.toggleOriginsList(
      false
      /* hidden */
    );
  }
};
var OriginGroup;
(function(OriginGroup2) {
  OriginGroup2["MainOrigin"] = "MainOrigin";
  OriginGroup2["NonSecure"] = "NonSecure";
  OriginGroup2["Secure"] = "Secure";
  OriginGroup2["Unknown"] = "Unknown";
})(OriginGroup || (OriginGroup = {}));
var SecurityMainView = class extends UI6.Widget.VBox {
  panel;
  summarySection;
  securityExplanationsMain;
  securityExplanationsExtra;
  lockSpectrum;
  summaryText;
  explanations;
  securityState;
  constructor(element) {
    super(element, { jslog: `${VisualLogging3.pane("security.main-view")}` });
    this.registerRequiredCSS(lockIcon_css_default, mainView_css_default);
    this.setMinimumSize(200, 100);
    this.contentElement.classList.add("security-main-view");
    this.summarySection = this.contentElement.createChild("div", "security-summary");
    this.securityExplanationsMain = this.contentElement.createChild("div", "security-explanation-list security-explanations-main");
    this.securityExplanationsExtra = this.contentElement.createChild("div", "security-explanation-list security-explanations-extra");
    const summaryDiv = this.summarySection.createChild("div", "security-summary-section-title");
    summaryDiv.textContent = i18nString6(UIStrings6.securityOverview);
    UI6.ARIAUtils.markAsHeading(summaryDiv, 1);
    const lockSpectrum = this.summarySection.createChild("div", "lock-spectrum");
    this.lockSpectrum = /* @__PURE__ */ new Map([
      [
        "secure",
        lockSpectrum.appendChild(getSecurityStateIconForOverview("secure", "lock-icon lock-icon-secure"))
      ],
      [
        "neutral",
        lockSpectrum.appendChild(getSecurityStateIconForOverview("neutral", "lock-icon lock-icon-neutral"))
      ],
      [
        "insecure",
        lockSpectrum.appendChild(getSecurityStateIconForOverview("insecure", "lock-icon lock-icon-insecure"))
      ]
    ]);
    UI6.Tooltip.Tooltip.install(this.getLockSpectrumDiv(
      "secure"
      /* Protocol.Security.SecurityState.Secure */
    ), i18nString6(UIStrings6.secure));
    UI6.Tooltip.Tooltip.install(this.getLockSpectrumDiv(
      "neutral"
      /* Protocol.Security.SecurityState.Neutral */
    ), i18nString6(UIStrings6.info));
    UI6.Tooltip.Tooltip.install(this.getLockSpectrumDiv(
      "insecure"
      /* Protocol.Security.SecurityState.Insecure */
    ), i18nString6(UIStrings6.notSecure));
    this.summarySection.createChild("div", "triangle-pointer-container").createChild("div", "triangle-pointer-wrapper").createChild("div", "triangle-pointer");
    this.summaryText = this.summarySection.createChild("div", "security-summary-text");
    UI6.ARIAUtils.markAsHeading(this.summaryText, 2);
    this.explanations = null;
    this.securityState = null;
  }
  getLockSpectrumDiv(securityState) {
    const element = this.lockSpectrum.get(securityState);
    if (!element) {
      throw new Error(`Invalid argument: ${securityState}`);
    }
    return element;
  }
  addExplanation(parent, explanation) {
    const explanationSection = parent.createChild("div", "security-explanation");
    explanationSection.classList.add("security-explanation-" + explanation.securityState);
    const icon = getSecurityStateIconForDetailedView(explanation.securityState, "security-property security-property-" + explanation.securityState);
    explanationSection.appendChild(icon);
    const text = explanationSection.createChild("div", "security-explanation-text");
    const explanationHeader = text.createChild("div", "security-explanation-title");
    if (explanation.title) {
      explanationHeader.createChild("span").textContent = explanation.title + " - ";
      explanationHeader.createChild("span", "security-explanation-title-" + explanation.securityState).textContent = explanation.summary;
    } else {
      explanationHeader.textContent = explanation.summary;
    }
    text.createChild("div").textContent = explanation.description;
    if (explanation.certificate.length) {
      text.appendChild(SecurityPanel.createCertificateViewerButtonForCert(i18nString6(UIStrings6.viewCertificate), explanation.certificate));
    }
    if (explanation.recommendations?.length) {
      const recommendationList = text.createChild("ul", "security-explanation-recommendations");
      for (const recommendation of explanation.recommendations) {
        recommendationList.createChild("li").textContent = recommendation;
      }
    }
    return text;
  }
  updateVisibleSecurityState(visibleSecurityState) {
    this.summarySection.classList.remove("security-summary-" + this.securityState);
    this.securityState = visibleSecurityState.securityState;
    this.summarySection.classList.add("security-summary-" + this.securityState);
    if (this.securityState === "insecure") {
      this.getLockSpectrumDiv(
        "insecure"
        /* Protocol.Security.SecurityState.Insecure */
      ).classList.add("lock-icon-insecure");
      this.getLockSpectrumDiv(
        "insecure"
        /* Protocol.Security.SecurityState.Insecure */
      ).classList.remove("lock-icon-insecure-broken");
      UI6.Tooltip.Tooltip.install(this.getLockSpectrumDiv(
        "insecure"
        /* Protocol.Security.SecurityState.Insecure */
      ), i18nString6(UIStrings6.notSecure));
    } else if (this.securityState === "insecure-broken") {
      this.getLockSpectrumDiv(
        "insecure"
        /* Protocol.Security.SecurityState.Insecure */
      ).classList.add("lock-icon-insecure-broken");
      this.getLockSpectrumDiv(
        "insecure"
        /* Protocol.Security.SecurityState.Insecure */
      ).classList.remove("lock-icon-insecure");
      UI6.Tooltip.Tooltip.install(this.getLockSpectrumDiv(
        "insecure"
        /* Protocol.Security.SecurityState.Insecure */
      ), i18nString6(UIStrings6.notSecureBroken));
    }
    const { summary, explanations } = this.getSecuritySummaryAndExplanations(visibleSecurityState);
    this.summaryText.textContent = summary || SummaryMessages[this.securityState]();
    this.explanations = this.orderExplanations(explanations);
    this.refreshExplanations();
  }
  getSecuritySummaryAndExplanations(visibleSecurityState) {
    const { securityState, securityStateIssueIds } = visibleSecurityState;
    let summary;
    const explanations = [];
    summary = this.explainSafetyTipSecurity(visibleSecurityState, summary, explanations);
    if (securityStateIssueIds.includes("malicious-content")) {
      summary = i18nString6(UIStrings6.thisPageIsDangerousFlaggedBy);
      explanations.unshift(new SecurityStyleExplanation("insecure", void 0, i18nString6(UIStrings6.flaggedByGoogleSafeBrowsing), i18nString6(UIStrings6.toCheckThisPagesStatusVisit)));
    } else if (securityStateIssueIds.includes("is-error-page") && visibleSecurityState.certificateSecurityState?.certificateNetworkError === null) {
      summary = i18nString6(UIStrings6.thisIsAnErrorPage);
      return { summary, explanations };
    } else if (securityState === "insecure-broken" && securityStateIssueIds.includes("scheme-is-not-cryptographic")) {
      summary = summary || i18nString6(UIStrings6.thisPageIsInsecureUnencrypted);
    }
    if (securityStateIssueIds.includes("scheme-is-not-cryptographic")) {
      if (securityState === "neutral" && !securityStateIssueIds.includes("insecure-origin")) {
        summary = i18nString6(UIStrings6.thisPageHasANonhttpsSecureOrigin);
      }
      return { summary, explanations };
    }
    this.explainCertificateSecurity(visibleSecurityState, explanations);
    this.explainConnectionSecurity(visibleSecurityState, explanations);
    this.explainContentSecurity(visibleSecurityState, explanations);
    return { summary, explanations };
  }
  explainSafetyTipSecurity(visibleSecurityState, summary, explanations) {
    const { securityStateIssueIds, safetyTipInfo } = visibleSecurityState;
    const currentExplanations = [];
    if (securityStateIssueIds.includes("bad_reputation")) {
      const formatedDescription = `${i18nString6(UIStrings6.chromeHasDeterminedThatThisSiteS)}

${i18nString6(UIStrings6.ifYouBelieveThisIsShownIn)}`;
      currentExplanations.push({
        summary: i18nString6(UIStrings6.thisPageIsSuspicious),
        description: formatedDescription
      });
    } else if (securityStateIssueIds.includes("lookalike") && safetyTipInfo?.safeUrl) {
      const hostname = new URL(safetyTipInfo.safeUrl).hostname;
      const hostnamePlaceholder = { PH1: hostname };
      const formattedDescriptionSafety = `${i18nString6(UIStrings6.thisSitesHostnameLooksSimilarToP, hostnamePlaceholder)}

${i18nString6(UIStrings6.ifYouBelieveThisIsShownInErrorSafety)}`;
      currentExplanations.push({ summary: i18nString6(UIStrings6.possibleSpoofingUrl), description: formattedDescriptionSafety });
    }
    if (currentExplanations.length > 0) {
      summary = summary || i18nString6(UIStrings6.thisPageIsSuspiciousFlaggedBy);
      explanations.push(new SecurityStyleExplanation("insecure", void 0, currentExplanations[0].summary, currentExplanations[0].description));
    }
    return summary;
  }
  explainCertificateSecurity(visibleSecurityState, explanations) {
    const { certificateSecurityState, securityStateIssueIds } = visibleSecurityState;
    const title = i18nString6(UIStrings6.certificate);
    if (certificateSecurityState?.certificateHasSha1Signature) {
      const explanationSummary = i18nString6(UIStrings6.insecureSha);
      const description = i18nString6(UIStrings6.theCertificateChainForThisSite);
      if (certificateSecurityState.certificateHasWeakSignature) {
        explanations.push(new SecurityStyleExplanation(
          "insecure",
          title,
          explanationSummary,
          description,
          certificateSecurityState.certificate,
          "none"
          /* Protocol.Security.MixedContentType.None */
        ));
      } else {
        explanations.push(new SecurityStyleExplanation(
          "neutral",
          title,
          explanationSummary,
          description,
          certificateSecurityState.certificate,
          "none"
          /* Protocol.Security.MixedContentType.None */
        ));
      }
    }
    if (certificateSecurityState && securityStateIssueIds.includes("cert-missing-subject-alt-name")) {
      explanations.push(new SecurityStyleExplanation(
        "insecure",
        title,
        i18nString6(UIStrings6.subjectAlternativeNameMissing),
        i18nString6(UIStrings6.theCertificateForThisSiteDoesNot),
        certificateSecurityState.certificate,
        "none"
        /* Protocol.Security.MixedContentType.None */
      ));
    }
    if (certificateSecurityState && certificateSecurityState.certificateNetworkError !== null) {
      explanations.push(new SecurityStyleExplanation(
        "insecure",
        title,
        i18nString6(UIStrings6.missing),
        i18nString6(UIStrings6.thisSiteIsMissingAValidTrusted, { PH1: certificateSecurityState.certificateNetworkError }),
        certificateSecurityState.certificate,
        "none"
        /* Protocol.Security.MixedContentType.None */
      ));
    } else if (certificateSecurityState && !certificateSecurityState.certificateHasSha1Signature) {
      explanations.push(new SecurityStyleExplanation(
        "secure",
        title,
        i18nString6(UIStrings6.validAndTrusted),
        i18nString6(UIStrings6.theConnectionToThisSiteIsUsingA, { PH1: certificateSecurityState.issuer }),
        certificateSecurityState.certificate,
        "none"
        /* Protocol.Security.MixedContentType.None */
      ));
    }
    if (securityStateIssueIds.includes("pkp-bypassed")) {
      explanations.push(new SecurityStyleExplanation("info", title, i18nString6(UIStrings6.publickeypinningBypassed), i18nString6(UIStrings6.publickeypinningWasBypassedByA)));
    }
    if (certificateSecurityState?.isCertificateExpiringSoon()) {
      explanations.push(new SecurityStyleExplanation("info", void 0, i18nString6(UIStrings6.certificateExpiresSoon), i18nString6(UIStrings6.theCertificateForThisSiteExpires)));
    }
  }
  explainConnectionSecurity(visibleSecurityState, explanations) {
    const certificateSecurityState = visibleSecurityState.certificateSecurityState;
    if (!certificateSecurityState) {
      return;
    }
    const title = i18nString6(UIStrings6.connection);
    if (certificateSecurityState.modernSSL) {
      explanations.push(new SecurityStyleExplanation("secure", title, i18nString6(UIStrings6.secureConnectionSettings), i18nString6(UIStrings6.theConnectionToThisSiteIs, {
        PH1: certificateSecurityState.protocol,
        PH2: certificateSecurityState.getKeyExchangeName(),
        PH3: certificateSecurityState.getCipherFullName()
      })));
      return;
    }
    const recommendations = [];
    if (certificateSecurityState.obsoleteSslProtocol) {
      recommendations.push(i18nString6(UIStrings6.sIsObsoleteEnableTlsOrLater, { PH1: certificateSecurityState.protocol }));
    }
    if (certificateSecurityState.obsoleteSslKeyExchange) {
      recommendations.push(i18nString6(UIStrings6.rsaKeyExchangeIsObsoleteEnableAn));
    }
    if (certificateSecurityState.obsoleteSslCipher) {
      recommendations.push(i18nString6(UIStrings6.sIsObsoleteEnableAnAesgcmbased, { PH1: certificateSecurityState.cipher }));
    }
    if (certificateSecurityState.obsoleteSslSignature) {
      recommendations.push(i18nString6(UIStrings6.theServerSignatureUsesShaWhichIs));
    }
    explanations.push(new SecurityStyleExplanation("info", title, i18nString6(UIStrings6.obsoleteConnectionSettings), i18nString6(UIStrings6.theConnectionToThisSiteIs, {
      PH1: certificateSecurityState.protocol,
      PH2: certificateSecurityState.getKeyExchangeName(),
      PH3: certificateSecurityState.getCipherFullName()
    }), void 0, void 0, recommendations));
  }
  explainContentSecurity(visibleSecurityState, explanations) {
    let addSecureExplanation = true;
    const title = i18nString6(UIStrings6.resources);
    const securityStateIssueIds = visibleSecurityState.securityStateIssueIds;
    if (securityStateIssueIds.includes("ran-mixed-content")) {
      addSecureExplanation = false;
      explanations.push(new SecurityStyleExplanation(
        "insecure",
        title,
        i18nString6(UIStrings6.activeMixedContent),
        i18nString6(UIStrings6.youHaveRecentlyAllowedNonsecure),
        [],
        "blockable"
        /* Protocol.Security.MixedContentType.Blockable */
      ));
    }
    if (securityStateIssueIds.includes("displayed-mixed-content")) {
      addSecureExplanation = false;
      explanations.push(new SecurityStyleExplanation(
        "neutral",
        title,
        i18nString6(UIStrings6.mixedContent),
        i18nString6(UIStrings6.thisPageIncludesHttpResources),
        [],
        "optionally-blockable"
        /* Protocol.Security.MixedContentType.OptionallyBlockable */
      ));
    }
    if (securityStateIssueIds.includes("contained-mixed-form")) {
      addSecureExplanation = false;
      explanations.push(new SecurityStyleExplanation("neutral", title, i18nString6(UIStrings6.nonsecureForm), i18nString6(UIStrings6.thisPageIncludesAFormWithA)));
    }
    if (visibleSecurityState.certificateSecurityState?.certificateNetworkError === null) {
      if (securityStateIssueIds.includes("ran-content-with-cert-error")) {
        addSecureExplanation = false;
        explanations.push(new SecurityStyleExplanation("insecure", title, i18nString6(UIStrings6.activeContentWithCertificate), i18nString6(UIStrings6.youHaveRecentlyAllowedContent)));
      }
      if (securityStateIssueIds.includes("displayed-content-with-cert-errors")) {
        addSecureExplanation = false;
        explanations.push(new SecurityStyleExplanation("neutral", title, i18nString6(UIStrings6.contentWithCertificateErrors), i18nString6(UIStrings6.thisPageIncludesResourcesThat)));
      }
    }
    if (addSecureExplanation) {
      if (!securityStateIssueIds.includes("scheme-is-not-cryptographic")) {
        explanations.push(new SecurityStyleExplanation("secure", title, i18nString6(UIStrings6.allServedSecurely), i18nString6(UIStrings6.allResourcesOnThisPageAreServed)));
      }
    }
  }
  orderExplanations(explanations) {
    if (explanations.length === 0) {
      return explanations;
    }
    const securityStateOrder = [
      "insecure",
      "neutral",
      "secure",
      "info"
    ];
    const orderedExplanations = [];
    for (const securityState of securityStateOrder) {
      orderedExplanations.push(...explanations.filter((explanation) => explanation.securityState === securityState));
    }
    return orderedExplanations;
  }
  refreshExplanations() {
    this.securityExplanationsMain.removeChildren();
    this.securityExplanationsExtra.removeChildren();
    if (!this.explanations) {
      return;
    }
    for (const explanation of this.explanations) {
      if (explanation.securityState === "info") {
        this.addExplanation(this.securityExplanationsExtra, explanation);
      } else {
        switch (explanation.mixedContentType) {
          case "blockable":
            this.addMixedContentExplanation(
              this.securityExplanationsMain,
              explanation,
              "block-overridden"
              /* NetworkForward.UIFilter.MixedContentFilterValues.BLOCK_OVERRIDDEN */
            );
            break;
          case "optionally-blockable":
            this.addMixedContentExplanation(
              this.securityExplanationsMain,
              explanation,
              "displayed"
              /* NetworkForward.UIFilter.MixedContentFilterValues.DISPLAYED */
            );
            break;
          default:
            this.addExplanation(this.securityExplanationsMain, explanation);
            break;
        }
      }
    }
    if (this.panel.filterRequestCount(
      "blocked"
      /* NetworkForward.UIFilter.MixedContentFilterValues.BLOCKED */
    ) > 0) {
      const explanation = {
        securityState: "info",
        summary: i18nString6(UIStrings6.blockedMixedContent),
        description: i18nString6(UIStrings6.yourPageRequestedNonsecure),
        mixedContentType: "blockable",
        certificate: [],
        title: ""
      };
      this.addMixedContentExplanation(
        this.securityExplanationsMain,
        explanation,
        "blocked"
        /* NetworkForward.UIFilter.MixedContentFilterValues.BLOCKED */
      );
    }
  }
  addMixedContentExplanation(parent, explanation, filterKey) {
    const element = this.addExplanation(parent, explanation);
    const filterRequestCount = this.panel.filterRequestCount(filterKey);
    if (!filterRequestCount) {
      const refreshPrompt = element.createChild("div", "security-mixed-content");
      refreshPrompt.textContent = i18nString6(UIStrings6.reloadThePageToRecordRequestsFor);
      return;
    }
    const requestsAnchor = element.createChild("button", "security-mixed-content devtools-link text-button link-style");
    UI6.ARIAUtils.markAsLink(requestsAnchor);
    requestsAnchor.tabIndex = 0;
    requestsAnchor.textContent = i18nString6(UIStrings6.viewDRequestsInNetworkPanel, { n: filterRequestCount });
    requestsAnchor.addEventListener("click", this.showNetworkFilter.bind(this, filterKey));
  }
  showNetworkFilter(filterKey, e) {
    e.consume();
    void Common4.Revealer.reveal(NetworkForward2.UIFilter.UIRequestFilter.filters([{ filterType: NetworkForward2.UIFilter.FilterType.MixedContent, filterValue: filterKey }]));
  }
};
var SecurityOriginView = class extends UI6.Widget.VBox {
  originLockIcon;
  constructor(origin, originState) {
    super({ jslog: `${VisualLogging3.pane("security.origin-view")}` });
    this.registerRequiredCSS(originView_css_default, lockIcon_css_default);
    this.setMinimumSize(200, 100);
    this.element.classList.add("security-origin-view");
    const titleSection = this.element.createChild("div", "title-section");
    const titleDiv = titleSection.createChild("div", "title-section-header");
    titleDiv.textContent = i18nString6(UIStrings6.origin);
    UI6.ARIAUtils.markAsHeading(titleDiv, 1);
    const originDisplay = titleSection.createChild("div", "origin-display");
    this.originLockIcon = originDisplay.createChild("span");
    const icon = getSecurityStateIconForDetailedView(originState.securityState, `security-property security-property-${originState.securityState}`);
    this.originLockIcon.appendChild(icon);
    originDisplay.appendChild(createHighlightedUrl(origin, originState.securityState));
    const originNetworkDiv = titleSection.createChild("div", "view-network-button");
    const originNetworkButton = UI6.UIUtils.createTextButton(i18nString6(UIStrings6.viewRequestsInNetworkPanel), (event) => {
      event.consume();
      const parsedURL = new Common4.ParsedURL.ParsedURL(origin);
      void Common4.Revealer.reveal(NetworkForward2.UIFilter.UIRequestFilter.filters([
        { filterType: NetworkForward2.UIFilter.FilterType.Domain, filterValue: parsedURL.host },
        { filterType: NetworkForward2.UIFilter.FilterType.Scheme, filterValue: parsedURL.scheme }
      ]));
    }, { jslogContext: "reveal-in-network" });
    originNetworkDiv.appendChild(originNetworkButton);
    UI6.ARIAUtils.markAsLink(originNetworkButton);
    if (originState.securityDetails) {
      const connectionSection = this.element.createChild("div", "origin-view-section");
      const connectionDiv = connectionSection.createChild("div", "origin-view-section-title");
      connectionDiv.textContent = i18nString6(UIStrings6.connection);
      UI6.ARIAUtils.markAsHeading(connectionDiv, 2);
      let table = new SecurityDetailsTable();
      connectionSection.appendChild(table.element());
      table.addRow(i18nString6(UIStrings6.protocol), originState.securityDetails.protocol);
      if (originState.securityDetails.keyExchange && originState.securityDetails.keyExchangeGroup) {
        table.addRow(i18nString6(UIStrings6.keyExchange), originState.securityDetails.keyExchange + " with " + originState.securityDetails.keyExchangeGroup);
      } else if (originState.securityDetails.keyExchange) {
        table.addRow(i18nString6(UIStrings6.keyExchange), originState.securityDetails.keyExchange);
      } else if (originState.securityDetails.keyExchangeGroup) {
        table.addRow(i18nString6(UIStrings6.keyExchange), originState.securityDetails.keyExchangeGroup);
      }
      if (originState.securityDetails.serverSignatureAlgorithm) {
        let sigString = SignatureSchemeStrings.get(originState.securityDetails.serverSignatureAlgorithm);
        sigString ??= i18nString6(UIStrings6.unknownField) + " (" + originState.securityDetails.serverSignatureAlgorithm + ")";
        table.addRow(i18nString6(UIStrings6.serverSignature), sigString);
      }
      table.addRow(i18nString6(UIStrings6.cipher), originState.securityDetails.cipher + (originState.securityDetails.mac ? " with " + originState.securityDetails.mac : ""));
      if (originState.securityDetails.encryptedClientHello) {
        table.addRow(i18nString6(UIStrings6.encryptedClientHello), i18nString6(UIStrings6.enabled));
      }
      const certificateSection = this.element.createChild("div", "origin-view-section");
      const certificateDiv = certificateSection.createChild("div", "origin-view-section-title");
      certificateDiv.textContent = i18nString6(UIStrings6.certificate);
      UI6.ARIAUtils.markAsHeading(certificateDiv, 2);
      const sctListLength = originState.securityDetails.signedCertificateTimestampList.length;
      const ctCompliance = originState.securityDetails.certificateTransparencyCompliance;
      let sctSection;
      if (sctListLength || ctCompliance !== "unknown") {
        sctSection = this.element.createChild("div", "origin-view-section");
        const sctDiv = sctSection.createChild("div", "origin-view-section-title");
        sctDiv.textContent = i18nString6(UIStrings6.certificateTransparency);
        UI6.ARIAUtils.markAsHeading(sctDiv, 2);
      }
      const sanDiv = this.createSanDiv(originState.securityDetails.sanList);
      const validFromString = new Date(1e3 * originState.securityDetails.validFrom).toUTCString();
      const validUntilString = new Date(1e3 * originState.securityDetails.validTo).toUTCString();
      table = new SecurityDetailsTable();
      certificateSection.appendChild(table.element());
      table.addRow(i18nString6(UIStrings6.subject), originState.securityDetails.subjectName);
      table.addRow(i18n11.i18n.lockedString("SAN"), sanDiv);
      table.addRow(i18nString6(UIStrings6.validFrom), validFromString);
      table.addRow(i18nString6(UIStrings6.validUntil), validUntilString);
      table.addRow(i18nString6(UIStrings6.issuer), originState.securityDetails.issuer);
      table.addRow("", SecurityPanel.createCertificateViewerButtonForOrigin(i18nString6(UIStrings6.openFullCertificateDetails), origin));
      if (!sctSection) {
        return;
      }
      const sctSummaryTable = new SecurityDetailsTable();
      sctSummaryTable.element().classList.add("sct-summary");
      sctSection.appendChild(sctSummaryTable.element());
      for (let i = 0; i < sctListLength; i++) {
        const sct = originState.securityDetails.signedCertificateTimestampList[i];
        sctSummaryTable.addRow(i18nString6(UIStrings6.sct), sct.logDescription + " (" + sct.origin + ", " + sct.status + ")");
      }
      const sctTableWrapper = sctSection.createChild("div", "sct-details");
      sctTableWrapper.classList.add("hidden");
      for (let i = 0; i < sctListLength; i++) {
        const sctTable = new SecurityDetailsTable();
        sctTableWrapper.appendChild(sctTable.element());
        const sct = originState.securityDetails.signedCertificateTimestampList[i];
        sctTable.addRow(i18nString6(UIStrings6.logName), sct.logDescription);
        sctTable.addRow(i18nString6(UIStrings6.logId), sct.logId.replace(/(.{2})/g, "$1 "));
        sctTable.addRow(i18nString6(UIStrings6.validationStatus), sct.status);
        sctTable.addRow(i18nString6(UIStrings6.source), sct.origin);
        sctTable.addRow(i18nString6(UIStrings6.issuedAt), new Date(sct.timestamp).toUTCString());
        sctTable.addRow(i18nString6(UIStrings6.hashAlgorithm), sct.hashAlgorithm);
        sctTable.addRow(i18nString6(UIStrings6.signatureAlgorithm), sct.signatureAlgorithm);
        sctTable.addRow(i18nString6(UIStrings6.signatureData), sct.signatureData.replace(/(.{2})/g, "$1 "));
      }
      if (sctListLength) {
        let toggleSctDetailsDisplay = function() {
          let buttonText;
          const isDetailsShown = !sctTableWrapper.classList.contains("hidden");
          if (isDetailsShown) {
            buttonText = i18nString6(UIStrings6.showFullDetails);
          } else {
            buttonText = i18nString6(UIStrings6.hideFullDetails);
          }
          toggleSctsDetailsLink.textContent = buttonText;
          UI6.ARIAUtils.setLabel(toggleSctsDetailsLink, buttonText);
          UI6.ARIAUtils.setExpanded(toggleSctsDetailsLink, !isDetailsShown);
          sctSummaryTable.element().classList.toggle("hidden");
          sctTableWrapper.classList.toggle("hidden");
        };
        const toggleSctsDetailsLink = UI6.UIUtils.createTextButton(i18nString6(UIStrings6.showFullDetails), toggleSctDetailsDisplay, { className: "details-toggle", jslogContext: "security.toggle-scts-details" });
        sctSection.appendChild(toggleSctsDetailsLink);
      }
      switch (ctCompliance) {
        case "compliant":
          sctSection.createChild("div", "origin-view-section-notes").textContent = i18nString6(UIStrings6.thisRequestCompliesWithChromes);
          break;
        case "not-compliant":
          sctSection.createChild("div", "origin-view-section-notes").textContent = i18nString6(UIStrings6.thisRequestDoesNotComplyWith);
          break;
        case "unknown":
          break;
      }
      const noteSection = this.element.createChild("div", "origin-view-section origin-view-notes");
      if (originState.loadedFromCache) {
        noteSection.createChild("div").textContent = i18nString6(UIStrings6.thisResponseWasLoadedFromCache);
      }
      noteSection.createChild("div").textContent = i18nString6(UIStrings6.theSecurityDetailsAboveAreFrom);
    } else if (originState.securityState === "secure") {
      const secureSection = this.element.createChild("div", "origin-view-section");
      const secureDiv = secureSection.createChild("div", "origin-view-section-title");
      secureDiv.textContent = i18nString6(UIStrings6.secure);
      UI6.ARIAUtils.markAsHeading(secureDiv, 2);
      secureSection.createChild("div").textContent = i18nString6(UIStrings6.thisOriginIsANonhttpsSecure);
    } else if (originState.securityState !== "unknown") {
      const notSecureSection = this.element.createChild("div", "origin-view-section");
      const notSecureDiv = notSecureSection.createChild("div", "origin-view-section-title");
      notSecureDiv.textContent = i18nString6(UIStrings6.notSecure);
      UI6.ARIAUtils.markAsHeading(notSecureDiv, 2);
      notSecureSection.createChild("div").textContent = i18nString6(UIStrings6.yourConnectionToThisOriginIsNot);
    } else {
      const noInfoSection = this.element.createChild("div", "origin-view-section");
      const noInfoDiv = noInfoSection.createChild("div", "origin-view-section-title");
      noInfoDiv.textContent = i18nString6(UIStrings6.noSecurityInformation);
      UI6.ARIAUtils.markAsHeading(noInfoDiv, 2);
      noInfoSection.createChild("div").textContent = i18nString6(UIStrings6.noSecurityDetailsAreAvailableFor);
    }
  }
  createSanDiv(sanList) {
    const sanDiv = document.createElement("div");
    if (sanList.length === 0) {
      sanDiv.textContent = i18nString6(UIStrings6.na);
      sanDiv.classList.add("empty-san");
    } else {
      const truncatedNumToShow = 2;
      const listIsTruncated = sanList.length > truncatedNumToShow + 1;
      for (let i = 0; i < sanList.length; i++) {
        const span = sanDiv.createChild("span", "san-entry");
        span.textContent = sanList[i];
        if (listIsTruncated && i >= truncatedNumToShow) {
          span.classList.add("truncated-entry");
        }
      }
      if (listIsTruncated) {
        let toggleSANTruncation = function() {
          const isTruncated = sanDiv.classList.contains("truncated-san");
          let buttonText;
          if (isTruncated) {
            sanDiv.classList.remove("truncated-san");
            buttonText = i18nString6(UIStrings6.showLess);
          } else {
            sanDiv.classList.add("truncated-san");
            buttonText = i18nString6(UIStrings6.showMoreSTotal, { PH1: sanList.length });
          }
          truncatedSANToggle.textContent = buttonText;
          UI6.ARIAUtils.setLabel(truncatedSANToggle, buttonText);
          UI6.ARIAUtils.setExpanded(truncatedSANToggle, isTruncated);
        };
        const truncatedSANToggle = UI6.UIUtils.createTextButton(i18nString6(UIStrings6.showMoreSTotal, { PH1: sanList.length }), toggleSANTruncation, { jslogContext: "security.toggle-san-truncation" });
        sanDiv.appendChild(truncatedSANToggle);
        toggleSANTruncation();
      }
    }
    return sanDiv;
  }
  setSecurityState(newSecurityState) {
    this.originLockIcon.removeChildren();
    const icon = getSecurityStateIconForDetailedView(newSecurityState, `security-property security-property-${newSecurityState}`);
    this.originLockIcon.appendChild(icon);
  }
};
var SecurityDetailsTable = class {
  #element;
  constructor() {
    this.#element = document.createElement("table");
    this.#element.classList.add("details-table");
  }
  element() {
    return this.#element;
  }
  addRow(key, value) {
    const row = this.#element.createChild("tr", "details-table-row");
    row.createChild("td").textContent = key;
    const valueCell = row.createChild("td");
    if (typeof value === "string") {
      valueCell.textContent = value;
    } else {
      valueCell.appendChild(value);
    }
  }
};
var SecurityRevealer = class {
  async reveal() {
    await UI6.ViewManager.ViewManager.instance().showView("security");
    const view = UI6.ViewManager.ViewManager.instance().view("security");
    if (view) {
      const securityPanel = await view.widget();
      if (securityPanel instanceof SecurityPanel && securityPanel.sidebar.cookieReportTreeElement) {
        securityPanel.sidebar.cookieReportTreeElement.select(
          /* omitFocus=*/
          false,
          /* selectedByUser=*/
          true
        );
      } else {
        throw new Error("Expected securityPanel to be an instance of SecurityPanel with a cookieReportTreeElement in the sidebar");
      }
    }
  }
};
export {
  CookieControlsView_exports as CookieControlsView,
  CookieReportView_exports as CookieReportView,
  IPProtectionView_exports as IPProtectionView,
  SecurityModel_exports as SecurityModel,
  SecurityPanel_exports as SecurityPanel
};
//# sourceMappingURL=security.js.map
