/**
 * @unrestricted
 */
WebInspector.ExtensionTraceProvider = class {
  /**
   * @param {string} extensionOrigin
   * @param {string} id
   * @param {string} categoryName
   * @param {string} categoryTooltip
   */
  constructor(extensionOrigin, id, categoryName, categoryTooltip) {
    this._extensionOrigin = extensionOrigin;
    this._id = id;
    this._categoryName = categoryName;
    this._categoryTooltip = categoryTooltip;
  }
  start() {
    WebInspector.extensionServer.startTraceRecording(this._id);
  }

  stop() {
    WebInspector.extensionServer.stopTraceRecording(this._id);
  }
};
