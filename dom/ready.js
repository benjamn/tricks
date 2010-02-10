// Adapted from http://code.jquery.com/jquery-1.4.1.js

var events = require("./events"),
    addEvent = events.addEvent,
    removeEvent = events.removeEvent,
    isReady,
    readyBound;

// The DOM ready check for Internet Explorer
function doScrollCheck() {
	if (isReady)
		return;
	try {
		// If IE is used, use the trick by Diego Perini
		// http://javascript.nwbox.com/IEContentLoaded/
		document.documentElement.doScroll("left");
	} catch (x) {
		setTimeout(doScrollCheck, 10);
		return;
	}
	// and execute any waiting functions
	ready();
}

function bindReady() {
    if (readyBound)
        return;
    readyBound = true;

    if (document.readyState === "complete")
        return ready();

    var DOMContentLoaded;
    
    if (document.addEventListener) {
        DOMContentLoaded = addEvent(document, "DOMContentLoaded", function() {
		    removeEvent(document, "DOMContentLoaded", DOMContentLoaded);
            ready();
	    });
    } else {
        DOMContentLoaded = addEvent(document, "readystatechange", function() {
		    // Make sure body exists, at least, in case IE gets a little
            // overzealous (ticket #5443).
		    if (document.readyState === "complete")
                removeEvent(document, "readystatechange", DOMContentLoaded);
            ready();
		});
        // If IE and not a frame continually check to see if the document
        // is ready:
        try { var toplevel = !!window.frameElement } catch (x) {}
        if (document.documentElement.doScroll && toplevel)
            doScrollCheck();
	}
    // Fail-safe fallback:
    addEvent(window, "load", ready);
}

var readyList = [];

function ready() {
	if (isReady)
        return;

    // Make sure body exists, at least, in case IE gets a little
    // overzealous (ticket #5443).
	if (!document.body)
		return setTimeout(ready, 10);

	isReady = true;

    while (readyList.length) try {
        readyList.shift().call(document);
    } catch (x) {}
}

exports.whenReady = function(fn) {
    bindReady();
    fn.call = fn.call;
    isReady ? fn.call(document)
            : readyList[readyList.length] = fn;
};
