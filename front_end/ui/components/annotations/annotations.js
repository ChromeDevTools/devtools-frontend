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
  #events = new Common.ObjectWrapper.ObjectWrapper();
  #annotations = [];
  #nextId = 0;
  static instance() {
    if (!_AnnotationRepository.#instance) {
      _AnnotationRepository.#instance = new _AnnotationRepository();
    }
    return _AnnotationRepository.#instance;
  }
  static annotationsEnabled() {
    return Boolean(Root.Runtime.hostConfig.devToolsGreenDevUi?.enabled);
  }
  addEventListener(eventType, listener, thisObject) {
    if (!_AnnotationRepository.annotationsEnabled()) {
      console.warn("Received request to add event listener with annotations disabled");
    }
    return this.#events.addEventListener(eventType, listener, thisObject);
  }
  getAnnotationsByType(type) {
    if (!_AnnotationRepository.annotationsEnabled()) {
      console.warn("Received query for annotation types with annotations disabled");
      return [];
    }
    const annotations = this.#annotations.filter((annotation) => annotation.type === type);
    return annotations;
  }
  addElementsAnnotation(label, lookupId, anchor, anchorToString) {
    if (!_AnnotationRepository.annotationsEnabled()) {
      console.warn("Received annotation registration with annotations disabled");
      return;
    }
    const annotationData = {
      id: this.#nextId++,
      type: AnnotationType.ELEMENT_NODE,
      message: label,
      lookupId: lookupId || "",
      anchor,
      anchorToString
    };
    this.#annotations.push(annotationData);
    console.log("[AnnotationRepository] Added annotation:", label, {
      annotationData,
      annotations: this.#annotations.length
    });
    this.#events.dispatchEventToListeners("AnnotationAdded", annotationData);
  }
};
export {
  AnnotationRepository,
  AnnotationType
};
//# sourceMappingURL=annotations.js.map
