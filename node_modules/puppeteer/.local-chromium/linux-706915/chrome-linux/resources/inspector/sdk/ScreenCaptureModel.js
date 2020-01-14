export default class ScreenCaptureModel extends SDK.SDKModel{constructor(target){super(target);this._agent=target.pageAgent();this._onScreencastFrame=null;this._onScreencastVisibilityChanged=null;target.registerPageDispatcher(this);}
startScreencast(format,quality,width,height,everyNthFrame,onFrame,onVisibilityChanged){this._onScreencastFrame=onFrame;this._onScreencastVisibilityChanged=onVisibilityChanged;this._agent.startScreencast(format,quality,width,height,everyNthFrame);}
stopScreencast(){this._onScreencastFrame=null;this._onScreencastVisibilityChanged=null;this._agent.stopScreencast();}
async captureScreenshot(format,quality,clip){await SDK.OverlayModel.muteHighlight();const result=await this._agent.captureScreenshot(format,quality,clip,true);await SDK.OverlayModel.unmuteHighlight();return result;}
async fetchLayoutMetrics(){const response=await this._agent.invoke_getLayoutMetrics({});if(response[Protocol.Error]){return null;}
return{viewportX:response.visualViewport.pageX,viewportY:response.visualViewport.pageY,viewportScale:response.visualViewport.scale,contentWidth:response.contentSize.width,contentHeight:response.contentSize.height};}
screencastFrame(data,metadata,sessionId){this._agent.screencastFrameAck(sessionId);if(this._onScreencastFrame){this._onScreencastFrame.call(null,data,metadata);}}
screencastVisibilityChanged(visible){if(this._onScreencastVisibilityChanged){this._onScreencastVisibilityChanged.call(null,visible);}}
domContentEventFired(time){}
loadEventFired(time){}
lifecycleEvent(frameId,loaderId,name,time){}
navigatedWithinDocument(frameId,url){}
frameAttached(frameId,parentFrameId){}
frameNavigated(frame){}
frameDetached(frameId){}
frameStartedLoading(frameId){}
frameStoppedLoading(frameId){}
frameRequestedNavigation(frameId){}
frameScheduledNavigation(frameId,delay){}
frameClearedScheduledNavigation(frameId){}
frameResized(){}
javascriptDialogOpening(url,message,dialogType,hasBrowserHandler,prompt){}
javascriptDialogClosed(result,userInput){}
interstitialShown(){}
interstitialHidden(){}
windowOpen(url,windowName,windowFeatures,userGesture){}
fileChooserOpened(mode){}
compilationCacheProduced(url,data){}
downloadWillBegin(frameId,url){}}
self.SDK=self.SDK||{};SDK=SDK||{};SDK.ScreenCaptureModel=ScreenCaptureModel;SDK.SDKModel.register(SDK.ScreenCaptureModel,SDK.Target.Capability.ScreenCapture,false);