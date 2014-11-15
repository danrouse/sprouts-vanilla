/* global TreeNode, UserInterface */
'use strict';

(function() {
    // default tree options
    var defaults = {
        fonts: {
            node: {
                fontFamily: 'Open Sans',
                fontSize: 18,
                color: '#2e1a06',
                bold: false,
                italic: false
            },
            head: {
                fontFamily: 'Open Sans',
                fontSize: 12,
                color: '#9b1d00',
                bold: false,
                italic: false
            }
        },

        nodeSpacingY: 50,
        nodeSpacingX: 12,
        linePadding: 0,
        lineWidth: 2,
        lineColor: '#2e1a06',
        headLines: true,
        lazyTriangles: false,
        showTraces: true
    };

    // make a basic tree
    var tree = new TreeNode({
            fromString: '[VP [VP [V Draw][NP [NP_0 Sprouts][NP ^syntax trees]][PP [P with][NP_0 t]]]',
            options: defaults });
    new UserInterface(tree);
})();