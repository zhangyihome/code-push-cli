import * as yargs from "yargs";
import * as cli from "../definitions/cli";
import * as semver from "semver";
import * as chalk from "chalk";

const USAGE_PREFIX = "Usage:  code-push";
const CODE_PUSH_URL = "https://codepush.azurewebsites.net";

// Command categories are:  access-key, app, deploy, deployment, deployment-key, login, logout, register
var isValidCommandCategory = false;
// Commands are the verb following the command category (e.g.:  "add" in "app add").
var isValidCommand = false;
var wasHelpShown = false;

function showHelp(showRootDescription?: boolean): void {
    if (!wasHelpShown) {
        if (showRootDescription) {
            console.log(chalk.cyan("  _____        __  " + chalk.green("  ___           __ ")));
            console.log(chalk.cyan(" / ___/__  ___/ /__" + chalk.green(" / _ \\__ _____ / / ")));
            console.log(chalk.cyan("/ /__/ _ \\/ _  / -_)" + chalk.green(" ___/ // (_-</ _ \\")));
            console.log(chalk.cyan("\\___/\\___/\\_,_/\\__/" + chalk.green("_/   \\_,_/___/_//_/")) + "    CLI v" + require("../package.json").version);
            console.log(chalk.cyan("======================================"));
            console.log("");
            console.log("CodePush is a service that allows you to publish mobile app updates directly to your users' devices.\n");
        }
        
        yargs.showHelp();
        wasHelpShown = true;
    }
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
    yargs.usage(USAGE_PREFIX + " access-key " + commandName + " <accessKeyName>")
        .demand(/*count*/ 3, /*max*/ 3)  // Require exactly three non-option arguments.
        .example("access-key " + commandName + " abc", "Removes access key \"abc\"");

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
    yargs.usage(USAGE_PREFIX + " deployment " + commandName + " <appName> [--format <format>] [--verbose <true|false>]")
        .demand(/*count*/ 3, /*max*/ 3)  // Require exactly three non-option arguments.
        .example("deployment " + commandName + " MyApp", "Lists deployments for app \"MyApp\" in tabular format")
        .example("deployment " + commandName + " MyApp --format json", "Lists deployments for app \"MyApp\" in JSON format")
        .option("format", { default: "table", demand: false, description: "The output format (\"json\" or \"table\")", type: "string" })
        .option("verbose", { alias: "v", demand: false, description: "Show deployment description and package metadata", type: "boolean" })
    addCommonConfiguration(yargs);
}

function deploymentRemove(commandName: string, yargs: yargs.Argv): void {
    isValidCommand = true;
    yargs.usage(USAGE_PREFIX + " deployment " + commandName + " <appName> <deploymentName>")
        .demand(/*count*/ 4, /*max*/ 4)  // Require exactly four non-option arguments.
        .example("deployment " + commandName + " MyApp MyDeployment", "Removes deployment \"MyDeployment\" from app \"MyApp\"");

    addCommonConfiguration(yargs);
}

