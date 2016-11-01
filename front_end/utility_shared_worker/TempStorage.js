// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @implements {Service}
 * @unrestricted
 */
var TempStorage = class {
  /**
   * @override
   * @param {function(string)} notify
   */
  setNotify(notify) {
  }

  /**
   * @override
   */
  dispose() {
  }

  /**
   * @return {!Promise}
   */
  clear() {
    if (!TempStorage._clearPromise)
      TempStorage._clearPromise = new Promise(this._innerClear.bind(this));
    return TempStorage._clearPromise;
  }

  /**
   * @param {function()} resolve
   */
  _innerClear(resolve) {
    self.webkitRequestFileSystem(self.TEMPORARY, 10, didGetFS, didFail);

    /**
     * @param {!FileSystem} fs
     */
    function didGetFS(fs) {
      fs.root.createReader().readEntries(didReadEntries, didFail);
    }

    /**
     * @param {!Array.<!Entry>} entries
     */
    function didReadEntries(entries) {
      var remainingEntries = entries.length;
      if (!remainingEntries) {
        resolve();
        return;
      }

      function didDeleteEntry() {
        if (!--remainingEntries)
          resolve();
      }

      function failedToDeleteEntry(e) {
        var tempStorageError = 'Failed to delete entry: ' + e.message + ' ' + e.name;
        console.error(tempStorageError);
        didDeleteEntry();
      }

      for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        if (entry.isFile)
          entry.remove(didDeleteEntry, failedToDeleteEntry);
        else
          entry.removeRecursively(didDeleteEntry, failedToDeleteEntry);
      }
    }

    function didFail(e) {
      var tempStorageError = 'Failed to clear temp storage: ' + e.message + ' ' + e.name;
      console.error(tempStorageError);
      resolve();
    }
  }
};
