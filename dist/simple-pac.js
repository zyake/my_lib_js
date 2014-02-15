
/**
 * A proxy of a abstraction.
 *
 * It is a proxy for a abstraction that resides in a application server.
 * Using json interface, the proxy don't have to realize
 * the actual implementation of the abstraction.
 *
 * If a AbstractionProxy was received a request event,
 * it sends the event as json to a abstraction that
 * resides in a server.
 */
AbstractionProxy = {

    AS_JSON: function(xhr) {
        Assert.notNull(xhr, "xhr");
        return JSON.parse(xhr.responseText);
     },

    AS_TEXT: function(xhr) {
        Assert.notNull(xhr, "xhr");
        return xhr.responseText;
    },

    FOR_JSON:  function(obj, xhr) {
        Assert.notNullAll([ [ obj,  "obj" ], [ xhr, "xhr" ] ]);
        return JSON.stringify(obj);
    },

    FOR_TEXT: function(obj, xhr) {
        Assert.notNullAll([ [ obj, "obj" ], [ xhr, "xhr" ] ]);
        return obj.toString();
    },

    AS_DEFAULT: this.AS_JSON,
    FOR_DEFAULT: this.FOR_JSON,

    create: function(id,  requestKey, responseKey, url) {
        Assert.notNullAll([ [ id,  "id" ], [ requestKey,  "requestKey" ],
            [ responseKey, "responseKey" ], [ url, "url" ] ]);

        var proxy = Object.create(this, {
            id: { value: id },
            requestKey: { value: requestKey },
            responseKey: { value: responseKey },
            url: { value: url },
            httpClient: { value: window.HttpClient },
            isRequesting: { value: false },
            reqHandler: { value: this. FOR_DEFAULT, writable: true },
            resHandler: { value: this.AS_DEFAULT, writable: true }
        });

        return proxy;
    },

    initialize: function(control) {
        Assert.notNull(control, "control");
        this.control = control;

        var eventKey = this.requestKey.substring(1);
        var on = Id.onPresentation(this);
        this.control.addEventRef(this.id, on[eventKey]());
    },

    fetch: function(args) {
        Assert.notNull(args, "args");
        if ( this.isRequesting == true ) {
            return;
        }
        this.isRequesting = true;
        var me = this;
        this.httpClient.send(this.url, function(event) {
            var xhr = event.target;
            me.isRequesting = false;
            if ( me.httpClient.isSuccess(xhr) ) {
                me.successCallback(xhr);
            } else {
                me.failureCallback(xhr);
            }
        }, args, this.reqHandler);
    },

    notify: function(event, args) {
        Assert.notNullAll([ [ event, "event" ], [ args, "args" ] ]);
        this.fetch(args);
    },

    successCallback: function(xhr) {
        Assert.notNull(xhr, "xhr");
        var responseData = this.resHandler(xhr);
        var eventKey = this.responseKey.substring(1);
        var on = Id.onAbstraction(this);
        this.control.raiseEvent(on[eventKey](), this, responseData);
    },

    failureCallback: function(xhr) {
        Assert.notNull(xhr, "xhr");
        this.control.raiseEvent(this.id + ".error", this, xhr.responseText);
    }
};
/**
 *  A central repository to manage components.
 *
 * 	A component can be registered as a factory basis, and
 *	the component will be instantiated when it retrieved at first time.
 *	The component instance will be cached in the repository.
 *
 * If you want to refer to other repository managed components,
 * you can refer to them using a get method in the factory method context.
 *
 * - for example
 * var repository = ComponentRepository.create();
 * repository.defineFactories({
 *   "id": function() { return "ID-1" },
 *   "defaultName": function() { return this.get("id") + "-001" }
 * });
 *
 * // The value "ID-1-001" will be showed.
 * alert(repository.get("defaultName"));
 *
 * The central repository also supports hierarchical event propagating mechanism,
 * which can be used to notify a event data to parent repositories that
 * can manage a whole application configuration.
 */
