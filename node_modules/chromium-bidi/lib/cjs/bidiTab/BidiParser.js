"use strict";
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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BidiParser = void 0;
const Parser = __importStar(require("../protocol-parser/protocol-parser.js"));
class BidiParser {
    // Bluetooth module
    // keep-sorted start block=yes
    parseHandleRequestDevicePromptParams(params) {
        return Parser.Bluetooth.parseHandleRequestDevicePromptParams(params);
    }
    parseSimulateAdapterParameters(params) {
        return Parser.Bluetooth.parseSimulateAdapterParams(params);
    }
    parseSimulateAdvertisementParameters(params) {
        return Parser.Bluetooth.parseSimulateAdvertisementParams(params);
    }
    parseSimulatePreconnectedPeripheralParameters(params) {
        return Parser.Bluetooth.parseSimulatePreconnectedPeripheralParams(params);
    }
    // keep-sorted end
    // Browser module
    // keep-sorted start block=yes
    parseRemoveUserContextParams(params) {
        return Parser.Browser.parseRemoveUserContextParams(params);
    }
    // keep-sorted end
    // Browsing Context module
    // keep-sorted start block=yes
    parseActivateParams(params) {
        return Parser.BrowsingContext.parseActivateParams(params);
    }
    parseCaptureScreenshotParams(params) {
        return Parser.BrowsingContext.parseCaptureScreenshotParams(params);
    }
    parseCloseParams(params) {
        return Parser.BrowsingContext.parseCloseParams(params);
    }
    parseCreateParams(params) {
        return Parser.BrowsingContext.parseCreateParams(params);
    }
    parseGetTreeParams(params) {
        return Parser.BrowsingContext.parseGetTreeParams(params);
    }
    parseHandleUserPromptParams(params) {
        return Parser.BrowsingContext.parseHandleUserPromptParameters(params);
    }
    parseLocateNodesParams(params) {
        return Parser.BrowsingContext.parseLocateNodesParams(params);
    }
    parseNavigateParams(params) {
        return Parser.BrowsingContext.parseNavigateParams(params);
    }
    parsePrintParams(params) {
        return Parser.BrowsingContext.parsePrintParams(params);
    }
    parseReloadParams(params) {
        return Parser.BrowsingContext.parseReloadParams(params);
    }
    parseSetViewportParams(params) {
        return Parser.BrowsingContext.parseSetViewportParams(params);
    }
    parseTraverseHistoryParams(params) {
        return Parser.BrowsingContext.parseTraverseHistoryParams(params);
    }
    // keep-sorted end
    // CDP module
    // keep-sorted start block=yes
    parseGetSessionParams(params) {
        return Parser.Cdp.parseGetSessionRequest(params);
    }
    parseResolveRealmParams(params) {
        return Parser.Cdp.parseResolveRealmRequest(params);
    }
    parseSendCommandParams(params) {
        return Parser.Cdp.parseSendCommandRequest(params);
    }
    // keep-sorted end
    // Input module
    // keep-sorted start block=yes
    parsePerformActionsParams(params) {
        return Parser.Input.parsePerformActionsParams(params);
    }
    parseReleaseActionsParams(params) {
        return Parser.Input.parseReleaseActionsParams(params);
    }
    parseSetFilesParams(params) {
        return Parser.Input.parseSetFilesParams(params);
    }
    // keep-sorted end
    // Network module
    // keep-sorted start block=yes
    parseAddInterceptParams(params) {
        return Parser.Network.parseAddInterceptParameters(params);
    }
    parseContinueRequestParams(params) {
        return Parser.Network.parseContinueRequestParameters(params);
    }
    parseContinueResponseParams(params) {
        return Parser.Network.parseContinueResponseParameters(params);
    }
    parseContinueWithAuthParams(params) {
        return Parser.Network.parseContinueWithAuthParameters(params);
    }
    parseFailRequestParams(params) {
        return Parser.Network.parseFailRequestParameters(params);
    }
    parseProvideResponseParams(params) {
        return Parser.Network.parseProvideResponseParameters(params);
    }
    parseRemoveInterceptParams(params) {
        return Parser.Network.parseRemoveInterceptParameters(params);
    }
    parseSetCacheBehavior(params) {
        return Parser.Network.parseSetCacheBehavior(params);
    }
    // keep-sorted end
    // Permissions module
    // keep-sorted start block=yes
    parseSetPermissionsParams(params) {
        return Parser.Permissions.parseSetPermissionsParams(params);
    }
    // keep-sorted end
    // Script module
    // keep-sorted start block=yes
    parseAddPreloadScriptParams(params) {
        return Parser.Script.parseAddPreloadScriptParams(params);
    }
    parseCallFunctionParams(params) {
        return Parser.Script.parseCallFunctionParams(params);
    }
    parseDisownParams(params) {
        return Parser.Script.parseDisownParams(params);
    }
    parseEvaluateParams(params) {
        return Parser.Script.parseEvaluateParams(params);
    }
    parseGetRealmsParams(params) {
        return Parser.Script.parseGetRealmsParams(params);
    }
    parseRemovePreloadScriptParams(params) {
        return Parser.Script.parseRemovePreloadScriptParams(params);
    }
    // keep-sorted end
    // Session module
    // keep-sorted start block=yes
    parseSubscribeParams(params) {
        return Parser.Session.parseSubscribeParams(params);
    }
    // keep-sorted end
    // Storage module
    // keep-sorted start block=yes
    parseDeleteCookiesParams(params) {
        return Parser.Storage.parseDeleteCookiesParams(params);
    }
    parseGetCookiesParams(params) {
        return Parser.Storage.parseGetCookiesParams(params);
    }
    parseSetCookieParams(params) {
        return Parser.Storage.parseSetCookieParams(params);
    }
}
exports.BidiParser = BidiParser;
//# sourceMappingURL=BidiParser.js.map