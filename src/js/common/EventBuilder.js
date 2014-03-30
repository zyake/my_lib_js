
/**
 * A event builder class that can define view and model events by fluent interface.
 *
 * - for example
 *
 * EventBuilder.create(target)
 *  .ref().onAbstraction().load()
 *  .ref().onAbstraction().start()
 *  .raise().start({});
 */
EventBuilder = {

    REF_INVOKER: {

        target: null,
        id: null,
        builder: null,

        load: function() {
          this.target.control.addEventRef(this.target.id, this.id.load());
          return this.builder;
        },

        start: function() {
            this.target.control.addEventRef(this.target.id, this.id.start());
            return this.builder;
        },

        change: function() {
            this.target.control.addEventRef(this.target.id, this.id.change());
            return this.builder;
        },

        failed: function() {
            this.target.control.addEventRef(this.target.id, this.id.failed());
            return this.builder;
        },

        failure: function() {
            this.target.control.addEventRef(this.target.id, this.id.failure());
            return this.builder;
        }
    },

    RAISE_INVOKER: {

        target: null,
        id: null,
        builder: null,

        load: function(args) {
            Assert.notNullAll(this, [[ args, "args"]]);
            this.target.control.raiseEvent(this.id.load(), this.target, args);
            return this.builder;
        },

        start: function(args) {
            Assert.notNullAll(this, [[ args, "args"]]);
            this.target.control.raiseEvent(this.id.start(), this.target, args);
            return this.builder;
        },

        change: function(args) {
            Assert.notNullAll(this, [[ args, "args"]]);
            this.target.control.raiseEvent(this.id.change(), this.target,  args);
            return this.builder;
        },

        failed: function(args) {
            Assert.notNullAll(this, [[ args, "args"]]);
            this.target.control.raiseEvent(this.id.failed(), this.target, args);
            return this.builder;
        },

        failure: function(args) {
            Assert.notNullAll(this, [[ args, "args"]]);
            this.target.control.raiseEvent(this.id.failure(), this.target, args);
            return this.builder;
        }
    },

    create: function(target) {
        Assert.notNullAll(this, [[ target, "target"]]);
       Assert.notNull(this, target, "target");

        var builder = Object.create(this, {target: { value: target }});
        Object.seal(builder);

        return builder;
    },

    ref: function() {
        var me = this;
        var ref = {

            target: this.target,

            onAbstraction: function() {
               return Object.create(EventBuilder.REF_INVOKER,
                   { target: { value: this.target }, builder: { value: me },
                       id: { value: Id.onAbstraction(this.target) } });
            },

            onPresentation: function() {
                return Object.create(EventBuilder.REF_INVOKER,
                    { target: { value: this.target }, builder: { value: me },
                        id: { value: Id.onPresentation(this.target) } });
            },

            on: function(event) {
                Assert.notNullAll(this, [[ event, "event"]]);
                return Object.create(EventBuilder.REF_INVOKER,
                    { target: { value: this.target }, builder: { value: me },
                        id: { value: Id.on(event) } });
            }
        };

        return ref;
    },

    raise: function() {
        var me = this;
        var raise = Object.create(EventBuilder.RAISE_INVOKER, {
            target: { value: this.target }, builder: { value: me },
            id: { value: Id.onThis(this.target) }
        });
        Object.seal(raise);

        return raise;
    }
};