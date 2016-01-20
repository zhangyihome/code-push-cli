import * as yargs from "yargs";
import * as cli from "../definitions/cli";
import * as chalk from "chalk";
import * as updateNotifier from "update-notifier";
import backslash = require("backslash");

var packageJson = require("../package.json");
const USAGE_PREFIX = "Usage: code-push";
const CODE_PUSH_URL = "https://codepush.azurewebsites.net";

// Command categories are:  access-key, app, release, deployment, deployment-key, login, logout, register
var isValidCommandCategory = false;
// Commands are the verb following the command category (e.g.:  "add" in "app add").
var isValidCommand = false;
var wasHelpShown = false;

export function showHelp(showRootDescription?: boolean): void {
    if (!wasHelpShown) {
        if (showRootDescription) {
            console.log(chalk.cyan("  _____        __  " + chalk.green("  ___           __ ")));
            console.log(chalk.cyan(" / ___/__  ___/ /__" + chalk.green(" / _ \\__ _____ / / ")));
            console.log(chalk.cyan("/ /__/ _ \\/ _  / -_)" + chalk.green(" ___/ // (_-</ _ \\")));
            console.log(chalk.cyan("\\___/\\___/\\_,_/\\__/" + chalk.green("_/   \\_,_/___/_//_/")) + "    CLI v" + packageJson.version);
            console.log(chalk.cyan("======================================"));
            console.log("");
            console.log("CodePush is a service that allows you to publish mobile app updates directly to your users' devices.\n");
            updateCheck();
        }

        yargs.showHelp();
        wasHelpShown = true;
    }
}

function updateCheck(): void {
    var notifier: updateNotifier.IResult = updateNotifier({ pkg: packageJson });
    if (notifier.update) {
        notifier.notify();
    }
}

function accessKeyAdd(commandName: string, yargs: yargs.Argv): void {
    isValidCommand = true;
    yargs.usage(USAGE_PREFIX + " access-key " + commandName + " <description>")
        .demand(/*count*/ 3, /*max*/ 3)  // Require exactly two non-option arguments.
        .example("access-key " + commandName + " \"VSO Integration\"", "Generates a new access key with the description \"VSO Integration\"");

    addCommonConfiguration(yargs);
}

function accessKeyList(commandName: string, yargs: yargs.Argv): void {
    isValidCommand = true;
    yargs.usage(USAGE_PREFIX + " access-key " + commandName + " [--format <format>]")
        .demand(/*count*/ 2, /*max*/ 2)  // Require exactly two non-option arguments.
        .example("access-key " + commandName, "Lists access keys in tabular format")
        .example("access-key " + commandName + " --format json", "Lists apps in JSON format")
        .option("format", { default: "table", demand: false, description: "The output format (\"json\" or \"table\")", type: "string" });

    addCommonConfiguration(yargs);
}

function accessKeyRemove(commandName: string, yargs: yargs.Argv): void {
    isValidCommand = true;
    yargs.usage(USAGE_PREFIX + " access-key " + commandName + " <accessKey>")
        .demand(/*count*/ 3, /*max*/ 3)  // Require exactly three non-option arguments.
        .example("access-key " + commandName + " 8d6513de-050c-4788-96f7-b2a50dd9684v", "Removes the \"8d6513de-050c-4788-96f7-b2a50dd9684v\" access key");

    addCommonConfiguration(yargs);
}

function addCommonConfiguration(yargs: yargs.Argv): void {
    yargs.wrap(/*columnLimit*/ null)
        .strict()  // Validate hyphenated (named) arguments.
        .fail((msg: string) => showHelp());  // Suppress the default error message.
}

