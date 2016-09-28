/**
 * @constructor
 * @param {string} extensionOrigin
 * @param {string} id
 * @param {string} categoryName
 * @param {string} categoryTooltip
 */
WebInspector.ExtensionTraceProvider = function(extensionOrigin, id, categoryName, categoryTooltip)
{
    this._extensionOrigin = extensionOrigin;
    this._id = id;
    this._categoryName = categoryName;
    this._categoryTooltip = categoryTooltip;
}

WebInspector.ExtensionTraceProvider.prototype = {
    start: function()
    {
        WebInspector.extensionServer.startTraceRecording(this._id);
    },

    stop: function()
    {
        WebInspector.extensionServer.stopTraceRecording(this._id);
    }
}