var argv = yargs.usage(USAGE_PREFIX + " <command>")
    .demand(/*count*/ 1, /*max*/ 1)  // Require exactly one non-option argument.
    .command("access-key", "View and delete active user sessions", (yargs: yargs.Argv) => {
        isValidCommandCategory = true;
        yargs.usage(USAGE_PREFIX + " access-key <command>")
            .demand(/*count*/ 2, /*max*/ 2)  // Require exactly two non-option arguments.
            .command("list", "List the access keys associated with your account", (yargs: yargs.Argv) => accessKeyList("list", yargs))
            .command("ls", "List the access keys associated with your account", (yargs: yargs.Argv) => accessKeyList("ls", yargs))
            .command("remove", "Remove an existing access key", (yargs: yargs.Argv) => accessKeyRemove("remove", yargs))
            .command("rm", "Remove an existing access key", (yargs: yargs.Argv) => accessKeyRemove("rm", yargs))
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
            .command("list", "List the apps associated with your account", (yargs: yargs.Argv) => appList("list", yargs))
            .command("ls", "List the apps associated with your account", (yargs: yargs.Argv) => appList("ls", yargs))
            .command("remove", "Remove an app from your account", (yargs: yargs.Argv) => appRemove("remove", yargs))
            .command("rename", "Rename an existing app", (yargs: yargs.Argv) => {
                isValidCommand = true;
                yargs.usage(USAGE_PREFIX + " app rename <currentAppName> <newAppName>")
                    .demand(/*count*/ 4, /*max*/ 4)  // Require exactly four non-option arguments.
                    .example("app rename CurrentName NewName", "Renames app \"CurrentName\" to \"NewName\"");

                addCommonConfiguration(yargs);
            })
            .command("rm", "Remove an app from your account", (yargs: yargs.Argv) => appRemove("rm", yargs))
            .check((argv: any, aliases: { [aliases: string]: string }): any => isValidCommand);  // Report unrecognized, non-hyphenated command category.

        addCommonConfiguration(yargs);
    })
    .command("deploy", "Upload a new app version to a specific deployment", (yargs: yargs.Argv) => {
        yargs.usage(USAGE_PREFIX + " deploy <appName> <package> <minAppVersion> [--deploymentName <deploymentName>] [--description <description>] [--mandatory <true|false>]")
            .demand(/*count*/ 4, /*max*/ 4)  // Require exactly four non-option arguments.
            .example("deploy MyApp app.js 1.0.3", "Upload app.js to the default deployment for app \"MyApp\" with the minimum required semver compliant app version of 1.0.3")
            .example("deploy MyApp ./platforms/ios/www 1.0.3 -d Production", "Upload the \"./platforms/ios/www\" folder and all its contents to the \"Production\" deployment for app \"MyApp\" with the minimum required semver compliant app version of 1.0.3")
            .option("deploymentName", { alias: "d", default: "Staging", demand: false, description: "The deployment to publish the update to", type: "string" })
            .option("description", { alias: "des", default: null, demand: false, description: "The description of changes made to the app with this update", type: "string" })
            .option("mandatory", { alias: "m", default: false, demand: false, description: "Whether this update should be considered mandatory to the client", type: "boolean" })
            .check((argv: any, aliases: { [alias: string]: string }) => {
                var minAppVersion: string = argv._[3];
                return semver.valid(minAppVersion) !== null;
            });

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
            .command("list", "List the deployments associated with an app", (yargs: yargs.Argv) => deploymentList("list", yargs))
            .command("ls", "List the deployments associated with an app", (yargs: yargs.Argv) => deploymentList("ls", yargs))
            .command("remove", "Remove a deployment from an app", (yargs: yargs.Argv) => deploymentRemove("remove", yargs))
            .command("rename", "Rename an existing deployment", (yargs: yargs.Argv) => {
                isValidCommand = true;
                yargs.usage(USAGE_PREFIX + " deployment rename <appName> <currentDeploymentName> <newDeploymentName>")
                    .demand(/*count*/ 5, /*max*/ 5)  // Require exactly five non-option arguments.
                    .example("deployment rename MyApp CurrentDeploymentName NewDeploymentName", "Renames deployment \"CurrentDeploymentName\" to \"NewDeploymentName\"");

                addCommonConfiguration(yargs);
            })
            .command("rm", "Remove a deployment from an app", (yargs: yargs.Argv) => deploymentRemove("rm", yargs))
            .check((argv: any, aliases: { [aliases: string]: string }): any => isValidCommand);  // Report unrecognized, non-hyphenated command category.

        addCommonConfiguration(yargs);
    })
    .command("login", "Authenticate with the CodePush server in order to begin managing your apps", (yargs: yargs.Argv) => {
        isValidCommandCategory = true;
        isValidCommand = true;
        yargs.usage(USAGE_PREFIX + " login [serverUrl]")
            .demand(/*count*/ 1, /*max*/ 2)  // Require one non-optional and one optional argument.
            .example("login", "Logs in to " + CODE_PUSH_URL)
            .check((argv: any, aliases: { [aliases: string]: string }): any => isValidCommand);  // Report unrecognized, non-hyphenated command category.

        addCommonConfiguration(yargs);
    })
    .command("logout", "Log out of the current session", (yargs: yargs.Argv) => {
        isValidCommandCategory = true;
        isValidCommand = true;
    })
    // Disabling this for closed beta
    //.command("register", "Register a new account with a specific CodePush server", (yargs: yargs.Argv) => {
        //isValidCommandCategory = true;
        //isValidCommand = true;
        //yargs.usage(USAGE_PREFIX + " register [serverUrl]")
            //.demand(/*count*/ 1, /*max*/ 2)  // Require one non-optional and one optional argument.
            //.example("register", "Creates a new user account with " + CODE_PUSH_URL)
            //.check((argv: any, aliases: { [aliases: string]: string }): any => isValidCommand);  // Report unrecognized, non-hyphenated command category.

        //addCommonConfiguration(yargs);
    //})
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

            case "deploy":
                if (arg1 && arg2 && arg3) {
                    cmd = { type: cli.CommandType.deploy };

                    var deployCommand = <cli.IDeployCommand>cmd;

                    deployCommand.appName = arg1;
                    deployCommand.package = arg2;
                    deployCommand.minAppVersion = arg3;
                    deployCommand.deploymentName = argv["deploymentName"];
                    deployCommand.description = argv["description"];
                    deployCommand.mandatory = argv["mandatory"];
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
                            deploymentListCommand.verbose = argv["verbose"];
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
                }
                break;

            case "login":
                cmd = { type: cli.CommandType.login };

                var loginCommand = <cli.ILoginCommand>cmd;

                loginCommand.serverUrl = getServerUrl(arg1);
                break;

            case "logout":
                cmd = { type: cli.CommandType.logout };
                break;

            case "register":
                cmd = { type: cli.CommandType.register };

                var registerCommand = <cli.IRegisterCommand>cmd;

                registerCommand.serverUrl = getServerUrl(arg1);
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