ComponentRepository = {

    create: function(parent /* can be null! */) {
        var repository = Object.create(this, {
            components: { value: {} },
            factories: { value: {} },
            events: { value: {} },
            children: { value: [] },
            routeStack: { value: [] },
            parent: { value: parent }
        });
        repository.initialize();

        return repository;
    },

    initialize: function() {
        this.parent != null && this.parent.children.push(this);
    },

    defineFactories: function(def) {
        Assert.notNull(def, "def");
        for (id in def ) {
            this.addFactory(id, def[id]);
        }
    },

    addFactory: function(id, factory, eventRefs /* can be null! */) {
        Assert.notNullAll([ [ id, "id" ], [ factory, "factory" ] ]);
        this.factories[id] != null && this.doThrow("duplicated id: id=" + id);
        this.factories[id] = factory;
        eventRefs && eventRefs.forEach(function(eventRef) {
            this.events[eventRef] || (this.events[eventRef] = []);
            if ( this.events[eventRef].indexOf(id) == -1 ) {
                this.events[eventRef].push(id);
            }
        }, this);
    },

    addEventRef: function(id, eventRef) {
        Assert.notNullAll([ [ id, "id" ], [ eventRef, "eventRef" ] ]);
        this.events[eventRef] || (this.events[eventRef] = []);
        this.events[eventRef].push(id);
    },

    removeEventRef: function(id, eventRef) {
        Assert.notNullAll([ [ id, "id" ], [ eventRef, "eventRef" ] ]);
        delete this.events[eventRef][id];
    },

    raiseEvent: function(event, caller, args /* can be null! */) {
        Assert.notNullAll([ [ event, "event" ], [ caller, "caller" ] ]);
        var noRefsFound = this.events[event] == null;
        if ( noRefsFound ) {
            return;
         }

        var listeners = this.events[event];
        listeners.forEach(function(listenerId) { this.get(listenerId).notify(event, args); }, this);

        var parentShouldBeCalled = this.parent != null && this.parent != caller;
        parentShouldBeCalled && this.parent.raiseEvent(event, this, args);
        this.children.forEach(function(child) { child != caller && child.raiseEvent(event, this, args); }, this);
    },

    get: function(id, arg /* can be null! */) {
            Assert.notNullAll([ [ id, "id" ] ]);
        var recursiveRefFound = this.routeStack.indexOf(id) > -1;
        recursiveRefFound && this.doThrow("The recursive reference found: route=" + this.routeStack);

        try {
            this.routeStack.push(id);
            if ( this.components[id] != null ) {
                return  this.components[id];
            }

            var targetFactory = this.factories[id];
            if ( targetFactory  != null ) {
                var newComponent = targetFactory.call(this, id, arg);
                this.components[id] = newComponent;
                return newComponent;
            }

            this.parent == null && this.doThrow("target factory not found: id=" + id);
            var component = this.parent.get(id, arg);
            component == null && this.doThrow("target factory not found: id=" + id);

            return component;
        } finally {
            this.routeStack.pop();
        }
    },

    doThrow: function(msg) {
        Assert.notNull(msg, "msg");
        throw new Error(msg);
    }
};
/**
 * A control to mediate exchanging data among Presentation, Abstraction, and Widgets.
 */
Control = {

    create: function(id, widget, presentation, abstraction) {
        Assert.notNullAll([ [ id, "id" ], [ widget, "widget" ], [ presentation, "presentation" ],
            [ abstraction, "abstraction" ] ]);
        var control = Object.create(this, {
            id: { value: id },
            widget: { value: widget },
            presentation: { value: presentation },
            abstraction: { value: abstraction }
        });

        return control;
    },

    initialize: function() {
        this.abstraction.initialize(this);
        this.presentation.initialize(this);
    },

    raiseEvent: function(event, target, args) {
        Assert.notNullAll([ [ event, "event" ], [ target, "target" ] ,[ args, "args" ] ]);
        this.widget.raiseEvent(event, target, args);
    },

    addEventRef: function(id, eventRef) {
        Assert.notNullAll([ [ id, "id" ], [ eventRef, "eventRef" ] ]);
        this.widget.addEventRef(id, eventRef);
    },

    removeEventRef: function(id, eventRef) {
         Assert.notNullAll([ [ id, "id" ], [ eventRef, "eventRef" ] ]);
         this.widget.removeEventRef(id, eventRef);
    }
};
/**
 * VERY simple http client.
 */
 HttpClient = {

     send: function(url, loaded, data/* can be null! */, reqCallback /* can be null! */, method /* can be null! */) {
         Assert.notNullAll([ [ url, "url" ], [ loaded, "loaded" ] ]);
         var method = method || "GET";
         var reqCallback = reqCallback || function() { return data; }
         var xhr = new XMLHttpRequest();
         xhr.addEventListener("load", loaded);
         xhr.open(method, url, true);
         xhr.send(reqCallback(data, xhr));

         return xhr;
      },

     isSuccess: function(xhr) {
        Assert.notNull(xhr, "xhr");
         // Status Code = 0 is used for phantomjs testing.
         var isSuccess = xhr.status == 0 || xhr.status == 200;
         return isSuccess;
     }
 };
