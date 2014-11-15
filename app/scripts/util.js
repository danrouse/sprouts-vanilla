/* exported _svgelem, _download, _listen */
'use strict';

// wrapper around SVG+child element creation
// jQuery can't handle the namespace issues
// provides elem._attrs({}) to set html attributes from an object
function _svgelem(tag, initialAttrs) { 
    var elem = document.createElementNS('http://www.w3.org/2000/svg', tag);

    elem._attrs = function(attrs) {
        for(var attr in attrs) {
            elem.setAttributeNS(null, attr, attrs[attr]);
        }
    };

    if(initialAttrs) {
        elem._attrs(initialAttrs);
    }

    return elem;
}

// trigger a download of a data URI
function _download(data, filename) {
    var link = document.createElement('a');
    link.setAttribute('href', data);
    link.setAttribute('download', filename);
    link.click();
}

// bind multiple events
function _listen(elems, events, listener) {
    events = events.split(' ');
    if(!elems.length) {
        elems = [elems];
    }
    for(var i=0; i<elems.length; i++) {
        for(var j in events) {
            elems[i].addEventListener(events[j], listener);
        }
    }
}