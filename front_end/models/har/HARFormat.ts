// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';

/* eslint-disable @typescript-eslint/no-explicit-any */

class HARBase {
  readonly custom: Map<string, any>;
  constructor(data: any) {
    if (!data || typeof data !== 'object') {
      throw 'First parameter is expected to be an object';
    }
    this.custom = new Map();
  }

  static safeDate(data: any): Date {
    const date = new Date(data);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
    throw 'Invalid date format';
  }

  static safeNumber(data: any): number {
    const result = Number(data);
    if (!Number.isNaN(result)) {
      return result;
    }
    throw 'Casting to number results in NaN';
  }

  static optionalNumber(data: any): number|undefined {
    return data !== undefined ? HARBase.safeNumber(data) : undefined;
  }

  static optionalString(data: any): string|undefined {
    return data !== undefined ? String(data) : undefined;
  }

  customAsString(name: string): string|undefined {
    const value = this.custom.get(name);
    if (!value) {
      return undefined;
    }
    return String(value);
  }

  customAsNumber(name: string): number|undefined {
    const value = this.custom.get(name);
    if (!value) {
      return undefined;
    }
    const numberValue = Number(value);
    if (Number.isNaN(numberValue)) {
      return undefined;
    }
    return numberValue;
  }

  customAsArray(name: string): any[]|undefined {
    const value = this.custom.get(name);
    if (!value) {
      return undefined;
    }
    return Array.isArray(value) ? value : undefined;
  }

  customInitiator(): HARInitiator|undefined {
    return this.custom.get('initiator');
  }
}

export class HARRoot extends HARBase {
  log: HARLog;
  constructor(data: any) {
    super(data);
    this.log = new HARLog(data['log']);
  }
}

export class HARLog extends HARBase {
  version: string;
  creator: HARCreator;
  browser: HARCreator|undefined;
  pages: HARPage[];
  entries: HAREntry[];
  comment: string|undefined;
  constructor(data: any) {
    super(data);
    this.version = String(data['version']);
    this.creator = new HARCreator(data['creator']);
    this.browser = data['browser'] ? new HARCreator(data['browser']) : undefined;
    this.pages = Array.isArray(data['pages']) ? data['pages'].map(page => new HARPage(page)) : [];
    if (!Array.isArray(data['entries'])) {
      throw 'log.entries is expected to be an array';
    }
    this.entries = data['entries'].map(entry => new HAREntry(entry));
    this.comment = HARBase.optionalString(data['comment']);
  }
}

class HARCreator extends HARBase {
  name: string;
  version: string;
  comment: string|undefined;
  constructor(data: any) {
    super(data);
    this.name = String(data['name']);
    this.version = String(data['version']);
    this.comment = HARBase.optionalString(data['comment']);
  }
}

export class HARPage extends HARBase {
  startedDateTime: Date;
  id: string;
  title: string;
  pageTimings: HARPageTimings;
  comment: string|undefined;
  constructor(data: any) {
    super(data);
    this.startedDateTime = HARBase.safeDate(data['startedDateTime']);
    this.id = String(data['id']);
    this.title = String(data['title']);
    this.pageTimings = new HARPageTimings(data['pageTimings']);
    this.comment = HARBase.optionalString(data['comment']);
  }
}

class HARPageTimings extends HARBase {
  onContentLoad: number|undefined;
  onLoad: number|undefined;
  comment: string|undefined;
  constructor(data: any) {
    super(data);
    this.onContentLoad = HARBase.optionalNumber(data['onContentLoad']);
    this.onLoad = HARBase.optionalNumber(data['onLoad']);
    this.comment = HARBase.optionalString(data['comment']);
  }
}

