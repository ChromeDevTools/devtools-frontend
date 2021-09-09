// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../../core/i18n/i18n.js';
import * as ComponentHelpers from '../../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';
import userAgentClientHintsFormStyles from './userAgentClientHintsForm.css.js';

import type * as Protocol from '../../../../generated/protocol.js';
import * as IconButton from '../../../../ui/components/icon_button/icon_button.js';
import type * as UI from '../../../../ui/legacy/legacy.js';
import * as EmulationUtils from '../utils/utils.js';

const UIStrings = {
  /**
    * @description Title for user agent client hints form
    */
  title: 'User agent client hints',
  /**
    * @description Heading for brands section.
    * Brands here relate to different browser brands/vendors like Google Chrome, Microsoft Edge etc.
    */
  brands: 'Brands',
  /**
    * @description ARIA label for a form with properties for a single brand in a brand list. The form includes a brand name input field, a version
    * input field and a delete icon. Brand refer to different browser brands/vendors like Google Chrome, Microsoft Edge etc.
    */
  brandProperties: 'Brand properties',
  /**
    * @description Input field placeholder for brands browser name.
    * Brands here relate to different browser brands/vendors like Google Chrome, Microsoft Edge etc.
    */
  brandName: 'Brand',
  /**
    * @description Aria label for brands browser name input field.
    * Brands here relate to different browser brands/vendors like Google Chrome, Microsoft Edge etc.
    * @example {index} PH1
    */
  brandNameAriaLabel: 'Brand {PH1}',
  /**
    * @description Input field placeholder for brands version.
    * Brands here relate to different browser brands/vendors like Google Chrome (v89), Microsoft Edge (v92) etc.
    */
  version: 'Version',
  /**
    * @description Aria label for brands browser version input field.
    * Brands here relate to different browser brands/vendors like Google Chrome, Microsoft Edge etc.
    * @example {index} PH1
    */
  brandVersionAriaLabel: 'Version {PH1}',
  /**
    * @description Button title for adding another brand in brands section to client hints.
    * Brands here relate to different browser brands/vendors like Google Chrome, Microsoft Edge etc.
    */
  addBrand: 'Add Brand',
  /**
    * @description Tooltip for delete icon for deleting browser brand in brands section.
    * Brands here relate to different browser brands/vendors like Google Chrome, Microsoft Edge etc.
    */
  deleteTooltip: 'Delete',
  /**
    * @description Aria label for delete icon for deleting browser brand in brands section.
    * Brands here relate to different browser brands/vendors like Google Chrome, Microsoft Edge etc.
    * @example {index} PH1
    */
  brandDeleteAriaLabel: 'Delete {PH1}',
  /**
    * @description Label for full browser version input field.
    */
  fullBrowserVersion: 'Full browser version',
  /**
    * @description Placeholder for full browser version input field.
    */
  fullBrowserVersionPlaceholder: 'Full browser version (e.g. 87.0.4280.88)',
  /**
    * @description Label for platform heading section, platform relates to OS like Android, Windows etc.
    */
  platformLabel: 'Platform',
  /**
    * @description Platform row, including platform name and platform version input field.
    */
  platformProperties: 'Platform properties',
  /**
    * @description Version for platform input field, platform relates to OS like Android, Windows etc.
    */
  platformVersion: 'Platform version',
  /**
    * @description Placeholder for platform name input field, platform relates to OS like Android, Windows etc.
    */
  platformPlaceholder: 'Platform (e.g. Android)',
  /**
    * @description Label for architecture (Eg: x86, x64, arm) input field.
    */
  architecture: 'Architecture',
  /**
    * @description Placeholder for architecture (Eg: x86, x64, arm) input field.
    */
  architecturePlaceholder: 'Architecture (e.g. x86)',
  /**
    * @description Device model row, including device model input field and mobile checkbox
    */
  deviceProperties: 'Device properties',
  /**
    * @description Label for Device Model input field.
    */
  deviceModel: 'Device model',
  /**
    * @description Label for Mobile phone checkbox.
    */
  mobileCheckboxLabel: 'Mobile',
  /**
    * @description Label for button to submit client hints form in DevTools.
    */
  update: 'Update',
  /**
    *@description Field Error message in the Device settings pane that shows that the entered value has characters that can't be represented in the corresponding User Agent Client Hints
    */
  notRepresentable: 'Not representable as structured headers string.',
  /**
    * @description Aria label for information link in user agent client hints form.
    */
  userAgentClientHintsInfo:
      'User agent client hints are an alternative to the user agent string that identify the browser and the device in a more structured way with better privacy accounting. Click the button to learn more.',
  /**
    * @description Success message when brand row is successfully added in client hints form.
    * Brands here relate to different browser brands/vendors like Google Chrome, Microsoft Edge etc.
    */
  addedBrand: 'Added brand row',
  /**
    * @description Success message when brand row is successfully deleted in client hints form.
    * Brands here relate to different browser brands/vendors like Google Chrome, Microsoft Edge etc.
    */
  deletedBrand: 'Deleted brand row',
};
const str_ = i18n.i18n.registerUIStrings('panels/settings/emulation/components/UserAgentClientHintsForm.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class ClientHintsChangeEvent extends Event {
  static readonly eventName = 'clienthintschange';
  constructor() {
    super(ClientHintsChangeEvent.eventName);
  }
}