/**
 *  A abstraction of a whole application
 *
 * It can accommodate all widgets that consist of a SPA(Single Page  Application).
 * By starting a "Application" instance, Each widget can be accessed by a hash URL.
 * - for example
 * http://apphost/webapp#widget1 -> widget1
 * http://apphost/webapp#widget2 -> widget2
 */
Application = {

   create: function(appElem, widgetDef) {
        Assert.notNullAll([ [appElem, "appElem" ], [ widgetDef, "widgetDef" ] ]);
        var app = Object.create(this, {
            centralRepository: { value: ComponentRepository.create() }
        });
        app.initialize(appElem, widgetDef);

        return app;
   },

    initialize: function(appElem, widgetDef) {
        Assert.notNullAll([ [appElem, "appElem" ], [ widgetDef, "widgetDef" ] ]);
        this.centralRepository.defineFactories(widgetDef);
        this.transitionManager = TransitionManager.create(appElem, this.centralRepository);
    },

    start: function(initWidgetId) {
        Assert.notNull(initWidgetId, "initWidgetId");
        var me = this;
        window.addEventListener("hashchange", function(event) {
            var hashIndex = event.newURL.lastIndexOf("#");
            var newWidgetId = event.newURL.substring(hashIndex + 1);
             me.transitionManager.transit(newWidgetId);
        });
        this.transitionManager.transit(initWidgetId);
    }
};
/**
 * A html presentation component.
 *
 * Because Presentation is very simple and has no rendering logic,
 * you must extend it and implement own rendering logic.
 */
