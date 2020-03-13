$(document).ready(function () {

	$(".zeroClipBtn").each(function (i) {
		var clip = new ZeroClipboard(this);
    });

	$('.downloadMenu .header, .downloadMenu span').click(function (e) {
		e.stopPropagation();
	});


	function setFooterPosition() {
        
        var footerPos = $("footer").position().top;
        var pageNoFooter = $(document).height() - $("footer").height() - 1;
                       
		if(footerPos < pageNoFooter ){
		    $('footer').css('position','absolute').css("bottom",0).css("width","100%");
			}else {
			$('footer').css('position','relative').css("z-index",100);
	    }        
	}

	setFooterPosition();
	$(window).resize(function () { setFooterPosition() });
});