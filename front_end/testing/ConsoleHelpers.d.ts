import type * as SDK from '../core/sdk/sdk.js';
import type * as Protocol from '../generated/protocol.js';
import * as Console from '../panels/console/console.js';
import * as Components from '../ui/legacy/components/utils/utils.js';
export declare function createConsoleViewMessageWithStubDeps(rawMessage: SDK.ConsoleModel.ConsoleMessage): {
    message: Console.ConsoleViewMessage.ConsoleViewMessage;
    linkifier: import("sinon").SinonStubbedInstance<Components.Linkifier.Linkifier>;
};
/**
 * Helper for less verbose stack traces in test code. Pass stack traces with the
 * following format:
 *
 * "<scriptId>::<functionName>::<url>::<lineNumber>::<columnNumber>"
 */
export declare function createStackTrace(callFrameDescriptions: string[]): Protocol.Runtime.StackTrace;
