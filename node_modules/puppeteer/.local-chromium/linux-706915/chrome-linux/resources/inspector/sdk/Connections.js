export class MainConnection{constructor(){this._onMessage=null;this._onDisconnect=null;this._messageBuffer='';this._messageSize=0;this._eventListeners=[Host.InspectorFrontendHost.events.addEventListener(Host.InspectorFrontendHostAPI.Events.DispatchMessage,this._dispatchMessage,this),Host.InspectorFrontendHost.events.addEventListener(Host.InspectorFrontendHostAPI.Events.DispatchMessageChunk,this._dispatchMessageChunk,this),];}
setOnMessage(onMessage){this._onMessage=onMessage;}
setOnDisconnect(onDisconnect){this._onDisconnect=onDisconnect;}
sendRawMessage(message){if(this._onMessage){Host.InspectorFrontendHost.sendMessageToBackend(message);}}
_dispatchMessage(event){if(this._onMessage){this._onMessage.call(null,(event.data));}}
_dispatchMessageChunk(event){const messageChunk=(event.data['messageChunk']);const messageSize=(event.data['messageSize']);if(messageSize){this._messageBuffer='';this._messageSize=messageSize;}
this._messageBuffer+=messageChunk;if(this._messageBuffer.length===this._messageSize){this._onMessage.call(null,this._messageBuffer);this._messageBuffer='';this._messageSize=0;}}
disconnect(){const onDisconnect=this._onDisconnect;Common.EventTarget.removeEventListeners(this._eventListeners);this._onDisconnect=null;this._onMessage=null;if(onDisconnect){onDisconnect.call(null,'force disconnect');}
return Promise.resolve();}}
export class WebSocketConnection{constructor(url,onWebSocketDisconnect){this._socket=new WebSocket(url);this._socket.onerror=this._onError.bind(this);this._socket.onopen=this._onOpen.bind(this);this._socket.onmessage=messageEvent=>{if(this._onMessage){this._onMessage.call(null,(messageEvent.data));}};this._socket.onclose=this._onClose.bind(this);this._onMessage=null;this._onDisconnect=null;this._onWebSocketDisconnect=onWebSocketDisconnect;this._connected=false;this._messages=[];}
setOnMessage(onMessage){this._onMessage=onMessage;}
setOnDisconnect(onDisconnect){this._onDisconnect=onDisconnect;}
_onError(){this._onWebSocketDisconnect.call(null);this._onDisconnect.call(null,'connection failed');this._close();}
_onOpen(){this._socket.onerror=console.error;this._connected=true;for(const message of this._messages){this._socket.send(message);}
this._messages=[];}
_onClose(){this._onWebSocketDisconnect.call(null);this._onDisconnect.call(null,'websocket closed');this._close();}
_close(callback){this._socket.onerror=null;this._socket.onopen=null;this._socket.onclose=callback||null;this._socket.onmessage=null;this._socket.close();this._socket=null;this._onWebSocketDisconnect=null;}
sendRawMessage(message){if(this._connected){this._socket.send(message);}else{this._messages.push(message);}}
disconnect(){let fulfill;const promise=new Promise(f=>fulfill=f);this._close(()=>{if(this._onDisconnect){this._onDisconnect.call(null,'force disconnect');}
fulfill();});return promise;}}
export class StubConnection{constructor(){this._onMessage=null;this._onDisconnect=null;}
setOnMessage(onMessage){this._onMessage=onMessage;}
setOnDisconnect(onDisconnect){this._onDisconnect=onDisconnect;}
sendRawMessage(message){setTimeout(this._respondWithError.bind(this,message),0);}
_respondWithError(message){const messageObject=JSON.parse(message);const error={message:'This is a stub connection, can\'t dispatch message.',code:Protocol.DevToolsStubErrorCode,data:messageObject};if(this._onMessage){this._onMessage.call(null,{id:messageObject.id,error:error});}}
disconnect(){if(this._onDisconnect){this._onDisconnect.call(null,'force disconnect');}
this._onDisconnect=null;this._onMessage=null;return Promise.resolve();}}
export class ParallelConnection{constructor(connection,sessionId){this._connection=connection;this._sessionId=sessionId;this._onMessage=null;this._onDisconnect=null;}
setOnMessage(onMessage){this._onMessage=onMessage;}
setOnDisconnect(onDisconnect){this._onDisconnect=onDisconnect;}
sendRawMessage(message){const messageObject=JSON.parse(message);if(!messageObject.sessionId){messageObject.sessionId=this._sessionId;}
this._connection.sendRawMessage(JSON.stringify(messageObject));}
disconnect(){if(this._onDisconnect){this._onDisconnect.call(null,'force disconnect');}
this._onDisconnect=null;this._onMessage=null;return Promise.resolve();}}
export async function initMainConnection(createMainTarget,websocketConnectionLost){Protocol.Connection.setFactory(_createMainConnection.bind(null,websocketConnectionLost));await createMainTarget();Host.InspectorFrontendHost.connectionReady();Host.InspectorFrontendHost.events.addEventListener(Host.InspectorFrontendHostAPI.Events.ReattachMainTarget,()=>{SDK.targetManager.mainTarget().router().connection().disconnect();createMainTarget();});return Promise.resolve();}
export function _createMainConnection(websocketConnectionLost){const wsParam=Root.Runtime.queryParam('ws');const wssParam=Root.Runtime.queryParam('wss');if(wsParam||wssParam){const ws=wsParam?`ws://${wsParam}`:`wss://${wssParam}`;return new WebSocketConnection(ws,websocketConnectionLost);}else if(Host.InspectorFrontendHost.isHostedMode()){return new StubConnection();}
return new MainConnection();}
self.SDK=self.SDK||{};SDK=SDK||{};SDK.MainConnection=MainConnection;SDK.WebSocketConnection=WebSocketConnection;SDK.StubConnection=StubConnection;SDK.ParallelConnection=ParallelConnection;SDK.initMainConnection=initMainConnection;SDK._createMainConnection=_createMainConnection;