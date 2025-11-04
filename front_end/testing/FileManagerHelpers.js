// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Workspace from '../models/workspace/workspace.js';
export function stubFileManager() {
    const fileManager = Workspace.FileManager.FileManager.instance();
    sinon.stub(fileManager, 'save').callsFake(async (file, _2, _3) => ({ fileSystemPath: file }));
    sinon.stub(fileManager, 'append').callsFake(file => {
        fileManager.dispatchEventToListeners("AppendedToURL" /* Workspace.FileManager.Events.APPENDED_TO_URL */, file);
    });
    sinon.stub(fileManager, 'close');
    return fileManager;
}
//# sourceMappingURL=FileManagerHelpers.js.map