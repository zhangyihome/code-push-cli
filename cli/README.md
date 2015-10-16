# CodePush Command Line Interface (CLI)

## Installation

* Install [Node.js](https://nodejs.org/)
* Install CodePush CLI: `npm install -g code-push-cli`

## Usage

1. While the service is in beta, you need to request access to the CodePush service [here](https://microsoft.github.io/code-push)
2. Once your request has been accepted, you can authenticate using the CodePush CLI (details below)
3. Register your app with the service, and optionally create any additional deployments
4. CodePush-ify your app and point it at the deployment you wish to use ([Cordova](http://github.com/cordova-plugin-code-push), [React Native](http://github.com/react-native-))
4. Deploy an update for your registered app
5. Live long and prosper!

### Authentication

Every command within the CodePush CLI requires authentication, and therefore, before you can begin managing your account, you need to login using the Github or Microsoft account you used when requesting access to the service. You can do this by running the following command:

```
code-push login
```

This will launch a browser, asking you to authenticate with the appropriate identity provider
and then generate an access token. Copy/paste the token into the CLI and then close the browser.
You are now succesfully authenticated!

When you login from the CLI, your access token (kind of like a cookie) is persisted to disk so
that you don't have to login everytime you attempt to access your account. In order to delete
this file from your computer, simply run the following command:

```
code-push logout
```

### App management
Before you can deploy any updates, you need to register an app with the CodePush service
using the following command:

```
code-push app add <NAME>
```

All new apps automatically come with two deployments (Staging and Production) so that you
can begin distributing updates to multiple channels without needing to do anything extra
(see deployment instructions below).

If you don't like the name you gave an app, you can rename it using the following command:

```
code-push app rename <NAME> <NEW_NAME>
```

If you no longer need an app, you can remove it from the server using the following command:

```
code-push app rm <NAME>
```

And finally, if you want to list all apps that you've registered with the CodePush server,
you can run the following command:

```
code-push app ls
```

### Deployment management
As mentioned above, every created app automatically includes two deployments: Staging and Production. 
This allows you to have multiple versions of your app in flight at any time, while still using the CodePush
server to distribute the updates. If having a staging and production version of your app is enough to suit,
your needs, then you don't need to do anything else. However, if you want an alpha, dev, etc. deployment
you can easily create them using the following command:

```
code-push deployment add <APP_NAME> <DEPLOYMENT_NAME>
```

Just like apps, you can remove, rename and list deployments as well, using the following commands respectively:

```
code-push deployment rename <APP_NAME> <DEPLOYMENT_NAME> <NEW_DEPLOYMENT_NAME>
code-push deployment rm <APP_NAME> <DEPLOYMENT_NAME>
code-push deployment ls <APP_NAME>
```

### Update deployment

Once your app has been confifgured to query for updates against the CodePush service--using your desired deployment--you
can begin pushing updates to it using the following command:

```
code-push deploy <APP_NAME> <PACKAGE> <MIN_APP_VERSION>
[--deploymentName <DEPLOYMENT_NAME>]
[--description <DESCRIPTION>]
[--mandatory <true|false>]
```

#### Package parameter

You can specify either a single file (e.g. a JS bundle for a React Native app), or a path to a directory
(e.g. the /platforms/ios/www folder for a Cordova app). You don't need to zip up multiple files or directories 
in order to deploy those changes. The CLI will automatically zip them for you.

#### Minimum app version parameter

This specifies what the minimum app store version the code you are pushing depends on. This is important if your
JavaScript/etc. takes a dependency on a new capabilitiy of the native side of your app (e.g. a Cordova plugin), and therefore,
requires the user to update to the latest version from the app store.

#### Deployment name parameter

This specifies which deployment you want to deploy the update. This defaults to "Staging", but when you're ready
to deploy to "Production", or one of your own custom deployments, just explicitly set this argument.

*NOTE: The parameter can be set using either "--deploymentName" or "-d".*

#### Description parameter

This provides an optional "change log" for the deployment. The value is simply roundtripped to the client
so that when the update is detected, your app can choose to display it to the end-user.

*NOTE: This parameter can be set using either "--description" or "-desc"*

#### Mandatory parameter

This specifies whether the update is mandatory or not (**true** or **false**). The value is simply roundtripped to the client,
who can decide to actually enforce it or not. The default value is **false**

*NOTE: This parameter can be set using either "--mandatory" or "-m"*