Presentation = {

    create: function(elem, id) {
      Assert.notNullAll([ [ elem, "elem" ], [ id, "id" ] ]);

      var presentation = Object.create(this, {
        elem: { value: elem },
        id: { value: id }
      });

      return presentation;
    },

    initialize: function(control) {
        Assert.notNull(control, "control");
        this.control = control;
    },

     getById: function(id) {
        Assert.notNull(id, "id");
        var elemById = this.elem.getElementById(id);
        Assert.notNull(elemById, "elemById");
        return elemById;
     },

    query: function(query) {
        Assert.notNull(query, "query");
        var queriedElem = this.elem.querySelector(query);
        Assert.notNull(queriedElem, "queriedElem");
        return queriedElem;
    },

    queryAll: function(query) {
        Assert.notNull(query, "query");
        var queriedElem = this.elem.querySelectorAll(query);
        Assert.notNull(query, "query");
        return queriedElem;
    },

    forEachNode: function(nodeList, func) {
        Assert.notNullAll([ [ nodeList, "nodeList" ], [ func, "func" ] ]);
        Array.prototype.slice.call(nodeList).forEach(func, this);
    },

    on: function(elem, event, callback) {
        Assert.notNullAll([ [ elem, "elem" ], [ event, "event" ],
         [ callback, "callback" ] ]);
        var me = this;
        elem.addEventListener(event, function(event) { return callback.call(me, event) });
    },

    raiseEvent: function(event, arg) {
        Assert.notNullAll([ [ event, "event" ], [ arg, "arg" ] ]);
        this.control.raiseEvent(event, this, arg);
    },

    addEventRef: function(id, event) {
        Assert.notNullAll([ [ id, "id" ], [ event, "event" ] ]);
        this.control.addEventRef(id, event);
    },

    doThrow: function(msg) {
        Assert.notNull(msg, "msg");
        throw new Error(msg);
    }
};
/**
 * A widget transition manager in the SPA(Single Page Application) model.
 *
 * Registering widgets into a central repository, the manager will
 * turn on and off the widgets by a widget id.
 */
 TransitionManager = {

    create: function(containerElem, repository, errorHandler /* can be null! */) {
        Assert.notNullAll([ [ containerElem, "containerElem" ], [ repository, "repository" ] ]);
        var manager = Object.create(this, {
            currentId: { value: null, writable: true },
            containerElem: { value: containerElem },
            idToElemMap: { value: [] },
            repository: { value: repository },
            templateRootPath: { value: "template/" },
            templateSuffix: { value: ".html" },
            httpClient: { value: window.HttpClient, writable: true },
            errorHandler: { value: errorHandler || function() {} }
        });

       return manager;
    },

    transit: function(id) {
        Assert.notNull(id, "id");
         if ( this.isTransiting ) {
             return;
         }
         if ( this.idToElemMap[id] != null ) {
             this.doTransit(id);
             return;
         }

         this.isTransiting = true;
         var templatePath = this.templateRootPath + id + this.templateSuffix;
         var me = this;
         this.httpClient.send(templatePath, function(event) {
             me.isTransiting = false;
             var xhr = event.target;
             if ( me.httpClient.isSuccess(xhr) ) {
                 var newElem = document.createElement("DIV");
                 if ( document.getElementById(id) != null ) {
                     throw new Error("duplicated id found!: id=" + id);
                 }
                 newElem.id = id;
                 newElem.style.display = "none";
                 newElem.innerHTML = xhr.responseText;

                 me.idToElemMap[id] = newElem;
                 me.containerElem.appendChild(newElem);
                 me.doTransit(id, newElem);
             } else {
                 me.errorHandler(xhr);
             }
         });
      },

      doTransit: function(id, newElem) {
           Assert.notNullAll([ [ id, "id" ], [ newElem, "newElem" ] ]);
           if ( this.currentId != null ) {
               var prevWidgetElem = this.idToElemMap[this.currentId];
               var prevWidget = this.repository.get(this.currentId, prevWidgetElem, this.repository);
               prevWidgetElem.style.display = "none";
           }
           this.currentId = id;
           this.idToElemMap[id].style.display = "block";
           var currentWidget = this.repository.get(id, newElem, this.repository);
           currentWidget.initialize();
      }
 };
/**
 * A widget to manage underlying controls.
 *
 * A widget is a unit of reusable component,
 * which manages all of components
 * that make up of a widget.
 *
 * Components are classified in the following two categories:
 * - Component: general purpose component
 * - Control: a central control point of a UI component
 *
 * All of components that reside in a widget communicate
 * each other using widget event mechanism.
 * Because a widget has a hierarchy repository structure,
 * the event that was raised by a component may be
 * propagated to parent repositories and other widgets.
 */
