// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Root from '../../core/root/root.js';
import { debugLog } from './debug.js';
/**
 * Returns the list of active preconditions currently preventing AI assistance from being enabled.
 * Checks local frontend constraints (e.g. incognito, age check) and combines them with the
 * provided AIDA service availability status.
 */
export function getDisabledReasons(aidaAvailability) {
    const reasons = [];
    if (Root.Runtime.hostConfig.isOffTheRecord) {
        reasons.push("is-off-the-record" /* FrontendAccessPrecondition.IS_OFF_THE_RECORD */);
    }
    if (aidaAvailability !== "available" /* Host.AidaClient.AidaAccessPreconditions.AVAILABLE */) {
        reasons.push(aidaAvailability);
    }
    // No age check if there is no logged in user. Age check would always fail in that case.
    if ((aidaAvailability === "available" /* Host.AidaClient.AidaAccessPreconditions.AVAILABLE */ ||
        aidaAvailability === "no-internet" /* Host.AidaClient.AidaAccessPreconditions.NO_INTERNET */) &&
        Root.Runtime.hostConfig?.aidaAvailability?.blockedByAge === true) {
        reasons.push("age-restricted" /* FrontendAccessPrecondition.AGE_RESTRICTED */);
    }
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