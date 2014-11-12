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
var TreeNode = function(nodeType, content, options) {
	this.type = nodeType;
	this.children = [];
	this.content = content;
	this.options = options;

	this.addChild = function(childType, childContent, position) {
		var child = new TreeNode(childType, childContent, this.options);
		position = position || this.children.length;

		this.children.splice(position, 0, child);
		return child;
	};

	this.removeChild = function(position) {
		this.children.splice(position, 1);
	};

	this.generateSVG = function(depth) {
		depth = depth || 1;
		console.log('generating node', this.type, 'depth', depth);

		var svg = _svgelem('svg'),
			lines = [],
			elemWidth = 0,
			i;

		// SVG must be rendered for getBBox to get size
		$('body').append(svg);

		// Render children first
		if(this.children.length) {
			var children = _svgelem('g', { 'class': 'children' });
			svg.appendChild(children);

			for(i in this.children) {
				// Generate children recursively
				var child = this.children[i].generateSVG(depth + 1);
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

				// increase total width, add x-padding if not the last item
				elemWidth += childWidth + (i < this.children.length - 1 ? options.nodeSpacingX : 0);
			}

		} else if(this.content) {
			// no children, but there is a lexical head to display
			var head = _svgelem('text', { 'class': 'sprouts__head' });
			head.appendChild(document.createTextNode( this.content ));
			svg.appendChild(head);
		}

		// add main label
		var label = _svgelem('text', { 'class': 'sprouts__label' });
		label.appendChild(document.createTextNode(this.type));
		svg.appendChild(label);

		// get total width (label + children) and center label
		var bbox = svg.getBBox();
		label._attrs({
			'alignment-baseline': 'text-before-edge',
			'text-anchor': 'middle',
			'x': bbox.width / 2
		});

		// point lines towards center
		var labelY = label.getBBox().height;
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
			bbox.height += 2;
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
	this.parse = function(text) {
		// // strip surrounding brackets
		// if(text[0] === '[' && text[text.length - 1] === ']') {
		// 	text = text.substr(1, text.length - 2);
		// }

		// match the phrase type and its contents
		var matches = text.match(/^\[?([^\[\s]+)\s*(.+)\]?$/);
		console.log('text', text, matches);
	};

	this.draw = function() {
		$('#syntax_tree').replaceWith(this.root.generateSVG());
	};

	// initialize
	var options = this.options = initialOptions || {};

	options.nodeSpacingY = typeof options.nodeSpacingY !== 'undefined' ? options.nodeSpacingY : 50;
	options.nodeSpacingX = typeof options.nodeSpacingX !== 'undefined' ? options.nodeSpacingX : 12;
	options.linePadding = typeof options.linePadding !== 'undefined' ? options.linePadding : 2;
	options.lineWidth = typeof options.lineWidth !== 'undefined' ? options.lineWidth : 2;
	options.lineColor = options.lineColor || '#333333';

	this.root = new TreeNode('XP', null, options);

	this.parse(contents);
};

// entry point (DOM ready)
jQuery(function() {
	// make a basic tree
	var tree = new Tree("[DP [D' [D the][^NP man]]]");

	//var X = tree.root.addChild('X', 'test');
	var YP = tree.root.addChild('YP');
	var WP = tree.root.addChild('WP');
	var FP = WP.addChild('FP');
	var XX = FP.addChild('XX');
	XX.addChild('X', 'bar');
	FP.addChild('AF');
	tree.root.addChild('WP');
	tree.root.addChild('WP');

	var ZP = YP.addChild('ZP');
	var Z = ZP.addChild('Z', 'foo');

	tree.draw();
});