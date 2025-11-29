// gen/front_end/ui/components/annotations/AnnotationRepository.js
import * as Common from "./../../../core/common/common.js";
import * as Root from "./../../../core/root/root.js";

// gen/front_end/ui/components/annotations/AnnotationType.js
var AnnotationType;
(function(AnnotationType2) {
  AnnotationType2[AnnotationType2["ELEMENT_NODE"] = 0] = "ELEMENT_NODE";
  AnnotationType2[AnnotationType2["STYLE_RULE"] = 1] = "STYLE_RULE";
  AnnotationType2[AnnotationType2["NETWORK_REQUEST"] = 2] = "NETWORK_REQUEST";
  AnnotationType2[AnnotationType2["NETWORK_REQUEST_SUBPANEL_HEADERS"] = 3] = "NETWORK_REQUEST_SUBPANEL_HEADERS";
})(AnnotationType || (AnnotationType = {}));

// gen/front_end/ui/components/annotations/AnnotationRepository.js
var AnnotationRepository = class _AnnotationRepository {
  static #instance = null;
  static #hasRepliedGreenDevDisabled = false;
  static #hasShownFlagWarning = false;
  #events = new Common.ObjectWrapper.ObjectWrapper();
  #annotationData = [];
  #nextId = 0;
  static instance() {
    if (!_AnnotationRepository.#instance) {
      _AnnotationRepository.#instance = new _AnnotationRepository();
    }
    return _AnnotationRepository.#instance;
  }
  static annotationsEnabled() {
    const enabled = Boolean(Root.Runtime.hostConfig.devToolsGreenDevUi?.enabled);
    if (!enabled) {
      this.#hasRepliedGreenDevDisabled = true;
    } else if (this.#hasRepliedGreenDevDisabled && !this.#hasShownFlagWarning) {
      console.warn("Flag controlling GreenDev has flipped from false to true. Only some callers will expect GreenDev to be enabled, which can lead to unexpected results.");
      this.#hasShownFlagWarning = true;
    }
    return Boolean(enabled);
  }
  addEventListener(eventType, listener, thisObject) {
    if (!_AnnotationRepository.annotationsEnabled()) {
      console.warn("Received request to add event listener with annotations disabled");
    }
    return this.#events.addEventListener(eventType, listener, thisObject);
  }
  getAnnotationDataByType(type) {
    if (!_AnnotationRepository.annotationsEnabled()) {
      console.warn("Received query for annotation types with annotations disabled");
      return [];
    }
    const annotations = this.#annotationData.filter((annotation) => annotation.type === type);
    return annotations;
  }
  getAnnotationDataById(id) {
    if (!_AnnotationRepository.annotationsEnabled()) {
      console.warn("Received query for annotation type with annotations disabled");
      return void 0;
    }
    return this.#annotationData.find((annotation) => annotation.id === id);
  }
  addElementsAnnotation(label, anchor, anchorToString) {
    if (!_AnnotationRepository.annotationsEnabled()) {
      console.warn("Received annotation registration with annotations disabled");
      return;
    }
    const annotationData = {
      id: this.#nextId++,
      type: AnnotationType.ELEMENT_NODE,
      message: label,
      lookupId: typeof anchor === "string" ? anchor : "",
      anchor: typeof anchor !== "string" ? anchor : void 0,
      anchorToString
    };
    this.#annotationData.push(annotationData);
    console.log("[AnnotationRepository] Added annotation:", label, {
      annotationData,
      annotations: this.#annotationData.length
    });
    this.#events.dispatchEventToListeners("AnnotationAdded", annotationData);
  }
};
export {
  AnnotationRepository,
  AnnotationType
};
//# sourceMappingURL=annotations.js.map
