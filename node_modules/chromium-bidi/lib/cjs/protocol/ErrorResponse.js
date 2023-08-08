"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnsupportedOperationException = exports.UnableToCloseBrowserException = exports.UnableToCaptureScreenException = exports.UnknownErrorException = exports.UnknownCommandException = exports.SessionNotCreatedException = exports.NoSuchScriptException = exports.NoSuchNodeException = exports.NoSuchHandleException = exports.NoSuchFrameException = exports.NoSuchElementException = exports.NoSuchAlertException = exports.MoveTargetOutOfBoundsException = exports.InvalidSessionIdException = exports.InvalidArgumentException = exports.Exception = void 0;
class Exception {
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
            type: 'error',
            id: commandId,
            error: this.error,
            message: this.message,
            stacktrace: this.stacktrace,
        };
    }
}
exports.Exception = Exception;
class InvalidArgumentException extends Exception {
    constructor(message, stacktrace) {
        super("invalid argument" /* ErrorCode.InvalidArgument */, message, stacktrace);
    }
}
exports.InvalidArgumentException = InvalidArgumentException;
class InvalidSessionIdException extends Exception {
    constructor(message, stacktrace) {
        super("invalid session id" /* ErrorCode.InvalidSessionId */, message, stacktrace);
    }
}
exports.InvalidSessionIdException = InvalidSessionIdException;
class MoveTargetOutOfBoundsException extends Exception {
    constructor(message, stacktrace) {
        super("move target out of bounds" /* ErrorCode.MoveTargetOutOfBounds */, message, stacktrace);
    }
}
exports.MoveTargetOutOfBoundsException = MoveTargetOutOfBoundsException;
class NoSuchAlertException extends Exception {
    constructor(message, stacktrace) {
        super("no such alert" /* ErrorCode.NoSuchAlert */, message, stacktrace);
    }
}
exports.NoSuchAlertException = NoSuchAlertException;
class NoSuchElementException extends Exception {
    constructor(message, stacktrace) {
        super("no such element" /* ErrorCode.NoSuchElement */, message, stacktrace);
    }
}
exports.NoSuchElementException = NoSuchElementException;
class NoSuchFrameException extends Exception {
    constructor(message, stacktrace) {
        super("no such frame" /* ErrorCode.NoSuchFrame */, message, stacktrace);
    }
}
exports.NoSuchFrameException = NoSuchFrameException;
class NoSuchHandleException extends Exception {
    constructor(message, stacktrace) {
        super("no such handle" /* ErrorCode.NoSuchHandle */, message, stacktrace);
    }
}
exports.NoSuchHandleException = NoSuchHandleException;
class NoSuchNodeException extends Exception {
    constructor(message, stacktrace) {
        super("no such node" /* ErrorCode.NoSuchNode */, message, stacktrace);
    }
}
exports.NoSuchNodeException = NoSuchNodeException;
class NoSuchScriptException extends Exception {
    constructor(message, stacktrace) {
        super("no such script" /* ErrorCode.NoSuchScript */, message, stacktrace);
    }
}
exports.NoSuchScriptException = NoSuchScriptException;
class SessionNotCreatedException extends Exception {
    constructor(message, stacktrace) {
        super("session not created" /* ErrorCode.SessionNotCreated */, message, stacktrace);
    }
}
exports.SessionNotCreatedException = SessionNotCreatedException;
class UnknownCommandException extends Exception {
    constructor(message, stacktrace) {
        super("unknown command" /* ErrorCode.UnknownCommand */, message, stacktrace);
    }
}
exports.UnknownCommandException = UnknownCommandException;
class UnknownErrorException extends Exception {
    constructor(message, stacktrace = new Error().stack) {
        super("unknown error" /* ErrorCode.UnknownError */, message, stacktrace);
    }
}
exports.UnknownErrorException = UnknownErrorException;
class UnableToCaptureScreenException extends Exception {
    constructor(message, stacktrace) {
        super("unable to capture screen" /* ErrorCode.UnableToCaptureScreen */, message, stacktrace);
    }
}
exports.UnableToCaptureScreenException = UnableToCaptureScreenException;
class UnableToCloseBrowserException extends Exception {
    constructor(message, stacktrace) {
        super("unable to close browser" /* ErrorCode.UnableToCloseBrowser */, message, stacktrace);
    }
}
exports.UnableToCloseBrowserException = UnableToCloseBrowserException;
class UnsupportedOperationException extends Exception {
    constructor(message, stacktrace) {
        super("unsupported operation" /* ErrorCode.UnsupportedOperation */, message, stacktrace);
    }
}
exports.UnsupportedOperationException = UnsupportedOperationException;
//# sourceMappingURL=ErrorResponse.js.map