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

// single node object
// generates its own SVG recursively
var TreeNode = function(nodeType, content, options, parent) {
	this.type = nodeType;
	this.children = [];
	this.content = content || '';
	this.options = options;
	this.parent = parent;

	this.addChild = function(childType, childContent, position) {
		var child = new TreeNode(childType, childContent, this.options, this);
		position = position || this.children.length;

		this.children.splice(position, 0, child);
		return child;
	};

	this.removeChild = function(position) {
		this.children.splice(position, 1);
	};

	// convert this node and its children into bracketed text
	this.toString = function() {
		var out = '[' + this.type;

		if(this.children.length) {
			// recurse through children
			for(var i in this.children) {
				out += ' ' + this.children[i].toString();
			}
		} else if(this.content.length) {
			// add head
			out += ' ' + this.content;
		}

		return out + ']';
	};

	// create an SVG DOM element containing this node and all its children
	this.toSVG = function(depth) {
		depth = depth || 1;

		var svg = _svgelem('svg'),
			lines = [],
			elemWidth = 0,
			i;

		// SVG must be rendered for getBBox to get size
		// (? i'd like to remove this later but it doesn't
		//  appear to be in the DOM?)
		$('body').append(svg);

		// add main label
		var label = _svgelem('text', { 'class': 'sprouts__label' });
		label.appendChild(document.createTextNode(this.type));
		svg.appendChild(label);

		var labelY = svg.getBBox().height;
		var labelWidth = svg.getBBox().width;

		// render children
		if(this.children.length) {
			var children = _svgelem('g', { 'class': 'children' });
			svg.appendChild(children);

			for(i in this.children) {
				// Generate children recursively
				var child = this.children[i].toSVG(depth + 1);
				children.appendChild(child);
				var childWidth = child.getBBox().width;

				// Position the child adjacent to any existing siblings
				child._attrs({
					'x': elemWidth,
					'y': options.nodeSpacingY
				});

				// create first point of connecting line at top center of child
				var line = _svgelem('line');
				line._attrs({
					'stroke': options.lineColor,
					'stroke-width': options.lineWidth,
					'x1': elemWidth + (childWidth / 2),
					'y1': options.nodeSpacingY - options.linePadding
				});
				lines.push(line);
				svg.appendChild(line);

				// re-center child + line if this is the only child
				// and it's thinner than its parent
				if(this.children.length === 1 && childWidth < labelWidth) {
					child._attrs({ 'x': (labelWidth - childWidth) / 2 });
					line._attrs({ 'x1': ((labelWidth - childWidth) / 2) + (childWidth / 2) })
				}

				// increase total width, add x-padding if not the last item
				elemWidth += childWidth + (i < this.children.length - 1 ? options.nodeSpacingX : 0);
			}

		} else if(this.content.length) {
			// no children, but there is a lexical head to display
			var head = _svgelem('text', { 'class': 'sprouts__head' });
			head.appendChild(document.createTextNode( this.content ));
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
				'y2': labelY + options.linePadding
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

		// quick reference to node type for debugging
		svg._nodeType = this.type;

		return svg;
	};
};

// tree master object
// provides a root object, text parser, and writes the product to the DOM
var Tree = function(contents, initialOptions) {
	var options = this.options = initialOptions || {};

	options.nodeSpacingY = typeof options.nodeSpacingY !== 'undefined' ? options.nodeSpacingY : 50;
	options.nodeSpacingX = typeof options.nodeSpacingX !== 'undefined' ? options.nodeSpacingX : 12;
	options.linePadding = typeof options.linePadding !== 'undefined' ? options.linePadding : 2;
	options.lineWidth = typeof options.lineWidth !== 'undefined' ? options.lineWidth : 2;
	options.lineColor = options.lineColor || '#333333';


	this.treeElement = document.getElementById('sprouts-tree');
	this.textElement = document.getElementById('sprouts-text');

	// parses bracketed text into TreeNode objects
	this.fromString = function(text) {
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
				var newObject = currentObject
						? currentObject.addChild(currentPhrase, currentHead)
						: new TreeNode(currentPhrase, currentHead, this.options);

				currentObject = newObject;
				currentPhrase = '';
			}

			if(text[i] === '[') {
				// bracket opened, start tracking phrase name
				trackPhrase = true;

			} else if(text[i] === ']') {
				// bracket close, apply any captured head
				if(currentHead.length) {
					currentObject.contents = currentHead;
					currentHead = '';
				}

				// ascend back up tree
				if(currentObject.parent) {
					currentObject
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
	};

	// converts internal Tree structure to bracketed text
	this.toString = function() {
		return this.root.toString();
	};

	this.draw = function(fromText) {
		// replace SVG on the page
		var svg = this.root.toSVG();

		if(this.treeElement.sproutsSVG) {
			this.treeElement.replaceChild(svg, this.treeElement.sproutsSVG);
		} else {
			this.treeElement.appendChild(svg);
		}
		this.treeElement.sproutsSVG = svg;

		// update text view if not from text update
		if(!fromText) {
			this.textElement.value = this.root.toString();
		}
	};

	// initialize
	if(contents.length) {
		this.root = this.fromString(contents);
	} else {
		this.root = new TreeNode('XP', null, options);
	}
	this.draw(options.noTextUpdate);
	console.log('new tree', this.root);
};


// entry point (DOM ready)
jQuery(function() {
	// make a basic tree
	var tree = new Tree("[XP [YP [ZP [Z foo]]] [WP [FP [XX [X bar]] [AF]]] [WP] [WP]]");

	//var X = tree.root.addChild('X', 'test');
	// var YP = tree.root.addChild('YP');
	// var WP = tree.root.addChild('WP');
	// var FP = WP.addChild('FP');
	// var XX = FP.addChild('XX');
	// XX.addChild('X', 'bar');
	// FP.addChild('AF');
	// tree.root.addChild('WP');
	// tree.root.addChild('WP');

	// var ZP = YP.addChild('ZP');
	// var Z = ZP.addChild('Z', 'foo');

	// settings handlers
	$('.setting').on('change', function(event) {
		console.log('setting change', event);
	});

	// databind the tree contents text input
	$('#sprouts-text').on('keyup', function(event) {
		tree = new Tree(this.value, { noTextUpdate: true });
	});
});