function appList(commandName: string, yargs: yargs.Argv): void {
    isValidCommand = true;
    yargs.usage(USAGE_PREFIX + " app " + commandName + " [--format <format>]")
        .demand(/*count*/ 2, /*max*/ 2)  // Require exactly two non-option arguments.
        .example("app " + commandName, "Lists apps in tabular format")
        .example("app " + commandName + " --format json", "Lists apps in JSON format")
        .option("format", { default: "table", demand: false, description: "The output format (\"json\" or \"table\")", type: "string" });

    addCommonConfiguration(yargs);
}

function appRemove(commandName: string, yargs: yargs.Argv): void {
    isValidCommand = true;
    yargs.usage(USAGE_PREFIX + " app " + commandName + " <appName>")
        .demand(/*count*/ 3, /*max*/ 3)  // Require exactly three non-option arguments.
        .example("app " + commandName + " MyApp", "Removes app \"MyApp\"");

    addCommonConfiguration(yargs);
}

function deploymentList(commandName: string, yargs: yargs.Argv): void {
    isValidCommand = true;
    yargs.usage(USAGE_PREFIX + " deployment " + commandName + " <appName> [--format <format>] [--displayKeys]")
        .demand(/*count*/ 3, /*max*/ 3)  // Require exactly three non-option arguments.
        .example("deployment " + commandName + " MyApp", "Lists deployments for app \"MyApp\" in tabular format")
        .example("deployment " + commandName + " MyApp --format json", "Lists deployments for app \"MyApp\" in JSON format")
        .option("format", { default: "table", demand: false, description: "The output format (\"json\" or \"table\")", type: "string" })
        .option("displayKeys", { alias: "k", default: false, demand: false, description: "Whether to display the deployment keys", type: "boolean" });
    addCommonConfiguration(yargs);
}

function deploymentRemove(commandName: string, yargs: yargs.Argv): void {
    isValidCommand = true;
    yargs.usage(USAGE_PREFIX + " deployment " + commandName + " <appName> <deploymentName>")
        .demand(/*count*/ 4, /*max*/ 4)  // Require exactly four non-option arguments.
        .example("deployment " + commandName + " MyApp MyDeployment", "Removes deployment \"MyDeployment\" from app \"MyApp\"");

    addCommonConfiguration(yargs);
}

function deploymentHistory(commandName: string, yargs: yargs.Argv): void {
    isValidCommand = true;
    yargs.usage(USAGE_PREFIX + " deployment " + commandName + " <appName> <deploymentName> [--format <format>]")
        .demand(/*count*/ 4, /*max*/ 4)  // Require exactly four non-option arguments.
        .example("deployment " + commandName + " MyApp MyDeployment", "Shows the release history for deployment \"MyDeployment\" from app \"MyApp\" in tabular format")
        .example("deployment " + commandName + " MyApp MyDeployment --format json", "Shows the release history for deployment \"MyDeployment\" from app \"MyApp\" in JSON format")
        .option("format", { default: "table", demand: false, description: "The output format (\"json\" or \"table\")", type: "string" });

    addCommonConfiguration(yargs);
}

