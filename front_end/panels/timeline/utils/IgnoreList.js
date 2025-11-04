// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../../core/i18n/i18n.js';
import * as Trace from '../../../models/trace/trace.js';
import * as SourceMapsResolver from '../../../models/trace_source_maps_resolver/trace_source_maps_resolver.js';
import * as Workspace from '../../../models/workspace/workspace.js';
const UIStrings = {
    /**
     * @description Refers to when skipping content scripts is enabled and the current script is ignored because it's a content script.
     */
    skipContentScripts: 'Content script',
    /**
     * @description Refers to when skipping known third party scripts is enabled and the current script is ignored because it's a known third party script.
     */
    skip3rdPartyScripts: 'Marked with ignoreList in source map',
    /**
     * @description Refers to when skipping anonymous scripts is enabled and the current script is ignored because is an anonymous script.
     */
    skipAnonymousScripts: 'Anonymous script',
    /**
     * @description Refers to when the current script is ignored because of an unknown rule.
     */
    unknown: 'Unknown',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/utils/IgnoreList.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
function getUrlAndIgnoreListOptions(entry) {
    const rawUrl = entry.callFrame.url;
    const sourceMappedData = SourceMapsResolver.SourceMapsResolver.resolvedCodeLocationForEntry(entry);
    const script = sourceMappedData?.script;
    const uiSourceCode = sourceMappedData?.devtoolsLocation?.uiSourceCode;
    const resolvedUrl = uiSourceCode?.url();
    const isKnownThirdParty = uiSourceCode?.isKnownThirdParty();
    const isContentScript = script?.isContentScript();
    const ignoreListOptions = { isContentScript, isKnownThirdParty };
    const url = resolvedUrl || rawUrl;
    return { url, ignoreListOptions };
}
export function isIgnoreListedEntry(entry) {
    if (!Trace.Types.Events.isProfileCall(entry)) {
        return false;
    }
    const { url, ignoreListOptions } = getUrlAndIgnoreListOptions(entry);
    return isIgnoreListedURL(url, ignoreListOptions);
}
function isIgnoreListedURL(url, options) {
    return Workspace.IgnoreListManager.IgnoreListManager.instance().isUserIgnoreListedURL(url, options);
}
/**
 * Returns the ignore reason for the given entry.
 *
 * This function should be called when `isIgnoreListedEntry(entry)` is true
 */
export function getIgnoredReasonString(entry) {
    if (!Trace.Types.Events.isProfileCall(entry)) {
        console.warn('Ignore list feature should only support ProfileCall.');
        return '';
    }
    const { url, ignoreListOptions } = getUrlAndIgnoreListOptions(entry);
    const ignoreListMgr = Workspace.IgnoreListManager.IgnoreListManager.instance();
    if (ignoreListOptions.isContentScript && ignoreListMgr.skipContentScripts) {
        return i18nString(UIStrings.skipContentScripts);
    }
    if (ignoreListOptions.isKnownThirdParty && ignoreListMgr.automaticallyIgnoreListKnownThirdPartyScripts) {
        return i18nString(UIStrings.skip3rdPartyScripts);
    }
    if (!url) {
        if (ignoreListMgr.skipAnonymousScripts) {
            return i18nString(UIStrings.skipAnonymousScripts);
        }
        // This branch shouldn't be reached because when |skipAnonymousScripts| is false, this url is not ignored.
        // So just return empty string to make the type check work.
        return '';
    }
    const regex = ignoreListMgr.getFirstMatchedRegex(url);
    return regex ? regex.source : i18nString(UIStrings.unknown);
}
//# sourceMappingURL=IgnoreList.js.map