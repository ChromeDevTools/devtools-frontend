/**
 * Copyright 2022 Google LLC.
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @fileoverview Provides parsing and validator for WebDriver BiDi protocol.
 * Parser types should match the `../protocol` types.
 */
import { z } from 'zod';
import { InvalidArgumentException } from '../protocol/protocol.js';
import * as WebDriverBidiBluetooth from './generated/webdriver-bidi-bluetooth.js';
import * as WebDriverBidiPermissions from './generated/webdriver-bidi-permissions.js';
import * as WebDriverBidi from './generated/webdriver-bidi.js';
export function parseObject(obj, schema) {
    const parseResult = schema.safeParse(obj);
    if (parseResult.success) {
        return parseResult.data;
    }
    const errorMessage = parseResult.error.errors
        .map((e) => `${e.message} in ` +
        `${e.path.map((p) => JSON.stringify(p)).join('/')}.`)
        .join(' ');
    throw new InvalidArgumentException(errorMessage);
}
/** @see https://w3c.github.io/webdriver-bidi/#module-browser */
export var Browser;
(function (Browser) {
    function parseRemoveUserContextParams(params) {
        return parseObject(params, WebDriverBidi.Browser.RemoveUserContextParametersSchema);
    }
    Browser.parseRemoveUserContextParams = parseRemoveUserContextParams;
})(Browser || (Browser = {}));
/** @see https://w3c.github.io/webdriver-bidi/#module-network */
export var Network;
(function (Network) {
    function parseAddInterceptParameters(params) {
        // Work around of `cddlconv` https://github.com/google/cddlconv/issues/19.
        return parseObject(params, WebDriverBidi.Network.AddInterceptParametersSchema);
    }
    Network.parseAddInterceptParameters = parseAddInterceptParameters;
    function parseContinueRequestParameters(params) {
        return parseObject(params, WebDriverBidi.Network.ContinueRequestParametersSchema);
    }
    Network.parseContinueRequestParameters = parseContinueRequestParameters;
    function parseContinueResponseParameters(params) {
        // TODO: remove cast after https://github.com/google/cddlconv/issues/19 is fixed.
        return parseObject(params, WebDriverBidi.Network.ContinueResponseParametersSchema);
    }
    Network.parseContinueResponseParameters = parseContinueResponseParameters;
    function parseContinueWithAuthParameters(params) {
        return parseObject(params, WebDriverBidi.Network.ContinueWithAuthParametersSchema);
    }
    Network.parseContinueWithAuthParameters = parseContinueWithAuthParameters;
    function parseFailRequestParameters(params) {
        return parseObject(params, WebDriverBidi.Network.FailRequestParametersSchema);
    }
    Network.parseFailRequestParameters = parseFailRequestParameters;
    function parseProvideResponseParameters(params) {
        // TODO: remove cast after https://github.com/google/cddlconv/issues/19 is fixed.
        return parseObject(params, WebDriverBidi.Network.ProvideResponseParametersSchema);
    }
    Network.parseProvideResponseParameters = parseProvideResponseParameters;
    function parseRemoveInterceptParameters(params) {
        return parseObject(params, WebDriverBidi.Network.RemoveInterceptParametersSchema);
    }
    Network.parseRemoveInterceptParameters = parseRemoveInterceptParameters;
    function parseSetCacheBehavior(params) {
        return parseObject(params, WebDriverBidi.Network.SetCacheBehaviorParametersSchema);
    }
    Network.parseSetCacheBehavior = parseSetCacheBehavior;
})(Network || (Network = {}));
/** @see https://w3c.github.io/webdriver-bidi/#module-script */
export var Script;
(function (Script) {
    function parseGetRealmsParams(params) {
        return parseObject(params, WebDriverBidi.Script.GetRealmsParametersSchema);
    }
    Script.parseGetRealmsParams = parseGetRealmsParams;
    function parseEvaluateParams(params) {
        return parseObject(params, WebDriverBidi.Script.EvaluateParametersSchema);
    }
    Script.parseEvaluateParams = parseEvaluateParams;
    function parseDisownParams(params) {
        return parseObject(params, WebDriverBidi.Script.DisownParametersSchema);
    }
    Script.parseDisownParams = parseDisownParams;
    function parseAddPreloadScriptParams(params) {
        return parseObject(params, WebDriverBidi.Script.AddPreloadScriptParametersSchema);
    }
    Script.parseAddPreloadScriptParams = parseAddPreloadScriptParams;
    function parseRemovePreloadScriptParams(params) {
        return parseObject(params, WebDriverBidi.Script.RemovePreloadScriptParametersSchema);
    }
    Script.parseRemovePreloadScriptParams = parseRemovePreloadScriptParams;
    function parseCallFunctionParams(params) {
        return parseObject(params, WebDriverBidi.Script.CallFunctionParametersSchema);
    }
    Script.parseCallFunctionParams = parseCallFunctionParams;
})(Script || (Script = {}));
/** @see https://w3c.github.io/webdriver-bidi/#module-browsingContext */
export var BrowsingContext;
(function (BrowsingContext) {
    function parseActivateParams(params) {
        return parseObject(params, WebDriverBidi.BrowsingContext.ActivateParametersSchema);
    }
    BrowsingContext.parseActivateParams = parseActivateParams;
    function parseGetTreeParams(params) {
        return parseObject(params, WebDriverBidi.BrowsingContext.GetTreeParametersSchema);
    }
    BrowsingContext.parseGetTreeParams = parseGetTreeParams;
    function parseNavigateParams(params) {
        return parseObject(params, WebDriverBidi.BrowsingContext.NavigateParametersSchema);
    }
    BrowsingContext.parseNavigateParams = parseNavigateParams;
    function parseReloadParams(params) {
        return parseObject(params, WebDriverBidi.BrowsingContext.ReloadParametersSchema);
    }
    BrowsingContext.parseReloadParams = parseReloadParams;
    function parseCreateParams(params) {
        return parseObject(params, WebDriverBidi.BrowsingContext.CreateParametersSchema);
    }
    BrowsingContext.parseCreateParams = parseCreateParams;
    function parseCloseParams(params) {
        return parseObject(params, WebDriverBidi.BrowsingContext.CloseParametersSchema);
    }
    BrowsingContext.parseCloseParams = parseCloseParams;
    function parseCaptureScreenshotParams(params) {
        return parseObject(params, WebDriverBidi.BrowsingContext.CaptureScreenshotParametersSchema);
    }
    BrowsingContext.parseCaptureScreenshotParams = parseCaptureScreenshotParams;
    function parsePrintParams(params) {
        return parseObject(params, WebDriverBidi.BrowsingContext.PrintParametersSchema);
    }
    BrowsingContext.parsePrintParams = parsePrintParams;
    function parseSetViewportParams(params) {
        return parseObject(params, WebDriverBidi.BrowsingContext.SetViewportParametersSchema);
    }
    BrowsingContext.parseSetViewportParams = parseSetViewportParams;
    function parseTraverseHistoryParams(params) {
        return parseObject(params, WebDriverBidi.BrowsingContext.TraverseHistoryParametersSchema);
    }
    BrowsingContext.parseTraverseHistoryParams = parseTraverseHistoryParams;
    function parseHandleUserPromptParameters(params) {
        return parseObject(params, WebDriverBidi.BrowsingContext.HandleUserPromptParametersSchema);
    }
    BrowsingContext.parseHandleUserPromptParameters = parseHandleUserPromptParameters;
    function parseLocateNodesParams(params) {
        // TODO: remove cast after https://github.com/google/cddlconv/issues/19 is fixed.
        return parseObject(params, WebDriverBidi.BrowsingContext.LocateNodesParametersSchema);
    }
    BrowsingContext.parseLocateNodesParams = parseLocateNodesParams;
})(BrowsingContext || (BrowsingContext = {}));
/** @see https://w3c.github.io/webdriver-bidi/#module-session */
export var Session;
(function (Session) {
    function parseSubscribeParams(params) {
        return parseObject(params, WebDriverBidi.Session.SubscriptionRequestSchema);
    }
    Session.parseSubscribeParams = parseSubscribeParams;
})(Session || (Session = {}));
export var Input;
(function (Input) {
    function parsePerformActionsParams(params) {
        return parseObject(params, WebDriverBidi.Input.PerformActionsParametersSchema);
    }
    Input.parsePerformActionsParams = parsePerformActionsParams;
    function parseReleaseActionsParams(params) {
        return parseObject(params, WebDriverBidi.Input.ReleaseActionsParametersSchema);
    }
    Input.parseReleaseActionsParams = parseReleaseActionsParams;
    function parseSetFilesParams(params) {
        return parseObject(params, WebDriverBidi.Input.SetFilesParametersSchema);
    }
    Input.parseSetFilesParams = parseSetFilesParams;
})(Input || (Input = {}));
export var Storage;
(function (Storage) {
    function parseGetCookiesParams(params) {
        // Work around of `cddlconv` https://github.com/google/cddlconv/issues/19.
        // The generated schema `SameSiteSchema` in `src/protocol-parser/webdriver-bidi.ts` is
        // of type `"none" | "strict" | "lax"` which is not assignable to generated enum
        // `SameSite` in `src/protocol/webdriver-bidi.ts`.
        // TODO: remove cast after https://github.com/google/cddlconv/issues/19 is fixed.
        return parseObject(params, WebDriverBidi.Storage.GetCookiesParametersSchema);
    }
    Storage.parseGetCookiesParams = parseGetCookiesParams;
    function parseSetCookieParams(params) {
        // Work around of `cddlconv` https://github.com/google/cddlconv/issues/19.
        // The generated schema `SameSiteSchema` in `src/protocol-parser/webdriver-bidi.ts` is
        // of type `"none" | "strict" | "lax"` which is not assignable to generated enum
        // `SameSite` in `src/protocol/webdriver-bidi.ts`.
        // TODO: remove cast after https://github.com/google/cddlconv/issues/19 is fixed.
        return parseObject(params, WebDriverBidi.Storage.SetCookieParametersSchema);
    }
    Storage.parseSetCookieParams = parseSetCookieParams;
    function parseDeleteCookiesParams(params) {
        // Work around of `cddlconv` https://github.com/google/cddlconv/issues/19.
        // The generated schema `SameSiteSchema` in `src/protocol-parser/webdriver-bidi.ts` is
        // of type `"none" | "strict" | "lax"` which is not assignable to generated enum
        // `SameSite` in `src/protocol/webdriver-bidi.ts`.
        // TODO: remove cast after https://github.com/google/cddlconv/issues/19 is fixed.
        return parseObject(params, WebDriverBidi.Storage.DeleteCookiesParametersSchema);
    }
    Storage.parseDeleteCookiesParams = parseDeleteCookiesParams;
})(Storage || (Storage = {}));
export var Cdp;
(function (Cdp) {
    const SendCommandRequestSchema = z.object({
        // Allowing any cdpMethod, and casting to proper type later on.
        method: z.string(),
        // `passthrough` allows object to have any fields.
        // https://github.com/colinhacks/zod#passthrough
        params: z.object({}).passthrough().optional(),
        session: z.string().optional(),
    });
    const GetSessionRequestSchema = z.object({
        context: WebDriverBidi.BrowsingContext.BrowsingContextSchema,
    });
    const ResolveRealmRequestSchema = z.object({
        realm: WebDriverBidi.Script.RealmSchema,
    });
    function parseSendCommandRequest(params) {
        return parseObject(params, SendCommandRequestSchema);
    }
    Cdp.parseSendCommandRequest = parseSendCommandRequest;
    function parseGetSessionRequest(params) {
        return parseObject(params, GetSessionRequestSchema);
    }
    Cdp.parseGetSessionRequest = parseGetSessionRequest;
    function parseResolveRealmRequest(params) {
        return parseObject(params, ResolveRealmRequestSchema);
    }
    Cdp.parseResolveRealmRequest = parseResolveRealmRequest;
})(Cdp || (Cdp = {}));
export var Permissions;
(function (Permissions) {
    function parseSetPermissionsParams(params) {
        return {
            // TODO: remove once "goog:" attributes are not needed.
            ...params,
            ...parseObject(params, WebDriverBidiPermissions.Permissions.SetPermissionParametersSchema),
        };
    }
    Permissions.parseSetPermissionsParams = parseSetPermissionsParams;
})(Permissions || (Permissions = {}));
export var Bluetooth;
(function (Bluetooth) {
    function parseHandleRequestDevicePromptParams(params) {
        return parseObject(params, WebDriverBidiBluetooth.Bluetooth.HandleRequestDevicePromptParametersSchema);
    }
    Bluetooth.parseHandleRequestDevicePromptParams = parseHandleRequestDevicePromptParams;
})(Bluetooth || (Bluetooth = {}));
//# sourceMappingURL=protocol-parser.js.map