export class HAREntry extends HARBase {
  pageref: string|undefined;
  startedDateTime: Date;
  time: number;
  request: HARRequest;
  response: HARResponse;
  cache: {};
  timings: HARTimings;
  serverIPAddress: string|undefined;
  connection: string|undefined;
  comment: string|undefined;
  constructor(data: any) {
    super(data);
    this.pageref = HARBase.optionalString(data['pageref']);
    this.startedDateTime = HARBase.safeDate(data['startedDateTime']);
    this.time = HARBase.safeNumber(data['time']);
    this.request = new HARRequest(data['request']);
    this.response = new HARResponse(data['response']);
    this.cache = {};  // Not yet implemented.
    this.timings = new HARTimings(data['timings']);
    this.serverIPAddress = HARBase.optionalString(data['serverIPAddress']);
    this.connection = HARBase.optionalString(data['connection']);
    this.comment = HARBase.optionalString(data['comment']);

    // Chrome specific.
    this.custom.set('connectionId', HARBase.optionalString(data['_connectionId']));
    this.custom.set('fromCache', HARBase.optionalString(data['_fromCache']));
    this.custom.set('initiator', this.importInitiator(data['_initiator']));
    this.custom.set('priority', HARBase.optionalString(data['_priority']));
    this.custom.set('resourceType', HARBase.optionalString(data['_resourceType']));
    this.custom.set('webSocketMessages', this.importWebSocketMessages(data['_webSocketMessages']));
  }

  private importInitiator(initiator: any): HARInitiator|undefined {
    if (typeof initiator !== 'object') {
      return;
    }

    return new HARInitiator(initiator);
  }

  private importWebSocketMessages(inputMessages: any): HARWebSocketMessage[]|undefined {
    if (!Array.isArray(inputMessages)) {
      return;
    }

    const outputMessages = [];
    for (const message of inputMessages) {
      if (typeof message !== 'object') {
        return;
      }
      outputMessages.push(new HARWebSocketMessage(message));
    }
    return outputMessages;
  }
}

class HARRequest extends HARBase {
  method: string;
  url: Platform.DevToolsPath.UrlString;
  httpVersion: string;
  cookies: HARCookie[];
  headers: HARHeader[];
  queryString: HARQueryString[];
  postData: HARPostData|undefined;
  headersSize: number;
  bodySize: number;
  comment: string|undefined;
  constructor(data: any) {
    super(data);
    this.method = String(data['method']);
    this.url = String(data['url']) as Platform.DevToolsPath.UrlString;
    this.httpVersion = String(data['httpVersion']);
    this.cookies = Array.isArray(data['cookies']) ? data['cookies'].map(cookie => new HARCookie(cookie)) : [];
    this.headers = Array.isArray(data['headers']) ? data['headers'].map(header => new HARHeader(header)) : [];
    this.queryString = Array.isArray(data['queryString']) ? data['queryString'].map(qs => new HARQueryString(qs)) : [];
    this.postData = data['postData'] ? new HARPostData(data['postData']) : undefined;
    this.headersSize = HARBase.safeNumber(data['headersSize']);
    this.bodySize = HARBase.safeNumber(data['bodySize']);
    this.comment = HARBase.optionalString(data['comment']);
  }
}

class HARResponse extends HARBase {
  status: number;
  statusText: string;
  httpVersion: string;
  cookies: HARCookie[];
  headers: HARHeader[];
  content: HARContent;
  redirectURL: string;
  headersSize: number;
  bodySize: number;
  comment: string|undefined;
  constructor(data: any) {
    super(data);
    this.status = HARBase.safeNumber(data['status']);
    this.statusText = String(data['statusText']);
    this.httpVersion = String(data['httpVersion']);
    this.cookies = Array.isArray(data['cookies']) ? data['cookies'].map(cookie => new HARCookie(cookie)) : [];
    this.headers = Array.isArray(data['headers']) ? data['headers'].map(header => new HARHeader(header)) : [];
    this.content = new HARContent(data['content']);
    this.redirectURL = String(data['redirectURL']);
    this.headersSize = HARBase.safeNumber(data['headersSize']);
    this.bodySize = HARBase.safeNumber(data['bodySize']);
    this.comment = HARBase.optionalString(data['comment']);

    // Chrome specific.
    this.custom.set('transferSize', HARBase.optionalNumber(data['_transferSize']));
    this.custom.set('error', HARBase.optionalString(data['_error']));
    this.custom.set('fetchedViaServiceWorker', Boolean(data['_fetchedViaServiceWorker']));
    this.custom.set('responseCacheStorageCacheName', HARBase.optionalString(data['_responseCacheStorageCacheName']));
    this.custom.set('serviceWorkerResponseSource', HARBase.optionalString(data['_serviceWorkerResponseSource']));
  }
}

