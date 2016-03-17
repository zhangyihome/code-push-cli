# CodePush Management CLI

CodePush is a cloud service that enables Cordova and React Native developers to deploy mobile app updates directly to their users' devices. It works by acting as a central repository that developers can publish updates to (JS, HTML, CSS and images), and that apps can query for updates from (using the provided client SDKs for [Cordova](http://github.com/Microsoft/cordova-plugin-code-push) and [React Native](http://github.com/Microsoft/react-native-code-push)). This allows you to have a more deterministic and direct engagement model with your user base, when addressing bugs and/or adding small features that don't require you to re-build a binary and re-distribute it through the respective app stores.

![CodePush CLI](https://cloud.githubusercontent.com/assets/116461/13588584/aa9f26f2-e485-11e5-8e15-43d4b266225a.png)

* [Installation](#installation)
* [Getting Started](#getting-started)
* [Account Creation](#account-creation)
* [Authentication](#authentication)
* [App Management](#app-management)
* [App Collaboration](#app-collaboration)
* [Deployment Management](#deployment-management)
* [Releasing Updates](#releasing-updates)
    * [Releasing Updates (General)](#releasing-updates-general)
    * [Releasing Updates (React Native)](#releasing-updates-react-native)
    * [Releasing Updates (Cordova)](#releasing-updates-cordova)
* [Patching Updates](#patching-updates)
* [Promoting Updates](#promoting-updates)
* [Rolling Back Updates](#rolling-back-updates)
* [Viewing Release History](#viewing-release-history)
* [Clearing Release History](#clearing-release-history)

## Installation

* Install [Node.js](https://nodejs.org/)
* Install the CodePush CLI: `npm install -g code-push-cli`

## Getting Started

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

This will launch a browser, asking you to authenticate with either your GitHub or Microsoft account. Once authenticated, it will create a CodePush account "linked" to your GitHub/MSA identity, and generate an access key you can copy/paste into the CLI in order to login.

*Note: After registering, you are automatically logged-in with the CLI, so until you explicitly log out, you don't need to login again from the same machine.*

## Authentication

Every command within the CodePush CLI requires authentication, and therefore, before you can begin managing your account, you need to login using the GitHub or Microsoft account you used when registering. You can do this by running the following command:

```
code-push login
```

This will launch a browser, asking you to authenticate with either your GitHub or Microsoft account. This will generate an access key that you need to copy/paste into the CLI (it will prompt you for it). You are now successfully authenticated and can safely close your browser window.

When you login from the CLI, your access key is persisted to disk for the duration of your session so that you don't have to login every time you attempt to access your account. In order to end your session and delete this access key, simply run the following command:

```
code-push logout
```

If you forget to logout from a machine you'd prefer not to leave a running session on (e.g. your friend's laptop), you can use the following commands to list and remove any "live" access keys.
The list of access keys will display the name of the machine the key was created on, as well as the time the login occurred. This should make it easy to spot keys you don't want to keep around.

```
code-push access-key ls
code-push access-key rm <accessKey>
```

If you need additional keys that can be used to authenticate against the CodePush service without needing to give access to your GitHub and/or Microsoft credentials, you can run the following command to create a persistent one (along with a description of what it is for):

```
code-push access-key add "VSTS Integration"
```

After creating the new key, you can specify its value using the `--accessKey` flag of the `login` command, which allows you to perform "headless" authentication, as opposed to launching a browser.

```
code-push login --accessKey <accessKey>
```

When logging in via this method, the access key will not be automatically invalidated on logout, and can be used in future sessions until it is explicitly removed from the CodePush server. However, it is still recommended to log out once your session is complete, in order to remove your credentials from disk.

## App Management

Before you can deploy any updates, you need to register an app with the CodePush service using the following command:

```
code-push app add <appName>
```

If your app targets both iOS and Android, we recommend creating separate apps with CodePush. One for each platform. This way, you can manage and release updates to them separately, which in the long run, tends to make things simpler. The naming convention that most folks use is to suffix the app name with `-iOS` and `-Android`. For example:

```
code-push app add MyApp-Android
code-push app add MyApp-iOS
```

All new apps automatically come with two deployments (`Staging` and `Production`) so that you can begin distributing updates to multiple channels without needing to do anything extra (see deployment instructions below). After you create an app, the CLI will output the deployment keys for the `Staging` and `Production` deployments, which you can begin using to configure your mobile clients via their respective SDKs (details for [Cordova](http://github.com/Microsoft/cordova-plugin-code-push) and [React Native](http://github.com/Microsoft/react-native-code-push)).

If you decide that you don't like the name you gave to an app, you can rename it at any time using the following command:

```
code-push app rename <appName> <newAppName>
```

The app's name is only meant to be recognizable from the management side, and therefore, you can feel free to rename it as necessary. It won't actually impact the running app, since update queries are made via deployment keys.

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
1. [Patch](#updating-existing-releases) any releases within any of the app's deployments

Inversely, that means that an app collaborator cannot do any of the following:

1. Rename or delete the app
1. Transfer ownership of the app
1. Create, rename or delete new deployments within the app
1. Clear a deployment's release history
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

## Deployment Management

From the CodePush perspective, an app is simply a named grouping for one or more things called "deployments". While the app represents a conceptual "namespace" or "scope" for a platform-specific version of an app (e.g. the iOS port of Foo app), its deployments represent the actual target for releasing updates (for developers) and synchronizing updates (for end-users). Deployments allow you to have multiple "environments" for each app in-flight at any given time, and help model the reality that apps typically move from a dev's personal environment to a testing/QA/staging environment, before finally making their way into production.

*NOTE: As you'll see below, the `release`, `promote` and `rollback` commands require both an app name and a deployment name is order to work, because it is the combination of the two that uniquely identifies a point of distribution (e.g. I want to release an update of my iOS app to my beta testers).*

Whenever an app is registered with the CodePush service, it includes two deployments by default: `Staging` and `Production`. This allows you to immediately begin releasing updates to an internal environment, where you can thoroughly test each update before pushing them out to your end-users. This workflow is critical for ensuring your releases are ready for mass-consumption, and is a practice that has been established in the web for a long time.

If having a staging and production version of your app is enough to meet your needs, then you don't need to do anything else. However, if you want an alpha, dev, etc. deployment, you can easily create them using the following command:

```
code-push deployment add <appName> <deploymentName>
```

Just like with apps, you can remove and rename deployments as well, using the following commands respectively:

```
code-push deployment rm <appName> <deploymentName>
code-push deployment rename <appName> <deploymentName> <newDeploymentName>
```

If at any time you'd like to view the list of deployments that a specific app includes, you can simply run the following command:

```
code-push deployment ls <appName> [--displayKeys|-k]
```

This will display not only the list of deployments, but also the update metadata (e.g. mandatory, description) and installation metrics for their latest release:

![Deployment lis](https://cloud.githubusercontent.com/assets/116461/12526883/7730991c-c127-11e5-9196-98e9ceec758f.png)

*NOTE: Due to their infrequent use and needed screen real estate, deployment keys aren't displayed by default. If you need to view them, simply make sure to pass the `-k` flag to the `deployment ls` command.*

The install metrics have the following meaning:

* **Active** - The number of successful installs that are currently running this release. This number will increase and decrease as end-users upgrade to and away from this release, respectively.

* **Total** - The total number of successful installations that this update has received overall. This number only ever increases as new users/devices install it, and therefore, this is always a superset of the active count.

* **Pending** - The number of times this release has been downloaded, but not yet installed. This would only apply to updates that aren't installed immediately, and helps provide the broader picture of release adoption for apps that rely on app resume and restart to apply an update.

* **Rollbacks** - The number of times that this release has been automatically rolled back on the client. Ideally this number should be zero, and in that case, this metric isn't even shown. However, if you released an update that includes a crash as part of the installation process, the CodePush plugin will roll the end-user back to the previous release, and report that issue back to the server. This allows your end-users to remain unblocked in the event of broken releases, and by being able to see this telemetry in the CLI, you can identify erroneous releases and respond to them by [rolling it back](#rolling-back-undesired-updates) on the server.

* **Rollout** - Indicates the percentage of users that are elligble to receive this update. This property will only be displayed for releases that have been tagged with a non-null rollout values, and can only ever be present on the latest release within each deployment.

When the metrics cell reports `No installs recorded`, that indicates that the server hasn't seen any activity for this release. This could either be because it precluded the plugin versions that included telemetry support, or no end-users have synchronized with the CodePush server yet. As soon as an install happens, you will begin to see metrics populate in the CLI for the release.

## Releasing Updates

The CodePush CLI has three different commands for releasing updates:

1. [General](#releasing-updates-general) - Which provides developers with the most control/flexibility, and simply handles the responsibility of uploading an update to the CodePush server.

2. [React Native](#releasing-updates-react-native) - Performs the same functionality as the general release command, but also handles the work of generating the app update for you, instead of requiring you to run both `react-native bundle` and then `code-push release`.

3. [Cordova](#releasing-updates-cordova) - Performs the same functionality as the general release command, but also handles the work of preparing the app udpate for you, instead of requiring you to run both `cordova prepare` and then `code-push release`.

Whether you choose to use the platform-specific command that is relevant to your app is a matter of preference, but we recommend that developers use the platform-specific one to start, since it greatly simplifies the experience, and then use the general-purpose command as needed.

### Releasing Updates (General)

*NOTE: If your app is built using React Native, we have a different command that automates generating the update contents and inferring some of the parameters (e.g. `targetBinaryVersion`) from the project's metadata. Check out the section: [Releasing updates to a React Native app](#releasing-updates-to-a-react-native-app).*

Once your app has been configured to query for updates against the CodePush service--using your desired deployment--you can begin pushing updates to it using the following command:

```
code-push release <appName> <updateContents> <targetBinaryVersion>
[--deploymentName <deploymentName>]
[--description <description>]
[--mandatory]
[--rollout <rolloutPercentage>]
```

#### Update contents parameter

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

#### Target binary version parameter

This specifies the store/binary version of the application you are releasing the update for, so that only users running that version will receive the update, while users running an older and/or newer version of the app binary will not. This is useful for the following reasons:

1. If a user is running an older binary version, it's possible that there are breaking changes in the CodePush update that wouldn't be compatible with what they're running.

2. If a user is running a newer binary version, then it's presumed that what they are running is newer (and potentially incompatible) with the CodePush update.

If you ever want an update to target multiple versions of the app store binary, we also allow you to specify the parameter as a [semver range expression](https://github.com/npm/node-semver#advanced-range-syntax). That way, any client device running a version of the binary that satisfies the range expression (i.e. `semver.satisfies(version, range)` returns `true`) will get the update. Examples of valid semver range expressions are as follows:

| Range Expression | Who gets the update                                                                    |
|------------------|----------------------------------------------------------------------------------------|
| `1.2.3`          | Only devices running the specific binary app store version `1.2.3` of your app         |
| `*`              | Any device configured to consume updates from your CodePush app                        |
| `1.2.x`          | Devices running major version 1, minor version 2 and any patch version of your app     |
| `1.2.3 - 1.2.7`  | Devices running any binary version between `1.2.3` (inclusive) and `1.2.7` (inclusive) |
| `>=1.2.3 <1.2.7` | Devices running any binary version between `1.2.3` (inclusive) and `1.2.7` (exclusive) |
| `~1.2.3`         | Equivalent to `>=1.2.3 <1.3.0`                                                         |
| `^1.2.3`         | Equivalent to `>=1.2.3 <2.0.0`                                                         |

*NOTE: If your semver expression starts with a special shell character or operator such as `>`, `^`, or **
*, the command may not execute correctly if you do not wrap the value in quotes as the shell will not supply the right values to our CLI process. Therefore, it is best to wrap your `targetBinaryVersion` parameter in double quotes when calling the `release` command, e.g. `code-push release MyApp updateContents ">1.2.3"`.*

The following table outlines the version value that CodePush expects your update's semver range to satisfy for each respective app type:

| Platform               | Source of app store version                                                  |
|------------------------|------------------------------------------------------------------------------|
| Cordova                | The `<widget version>` attribute in the `config.xml` file                    |
| React Native (Android) | The `android.defaultConfig.versionName` property in your `build.gradle` file |
| React Native (iOS)     | The `CFBundleShortVersionString` key in the `Info.plist` file                |

*NOTE: If the app store version in the metadata files are missing a patch version, e.g. `2.0`, it will be treated as having a patch version of `0`, i.e. `2.0 -> 2.0.0`.

#### Deployment name parameter

This specifies which deployment you want to release the update to. This defaults to `Staging`, but when you're ready to deploy to `Production`, or one of your own custom deployments, just explicitly set this argument.

*NOTE: The parameter can be set using either "--deploymentName" or "-d".*

#### Description parameter

This provides an optional "change log" for the deployment. The value is simply round tripped to the client so that when the update is detected, your app can choose to display it to the end-user (e.g. via a "What's new?" dialog). This string accepts control characters such as `\n` and `\t` so that you can include whitespace formatting within your descriptions for improved readability.

*NOTE: This parameter can be set using either "--description" or "-desc"*

#### Mandatory parameter

This specifies whether the update should be considered mandatory or not (e.g. it includes a critical security fix). This attribute is simply round tripped to the client, who can then decide if and how they would like to enforce it.

*NOTE: This parameter is simply a "flag", and therefore, its absence indicates that the release is optional, and its presence indicates that it's mandatory. You can provide a value to it (e.g. `--mandatory true`), however, simply specifying `--mandatory` is sufficient for marking a release as mandatory.*

The mandatory attribute is unique because the server will dynamically modify it as necessary in order to ensure that the semantics of your releases are maintained for your end-users. For example, imagine that you released the following three updates to your app:

| Release | Mandatory? |
|---------|------------|
| v1      | No         |
| v2      | Yes        |
| v3      | No         |

If an end-user is currently running `v1`, and they query the server for an update, it will respond with `v3` (since that is the latest), but it will dynamically convert the release to mandatory, since a mandatory update was released in between. This behavior is important since the code contained in `v3` is incremental to that included in `v2`, and therefore, whatever made `v2` mandatory, continues to make `v3` mandatory for anyone that didn't already acquire `v2`.

If an end-user is currently running `v2`, and they query the server for an update, it will respond with `v3`, but leave the release as optional. This is because they already received the mandatory update, and therefore, there isn't a need to modify the policy of `v3`. This behavior is why we say that the server will "dynamically convert" the mandatory flag, because as far as the release goes, its mandatory attribute will always be stored using the value you specified when releasing it. It is only changed on-the-fly as necessary when responding to an update check from an end-user.

If you never release an update that is marked as mandatory, then the above behavior doesn't apply to you, since the server will never change an optional release to mandatory unless there were intermingled mandatory updates as illustrated above. Additionally, if a release is marked as mandatory, it will never be converted to optional, since that wouldn't make any sense. The server will only change an optional release to mandatory in order to respect the semantics described above.

*NOTE: This parameter can be set using either `--mandatory` or `-m`*

#### Rollout parameter

This specifies the percentage of users (as an integer between `1` and `100`) that should be eligible to receive this update. It can be helpful if you want to "flight" new releases with a portion of your audience (e.g. 25%), and get feedback and/or watch for exceptions/crashes, before making it broadly available for everyone. If this parameter isn't set, it is treated equivalently to `100`, and therefore, you only need to set it if you want to actually limit how many users will receive it.

 When leveraging the rollout capability, there are a few additional considerations to keep in mind:

1. You cannot release a new update to a deployment whose latest release is an "active" rollout (i.e. its rollout property is non-null). The rollout needs to be "completed" (i.e. setting the `rollout` property to `100`) before you can release further updates to the deployment.

2. If you rollback a deployment whose latest release is an "active" rollout, the rollout value will be cleared, effectively "deactivating" the rollout behavior

3. Unlike the `mandatory` and `description` fields, when you promote a release from one deployment to another, it will not propogate the `rollout` property, and therefore, if you want to new release, in the target deployment, to have a rollout value, you need to explicitly set it when you call the `promote` command.

*NOTE: This parameter can be set using either `--rollout` or `-r`* 

### Releasing Updates (React Native)

After configuring your React Native app to query for updates against the CodePush service--using your desired deployment--you can begin pushing updates to it using the following command:

```shell
code-push release-react <appName> <platform>
[--bundleName <bundleName>]
[--deploymentName <deploymentName>]
[--description <description>]
[--development <development>]
[--entryFile <entryFile>]
[--mandatory]
[--sourcemapOutput <sourcemapOutput>]
[--targetBinaryVersion <targetBinaryVersion>]
[--rollout <rolloutPercentage>]
```

The `release-react` command does two things in addition to running the vanilla `release` command described in the [previous section](#releasing-app-updates):

1. It runs the [`react-native bundle` command](#update-contents-parameter) to generate the update contents in a temporary folder
2. It infers the [`targetBinaryVersion` of this release](#target-binary-range-parameter) by reading the contents of the project's metadata (`Info.plist` if this update is for iOS clients, and `build.gradle` for Android clients), and defaults to target only the specified version in the metadata.

It then calls the vanilla `release` command by supplying the values for the required parameters using the above information. Doing this helps you avoid the manual step of generating the update contents yourself using the `react-native bundle` command and also avoid common pitfalls such as supplying an invalid `targetBinaryVersion` parameter.

#### Platform parameter

This specifies which platform the current update is targeting, and can be either `ios` or `android` (case-insensitive).

#### Bundle name parameter

This specifies the name of the output JS bundle file. If left unspecified, the standard bundle name will be used for the specified platform: `main.jsbundle` (iOS) and `index.android.bundle` (Android).

#### Deployment name parameter

This is the same parameter as the one described in the [above section](#deployment-name-parameter).

#### Description parameter

This is the same parameter as the one described in the [above section](#description-parameter).

#### Development parameter

This specifies whether to generate a unminified, development JS bundle. If left unspecified, this defaults to `false` where warnings are disabled and the bundle is minified.

#### Entry file parameter

This specifies the relative path to the root JavaScript file of the app. If left unspecified, the command will first assume the entry file to be `index.ios.js` or `index.android.js` depending on the `platform` parameter supplied, following which it will use `index.js` if the previous file does not exist.

#### Mandatory parameter

This is the same parameter as the one described in the [above section](#mandatory-parameter).

#### Sourcemap output parameter

This specifies the relative path to where the sourcemap file for resulting update's JS bundle should be generated. If left unspecified, sourcemaps will not be generated.

#### Target binary version parameter

This is the same parameter as the one described in the [above section](#target-binary-version-parameter). If left unspecified, the command defaults to targeting only the specified version in the project's metadata (`Info.plist` if this update is for iOS clients, and `build.gradle` for Android clients).

#### Rollout parameter

This is the same parameter as the one described in the [above section](#rollout-parameter). If left unspecified, the release will be made available to all users.

### Releasing Updates (Cordova)

After configuring your Cordova app to query for updates against the CodePush service--using your desired deployment--you can begin pushing updates to it using the following command:

```shell
code-push release-cordova <appName> <platform>
[--deploymentName <deploymentName>]
[--description <description>]
[--mandatory]
[--targetBinaryVersion <targetBinaryVersion>]
[--rollout <rolloutPercentage>]
```

The `release-cordova` command does two things in addition to running the vanilla `release` command described in the [Releasing App Updates](#releasing-app-updates) section:

1. It [updates the contents](#update-contents-parameter) of the package by calling `cordova prepare` for the specified platform
2. It infers the [`targetBinaryVersion` of this release](#target-binary-range-parameter) by reading the version in the `<widget version>` in config.xml, and defaults to target only the specified version.

It then calls the vanilla `release` command by supplying the values for the required parameters using the above information. Doing this helps you avoid the manual step of generating the update contents yourself using the `cordova prepare` command and also avoid common pitfalls such as supplying an invalid `targetBinaryVersion` parameter.

#### Platform parameter

This specifies which platform the current update is targeting, and can be either `ios` or `android` (case-insensitive).

#### Deployment name parameter

This is the same parameter as the one described in the [above section](#deployment-name-parameter).

#### Description parameter

This is the same parameter as the one described in the [above section](#description-parameter).

#### Mandatory parameter

This is the same parameter as the one described in the [above section](#mandatory-parameter).

#### Target binary version parameter

This is the same parameter as the one described in the [above section](#target-binary-version-parameter). If left unspecified, the command defaults to targeting only the specified version in the project's metadata (`Info.plist` if this update is for iOS clients, and `build.gradle` for Android clients).

#### Rollout parameter

This is the same parameter as the one described in the [above section](#rollout-parameter). If left unspecified, the release will be made available to all users.

## Patching Updates

After releasing an update, there may be scenarios where you need to modify one or more of the attributes associated with the release (e.g. you forgot to mark a critical bug fix as mandatory, you want to increase the rollout percentage of an update). You can easily do this by running the following command:

```shell
code-push patch <appName> <deploymentName>
[--label <releaseLabel>]
[--mandatory <isMandatory>]
[--description <descriptio>]
[--rollout <rolloutPercentage>]
```

Aside from the `appName` and `deploymentName`, all parameters all optional, and therefore, you can use this command to update just a single attribute or all of them at once. Calling the `patch` command without specifying any attribute flag will result in a no-op.
#### Label Parameter

Indicates which release (e.g. `v23`) you want to update within the specified deployment. If ommitted, the requested changes will be applied to the latest release in the specified deployment.

*NOTE: This parameter can be set using either `--label` or `-l`* 

#### Mandatory Parameter

This is the same parameter as the one described in the [above section](#mandatory-parameter), and simply allows you to update whether the release should be considered mandatory or not. Note that `--mandatory` and `--mandatory true` are equivalent, but the absence of this flag is not equivalent to `--mandatory false`. Therefore, if the parameter is ommitted, no change will be made to the value of the target release's mandatory property. You need to set this to `--mandatory false` to explicitly make a release optional.

#### Description Parameter

This is the same parameter as the one described in the [above section](#description-parameter), and simply allows you to update the description associated with the release (e.g. you made a typo when releasing, or you forgot to add a description at all). If this parameter is ommitted, no change will be made to the value of the target release's description property. 

#### Rollout Parameter

This is the same parameter as the one described in the [above section](#rollout-parameter), and simply allows you to increase the rollout percentage of the target release. This parameter can only be set to an integer whose value is greater than the current rollout value. Additionally, if you want to "complete" the rollout, and therefore, make the release available to everyone, you can simply set this parameter to `--rollout 100`. If this parameter is ommitted, no change will be made to the value of the target release's rollout parameter.

Additionally, as mentioned above, when you release an update without a rollout value, it is treated equivalently to setting the rollout to `100`. Therefore, if you released an update without a rollout, you cannot change the rollout property of it via the `patch` command since that would be considered lowering the rollout percentage.

## Promoting Updates

Once you've tested an update against a specific deployment (e.g. `Staging`), and you want to promote it "downstream" (e.g. dev->staging, staging->production), you can simply use the following command to copy the release from one deployment to another:

```
code-push promote <appName> <sourceDeploymentName> <destDeploymentName>
[--description <description>]
[--mandatory]
[--rollout <rolloutPercentage>]
```

The `promote` command will create a new release for the destination deployment, which includes the **exact code and metadata** (description, mandatory and target binary version) from the latest release of the source deployment. While you could use the `release` command to "manually" migrate an update from one environment to another, the `promote` command has the following benefits:

1. It's quicker, since you don't need to reassemble the release assets you want to publish or remember the description/app store version that are associated with the source deployment's release.

2. It's less error-prone, since the promote operation ensures that the exact thing that you already tested in the source deployment (e.g. `Staging`) will become active in the destination deployment (e.g. `Production`).

We recommend that all users take advantage of the automatically created `Staging` and `Production` environments, and do all releases directly to `Staging`, and then perform a `promote` from `Staging` to `Production` after performing the appropriate testing.

### Description parameter

This is the same parameter as the one described in the [above section](#description-parameter), and simply allows you to override the description that will be used for the promoted release. If unspecified, the new release will inherit the description from the release being promoted.

### Mandatory parameter

This is the same parameter as the one described in the [above section](#mandatory-parameter), and simply allows you to override the mandatory flag that will be used for the promoted release. If unspecified, the new release will inherit the mandatory property from the release being promoted.

### Rollout parameter

This is the same parameter as the one described in the [above section](#rollout-parameter), and allows you to specify whether the newly created release should only be made available to a portion of your users. Unlike the `mandatory` and `description` parameters, the `rollout` of a release is not carried over as part of a promote, and so you need to explicitly set this if you don't want the new release to be available to all of your users.

## Rolling Back Updates

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

## Viewing Release History

You can view a history of the 50 most recent releases for a specific app deployment using the following command:

```
code-push deployment history <appName> <deploymentName>
```

The history will display all attributes about each release (e.g. label, mandatory) as well as indicate if any releases were made due to a promotion or a rollback operation.

![Deployment History](https://cloud.githubusercontent.com/assets/696206/11605068/14e440d0-9aab-11e5-8837-69ab09bfb66c.PNG)

Additionally, the history displays the install metrics for each release. You can view the details about how to interpret the metric data in the documentation for the `deployment ls` command above.

By default, the history doesn't display the author of each release, but if you are collaborating on an app with other developers, and want to view who released each update, you can pass the additional `--displayAuthor` (or `-a`) flag to the history command.

*NOTE: The history command can also be run using the "h" alias*

## Clearing Release History

You can clear the release history associated with a deployment using the following command: 

```
code-push deployment clear <appName> <deploymentName>
```

After running this command, client devices configured to receive updates using its associated deployment key will no longer receive the updates that have been cleared. This command is irreversible, and therefore should not be used in a production deployment.