$(document).ready(function () {

    function getAnchorName(i, heading, prefix) {
        var name = prefix;
        if (heading.id) {
            name += heading.id;
        } else if (heading.name) {
            name += heading.name;
        } else {
            name += i;
        }
        return name;
    }
    // Table of Contents
    $('#page-toc').toc({
        'selectors':         'h1,h2', // elements to use as headings
        'container':         '.doc-content', // element to find all selectors in
        'prefix':            'link-', // prefix for anchor tags and class names
        'onHighlight':       function(el) {}, // called when a new section is highlighted
        'highlightOnScroll': true, // add class to heading that is currently in focus
        'highlightOffset':   100, // offset to trigger the next headline
        'anchorName':        function(i, heading, prefix) { // custom function for anchor name
            return getAnchorName(i, heading, prefix);
        },
        'headerText': function(i, heading, $heading) { // custom function building the header-item text
            return $heading.text();
        },
        'itemClass': function(i, heading, $heading, prefix) { // custom function for item class

            // add a special class to the anchor for this toc entry
            var anchorName = getAnchorName(i, heading, prefix);
            $('#' + anchorName).addClass('doc-fragment-anchor');

            // don't assign any special classes to the toc entry itself
            return '';
        }
    });
    
    $('.toc-container').height($("#content").height());
        
    $('code').each(function(i, block) {
        if ($(block).attr("data-lang")) {
            $(block).addClass("hljs");
            if ($(block).attr("data-lang")!="text") hljs.highlightBlock(block);
        }
    });
    
    
	$('.doc-content').anchorific({
		navigation: '.anchorific', // position of navigation
		speed: 200, // speed of sliding back to top
		anchorClass: 'anchor', // class of anchor links
		anchorText: '', // prepended or appended to anchor headings
		top: '.top', // back to top button or link class
		spy: true, // highlight active links as you scroll
	});
	
});

// http://stackoverflow.com/questions/17534661/make-anchor-link-go-some-pixels-abocve-where-its-linked-to
// The function actually applying the offset
function offsetAnchor() {
    if(location.hash.length !== 0) {
        window.scrollTo(window.scrollX, window.scrollY - $('nav').height() + 20);
    }
}

// This will capture hash changes while on the page
$(window).on("hashchange", function () {
    offsetAnchor();
});

// This is here so that when you enter the page with a hash,
// it can provide the offset in that case too. Having a timeout
// seems necessary to allow the browser to jump to the anchor first.
window.setTimeout(function() {
    offsetAnchor();
}, 1); // The delay of 1 is arbitrary and may not always work right (although it did in my testing).

// http://stackoverflow.com/questions/5419134/how-to-detect-if-two-divs-touch-with-jquery
function collision($div1, $div2) {
    var x1 = $div1.offset().left;
    var y1 = $div1.offset().top;
    var h1 = $div1.outerHeight(true);
    var w1 = $div1.outerWidth(true);
    var b1 = y1 + h1;
    var r1 = x1 + w1;
    var x2 = $div2.offset().left;
    var y2 = $div2.offset().top;
    var h2 = $div2.outerHeight(true);
    var w2 = $div2.outerWidth(true);
    var b2 = y2 + h2;
    var r2 = x2 + w2;
    
    if (b1 < y2 || y1 > b2 || r1 < x2 || x1 > r2) return false;
    return true;
}