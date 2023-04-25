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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CDP = exports.Network = exports.Log = exports.BrowsingContext = exports.Script = exports.Message = void 0;
var Message;
(function (Message) {
    // keep-sorted end;
    let ErrorCode;
    (function (ErrorCode) {
        // keep-sorted start
        ErrorCode["InvalidArgument"] = "invalid argument";
        ErrorCode["InvalidSessionId"] = "invalid session id";
        ErrorCode["NoSuchAlert"] = "no such alert";
        ErrorCode["NoSuchFrame"] = "no such frame";
        ErrorCode["NoSuchHandle"] = "no such handle";
        ErrorCode["NoSuchNode"] = "no such node";
        ErrorCode["NoSuchScript"] = "no such script";
        ErrorCode["SessionNotCreated"] = "session not created";
        ErrorCode["UnknownCommand"] = "unknown command";
        ErrorCode["UnknownError"] = "unknown error";
        ErrorCode["UnsupportedOperation"] = "unsupported operation";
        // keep-sorted end
    })(ErrorCode = Message.ErrorCode || (Message.ErrorCode = {}));
    class ErrorResponse {
        error;
        message;
        stacktrace;
        constructor(error, message, stacktrace) {
            this.error = error;
            this.message = message;
            this.stacktrace = stacktrace;
        }
        toErrorResponse(commandId) {
            return {
                id: commandId,
                error: this.error,
                message: this.message,
                stacktrace: this.stacktrace,
            };
        }
    }
    Message.ErrorResponse = ErrorResponse;
    class InvalidArgumentException extends ErrorResponse {
        constructor(message, stacktrace) {
            super(ErrorCode.InvalidArgument, message, stacktrace);
        }
    }
    Message.InvalidArgumentException = InvalidArgumentException;
    class NoSuchHandleException extends ErrorResponse {
        constructor(message, stacktrace) {
            super(ErrorCode.NoSuchHandle, message, stacktrace);
        }
    }
    Message.NoSuchHandleException = NoSuchHandleException;
    class InvalidSessionIdException extends ErrorResponse {
        constructor(message, stacktrace) {
            super(ErrorCode.InvalidSessionId, message, stacktrace);
        }
    }
    Message.InvalidSessionIdException = InvalidSessionIdException;
    class NoSuchAlertException extends ErrorResponse {
        constructor(message, stacktrace) {
            super(ErrorCode.NoSuchAlert, message, stacktrace);
        }
    }
    Message.NoSuchAlertException = NoSuchAlertException;
    class NoSuchFrameException extends ErrorResponse {
        constructor(message) {
            super(ErrorCode.NoSuchFrame, message);
        }
    }
    Message.NoSuchFrameException = NoSuchFrameException;
    class NoSuchNodeException extends ErrorResponse {
        constructor(message, stacktrace) {
            super(ErrorCode.NoSuchNode, message, stacktrace);
        }
    }
    Message.NoSuchNodeException = NoSuchNodeException;
    class NoSuchScriptException extends ErrorResponse {
        constructor(message, stacktrace) {
            super(ErrorCode.NoSuchScript, message, stacktrace);
        }
    }
    Message.NoSuchScriptException = NoSuchScriptException;
    class SessionNotCreatedException extends ErrorResponse {
        constructor(message, stacktrace) {
            super(ErrorCode.SessionNotCreated, message, stacktrace);
        }
    }
    Message.SessionNotCreatedException = SessionNotCreatedException;
    class UnknownCommandException extends ErrorResponse {
        constructor(message, stacktrace) {
            super(ErrorCode.UnknownCommand, message, stacktrace);
        }
    }
    Message.UnknownCommandException = UnknownCommandException;
    class UnknownErrorException extends ErrorResponse {
        constructor(message, stacktrace) {
            super(ErrorCode.UnknownError, message, stacktrace);
        }
    }
    Message.UnknownErrorException = UnknownErrorException;
    class UnsupportedOperationException extends ErrorResponse {
        constructor(message, stacktrace) {
            super(ErrorCode.UnsupportedOperation, message, stacktrace);
        }
    }
    Message.UnsupportedOperationException = UnsupportedOperationException;
})(Message = exports.Message || (exports.Message = {}));
/** @see https://w3c.github.io/webdriver-bidi/#module-script */
var Script;
(function (Script) {
    let EventNames;
    (function (EventNames) {
        EventNames["MessageEvent"] = "script.message";
    })(EventNames = Script.EventNames || (Script.EventNames = {}));
    Script.AllEvents = 'script';
})(Script = exports.Script || (exports.Script = {}));
// https://w3c.github.io/webdriver-bidi/#module-browsingContext
var BrowsingContext;
(function (BrowsingContext) {
    let EventNames;
    (function (EventNames) {
        EventNames["LoadEvent"] = "browsingContext.load";
        EventNames["DomContentLoadedEvent"] = "browsingContext.domContentLoaded";
        EventNames["ContextCreatedEvent"] = "browsingContext.contextCreated";
        EventNames["ContextDestroyedEvent"] = "browsingContext.contextDestroyed";
    })(EventNames = BrowsingContext.EventNames || (BrowsingContext.EventNames = {}));
    BrowsingContext.AllEvents = 'browsingContext';
})(BrowsingContext = exports.BrowsingContext || (exports.BrowsingContext = {}));
/** @see https://w3c.github.io/webdriver-bidi/#module-log */
var Log;
(function (Log) {
    Log.AllEvents = 'log';
    let EventNames;
    (function (EventNames) {
        EventNames["LogEntryAddedEvent"] = "log.entryAdded";
    })(EventNames = Log.EventNames || (Log.EventNames = {}));
})(Log = exports.Log || (exports.Log = {}));
var Network;
(function (Network) {
    Network.AllEvents = 'network';
    let EventNames;
    (function (EventNames) {
        EventNames["BeforeRequestSentEvent"] = "network.beforeRequestSent";
        EventNames["ResponseCompletedEvent"] = "network.responseCompleted";
        EventNames["FetchErrorEvent"] = "network.fetchError";
    })(EventNames = Network.EventNames || (Network.EventNames = {}));
})(Network = exports.Network || (exports.Network = {}));
var CDP;
(function (CDP) {
    CDP.AllEvents = 'cdp';
    let EventNames;
    (function (EventNames) {
        EventNames["EventReceivedEvent"] = "cdp.eventReceived";
    })(EventNames = CDP.EventNames || (CDP.EventNames = {}));
})(CDP = exports.CDP || (exports.CDP = {}));
//# sourceMappingURL=protocol.js.map