class HARCookie extends HARBase {
  name: string;
  value: string;
  path: string|undefined;
  domain: string|undefined;
  expires: Date|undefined;
  httpOnly: boolean|undefined;
  secure: boolean|undefined;
  comment: string|undefined;
  constructor(data: any) {
    super(data);
    this.name = String(data['name']);
    this.value = String(data['value']);
    this.path = HARBase.optionalString(data['path']);
    this.domain = HARBase.optionalString(data['domain']);
    this.expires = data['expires'] ? HARBase.safeDate(data['expires']) : undefined;
    this.httpOnly = data['httpOnly'] !== undefined ? Boolean(data['httpOnly']) : undefined;
    this.secure = data['secure'] !== undefined ? Boolean(data['secure']) : undefined;
    this.comment = HARBase.optionalString(data['comment']);
  }
}

class HARHeader extends HARBase {
  name: string;
  value: string;
  comment: string|undefined;
  constructor(data: any) {
    super(data);
    this.name = String(data['name']);
    this.value = String(data['value']);
    this.comment = HARBase.optionalString(data['comment']);
  }
}

class HARQueryString extends HARBase {
  name: string;
  value: string;
  comment: string|undefined;
  constructor(data: any) {
    super(data);
    this.name = String(data['name']);
    this.value = String(data['value']);
    this.comment = HARBase.optionalString(data['comment']);
  }
}

class HARPostData extends HARBase {
  mimeType: string;
  params: HARParam[];
  text: string;
  comment: string|undefined;
  constructor(data: any) {
    super(data);
    this.mimeType = String(data['mimeType']);
    this.params = Array.isArray(data['params']) ? data['params'].map(param => new HARParam(param)) : [];
    this.text = String(data['text']);
    this.comment = HARBase.optionalString(data['comment']);
  }
}

export class HARParam extends HARBase {
  name: string;
  value: string|undefined;
  fileName: string|undefined;
  contentType: string|undefined;
  comment: string|undefined;
  constructor(data: any) {
    super(data);
    this.name = String(data['name']);
    this.value = HARBase.optionalString(data['value']);
    this.fileName = HARBase.optionalString(data['fileName']);
    this.contentType = HARBase.optionalString(data['contentType']);
    this.comment = HARBase.optionalString(data['comment']);
  }
}

class HARContent extends HARBase {
  size: number;
  compression: number|undefined;
  mimeType: string;
  text: string|undefined;
  encoding: string|undefined;
  comment: string|undefined;
  constructor(data: any) {
    super(data);
    this.size = HARBase.safeNumber(data['size']);
    this.compression = HARBase.optionalNumber(data['compression']);
    this.mimeType = String(data['mimeType']);
    this.text = HARBase.optionalString(data['text']);
    this.encoding = HARBase.optionalString(data['encoding']);
    this.comment = HARBase.optionalString(data['comment']);
  }
}

