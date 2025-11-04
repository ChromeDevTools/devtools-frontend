import type * as Platform from '../../core/platform/platform.js';
import type * as Protocol from '../../generated/protocol.js';
declare class HARBase {
    readonly custom: Map<string, any>;
    constructor(data: any);
    static safeDate(data: any): Date;
    static safeNumber(data: any): number;
    static optionalNumber(data: any): number | undefined;
    static optionalString(data: any): string | undefined;
    customAsString(name: string): string | undefined;
    customAsNumber(name: string): number | undefined;
    customAsArray(name: string): any[] | undefined;
    customInitiator(): HARInitiator | undefined;
}
export declare class HARRoot extends HARBase {
    log: HARLog;
    constructor(data: any);
}
export declare class HARLog extends HARBase {
    version: string;
    creator: HARCreator;
    browser: HARCreator | undefined;
    pages: HARPage[];
    entries: HAREntry[];
    comment: string | undefined;
    constructor(data: any);
}
declare class HARCreator extends HARBase {
    name: string;
    version: string;
    comment: string | undefined;
    constructor(data: any);
}
export declare class HARPage extends HARBase {
    startedDateTime: Date;
    id: string;
    title: string;
    pageTimings: HARPageTimings;
    comment: string | undefined;
    constructor(data: any);
}
declare class HARPageTimings extends HARBase {
    onContentLoad: number | undefined;
    onLoad: number | undefined;
    comment: string | undefined;
    constructor(data: any);
}
export declare class HAREntry extends HARBase {
    pageref: string | undefined;
    startedDateTime: Date;
    time: number;
    request: HARRequest;
    response: HARResponse;
    timings: HARTimings;
    serverIPAddress: string | undefined;
    connection: string | undefined;
    comment: string | undefined;
    constructor(data: any);
    private importInitiator;
    private importWebSocketMessages;
}
declare class HARRequest extends HARBase {
    method: string;
    url: Platform.DevToolsPath.UrlString;
    httpVersion: string;
    cookies: HARCookie[];
    headers: HARHeader[];
    queryString: HARQueryString[];
    postData: HARPostData | undefined;
    headersSize: number;
    bodySize: number;
    comment: string | undefined;
    constructor(data: any);
}
declare class HARResponse extends HARBase {
    status: number;
    statusText: string;
    httpVersion: string;
    cookies: HARCookie[];
    headers: HARHeader[];
    content: HARContent;
    redirectURL: string;
    headersSize: number;
    bodySize: number;
    comment: string | undefined;
    constructor(data: any);
}
export declare class HARCookie extends HARBase {
    name: string;
    value: string;
    path: string | undefined;
    domain: string | undefined;
    expires: Date | undefined;
    httpOnly: boolean | undefined;
    secure: boolean | undefined;
    comment: string | undefined;
    constructor(data: any);
}
declare class HARHeader extends HARBase {
    name: string;
    value: string;
    comment: string | undefined;
    constructor(data: any);
}
declare class HARQueryString extends HARBase {
    name: string;
    value: string;
    comment: string | undefined;
    constructor(data: any);
}
declare class HARPostData extends HARBase {
    mimeType: string;
    params: HARParam[];
    text: string;
    comment: string | undefined;
    constructor(data: any);
}
export declare class HARParam extends HARBase {
    name: string;
    value: string | undefined;
    fileName: string | undefined;
    contentType: string | undefined;
    comment: string | undefined;
    constructor(data: any);
}
declare class HARContent extends HARBase {
    size: number;
    compression: number | undefined;
    mimeType: string;
    text: string | undefined;
    encoding: string | undefined;
    comment: string | undefined;
    constructor(data: any);
}
export declare class HARTimings extends HARBase {
    blocked: number | undefined;
    dns: number | undefined;
    connect: number | undefined;
    send: number;
    wait: number;
    receive: number;
    ssl: number | undefined;
    comment: string | undefined;
    constructor(data: any);
}
export declare class HARInitiator extends HARBase {
    type: Protocol.Network.InitiatorType;
    url?: string;
    lineNumber?: number;
    requestId?: Protocol.Network.RequestId;
    stack?: HARStack;
    /**
     * Based on Protocol.Network.Initiator defined in browser_protocol.pdl
     */
    constructor(data: any);
}
export declare class HARStack extends HARBase {
    description?: string;
    callFrames: HARCallFrame[];
    parent?: HARStack;
    parentId?: {
        id: string;
        debuggerId?: Protocol.Runtime.UniqueDebuggerId;
    };
    /**
     * Based on Protocol.Runtime.StackTrace defined in browser_protocol.pdl
     */
    constructor(data: any);
}
export declare class HARCallFrame extends HARBase {
    functionName: string;
    scriptId: Protocol.Runtime.ScriptId;
    url: string;
    lineNumber: number;
    columnNumber: number;
    /**
     * Based on Protocol.Runtime.CallFrame defined in browser_protocol.pdl
     */
    constructor(data: any);
}
export {};
