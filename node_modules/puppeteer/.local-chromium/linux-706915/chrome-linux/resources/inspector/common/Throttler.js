export default class Throttler{constructor(timeout){this._timeout=timeout;this._isRunningProcess=false;this._asSoonAsPossible=false;this._process=null;this._lastCompleteTime=0;this._schedulePromise=new Promise(fulfill=>{this._scheduleResolve=fulfill;});}
_processCompleted(){this._lastCompleteTime=this._getTime();this._isRunningProcess=false;if(this._process){this._innerSchedule(false);}
this._processCompletedForTests();}
_processCompletedForTests(){}
_onTimeout(){delete this._processTimeout;this._asSoonAsPossible=false;this._isRunningProcess=true;Promise.resolve().then(this._process).catch(console.error.bind(console)).then(this._processCompleted.bind(this)).then(this._scheduleResolve);this._schedulePromise=new Promise(fulfill=>{this._scheduleResolve=fulfill;});this._process=null;}
schedule(process,asSoonAsPossible){this._process=process;const hasScheduledTasks=!!this._processTimeout||this._isRunningProcess;const okToFire=this._getTime()-this._lastCompleteTime>this._timeout;asSoonAsPossible=!!asSoonAsPossible||(!hasScheduledTasks&&okToFire);const forceTimerUpdate=asSoonAsPossible&&!this._asSoonAsPossible;this._asSoonAsPossible=this._asSoonAsPossible||asSoonAsPossible;this._innerSchedule(forceTimerUpdate);return this._schedulePromise;}
_innerSchedule(forceTimerUpdate){if(this._isRunningProcess){return;}
if(this._processTimeout&&!forceTimerUpdate){return;}
if(this._processTimeout){this._clearTimeout(this._processTimeout);}
const timeout=this._asSoonAsPossible?0:this._timeout;this._processTimeout=this._setTimeout(this._onTimeout.bind(this),timeout);}
_clearTimeout(timeoutId){clearTimeout(timeoutId);}
_setTimeout(operation,timeout){return setTimeout(operation,timeout);}
_getTime(){return window.performance.now();}}
self.Common=self.Common||{};Common=Common||{};Common.Throttler=Throttler;Common.Throttler.FinishCallback;