export class HARTimings extends HARBase {
  blocked: number|undefined;
  dns: number|undefined;
  connect: number|undefined;
  send: number;
  wait: number;
  receive: number;
  ssl: number|undefined;
  comment: string|undefined;
  constructor(data: any) {
    super(data);
    this.blocked = HARBase.optionalNumber(data['blocked']);
    this.dns = HARBase.optionalNumber(data['dns']);
    this.connect = HARBase.optionalNumber(data['connect']);
    this.send = HARBase.safeNumber(data['send']);
    this.wait = HARBase.safeNumber(data['wait']);
    this.receive = HARBase.safeNumber(data['receive']);
    this.ssl = HARBase.optionalNumber(data['ssl']);
    this.comment = HARBase.optionalString(data['comment']);

    // Chrome specific.
    this.custom.set('blocked_queueing', HARBase.optionalNumber(data['_blocked_queueing']));
    this.custom.set('blocked_proxy', HARBase.optionalNumber(data['_blocked_proxy']));

    // Service Worker timing info (Chrome specific).
    this.custom.set('workerStart', HARBase.optionalNumber(data['_workerStart']));
    this.custom.set('workerReady', HARBase.optionalNumber(data['_workerReady']));
    this.custom.set('workerFetchStart', HARBase.optionalNumber(data['_workerFetchStart']));
    this.custom.set('workerRespondWithSettled', HARBase.optionalNumber(data['_workerRespondWithSettled']));
  }
}

export class HARInitiator extends HARBase {
  type: Protocol.Network.InitiatorType;
  url?: string;
  lineNumber?: number;
  requestId?: Protocol.Network.RequestId;
  stack?: HARStack;
  /**
   * Based on Protocol.Network.Initiator defined in browser_protocol.pdl
   */
  constructor(data: any) {
    super(data);
    this.type = (HARBase.optionalString(data['type']) ?? SDK.NetworkRequest.InitiatorType.OTHER) as
        Protocol.Network.InitiatorType;
    this.url = HARBase.optionalString(data['url']);
    this.lineNumber = HARBase.optionalNumber(data['lineNumber']);
    this.requestId = HARBase.optionalString(data['requestId']) as Protocol.Network.RequestId;
    if (data['stack']) {
      this.stack = new HARStack(data['stack']);
    }
  }
}

export class HARStack extends HARBase {
  description?: string;
  callFrames: HARCallFrame[];
  parent?: HARStack;
  parentId?: {
    id: string,
    debuggerId?: Protocol.Runtime.UniqueDebuggerId,
  };
  /**
   * Based on Protocol.Runtime.StackTrace defined in browser_protocol.pdl
   */
  constructor(data: any) {
    super(data);

    this.callFrames = Array.isArray(data.callFrames) ?
        data.callFrames.map((item: any) => item ? new HARCallFrame(item) : null).filter(Boolean) :
        [];

    if (data['parent']) {
      this.parent = new HARStack(data['parent']);
    }

    this.description = HARBase.optionalString(data['description']);

    const parentId = data['parentId'];
    if (parentId) {
      this.parentId = {
        id: HARBase.optionalString(parentId['id']) ?? '',
        debuggerId: HARBase.optionalString(parentId['debuggerId']) as Protocol.Runtime.UniqueDebuggerId | undefined,
      };
    }
  }
}

export class HARCallFrame extends HARBase {
  functionName: string;
  scriptId: Protocol.Runtime.ScriptId;
  url: string = '';
  lineNumber: number = -1;
  columnNumber: number = -1;
  /**
   * Based on Protocol.Runtime.CallFrame defined in browser_protocol.pdl
   */
  constructor(data: any) {
    super(data);

    this.functionName = HARBase.optionalString(data['functionName']) ?? '';
    this.scriptId = (HARBase.optionalString(data['scriptId']) ?? '') as Protocol.Runtime.ScriptId;
    this.url = HARBase.optionalString(data['url']) ?? '';
    this.lineNumber = HARBase.optionalNumber(data['lineNumber']) ?? -1;
    this.columnNumber = HARBase.optionalNumber(data['columnNumber']) ?? -1;
  }
}

class HARWebSocketMessage extends HARBase {
  time: number|undefined;
  opcode: number|undefined;
  data: string|undefined;
  type: string|undefined;
  constructor(data: any) {
    super(data);
    this.time = HARBase.optionalNumber(data['time']);
    this.opcode = HARBase.optionalNumber(data['opcode']);
    this.data = HARBase.optionalString(data['data']);
    this.type = HARBase.optionalString(data['type']);
  }
}
