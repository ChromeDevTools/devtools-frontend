// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties, @typescript-eslint/no-explicit-any */

class HARBase {
  _custom: Map<string, any>;
  constructor(data: any) {
    if (!data || typeof data !== 'object') {
      throw 'First parameter is expected to be an object';
    }
    this._custom = new Map();
  }

  static _safeDate(data: any): Date {
    const date = new Date(data);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
    throw 'Invalid date format';
  }

  static _safeNumber(data: any): number {
    const result = Number(data);
    if (!Number.isNaN(result)) {
      return result;
    }
    throw 'Casting to number results in NaN';
  }

  static _optionalNumber(data: any): number|undefined {
    return data !== undefined ? HARBase._safeNumber(data) : undefined;
  }

  static _optionalString(data: any): string|undefined {
    return data !== undefined ? String(data) : undefined;
  }

  customAsString(name: string): string|undefined {
    const value = this._custom.get(name);
    if (!value) {
      return undefined;
    }
    return String(value);
  }

  customAsNumber(name: string): number|undefined {
    const value = this._custom.get(name);
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
    const value = this._custom.get(name);
    if (!value) {
      return undefined;
    }
    return Array.isArray(value) ? value : undefined;
  }

  customInitiator(): HARInitiator|undefined {
    return this._custom.get('initiator');
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
    this.comment = HARBase._optionalString(data['comment']);
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
    this.comment = HARBase._optionalString(data['comment']);
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
    this.startedDateTime = HARBase._safeDate(data['startedDateTime']);
    this.id = String(data['id']);
    this.title = String(data['title']);
    this.pageTimings = new HARPageTimings(data['pageTimings']);
    this.comment = HARBase._optionalString(data['comment']);
  }
}

class HARPageTimings extends HARBase {
  onContentLoad: number|undefined;
  onLoad: number|undefined;
  comment: string|undefined;
  constructor(data: any) {
    super(data);
    this.onContentLoad = HARBase._optionalNumber(data['onContentLoad']);
    this.onLoad = HARBase._optionalNumber(data['onLoad']);
    this.comment = HARBase._optionalString(data['comment']);
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
    this.pageref = HARBase._optionalString(data['pageref']);
    this.startedDateTime = HARBase._safeDate(data['startedDateTime']);
    this.time = HARBase._safeNumber(data['time']);
    this.request = new HARRequest(data['request']);
    this.response = new HARResponse(data['response']);
    this.cache = {};  // Not yet implemented.
    this.timings = new HARTimings(data['timings']);
    this.serverIPAddress = HARBase._optionalString(data['serverIPAddress']);
    this.connection = HARBase._optionalString(data['connection']);
    this.comment = HARBase._optionalString(data['comment']);

    // Chrome specific.
    this._custom.set('fromCache', HARBase._optionalString(data['_fromCache']));
    this._custom.set('initiator', this._importInitiator(data['_initiator']));
    this._custom.set('priority', HARBase._optionalString(data['_priority']));
    this._custom.set('resourceType', HARBase._optionalString(data['_resourceType']));
    this._custom.set('webSocketMessages', this._importWebSocketMessages(data['_webSocketMessages']));
  }

  _importInitiator(initiator: any): HARInitiator|undefined {
    if (typeof initiator !== 'object') {
      return;
    }

    return new HARInitiator(initiator);
  }

