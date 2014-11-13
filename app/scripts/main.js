'use strict';

// default tree options
var defaults = {
    nodeFontFamily: 'Arial',
    nodeFontSize: 16,
    nodeFontColor: '#9b1d00',
    nodeFontBold: true,
    nodeFontItalic: false,
    headFontFamily: 'Times New Roman',
    headFontSize: 10,
    headFontColor: '#2e1a06',
    headFontBold: false,
    headFontItalic: true,
    nodeSpacingY: 50,
    nodeSpacingX: 12,
    linePadding: 2,
    lineWidth: 2,
    lineColor: '#83d935'
};

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

// single node object
// generates its own SVG recursively
//var TreeNode = function(nodeType, content, options, parent) {
var TreeNode = function(options) {
    this.options = options.options;
    this.parent = options.parent;
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

    removeChild: function(position) {
        this.children.splice(position, 1);
    },

    // parses bracketed text into TreeNode objects
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

    // convert this node and its children into bracketed text
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

    // create an SVG DOM element containing this node and all its children
    toSVG: function(depth) {
        depth = depth || 1;

        var svg = _svgelem('svg'),
            lines = [],
            elemWidth = 0,
            label, head, children,
            i;

        // SVG must be rendered for getBBox to get size
        // (? i'd like to remove this later but it doesn't
        //  appear to be in the DOM?)
        $('body').append(svg);

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
                var child = this.children[i].toSVG(depth + 1);
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
        //console.log('reference is', this.svg.treeNode);


        return svg;
    }
};

// tree master object
// provides a root object, text parser, and writes the product to the DOM
var Tree = function(contents, initialOptions) {
    // populate options with defaults if necessary
    var options = this.options = initialOptions || {};

    for(var key in defaults) {
        if(typeof options[key] === 'undefined') {
            options[key] = defaults[key];
        }
    }

    // DOM containers
    this.treeElement = document.getElementById('sprouts-tree');
    this.textElement = document.getElementById('sprouts-text');

    // initialize the tree
    this.root = this.selectedNode = new TreeNode({
        fromString: contents,
        options: options
    });

    this.draw(options.noTextUpdate);
};
Tree.prototype = {
    // converts internal Tree structure to bracketed text
    toString: function() {
        return this.root.toString();
    },

    // generates SVG and updates the page
    draw: function(fromText) {
        // replace SVG on the page
        var svg = this.root.toSVG();

        if(this.treeElement.children.length) {
            this.treeElement.firstChild.remove();
        }
        this.treeElement.appendChild(svg);

        // bind UI events
        var that = this;
        svg.onclick = function(event) {
            // remove previous selection
            if(this.selectedNode) {
                this.selectedNode.svg.classList.remove('selected');
            }

            // find first svg parent of click event target
            var target = event.target;
            while(target.nodeName !== 'svg') {
                target = target.parentNode;
            }

            console.log('target node', target.treeNode);

            // select target node
            that.selectedNode = target.treeNode;
            that.textElement.value = target.treeNode.toString();

            target.classList.add('selected');
        };

        // update text view if not from text update
        if(!fromText) {
            this.textElement.value = this.root.toString();
        }
    }
};

// entry point (DOM ready)
jQuery(function() {
    // make a basic tree
    var tree = new Tree('[XP [YP [ZP [Z foo]]] [WP [FP [XX [X bar]] [AF]]] [WP] [WP]]');

    // post initial settings to DOM
    var elem;
    for(var key in defaults) {
        elem = document.getElementsByName('settings_' + key);
        if(elem.length) {
            if(elem[0].type === 'checkbox') {
                elem[0].checked = defaults[key];
            } else if(elem[0].nodeName === 'SELECT') {
                elem[0].querySelector('[value="' + defaults[key] + '"]').selected = true;
            } else {
                elem[0].value = defaults[key];
            }
        } else {
            console.log('no DOM element for setting', key);
        }
    }

    // settings handlers
    $('.setting').on('change', function() {
        // remove 'settings_' from name for options key
        var value = this.value;
        if(this.type === 'number' || this.type === 'range') {
            value = parseFloat(value);
        } else if(this.type === 'checkbox') {
            value = this.checked;
        }
        tree.options[this.name.substr(9)] = value;
        tree.draw(true);
    });

    // databind the tree contents text input
    $('#sprouts-text').on('keyup', function() {
        var parent = tree.selectedNode.parent;

        // create new node from contents
        var newNode = new TreeNode({
            fromString: this.value,
            options: tree.options
        });

        // replace reference in the parent
        for(var i in parent.children) {
            if(parent.children[i] === tree.selectedNode) {
                parent.children[i] = newNode;
            }
        }

        // reference parent in the new node
        newNode.parent = parent;

        // update selection and redraw
        tree.selectedNode = newNode;
        tree.draw(true);
    });
});