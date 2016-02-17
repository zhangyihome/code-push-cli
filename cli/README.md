# CodePush management CLI

CodePush is a cloud service that enables Cordova and React Native developers to deploy mobile app updates directly to their users' devices. It works by acting as a central repository that developers can publish updates to (JS, HTML, CSS and images), and that apps can query for updates from (using the provided client SDKs for [Cordova](http://github.com/Microsoft/cordova-plugin-code-push) and [React Native](http://github.com/Microsoft/react-native-code-push)). This allows you to have a more deterministic and direct engagement model with your userbase, when addressing bugs and/or adding small features that don't require you to re-build a binary and re-distribute it through the respective app stores.

![CodePush CLI](https://cloud.githubusercontent.com/assets/116461/13024894/35c9c300-d1b1-11e5-9d46-085cfaf8a021.png)

## Installation

* Install [Node.js](https://nodejs.org/)
* Install the CodePush CLI: `npm install -g code-push-cli`

## Quick Start

1. Create a [CodePush account](#account-creation) push using the CodePush CLI
2. Register your [app](#app-management) with the service, and optionally create any additional [deployments](#deployment-management)
3. CodePush-ify your app and point it at the deployment you wish to use ([Cordova](http://github.com/Microsoft/cordova-plugin-code-push) and [React Native](http://github.com/Microsoft/react-native-code-push))
4. [Deploy](#releasing-app-updates) an update for your registered app
5. Live long and prosper! ([details](https://en.wikipedia.org/wiki/Vulcan_salute))

## Account creation

Before you can begin releasing app updates, you need to create a CodePush account. You can do this by simply running the following command once you've installed the CLI:

```
code-push register
```

This will launch a browser, asking you to authenticate with either your GitHub or Microsoft account. Once authenticated, it will create a CodePush account "linked" to your GitHub/MSA identity, and generate an access token you can copy/paste into the CLI in order to login.

*Note: After registering, you are automatically logged-in with the CLI, so until you explicitly log out, you don't need to login again from the same machine.*

## Authentication

Every command within the CodePush CLI requires authentication, and therefore, before you can begin managing your account, you need to login using the Github or Microsoft account you used when registering. You can do this by running the following command:

```
code-push login
```

This will launch a browser, asking you to authenticate with either your GitHub or Microsoft account. This will generate an access token that you need to copy/paste into the CLI (it will prompt you for it). You are now succesfully authenticated and can safely close your browser window.

When you login from the CLI, your access token (kind of like a cookie) is persisted to disk so that you don't have to login everytime you attempt to access your account. In order to delete this file from your computer, simply run the following command:

```
code-push logout
```

If you forget to logout from a machine you'd prefer not to leave a running session on (e.g. your friend's laptop), you can use the following commands to list and remove any "live" access tokens.
The list of access keys will display the name of the machine the token was created on, as well as the time the login occurred. This should make it easy to spot keys you don't want to keep around.

```
code-push access-key ls
code-push access-key rm <accessKey>
```

If you need additional keys, that can be used to authenticate against the CodePush service without needing to give access to your GitHub and/or Microsoft crendentials, you can run the following command to create one (along with a description of what it is for):

```
code-push access-key add "VSO Integration"
```

After creating the new key, you can specify its value using the `--accessKey` flag of the `login` command, which allows you to perform the "headless" authentication, as opposed to launching a browser.

```
code-push login --accessKey <accessKey>
```

If you want to log out of your current session, but still be able to reuse the same key for future logins, run the following command:

```
code-push logout --local
```

## App management

Before you can deploy any updates, you need to register an app with the CodePush service using the following command:

```
code-push app add <appName>
```

If your app targets both iOS and Android, we recommend creating separate apps with CodePush. One for each platform. This way, you can manage and release updates to them seperately, which in the long run, tends to make things simpler. The naming convention that most folks use is to suffix the app name with `-iOS` and `-Android`. For example:

```
code-push app add MyApp-Android
code-push app add MyApp-iOS
```

All new apps automatically come with two deployments (`Staging` and `Production`) so that you can begin distributing updates to multiple channels without needing to do anything extra (see deployment instructions below). After you create an app, the CLI will output the deployment keys for the `Staging` and `Production` deployments, which you can begin using to configure your mobile clients via their respective SDKs (details for [Cordova](http://github.com/Microsoft/cordova-plugin-code-push) and [React Native](http://github.com/Microsoft/react-native-code-push)).

If you decide that you don't like the name you gave to an app, you can rename it at any time using the following command:

```
code-push app rename <appName> <newAppName>
```

The app's name is only meant to be recognizeable from the management side, and therefore, you can feel free to rename it as neccessary. It won't actually impact the running app, since update queries are made via deployment keys.

If at some point you no longer need an app, you can remove it from the server using the following command:

```
code-push app rm <appName>
```

Do this with caution since any apps that have been configured to use it will obviously stop receiving updates. 

Finally, if you want to list all apps that you've registered with the CodePush server,
you can run the following command:

```
code-push app ls
```

## App Collaboration

If you will be working with other developers on the same CodePush app, you can add them as collaborators using the following command:

```shell
code-push collaborator add <appName> <collaboratorEmail>
```

*NOTE: This expects the developer to have already [registered](#account-creation) with CodePush using the specified e-mail address, so ensure that they have done that before attempting to share the app with them.*

Once added, all collaborators will immediately have the following permissions with regards to the newly shared app: 

1. View the app, its collaborators, [deployments](#deployment-management) and [release history](#viewing-release-history) 
1. [Release](#releasing-app-updates) updates to any of the app's deployments
1. [Promote](#promoting-updates-across-deployments) an update between any of the app's deployments
1. [Rollback](#rolling-back-undesired-updates) any of the app's deployments

Inversely, that means that an app collaborator cannot do any of the following:

1. Rename or delete the app
1. Transfer ownership of the app
1. Create, rename or delete new deployments within the app
1. Add or remove collaborators from the app (*)

*NOTE: A developer can remove him/herself as a collaborator from an app that was shared with them.*

Over time, if someone is no longer working on an app with you, you can remove them as a collaborator using the following command:

```shell
code-push collaborator rm <appName> <collaboratorEmail>
```

If at any time you want to list all collaborators that have been added to an app, you can simply run the following command:

```shell
code-push collaborator ls <appName>
```

Finally, if at some point, you (as the app owner) will no longer be working on the app, and you want to transfer it to another developer (or a client), you can run the following command:

```shell
code-push app transfer <appName> <newOwnerEmail>
```

*NOTE: Just like with the `code-push collaborator add` command, this expects that the new owner has already registered with CodePush using the specified e-mail address.*

Once confirmed, the specified developer becomes the app's owner and immediately receives the permissions associated with that role. Besides the transfer of ownership, nothing else about the app is modified (e.g. deployments, release history, collaborators). This means that you will still be a collaborator of the app, and therefore, if you want to remove yourself, you simply need to run the `code-push collaborator rm` command after successfully transferring ownership.

## Deployment management

From the CodePush perspective, an app is simply a named grouping for one or more things called "deployments". While the app represents a conceptual "namespace" or "scope" for a platform-specific version of an app (e.g. the iOS port of Foo app), it's deployments represent the actual target for releasing updates (for developers) and synchronizing updates (for end-users). Deployments allow you to have multiple "environments" for each app in-flight at any given time, and help model the reality that apps typically move from a dev's personal environment to a testing/QA/staging environment, before finally making their way into production.

*NOTE: As you'll see below, the `release`, `promote` and `rollback` commands require both an app name and a deployment name is order to work, because it is the combination of the two that uniquely identifies a point of distribution (e.g. I want to release an update of my iOS app to my beta testers).*

Whenever an app is registered with the CodePush service, it includes two deployments by default: `Staging` and `Production`. This allows you to immediately begin releasing updates to an internal environment, where you can thoroughly test each update before pushing them out to your end-users. This workflow is critical for ensuring your releases are ready for mass-consumption, and is a practice that has been established in the web for a long time.

If having a staging and production version of your app is enough to meet your needs, then you don't need to do anything else. However, if you want an alpha, dev, etc. deployment, you can easily create them using the following command:

```
code-push deployment add <appName> <deploymentName>
```

Just like with apps, you can remove and rename deployments as well, using the following commands respectively:

```
code-push deployment rename <appName> <deploymentName> <newDeploymentName>
code-push deployment rm <appName> <deploymentName>
```

If at any time you'd like to view the list of deployments that a specific app includes, you can simply run the following command:

```
code-push deployment ls <appName> [--displayKeys]
```

This will display not only the list of deployments, but also the update metadata (e.g. mandatory, description) and installation metrics for their latest release:

![Deployment lis](https://cloud.githubusercontent.com/assets/116461/12526883/7730991c-c127-11e5-9196-98e9ceec758f.png)

The install metrics have the following meaning:

* **Active** - The number of successful installs that are currently running this release. This number will increase and decrease as end-users upgrade to and away from this release, respectively.

* **Total** - The total number of successful installations that this update has received overall. This number only ever increases as new users/devices install it, and therefore, this is always a superset of the active count.

* **Pending** - The number of times this release has been downloaded, but not yet installed. This would only apply to updates that aren't installed immediately, and helps provide the broader picture of release adoption for apps that rely on app resume and restart to apply an update.

* **Rollbacks** - The number of times that this release has been automatically rolled back on the client. Ideally this number should be zero, and in that case, this metric isn't even shown. However, if you released an update that includes a crash as part of the installation process, the CodePush plugin will roll the end-user back to the previous release, and report that issue back to the server. This allows your end-users to remain unblocked in the event of broken releases, and by being able to see this telemtry in the CLI, you can identify erroneous releases and respond to them by [rolling it back](#rolling-back-undesired-updates) on the server.

When the metrics cell reports `No installs recorded`, that indicates that the server hasn't seen any activity for this release. This could either be because it precluded the plugin versions that included telemtry support, or no end-users have synchronized with the CodePush server yet. As soon as an install happens, you will begin to see metrics populate in the CLI for the release.

## Releasing app updates

*Note: If your app is built using React Native, we have a different command that automates generating the update contents and infering some of the parameters (e.g. `targetBinaryVersion`) from the project's metadata. Check out the section: [Releasing updates to a React Native app](#releasing-updates-to-a-react-native-app).*

Once your app has been configured to query for updates against the CodePush service--using your desired deployment--you can begin pushing updates to it using the following command:

```
code-push release <appName> <updateContents> <targetBinaryVersion>
[--deploymentName <deploymentName>]
[--description <description>]
[--mandatory]
```

### Update contents parameter

This specifies the location of the code and assets you want to release. You can provide either a single file (e.g. a JS bundle for a React Native app), or a path to a directory (e.g. the `/platforms/ios/www` folder for a Cordova app). You don't need to zip up multiple files or directories in order to deploy those changes, since the CLI will automatically zip them for you.

It's important that the path you specify refers to the platform-specific, prepared/bundled version of your app. The following table outlines which command you should run before releasing, as well as the location you can subsequently point at using the `updateContents` parameter:

| Platform                         | Prepare command                                                                                                                                            | Package path (relative to project root)                                                                     |
|----------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------|
| Cordova (Android)                | `cordova prepare android`                                                                                                                                  | `./platforms/android/assets/www` directory 																 |
| Cordova (iOS)                    | `cordova prepare ios`                                                                                                                                      | `./platforms/ios/www ` directory          															|
| React Native wo/assets (Android) | `react-native bundle --platform android --entry-file <entryFile> --bundle-output <bundleOutput> --dev false`                                               | Value of the `--bundle-output` option      																 |
| React Native w/assets (Android)  | `react-native bundle --platform android --entry-file <entryFile> --bundle-output <releaseFolder>/<bundleOutput> --assets-dest <releaseFolder> --dev false` | Value of the `--assets-dest` option, which should represent a newly created directory that includes your assets and JS bundle |
| React Native wo/assets (iOS)     | `react-native bundle --platform ios --entry-file <entryFile> --bundle-output <bundleOutput> --dev false`                                                   | Value of the `--bundle-output` option                                                                 |
| React Native w/assets (iOS)      | `react-native bundle --platform ios --entry-file <entryFile> --bundle-output <releaseFolder>/<bundleOutput> --assets-dest <releaseFolder> --dev false` | Value of the `--assets-dest` option, which should represent a newly created directory that includes your assets and JS bundle |

### Target binary version parameter

This specifies the semver-compliant (e.g. `1.0.0` not `1.0`) store/binary version of the application you are releasing the update for. Only users running this **exact version** will receive the update. Users running an older and/or newer version of the app binary will not receive this update, for the following reasons:

1. If a user is running an older binary version, it's possible that there are breaking changes in the CodePush update that wouldn't be compatible with what they're running.

2. If a user is running a newer binary version, then it's presumed that what they are running is newer (and potentially imcompatible) with the CodePush update.  

The following table outlines the value that CodePush expects you to provide for each respective app type:

| Platform               | Source of app store version                                                  |
|------------------------|------------------------------------------------------------------------------|
| Cordova                | The `<widget version>` attribute in the `config.xml` file                    |
| React Native (Android) | The `android.defaultConfig.versionName` property in your `build.gradle` file |
| React Native (iOS)     | The `CFBundleShortVersionString` key in the `Info.plist` file                |

### Deployment name parameter

This specifies which deployment you want to release the update to. This defaults to `Staging`, but when you're ready to deploy to `Production`, or one of your own custom deployments, just explicitly set this argument.

*NOTE: The parameter can be set using either "--deploymentName" or "-d".*

### Description parameter

This provides an optional "change log" for the deployment. The value is simply roundtripped to the client so that when the update is detected, your app can choose to display it to the end-user (e.g. via a "What's new?" dialog). This string accepts control characters such as `\n` and `\t` so that you can include whitespace formatting within your descriptions for improved readability.

*NOTE: This parameter can be set using either "--description" or "-desc"*

### Mandatory parameter

This specifies whether the update should be considered mandatory or not (e.g. it includes a critical security fix). This attribute is simply roundtripped to the client, who can then decide if and how they would like to enforce it.

*NOTE: This parameter is simply a "flag", and therefore, it's absence indicates that the release is optional, and it's presence indicates that it's mandatory. You can provide a value to it (e.g. `--mandatory true`), however, simply specifying `--mandatory` is sufficient for marking a release as mandatory.*

The mandatory attribute is unique because the server will dynamically modify it as neccessary in order to ensure that the semantics of your releases are maintained for your end-users. For example, imagine that you released the following three updates to your app:

| Release | Mandatory? |
|---------|------------|
| v1      | No         |
| v2      | Yes        |
| v3      | No         |

If an end-user is currently running `v1`, and they query the server for an update, it wil respond with `v3` (since that is the latest), but it will dynamically convert the release to mandatory, since a mandatory update was released in between. This behavior is important since the code contained in `v3` is incremental to that included in `v2`, and therefore, whatever made `v2` mandatory, continues to make `v3` mandatory for anyone that didn't already acquire `v2`.

If an end-user is currently running `v2`, and they query the server for an update, it will respond with `v3`, but leave the release as optional. This is because they already received the mandatory update, and therefore, there isn't a need to modify the policy of `v3`. This behavior is why we say that the server will "dynamically convert" the mandatory flag, because as far as the release goes, it's mandatory attribute will always be stored using the value you specified when releasing it. It is only changed on-the-fly as neccesary when responding to an update check from an end-user.

If you never release an update that is marked as mandatory, then the above behavior doesn't apply to you, since the server will never change an optional release to mandatory unless there were intermingled mandatory updates as illustrated above. Additionally, if a release is marked as mandatory, it will never be converted to optional, since that wouldn't make any sense. The server will only change an optional release to mandatory in order to respect the semantics described above.

*NOTE: This parameter can be set using either "--mandatory" or "-m"*

## Releasing updates to a React Native app

After configuring your React Native app to query for updates against the CodePush service--using your desired deployment--you can begin pushing updates to it using the following command:

```
code-push release-react <appName> <platform> 
[--deploymentName <deploymentName>]
[--description <description>]
[--entryFile <entryFile>]
[--mandatory]
[--sourcemapOutput <sourcemapOutput>]
```

This `release-react` command does two things in addition to running the vanilla `release` command described in the [previous section](#releasing-app-updates):

1. It runs the [`react-native bundle` command](#update-contents-parameter) to generate the update contents in a temporary folder
2. It infers the [`targetBinaryVersion` of this release](#target-binary-version-parameter) by reading the contents of the project's metadata (`Info.plist` if this update is for iOS clients, and `build.gradle` if this update is for Android clients).

It then calls the vanilla `release` command by supplying the values for the required parameters using the above information. Doing this helps you avoid the manual step of generating the update contents yourself using the `react-native bundle` command and also avoid common pitfalls such as supplying a wrong `targetBinaryVersion` parameter.

### Platform parameter

This specifies which platform the current update is targeting, and can be either `ios` or `android` (case-insensitive).

### Deployment name parameter

This is the same parameter as the one described in the [above section](#deployment-name-parameter).

### Description parameter

This is the same parameter as the one described in the [above section](#description-parameter).

### Entry file parameter

This specifies the relative path to the root JavaScript file of the app. If left unspecified, the command will first assume the entry file to be `index.ios.js` or `index.android.js` depending on the `platform` parameter supplied, following which it will use `index.js` if the previous file does not exist.

### Mandatory parameter

This is the same parameter as the one described in the [above section](#mandatory-parameter).

### Sourcemap output parameter

This specifies the relative path to where the sourcemap file for resulting update's JS bundle should be generated. If left unspecified, sourcemaps will not be generated.

## Promoting updates across deployments

Once you've tested an update against a specific deployment (e.g. `Staging`), and you want to promote it "downstream" (e.g. dev->staging, staging->production), you can simply use the following command to copy the release from one deployment to another:

```
code-push promote <appName> <sourceDeploymentName> <destDeploymentName>
code-push promote MyApp Staging Production
```

The `promote` command will create a new release for the destination deployment, which includes the **exact code and metadata** (description, mandatory and app store version) from the latest release of the source deployment. While you could use the `release` command to "manually" migrate an update from one environment to another, the `promote` command has the following benefits:

1. It's quicker, since you don't need to re-assemble the release assets you want to publish or remember the description/app store version that are associated with the source deployment's release.

2. It's less error-prone, since the promote operartion ensures that the exact thing that you already tested in the source deployment (e.g. `Staging`) will become active in the destination deployment (e.g. `Production`). 

We recommend that all users take advantage of the automatically created `Staging` and `Production` environments, and do all releases directly to `Staging`, and then perform a `promote` from `Staging` to `Production` after performing the appropriate testing.

*NOTE: The release produced by a promotion will be annotated in the output of the `deployment history` command to help identify them more easily.*

## Rolling back undesired updates

A deployment's release history is immutable, so you cannot delete or remove an update once it has been released. However, if you release an update that is broken or contains unintended features, it is easy to roll it back using the `rollback` command:

```
code-push rollback <appName> <deploymentName>
code-push rollback MyApp Production
```

This has the effect of creating a new release for the deployment that includes the **exact same code and metadata** as the version prior to the latest one. For example, imagine that you released the following updates to your app:

| Release | Description       | Mandatory |
|---------|-------------------|-----------|
| v1      | Initial release!  | Yes       |
| v2      | Added new feature | No        |
| v3      | Bug fixes         | Yes       |

If you ran the `rollback` command on that deployment, a new release (`v4`) would be created that included the contents of the `v2` release. 

| Release                     | Description       | Mandatory |
|-----------------------------|-------------------|-----------|
| v1                          | Initial release!  | Yes       |
| v2                          | Added new feature | No        |
| v3                          | Bug fixes         | Yes       |
| v4 (Rollback from v3 to v2) | Added new feature | No        |

End-users that had already acquired `v3` would now be "moved back" to `v2` when the app performs an update check. Additionally, any users that were still running `v2`, and therefore, had never acquired `v3`, wouldn't receive an update since they are already running the latest release (this is why our update check uses the package hash in addition to the release label).

If you would like to rollback a deployment to a release other than the previous (e.g. `v3` -> `v2`), you can specify the optional `--targetRelease` parameter:

```
code-push rollback MyApp Production --targetRelease v34
```

*NOTE: The release produced by a rollback will be annotated in the output of the `deployment history` command to help identify them more easily.*

## Viewing release history

You can view a history of the 50 most recent releases for a specific app deployment using the following command:

```
code-push deployment history <appName> <deploymentName>
```

The history will display all attributes about each release (e.g. label, mandatory) as well as indicate if any releases were made due to a promotion or a rollback operation.

![Deployment History](https://cloud.githubusercontent.com/assets/696206/11605068/14e440d0-9aab-11e5-8837-69ab09bfb66c.PNG)

Additionally, the history displays the install metrics for each release. You can view the details about how to interpret the metric data in the documentation for the `deployment ls` command above.

By default, the history doesn't display the author of each release, but if you are collaborating on an app with other developers, and want to view who released each update, you can pass the additional `--displayAuthor` (or `-a`) flag to the history command.

*NOTE: The history command can also be run using the "h" alias*