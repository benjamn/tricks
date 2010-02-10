exports.addEvent = document.addEventListener
    ? function(elem, name, handler) {
        handler.apply = handler.apply;
        var wrapper = function(event) {
            if (false === handler.apply(this, arguments))
                event.preventDefault();
        };
        elem.addEventListener(name, wrapper, false);
        return wrapper;
    } : function(elem, name, handler) {
        handler.apply = handler.apply;
        var wrapper = function(event) {
            event = event || window.event; // modifies arguments object
            return handler.apply(this, arguments);
        };
        elem.attachEvent("on" + name, wrapper);
        return wrapper;
    };

exports.removeEvent = document.removeEventListener
    ? function(elem, name, wrapper) {
        elem.removeEventListener(name, wrapper);
    } : function(elem, name, wrapper) {
        elem.detachEvent("on" + name, wrapper);
    };
