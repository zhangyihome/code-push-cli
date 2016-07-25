
My images are not showing up!

Is this happening before or after CodePush update is applied?

If before, try removing the line which consults CodePush for the bundle location, and see if it still repros.
If after, which release command are you using? Try using release-react. If using release command, check folder first.
Else file issue.

My updates are not being applied!

Check logs - Are you being rolled back?
Are you releasing android on an iOS deployment or vice versa?

I'm being rolled back!

Use the ES6 decorator. Or if using something else, ensure notifyApplicationReady() is called.

Downloading the whole update instead of just a diff!

There could be a few reasons for that:

1.	The diff for the iOS update hadn’t been finished computing yet, so the server sent the whole package
2.	The version running before the update was not one of the last 5 packages in the deployment, and hence there was no diff for it
3.	The package is being applied on top of the version shipped with the binary, and the version shipped with the binary was not uploaded to the deployment beforehand (so there was no diff for it)