export class ClientHintsSubmitEvent extends Event {
  static readonly eventName = 'clienthintssubmit';
  detail: {value: Protocol.Emulation.UserAgentMetadata};

  constructor(value: Protocol.Emulation.UserAgentMetadata) {
    super(ClientHintsSubmitEvent.eventName);
    this.detail = {value};
  }
}

export interface UserAgentClientHintsFormData {
  metaData?: Protocol.Emulation.UserAgentMetadata;
  showMobileCheckbox?: boolean;
  showSubmitButton?: boolean;
}

const DEFAULT_METADATA = {
  brands: [
    {
      brand: '',
      version: '',
    },
  ],
  fullVersion: '',
  platform: '',
  platformVersion: '',
  architecture: '',
  model: '',
  mobile: false,
};

/**
 * Component for user agent client hints form, it is used in device settings panel
 * and network conditions panel. It is customizable through showMobileCheckbox and showSubmitButton.
 */
// eslint-disable-next-line rulesdir/custom_element_definitions_location
export class UserAgentClientHintsForm extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-user-agent-client-hints-form`;
  private readonly shadow = this.attachShadow({mode: 'open'});

  private isFormOpened: boolean = false;
  private isFormDisabled: boolean = false;
  private metaData: Protocol.Emulation.UserAgentMetadata = DEFAULT_METADATA;
  private showMobileCheckbox: boolean = false;
  private showSubmitButton: boolean = false;
  private brandsModifiedAriaMessage: string = '';

  connectedCallback(): void {
    this.shadow.adoptedStyleSheets = [userAgentClientHintsFormStyles];
  }

  set value(data: UserAgentClientHintsFormData) {
    const {metaData = DEFAULT_METADATA, showMobileCheckbox = false, showSubmitButton = false} = data;
    this.metaData = {
      ...this.metaData,
      ...metaData,
    };
    this.showMobileCheckbox = showMobileCheckbox;
    this.showSubmitButton = showSubmitButton;
    this.render();
  }

  get value(): UserAgentClientHintsFormData {
    return {
      metaData: this.metaData,
    };
  }

  set disabled(disableForm: boolean) {
    this.isFormDisabled = disableForm;
    this.isFormOpened = false;
    this.render();
  }

  get disabled(): boolean {
    return this.isFormDisabled;
  }

  private handleTreeExpand = (event: KeyboardEvent): void => {
    if (event.code === 'Space' || event.code === 'Enter') {
      event.stopPropagation();
      this.handleTreeClick();
    }
  };

  private handleTreeClick = (): void => {
    if (this.isFormDisabled) {
      return;
    }
    this.isFormOpened = !this.isFormOpened;
    this.render();
  };

  private handleBrandInputChange = (value: string, index: number, brandInputType: 'brandName'|'brandVersion'): void => {
    const updatedBrands = this.metaData.brands?.map((browserBrand, brandIndex) => {
      if (brandIndex === index) {
        const {brand, version} = browserBrand;
        if (brandInputType === 'brandName') {
          return {
            brand: value,
            version,
          };
        }
        return {
          brand,
          version: value,
        };
      }
      return browserBrand;
    });
    this.metaData = {
      ...this.metaData,
      brands: updatedBrands,
    };
    this.dispatchEvent(new ClientHintsChangeEvent());
    this.render();
  };

  private handleBrandDelete = (index: number): void => {
    const {brands = []} = this.metaData;
    brands.splice(index, 1);
    this.metaData = {
      ...this.metaData,
      brands,
    };
    this.dispatchEvent(new ClientHintsChangeEvent());
    this.brandsModifiedAriaMessage = i18nString(UIStrings.deletedBrand);
    this.render();
  };

  private handleAddBrandClick = (): void => {
    const {brands} = this.metaData;
    this.metaData = {
      ...this.metaData,
      brands: [
        ...(Array.isArray(brands) ? brands : []),
        {
          brand: '',
          version: '',
        },
      ],
    };
    this.dispatchEvent(new ClientHintsChangeEvent());
    this.brandsModifiedAriaMessage = i18nString(UIStrings.addedBrand);
    this.render();
    const brandInputElements = this.shadowRoot?.querySelectorAll('.brand-name-input');
    if (brandInputElements) {
      const lastBrandInputElement = Array.from(brandInputElements).pop();
      if (lastBrandInputElement) {
        (lastBrandInputElement as HTMLInputElement).focus();
      }
    }
  };

  private handleAddBrandKeyPress = (event: KeyboardEvent): void => {
    if (event.code === 'Space' || event.code === 'Enter') {
      event.preventDefault();
      this.handleAddBrandClick();
    }
  };

  private handleInputChange = (stateKey: keyof Protocol.Emulation.UserAgentMetadata, value: string|boolean): void => {
    if (stateKey in this.metaData) {
      this.metaData = {
        ...this.metaData,
        [stateKey]: value,
      };
      this.render();
    }
    this.dispatchEvent(new ClientHintsChangeEvent());
  };

  private handleLinkPress = (event: KeyboardEvent): void => {
    if (event.code === 'Space' || event.code === 'Enter') {
      event.preventDefault();
      (event.target as HTMLAnchorElement).click();
    }
  };

  private handleSubmit = (event: Event): void => {
    event.preventDefault();
    if (this.showSubmitButton) {
      this.dispatchEvent(new ClientHintsSubmitEvent(this.metaData));
      this.render();
    }
  };

  private renderInputWithLabel(
      label: string, placeholder: string, value: string,
      stateKey: keyof Protocol.Emulation.UserAgentMetadata): LitHtml.TemplateResult {
    const handleInputChange = (event: KeyboardEvent): void => {
      const value = (event.target as HTMLInputElement).value;
      this.handleInputChange(stateKey, value);
    };
    return LitHtml.html`
      <label class="full-row label input-field-label-container">
        ${label}
        <input
          class="input-field"
          type="text"
          @input="${handleInputChange}"
          .value="${value}"
          placeholder="${placeholder}"
        />
      </label>
    `;
  }

  private renderPlatformSection(): LitHtml.TemplateResult {
    const {platform, platformVersion} = this.metaData;
    const handlePlatformNameChange = (event: KeyboardEvent): void => {
      const value = (event.target as HTMLInputElement).value;
      this.handleInputChange('platform', value);
    };
    const handlePlatformVersionChange = (event: KeyboardEvent): void => {
      const value = (event.target as HTMLInputElement).value;
      this.handleInputChange('platformVersion', value);
    };
    return LitHtml.html`
      <span class="full-row label">${i18nString(UIStrings.platformLabel)}</span>
      <div class="full-row brand-row" aria-label="${i18nString(UIStrings.platformProperties)}" role="group">
        <input
          class="input-field half-row"
          type="text"
          @input="${handlePlatformNameChange}"
          .value="${platform}"
          placeholder="${i18nString(UIStrings.platformPlaceholder)}"
          aria-label="${i18nString(UIStrings.platformLabel)}"
        />
        <input
          class="input-field half-row"
          type="text"
          @input="${handlePlatformVersionChange}"
          .value="${platformVersion}"
          placeholder="${i18nString(UIStrings.platformVersion)}"
          aria-label="${i18nString(UIStrings.platformVersion)}"
        />
      </div>
    `;
  }

  private renderDeviceModelSection(): LitHtml.TemplateResult {
    const {model, mobile} = this.metaData;
    const handleDeviceModelChange = (event: KeyboardEvent): void => {
      const value = (event.target as HTMLInputElement).value;
      this.handleInputChange('model', value);
    };
    const handleMobileChange = (event: KeyboardEvent): void => {
      const value = (event.target as HTMLInputElement).checked;
      this.handleInputChange('mobile', value);
    };
    const mobileCheckboxInput = this.showMobileCheckbox ? LitHtml.html`
      <label class="mobile-checkbox-container">
        <input type="checkbox" @input="${handleMobileChange}" .checked="${mobile}" />
        ${i18nString(UIStrings.mobileCheckboxLabel)}
      </label>
    ` :
                                                          LitHtml.html``;
    return LitHtml.html`
      <span class="full-row label">${i18nString(UIStrings.deviceModel)}</span>
      <div class="full-row brand-row" aria-label="${i18nString(UIStrings.deviceProperties)}" role="group">
        <input
          class="input-field ${this.showMobileCheckbox ? 'device-model-input' : 'full-row'}"
          type="text"
          @input="${handleDeviceModelChange}"
          .value="${model}"
          placeholder="${i18nString(UIStrings.deviceModel)}"
        />
        ${mobileCheckboxInput}
      </div>
    `;
  }

  private renderBrands(): LitHtml.TemplateResult {
    const {
      brands =
          [
            {
              brand: '',
              version: '',
            },
          ],
    } = this.metaData;
    const brandElements = brands.map((brandRow, index) => {
      const {brand, version} = brandRow;
      const handleDeleteClick = (): void => {
        this.handleBrandDelete(index);
      };
      const handleKeyPress = (event: KeyboardEvent): void => {
        if (event.code === 'Space' || event.code === 'Enter') {
          event.preventDefault();
          handleDeleteClick();
        }
      };
      const handleBrandBrowserChange = (event: KeyboardEvent): void => {
        const value = (event.target as HTMLInputElement).value;
        this.handleBrandInputChange(value, index, 'brandName');
      };
      const handleBrandVersionChange = (event: KeyboardEvent): void => {
        const value = (event.target as HTMLInputElement).value;
        this.handleBrandInputChange(value, index, 'brandVersion');
      };
      return LitHtml.html`
        <div class="full-row brand-row" aria-label="${i18nString(UIStrings.brandProperties)}" role="group">
          <input
            class="input-field brand-name-input"
            type="text"
            @input="${handleBrandBrowserChange}"
            .value="${brand}"
            placeholder="${i18nString(UIStrings.brandName)}"
            aria-label="${i18nString(UIStrings.brandNameAriaLabel, {
        PH1: index + 1,
      })}"
          />
          <input
            class="input-field"
            type="text"
            @input="${handleBrandVersionChange}"
            .value="${version}"
            placeholder="${i18nString(UIStrings.version)}"
            aria-label="${i18nString(UIStrings.brandVersionAriaLabel, {
        PH1: index + 1,
      })}"
          />
          <${IconButton.Icon.Icon.litTagName}
            .data=${
          {color: 'var(--client-hints-form-icon-color)', iconName: 'trash_bin_icon', width: '10px', height: '14px'} as
          IconButton.Icon.IconData}
            title="${i18nString(UIStrings.deleteTooltip)}"
            class="delete-icon"
            tabindex="0"
            role="button"
            @click="${handleDeleteClick}"
            @keypress="${handleKeyPress}"
            aria-label="${i18nString(UIStrings.brandDeleteAriaLabel, {
        PH1: index + 1,
      })}"
          >
          </${IconButton.Icon.Icon.litTagName}>
        </div>
      `;
    });
    return LitHtml.html`
      <span class="full-row label">${i18nString(UIStrings.brands)}</span>
      ${brandElements}
      <div
        class="add-container full-row"
        role="button"
        tabindex="0"
        @click="${this.handleAddBrandClick}"
        @keypress="${this.handleAddBrandKeyPress}"
      >
        <${IconButton.Icon.Icon.litTagName}
          aria-hidden="true"
          .data=${
        {color: 'var(--client-hints-form-icon-color)', iconName: 'add-icon', width: '10px'} as IconButton.Icon.IconData}
        >
        </${IconButton.Icon.Icon.litTagName}>
        ${i18nString(UIStrings.addBrand)}
      </div>
    `;
  }

  private render(): void {
    const {fullVersion, architecture} = this.metaData;
    const brandSection = this.renderBrands();
    const fullBrowserInput = this.renderInputWithLabel(
        i18nString(UIStrings.fullBrowserVersion), i18nString(UIStrings.fullBrowserVersionPlaceholder),
        fullVersion || '', 'fullVersion');
    const platformSection = this.renderPlatformSection();
    const architectureInput = this.renderInputWithLabel(
        i18nString(UIStrings.architecture), i18nString(UIStrings.architecturePlaceholder), architecture,
        'architecture');
    const deviceModelSection = this.renderDeviceModelSection();
    const submitButton = this.showSubmitButton ? LitHtml.html`
      <button
        type="submit"
        class="submit-button full-row"
      >
        ${i18nString(UIStrings.update)}
      </button>
    ` :
                                                 LitHtml.html``;
    const output = LitHtml.html`
      <section class="root">
        <div
          class="tree-title"
          role="button"
          @click="${this.handleTreeClick}"
          tabindex="0"
          @keydown="${this.handleTreeExpand}"
          aria-expanded="${this.isFormOpened}"
          aria-controls="form-container"
          @disabled="${this.isFormDisabled}"
          aria-disabled="${this.isFormDisabled}"
        >
          <${IconButton.Icon.Icon.litTagName}
            class="${this.isFormOpened ? '' : 'rotate-icon'}"
            .data=${
        {color: 'var(--client-hints-form-icon-color)', iconName: 'chromeSelect', width: '20px'} as
        IconButton.Icon.IconData}
          >
          </${IconButton.Icon.Icon.litTagName}>
          ${i18nString(UIStrings.title)}
          <x-link
           tabindex="0"
           href="https://web.dev/user-agent-client-hints/"
           target="_blank"
           class="info-link"
           @keypress="${this.handleLinkPress}"
           aria-label="${i18nString(UIStrings.userAgentClientHintsInfo)}"
          >
            <${IconButton.Icon.Icon.litTagName}
              .data=${
        {color: 'var(--client-hints-form-icon-color)', iconName: 'ic_info_black_18dp', width: '14px'} as
        IconButton.Icon.IconData}
            >
            </${IconButton.Icon.Icon.litTagName}>
          </x-link>
        </div>
        <form
          id="form-container"
          class="form-container ${this.isFormOpened ? '' : 'hide-container'}"
          @submit="${this.handleSubmit}"
        >
          ${brandSection}
          ${fullBrowserInput}
          ${platformSection}
          ${architectureInput}
          ${deviceModelSection}
          ${submitButton}
        </form>
        <div aria-live="polite" aria-label="${this.brandsModifiedAriaMessage}"></div>
      </section>
    `;
    // clang-format off
    LitHtml.render(output, this.shadow, {host: this});
    // clang-format on
  }

  validate = (): UI.ListWidget.ValidatorResult => {
    for (const [metaDataKey, metaDataValue] of Object.entries(this.metaData)) {
      if (metaDataKey === 'brands') {
        const isBrandValid = this.metaData.brands?.every(({brand, version}) => {
          const brandNameResult = EmulationUtils.UserAgentMetadata.validateAsStructuredHeadersString(
              brand, i18nString(UIStrings.notRepresentable));
          const brandVersionResult = EmulationUtils.UserAgentMetadata.validateAsStructuredHeadersString(
              version, i18nString(UIStrings.notRepresentable));
          return brandNameResult.valid && brandVersionResult.valid;
        });
        if (!isBrandValid) {
          return {valid: false, errorMessage: i18nString(UIStrings.notRepresentable)};
        }
      } else {
        const metaDataError = EmulationUtils.UserAgentMetadata.validateAsStructuredHeadersString(
            metaDataValue, i18nString(UIStrings.notRepresentable));
        if (!metaDataError.valid) {
          return metaDataError;
        }
      }
    }
    return {valid: true};
  };
}

ComponentHelpers.CustomElements.defineComponent('devtools-user-agent-client-hints-form', UserAgentClientHintsForm);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-user-agent-client-hints-form': UserAgentClientHintsForm;
  }
}
