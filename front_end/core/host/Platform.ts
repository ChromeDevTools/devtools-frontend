// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable @typescript-eslint/naming-convention */

import {InspectorFrontendHostInstance} from './InspectorFrontendHost.js';

let _platform: string;

export function platform(): string {
  if (!_platform) {
    _platform = InspectorFrontendHostInstance.platform();
  }
  return _platform;
}

let _isMac: boolean|undefined;

export function isMac(): boolean {
  if (typeof _isMac === 'undefined') {
    _isMac = platform() === 'mac';
  }

  return _isMac;
}

let _isWin: boolean|undefined;

export function isWin(): boolean {
  if (typeof _isWin === 'undefined') {
    _isWin = platform() === 'windows';
  }

  return _isWin;
}

/**
 * In Chrome Layout tests the imported 'Platform' object is not writable/
 * configurable, which prevents us from monkey-patching 'Platform''s methods.
 * We circumvent this by adding 'setPlatformForTests'.
 **/
export function setPlatformForTests(platform: string): void {
  _platform = platform;
  _isMac = undefined;
  _isWin = undefined;
}

let _fontFamily: string;

export function fontFamily(): string {
  if (_fontFamily) {
    return _fontFamily;
  }
  switch (platform()) {
    case 'linux':
      _fontFamily = 'Roboto, Ubuntu, Arial, sans-serif';
      break;
    case 'mac':
      _fontFamily = '\'Lucida Grande\', sans-serif';
      break;
    case 'windows':
      _fontFamily = '\'Segoe UI\', Tahoma, sans-serif';
      break;
  }
  return _fontFamily;
}

export function setFontFamilyForTests(family: string): void {
  _fontFamily = family;
}

let _isRemoteDevtoolsFrontend: boolean|undefined;
let _locationForTest: string|undefined;

export function setLocationForTest(url: string|undefined): void {
  _locationForTest = url;
  _isRemoteDevtoolsFrontend = undefined;
  _isCustomDevtoolsFrontend = undefined;
}

export function isRemoteDevtoolsFrontend(): boolean {
  if (typeof _isRemoteDevtoolsFrontend === 'undefined') {
    const location = (globalThis as unknown as {location?: {toString(): string}}).location;
    const url = _locationForTest ?? (location ? location.toString() : '');
    _isRemoteDevtoolsFrontend = url.startsWith('devtools://devtools-remote/');
  }
  return _isRemoteDevtoolsFrontend ?? false;
}

let _isCustomDevtoolsFrontend: boolean|undefined;

export function isCustomDevtoolsFrontend(): boolean {
  if (typeof _isCustomDevtoolsFrontend === 'undefined') {
    const location = (globalThis as unknown as {location?: {toString(): string}}).location;
    const url = _locationForTest ?? (location ? location.toString() : '');
    _isCustomDevtoolsFrontend = url.startsWith('devtools://devtools/custom/');
  }
  return _isCustomDevtoolsFrontend ?? false;
}

export function setIsRemoteDevtoolsFrontendForTest(isRemote: boolean|undefined): void {
  _isRemoteDevtoolsFrontend = isRemote;
}

export function setIsCustomDevtoolsFrontendForTest(isCustom: boolean|undefined): void {
  _isCustomDevtoolsFrontend = isCustom;
}
