var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../../front_end/panels/settings/emulation/components/UserAgentClientHintsForm.ts
var UserAgentClientHintsForm_exports = {};
__export(UserAgentClientHintsForm_exports, {
  ALL_PROTOCOL_FORM_FACTORS: () => ALL_PROTOCOL_FORM_FACTORS,
  DEFAULT_VIEW: () => DEFAULT_VIEW,
  Events: () => Events,
  UserAgentClientHintsForm: () => UserAgentClientHintsForm
});
import "../../../../ui/kit/kit.js";
import * as Common from "../../../../core/common/common.js";
import * as i18n from "../../../../core/i18n/i18n.js";
import * as Platform from "../../../../core/platform/platform.js";
import * as Buttons from "../../../../ui/components/buttons/buttons.js";
import * as Input from "../../../../ui/components/input/input.js";
import * as UI from "../../../../ui/legacy/legacy.js";
import * as Lit from "../../../../ui/lit/lit.js";
import * as VisualLogging from "../../../../ui/visual_logging/visual_logging.js";
import * as EmulationUtils from "../utils/utils.js";

// gen/front_end/panels/settings/emulation/components/userAgentClientHintsForm.css.js
var userAgentClientHintsForm_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

@scope to (devtools-widget > *) {
  /* Host styles can now reach the elements of this form. For example,
   * the inspector common styles set "box-sizing: border-box" on all
   * elements, and ListWidget editors set margins on all inputs. Restore
   * the default box sizing and input margins of the browser. */
  :scope * {
    box-sizing: revert;
  }

  :scope input {
    margin: revert;
  }

  .root {
    color: var(--sys-color-on-surface);
    width: 100%;
  }

  .tree-title {
    font-weight: 700;
    display: flex;
    align-items: center;

    & > [aria-controls="form-container"] {
      margin-left: var(--sys-size-2);
      padding-right: var(--sys-size-3);

      & > [name="triangle-right"],
      & > [name="triangle-down"] {
        vertical-align: bottom;
      }

      &[aria-expanded="true"] > [name="triangle-right"] {
        display: none;
      }

      &[aria-expanded="false"] > [name="triangle-down"] {
        display: none;
      }
    }
  }

  .form-container {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr auto;
    align-items: center;
    gap: var(--sys-size-5) 10px;
    padding: 0 10px;
  }

  .full-row {
    grid-column: 1 / 5;
  }

  .form-factors-checkbox-group {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--sys-size-4) 10px;
  }

  .form-factor-checkbox-label {
    display: flex;
    align-items: center;
    gap: var(--sys-size-4);
    white-space: nowrap;
  }

  hr.section-separator {
    grid-column: 1 / 5; /* Ensures the separator spans all columns */
    border: none;
    margin-top: var(--sys-size-1);
  }

  .half-row {
    grid-column: span 2;
  }

  .mobile-checkbox-container {
    display: flex;
  }

  .device-model-input {
    grid-column: 1 / 4;
  }

  .input-field {
    color: var(--sys-color-on-surface);
    padding: 3px var(--sys-size-4);
    border-radius: var(--sys-size-2);
    border: var(--sys-size-1) solid var(--sys-color-neutral-outline);
    background-color: var(--sys-color-cdt-base-container);
    font-family: inherit;
    font-size: inherit;
    height: 18px;
  }

  .input-field::placeholder {
      color: var(--sys-color-on-surface-subtle);
  }

  .input-field:focus {
    border: var(--sys-size-1) solid var(--sys-color-state-focus-ring);
    outline-style: none;
  }

  .add-container {
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: var(--sys-size-4);
  }

  .add-icon {
    margin-right: 5px;
  }

  .brand-row {
    display: flex;
    align-items: center;
    gap: 10px;
    justify-content: space-between;
  }

  .brand-row > input {
    width: 100%;
  }

  .info-icon {
    margin-left: 5px;
    margin-right: var(--sys-size-1);
    height: var(--sys-size-8);
    width: var(--sys-size-8);
  }

  .link,
  .devtools-link {
    color: var(--sys-color-primary);
    text-decoration: underline;
    cursor: pointer;
    outline-offset: var(--sys-size-2);
    font-weight: 400;
  }

  devtools-icon + .link {
    margin-inline-start: var(--sys-size-2);
  }

  .hide-container {
    display: none;
  }

  .input-field-label-container {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  @media (forced-colors: active) {
    .input-field {
      border: var(--sys-size-1) solid;
    }

    .tree-title[aria-disabled="true"] {
      color: GrayText;
    }
  }
}

