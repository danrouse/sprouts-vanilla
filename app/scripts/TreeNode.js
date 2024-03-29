/* global _svgelem */
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
     * lexical head
     *
     * @property head {String}
     **/
    this.head = null;

    /**
     * list of child TreeNodes
     *
     * @property children {Array}
     **/
    this.children = [];

    /**
     * coreferenced node
     *
     * @property coreference {TreeNode}
     **/
    this.coreference = null;

    /**
     * coreference name
     *
     * @property coreferenceName {String}
     **/
    this.coreferenceName = '';

    /**
     * whether this node is a moved trace
     *
     * @property isTrace {Boolean}
     **/
    this.isTrace = false;


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
    addChild: function(options, position) {
        // allow just phrase name to be passed instead of options
        if(typeof options === 'string') {
            options = { type: options, head: '' };
        }

        var child = new TreeNode({ type: options.type, head: options.head, options: this.options, parent: this });
        position = typeof position !== 'undefined' ? position : this.children.length;

        this.children.splice(position, 0, child);
        return child;
    },

    /**
     * removes a child
     *
     * @method removeChild
     * @param position {Number} child index to remove
     * @return this {TreeNode}
     **/
    removeChild: function(position) {
        position = typeof position === 'undefined' ? 0 : position;
        this.children.splice(position, 1);
        return this;
    },

    /**
     * Creates a new TreeNode as a parent of this
     * Moves existing parents up
     *
     * @method addParent
     * @param options {Object}
     * @return newParent {TreeNode}
     **/
    addParent: function(options) {
        // allow just phrase name to be passed instead of options
        if(typeof options === 'string') {
            options = { type: options, head: '' };
        }

        var newParent = new TreeNode({ type: options.type, head: options.head, options: this.options, parent: this.parent });

        // replace the parent's child
        if(this.parent) {
            this.parent.children[this.parent.children.indexOf(this)] = newParent;
        }
        this.parent = newParent;
        newParent.children = [this];

        return newParent;
    },

    /**
     * moves a node into another, leaving a trace
     *
     * @method moveTo
     * @param targetNode {TreeNode} node to move under
     * @param position {Number} child index to insert to
     **/
    moveTo: function(targetNode, position) {
        // add a coreference name
        if(!this.coreferenceName.length) {
            this.coreferenceName = 'i';
        }

        // save a trace and move to target
        var trace = Object.create(this),
            parent = this.parent;

        // populate trace items
        trace.parent = parent;
        trace.head = 't';
        trace.children = [];
        trace.isTrace = true;

        // swap existing references for multiple movements
        if(this.coreference) {
            this.coreference.coreference = trace;
        }

        // add references
        this.coreference = trace;
        trace.coreference = this;
        parent.children[parent.children.indexOf(this)] = trace;

        // adjoin to a head
        if(targetNode.head) {
            targetNode.addChild({ type: targetNode.type, head: targetNode.head });
        }

        // move to target in the tree
        this.parent = targetNode;
        targetNode.children.splice(position || 0, 0, this);

        return this;
    },

    /**
     * Generates CSS from display options.
     * For embedding in an SVG.
     *
     * @method generateCSS
     * @return styleElem {Element}
     **/
    generateCSS: function() {
        var style = document.createElement('style'),
            options = this.options;
        style.setAttribute('type', 'text/css');

        style.innerHTML = '' +
            '.sprouts__label { ' +
                'font-family: ' + options.fonts.node.fontFamily +
                ';font-size: ' + options.fonts.node.fontSize + 'pt' +
                ';fill: ' + options.fonts.node.color +
                ';font-weight: ' + (options.fonts.node.bold ? 'bold' : 'normal') +
                ';font-style: ' + (options.fonts.node.italic ? 'italic' : 'normal') +
            '} ' +
            '.sprouts__head { ' +
                'font-family: ' + options.fonts.head.fontFamily +
                ';font-size: ' + options.fonts.head.fontSize + 'pt' +
                ';fill: ' + options.fonts.head.color +
                ';font-weight: ' + (options.fonts.head.bold ? 'bold' : 'normal') +
                ';font-style: ' + (options.fonts.head.italic ? 'italic' : 'normal') +
            '} ' +
            '.sprouts__line { ' +
                'stroke: ' + options.lineColor +
                ';stroke-width: ' + options.lineWidth +
                ';fill: none' +
            '}';

        return style;
    },

    /**
     * Parses bracketed text into TreeNode objects.
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
            coreferences = {},
            coreference = false,
            trackPhrase = true;

        // compress whitespace
        text = text.replace(/\s+/g, ' ');

        for(var i=0; i<text.length; i++) {
            //console.log('text[i]', i, text[i]);
            // make a new phrase if necessary
            if(trackPhrase && currentPhrase.length &&
               (text[i] === '[' || text[i] === ']' || text[i] === ' ')) {
                //console.log('capture phrase', currentPhrase, currentHead);
                currentPhrase = currentPhrase.trim();
                currentHead = currentHead.trim();

                var underscorePos = currentPhrase.lastIndexOf('_');
                if(underscorePos !== -1) {
                    coreference = currentPhrase.substr(underscorePos + 1);
                    currentPhrase = currentPhrase.substr(0, underscorePos);
                }

                // create root if we need to
                var newObject = currentObject ?
                        currentObject.addChild({ type: currentPhrase, head: currentHead }) :
                        new TreeNode({ type: currentPhrase, head: currentHead, options: this.options, parent: this.parent });

                if(coreference !== false) {
                    if(coreferences[coreference] &&
                       currentPhrase === coreferences[coreference].type) {
                        // both references are found, link them
                        newObject.coreference = coreferences[coreference];
                        coreferences[coreference].coreference = newObject;
                    }

                    coreferences[coreference] = newObject;
                    newObject.coreferenceName = coreference;
                }

                currentObject = newObject;
                currentPhrase = '';
                currentHead = '';
                coreference = false;
            }

            if(text[i] === '[') {
                // bracket opened, start tracking phrase name
                trackPhrase = true;

            } else if(text[i] === ']') {
                // bracket close, apply any captured head
                if(currentHead.length) {
                    currentObject.head = currentHead;
                    if(currentObject.coreference && currentHead === 't') {
                        currentObject.isTrace = true;
                    }
                    currentHead = '';
                }

                // ascend back up tree
                if(currentObject.parent) {
                    currentObject = currentObject.parent;
                }

            } else if(trackPhrase && text[i].match(/\s/)) {
                // start tracking head after space
                trackPhrase = false;
                //console.log('space', currentPhrase, currentHead);

            } else if(trackPhrase) {
                // add to phrase if we're tracking and didn't just make one
                currentPhrase = currentPhrase + text[i];
                //console.log('add to phrase', currentPhrase);
//[TP [DP_1 ^Anyango] [T' [T ne] [VP [DP_1 t] [V' [V opendZo] [CP [TP [T' [T] [PredP [DP [CP [DP mane] [TP [DP] [T' [T ne] [VP [DP] [V' [V ogero] [DP]]]]]] [D ni]] [Pred' [Pred 0] [PP kanye]]]]] [C (ni)]]]]]]
            } else {
                currentHead = currentHead + text[i];
                //console.log('add to head', currentHead);
            }

            // currentPhrase = currentPhrase.trim();
            // currentHead = currentHead.trim();
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
     * Converts this node and its children to bracketed text
     *
     * @method toString
     * @param headsOnly {Boolean} only output heads, no brackets or phrase names
     * @param highlight {Boolean} style output using <span> elements
     * @return bracketed_text {string}
     **/
    toString: function(headsOnly, highlight) {
        var out = '';
        if(!headsOnly) {
            out = highlight ? '<span class="node">' + this.type + '</span>' : this.type;

            if(this.coreferenceName) {
                out += '_' + this.coreferenceName;
            }
        }

        if(this.children.length) {
            // recurse through children
            for(var i in this.children) {
                out += ' ' + this.children[i].toString(headsOnly, highlight);
            }
        } else if(this.head.length) {
            // add head
            var head = this.head;
            if(headsOnly) {
                head = head.replace(/^\^/, '');
            }
            out += ' ' + (highlight ? '<span class="head">' + head + '</span>' : head);
        }

        return headsOnly ? out.trim() : '[' + out + ']';
    },

    /**
     * create an SVG DOM element containing this node
     * and all of its children
     *
     * @method toSVG
     * @param rootNode {TreeNode} root element reference, set upon recursion
     * @return svg {SVGElement} generated SVG
     **/
    toSVG: function(rootNode) {
        var svg = _svgelem('svg'),
            options = this.options,
            labelText = this.type,
            lines = [],
            elemWidth = 0,
            label, head, children, line,
            i;

        // return blank svg if we're ignoring traces
        if(!options.showTraces && this.isTrace) {
            return svg;
        }

        // SVG must be rendered for getBBox to get size
        // the SVG is moved into its parent element when added
        document.body.appendChild(svg);

        // append CSS to the root
        if(!this.parent) {
            svg.appendChild(this.generateCSS());
        }

        // add main label
        label = _svgelem('text', { 'class': 'sprouts__label' });
        if(labelText[labelText.length - 1] === "'" ||
           labelText[labelText.length - 1] === '`') {
            labelText = labelText.substring(0, labelText.length - 1);
            label._attrs({ 'text-decoration': 'overline' });
        }
        label.appendChild(document.createTextNode(labelText));

        // coreference label
        if(this.coreferenceName.length) {
            var corefLabel = _svgelem('tspan', {
                'baseline-shift': 'sub',
                'font-size': '50%'
            });
            corefLabel.appendChild(document.createTextNode(this.coreferenceName));

            label.appendChild(corefLabel);
        }
        svg.appendChild(label);

        var labelBBox = svg.getBBox(),
            labelHeight = labelBBox.height,
            labelWidth = labelBBox.width;

        // render children
        if(this.children.length) {
            children = _svgelem('g', { 'class': 'children' });
            svg.appendChild(children);

            for(i in this.children) {
                // generate children recursively
                var child = this.children[i].toSVG(rootNode || this);
                children.appendChild(child);
                //var childWidth = child.getBBox().width;
                var childWidth = child.width.baseVal.value;

                // Position the child adjacent to any existing siblings
                child._attrs({
                    'x': elemWidth,
                    'y': options.nodeSpacingY
                });

                // create connecting line at top center of child
                line = _svgelem('line');
                line._attrs({
                    'class': 'sprouts__line',

                    'x1': elemWidth + (childWidth / 2),
                    'y1': options.nodeSpacingY - options.linePadding
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
                elemWidth += childWidth + (i < this.children.length - 1 ? options.nodeSpacingX : 0);
            }

        } else if(this.head.length) {
            // no children, but there is a lexical head to display
            head = _svgelem('text', { 'class': 'sprouts__head' });

            // traces are italic
            if(this.isTrace) {
                head._attrs({
                    'style': 'font-style: ' +
                        (options.fonts.head.italic ? 'normal' : 'italic') +
                        ' !important'
                });
            }

            var hasConnector = options.headLines,
                hasTriangle = false,
                headText = this.head;

            // carets trigger explicit triangles
            if(headText[0] === '^') {
                hasConnector = hasTriangle = true;
                // remove caret from text
                headText = headText.substring(1);
            } else if(this.type[this.type.length - 1] === 'P' &&
                      this.type.length > 1 &&
                      options.lazyTriangles) {
                // lazy triangles triggered for any node ending in P
                hasConnector = hasTriangle = true;
            }

            // no connectors for traces
            if(this.isTrace) {
                hasConnector = hasTriangle = false;
            }

            if(headText === '0') {
                // replace 0 with null symbol (convenience)
                headText = '\u2205';
            }

            // create and measure head
            head.appendChild(document.createTextNode(headText));
            svg.appendChild(head);

            var headBBox = head.getBBox(),
                headWidth = headBBox.width,
                headHeight = headBBox.height,
                nodeWidth = Math.max(labelWidth, headWidth),
                centerX = nodeWidth / 2;

            // position head under label and connectors
            head._attrs({
                'x': centerX - (headWidth / 2),
                'y': labelHeight + (headHeight * (hasConnector ? 2 : 1))
            });

            // lazy linguist triangles
            if(hasTriangle) {
                var triangle = _svgelem('polygon', { 'class': 'sprouts__line' });
                var points = [[0, labelHeight + headHeight],
                              [nodeWidth, labelHeight + headHeight],
                              [centerX, labelHeight]];
                triangle._attrs({
                    'points': points.reduce(function(str,val) {
                        return str + ' ' + val.join(',');
                    })
                });
                svg.appendChild(triangle);
            } else if(hasConnector) {
                // connect head with line
                line = _svgelem('line', {
                    'class': 'sprouts__line',
                    'x1': centerX,
                    'x2': centerX,
                    'y1': labelHeight,
                    'y2': labelHeight + headHeight
                });
                svg.appendChild(line);
            }            
        }

        // get total width (label + children) and center label
        var bbox = svg.getBBox(),
            width = bbox.width,
            height = bbox.height;
        label._attrs({
            'text-anchor': 'middle',
            'x': width / 2,
            'y': labelHeight * 0.8
        });

        // point lines towards center
        for(i in lines) {
            lines[i]._attrs({
                'x2': width / 2,
                'y2': labelHeight + options.linePadding
            });
        }

        // create or update lines for movement
        if(!rootNode) {
            // this is the root node, create the lines
            if(this.corefCache && this.corefCache.length) {
                // make arrow end marker def
                var defs = _svgelem('defs'),
                    marker = _svgelem('marker', {
                        'id': 'sprouts-arrow-marker',
                        'viewBox': '0 0 10 10',
                        'refX': 1, 'refY': 5,
                        'markerUnits': 'strokeWidth',
                        'markerWidth': 5, 'markerHeight': 5,
                        'orient': 'auto'
                    }),
                    markerPath = _svgelem('path', {
                        'd': 'M 0 0 L 10 5 L 0 10 z'
                    });
                marker.appendChild(markerPath);
                defs.appendChild(marker);
                svg.appendChild(defs);

                for(i in this.corefCache) {
                    // get real x/y of each item
                    var realCoords = [];
                    for(var j in this.corefCache[i]) {
                        var ref = this.corefCache[i][j],
                            //size = ref.svg.getBBox(),
                            size = { width: ref.svg.width.baseVal.value, height: ref.svg.height.baseVal.value },
                            x = 0,
                            y = 0;

                        while(ref.parent) {
                            x += parseFloat(ref.svg.getAttribute('x'));
                            y += parseFloat(ref.svg.getAttribute('y'));
                            ref = ref.parent;
                        }
                        realCoords[j] = [x + size.width / 2, y + size.height];
                    }

                    // setup arc
                    var sweep = (realCoords[0][0] > realCoords[1][0]) ? 1 : 0,
                        rx = Math.abs(realCoords[0][0] - realCoords[1][0]) / 2,
                        ry = Math.abs(realCoords[0][1] - realCoords[1][1]) || options.nodeSpacingY;

                    var movementLine = _svgelem('path', {
                        'class': 'sprouts__line',
                        'd': 'M' + realCoords[0][0] + ',' + realCoords[0][1] +
                             //'Q' + rx + ',' + Math.max(realCoords[0][1], realCoords[1][1]) + ' ' + realCoords[1][0] + ',' + realCoords[1][1] +
                             ' A' + rx + ',' + ry + ' 0 0,' + sweep + ' ' + realCoords[1][0] + ',' + realCoords[1][1] +
                            // arrow
                            //' l5,5 -5,-5 -5,5, 10,0'
                            ''
                    });
                    svg.appendChild(movementLine);

                    // add a circle around moved pieces with constituents
                    if(this.corefCache[i][1].children.length) {
                        var circle = _svgelem('path', {
                            'class': 'sprouts__line',
                            'style': 'opacity: .5',
                            'd': 'M' + realCoords[1][0] + ',' + realCoords[1][1] +
                                 ' A' + (size.width / 1.5) + ',' + (size.height / 2) + ' 0 0,1 ' + realCoords[1][0] + ',' + (realCoords[1][1] - size.height - options.fonts.node.fontSize) +
                                 ' A' + (size.width / 1.5) + ',' + (size.height / 2) + ' 0 0,1 ' + realCoords[1][0] + ',' + (realCoords[1][1])
                        });
                        svg.appendChild(circle);
                    } else {
                        // add an arrow pointing to moved heads
                        movementLine._attrs({ 'marker-end': 'url(#sprouts-arrow-marker)' });
                    }
                }
                // recalculate size
                var newBBox = svg.getBBox();
                width = newBBox.width;
                height = newBBox.height;
            }

            // clear the cache
            this.corefCache = [];
        } else if(this.isTrace) {
            // add coreferences to cache
            if(!rootNode.corefCache) {
                rootNode.corefCache = [];
            }
            rootNode.corefCache.push([this, this.coreference]);
        } else if(this.coreference) {
            // non-trace coreference
        }

        // explicitly state final size
        svg._attrs({
            width: width,
            height: height
        });

        // cyclical reference for accessing from the DOM
        svg.treeNode = this;

        // save a local copy
        this.svg = svg;

        return svg;
    },

    /**
     * Creates a PNG image based on a generated SVG
     * Asynchronous, needs a callback
     *
     * @method toPNG
     * @param {Function} callback function to run when PNG is ready
     * @return image {String} dataURL image/png
     **/
    toPNG: function(callback) {
        if(!this.svg) {
            this.toSVG();
        }

        var bbox = this.svg.getBBox(),
            img = new Image();

        // make image from svg
        var xml = '<svg xmlns="http://www.w3.org/2000/svg" width="' + bbox.width +
            '" height="' + bbox.height + '">' + this.svg.innerHTML + '</svg>';

        var canvas = document.createElement('canvas');
        canvas.width = bbox.width;
        canvas.height = bbox.height;
        var ctx = canvas.getContext('2d');
        
        // blit image to canvas
        img.onload = function() {
                ctx.drawImage(img, 0, 0);
                callback(canvas.toDataURL('image/png'));
        };
        img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(xml);
    }
};