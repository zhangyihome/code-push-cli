

### My updates are not being applied!

1. What do the CodePush logs say when you test it locally if you substitute in the production key? You can use any log viewer or the code-push debug command to see them.
2. Do you see any installs or rollbacks in your deployment history? code-push deployment history <AppName> Production
2. Just as a sanity check, you've double checked that the deploymentKey is configured correctly in your app?

- Are you being rolled back?
- Are you releasing android on an iOS deployment or vice versa?
- Does your app version not match?

### My images are not showing up!

Is this happening before or after CodePush update is applied?

If before, try removing the line which consults CodePush for the bundle location, and see if it still repros.
If after, which release command are you using? Try using release-react. If using release command, check folder first.
Else file issue.

### [CodePush] Update is invalid - A JS bundle file named "main.jsbundle" could not be found within the downloaded contents.

This likely means that you are releasing android on an iOS deployment or vice versa.

Alternatively, when you ran `release`, the folder genuinely didn't contain this file. If possible, use `release-react` or `release-cordova` to avoid these kinds of issues.

### I'm being rolled back!

Use the ES6 decorator. Or if using sync() or the advanced API:

When are you calling `sync()`? Is it on button press, resume, app start? We prescribe calling `sync()` on start at minimum, but if you don't call it there you should call `CodePush.notifyApplicationReady()`. On the first run of the app, if we don't detect this call, we assume there has been some kind of crash and roll back the app.

If a package was specifically installed and then rolled back, that package is 'black-listed' and won't be installed again, even if you patch it. You can release a new package with different contents though.

### Getting a 400 error on updateCheck

Is your deploymentKey configured correctly? If so, then check that your app version is a semver.

### Logs say 'update targets a newer binary version' but I released with '*'

Check that your app version is not using a prerelease tag. Try using machine metadata instead.

### Can I just upload the files that have changed, instead of the whole package?

Although the release command sends the whole folder to the server, the server performs a diff on the contents of your release with your latest 5 releases, so that your client mobile device only needs to download the files that changed. This diffing happens in a background job, so there might be a slight delay before they are available.

### Downloading the whole update instead of just a diff!

There could be a few reasons for that:

1.	The diff for the iOS update hadn’t been finished computing yet, so the server sent the whole package
2.	The version running before the update was not one of the last 5 packages in the deployment, and hence there was no diff for it
3.	The package is being applied on top of the version shipped with the binary, and the version shipped with the binary was not uploaded to the deployment beforehand (so there was no diff for it)

### My email address changed, or I want to transfer my account!

Do you just want to transfer an app? If so, you can ask the other person to create an app and then transfer it to them.

Otherwise, if you actually want to transfer your whole account or change your email address, email us.

### I run into 'Internal Server Error' while running `code-push app ls`, and I have a large number of apps

Please upgrade to the latest CLI (`npm install -g code-push-cli@latest`). If the problem still persists, contact us.

### When I push my JS, it depends on a newer binary version, so it'll break my older users!

CodePush updates can be scoped by app store version - if you run `code-push deployment history <appName> <deploymentName>`, you should be able to see what each release is scoped to under the App Version column. If a CodePush update is not compatible with a certain binary version, then it should be excluded with a range expression like `'>= 0.1.0'`. We definitely don't want you to break users on older app store versions.

If you're using the `code-push release-react` command to perform CodePush releases, it should automatically infer the app store version from your project, but if you want to specifically control it, there is a `--targetBinaryVersion` flag that you can use to specify any semver range expression you want. There is also a `code-push patch` command if you want to modify the target binary version on packages that you've already released. More info on the target binary version here: https://github.com/Microsoft/code-push/tree/master/cli#target-binary-version-parameter

### On React Native Android, my app is always being pulled from localhost instead of CodePush

See: https://github.com/Microsoft/react-native-code-push/issues/438
