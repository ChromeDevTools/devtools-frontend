// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type Protocol from 'devtools-protocol';
import {type ProtocolMapping} from 'devtools-protocol/types/protocol-mapping.js';

import {type Chrome} from '../../../extension-api/ExtensionAPI.js';
import {type WasmValue} from '../src/WasmTypes.js';

import {makeURL, relativePathname} from './TestUtils.js';

type PauseLocation = {
  rawLocation: Chrome.DevTools.RawLocation,
  callFrame: Protocol.Debugger.CallFrame,
};

type Handler<Method extends keyof ProtocolMapping.Events> =
    (method: Method, event: ProtocolMapping.Events[Method][0]) => unknown;

async function waitFor<ReturnT>(
    fn: (() => ReturnT | undefined)|(() => Promise<ReturnT|undefined>), timeout = 0): Promise<ReturnT> {
  let waitTime = 0;
  const callback = async(resolve: (value: ReturnT) => void, reject: (reason?: unknown) => void): Promise<void> => {
    try {
      const result = await fn();
      if (result) {
        resolve(result);
      } else if (timeout > 0 && waitTime > timeout) {
        reject();
      } else {
        waitTime += 100;
        setTimeout(() => callback(resolve, reject), 100);
      }
    } catch (e) {
      reject(e);
    }
  };
  return new Promise<ReturnT>((resolve, reject) => callback(resolve, reject));
}

export interface BreakLocation {
  lineNumber: number;
  locations: Protocol.Debugger.Location[];
}

export class Debugger {
  private readonly socket: WebSocket;
  private readonly targetId: string;
  private connected: boolean;
  private readonly queue: string[];
  private readonly callbacks: Map<number, {
    method: string,
    resolve: (r: ProtocolMapping.Commands[keyof ProtocolMapping.Commands]['returnType']) => unknown,
    reject: (r: unknown) => unknown
  }> = new Map();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly eventHandlers: Map<string, Set<Handler<any>>> = new Map();
  private nextMessageId = 0;
  private readonly scripts: Map<string, Protocol.Debugger.ScriptParsedEvent> = new Map();
  private readonly scriptsById: Map<string, Protocol.Debugger.ScriptParsedEvent> = new Map();
  private nextStopId = 0n;
  private waitForPauseQueue: {resolve: (pauseLocation: PauseLocation) => void}[] = [];
  private pauseLocation?: PauseLocation;
  private readonly callFrameToStopId = new Map<string, bigint>();
  private readonly stopIdToCallFrame = new Map<bigint, string>();
  private readonly setBreakpoints = new Map<number, Protocol.Debugger.SetBreakpointByUrlResponse>();

  static async create(): Promise<Debugger> {
    const response = await fetch('/json/new', {method: 'PUT'});
    const {id} = await response.json();
    const debug = new Debugger(id);
    debug.on('Debugger.scriptParsed', debug.scriptParsed.bind(debug)).on('Debugger.paused', debug.paused.bind(debug));
    await debug.send('Debugger.enable', undefined);
    await debug.send('Page.enable', undefined);
    return debug;
  }

  private constructor(targetId: string) {
    const url = `ws://localhost:9222/devtools/page/${targetId}`;
    this.targetId = targetId;
    this.socket = new WebSocket(url);
    this.socket.onerror = this.onError.bind(this);
    this.socket.onopen = this.onOpen.bind(this);
    this.socket.onmessage = this.onMessage.bind(this);
    this.socket.onclose = this.onClose.bind(this);
    this.queue = [];
    this.connected = false;
  }

  private onError(): void {
    console.error('Communication error');
  }

  private onOpen(): void {
    this.connected = true;
    for (const m of this.queue) {
      this.sendRaw(m);
    }
    this.queue.slice();
  }

  private onMessage(ev: MessageEvent<string>): void {
    const result = JSON.parse(ev.data);
    if ('id' in result) {
      const callback = this.callbacks.get(result.id);
      if (!callback) {
        throw new Error('Received response for an unknown request');
      }
      if (result.error) {
        callback.reject(result.error);
      } else {
        callback.resolve(result.result);
      }
    } else {
      const {method, params} = result;
      this.eventHandlers.get(method)?.forEach(handler => handler(method, params));
    }
  }

  private onClose(_ev: Event): void {
    this.connected = false;
    this.eventHandlers.clear();
    for (const {method, reject} of this.callbacks.values()) {
      reject(new Error(`'${method}' failed: Disconnected.`));
    }
  }

  private sendRaw(message: string): void {
    if (!this.connected) {
      this.queue.push(message);
    } else {
      this.socket.send(message);
    }
  }

