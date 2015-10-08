Code Push Command Line Interface(CLI)
===

Dev Setup
---

* Install [Node.js](https://nodejs.org/)
* Install Gulp: `npm install -g code-push`

Usage
---

* Get access to the code push webservice[TODO: Add link to code push service beta signup].
* Once you have access to the code push webservice use the following commands to create and publish updates to your app.
```
      code-push <command>
      
      Commands:
        access-key      Access key commands
        app             Application commands
        deploy          Upload a new app version to a specific deployment
        deployment      Deployment commands
        deployment-key  Deployment key commands
        login           Authenticate this session with a specific code push server and registered account
        logout          Log out of the current session`
```

###Steps to create an app with code push service using code push CLI.

####Login
* Login using your registered Github or Microsoft account with the code push service.
* Run the following command and select the authentication provider with which to login to the service.
```
      code-push login [serverUrl]
      
      Logs in to https://codepush.azurewebsites.net or the optional [serverUrl]
```

####Create app
* Create an app for the service. Use the following commands to add/remove/view the apps.
```
      code-push app add MyApp
        This will create an app named 'MyApp' in code push service
        
      code-push app --help
      Commands:
        add     Add a new app to your account
        list    List the apps associated with your account
        ls      List the apps associated with your account
        remove  Remove an app from your account
        rename  Rename an existing app
        rm      Remove an app from your account
```

####Create deployment
* Each app is created with two deployments `Staging` and `Production`
* You can use these default deployments or create new deployments according to your requirements(for eg: create one deployment for your iOS app and one for Android app)
* Following commands list how to use deployments.
```
        code-push deployment add MyApp iOSDeployment
          This will create a new deployment named 'iOSDeployment' for 'MyApp'
          
        code-push deployment --help
        
        Commands:
          add     Add a new deployment to an existing app
          list    List the deployments associated with an app
          ls      List the deployments associated with an app
          remove  Remove a deployment from an app
          rename  Rename an existing deployment
          rm      Remove a deployment from an app
```

####Get deployment key
* Every deployment has a primary deployment-key. You need this key to be used in your Cordova/React-Native Android/iOS apps to pull updates from the code push service.
* Make sure you get the correct deployment-key for the deployment to which you would be pushing your app updates.
```
        code-push deployment-key list MyApp iOSDeployment
          ┌─────────┬───────────┬──────────────────────────────────────┐
          │ Name    │ ID        │ Key                                  │
          │ Primary │ VJbY8MoFa │ 57e3df0d-765a-4a46-a4fa-e82b4b40810e │
          └─────────┴───────────┴──────────────────────────────────────┘
          
          Copy the key above for the given deployment to be used in your hybrid mobile apps.

        code-push deployment-key --help
        
        Commands:
          list  List the deployment keys associated with a deployment
          ls    List the deployment keys associated with a deployment
```

###Steps to publish updates to your apps
