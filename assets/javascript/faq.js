$(document).ready(function(){
	$('.faq .main_content').anchorific({
		navigation: '.anchorific', // position of navigation
		speed: 200, // speed of sliding back to top
		anchorClass: 'anchor', // class of anchor links
		anchorText: '#', // prepended or appended to anchor headings
		top: '.top', // back to top button or link class
		spy: true, // highlight active links as you scroll
		position: 'append' // position of anchor text
	});
	// http://stackoverflow.com/questions/17534661/make-anchor-link-go-some-pixels-abocve-where-its-linked-to
	
	// The function actually applying the offset
	function offsetAnchor() {
		if(location.hash.length !== 0) {
			window.scrollTo(window.scrollX, window.scrollY - $('nav').height() - 20);
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
});
