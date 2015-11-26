# CodePush management CLI

CodePush is a cloud service that enables Cordova and React Native developers to deploy mobile app updates directly to their users' devices. It works by acting as a central repository that developers can publish updates to (JS, HTML, CSS and images), and that apps can query for updates from (using provided client SDKs for [Cordova](http://github.com/Microsoft/cordova-plugin-code-push) and [React Native](http://github.com/Microsoft/react-native-code-push)). This allows you to have a more deterministic and direct engagement model with your userbase, when addressing bugs and/or adding small features that don't require you to re-build a binary and re-distribute it through the respective app stores.

![CodePush CLI](https://cloud.githubusercontent.com/assets/116461/11233671/1d0329ae-8d75-11e5-8cf4-781109ca83b8.png)

## Installation

* Install [Node.js](https://nodejs.org/) 
* Install the CodePush CLI: `npm install -g code-push-cli`

## Quick Start/Usage

1. Create a [CodePush account](#account-creation) push using the CodePush CLI
2. Register your [app](#app-management) with the service, and optionally create any additional [deployments](#deployment-management)
3. CodePush-ify your app and point it at the deployment you wish to use ([Cordova](http://github.com/Microsoft/cordova-plugin-code-push) and [React Native](http://github.com/Microsoft/react-native-code-push))
4. [Deploy](#update-deployment) an update for your registered app
5. Live long and prosper! ([details](https://en.wikipedia.org/wiki/Vulcan_salute))

### Account creation

Before you can begin releasing app updates, you need to create a CodePush account. You can do this by simply running the following command once you've installed the CLI:

```
code-push register
```

This will launch a browser, asking you to authenticate with either your GitHub or Microsoft account. Once authenticated, it will create a CodePush account "linked" to your GitHub/MSA identity, and generate an access token you can copy/paste into the CLI in order to login. 

*Note: After registering, you are automatically logged-in with the CLI, so until you explicitly log out, you don't need to login again from the same machine.*

### Authentication

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

### App management

Before you can deploy any updates, you need to register an app with the CodePush service using the following command:

```
code-push app add <appName>
```

All new apps automatically come with two deployments (Staging and Production) so that you can begin distributing updates to multiple channels without needing to do anything extra (see deployment instructions below). After you create an app, the CLI will output the deployment keys for the Staging and Production channels, which you can begin using to configure your clients via their respective SDKs (details for [Cordova](http://github.com/cordova-plugin-code-push) and [React Native](http://github.com/react-native-code-push)).

If you don't like the name you gave an app, you can rename it using the following command:

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

### Deployment management
As mentioned above, every created app automatically includes two deployments: **Staging** and **Production**. This allows you to have multiple versions of your app in flight at any given time, while still using the CodePush server to distribute the updates. If having a staging and production version of your app is enough to meet your needs, then you don't need to do anything else. However, if you want an alpha, dev, etc. deployment, you can easily create them using the following command:

```
code-push deployment add <appName> <deploymentName>
```

Just like with apps, you can remove, rename and list deployments as well, using the following commands respectively:

```
code-push deployment rename <appName> <deploymentName> <newDeploymentName>
code-push deployment rm <appName> <deploymentName>
code-push deployment ls <appName>
```

### Releasing app updates

Once your app has been configured to query for updates against the CodePush service--using your desired deployment--you can begin pushing updates to it using the following command:

```
code-push release <appName> <package> <appStoreVersion>
[--deploymentName <deploymentName>]
[--description <description>]
[--mandatory]
```

#### Package parameter

This specifies the location of the content you want to release. You can provide either a single file (e.g. a JS bundle for a React Native app), or a path to a directory (e.g. the `/platforms/ios/www` folder for a Cordova app). You don't need to zip up multiple files or directories in order to deploy those changes, since the CLI will automatically zip them for you. 

It's important that the path you specify refers to the platform-specific, prepared/bundled version of your app. The following table outlines which command you should run before releasing, as well as the location you can subsequently point at using the `package` parameter: 

| Platform               | Prepare command                                                                                  | Package path (relative to project root)    |              
|------------------------|--------------------------------------------------------------------------------------------------|--------------------------------------------|
| Cordova (Android)      | `cordova prepare android`                                                                        | `./platforms/android/assets/www` directory |                      
| Cordova (iOS)          | `cordova prepare ios`                                                                            | `./platforms/ios/www ` directory           |               
| React Native (Android) | `react-native bundle --platform ios --entry-file <entryFile> --bundle-output <bundleOutput>`     | Value of the `--bundle-output` option      |
| React Native (iOS)     | `react-native bundle --platform android --entry-file <entryFile> --bundle-output <bundleOutput>` | Value of the `--bundle-output` option      |

#### App store version parameter

This specifies the semver compliant store/binary version of the application you are releasing the update for. Only users running this exact version will receive the update. This is important if your JavaScript/etc. takes a dependency on a new capabilitiy of the native side of your app (e.g. a Cordova plugin), and therefore, requires the user to update to the latest version from the app store before being able to get it.

The following table outlines the value that CodePush expects you to provide for each respective app type:

| Platform               | Source of app store version                                                  |
|------------------------|------------------------------------------------------------------------------|
| Cordova                | The `<widget version>` attribute in the `config.xml` file                    | 
| React Native (Android) | The `android.defaultConfig.versionName` property in your `build.gradle` file |
| React Native (iOS)     | The `CFBundleShortVersionString` key in the `Info.plist` file                |

#### Deployment name parameter

This specifies which deployment you want to release the update to. This defaults to `Staging`, but when you're ready to deploy to `Production`, or one of your own custom deployments, just explicitly set this argument.

*NOTE: The parameter can be set using either "--deploymentName" or "-d".*

#### Description parameter

This provides an optional "change log" for the deployment. The value is simply roundtripped to the client so that when the update is detected, your app can choose to display it to the end-user.

*NOTE: This parameter can be set using either "--description" or "-desc"*

#### Mandatory parameter

This specifies whether the update is mandatory or not (**true** or **false**). The value is simply roundtripped to the client,
who can decide to actually enforce it or not. The default value is **false**.

*NOTE: This parameter can be set using either "--mandatory" or "-m"*


### Promoting updates across deployments

Once you've tested an update against a specific deployment, and you want to promote it "downstream" (e.g. dev->staging, staging->production), you can simply use the following command to copy the code and metadata (e.g. mandatory, description, app store version) from one deployment to another:

```
code-push promote <appName> <sourceDeploymentName> <destDeploymentName>
code-push promote MyApp Staging Production
```

### Viewing release history

You can view a history of releases for a specific app deployment (including promotions) using the following command:

```
code-push deployment history <appName> <deploymentName>
```

*NOTE: The history command can also be run using the "h" alias*