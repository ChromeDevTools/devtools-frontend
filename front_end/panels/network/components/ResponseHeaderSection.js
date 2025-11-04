// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as IssuesManager from '../../../models/issues_manager/issues_manager.js';
import * as Persistence from '../../../models/persistence/persistence.js';
import * as TextUtils from '../../../models/text_utils/text_utils.js';
import * as NetworkForward from '../../../panels/network/forward/forward.js';
import * as Sources from '../../../panels/sources/sources.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as UI from '../../../ui/legacy/legacy.js';
import { html, nothing, render } from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import { compareHeaders, isValidHeaderName, } from './HeaderSectionRow.js';
import responseHeaderSectionStyles from './ResponseHeaderSection.css.js';
const UIStrings = {
    /**
     * @description Label for a button which allows adding an HTTP header.
     */
    addHeader: 'Add header',
    /**
     * @description Explanation text for which cross-origin policy to set.
     */
    chooseThisOptionIfTheResourceAnd: 'Choose this option if the resource and the document are served from the same site.',
    /**
     * @description Explanation text for which cross-origin policy to set.
     */
    onlyChooseThisOptionIfAn: 'Only choose this option if an arbitrary website including this resource does not impose a security risk.',
    /**
     * @description Message in the Headers View of the Network panel when a cross-origin opener policy blocked loading a sandbox iframe.
     */
    thisDocumentWasBlockedFrom: 'The document was blocked from loading in a popup opened by a sandboxed iframe because this document specified a cross-origin opener policy.',
    /**
     * @description Message in the Headers View of the Network panel when a cross-origin embedder policy header needs to be set.
     */
    toEmbedThisFrameInYourDocument: 'To embed this frame in your document, the response needs to enable the cross-origin embedder policy by specifying the following response header:',
    /**
     * @description Message in the Headers View of the Network panel when a cross-origin resource policy header needs to be set.
     */
    toUseThisResourceFromADifferent: 'To use this resource from a different origin, the server needs to specify a cross-origin resource policy in the response headers:',
    /**
     * @description Message in the Headers View of the Network panel when the cross-origin resource policy header is too strict.
     */
    toUseThisResourceFromADifferentOrigin: 'To use this resource from a different origin, the server may relax the cross-origin resource policy response header:',
    /**
     * @description Message in the Headers View of the Network panel when the cross-origin resource policy header is too strict.
     */
    toUseThisResourceFromADifferentSite: 'To use this resource from a different site, the server may relax the cross-origin resource policy response header:',
};
const str_ = i18n.i18n.registerUIStrings('panels/network/components/ResponseHeaderSection.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
export const RESPONSE_HEADER_SECTION_DATA_KEY = 'ResponseHeaderSection';
class ResponseHeaderSectionBase extends HTMLElement {
    shadow = this.attachShadow({ mode: 'open' });
    headerDetails = [];
    setHeaders(headers) {
        headers.sort(function (a, b) {
            return Platform.StringUtilities.compare(a.name.toLowerCase(), b.name.toLowerCase());
        });
        this.headerDetails = headers.map(header => ({
            name: Platform.StringUtilities.toLowerCaseString(header.name),
            value: header.value.replace(/\s/g, ' '),
        }));
    }
    highlightHeaders(data) {
        if (data.toReveal?.section === "Response" /* NetworkForward.UIRequestLocation.UIHeaderSection.RESPONSE */) {
            this.headerDetails.filter(header => compareHeaders(header.name, data.toReveal?.header?.toLowerCase()))
                .forEach(header => {
                header.highlight = true;
            });
        }
    }
}
export class EarlyHintsHeaderSection extends ResponseHeaderSectionBase {
    #request;
    set data(data) {
        this.#request = data.request;
        this.setHeaders(this.#request.earlyHintsHeaders);
        this.highlightHeaders(data);
        this.#render();
    }
    #render() {
        if (!this.#request) {
            return;
        }
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        render(html `
      <style>${responseHeaderSectionStyles}</style>
      ${this.headerDetails.map(header => html `
        <devtools-header-section-row .data=${{
            header,
        }}></devtools-header-section-row>
      `)}
    `, this.shadow, { host: this });
        // clang-format on
    }
}
customElements.define('devtools-early-hints-header-section', EarlyHintsHeaderSection);
export class ResponseHeaderSection extends ResponseHeaderSectionBase {
    #request;
    #headerEditors = [];
    #uiSourceCode = null;
    #overrides = [];
    #isEditingAllowed = 0 /* EditingAllowedStatus.DISABLED */;
    set data(data) {
        this.#request = data.request;
        this.#isEditingAllowed =
            Persistence.NetworkPersistenceManager.NetworkPersistenceManager.isForbiddenNetworkUrl(this.#request.url()) ?
                2 /* EditingAllowedStatus.FORBIDDEN */ :
                0 /* EditingAllowedStatus.DISABLED */;
        // If the request has been locally overridden, its 'sortedResponseHeaders'
        // contains no 'set-cookie' headers, because they have been filtered out by
        // the Chromium backend. DevTools therefore uses previously stored values.
        const headers = this.#request.sortedResponseHeaders.concat(this.#request.setCookieHeaders);
        this.setHeaders(headers);
        const headersWithIssues = [];
        if (this.#request.wasBlocked()) {
            const headerWithIssues = BlockedReasonDetails.get(this.#request.blockedReason());
            if (headerWithIssues) {
                if (IssuesManager.RelatedIssue.hasIssueOfCategory(this.#request, "CrossOriginEmbedderPolicy" /* IssuesManager.Issue.IssueCategory.CROSS_ORIGIN_EMBEDDER_POLICY */)) {
                    const followLink = () => {
                        Host.userMetrics.issuesPanelOpenedFrom(1 /* Host.UserMetrics.IssueOpener.LEARN_MORE_LINK_COEP */);
                        if (this.#request) {
                            void IssuesManager.RelatedIssue.reveal(this.#request, "CrossOriginEmbedderPolicy" /* IssuesManager.Issue.IssueCategory.CROSS_ORIGIN_EMBEDDER_POLICY */);
                        }
                    };
                    if (headerWithIssues.blockedDetails) {
                        headerWithIssues.blockedDetails.reveal = followLink;
                    }
                }
                headersWithIssues.push(headerWithIssues);
            }
        }
        function mergeHeadersWithIssues(headers, headersWithIssues) {
            let i = 0, j = 0;
            const result = [];
            while (i < headers.length && j < headersWithIssues.length) {
                if (headers[i].name < headersWithIssues[j].name) {
                    result.push({ ...headers[i++], headerNotSet: false });
                }
                else if (headers[i].name > headersWithIssues[j].name) {
                    result.push({ ...headersWithIssues[j++], headerNotSet: true });
                }
                else {
                    result.push({ ...headersWithIssues[j++], ...headers[i++], headerNotSet: false });
                }
            }
            while (i < headers.length) {
                result.push({ ...headers[i++], headerNotSet: false });
            }
            while (j < headersWithIssues.length) {
                result.push({ ...headersWithIssues[j++], headerNotSet: true });
            }
            return result;
        }
        this.headerDetails = mergeHeadersWithIssues(this.headerDetails, headersWithIssues);
        const blockedResponseCookies = this.#request.blockedResponseCookies();
        const blockedCookieLineToReasons = new Map(blockedResponseCookies?.map(c => [c.cookieLine.replace(/\s/g, ' '), c.blockedReasons]));
        for (const header of this.headerDetails) {
            if (header.name === 'set-cookie' && header.value) {
                const matchingBlockedReasons = blockedCookieLineToReasons.get(header.value);
                if (matchingBlockedReasons) {
                    header.setCookieBlockedReasons = matchingBlockedReasons;
                }
            }
        }
        this.highlightHeaders(data);
        const dataAssociatedWithRequest = this.#request.getAssociatedData(RESPONSE_HEADER_SECTION_DATA_KEY);
        if (dataAssociatedWithRequest) {
            this.#headerEditors = dataAssociatedWithRequest;
        }
        else {
            this.#headerEditors = this.headerDetails.map(header => ({
                name: header.name,
                value: header.value,
                originalValue: header.value,
                valueEditable: this.#isEditingAllowed,
            }));
            this.#markOverrides();
        }
        void this.#loadOverridesFileInfo();
        this.#request.setAssociatedData(RESPONSE_HEADER_SECTION_DATA_KEY, this.#headerEditors);
        this.#render();
    }
    #resetEditorState() {
        if (!this.#request) {
            return;
        }
        this.#isEditingAllowed =
            Persistence.NetworkPersistenceManager.NetworkPersistenceManager.isForbiddenNetworkUrl(this.#request.url()) ?
                2 /* EditingAllowedStatus.FORBIDDEN */ :
                0 /* EditingAllowedStatus.DISABLED */;
        this.#headerEditors = this.headerDetails.map(header => ({
            name: header.name,
            value: header.value,
            originalValue: header.value,
            valueEditable: this.#isEditingAllowed,
        }));
        this.#markOverrides();
        this.#request.setAssociatedData(RESPONSE_HEADER_SECTION_DATA_KEY, this.#headerEditors);
    }
    async #loadOverridesFileInfo() {
        if (!this.#request) {
            return;
        }
        this.#uiSourceCode =
            Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().getHeadersUISourceCodeFromUrl(this.#request.url());
        if (!this.#uiSourceCode) {
            this.#resetEditorState();
            this.#render();
            return;
        }
        try {
            const contentData = await this.#uiSourceCode.requestContentData().then(TextUtils.ContentData.ContentData.contentDataOrEmpty);
            this.#overrides = JSON.parse(contentData.text || '[]');
            if (!this.#overrides.every(Persistence.NetworkPersistenceManager.isHeaderOverride)) {
                throw new Error('Type mismatch after parsing');
            }
            if (Common.Settings.Settings.instance().moduleSetting('persistence-network-overrides-enabled').get() &&
                this.#isEditingAllowed === 0 /* EditingAllowedStatus.DISABLED */) {
                this.#isEditingAllowed = 1 /* EditingAllowedStatus.ENABLED */;
            }
            for (const header of this.#headerEditors) {
                header.valueEditable = this.#isEditingAllowed;
            }
        }
        catch {
            console.error('Failed to parse', this.#uiSourceCode?.url() || 'source code file', 'for locally overriding headers.');
            this.#resetEditorState();
        }
        finally {
            this.#render();
        }
    }
    #markOverrides() {
        if (!this.#request || this.#request.originalResponseHeaders.length === 0) {
            return;
        }
        const originalHeaders = this.#request.originalResponseHeaders.map(header => ({
            name: Platform.StringUtilities.toLowerCaseString(header.name),
            value: header.value.replace(/\s/g, ' '),
        }));
        originalHeaders.sort(function (a, b) {
            return Platform.StringUtilities.compare(a.name, b.name);
        });
        // Loop over actual headers and original headers simultaneously and mark each actual header as
        // overridden if there is no identical original header.
        // If there are multiple headers with the same name, concatenate their values first before
        // comparing them.
        let indexActual = 0;
        let indexOriginal = 0;
        while (indexActual < this.headerDetails.length) {
            const currentName = this.headerDetails[indexActual].name;
            let actualValue = this.headerDetails[indexActual].value || '';
            const headerNotSet = this.headerDetails[indexActual].headerNotSet;
            while (indexActual < this.headerDetails.length - 1 && this.headerDetails[indexActual + 1].name === currentName) {
                indexActual++;
                actualValue += `, ${this.headerDetails[indexActual].value}`;
            }
            while (indexOriginal < originalHeaders.length && originalHeaders[indexOriginal].name < currentName) {
                indexOriginal++;
            }
            if (indexOriginal < originalHeaders.length && originalHeaders[indexOriginal].name === currentName) {
                let originalValue = originalHeaders[indexOriginal].value;
                while (indexOriginal < originalHeaders.length - 1 && originalHeaders[indexOriginal + 1].name === currentName) {
                    indexOriginal++;
                    originalValue += `, ${originalHeaders[indexOriginal].value}`;
                }
                indexOriginal++;
                if (currentName !== 'set-cookie' && !headerNotSet && !compareHeaders(actualValue, originalValue)) {
                    this.#headerEditors.filter(header => compareHeaders(header.name, currentName)).forEach(header => {
                        header.isOverride = true;
                    });
                }
            }
            else if (currentName !== 'set-cookie' && !headerNotSet) {
                this.#headerEditors.filter(header => compareHeaders(header.name, currentName)).forEach(header => {
                    header.isOverride = true;
                });
            }
            indexActual++;
        }
        // Special case for 'set-cookie' headers: compare each header individually
        // and don't treat all 'set-cookie' headers as a single unit.
        this.#headerEditors.filter(header => header.name === 'set-cookie').forEach(header => {
            if (this.#request?.originalResponseHeaders.find(originalHeader => Platform.StringUtilities.toLowerCaseString(originalHeader.name) === 'set-cookie' &&
                compareHeaders(originalHeader.value, header.value)) === undefined) {
                header.isOverride = true;
            }
        });
    }
    #onHeaderEdited(event) {
        const target = event.target;
        if (target.dataset.index === undefined) {
            return;
        }
        const index = Number(target.dataset.index);
        if (isValidHeaderName(event.headerName)) {
            this.#updateOverrides(event.headerName, event.headerValue, index);
            Host.userMetrics.actionTaken(Host.UserMetrics.Action.HeaderOverrideHeaderEdited);
        }
    }
    #fileNameFromUrl(url) {
        const rawPath = Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().rawPathFromUrl(url, true);
        const lastIndexOfSlash = rawPath.lastIndexOf('/');
        return Common.ParsedURL.ParsedURL.substring(rawPath, lastIndexOfSlash + 1);
    }
    #commitOverrides() {
        this.#uiSourceCode?.setWorkingCopy(JSON.stringify(this.#overrides, null, 2));
        this.#uiSourceCode?.commitWorkingCopy();
    }
    #removeEntryFromOverrides(rawFileName, headerName, headerValue) {
        for (let blockIndex = this.#overrides.length - 1; blockIndex >= 0; blockIndex--) {
            const block = this.#overrides[blockIndex];
            if (block.applyTo !== rawFileName) {
                continue;
            }
            const foundIndex = block.headers.findIndex(header => compareHeaders(header.name, headerName) && compareHeaders(header.value, headerValue));
            if (foundIndex < 0) {
                continue;
            }
            block.headers.splice(foundIndex, 1);
            if (block.headers.length === 0) {
                this.#overrides.splice(blockIndex, 1);
            }
            return;
        }
    }
    #onHeaderRemoved(event) {
        const target = event.target;
        if (target.dataset.index === undefined || !this.#request) {
            return;
        }
        const index = Number(target.dataset.index);
        const rawFileName = this.#fileNameFromUrl(this.#request.url());
        this.#removeEntryFromOverrides(rawFileName, event.headerName, event.headerValue);
        this.#commitOverrides();
        this.#headerEditors[index].isDeleted = true;
        this.#render();
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.HeaderOverrideHeaderRemoved);
    }
    #updateOverrides(headerName, headerValue, index) {
        if (!this.#request) {
            return;
        }
        // If 'originalResponseHeaders' are not populated (because there was no
        // request interception), fill them with a copy of 'sortedResponseHeaders'.
        // This ensures we have access to the original values when undoing edits.
        if (this.#request.originalResponseHeaders.length === 0) {
            this.#request.originalResponseHeaders =
                this.#request.sortedResponseHeaders.map(headerEntry => ({ ...headerEntry }));
        }
        const previousName = this.#headerEditors[index].name;
        const previousValue = this.#headerEditors[index].value;
        this.#headerEditors[index].name = headerName;
        this.#headerEditors[index].value = headerValue;
        let headersToUpdate = [];
        if (headerName === 'set-cookie') {
            // Special case for 'set-cookie' headers: each such header is treated
            // separately without looking at other 'set-cookie' headers.
            headersToUpdate.push({ name: headerName, value: headerValue, valueEditable: this.#isEditingAllowed });
        }
        else {
            // If multiple headers have the same name 'foo', we treat them as a unit.
            // If there are overrides for 'foo', all original 'foo' headers are removed
            // and replaced with the override(s) for 'foo'.
            headersToUpdate = this.#headerEditors.filter(header => compareHeaders(header.name, headerName) &&
                (!compareHeaders(header.value, header.originalValue) || header.isOverride));
        }
        const rawFileName = this.#fileNameFromUrl(this.#request.url());
        // If the last override-block matches 'rawFileName', use this last block.
        // Otherwise just append a new block at the end. We are not using earlier
        // blocks, because they could be overruled by later blocks, which contain
        // wildcards in the filenames they apply to.
        let block = null;
        const [lastOverride] = this.#overrides.slice(-1);
        if (lastOverride?.applyTo === rawFileName) {
            block = lastOverride;
        }
        else {
            block = {
                applyTo: rawFileName,
                headers: [],
            };
            this.#overrides.push(block);
        }
        if (headerName === 'set-cookie') {
            // Special case for 'set-cookie' headers: only remove the one specific
            // header which is currently being modified, keep all other headers
            // (including other 'set-cookie' headers).
            const foundIndex = block.headers.findIndex(header => compareHeaders(header.name, previousName) && compareHeaders(header.value, previousValue));
            if (foundIndex >= 0) {
                block.headers.splice(foundIndex, 1);
            }
        }
        else {
            // Keep header overrides for all headers with a different name.
            block.headers = block.headers.filter(header => !compareHeaders(header.name, headerName));
        }
        // If a header name has been edited (only possible when adding headers),
        // remove the previous override entry.
        if (!compareHeaders(this.#headerEditors[index].name, previousName)) {
            for (let i = 0; i < block.headers.length; ++i) {
                if (compareHeaders(block.headers[i].name, previousName) &&
                    compareHeaders(block.headers[i].value, previousValue)) {
                    block.headers.splice(i, 1);
                    break;
                }
            }
        }
        // Append freshly edited header overrides.
        for (const header of headersToUpdate) {
            block.headers.push({ name: header.name, value: header.value || '' });
        }
        if (block.headers.length === 0) {
            this.#overrides.pop();
        }
        this.#commitOverrides();
    }
    #onAddHeaderClick() {
        this.#headerEditors.push({
            name: Platform.StringUtilities.toLowerCaseString(i18n.i18n.lockedString('header-name')),
            value: i18n.i18n.lockedString('header value'),
            isOverride: true,
            nameEditable: true,
            valueEditable: 1 /* EditingAllowedStatus.ENABLED */,
        });
        const index = this.#headerEditors.length - 1;
        this.#updateOverrides(this.#headerEditors[index].name, this.#headerEditors[index].value || '', index);
        this.#render();
        const rows = this.shadow.querySelectorAll('devtools-header-section-row');
        const [lastRow] = Array.from(rows).slice(-1);
        lastRow?.focus();
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.HeaderOverrideHeaderAdded);
    }
    #render() {
        if (!this.#request) {
            return;
        }
        const headerDescriptors = this.#headerEditors.map((headerEditor, index) => ({ ...this.headerDetails[index], ...headerEditor, isResponseHeader: true }));
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        render(html `
      <style>${responseHeaderSectionStyles}</style>
      ${headerDescriptors.map((header, index) => html `
        <devtools-header-section-row
            .data=${{ header }}
            @headeredited=${this.#onHeaderEdited}
            @headerremoved=${this.#onHeaderRemoved}
            @enableheaderediting=${this.#onEnableHeaderEditingClick}
            data-index=${index}
            jslog=${VisualLogging.item('response-header')}
        ></devtools-header-section-row>
      `)}
      ${this.#isEditingAllowed === 1 /* EditingAllowedStatus.ENABLED */ ? html `
        <devtools-button
          class="add-header-button"
          .variant=${"outlined" /* Buttons.Button.Variant.OUTLINED */}
          .iconName=${'plus'}
          @click=${this.#onAddHeaderClick}
          jslog=${VisualLogging.action('add-header').track({ click: true })}>
          ${i18nString(UIStrings.addHeader)}
        </devtools-button>
      ` : nothing}
    `, this.shadow, { host: this });
        // clang-format on
    }
    async #onEnableHeaderEditingClick() {
        if (!this.#request) {
            return;
        }
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.HeaderOverrideEnableEditingClicked);
        const requestUrl = this.#request.url();
        const networkPersistenceManager = Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance();
        if (networkPersistenceManager.project()) {
            Common.Settings.Settings.instance().moduleSetting('persistence-network-overrides-enabled').set(true);
            await networkPersistenceManager.getOrCreateHeadersUISourceCodeFromUrl(requestUrl);
        }
        else { // If folder for local overrides has not been provided yet
            UI.InspectorView.InspectorView.instance().displaySelectOverrideFolderInfobar(async () => {
                await Sources.SourcesNavigator.OverridesNavigatorView.instance().setupNewWorkspace();
                await networkPersistenceManager.getOrCreateHeadersUISourceCodeFromUrl(requestUrl);
            });
        }
    }
}
customElements.define('devtools-response-header-section', ResponseHeaderSection);
const BlockedReasonDetails = new Map([
    [
        "coep-frame-resource-needs-coep-header" /* Protocol.Network.BlockedReason.CoepFrameResourceNeedsCoepHeader */,
        {
            name: Platform.StringUtilities.toLowerCaseString('cross-origin-embedder-policy'),
            value: null,
            blockedDetails: {
                explanation: i18nLazyString(UIStrings.toEmbedThisFrameInYourDocument),
                examples: [{ codeSnippet: 'Cross-Origin-Embedder-Policy: require-corp', comment: undefined }],
                link: { url: 'https://web.dev/coop-coep/' },
            },
        },
    ],
    [
        "corp-not-same-origin-after-defaulted-to-same-origin-by-coep" /* Protocol.Network.BlockedReason.CorpNotSameOriginAfterDefaultedToSameOriginByCoep */,
        {
            name: Platform.StringUtilities.toLowerCaseString('cross-origin-resource-policy'),
            value: null,
            blockedDetails: {
                explanation: i18nLazyString(UIStrings.toUseThisResourceFromADifferent),
                examples: [
                    {
                        codeSnippet: 'Cross-Origin-Resource-Policy: same-site',
                        comment: i18nLazyString(UIStrings.chooseThisOptionIfTheResourceAnd),
                    },
                    {
                        codeSnippet: 'Cross-Origin-Resource-Policy: cross-origin',
                        comment: i18nLazyString(UIStrings.onlyChooseThisOptionIfAn),
                    },
                ],
                link: { url: 'https://web.dev/coop-coep/' },
            },
        },
    ],
    [
        "coop-sandboxed-iframe-cannot-navigate-to-coop-page" /* Protocol.Network.BlockedReason.CoopSandboxedIframeCannotNavigateToCoopPage */,
        {
            name: Platform.StringUtilities.toLowerCaseString('cross-origin-opener-policy'),
            value: null,
            headerValueIncorrect: false,
            blockedDetails: {
                explanation: i18nLazyString(UIStrings.thisDocumentWasBlockedFrom),
                examples: [],
                link: { url: 'https://web.dev/coop-coep/' },
            },
        },
    ],
    [
        "corp-not-same-site" /* Protocol.Network.BlockedReason.CorpNotSameSite */,
        {
            name: Platform.StringUtilities.toLowerCaseString('cross-origin-resource-policy'),
            value: null,
            headerValueIncorrect: true,
            blockedDetails: {
                explanation: i18nLazyString(UIStrings.toUseThisResourceFromADifferentSite),
                examples: [
                    {
                        codeSnippet: 'Cross-Origin-Resource-Policy: cross-origin',
                        comment: i18nLazyString(UIStrings.onlyChooseThisOptionIfAn),
                    },
                ],
                link: null,
            },
        },
    ],
    [
        "corp-not-same-origin" /* Protocol.Network.BlockedReason.CorpNotSameOrigin */,
        {
            name: Platform.StringUtilities.toLowerCaseString('cross-origin-resource-policy'),
            value: null,
            headerValueIncorrect: true,
            blockedDetails: {
                explanation: i18nLazyString(UIStrings.toUseThisResourceFromADifferentOrigin),
                examples: [
                    {
                        codeSnippet: 'Cross-Origin-Resource-Policy: same-site',
                        comment: i18nLazyString(UIStrings.chooseThisOptionIfTheResourceAnd),
                    },
                    {
                        codeSnippet: 'Cross-Origin-Resource-Policy: cross-origin',
                        comment: i18nLazyString(UIStrings.onlyChooseThisOptionIfAn),
                    },
                ],
                link: null,
            },
        },
    ],
]);
//# sourceMappingURL=ResponseHeaderSection.js.map