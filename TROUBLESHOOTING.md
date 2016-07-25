
### My images are not showing up!

Is this happening before or after CodePush update is applied?

If before, try removing the line which consults CodePush for the bundle location, and see if it still repros.
If after, which release command are you using? Try using release-react. If using release command, check folder first.
Else file issue.

### My updates are not being applied!

Check logs:
- Are you being rolled back?
- Are you releasing android on an iOS deployment or vice versa?
- Does your app version not match?

### [CodePush] Update is invalid - A JS bundle file named "main.jsbundle" could not be found within the downloaded contents.

This likely means that you are releasing android on an iOS deployment or vice versa.

Alternatively, when you ran `release`, the folder genuinely didn't contain this file. If possible, use `release-react` or `release-cordova` to avoid these kinds of issues.

### I'm being rolled back!

Use the ES6 decorator. Or if using sync() or the advanced API:

When are you calling sync()? Is it on button press, resume, app start?

The way our rollback mechanism works is it relies on a function called CodePush.notifyApplicationReady() to be called. If this is not called on the first run of the app, it will be rolled back. CodePush.sync() calls this function internally so that you don’t have to worry about it, and we assume that you call it on app start at minimum. If you don’t do that then you will likely be rolled back, and you should add either a call to sync() or notifyApplicationReady() on app start.

### Getting a 400 error on updateCheck

Check that your app version is a semver

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
