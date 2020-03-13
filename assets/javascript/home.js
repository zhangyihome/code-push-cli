function scrollToBeta() {
    $('html,body').animate({ scrollTop: $('#beta').offset().top - 100 }, 'slow');
    $('#beta textarea').focus();
}

var serverUrl = "https://codepush-beta-signup.azurewebsites.net/"

function signup(provider) {
    if ($("#description").val()) {
        $("#description").parent().removeClass("has-error");
        if (isIE()) {
            $("#signupButtons").fadeOut();
            window.open(serverUrl + "auth/" + provider + "?description=" + $("#description").val());
        } else {
            $("#signupButtons").hide();
            $("#signupWaiting").fadeIn();
            setTimeout(function () {
                window.open(serverUrl + "auth/" + provider + "?description=" + $("#description").val());
            }, 1000);
        }
    } else {
        $("#description").parent().addClass("has-error");
    }
}

window.onmessage = function (e) {
    if (e.data.success) {
        $("#signupWaiting").hide();
        $("#signupSuccess").fadeIn();
    } else {
        $("#signupWaiting").hide();
        $("#signupError").fadeIn();
    }
};

function isIE() {
    var ua = window.navigator.userAgent;
    var msie = ua.indexOf("MSIE ");

    if (msie > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./)) {
        return true;
    } else {
        return false;
    }
}