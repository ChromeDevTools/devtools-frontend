export default class WorkerWrapper{constructor(appName){let url=appName+'.js';url+=Root.Runtime.queryParamsString();this._workerPromise=new Promise(fulfill=>{this._worker=new Worker(url);this._worker.onmessage=onMessage.bind(this);function onMessage(event){console.assert(event.data==='workerReady');this._worker.onmessage=null;fulfill(this._worker);this._worker=null;}});}
postMessage(message){this._workerPromise.then(worker=>{if(!this._disposed){worker.postMessage(message);}});}
dispose(){this._disposed=true;this._workerPromise.then(worker=>worker.terminate());}
terminate(){this.dispose();}
set onmessage(listener){this._workerPromise.then(worker=>worker.onmessage=listener);}
set onerror(listener){this._workerPromise.then(worker=>worker.onerror=listener);}}
self.Common=self.Common||{};Common=Common||{};Common.Worker=WorkerWrapper;