var argv = yargs.usage(USAGE_PREFIX + " <command>")
    .demand(/*count*/ 1, /*max*/ 1)  // Require exactly one non-option argument.
    .command("access-key", "View and delete active user sessions", (yargs: yargs.Argv) => {
        isValidCommandCategory = true;
        yargs.usage(USAGE_PREFIX + " access-key <command>")
            .demand(/*count*/ 2, /*max*/ 2)  // Require exactly two non-option arguments.
            .command("add", "Create a new access key associated with your account", (yargs: yargs.Argv) => accessKeyAdd("add", yargs))
            .command("remove", "Remove an existing access key", (yargs: yargs.Argv) => accessKeyRemove("remove", yargs))
            .command("rm", "Remove an existing access key", (yargs: yargs.Argv) => accessKeyRemove("rm", yargs))
            .command("list", "List the access keys associated with your account", (yargs: yargs.Argv) => accessKeyList("list", yargs))
            .command("ls", "List the access keys associated with your account", (yargs: yargs.Argv) => accessKeyList("ls", yargs))
            .check((argv: any, aliases: { [aliases: string]: string }): any => isValidCommand);  // Report unrecognized, non-hyphenated command category.

        addCommonConfiguration(yargs);
    })
    .command("app", "View and manage your CodePush-enabled apps", (yargs: yargs.Argv) => {
        isValidCommandCategory = true;
        yargs.usage(USAGE_PREFIX + " app <command>")
            .demand(/*count*/ 2, /*max*/ 2)  // Require exactly two non-option arguments.
            .command("add", "Add a new app to your account", (yargs: yargs.Argv): void => {
                isValidCommand = true;
                yargs.usage(USAGE_PREFIX + " app add <appName>")
                    .demand(/*count*/ 3, /*max*/ 3)  // Require exactly three non-option arguments.
                    .example("app add MyApp", "Adds app \"MyApp\"");

                addCommonConfiguration(yargs);
            })
            .command("remove", "Remove an app from your account", (yargs: yargs.Argv) => appRemove("remove", yargs))
            .command("rm", "Remove an app from your account", (yargs: yargs.Argv) => appRemove("rm", yargs))
            .command("rename", "Rename an existing app", (yargs: yargs.Argv) => {
                isValidCommand = true;
                yargs.usage(USAGE_PREFIX + " app rename <currentAppName> <newAppName>")
                    .demand(/*count*/ 4, /*max*/ 4)  // Require exactly four non-option arguments.
                    .example("app rename CurrentName NewName", "Renames app \"CurrentName\" to \"NewName\"");

                addCommonConfiguration(yargs);
            })
            .command("list", "List the apps associated with your account", (yargs: yargs.Argv) => appList("list", yargs))
            .command("ls", "List the apps associated with your account", (yargs: yargs.Argv) => appList("ls", yargs))
            .check((argv: any, aliases: { [aliases: string]: string }): any => isValidCommand);  // Report unrecognized, non-hyphenated command category.

        addCommonConfiguration(yargs);
    })
    .command("release", "Release a new version of your app to a specific deployment", (yargs: yargs.Argv) => {
        yargs.usage(USAGE_PREFIX + " release <appName> <updateContentsPath> <targetBinaryVersion> [--deploymentName <deploymentName>] [--description <description>] [--mandatory]")
            .demand(/*count*/ 4, /*max*/ 4)  // Require exactly four non-option arguments.
            .example("release MyApp app.js 1.0.3", "Release the \"app.js\" file to the \"MyApp\" app's staging deployment, targeting the 1.0.3 binary version")
            .example("release MyApp ./platforms/ios/www 1.0.3 -d Production", "Release the \"./platforms/ios/www\" folder and all its contents to the \"MyApp\" app's \"Production\" deployment, targeting the 1.0.3 binary version")
            .option("deploymentName", { alias: "d", default: "Staging", demand: false, description: "The deployment to publish the update to", type: "string" })
            .option("description", { alias: "des", default: null, demand: false, description: "The description of changes made to the app with this update", type: "string" })
            .option("mandatory", { alias: "m", default: false, demand: false, description: "Whether this update should be considered mandatory to the client", type: "boolean" });

        addCommonConfiguration(yargs);
    })
    .command("promote", "Promote the package from one deployment of your app to another", (yargs: yargs.Argv) => {
        yargs.usage(USAGE_PREFIX + " promote <appName> <sourceDeploymentName> <destDeploymentName>")
            .demand(/*count*/ 4, /*max*/ 4)  // Require exactly four non-option arguments.
            .example("promote MyApp Staging Production", "Promote the latest \"Staging\" package of \"MyApp\" to \"Production\"");

        addCommonConfiguration(yargs);
    })
    .command("rollback", "Performs a rollback on the latest package of a specific deployment", (yargs: yargs.Argv) => {
        yargs.usage(USAGE_PREFIX + " rollback <appName> <deploymentName> [--targetRelease <releaseLabel>]")
            .demand(/*count*/ 3, /*max*/ 3)  // Require exactly three non-option arguments.
            .example("rollback MyApp Production", "Perform a rollback on the \"Production\" deployment of \"MyApp\"")
            .example("rollback MyApp Production --targetRelease v4", "Perform a rollback on the \"Production\" deployment of \"MyApp\" to the v4 release")
            .option("targetRelease", { alias: "r", default: null, demand: false, description: "The label of the release to be rolled back to (e.g. v4)", type: "string" });

        addCommonConfiguration(yargs);
    })
    .command("deployment", "View and manage the deployments for your apps", (yargs: yargs.Argv) => {
        isValidCommandCategory = true;
        yargs.usage(USAGE_PREFIX + " deployment <command>")
            .demand(/*count*/ 2, /*max*/ 2)  // Require exactly two non-option arguments.
            .command("add", "Add a new deployment to an existing app", (yargs: yargs.Argv): void => {
                isValidCommand = true;
                yargs.usage(USAGE_PREFIX + " deployment add <appName> <deploymentName>")
                    .demand(/*count*/ 4, /*max*/ 4)  // Require exactly four non-option arguments.
                    .example("deployment add MyApp MyDeployment", "Adds deployment \"MyDeployment\" to app \"MyApp\"");

                addCommonConfiguration(yargs);
            })
            .command("remove", "Remove a deployment from an app", (yargs: yargs.Argv) => deploymentRemove("remove", yargs))
            .command("rm", "Remove a deployment from an app", (yargs: yargs.Argv) => deploymentRemove("rm", yargs))
            .command("rename", "Rename an existing deployment", (yargs: yargs.Argv) => {
                isValidCommand = true;
                yargs.usage(USAGE_PREFIX + " deployment rename <appName> <currentDeploymentName> <newDeploymentName>")
                    .demand(/*count*/ 5, /*max*/ 5)  // Require exactly five non-option arguments.
                    .example("deployment rename MyApp CurrentDeploymentName NewDeploymentName", "Renames deployment \"CurrentDeploymentName\" to \"NewDeploymentName\"");

                addCommonConfiguration(yargs);
            })
            .command("list", "List the deployments associated with an app", (yargs: yargs.Argv) => deploymentList("list", yargs))
            .command("ls", "List the deployments associated with an app", (yargs: yargs.Argv) => deploymentList("ls", yargs))
            .command("history", "Show the release history of a specific deployment", (yargs: yargs.Argv) => deploymentHistory("history", yargs))
            .command("h", "Show the release history of a specific deployment", (yargs: yargs.Argv) => deploymentHistory("h", yargs))
            .check((argv: any, aliases: { [aliases: string]: string }): any => isValidCommand);  // Report unrecognized, non-hyphenated command category.

        addCommonConfiguration(yargs);
    })
    .command("login", "Authenticate with the CodePush server in order to begin managing your apps", (yargs: yargs.Argv) => {
        isValidCommandCategory = true;
        isValidCommand = true;
        yargs.usage(USAGE_PREFIX + " login [--accessKey <accessKey>]")
            .demand(/*count*/ 1, /*max*/ 2)  // Require one non-optional and one optional argument.
            .example("login", "Logs in to the CodePush server")
            .example("login --accessKey mykey", "Logs in on behalf of the user who owns and created the access key \"mykey\"")
            .option("accessKey", { alias: "key", default: null, demand: false, description: "The access key to be used for this session", type: "string" })
            .check((argv: any, aliases: { [aliases: string]: string }): any => isValidCommand);  // Report unrecognized, non-hyphenated command category.

        addCommonConfiguration(yargs);
    })
    .command("logout", "Log out of the current session", (yargs: yargs.Argv) => {
        isValidCommandCategory = true;
        isValidCommand = true;
        yargs.usage(USAGE_PREFIX + " logout [--local]")
            .demand(/*count*/ 1, /*max*/ 1)  // Require exactly one non-option argument.
            .example("logout", "Log out and also remove the access key used for the current session")
            .example("logout --local", "Log out but allow the use of the same access key for future logins")
            .option("local", { demand: false, description: "Whether to delete the current session's access key on the server", type: "boolean" });
        addCommonConfiguration(yargs);
    })
    .command("register", "Register a new account with the CodePush server", (yargs: yargs.Argv) => {
        isValidCommandCategory = true;
        isValidCommand = true;
        yargs.usage(USAGE_PREFIX + " register")
            .demand(/*count*/ 1, /*max*/ 2)  // Require one non-optional and one optional argument.
            .example("register", "Creates a new user account on the CodePush server")
            .check((argv: any, aliases: { [aliases: string]: string }): any => isValidCommand);  // Report unrecognized, non-hyphenated command category.

        addCommonConfiguration(yargs);
    })
    .alias("v", "version")
    .version(require("../package.json").version)
    .wrap(/*columnLimit*/ null)
    .strict()  // Validate hyphenated (named) arguments.
    .check((argv: any, aliases: { [aliases: string]: string }): any => isValidCommandCategory)  // Report unrecognized, non-hyphenated command category.
    .fail((msg: string) => showHelp(/*showRootDescription*/ true))  // Suppress the default error message.
    .argv;

