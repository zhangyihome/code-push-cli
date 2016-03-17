$(document).ready(function () {

	$(".zeroClipBtn").each(function (i) {
		var clip = new ZeroClipboard(this);
    });

	$('.downloadMenu .header, .downloadMenu span').click(function (e) {
		e.stopPropagation();
	});


	function setFooterPosition() {
	
		if ($(window).width() <= 767) {
			$('footer').css('position', 'relative').css("width", "100%");
		} else if ($(document).height() <= $(window).height()) {
			$('footer').css('position', 'absolute').css("bottom", 0).css("width", "100%");
		} else {
			$('footer').css('position', 'relative').css("width", "100%");
		}
	}

	setFooterPosition();
	$(window).resize(function () { setFooterPosition() });
});