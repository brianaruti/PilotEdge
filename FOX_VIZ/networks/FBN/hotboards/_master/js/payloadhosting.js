"use strict";
/*
Copyright (c) 2018 Vizrt

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

(MIT License)

The payloadhosting.js serves as a reference implementation of how a custom HTML
forms communicate with VDF payload editor hosts. This code can either be
used as-is or be adapted to fulfill specific needs.
*/
/**
 * @file This module enables observing and editing the payload of a VDF payload editor host.
 * See {@link vizrt} for further documentation.
 */
/**
 * The namespace for the <code>{@link vizrt.payloadhosting}</code> object.
 * The <code>payloadhosting</code> object is of type <code>{@link vizrt.PayloadHosting}</code>.
 * This class contains the means to observe and modify the payload held by the host of the
 * HTML document using this script file.
 * To get started call <code>vizrt.payloadhosting.[initialize]{@link vizrt.PayloadHosting#initialize}()</code>.
 * If you pass a parameterless function to <code>initialize</code> this function will be called when
 * <code>vizrt.payloadhosting</code> has received the payload from the host and is ready for further interaction.
 * By default the payloadhosting will bind HTML document elements to fields in the by matching HTML element IDs with
 * names of fields in the payload.
 * If you don't want this automatic binding call
 * <code>vizrt.payloadhosting.[setUsesAutomaticBindings]{@link vizrt.PayloadHosting#setUsesAutomaticBindings}(false)</code>
 * before calling <code>vizrt.payloadhosting.initialize</code>.
 * @see [initialize]{@link vizrt.PayloadHosting#initialize} for further information about initialization.
 * @see [setUsesAutomaticBindings]{@link vizrt.PayloadHosting#setUsesAutomaticBindings} for further information about automatic binding.
 *
 * @namespace vizrt
 */
