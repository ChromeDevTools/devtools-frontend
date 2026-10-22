// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../../ui/kit/kit.js';

import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import type * as Protocol from '../../../../generated/protocol.js';
import * as Buttons from '../../../../ui/components/buttons/buttons.js';
import * as Input from '../../../../ui/components/input/input.js';
import * as UI from '../../../../ui/legacy/legacy.js';
import * as Lit from '../../../../ui/lit/lit.js';
import * as VisualLogging from '../../../../ui/visual_logging/visual_logging.js';
import * as EmulationUtils from '../utils/utils.js';

import userAgentClientHintsFormStyles from './userAgentClientHintsForm.css.js';

const {html, Directives: {ref}} = Lit;

const UIStrings = {
  /**
   * @description Title for user agent client hints form.
   */
  title: 'User agent client hints',
  /**
   * @description Heading for user agent section.
   * Brands here relate to different browser brands/vendors like Google Chrome, Microsoft Edge, etc.
   */
  useragent: 'User agent (Sec-CH-UA)',
  /**
   * @description Heading for full-version-list section.
   */
  fullVersionList: 'Full version list (Sec-CH-UA-Full-Version-List)',
  /**
   * @description ARIA label for a form with properties for a single brand in a brand list. The form includes a brand name input field, a version
   * input field and a delete icon. Brands refer to different browser brands/vendors like Google Chrome, Microsoft Edge, etc.
   */
  brandProperties: 'User agent properties',
  /**
   * @description Input field placeholder for brand's browser name.
   * Brands here relate to different browser brands/vendors like Google Chrome, Microsoft Edge, etc.
   */
  brandName: 'Brand',
  /**
   * @description ARIA label for brand's browser name input field.
   * Brands here relate to different browser brands/vendors like Google Chrome, Microsoft Edge, etc.
   * @example {index} PH1
   */
  brandNameAriaLabel: 'Brand {PH1}',
  /**
   * @description Input field placeholder for significant brand version.
   * Brands here relate to different browser brands/vendors like Google Chrome (v89), Microsoft Edge (v92), etc.
   */
  significantBrandVersionPlaceholder: 'Significant version (e.g. 87)',
  /**
   * @description Input field placeholder for brand version.
   * Brands here relate to different browser brands/vendors like Google Chrome (v89), Microsoft Edge (v92), etc.
   */
  brandVersionPlaceholder: 'Version (e.g. 87.0.4280.88)',
  /**
   * @description ARIA label for brand's browser version input field.
   * Brands here relate to different browser brands/vendors like Google Chrome, Microsoft Edge, etc.
   * @example {index} PH1
   */
  brandVersionAriaLabel: 'Version {PH1}',
  /**
   * @description Button title for adding another brand in brands section to client hints.
   * Brands here relate to different browser brands/vendors like Google Chrome, Microsoft Edge, etc.
   */
  addBrand: 'Add brand',
  /**
   * @description Tooltip and ARIA label for delete icon for deleting browser brand from brands user agent section.
   * Brands here relate to different browser brands/vendors like Google Chrome, Microsoft Edge, etc.
   */
  brandUserAgentDelete: 'Delete brand from user agent section',
  /**
   * @description Tooltip and ARIA label for delete icon for deleting user agent from brands full version list.
   * Brands here relate to different browser brands/vendors like Google Chrome, Microsoft Edge, etc.
   */
  brandFullVersionListDelete: 'Delete brand from full version list',

  /**
   * @description Heading for the form factors section.
   */
  formFactorsTitle: 'Form factors (Sec-CH-UA-Form-Factors)',
  /**
   * @description ARIA label for the group of form factor checkboxes.
   */
  formFactorsGroupAriaLabel: 'Available form factors',
  /**
   * @description Form factor option: Desktop.
   */
  formFactorDesktop: 'Desktop',
  /**
   * @description Form factor option: Automotive.
   */
  formFactorAutomotive: 'Automotive',
  /**
   * @description Form factor option: Mobile.
   */
  formFactorMobile: 'Mobile',
  /**
   * @description Form factor option: Tablet.
   */
  formFactorTablet: 'Tablet',
  /**
   * @description Form factor option: XR.
   */
  formFactorXR: 'XR',
  /**
   * @description Form factor option: EInk.
   */
  formFactorEInk: 'EInk',
  /**
   * @description Form factor option: Watch.
   */
  formFactorWatch: 'Watch',

  /**
   * @description Label for full browser version input field.
   */
  fullBrowserVersion: 'Full browser version (Sec-CH-UA-Full-Version)',
  /**
   * @description Placeholder for full browser version input field.
   */
  fullBrowserVersionPlaceholder: 'Full browser version (e.g. 87.0.4280.88)',
  /**
   * @description Label for platform heading section. Platform relates to OS like Android, Windows, etc.
   */
  platformLabel: 'Platform (Sec-CH-UA-Platform / Sec-CH-UA-Platform-Version)',
  /**
   * @description Platform row, including platform name and platform version input field.
   */
  platformProperties: 'Platform properties',
  /**
   * @description Version for platform input field. Platform relates to OS like Android, Windows, etc.
   */
  platformVersion: 'Platform version',
  /**
   * @description Placeholder for platform name input field. Platform relates to OS like Android, Windows, etc.
   */
  platformPlaceholder: 'Platform (e.g. Android)',
  /**
   * @description Label for architecture (e.g., x86, x64, arm) input field.
   */
  architecture: 'Architecture (Sec-CH-UA-Arch)',
  /**
   * @description Placeholder for architecture (e.g., x86, x64, arm) input field.
   */
  architecturePlaceholder: 'Architecture (e.g. x86)',
  /**
   * @description Device model row, including device model input field and mobile checkbox.
   */
  deviceProperties: 'Device properties',
  /**
   * @description Label for device model input field.
   */
  deviceModel: 'Device model (Sec-CH-UA-Model)',
  /**
   * @description Label for mobile phone checkbox.
   */
  mobileCheckboxLabel: 'Mobile',
  /**
   * @description Label for button to submit client hints form in DevTools.
   */
  update: 'Update',
  /**
   * @description Field error message in the Devices settings tab that shows that the entered value has characters that can't be represented in the corresponding user agent client hints.
   */
  notRepresentable: 'Not representable as structured headers string',
  /**
   * @description Hover text for info icon which explains user agent client hints.
   */
  userAgentClientHintsInfo:
      'User agent client hints are an alternative to the user agent string that identify the browser and the device in a more structured way with better privacy accounting',
  /**
   * @description Success message when brand row is successfully added in client hints form.
   * Brands here relate to different browser brands/vendors like Google Chrome, Microsoft Edge, etc.
   */
  addedBrand: 'Added brand row',
  /**
   * @description Success message when brand row is successfully deleted in client hints form.
   * Brands here relate to different browser brands/vendors like Google Chrome, Microsoft Edge, etc.
   */
  deletedBrand: 'Deleted brand row',
  /**
   * @description Text that is usually a hyperlink to more documentation.
   */
  learnMore: 'Learn more',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/settings/emulation/components/UserAgentClientHintsForm.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export const enum Events {
  CLIENT_HINTS_CHANGE = 'clienthintschange',
  CLIENT_HINTS_SUBMIT = 'clienthintssubmit',
}

export interface EventTypes {
  [Events.CLIENT_HINTS_CHANGE]: Protocol.Emulation.UserAgentMetadata;
  [Events.CLIENT_HINTS_SUBMIT]: Protocol.Emulation.UserAgentMetadata;
}

declare global {
  interface HTMLElementEventMap {
    [Events.CLIENT_HINTS_CHANGE]: CustomEvent<Protocol.Emulation.UserAgentMetadata>;
    [Events.CLIENT_HINTS_SUBMIT]: CustomEvent<Protocol.Emulation.UserAgentMetadata>;
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
  fullVersionList: [
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
  formFactors: [],
};

export const ALL_PROTOCOL_FORM_FACTORS: string[] = [
  UIStrings.formFactorDesktop,
  UIStrings.formFactorAutomotive,
  UIStrings.formFactorMobile,
  UIStrings.formFactorTablet,
  UIStrings.formFactorXR,
  UIStrings.formFactorEInk,
  UIStrings.formFactorWatch,
] as const;

type BrandList = 'brands'|'fullVersionList';
type BrandInputType = 'brandName'|'brandVersion';
type TextField = 'fullVersion'|'platform'|'platformVersion'|'architecture'|'model';

export interface BrandRow {
  brand: string;
  version: string;
}

const BRAND_INPUT_ID_PREFIXES: Record<BrandList, string> = {
  brands: 'ua',
  fullVersionList: 'fvl',
};

const ADD_BRAND_BUTTON_IDS: Record<BrandList, string> = {
  brands: 'add-brand-button',
  fullVersionList: 'add-fvl-brand-button',
};

export interface ViewInput {
  brands: BrandRow[];
  fullVersionList: BrandRow[];
  fullVersion: string;
  formFactors: string[];
  platform: string;
  platformVersion: string;
  architecture: string;
  model: string;
  mobile: boolean;
  isFormOpened: boolean;
  isFormDisabled: boolean;
  showMobileCheckbox: boolean;
  showSubmitButton: boolean;
  useragentModifiedAriaMessage: string;
  onTreeToggle: (key?: string) => void;
  onBrandAdd: (list: BrandList) => void;
  onBrandDelete: (list: BrandList, index: number) => void;
  onBrandInputChange: (list: BrandList, index: number, brandInputType: BrandInputType, value: string) => void;
  onTextFieldChange: (field: TextField, value: string) => void;
  onMobileChange: (mobile: boolean) => void;
  onFormFactorChange: (formFactor: string, isChecked: boolean) => void;
  onSubmit: () => void;
}

export interface ViewOutput {
  focusBrandInput?: (list: BrandList, index: number) => void;
  focusAddBrandButton?: (list: BrandList) => void;
}

type View = typeof DEFAULT_VIEW;

const UserAgentClientHintsFormBase: Common.ObjectWrapper.EventMixin<EventTypes, typeof UI.Widget.Widget> =
    Common.ObjectWrapper.eventMixin(UI.Widget.Widget);

/**
 * Component for user agent client hints form, it is used in device settings panel
 * and network conditions panel. It is customizable through showMobileCheckbox and showSubmitButton.
 *
 * The form dispatches {@link Events.CLIENT_HINTS_CHANGE} when the user changes
 * a value, and {@link Events.CLIENT_HINTS_SUBMIT} when the user submits the
 * form. The widget element also dispatches each event as a DOM `CustomEvent`
 * with the metadata in `detail`.
 */
export class UserAgentClientHintsForm extends UserAgentClientHintsFormBase {
  readonly #view: View;
  readonly #viewOutput: ViewOutput = {};

  #isFormOpened = false;
  #isFormDisabled = false;
  #metaData: Protocol.Emulation.UserAgentMetadata = DEFAULT_METADATA;
  #showMobileCheckbox = false;
  #showSubmitButton = false;
  #useragentModifiedAriaMessage = '';

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element);
    this.#view = view;
  }

  set value(data: UserAgentClientHintsFormData) {
    const {metaData = DEFAULT_METADATA, showMobileCheckbox = false, showSubmitButton = false} = data;
    this.#metaData = {
      ...this.#metaData,
      ...metaData,
    };
    this.#showMobileCheckbox = showMobileCheckbox;
    this.#showSubmitButton = showSubmitButton;
    this.requestUpdate();
  }

  get value(): UserAgentClientHintsFormData {
    return {
      metaData: this.#metaData,
    };
  }

  set disabled(disableForm: boolean) {
    if (this.#isFormDisabled === disableForm) {
      return;
    }
    this.#isFormDisabled = disableForm;
    if (disableForm) {
      this.#isFormOpened = false;
    }
    this.requestUpdate();
  }

  get disabled(): boolean {
    return this.#isFormDisabled;
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
  }

  #handleTreeClick = (key?: string): void => {
    if (this.#isFormDisabled) {
      return;
    }
    if ((key === 'ArrowLeft' && !this.#isFormOpened) || (key === 'ArrowRight' && this.#isFormOpened)) {
      return;
    }
    this.#isFormOpened = !this.#isFormOpened;
    this.requestUpdate();
  };

  #handleBrandInputChange = (list: BrandList, index: number, brandInputType: BrandInputType, value: string): void => {
    const updatedBrands = this.#metaData[list]?.map((browserBrand, brandIndex) => {
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
    this.#metaData = {
      ...this.#metaData,
      [list]: updatedBrands,
    };
    this.dispatchEventToListeners(Events.CLIENT_HINTS_CHANGE, this.#metaData);
    this.requestUpdate();
  };

  #handleBrandDelete = async(list: BrandList, index: number): Promise<void> => {
    const {[list]: brands = []} = this.#metaData;
    const updatedBrands = brands.filter((_, brandIndex) => brandIndex !== index);
    this.#metaData = {
      ...this.#metaData,
      [list]: updatedBrands,
    };
    this.dispatchEventToListeners(Events.CLIENT_HINTS_CHANGE, this.#metaData);
    this.#useragentModifiedAriaMessage = i18nString(UIStrings.deletedBrand);
    this.requestUpdate();
    await this.updateComplete;

    // after deleting a brand row, focus on next Brand input if available,
    // otherwise focus on the "Add Brand" button
    if (index < updatedBrands.length) {
      this.#viewOutput.focusBrandInput?.(list, index);
    } else {
      this.#viewOutput.focusAddBrandButton?.(list);
    }
  };

  #handleBrandAdd = async(list: BrandList): Promise<void> => {
    const {[list]: brands} = this.#metaData;
    const updatedBrands = [
      ...(Array.isArray(brands) ? brands : []),
      {
        brand: '',
        version: '',
      },
    ];
    this.#metaData = {
      ...this.#metaData,
      [list]: updatedBrands,
    };
    this.dispatchEventToListeners(Events.CLIENT_HINTS_CHANGE, this.#metaData);
    this.#useragentModifiedAriaMessage = i18nString(UIStrings.addedBrand);
    this.requestUpdate();
    await this.updateComplete;
    this.#viewOutput.focusBrandInput?.(list, updatedBrands.length - 1);
  };

  #handleFormFactorCheckboxChange = (formFactorValue: string, isChecked: boolean): void => {
    let currentFormFactors = [...(this.#metaData.formFactors || [])];
    if (isChecked) {
      if (!currentFormFactors.includes(formFactorValue)) {
        currentFormFactors.push(formFactorValue);
      }
    } else {
      currentFormFactors = currentFormFactors.filter(ff => ff !== formFactorValue);
    }
    this.#metaData = {
      ...this.#metaData,
      formFactors: currentFormFactors,
    };
    this.dispatchEventToListeners(Events.CLIENT_HINTS_CHANGE, this.#metaData);
    this.requestUpdate();
  };

  #handleInputChange = (stateKey: keyof Protocol.Emulation.UserAgentMetadata, value: string|boolean): void => {
    if (stateKey in this.#metaData) {
      this.#metaData = {
        ...this.#metaData,
        [stateKey]: value,
      };
      this.requestUpdate();
    }
    this.dispatchEventToListeners(Events.CLIENT_HINTS_CHANGE, this.#metaData);
  };

  #handleSubmit = (): void => {
    if (this.#showSubmitButton) {
      this.dispatchEventToListeners(Events.CLIENT_HINTS_SUBMIT, this.#metaData);
      this.requestUpdate();
    }
  };

  validate = (): UI.ListWidget.ValidatorResult => {
    for (const [metaDataKey, metaDataValue] of Object.entries(this.#metaData)) {
      if (metaDataKey === 'brands' || metaDataKey === 'fullVersionList') {
        // for structured fields, check each individual brand/version
        const brandList = metaDataValue as Protocol.Emulation.UserAgentBrandVersion[] | undefined;
        const isBrandValid = (brandList ?? []).every(({brand, version}) => {
          const brandNameResult = EmulationUtils.UserAgentMetadata.validateAsStructuredHeadersString(
              brand, i18nString(UIStrings.notRepresentable));
          const brandVersionResult = EmulationUtils.UserAgentMetadata.validateAsStructuredHeadersString(
              version, i18nString(UIStrings.notRepresentable));
          return brandNameResult.valid && brandVersionResult.valid;
        });
        if (!isBrandValid) {
          return {valid: false, errorMessage: i18nString(UIStrings.notRepresentable)};
        }
      } else if (metaDataKey === 'formFactors') {
        const formFactors = metaDataValue as string[] | undefined;
        if (formFactors) {
          for (const ff of formFactors) {
            if (!ALL_PROTOCOL_FORM_FACTORS.includes(ff)) {
              return {
                valid: false,
                errorMessage: i18nString(UIStrings.notRepresentable) + ` (Invalid form factor: ${ff})`,
              };
            }
            const ffError = EmulationUtils.UserAgentMetadata.validateAsStructuredHeadersString(
                ff, i18nString(UIStrings.notRepresentable));
            if (!ffError.valid) {
              return ffError;
            }
          }
        }
      } else {
        // otherwise, validate the value as a string
        const metaDataError = EmulationUtils.UserAgentMetadata.validateAsStructuredHeadersString(
            metaDataValue, i18nString(UIStrings.notRepresentable));
        if (!metaDataError.valid) {
          return metaDataError;
        }
      }
    }
    return {valid: true};
  };

  override performUpdate(): void {
    const input: ViewInput = {
      brands: this.#metaData.brands ?? [{brand: '', version: ''}],
      fullVersionList: this.#metaData.fullVersionList ?? [{brand: '', version: ''}],
      fullVersion: this.#metaData.fullVersion || '',
      formFactors: this.#metaData.formFactors ?? [],
      platform: this.#metaData.platform,
      platformVersion: this.#metaData.platformVersion,
      architecture: this.#metaData.architecture,
      model: this.#metaData.model,
      mobile: this.#metaData.mobile,
      isFormOpened: this.#isFormOpened,
      isFormDisabled: this.#isFormDisabled,
      showMobileCheckbox: this.#showMobileCheckbox,
      showSubmitButton: this.#showSubmitButton,
      useragentModifiedAriaMessage: this.#useragentModifiedAriaMessage,
      onTreeToggle: this.#handleTreeClick,
      onBrandAdd: list => void this.#handleBrandAdd(list),
      onBrandDelete: (list, index) => void this.#handleBrandDelete(list, index),
      onBrandInputChange: this.#handleBrandInputChange,
      onTextFieldChange: this.#handleInputChange,
      onMobileChange: mobile => this.#handleInputChange('mobile', mobile),
      onFormFactorChange: this.#handleFormFactorCheckboxChange,
      onSubmit: this.#handleSubmit,
    };
    this.#view(input, this.#viewOutput, this.contentElement);
  }
}

