// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Components from '../components/components.js';
import * as InlineEditor from '../inline_editor/inline_editor.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

/**
 * @implements {SDK.SDKModel.Observer}
 * @unrestricted
 */
export class AppManifestView extends UI.Widget.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('resources/appManifestView.css');

    Common.Settings.Settings.instance()
        .moduleSetting('colorFormat')
        .addChangeListener(this._updateManifest.bind(this, true));

    this._emptyView = new UI.EmptyWidget.EmptyWidget(Common.UIString.UIString('No manifest detected'));
    this._emptyView.appendLink(
        'https://developers.google.com/web/fundamentals/engage-and-retain/web-app-manifest/?utm_source=devtools');

    this._emptyView.show(this.contentElement);
    this._emptyView.hideWidget();

    this._reportView = new UI.ReportView.ReportView(Common.UIString.UIString('App Manifest'));
    this._reportView.show(this.contentElement);
    this._reportView.hideWidget();

    this._errorsSection = this._reportView.appendSection(Common.UIString.UIString('Errors and warnings'));
    this._installabilitySection = this._reportView.appendSection(Common.UIString.UIString('Installability'));
    this._identitySection = this._reportView.appendSection(Common.UIString.UIString('Identity'));

    this._presentationSection = this._reportView.appendSection(Common.UIString.UIString('Presentation'));
    this._iconsSection = this._reportView.appendSection(Common.UIString.UIString('Icons'), 'report-section-icons');

    this._nameField = this._identitySection.appendField(Common.UIString.UIString('Name'));
    this._shortNameField = this._identitySection.appendField(Common.UIString.UIString('Short name'));

    this._startURLField = this._presentationSection.appendField(Common.UIString.UIString('Start URL'));

    const themeColorField = this._presentationSection.appendField(Common.UIString.UIString('Theme color'));
    this._themeColorSwatch = InlineEditor.ColorSwatch.ColorSwatch.create();
    themeColorField.appendChild(this._themeColorSwatch);

    const backgroundColorField = this._presentationSection.appendField(Common.UIString.UIString('Background color'));
    this._backgroundColorSwatch = InlineEditor.ColorSwatch.ColorSwatch.create();
    backgroundColorField.appendChild(this._backgroundColorSwatch);

    this._orientationField = this._presentationSection.appendField(Common.UIString.UIString('Orientation'));
    this._displayField = this._presentationSection.appendField(Common.UIString.UIString('Display'));

    this._throttler = new Common.Throttler.Throttler(1000);
    SDK.SDKModel.TargetManager.instance().observeTargets(this);
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

    this._startURLField.removeChildren();
    const startURL = stringProperty('start_url');
    if (startURL) {
      const completeURL = /** @type {string} */ (Common.ParsedURL.ParsedURL.completeURL(url, startURL));
      const link = Components.Linkifier.Linkifier.linkifyURL(completeURL, {text: startURL});
      link.tabIndex = 0;
      this._startURLField.appendChild(link);
    }

    this._themeColorSwatch.classList.toggle('hidden', !stringProperty('theme_color'));
    const themeColor =
        Common.Color.Color.parse(stringProperty('theme_color') || 'white') || Common.Color.Color.parse('white');
    this._themeColorSwatch.setColor(/** @type {!Common.Color.Color} */ (themeColor));
    this._themeColorSwatch.setFormat(Common.Settings.detectColorFormat(this._themeColorSwatch.color()));
    this._backgroundColorSwatch.classList.toggle('hidden', !stringProperty('background_color'));
    const backgroundColor =
        Common.Color.Color.parse(stringProperty('background_color') || 'white') || Common.Color.Color.parse('white');
    this._backgroundColorSwatch.setColor(/** @type {!Common.Color.Color} */ (backgroundColor));
    this._backgroundColorSwatch.setFormat(Common.Settings.detectColorFormat(this._backgroundColorSwatch.color()));

    this._orientationField.textContent = stringProperty('orientation');
    const displayType = stringProperty('display');
    this._displayField.textContent = displayType;

    const icons = parsedManifest['icons'] || [];
    this._iconsSection.clearContent();

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
      const wrapper = createElement('div');
      wrapper.classList.add('image-wrapper');
      const image = createElement('img');
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
      const iconUrl = Common.ParsedURL.ParsedURL.completeURL(url, icon['src']);
      const result = await this._loadImage(iconUrl);
      if (!result) {
        imageErrors.push(ls`Icon ${iconUrl} failed to load`);
        continue;
      }
      const {wrapper, image} = result;
      const sizes = icon['sizes'] ? icon['sizes'].replace('x', '×') + 'px' : '';
      const title = sizes + '\n' + (icon['type'] || '');
      const field = this._iconsSection.appendFlexedField(title);
      if (!icon.sizes) {
        imageErrors.push(ls`Icon ${iconUrl} does not specify its size in the manifest`);
      } else if (!/^\d+x\d+$/.test(icon.sizes)) {
        imageErrors.push(ls`Icon ${iconUrl} should specify its size as \`{width}x{height}\``);
      } else {
        const [width, height] = icon.sizes.split('x').map(x => parseInt(x, 10));
        if (image.naturalWidth !== width && image.naturalHeight !== height) {
          imageErrors.push(ls`Actual size (${image.naturalWidth}×${image.naturalHeight})px of icon ${
              iconUrl} does not match specified size (${width}×${height}px)`);
        } else if (image.naturalWidth !== width) {
          imageErrors.push(
              ls
              `Actual width (${image.naturalWidth}px) of icon ${iconUrl} does not match specified width (${width}px)`);
        } else if (image.naturalHeight !== height) {
          imageErrors.push(ls`Actual height (${image.naturalHeight}px) of icon ${
              iconUrl} does not match specified height (${height}px)`);
        }
      }
      field.appendChild(wrapper);
    }

    this._installabilitySection.clearContent();
    this._installabilitySection.element.classList.toggle('hidden', !installabilityErrors.length);
    const errorMessages = this.getInstallabilityErrorMessages(installabilityErrors);
    for (const error of errorMessages) {
      this._installabilitySection.appendRow().appendChild(UI.UIUtils.createIconLabel(error, 'smallicon-warning'));
    }

    this._errorsSection.element.classList.toggle('hidden', !errors.length && !imageErrors.length);
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
                  .value}px is required, the sizes attribute must be set, and the purpose attribute, if set, must include "any" or "maskable".`;
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
              installabilityError.errorArguments[0].value}px square in PNG, SVG or WebP format`;
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
        default:
          console.error(`Installability error id '${installabilityError.errorId}' is not recognized`);
          break;
      }
      if (errorMessages) {
        errorMessages.push(errorMessage);
      }
    }
    return errorMessages;
  }

  /**
   * @param {?string} url
   * @return {!Promise<?{image: !Element, wrapper: !Element}>}
   */
  async _loadImage(url) {
    const wrapper = createElement('div');
    wrapper.classList.add('image-wrapper');
    const image = createElement('img');
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
}
