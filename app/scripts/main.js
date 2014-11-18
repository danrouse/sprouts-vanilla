/* global TreeNode, UserInterface */
'use strict';

(function() {
    // default tree options
    var defaults = {
        fonts: {
            node: {
                fontFamily: 'Times New Roman',
                fontSize: 12,
                color: '#2e1a06',
                bold: false,
                italic: false
            },
            head: {
                fontFamily: 'Arial',
                fontSize: 10,
                color: '#9b1d00',
                bold: false,
                italic: false
            }
        },

        nodeSpacingY: 32,
        nodeSpacingX: 12,
        linePadding: 0,
        lineWidth: 2,
        lineColor: '#2e1a06',
        headLines: true,
        lazyTriangles: false,
        showTraces: true
    };

    //var sampleSentence = '[VP [VP [V Draw][NP [NP_0 Sprouts][NP ^syntax trees]][PP [P with][NP_0 t]]]';
    var sampleSentence = "[TP [DP_1 ^aɲaŋgo] [T' [T ne] [VP [DP_1 t] [V' [V opɛndʒo] [CP [C (ni)] [TP [T 0] [PredP [AgrP [CP_1 [DP_2 ^ɔt mane] [TP [DP_0 ^otiɛno] [T' [T ne] [VP [DP_0 t] [V' [V ogɛro] [DP_2 t]]]]]] [Agr' [Agr 0] [DP [D' [D ni] [CP_1 t]]]]] [Pred' [Pred 0] [PP kaɲe]]]]]]]]]";

    // make a basic tree
    var hash = window.location.hash.substr(1);
    var tree = new TreeNode({
            fromString: hash || sampleSentence,
            options: defaults }),
        UI = new UserInterface(tree);
})();