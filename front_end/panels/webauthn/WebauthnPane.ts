// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/legacy/legacy.js';
import '../../ui/legacy/components/data_grid/data_grid.js';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as Input from '../../ui/components/input/input.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import webauthnPaneStyles from './webauthnPane.css.js';

const {render, html, Directives: {ref, repeat, classMap}} = Lit;
const {widgetConfig} = UI.Widget;

const UIStrings = {
  /**
   * @description Label for button that allows user to download the private key related to a credential.
   */
  export: 'Export',
  /**
   * @description Label for an item to remove something
   */
  remove: 'Remove',
  /**
   * @description Label for empty credentials table.
   * @example {navigator.credentials.create()} PH1
   */
  noCredentialsTryCallingSFromYour: 'No credentials. Try calling {PH1} from your website.',
  /**
   * @description Label for checkbox to toggle the virtual authenticator environment allowing user to interact with software-based virtual authenticators.
   */
  enableVirtualAuthenticator: 'Enable virtual authenticator environment',
  /**
   * @description Label for ID field for credentials.
   */
  id: 'ID',
  /**
   * @description Label for field that describes whether a credential is a resident credential.
   */
  isResident: 'Is Resident',
  /**
   * @description Label for credential field that represents the Relying Party ID that the credential is scoped to.
   */
  rpId: 'RP ID',
  /**
   * @description Label for a column in a table. A field/unique ID that represents the user a credential is mapped to.
   */
  userHandle: 'User Handle',
  /**
   * @description Label for signature counter field for credentials which represents the number of successful assertions.
   * See https://w3c.github.io/webauthn/#signature-counter.
   */
  signCount: 'Signature Count',
  /**
   * @description Label for column with actions for credentials.
   */
  actions: 'Actions',
  /**
   * @description Title for the table that holds the credentials that a authenticator has registered.
   */
  credentials: 'Credentials',
  /**
   * @description Text that shows before the virtual environment is enabled.
   */
  noAuthenticator: 'No authenticator set up',
  /**
   * @description That that shows before virtual environment is enabled explaining the panel.
   */
  useWebauthnForPhishingresistant: 'Use WebAuthn for phishing-resistant authentication.',
  /**
   * @description Title for section of interface that allows user to add a new virtual authenticator.
   */
  newAuthenticator: 'New authenticator',
  /**
   * @description Text for security or network protocol
   */
  protocol: 'Protocol',
  /**
   * @description Label for input to select which transport option to use on virtual authenticators, e.g. USB or Bluetooth.
   */
  transport: 'Transport',
  /**
   * @description Label for checkbox that toggles resident key support on virtual authenticators.
   */
  supportsResidentKeys: 'Supports resident keys',
  /**
   * @description Label for checkbox that toggles large blob support on virtual authenticators. Large blobs are opaque data associated
   * with a WebAuthn credential that a website can store, like an SSH certificate or a symmetric encryption key.
   * See https://w3c.github.io/webauthn/#sctn-large-blob-extension
   */
  supportsLargeBlob: 'Supports large blob',
  /**
   * @description Text to add something
   */
  add: 'Add',
  /**
   * @description Label for radio button that toggles whether an authenticator is active.
   */
  active: 'Active',
  /**
   * @description Title for button that enables user to customize name of authenticator.
   */
  editName: 'Edit name',
  /**
   * @description Placeholder for the input box to customize name of authenticator.
   */
  enterNewName: 'Enter new name',
  /**
   * @description Title for button that enables user to save name of authenticator after editing it.
   */
  saveName: 'Save name',
  /**
   * @description Title for a user-added virtual authenticator which is uniquely identified with its AUTHENTICATORID.
   * @example {8c7873be-0b13-4996-a794-1521331bbd96} PH1
   */
  authenticatorS: 'Authenticator {PH1}',
  /**
   * @description Name for generated file which user can download. A private key is a secret code which enables encoding and decoding of a credential. .pem is the file extension.
   */
  privateKeypem: 'Private key.pem',
  /**
   * @description Label for field that holds an authenticator's universally unique identifier (UUID).
   */
  uuid: 'UUID',
  /**
   * @description Label for checkbox that toggles user verification support on virtual authenticators.
   */
  supportsUserVerification: 'Supports user verification',
  /**
   * @description Text in Timeline indicating that input has happened recently
   */
  yes: 'Yes',
  /**
   * @description Text in Timeline indicating that input has not happened recently
   */
  no: 'No',
  /**
   * @description Title of radio button that sets an authenticator as active.
   * @example {Authenticator ABCDEF} PH1
   */
  setSAsTheActiveAuthenticator: 'Set {PH1} as the active authenticator',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/webauthn/WebauthnPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nTemplate = Lit.i18nTemplate.bind(undefined, str_);

const WEB_AUTHN_EXPLANATION_URL =
    'https://developer.chrome.com/docs/devtools/webauthn' as Platform.DevToolsPath.UrlString;

function renderCredentialsDataGrid(
    authenticatorId: Protocol.WebAuthn.AuthenticatorId, credentials: Protocol.WebAuthn.Credential[],
    onExport: (credential: Protocol.WebAuthn.Credential) => void,
    onRemove: (credentialId: string) => void): Lit.TemplateResult {
  // clang-format off
  return html`
    <devtools-data-grid name=${i18nString(UIStrings.credentials)} inline striped>
      <table>
        <thead>
          <tr>
            <th id="credentialId" weight="24" text-overflow="ellipsis">${i18nString(UIStrings.id)}</th>
            <th id="isResidentCredential" type="boolean" weight="10">${i18nString(UIStrings.isResident)}</th>
            <th id="rpId" weight="16.5">${i18nString(UIStrings.rpId)}</th>
            <th id="userHandle" weight="16.5">${i18nString(UIStrings.userHandle)}</th>
            <th id="signCount" weight="16.5">${i18nString(UIStrings.signCount)}</th>
            <th id="actions" weight="16.5">${i18nString(UIStrings.actions)}</th>
          </tr>
        </thead>
        <tbody>
        ${credentials.length ? repeat(credentials, c => c.credentialId, credential => html`
          <tr>
            <td>${credential.credentialId}</td>
            <td>${credential.isResidentCredential}</td>
            <td>${credential.rpId}</td>
            <td>${credential.userHandle}</td>
            <td>${credential.signCount}</td>
            <td>
              <devtools-button .variant=${Buttons.Button.Variant.OUTLINED}
                  part="action-button"
                  @click=${() => onExport(credential)}
                  .jslogContext=${'webauthn.export-credential'}>
                ${i18nString(UIStrings.export)}
              </devtools-button>
              <devtools-button .variant=${Buttons.Button.Variant.OUTLINED}
                  part="action-button"
                  @click=${() => onRemove(credential.credentialId)}
                  .jslogContext=${'webauthn.remove-credential'}>
                ${i18nString(UIStrings.remove)}
              </devtools-button>
            </td>
          </tr>`) : html`
          <tr>
            <td class="center" colspan=6>
              ${i18nTemplate(UIStrings.noCredentialsTryCallingSFromYour,
                            {PH1: html`<span class="code">navigator.credentials.create()</span>`})}
            </td>
          </tr>`}
        </tbody>
      </table>
    </devtools-data-grid>`;
  // clang-format on
}

type AvailableAuthenticatorOptions = Protocol.WebAuthn.VirtualAuthenticatorOptions&{
  active: boolean,
  authenticatorId: Protocol.WebAuthn.AuthenticatorId,
};

// We extrapolate this variable as otherwise git detects a private key, even though we
// perform string manipulation. If we extract the name, then the regex doesn't match
// and we can upload as expected.
const PRIVATE_NAME = 'PRIVATE';
const PRIVATE_KEY_HEADER = `-----BEGIN ${PRIVATE_NAME} KEY-----
`;
const PRIVATE_KEY_FOOTER = `-----END ${PRIVATE_NAME} KEY-----`;

const PROTOCOL_AUTHENTICATOR_VALUES: Protocol.EnumerableEnum<typeof Protocol.WebAuthn.AuthenticatorProtocol> = {
  Ctap2: Protocol.WebAuthn.AuthenticatorProtocol.Ctap2,
  U2f: Protocol.WebAuthn.AuthenticatorProtocol.U2f,
};

interface Authenticator {
  name: string;
  options: Protocol.WebAuthn.VirtualAuthenticatorOptions;
  credentials: Protocol.WebAuthn.Credential[];
}

interface Authenticator {
  name: string;
  options: Protocol.WebAuthn.VirtualAuthenticatorOptions;
  credentials: Protocol.WebAuthn.Credential[];
}

interface ViewInput {
  enabled: boolean;
  onToggleEnabled: () => void;
  authenticators: Map<Protocol.WebAuthn.AuthenticatorId, Authenticator>;
  activeAuthenticatorId: Protocol.WebAuthn.AuthenticatorId|null;
  editingAuthenticatorId: Protocol.WebAuthn.AuthenticatorId|null;
  newAuthenticatorOptions: Protocol.WebAuthn.VirtualAuthenticatorOptions;
  internalTransportAvailable: boolean;
  updateNewAuthenticatorOptions: (change: Partial<Protocol.WebAuthn.VirtualAuthenticatorOptions>) => void;
  addAuthenticator: () => void;
  onActivateAuthenticator: (id: Protocol.WebAuthn.AuthenticatorId) => void;
  onEditName: (id: Protocol.WebAuthn.AuthenticatorId) => void;
  onSaveName: (id: Protocol.WebAuthn.AuthenticatorId, name: string) => void;
  onRemoveAuthenticator: (id: Protocol.WebAuthn.AuthenticatorId) => void;
  onExportCredential: (credential: Protocol.WebAuthn.Credential) => void;
  onRemoveCredential: (id: Protocol.WebAuthn.AuthenticatorId, credentialId: string) => void;
}

interface ViewOutput {
  revealSection: Map<string, () => void>;
}

type ViewFunction = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;

function renderToolbar(enabled: boolean, onToggle: () => void): Lit.TemplateResult {
  const enableCheckboxTitle = i18nString(UIStrings.enableVirtualAuthenticator);
  // clang-format off
  return html`
    <div class="webauthn-toolbar-container" jslog=${VisualLogging.toolbar()} role="toolbar">
      <devtools-toolbar class="webauthn-toolbar" role="presentation">
        <devtools-checkbox title=${enableCheckboxTitle}
            @click=${onToggle}
            .jslogContext=${'virtual-authenticators'}
            .checked=${enabled}>
          ${enableCheckboxTitle}
        </devtools-checkbox>
      </devtools-toolbar>
    </div>`;
  // clang-format on
}

function renderLearnMoreView(): Lit.TemplateResult {
  // clang-format off
  return html`
    <devtools-widget class="learn-more" .widgetConfig=${widgetConfig(UI.EmptyWidget.EmptyWidget, {
        header: i18nString(UIStrings.noAuthenticator),
        text: i18nString(UIStrings.useWebauthnForPhishingresistant),
        link: WEB_AUTHN_EXPLANATION_URL})}>
    </devtools-widget>`;
  // clang-format on
}

function renderNewAuthenticatorSection(
    options: Protocol.WebAuthn.VirtualAuthenticatorOptions, internalTransportAvailable: boolean,
    onUpdate: (change: Partial<Protocol.WebAuthn.VirtualAuthenticatorOptions>) => void,
    onAdd: () => void): Lit.TemplateResult {
  const isCtap2 = options.protocol === Protocol.WebAuthn.AuthenticatorProtocol.Ctap2;
  // clang-format off
  return html`
    <div class="new-authenticator-container">
      <label class="new-authenticator-title">
        ${i18nString(UIStrings.newAuthenticator)}
      </label>
      <div class="new-authenticator-form" jslog=${VisualLogging.section('new-authenticator')}>
        <div class="authenticator-option">
          <label class="authenticator-option-label" for="protocol">
            ${i18nString(UIStrings.protocol)}
          </label>
          <select id="protocol" jslog=${VisualLogging.dropDown('protocol').track({change: true})}
              value=${options.protocol}
              @change=${(e:Event) => onUpdate({protocol: (e.target as HTMLSelectElement).value as Protocol.WebAuthn.AuthenticatorProtocol})}>
            ${Object.values(PROTOCOL_AUTHENTICATOR_VALUES).sort().map(option => html`
              <option value=${option} jslog=${VisualLogging.item(option).track({click: true})}>
                ${option}
              </option>`)}
          </select>
        </div>
        <div class="authenticator-option">
          <label for="transport" class="authenticator-option-label">
            ${i18nString(UIStrings.transport)}
          </label>
          <select id="transport"
              value=${options.transport}
              jslog=${VisualLogging.dropDown('transport').track({change: true})}
              @change=${(e: Event) => onUpdate({transport: (e.target as HTMLSelectElement).value as Protocol.WebAuthn.AuthenticatorTransport})}>
            ${[
              Protocol.WebAuthn.AuthenticatorTransport.Usb,
              Protocol.WebAuthn.AuthenticatorTransport.Ble,
              Protocol.WebAuthn.AuthenticatorTransport.Nfc,
                ...(isCtap2 ? [Protocol.WebAuthn.AuthenticatorTransport.Internal] : [])
            ].map(option => html`
                <option value=${option} jslog=${VisualLogging.item(option).track({click: true})}
                        .selected=${options.transport === option}
                        .disabled=${!internalTransportAvailable
                            &&  option === Protocol.WebAuthn.AuthenticatorTransport.Internal}>
                  ${option}
                </option>`)
            }
          </select>
        </div>
        <div class="authenticator-option">
          <label for="resident-key" class="authenticator-option-label">
            ${i18nString(UIStrings.supportsResidentKeys)}
          </label>
          <input id="resident-key" class="authenticator-option-checkbox" type="checkbox"
              jslog=${VisualLogging.toggle('resident-key').track({change: true})}
              @change=${(e:Event) => onUpdate({hasResidentKey: (e.target as HTMLInputElement).checked})}
              .checked=${Boolean(options.hasResidentKey && isCtap2)} .disabled=${!isCtap2}>
        </div>
        <div class="authenticator-option">
          <label for="user-verification" class="authenticator-option-label">
            ${i18nString(UIStrings.supportsUserVerification)}
          </label>
          <input id="user-verification" class="authenticator-option-checkbox" type="checkbox"
              jslog=${VisualLogging.toggle('user-verification').track({change: true})}
              @change=${(e: Event) => onUpdate({hasUserVerification: (e.target as HTMLInputElement).checked})}
              .checked=${Boolean(options.hasUserVerification && isCtap2)}
              .disabled=${!isCtap2}>
        </div>
        <div class="authenticator-option">
          <label for="large-blob" class="authenticator-option-label">
            ${i18nString(UIStrings.supportsLargeBlob)}
          </label>
          <input id="large-blob" class="authenticator-option-checkbox" type="checkbox"
              jslog=${VisualLogging.toggle('large-blob').track({change: true})}
              @change=${(e: Event) => onUpdate({hasLargeBlob: (e.target as HTMLInputElement).checked})}
              .checked=${Boolean(options.hasLargeBlob && isCtap2 && options.hasResidentKey)}
              .disabled=${!options.hasResidentKey || !isCtap2}>
        </div>
        <div class="authenticator-option">
          <div class="authenticator-option-label"></div>
          <devtools-button @click=${onAdd}
              id="add-authenticator"
              .jslogContext=${'webauthn.add-authenticator'}
              .variant=${Buttons.Button.Variant.OUTLINED}>
            ${i18nString(UIStrings.add)}
          </devtools-button>
        </div>
      </div>
    </div>`;
}

function renderAuthenticatorSection(
    authenticatorId: Protocol.WebAuthn.AuthenticatorId,
    authenticator: Authenticator,  active: boolean, editing: boolean,
    onActivate: () => void, onEditName: () => void, onSaveName: (name: string) => void, onRemove: () => void,
    onExportCredential : (credential: Protocol.WebAuthn.Credential) => void,
    onRemoveCredential : (credentialId: string) => void,
    output: ViewOutput): Lit.TemplateResult {
  function revealSection(section: Element|undefined): void {
    if (!section) {
      return;
    }
    const mediaQueryList = window.matchMedia('(prefers-reduced-motion: reduce)');
    const prefersReducedMotion = mediaQueryList.matches;
    section.scrollIntoView({block: 'nearest', behavior: prefersReducedMotion ? 'auto' : 'smooth'});
  }
  // clang-format off
  return html`
    <div class="authenticator-section" data-authenticator-id=${authenticatorId}
         jslog=${VisualLogging.section('authenticator')}
          ${ref(e => { output.revealSection.set(authenticatorId, revealSection.bind(null, e));})}>
      <div class="authenticator-section-header">
        <div class="authenticator-section-title" role="heading" aria-level="2">
          <devtools-toolbar class="edit-name-toolbar">
            <devtools-button title=${i18nString(UIStrings.editName)}
                class=${classMap({hidden: editing})}
                @click=${onEditName}
                .iconName=${'edit'} .variant=${Buttons.Button.Variant.TOOLBAR}
                .jslogContext=${'edit-name'}></devtools-button>
            <devtools-button title=${i18nString(UIStrings.saveName)}
                @click=${(e: Event) => onSaveName(((e.target as HTMLElement).parentElement?.nextSibling as HTMLInputElement).value)}
                .iconName=${'checkmark'} .variant=${Buttons.Button.Variant.TOOLBAR}
                class=${classMap({hidden: !editing})}
                .jslogContext=${'save-name'}></devtools-button>
          </devtools-toolbar>
          <input class="authenticator-name-field"
              placeholder=${i18nString(UIStrings.enterNewName)}
              jslog=${VisualLogging.textField('name').track({keydown: 'Enter', change: true})}
              value=${i18nString(UIStrings.authenticatorS, {PH1: authenticator.name})} .disabled=${!editing}
              ${ref(e => { if(e instanceof HTMLInputElement && editing) { e.focus(); } })}
              @focusout=${(e: Event) => onSaveName((e.target as HTMLInputElement).value)}
              @keydown=${(event: KeyboardEvent) => {
                if (event.key === 'Enter') {
                  onSaveName((event.target as HTMLInputElement).value);
                }
              }}>
        </div>
        <div class="active-button-container">
          <label title=${i18nString(UIStrings.setSAsTheActiveAuthenticator, {PH1: authenticator.name})}>
            <input type="radio" .checked=${active} @change=${(e:Event) => { if ((e.target as HTMLInputElement).checked) { onActivate(); }}}
                  jslog=${VisualLogging.toggle('webauthn.active-authenticator').track({change: true})}>
            ${i18nString(UIStrings.active)}
          </label>
        </div>
        <button class="text-button" @click=${onRemove}
            jslog=${VisualLogging.action('webauthn.remove-authenticator').track({click: true})}>
          ${i18nString(UIStrings.remove)}
        </button>
      </div>
      ${renderAuthenticatorFields(authenticatorId, authenticator.options)}
      <div class="credentials-title">${i18nString(UIStrings.credentials)}</div>
      ${renderCredentialsDataGrid(authenticatorId, authenticator.credentials, onExportCredential, onRemoveCredential)}
      <div class="divider"></div>
    </div>`;
  // clang-format on
}

/**
 * Creates the fields describing the authenticator in the front end.
 */
function renderAuthenticatorFields(
    authenticatorId: string, options: Protocol.WebAuthn.VirtualAuthenticatorOptions): Lit.TemplateResult {
  // clang-format off
  return html`
    <div class="authenticator-fields">
      <div class="authenticator-field">
        <label class="authenticator-option-label">${i18nString(UIStrings.uuid)}</label>
        <div class="authenticator-field-value">${authenticatorId}</div>
      </div>
      <div class="authenticator-field">
        <label class="authenticator-option-label">${i18nString(UIStrings.protocol)}</label>
        <div class="authenticator-field-value">${options.protocol}</div>
      </div>
      <div class="authenticator-field">
        <label class="authenticator-option-label">${i18nString(UIStrings.transport)}</label>
        <div class="authenticator-field-value">${options.transport}</div>
      </div>
      <div class="authenticator-field">
        <label class="authenticator-option-label">
          ${i18nString(UIStrings.supportsResidentKeys)}
        </label>
        <div class="authenticator-field-value">
          ${options.hasResidentKey ? i18nString(UIStrings.yes) : i18nString(UIStrings.no)}
        </div>
      </div>
      <div class="authenticator-field">
        <label class="authenticator-option-label">
          ${i18nString(UIStrings.supportsLargeBlob)}
        </label>
        <div class="authenticator-field-value">
          ${options.hasLargeBlob ? i18nString(UIStrings.yes) : i18nString(UIStrings.no)}
        </div>
      </div>
      <div class="authenticator-field">
        <label class="authenticator-option-label">
          ${i18nString(UIStrings.supportsUserVerification)}
        </label>
        <div class="authenticator-field-value">
          ${options.hasUserVerification ? i18nString(UIStrings.yes) : i18nString(UIStrings.no)}
        </div>
      </div>
    </div>`;
  // clang-format on
}

export const DEFAULT_VIEW: ViewFunction = (input, output, target) => {
  // clang-format off
  render(html`
    <style>${Input.checkboxStyles}</style>
    <style>${webauthnPaneStyles}</style>
    <div class="webauthn-pane flex-auto ${classMap({enabled: input.enabled})}">
      ${renderToolbar(input.enabled, input.onToggleEnabled)}
      <div class="authenticators-view">
         ${repeat([...input.authenticators.entries()],
                  ([id]) => id,
                  ([id, authenticator]) => renderAuthenticatorSection(
                      id, authenticator,
                      input.activeAuthenticatorId === id,
                      input.editingAuthenticatorId === id,
                      input.onActivateAuthenticator.bind(input, id),
                      input.onEditName.bind(input, id),
                      input.onSaveName.bind(input, id),
                      input.onRemoveAuthenticator.bind(input, id),
                      input.onExportCredential,
                      input.onRemoveCredential.bind(input, id),
                      output))}
      </div>
      ${renderLearnMoreView()}
      ${renderNewAuthenticatorSection(
          input.newAuthenticatorOptions, input.internalTransportAvailable,  input.updateNewAuthenticatorOptions, input.addAuthenticator)}
    </div>`,
    target);
  // clang-format on
};

export class WebauthnPaneImpl extends UI.Panel.Panel implements
    SDK.TargetManager.SDKModelObserver<SDK.WebAuthnModel.WebAuthnModel> {
  async #addAuthenticator(options: Protocol.WebAuthn.VirtualAuthenticatorOptions):
      Promise<Protocol.WebAuthn.AuthenticatorId> {
    if (!this.#model) {
      throw new Error('WebAuthn model is not available.');
    }

    const authenticatorId = await this.#model.addAuthenticator(options);
    const userFriendlyName = authenticatorId.slice(-5);  // User friendly name defaults to last 5 chars of UUID.
    this.#authenticators.set(authenticatorId, {
      name: userFriendlyName,
      options,
      credentials: [],
    });
    this.requestUpdate();
    this.#model.addEventListener(
        SDK.WebAuthnModel.Events.CREDENTIAL_ADDED, this.#addCredential.bind(this, authenticatorId));
    this.#model.addEventListener(
        SDK.WebAuthnModel.Events.CREDENTIAL_ASSERTED, this.#updateCredential.bind(this, authenticatorId));
    this.#model.addEventListener(
        SDK.WebAuthnModel.Events.CREDENTIAL_UPDATED, this.#updateCredential.bind(this, authenticatorId));
    this.#model.addEventListener(
        SDK.WebAuthnModel.Events.CREDENTIAL_DELETED, this.#deleteCredential.bind(this, authenticatorId));
    return authenticatorId;
  }

  #activeAuthId: Protocol.WebAuthn.AuthenticatorId|null = null;
  #editingAuthId: Protocol.WebAuthn.AuthenticatorId|null = null;
  #hasBeenEnabled = false;
  readonly #authenticators = new Map<Protocol.WebAuthn.AuthenticatorId, Authenticator>();
  #enabled = false;
  readonly #availableAuthenticatorSetting: Common.Settings.Setting<AvailableAuthenticatorOptions[]>;
  #model?: SDK.WebAuthnModel.WebAuthnModel;
  #newAuthenticatorOptions: Protocol.WebAuthn.VirtualAuthenticatorOptions = {
    protocol: Protocol.WebAuthn.AuthenticatorProtocol.Ctap2,
    transport: Protocol.WebAuthn.AuthenticatorTransport.Usb,
    hasResidentKey: false,
    hasUserVerification: false,
    hasLargeBlob: false,
    automaticPresenceSimulation: true,
    isUserVerified: true,
  };
  #hasInternalAuthenticator = false;
  #isEnabling?: Promise<void>;
  #view: ViewFunction;
  #viewOutput: ViewOutput = {
    revealSection: new Map(),
  };

  constructor(view = DEFAULT_VIEW) {
    super('webauthn');

    this.#view = view;

    SDK.TargetManager.TargetManager.instance().observeModels(SDK.WebAuthnModel.WebAuthnModel, this, {scoped: true});

    this.#availableAuthenticatorSetting =
        Common.Settings.Settings.instance().createSetting<AvailableAuthenticatorOptions[]>(
            'webauthn-authenticators', []);
    this.#updateInternalTransportAvailability();

    this.performUpdate();
  }

  override performUpdate(): void {
    const viewInput = {
      enabled: this.#enabled,
      onToggleEnabled: this.#handleCheckboxToggle.bind(this),
      authenticators: this.#authenticators,
      activeAuthenticatorId: this.#activeAuthId,
      editingAuthenticatorId: this.#editingAuthId,
      newAuthenticatorOptions: this.#newAuthenticatorOptions,
      internalTransportAvailable: !this.#hasInternalAuthenticator,
      updateNewAuthenticatorOptions: this.#updateNewAuthenticatorSectionOptions.bind(this),
      addAuthenticator: this.#handleAddAuthenticatorButton.bind(this),
      onActivateAuthenticator: this.#setActiveAuthenticator.bind(this),
      onEditName: this.#handleEditNameButton.bind(this),
      onSaveName: this.#handleSaveNameButton.bind(this),
      onRemoveAuthenticator: this.removeAuthenticator.bind(this),
      onExportCredential: this.#exportCredential.bind(this),
      onRemoveCredential: this.#removeCredential.bind(this),
    };
    this.#view(viewInput, this.#viewOutput, this.contentElement);
  }

  modelAdded(model: SDK.WebAuthnModel.WebAuthnModel): void {
    if (model.target() === model.target().outermostTarget()) {
      this.#model = model;
    }
  }

  modelRemoved(model: SDK.WebAuthnModel.WebAuthnModel): void {
    if (model.target() === model.target().outermostTarget()) {
      this.#model = undefined;
    }
  }

  async #loadInitialAuthenticators(): Promise<void> {
    let activeAuthenticatorId: Protocol.WebAuthn.AuthenticatorId|null = null;
    const availableAuthenticators = this.#availableAuthenticatorSetting.get();
    for (const options of availableAuthenticators) {
      if (!this.#model) {
        continue;
      }

      const authenticatorId = await this.#addAuthenticator(options);
      // Update the authenticatorIds in the options.
      options.authenticatorId = authenticatorId;
      if (options.active) {
        activeAuthenticatorId = authenticatorId;
      }
    }

    // Update the settings to reflect the new authenticatorIds.
    this.#availableAuthenticatorSetting.set(availableAuthenticators);
    if (activeAuthenticatorId) {
      void this.#setActiveAuthenticator(activeAuthenticatorId);
    }
  }

  override async ownerViewDisposed(): Promise<void> {
    this.#enabled = false;
    await this.#setVirtualAuthEnvEnabled(false);
  }

  #addCredential(authenticatorId: Protocol.WebAuthn.AuthenticatorId, {
    data: event,
  }: Common.EventTarget.EventTargetEvent<Protocol.WebAuthn.CredentialAddedEvent>): void {
    const authenticator = this.#authenticators.get(authenticatorId);
    if (!authenticator) {
      return;
    }
    authenticator.credentials.push(event.credential);
    this.requestUpdate();
  }

  #updateCredential(
      authenticatorId: Protocol.WebAuthn.AuthenticatorId,
      {
        data: event,
      }: Common.EventTarget
          .EventTargetEvent<Protocol.WebAuthn.CredentialAssertedEvent&Protocol.WebAuthn.CredentialUpdatedEvent>): void {
    const authenticator = this.#authenticators.get(authenticatorId);
    if (!authenticator) {
      return;
    }
    const credential =
        authenticator.credentials.find(credential => credential.credentialId === event.credential.credentialId);
    if (!credential) {
      return;
    }
    Object.assign(credential, event.credential);
    this.requestUpdate();
  }

  #deleteCredential(authenticatorId: Protocol.WebAuthn.AuthenticatorId, {
    data: event,
  }: Common.EventTarget.EventTargetEvent<Protocol.WebAuthn.CredentialDeletedEvent>): void {
    const authenticator = this.#authenticators.get(authenticatorId);
    if (!authenticator) {
      return;
    }
    const credentialIndex =
        authenticator.credentials.findIndex(credential => credential.credentialId === event.credentialId);
    if (credentialIndex < 0) {
      return;
    }
    authenticator.credentials.splice(credentialIndex, 1);
    this.requestUpdate();
  }

  async #setVirtualAuthEnvEnabled(enable: boolean): Promise<void> {
    await this.#isEnabling;
    this.#isEnabling = new Promise<void>(async (resolve: (value: void) => void) => {
      if (enable && !this.#hasBeenEnabled) {
        // Ensures metric is only tracked once per session.
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.VirtualAuthenticatorEnvironmentEnabled);
        this.#hasBeenEnabled = true;
      }
      if (this.#model) {
        await this.#model.setVirtualAuthEnvEnabled(enable);
      }

      if (enable) {
        await this.#loadInitialAuthenticators();
      } else {
        this.#removeAuthenticatorSections();
      }

      this.#isEnabling = undefined;
      this.#enabled = enable;
      this.requestUpdate();
      resolve();
    });
  }

  #removeAuthenticatorSections(): void {
    this.#authenticators.clear();
  }

  #handleCheckboxToggle(): void {
    void this.#setVirtualAuthEnvEnabled(!this.#enabled);
  }

  #updateNewAuthenticatorSectionOptions(change: Partial<Protocol.WebAuthn.VirtualAuthenticatorOptions>): void {
    Object.assign(this.#newAuthenticatorOptions, change);
    this.requestUpdate();
  }

  #updateInternalTransportAvailability(): void {
    this.#hasInternalAuthenticator = Boolean(this.#availableAuthenticatorSetting.get().find(
        authenticator => authenticator.transport === Protocol.WebAuthn.AuthenticatorTransport.Internal));
    if (this.#hasInternalAuthenticator &&
        this.#newAuthenticatorOptions.transport === Protocol.WebAuthn.AuthenticatorTransport.Internal) {
      this.#newAuthenticatorOptions.transport = Protocol.WebAuthn.AuthenticatorTransport.Nfc;
    }
    this.requestUpdate();
  }

  async #handleAddAuthenticatorButton(): Promise<void> {
    const options = this.#newAuthenticatorOptions;
    if (this.#model) {
      const authenticatorId = await this.#addAuthenticator(options);
      this.#activeAuthId = authenticatorId;  // Newly added authenticator is automatically set as active.
      const availableAuthenticators = this.#availableAuthenticatorSetting.get();
      availableAuthenticators.push({authenticatorId, active: true, ...options});
      this.#availableAuthenticatorSetting.set(
          availableAuthenticators.map(a => ({...a, active: a.authenticatorId === authenticatorId})));
      this.#updateInternalTransportAvailability();
      await this.updateComplete;
      this.#viewOutput.revealSection.get(authenticatorId)?.();
    }
  }

  #exportCredential(credential: Protocol.WebAuthn.Credential): void {
    let pem = PRIVATE_KEY_HEADER;
    for (let i = 0; i < credential.privateKey.length; i += 64) {
      pem += credential.privateKey.substring(i, i + 64) + '\n';
    }
    pem += PRIVATE_KEY_FOOTER;

    /* eslint-disable-next-line rulesdir/no-imperative-dom-api */
    const link = document.createElement('a');
    link.download = i18nString(UIStrings.privateKeypem);
    link.href = 'data:application/x-pem-file,' + encodeURIComponent(pem);
    link.click();
  }

  #removeCredential(authenticatorId: Protocol.WebAuthn.AuthenticatorId, credentialId: string): void {
    const authenticator = this.#authenticators.get(authenticatorId);
    if (!authenticator) {
      return;
    }

    const authenticatorIndex =
        authenticator.credentials.findIndex(credential => credential.credentialId === credentialId);
    if (authenticatorIndex < 0) {
      return;
    }
    authenticator.credentials.splice(authenticatorIndex, 1);
    this.requestUpdate();

    if (this.#model) {
      void this.#model.removeCredential(authenticatorId, credentialId);
    }
  }

  #handleEditNameButton(authenticatorId: Protocol.WebAuthn.AuthenticatorId): void {
    this.#editingAuthId = authenticatorId;
    this.requestUpdate();
  }

  #handleSaveNameButton(authenticatorId: Protocol.WebAuthn.AuthenticatorId, name: string): void {
    const authenticator = this.#authenticators.get(authenticatorId);
    if (!authenticator) {
      return;
    }
    authenticator.name = name;
    this.#editingAuthId = null;
    this.requestUpdate();
  }

  /**
   * Removes both the authenticator and its respective UI element.
   */
  removeAuthenticator(authenticatorId: Protocol.WebAuthn.AuthenticatorId): void {
    this.#authenticators.delete(authenticatorId);
    this.requestUpdate();
    if (this.#model) {
      void this.#model.removeAuthenticator(authenticatorId);
    }

    // Update available authenticator setting.
    const prevAvailableAuthenticators = this.#availableAuthenticatorSetting.get();
    const newAvailableAuthenticators = prevAvailableAuthenticators.filter(a => a.authenticatorId !== authenticatorId);
    this.#availableAuthenticatorSetting.set(newAvailableAuthenticators);

    if (this.#activeAuthId === authenticatorId) {
      const availableAuthenticatorIds = Array.from(this.#authenticators.keys());
      if (availableAuthenticatorIds.length) {
        void this.#setActiveAuthenticator(availableAuthenticatorIds[0]);
      } else {
        this.#activeAuthId = null;
      }
    }
    this.#updateInternalTransportAvailability();
  }

  /**
   * Sets the given authenticator as active.
   * Note that a newly added authenticator will automatically be set as active.
   */
  async #setActiveAuthenticator(authenticatorId: Protocol.WebAuthn.AuthenticatorId): Promise<void> {
    await this.#clearActiveAuthenticator();
    if (this.#model) {
      await this.#model.setAutomaticPresenceSimulation(authenticatorId, true);
    }
    this.#activeAuthId = authenticatorId;

    const prevAvailableAuthenticators = this.#availableAuthenticatorSetting.get();
    const newAvailableAuthenticators =
        prevAvailableAuthenticators.map(a => ({...a, active: a.authenticatorId === authenticatorId}));
    this.#availableAuthenticatorSetting.set(newAvailableAuthenticators);

    this.requestUpdate();
  }

  async #clearActiveAuthenticator(): Promise<void> {
    if (this.#activeAuthId && this.#model) {
      await this.#model.setAutomaticPresenceSimulation(this.#activeAuthId, false);
    }
    this.#activeAuthId = null;
    this.requestUpdate();
  }
}