export const DEFAULT_VIEW = (input: ViewInput, output: ViewOutput, target: HTMLElement): void => {
  const renderInputWithLabel = (label: string, placeholder: string, value: string,
                                stateKey: TextField): Lit.TemplateResult => {
    const handleInputChange = (event: KeyboardEvent): void => {
      const value = (event.target as HTMLInputElement).value;
      input.onTextFieldChange(stateKey, value);
    };
    return html`
      <label class="full-row label input-field-label-container">
        ${label}
        <input
          class="input-field"
          type="text"
          @input=${handleInputChange}
          .value=${value}
          placeholder=${placeholder}
          jslog=${
        VisualLogging.textField().track({change: true}).context(Platform.StringUtilities.toKebabCase(stateKey))}
          />
      </label>
    `;
  };

  const renderPlatformSection = (): Lit.TemplateResult => {
    const handlePlatformNameChange = (event: KeyboardEvent): void => {
      const value = (event.target as HTMLInputElement).value;
      input.onTextFieldChange('platform', value);
    };
    const handlePlatformVersionChange = (event: KeyboardEvent): void => {
      const value = (event.target as HTMLInputElement).value;
      input.onTextFieldChange('platformVersion', value);
    };
    return html`
      <span class="full-row label">${i18nString(UIStrings.platformLabel)}</span>
      <div class="full-row brand-row" aria-label=${i18nString(UIStrings.platformProperties)} role="group">
        <input
          class="input-field half-row"
          type="text"
          @input=${handlePlatformNameChange}
          .value=${input.platform}
          placeholder=${i18nString(UIStrings.platformPlaceholder)}
          aria-label=${i18nString(UIStrings.platformLabel)}
          jslog=${VisualLogging.textField('platform').track({
      change: true,
    })}
        />
        <input
          class="input-field half-row"
          type="text"
          @input=${handlePlatformVersionChange}
          .value=${input.platformVersion}
          placeholder=${i18nString(UIStrings.platformVersion)}
          aria-label=${i18nString(UIStrings.platformVersion)}
          jslog=${VisualLogging.textField('platform-version').track({
      change: true,
    })}
        />
      </div>
    `;
  };

  const renderDeviceModelSection = (): Lit.TemplateResult => {
    const handleDeviceModelChange = (event: KeyboardEvent): void => {
      const value = (event.target as HTMLInputElement).value;
      input.onTextFieldChange('model', value);
    };
    const handleMobileChange = (event: KeyboardEvent): void => {
      const value = (event.target as HTMLInputElement).checked;
      input.onMobileChange(value);
    };
    const mobileCheckboxInput = input.showMobileCheckbox ? html`
      <label class="mobile-checkbox-container">
        <input type="checkbox" @input=${handleMobileChange} .checked=${input.mobile}
          jslog=${VisualLogging.toggle('mobile').track({
      click: true,
    })}
        />
        ${i18nString(UIStrings.mobileCheckboxLabel)}
      </label>
    ` :
                                                           Lit.nothing;
    return html`
      <span class="full-row label">${i18nString(UIStrings.deviceModel)}</span>
      <div class="full-row brand-row" aria-label=${i18nString(UIStrings.deviceProperties)} role="group">
        <input
          class="input-field ${input.showMobileCheckbox ? 'device-model-input' : 'full-row'}"
          type="text"
          @input=${handleDeviceModelChange}
          .value=${input.model}
          placeholder=${i18nString(UIStrings.deviceModel)}
          jslog=${VisualLogging.textField('model').track({
      change: true,
    })}
        />
        ${mobileCheckboxInput}
      </div>
    `;
  };

  const renderUseragent = (): Lit.TemplateResult => {
    const brandElements = input.brands.map((brandRow, index) => {
      const {brand, version} = brandRow;
      const handleDeleteClick = (): void => {
        input.onBrandDelete('brands', index);
      };
      const handleKeyPress = (event: KeyboardEvent): void => {
        if (event.code === 'Space' || event.code === 'Enter') {
          event.preventDefault();
          handleDeleteClick();
        }
      };
      const handleBrandChange = (event: KeyboardEvent): void => {
        const value = (event.target as HTMLInputElement).value;
        input.onBrandInputChange('brands', index, 'brandName', value);
      };
      const handleVersionChange = (event: KeyboardEvent): void => {
        const value = (event.target as HTMLInputElement).value;
        input.onBrandInputChange('brands', index, 'brandVersion', value);
      };
      return html`
        <div class="full-row brand-row" aria-label=${i18nString(UIStrings.brandProperties)} role="group">
          <input
            class="input-field ua-brand-name-input"
            type="text"
            @input=${handleBrandChange}
            .value=${brand}
            id="ua-brand-${index + 1}-input"
            placeholder=${i18nString(UIStrings.brandName)}
            aria-label=${i18nString(UIStrings.brandNameAriaLabel, {
        PH1: index + 1,
      })}
            jslog=${VisualLogging.textField('brand-name').track({
        change: true,
      })}
          />
          <input
            class="input-field"
            type="text"
            @input=${handleVersionChange}
            .value=${version}
            placeholder=${i18nString(UIStrings.significantBrandVersionPlaceholder)}
            aria-label=${i18nString(UIStrings.brandVersionAriaLabel, {
        PH1: index + 1,
      })}
            jslog=${VisualLogging.textField('brand-version').track({
        change: true,
      })}
          />
          <devtools-icon name="bin"
            title=${i18nString(UIStrings.brandUserAgentDelete)}
            class="medium delete-icon"
            tabindex="0"
            role="button"
            @click=${handleDeleteClick}
            @keypress=${handleKeyPress}
            aria-label=${i18nString(UIStrings.brandUserAgentDelete)}
          >
          </devtools-icon>
        </div>
      `;
    });
    const handleAddBrandKeyPress = (event: KeyboardEvent): void => {
      if (event.code === 'Space' || event.code === 'Enter') {
        event.preventDefault();
        input.onBrandAdd('brands');
      }
    };
    return html`
      <span class="full-row label">${i18nString(UIStrings.useragent)}</span>
      ${brandElements}
      <div
        class="add-container full-row"
        role="button"
        tabindex="0"
        id="add-brand-button"
        aria-label=${i18nString(UIStrings.addBrand)}
        @click=${() => input.onBrandAdd('brands')}
        @keypress=${handleAddBrandKeyPress}
      >
        <devtools-icon
          aria-hidden="true" name="plus" class="medium">
        </devtools-icon>
        ${i18nString(UIStrings.addBrand)}
      </div>
    `;
  };

  const renderFullVersionList = (): Lit.TemplateResult => {
    const elements = input.fullVersionList.map((brandRow, index) => {
      const {brand, version} = brandRow;
      const handleDeleteClick = (): void => {
        input.onBrandDelete('fullVersionList', index);
      };
      const handleKeyPress = (event: KeyboardEvent): void => {
        if (event.code === 'Space' || event.code === 'Enter') {
          event.preventDefault();
          handleDeleteClick();
        }
      };
      const handleBrandChange = (event: KeyboardEvent): void => {
        const value = (event.target as HTMLInputElement).value;
        input.onBrandInputChange('fullVersionList', index, 'brandName', value);
      };
      const handleVersionChange = (event: KeyboardEvent): void => {
        const value = (event.target as HTMLInputElement).value;
        input.onBrandInputChange('fullVersionList', index, 'brandVersion', value);
      };
      return html`
        <div
          class="full-row brand-row"
          aria-label=${i18nString(UIStrings.brandProperties)}
          jslog=${VisualLogging.section('full-version')}
          role="group">
          <input
            class="input-field fvl-brand-name-input"
            type="text"
            @input=${handleBrandChange}
            .value=${brand}
            id="fvl-brand-${index + 1}-input"
            placeholder=${i18nString(UIStrings.brandName)}
            aria-label=${i18nString(UIStrings.brandNameAriaLabel, {
        PH1: index + 1,
      })}
            jslog=${VisualLogging.textField('brand-name').track({
        change: true,
      })}
          />
          <input
            class="input-field"
            type="text"
            @input=${handleVersionChange}
            .value=${version}
            placeholder=${i18nString(UIStrings.brandVersionPlaceholder)}
            aria-label=${i18nString(UIStrings.brandVersionAriaLabel, {
        PH1: index + 1,
      })}
            jslog=${VisualLogging.textField('brand-version').track({
        change: true,
      })}
          />
          <devtools-icon name="bin"
            title=${i18nString(UIStrings.brandFullVersionListDelete)}
            class="medium delete-icon"
            tabindex="0"
            role="button"
            @click=${handleDeleteClick}
            @keypress=${handleKeyPress}
            aria-label=${i18nString(UIStrings.brandFullVersionListDelete)}
          >
          </devtools-icon>
        </div>
      `;
    });
    const handleAddBrandKeyPress = (event: KeyboardEvent): void => {
      if (event.code === 'Space' || event.code === 'Enter') {
        event.preventDefault();
        input.onBrandAdd('fullVersionList');
      }
    };
    return html`
      <span class="full-row label">${i18nString(UIStrings.fullVersionList)}</span>
      ${elements}
      <div
        class="add-container full-row"
        role="button"
        tabindex="0"
        id="add-fvl-brand-button"
        aria-label=${i18nString(UIStrings.addBrand)}
        @click=${() => input.onBrandAdd('fullVersionList')}
        @keypress=${handleAddBrandKeyPress}
      >
        <devtools-icon name="plus" class="medium"
          aria-hidden="true">
        </devtools-icon>
        ${i18nString(UIStrings.addBrand)}
      </div>
    `;
  };

  const renderFormFactorsSection = (): Lit.TemplateResult => {
    const checkboxElements = ALL_PROTOCOL_FORM_FACTORS.map(ffValue => {
      const isChecked = input.formFactors.includes(ffValue);
      const labelStringId = `formFactor${ffValue}` as keyof typeof UIStrings;
      const label = i18nString(UIStrings[labelStringId]);

      return html`
        <label class="form-factor-checkbox-label">
          <input
            type="checkbox"
            .checked=${isChecked}
            value=${ffValue}
            jslog=${VisualLogging.toggle(Platform.StringUtilities.toKebabCase(ffValue)).track({
        click: true,
      })}
            @change=${(e: Event) => input.onFormFactorChange(ffValue, (e.target as HTMLInputElement).checked)}
          />
          ${label}
        </label>
      `;
    });

    return html`
      <span class="full-row label" jslog=${VisualLogging.sectionHeader('form-factors')}>
        ${i18nString(UIStrings.formFactorsTitle)}
      </span>
      <div class="full-row form-factors-checkbox-group" role="group" aria-label=${
        i18nString(UIStrings.formFactorsGroupAriaLabel)}>
        ${checkboxElements}
      </div>
    `;
  };

  const useragentSection = renderUseragent();
  const fullVersionListSection = renderFullVersionList();
  const fullBrowserInput =
      renderInputWithLabel(i18nString(UIStrings.fullBrowserVersion),
                           i18nString(UIStrings.fullBrowserVersionPlaceholder), input.fullVersion, 'fullVersion');
  const formFactorsSection = renderFormFactorsSection();
  const platformSection = renderPlatformSection();
  const architectureInput =
      renderInputWithLabel(i18nString(UIStrings.architecture), i18nString(UIStrings.architecturePlaceholder),
                           input.architecture, 'architecture');
  const deviceModelSection = renderDeviceModelSection();
  const handleTreeKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'Space' || event.code === 'Enter' || event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
      event.consume(true);
      input.onTreeToggle(event.code);
    }
  };
  const handleSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
    input.onSubmit();
  };
  const setFormElement = (element: Element|undefined): void => {
    if (!(element instanceof HTMLFormElement)) {
      output.focusBrandInput = undefined;
      output.focusAddBrandButton = undefined;
      return;
    }
    output.focusBrandInput = (list: BrandList, index: number): void => {
      element.querySelector<HTMLElement>(`#${BRAND_INPUT_ID_PREFIXES[list]}-brand-${index + 1}-input`)?.focus();
    };
    output.focusAddBrandButton = (list: BrandList): void => {
      element.querySelector<HTMLElement>(`#${ADD_BRAND_BUTTON_IDS[list]}`)?.focus();
    };
  };
  // clang-format off
  const submitButton = input.showSubmitButton ? html`
    <devtools-button
      .variant=${Buttons.Button.Variant.OUTLINED}
      .type=${'submit'}
    >
      ${i18nString(UIStrings.update)}
    </devtools-button>
  ` : Lit.nothing;
  // clang-format on

  // clang-format off
  const template = html`
    <style>${Input.checkboxStyles}</style>
    <style>${userAgentClientHintsFormStyles}</style>
    <section class="root">
      <div class="tree-title">
        <div
          role=button
          @click=${() => input.onTreeToggle()}
          tabindex=${input.isFormDisabled ? '-1' : '0'}
          @keydown=${handleTreeKeyDown}
          aria-expanded=${input.isFormOpened}
          aria-controls=form-container
          aria-disabled=${input.isFormDisabled}
          aria-label=${i18nString(UIStrings.title)}
          jslog=${VisualLogging.toggleSubpane().track({click: true})}>
          <devtools-icon name=triangle-right></devtools-icon>
          <devtools-icon name=triangle-down></devtools-icon>
          ${i18nString(UIStrings.title)}
        </div>
        <devtools-icon tabindex=${input.isFormDisabled ? '-1' : '0'} class=info-icon name=info aria-label=${i18nString(UIStrings.userAgentClientHintsInfo)} title=${i18nString(UIStrings.userAgentClientHintsInfo)}></devtools-icon>
        <devtools-link
         tabindex=${input.isFormDisabled ? '-1' : '0'}
         href="https://web.dev/user-agent-client-hints/"
         class="link"
         aria-label=${i18nString(UIStrings.learnMore)}
         jslogcontext="learn-more"
        >
          ${i18nString(UIStrings.learnMore)}
        </devtools-link>
      </div>
      <form
        id="form-container"
        class="form-container ${input.isFormOpened ? '' : 'hide-container'}"
        @submit=${handleSubmit}
        ${ref(setFormElement)}
      >
        ${useragentSection}
        <hr class="section-separator">
        ${fullVersionListSection}
        <hr class="section-separator">
        ${fullBrowserInput}
        <hr class="section-separator">
        ${formFactorsSection}
        <hr class="section-separator">
        ${platformSection}
        <hr class="section-separator">
        ${architectureInput}
        <hr class="section-separator">
        ${deviceModelSection}
        ${submitButton}
      </form>
      <div aria-live="polite" aria-label=${input.useragentModifiedAriaMessage}></div>
    </section>
  `;
  // clang-format on
  Lit.render(template, target);
};
