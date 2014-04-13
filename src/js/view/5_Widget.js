
/**
 * A widget to manage underlying controls.
 *
 * Widget is an unit of reusable component,
 * which manages all of components
 * that make up of a widget.
 *
 * Widget is used for functional "transition" basis
 * (ex. a search screen to a settings screen etc...)
 * so Widget is similar with  traditional web page.
 *
 * Components that can be registered in Widget
 * are classified in the following two categories.
 * - Component: a general purpose component
 * - Control: a central control point of an UI component
 *
 * You can define components and controls as follows.
 * // As Widget will be called by TransitionManager,
 * // you should extend Widget.
 * MyWidget = Object.create(Widget, {
 *  fields: {  value: {
 *      // Define components.
 *      // The specification of the component definition is
 *      // as same as ComponentRepository has.
 *      componentDefs: {value: {
 *          myModel: {
 *              target: AbstractionProxy,
 *              ...
 *           },
 *           myView: {
 *              target: MyPresentation,
 *              ...
 *           }
 *      }},
 *
 *      // Define controls.
 *      // The specification of the control definition is
 *      // as same as ComponentRepository has.
 *      // The only difference is that controls are used for
 *      // event notification points.
 *      controlDefs: { value: {
 *          myControl: {
 *              target: Control,
 *              ...
 *          }
 *      }}
 *  }}
 * });
 *
 * All of components that reside in a widget communicate
 * with each other using widget event mechanism.
 * Because a widget has a hierarchy repository structure,
 * the event that was raised by a component may be
 * propagated to parent repositories and other widgets.
 */
this.Widget = {

    create : function (arg) {
        Assert.notNullAll(this, [
            [ arg.id, "arg.id" ],
            [ arg.elem , "arg.elem" ]
        ]);
        var widget = Object.create(this, {
            id : { value : arg.id },
            elem : { value : arg.elem },
            controls : { value : [] },
            components : { value : [] },
            initialized : { value : false, writable: true },
            repository : { value :
                ComponentRepository.create({
                    id: arg.id + "Repository",
                    parent: arg.parentRepository })
            }
        });
        Object.defineProperties(widget, this.fields || {});
        for ( var key in arg ) {
            widget[key] == null && (widget[key] = arg[key]);
        }
        Object.seal(widget);

        this.controlDefs && widget.defineControls(this.controlDefs);
        this.componentDefs && widget.defineComponents(this.componentDefs);

        return widget;
    },

    initialize : function () {
        if ( this.initialized ) {
            return;
        }
        var me = this;
        this.initialized = true;
        for (var key in this.controls ) {
            this.repository.get(this.controls[key], this).initialize();
        }
        this.doInitialize();
    },

    /**
     * For internal usage.
     */
    doInitialize : function () {
    },

    defineComponents : function (def) {
        Assert.notNull(this, def, "def");
        for ( var id in def ) {
            this.components.push(id);
            this.repository.addDefinition(id, def[id]);
        }

        return this;
    },

    getComponent : function (id, args) {
        Assert.notNullAll(this, [
            [ id, "id" ],
            [ args, "args" ]
        ]);
        this.components.indexOf(id) == -1 && this.doThrow(id + " is not component!");
        return this.repository.get(id, args);
    },

    defineControls : function (def) {
        Assert.notNull(this, def, "def");
        for ( var id in def ) {
            this.controls.push(id);
            var componentDef = def[id];
            componentDef.arg == null && (componentDef.arg = {});
            componentDef.arg.widget = this;
            this.repository.addDefinition(id, componentDef);
        }

        return this;
    },

    getControl : function (id) {
        Assert.notNull(this, id, "id");
        this.controls.indexOf(id) == -1 && Assert.doThrow(id + " is not control!");
        return this.repository.get(id, this);
    },

    raiseEvent : function (event, target, args) {
        Assert.notNullAll(this, [
            [ event, "event" ],
            [ target, "target" ],
            [ args, "args" ]
        ]);
        this.repository.raiseEvent(event, target, args);
    },

    addEventRef : function (id, eventRef) {
        Assert.notNullAll(this, [
            [ id, "id" ],
            [ eventRef, "eventRef" ]
        ]);
        this.repository.addEventRef(id, eventRef);
    },

    toString : function () {
        return "id: " + this.id;
    }
};

Object.seal(this.Widget);
