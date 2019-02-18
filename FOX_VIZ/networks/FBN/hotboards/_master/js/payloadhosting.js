/*
Copyright (c) 2017 Vizrt

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
    var mrssNs = "http://search.yahoo.com/mrss/";
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
            if (name != null && name !== node.tagName)
                continue;
            return node;
        }
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
                if (this.name != null && this.name !== node.tagName)
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
        var oldValueEl = getFirstChildElement(fieldElement, vizNs, "value");
        if (!oldValueEl && !valueChildNode)
            return;
        if (!valueChildNode) {
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
        if (text == null) {
            setFieldValueContent(fieldElement, null);
        }
        else {
            setFieldValueContent(fieldElement, fieldElement.ownerDocument.createTextNode(text));
        }
    }
    function setFieldValueAsParsedXml(fieldElement, xml) {
        if (!xml) {
            setFieldValueContent(fieldElement, null);
        }
        else {
            var parser = new DOMParser();
            var doc = parser.parseFromString(xml, "text/xml");
            var el = getFirstChildElement(doc, null, null);
            var contentElement = fieldElement.ownerDocument.importNode(el, true);
            setFieldValueContent(fieldElement, contentElement);
        }
    }
    function setFieldAnnotation(fieldElement, annotationType, annotationValue) {
        var oldAnnotationEl = getFirstChildElement(fieldElement, vizNs, "annotation");
        if (!oldAnnotationEl && !annotationValue)
            return false;
        if (annotationValue == null) {
            var oldValue = oldAnnotationEl.getAttribute(annotationType);
            if (oldValue == null)
                return false;
            oldAnnotationEl.removeAttribute(annotationType);
            if (oldAnnotationEl.attributes.length == 0)
                fieldElement.removeChild(oldAnnotationEl);
            return true;
        }
        else if (!oldAnnotationEl) {
            var annotationEl = fieldElement.ownerDocument.createElementNS(vizNs, "annotation");
            annotationEl.setAttribute(annotationType, annotationValue);
            fieldElement.appendChild(annotationEl);
            return true;
        }
        else {
            var oldValue = oldAnnotationEl.getAttribute(annotationType);
            if (oldValue === annotationValue)
                return false;
            oldAnnotationEl.setAttribute(annotationType, annotationValue);
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
        var doc = listDefElement.ownerDocument;
        var payloadElement = doc.createElementNS(vizNs, "payload");
        var schemaElement = getFirstChildElement(listDefElement, vizNs, "schema");
        var iterator = new TypedElementIterator(new SingleElementIterator(schemaElement), vizNs, "fielddef");
        var fieldDefElement;
        while ((fieldDefElement = iterator.next()) != null) {
            var fieldElement = doc.createElementNS(vizNs, "field");
            fieldElement.setAttribute("name", fieldDefElement.getAttribute("name"));
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
    var PayloadIFrameHost = /** @class */ (function () {
        function PayloadIFrameHost(focusChangeHandler) {
            var _this = this;
            this._listener = null;
            var self = this;
            this._focusChangeHandler = focusChangeHandler;
            if (focusChangeHandler != null) {
                this._windowFocusListener = function () { self._focusChangeHandler("focused"); };
                this._windowBlurListener = function () { self._focusChangeHandler("blurred"); };
                this._docFocusInListener = function (event) { if (isInputElement(event.target))
                    _this._focusChangeHandler("input-focused"); };
                this._docFocusOutListener = function (event) { if (isInputElement(event.target))
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
                window.removeEventListener("focus", this._windowFocusListener);
                window.removeEventListener("blur", this._windowBlurListener);
                document.body.removeEventListener("focusin", this._docFocusInListener);
                document.body.removeEventListener("focusout", this._docFocusOutListener);
                this._listener = null;
            }
            if (listener) {
                window.addEventListener("message", listener, false);
                window.addEventListener("focus", this._windowFocusListener);
                window.addEventListener("blur", this._windowBlurListener);
                document.body.addEventListener("focusin", this._docFocusInListener);
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
     * @param {string|Element|null} value The new value of the field. Will be <code>null</code> if the field does not have a value,
     *                                    an XML Element if the value of the field contains an XML element,
     *                                    or a string containing the text content of the value otherwise.
     */
    /**
     * Callback function used by {@link vizrt.PayloadHosting#updatePayload}.
     * @callback vizrt~UpdatePayloadCallback
     * @returns <code>true</code> to force the payload host to be notified that the payload did change.
     *          <code>false</code> to notify the payload host only if some fields were actually updated using
     *          some of the field value setter functions (e.g. {@link vizrt.PayloadHosting#setFieldText}).
     */
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
            this._isInUpdatePayload = false;
            this._isAboutToNotifyHost = false;
            this._isInFinishSetPayload = false;
            this._usesAutomaticBindings = true;
            this._blurListener = null;
            this._htmlElementWithPendingIncomingChange = null;
            this._unknownMessageHandler = null;
            this._fieldValueCallbacks = null;
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
                    self_1._host.postMessage({ type: "focus_changed", event: type, guestid: getGuestIdentifier() }, getHostOrigin());
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
        PayloadHosting.prototype._onMessageFromHost = function (message) {
            var messageType = message.data ? message.data.type : "<no message data>";
            if (messageType === "set_payload") {
                this._setPayload(message.data.xml);
            }
            else {
                if (this._unknownMessageHandler && !this._unknownMessageHandler(message))
                    this._log("Got unknown message type from host: " + messageType);
                if (messageType === "set_time") {
                    this._host.postMessage({ type: "present" }, getHostOrigin());
                }
            }
        };
        PayloadHosting.prototype._log = function (message) {
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
        PayloadHosting.prototype._getAnyFieldValue = function (fieldPath) {
            if (!this.isPayloadReady())
                return undefined; // to ensure that we get a change notification when payload becomes ready (even if value is null)
            var fieldElement = this._lookupXmlElement(fieldPath, false);
            if (!fieldElement)
                return null;
            var valueElement = getFirstChildElement(fieldElement, vizNs, "value");
            if (!valueElement)
                return null;
            var xmlElement = getFirstChildElement(valueElement, null, null);
            return !xmlElement ? text(valueElement) : xmlElement;
        };
        PayloadHosting.prototype._initializeOnFields = function (fieldElementIterator, parentPath, parentId) {
            parentId = parentId ? parentId + "_" : "field_";
            var fieldElement;
            while ((fieldElement = fieldElementIterator.next()) != null) {
                var fieldName = fieldElement.getAttribute("name");
                var fieldPath = parentPath ? parentPath + "/" + fieldName : fieldName;
                if (this._usesAutomaticBindings) {
                    var fieldId = parentId + fieldName;
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
                this._initializeOnFields(new TypedElementIterator(new SingleElementIterator(fieldElement), vizNs, "field"), fieldPath, fieldId);
            }
        };
        PayloadHosting.prototype._initializeOnPayload = function () {
            this._removePreviousListeners();
            var payloadElement = getFirstChildElement(this._payloadDoc, vizNs, "payload");
            this._initializeOnFields(new TypedElementIterator(new SingleElementIterator(payloadElement), vizNs, "field"));
        };
        PayloadHosting.prototype._updateFieldValueCallbacks = function () {
            for (var fieldPath in this._fieldValueCallbacks) {
                var entry = this._fieldValueCallbacks[fieldPath];
                var newValue = this._getAnyFieldValue(fieldPath);
                var oldCacheValue = entry.value;
                entry.value = getFieldValueForCache(newValue);
                if (entry.value !== oldCacheValue) // undefined !== null, but undefined == null
                    entry.callback(newValue);
            }
        };
        PayloadHosting.prototype._setPayload = function (payloadXml) {
            var parser = new DOMParser();
            this._payloadDoc = parser.parseFromString(payloadXml, "text/xml");
            var payloadElement = getFirstChildElement(this._payloadDoc, vizNs, "payload");
            var inlineModelElement = getFirstChildElement(payloadElement, vizNs, "model");
            var modelUri = payloadElement.getAttribute("model");
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
         * <p>Sets callbacks to be called back when the values of a given set of fields change.
         * A callback will be called if the value of the associated field changes both if the change is
         * caused by the host or if it is caused by a programmatic change to the field using the
         * payloadhosting API.</p>
         * <p><b>Note!</b> The order of the callbacks is relevant:
         * If the value of field <i>y</i> (that has a value-change callback) is changed during execution of the value change callback
         * of field <i>x</i>, the callback of field <i>y</i> will be triggered if and only if field <i>y</i> is after field <i>x</i> in the
         * value callback map. However, if the callback of <i>y</i> is before the callback of <i>x</i> in the map, it will
         * be called next time there is a change to the payload. Therefore, to get a predictable result, it is recommended that, if
         * the value-change callback of a field change the values of other fields with registered value-change callbacks, the callbacks
         * of those other fields are put after the callback of the first field.</p>
         * <p>Also note that when the host changes the payload the field value callbacks are called before the <code>payloadchange</code>
         * event is triggered (see <code>[addEventListener]{@link vizrt.PayloadHosting#addEventListener}</code>).
         * Also, if the values of some fields are changed during handling of the <code>payloadchange</code> event, the value-change
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
                this._fieldValueCallbacks[fieldPath] = { callback: callbacks[fieldPath], value: getFieldValueForCache(this._getAnyFieldValue(fieldPath)) };
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
            var insertAtEnd = position == null;
            var count = (insertAtEnd || position < 0 || maxCount != null) ? (this.getListFieldLength(fieldPath) || 0) : null;
            if (insertAtEnd) {
                position = -1;
            }
            else if (position < -1) {
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
            var payloadElement;
            var result = 0;
            while ((payloadElement = iterator.next()) != null) {
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
                position = count + position;
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
            if (minCount && count <= minCount)
                throw new Error("Cannot remove list item. The list of '" + fieldPath + "' must contain at least " + minCount + " items.");
            // Remove the XML element corresponding to the list item and notify host about change
            listEl.removeChild(element);
            this.notifyHostAboutPayloadChange();
        };
        /**
         * Sets the field value to a text
         * @function vizrt.PayloadHosting#setFieldText
         * @param {string} fieldPath The path of the field
         * @param {string} text The text to be used as content of the value of the field.
         * @throws {Error} Throws an <code>Error</code> if not <code>[isPayloadReady]{@link vizrt.PayloadHosting#isPayloadReady}()</code>
         * or not <code>[fieldExists]{@link vizrt.PayloadHosting#fieldExists}(fieldPath)</code>.
         * @see [fieldExists]{@link vizrt.PayloadHosting#fieldExists} for further information about field paths.
         * @see [getFieldText]{@link vizrt.PayloadHosting#getFieldText}
         */
        PayloadHosting.prototype.setFieldText = function (fieldPath, text) {
            setFieldValueAsText(this._lookupXmlElementStrict(fieldPath, false), text);
            this.notifyHostAboutPayloadChange();
        };
        /**
         * Sets the field value from an XML element. Ensures that the host is notified about the change in the payload.
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
                setFieldValueContent(fieldElement, this._payloadDoc.importNode(xml, true));
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
                var newXml = serializer.serializeToString(this._payloadDoc);
                this._host.postMessage({ type: "payload_changed", xml: newXml, guestid: getGuestIdentifier() }, getHostOrigin());
            }
            finally {
                this._isAboutToNotifyHost = false;
            }
        };
        return PayloadHosting;
    }());
    vizrt.PayloadHosting = PayloadHosting;
    /**
     * @type {vizrt.PayloadHosting}
     */
    vizrt.payloadhosting = new PayloadHosting();
})(vizrt || (vizrt = {}));
