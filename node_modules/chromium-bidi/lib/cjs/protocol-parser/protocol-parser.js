"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cdp = exports.Input = exports.Session = exports.BrowsingContext = exports.Script = exports.parseObject = void 0;
/**
 * @fileoverview Provides parsing and validator for WebDriver BiDi protocol.
 * Parser types should match the `../protocol` types.
 */
const zod_1 = require("zod");
const protocol_js_1 = require("../protocol/protocol.js");
const WebDriverBidi = __importStar(require("./webdriver-bidi.js"));
function parseObject(obj, schema) {
    const parseResult = schema.safeParse(obj);
    if (parseResult.success) {
        return parseResult.data;
    }
    const errorMessage = parseResult.error.errors
        .map((e) => `${e.message} in ` +
        `${e.path.map((p) => JSON.stringify(p)).join('/')}.`)
        .join(' ');
    throw new protocol_js_1.InvalidArgumentException(errorMessage);
}
exports.parseObject = parseObject;
/** @see https://w3c.github.io/webdriver-bidi/#module-script */
var Script;
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
})(Script || (exports.Script = Script = {}));
/** @see https://w3c.github.io/webdriver-bidi/#module-browsingContext */
var BrowsingContext;
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
    function parseHandleUserPromptParameters(params) {
        return parseObject(params, WebDriverBidi.BrowsingContext.HandleUserPromptParametersSchema);
    }
    BrowsingContext.parseHandleUserPromptParameters = parseHandleUserPromptParameters;
})(BrowsingContext || (exports.BrowsingContext = BrowsingContext = {}));
/** @see https://w3c.github.io/webdriver-bidi/#module-session */
var Session;
(function (Session) {
    function parseSubscribeParams(params) {
        return parseObject(params, WebDriverBidi.Session.SubscriptionRequestSchema);
    }
    Session.parseSubscribeParams = parseSubscribeParams;
})(Session || (exports.Session = Session = {}));
var Input;
(function (Input) {
    function parsePerformActionsParams(params) {
        return parseObject(params, WebDriverBidi.Input.PerformActionsParametersSchema);
    }
    Input.parsePerformActionsParams = parsePerformActionsParams;
    function parseReleaseActionsParams(params) {
        return parseObject(params, WebDriverBidi.Input.ReleaseActionsParametersSchema);
    }
    Input.parseReleaseActionsParams = parseReleaseActionsParams;
})(Input || (exports.Input = Input = {}));
var Cdp;
(function (Cdp) {
    const SendCommandRequestSchema = zod_1.z.object({
        // Allowing any cdpMethod, and casting to proper type later on.
        method: zod_1.z.string(),
        // `passthrough` allows object to have any fields.
        // https://github.com/colinhacks/zod#passthrough
        params: zod_1.z.object({}).passthrough().optional(),
        session: zod_1.z.string().optional(),
    });
    const GetSessionRequestSchema = zod_1.z.object({
        context: WebDriverBidi.BrowsingContext.BrowsingContextSchema,
    });
    function parseSendCommandRequest(params) {
        return parseObject(params, SendCommandRequestSchema);
    }
    Cdp.parseSendCommandRequest = parseSendCommandRequest;
    function parseGetSessionRequest(params) {
        return parseObject(params, GetSessionRequestSchema);
    }
    Cdp.parseGetSessionRequest = parseGetSessionRequest;
})(Cdp || (exports.Cdp = Cdp = {}));
//# sourceMappingURL=protocol-parser.js.map