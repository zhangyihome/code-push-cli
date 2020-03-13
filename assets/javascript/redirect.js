// Redirect logic from this docs(as it is depricated) to new docs: https://docs.microsoft.com/en-us/appcenter/distribution/codepush
var
    rootRedirectLink = "https://docs.microsoft.com/en-us/appcenter/distribution/codepush/",
    rootDocsUrl = "code-push/docs",
    redirectedLinksArray = [
        { from: "index.html", to: "" },
        { from: "getting-started.html", to: "" }, // root page of new docs
        { from: "react-native.html", to: "react-native" },
        { from: "cordova.html", to: "cordova" },
        { from: "cli.html", to: "cli" },
        { from: "node.html", to: "node" },
        { from: "vsts-extension.html", to: "vsts-extension" },
        { from: "tutorials.html", to: "tutorials" },

        { from: "getting-started.html#link-0", to: "#1-install-the-app-center-cli" },
        { from: "getting-started.html#link-1", to: "" }, // this point doesn't exist in new docs
        { from: "getting-started.html#link-2", to: "" }, // this point doesn't exist in new docs
        { from: "getting-started.html#link-3", to: "#2-codepush-ify-your-app" },
        { from: "getting-started.html#link-4", to: "#3-release-an-app-update" },
        { from: "getting-started.html#link-5", to: "#4-run-your-app" },
        { from: "react-native.html#link-0", to: "react-native#how-does-it-work" },
        { from: "react-native.html#link-1", to: "react-native#supported-react-native-platforms" },
        { from: "react-native.html#link-2", to: "react-native#getting-started" },
        { from: "react-native.html#link-3", to: "react-native#ios-setup" },
        { from: "react-native.html#link-4", to: "react-native#android-setup" },
        { from: "react-native.html#link-5", to: "react-native#windows-setup" },
        { from: "react-native.html#link-6", to: "react-native#plugin-usage" },
        { from: "react-native.html#link-7", to: "react-native#releasing-updates" },
        { from: "react-native.html#link-8", to: "react-native#multi-deployment-testing" },
        { from: "react-native.html#link-9", to: "react-native#dynamic-deployment-assignment" },
        { from: "react-native.html#link-10", to: "react-native#api-reference" },
        { from: "react-native.html#link-11", to: "react-native#example-apps--starters" },
        { from: "react-native.html#link-12", to: "react-native#debugging--troubleshooting" },
        { from: "react-native.html#link-13", to: "react-native#continuous-integration--delivery" },
        { from: "react-native.html#link-14", to: "react-native#typescript-consumption" },
        { from: "cordova.html#link-0", to: "cordova#how-does-it-work" },
        { from: "cordova.html#link-1", to: "cordova#supported-cordova-platforms" },
        { from: "cordova.html#link-2", to: "cordova#getting-started" },
        { from: "cordova.html#link-3", to: "cordova#plugin-usage" },
        { from: "cordova.html#link-4", to: "cordova#releasing-updates" },
        { from: "cordova.html#link-5", to: "cordova#api-reference" },
        { from: "cordova.html#link-6", to: "cordova#phonegap-build" },
        { from: "cordova.html#link-7", to: "cordova#example-apps" },
        { from: "cli.html#link-0", to: "cli#installation" },
        { from: "cli.html#link-1", to: "cli#getting-started" },
        { from: "cli.html#link-2", to: "cli#cli#account-management" },
        { from: "cli.html#link-3", to: "cli#app-management" },
        { from: "cli.html#link-4", to: "cli#releasing-updates" },
        { from: "cli.html#link-5", to: "cli" }, // this point doesn't exist in new docs
        { from: "cli.html#link-6", to: "cli#patching-update-metadata" },
        { from: "cli.html#link-7", to: "cli#promoting-updates" },
        { from: "cli.html#link-8", to: "cli#rolling-back-updates" },
        { from: "cli.html#link-9", to: "cli#viewing-release-history" },
        { from: "cli.html#link-10", to: "cli#clearing-release-history" },
        { from: "node.html#link-0", to: "node#getting-started" },
        { from: "node.html#link-1", to: "node#node#api-reference" },
        { from: "vsts-extension.html#link-0", to: "vsts-extension#quick-start" },
        { from: "vsts-extension.html#link-1", to: "vsts-extension#globally-configuring-your-credentials" },
        { from: "vsts-extension.html#link-2", to: "vsts-extension#task-reference" },
        { from: "tutorials.html#link-0", to: "tutorials#update-experience-configuration" },
        { from: "tutorials.html#link-1", to: "tutorials#automate-your-deployments-with-vsts" },
    ];

var currentLink = window.location.toString();
if (currentLink.indexOf(rootDocsUrl) !== -1) {
    var newLink = getRedirectLink(currentLink);
    if (newLink) {
        // Redirecting
        window.location = newLink;
    }
}

function getRedirectLink(url) {
    var docPage = url.slice(url.indexOf(rootDocsUrl) + rootDocsUrl.length + 1);
    for (var i = 0; i < redirectedLinksArray.length; i++) {
        if (redirectedLinksArray[i].from === docPage) {
            return rootRedirectLink + redirectedLinksArray[i].to;
        }
    }

    return null;
}
