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