// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/components/switch/switch.js';
import '../../ui/components/cards/cards.js';
import '../../ui/components/chrome_link/chrome_link.js';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as ChromeLink from '../../ui/components/chrome_link/chrome_link.js';
import * as Input from '../../ui/components/input/input.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import cookieControlsViewStyles from './cookieControlsView.css.js';

const {render, html} = Lit;

const UIStrings = {
  /**
   *@description Title in the view's header for the controls tool in the Privacy & Security panel
   */
  viewTitle: 'Controls',
  /**
   *@description Explanation in the view's header about the purpose of this controls tool
   */
  viewExplanation: 'Test how this site will perform if third-party cookies are limited in Chrome',
  /**
   *@description Title in the card within the controls tool
   */
  cardTitle: 'Temporarily limit third-party cookies',
  /**
   *@description Disclaimer beneath the card title to tell the user that the controls will only persist while devtools is open
   */
  cardDisclaimer: 'Only when DevTools is open',
  /**
   *@description Message as part of the banner that prompts the user to reload the page to see the changes take effect. This appears when the user makes any change within the tool
   */
  siteReloadMessage: 'To apply your updated controls, reload the page',
  /**
   *@description Title of controls section. These are exceptions that the user will be able to override to test their site
   */
  exceptions: 'Exceptions',
  /**
   *@description Explanation of what exceptions are in this context
   */
  exceptionsExplanation: 'Scenarios that grant access to third-party cookies',
  /**
   *@description Title for the grace period exception control
   */
  gracePeriodTitle: 'Third-party cookie grace period',
  /**
   *@description Explanation of the grace period and a link to learn more
   *@example {grace period} PH1
   */
  gracePeriodExplanation:
      'If this site or a site embedded on it is enrolled in the {PH1}, then the site can access third-party cookies',
  /**
   *@description Text shown when a site and its embedded resources are not enrolled in a grace period.
   *@example {grace period} PH1
   */
  enrollGracePeriod: 'To use this, enroll this site or sites embedded on it in the {PH1}',
  /**
   *@description Text used for link within gracePeriodExplanation and enrollGracePeriod to let the user learn more about the grace period
   */
  gracePeriod: 'grace period',
  /**
   *@description Title for the heuristic exception control
   */
  heuristicTitle: 'Heuristics based exception',
  /**
   *@description Explanation of the heuristics with a link to learn more about the scenarios in which they apply
   *@example {predefined scenarios} PH1
   */
  heuristicExplanation:
      'In {PH1} like pop-ups or redirects, a site embedded on this site can access third-party cookies',
  /**
   *@description Text used for link within the heuristicExplanation to let the user learn more about the heuristic exception
   */
  scenarios: 'predefined scenarios',
  /**
   *@description Note at the bottom of the controls tool telling the user that their organization has an enterprise policy that controls cookies. This may disable the tool
   */
  enterpriseDisclaimer: 'Your organization manages third-party cookie access for this site',
  /**
   *@description Tooltip that appears when the user hovers over the card's enterprise icon
   */
  enterpriseTooltip: 'This setting is managed by your organization',
  /**
    +*@description Button with the enterpise disclaimer that takes the user to the relevant enterprise cookie chrome setting
   */
  viewDetails: 'View details',
  /**
   *@description Text shown when the Third-party Cookie Metadata Grants flag or Third-party Cookie Heuristics Grants flag is disabled with a link to the flag in chrome://flags/.
   *@example {#tpcd-heuristics-grants} PH1
   */
  enableFlag: 'To use this, set {PH1} to Default',
  /**
   *@description Text used for link within the enableFlag to show users where they can enable the Third-party Cookie Metadata Grants flag.
   */
  tpcdMetadataGrants: '#tpcd-metadata-grants',
  /**
   *@description Text used for link within the enableFlag to show users where they can enable the Third-party Cookie Heuristics Grants flag.
   */
  tpcdHeuristicsGrants: '#tpcd-heuristics-grants',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/security/CookieControlsView.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export const i18nFormatString = i18n.i18n.getFormatLocalizedString.bind(undefined, str_);

export interface ViewInput {
  inputChanged: (newValue: boolean, setting: Common.Settings.Setting<boolean>) => void;
  openChromeCookieSettings: () => void;
}
export interface ViewOutput {}

export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;

export function showInfobar(): void {
  UI.InspectorView.InspectorView.instance().displayDebuggedTabReloadRequiredWarning(
      i18nString(UIStrings.siteReloadMessage));
}

export class CookieControlsView extends UI.Widget.VBox {
  #view: View;
  #isGracePeriodActive: boolean;
  #thirdPartyControlsDict: Root.Runtime.HostConfig['thirdPartyCookieControls'];

  constructor(element?: HTMLElement, view: View = (input, output, target) => {
    // createSetting() allows us to initialize the settings with the UI binding values the first
    // time that the browser starts, and use the existing setting value for all subsequent uses.
    const enterpriseEnabledSetting = Common.Settings.Settings.instance().createSetting(
        'enterprise-enabled',
        this.#thirdPartyControlsDict && this.#thirdPartyControlsDict.managedBlockThirdPartyCookies &&
                typeof this.#thirdPartyControlsDict.managedBlockThirdPartyCookies === 'boolean' ?
            this.#thirdPartyControlsDict.managedBlockThirdPartyCookies :
            false,
        Common.Settings.SettingStorageType.GLOBAL);
    const toggleEnabledSetting = Common.Settings.Settings.instance().createSetting(
        'cookie-control-override-enabled',
        this.#thirdPartyControlsDict && this.#thirdPartyControlsDict.thirdPartyCookieRestrictionEnabled ?
            this.#thirdPartyControlsDict.thirdPartyCookieRestrictionEnabled :
            false,
        Common.Settings.SettingStorageType.GLOBAL);
    const gracePeriodDisabledSetting = Common.Settings.Settings.instance().createSetting(
        'grace-period-mitigation-disabled',
        this.#thirdPartyControlsDict && this.#thirdPartyControlsDict.thirdPartyCookieMetadataEnabled ?
            this.#thirdPartyControlsDict.thirdPartyCookieMetadataEnabled :
            true,
        Common.Settings.SettingStorageType.GLOBAL);
    const heuristicsDisabledSetting = Common.Settings.Settings.instance().createSetting(
        'heuristic-mitigation-disabled',
        this.#thirdPartyControlsDict && this.#thirdPartyControlsDict.thirdPartyCookieHeuristicsEnabled ?
            this.#thirdPartyControlsDict.thirdPartyCookieHeuristicsEnabled :
            true,
        Common.Settings.SettingStorageType.GLOBAL);

    // clang-format off
    const cardHeader = html `
      <div class="card-header">
        <div class="lhs">
          <div class="text">
            <h2 class="main-text">${i18nString(UIStrings.cardTitle)}</h2>
            <div class="body subtext">${i18nString(UIStrings.cardDisclaimer)}</div>
          </div>
          ${Boolean(enterpriseEnabledSetting.get()) ? html `
            <devtools-icon
              tabindex="0"
              .name=${'domain'}
              ${Lit.Directives.ref((el: Element|undefined) => {
                UI.Tooltip.Tooltip.install(el as HTMLElement, i18nString(UIStrings.enterpriseTooltip));
                (el as HTMLElement).role = 'img';
              })}>
            </devtools-icon>` : Lit.nothing
          }
        </div>
        <div>
          <devtools-switch
            .checked=${Boolean(toggleEnabledSetting.get())}
            .disabled=${Boolean(enterpriseEnabledSetting.get())}
            @switchchange=${()=>{input.inputChanged(!toggleEnabledSetting.get(), toggleEnabledSetting);}}
            aria-label="Temporarily limit third-party cookies, only when DevTools is open"
            jslog=${VisualLogging.toggle(toggleEnabledSetting.name).track({click: true})}
          >
          </devtools-switch>
        </div>
      </div>
    `;

    const gracePeriodControlDisabled =
        (this.#thirdPartyControlsDict ? (!this.#thirdPartyControlsDict.thirdPartyCookieMetadataEnabled) : false) ||
        enterpriseEnabledSetting.get() || !toggleEnabledSetting.get() || !this.#isGracePeriodActive;
    const gracePeriodControl = html`
      <div class="card-row">
        <label class='checkbox-label'>
          <input type='checkbox'
            .disabled=${gracePeriodControlDisabled}
            .checked=${!gracePeriodControlDisabled && !Boolean(gracePeriodDisabledSetting.get())}
            @change=${()=>{input.inputChanged(!gracePeriodDisabledSetting.get(), gracePeriodDisabledSetting);}}
            jslog=${VisualLogging.toggle(gracePeriodDisabledSetting.name).track({click: true})}
          >
          <div class="text">
            <div class="body main-text">${i18nString(UIStrings.gracePeriodTitle)}</div>
            <div class="body subtext">
              ${Boolean(enterpriseEnabledSetting.get()) ?
                  i18nFormatString(UIStrings.gracePeriodExplanation, {
                    PH1: i18nString(UIStrings.gracePeriod),
                  }) :
                (this.#thirdPartyControlsDict ? !this.#thirdPartyControlsDict?.thirdPartyCookieMetadataEnabled: false) ?
                  i18nFormatString(UIStrings.enableFlag, {
                    PH1: this.getChromeFlagsLink(UIStrings.tpcdMetadataGrants),
                  }) :
                i18nFormatString(this.#isGracePeriodActive ? UIStrings.gracePeriodExplanation : UIStrings.enrollGracePeriod, {
                  PH1: UI.Fragment.html`<x-link class="devtools-link" href="https://developers.google.com/privacy-sandbox/cookies/temporary-exceptions/grace-period" jslog=${VisualLogging.link('grace-period-link').track({click: true})}>${i18nString(UIStrings.gracePeriod)}</x-link>`,
                })
              }
            </div>
          </div>
        </label>
      </div>
    `;

    const heuristicsControlDisabled =
        (this.#thirdPartyControlsDict ? (!this.#thirdPartyControlsDict.thirdPartyCookieHeuristicsEnabled) : false) ||
        enterpriseEnabledSetting.get() || !toggleEnabledSetting.get();
    const heuristicControl = html`
      <div class="card-row">
        <label class='checkbox-label'>
          <input type='checkbox'
            .disabled=${heuristicsControlDisabled}
            .checked=${!heuristicsControlDisabled && !Boolean(heuristicsDisabledSetting.get())}
            @change=${()=>{input.inputChanged(!heuristicsDisabledSetting.get(), heuristicsDisabledSetting);}}
            jslog=${VisualLogging.toggle(heuristicsDisabledSetting.name).track({click: true})}
          >
          <div class='text'>
            <div class="body main-text">${i18nString(UIStrings.heuristicTitle)}</div>
            <div class="body subtext">
              ${Boolean(enterpriseEnabledSetting.get()) ?
                i18nFormatString(UIStrings.heuristicExplanation, {
                  PH1: i18nString(UIStrings.scenarios),
                }) :
                (this.#thirdPartyControlsDict ? !this.#thirdPartyControlsDict.thirdPartyCookieHeuristicsEnabled: false) ?
                  i18nFormatString(UIStrings.enableFlag, {
                    PH1: this.getChromeFlagsLink(UIStrings.tpcdHeuristicsGrants),
                  }) :
                i18nFormatString(UIStrings.heuristicExplanation, {
                  PH1: UI.Fragment.html`<x-link class="devtools-link" href="https://developers.google.com/privacy-sandbox/cookies/temporary-exceptions/heuristics-based-exceptions" jslog=${VisualLogging.link('heuristic-link').track({click: true})}>${i18nString(UIStrings.scenarios)}</x-link>`,
                })
              }
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
            .name=${'domain'}
            ></devtools-icon>
            <devtools-button
            @click=${input.openChromeCookieSettings}
            aria-label="View details of third-party cookie access in Settings"
            .variant=${Buttons.Button.Variant.OUTLINED}
            jslog=${VisualLogging.action('view-details').track({click: true})}>
            ${i18nString(UIStrings.viewDetails)}
          </devtools-button>
        </div>
      </div>
    `;

    render(html `
      <div class="overflow-auto">
        <div class="controls">
          <div class="header">
            <h1>${i18nString(UIStrings.viewTitle)}</h1>
            <div class="body">${i18nString(UIStrings.viewExplanation)}</div>
          </div>
          <devtools-card class="card-container">
            <div class=${Boolean(enterpriseEnabledSetting.get()) ? 'card enterprise-disabled' : 'card'}>
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
          ${Boolean(enterpriseEnabledSetting.get()) ? enterpriseDisclaimer : Lit.nothing}
        </div>
      </div>
    `, target, {host: this});
    // clang-format on
  }) {
    super(true, undefined, element);
    this.#view = view;
    this.#isGracePeriodActive = false;
    this.#thirdPartyControlsDict = Root.Runtime.hostConfig.thirdPartyCookieControls;
    this.registerRequiredCSS(Input.checkboxStylesRaw, cookieControlsViewStyles);

    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.PrimaryPageChanged,
        this.#onPrimaryPageChanged, this);

    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.ResourceAdded,
        this.checkGracePeriodActive, this);

    this.checkGracePeriodActive().catch(error => {
      console.error(error);
    });
    this.requestUpdate();
  }

  override performUpdate(): void {
    this.#view(this, this, this.contentElement);
  }

  inputChanged(newValue: boolean, setting: Common.Settings.Setting<boolean>): void {
    setting.set(newValue);
    showInfobar();
    this.requestUpdate();
  }

  openChromeCookieSettings(): void {
    const rootTarget = SDK.TargetManager.TargetManager.instance().rootTarget();
    if (rootTarget === null) {
      return;
    }
    const url = 'chrome://settings/cookies' as Platform.DevToolsPath.UrlString;
    void rootTarget.targetAgent().invoke_createTarget({url}).then(result => {
      if (result.getError()) {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(url);
      }
    });
  }

  #onPrimaryPageChanged(): void {
    this.#isGracePeriodActive = false;
    this.checkGracePeriodActive().catch(error => {
      console.error(error);
    });

    UI.InspectorView.InspectorView.instance().removeDebuggedTabReloadRequiredWarning();
  }

  async checkGracePeriodActive(event?: Common.EventTarget.EventTargetEvent<SDK.Resource.Resource>): Promise<void> {
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

    const urls: string[] = [];
    if (!event) {
      for (const resourceTreeModel of SDK.TargetManager.TargetManager.instance().models(
               SDK.ResourceTreeModel.ResourceTreeModel)) {
        resourceTreeModel.forAllResources(r => {
          urls.push(r.url);
          return true;
        });
      }
    } else {
      urls.push(event.data.url);
    }

    const result = await mainTarget.storageAgent().invoke_getAffectedUrlsForThirdPartyCookieMetadata(
        {firstPartyUrl: mainTarget.inspectedURL(), thirdPartyUrls: urls});
    if (result.matchedUrls && result.matchedUrls.length > 0) {
      this.#isGracePeriodActive = true;
      this.requestUpdate();
    }
  }

  getChromeFlagsLink(flag: string): Element {
    const link = new ChromeLink.ChromeLink.ChromeLink();
    link.textContent = flag;
    link.href = ('chrome://flags/' + flag) as Platform.DevToolsPath.UrlString;
    link.setAttribute('tabindex', '0');

    return link;
  }
}