  private nextId(): number {
    return this.nextMessageId++;
  }

  on<Method extends keyof ProtocolMapping.Events>(method: Method, handler: Handler<Method>): Debugger {
    this.eventHandlers.set(method, (this.eventHandlers.get(method) ?? new Set()).add(handler));
    return this;
  }

  off<Method extends keyof ProtocolMapping.Events>(method: Method, handler?: Handler<Method>): Debugger {
    if (handler) {
      this.eventHandlers.get(method)?.delete(handler);
    } else {
      this.eventHandlers.delete(method);
    }
    return this;
  }

  private send<Method extends keyof ProtocolMapping.Commands>(
      method: Method, params: ProtocolMapping.Commands[Method]['paramsType'][0]):
      Promise<ProtocolMapping.Commands[Method]['returnType']> {
    const id = this.nextId();
    this.sendRaw(JSON.stringify({id, method, params}));
    return new Promise<ProtocolMapping.Commands[Method]['returnType']>(
        (resolve, reject) => this.callbacks.set(id, {method, resolve, reject}));
  }

  async navigate(url: string): Promise<string> {
    const frameInfo = await this.send('Page.navigate', {url});
    return frameInfo.frameId;
  }

  async close(): Promise<void> {
    await this.send('Page.close', undefined);
    this.socket.close();
  }

  private scriptParsed(method: 'Debugger.scriptParsed', event: Protocol.Debugger.ScriptParsedEvent): void {
    const {scriptId, url} = event;
    this.scripts.set(url, event);
    this.scriptsById.set(scriptId, event);
  }

  private paused(method: 'Debugger.paused', event: Protocol.Debugger.PausedEvent): void {
    this.callFrameToStopId.clear();
    const {callFrames: [callFrame]} = event;
    if (!callFrame) {
      throw new Error('Paused without callframes');
    }
    const {location: {columnNumber, scriptId}} = callFrame;
    const script = this.scriptsById.get(scriptId);
    if (!script) {
      throw new Error(`Paused in unknown script ${scriptId}`);
    }
    if (columnNumber === undefined) {
      throw new Error('Missing code offset in paused location');
    }

    const rawLocation = {
      rawModuleId: scriptId,
      codeOffset: columnNumber - (script.codeOffset || 0),
      inlineFrameIndex: 0,
    };

    this.pauseLocation = {rawLocation, callFrame};
    if (this.waitForPauseQueue.length > 0) {
      const {resolve} = this.waitForPauseQueue[0];
      this.waitForPauseQueue = this.waitForPauseQueue.slice(1);
      resolve(this.pauseLocation);
    }
  }

  stopIdForCallFrame({callFrameId}: Protocol.Debugger.CallFrame): bigint {
    const stopId = this.callFrameToStopId.get(callFrameId);
    if (stopId !== undefined) {
      return stopId;
    }
    const newStopId = this.nextStopId++;
    this.callFrameToStopId.set(callFrameId, newStopId);
    this.stopIdToCallFrame.set(newStopId, callFrameId);
    return newStopId;
  }

  async waitForScript(url: string, timeout = 0): Promise<string> {
    return waitFor(() => this.scripts.get(url)?.scriptId, timeout);
  }

  async waitForPause(timeout = 0): Promise<PauseLocation> {
    if (this.pauseLocation) {
      return this.pauseLocation;
    }
    const waitPromise = new Promise<PauseLocation>(resolve => this.waitForPauseQueue.push({resolve}));
    if (timeout === 0) {
      return waitPromise;
    }
    const timeoutPromise = new Promise<PauseLocation>((_, r) => setTimeout(() => r(new Error('Timeout')), timeout));
    return Promise.race([waitPromise, timeoutPromise]);
  }

