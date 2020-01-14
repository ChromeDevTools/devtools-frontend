export default class ExtensionTraceProvider{constructor(extensionOrigin,id,categoryName,categoryTooltip){this._extensionOrigin=extensionOrigin;this._id=id;this._categoryName=categoryName;this._categoryTooltip=categoryTooltip;}
start(session){const sessionId=String(++_lastSessionId);Extensions.extensionServer.startTraceRecording(this._id,sessionId,session);}
stop(){Extensions.extensionServer.stopTraceRecording(this._id);}
shortDisplayName(){return this._categoryName;}
longDisplayName(){return this._categoryTooltip;}
persistentIdentifier(){return`${this._extensionOrigin}/${this._categoryName}`;}}
export let _lastSessionId=0;export class TracingSession{complete(url,timeOffsetMicroseconds){}}
self.Extensions=self.Extensions||{};Extensions=Extensions||{};Extensions.ExtensionTraceProvider=ExtensionTraceProvider;Extensions.ExtensionTraceProvider._lastSessionId=_lastSessionId;Extensions.TracingSession=TracingSession;