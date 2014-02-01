
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
        return JSON.parse(xhr.responseText);
     },

    AS_TEXT: function(xhr) {
        return xhr.responseText;
    },

    FOR_JSON:  function(obj, xhr) {
        return JSON.stringify(obj);
    },

    FOR_TEXT: function(obj, xhr) {
        return obj.toString();
    },

    create: function(id,  requestKey, responseKey, url) {
        var proxy = Object.create(this);
        proxy.id = id;
        proxy.requestKey = requestKey;
        proxy.responseKey = responseKey;
        proxy.url = url;
        proxy.httpClient = window.HttpClient;
        proxy.isRequesting = false;
        proxy.reqHandler = this.FOR_DEFAULT;
        proxy.resHandler = this.AS_DEFAULT;

        return proxy;
    },

    initialize: function(control) {
        this.control = control;
        this.control.addEventRef(this.id, this.requestKey);
    },

    fetch: function(args) {
        if ( this.isRequesting == true ) {
            return;
        }
        this.isRequesting = true;
        var me = this;
        this.httpClient.send(this.url, function(xhr) {
            me.isRequesting = false;
            if ( me.httpClient.isSuccess(xhr) ) {
                me.successCallback(xhr);
            } else {
                me.failureCallback(xhr);
            }
        }, args, this.reqHandler);
    },

    notify: function(event, args) {
        this.fetch(args);
    },

    successCallback: function(xhr) {
        var responseData = this.resHandler(xhr);
        this.control.raiseEvent(this.responseKey, this, responseData);
    },

    failureCallback: function(xhr) {
        this.control.raiseEvent(this.id + ".error", this, xhr.responseText);
    }
};