  async evaluateFunction<T>(expression: string): Promise<T> {
    const {result, exceptionDetails} =
        await this.send('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
    if (exceptionDetails) {
      throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    }
    return result.value;
  }

  async evaluateOnCallFrameByRef(expression: string, {callFrameId}: Protocol.Debugger.CallFrame):
      Promise<Protocol.Runtime.RemoteObject> {
    const {result, exceptionDetails} =
        await this.send('Debugger.evaluateOnCallFrame', {expression, returnByValue: false, callFrameId});
    if (exceptionDetails) {
      throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    }
    return result;
  }

  async getRemoteObject({callFrameId}: Protocol.Debugger.CallFrame, object: Chrome.DevTools.ForeignObject):
      Promise<Protocol.Runtime.RemoteObject> {
    const expression = `${object.valueClass}s[${object.index}]`;
    const {result, exceptionDetails} =
        await this.send('Debugger.evaluateOnCallFrame', {expression, silent: true, generatePreview: true, callFrameId});
    if (exceptionDetails) {
      throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    }
    return result;
  }

  async toObject(objectId: string, ...keys: string[]): Promise<Record<string, unknown>> {
    const {result, exceptionDetails} = await this.send('Runtime.getProperties', {objectId});
    if (exceptionDetails) {
      throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    }

    const obj: Record<string, unknown> = {};
    for (const {name, value} of result.filter(p => keys.length === 0 || keys.includes(p.name))) {
      if (value) {
        if (value.value) {
          obj[name] = value.value;
        } else if (value.objectId) {
          obj[name] = this.toObject(value.objectId);
        }
      }
    }
    return obj;
  }

  async evaluateOnCallFrame<T>(
      expectValue: boolean, convert: (result: Protocol.Runtime.RemoteObject) => T, expression: string,
      {callFrameId}: Protocol.Debugger.CallFrame): Promise<T> {
    return this.evaluateOnCallFrameId(expectValue, convert, expression, callFrameId);
  }

  async evaluateOnCallFrameId<T>(
      expectValue: boolean, convert: (result: Protocol.Runtime.RemoteObject) => T, expression: string,
      callFrameId: string): Promise<T> {
    const {result, exceptionDetails} = await this.send(
        'Debugger.evaluateOnCallFrame',
        {expression, returnByValue: !expectValue, generatePreview: expectValue, callFrameId});
    if (exceptionDetails) {
      throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    }
    return convert(result);
  }

  async waitForFunction<T>(expression: string, timeout = 0): Promise<T> {
    return waitFor(() => this.evaluateFunction<T>(expression), timeout);
  }

  page(script: string): WasmBackendPage {
    return new WasmBackendPage(script, this);
  }

  isPaused(): boolean {
    return this.pauseLocation !== undefined;
  }

  async resume(): Promise<void> {
    this.pauseLocation = undefined;
    await this.send('Debugger.resume', undefined);
  }

  async clearBreakpoints(): Promise<void> {
    for (const {breakpointId} of this.setBreakpoints.values()) {
      await this.send('Debugger.removeBreakpoint', {breakpointId});
    }
    this.setBreakpoints.clear();
  }

  async setBreakpointByRawLocation(scriptId: string, rawLocationRange: Chrome.DevTools.RawLocationRange):
      Promise<Protocol.Debugger.SetBreakpointByUrlResponse> {
    const script = this.scriptsById.get(scriptId);
    if (!script) {
      throw new Error('Unknown script id');
    }
    const {codeOffset, url} = script;
    const columnNumber = rawLocationRange.startOffset + (codeOffset || 0);
    const prevBreakpoint = this.setBreakpoints.get(columnNumber);
    if (prevBreakpoint) {
      return prevBreakpoint;
    }
    const breakLocation = {lineNumber: 0, url, columnNumber};
    const breakpoint = await this.send('Debugger.setBreakpointByUrl', breakLocation);
    if (breakpoint.locations.length === 0) {
      throw new Error(`Failed to set breakpoint at offset ${rawLocationRange.startOffset}`);
    }
    this.setBreakpoints.set(columnNumber, breakpoint);
    return breakpoint;
  }

  async setBreakpointsOnSourceLines(
      sourceLines: Array<string|RegExp>, sourceFileURL: URL, plugin: Chrome.DevTools.LanguageExtensionPlugin,
      rawModuleId: string): Promise<Array<BreakLocation>> {
    if (sourceFileURL.protocol !== 'file:') {
      throw new Error('Not a file URL');
    }

    const {config: {basePath}} = __karma__ as {config: {basePath: string}};
    const contents = await fetch(`/base/${relativePathname(sourceFileURL, new URL(basePath, 'file://'))}`);
    const testText = await contents.text();
    const lines = testText.split('\n');

    const breakpoints = [];
    for (const sourceLine of sourceLines) {
      const sourceLineNumber = typeof sourceLine === 'string' ? lines.findIndex(l => l.includes(sourceLine)) :
                                                                lines.findIndex(l => l.match(sourceLine));
      if (sourceLineNumber < 0) {
        throw new Error('Source line not found');
      }

      // Breakpoints must be set in sequence to avoid racing on updating this.setBreakpoints
      breakpoints.push(await this.setBreakpoint(sourceLineNumber, sourceFileURL, plugin, rawModuleId));
    }
    return breakpoints;
  }

  async setBreakpointOnSourceLine(
      sourceLine: string|RegExp, sourceFileURL: URL, plugin: Chrome.DevTools.LanguageExtensionPlugin,
      rawModuleId: string): Promise<BreakLocation> {
    return (await this.setBreakpointsOnSourceLines([sourceLine], sourceFileURL, plugin, rawModuleId))[0];
  }

  async setBreakpoint(
      sourceLineNumber: number, sourceFileURL: URL, plugin: Chrome.DevTools.LanguageExtensionPlugin,
      rawModuleId: string): Promise<BreakLocation> {
    const lineNumber = await slideLine(plugin, rawModuleId, sourceFileURL.href, sourceLineNumber);
    const rawLocationRanges = await plugin.sourceLocationToRawLocation(
        {rawModuleId, sourceFileURL: sourceFileURL.href, lineNumber, columnNumber: -1});
    if (rawLocationRanges.length === 0) {
      throw new Error('Failed to map source location');
    }

    const setBreakpointLocations = [];
    for (const rawLocation of rawLocationRanges) {
      const {locations} = await this.setBreakpointByRawLocation(rawModuleId, rawLocation);
      if (locations.length === 0) {
        throw new Error('Failed to set breakpoint');
      }
      setBreakpointLocations.push(locations);
    }

    const breakpoint = {lineNumber, locations: setBreakpointLocations.flat()};
    return breakpoint;
  }

  private getCallFrameId(stopId: bigint): string {
    const callFrameId = this.stopIdToCallFrame.get(stopId);
    if (callFrameId === undefined) {
      throw new Error(`Unknown stopid ${stopId}`);
    }
    return callFrameId;
  }

  async getWasmLinearMemory(offset: number, length: number, stopId: bigint): Promise<ArrayBuffer> {
    const data = await this.evaluateOnCallFrameId<number[]>(
        false, result => result.value,
        `[].slice.call(new Uint8Array(memories[0].buffer, ${Number(offset)}, ${Number(length)}))`,
        this.getCallFrameId(stopId));
    return new Uint8Array(data).buffer;
  }
  private convertWasmValue(valueClass: 'local'|'global'|'operand', index: number):
      (obj: Protocol.Runtime.RemoteObject) => Chrome.DevTools.WasmValue {
    return (obj): Chrome.DevTools.WasmValue => {
      const type = obj?.description;
      const value: string = obj.preview?.properties?.find(o => o.name === 'value')?.value ?? '';
      switch (type) {
        case 'i32':
        case 'f32':
        case 'f64':
          return {type, value: Number(value)};
        case 'i64':
          return {type, value: BigInt(value)};
        case 'v128':
          return {type, value};
        default:
          return {type: 'reftype', valueClass, index};
      }
    }
  }
  getWasmLocal(local: number, stopId: bigint): Promise<WasmValue> {
    return this.evaluateOnCallFrameId<WasmValue>(
        true, this.convertWasmValue('local', local), `locals[${Number(local)}]`, this.getCallFrameId(stopId));
  }
  getWasmGlobal(global: number, stopId: bigint): Promise<WasmValue> {
    return this.evaluateOnCallFrameId<WasmValue>(
        true, this.convertWasmValue('global', global), `globals[${Number(global)}]`, this.getCallFrameId(stopId));
  }
  getWasmOp(op: number, stopId: bigint): Promise<WasmValue> {
    return this.evaluateOnCallFrameId<WasmValue>(
        true, this.convertWasmValue('operand', op), `operands[${Number(op)}]`, this.getCallFrameId(stopId));
  }
}

class WasmBackendPage {
  private readonly script: string;
  private readonly debug: Debugger;

  constructor(script: string, debug: Debugger) {
    this.script = script;
    this.debug = debug;
  }

  async open(timeout = 0): Promise<void> {
    await this.debug.navigate('about:blank');
    await this.debug.navigate(makeURL(`/build/tests/inputs/page.html?${this.script}`));
    await this.debug.waitForFunction('window.load && window.load()', timeout);
  }

  async go(timeout = 0): Promise<number> {
    await this.debug.waitForFunction('window.isReady && window.isReady()', timeout);
    return this.debug.evaluateFunction<number>('window.go()');
  }
}

async function slideLine(
    plugin: Chrome.DevTools.LanguageExtensionPlugin, rawModuleId: string, sourceUrl: string,
    lineNumber: number): Promise<number> {
  const lines = await plugin.getMappedLines(rawModuleId, sourceUrl) || [];
  for (const line of lines) {
    if (line > lineNumber) {
      return line;
    }
  }
  throw new Error('Line unmapped');
}
