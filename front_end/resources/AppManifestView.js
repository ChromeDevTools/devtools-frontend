// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Components from '../components/components.js';
import * as InlineEditor from '../inline_editor/inline_editor.js';
import {ls} from '../platform/platform.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

/**
 * @implements {SDK.SDKModel.Observer}
 */
export class AppManifestView extends UI.Widget.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('resources/appManifestView.css', {enableLegacyPatching: false});
    this.contentElement.classList.add('manifest-container');

    Common.Settings.Settings.instance()
        .moduleSetting('colorFormat')
        .addChangeListener(this._updateManifest.bind(this, true));

    this._emptyView = new UI.EmptyWidget.EmptyWidget(Common.UIString.UIString('No manifest detected'));
    this._emptyView.appendLink(
        'https://developers.google.com/web/fundamentals/engage-and-retain/web-app-manifest/?utm_source=devtools');

    this._emptyView.show(this.contentElement);
    this._emptyView.hideWidget();

    // TODO(crbug.com/1156978): Replace UI.ReportView.ReportView with ReportView.ts web component.
    this._reportView = new UI.ReportView.ReportView(Common.UIString.UIString('App Manifest'));
    this._reportView.registerRequiredCSS('resources/appManifestView.css', {enableLegacyPatching: false});
    this._reportView.element.classList.add('manifest-view-header');
    this._reportView.show(this.contentElement);
    this._reportView.hideWidget();

    this._errorsSection = this._reportView.appendSection(Common.UIString.UIString('Errors and warnings'));
    this._installabilitySection = this._reportView.appendSection(Common.UIString.UIString('Installability'));
    this._identitySection = this._reportView.appendSection(Common.UIString.UIString('Identity'));

    this._presentationSection = this._reportView.appendSection(Common.UIString.UIString('Presentation'));
    this._iconsSection = this._reportView.appendSection(Common.UIString.UIString('Icons'), 'report-section-icons');
    /** @type {!Array<!UI.ReportView.Section>} */
    this._shortcutSections = [];
    /** @type {!Array<!UI.ReportView.Section>} */
    this._screenshotsSections = [];

    this._nameField = this._identitySection.appendField(Common.UIString.UIString('Name'));
    this._shortNameField = this._identitySection.appendField(Common.UIString.UIString('Short name'));
    this._descriptionField = this._identitySection.appendField(Common.UIString.UIString('Description'));

    this._startURLField = this._presentationSection.appendField(Common.UIString.UIString('Start URL'));

    const themeColorField = this._presentationSection.appendField(Common.UIString.UIString('Theme color'));
    this._themeColorSwatch = new InlineEditor.ColorSwatch.ColorSwatch();
    themeColorField.appendChild(this._themeColorSwatch);

    const backgroundColorField = this._presentationSection.appendField(Common.UIString.UIString('Background color'));
    this._backgroundColorSwatch = new InlineEditor.ColorSwatch.ColorSwatch();
    backgroundColorField.appendChild(this._backgroundColorSwatch);

    this._orientationField = this._presentationSection.appendField(Common.UIString.UIString('Orientation'));
    this._displayField = this._presentationSection.appendField(Common.UIString.UIString('Display'));

    this._throttler = new Common.Throttler.Throttler(1000);
    SDK.SDKModel.TargetManager.instance().observeTargets(this);
    /** @type {!Array<!Common.EventTarget.EventDescriptor>} */
    this._registeredListeners = [];
  }

  /**
   * @override
   * @param {!SDK.SDKModel.Target} target
   */
  targetAdded(target) {
    if (this._target) {
      return;
    }
    this._target = target;
    this._resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    this._serviceWorkerManager = target.model(SDK.ServiceWorkerManager.ServiceWorkerManager);
    if (!this._resourceTreeModel || !this._serviceWorkerManager) {
      return;
    }

    this._updateManifest(true);

    this._registeredListeners = [
      this._resourceTreeModel.addEventListener(
          SDK.ResourceTreeModel.Events.DOMContentLoaded,
          event => {
            this._updateManifest(true);
          }),
      this._serviceWorkerManager.addEventListener(
          SDK.ServiceWorkerManager.Events.RegistrationUpdated,
          event => {
            this._updateManifest(false);
          })
    ];
  }

  /**
   * @override
   * @param {!SDK.SDKModel.Target} target
   */
  targetRemoved(target) {
    if (this._target !== target) {
      return;
    }
    if (!this._resourceTreeModel || !this._serviceWorkerManager) {
      return;
    }
    delete this._resourceTreeModel;
    delete this._serviceWorkerManager;
    Common.EventTarget.EventTarget.removeEventListeners(this._registeredListeners);
  }

  /**
   * @param {boolean} immediately
   */
  async _updateManifest(immediately) {
    if (!this._resourceTreeModel) {
      return;
    }
    const {url, data, errors} = await this._resourceTreeModel.fetchAppManifest();
    const installabilityErrors = await this._resourceTreeModel.getInstallabilityErrors();
    const manifestIcons = await this._resourceTreeModel.getManifestIcons();

    this._throttler.schedule(
        () => this._renderManifest(url, data, errors, installabilityErrors, manifestIcons), immediately);
  }

  /**
   * @param {string} url
   * @param {?string} data
   * @param {!Array<!Protocol.Page.AppManifestError>} errors
   * @param {!Array<!Protocol.Page.InstallabilityError>} installabilityErrors
   * @param {!{primaryIcon: ?string}} manifestIcons
   */
  async _renderManifest(url, data, errors, installabilityErrors, manifestIcons) {
    if (!data && !errors.length) {
      this._emptyView.showWidget();
      this._reportView.hideWidget();
      return;
    }
    this._emptyView.hideWidget();
    this._reportView.showWidget();

    const link = Components.Linkifier.Linkifier.linkifyURL(url);
    link.tabIndex = 0;
    this._reportView.setURL(link);
    this._errorsSection.clearContent();
    this._errorsSection.element.classList.toggle('hidden', !errors.length);
    for (const error of errors) {
      this._errorsSection.appendRow().appendChild(
          UI.UIUtils.createIconLabel(error.message, error.critical ? 'smallicon-error' : 'smallicon-warning'));
    }

    if (!data) {
      return;
    }

    if (data.charCodeAt(0) === 0xFEFF) {
      data = data.slice(1);
    }  // Trim the BOM as per https://tools.ietf.org/html/rfc7159#section-8.1.

    const parsedManifest = JSON.parse(data);
    this._nameField.textContent = stringProperty('name');
    this._shortNameField.textContent = stringProperty('short_name');

    const warnings = [];

    const description = stringProperty('description');
    this._descriptionField.textContent = description;
    if (description.length > 324) {
      warnings.push(ls`Description may be truncated.`);
    }

    this._startURLField.removeChildren();
    const startURL = stringProperty('start_url');
    if (startURL) {
      const completeURL = /** @type {string} */ (Common.ParsedURL.ParsedURL.completeURL(url, startURL));
      const link = Components.Linkifier.Linkifier.linkifyURL(
          completeURL, /** @type {!Components.Linkifier.LinkifyURLOptions} */ ({text: startURL}));
      link.tabIndex = 0;
      this._startURLField.appendChild(link);
    }

    this._themeColorSwatch.classList.toggle('hidden', !stringProperty('theme_color'));
    const themeColor =
        Common.Color.Color.parse(stringProperty('theme_color') || 'white') || Common.Color.Color.parse('white');
    if (themeColor) {
      this._themeColorSwatch.renderColor(themeColor, true);
    }
    this._backgroundColorSwatch.classList.toggle('hidden', !stringProperty('background_color'));
    const backgroundColor =
        Common.Color.Color.parse(stringProperty('background_color') || 'white') || Common.Color.Color.parse('white');
    if (backgroundColor) {
      this._backgroundColorSwatch.renderColor(backgroundColor, true);
    }

    this._orientationField.textContent = stringProperty('orientation');
    const displayType = stringProperty('display');
    this._displayField.textContent = displayType;

    const icons = parsedManifest['icons'] || [];
    this._iconsSection.clearContent();

    const shortcuts = parsedManifest['shortcuts'] || [];
    for (const shortcutsSection of this._shortcutSections) {
      shortcutsSection.detach(/** overrideHideOnDetach= */ true);
    }

    const screenshots = parsedManifest['screenshots'] || [];
    for (const screenshotSection of this._screenshotsSections) {
      screenshotSection.detach(/** overrideHideOnDetach= */ true);
    }

    const imageErrors = [];

    const setIconMaskedCheckbox =
        UI.UIUtils.CheckboxLabel.create(Common.UIString.UIString('Show only the minimum safe area for maskable icons'));
    setIconMaskedCheckbox.classList.add('mask-checkbox');
    setIconMaskedCheckbox.addEventListener('click', () => {
      this._iconsSection.setIconMasked(setIconMaskedCheckbox.checkboxElement.checked);
    });
    this._iconsSection.appendRow().appendChild(setIconMaskedCheckbox);
    const documentationLink =
        UI.XLink.XLink.create('https://web.dev/maskable-icon/', ls`documentation on maskable icons`);
    this._iconsSection.appendRow().appendChild(
        UI.UIUtils.formatLocalized('Need help? Read our %s.', [documentationLink]));

    if (manifestIcons && manifestIcons.primaryIcon) {
      const wrapper = document.createElement('div');
      wrapper.classList.add('image-wrapper');
      const image = document.createElement('img');
      image.style.maxWidth = '200px';
      image.style.maxHeight = '200px';
      image.src = 'data:image/png;base64,' + manifestIcons.primaryIcon;
      image.alt = ls`Primary manifest icon from ${url}`;
      const title = ls`Primary icon\nas used by Chrome`;
      const field = this._iconsSection.appendFlexedField(title);
      wrapper.appendChild(image);
      field.appendChild(wrapper);
    }

    for (const icon of icons) {
      const iconErrors =
          await this._appendImageResourceToSection(url, icon, this._iconsSection, /** isScreenshot= */ false);
      imageErrors.push(...iconErrors);
    }

    let shortcutIndex = 1;
    for (const shortcut of shortcuts) {
      const shortcutSection = this._reportView.appendSection(ls`Shortcut #${shortcutIndex}`);
      this._shortcutSections.push(shortcutSection);

      shortcutSection.appendFlexedField('Name', shortcut.name);
      if (shortcut.short_name) {
        shortcutSection.appendFlexedField('Short name', shortcut.short_name);
      }
      if (shortcut.description) {
        shortcutSection.appendFlexedField('Description', shortcut.description);
      }
      const urlField = shortcutSection.appendFlexedField('URL');
      const shortcutUrl = /** @type {string} */ (Common.ParsedURL.ParsedURL.completeURL(url, shortcut.url));
      const link = Components.Linkifier.Linkifier.linkifyURL(
          shortcutUrl, /** @type {!Components.Linkifier.LinkifyURLOptions} */ ({text: shortcut.url}));
      link.tabIndex = 0;
      urlField.appendChild(link);

      const shortcutIcons = shortcut.icons || [];
      let hasShorcutIconLargeEnough = false;
      for (const shortcutIcon of shortcutIcons) {
        const shortcutIconErrors =
            await this._appendImageResourceToSection(url, shortcutIcon, shortcutSection, /** isScreenshot= */ false);
        imageErrors.push(...shortcutIconErrors);
        if (!hasShorcutIconLargeEnough && shortcutIcon.sizes) {
          const shortcutIconSize = shortcutIcon.sizes.match(/^(\d+)x(\d+)$/);
          if (shortcutIconSize && shortcutIconSize[1] >= 96 && shortcutIconSize[2] >= 96) {
            hasShorcutIconLargeEnough = true;
          }
        }
      }
      if (!hasShorcutIconLargeEnough) {
        imageErrors.push(ls`Shortcut #${shortcutIndex} should include a 96x96 pixel icon`);
      }
      shortcutIndex++;
    }

    let screenshotIndex = 1;
    for (const screenshot of screenshots) {
      const screenshotSection = this._reportView.appendSection(ls`Screenshot #${screenshotIndex}`);
      this._screenshotsSections.push(screenshotSection);
      const screenshotErrors =
          await this._appendImageResourceToSection(url, screenshot, screenshotSection, /** isScreenshot= */ true);
      imageErrors.push(...screenshotErrors);
      screenshotIndex++;
    }

    this._installabilitySection.clearContent();
    this._installabilitySection.element.classList.toggle('hidden', !installabilityErrors.length);
    const errorMessages = this.getInstallabilityErrorMessages(installabilityErrors);
    for (const error of errorMessages) {
      this._installabilitySection.appendRow().appendChild(UI.UIUtils.createIconLabel(error, 'smallicon-warning'));
    }

    this._errorsSection.element.classList.toggle('hidden', !errors.length && !imageErrors.length && !warnings.length);
    for (const warning of warnings) {
      this._errorsSection.appendRow().appendChild(UI.UIUtils.createIconLabel(warning, 'smallicon-warning'));
    }
    for (const error of imageErrors) {
      this._errorsSection.appendRow().appendChild(UI.UIUtils.createIconLabel(error, 'smallicon-warning'));
    }

    /**
     * @param {string} name
     * @return {string}
     */
    function stringProperty(name) {
      const value = parsedManifest[name];
      if (typeof value !== 'string') {
        return '';
      }
      return value;
    }
  }

  /**
   * @param {!Array<!Protocol.Page.InstallabilityError>} installabilityErrors
   * @return {!Array<string>}
   */
  getInstallabilityErrorMessages(installabilityErrors) {
    const errorMessages = [];
    for (const installabilityError of installabilityErrors) {
      let errorMessage;
      switch (installabilityError.errorId) {
        case 'not-in-main-frame':
          errorMessage = ls`Page is not loaded in the main frame`;
          break;
        case 'not-from-secure-origin':
          errorMessage = ls`Page is not served from a secure origin`;
          break;
        case 'no-manifest':
          errorMessage = ls`Page has no manifest <link> URL`;
          break;
        case 'manifest-empty':
          errorMessage = ls`Manifest could not be fetched, is empty, or could not be parsed`;
          break;
        case 'start-url-not-valid':
          errorMessage = ls`Manifest start URL is not valid`;
          break;
        case 'manifest-missing-name-or-short-name':
          errorMessage = ls`Manifest does not contain a 'name' or 'short_name' field`;
          break;
        case 'manifest-display-not-supported':
          errorMessage = ls`Manifest 'display' property must be one of 'standalone', 'fullscreen', or 'minimal-ui'`;
          break;
        case 'manifest-missing-suitable-icon':
          if (installabilityError.errorArguments.length !== 1 ||
              installabilityError.errorArguments[0].name !== 'minimum-icon-size-in-pixels') {
            console.error('Installability error does not have the correct errorArguments');
            break;
          }
          errorMessage = ls`Manifest does not contain a suitable icon - PNG, SVG or WebP format of at least ${
              installabilityError.errorArguments[0]
                  .value}px is required, the sizes attribute must be set, and the purpose attribute, if set, must include "any" and should not include "maskable".`;
          break;
        case 'no-matching-service-worker':
          errorMessage = ls
          `No matching service worker detected. You may need to reload the page, or check that the scope of the service worker for the current page encloses the scope and start URL from the manifest.`;
          break;
        case 'no-acceptable-icon':
          if (installabilityError.errorArguments.length !== 1 ||
              installabilityError.errorArguments[0].name !== 'minimum-icon-size-in-pixels') {
            console.error('Installability error does not have the correct errorArguments');
            break;
          }
          errorMessage = ls`No supplied icon is at least ${
              installabilityError.errorArguments[0]
                  .value}px square in PNG, SVG or WebP format, with the purpose attribute unset or set to "any".`;
          break;
        case 'cannot-download-icon':
          errorMessage = ls`Could not download a required icon from the manifest`;
          break;
        case 'no-icon-available':
          errorMessage = ls`Downloaded icon was empty or corrupted`;
          break;
        case 'platform-not-supported-on-android':
          errorMessage = ls`The specified application platform is not supported on Android`;
          break;
        case 'no-id-specified':
          errorMessage = ls`No Play store ID provided`;
          break;
        case 'ids-do-not-match':
          errorMessage = ls`The Play Store app URL and Play Store ID do not match`;
          break;
        case 'already-installed':
          errorMessage = ls`The app is already installed`;
          break;
        case 'url-not-supported-for-webapk':
          errorMessage = ls`A URL in the manifest contains a username, password, or port`;
          break;
        case 'in-incognito':
          errorMessage = ls`Page is loaded in an incognito window`;
          break;
        case 'not-offline-capable':
          errorMessage = ls`Page does not work offline`;
          break;
        case 'no-url-for-service-worker':
          errorMessage = ls`Could not check service worker without a 'start_url' field in the manifest`;
          break;
        case 'prefer-related-applications':
          errorMessage = ls`Manifest specifies prefer_related_applications: true`;
          break;
        case 'prefer-related-applications-only-beta-stable':
          errorMessage =
              ls`prefer_related_applications is only supported on Chrome Beta and Stable channels on Android.`;
          break;
        case 'manifest-display-override-not-supported':
          errorMessage =
              ls`Manifest contains 'display_override' field, and the first supported display mode must be one of 'standalone', 'fullscreen', or 'minimal-ui'`;
          break;
        case 'warn-not-offline-capable':
          errorMessage =
              ls`Page does not work offline. The page will not be regarded as installable after Chrome 93, stable release August 2021.`;
          break;
        default:
          console.error(`Installability error id '${installabilityError.errorId}' is not recognized`);
          break;
      }
      if (errorMessage) {
        errorMessages.push(errorMessage);
      }
    }
    return errorMessages;
  }

  /**
   * @param {string} url
   * @return {!Promise<?{image: !HTMLImageElement, wrapper: !Element}>}
   */
  async _loadImage(url) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('image-wrapper');
    const image = /** @type {!HTMLImageElement} */ (document.createElement('img'));
    const result = new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
    });
    image.src = url;
    image.alt = ls`Image from ${url}`;
    wrapper.appendChild(image);
    try {
      await result;
      return {wrapper, image};
    } catch (e) {
    }
    return null;
  }

  /**
   * @param {string} baseUrl
   * @param {*} imageResource
   * @param {!UI.ReportView.Section} section
   * @param {boolean} isScreenshot
   * @return {!Promise<!Array<string>>}
   */
  async _appendImageResourceToSection(baseUrl, imageResource, section, isScreenshot) {
    const imageResourceErrors = [];
    const resourceName = isScreenshot ? ls`Screenshot` : ls`Icon`;
    if (!imageResource.src) {
      imageResourceErrors.push(ls`${resourceName} src is not set`);
      return imageResourceErrors;
    }
    const imageUrl = Common.ParsedURL.ParsedURL.completeURL(baseUrl, imageResource['src']);
    if (!imageUrl) {
      imageResourceErrors.push(ls`${resourceName} URL '${imageResource['src']}' failed to parse`);
      return imageResourceErrors;
    }
    const result = await this._loadImage(imageUrl);
    if (!result) {
      imageResourceErrors.push(ls`${resourceName} ${imageUrl} failed to load`);
      return imageResourceErrors;
    }
    const {wrapper, image} = result;
    const sizes = imageResource['sizes'] ? imageResource['sizes'].replace('x', '×') + 'px' : '';
    const title = sizes + '\n' + (imageResource['type'] || '');
    const field = section.appendFlexedField(title);
    if (!imageResource.sizes) {
      imageResourceErrors.push(ls`${resourceName} ${imageUrl} does not specify its size in the manifest`);
    } else if (!/^\d+x\d+$/.test(imageResource.sizes)) {
      imageResourceErrors.push(ls`${resourceName} ${imageUrl} should specify its size as \`{width}x{height}\``);
    } else {
      const [width, height] = imageResource.sizes.split('x').map(/** @param {*} x*/ x => parseInt(x, 10));
      if (!isScreenshot && (width !== height)) {
        imageResourceErrors.push(ls`${resourceName} ${imageUrl} dimensions should be square`);
      } else if (image.naturalWidth !== width && image.naturalHeight !== height) {
        imageResourceErrors.push(ls`Actual size (${image.naturalWidth}×${image.naturalHeight})px of ${resourceName} ${
            imageUrl} does not match specified size (${width}×${height}px)`);
      } else if (image.naturalWidth !== width) {
        imageResourceErrors.push(
            ls
            `Actual width (${image.naturalWidth}px) of ${resourceName} ${imageUrl} does not match specified width (${width}px)`);
      } else if (image.naturalHeight !== height) {
        imageResourceErrors.push(ls`Actual height (${image.naturalHeight}px) of ${resourceName} ${
            imageUrl} does not match specified height (${height}px)`);
      } else if (isScreenshot && (width < 320 || height < 320)) {
        imageResourceErrors.push(ls`${resourceName} ${imageUrl} size should be at least 320x320`);
      }
    }
    field.appendChild(wrapper);
    return imageResourceErrors;
  }
}
