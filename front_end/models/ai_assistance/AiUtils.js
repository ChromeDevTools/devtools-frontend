// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import { debugLog } from './debug.js';
const UIStrings = {
    /**
     * @description Message shown to the user if the age check is not successful.
     */
    ageRestricted: 'This feature is only available to users who are 18 years of age or older.',
    /**
     * @description The error message when the user is not logged in into Chrome.
     */
    notLoggedIn: 'This feature is only available when you sign into Chrome with your Google account.',
    /**
     * @description Message shown when the user is offline.
     */
    offline: 'This feature is only available with an active internet connection.',
    /**
     * @description Text informing the user that AI assistance is not available in Incognito mode or Guest mode.
     */
    notAvailableInIncognitoMode: 'AI assistance is not available in Incognito mode or Guest mode.',
};
const str_ = i18n.i18n.registerUIStrings('models/ai_assistance/AiUtils.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export function getDisabledReasons(aidaAvailability) {
    const reasons = [];
    if (Root.Runtime.hostConfig.isOffTheRecord) {
        reasons.push(i18nString(UIStrings.notAvailableInIncognitoMode));
    }
    switch (aidaAvailability) {
        case "no-account-email" /* Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL */:
        case "sync-is-paused" /* Host.AidaClient.AidaAccessPreconditions.SYNC_IS_PAUSED */:
            reasons.push(i18nString(UIStrings.notLoggedIn));
            break;
        // @ts-expect-error
        case "no-internet" /* Host.AidaClient.AidaAccessPreconditions.NO_INTERNET */: // fallthrough
            reasons.push(i18nString(UIStrings.offline));
        case "available" /* Host.AidaClient.AidaAccessPreconditions.AVAILABLE */: {
            // No age check if there is no logged in user. Age check would always fail in that case.
            if (Root.Runtime.hostConfig?.aidaAvailability?.blockedByAge === true) {
                reasons.push(i18nString(UIStrings.ageRestricted));
            }
        }
    }
    // The `console-insights-enabled` setting and the `ai-assistance-enabled` setting both have the same `disabledReasons`.
    reasons.push(...Common.Settings.Settings.instance().moduleSetting('ai-assistance-enabled').disabledReasons());
    return reasons;
}
export function isGeminiBranding() {
    return !!Root.Runtime.hostConfig.devToolsGeminiRebranding?.enabled;
}
export function getIconName() {
    return isGeminiBranding() ? 'spark' : 'smart-assistant';
}
export function isSameOrigin(url1, url2) {
    if (url1.startsWith('data:') || url2.startsWith('data:')) {
        return url1 === url2;
    }
    const origin1 = Common.ParsedURL.ParsedURL.extractOrigin(url1);
    const origin2 = Common.ParsedURL.ParsedURL.extractOrigin(url2);
    return origin1 !== '' && origin1 === origin2;
}
export async function runOneShotPrompt({ aidaClient, preamble, query, clientFeature, temperature, modelId, userTier, serverSideLoggingEnabled, signal, }) {
    const chromeVersion = Root.Runtime.getChromeVersion();
    if (!chromeVersion) {
        throw new Error('Cannot determine Chrome version');
    }
    const disallowLogging = !serverSideLoggingEnabled;
    const sessionId = crypto.randomUUID();
    const userTierEnum = Host.AidaClient.convertToUserTierEnum(userTier);
    const finalPreamble = userTierEnum === Host.AidaClient.UserTier.TESTERS ? preamble : undefined;
    const request = {
        client: Host.AidaClient.CLIENT_NAME,
        current_message: {
            parts: [{ text: query }],
            role: Host.AidaClient.Role.USER,
        },
        preamble: finalPreamble,
        options: {
            temperature: typeof temperature === 'number' && temperature >= 0 ? temperature : undefined,
            model_id: modelId || undefined,
        },
        metadata: {
            disable_user_content_logging: disallowLogging,
            string_session_id: sessionId,
            user_tier: userTierEnum,
            client_version: chromeVersion,
        },
        functionality_type: Host.AidaClient.FunctionalityType.CHAT,
        client_feature: clientFeature,
    };
    let textResponse = '';
    try {
        for await (const response of aidaClient.doConversation(request, { signal })) {
            if (response.explanation) {
                textResponse = response.explanation;
            }
        }
    }
    catch (err) {
        debugLog('Error calling AIDA for one-shot prompt', err);
        throw err;
    }
    return textResponse;
}
//# sourceMappingURL=AiUtils.js.map