function createCommand(): cli.ICommand {
    var cmd: cli.ICommand;

    if (!wasHelpShown && argv._ && argv._.length > 0) {
        // Create a command object
        var arg0: any = argv._[0];
        var arg1: any = argv._[1];
        var arg2: any = argv._[2];
        var arg3: any = argv._[3];
        var arg4: any = argv._[4];

        switch (arg0) {
            case "access-key":
                switch (arg1) {
                    case "add":
                        if (arg2) {
                            cmd = { type: cli.CommandType.accessKeyAdd };
                            (<cli.IAccessKeyAddCommand>cmd).description = arg2;
                        }
                        break;

                    case "list":
                    case "ls":
                        cmd = { type: cli.CommandType.accessKeyList };

                        (<cli.IAccessKeyListCommand>cmd).format = argv["format"];
                        break;

                    case "remove":
                    case "rm":
                        if (arg2) {
                            cmd = { type: cli.CommandType.accessKeyRemove };

                            (<cli.IAccessKeyRemoveCommand>cmd).accessKeyName = arg2;
                        }
                        break;
                }
                break;

            case "app":
                switch (arg1) {
                    case "add":
                        if (arg2) {
                            cmd = { type: cli.CommandType.appAdd };

                            (<cli.IAppAddCommand>cmd).appName = arg2;
                        }
                        break;

                    case "list":
                    case "ls":
                        cmd = { type: cli.CommandType.appList };

                        (<cli.IAppListCommand>cmd).format = argv["format"];
                        break;

                    case "remove":
                    case "rm":
                        if (arg2) {
                            cmd = { type: cli.CommandType.appRemove };

                            (<cli.IAppRemoveCommand>cmd).appName = arg2;
                        }
                        break;

                    case "rename":
                        if (arg2 && arg3) {
                            cmd = { type: cli.CommandType.appRename };

                            var appRenameCommand = <cli.IAppRenameCommand>cmd;

                            appRenameCommand.currentAppName = arg2;
                            appRenameCommand.newAppName = arg3;
                        }
                        break;
                }
                break;

            case "deployment":
                switch (arg1) {
                    case "add":
                        if (arg2 && arg3) {
                            cmd = { type: cli.CommandType.deploymentAdd };

                            var deploymentAddCommand = <cli.IDeploymentAddCommand>cmd;

                            deploymentAddCommand.appName = arg2;
                            deploymentAddCommand.deploymentName = arg3;
                        }
                        break;

                    case "list":
                    case "ls":
                        if (arg2) {
                            cmd = { type: cli.CommandType.deploymentList };

                            var deploymentListCommand = <cli.IDeploymentListCommand>cmd;

                            deploymentListCommand.appName = arg2;
                            deploymentListCommand.format = argv["format"];
                            deploymentListCommand.displayKeys = argv["displayKeys"];
                        }
                        break;

                    case "remove":
                    case "rm":
                        if (arg2 && arg3) {
                            cmd = { type: cli.CommandType.deploymentRemove };

                            var deploymentRemoveCommand = <cli.IDeploymentRemoveCommand>cmd;

                            deploymentRemoveCommand.appName = arg2;
                            deploymentRemoveCommand.deploymentName = arg3;
                        }
                        break;

                    case "rename":
                        if (arg2 && arg3 && arg4) {
                            cmd = { type: cli.CommandType.deploymentRename };

                            var deploymentRenameCommand = <cli.IDeploymentRenameCommand>cmd;

                            deploymentRenameCommand.appName = arg2;
                            deploymentRenameCommand.currentDeploymentName = arg3;
                            deploymentRenameCommand.newDeploymentName = arg4;
                        }
                        break;

                    case "history":
                    case "h":
                        if (arg2 && arg3) {
                            cmd = { type: cli.CommandType.deploymentHistory };

                            var deploymentHistoryCommand = <cli.IDeploymentHistoryCommand>cmd;

                            deploymentHistoryCommand.appName = arg2;
                            deploymentHistoryCommand.deploymentName = arg3;
                            deploymentHistoryCommand.format = argv["format"];
                        }
                        break;
                }
                break;

            case "login":
                cmd = { type: cli.CommandType.login };

                var loginCommand = <cli.ILoginCommand>cmd;

                loginCommand.serverUrl = getServerUrl(arg1);
                loginCommand.accessKey = argv["accessKey"];
                break;

            case "logout":
                cmd = { type: cli.CommandType.logout };

                var logoutCommand = <cli.ILogoutCommand>cmd;

                logoutCommand.isLocal = argv["local"];
                break;

            case "promote":
                if (arg1 && arg2 && arg3) {
                    cmd = { type: cli.CommandType.promote };

                    var deploymentPromoteCommand = <cli.IPromoteCommand>cmd;

                    deploymentPromoteCommand.appName = arg1;
                    deploymentPromoteCommand.sourceDeploymentName = arg2;
                    deploymentPromoteCommand.destDeploymentName = arg3;
                }
                break;

            case "register":
                cmd = { type: cli.CommandType.register };

                var registerCommand = <cli.IRegisterCommand>cmd;

                registerCommand.serverUrl = getServerUrl(arg1);
                break;

            case "release":
                if (arg1 && arg2 && arg3) {
                    cmd = { type: cli.CommandType.release };

                    var releaseCommand = <cli.IReleaseCommand>cmd;

                    releaseCommand.appName = arg1;
                    releaseCommand.package = arg2;
                    releaseCommand.appStoreVersion = arg3;
                    releaseCommand.deploymentName = argv["deploymentName"];
                    releaseCommand.description = argv["description"] ? backslash(argv["description"]) : "";
                    releaseCommand.mandatory = argv["mandatory"];
                }
                break;

            case "rollback":
                if (arg1 && arg2) {
                    cmd = { type: cli.CommandType.rollback };

                    var rollbackCommand = <cli.IRollbackCommand>cmd;

                    rollbackCommand.appName = arg1;
                    rollbackCommand.deploymentName = arg2;
                    rollbackCommand.targetRelease = argv["targetRelease"];
                }
                break;
        }

        return cmd;
    }
}

function getServerUrl(customUrl: string): string {
    var url: string = customUrl || CODE_PUSH_URL;

    // Trim whitespace and a trailing slash (/) character.
    url = url.trim();
    if (url[url.length - 1] === "/") {
        url = url.substring(0, url.length - 1);
    }

    return url;
}

export var command = createCommand();
