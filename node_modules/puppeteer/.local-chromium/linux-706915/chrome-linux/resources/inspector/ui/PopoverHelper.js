export default class PopoverHelper{constructor(container,getRequest){this._disableOnClick=false;this._hasPadding=false;this._getRequest=getRequest;this._scheduledRequest=null;this._hidePopoverCallback=null;this._container=container;this._showTimeout=0;this._hideTimeout=0;this._hidePopoverTimer=null;this._showPopoverTimer=null;this._boundMouseDown=this._mouseDown.bind(this);this._boundMouseMove=this._mouseMove.bind(this);this._boundMouseOut=this._mouseOut.bind(this);this._container.addEventListener('mousedown',this._boundMouseDown,false);this._container.addEventListener('mousemove',this._boundMouseMove,false);this._container.addEventListener('mouseout',this._boundMouseOut,false);this.setTimeout(1000);}
setTimeout(showTimeout,hideTimeout){this._showTimeout=showTimeout;this._hideTimeout=typeof hideTimeout==='number'?hideTimeout:showTimeout/2;}
setHasPadding(hasPadding){this._hasPadding=hasPadding;}
setDisableOnClick(disableOnClick){this._disableOnClick=disableOnClick;}
_eventInScheduledContent(event){return this._scheduledRequest?this._scheduledRequest.box.contains(event.clientX,event.clientY):false;}
_mouseDown(event){if(this._disableOnClick){this.hidePopover();return;}
if(this._eventInScheduledContent(event)){return;}
this._startHidePopoverTimer(0);this._stopShowPopoverTimer();this._startShowPopoverTimer((event),0);}
_mouseMove(event){if(this._eventInScheduledContent(event)){return;}
this._startHidePopoverTimer(this._hideTimeout);this._stopShowPopoverTimer();if(event.which&&this._disableOnClick){return;}
this._startShowPopoverTimer((event),this.isPopoverVisible()?this._showTimeout*0.6:this._showTimeout);}
_popoverMouseMove(event){this._stopHidePopoverTimer();}
_popoverMouseOut(popover,event){if(!popover.isShowing()){return;}
if(event.relatedTarget&&!event.relatedTarget.isSelfOrDescendant(popover.contentElement)){this._startHidePopoverTimer(this._hideTimeout);}}
_mouseOut(event){if(!this.isPopoverVisible()){return;}
if(!this._eventInScheduledContent(event)){this._startHidePopoverTimer(this._hideTimeout);}}
_startHidePopoverTimer(timeout){if(!this._hidePopoverCallback||this._hidePopoverTimer){return;}
this._hidePopoverTimer=setTimeout(()=>{this._hidePopover();this._hidePopoverTimer=null;},timeout);}
_startShowPopoverTimer(event,timeout){this._scheduledRequest=this._getRequest.call(null,event);if(!this._scheduledRequest){return;}
this._showPopoverTimer=setTimeout(()=>{this._showPopoverTimer=null;this._stopHidePopoverTimer();this._hidePopover();this._showPopover(event.target.ownerDocument);},timeout);}
_stopShowPopoverTimer(){if(!this._showPopoverTimer){return;}
clearTimeout(this._showPopoverTimer);this._showPopoverTimer=null;}
isPopoverVisible(){return!!this._hidePopoverCallback;}
hidePopover(){this._stopShowPopoverTimer();this._hidePopover();}
_hidePopover(){if(!this._hidePopoverCallback){return;}
this._hidePopoverCallback.call(null);this._hidePopoverCallback=null;}
_showPopover(document){const popover=new UI.GlassPane();popover.registerRequiredCSS('ui/popover.css');popover.setSizeBehavior(UI.GlassPane.SizeBehavior.MeasureContent);popover.setMarginBehavior(UI.GlassPane.MarginBehavior.Arrow);const request=this._scheduledRequest;request.show.call(null,popover).then(success=>{if(!success){return;}
if(this._scheduledRequest!==request){if(request.hide){request.hide.call(null);}
return;}
if(PopoverHelper._popoverHelper){console.error('One popover is already visible');PopoverHelper._popoverHelper.hidePopover();}
PopoverHelper._popoverHelper=this;popover.contentElement.classList.toggle('has-padding',this._hasPadding);popover.contentElement.addEventListener('mousemove',this._popoverMouseMove.bind(this),true);popover.contentElement.addEventListener('mouseout',this._popoverMouseOut.bind(this,popover),true);popover.setContentAnchorBox(request.box);popover.show(document);this._hidePopoverCallback=()=>{if(request.hide){request.hide.call(null);}
popover.hide();delete PopoverHelper._popoverHelper;};});}
_stopHidePopoverTimer(){if(!this._hidePopoverTimer){return;}
clearTimeout(this._hidePopoverTimer);this._hidePopoverTimer=null;this._stopShowPopoverTimer();}
dispose(){this._container.removeEventListener('mousedown',this._boundMouseDown,false);this._container.removeEventListener('mousemove',this._boundMouseMove,false);this._container.removeEventListener('mouseout',this._boundMouseOut,false);}}
UI.PopoverRequest;self.UI=self.UI||{};UI=UI||{};UI.PopoverHelper=PopoverHelper;