  _importWebSocketMessages(inputMessages: any): HARWebSocketMessage[]|undefined {
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
  url: string;
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
    this.url = String(data['url']);
    this.httpVersion = String(data['httpVersion']);
    this.cookies = Array.isArray(data['cookies']) ? data['cookies'].map(cookie => new HARCookie(cookie)) : [];
    this.headers = Array.isArray(data['headers']) ? data['headers'].map(header => new HARHeader(header)) : [];
    this.queryString = Array.isArray(data['queryString']) ? data['queryString'].map(qs => new HARQueryString(qs)) : [];
    this.postData = data['postData'] ? new HARPostData(data['postData']) : undefined;
    this.headersSize = HARBase._safeNumber(data['headersSize']);
    this.bodySize = HARBase._safeNumber(data['bodySize']);
    this.comment = HARBase._optionalString(data['comment']);
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
    this.status = HARBase._safeNumber(data['status']);
    this.statusText = String(data['statusText']);
    this.httpVersion = String(data['httpVersion']);
    this.cookies = Array.isArray(data['cookies']) ? data['cookies'].map(cookie => new HARCookie(cookie)) : [];
    this.headers = Array.isArray(data['headers']) ? data['headers'].map(header => new HARHeader(header)) : [];
    this.content = new HARContent(data['content']);
    this.redirectURL = String(data['redirectURL']);
    this.headersSize = HARBase._safeNumber(data['headersSize']);
    this.bodySize = HARBase._safeNumber(data['bodySize']);
    this.comment = HARBase._optionalString(data['comment']);

    // Chrome specific.
    this._custom.set('transferSize', HARBase._optionalNumber(data['_transferSize']));
    this._custom.set('error', HARBase._optionalString(data['_error']));
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
    this.path = HARBase._optionalString(data['path']);
    this.domain = HARBase._optionalString(data['domain']);
    this.expires = data['expires'] ? HARBase._safeDate(data['expires']) : undefined;
    this.httpOnly = data['httpOnly'] !== undefined ? Boolean(data['httpOnly']) : undefined;
    this.secure = data['secure'] !== undefined ? Boolean(data['secure']) : undefined;
    this.comment = HARBase._optionalString(data['comment']);
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
    this.comment = HARBase._optionalString(data['comment']);
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
    this.comment = HARBase._optionalString(data['comment']);
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
    this.comment = HARBase._optionalString(data['comment']);
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
    this.value = HARBase._optionalString(data['value']);
    this.fileName = HARBase._optionalString(data['fileName']);
    this.contentType = HARBase._optionalString(data['contentType']);
    this.comment = HARBase._optionalString(data['comment']);
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
    this.size = HARBase._safeNumber(data['size']);
    this.compression = HARBase._optionalNumber(data['compression']);
    this.mimeType = String(data['mimeType']);
    this.text = HARBase._optionalString(data['text']);
    this.encoding = HARBase._optionalString(data['encoding']);
    this.comment = HARBase._optionalString(data['comment']);
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
    this.blocked = HARBase._optionalNumber(data['blocked']);
    this.dns = HARBase._optionalNumber(data['dns']);
    this.connect = HARBase._optionalNumber(data['connect']);
    this.send = HARBase._safeNumber(data['send']);
    this.wait = HARBase._safeNumber(data['wait']);
    this.receive = HARBase._safeNumber(data['receive']);
    this.ssl = HARBase._optionalNumber(data['ssl']);
    this.comment = HARBase._optionalString(data['comment']);

    // Chrome specific.
    this._custom.set('blocked_queueing', HARBase._optionalNumber(data['_blocked_queueing']));
    this._custom.set('blocked_proxy', HARBase._optionalNumber(data['_blocked_proxy']));
  }
}

export class HARInitiator extends HARBase {
  type: string|undefined;
  url: string|undefined;
  lineNumber: number|undefined;
  /**
   * Based on Initiator defined in browser_protocol.pdl
   */
  constructor(data: any) {
    super(data);
    this.type = HARBase._optionalString(data['type']);
    this.url = HARBase._optionalString(data['url']);
    this.lineNumber = HARBase._optionalNumber(data['lineNumber']);
  }
}

class HARWebSocketMessage extends HARBase {
  time: number|undefined;
  opcode: number|undefined;
  data: string|undefined;
  type: string|undefined;
  constructor(data: any) {
    super(data);
    this.time = HARBase._optionalNumber(data['time']);
    this.opcode = HARBase._optionalNumber(data['opcode']);
    this.data = HARBase._optionalString(data['data']);
    this.type = HARBase._optionalString(data['type']);
  }
}
