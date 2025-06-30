// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-imperative-dom-api, rulesdir/inject-checkbox-styles */

import '../../ui/legacy/legacy.js';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import webauthnPaneStyles from './webauthnPane.css.js';
const {render, html, Directives: {ref}} = Lit;
const {widgetConfig} = UI.Widget;

const UIStrings = {
  /**
   *@description Label for button that allows user to download the private key related to a credential.
   */
  export: 'Export',
  /**
   *@description Label for an item to remove something
   */
  remove: 'Remove',
  /**
   *@description Label for empty credentials table.
   *@example {navigator.credentials.create()} PH1
   */
  noCredentialsTryCallingSFromYour: 'No credentials. Try calling {PH1} from your website.',
  /**
   *@description Label for checkbox to toggle the virtual authenticator environment allowing user to interact with software-based virtual authenticators.
   */
  enableVirtualAuthenticator: 'Enable virtual authenticator environment',
  /**
   *@description Label for ID field for credentials.
   */
  id: 'ID',
  /**
   *@description Label for field that describes whether a credential is a resident credential.
   */
  isResident: 'Is Resident',
  /**
   *@description Label for credential field that represents the Relying Party ID that the credential is scoped to.
   */
  rpId: 'RP ID',
  /**
   *@description Label for a column in a table. A field/unique ID that represents the user a credential is mapped to.
   */
  userHandle: 'User Handle',
  /**
   *@description Label for signature counter field for credentials which represents the number of successful assertions.
   * See https://w3c.github.io/webauthn/#signature-counter.
   */
  signCount: 'Signature Count',
  /**
   *@description Label for column with actions for credentials.
   */
  actions: 'Actions',
  /**
   *@description Title for the table that holds the credentials that a authenticator has registered.
   */
  credentials: 'Credentials',
  /**
   *@description Text that shows before the virtual environment is enabled.
   */
  noAuthenticator: 'No authenticator set up',
  /**
   *@description That that shows before virtual environment is enabled explaining the panel.
   */
  useWebauthnForPhishingresistant: 'Use WebAuthn for phishing-resistant authentication.',
  /**
   *@description Title for section of interface that allows user to add a new virtual authenticator.
   */
  newAuthenticator: 'New authenticator',
  /**
   *@description Text for security or network protocol
   */
  protocol: 'Protocol',
  /**
   *@description Label for input to select which transport option to use on virtual authenticators, e.g. USB or Bluetooth.
   */
  transport: 'Transport',
  /**
   *@description Label for checkbox that toggles resident key support on virtual authenticators.
   */
  supportsResidentKeys: 'Supports resident keys',
  /**
   *@description Label for checkbox that toggles large blob support on virtual authenticators. Large blobs are opaque data associated
   * with a WebAuthn credential that a website can store, like an SSH certificate or a symmetric encryption key.
   * See https://w3c.github.io/webauthn/#sctn-large-blob-extension
   */
  supportsLargeBlob: 'Supports large blob',
  /**
   *@description Text to add something
   */
  add: 'Add',
  /**
   *@description Label for radio button that toggles whether an authenticator is active.
   */
  active: 'Active',
  /**
   *@description Title for button that enables user to customize name of authenticator.
   */
  editName: 'Edit name',
  /**
   *@description Placeholder for the input box to customize name of authenticator.
   */
  enterNewName: 'Enter new name',
  /**
   *@description Title for button that enables user to save name of authenticator after editing it.
   */
  saveName: 'Save name',
  /**
   *@description Title for a user-added virtual authenticator which is uniquely identified with its AUTHENTICATORID.
   *@example {8c7873be-0b13-4996-a794-1521331bbd96} PH1
   */
  authenticatorS: 'Authenticator {PH1}',
  /**
   *@description Name for generated file which user can download. A private key is a secret code which enables encoding and decoding of a credential. .pem is the file extension.
   */
  privateKeypem: 'Private key.pem',
  /**
   *@description Label for field that holds an authenticator's universally unique identifier (UUID).
   */
  uuid: 'UUID',
  /**
   *@description Label for checkbox that toggles user verification support on virtual authenticators.
   */
  supportsUserVerification: 'Supports user verification',
  /**
   *@description Text in Timeline indicating that input has happened recently
   */
  yes: 'Yes',
  /**
   *@description Text in Timeline indicating that input has not happened recently
   */
  no: 'No',
  /**
   *@description Title of radio button that sets an authenticator as active.
   *@example {Authenticator ABCDEF} PH1
   */
  setSAsTheActiveAuthenticator: 'Set {PH1} as the active authenticator',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/webauthn/WebauthnPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nTemplate = Lit.i18nTemplate.bind(undefined, str_);

const WEB_AUTHN_EXPLANATION_URL =
    'https://developer.chrome.com/docs/devtools/webauthn' as Platform.DevToolsPath.UrlString;

class DataGridNode extends DataGrid.DataGrid.DataGridNode<DataGridNode> {
  constructor(private readonly credential: Protocol.WebAuthn.Credential) {
    super(credential);
  }

  override nodeSelfHeight(): number {
    return 24;
  }

  override createCell(columnId: string): HTMLElement {
    const cell = super.createCell(columnId);
    UI.Tooltip.Tooltip.install(cell, cell.textContent || '');

    if (columnId !== 'actions') {
      return cell;
    }

    const onExportCredential = (): void => {
      if (this.dataGrid) {
        (this.dataGrid as WebauthnDataGrid).onExportCredential(this.credential);
      }
    };
    const onRemoveCredential = (): void => {
      if (this.dataGrid) {
        (this.dataGrid as WebauthnDataGrid).onRemoveCredential(this.credential);
      }
    };
    // clang-format off
    // eslint-disable-next-line rulesdir/no-lit-render-outside-of-view
    render(html`
       <devtools-button .variant=${Buttons.Button.Variant.OUTLINED}
           @click=${onExportCredential} .jslogContext=${'webauthn.export-credential'}>
        ${i18nString(UIStrings.export)}
      </devtools-button>
      <devtools-button .variant=${Buttons.Button.Variant.OUTLINED}
          @click=${onRemoveCredential} .jslogContext=${'webauthn.remove-credential'}>
        ${i18nString(UIStrings.remove)}
      </devtools-button>`, cell);
    // clang-format on

    return cell;
  }
}

class WebauthnDataGrid extends DataGrid.DataGrid.DataGridImpl<DataGridNode> {
  onExportCredential = (_: Protocol.WebAuthn.Credential): void => {};
  onRemoveCredential = (_: Protocol.WebAuthn.Credential): void => {};
}

class EmptyDataGridNode extends DataGrid.DataGrid.DataGridNode<DataGridNode> {
  override createCells(element: Element): void {
    element.removeChildren();
    // clang-format off
    // eslint-disable-next-line rulesdir/no-lit-render-outside-of-view
    render(html`
      <td class=${DataGrid.DataGrid.Align.CENTER} colspan=${this.dataGrid?.visibleColumnsArray.length ?? 1}>
        ${i18nTemplate(UIStrings.noCredentialsTryCallingSFromYour,
                       {PH1: html`<span class="code">navigator.credentials.create()</span>`})}
      </td>`, element as HTMLElement);
    // clang-format on
  }
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

export class WebauthnPaneImpl extends UI.Widget.VBox implements
    SDK.TargetManager.SDKModelObserver<SDK.WebAuthnModel.WebAuthnModel> {
  #createCredentialsDataGrid(authenticatorId: Protocol.WebAuthn.AuthenticatorId):
      DataGrid.DataGrid.DataGridImpl<DataGridNode> {
    const columns = ([
      {
        id: 'credentialId',
        title: i18nString(UIStrings.id),
        longText: true,
        weight: 24,
      },
      {
        id: 'isResidentCredential',
        title: i18nString(UIStrings.isResident),
        dataType: DataGrid.DataGrid.DataType.BOOLEAN,
        weight: 10,
      },
      {
        id: 'rpId',
        title: i18nString(UIStrings.rpId),
      },
      {
        id: 'userHandle',
        title: i18nString(UIStrings.userHandle),
      },
      {
        id: 'signCount',
        title: i18nString(UIStrings.signCount),
      },
      {id: 'actions', title: i18nString(UIStrings.actions)},
    ] as DataGrid.DataGrid.ColumnDescriptor[]);

    const dataGridConfig = {
      displayName: i18nString(UIStrings.credentials),
      columns,
      editCallback: undefined,
      deleteCallback: undefined,
      refreshCallback: undefined,
    };
    const dataGrid = new WebauthnDataGrid(dataGridConfig);
    dataGrid.renderInline();
    dataGrid.setStriped(true);
    dataGrid.onExportCredential = this.#exportCredential.bind(this);
    dataGrid.onRemoveCredential = ({credentialId}) => this.#removeCredential(authenticatorId, credentialId);
    dataGrid.rootNode().appendChild(new EmptyDataGridNode());

    this.dataGrids.set(authenticatorId, dataGrid);

    return dataGrid;
  }

  #renderToolbar(): Lit.TemplateResult {
    const enableCheckboxTitle = i18nString(UIStrings.enableVirtualAuthenticator);
    // clang-format off
    return html`
      <div class="webauthn-toolbar-container" jslog=${VisualLogging.toolbar()} role="toolbar">
        <devtools-toolbar class="webauthn-toolbar" role="presentation">
          <devtools-checkbox title=${enableCheckboxTitle}
              @click=${this.#handleCheckboxToggle.bind(this)}
              .jslogContext=${'virtual-authenticators'}
              ${ref(e => { this.#enableCheckbox = e as HTMLInputElement; })}>
            ${enableCheckboxTitle}
          </devtools-checkbox>
        </devtools-toolbar>
      </div>`;
    // clang-format on
  }

  #renderLearnMoreView(): Lit.TemplateResult {
    // clang-format off
    return html`
      <devtools-widget class="learn-more" .widgetConfig=${widgetConfig(UI.EmptyWidget.EmptyWidget, {
          header: i18nString(UIStrings.noAuthenticator),
          text: i18nString(UIStrings.useWebauthnForPhishingresistant),
          link: WEB_AUTHN_EXPLANATION_URL})}>
      </devtools-widget>`;
    // clang-format on
  }

  #renderNewAuthenticatorSection(): Lit.TemplateResult {
    const options = this.#newAuthenticatorOptions;
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
                @change=${(e:Event) => this.#updateNewAuthenticatorSectionOptions({protocol:
                    (e.target as HTMLSelectElement).value as Protocol.WebAuthn.AuthenticatorProtocol})}>
              ${Object.values(PROTOCOL_AUTHENTICATOR_VALUES).sort().map(option => html`
                <option value=${option} jslog=${VisualLogging.item(option).track({click: true})}
                        .selected=${options.protocol === option}>
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
                @change=${(e:Event) => this.#updateNewAuthenticatorSectionOptions({transport:
                    (e.target as HTMLSelectElement).value as Protocol.WebAuthn.AuthenticatorTransport})}>
              ${[
                Protocol.WebAuthn.AuthenticatorTransport.Usb,
                Protocol.WebAuthn.AuthenticatorTransport.Ble,
                Protocol.WebAuthn.AuthenticatorTransport.Nfc,
                  ...(isCtap2 ? [Protocol.WebAuthn.AuthenticatorTransport.Internal] : [])
              ].map(option => html`
                  <option value=${option} jslog=${VisualLogging.item(option).track({click: true})}
                      .selected=${options.transport === option}
                      .disabled=${this.#hasInternalAuthenticator
                          && option === Protocol.WebAuthn.AuthenticatorTransport.Internal}>
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
                @change=${(e:Event) => this.#updateNewAuthenticatorSectionOptions({hasResidentKey:
                    (e.target as HTMLInputElement).checked})}
                .checked=${Boolean(options.hasResidentKey && isCtap2)} .disabled=${!isCtap2}>
          </div>
          <div class="authenticator-option">
            <label for="user-verification" class="authenticator-option-label">
              ${i18nString(UIStrings.supportsUserVerification)}
            </label>
            <input id="user-verification" class="authenticator-option-checkbox" type="checkbox"
                jslog=${VisualLogging.toggle('user-verification').track({change: true})}
                @change=${(e: Event) => this.#updateNewAuthenticatorSectionOptions({hasUserVerification:
                    (e.target as HTMLInputElement).checked})}
                .checked=${Boolean(options.hasUserVerification && isCtap2)} .disabled=${!isCtap2}>
          </div>
          <div class="authenticator-option">
            <label for="large-blob" class="authenticator-option-label">
              ${i18nString(UIStrings.supportsLargeBlob)}
            </label>
            <input id="large-blob" class="authenticator-option-checkbox" type="checkbox"
                jslog=${VisualLogging.toggle('large-blob').track({change: true})}
                @change=${(e: Event) => this.#updateNewAuthenticatorSectionOptions({hasLargeBlob:
                    (e.target as HTMLInputElement).checked})}
                .checked=${Boolean(options.hasLargeBlob && isCtap2 && options.hasResidentKey)}
                .disabled=${!options.hasResidentKey || !isCtap2}>
          </div>
          <div class="authenticator-option">
            <div class="authenticator-option-label"></div>
            <devtools-button @click=${this.#handleAddAuthenticatorButton}
                id="add-authenticator"
                .jslogContext=${'webauthn.add-authenticator'}
                .variant=${Buttons.Button.Variant.OUTLINED}>
              ${i18nString(UIStrings.add)}
            </devtools-button>
          </div>
        </div>
      </div>`;
    // clang-format on
  }

  async #addAuthenticatorSection(
      authenticatorId: Protocol.WebAuthn.AuthenticatorId,
      options: Protocol.WebAuthn.VirtualAuthenticatorOptions): Promise<HTMLDivElement> {
    const section = document.createElement('div');
    section.classList.add('authenticator-section');
    section.setAttribute('data-authenticator-id', authenticatorId);
    section.setAttribute('jslog', `${VisualLogging.section('authenticator')}`);
    this.#authenticatorsView.appendChild(section);
    await this.#clearActiveAuthenticator();
    this.#activeAuthId = authenticatorId;  // Newly added authenticator is automatically set as active.

    const userFriendlyName = authenticatorId.slice(-5);  // User friendly name defaults to last 5 chars of UUID.
    // clang-format off
    // eslint-disable-next-line rulesdir/no-lit-render-outside-of-view
    render(html`
      <div class="authenticator-section-header">
        <div class="authenticator-section-title" role="heading" aria-level="2">
          <devtools-toolbar class="edit-name-toolbar">
            <devtools-button title=${i18nString(UIStrings.editName)}
                class="edit-name"
                @click=${(e: Event) => this.#handleEditNameButton(e.target as HTMLElement)}
                .iconName=${'edit'} .variant=${Buttons.Button.Variant.TOOLBAR}
                .jslogContext=${'edit-name'}></devtools-button>
            <devtools-button title=${i18nString(UIStrings.saveName)}
                @click=${(e: Event) => this.#handleSaveNameButton(e.target as HTMLElement)}
                .iconName=${'checkmark'} .variant=${Buttons.Button.Variant.TOOLBAR}
                class="save-name hidden"
                .jslogContext=${'save-name'}></devtools-button>
          </devtools-toolbar>
          <input class="authenticator-name-field"
              placeholder=${i18nString(UIStrings.enterNewName)}
              jslog=${VisualLogging.textField('name').track({keydown: 'Enter', change: true})}
              value=${i18nString(UIStrings.authenticatorS, {PH1: userFriendlyName})} disabled
              @focusout=${(e: Event) => this.#handleSaveNameButton(e.target as HTMLElement)}
              @keydown=${(event: KeyboardEvent) => {
                if (event.key === 'Enter') {
                  this.#handleSaveNameButton(event.target as HTMLElement);
                }
              }}>
        </div>
        <div class="active-button-container">
          <label title=${i18nString(UIStrings.setSAsTheActiveAuthenticator, {PH1: userFriendlyName})}>
            <input type="radio" checked @change=${this.#setActiveAuthenticator.bind(this, authenticatorId)}
                  jslog=${VisualLogging.toggle('webauthn.active-authenticator').track({change: true})}>
            ${i18nString(UIStrings.active)}
          </label>
        </div>
        <button class="text-button" @click=${this.removeAuthenticator.bind(this, authenticatorId)}
            jslog=${VisualLogging.action('webauthn.remove-authenticator').track({click: true})}>
          ${i18nString(UIStrings.remove)}
        </button>
      </div>
      ${this.#renderAuthenticatorFields(authenticatorId, options)}
      <div class="credentials-title">${i18nString(UIStrings.credentials)}</div>
    `, section, {host: this});
    // clang-format on

    const dataGrid = this.#createCredentialsDataGrid(authenticatorId);
    dataGrid.asWidget().show(section);
    if (this.#model) {
      this.#model.addEventListener(
          SDK.WebAuthnModel.Events.CREDENTIAL_ADDED, this.#addCredential.bind(this, authenticatorId));
      this.#model.addEventListener(
          SDK.WebAuthnModel.Events.CREDENTIAL_ASSERTED, this.#updateCredential.bind(this, authenticatorId));
      this.#model.addEventListener(
          SDK.WebAuthnModel.Events.CREDENTIAL_UPDATED, this.#updateCredential.bind(this, authenticatorId));
      this.#model.addEventListener(
          SDK.WebAuthnModel.Events.CREDENTIAL_DELETED, this.#deleteCredential.bind(this, authenticatorId));
    }
    section.createChild('div', 'divider');

    return section;
  }

  /**
   * Creates the fields describing the authenticator in the front end.
   */
  #renderAuthenticatorFields(authenticatorId: string, options: Protocol.WebAuthn.VirtualAuthenticatorOptions):
      Lit.TemplateResult {
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
  }

  #activeAuthId: Protocol.WebAuthn.AuthenticatorId|null = null;
  #hasBeenEnabled = false;
  readonly dataGrids = new Map<Protocol.WebAuthn.AuthenticatorId, DataGrid.DataGrid.DataGridImpl<DataGridNode>>();
  #enableCheckbox!: HTMLInputElement;
  readonly #availableAuthenticatorSetting: Common.Settings.Setting<AvailableAuthenticatorOptions[]>;
  #model?: SDK.WebAuthnModel.WebAuthnModel;
  #authenticatorsView: HTMLElement;
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

  constructor() {
    super(true);
    this.registerRequiredCSS(webauthnPaneStyles);

    this.element.setAttribute('jslog', `${VisualLogging.panel('webauthn').track({resize: true})}`);

    SDK.TargetManager.TargetManager.instance().observeModels(SDK.WebAuthnModel.WebAuthnModel, this, {scoped: true});

    this.contentElement.classList.add('webauthn-pane');

    this.#availableAuthenticatorSetting =
        Common.Settings.Settings.instance().createSetting<AvailableAuthenticatorOptions[]>(
            'webauthn-authenticators', []);
    this.#updateInternalTransportAvailability();

    this.#authenticatorsView = this.contentElement.createChild('div', 'authenticators-view');
    this.performUpdate();
    this.#updateVisibility(false);
  }

  override performUpdate(): void {
    // eslint-disable-next-line rulesdir/no-lit-render-outside-of-view
    render(
        [
          this.#renderToolbar(), this.#authenticatorsView, this.#renderLearnMoreView(),
          this.#renderNewAuthenticatorSection()
        ],
        this.contentElement, {host: this});
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

      const authenticatorId = await this.#model.addAuthenticator(options);
      void this.#addAuthenticatorSection(authenticatorId, options);
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
    if (this.#enableCheckbox) {
      this.#enableCheckbox.checked = false;
    }
    await this.#setVirtualAuthEnvEnabled(false);
  }

  #addCredential(authenticatorId: Protocol.WebAuthn.AuthenticatorId, {
    data: event,
  }: Common.EventTarget.EventTargetEvent<Protocol.WebAuthn.CredentialAddedEvent>): void {
    const dataGrid = this.dataGrids.get(authenticatorId);
    if (!dataGrid) {
      return;
    }
    const emptyNode = dataGrid.rootNode().children.find(node => !Object.keys(node.data).length);
    if (emptyNode) {
      dataGrid.rootNode().removeChild(emptyNode);
    }
    const node = new DataGridNode(event.credential);
    dataGrid.rootNode().appendChild(node);
  }

  #updateCredential(
      authenticatorId: Protocol.WebAuthn.AuthenticatorId,
      {
        data: event,
      }: Common.EventTarget
          .EventTargetEvent<Protocol.WebAuthn.CredentialAssertedEvent&Protocol.WebAuthn.CredentialUpdatedEvent>): void {
    const dataGrid = this.dataGrids.get(authenticatorId);
    if (!dataGrid) {
      return;
    }
    const node = dataGrid.rootNode().children.find(node => node.data?.credentialId === event.credential.credentialId);
    if (!node) {
      return;
    }
    node.data = event.credential;
  }

  #deleteCredential(authenticatorId: Protocol.WebAuthn.AuthenticatorId, {
    data: event,
  }: Common.EventTarget.EventTargetEvent<Protocol.WebAuthn.CredentialDeletedEvent>): void {
    const dataGrid = this.dataGrids.get(authenticatorId);
    if (!dataGrid) {
      return;
    }
    const node = dataGrid.rootNode().children.find(node => node.data?.credentialId === event.credentialId);
    if (!node) {
      return;
    }
    node.remove();
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

      this.#updateVisibility(enable);
      this.#isEnabling = undefined;
      resolve();
    });
  }

  #updateVisibility(enabled: boolean): void {
    this.contentElement.classList.toggle('enabled', enabled);
  }

  #removeAuthenticatorSections(): void {
    this.#authenticatorsView.innerHTML = '';
    for (const dataGrid of this.dataGrids.values()) {
      dataGrid.asWidget().detach();
    }
    this.dataGrids.clear();
  }

  #handleCheckboxToggle(e: MouseEvent): void {
    void this.#setVirtualAuthEnvEnabled((e.target as HTMLInputElement).checked);
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
      const authenticatorId = await this.#model.addAuthenticator(options);
      const availableAuthenticators = this.#availableAuthenticatorSetting.get();
      availableAuthenticators.push({authenticatorId, active: true, ...options});
      this.#availableAuthenticatorSetting.set(
          availableAuthenticators.map(a => ({...a, active: a.authenticatorId === authenticatorId})));
      const section = await this.#addAuthenticatorSection(authenticatorId, options);
      const mediaQueryList = window.matchMedia('(prefers-reduced-motion: reduce)');
      const prefersReducedMotion = mediaQueryList.matches;
      section.scrollIntoView({block: 'start', behavior: prefersReducedMotion ? 'auto' : 'smooth'});
      this.#updateInternalTransportAvailability();
    }
  }

  #exportCredential(credential: Protocol.WebAuthn.Credential): void {
    let pem = PRIVATE_KEY_HEADER;
    for (let i = 0; i < credential.privateKey.length; i += 64) {
      pem += credential.privateKey.substring(i, i + 64) + '\n';
    }
    pem += PRIVATE_KEY_FOOTER;

    const link = document.createElement('a');
    link.download = i18nString(UIStrings.privateKeypem);
    link.href = 'data:application/x-pem-file,' + encodeURIComponent(pem);
    link.click();
  }

  #removeCredential(authenticatorId: Protocol.WebAuthn.AuthenticatorId, credentialId: string): void {
    const dataGrid = this.dataGrids.get(authenticatorId);
    if (!dataGrid) {
      return;
    }

    // @ts-expect-error dataGrid node type is indeterminate.
    dataGrid.rootNode()
        .children.find((n: DataGrid.DataGrid.DataGridNode<DataGridNode>) => n.data.credentialId === credentialId)
        .remove();

    if (!dataGrid.rootNode().children.length) {
      dataGrid.rootNode().appendChild(new EmptyDataGridNode());
    }

    if (this.#model) {
      void this.#model.removeCredential(authenticatorId, credentialId);
    }
  }

  #handleEditNameButton(target: HTMLElement): void {
    const titleElement = target.closest('.authenticator-section-title') as HTMLElement;
    const nameField = titleElement.querySelector('.authenticator-name-field') as HTMLInputElement;
    const editName = titleElement.querySelector('.edit-name') as Buttons.Button.Button;
    const saveName = titleElement.querySelector('.save-name') as Buttons.Button.Button;
    nameField.disabled = false;
    titleElement.classList.add('editing-name');
    nameField.focus();
    saveName.classList.remove('hidden');
    editName.classList.add('hidden');
  }

  #handleSaveNameButton(target: HTMLElement): void {
    const titleElement = target.closest('.authenticator-section-title') as HTMLElement;
    const nameField = titleElement.querySelector('.authenticator-name-field') as HTMLInputElement;
    const editName = titleElement.querySelector('.edit-name') as Buttons.Button.Button;
    const saveName = titleElement.querySelector('.save-name') as Buttons.Button.Button;
    const activeLabel = titleElement.querySelector('.active-button-container > label') as HTMLLabelElement;
    const name = nameField.value;
    if (!name) {
      return;
    }
    nameField.disabled = true;
    titleElement.classList.remove('editing-name');
    editName.classList.remove('hidden');
    saveName.classList.add('hidden');
    this.#updateActiveLabelTitle(activeLabel, name);
  }

  #updateActiveLabelTitle(activeLabel: HTMLLabelElement, authenticatorName: string): void {
    UI.Tooltip.Tooltip.install(
        activeLabel, i18nString(UIStrings.setSAsTheActiveAuthenticator, {PH1: authenticatorName}));
  }

  /**
   * Removes both the authenticator and its respective UI element.
   */
  removeAuthenticator(authenticatorId: Protocol.WebAuthn.AuthenticatorId): void {
    if (this.#authenticatorsView) {
      const child = this.#authenticatorsView.querySelector(`[data-authenticator-id=${CSS.escape(authenticatorId)}]`);
      if (child) {
        child.remove();
      }
    }
    const dataGrid = this.dataGrids.get(authenticatorId);
    if (dataGrid) {
      dataGrid.asWidget().detach();
      this.dataGrids.delete(authenticatorId);
    }

    if (this.#model) {
      void this.#model.removeAuthenticator(authenticatorId);
    }

    // Update available authenticator setting.
    const prevAvailableAuthenticators = this.#availableAuthenticatorSetting.get();
    const newAvailableAuthenticators = prevAvailableAuthenticators.filter(a => a.authenticatorId !== authenticatorId);
    this.#availableAuthenticatorSetting.set(newAvailableAuthenticators);

    if (this.#activeAuthId === authenticatorId) {
      const availableAuthenticatorIds = Array.from(this.dataGrids.keys());
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

    this.#updateActiveButtons();
  }

  #updateActiveButtons(): void {
    const authenticators = this.#authenticatorsView.getElementsByClassName('authenticator-section');
    Array.from(authenticators).forEach((authenticator: Element) => {
      const button = (authenticator.querySelector('input[type="radio"]') as HTMLInputElement);
      if (!button) {
        return;
      }
      button.checked = (authenticator as HTMLElement).dataset.authenticatorId === this.#activeAuthId;
    });
  }

  async #clearActiveAuthenticator(): Promise<void> {
    if (this.#activeAuthId && this.#model) {
      await this.#model.setAutomaticPresenceSimulation(this.#activeAuthId, false);
    }
    this.#activeAuthId = null;
    this.#updateActiveButtons();
  }
}
