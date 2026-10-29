// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/legacy/components/data_grid/data_grid.js';

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, render, type TemplateResult} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import privateVerificationTokensViewStyles from './privateVerificationTokensView.css.js';

const {repeat} = Directives;

const UIStrings = {
  /**
   * @description Text for the issuer of an item.
   */
  issuer: 'Issuer',
  /**
   * @description Column header indicating whether the current origin is the issuer of the token.
   */
  isIssuer: 'Is issuer',
  /**
   * @description Column header indicating whether the current origin is authorized to redeem the token.
   */
  isRedeemer: 'Is redeemer',
  /**
   * @description Empty state message when no private verification tokens match the current origin.
   */
  noPrivateVerificationTokens: 'No private verification tokens for this origin',
  /**
   * @description Column header for Token ID.
   */
  tokenId: 'Token ID',
  /**
   * @description Column header for Public Key ID.
   */
  keyId: 'Key ID',
  /**
   * @description Column header for token expiration date.
   */
  expiration: 'Expiration',
  /**
   * @description Column header for token creation time.
   */
  creationTime: 'Created',
  /**
   * @description Column header for token protocol version.
   */
  version: 'Version',
  /**
   * @description Column header for base64 encoded token payload.
   */
  tokenPayload: 'Token (Base64)',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/application/PrivateVerificationTokensView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

/**
 * Presentation model for a single token row. All values are pre-formatted by
 * the presenter so that the view is a pure projection of its input.
 */
export interface TokenRow {
  id: string;
  issuerOrigin: Platform.DevToolsPath.UrlString;
  isIssuer: boolean;
  isRedeemer: boolean;
  keyId: number;
  expiration: string;
  creationTime: string;
  version: number;
  token: string;
}

export interface ViewInput {
  tokens: TokenRow[];
}

function renderView(input: ViewInput): TemplateResult {
  const hasTokens = input.tokens.length > 0;
  // clang-format off
  return html`
    <div class="pvt-view" jslog=${VisualLogging.pane('private-verification-tokens')}>
      <div class="table-container">
        ${hasTokens ? html`
          <devtools-data-grid striped inline>
            <table>
              <tr>
                <th id="issuer" weight="6" sortable>${i18nString(UIStrings.issuer)}</th>
                <th id="is-issuer" type="boolean" align="center" weight="3" sortable>${i18nString(UIStrings.isIssuer)}</th>
                <th id="is-redeemer" type="boolean" align="center" weight="3" sortable>${i18nString(UIStrings.isRedeemer)}</th>
                <th id="id" weight="3" sortable>${i18nString(UIStrings.tokenId)}</th>
                <th id="key-id" weight="2" sortable>${i18nString(UIStrings.keyId)}</th>
                <th id="expiration" weight="5" sortable>${i18nString(UIStrings.expiration)}</th>
                <th id="creation-time" weight="5" sortable>${i18nString(UIStrings.creationTime)}</th>
                <th id="version" weight="2" sortable>${i18nString(UIStrings.version)}</th>
                <th id="token" weight="2">${i18nString(UIStrings.tokenPayload)}</th>
              </tr>
              ${repeat(input.tokens, token => token.id, token => html`
                <tr>
                  <td>${token.issuerOrigin}</td>
                  <td>${token.isIssuer}</td>
                  <td>${token.isRedeemer}</td>
                  <td>${token.id}</td>
                  <td>${token.keyId}</td>
                  <td>${token.expiration}</td>
                  <td>${token.creationTime}</td>
                  <td>${token.version}</td>
                  <td class="monospace" title=${token.token}>${token.token}</td>
                </tr>
              `)}
            </table>
          </devtools-data-grid>
        ` : html`
          ${UI.Widget.widget(UI.EmptyWidget.EmptyWidget, {header: i18nString(UIStrings.noPrivateVerificationTokens)})}
        `}
      </div>
    </div>
  `;
  // clang-format on
}

type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  // clang-format off
  render(html`
    <style>${privateVerificationTokensViewStyles}</style>
    <style>${UI.inspectorCommonStyles}</style>
    ${renderView(input)}
  `, target);
  // clang-format on
};

