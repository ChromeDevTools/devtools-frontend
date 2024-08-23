// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Workspace from '../models/workspace/workspace.js';

type StubbedFileManager = Workspace.FileManager.FileManager&{
  save: sinon.SinonStub,
  append: sinon.SinonStub,
  close: sinon.SinonStub,
};

export function stubFileManager(): StubbedFileManager {
  const fileManager = Workspace.FileManager.FileManager.instance() as StubbedFileManager;
  sinon.stub(fileManager, 'save').callsFake(async (file, _2, _3) => ({fileSystemPath: file}));
  sinon.stub(fileManager, 'append').callsFake(file => {
    fileManager.dispatchEventToListeners(Workspace.FileManager.Events.APPENDED_TO_URL, file);
  });
  sinon.stub(fileManager, 'close');

  return fileManager;
}