Widget  = {

    create: function(id, elem, parentRepository /* can be null! */) {
        Assert.notNullAll([ [ id, "id" ], [ elem ,"elem" ] ]);
        var widget = Object.create(this, {
            id: { value: id },
            elem: { value: elem },
            controls: { value: [] },
            components: { value: [] },
            initialized: { value: false },
            repository: { value: ComponentRepository.create(parentRepository) }
        });

        return widget;
    },

    initialize: function() {
        if ( this.initialized ) {
            return;
        }
        this.initialized = true;
        this.controls.forEach(function(controlId) { this.repository.get(controlId, this).initialize(); }, this);
    },

    defineComponents: function(def) {
       Assert.notNull(def, "def");
       for ( id in def ) {
        this.components.push(id);
        this.repository.addFactory(id, def[id]);
        }

        return this;
    },

    getComponent: function(id, args) {
        Assert.notNullAll([ [ id, "id" ], [ args, "args" ] ]);
        this.components.indexOf(id) == -1 && this.doThrow(id + " is not component!");
        return this.repository.get(id, args);
    },

    defineControls: function(def) {
        Assert.notNull(def, "def");
        for( id in def ) {
            this.controls.push(id);
            this.repository.addFactory(id, def[id]);
        }

        return this;
    },

    getControl: function(id) {
        Assert.notNull(id, "id");
        this.controls.indexOf(id) == -1 && this.doThrow(id + " is not control!");
        return this.repository.get(id, this);
    },

    raiseEvent: function(event, target, args) {
        Assert.notNullAll([ [ event, "event" ], [ target, "target" ], [ args, "args" ] ]);
        this.repository.raiseEvent(event, target, args);
    },

    addEventRef: function(id, eventRef) {
        Assert.notNullAll([ [ id, "id" ], [ eventRef, "eventRef" ] ]);
        this.repository.addEventRef(id, eventRef);
    },

    removeEventRef: function(id, eventRef) {
        Assert.notNullAll([ [ id, "id" ], [ eventRef, "eventRef" ] ]);
        this.repository.removeEventRef(id, eventRef);
    },

    doThrow: function(msg) {
        Assert.notNull(msg, "msg");
        throw new Error(msg);
    }
};Assert = {

    notNull: function(elem, param) {
        elem == null && this.doThrow("parameter \"" + param + "\" is null!");
    },

    notNullAll: function(elemDef) {
      elemDef.forEach(function(elem) { this.notNull(elem[0], elem[1]) }, this);
    },

    doThrow: function(msg) {
        throw new Error(msg);
    }
};
/**
 * A builder object to create event id.
 *
 * You can build event id that refers to other components in the same control.
  * Using the id object, you can remove string id literal from your code.
 *
 * - for example
 * this.referEvent(this.id, Id.onAbstraction(this).load());
 *
 * In the former example, you can determine the id of the abstraction
 * that resides in the same control on the presentation.
 * And the format of the id string is following.
 * ${WIDGET_ID}.${CONTROL_ID}.[${PRESENTATION_ID} | ${ABSTRACTION_ID}].${ACTION_CODE}
 */
Id = {
    idString: "",
    onAbstraction: function(target) {
      Assert.notNull(target, "target");

      var id = Object.create(this, {
        target: { value: target },
        idString: { value: "", writable: true, configurable: true } });

      if ( Presentation.isPrototypeOf(target) ) {
        id.idString = target.control.widget.id;
        id.idString += "." + target.control.id;
        id.idString += "." + target.control.abstraction.id;
      } else if ( AbstractionProxy.isPrototypeOf(target) ) {
        id.idString += target.control.widget.id;
        id.idString += ("." + target.control.id);
        id.idString += ("." + target.control.abstraction.id);
      } else if ( Control.isPrototypeOf(target) ) {
        id.idString = target.widget.id;
        id.idString += ("." + target.id);
        id.idString += ("." + target.abstraction.id);
      } else {
        throw new Error("invalid target:" + target);
      }

      return id;
    },

    onPresentation: function(target) {
      Assert.notNull(target, "target");

      var id = Object.create(this, {
        target: { value: target },
        idString: { value: "", writable: true, configurable: true } });
        
      if ( Presentation.isPrototypeOf(target) ) {
        id.idString = target.control.widget.id;
        id.idString += ("." + target.control.id);
        id.idString += ("." + target.control.presentation.id);
      } else if ( AbstractionProxy.isPrototypeOf(target) ) {
        id.idString = target.control.widget.id;
        id.idString += ("." + target.control.id);
        id.idString += ("." + target.control.presentation.id);
      } else if ( Control.isPrototypeOf(target) ) {
        id.idString = target.widget.id;
        id.idString += ("." + target.id);
        id.idString += ("." + target.presentation.id);
      } else {
        throw new Error("invalid target:" + target);
      }
      return id;
    },

    load: function() {
        return this.idString + ".load";
    },

    failed: function() {
        return this.idString + ".failed";
    },

    start: function() {
        return this.idString + ".start";
    },

    change: function() {
        return this.idString + ".change";
    },

    failure: function() {
        return this.idString + ".failure";
    },

    checkAction: function(target, event) {
        Assert.notNullAll([ [ target, "target" ], [ event, "event" ] ]);
        return target.endWith(event.idString);
    },

    on: function(idStr) {
        Assert.notNull(idStr, "idStr");

        var id = Object.create(this, {
        target: { value: target },
        idString: { value: "", writable: true, configurable: true } });
        id.idString = idStr;

        return id;
    }
}