// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/legacy/components/inline_editor/inline_editor.js';
import '../../ui/components/report_view/report_view.js';
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, i18nTemplate, nothing, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import appManifestViewStyles from './appManifestView.css.js';
import * as ApplicationComponents from './components/components.js';
const { styleMap, classMap, ref } = Directives;
const { linkifyURL } = Components.Linkifier.Linkifier;
const { widgetConfig } = UI.Widget;
const UIStrings = {
    /**
     * @description Text in App Manifest View of the Application panel
     */
    noManifestDetected: 'No manifest detected',
    /**
     * @description Description text on manifests in App Manifest View of the Application panel which describes the app manifest view tab
     */
    manifestDescription: 'A manifest defines how your app appears on phone’s home screens and what the app looks like on launch.',
    /**
     * @description Text in App Manifest View of the Application panel
     */
    appManifest: 'Manifest',
    /**
     * @description Text in App Manifest View of the Application panel
     */
    errorsAndWarnings: 'Errors and warnings',
    /**
     * @description Text in App Manifest View of the Application panel
     */
    installability: 'Installability',
    /**
     * @description Text in App Manifest View of the Application panel
     */
    identity: 'Identity',
    /**
     * @description Text in App Manifest View of the Application panel
     */
    presentation: 'Presentation',
    /**
     * @description Text in App Manifest View of the Application panel
     */
    protocolHandlers: 'Protocol Handlers',
    /**
     * @description Text in App Manifest View of the Application panel
     */
    icons: 'Icons',
    /**
     * @description Text in App Manifest View of the Application panel
     */
    windowControlsOverlay: 'Window Controls Overlay',
    /**
     * @description Label in the App Manifest View for the "name" property of web app or shortcut item
     */
    name: 'Name',
    /**
     * @description Label in the App Manifest View for the "short_name" property of web app or shortcut item
     */
    shortName: 'Short name',
    /**
     * @description Label in the App Manifest View for the "url" property of shortcut item
     */
    url: 'URL',
    /**
     * @description Label in the App Manifest View for the Computed App Id
     */
    computedAppId: 'Computed App ID',
    /**
     * @description Popup-text explaining what the App Id is used for.
     */
    appIdExplainer: 'This is used by the browser to know whether the manifest should be updating an existing application, or whether it refers to a new web app that can be installed.',
    /**
     * @description Text which is a hyperlink to more documentation
     */
    learnMore: 'Learn more',
    /**
     * @description Explanation why it is advisable to specify an 'id' field in the manifest.
     * @example {/index.html} PH1
     * @example {(button for copying suggested value into clipboard)} PH2
     */
    appIdNote: 'Note: `id` is not specified in the manifest, `start_url` is used instead. To specify an App ID that matches the current identity, set the `id` field to {PH1} {PH2}.',
    /**
     * @description Tooltip text that appears when hovering over a button which copies the previous text to the clipboard.
     */
    copyToClipboard: 'Copy suggested ID to clipboard',
    /**
     * @description Screen reader announcement string when the user clicks the copy to clipboard button.
     * @example {/index.html} PH1
     */
    copiedToClipboard: 'Copied suggested ID {PH1} to clipboard',
    /**
     * @description Label in the App Manifest View for the "description" property of web app or shortcut item
     */
    description: 'Description',
    /**
     * @description Text in App Manifest View of the Application panel
     */
    startUrl: 'Start URL',
    /**
     * @description Text in App Manifest View of the Application panel
     */
    themeColor: 'Theme color',
    /**
     * @description Text in App Manifest View of the Application panel
     */
    backgroundColor: 'Background color',
    /**
     * @description Text for the orientation of something
     */
    orientation: 'Orientation',
    /**
     * @description Title of the display attribute in App Manifest View of the Application panel
     * The display attribute defines the preferred display mode for the app such fullscreen or
     * standalone.
     * For more details see https://www.w3.org/TR/appmanifest/#display-member.
     */
    display: 'Display',
    /**
     * @description Title of the new_note_url attribute in the Application panel
     */
    newNoteUrl: 'New note URL',
    /**
     * @description Text in App Manifest View of the Application panel
     */
    descriptionMayBeTruncated: 'Description may be truncated.',
    /**
     * @description Warning text about too many shortcuts
     */
    shortcutsMayBeNotAvailable: 'The maximum number of shortcuts is platform dependent. Some shortcuts may be not available.',
    /**
     * @description Text in App Manifest View of the Application panel
     */
    showOnlyTheMinimumSafeAreaFor: 'Show only the minimum safe area for maskable icons',
    /**
     * @description Link text for more information on maskable icons in App Manifest view of the Application panel
     */
    documentationOnMaskableIcons: 'documentation on maskable icons',
    /**
     * @description Text wrapping a link pointing to more information on maskable icons in App Manifest view of the Application panel
     * @example {https://web.dev/maskable-icon/} PH1
     */
    needHelpReadOurS: 'Need help? Read the {PH1}.',
    /**
     * @description Text in App Manifest View of the Application panel
     * @example {1} PH1
     */
    shortcutS: 'Shortcut #{PH1}',
    /**
     * @description Text in App Manifest View of the Application panel
     * @example {1} PH1
     */
    shortcutSShouldIncludeAXPixel: 'Shortcut #{PH1} should include a 96×96 pixel icon',
    /**
     * @description Text in App Manifest View of the Application panel
     * @example {1} PH1
     */
    screenshotS: 'Screenshot #{PH1}',
    /**
     * @description Manifest installability error in the Application panel
     */
    pageIsNotLoadedInTheMainFrame: 'Page is not loaded in the main frame',
    /**
     * @description Manifest installability error in the Application panel
     */
    pageIsNotServedFromASecureOrigin: 'Page is not served from a secure origin',
    /**
     * @description Manifest installability error in the Application panel
     */
    pageHasNoManifestLinkUrl: 'Page has no manifest <link> `URL`',
    /**
     * @description Manifest installability error in the Application panel
     */
    manifestCouldNotBeFetchedIsEmpty: 'Manifest could not be fetched, is empty, or could not be parsed',
    /**
     * @description Manifest installability error in the Application panel
     */
    manifestStartUrlIsNotValid: 'Manifest \'`start_url`\' is not valid',
    /**
     * @description Manifest installability error in the Application panel
     */
    manifestDoesNotContainANameOr: 'Manifest does not contain a \'`name`\' or \'`short_name`\' field',
    /**
     * @description Manifest installability error in the Application panel
     */
    manifestDisplayPropertyMustBeOne: 'Manifest \'`display`\' property must be one of \'`standalone`\', \'`fullscreen`\', or \'`minimal-ui`\'',
    /**
     * @description Manifest installability error in the Application panel
     * @example {100} PH1
     */
    manifestDoesNotContainASuitable: 'Manifest does not contain a suitable icon—PNG, SVG, or WebP format of at least {PH1}px is required, the \'`sizes`\' attribute must be set, and the \'`purpose`\' attribute, if set, must include \'`any`\'.',
    /**
     * @description Manifest installability error in the Application panel
     */
    avoidPurposeAnyAndMaskable: 'Declaring an icon with \'`purpose`\' of \'`any maskable`\' is discouraged. It is likely to look incorrect on some platforms due to too much or too little padding.',
    /**
     * @description Manifest installability error in the Application panel
     * @example {100} PH1
     */
    noSuppliedIconIsAtLeastSpxSquare: 'No supplied icon is at least {PH1} pixels square in `PNG`, `SVG`, or `WebP` format, with the purpose attribute unset or set to \'`any`\'.',
    /**
     * @description Manifest installability error in the Application panel
     */
    couldNotDownloadARequiredIcon: 'Could not download a required icon from the manifest',
    /**
     * @description Manifest installability error in the Application panel
     */
    downloadedIconWasEmptyOr: 'Downloaded icon was empty or corrupted',
    /**
     * @description Manifest installability error in the Application panel
     */
    theSpecifiedApplicationPlatform: 'The specified application platform is not supported on Android',
    /**
     * @description Manifest installability error in the Application panel
     */
    noPlayStoreIdProvided: 'No Play store ID provided',
    /**
     * @description Manifest installability error in the Application panel
     */
    thePlayStoreAppUrlAndPlayStoreId: 'The Play Store app URL and Play Store ID do not match',
    /**
     * @description Manifest installability error in the Application panel
     */
    theAppIsAlreadyInstalled: 'The app is already installed',
    /**
     * @description Manifest installability error in the Application panel
     */
    aUrlInTheManifestContainsA: 'A URL in the manifest contains a username, password, or port',
    /**
     * @description Manifest installability error in the Application panel
     */
    pageIsLoadedInAnIncognitoWindow: 'Page is loaded in an incognito window',
    /**
     * @description Manifest installability error in the Application panel
     */
    pageDoesNotWorkOffline: 'Page does not work offline',
    /**
     * @description Manifest installability error in the Application panel
     */
    couldNotCheckServiceWorker: 'Could not check `service worker` without a \'`start_url`\' field in the manifest',
    /**
     * @description Manifest installability error in the Application panel
     */
    manifestSpecifies: 'Manifest specifies \'`prefer_related_applications`: true\'',
    /**
     * @description Manifest installability error in the Application panel
     */
    preferrelatedapplicationsIsOnly: '\'`prefer_related_applications`\' is only supported on `Chrome` Beta and Stable channels on `Android`.',
    /**
     * @description Manifest installability error in the Application panel
     */
    manifestContainsDisplayoverride: 'Manifest contains \'`display_override`\' field, and the first supported display mode must be one of \'`standalone`\', \'`fullscreen`\', or \'`minimal-ui`\'',
    /**
     * @description Warning message for offline capability check
     * @example {https://developer.chrome.com/blog/improved-pwa-offline-detection} PH1
     */
    pageDoesNotWorkOfflineThePage: 'Page does not work offline. Starting in Chrome 93, the installability criteria are changing, and this site will not be installable. See {PH1} for more information.',
    /**
     * @description Text to indicate the source of an image
     * @example {example.com} PH1
     */
    imageFromS: 'Image from {PH1}',
    /**
     * @description Text for one or a group of screenshots
     */
    screenshot: 'Screenshot',
    /**
     * @description Label in the App Manifest View for the "form_factor" property of screenshot
     */
    formFactor: 'Form factor',
    /**
     * @description Label in the App Manifest View for the "label" property of screenshot
     */
    label: 'Label',
    /**
     * @description Label in the App Manifest View for the "platform" property of screenshot
     */
    platform: 'Platform',
    /**
     * @description Text in App Manifest View of the Application panel
     */
    icon: 'Icon',
    /**
     * @description This is a warning message telling the user about a problem where the src attribute
     * of an image has not be entered/provided correctly. 'src' is part of the DOM API and should not
     * be translated.
     * @example {ImageName} PH1
     */
    sSrcIsNotSet: '{PH1} \'`src`\' is not set',
    /**
     * @description Warning message for image resources from the manifest
     * @example {Screenshot} PH1
     * @example {https://example.com/image.png} PH2
     */
    sUrlSFailedToParse: '{PH1} URL \'\'{PH2}\'\' failed to parse',
    /**
     * @description Warning message for image resources from the manifest
     * @example {Image} PH1
     * @example {https://example.com/image.png} PH2
     */
    sSFailedToLoad: '{PH1} {PH2} failed to load',
    /**
     * @description Warning message for image resources from the manifest
     * @example {Image} PH1
     * @example {https://example.com/image.png} PH2
     */
    sSDoesNotSpecifyItsSizeInThe: '{PH1} {PH2} does not specify its size in the manifest',
    /**
     * @description Warning message for image resources from the manifest
     * @example {Image} PH1
     * @example {https://example.com/image.png} PH2
     */
    sSShouldSpecifyItsSizeAs: '{PH1} {PH2} should specify its size as `[width]x[height]`',
    /**
     * @description Warning message for image resources from the manifest
     */
    sSShouldHaveSquareIcon: 'Most operating systems require square icons. Please include at least one square icon in the array.',
    /**
     * @description Warning message for image resources from the manifest
     * @example {100} PH1
     * @example {100} PH2
     * @example {Image} PH3
     * @example {https://example.com/image.png} PH4
     * @example {200} PH5
     * @example {200} PH6
     */
    actualSizeSspxOfSSDoesNotMatch: 'Actual size ({PH1}×{PH2})px of {PH3} {PH4} does not match specified size ({PH5}×{PH6}px)',
    /**
     * @description Warning message for image resources from the manifest
     * @example {100} PH1
     * @example {Image} PH2
     * @example {https://example.com/image.png} PH3
     * @example {200} PH4
     */
    actualWidthSpxOfSSDoesNotMatch: 'Actual width ({PH1}px) of {PH2} {PH3} does not match specified width ({PH4}px)',
    /**
     * @description Warning message for image resources from the manifest
     * @example {100} PH1
     * @example {Image} PH2
     * @example {https://example.com/image.png} PH3
     * @example {100} PH4
     */
    actualHeightSpxOfSSDoesNotMatch: 'Actual height ({PH1}px) of {PH2} {PH3} does not match specified height ({PH4}px)',
    /**
     * @description Warning message for image resources from the manifest
     * @example {Image} PH1
     * @example {https://example.com/image.png} PH2
     */
    sSSizeShouldBeAtLeast320: '{PH1} {PH2} size should be at least 320×320',
    /**
     * @description Warning message for image resources from the manifest
     * @example {Image} PH1
     * @example {https://example.com/image.png} PH2
     */
    sSSizeShouldBeAtMost3840: '{PH1} {PH2} size should be at most 3840×3840',
    /**
     * @description Warning message for image resources from the manifest
     * @example {Image} PH1
     * @example {https://example.com/image.png} PH2
     */
    sSWidthDoesNotComplyWithRatioRequirement: '{PH1} {PH2} width can\'t be more than 2.3 times as long as the height',
    /**
     * @description Warning message for image resources from the manifest
     * @example {Image} PH1
     * @example {https://example.com/image.png} PH2
     */
    sSHeightDoesNotComplyWithRatioRequirement: '{PH1} {PH2} height can\'t be more than 2.3 times as long as the width',
    /**
     * @description Manifest installability error in the Application panel
     * @example {https://example.com/image.png} url
     */
    screenshotPixelSize: 'Screenshot {url} should specify a pixel size `[width]x[height]` instead of `any` as first size.',
    /**
     * @description Warning text about screenshots for Richer PWA Install UI on desktop
     */
    noScreenshotsForRicherPWAInstallOnDesktop: 'Richer PWA Install UI won’t be available on desktop. Please add at least one screenshot with the `form_factor` set to `wide`.',
    /**
     * @description Warning text about screenshots for Richer PWA Install UI on mobile
     */
    noScreenshotsForRicherPWAInstallOnMobile: 'Richer PWA Install UI won’t be available on mobile. Please add at least one screenshot for which `form_factor` is not set or set to a value other than `wide`.',
    /**
     * @description Warning text about too many screenshots for desktop
     */
    tooManyScreenshotsForDesktop: 'No more than 8 screenshots will be displayed on desktop. The rest will be ignored.',
    /**
     * @description Warning text about too many screenshots for mobile
     */
    tooManyScreenshotsForMobile: 'No more than 5 screenshots will be displayed on mobile. The rest will be ignored.',
    /**
     * @description Warning text about not all screenshots matching the appropriate form factor have the same aspect ratio
     */
    screenshotsMustHaveSameAspectRatio: 'All screenshots with the same `form_factor` must have the same aspect ratio as the first screenshot with that `form_factor`. Some screenshots will be ignored.',
    /**
     * @description Message for Window Controls Overlay value succsessfully found with links to documnetation
     * @example {window-controls-overlay} PH1
     * @example {https://developer.mozilla.org/en-US/docs/Web/Manifest/display_override} PH2
     * @example {https://developer.mozilla.org/en-US/docs/Web/Manifest} PH3
     */
    wcoFound: 'Chrome has successfully found the {PH1} value for the {PH2} field in the {PH3}.',
    /**
     * @description Message for Windows Control Overlay value not found with link to documentation
     * @example {https://developer.mozilla.org/en-US/docs/Web/Manifest/display_override} PH1
     */
    wcoNotFound: 'Define {PH1} in the manifest to use the Window Controls Overlay API and customize your app\'s title bar.',
    /**
     * @description Link text for more information on customizing Window Controls Overlay title bar in the Application panel
     */
    customizePwaTitleBar: 'Customize the window controls overlay of your PWA\'s title bar',
    /**
     * @description Text wrapping link to documentation on how to customize WCO title bar
     * @example {https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps-chromium/how-to/window-controls-overlay} PH1
     */
    wcoNeedHelpReadMore: 'Need help? Read {PH1}.',
    /**
     * @description Text for emulation OS selection dropdown
     */
    selectWindowControlsOverlayEmulationOs: 'Emulate the Window Controls Overlay on',
    /**
     * @description Alert message for screen reader to announce which subsection is being scrolled to
     * @example {"Identity"} PH1
     */
    onInvokeAlert: 'Scrolled to {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/AppManifestView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
function renderSectionHeader(text, output) {
    // clang-format off
    return html `
    <devtools-report-section-header
        ${ref(e => {
        if (output && e instanceof HTMLElement) {
            output.scrollToSection.set(text, () => { e.scrollIntoView(); });
        }
    })}>
      ${text}
    </devtools-report-section-header>`;
    // clang-format on
}
function renderErrors(warnings, manifestErrors, imageErrors, output) {
    // clang-format off
    return html `
    ${renderSectionHeader(i18nString(UIStrings.errorsAndWarnings), output)}
    <div class="report-section" jslog=${VisualLogging.section('errors-and-warnings')}>
      ${manifestErrors?.map(error => html `<div class="report-row">
          <devtools-icon
          name=${error.critical ? 'cross-circle-filled' : 'warning-filled'}
          style=${styleMap({ color: error.critical ? 'var(--icon-error)' : 'var(--icon-warning)' })}>
        </devtools-icon>
        ${error.message}</div>
      `)}
      ${warnings?.map(warning => html `<div class="report-row">${warning}</div>`)}
      ${imageErrors?.map(error => html `<div class="report-row">${error}</div>`)}
    </div>`;
    // clang-format on
}
function renderIdentity(identityData, onCopy, output) {
    const { name, shortName, description, appId, recommendedId, hasId } = identityData;
    // clang-format off
    return html `${renderSectionHeader(i18nString(UIStrings.identity), output)}
  <div class="report-section" jslog=${VisualLogging.section('identity')}>
    <devtools-report-key>${i18nString(UIStrings.name)}</devtools-report-key>
    <devtools-report-value>${name}</devtools-report-value>
    <devtools-report-key>${i18nString(UIStrings.shortName)}</devtools-report-key>
    <devtools-report-value>${shortName}</devtools-report-value>
    <devtools-report-key>${i18nString(UIStrings.description)}</devtools-report-key>
    <devtools-report-value>${description}</devtools-report-value>
    ${appId && recommendedId ? html `
      <devtools-report-key aria-label="App Id">${i18nString(UIStrings.computedAppId)}</devtools-report-key>
      <devtools-report-value jslog=${VisualLogging.section('identity')}>
        ${appId}
        <devtools-icon class="inline-icon" name="help" title=${i18nString(UIStrings.appIdExplainer)}
            jslog=${VisualLogging.action('help').track({ hover: true })}>
        </devtools-icon>
        <devtools-link href="https://developer.chrome.com/blog/pwa-manifest-id/"
                      .jslogContext=${'learn-more'}
                      ${ref(setFocusOnSection(i18nString(UIStrings.identity), output))}>
          ${i18nString(UIStrings.learnMore)}
        </devtools-link>
        ${!hasId ? html `
          <div class="multiline-value">
            ${i18nTemplate(str_, UIStrings.appIdNote, {
        PH1: html `<code>${recommendedId}</code>`,
        PH2: html `<devtools-button class="inline-button" @click=${onCopy}
                          .iconName=${'copy'}
                          .variant=${"icon" /* Buttons.Button.Variant.ICON */}
                          .size=${"SMALL" /* Buttons.Button.Size.SMALL */}
                          .jslogContext=${'manifest.copy-id'}
                          .title=${i18nString(UIStrings.copyToClipboard)}>
                        </devtools-button>`,
    })}
        </div>` : nothing}
      </devtools-report-value>` : nothing}
    </div>`;
    // clang-format on
}
function renderPresentation(presentationData, output) {
    const { startUrl, completeStartUrl, themeColor, backgroundColor, orientation, display, newNoteUrl, hasNewNoteUrl, completeNewNoteUrl, } = presentationData;
    // clang-format off
    return html `${renderSectionHeader(i18nString(UIStrings.presentation), output)}
    <div class="report-section" jslog=${VisualLogging.section('presentation')}>
      <devtools-report-key>${i18nString(UIStrings.startUrl)}</devtools-report-key>
      <devtools-report-value>
      ${completeStartUrl ? (() => {
        const link = linkifyURL(completeStartUrl, { text: startUrl, tabStop: true, jslogContext: 'start-url' });
        output.focusOnSection.set(i18nString(UIStrings.presentation), () => link.focus());
        return link;
    })() : nothing}
      </devtools-report-value>
      <devtools-report-key>${i18nString(UIStrings.themeColor)}</devtools-report-key>
      <devtools-report-value>${themeColor
        ? html `<devtools-color-swatch .color=${themeColor}></devtools-color-swatch>`
        : nothing}
      </devtools-report-value>
      <devtools-report-key>${i18nString(UIStrings.backgroundColor)}</devtools-report-key>
      <devtools-report-value>${backgroundColor
        ? html `<devtools-color-swatch .color=${backgroundColor}></devtools-color-swatch>`
        : nothing}
      </devtools-report-value>
      <devtools-report-key>${i18nString(UIStrings.orientation)}</devtools-report-key>
      <devtools-report-value>${orientation}</devtools-report-value>
      <devtools-report-key>${i18nString(UIStrings.display)}</devtools-report-key>
      <devtools-report-value>${display}</devtools-report-value>
      ${completeNewNoteUrl ? html `
        <devtools-report-key>${i18nString(UIStrings.newNoteUrl)}</devtools-report-key>
        <devtools-report-value>${hasNewNoteUrl
        ? linkifyURL(completeNewNoteUrl, { text: newNoteUrl, tabStop: true })
        : nothing}
        </devtools-report-value>
      ` : nothing}
    </div>
  `;
    // clang-format on
}
function renderProtocolHandlers(data, output) {
    // clang-format off
    return html `${renderSectionHeader(i18nString(UIStrings.protocolHandlers), output)}
    <div class="report-row">
      <devtools-widget .widgetConfig=${widgetConfig(ApplicationComponents.ProtocolHandlersView.ProtocolHandlersView, { protocolHandlers: data.protocolHandlers, manifestLink: data.manifestLink })}
        ${ref(setFocusOnSection(i18nString(UIStrings.protocolHandlers), output))}>
      </devtools-widget>
    </div>
    <devtools-report-divider></devtools-report-divider>`;
    // clang-format on
}
function renderImage(imageSrc, imageUrl, naturalWidth) {
    // clang-format off
    return html `
    <div class="image-wrapper">
      <img src=${imageSrc} alt=${i18nString(UIStrings.imageFromS, { PH1: imageUrl })}
          width=${naturalWidth}>
    </div>`;
    // clang-format on
}
function setFocusOnSection(section, output) {
    return (e) => {
        if (e instanceof HTMLElement) {
            output.focusOnSection.set(section, () => e.focus());
        }
    };
}
function renderIcons(data, maskedIcons, onToggleIconMasked, output) {
    // clang-format off
    return html `${renderSectionHeader(i18nString(UIStrings.icons), output)}
    <div class="report-section" jslog=${VisualLogging.section('icons')}>
      <div class="report-row">
        <devtools-checkbox class="mask-checkbox"
            jslog=${VisualLogging.toggle('show-minimal-safe-area-for-maskable-icons')
        .track({ change: true })}
            @click=${(event) => onToggleIconMasked(event.target.checked)}
            ${ref(setFocusOnSection(i18nString(UIStrings.icons), output))}>
          ${i18nString(UIStrings.showOnlyTheMinimumSafeAreaFor)}
        </devtools-checkbox>
      </div>
      <div class="report-row">
        ${i18nTemplate(str_, UIStrings.needHelpReadOurS, {
        PH1: html `
            <devtools-link href="https://web.dev/maskable-icon/" .jslogContext=${'learn-more'}>
              ${i18nString(UIStrings.documentationOnMaskableIcons)}
            </devtools-link>`,
    })}
      </div>
      ${Array.from(data.icons).map(([title, images]) => {
        return html `
        <devtools-report-key>${title}</devtools-report-key>
        <devtools-report-value class=${classMap({ 'show-mask': Boolean(maskedIcons) })}>
          ${images.filter(icon => 'imageSrc' in icon)
            .map(icon => renderImage(icon.imageSrc, icon.imageUrl, icon.naturalWidth))}
        </devtools-report-value>
      `;
    })}
    </div>`;
    // clang-format on
}
function renderShortcuts(data) {
    // clang-format off
    return html `${data.shortcuts.map((shortcut, index) => html `
    ${renderSectionHeader(i18nString(UIStrings.shortcutS, { PH1: index + 1 }))}
    <div class="report-section" jslog=${VisualLogging.section('shortcuts')}>
      <devtools-report-key>${i18nString(UIStrings.name)}</devtools-report-key>
      <devtools-report-value>${shortcut.name}</devtools-report-value>
      ${shortcut.shortName ? html `
        <devtools-report-key>${i18nString(UIStrings.shortName)}</devtools-report-key>
        <devtools-report-value>${shortcut.shortName}</devtools-report-value>
      ` : nothing}
      ${shortcut.description ? html `
        <devtools-report-key>${i18nString(UIStrings.description)}</devtools-report-key>
        <devtools-report-value>${shortcut.description}</devtools-report-value>
      ` : nothing}
      <devtools-report-key>${i18nString(UIStrings.url)}</devtools-report-key>
      <devtools-report-value>
        ${linkifyURL(shortcut.shortcutUrl, { text: shortcut.url, tabStop: true, jslogContext: 'shortcut' })}
      </devtools-report-value>
      ${Array.from(shortcut.icons).map(([title, images]) => html `
        <devtools-report-key>${title}</devtools-report-key>
        <devtools-report-value>
          ${images.filter(icon => 'imageSrc' in icon)
        .map(icon => renderImage(icon.imageSrc, icon.imageUrl, icon.naturalWidth))}
        </devtools-report-value>
      `)}
    </div>`)}`;
    // clang-format on
}
function renderScreenshots(data) {
    // clang-format off
    return html `${data.screenshots.map(({ screenshot, processedImage }, index) => html `
    ${renderSectionHeader(i18nString(UIStrings.screenshotS, { PH1: index + 1 }))}
    <div class="report-section" jslog=${VisualLogging.section('screenshots')}>
      ${screenshot.form_factor
        ? html `<devtools-report-key>${i18nString(UIStrings.formFactor)}</devtools-report-key>
          <devtools-report-value>${screenshot.form_factor}</devtools-report-value>`
        : nothing}
      ${screenshot.label
        ? html `<devtools-report-key>${i18nString(UIStrings.label)}</devtools-report-key>
          <devtools-report-value>${screenshot.label}</devtools-report-value>`
        : nothing}
      ${screenshot.platform
        ? html `<devtools-report-key>${i18nString(UIStrings.platform)}</devtools-report-key>
          <devtools-report-value>${screenshot.platform}</devtools-report-value>`
        : nothing}
      ${'imageSrc' in processedImage ? html `
        <devtools-report-key>${processedImage.title}</devtools-report-key>
        <devtools-report-value>
          ${renderImage(processedImage.imageSrc, processedImage.imageUrl, processedImage.naturalWidth)}
        </devtools-report-value>`
        : nothing}
    </div>
  `)}`;
    // clang-format on
}
function renderInstallability(installabilityErrors) {
    return html `${renderSectionHeader(i18nString(UIStrings.installability))}
    ${getInstallabilityErrorMessages(installabilityErrors).map(content => html `
      <div class="report-row">
        ${content}
      </div>
    `)}`;
}
function renderWindowControlsSection(data, selectedPlatform, onSelectOs, onToggleWcoToolbar, output) {
    // clang-format off
    return html `
    ${renderSectionHeader(i18nString(UIStrings.windowControlsOverlay), output)}
    <div class="report-section" jslog=${VisualLogging.section('window-controls-overlay')}>
      ${data?.hasWco && output ? html `
        <div class="report-row">
          <devtools-icon class="inline-icon" name="check-circle"></devtools-icon>
          ${i18nTemplate(str_, UIStrings.wcoFound, {
        PH1: html `<code class="wco">window-controls-overlay</code>`,
        PH2: html `<code>
              <devtools-link
                href="https://developer.mozilla.org/en-US/docs/Web/Manifest/display_override"
                .jslogContext=${'display-override'}
                ${ref(setFocusOnSection(i18nString(UIStrings.windowControlsOverlay), output))}>
                display-override
              </devtools-link>
            </code>`,
        PH3: html `${Components.Linkifier.Linkifier.linkifyURL(data.url)}`,
    })}
        </div>
        ${selectedPlatform && onSelectOs && onToggleWcoToolbar ?
        renderWindowControls(selectedPlatform, onSelectOs, onToggleWcoToolbar) :
        nothing}` : html `
          <div class="report-row">
            <devtools-icon class="inline-icon" name="info"></devtools-icon>
            ${i18nTemplate(str_, UIStrings.wcoNotFound, { PH1: html `<code>
                <devtools-link
                    href="https://developer.mozilla.org/en-US/docs/Web/Manifest/display_override"
                    .jslogContext=${'display-override'}
                    ${ref(setFocusOnSection(i18nString(UIStrings.windowControlsOverlay), output))}>
                  display-override
                </devtools-link>
              </code>` })}
          </div>`}
        <div class="report-row">
          ${i18nTemplate(str_, UIStrings.wcoNeedHelpReadMore, { PH1: html `<devtools-link
              href="https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps-chromium/how-to/window-controls-overlay"
              .jslogContext=${'customize-pwa-tittle-bar'}>
            ${i18nString(UIStrings.customizePwaTitleBar)}
          </devtools-link>` })}
        </div>
    </div>`;
    // clang-format on
}
function getInstallabilityErrorMessages(installabilityErrors) {
    const errorMessages = [];
    for (const installabilityError of installabilityErrors) {
        let errorMessage;
        switch (installabilityError.errorId) {
            case 'not-in-main-frame':
                errorMessage = i18nString(UIStrings.pageIsNotLoadedInTheMainFrame);
                break;
            case 'not-from-secure-origin':
                errorMessage = i18nString(UIStrings.pageIsNotServedFromASecureOrigin);
                break;
            case 'no-manifest':
                errorMessage = i18nString(UIStrings.pageHasNoManifestLinkUrl);
                break;
            case 'manifest-empty':
                errorMessage = i18nString(UIStrings.manifestCouldNotBeFetchedIsEmpty);
                break;
            case 'start-url-not-valid':
                errorMessage = i18nString(UIStrings.manifestStartUrlIsNotValid);
                break;
            case 'manifest-missing-name-or-short-name':
                errorMessage = i18nString(UIStrings.manifestDoesNotContainANameOr);
                break;
            case 'manifest-display-not-supported':
                errorMessage = i18nString(UIStrings.manifestDisplayPropertyMustBeOne);
                break;
            case 'manifest-missing-suitable-icon':
                if (installabilityError.errorArguments.length !== 1 ||
                    installabilityError.errorArguments[0].name !== 'minimum-icon-size-in-pixels') {
                    console.error('Installability error does not have the correct errorArguments');
                    break;
                }
                errorMessage =
                    i18nString(UIStrings.manifestDoesNotContainASuitable, { PH1: installabilityError.errorArguments[0].value });
                break;
            case 'no-acceptable-icon':
                if (installabilityError.errorArguments.length !== 1 ||
                    installabilityError.errorArguments[0].name !== 'minimum-icon-size-in-pixels') {
                    console.error('Installability error does not have the correct errorArguments');
                    break;
                }
                errorMessage =
                    i18nString(UIStrings.noSuppliedIconIsAtLeastSpxSquare, { PH1: installabilityError.errorArguments[0].value });
                break;
            case 'cannot-download-icon':
                errorMessage = i18nString(UIStrings.couldNotDownloadARequiredIcon);
                break;
            case 'no-icon-available':
                errorMessage = i18nString(UIStrings.downloadedIconWasEmptyOr);
                break;
            case 'platform-not-supported-on-android':
                errorMessage = i18nString(UIStrings.theSpecifiedApplicationPlatform);
                break;
            case 'no-id-specified':
                errorMessage = i18nString(UIStrings.noPlayStoreIdProvided);
                break;
            case 'ids-do-not-match':
                errorMessage = i18nString(UIStrings.thePlayStoreAppUrlAndPlayStoreId);
                break;
            case 'already-installed':
                errorMessage = i18nString(UIStrings.theAppIsAlreadyInstalled);
                break;
            case 'url-not-supported-for-webapk':
                errorMessage = i18nString(UIStrings.aUrlInTheManifestContainsA);
                break;
            case 'in-incognito':
                errorMessage = i18nString(UIStrings.pageIsLoadedInAnIncognitoWindow);
                break;
            case 'not-offline-capable':
                errorMessage = i18nString(UIStrings.pageDoesNotWorkOffline);
                break;
            case 'no-url-for-service-worker':
                errorMessage = i18nString(UIStrings.couldNotCheckServiceWorker);
                break;
            case 'prefer-related-applications':
                errorMessage = i18nString(UIStrings.manifestSpecifies);
                break;
            case 'prefer-related-applications-only-beta-stable':
                errorMessage = i18nString(UIStrings.preferrelatedapplicationsIsOnly);
                break;
            case 'manifest-display-override-not-supported':
                errorMessage = i18nString(UIStrings.manifestContainsDisplayoverride);
                break;
            case 'warn-not-offline-capable':
                errorMessage = i18nString(UIStrings.pageDoesNotWorkOfflineThePage, { PH1: 'https://developer.chrome.com/blog/improved-pwa-offline-detection/' });
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
function renderWindowControls(selectedPlatform, onSelectOs, onToggleWcoToolbar) {
    // clang-format off
    return html `<div class="report-row">
      <devtools-checkbox @click=${(event) => onToggleWcoToolbar(event.target.checked)}
          title=${i18nString(UIStrings.selectWindowControlsOverlayEmulationOs)}>
        ${i18nString(UIStrings.selectWindowControlsOverlayEmulationOs)}
      </devtools-checkbox>
      <select value=${selectedPlatform}
              @change=${(event) => {
        const target = event.target;
        const selectedOS = target.options[target.selectedIndex].value;
        void onSelectOs(selectedOS);
    }}
             .selectedIndex=${0}>
        <option value=${"Windows" /* SDK.OverlayModel.EmulatedOSType.WINDOWS */}
                jslog=${VisualLogging.item('windows').track({ click: true })}>
          Windows
        </option>
        <option value=${"Mac" /* SDK.OverlayModel.EmulatedOSType.MAC */}
                jslog=${VisualLogging.item('macos').track({ click: true })}>
          macOS
        </option>
        <option value=${"Linux" /* SDK.OverlayModel.EmulatedOSType.LINUX */}
                jslog=${VisualLogging.item('linux').track({ click: true })}>
          Linux
        </option>
      </select>
    </div>`;
    // clang-format on
}
export const DEFAULT_VIEW = (input, output, target) => {
    const { isEmpty, identityData, presentationData, protocolHandlersData, iconsData, shortcutsData, screenshotsData, installabilityErrors, warnings, errors, imageErrors, maskedIcons, windowControlsData, selectedPlatform, onSelectOs, onToggleWcoToolbar, onToggleIconMasked, onCopyId, url, } = input;
    // clang-format off
    render(html `
    <style>${appManifestViewStyles}</style>
    <style>${UI.inspectorCommonStyles}</style>
    ${isEmpty ? html `
    <devtools-widget .widgetConfig=${widgetConfig(UI.EmptyWidget.EmptyWidget, {
        header: i18nString(UIStrings.noManifestDetected),
        text: i18nString(UIStrings.manifestDescription),
        link: 'https://web.dev/add-manifest/'
    })}></devtools-widget>` : html `
    <devtools-report .data=${{ reportTitle: i18nString(UIStrings.appManifest), reportUrl: url }}>
      ${renderErrors(warnings, errors, imageErrors, output)}
      ${installabilityErrors?.length ? renderInstallability(installabilityErrors) : nothing}
      ${identityData && onCopyId ? renderIdentity(identityData, onCopyId, output) : nothing}
      ${presentationData ? renderPresentation(presentationData, output) : nothing}
      ${protocolHandlersData ? renderProtocolHandlers(protocolHandlersData, output) : nothing}
      ${iconsData && onToggleIconMasked && maskedIcons ?
        renderIcons(iconsData, maskedIcons, onToggleIconMasked, output) : nothing}
      ${windowControlsData && output ? renderWindowControlsSection(windowControlsData, selectedPlatform, onSelectOs, onToggleWcoToolbar, output) : nothing}
      ${shortcutsData ? renderShortcuts(shortcutsData) : nothing}
      ${screenshotsData ? renderScreenshots(screenshotsData) : nothing}
    </devtools-report>`}`, target);
    // clang-format on
};
export class AppManifestView extends Common.ObjectWrapper.eventMixin(UI.Widget.VBox) {
    registeredListeners;
    target;
    resourceTreeModel;
    serviceWorkerManager;
    overlayModel;
    manifestUrl;
    manifestData;
    manifestErrors;
    installabilityErrors;
    appIdResponse;
    wcoToolbarEnabled = false;
    maskedIcons = false;
    view;
    output = { scrollToSection: new Map(), focusOnSection: new Map() };
    constructor(view = DEFAULT_VIEW) {
        super({
            jslog: `${VisualLogging.pane('manifest')}`,
            useShadowDom: true,
        });
        this.view = view;
        SDK.TargetManager.TargetManager.instance().observeTargets(this);
        this.registeredListeners = [];
        this.manifestUrl = Platform.DevToolsPath.EmptyUrlString;
        this.manifestData = null;
        this.manifestErrors = [];
        this.installabilityErrors = [];
        this.appIdResponse = null;
    }
    scrollToSection(sectionTitle) {
        const handler = this.output.scrollToSection.get(sectionTitle);
        if (!handler) {
            return;
        }
        handler();
        UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.onInvokeAlert, { PH1: sectionTitle }));
    }
    focusOnSection(sectionTitle) {
        const handler = this.output.focusOnSection.get(sectionTitle);
        if (!handler) {
            return false;
        }
        handler();
        return true;
    }
    getStaticSections() {
        return [
            { title: i18nString(UIStrings.identity), jslogContext: 'identity' },
            { title: i18nString(UIStrings.presentation), jslogContext: 'presentation' },
            { title: i18nString(UIStrings.protocolHandlers), jslogContext: 'protocol-handlers' },
            { title: i18nString(UIStrings.icons), jslogContext: 'icons' },
            { title: i18nString(UIStrings.windowControlsOverlay), jslogContext: 'window-controls' },
        ];
    }
    getManifestElement() {
        return this.contentElement;
    }
    targetAdded(target) {
        if (target !== SDK.TargetManager.TargetManager.instance().primaryPageTarget()) {
            return;
        }
        this.target = target;
        this.resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
        this.serviceWorkerManager = target.model(SDK.ServiceWorkerManager.ServiceWorkerManager);
        this.overlayModel = target.model(SDK.OverlayModel.OverlayModel);
        if (!this.resourceTreeModel || !this.serviceWorkerManager || !this.overlayModel) {
            return;
        }
        void this.updateManifest(true);
        this.registeredListeners = [
            this.resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.DOMContentLoaded, () => {
                void this.updateManifest(true);
            }),
            this.serviceWorkerManager.addEventListener("RegistrationUpdated" /* SDK.ServiceWorkerManager.Events.REGISTRATION_UPDATED */, () => {
                void this.updateManifest(false);
            }),
        ];
    }
    targetRemoved(target) {
        if (this.target !== target) {
            return;
        }
        if (!this.resourceTreeModel || !this.serviceWorkerManager || !this.overlayModel) {
            return;
        }
        delete this.resourceTreeModel;
        delete this.serviceWorkerManager;
        delete this.overlayModel;
        Common.EventTarget.removeEventListeners(this.registeredListeners);
    }
    async updateManifest(immediately) {
        if (!this.resourceTreeModel) {
            return;
        }
        const [{ url, data, errors }, installabilityErrors, appId] = await Promise.all([
            this.resourceTreeModel.fetchAppManifest(),
            this.resourceTreeModel.getInstallabilityErrors(),
            this.resourceTreeModel.getAppId(),
        ]);
        this.manifestUrl = url;
        this.manifestData = data;
        this.manifestErrors = errors;
        this.installabilityErrors = installabilityErrors;
        this.appIdResponse = appId;
        if (immediately) {
            await this.performUpdate();
        }
        else {
            await this.requestUpdate();
        }
    }
    async performUpdate() {
        const url = this.manifestUrl;
        let data = this.manifestData;
        const errors = this.manifestErrors;
        const installabilityErrors = this.installabilityErrors;
        const appIdResponse = this.appIdResponse;
        const appId = appIdResponse?.appId || null;
        const recommendedId = appIdResponse?.recommendedId || null;
        if ((!data || data === '{}') && !errors.length) {
            this.view({ isEmpty: true }, this.output, this.contentElement);
            this.dispatchEventToListeners("ManifestDetected" /* Events.MANIFEST_DETECTED */, false);
            return;
        }
        this.dispatchEventToListeners("ManifestDetected" /* Events.MANIFEST_DETECTED */, true);
        if (!data) {
            this.view({ url, errors }, this.output, this.contentElement);
            return;
        }
        if (data.charCodeAt(0) === 0xFEFF) {
            data = data.slice(1);
        } // Trim the BOM as per https://tools.ietf.org/html/rfc7159#section-8.1.
        const parsedManifest = JSON.parse(data);
        const identityData = this.processIdentity(parsedManifest, appId, recommendedId);
        const presentationData = this.processPresentation(parsedManifest, url);
        const protocolHandlersData = this.processProtocolHandlers(parsedManifest, url);
        const iconsData = await this.processIcons(parsedManifest, url);
        const shortcutsData = await this.processShortcuts(parsedManifest, url);
        const screenshotsData = await this.processScreenshots(parsedManifest, url);
        const warnings = [
            ...identityData.warnings,
            ...shortcutsData.warnings,
            ...screenshotsData.warnings,
        ];
        const imageErrors = [
            ...iconsData.imageResourceErrors,
            ...shortcutsData.imageResourceErrors,
            ...screenshotsData.imageResourceErrors,
        ];
        const windowControlsData = await this.processWindowControls(parsedManifest, url);
        const selectedPlatform = this.overlayModel?.getWindowControlsConfig().selectedPlatform;
        const onSelectOs = this.overlayModel ?
            (selectedOS) => this.onSelectOs(selectedOS, windowControlsData.themeColor) :
            undefined;
        const onToggleWcoToolbar = this.overlayModel ? (enabled) => this.onToggleWcoToolbar(enabled) : undefined;
        const onCopyId = recommendedId ? () => {
            UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.copiedToClipboard, { PH1: recommendedId }));
            Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(recommendedId);
        } : undefined;
        const onToggleIconMasked = (masked) => {
            this.maskedIcons = masked;
            this.requestUpdate();
        };
        this.view({
            maskedIcons: this.maskedIcons,
            parsedManifest,
            url,
            identityData,
            presentationData,
            protocolHandlersData,
            iconsData,
            shortcutsData,
            screenshotsData,
            installabilityErrors,
            warnings,
            errors,
            imageErrors,
            windowControlsData,
            selectedPlatform,
            onSelectOs,
            onToggleWcoToolbar,
            onCopyId,
            onToggleIconMasked,
        }, this.output, this.contentElement);
    }
    stringProperty(parsedManifest, name) {
        const value = parsedManifest[name];
        if (typeof value !== 'string') {
            return '';
        }
        return value;
    }
    async loadImage(url) {
        const frameId = this.resourceTreeModel?.mainFrame?.id;
        if (!this.target) {
            throw new Error('no target');
        }
        if (!frameId) {
            throw new Error('no main frame found');
        }
        const { content } = await SDK.PageResourceLoader.PageResourceLoader.instance().loadResource(url, {
            target: this.target,
            frameId,
            initiatorUrl: this.target.inspectedURL(),
        }, 
        /* isBinary=*/ true);
        // Just loading the image, not building UI.
        /* eslint-disable @devtools/no-imperative-dom-api */
        const image = document.createElement('img');
        const result = new Promise((resolve, reject) => {
            image.onload = resolve;
            image.onerror = reject;
        });
        // Octet-stream seems to work for most cases. If it turns out it
        // does not work, we can parse mimeType out of the response headers
        // using front_end/core/platform/MimeType.ts.
        image.src = 'data:application/octet-stream;base64,' + await Common.Base64.encode(content);
        /* eslint-enable @devtools/no-imperative-dom-api */
        try {
            await result;
            return { naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, src: image.src };
        }
        catch {
        }
        return null;
    }
    parseSizes(sizes, resourceName, imageUrl, imageResourceErrors) {
        const rawSizeArray = sizes ? sizes.split(/\s+/) : [];
        const parsedSizes = [];
        for (const size of rawSizeArray) {
            if (size === 'any') {
                if (!parsedSizes.find(x => 'any' in x)) {
                    parsedSizes.push({ any: 'any', formatted: 'any' });
                }
                continue;
            }
            const match = size.match(/^(?<width>\d+)[xX](?<height>\d+)$/);
            if (match) {
                const width = parseInt(match.groups?.width || '', 10);
                const height = parseInt(match.groups?.height || '', 10);
                const formatted = `${width}×${height}px`;
                parsedSizes.push({ width, height, formatted });
            }
            else {
                imageResourceErrors.push(i18nString(UIStrings.sSShouldSpecifyItsSizeAs, { PH1: resourceName, PH2: imageUrl }));
            }
        }
        return parsedSizes;
    }
    checkSizeProblem(size, naturalWidth, naturalHeight, resourceName, imageUrl) {
        if ('any' in size) {
            return { hasSquareSize: naturalWidth === naturalHeight };
        }
        const hasSquareSize = size.width === size.height;
        if (naturalWidth !== size.width && naturalHeight !== size.height) {
            return {
                error: i18nString(UIStrings.actualSizeSspxOfSSDoesNotMatch, {
                    PH1: naturalWidth,
                    PH2: naturalHeight,
                    PH3: resourceName,
                    PH4: imageUrl,
                    PH5: size.width,
                    PH6: size.height,
                }),
                hasSquareSize,
            };
        }
        if (naturalWidth !== size.width) {
            return {
                error: i18nString(UIStrings.actualWidthSpxOfSSDoesNotMatch, { PH1: naturalWidth, PH2: resourceName, PH3: imageUrl, PH4: size.width }),
                hasSquareSize,
            };
        }
        if (naturalHeight !== size.height) {
            return {
                error: i18nString(UIStrings.actualHeightSpxOfSSDoesNotMatch, { PH1: naturalHeight, PH2: resourceName, PH3: imageUrl, PH4: size.height }),
                hasSquareSize,
            };
        }
        return { hasSquareSize };
    }
    async processImageResource(baseUrl, imageResource, // eslint-disable-line @typescript-eslint/no-explicit-any
    isScreenshot) {
        const imageResourceErrors = [];
        const resourceName = isScreenshot ? i18nString(UIStrings.screenshot) : i18nString(UIStrings.icon);
        if (!imageResource.src) {
            imageResourceErrors.push(i18nString(UIStrings.sSrcIsNotSet, { PH1: resourceName }));
            return { imageResourceErrors };
        }
        const imageUrl = Common.ParsedURL.ParsedURL.completeURL(baseUrl, imageResource['src']);
        if (!imageUrl) {
            imageResourceErrors.push(i18nString(UIStrings.sUrlSFailedToParse, { PH1: resourceName, PH2: imageResource['src'] }));
            return { imageResourceErrors, imageUrl: imageResource['src'] };
        }
        const result = await this.loadImage(imageUrl);
        if (!result) {
            imageResourceErrors.push(i18nString(UIStrings.sSFailedToLoad, { PH1: resourceName, PH2: imageUrl }));
            return { imageResourceErrors, imageUrl };
        }
        const { src, naturalWidth, naturalHeight } = result;
        const sizes = this.parseSizes(imageResource['sizes'], resourceName, imageUrl, imageResourceErrors);
        const title = sizes.map(x => x.formatted).join(' ') + '\n' + (imageResource['type'] || '');
        let squareSizedIconAvailable = false;
        if (!imageResource.sizes) {
            imageResourceErrors.push(i18nString(UIStrings.sSDoesNotSpecifyItsSizeInThe, { PH1: resourceName, PH2: imageUrl }));
        }
        else {
            if (isScreenshot && sizes.length > 0 && 'any' in sizes[0]) {
                imageResourceErrors.push(i18nString(UIStrings.screenshotPixelSize, { url: imageUrl }));
            }
            for (const size of sizes) {
                const { error, hasSquareSize } = this.checkSizeProblem(size, naturalWidth, naturalHeight, resourceName, imageUrl);
                squareSizedIconAvailable = squareSizedIconAvailable || hasSquareSize;
                if (error) {
                    imageResourceErrors.push(error);
                }
                else if (isScreenshot) {
                    const width = 'any' in size ? naturalWidth : size.width;
                    const height = 'any' in size ? naturalHeight : size.height;
                    if (width < 320 || height < 320) {
                        imageResourceErrors.push(i18nString(UIStrings.sSSizeShouldBeAtLeast320, { PH1: resourceName, PH2: imageUrl }));
                    }
                    else if (width > 3840 || height > 3840) {
                        imageResourceErrors.push(i18nString(UIStrings.sSSizeShouldBeAtMost3840, { PH1: resourceName, PH2: imageUrl }));
                    }
                    else if (width > (height * 2.3)) {
                        imageResourceErrors.push(i18nString(UIStrings.sSWidthDoesNotComplyWithRatioRequirement, { PH1: resourceName, PH2: imageUrl }));
                    }
                    else if (height > (width * 2.3)) {
                        imageResourceErrors.push(i18nString(UIStrings.sSHeightDoesNotComplyWithRatioRequirement, { PH1: resourceName, PH2: imageUrl }));
                    }
                }
            }
        }
        const purpose = typeof imageResource['purpose'] === 'string' ? imageResource['purpose'].toLowerCase() : '';
        if (purpose.includes('any') && purpose.includes('maskable')) {
            imageResourceErrors.push(i18nString(UIStrings.avoidPurposeAnyAndMaskable));
        }
        return {
            imageResourceErrors,
            squareSizedIconAvailable,
            naturalWidth,
            naturalHeight,
            title,
            imageSrc: src,
            imageUrl,
        };
    }
    async onToggleWcoToolbar(enabled) {
        this.wcoToolbarEnabled = enabled;
        if (this.overlayModel) {
            await this.overlayModel.toggleWindowControlsToolbar(this.wcoToolbarEnabled);
        }
    }
    async onSelectOs(selectedOS, themeColor) {
        if (this.overlayModel) {
            this.overlayModel.setWindowControlsPlatform(selectedOS);
            this.overlayModel.setWindowControlsThemeColor(themeColor);
            await this.overlayModel.toggleWindowControlsToolbar(this.wcoToolbarEnabled);
        }
    }
    processIdentity(parsedManifest, appId, recommendedId) {
        const description = this.stringProperty(parsedManifest, 'description');
        const warnings = [];
        // See https://crbug.com/1354304 for details.
        if (description.length > 300) {
            warnings.push(i18nString(UIStrings.descriptionMayBeTruncated));
        }
        return {
            name: this.stringProperty(parsedManifest, 'name'),
            shortName: this.stringProperty(parsedManifest, 'short_name'),
            description: this.stringProperty(parsedManifest, 'description'),
            appId,
            recommendedId,
            hasId: Boolean(this.stringProperty(parsedManifest, 'id')),
            warnings,
        };
    }
    async processIcons(parsedManifest, url) {
        const icons = parsedManifest['icons'] || [];
        const imageErrors = [];
        const processedIcons = [];
        let squareSizedIconAvailable = false;
        for (const icon of icons) {
            const result = await this.processImageResource(url, icon, /** isScreenshot= */ false);
            processedIcons.push(result);
            imageErrors.push(...result.imageResourceErrors);
            if (result.squareSizedIconAvailable) {
                squareSizedIconAvailable = true;
            }
        }
        const processedIconsByTitle = Map.groupBy(processedIcons.filter((icon) => 'title' in icon), img => img.title);
        if (!squareSizedIconAvailable) {
            imageErrors.push(i18nString(UIStrings.sSShouldHaveSquareIcon));
        }
        return { icons: processedIconsByTitle, imageResourceErrors: imageErrors };
    }
    async processShortcuts(parsedManifest, url) {
        const shortcuts = parsedManifest['shortcuts'] || [];
        const processedShortcuts = [];
        const warnings = [];
        const imageErrors = [];
        if (shortcuts.length > 4) {
            warnings.push(i18nString(UIStrings.shortcutsMayBeNotAvailable));
        }
        let shortcutIndex = 1;
        for (const shortcut of shortcuts) {
            const shortcutUrl = Common.ParsedURL.ParsedURL.completeURL(url, shortcut.url);
            const shortcutIcons = shortcut.icons || [];
            const processedIcons = [];
            let hasShortcutIconLargeEnough = false;
            for (const shortcutIcon of shortcutIcons) {
                const result = await this.processImageResource(url, shortcutIcon, /** isScreenshot= */ false);
                processedIcons.push(result);
                imageErrors.push(...result.imageResourceErrors);
                if (!hasShortcutIconLargeEnough && shortcutIcon.sizes) {
                    const shortcutIconSize = shortcutIcon.sizes.match(/^(\d+)x(\d+)$/);
                    if (shortcutIconSize && Number(shortcutIconSize[1]) >= 96 && Number(shortcutIconSize[2]) >= 96) {
                        hasShortcutIconLargeEnough = true;
                    }
                }
            }
            const iconsByTitle = Map.groupBy(processedIcons.filter(icon => 'title' in icon), img => img.title);
            processedShortcuts.push({
                name: shortcut.name,
                shortName: shortcut.short_name,
                description: shortcut.description,
                url: shortcut.url,
                shortcutUrl,
                icons: iconsByTitle,
            });
            if (!hasShortcutIconLargeEnough) {
                imageErrors.push(i18nString(UIStrings.shortcutSShouldIncludeAXPixel, { PH1: shortcutIndex }));
            }
            shortcutIndex++;
        }
        return { shortcuts: processedShortcuts, warnings, imageResourceErrors: imageErrors };
    }
    async processScreenshots(parsedManifest, url) {
        const screenshots = parsedManifest['screenshots'] || [];
        const processedScreenshots = [];
        const warnings = [];
        const imageErrors = [];
        let haveScreenshotsDifferentAspectRatio = false;
        const formFactorScreenshotDimensions = new Map();
        for (const screenshot of screenshots) {
            const result = await this.processImageResource(url, screenshot, /** isScreenshot= */ true);
            processedScreenshots.push({ screenshot, processedImage: result });
            imageErrors.push(...result.imageResourceErrors);
            if (screenshot.form_factor && 'naturalWidth' in result) {
                const width = result.naturalWidth;
                const height = result.naturalHeight;
                formFactorScreenshotDimensions.has(screenshot.form_factor) ||
                    formFactorScreenshotDimensions.set(screenshot.form_factor, { width, height });
                const formFactorFirstScreenshotDimensions = formFactorScreenshotDimensions.get(screenshot.form_factor);
                if (formFactorFirstScreenshotDimensions) {
                    haveScreenshotsDifferentAspectRatio = haveScreenshotsDifferentAspectRatio ||
                        (width * formFactorFirstScreenshotDimensions.height !==
                            height * formFactorFirstScreenshotDimensions.width);
                }
            }
        }
        if (haveScreenshotsDifferentAspectRatio) {
            warnings.push(i18nString(UIStrings.screenshotsMustHaveSameAspectRatio));
        }
        const screenshotsForDesktop = screenshots.filter(screenshot => screenshot.form_factor === 'wide');
        const screenshotsForMobile = screenshots.filter(screenshot => screenshot.form_factor !== 'wide');
        if (screenshotsForDesktop.length < 1) {
            warnings.push(i18nString(UIStrings.noScreenshotsForRicherPWAInstallOnDesktop));
        }
        if (screenshotsForMobile.length < 1) {
            warnings.push(i18nString(UIStrings.noScreenshotsForRicherPWAInstallOnMobile));
        }
        if (screenshotsForDesktop.length > 8) {
            warnings.push(i18nString(UIStrings.tooManyScreenshotsForDesktop));
        }
        if (screenshotsForMobile.length > 5) {
            warnings.push(i18nString(UIStrings.tooManyScreenshotsForMobile));
        }
        return { screenshots: processedScreenshots, warnings, imageResourceErrors: imageErrors };
    }
    async processWindowControls(parsedManifest, url) {
        const displayOverride = parsedManifest['display_override'] || [];
        const hasWco = displayOverride.includes('window-controls-overlay');
        const themeColor = this.stringProperty(parsedManifest, 'theme_color');
        let wcoStyleSheetText = false;
        if (this.overlayModel) {
            wcoStyleSheetText = await this.overlayModel.hasStyleSheetText(url);
        }
        return {
            hasWco,
            themeColor,
            wcoStyleSheetText,
            url,
        };
    }
    processPresentation(parsedManifest, url) {
        const startURL = this.stringProperty(parsedManifest, 'start_url');
        const completeURL = startURL ? Common.ParsedURL.ParsedURL.completeURL(url, startURL) : null;
        const themeColorString = this.stringProperty(parsedManifest, 'theme_color');
        const themeColor = themeColorString ? Common.Color.parse(themeColorString) ?? Common.Color.parse('white') : null;
        const backgroundColorString = this.stringProperty(parsedManifest, 'background_color');
        const backgroundColor = backgroundColorString ? Common.Color.parse(backgroundColorString) ?? Common.Color.parse('white') : null;
        const noteTaking = parsedManifest['note_taking'] || {};
        const newNoteUrl = noteTaking['new_note_url'];
        const hasNewNoteUrl = typeof newNoteUrl === 'string';
        const completeNewNoteUrl = hasNewNoteUrl ?
            Common.ParsedURL.ParsedURL.completeURL(url, newNoteUrl) :
            null;
        return {
            startUrl: startURL,
            completeStartUrl: completeURL,
            themeColor,
            backgroundColor,
            orientation: this.stringProperty(parsedManifest, 'orientation'),
            display: this.stringProperty(parsedManifest, 'display'),
            newNoteUrl,
            hasNewNoteUrl,
            completeNewNoteUrl,
        };
    }
    processProtocolHandlers(parsedManifest, url) {
        return {
            protocolHandlers: parsedManifest['protocol_handlers'] || [],
            manifestLink: url,
        };
    }
}
//# sourceMappingURL=AppManifestView.js.map