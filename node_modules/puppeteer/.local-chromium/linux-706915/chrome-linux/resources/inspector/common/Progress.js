export default class Progress{setTotalWork(totalWork){}
setTitle(title){}
setWorked(worked,title){}
worked(worked){}
done(){}
isCanceled(){return false;}}
export class CompositeProgress{constructor(parent){this._parent=parent;this._children=[];this._childrenDone=0;this._parent.setTotalWork(1);this._parent.setWorked(0);}
_childDone(){if(++this._childrenDone!==this._children.length){return;}
this._parent.done();}
createSubProgress(weight){const child=new Common.SubProgress(this,weight);this._children.push(child);return child;}
_update(){let totalWeights=0;let done=0;for(let i=0;i<this._children.length;++i){const child=this._children[i];if(child._totalWork){done+=child._weight*child._worked/child._totalWork;}
totalWeights+=child._weight;}
this._parent.setWorked(done/totalWeights);}}
export class SubProgress{constructor(composite,weight){this._composite=composite;this._weight=weight||1;this._worked=0;}
isCanceled(){return this._composite._parent.isCanceled();}
setTitle(title){this._composite._parent.setTitle(title);}
done(){this.setWorked(this._totalWork);this._composite._childDone();}
setTotalWork(totalWork){this._totalWork=totalWork;this._composite._update();}
setWorked(worked,title){this._worked=worked;if(typeof title!=='undefined'){this.setTitle(title);}
this._composite._update();}
worked(worked){this.setWorked(this._worked+(worked||1));}}
export class ProgressProxy{constructor(delegate,doneCallback){this._delegate=delegate;this._doneCallback=doneCallback;}
isCanceled(){return this._delegate?this._delegate.isCanceled():false;}
setTitle(title){if(this._delegate){this._delegate.setTitle(title);}}
done(){if(this._delegate){this._delegate.done();}
if(this._doneCallback){this._doneCallback();}}
setTotalWork(totalWork){if(this._delegate){this._delegate.setTotalWork(totalWork);}}
setWorked(worked,title){if(this._delegate){this._delegate.setWorked(worked,title);}}
worked(worked){if(this._delegate){this._delegate.worked(worked);}}}
self.Common=self.Common||{};Common=Common||{};Common.Progress=Progress;Common.CompositeProgress=CompositeProgress;Common.SubProgress=SubProgress;Common.ProgressProxy=ProgressProxy;