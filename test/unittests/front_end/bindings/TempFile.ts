// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Common from '../../../../front_end/common/common.js';
import {default as TempFile, TempFileBackingStorage} from '../../../../front_end/bindings/TempFile.js';

describe('TempFile', () => {
  it('can be initialized successfully', () => {
    const tempFile = new TempFile();
    assert.equal(tempFile.size(), 0, 'size did not return zero');
  });

  it('returns zero as size when it does not contain any data', () => {
    const tempFile = new TempFile();
    assert.equal(tempFile.size(), 0, 'size did not return zero');
  });

  it('is able to return the size of the file correctly', () => {
    const tempFile = new TempFile();
    tempFile.write(['Test1', 'Test2', 'Test3']);
    assert.equal(tempFile.size(), 15, 'size was not returned correctly');
  });

  it('is able to have strings written into it when it does not have data', () => {
    const tempFile = new TempFile();
    tempFile.write(['Test1', 'Test2', 'Test3']);
    assert.equal(tempFile.size(), 15, 'strings were not written correctly');
  });

  it('is able to have strings written into it when it already has data', () => {
    const tempFile = new TempFile();
    tempFile.write(['Test1', 'Test2', 'Test3']);
    tempFile.write(['Test4', 'Test5']);
    assert.equal(tempFile.size(), 25, 'strings were not written correctly');
  });

  it('is able to read data in a certain range', async () => {
    const tempFile = new TempFile();
    tempFile.write(['Test1', 'Test2', 'Test3']);
    const readResult = await tempFile.readRange(0, 7);
    assert.equal(readResult, 'Test1Te', 'ranged reading was not done correctly');
  });

  it('returns the entire file if the limits for ranged reading are not numbers', async () => {
    const tempFile = new TempFile();
    tempFile.write(['Test1', 'Test2', 'Test3']);
    const readResult = await tempFile.readRange('start', 'end');
    assert.equal(readResult, 'Test1Test2Test3', 'ranged reading did not return the whole file');
  });

  it('returns an empty string when trying to read in a certain range if there was no file', async () => {
    const tempFile = new TempFile();
    const readResult = await tempFile.readRange(0, 7);
    assert.equal(readResult, '', 'ranged reading did not return an empty string');
  });

  it('is able to read the entire document', async () => {
    const tempFile = new TempFile();
    tempFile.write(['Test1', 'Test2', 'Test3']);
    const readResult = await tempFile.read();
    assert.equal(readResult, 'Test1Test2Test3', 'reading did not return the entire file');
  });

  it('returns null when trying to copy an empty file to an output stream', async () => {
    const tempFile = new TempFile();
    const stringOutputStream = new Common.StringOutputStream.StringOutputStream();
    const readResult = await tempFile.copyToOutputStream(stringOutputStream);
    assert.isNull(readResult, 'function did not return null');
  });

  it('is able to remove the temporary file', async () => {
    const tempFile = new TempFile();
    tempFile.write(['Test1', 'Test2', 'Test3']);
    tempFile.remove();
    assert.equal(tempFile.size(), 0, 'size did not return zero');
    const readResult = await tempFile.read();
    assert.equal(readResult, '', 'reading did not return an empty string');
  });
});

describe('TempFileBackingStorage', () => {
  it('is able to append an accessible string', async () => {
    const tempFileBackingStorage = new TempFileBackingStorage();
    tempFileBackingStorage.appendString('Test');
    const accessStringFunc = tempFileBackingStorage.appendAccessibleString('TestAccessible');
    assert.equal(await accessStringFunc(), 'TestAccessible', 'string was not appended or accessed correctly');
  });
});
