// Adapted from http://code.jquery.com/jquery-1.4.1.js

var isReady,
    readyBound,
    DOMContentLoaded;

// Cleanup functions for the document ready method
if (document.addEventListener) {
	DOMContentLoaded = function() {
		document.removeEventListener("DOMContentLoaded",
                                     DOMContentLoaded,
                                     false);
        ready();
	};  
} else if (document.attachEvent) {
	DOMContentLoaded = function() {
		// Make sure body exists, at least, in case IE gets a little
        // overzealous (ticket #5443).
		if (document.readyState === "complete") {
			document.detachEvent("onreadystatechange", DOMContentLoaded);
            ready();
		}
	};
}
    
// The DOM ready check for Internet Explorer
function doScrollCheck() {
	if (isReady)
		return;
	try {
		// If IE is used, use the trick by Diego Perini
		// http://javascript.nwbox.com/IEContentLoaded/
		document.documentElement.doScroll("left");
	} catch (x) {
		setTimeout(doScrollCheck, 1);
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

    if (document.addEventListener) {
        document.addEventListener("DOMContentLoaded",
                                  DOMContentLoaded,
                                  false);
        // A fallback to window.onload that will always work.
        window.addEventListener("load", ready, false);
    } else if (document.attachEvent) {
        // ensure firing before onload,
        // maybe late but safe also for iframes
        document.attachEvent("onreadystatechange",
                             DOMContentLoaded);
        // A fallback to window.onload that will always work.
        window.attachEvent("onload", ready);

        // If IE and not a frame
        // continually check to see if the document is ready
        var toplevel = false;

        try { toplevel = window.frameElement == null }
        catch (x) {}

        if (document.documentElement.doScroll && toplevel)
            doScrollCheck();
    }
}

var readyList = [];

function ready() {
	if (isReady)
        return;

    // Make sure body exists, at least, in case IE gets a little
    // overzealous (ticket #5443).
	if (!document.body)
		return setTimeout(ready, 13);

	isReady = true;

    while (readyList.length) try {
        readyList.shift().call(document);
    } catch (x) {}
}

exports.whenReady = function(fn) {
    bindReady();
    if (isReady)
        fn.call(document);
    else
        readyList[readyList.length] = fn;
};
