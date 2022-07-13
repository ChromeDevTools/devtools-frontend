// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';

import {RemoteObject} from './RemoteObject.js';

import {Capability, type Target} from './Target.js';
import {SDKModel} from './SDKModel.js';
import type * as Protocol from '../../generated/protocol.js';

export class IOModel extends SDKModel<void> {
  constructor(target: Target) {
    super(target);
  }

  async read(handle: Protocol.IO.StreamHandle, size?: number, offset?: number): Promise<string|ArrayBuffer|null> {
    const result = await this.target().ioAgent().invoke_read({handle, offset, size});
    if (result.getError()) {
      throw new Error(result.getError());
    }
    if (result.eof) {
      return null;
    }
    if (result.base64Encoded) {
      return Common.Base64.decode(result.data);
    }
    return result.data;
  }

  async close(handle: Protocol.IO.StreamHandle): Promise<void> {
    const result = await this.target().ioAgent().invoke_close({handle});
    if (result.getError()) {
      console.error('Could not close stream.');
    }
  }

  async resolveBlob(objectOrObjectId: Protocol.Runtime.RemoteObjectId|RemoteObject): Promise<string> {
    const objectId = objectOrObjectId instanceof RemoteObject ? objectOrObjectId.objectId : objectOrObjectId;
    if (!objectId) {
      throw new Error('Remote object has undefined objectId');
    }
    const result = await this.target().ioAgent().invoke_resolveBlob({objectId});
    if (result.getError()) {
      throw new Error(result.getError());
    }
    return `blob:${result.uuid}`;
  }

  async readToString(handle: Protocol.IO.StreamHandle): Promise<string> {
    const strings: string[] = [];
    const decoder = new TextDecoder();
    for (;;) {
      const data = await this.read(handle, 1024 * 1024);
      if (data === null) {
        strings.push(decoder.decode());
        break;
      }
      if (data instanceof ArrayBuffer) {
        strings.push(decoder.decode(data, {stream: true}));
      } else {
        strings.push(data);
      }
    }
    return strings.join('');
  }
}

SDKModel.register(IOModel, {capabilities: Capability.IO, autostart: true});
