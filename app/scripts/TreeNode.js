'use strict';

/**
 * Self-contained syntax tree node
 *
 * @class TreeNode
 * @constructor
 * @param options {Object} display options
 **/
var TreeNode = function(options) {
    /**
     * display options
     *
     * @property options {Object}
     **/
    this.options = options.options;

    /**
     * this node's parent
     *
     * @property parent {TreeNode}
     **/
    this.parent = options.parent;

    /**
     * list of child TreeNodes
     *
     * @property children {Array}
     **/
    this.children = [];

    var fromString = options.fromString || '';

    if(fromString.length) {
        // generate from bracketed string
        return this.fromString(fromString);
    } else {
        this.type = options.type;
        this.head = options.head;
    }
};

TreeNode.prototype = {
    /**
     * create a new TreeNode as a child of this one
     *
     * @method addChild
     * @param options {Object}
     * @return child {TreeNode}
     **/
    addChild: function(options) {
        // allow just phrase name to be passed instead of options
        if(typeof options === 'string') {
            options = { type: options, head: '' };
        }

        var child = new TreeNode({ type: options.type, head: options.head, options: this.options, parent: this });
        var position = options.position || this.children.length;

        this.children.splice(position, 0, child);
        return child;
    },

    /**
     * removes a child
     *
     * @method removeChild
     * @param position {Number} child index to remove
     **/
    removeChild: function(position) {
        position = typeof position === 'undefined' ? 0 : position;
        this.children.splice(position, 1);
    },

    /**
     * parses bracketed text into TreeNode objects
     * with this object's options
     *
     * @method fromString
     * @param text {String} bracketed text
     * @return node {TreeNode} root node of parsed content
     **/
    fromString: function(text) {
        // match the phrase type and its contents
        var currentObject,
            currentPhrase = '',
            currentHead = '',
            trackPhrase = true;

        for(var i=0; i<text.length; i++) {

            // make a new phrase if necessary
            if(trackPhrase && currentPhrase.length &&
               (text[i] === '[' || text[i] === ']' || text[i] === ' ')) {
                // create root if we need to
                var newObject = currentObject ?
                        currentObject.addChild({ type: currentPhrase, head: currentHead }) :
                        new TreeNode({ type: currentPhrase, head: currentHead, options: this.options, parent: this.parent });

                currentObject = newObject;
                currentPhrase = '';
            }

            if(text[i] === '[') {
                // bracket opened, start tracking phrase name
                trackPhrase = true;

            } else if(text[i] === ']') {
                // bracket close, apply any captured head
                if(currentHead.length) {
                    currentObject.head = currentHead;
                    currentHead = '';
                }

                // ascend back up tree
                if(currentObject.parent) {
                    currentObject = currentObject.parent;
                }

            } else if(text[i] === ' ') {
                // start tracking head after space
                trackPhrase = false;

            } else if(trackPhrase) {

                // add to phrase if we're tracking and didn't just make one
                currentPhrase = currentPhrase + text[i];
            } else {

                currentHead = currentHead + text[i];
            }

            currentPhrase = currentPhrase.trim();
            currentHead = currentHead.trim();
        }

        // ascend back up if we need to
        // this should only happen with mismatched brackets?
        // (untested)
        while(typeof currentObject.parent !== 'undefined') {
            currentObject = currentObject.parent;
        }
        
        return currentObject;
    },

    /**
     * convert this node and its children to bracketed text
     *
     * @method toString
     * @return bracketed_text {string}
     **/
    toString: function() {
        var out = '[' + this.type;

        if(this.children.length) {
            // recurse through children
            for(var i in this.children) {
                out += ' ' + this.children[i].toString();
            }
        } else if(this.head.length) {
            // add head
            out += ' ' + this.head;
        }

        return out + ']';
    },

    /**
     * create an SVG DOM element containing this node
     * and all of its children
     *
     * @method toSVG
     * @return svg {SVGElement} generated SVG
     **/
    toSVG: function() {
        var svg = _svgelem('svg'),
            lines = [],
            elemWidth = 0,
            label, head, children,
            i;

        // SVG must be rendered for getBBox to get size
        // the SVG is moved into its parent element when added
        document.body.appendChild(svg);

        // add main label
        label = _svgelem('text', {
            'class': 'sprouts__label',
            'font-family': this.options.nodeFontFamily,
            'font-size': this.options.nodeFontSize,
            'fill': this.options.nodeFontColor,
            'font-weight': this.options.nodeFontBold ? 'bold' : 'normal',
            'font-style': this.options.nodeFontItalic ? 'italic' : 'normal'
        });
        label.appendChild(document.createTextNode(this.type));
        svg.appendChild(label);

        var labelY = svg.getBBox().height;
        var labelWidth = svg.getBBox().width;

        // render children
        if(this.children.length) {
            children = _svgelem('g', { 'class': 'children' });
            svg.appendChild(children);

            for(i in this.children) {
                // Generate children recursively
                var child = this.children[i].toSVG();
                children.appendChild(child);
                var childWidth = child.getBBox().width;

                // Position the child adjacent to any existing siblings
                child._attrs({
                    'x': elemWidth,
                    'y': this.options.nodeSpacingY
                });

                // create first point of connecting line at top center of child
                var line = _svgelem('line');
                line._attrs({
                    'class': 'sprouts__line',
                    'stroke': this.options.lineColor,
                    'stroke-width': this.options.lineWidth,
                    'x1': elemWidth + (childWidth / 2),
                    'y1': this.options.nodeSpacingY - this.options.linePadding
                });
                lines.push(line);
                svg.appendChild(line);

                // re-center child + line if this is the only child
                // and it's thinner than its parent
                if(this.children.length === 1 && childWidth < labelWidth) {
                    child._attrs({ 'x': (labelWidth - childWidth) / 2 });
                    line._attrs({ 'x1': ((labelWidth - childWidth) / 2) + (childWidth / 2) });
                }

                // increase total width, add x-padding if not the last item
                elemWidth += childWidth + (i < this.children.length - 1 ? this.options.nodeSpacingX : 0);
            }

        } else if(this.head.length) {
            // no children, but there is a lexical head to display
            head = _svgelem('text', {
                'class': 'sprouts__head',
                'font-family': this.options.headFontFamily,
                'font-size': this.options.headFontSize,
                'fill': this.options.headFontColor,
                'font-weight': this.options.headFontBold ? 'bold' : 'normal',
                'font-style': this.options.headFontItalic ? 'italic' : 'normal'
            });
            head.appendChild(document.createTextNode( this.head ));
            svg.appendChild(head);
        }        

        // get total width (label + children) and center label
        var bbox = svg.getBBox();
        label._attrs({
            'alignment-baseline': 'text-before-edge',
            'text-anchor': 'middle',
            'x': bbox.width / 2
        });

        // point lines towards center
        for(i in lines) {
            lines[i]._attrs({
                'x2': bbox.width / 2,
                'y2': labelY + this.options.linePadding
            });
        }

        // move lexical head under label as well
        if(head) {
            head._attrs({
                'alignment-baseline': 'hanging',
                'y': labelY + 2 // 2px static y padding to avoid cutoff
            });

            // make the svg slightly taller to account for the 2 units of padding we need
            // recalc bbox height for moved text
            bbox.height = svg.getBBox().height + 2;
        }

        // explicitly state final size (we can scale later)
        svg._attrs({
            width: bbox.width,
            height: bbox.height
        });

        // cyclical reference for accessing from the DOM
        svg.treeNode = this;

        // save a local copy
        this.svg = svg;

        return svg;
    },

    /**
     * create a PNG image based on a generated SVG
     *
     * @method toPNG
     **/
    toPNG: function() {
        if(!this.svg) {
            this.toSVG();
        }
        var svg = this.svg;
    }
};