export class PrivateVerificationTokensView extends UI.Widget.VBox implements
    SDK.TargetManager.SDKModelObserver<SDK.PrivateVerificationTokensModel.PrivateVerificationTokensModel> {
  #model: SDK.PrivateVerificationTokensModel.PrivateVerificationTokensModel|null = null;
  #view: View;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element, {useShadowDom: true});
    this.#view = view;
  }

  override wasShown(): void {
    super.wasShown();
    const targetManager = SDK.TargetManager.TargetManager.instance();
    targetManager.observeModels(SDK.PrivateVerificationTokensModel.PrivateVerificationTokensModel, this,
                                {scoped: true});
    targetManager.addEventListener(SDK.TargetManager.Events.INSPECTED_URL_CHANGED, this.requestUpdate, this);
    targetManager.addModelListener(SDK.SecurityOriginManager.SecurityOriginManager,
                                   SDK.SecurityOriginManager.Events.MainSecurityOriginChanged, this.requestUpdate, this,
                                   {scoped: true});
    this.requestUpdate();
  }

  override willHide(): void {
    super.willHide();
    const targetManager = SDK.TargetManager.TargetManager.instance();
    targetManager.unobserveModels(SDK.PrivateVerificationTokensModel.PrivateVerificationTokensModel, this);
    targetManager.removeEventListener(SDK.TargetManager.Events.INSPECTED_URL_CHANGED, this.requestUpdate, this);
    targetManager.removeModelListener(SDK.SecurityOriginManager.SecurityOriginManager,
                                      SDK.SecurityOriginManager.Events.MainSecurityOriginChanged, this.requestUpdate,
                                      this);
    if (this.#model) {
      this.modelRemoved(this.#model);
    }
  }

  modelAdded(model: SDK.PrivateVerificationTokensModel.PrivateVerificationTokensModel): void {
    if (model.target() !== SDK.TargetManager.TargetManager.instance().primaryPageTarget() || model === this.#model) {
      return;
    }
    if (this.#model) {
      this.modelRemoved(this.#model);
    }
    this.#model = model;
    model.setTracking(true);
    model.addEventListener(SDK.PrivateVerificationTokensModel.Events.TOKENS_UPDATED, this.requestUpdate, this);
    this.requestUpdate();
  }

  modelRemoved(model: SDK.PrivateVerificationTokensModel.PrivateVerificationTokensModel): void {
    if (model !== this.#model) {
      return;
    }
    model.setTracking(false);
    model.removeEventListener(SDK.PrivateVerificationTokensModel.Events.TOKENS_UPDATED, this.requestUpdate, this);
    this.#model = null;
  }

  override async performUpdate(signal?: AbortSignal): Promise<void> {
    const model = this.#model;
    let tokens: TokenRow[] = [];
    if (model) {
      const currentOrigin = getInspectedOrigin(model.target());
      if (currentOrigin) {
        const [rawTokens, configs] = await Promise.all([model.getTokens(), model.getIssuerConfigs()]);
        // The widget may have been hidden, the model swapped, or a newer update
        // requested while the CDP calls were in flight.
        if (signal?.aborted || this.#model !== model) {
          return;
        }
        tokens = toTokenRows(rawTokens, configs, currentOrigin);
      }
    }

    if (signal?.aborted) {
      return;
    }
    this.#view({tokens}, undefined, this.contentElement);
  }
}

function toTokenRows(rawTokens: Protocol.Storage.PrivateVerificationToken[],
                     configs: Protocol.Storage.PrivateVerificationTokensIssuerConfig[],
                     currentOrigin: Platform.DevToolsPath.UrlString): TokenRow[] {
  const redeemersByIssuer =
      new Map(configs.map(config => [extractOrigin(config.issuerOrigin), config.redeemerOrigins.map(extractOrigin)]));
  return rawTokens
      .map(token => {
        const issuerOrigin = extractOrigin(token.issuerOrigin);
        return {
          id: token.id,
          issuerOrigin,
          isIssuer: issuerOrigin === currentOrigin,
          isRedeemer: Boolean(redeemersByIssuer.get(issuerOrigin)?.includes(currentOrigin)),
          keyId: token.keyId,
          expiration: formatEpochTime(token.expiration),
          creationTime: formatEpochTime(token.creationTime),
          version: token.version,
          token: token.token,
        };
      })
      .filter(token => token.isIssuer || token.isRedeemer)
      .sort((a, b) => a.issuerOrigin.localeCompare(b.issuerOrigin) ||
                Platform.StringUtilities.naturalOrderComparator(a.id, b.id));
}

function getInspectedOrigin(target: SDK.Target.Target): Platform.DevToolsPath.UrlString {
  const securityOriginManager = target.model(SDK.SecurityOriginManager.SecurityOriginManager);
  return extractOrigin(securityOriginManager?.mainSecurityOrigin() || target.inspectedURL());
}

function extractOrigin(url: string): Platform.DevToolsPath.UrlString {
  return Common.ParsedURL.ParsedURL.extractOrigin(url as Platform.DevToolsPath.UrlString);
}

function formatEpochTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '—';
  }
  const date = new Date(seconds * 1000);
  return Number.isNaN(date.getTime()) ? '—' : date.toISOString();
}