var vizrt;
(function (vizrt) {
    var vizNs = "http://www.vizrt.com/types";
    var atomNs = "http://www.w3.org/2005/Atom";
    var bgfxNs = "http://www.vizrt.com/2011/bgfx";
    var mrssNs = "http://search.yahoo.com/mrss/";
    var vizmediaNs = "http://www.vizrt.com/opensearch/mediatype";
    var safeTypes = "|image/jpeg|image/png|image/gif|image/bmp|image/svg+xml|";
    function createEvent(type) {
        var event = document.createEvent("Event");
        event.initEvent(type, false, false);
        return event;
    }
    function getQueryParameter(name) {
        var query = window.location.search.substring(1);
        var params = query.split("&");
        var i;
        for (i = 0; i < params.length; ++i) {
            var kv = params[i].split("=");
            if (decodeURIComponent(kv[0]) === name) {
                return decodeURIComponent(kv[1]);
            }
        }
        return "*";
        //return null;
    }
    /**
     * Get the host origin specified by the "payload_host_origin" query
     * parameter.
     */
    function getHostOrigin() {
        return getQueryParameter("payload_host_origin");
    }
    /**
     * Get the guest identifier specified by the "guestid" query
     * parameter.
     */
    function getGuestIdentifier() {
        return getQueryParameter("guestid");
    }
    /**
     * Return the text contained in the text node children of a parent
     * element.
     */
    function text(parent) {
        var result = "";
        var children = parent.childNodes;
        var i;
        for (i = 0; i < children.length; ++i) {
            var node = children.item(i);
            if (node.nodeType !== Node.TEXT_NODE) {
                continue;
            }
            result += node.nodeValue;
        }
        return result;
    }
    function isLikelyToBeURL(str) {
        var lowerCased = str.toLowerCase();
        return startsWith(lowerCased, "http://") || startsWith(lowerCased, "https://");
    }
    function getSafeVizImageUrl(contentEl) {
        var value = text(contentEl);
        return value && isLikelyToBeURL(value) ? value : null;
    }
    function getTextFromFieldElement(fieldElement) {
        var valueElement = getFirstChildElement(fieldElement, vizNs, "value");
        return valueElement != null ? text(valueElement) : null;
    }
    function getXmlFromFieldElement(fieldElement) {
        var valueElement = getFirstChildElement(fieldElement, vizNs, "value");
        return valueElement != null ? getFirstChildElement(valueElement, null, null) : null;
    }
    function getAssetEntryContentElementFromFieldElement(fieldElement) {
        var valueElement = getFirstChildElement(fieldElement, vizNs, "value");
        var assetElement = getFirstChildElement(valueElement, atomNs, "entry");
        return getFirstChildElement(assetElement, atomNs, "content");
    }
    function getFieldValueXmlAsString(fieldElement) {
        var element = getXmlFromFieldElement(fieldElement);
        return !element ? null : (new XMLSerializer).serializeToString(element);
    }
    function getAttributeInt(el, name) {
        var attr = el.getAttribute(name);
        var num = attr != null ? parseInt(attr) : NaN;
        return isNaN(num) ? undefined : num;
    }
    function getAttributeFloat(el, name) {
        var attr = el.getAttribute(name);
        var num = attr != null ? parseFloat(attr) : NaN;
        return isNaN(num) ? undefined : num;
    }
    var SingleElementIterator = /** @class */ (function () {
        function SingleElementIterator(el) {
            this.el = el;
        }
        SingleElementIterator.prototype.next = function () {
            var result = this.el;
            this.el = null;
            return result;
        };
        return SingleElementIterator;
    }());
    function getFirstChildElement(parent, nsUri, name) {
        if (!parent)
            return null;
        var children = parent.childNodes;
        var c = children.length;
        for (var i = 0; i != c; ++i) {
            var node = children.item(i);
            if (node.nodeType !== Node.ELEMENT_NODE)
                continue;
            if (nsUri != null && nsUri !== node.namespaceURI)
                continue;
            if (name != null && name !== node.localName)
                continue;
            return node;
        }
        return null;
    }
    function getListDefElement(fieldDefElement, fieldPath) {
        var result = getFirstChildElement(fieldDefElement, vizNs, "listdef");
        if (!result)
            throw new Error("'" + fieldPath + "' is not a list.");
        return result;
    }
    var TypedElementIterator = /** @class */ (function () {
        function TypedElementIterator(parentsIterator, nsUri, name) {
            this.parentsIterator = parentsIterator;
            this.nsUri = nsUri;
            this.name = name;
            this.parent = null;
            this.index = 0;
        }
        TypedElementIterator.prototype.next = function () {
            while (true) {
                if (!this.parent || this.index == this.parent.childNodes.length) {
                    this.parent = this.parentsIterator.next();
                    if (!this.parent)
                        return null;
                    continue;
                }
                var node = this.parent.childNodes.item(this.index++);
                if (node.nodeType !== Node.ELEMENT_NODE)
                    continue;
                if (this.nsUri != null && this.nsUri !== node.namespaceURI)
                    continue;
                if (this.name != null && this.name !== node.localName)
                    continue;
                return node;
            }
        };
        return TypedElementIterator;
    }());
    function first(iterator, defaultResult) {
        if (defaultResult === void 0) { defaultResult = null; }
        var result = iterator.next();
        return result || defaultResult;
    }
    function findFieldElement(parentElement, fieldName, definition) {
        if (definition === void 0) { definition = false; }
        var iterator = new TypedElementIterator(new SingleElementIterator(parentElement), vizNs, definition ? "fielddef" : "field");
        var fieldEl;
        while ((fieldEl = iterator.next()) != null) {
            var curFieldName = fieldEl.getAttribute("name");
            if (fieldName === curFieldName)
                return fieldEl;
        }
        return null;
    }
    function findListItem(fieldElement, index) {
        var listEl = getFirstChildElement(fieldElement, vizNs, "list");
        if (!listEl || index < 0)
            return null;
        var iterator = new TypedElementIterator(new SingleElementIterator(listEl), vizNs, "payload");
        var payloadElement;
        while ((payloadElement = iterator.next()) != null) {
            if (index <= 0)
                return payloadElement;
            --index;
        }
        return null;
    }
    function setFieldValueContent(fieldElement, valueChildNode) {
        // fieldElement MUST be a field element within a payload document (meaning it has a document)
        var oldValueEl = getFirstChildElement(fieldElement, vizNs, "value");
        if (!oldValueEl && !valueChildNode)
            return;
        if (!valueChildNode) {
            if (oldValueEl)
                fieldElement.removeChild(oldValueEl);
        }
        else {
            var valueElement = fieldElement.ownerDocument.createElementNS(vizNs, "value");
            valueElement.appendChild(valueChildNode);
            if (!oldValueEl) {
                fieldElement.appendChild(valueElement);
            }
            else {
                fieldElement.replaceChild(valueElement, oldValueEl);
            }
        }
    }
    function setFieldValueAsText(fieldElement, text) {
        // fieldElement MUST be a field element within a payload document (meaning it has a document)
        if (text == null) {
            setFieldValueContent(fieldElement, null);
        }
        else {
            setFieldValueContent(fieldElement, fieldElement.ownerDocument.createTextNode(text));
        }
    }
    function setFieldValueAsParsedXml(fieldElement, xml) {
        // fieldElement MUST be a field element within a payload document (meaning it has a document)
        if (!xml) {
            setFieldValueContent(fieldElement, null);
        }
        else {
            var parser = new DOMParser();
            var doc = parser.parseFromString(xml, "text/xml");
            var el = getFirstChildElement(doc, null, null);
            var contentElement = el ? fieldElement.ownerDocument.importNode(el, true) : null;
            setFieldValueContent(fieldElement, contentElement);
        }
    }
    function setFieldAnnotation(fieldElement, annotationType, annotationValue) {
        // fieldElement MUST be a field element within a payload document (meaning it has a document)
        var oldAnnotationEl = getFirstChildElement(fieldElement, vizNs, "annotation");
        if (!oldAnnotationEl && !annotationValue)
            return false;
        if (annotationValue == null && oldAnnotationEl) {
            var oldValue = oldAnnotationEl.getAttribute(annotationType) || "";
            if (oldValue == null)
                return false;
            oldAnnotationEl.removeAttribute(annotationType);
            if (oldAnnotationEl.attributes.length == 0)
                fieldElement.removeChild(oldAnnotationEl);
            return true;
        }
        else if (!oldAnnotationEl) {
            var annotationEl = fieldElement.ownerDocument.createElementNS(vizNs, "annotation");
            annotationEl.setAttribute(annotationType, annotationValue || "");
            fieldElement.appendChild(annotationEl);
            return true;
        }
        else {
            var oldValue = oldAnnotationEl.getAttribute(annotationType) || "";
            if (oldValue === annotationValue)
                return false;
            oldAnnotationEl.setAttribute(annotationType, annotationValue || "");
            return true;
        }
    }
    function isNumerical(text) {
        for (var i = 0; i != text.length; ++i)
            if (text.charAt(i) < "0" || text.charAt(i) > "9")
                return false;
        return true;
    }
    function createRemoveListItemRangeError(count) {
        return new RangeError("Delete position out of range ("
            + (!count ? "cannot delete from an empty list" : "" + -count + " to " + (count - 1) + " expected") + ").");
    }
    function createAddListItemRangeError(count) {
        return new RangeError("Insert position out of range (" + (-count - 1) + " to " + count + " expected).");
    }
    function createListItem(listDefElement) {
        // listDefElement MUST be a field element within a payload or model document (meaning it has a document)
        var doc = listDefElement.ownerDocument;
        var payloadElement = doc.createElementNS(vizNs, "payload");
        var schemaElement = getFirstChildElement(listDefElement, vizNs, "schema");
        var iterator = new TypedElementIterator(new SingleElementIterator(schemaElement), vizNs, "fielddef");
        var fieldDefElement;
        while ((fieldDefElement = iterator.next()) != null) {
            var fieldElement = doc.createElementNS(vizNs, "field");
            var fieldElementName = fieldDefElement.getAttribute("name");
            if (fieldElementName) {
                fieldElement.setAttribute("name", fieldElementName);
            }
            else {
                fieldElement.removeAttribute("name");
            }
            var defaultContent = getFirstChildElement(fieldDefElement, vizNs, "value")
                || getFirstChildElement(fieldDefElement, vizNs, "list");
            if (defaultContent != null)
                fieldElement.appendChild(defaultContent.cloneNode(true));
            payloadElement.appendChild(fieldElement);
        }
        return payloadElement;
    }
    function getListMaxCount(listDefElement) {
        var maxCountEl = getFirstChildElement(listDefElement, vizNs, "maximumcount");
        if (!maxCountEl)
            return null;
        var maxCountText = text(maxCountEl);
        return parseInt(maxCountText);
    }
    function getListMinCount(listDefElement) {
        var minCountEl = getFirstChildElement(listDefElement, vizNs, "minimumcount");
        if (!minCountEl)
            return 0;
        var minCountText = text(minCountEl);
        return parseInt(minCountText);
    }
    function getFieldValueForCache(anyFieldValue) {
        return (anyFieldValue === undefined) ? undefined
            : (typeof anyFieldValue === 'string') ? anyFieldValue
                : anyFieldValue ? (new XMLSerializer).serializeToString(anyFieldValue)
                    : null;
    }
    function isInputElement(target) {
        if (!(target instanceof HTMLElement))
            return false;
        var element = target;
        return element.tagName == "INPUT" || element.isContentEditable || element.tagName == "TEXTAREA";
    }
    function isSafeMediaType(type) {
        var splitPos = type.indexOf(";");
        if (splitPos >= 0)
            type = type.substr(0, splitPos);
        return safeTypes.indexOf("|" + type.trim() + "|") >= 0;
    }
    function startsWith(text, prefix) {
        if (text.length < prefix.length)
            return false;
        var c = prefix.length;
        for (var i = 0; i != c; ++i) {
            if (text.charAt(i) != prefix.charAt(i))
                return false;
        }
        return true;
    }
    function isVideoType(type, forSure) {
        if (startsWith(type, "video/"))
            return true;
        if (forSure)
            return false;
        var splitPos = type.indexOf(";");
        if (splitPos >= 0)
            type = type.substr(0, splitPos);
        return type == "application/mxf" || type == "application/dash+xml";
    }
    function isAudioType(type, forSure) {
        if (startsWith(type, "audio/"))
            return true;
        if (forSure)
            return false;
        var splitPos = type.indexOf(";");
        if (splitPos >= 0)
            type = type.substr(0, splitPos);
        return type == "application/mxf" || type == "application/dash+xml";
    }
    function isAudioOrVideoType(type) {
        return isVideoType(type, true) || isAudioType(type, false);
    }
    function isImageType(type) {
        return startsWith(type, "image/");
    }
    var PayloadIFrameHost = /** @class */ (function () {
        function PayloadIFrameHost(focusChangeHandler) {
            var _this = this;
            this._listener = null;
            var self = this;
            this._focusChangeHandler = focusChangeHandler;
            if (focusChangeHandler != null) {
                this._windowFocusListener = function () { self._focusChangeHandler("focused"); };
                this._windowBlurListener = function () { self._focusChangeHandler("blurred"); };
                this._docFocusInListener = function (event) { if (event.target && isInputElement(event.target))
                    _this._focusChangeHandler("input-focused"); };
                this._docFocusOutListener = function (event) { if (event.target && isInputElement(event.target))
                    _this._focusChangeHandler("input-blurred"); };
            }
            else {
                this._windowFocusListener = this._windowBlurListener = this._docFocusInListener = this._docFocusOutListener = null;
            }
        }
        PayloadIFrameHost.prototype.postMessage = function (data, hostOrigin) {
            window.parent.postMessage(data, hostOrigin);
        };
        PayloadIFrameHost.prototype.setMessageEventListener = function (listener) {
            // We can safely cast listener to EventListener since PayloadHostingMessage only contains an optional member named data
            // which will be contained in the event parameter passed to the event listener if the event is of type MessageEvent.
            if (this._listener) {
                window.removeEventListener("message", this._listener, false);
                if (this._windowFocusListener)
                    window.removeEventListener("focus", this._windowFocusListener);
                if (this._windowBlurListener)
                    window.removeEventListener("blur", this._windowBlurListener);
                if (this._docFocusInListener)
                    document.body.removeEventListener("focusin", this._docFocusInListener);
                if (this._docFocusOutListener)
                    document.body.removeEventListener("focusout", this._docFocusOutListener);
                this._listener = null;
            }
            if (listener) {
                window.addEventListener("message", listener, false);
                if (this._windowFocusListener)
                    window.addEventListener("focus", this._windowFocusListener);
                if (this._windowBlurListener)
                    window.addEventListener("blur", this._windowBlurListener);
                if (this._docFocusInListener)
                    document.body.addEventListener("focusin", this._docFocusInListener);
                if (this._docFocusOutListener)
                    document.body.addEventListener("focusout", this._docFocusOutListener);
                this._listener = listener;
            }
        };
        PayloadIFrameHost.prototype.log = function (message) {
            window.console.log(message);
        };
        return PayloadIFrameHost;
    }());
    var ListenerRegistration = /** @class */ (function () {
        function ListenerRegistration(el, type, func) {
            this.el = el;
            this.type = type;
            this.func = func;
            el.addEventListener(type, func, false);
        }
        ListenerRegistration.prototype.release = function () {
            this.el.removeEventListener(this.type, this.func);
        };
        return ListenerRegistration;
    }());
    /**
     * Callback function used for events.
     * Used as argument for {@link vizrt.PayloadHosting#addEventListener} and {@link vizrt.PayloadHosting#removeEventListener}.
     * @callback vizrt~EventCallback
     * @param {Event} event The triggered event.
     */
    /**
     * Callback function for values in map object passed to {@link vizrt.PayloadHosting#setFieldValueCallbacks}.
     * @callback vizrt~FieldValueCallback
     * @param {string|Element|number|null} value The new value of the field for scalar fields or new item count for list fields.
     *                                    Will be:
     *                                    <ul><li><b><code>null</code></b> &ndash; if the field does not contain a value nor a list</li>
     *                                    <li><b>XML <code>Element</code></b> &ndash; if the value of the field contains an XML element</li>
     *                                    <li><b><code>string</code></b> &ndash; containing the value as unescaped text if the field constains a non-XML value</li>
     *                                    <li><b><code>number</code></b> &ndash; containing the number of items in the list if the field contains a list</li></ul>
     */
    /**
     * Callback function used by {@link vizrt.PayloadHosting#updatePayload}.
     * @callback vizrt~UpdatePayloadCallback
     * @returns <code>true</code> to force the payload host to be notified that the payload did change.
     *          <code>false</code> to notify the payload host only if some fields were actually updated using
     *          some of the field value setter functions (e.g. {@link vizrt.PayloadHosting#setFieldText}).
     */
    /**
     * Interface for specifying one field expected by the scene using a simplified JSON based scheme
     *
     * @interface vizrt.IFieldInfo
     * @property {string} name the name/ID of the field
     * @property {string} [type] the type of the field. Should be one of:
     * <ul><li><code>"single-line-text"</code> - a single line of trimmed plain text</li>
     * <li><code>"text"</code> - text possibly spanning multiple lines</li>
     * <li><code>"integer"</code> - integer number</li>
     * <li><code>"decimal"</code> - any number</li>
     * <li><code>"boolean"</code> - <code>true</code> or <code>false</code></li>
     * <li><code>"image"</code> - an image stored as an atom entry</li></ul>
     * If omitted "single-line-text" is assumed.
     * @property {string} [label] the label to be used for the field.
     */
    /**
    * Interface for specifying information about duration of a scene using a simplified JSON based scheme
    *
    * @interface vizrt.IDurationInfo
    * @property {number} [default] the default duration of the scene measured in seconds
    * @property {number} [minimum] the minimum duration of the scene measured in seconds
    * @property {number} [maximum] the maximum duration of the scene measured in seconds
    */
    /**
     * Interface for specifying the model expected by the scene using a simplified JSON based scheme
     *
     * @interface vizrt.IModelInfo
     * @property {vizrt.IDurationInfo} [duration] information about the duration of the scene
     * @property {vizrt.IFieldInfo[]} fields array containing information about the fields that the scene expects
     */
    /**
     * Interface holding information about a media found in an image/video/audio field value
     *
     * @interface vizrt.IMediaInfo
     * @property {boolean} isDefault true if the media entry is marked as the default media
     * @property {string} uri the URI where to locate the media
     * @property {string} type the MIME type of the media (e.g. <code>"image/jpeg"</code>)
     * @property {number} [duration] the duration of the media measured in seconds (only available for audio and video)
     * @property {number} [width] the width of the image measured in pixels (only available for image and video)
     * @property {number} [height] the height of the image measured in pixels (only available for image and video)
     * @property {number} [size] the file size of the the media measured in bytes
     */
    function createFieldDefElement(modelDoc, fieldInfo) {
        var fieldEl = modelDoc.createElementNS(vizNs, "fielddef");
        fieldEl.setAttribute("name", fieldInfo.name);
        if (fieldInfo.label)
            fieldEl.setAttribute("label", fieldInfo.label);
        var xsdType = null;
        var mediaType = null;
        var assignSame = function () { xsdType = fieldInfo.type; };
        var typeAssignements = {
            "single-line-text": function () { return xsdType = "normalizedString"; },
            "text": function () { return xsdType = "string"; },
            "boolean": assignSame,
            "decimal": assignSame,
            "integer": assignSame,
            "image": function () { return mediaType = "application/atom+xml;type=entry;media=image"; },
        };
        if (!fieldInfo.type) {
            xsdType = "normalizedString";
        }
        else if (Object.keys(typeAssignements).indexOf(fieldInfo.type) === -1) {
            // fieldInfo.type was set but it is not supported.
            throw new TypeError([
                "field with name <",
                fieldInfo.name,
                "> has no 'type' matching any of the following: ",
                Object.keys(typeAssignements).join(", "),
            ].join(""));
        }
        else {
            typeAssignements[fieldInfo.type]();
        }
        if (!mediaType && xsdType)
            mediaType = "text/plain";
        if (mediaType)
            fieldEl.setAttribute("mediatype", mediaType);
        if (xsdType)
            fieldEl.setAttribute("xsdtype", xsdType);
        return fieldEl;
    }
    function createModelXml(modelInfo) {
        var parser = new DOMParser();
        var modelDoc = parser.parseFromString("<model xmlns='http://www.vizrt.com/types'><schema/></model>", "text/xml");
        var modelEl = getFirstChildElement(modelDoc, vizNs, "model");
        var schemaEl = getFirstChildElement(modelEl, vizNs, "schema");
        // Add the fields
        for (var _i = 0, _a = modelInfo.fields; _i < _a.length; _i++) {
            var field = _a[_i];
            schemaEl.appendChild(createFieldDefElement(modelDoc, field));
        }
        // Possibly add duration information
        if (modelInfo.duration) {
            var durationEl = modelDoc.createElementNS(bgfxNs, "duration");
            if (modelInfo.duration.default != undefined)
                durationEl.setAttribute("default", modelInfo.duration.default.toString());
            if (modelInfo.duration.minimum != undefined)
                durationEl.setAttribute("min", modelInfo.duration.minimum.toString());
            if (modelInfo.duration.maximum != undefined)
                durationEl.setAttribute("max", modelInfo.duration.maximum.toString());
            modelEl.appendChild(durationEl);
        }
        return modelDoc;
    }
    /**
     * Simple class allowing logging of events
     */
    var EventDispatcher = /** @class */ (function () {
        function EventDispatcher() {
            this.eventListeners = {};
        }
        /**
         * Add an event listener to this event target
         * @param {string} type The type of event to listen to
         * @param {vizrt~EventCallback} callback The callback to be called when event is dispatched
         * @see vizrt.EventTarget#removeEventListener
         */
        EventDispatcher.prototype.addEventListener = function (type, callback) {
            if (!(type in this.eventListeners)) {
                this.eventListeners[type] = [];
            }
            this.eventListeners[type].push(callback);
        };
        /**
         * Remove an event listener registered on this event target
         * @param {string} type The type of event listened to
         * @param {vizrt~EventCallback} callback The registered callback
         * @see vizrt.EventTarget#addEventListener
         */
        EventDispatcher.prototype.removeEventListener = function (type, callback) {
            if (!(type in this.eventListeners))
                return;
            var array = this.eventListeners[type];
            var c = array.length;
            for (var i = 0; i < c; ++i) {
                if (array[i] === callback) {
                    array.splice(i, 1);
                    return;
                }
            }
        };
        /**
         * Dispatch an event to the event listeners registered for the type of that event
         * @param {Event} event The event to be dispatched
         */
        EventDispatcher.prototype.dispatchEvent = function (source, event) {
            if (!(event.type in this.eventListeners))
                return;
            var array = this.eventListeners[event.type];
            var c = array.length;
            for (var i = 0; i < c; ++i) {
                array[i].call(source, event);
            }
        };
        EventDispatcher.prototype.removeAllListeners = function () {
            this.eventListeners = {};
        };
        return EventDispatcher;
    }());
    /**
     * The object dealing with the communication with the payload host granting access to the
     * field values of the hosted payload.
     * @class vizrt.PayloadHosting
     */
    var PayloadHosting = /** @class */ (function () {
        function PayloadHosting() {
            this._eventTarget = new EventDispatcher();
            this._host = null;
            this._payloadDoc = null;
            this._isInUpdatePayload = false;
            this._isAboutToNotifyHost = false;
            this._isInFinishSetPayload = false;
            this._usesAutomaticBindings = true;
            this._blurListener = null;
            this._htmlElementWithPendingIncomingChange = null;
            this._listeners = [];
            this._unknownMessageHandler = null;
            this._controlledFocus = false;
            this._hostListener = null;
            this._fieldValueCallbacks = null;
            this._pendingSetTime = false;
            this._rendererLocks = [];
        }
        /**
         * Initializes the PayloadHosting object.
         * @param {function} readyCallback Function that will be called when payload is ready.
         *                                 During execution of the callback, <code>this</code> refers to this <code>PayloadHosting</code> object.
         * @function vizrt.PayloadHosting#initialize
         */
        PayloadHosting.prototype.initialize = function (readyCallback, host) {
            this._readyCallback = readyCallback;
            if (this._host) {
                // Don't initialize multiple times (temporary fix of VST-4763)
                return;
            }
            if (!host) {
                var self_1 = this;
                host = new PayloadIFrameHost(function (type) {
                    if (self_1._host) {
                        var focusedControlled = self_1._controlledFocus && type == "focused";
                        self_1._host.postMessage({
                            type: "focus_changed",
                            event: focusedControlled ? "focused-controlled" : type,
                            guestid: getGuestIdentifier()
                        }, getHostOrigin());
                    }
                });
            }
            this._host = host;
            var self = this;
            this._hostListener = function (message) { self._onMessageFromHost(message); };
            host.setMessageEventListener(this._hostListener);
            host.postMessage({ type: "payload_guest_loaded", guestid: getGuestIdentifier() }, getHostOrigin());
        };
        /**
         * Frees the resources allocated by <code>[initialize]{@link vizrt.PayloadHosting#initialize}</code>.
         * Removes bindings and listeners.
         * @function vizrt.PayloadHosting#uninitialize
         */
        PayloadHosting.prototype.uninitialize = function () {
            if (this._host == null)
                return;
            this._host.setMessageEventListener(null);
            this._hostListener = null;
            this._host = null;
            this._payloadDoc = null;
            this._modelUri = null;
            this._modelDoc = null;
            this._modelElement = null;
            this._fieldValueCallbacks = null;
            this._readyCallback = null;
            this._removePreviousListeners();
            this._eventTarget.removeAllListeners();
            this._modelInfoXml = undefined;
        };
        /**
         * Add an event listener to this object.
         * The following event types are supported:
         * <ul>
         *   <li>
         *     <b>payloadchange</b> - this event is triggered every time this object receives an updated payload from its host.
         *     If the event listener is added before the first payload is received from the host this event will be triggered after
         *     the <code>readyCallback</code> of <code>[initialize]{@link vizrt.PayloadHosting#initialize}</code> is called.
         *     If this event listener is registered in the <code>readyCallback</code> it will be called for the first time immediately
         *     after the <code>readyCallback</code>.
         *     If changing multiple fields during handling of this event there is no need for using
         *     <code>[updatePayload]{@link vizrt.PayloadHosting#updatePayload}</code> (to prevent multiple updates of the host)
         *     since the event is always called in the context of <code>updatePayload</code>.
         *   </li>
         * </ul>
         * @param {string} type The type of event to listen to. The only supported type is currently "payloadchange",
         * @param {vizrt~EventCallback} callback The callback to be called when event is dispatched.
         *                                       During execution of the callback, <code>this</code> refers to this <code>PayloadHosting</code> object.
         * @function vizrt.PayloadHosting#addEventListener
         * @see [removeEventListener]{@link vizrt.PayloadHosting#removeEventListener}
         * @see [setFieldValueCallbacks]{@link vizrt.PayloadHosting#setFieldValueCallbacks}
         */
        PayloadHosting.prototype.addEventListener = function (type, callback) {
            this._eventTarget.addEventListener(type, callback);
        };
        /**
         * Simply checks if this payloadhosting instance has any field value callbacks registered.
         */
        PayloadHosting.prototype.hasFieldValueCallbacks = function () {
            return this._fieldValueCallbacks !== null;
        };
        /**
         * Remove an event listener registered in this object.
         * @param {string} type The type of event listened to
         * @param {vizrt~EventCallback} callback The registered callback
         * @function vizrt.PayloadHosting#removeEventListener
         * @see [addEventListener]{@link vizrt.PayloadHosting#addEventListener}
         */
        PayloadHosting.prototype.removeEventListener = function (type, callback) {
            this._eventTarget.removeEventListener(type, callback);
        };
        PayloadHosting.prototype.getExistingRendererLock = function (target) {
            var i;
            for (i = 0; i < this._rendererLocks.length; i++) {
                if (this._rendererLocks[i].target === target) {
                    return this._rendererLocks[i];
                }
            }
            return null;
        };
        PayloadHosting.prototype.removeRendererLock = function (o) {
            var i;
            for (i = 0; i < this._rendererLocks.length; i++) {
                if (this._rendererLocks[i] === o) {
                    this._rendererLocks.splice(i, 1);
                    return;
                }
            }
        };
        /**
         * Seeks to the given time into the given video in a way
         * that will delay the propagation of the "present" message until
         * the seek operation is complete or an error occurred. This will
         * ensure that the rendering process will wait for this operation to
         * be complete before actually burning the frame.
         *
         * @param {HTMLVideoElement} video The video element to seek
         * @param {number} time The time position to seek to, given in seconds
         * @function vizrt.PayloadHosting#safeVideoSeek
         */
        PayloadHosting.prototype.safeVideoSeek = function (video, time) {
            var lock = this.getRendererLock(video);
            var listener = function () {
                lock.unlock();
                video.removeEventListener("seeked", listener);
                video.removeEventListener("error", listener);
            };
            video.addEventListener("seeked", listener);
            video.addEventListener("error", listener);
            video.currentTime = time;
        };
        /**
         * Loads the given url into the given image element in a way
         * that will delay the propagation of the "present" message until
         * the seek operation is complete or an error occurred. This will
         * ensure that the rendering process will wait for this operation to
         * be complete before actually burning the frame.
         *
         * @param {HTMLImageElement} image The image element
         * @param {string} url The url to load into the src attribute of the image element
         * @function vizrt.PayloadHosting#safeImageLoad
         */
        PayloadHosting.prototype.safeImageLoad = function (image, url) {
            var lock = this.getRendererLock(image);
            var listener = function () {
                lock.unlock();
                image.removeEventListener("load", listener);
                image.removeEventListener("error", listener);
            };
            image.addEventListener("load", listener);
            image.addEventListener("error", listener);
            image.src = url;
        };
        /**
         * Returns a lock that will prevent the pending processing of the "set_time" message,
         * if any, to reply with the "present" message to the host until the unlock() method is invoked.
         * This mechanism is meant to delay the rendering process of a frame until some asynchronous
         * operation is completed, like for instance loading and image.
         *
         * @param {any} o The object we want a renderer lock for
         * @return {RendererLock} An object whose unlock() method must be invoked to release the lock.
         * @function vizrt.PayloadHosting#getRendererLock
         */
        PayloadHosting.prototype.getRendererLock = function (o) {
            var l = this.getExistingRendererLock(o);
            if (l !== null) {
                // We don't want to put more than one lock per object
                return l;
            }
            var lock = {};
            lock.target = o;
            var pl_this = this;
            lock.unlock = function () {
                pl_this.removeRendererLock(lock);
                if (pl_this._rendererLocks.length == 0) {
                    if (pl_this._pendingSetTime) {
                        // If there is no more lock and if there is a pending set_time
                        // operation, it is time to send a "present" message to the host
                        // to give green light to the renderer
                        pl_this._pendingSetTime = false;
                        if (!pl_this._host)
                            throw Error("Host not defined");
                        pl_this._host.postMessage({ type: "present" }, getHostOrigin());
                    }
                }
            };
            this._rendererLocks.push(lock);
            return lock;
        };
        PayloadHosting.prototype._onMessageFromHost = function (message) {
            if (!this._host)
                throw Error("Host not defined");
            var messageType = message.data ? message.data.type : "<no message data>";
            if (messageType === "set_payload") {
                if (!message.data)
                    throw Error("No message data");
                this._setPayload(message.data.xml || "");
            }
            else if (messageType === "request_model_info" && this._modelInfoXml) {
                this._host.postMessage({ type: "provide_model_info", xml: this._modelInfoXml, guestid: getGuestIdentifier() }, getHostOrigin());
            }
            else {
                if (this._unknownMessageHandler && !this._unknownMessageHandler(message))
                    this._log("Got unknown message type from host: " + messageType);
                // Check if unknown-message handler has set model info, and in that case provide it to the host
                if (messageType === "request_model_info" && this._modelInfoXml) {
                    this._host.postMessage({ type: "provide_model_info", xml: this._modelInfoXml, guestid: getGuestIdentifier() }, getHostOrigin());
                }
                if (messageType === "set_time") {
                    if (this._rendererLocks.length != 0) {
                        // If the processing of the set_time message has resulted in the creation
                        // of renderer locks, we need to wait for them to be unlocked before
                        // we can sending the "present" message back to the host
                        this._pendingSetTime = true;
                    }
                    else {
                        this._host.postMessage({ type: "present" }, getHostOrigin());
                    }
                }
            }
        };
        PayloadHosting.prototype._log = function (message) {
            if (this._host)
                this._host.log(message);
        };
        PayloadHosting.prototype._lookupXmlElement = function (fieldPath, lookupPayload) {
            if (!this._payloadDoc)
                throw new Error("PayloadHosting not ready!");
            if (fieldPath == null || fieldPath.length == 0)
                return null;
            var el = getFirstChildElement(this._payloadDoc, vizNs, "payload");
            var isPayloadEl = true;
            var pathElements = fieldPath.split("/");
            for (var i = 0; i != pathElements.length && el != null; ++i) {
                var pathElm = pathElements[i];
                if (pathElm.length == 0)
                    return null;
                if (!isPayloadEl && pathElm.charAt(0) === "#" && isNumerical(pathElm.substring(1))) {
                    el = findListItem(el, parseInt(pathElm.substring(1)));
                    isPayloadEl = true;
                }
                else {
                    el = findFieldElement(el, pathElm);
                    isPayloadEl = false;
                }
            }
            return isPayloadEl === lookupPayload ? el : null;
        };
        PayloadHosting.prototype._lookupXmlElementStrict = function (fieldPath, lookupPayload) {
            var result = this._lookupXmlElement(fieldPath, lookupPayload);
            if (!result)
                throw new Error((lookupPayload ? "List item '" : "Field '") + fieldPath + "' does not exist.");
            return result;
        };
        /**
         * find an XML element representing either a field definition or a row-model.
         * To lookup a row-model the full index (e.g. '#3') can be used. This allows using the
         * field path (e.g. 'my-list/#2/my-column') to lookup the definition for 'my-column'.
        */
        PayloadHosting.prototype._lookupXmlDefElement = function (fieldPath, lookupListDef) {
            if (!this._modelElement)
                throw new Error("PayloadHosting does not have a model.");
            if (fieldPath == null || fieldPath.length == 0)
                return null;
            var el = this._modelElement;
            var isModelEl = true;
            var pathElements = fieldPath.split("/");
            for (var i = 0; i != pathElements.length && el != null; ++i) {
                var pathElm = pathElements[i];
                if (pathElm.length == 0)
                    return null;
                if (isModelEl)
                    el = getFirstChildElement(el, vizNs, "schema");
                if (!isModelEl && pathElm.charAt(0) === "#") {
                    el = getFirstChildElement(el, vizNs, "listdef");
                    isModelEl = true; // The list definition is a row-model (and has a schema node where the child fields are located)
                }
                else {
                    el = findFieldElement(el, pathElm, true);
                    isModelEl = false;
                }
            }
            return isModelEl === lookupListDef ? el : null;
        };
        PayloadHosting.prototype._lookupXmlDefElementStrict = function (fieldPath, lookupListDef) {
            var result = this._lookupXmlDefElement(fieldPath, lookupListDef);
            if (!result)
                throw new Error((lookupListDef ? "List definition for '" : "Field definition for '") + fieldPath + "' does not exist.");
            return result;
        };
        PayloadHosting.prototype._removePreviousListeners = function () {
            var c = this._listeners ? this._listeners.length : 0;
            for (var i = 0; i != c; ++i)
                this._listeners[i].release();
            this._listeners = [];
        };
        PayloadHosting.prototype._finishAutoSetFieldValue = function (htmlElement) {
            if (this._blurListener != null && this._htmlElementWithPendingIncomingChange == htmlElement) {
                htmlElement.removeEventListener("blur", this._blurListener);
                this._blurListener = null;
                this._htmlElementWithPendingIncomingChange = null;
            }
            this.notifyHostAboutPayloadChange();
        };
        PayloadHosting.prototype._createTextInputListener = function (fieldElement, htmlElement) {
            var self = this;
            return function (evt) {
                setFieldValueAsText(fieldElement, htmlElement["value"]);
                self._finishAutoSetFieldValue(htmlElement);
            };
        };
        PayloadHosting.prototype._createXmlInputListener = function (fieldElement, htmlElement) {
            var self = this;
            return function (evt) {
                setFieldValueAsParsedXml(fieldElement, htmlElement["value"]);
                self._finishAutoSetFieldValue(htmlElement);
            };
        };
        PayloadHosting.prototype._createBlurListenerForElementWithPendingIncomingNewValue = function (htmlElement, newValue) {
            var self = this;
            this._blurListener = function (event) {
                htmlElement["value"] = newValue;
                htmlElement.removeEventListener("blur", this._blurListener);
                this._blurListener = null;
                this._htmlElementWithPendingIncomingChange = null;
            };
            this._htmlElementWithPendingIncomingChange = htmlElement;
        };
        PayloadHosting.prototype._getFieldContent = function (fieldPath) {
            if (!this.isPayloadReady())
                return { cache: "null", value: null }; // to ensure that we get a change notification when payload becomes ready (even if value is null)
            var fieldElement = this._lookupXmlElement(fieldPath, false);
            if (!fieldElement)
                return { cache: "null", value: null };
            var valueElement = getFirstChildElement(fieldElement, vizNs, "value");
            if (valueElement) {
                var xmlElement = getFirstChildElement(valueElement, null, null);
                if (!xmlElement) {
                    var textValue = text(valueElement);
                    return { cache: "value:" + textValue, value: textValue };
                }
                else {
                    return { cache: "xml-value:" + (new XMLSerializer).serializeToString(xmlElement), value: xmlElement };
                }
            }
            var listElement = getFirstChildElement(fieldElement, vizNs, "list");
            if (!listElement)
                return { cache: "null", value: null };
            // We have a list, count the number of elements
            var iterator = new TypedElementIterator(new SingleElementIterator(listElement), vizNs, "payload");
            var count = 0;
            while (iterator.next() != null) {
                ++count;
            }
            return { cache: "xml-value:" + (new XMLSerializer).serializeToString(listElement), value: count };
        };
        PayloadHosting.prototype._initializeOnFields = function (fieldElementIterator, parentPath, parentId) {
            parentId = parentId ? parentId + "_" : "field_";
            var fieldElement;
            while ((fieldElement = fieldElementIterator.next()) != null) {
                var fieldName = fieldElement.getAttribute("name");
                var fieldPath = parentPath ? parentPath + "/" + fieldName : fieldName;
                var fieldId = parentId + fieldName;
                if (this._usesAutomaticBindings) {
                    var htmlElement = document.getElementById(fieldId);
                    if (htmlElement && typeof htmlElement["value"] !== "undefined") {
                        var dataType = htmlElement.getAttribute("data-type");
                        var text;
                        var listener;
                        if (dataType === "text/xml") {
                            text = getFieldValueXmlAsString(fieldElement) || "";
                            listener = this._createXmlInputListener(fieldElement, htmlElement);
                        }
                        else {
                            text = getTextFromFieldElement(fieldElement) || "";
                            listener = this._createTextInputListener(fieldElement, htmlElement);
                        }
                        if (htmlElement["value"] !== text) {
                            if (document["activeElement"] != htmlElement) {
                                htmlElement["value"] = text;
                            }
                            else {
                                this._createBlurListenerForElementWithPendingIncomingNewValue(htmlElement, text);
                            }
                        }
                        this._listeners.push(new ListenerRegistration(htmlElement, "input", listener));
                    }
                }
                this._initializeOnFields(new TypedElementIterator(new SingleElementIterator(fieldElement), vizNs, "field"), fieldPath || undefined, fieldId);
            }
        };
        PayloadHosting.prototype._initializeOnPayload = function () {
            this._removePreviousListeners();
            var payloadElement = getFirstChildElement(this._payloadDoc, vizNs, "payload");
            this._initializeOnFields(new TypedElementIterator(new SingleElementIterator(payloadElement), vizNs, "field"));
        };
        PayloadHosting.prototype._updateFieldValueCallbacks = function () {
            if (!this._fieldValueCallbacks)
                return;
            for (var fieldPath in this._fieldValueCallbacks) {
                var entry = this._fieldValueCallbacks[fieldPath];
                var newContent = this._getFieldContent(fieldPath);
                var oldCacheValue = entry.value;
                entry.value = newContent.cache;
                if (entry.value !== oldCacheValue) // undefined !== null, but undefined == null
                    entry.callback(newContent.value);
            }
        };
        PayloadHosting.prototype._setPayload = function (payloadXml) {
            var parser = new DOMParser();
            this._payloadDoc = parser.parseFromString(payloadXml, "text/xml");
            var payloadElement = getFirstChildElement(this._payloadDoc, vizNs, "payload");
            var inlineModelElement = getFirstChildElement(payloadElement, vizNs, "model");
            var modelUri = payloadElement ? payloadElement.getAttribute("model") : null;
            if (inlineModelElement != null || modelUri == null) {
                this._modelUri = null;
                this._modelDoc = null;
                this._modelElement = inlineModelElement;
            }
            else {
                if (modelUri !== this._modelUri) {
                    this._modelDoc = null;
                    this._modelElement = null;
                    this._modelUri = null;
                    var self = this;
                    var request = new XMLHttpRequest();
                    request.addEventListener("load", function (event) {
                        var modelDoc = this.responseXML;
                        self._modelElement = getFirstChildElement(modelDoc, vizNs, "model");
                        if (self._modelElement != null) {
                            self._modelDoc = modelDoc;
                            self._modelUri = modelUri;
                        }
                        self._finishSetPayload();
                    });
                    request.addEventListener("error", function (event) {
                        self._finishSetPayload();
                    });
                    request.addEventListener("abort", function (event) {
                        self._finishSetPayload();
                    });
                    request.open("GET", modelUri, true);
                    request.send();
                    return;
                }
            }
            this._finishSetPayload();
        };
        PayloadHosting.prototype._finishSetPayload = function () {
            var _this = this;
            this._isInFinishSetPayload = true;
            try {
                this.updatePayload(function () {
                    if (_this._usesAutomaticBindings)
                        _this._initializeOnPayload();
                    if (_this._fieldValueCallbacks)
                        _this._updateFieldValueCallbacks();
                    if (_this._readyCallback) {
                        _this._readyCallback();
                        _this._readyCallback = null;
                    }
                    _this._eventTarget.dispatchEvent(_this, createEvent("payloadchange"));
                    return false;
                });
            }
            finally {
                this._isInFinishSetPayload = false;
            }
        };
        /**
         * Sets whether this payload hosting automatically should connect fields in payload with input elements in current document.
         * It will connect an HTML input element with ID "field_x" to a payload field named "x" and an HTML input element with
         * ID "field_x_y" to a sub-field named "y" of a field named "x" in the payload.
         * To connect to XML fields instead of text fields use the prefix <i>xmlfield_</i> instead of <i>field_</i> in the HTML
         * input element IDs.
         * The default value of this property is 'true'. Setting this property to true causes immediate binding if payload is ready
         * and if payload is not yet ready causes binding when payload becomes ready.
         * Setting the property to false immediately removes bindings if payload is ready and if not cancels binding when payload
         * becomes ready.
         * @function vizrt.PayloadHosting#setUsesAutomaticBindings
         * @param {boolean} useAutomaticBindings whether to automatically fields in payload with HTML elements in the document.
         * @see [getUsesAutomaticBindings]{@link vizrt.PayloadHosting#getUsesAutomaticBindings}
         */
        PayloadHosting.prototype.setUsesAutomaticBindings = function (useAutomaticBindings) {
            useAutomaticBindings = !!useAutomaticBindings; // Ensure true/false
            if (useAutomaticBindings !== this._usesAutomaticBindings) {
                if (useAutomaticBindings)
                    this._initializeOnPayload();
                else
                    this._removePreviousListeners();
                this._usesAutomaticBindings = useAutomaticBindings;
            }
        };
        /**
         * Gets whether payload fields and HTML input elements are automatically connected.
         * @function vizrt.PayloadHosting#getUsesAutomaticBindings
         * @return {boolean} Whether automatic bindings are used.
         * @see [setUsesAutomaticBindings]{@link vizrt.PayloadHosting#setUsesAutomaticBindings}
         */
        PayloadHosting.prototype.getUsesAutomaticBindings = function () {
            return this._usesAutomaticBindings;
        };
        /**
         * <p>Sets callbacks to be called back when the values or lists of a given set of fields change.
         * A callback will be called if the value or list of the associated field changes both if the change is
         * caused by the host or if it is caused by a programmatic change to the field using the
         * payloadhosting API.</p>
         * <p><b>Note!</b> The order of the callbacks is relevant:
         * If the value or list of field <i>y</i> (that has a value-change callback) is changed during execution of the value change callback
         * of field <i>x</i>, the callback of field <i>y</i> will be triggered if and only if field <i>y</i> is after field <i>x</i> in the
         * value callback map. However, if the callback of <i>y</i> is before the callback of <i>x</i> in the map, it will
         * be called next time there is a change to the payload. Therefore, to get a predictable result, it is recommended that, if
         * the value-change callback of a field change the values or lists of other fields with registered value-change callbacks, the callbacks
         * of those other fields are put after the callback of the first field.</p>
         * <p>Also note that when the host changes the payload the field value callbacks are called before the <code>payloadchange</code>
         * event is triggered (see <code>[addEventListener]{@link vizrt.PayloadHosting#addEventListener}</code>).
         * Also, if the values or lists of some fields are changed during handling of the <code>payloadchange</code> event, the value-change
         * callbacks for those fields will not be called.</p>
         * <p> If changing multiple fields during handling of these callbacks there is no need for using
         * <code>[updatePayload]{@link vizrt.PayloadHosting#updatePayload}</code> (to prevent multiple updates of the host)
         * since <code>payloadhosting</code> always executes the callbacks in the context of <code>updatePayload</code>.
         * @function vizrt.PayloadHosting#setFieldValueCallbacks
         * @param {Object} callbacks Map from field paths to {@link vizrt~FieldValueCallback} functions
         *                           to be called whenever each of those fields change.
         *                           During execution of each of these callbacks, <code>this</code> refers to this <code>PayloadHosting</code> object.
         * @see [fieldExists]{@link vizrt.PayloadHosting#fieldExists} for further information about field paths.
         * @see [addEventListener]{@link vizrt.PayloadHosting#addEventListener}
         * @example
         * // In this example on01Changed will be called when the field named 01 changes and
         * // on02Changed will be called when the field named 02 changes.
         * function on01Changed() { ... }
         * function on02Changed() { ... }
         * vizrt.payloadhosting.setFieldValueCallbacks({ "01": on01Changed, "02": on02Changed });
         */
        PayloadHosting.prototype.setFieldValueCallbacks = function (callbacks) {
            if (!callbacks) {
                this._fieldValueCallbacks = null;
            }
            else {
                this._fieldValueCallbacks = {};
                this.addFieldValueCallbacks(callbacks);
            }
        };
        /**
         * @see [setFieldValueCallbacks]{@link vizrt.PayloadHosting#setFieldValueCallbacks} for documentation.
         *
         * @param callbacks
         */
        PayloadHosting.prototype.addFieldValueCallbacks = function (callbacks) {
            if (!callbacks)
                return;
            for (var fieldPath in callbacks) {
                if (typeof fieldPath !== 'string')
                    throw Error("Field path is not a string: " + {}.toString.call(fieldPath));
                if (typeof callbacks[fieldPath] !== 'function')
                    throw Error("Callback value for field '" + fieldPath + " is not a function, but '" + (typeof callbacks[fieldPath]) + "'.");
                this._fieldValueCallbacks[fieldPath] = { callback: callbacks[fieldPath], value: this._getFieldContent(fieldPath).cache };
            }
        };
        /**
         * Sets the handler to be called when this object receives messages that it does not understand.
         * Return true in this handler to indicate that the handler understood the message.
         * @function vizrt.PayloadHosting#setUnknownMessageHandler
         * @param {function} handler The new handler function, a function taking one parameter containing the message data from the host.
         */
        PayloadHosting.prototype.setUnknownMessageHandler = function (handler) {
            this._unknownMessageHandler = handler;
        };
        /**
         * Gets the handler to be called when this object receives messages that it does not understand.
         * @function vizrt.PayloadHosting#getUnknownMessageHandler
         * @return {function} The current handler used when unknown message are received from host.
         */
        PayloadHosting.prototype.getUnknownMessageHandler = function () {
            return this._unknownMessageHandler;
        };
        /**
         * Used to register a URL-based logout hook that will be called when the supporting application exits.
         * If supported, the label and icon will be used to designate the type of logout being performed by the application.
         * @function vizrt.PayloadHosting#registerLogoutHook
         * @param {string} providerId  Unique identifier for the the domain of the identity provider that has been used to
         *                             authorize access to external services. In most cases, only one active authorization is
         *                             allowed per domain, and this identifier will simply be the identity providers
         *                             host-domain. New requests with the same identifier will be treated with the assumption
         *                             that any previously registered log-out requests have already been serviced by the
         *                             frame, and prior requests will be overwritten.
         * @param {string} label       The label that will be used by the application to specify what logout action is being
         *                             performed (if this feature is supported by the application).
         * @param {string} iconUrl     The URL of the icon that will be used to show a small logo for the publishing agent
         *                             that will be logged out (if this feature is supported by the application). This can be
         *                             a relative URL with respect to the path of the calling frame.
         * @param {string} brokerJsUrl The URL used by the supporting application to log out of the publishing agent that was
         *                             previously logged in by a user action. This can be a relative URL with respect to the
         *                             path of the calling frame.
         * @param {string} logoutData  JSON object holding any additional fields needed by the logout javascript file to
         *                             perform logout operations.
         * @see [unregisterLogoutHook]{@link vizrt.PayloadHosting#unregisterLogoutHook},
         */
        PayloadHosting.prototype.registerLogoutHook = function (providerId, label, iconUrl, brokerJsUrl, logoutData) {
            if (!this._host)
                throw Error("Host is not defined");
            var brokerJsLink = document.createElement('a');
            brokerJsLink.href = brokerJsUrl;
            var iconLink = document.createElement('a');
            iconLink.href = iconUrl;
            this._host.postMessage({
                "type": "logged_in",
                "providerId": providerId,
                "label": label,
                "iconUri": iconLink.href,
                "brokerJsUri": brokerJsLink.href,
                "logoutData": JSON.stringify(logoutData),
                "guestid": getGuestIdentifier()
            }, getHostOrigin());
        };
        /**
         * Used to un-register a logout hook. This can be used if another method of logging out was performed by user action and
         * no longer needs to be repeated by the application. This must also be called in the logout code to let the application
         * know that the logout action has completed. This call does not require a valid guest ID when called from the logout
         * page. The message providerId will be used to uniquely identify the page instead.
         * @function vizrt.PayloadHosting#unregisterLogoutHook
         * @param {string} providerId Unique identifier for the the domain of the identity provider that has been previously logged in to.
         * @see [registerLogoutHook]{@link vizrt.PayloadHosting#registerLogoutHook},
         */
        PayloadHosting.prototype.unregisterLogoutHook = function (providerId) {
            if (!this._host)
                throw Error("Host is not defined");
            this._host.postMessage({ "type": "logged_out", "providerId": providerId, "guestid": getGuestIdentifier() }, getHostOrigin());
        };
        /**
         * Adds an item to the list of a list field.
         * @function vizrt.PayloadHosting#addListFieldItem
         * @param {string} fieldPath The path of the list field
         * @param {number?} position The position where to insert the item.
         *                           If omitted the new item will be added at the end of the list.
         *                           If 0 or positive, the zero-based position from the front of the list for the new item.
         *                           If negative, the absolute value is the one-based position from the back of the list for the new item
         *                           (-1 will add at the end, -2 will insert before the last item, etc.).
         * @return {string} The path of the new item. This path represents a payload, and to get the path of a field in that
         *                  payload, '/' followed by the field path within the list item payload must be added to the returned path.
         * @throws {Error} Throws an <code>Error</code> if:
         *                 <ul><li>not <code>[hasModel]{@link vizrt.PayloadHosting#hasModel}()</code></li>
         *                 <li>the field does not exist or is not a list field</li>
         *                 <li>the list of the list field is already full</li></ul>
         * @throws {RangeError} Throws a <code>RangeError</code> if <code>position</code> is out of range.
         * @see [fieldExists]{@link vizrt.PayloadHosting#fieldExists} for further information about field paths.
         * @see [isListField]{@link vizrt.PayloadHosting#isListField},
         * @see [removeListFieldItem]{@link vizrt.PayloadHosting#removeListFieldItem}
         * @example
         * // In this example an item will be appended to the list of the field named 'my-list',
         * // and the value of the field named 'first-name' in that appended item will be set to "Andreas".
         * // (The schema of the list definition of 'my-list' is assumed to contain a field definition
         * // for a field named 'first-name'.)
         * var insertPath = vizrt.payloadhosting.addListFieldItem("my-list");
         * vizrt.payloadhosting.setFieldText(insertPath + "/first-name", "Andreas")
         */
        PayloadHosting.prototype.addListFieldItem = function (fieldPath, position) {
            var fieldElement = this._lookupXmlElementStrict(fieldPath, false);
            var fieldDefElement = this._lookupXmlDefElementStrict(fieldPath, false);
            var listDefElement = getListDefElement(fieldDefElement, fieldPath);
            var maxCount = getListMaxCount(listDefElement);
            if (position === undefined) {
                position = -1;
            }
            var count = (position < 0 || maxCount != null) ? (this.getListFieldLength(fieldPath) || 0) : 0;
            if (position < -1) {
                position = count + 1 + position;
                if (position < 0)
                    throw createAddListItemRangeError(count);
            }
            if (maxCount != null && count >= maxCount)
                throw new Error("The list is already full.");
            var listEl = getFirstChildElement(fieldElement, vizNs, "list")
                || fieldElement.appendChild(fieldElement.ownerDocument.createElementNS(vizNs, "list"));
            var iterator = new TypedElementIterator(new SingleElementIterator(listEl), vizNs, "payload");
            var refElement = null;
            var refPosition = 0;
            if (position >= 0) {
                while ((refElement = iterator.next()) != null && refPosition < position) {
                    ++refPosition;
                }
                if (refElement == null && refPosition < position)
                    throw createAddListItemRangeError(refPosition);
            }
            listEl.insertBefore(createListItem(listDefElement), refElement);
            this.notifyHostAboutPayloadChange();
            return fieldPath + '/#' + (position < 0 ? count : refPosition);
        };
        /**
         * Gets whether a field with a given path exists.
         * The field path is built from the names of field and sub-fields separated with slashes.
         * To address a list element of a list field use &lt;list-field-path&gt;/#&lt;index&gt; where &lt;list-field-path&gt; is the path of the
         * list field and &lt;index&gt; is the zero-based index of the list field. See field path examples below.
         * @example <caption>field path of field named <b>my-field</b></caption>
         * "my-field"
         * @example <caption>field path of sub-field named <b>01</b> in a field named <b>container</b></caption>
         * "container/01"
         * @example <caption>field path of field named <b>age</b> in the second row of a list field named <b>table</b></caption>
         * "table/#1/age"
         * @function vizrt.PayloadHosting#fieldExists
         * @param {string} fieldPath The path of the field
         * @returns {boolean} <code>true</code> if the field exists, otherwise <code>false</code>.
         * @throws {Error} Throws an <code>Error</code> if not <code>[isPayloadReady]{@link vizrt.PayloadHosting#isPayloadReady}()</code>.
         */
        PayloadHosting.prototype.fieldExists = function (fieldPath) {
            return this._lookupXmlElement(fieldPath, false) != null;
        };
        /**
         * Determines the media type for a scalar field.
         * @function vizrt.PayloadHosting#getFieldMediaType
         * @param {string} fieldPath The path of the field
         * @returns {string} <code>null</code> if no field definition found for the field or if the field is not a scalar field,
         *                   otherwise the media type for the field.
         * @throws {Error} Throws an <code>Error</code> if not <code>[hasModel]{@link vizrt.PayloadHosting#hasModel}()</code>.
         * @see [fieldExists]{@link vizrt.PayloadHosting#fieldExists} for further information about field paths.
         * @see [isScalarField]{@link vizrt.PayloadHosting#isScalarField}
         */
        PayloadHosting.prototype.getFieldMediaType = function (fieldPath) {
            var fieldDefElement = this._lookupXmlDefElement(fieldPath, false);
            return fieldDefElement ? fieldDefElement.getAttribute("mediatype") : null;
        };
        /**
         * Gets the text of a scalar field with a given path
         * @function vizrt.PayloadHosting#getFieldText
         * @param {string} fieldPath The path of the field
         * @returns {string} The text value of the field.
         * @throws {Error} Throws an <code>Error</code> if not <code>[isPayloadReady]{@link vizrt.PayloadHosting#isPayloadReady}()</code>.
         * @see [fieldExists]{@link vizrt.PayloadHosting#fieldExists} for further information about field paths.
         * @see [setFieldText]{@link vizrt.PayloadHosting#setFieldText}
         */
        PayloadHosting.prototype.getFieldText = function (fieldPath) {
            var fieldElement = this._lookupXmlElement(fieldPath, false);
            return fieldElement ? getTextFromFieldElement(fieldElement) : null;
        };
        /**
         * Gets the XML value of a scalar field.
         * @function vizrt.PayloadHosting#getFieldXml
         * @param {string} fieldPath The path of the field
         * @returns {Element} The XML element stored as the value of the field or
         *                    <code>null</code> if the field does not exist or if the field value contains no XML element.
         * @throws {Error} Throws an <code>Error</code> if not <code>[isPayloadReady]{@link vizrt.PayloadHosting#isPayloadReady}()</code>.
         * @see [fieldExists]{@link vizrt.PayloadHosting#fieldExists} for further information about field paths.
         * @see [setFieldXml]{@link vizrt.PayloadHosting#setFieldXml}
         * @see [getFieldXmlAsString]{@link vizrt.PayloadHosting#getFieldXmlAsString}
         */
        PayloadHosting.prototype.getFieldXml = function (fieldPath) {
            var fieldElement = this._lookupXmlElement(fieldPath, false);
            return fieldElement ? getXmlFromFieldElement(fieldElement) : null;
        };
        /**
         * Gets the XML value of a scalar field serialized to a string.
         * @function vizrt.PayloadHosting#getFieldXmlAsString
         * @param {string} fieldPath The path of the field
         * @returns {string} The XML serialized to string or <code>null</code> if the field does not exist or the field value contains no XML element.
         * @throws {Error} Throws an <code>Error</code> if not <code>[isPayloadReady]{@link vizrt.PayloadHosting#isPayloadReady}()</code>.
         * @see [fieldExists]{@link vizrt.PayloadHosting#fieldExists} for further information about field paths.
         * @see [setFieldXml]{@link vizrt.PayloadHosting#setFieldXml}
         * @see [getFieldXml]{@link vizrt.PayloadHosting#getFieldXml}
         */
        PayloadHosting.prototype.getFieldXmlAsString = function (fieldPath) {
            var fieldElement = this._lookupXmlElement(fieldPath, false);
            return fieldElement ? getFieldValueXmlAsString(fieldElement) : null;
        };
        /**
         * Extract information about the media from the atom entry value of the field
         * @function vizrt.PayloadHosting#getMediaInfoFromAtomEntry
         * @param {Element} atomEntry The atom entry value of the field
         * @returns {vizrt.IMediaInfo[]} Information about the media found in the atom entry.
         * @see [getFieldXml]{@link vizrt.PayloadHosting#getFieldXml}
         * @see [getFieldMediaInfo]{@link vizrt.PayloadHosting#getFieldMediaInfo}
         */
        PayloadHosting.prototype.getMediaInfoFromAtomEntry = function (atomEntry, onlySafe) {
            var entryContentEl = getFirstChildElement(atomEntry, atomNs, "content");
            var entryContentType = entryContentEl ? entryContentEl.getAttribute("type") : null;
            var entryContentUrl = entryContentType == "application/vnd.vizrt.viz.image"
                ? getSafeVizImageUrl(entryContentEl)
                : (entryContentEl ? entryContentEl.getAttribute("src") : null);
            var entryContentInfo = (entryContentUrl && entryContentType)
                ? { isDefault: false, uri: entryContentUrl, type: entryContentType }
                : null;
            if (entryContentInfo && onlySafe && !isSafeMediaType(entryContentInfo.type))
                entryContentInfo = null;
            // Determine the main media type of the asset (audio/video/image)
            var isAudio = false;
            var isVideo = false;
            var isImage = false;
            var isAudioOrVideo = false;
            if (entryContentType && (isVideoType(entryContentType, true) || entryContentType == "application/vnd.vizrt.viz.video")) {
                isVideo = true;
                isAudioOrVideo = true;
            }
            else if (entryContentType && (isAudioType(entryContentType, true) || entryContentType == "application/vnd.vizrt.viz.audio")) {
                isAudio = true;
                isAudioOrVideo = true;
            }
            else if (entryContentType && (isImageType(entryContentType) || entryContentType == "application/vnd.vizrt.viz.image")) {
                isImage = true;
            }
            else {
                var mediaTypeEl = getFirstChildElement(atomEntry, vizmediaNs, "media");
                var mediaType = mediaTypeEl ? text(mediaTypeEl) : null;
                if (mediaType) {
                    isAudio = mediaType == "audio";
                    isVideo = mediaType == "video";
                    isImage = mediaType == "image";
                    isAudioOrVideo = isAudio || isVideo;
                }
            }
            var groupEl = getFirstChildElement(atomEntry, mrssNs, "group");
            if (!groupEl)
                return entryContentInfo ? [entryContentInfo] : [];
            // Loop over the <media:content> elements of the the <media:group> element
            var defaultItems = [];
            var nonDefaultItems = [];
            var contentEl;
            var iterator = new TypedElementIterator(new SingleElementIterator(groupEl), mrssNs, "content");
            while ((contentEl = iterator.next()) != null) {
                // Check if the content element is relevant
                if (!contentEl.getAttribute("url") || !contentEl.getAttribute("type") || contentEl.getAttribute("order"))
                    continue;
                var uri = contentEl.getAttribute("url");
                var type = contentEl.getAttribute("type");
                if (onlySafe && !isSafeMediaType(type))
                    continue;
                if ((isAudioOrVideo && isImageType(type) || isVideo && isAudioType(type, true)) || (isImage && isAudioOrVideoType(type)))
                    continue;
                // Determine "where" to put the content element
                var isDefaultAttr = contentEl.getAttribute("isDefault");
                var isDefault = "true" == isDefaultAttr || "1" == isDefaultAttr;
                var insertFirst = false;
                if (entryContentInfo != null && entryContentInfo.uri == uri) {
                    entryContentInfo = null;
                    insertFirst = !isDefault;
                }
                // Create the media info object
                var item = { isDefault: isDefault, uri: uri, type: type };
                var width = getAttributeInt(contentEl, "width");
                if (width != undefined) {
                    item.width = width;
                }
                var height = getAttributeInt(contentEl, "height");
                if (height != undefined) {
                    item.height = height;
                }
                var duration = getAttributeFloat(contentEl, "duration");
                if (duration != undefined) {
                    item.duration = duration;
                }
                var size = getAttributeInt(contentEl, "fileSize");
                if (size != undefined) {
                    item.size = size;
                }
                // Add it to the relevant position ("where")
                if (isDefault) {
                    defaultItems.push(item);
                }
                else if (insertFirst) {
                    nonDefaultItems.splice(0, 0, item);
                }
                else {
                    nonDefaultItems.push(item);
                }
            }
            if (entryContentInfo != null) {
                nonDefaultItems.splice(0, 0, entryContentInfo);
            }
            return !defaultItems.length ? nonDefaultItems : !nonDefaultItems.length ? defaultItems : defaultItems.concat(nonDefaultItems);
        };
        /**
         * Gets information about the media of a field
         * @function vizrt.PayloadHosting#getFieldMediaInfo
         * @param {string} fieldPath The path of the field
         * @returns {vizrt.IMediaInfo[] | null} Information about the media of the field or <code>null</code> if the field does not exist.
         * @throws {Error} Throws an <code>Error</code> if not <code>[isPayloadReady]{@link vizrt.PayloadHosting#isPayloadReady}()</code>.
         * @see [fieldExists]{@link vizrt.PayloadHosting#fieldExists} for further information about field paths.
         */
        PayloadHosting.prototype.getFieldMediaInfo = function (fieldPath, onlySafe) {
            var fieldValue = this.getFieldXml(fieldPath);
            return fieldValue ? this.getMediaInfoFromAtomEntry(fieldValue, onlySafe) : null;
        };
        /**
         * Determines the media type for a scalar field.
         * @function vizrt.PayloadHosting#getFieldXsdType
         * @param {string} fieldPath The path of the field
         * @returns {string} <code>null</code> if no field definition found for the field or if no xsd type specified for the field,
         *                   otherwise the XSD type for the field.
         * @throws {Error} Throws an <code>Error</code> if not <code>[hasModel]{@link vizrt.PayloadHosting#hasModel}()</code>.
         * @see [fieldExists]{@link vizrt.PayloadHosting#fieldExists} for further information about field paths.
         * @see [isScalarField]{@link vizrt.PayloadHosting#isScalarField}
         */
        PayloadHosting.prototype.getFieldXsdType = function (fieldPath) {
            var fieldDefElement = this._lookupXmlDefElement(fieldPath, false);
            return fieldDefElement ? fieldDefElement.getAttribute("xsdtype") : null;
        };
        /**
         * Gets the number of elements in a list field.
         * @function vizrt.PayloadHosting#getListFieldLength
         * @param {string} fieldPath The path of the field
         * @returns {number} The number of elements or <code>null</code> if the field does exist or does not contain a list.
         * @throws {Error} Throws an <code>Error</code> if not <code>[isPayloadReady]{@link vizrt.PayloadHosting#isPayloadReady}()</code>.
         * @see [fieldExists]{@link vizrt.PayloadHosting#fieldExists} for further information about field paths.
         */
        PayloadHosting.prototype.getListFieldLength = function (fieldPath) {
            var fieldElement = this._lookupXmlElement(fieldPath, false);
            if (!fieldElement)
                return null;
            var listEl = getFirstChildElement(fieldElement, vizNs, "list");
            if (!listEl)
                return null;
            var iterator = new TypedElementIterator(new SingleElementIterator(listEl), vizNs, "payload");
            var result = 0;
            while (iterator.next() != null) {
                ++result;
            }
            return result;
        };
        /**
         * Gets the maximum number of elements allowed in a list field.
         * @function vizrt.PayloadHosting#getListFieldMaximumLength
         * @param {string} fieldPath The path of the field
         * @returns {number} The maximum number of elements or <code>null</code> if the list
         *                   definition does not specify a maximum list length.
         * @throws {Error} Throws an <code>Error</code> if not <code>[hasModel]{@link vizrt.PayloadHosting#hasModel}()</code>
         *                 or if the field is not a list.
         * @see [fieldExists]{@link vizrt.PayloadHosting#fieldExists} for further information about field paths.
         * @see [getListFieldLength]{@link vizrt.PayloadHosting#getListFieldLength}
         * @see [getListFieldMinimumLength]{@link vizrt.PayloadHosting#getListFieldMinimumLength}.
         */
        PayloadHosting.prototype.getListFieldMaximumLength = function (fieldPath) {
            return getListMaxCount(getListDefElement(this._lookupXmlDefElementStrict(fieldPath, false), fieldPath));
        };
        /**
         * Gets the minimum number of elements allowed in a list field.
         * @function vizrt.PayloadHosting#getListFieldMinimumLength
         * @param {string} fieldPath The path of the field
         * @returns {number} The minimum number of elements allowed. Note that this function (unlike
         *                   <code>[getListFieldMaximumLength]{@link vizrt.PayloadHosting#getListFieldMaximumLength}()</code>)
         *                   returns 0 also if the list does not specify a minimum list length.
         * @throws {Error} Throws an <code>Error</code> if not <code>[hasModel]{@link vizrt.PayloadHosting#hasModel}()</code>
         *                 or if the field is not a list.
         * @see [fieldExists]{@link vizrt.PayloadHosting#fieldExists} for further information about field paths.
         * @see [getListFieldLength]{@link vizrt.PayloadHosting#getListFieldLength}
         * @see [getListFieldMaximumLength]{@link vizrt.PayloadHosting#getListFieldMaximumLength}.
         */
        PayloadHosting.prototype.getListFieldMinimumLength = function (fieldPath) {
            return getListMinCount(getListDefElement(this._lookupXmlDefElementStrict(fieldPath, false), fieldPath)) || 0;
        };
        /**
         * Determines whether a field is defined.
         * @function vizrt.PayloadHosting#isFieldDefined
         * @param {string} fieldPath The path of the field
         * @returns {boolean} <code>true</code> if the model contains a definition for the field, and <code>false</code> otherwise.
         * @throws {Error} Throws an <code>Error</code> if not <code>[hasModel]{@link vizrt.PayloadHosting#hasModel}()</code>.
         * @see [fieldExists]{@link vizrt.PayloadHosting#fieldExists} for further information about field paths.
         */
        PayloadHosting.prototype.isFieldDefined = function (fieldPath) {
            return !!this._lookupXmlDefElement(fieldPath, false);
        };
        /**
         * Determines whether a field is a list field. A list field is allowed to contain a list.
         * If a field is neither a scalar field nor a list field, it is a void field (probably used to contain sub-fields).
         * @function vizrt.PayloadHosting#isListField
         * @param {string} fieldPath The path of the field
         * @returns {boolean} <code>null</code> if no field definition found for the field,
         *                   <code>true</code> if the field is a list field, and <code>false</code> otherwise.
         * @throws {Error} Throws an <code>Error</code> if not <code>[hasModel]{@link vizrt.PayloadHosting#hasModel}()</code>.
         * @see [fieldExists]{@link vizrt.PayloadHosting#fieldExists} for further information about field paths.
         * @see [isScalarField]{@link vizrt.PayloadHosting#isScalarField}
         * @see [getListFieldLength]{@link vizrt.PayloadHosting#getListFieldLength}
         * @see [addListFieldItem]{@link vizrt.PayloadHosting#addListFieldItem}
         * @see [removeListFieldItem]{@link vizrt.PayloadHosting#removeListFieldItem}
         */
        PayloadHosting.prototype.isListField = function (fieldPath) {
            var fieldDefElement = this._lookupXmlDefElement(fieldPath, false);
            return fieldDefElement ? !!getFirstChildElement(fieldDefElement, vizNs, "listdef") : null;
        };
        /**
         * Determines whether a field is a scalar field. A scalar field is allowed to contain a value.
         * If a field is neither a scalar field nor a list field, it is a void field (probably used to contain sub-fields).
         * @function vizrt.PayloadHosting#isScalarField
         * @param {string} fieldPath The path of the field
         * @returns {boolean} <code>null</code> if no field definition found for the field,
         *                   <code>true</code> if the field is a scalar field, and <code>false</code> otherwise.
         * @throws {Error} Throws an <code>Error</code> if not <code>[hasModel]{@link vizrt.PayloadHosting#hasModel}()</code>.
         * @see [fieldExists]{@link vizrt.PayloadHosting#fieldExists} for further information about field paths.
         * @see [isListField]{@link vizrt.PayloadHosting#isListField}
         */
        PayloadHosting.prototype.isScalarField = function (fieldPath) {
            var fieldDefElement = this._lookupXmlDefElement(fieldPath, false);
            return fieldDefElement ? !!fieldDefElement.getAttribute("mediatype") : null;
        };
        /**
         * Removes an item in the list of a list field.
         * @function vizrt.PayloadHosting#removeListFieldItem
         * @param {string} fieldPath The path of the list field
         * @param {number} position If 0 or positive, the zero-based position from the front of the list for item to be removed.
         *                           If negative, the absolute value is the one-based position from the back of the list for the item to be removed
         *                           (-1 will remove the last item, -2 will remove the item before the last item, etc.).
         * @throws {Error} Throws an <code>Error</code> if<ul><li>not <code>[hasModel]{@link vizrt.PayloadHosting#hasModel}()</code></li>
         *                 <li>the field does not exist, is not a list field or does not have a list</li>
         *                 <li>the list of the list field contains the minimum allowed number of items</li></ul>
         * @throws {RangeError} Throws a <code>RangeError</code> if <code>position</code> is out of range.
         * @see [fieldExists]{@link vizrt.PayloadHosting#fieldExists} for further information about field paths.
         * @see [isListField]{@link vizrt.PayloadHosting#isListField},
         * @see [addListFieldItem]{@link vizrt.PayloadHosting#addListFieldItem},
         */
        PayloadHosting.prototype.removeListFieldItem = function (fieldPath, position) {
            var fieldElement = this._lookupXmlElementStrict(fieldPath, false);
            var listEl = getFirstChildElement(fieldElement, vizNs, "list");
            if (!listEl)
                throw new Error("The field does not have a list.");
            var fieldDefElement = this.hasModel() ? this._lookupXmlDefElementStrict(fieldPath, false) : null;
            var minCount = fieldDefElement ? getListMinCount(getListDefElement(fieldDefElement, fieldPath)) : null;
            var count = (position < 0 || minCount) ? (this.getListFieldLength(fieldPath) || 0) : null;
            // Convert negative index to zero-based index
            if (position < 0) {
                position = (count || 0) + position;
                if (position < 0)
                    throw createRemoveListItemRangeError(count);
            }
            // Find element to be removed
            var iterator = new TypedElementIterator(new SingleElementIterator(listEl), vizNs, "payload");
            var element;
            var elmPosition = 0;
            while ((element = iterator.next()) != null && elmPosition < position) {
                ++elmPosition;
            }
            if (element == null)
                throw createRemoveListItemRangeError(elmPosition);
            // Check minimum count
            if (minCount && (count || 0) <= (minCount || 0))
                throw new Error("Cannot remove list item. The list of '" + fieldPath + "' must contain at least " + minCount + " items.");
            // Remove the XML element corresponding to the list item and notify host about change
            listEl.removeChild(element);
            this.notifyHostAboutPayloadChange();
        };
        /**
         * Sets the field value to a text. Does nothing if the text value of the field does not change.
         * @function vizrt.PayloadHosting#setFieldText
         * @param {string} fieldPath The path of the field
         * @param {string} text The text to be used as content of the value of the field.
         * @throws {Error} Throws an <code>Error</code> if not <code>[isPayloadReady]{@link vizrt.PayloadHosting#isPayloadReady}()</code>
         * or not <code>[fieldExists]{@link vizrt.PayloadHosting#fieldExists}(fieldPath)</code>.
         * @see [fieldExists]{@link vizrt.PayloadHosting#fieldExists} for further information about field paths.
         * @see [getFieldText]{@link vizrt.PayloadHosting#getFieldText}
         */
        PayloadHosting.prototype.setFieldText = function (fieldPath, text) {
            var fieldElement = this._lookupXmlElementStrict(fieldPath, false);
            if (getTextFromFieldElement(fieldElement) == text)
                return;
            setFieldValueAsText(fieldElement, text);
            this.notifyHostAboutPayloadChange();
        };
        /**
         * Sets the field value from an XML element. Ensures that the host is notified about the change in the payload.
         * Note that this method will currently send an updated payload to the host even if the field value does not change.
         * @function vizrt.PayloadHosting#setFieldXml
         * @param {string} fieldPath The path of the field to be changed
         * @param {Element|string|null} xml
         *            the XML element to be used as the content of the value of the field or a string to be parsed to an XML element,
         *            or <code>null</code> to remove the value of the field. If an XML element is passed, and the element does not already
         *            belong to the payload document, it will be imported to this document.
         * @throws {Error} Throws an <code>Error</code> if not <code>[isPayloadReady]{@link vizrt.PayloadHosting#isPayloadReady}()</code>
         * or not <code>[fieldExists]{@link vizrt.PayloadHosting#fieldExists}(fieldPath)</code>.
         * @see [fieldExists]{@link vizrt.PayloadHosting#fieldExists} for further information about field paths.
         * @see [getFieldXml]{@link vizrt.PayloadHosting#getFieldXml}
         */
        PayloadHosting.prototype.setFieldXml = function (fieldPath, xml) {
            var fieldElement = this._lookupXmlElementStrict(fieldPath, false);
            if (typeof xml === "string") {
                setFieldValueAsParsedXml(fieldElement, xml);
            }
            else if (!xml || xml.ownerDocument === this._payloadDoc) {
                setFieldValueContent(fieldElement, xml);
            }
            else {
                setFieldValueContent(fieldElement, this._payloadDoc ? this._payloadDoc.importNode(xml, true) : null);
            }
            this.notifyHostAboutPayloadChange();
        };
        /**
         * Sets the visibility of a field.
         * @function vizrt.PayloadHosting#setFieldVisibility
         * @param fieldPath The path of the field to change visibility of
         * @param visible <ul>
         *                  <li><code>true</code> to show the field (unless parent field is hidden).</li>
         *                  <li><code>false</code> to hide the field.</li>
         *                  <li><code>null</code> to use default visibility.</li>
         *                </ul>
         * @throws {Error} Throws an <code>Error</code> if not <code>[isPayloadReady]{@link vizrt.PayloadHosting#isPayloadReady}()</code>
         * or not <code>[fieldExists]{@link vizrt.PayloadHosting#fieldExists}(fieldPath)</code>.
         * @see [fieldExists]{@link vizrt.PayloadHosting#fieldExists} for further information about field paths.
         * @see [setFieldReadOnly]{@link vizrt.PayloadHosting#setFieldReadOnly}
         */
        PayloadHosting.prototype.setFieldVisibility = function (fieldPath, visible) {
            var fieldElement = this._lookupXmlElementStrict(fieldPath, false);
            var changed = setFieldAnnotation(fieldElement, "visibility", (typeof visible) === "boolean" ? (visible ? "visible" : "hidden") : null);
            if (changed)
                this.notifyHostAboutPayloadChange();
        };
        /**
         * Sets whether a field is read-only.
         * @function vizrt.PayloadHosting#setFieldReadOnly
         * @param fieldPath The path of the field to change read-only state of.
         * @param readOnly <ul>
         *                  <li><code>true</code> to make the field read-only.</li>
         *                  <li><code>false</code> to make it possible to edit field content.</li>
         *                  <li><code>null</code> to use default.</li>
         *                </ul>
         * @throws {Error} Throws an <code>Error</code> if not <code>[isPayloadReady]{@link vizrt.PayloadHosting#isPayloadReady}()</code>
         * or not <code>[fieldExists]{@link vizrt.PayloadHosting#fieldExists}(fieldPath)</code>.
         * @see [fieldExists]{@link vizrt.PayloadHosting#fieldExists} for further information about field paths.
         * @see [setFieldVisibility]{@link vizrt.PayloadHosting#setFieldVisibility}
         */
        PayloadHosting.prototype.setFieldReadOnly = function (fieldPath, readOnly) {
            var fieldElement = this._lookupXmlElementStrict(fieldPath, false);
            var changed = setFieldAnnotation(fieldElement, "contenteditable", (typeof readOnly) === "boolean" ? (readOnly ? "false" : "true") : null);
            if (changed)
                this.notifyHostAboutPayloadChange();
        };
        /**
         * Creates an XML element belonging to the XML document used to store the payload.
         * By using this XML element as the second parameter in <code>[setFieldXml]{@link vizrt.PayloadHosting#setFieldXml}</code>,
         * setting the field XML becomes slightly more efficient, since the element does not need to
         * be imported to the payload XML document.
         * @function vizrt.PayloadHosting#createElementForFieldXml
         * @param {string} namespaceURI The namespace to be used in the new element.
         * @param {string} name The name of the new element
         * @returns {Element} An XML element that may be used as th XML value for fields in the payload of this <code>PayloadHosting</code>.
         * @throws {Error} Throws an <code>Error</code> if not <code>[isPayloadReady]{@link vizrt.PayloadHosting#isPayloadReady}()</code>.
         */
        PayloadHosting.prototype.createElementForFieldXml = function (namespaceURI, name) {
            if (!this._payloadDoc)
                throw new Error("PayloadHosting not ready!");
            return this._payloadDoc.createElementNS(namespaceURI, name);
        };
        /**
         * Gets whether the model defining the payload is available.
         * Will never return <code>true</code> unless <code>[isPayloadReady]{@link vizrt.PayloadHosting#isPayloadReady}()</code>
         * is also <code>true</code>.
         * @function vizrt.PayloadHosting#hasModel
         * @returns {boolean} Whether the the payload is backed up by a model.
         * @see [isPayloadReady]{@link vizrt.PayloadHosting#isPayloadReady}.
         */
        PayloadHosting.prototype.hasModel = function () {
            return !!this._modelElement;
        };
        /**
         * Gets whether a payload has been received from the host.
         * @function vizrt.PayloadHosting#isPayloadReady
         * @returns {boolean} Whether the first payload has been received from the host.
         * @see [hasModel]{@link vizrt.PayloadHosting#hasModel}.
         */
        PayloadHosting.prototype.isPayloadReady = function () {
            return !!this._payloadDoc;
        };
        /**
         * Prevent sending new payload to host more than once if making multiple changes to it.
         * If you intend to make multiple changes to the payload it is smart to create an updater function making those changes
         * call <code>updatePayload</code> with this updater function as the parameter.
         * Doing so ensures that the payload is serialized and sent to the host only once instead of for every change.
         * @function vizrt.PayloadHosting#updatePayload
         * @param {vizrt~UpdatePayloadCallback} updater
         *                           The callback making changes to the payload. Will be called once during execution of this method,
         *                           and if it makes any changes to the payload during its execution, the host will be notified
         *                           once that the payload has changed afterwards.
         *                           If this function returns true, the payload will be assumed to have been changed by the updater
         *                           even if no field value setter functions (e.g. <code>[setFieldText]{@link vizrt.PayloadHosting#setFieldText}</code>)
         *                           have been called.
         *                           During execution of the callback, <code>this</code> refers to this <code>PayloadHosting</code> object.
         */
        PayloadHosting.prototype.updatePayload = function (updater) {
            var wasInUpdatePayload = this._isInUpdatePayload;
            this._isInUpdatePayload = true;
            try {
                if (updater.call(this))
                    this._payloadChangedDuringUpdate = true;
            }
            finally {
                this._isInUpdatePayload = wasInUpdatePayload;
            }
            if (this._payloadChangedDuringUpdate && !this._isInUpdatePayload) {
                this._payloadChangedDuringUpdate = false;
                this.notifyHostAboutPayloadChange();
            }
        };
        /**
         * Request host to let user edit a given field of the payload.
         * @function vizrt.PayloadHosting#editField
         * @param {string} fieldPath The path of the field to be edited
         * @param {Object} [editRequestParameters] Information about how to edit this field
         * @param {boolean} [editRequestParameters.preferFeedBrowser] - If specified, indicates whether to prefer using the feed browser.
         * @param {string} [editRequestParameters.searchTerms] - If specified, indicates the initial search terms in the search panel when editing an asset field.
         * @param {string} [editRequestParameters.searchDate] - If specified, indicates a date constraint to apply to the search when editing an asset field.
         *    The following values are accepted:
         *    <ul>
         *       <li><code>NO_SEARCH_DATE</code> - no date filter is applied.</li>
         *       <li><code>LAST_HOUR</code> - only assets from the last hour are displayed.</li>
         *       <li><code>LAST_DAY</code> - only assets from the last day (24 hours) are displayed.</li>
         *       <li><code>LAST_WEEK</code> - only assets from the last week are displayed.</li>
         *       <li><code>LAST_MONTH</code> - only assets from the last month are displayed.</li>
         *    </ul>
         * @param {string} [editRequestParameters.searchTag] - If specified, a search tag to use when editing an asset field.
         * @see [fieldExists]{@link vizrt.PayloadHosting#fieldExists} for further information about field paths.
         */
        PayloadHosting.prototype.editField = function (fieldPath, editRequestParameters) {
            if (!this._host)
                throw Error("Host is not defined");
            var data = { type: "edit_field", path: fieldPath, guestid: getGuestIdentifier() };
            if (editRequestParameters) {
                if (editRequestParameters.preferFeedBrowser)
                    data["hints"] = "prefer-feed-browser";
                if (editRequestParameters.searchTerms != null)
                    data["searchTerms"] = editRequestParameters.searchTerms;
                if (editRequestParameters.searchDate != null)
                    data["searchDate"] = editRequestParameters.searchDate;
                if (editRequestParameters.searchTag != null)
                    data["searchTag"] = editRequestParameters.searchTag;
            }
            this._host.postMessage(data, getHostOrigin());
        };
        /**
         * Ensure that the host gets the updated payload.
         * There should be no need to call this function unless you modify the nodes of the payload document
         * without using the helper function of this class.
         * If you for instance use [getFieldXml]{@link vizrt.PayloadHosting#getFieldXml} and modify the returned XML element,
         * you must call this function to ensure that the changes reaches the host.
         * @function vizrt.PayloadHosting#notifyHostAboutPayloadChange
         */
        PayloadHosting.prototype.notifyHostAboutPayloadChange = function () {
            if (!this._host)
                throw new Error("Host is not defined");
            if (this._isAboutToNotifyHost)
                return; // Prevents recursion through field value callbacks.
            if (this._isInUpdatePayload) {
                this._payloadChangedDuringUpdate = true;
                return;
            }
            this._isAboutToNotifyHost = true;
            try {
                if (this._fieldValueCallbacks && !this._isInFinishSetPayload)
                    this._updateFieldValueCallbacks();
                var serializer = new XMLSerializer();
                var newXml = this._payloadDoc ? serializer.serializeToString(this._payloadDoc) : "";
                this._host.postMessage({ type: "payload_changed", xml: newXml, guestid: getGuestIdentifier() }, getHostOrigin());
            }
            finally {
                this._isAboutToNotifyHost = false;
            }
        };
        /**
         * Sets model information to be provided to host using simplified JSON based scheme
         * @function vizrt.PayloadHosting#setModelInfo
         * @param {vizrt.IModelInfo|null} modelInfo Information about the model expected by the
         *     hosted HTML page or <code>null</code> to provide no such information.
         */
        PayloadHosting.prototype.setModelInfo = function (modelInfo) {
            var modelDoc = modelInfo ? createModelXml(modelInfo) : undefined;
            this._modelInfoXml = modelDoc ? ((new XMLSerializer).serializeToString(modelDoc)) : undefined;
        };
        /**
         * Sets model information to be provided to host using full VDF model XML
         * @function vizrt.PayloadHosting#setModelInfo
         * @param {string|null} modelXml Information about the model expected by the
         *     hosted HTML page or <code>null</code> to provide no such information.
         */
        PayloadHosting.prototype.setModelInfoXml = function (modelXml) {
            this._modelInfoXml = modelXml || undefined;
        };
        /**
         * Sets whether the HTML page (guest) wants to keep focus even though none of its inputs has focus.
         * For guests controlling the focus, the host will typically visualize that it is disabled
         * as long as the guest has focus.
         * @param controlled `true` to keep focus in guest even if no inputs have focus, `false` otherwise.
         */
        PayloadHosting.prototype.setControlledFocus = function (controlled) {
            this._controlledFocus = controlled;
        };
        /**
         * Request the host to take focus back.
         * Typically used when [setControlledFocus]{@link vizrt.PayloadHosting#setControlledFocus} has been called with `true`.
         */
        PayloadHosting.prototype.yieldFocus = function () {
            if (!this._host)
                return;
            this._host.postMessage({
                type: "focus_changed",
                event: "yield_focus",
                guestid: getGuestIdentifier()
            }, getHostOrigin());
        };
        return PayloadHosting;
    }());
    vizrt.PayloadHosting = PayloadHosting;
    /**
     * @type {vizrt.PayloadHosting}
     */
    vizrt.payloadhosting = new PayloadHosting();
})(vizrt || (vizrt = {}));
