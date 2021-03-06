'use strict';
(function () {

    var url = window.location, ws = new window.WebSocket('ws://' + url.host), observers = {}, api_cb = {}, Ready = false, ready_cb = [];

    function GUID() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    }

    function ready(cb) {
        if (Ready) {
            return cb();
        }
        ready_cb.push(cb);
    }

    function checkReady() {
        var i;
        if (Ready && ready_cb.length) {
            $(document).ready(function () {
                for (i = 0; i < ready_cb.length; i++) {
                    ready_cb[i].call(null);
                }
                ready_cb = [];
            });
        } else {
            setTimeout(checkReady, 100);
        }
    }

    checkReady();

    function dispatch(id, message, timestamp) {
        var callback;
        for (callback in observers[id]) {
            if (observers[id].hasOwnProperty(callback)) {
                observers[id][callback].call(null, message, timestamp);
            }
        }
    }

    function api(params, callback) {
        var id = GUID();
        if (callback) {
            api_cb[id] = callback;
        }
        ws.send(JSON.stringify({
            module: params.module,
            method: params.method,
            params: params.params,
            guid: id
        }));
    }

    function html(file, callback) {
        api({
            module: 'web',
            method: 'html',
            params: {
                file: file
            }
        }, callback);
    }

    ws.onopen = function () {
        Ready = true;
    };

    ws.onclose = function () {
        Ready = false;
    };


    ws.onmessage = function (resp) {
        var message;
        try {
            message = JSON.parse(resp.data);
            dispatch(message.id, message.data);
        } catch (e) {
            console.log(resp, e.stack || e);
        }
    };

    function observe(id, callback) {
        if (!observers.hasOwnProperty(id)) {
            observers[id] = {};
        }
        if (!observers[id].hasOwnProperty(callback)) {
            observers[id][callback] = callback;
        }

        return {
            id: id,
            callback: callback
        };
    }

    function unobserve(observer) {
        if (observer) {
            if (observers.hasOwnProperty(observer.id) && observers[observer.id][observer.callback]) {
                delete observers[observer.id][observer.callback];
            }
        }
    }

    observe('api', function (data) {
        if (api_cb.hasOwnProperty(data.guid)) {
            if (typeof api_cb[data.guid] === 'function') {
                api_cb[data.guid].call(null, data.err, data.data, data.timestamp);
            }
            delete api_cb[data.guid];
        }
    });

    window.observe = observe;
    window.unobserve = unobserve;
    window.api = api;
    window.html = html;
    window.guid = GUID;
    window.ws = ws;
    window.ready = ready;

}());