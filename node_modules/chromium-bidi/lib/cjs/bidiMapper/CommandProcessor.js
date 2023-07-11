"use strict";
/**
 * Copyright 2021 Google LLC.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandProcessor = void 0;
const protocol_js_1 = require("../protocol/protocol.js");
const log_js_1 = require("../utils/log.js");
const EventEmitter_js_1 = require("../utils/EventEmitter.js");
const browsingContextProcessor_js_1 = require("./domains/context/browsingContextProcessor.js");
const OutgoingBidiMessage_js_1 = require("./OutgoingBidiMessage.js");
class BidiNoOpParser {
    parseAddPreloadScriptParams(params) {
        return params;
    }
    parseRemovePreloadScriptParams(params) {
        return params;
    }
    parseGetRealmsParams(params) {
        return params;
    }
    parseCallFunctionParams(params) {
        return params;
    }
    parseEvaluateParams(params) {
        return params;
    }
    parseDisownParams(params) {
        return params;
    }
    parseSendCommandParams(params) {
        return params;
    }
    parseGetSessionParams(params) {
        return params;
    }
    parseSubscribeParams(params) {
        return params;
    }
    parseNavigateParams(params) {
        return params;
    }
    parseReloadParams(params) {
        return params;
    }
    parseGetTreeParams(params) {
        return params;
    }
    parseCreateParams(params) {
        return params;
    }
    parseCloseParams(params) {
        return params;
    }
    parseCaptureScreenshotParams(params) {
        return params;
    }
    parsePrintParams(params) {
        return params;
    }
    parsePerformActionsParams(params) {
        return params;
    }
    parseReleaseActionsParams(params) {
        return params;
    }
    parseSetViewportParams(params) {
        return params;
    }
}
class CommandProcessor extends EventEmitter_js_1.EventEmitter {
    #contextProcessor;
    #eventManager;
    #parser;
    #logger;
    constructor(cdpConnection, eventManager, selfTargetId, parser = new BidiNoOpParser(), browsingContextStorage, realmStorage, logger) {
        super();
        this.#eventManager = eventManager;
        this.#logger = logger;
        this.#contextProcessor = new browsingContextProcessor_js_1.BrowsingContextProcessor(cdpConnection, selfTargetId, eventManager, browsingContextStorage, realmStorage, logger);
        this.#parser = parser;
    }
    static #process_session_status() {
        return { result: { ready: false, message: 'already connected' } };
    }
    async #process_session_subscribe(params, channel) {
        await this.#eventManager.subscribe(params.events, params.contexts ?? [null], channel);
        return { result: {} };
    }
    async #process_session_unsubscribe(params, channel) {
        await this.#eventManager.unsubscribe(params.events, params.contexts ?? [null], channel);
        return { result: {} };
    }
    async #processCommand(commandData) {
        switch (commandData.method) {
            case 'session.status':
                return CommandProcessor.#process_session_status();
            case 'session.subscribe':
                return this.#process_session_subscribe(this.#parser.parseSubscribeParams(commandData.params), commandData.channel ?? null);
            case 'session.unsubscribe':
                return this.#process_session_unsubscribe(this.#parser.parseSubscribeParams(commandData.params), commandData.channel ?? null);
            case 'browsingContext.create':
                return this.#contextProcessor.process_browsingContext_create(this.#parser.parseCreateParams(commandData.params));
            case 'browsingContext.close':
                return this.#contextProcessor.process_browsingContext_close(this.#parser.parseCloseParams(commandData.params));
            case 'browsingContext.getTree':
                return this.#contextProcessor.process_browsingContext_getTree(this.#parser.parseGetTreeParams(commandData.params));
            case 'browsingContext.navigate':
                return this.#contextProcessor.process_browsingContext_navigate(this.#parser.parseNavigateParams(commandData.params));
            case 'browsingContext.captureScreenshot':
                return this.#contextProcessor.process_browsingContext_captureScreenshot(this.#parser.parseCaptureScreenshotParams(commandData.params));
            case 'browsingContext.print':
                return this.#contextProcessor.process_browsingContext_print(this.#parser.parsePrintParams(commandData.params));
            case 'browsingContext.reload':
                return this.#contextProcessor.process_browsingContext_reload(this.#parser.parseReloadParams(commandData.params));
            case 'browsingContext.setViewport':
                return this.#contextProcessor.process_browsingContext_setViewport(this.#parser.parseSetViewportParams(commandData.params));
            case 'script.addPreloadScript':
                return this.#contextProcessor.process_script_addPreloadScript(this.#parser.parseAddPreloadScriptParams(commandData.params));
            case 'script.removePreloadScript':
                return this.#contextProcessor.process_script_removePreloadScript(this.#parser.parseRemovePreloadScriptParams(commandData.params));
            case 'script.getRealms':
                return this.#contextProcessor.process_script_getRealms(this.#parser.parseGetRealmsParams(commandData.params));
            case 'script.callFunction':
                return this.#contextProcessor.process_script_callFunction(this.#parser.parseCallFunctionParams(commandData.params));
            case 'script.evaluate':
                return this.#contextProcessor.process_script_evaluate(this.#parser.parseEvaluateParams(commandData.params));
            case 'script.disown':
                return this.#contextProcessor.process_script_disown(this.#parser.parseDisownParams(commandData.params));
            case 'input.performActions':
                return this.#contextProcessor.process_input_performActions(this.#parser.parsePerformActionsParams(commandData.params));
            case 'input.releaseActions':
                return this.#contextProcessor.process_input_releaseActions(this.#parser.parseReleaseActionsParams(commandData.params));
            case 'cdp.sendCommand':
                return this.#contextProcessor.process_cdp_sendCommand(this.#parser.parseSendCommandParams(commandData.params));
            case 'cdp.getSession':
                return this.#contextProcessor.process_cdp_getSession(this.#parser.parseGetSessionParams(commandData.params));
        }
        // Intentionally kept outside of the switch statement to ensure that
        // ESLint @typescript-eslint/switch-exhaustiveness-check triggers if a new
        // command is added.
        throw new protocol_js_1.Message.UnknownCommandException(`Unknown command '${commandData.method}'.`);
    }
    async processCommand(command) {
        try {
            const result = await this.#processCommand(command);
            const response = {
                id: command.id,
                ...result,
            };
            this.emit('response', OutgoingBidiMessage_js_1.OutgoingBidiMessage.createResolved(response, command.channel ?? null));
        }
        catch (e) {
            if (e instanceof protocol_js_1.Message.ErrorResponse) {
                const errorResponse = e;
                this.emit('response', OutgoingBidiMessage_js_1.OutgoingBidiMessage.createResolved(errorResponse.toErrorResponse(command.id), command.channel ?? null));
            }
            else {
                const error = e;
                this.#logger?.(log_js_1.LogType.bidi, error);
                this.emit('response', OutgoingBidiMessage_js_1.OutgoingBidiMessage.createResolved(new protocol_js_1.Message.UnknownErrorException(error.message).toErrorResponse(command.id), command.channel ?? null));
            }
        }
    }
}
exports.CommandProcessor = CommandProcessor;
//# sourceMappingURL=CommandProcessor.js.map