/*# sourceURL=${import.meta.resolve("./userAgentClientHintsForm.css")} */`;

// ../../front_end/panels/settings/emulation/components/UserAgentClientHintsForm.ts
var { html, Directives: { ref } } = Lit;
var UIStrings = {
  /**
   * @description Title for user agent client hints form.
   */
  title: "User agent client hints",
  /**
   * @description Heading for user agent section.
   * Brands here relate to different browser brands/vendors like Google Chrome, Microsoft Edge, etc.
   */
  useragent: "User agent (Sec-CH-UA)",
  /**
   * @description Heading for full-version-list section.
   */
  fullVersionList: "Full version list (Sec-CH-UA-Full-Version-List)",
  /**
   * @description ARIA label for a form with properties for a single brand in a brand list. The form includes a brand name input field, a version
   * input field and a delete icon. Brands refer to different browser brands/vendors like Google Chrome, Microsoft Edge, etc.
   */
  brandProperties: "User agent properties",
  /**
   * @description Input field placeholder for brand's browser name.
   * Brands here relate to different browser brands/vendors like Google Chrome, Microsoft Edge, etc.
   */
  brandName: "Brand",
  /**
   * @description ARIA label for brand's browser name input field.
   * Brands here relate to different browser brands/vendors like Google Chrome, Microsoft Edge, etc.
   * @example {index} PH1
   */
  brandNameAriaLabel: "Brand {PH1}",
  /**
   * @description Input field placeholder for significant brand version.
   * Brands here relate to different browser brands/vendors like Google Chrome (v89), Microsoft Edge (v92), etc.
   */
  significantBrandVersionPlaceholder: "Significant version (e.g. 87)",
  /**
   * @description Input field placeholder for brand version.
   * Brands here relate to different browser brands/vendors like Google Chrome (v89), Microsoft Edge (v92), etc.
   */
  brandVersionPlaceholder: "Version (e.g. 87.0.4280.88)",
  /**
   * @description ARIA label for brand's browser version input field.
   * Brands here relate to different browser brands/vendors like Google Chrome, Microsoft Edge, etc.
   * @example {index} PH1
   */
  brandVersionAriaLabel: "Version {PH1}",
  /**
   * @description Button title for adding another brand in brands section to client hints.
   * Brands here relate to different browser brands/vendors like Google Chrome, Microsoft Edge, etc.
   */
  addBrand: "Add brand",
  /**
   * @description Tooltip and ARIA label for delete icon for deleting browser brand from brands user agent section.
   * Brands here relate to different browser brands/vendors like Google Chrome, Microsoft Edge, etc.
   */
  brandUserAgentDelete: "Delete brand from user agent section",
  /**
   * @description Tooltip and ARIA label for delete icon for deleting user agent from brands full version list.
   * Brands here relate to different browser brands/vendors like Google Chrome, Microsoft Edge, etc.
   */
  brandFullVersionListDelete: "Delete brand from full version list",
  /**
   * @description Heading for the form factors section.
   */
  formFactorsTitle: "Form factors (Sec-CH-UA-Form-Factors)",
  /**
   * @description ARIA label for the group of form factor checkboxes.
   */
  formFactorsGroupAriaLabel: "Available form factors",
  /**
   * @description Form factor option: Desktop.
   */
  formFactorDesktop: "Desktop",
  /**
   * @description Form factor option: Automotive.
   */
  formFactorAutomotive: "Automotive",
  /**
   * @description Form factor option: Mobile.
   */
  formFactorMobile: "Mobile",
  /**
   * @description Form factor option: Tablet.
   */
  formFactorTablet: "Tablet",
  /**
   * @description Form factor option: XR.
   */
  formFactorXR: "XR",
  /**
   * @description Form factor option: EInk.
   */
  formFactorEInk: "EInk",
  /**
   * @description Form factor option: Watch.
   */
  formFactorWatch: "Watch",
  /**
   * @description Label for full browser version input field.
   */
  fullBrowserVersion: "Full browser version (Sec-CH-UA-Full-Version)",
  /**
   * @description Placeholder for full browser version input field.
   */
  fullBrowserVersionPlaceholder: "Full browser version (e.g. 87.0.4280.88)",
  /**
   * @description Label for platform heading section. Platform relates to OS like Android, Windows, etc.
   */
  platformLabel: "Platform (Sec-CH-UA-Platform / Sec-CH-UA-Platform-Version)",
  /**
   * @description Platform row, including platform name and platform version input field.
   */
  platformProperties: "Platform properties",
  /**
   * @description Version for platform input field. Platform relates to OS like Android, Windows, etc.
   */
  platformVersion: "Platform version",
  /**
   * @description Placeholder for platform name input field. Platform relates to OS like Android, Windows, etc.
   */
  platformPlaceholder: "Platform (e.g. Android)",
  /**
   * @description Label for architecture (e.g., x86, x64, arm) input field.
   */
  architecture: "Architecture (Sec-CH-UA-Arch)",
  /**
   * @description Placeholder for architecture (e.g., x86, x64, arm) input field.
   */
  architecturePlaceholder: "Architecture (e.g. x86)",
  /**
   * @description Device model row, including device model input field and mobile checkbox.
   */
  deviceProperties: "Device properties",
  /**
   * @description Label for device model input field.
   */
  deviceModel: "Device model (Sec-CH-UA-Model)",
  /**
   * @description Label for mobile phone checkbox.
   */
  mobileCheckboxLabel: "Mobile",
  /**
   * @description Label for button to submit client hints form in DevTools.
   */
  update: "Update",
  /**
   * @description Field error message in the Devices settings tab that shows that the entered value has characters that can't be represented in the corresponding user agent client hints.
   */
  notRepresentable: "Not representable as structured headers string",
  /**
   * @description Hover text for info icon which explains user agent client hints.
   */
  userAgentClientHintsInfo: "User agent client hints are an alternative to the user agent string that identify the browser and the device in a more structured way with better privacy accounting",
  /**
   * @description Success message when brand row is successfully added in client hints form.
   * Brands here relate to different browser brands/vendors like Google Chrome, Microsoft Edge, etc.
   */
  addedBrand: "Added brand row",
  /**
   * @description Success message when brand row is successfully deleted in client hints form.
   * Brands here relate to different browser brands/vendors like Google Chrome, Microsoft Edge, etc.
   */
  deletedBrand: "Deleted brand row",
  /**
   * @description Text that is usually a hyperlink to more documentation.
   */
  learnMore: "Learn more"
};
var str_ = i18n.i18n.registerUIStrings("panels/settings/emulation/components/UserAgentClientHintsForm.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var Events = /* @__PURE__ */ ((Events2) => {
  Events2["CLIENT_HINTS_CHANGE"] = "clienthintschange";
  Events2["CLIENT_HINTS_SUBMIT"] = "clienthintssubmit";
  return Events2;
})(Events || {});
var DEFAULT_METADATA = {
  brands: [
    {
      brand: "",
      version: ""
    }
  ],
  fullVersionList: [
    {
      brand: "",
      version: ""
    }
  ],
  fullVersion: "",
  platform: "",
  platformVersion: "",
  architecture: "",
  model: "",
  mobile: false,
  formFactors: []
};
var ALL_PROTOCOL_FORM_FACTORS = [
  UIStrings.formFactorDesktop,
  UIStrings.formFactorAutomotive,
  UIStrings.formFactorMobile,
  UIStrings.formFactorTablet,
  UIStrings.formFactorXR,
  UIStrings.formFactorEInk,
  UIStrings.formFactorWatch
];
var BRAND_INPUT_ID_PREFIXES = {
  brands: "ua",
  fullVersionList: "fvl"
};
var ADD_BRAND_BUTTON_IDS = {
  brands: "add-brand-button",
  fullVersionList: "add-fvl-brand-button"
};
var UserAgentClientHintsFormBase = Common.ObjectWrapper.eventMixin(UI.Widget.Widget);
var UserAgentClientHintsForm = class _UserAgentClientHintsForm extends UserAgentClientHintsFormBase {
  #view;
  #viewOutput = {};
  #isFormOpened = false;
  #isFormDisabled = false;
  #metaData = DEFAULT_METADATA;
  #showMobileCheckbox = false;
  #showSubmitButton = false;
  #useragentModifiedAriaMessage = "";
  constructor(element, view = DEFAULT_VIEW) {
    super(element);
    this.#view = view;
  }
  set value(data) {
    const { metaData = DEFAULT_METADATA, showMobileCheckbox = false, showSubmitButton = false } = data;
    this.#metaData = {
      ...this.#metaData,
      ...metaData
    };
    this.#showMobileCheckbox = showMobileCheckbox;
    this.#showSubmitButton = showSubmitButton;
    this.requestUpdate();
  }
  get value() {
    return {
      metaData: this.#metaData
    };
  }
  set disabled(disableForm) {
    if (this.#isFormDisabled === disableForm) {
      return;
    }
    this.#isFormDisabled = disableForm;
    if (disableForm) {
      this.#isFormOpened = false;
    }
    this.requestUpdate();
  }
  get disabled() {
    return this.#isFormDisabled;
  }
  wasShown() {
    super.wasShown();
    this.requestUpdate();
  }
  #handleTreeClick = (key) => {
    if (this.#isFormDisabled) {
      return;
    }
    if (key === "ArrowLeft" && !this.#isFormOpened || key === "ArrowRight" && this.#isFormOpened) {
      return;
    }
    this.#isFormOpened = !this.#isFormOpened;
    this.requestUpdate();
  };
  #handleBrandInputChange = (list, index, brandInputType, value) => {
    const updatedBrands = this.#metaData[list]?.map((browserBrand, brandIndex) => {
      if (brandIndex === index) {
        const { brand, version } = browserBrand;
        if (brandInputType === "brandName") {
          return {
            brand: value,
            version
          };
        }
        return {
          brand,
          version: value
        };
      }
      return browserBrand;
    });
    this.#metaData = {
      ...this.#metaData,
      [list]: updatedBrands
    };
    this.dispatchEventToListeners("clienthintschange" /* CLIENT_HINTS_CHANGE */, this.#metaData);
    this.requestUpdate();
  };
  #handleBrandDelete = async (list, index) => {
    const { [list]: brands = [] } = this.#metaData;
    const updatedBrands = brands.filter((_, brandIndex) => brandIndex !== index);
    this.#metaData = {
      ...this.#metaData,
      [list]: updatedBrands
    };
    this.dispatchEventToListeners("clienthintschange" /* CLIENT_HINTS_CHANGE */, this.#metaData);
    this.#useragentModifiedAriaMessage = i18nString(UIStrings.deletedBrand);
    this.requestUpdate();
    await this.updateComplete;
    if (index < updatedBrands.length) {
      this.#viewOutput.focusBrandInput?.(list, index);
    } else {
      this.#viewOutput.focusAddBrandButton?.(list);
    }
  };
  #handleBrandAdd = async (list) => {
    const { [list]: brands } = this.#metaData;
    const updatedBrands = [
      ...Array.isArray(brands) ? brands : [],
      {
        brand: "",
        version: ""
      }
    ];
    this.#metaData = {
      ...this.#metaData,
      [list]: updatedBrands
    };
    this.dispatchEventToListeners("clienthintschange" /* CLIENT_HINTS_CHANGE */, this.#metaData);
    this.#useragentModifiedAriaMessage = i18nString(UIStrings.addedBrand);
    this.requestUpdate();
    await this.updateComplete;
    this.#viewOutput.focusBrandInput?.(list, updatedBrands.length - 1);
  };
  #handleFormFactorCheckboxChange = (formFactorValue, isChecked) => {
    let currentFormFactors = [...this.#metaData.formFactors || []];
    if (isChecked) {
      if (!currentFormFactors.includes(formFactorValue)) {
        currentFormFactors.push(formFactorValue);
      }
    } else {
      currentFormFactors = currentFormFactors.filter((ff) => ff !== formFactorValue);
    }
    this.#metaData = {
      ...this.#metaData,
      formFactors: currentFormFactors
    };
    this.dispatchEventToListeners("clienthintschange" /* CLIENT_HINTS_CHANGE */, this.#metaData);
    this.requestUpdate();
  };
  #handleInputChange = (stateKey, value) => {
    if (stateKey in this.#metaData) {
      this.#metaData = {
        ...this.#metaData,
        [stateKey]: value
      };
      this.requestUpdate();
    }
    this.dispatchEventToListeners("clienthintschange" /* CLIENT_HINTS_CHANGE */, this.#metaData);
  };
  #handleSubmit = () => {
    if (this.#showSubmitButton) {
      this.dispatchEventToListeners("clienthintssubmit" /* CLIENT_HINTS_SUBMIT */, this.#metaData);
      this.requestUpdate();
    }
  };
  static validateMetaData(metaData) {
    if (!metaData) {
      return { valid: true };
    }
    for (const [metaDataKey, metaDataValue] of Object.entries(metaData)) {
      if (metaDataKey === "brands" || metaDataKey === "fullVersionList") {
        const brandList = metaDataValue;
        const isBrandValid = (brandList ?? []).every(({ brand, version }) => {
          const brandNameResult = EmulationUtils.UserAgentMetadata.validateAsStructuredHeadersString(
            brand,
            i18nString(UIStrings.notRepresentable)
          );
          const brandVersionResult = EmulationUtils.UserAgentMetadata.validateAsStructuredHeadersString(
            version,
            i18nString(UIStrings.notRepresentable)
          );
          return brandNameResult.valid && brandVersionResult.valid;
        });
        if (!isBrandValid) {
          return { valid: false, errorMessage: i18nString(UIStrings.notRepresentable) };
        }
      } else if (metaDataKey === "formFactors") {
        const formFactors = metaDataValue;
        if (formFactors) {
          for (const ff of formFactors) {
            if (!ALL_PROTOCOL_FORM_FACTORS.includes(ff)) {
              return {
                valid: false,
                errorMessage: i18nString(UIStrings.notRepresentable) + ` (Invalid form factor: ${ff})`
              };
            }
            const ffError = EmulationUtils.UserAgentMetadata.validateAsStructuredHeadersString(
              ff,
              i18nString(UIStrings.notRepresentable)
            );
            if (!ffError.valid) {
              return ffError;
            }
          }
        }
      } else {
        const metaDataError = EmulationUtils.UserAgentMetadata.validateAsStructuredHeadersString(
          metaDataValue,
          i18nString(UIStrings.notRepresentable)
        );
        if (!metaDataError.valid) {
          return metaDataError;
        }
      }
    }
    return { valid: true };
  }
  validate = () => {
    return _UserAgentClientHintsForm.validateMetaData(this.#metaData);
  };
  performUpdate() {
    const input = {
      brands: this.#metaData.brands ?? [{ brand: "", version: "" }],
      fullVersionList: this.#metaData.fullVersionList ?? [{ brand: "", version: "" }],
      fullVersion: this.#metaData.fullVersion || "",
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
      onBrandAdd: (list) => void this.#handleBrandAdd(list),
      onBrandDelete: (list, index) => void this.#handleBrandDelete(list, index),
      onBrandInputChange: this.#handleBrandInputChange,
      onTextFieldChange: this.#handleInputChange,
      onMobileChange: (mobile) => this.#handleInputChange("mobile", mobile),
      onFormFactorChange: this.#handleFormFactorCheckboxChange,
      onSubmit: this.#handleSubmit
    };
    this.#view(input, this.#viewOutput, this.contentElement);
  }
};
var DEFAULT_VIEW = (input, output, target) => {
  const renderInputWithLabel = (label, placeholder, value, stateKey) => {
    const handleInputChange = (event) => {
      const value2 = event.target.value;
      input.onTextFieldChange(stateKey, value2);
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
          jslog=${VisualLogging.textField().track({ change: true }).context(Platform.StringUtilities.toKebabCase(stateKey))}
          />
      </label>
    `;
  };
  const renderPlatformSection = () => {
    const handlePlatformNameChange = (event) => {
      const value = event.target.value;
      input.onTextFieldChange("platform", value);
    };
    const handlePlatformVersionChange = (event) => {
      const value = event.target.value;
      input.onTextFieldChange("platformVersion", value);
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
          jslog=${VisualLogging.textField("platform").track({
      change: true
    })}
        />
        <input
          class="input-field half-row"
          type="text"
          @input=${handlePlatformVersionChange}
          .value=${input.platformVersion}
          placeholder=${i18nString(UIStrings.platformVersion)}
          aria-label=${i18nString(UIStrings.platformVersion)}
          jslog=${VisualLogging.textField("platform-version").track({
      change: true
    })}
        />
      </div>
    `;
  };
  const renderDeviceModelSection = () => {
    const handleDeviceModelChange = (event) => {
      const value = event.target.value;
      input.onTextFieldChange("model", value);
    };
    const handleMobileChange = (event) => {
      const value = event.target.checked;
      input.onMobileChange(value);
    };
    const mobileCheckboxInput = input.showMobileCheckbox ? html`
      <label class="mobile-checkbox-container">
        <input type="checkbox" @input=${handleMobileChange} .checked=${input.mobile}
          jslog=${VisualLogging.toggle("mobile").track({
      click: true
    })}
        />
        ${i18nString(UIStrings.mobileCheckboxLabel)}
      </label>
    ` : Lit.nothing;
    return html`
      <span class="full-row label">${i18nString(UIStrings.deviceModel)}</span>
      <div class="full-row brand-row" aria-label=${i18nString(UIStrings.deviceProperties)} role="group">
        <input
          class="input-field ${input.showMobileCheckbox ? "device-model-input" : "full-row"}"
          type="text"
          @input=${handleDeviceModelChange}
          .value=${input.model}
          placeholder=${i18nString(UIStrings.deviceModel)}
          jslog=${VisualLogging.textField("model").track({
      change: true
    })}
        />
        ${mobileCheckboxInput}
      </div>
    `;
  };
  const renderUseragent = () => {
    const brandElements = input.brands.map((brandRow, index) => {
      const { brand, version } = brandRow;
      const handleDeleteClick = () => {
        input.onBrandDelete("brands", index);
      };
      const handleKeyPress = (event) => {
        if (event.code === "Space" || event.code === "Enter") {
          event.preventDefault();
          handleDeleteClick();
        }
      };
      const handleBrandChange = (event) => {
        const value = event.target.value;
        input.onBrandInputChange("brands", index, "brandName", value);
      };
      const handleVersionChange = (event) => {
        const value = event.target.value;
        input.onBrandInputChange("brands", index, "brandVersion", value);
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
        PH1: index + 1
      })}
            jslog=${VisualLogging.textField("brand-name").track({
        change: true
      })}
          />
          <input
            class="input-field"
            type="text"
            @input=${handleVersionChange}
            .value=${version}
            placeholder=${i18nString(UIStrings.significantBrandVersionPlaceholder)}
            aria-label=${i18nString(UIStrings.brandVersionAriaLabel, {
        PH1: index + 1
      })}
            jslog=${VisualLogging.textField("brand-version").track({
        change: true
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
    const handleAddBrandKeyPress = (event) => {
      if (event.code === "Space" || event.code === "Enter") {
        event.preventDefault();
        input.onBrandAdd("brands");
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
        @click=${() => input.onBrandAdd("brands")}
        @keypress=${handleAddBrandKeyPress}
      >
        <devtools-icon
          aria-hidden="true" name="plus" class="medium">
        </devtools-icon>
        ${i18nString(UIStrings.addBrand)}
      </div>
    `;
  };
  const renderFullVersionList = () => {
    const elements = input.fullVersionList.map((brandRow, index) => {
      const { brand, version } = brandRow;
      const handleDeleteClick = () => {
        input.onBrandDelete("fullVersionList", index);
      };
      const handleKeyPress = (event) => {
        if (event.code === "Space" || event.code === "Enter") {
          event.preventDefault();
          handleDeleteClick();
        }
      };
      const handleBrandChange = (event) => {
        const value = event.target.value;
        input.onBrandInputChange("fullVersionList", index, "brandName", value);
      };
      const handleVersionChange = (event) => {
        const value = event.target.value;
        input.onBrandInputChange("fullVersionList", index, "brandVersion", value);
      };
      return html`
        <div
          class="full-row brand-row"
          aria-label=${i18nString(UIStrings.brandProperties)}
          jslog=${VisualLogging.section("full-version")}
          role="group">
          <input
            class="input-field fvl-brand-name-input"
            type="text"
            @input=${handleBrandChange}
            .value=${brand}
            id="fvl-brand-${index + 1}-input"
            placeholder=${i18nString(UIStrings.brandName)}
            aria-label=${i18nString(UIStrings.brandNameAriaLabel, {
        PH1: index + 1
      })}
            jslog=${VisualLogging.textField("brand-name").track({
        change: true
      })}
          />
          <input
            class="input-field"
            type="text"
            @input=${handleVersionChange}
            .value=${version}
            placeholder=${i18nString(UIStrings.brandVersionPlaceholder)}
            aria-label=${i18nString(UIStrings.brandVersionAriaLabel, {
        PH1: index + 1
      })}
            jslog=${VisualLogging.textField("brand-version").track({
        change: true
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
    const handleAddBrandKeyPress = (event) => {
      if (event.code === "Space" || event.code === "Enter") {
        event.preventDefault();
        input.onBrandAdd("fullVersionList");
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
        @click=${() => input.onBrandAdd("fullVersionList")}
        @keypress=${handleAddBrandKeyPress}
      >
        <devtools-icon name="plus" class="medium"
          aria-hidden="true">
        </devtools-icon>
        ${i18nString(UIStrings.addBrand)}
      </div>
    `;
  };
  const renderFormFactorsSection = () => {
    const checkboxElements = ALL_PROTOCOL_FORM_FACTORS.map((ffValue) => {
      const isChecked = input.formFactors.includes(ffValue);
      const labelStringId = `formFactor${ffValue}`;
      const label = i18nString(UIStrings[labelStringId]);
      return html`
        <label class="form-factor-checkbox-label">
          <input
            type="checkbox"
            .checked=${isChecked}
            value=${ffValue}
            jslog=${VisualLogging.toggle(Platform.StringUtilities.toKebabCase(ffValue)).track({
        click: true
      })}
            @change=${(e) => input.onFormFactorChange(ffValue, e.target.checked)}
          />
          ${label}
        </label>
      `;
    });
    return html`
      <span class="full-row label" jslog=${VisualLogging.sectionHeader("form-factors")}>
        ${i18nString(UIStrings.formFactorsTitle)}
      </span>
      <div class="full-row form-factors-checkbox-group" role="group" aria-label=${i18nString(UIStrings.formFactorsGroupAriaLabel)}>
        ${checkboxElements}
      </div>
    `;
  };
  const useragentSection = renderUseragent();
  const fullVersionListSection = renderFullVersionList();
  const fullBrowserInput = renderInputWithLabel(
    i18nString(UIStrings.fullBrowserVersion),
    i18nString(UIStrings.fullBrowserVersionPlaceholder),
    input.fullVersion,
    "fullVersion"
  );
  const formFactorsSection = renderFormFactorsSection();
  const platformSection = renderPlatformSection();
  const architectureInput = renderInputWithLabel(
    i18nString(UIStrings.architecture),
    i18nString(UIStrings.architecturePlaceholder),
    input.architecture,
    "architecture"
  );
  const deviceModelSection = renderDeviceModelSection();
  const handleTreeKeyDown = (event) => {
    if (event.code === "Space" || event.code === "Enter" || event.code === "ArrowLeft" || event.code === "ArrowRight") {
      event.consume(true);
      input.onTreeToggle(event.code);
    }
  };
  const handleSubmit = (event) => {
    event.preventDefault();
    input.onSubmit();
  };
  const setFormElement = (element) => {
    if (!(element instanceof HTMLFormElement)) {
      output.focusBrandInput = void 0;
      output.focusAddBrandButton = void 0;
      return;
    }
    output.focusBrandInput = (list, index) => {
      element.querySelector(`#${BRAND_INPUT_ID_PREFIXES[list]}-brand-${index + 1}-input`)?.focus();
    };
    output.focusAddBrandButton = (list) => {
      element.querySelector(`#${ADD_BRAND_BUTTON_IDS[list]}`)?.focus();
    };
  };
  const submitButton = input.showSubmitButton ? html`
    <devtools-button
      .variant=${Buttons.Button.Variant.OUTLINED}
      .type=${"submit"}
    >
      ${i18nString(UIStrings.update)}
    </devtools-button>
  ` : Lit.nothing;
  const template = html`
    <style>${Input.checkboxStyles}</style>
    <style>${userAgentClientHintsForm_css_default}</style>
    <section class="root">
      <div class="tree-title">
        <div
          role=button
          @click=${() => input.onTreeToggle()}
          tabindex=${input.isFormDisabled ? "-1" : "0"}
          @keydown=${handleTreeKeyDown}
          aria-expanded=${input.isFormOpened}
          aria-controls=form-container
          aria-disabled=${input.isFormDisabled}
          aria-label=${i18nString(UIStrings.title)}
          jslog=${VisualLogging.toggleSubpane().track({ click: true })}>
          <devtools-icon name=triangle-right></devtools-icon>
          <devtools-icon name=triangle-down></devtools-icon>
          ${i18nString(UIStrings.title)}
        </div>
        <devtools-icon tabindex=${input.isFormDisabled ? "-1" : "0"} class=info-icon name=info aria-label=${i18nString(UIStrings.userAgentClientHintsInfo)} title=${i18nString(UIStrings.userAgentClientHintsInfo)}></devtools-icon>
        <devtools-link
         tabindex=${input.isFormDisabled ? "-1" : "0"}
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
        class="form-container ${input.isFormOpened ? "" : "hide-container"}"
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
  Lit.render(template, target);
};
export {
  UserAgentClientHintsForm_exports as UserAgentClientHintsForm
};
//# sourceMappingURL=components.js.map
