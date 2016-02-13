/// <reference path="../../definitions/generated/code-push.d.ts" />

import * as base64 from "base-64";
import * as chalk from "chalk";
import * as fs from "fs";
import * as moment from "moment";
var opener = require("opener");
import * as os from "os";
import * as path from "path";
var prompt = require("prompt");
import * as Q from "q";
import * as recursiveFs from "recursive-fs";
import * as semver from "semver";
import slash = require("slash");
var Table = require("cli-table");
import * as yazl from "yazl";
import wordwrap = require("wordwrap");

import * as cli from "../definitions/cli";
import { AcquisitionStatus } from "code-push/script/acquisition-sdk";
import { AccessKey, AccountManager, App, CollaboratorMap, CollaboratorProperties, Deployment, DeploymentMetrics, Package, Permissions, UpdateMetrics } from "code-push";
var packageJson = require("../package.json");
import Promise = Q.Promise;
var progress = require("progress");
var emailValidator = require("email-validator");

var configFilePath: string = path.join(process.env.LOCALAPPDATA || process.env.HOME, ".code-push.config");
var userAgent: string = packageJson.name + "/" + packageJson.version;

const ACTIVE_METRICS_KEY: string = "Active";
const DOWNLOADED_METRICS_KEY: string = "Downloaded";

interface NameToCountMap {
    [name: string]: number;
}

interface ILegacyLoginConnectionInfo {
    accessKeyName: string;
    providerName: string;
    providerUniqueId: string;
    serverUrl: string;
}

interface ILoginConnectionInfo {
    accessKey: string;
    serverUrl: string;
}

interface IPackageFile {
    isTemporary: boolean;
    path: string;
}

export interface UpdateMetricsWithTotalActive extends UpdateMetrics {
    totalActive: number;
}

export interface PackageWithMetrics {
    metrics?: UpdateMetricsWithTotalActive;
}

export var sdk: AccountManager;
export var log = (message: string | Chalk.ChalkChain): void => console.log(message);

export var confirm = (): Promise<boolean> => {
    return Promise<boolean>((resolve, reject, notify): void => {
        prompt.message = "";
        prompt.delimiter = "";

        prompt.start();

        prompt.get({
            properties: {
                response: {
                    description: chalk.cyan("Are you sure? (Y/n):")
                }
            }
        }, (err: any, result: any): void => {
            if (!result.response || result.response === "" || result.response === "Y") {
                resolve(true);
            } else {
                if (result.response !== "n") console.log("Invalid response: \"" + result.response + "\"");
                resolve(false);
            }
        });
    });
}

function accessKeyAdd(command: cli.IAccessKeyAddCommand): Promise<void> {
    var hostname: string = os.hostname();
    return sdk.addAccessKey(hostname, command.description)
        .then((accessKey: AccessKey) => {
            log("Successfully created a new access key" + (command.description ? (" \"" + command.description + "\"") : "") + ": " + accessKey.name);
        });
}

function accessKeyList(command: cli.IAccessKeyListCommand): Promise<void> {
    throwForInvalidOutputFormat(command.format);

    return sdk.getAccessKeys()
        .then((accessKeys: AccessKey[]): void => {
            printAccessKeys(command.format, accessKeys);
        });
}

function accessKeyRemove(command: cli.IAccessKeyRemoveCommand): Promise<void> {
    if (command.accessKey === sdk.accessKey) {
        throw new Error("Cannot remove the access key for the current session. Please run 'code-push logout' if you would like to remove this access key.");
    } else {
        return getAccessKeyId(command.accessKey)
            .then((accessKeyId: string): Promise<void> => {
                throwForInvalidAccessKeyId(accessKeyId, command.accessKey);

                return confirm()
                    .then((wasConfirmed: boolean): Promise<void> => {
                        if (wasConfirmed) {
                            return sdk.removeAccessKey(accessKeyId)
                                .then((): void => {
                                    log("Successfully removed the \"" + command.accessKey + "\" access key.");
                                });
                        }

                        log("Access key removal cancelled.");
                    });
            });
    }
}

function appAdd(command: cli.IAppAddCommand): Promise<void> {
    return sdk.addApp(command.appName)
        .then((app: App): Promise<void> => {
            log("Successfully added the \"" + command.appName + "\" app, along with the following default deployments:");
            var deploymentListCommand: cli.IDeploymentListCommand = {
                type: cli.CommandType.deploymentList,
                appName: app.name,
                format: "table",
                displayKeys: true
            };
            return deploymentList(deploymentListCommand, /*showPackage=*/ false);
        });
}

function appList(command: cli.IAppListCommand): Promise<void> {
    throwForInvalidOutputFormat(command.format);
    var apps: App[];
    return sdk.getApps()
        .then((retrievedApps: App[]): Promise<string[][]> => {
            apps = retrievedApps;
            var deploymentListPromises: Promise<string[]>[] = apps.map((app: App) => {

                return sdk.getDeployments(app.id)
                    .then((deployments: Deployment[]) => {
                        var deploymentList: string[] = deployments
                            .map((deployment: Deployment) => deployment.name)
                            .sort((first: string, second: string) => {
                                return first.toLowerCase().localeCompare(second.toLowerCase());
                            });
                        return deploymentList;
                    });
            });
            return Q.all(deploymentListPromises);
        })
        .then((deploymentLists: string[][]): void => {
            printAppList(command.format, apps, deploymentLists);
        });
}

function appRemove(command: cli.IAppRemoveCommand): Promise<void> {
    return getAppId(command.appName)
        .then((appId: string): Promise<void> => {
            throwForInvalidAppId(appId, command.appName);

            return confirm()
                .then((wasConfirmed: boolean): Promise<void> => {
                    if (wasConfirmed) {
                        return sdk.removeApp(appId)
                            .then((): void => {
                                log("Successfully removed the \"" + command.appName + "\" app.");
                            });
                    }

                    log("App removal cancelled.");
                });
        });
}

function appRename(command: cli.IAppRenameCommand): Promise<void> {
    return getApp(command.currentAppName)
        .then((app: App): Promise<void> => {
            throwForInvalidApp(app, command.currentAppName);

            app.name = command.newAppName;

            return sdk.updateApp(app);
        })
        .then((): void => {
            log("Successfully renamed the \"" + command.currentAppName + "\" app to \"" + command.newAppName + "\".");
        });
}

function appTransfer(command: cli.IAppTransferCommand): Promise<void> {
    throwForInvalidEmail(command.email);

    return getAppId(command.appName)
        .then((appId: string): Promise<void> => {
            throwForInvalidAppId(appId, command.appName);

            return confirm()
                .then((wasConfirmed: boolean): Promise<void> => {
                    if (wasConfirmed) {
                        return sdk.transferApp(appId, command.email)
                            .then((): void => {
                                log("Successfully transferred the ownership of app \"" + command.appName + "\" to the account with email \"" + command.email + "\".");
                            });
                    }

                    log("App transfer cancelled.");
                });
        });
}

function addCollaborator(command: cli.ICollaboratorAddCommand): Promise<void> {
    throwForInvalidEmail(command.email);

    return getAppId(command.appName)
        .then((appId: string): Promise<void> => {
            throwForInvalidAppId(appId, command.appName);

            return sdk.addCollaborator(appId, command.email)
                .then((): void => {
                    log("Successfully added \"" + command.email + "\" as a collaborator to the app \"" + command.appName + "\".");
                });
        });
}

function listCollaborators(command: cli.ICollaboratorListCommand): Promise<void> {
    throwForInvalidOutputFormat(command.format);
    return getAppId(command.appName)
        .then((appId: string): Promise<void> => {
            throwForInvalidAppId(appId, command.appName);

            return sdk.getCollaboratorsList(appId)
                .then((retrievedCollaborators: CollaboratorMap): void => {
                    printCollaboratorsList(command.format, retrievedCollaborators);
                });
        });
}

function removeCollaborator(command: cli.ICollaboratorRemoveCommand): Promise<void> {
    throwForInvalidEmail(command.email);

    return getAppId(command.appName)
        .then((appId: string): Promise<void> => {
            throwForInvalidAppId(appId, command.appName);

            return confirm()
                .then((wasConfirmed: boolean): Promise<void> => {
                    if (wasConfirmed) {
                        return sdk.removeCollaborator(appId, command.email)
                            .then((): void => {
                                log("Successfully removed \"" + command.email + "\" as a collaborator from the app \"" + command.appName + "\".");
                            });
                    }

                    log("App collaborator removal cancelled.");
                });
        });
}

function deleteConnectionInfoCache(): void {
    try {
        fs.unlinkSync(configFilePath);

        log("Successfully logged-out. The session token file located at " + chalk.cyan(configFilePath) + " has been deleted.\r\n");
    } catch (ex) {
    }
}

function deploymentAdd(command: cli.IDeploymentAddCommand): Promise<void> {
    return getAppId(command.appName)
        .then((appId: string): Promise<void> => {
            throwForInvalidAppId(appId, command.appName);

            return sdk.addDeployment(appId, command.deploymentName)
                .then((deployment: Deployment): void => {
                    log("Successfully added the \"" + command.deploymentName + "\" deployment with key \"" + deployment.key + "\" to the \"" + command.appName + "\" app.");
                });
        })
}

export var deploymentList = (command: cli.IDeploymentListCommand, showPackage: boolean = true): Promise<void> => {
    throwForInvalidOutputFormat(command.format);
    var theAppId: string;
    var deployments: Deployment[];

    return getAppId(command.appName)
        .then((appId: string): Promise<Deployment[]> => {
            throwForInvalidAppId(appId, command.appName);
            theAppId = appId;

            return sdk.getDeployments(appId);
        })
        .then((retrievedDeployments: Deployment[]) => {
            deployments = retrievedDeployments;
            if (showPackage) {
                var metricsPromises: Promise<void>[] = deployments.map((deployment: Deployment) => {
                    if (deployment.package) {
                        return sdk.getDeploymentMetrics(theAppId, deployment.id)
                            .then((metrics: DeploymentMetrics): void => {
                                if (metrics[deployment.package.label]) {
                                    var totalActive: number = getTotalActiveFromDeploymentMetrics(metrics);
                                    (<PackageWithMetrics>(deployment.package)).metrics = {
                                        active: metrics[deployment.package.label].active,
                                        downloaded: metrics[deployment.package.label].downloaded,
                                        failed: metrics[deployment.package.label].failed,
                                        installed: metrics[deployment.package.label].installed,
                                        totalActive: totalActive
                                    };
                                }
                            });
                    } else {
                        return Q(<void>null);
                    }
                });

                return Q.all(metricsPromises);
            }
        })
        .then(() => {
            printDeploymentList(command, deployments, showPackage);
        });
}

function deploymentRemove(command: cli.IDeploymentRemoveCommand): Promise<void> {
    return getAppId(command.appName)
        .then((appId: string): Promise<void> => {
            throwForInvalidAppId(appId, command.appName);

            return getDeploymentId(appId, command.deploymentName)
                .then((deploymentId: string): Promise<void> => {
                    throwForInvalidDeploymentId(deploymentId, command.deploymentName, command.appName);

                    return confirm()
                        .then((wasConfirmed: boolean): Promise<void> => {
                            if (wasConfirmed) {
                                return sdk.removeDeployment(appId, deploymentId)
                                    .then((): void => {
                                        log("Successfully removed the \"" + command.deploymentName + "\" deployment from the \"" + command.appName + "\" app.");
                                    })
                            }

                            log("Deployment removal cancelled.");
                        });
                });
        });
}

function deploymentRename(command: cli.IDeploymentRenameCommand): Promise<void> {
    return getAppId(command.appName)
        .then((appId: string): Promise<void> => {
            throwForInvalidAppId(appId, command.appName);

            return getDeployment(appId, command.currentDeploymentName)
                .then((deployment: Deployment): Promise<void> => {
                    throwForInvalidDeployment(deployment, command.currentDeploymentName, command.appName);

                    deployment.name = command.newDeploymentName;

                    return sdk.updateDeployment(appId, deployment);
                })
                .then((): void => {
                    log("Successfully renamed the \"" + command.currentDeploymentName + "\" deployment to \"" + command.newDeploymentName + "\" for the \"" + command.appName + "\" app.");
                });
        });
}

function deploymentHistory(command: cli.IDeploymentHistoryCommand): Promise<void> {
    throwForInvalidOutputFormat(command.format);
    var storedAppId: string;
    var storedDeploymentId: string;
    var deployments: Deployment[];
    var currentUserEmail: string;


    return getApp(command.appName)
        .then((app: App): Promise<string> => {
            throwForInvalidAppId(app.id, command.appName);
            storedAppId = app.id;
            currentUserEmail = getCurrentUserEmail(app.collaborators);

            return getDeploymentId(app.id, command.deploymentName);
        })
        .then((deploymentId: string): Promise<Package[]> => {
            throwForInvalidDeploymentId(deploymentId, command.deploymentName, command.appName);
            storedDeploymentId = deploymentId;

            return sdk.getPackageHistory(storedAppId, deploymentId);
        })
        .then((packageHistory: Package[]): Promise<void> => {
            return sdk.getDeploymentMetrics(storedAppId, storedDeploymentId)
                .then((metrics: DeploymentMetrics): void => {
                    var totalActive: number = getTotalActiveFromDeploymentMetrics(metrics);
                    packageHistory.forEach((packageObject: Package) => {
                        if (metrics[packageObject.label]) {
                            (<PackageWithMetrics>packageObject).metrics = {
                                active: metrics[packageObject.label].active,
                                downloaded: metrics[packageObject.label].downloaded,
                                failed: metrics[packageObject.label].failed,
                                installed: metrics[packageObject.label].installed,
                                totalActive: totalActive
                            };
                        }
                    });
                    printDeploymentHistory(command, <PackageWithMetrics[]>packageHistory, currentUserEmail);
                });
        });
}

function deserializeConnectionInfo(): ILegacyLoginConnectionInfo | ILoginConnectionInfo {
    try {
        var savedConnection: string = fs.readFileSync(configFilePath, { encoding: "utf8" });
        return JSON.parse(savedConnection);
    } catch (ex) {
        return;
    }
}

export function execute(command: cli.ICommand): Promise<void> {
    var connectionInfo: ILegacyLoginConnectionInfo|ILoginConnectionInfo = deserializeConnectionInfo();

    return Q(<void>null)
        .then(() => {
            switch (command.type) {
                case cli.CommandType.login:
                case cli.CommandType.register:
                    if (connectionInfo) {
                        throw new Error("You are already logged in from this machine.");
                    }
                    break;

                default:
                    if (!!sdk) break; // Used by unit tests to skip authentication

                    if (!connectionInfo) {
                        throw new Error("You are not currently logged in. Run the 'code-push login' command to authenticate with the CodePush server.");
                    }

                    var accessKey: string = getAccessKeyFromConnectionInfo(connectionInfo);
                    sdk = new AccountManager(accessKey, userAgent, connectionInfo.serverUrl);
                    break;
            }

            switch (command.type) {
                case cli.CommandType.accessKeyAdd:
                    return accessKeyAdd(<cli.IAccessKeyAddCommand>command);

                case cli.CommandType.accessKeyList:
                    return accessKeyList(<cli.IAccessKeyListCommand>command);

                case cli.CommandType.accessKeyRemove:
                    return accessKeyRemove(<cli.IAccessKeyRemoveCommand>command);

                case cli.CommandType.appAdd:
                    return appAdd(<cli.IAppAddCommand>command);

                case cli.CommandType.appList:
                    return appList(<cli.IAppListCommand>command);

                case cli.CommandType.appRemove:
                    return appRemove(<cli.IAppRemoveCommand>command);

                case cli.CommandType.appRename:
                    return appRename(<cli.IAppRenameCommand>command);

                case cli.CommandType.appTransfer:
                    return appTransfer(<cli.IAppTransferCommand>command);

                case cli.CommandType.collaboratorAdd:
                    return addCollaborator(<cli.ICollaboratorAddCommand>command);

                case cli.CommandType.collaboratorList:
                    return listCollaborators(<cli.ICollaboratorListCommand>command);

                case cli.CommandType.collaboratorRemove:
                    return removeCollaborator(<cli.ICollaboratorRemoveCommand>command);

                case cli.CommandType.deploymentAdd:
                    return deploymentAdd(<cli.IDeploymentAddCommand>command);

                case cli.CommandType.deploymentHistory:
                    return deploymentHistory(<cli.IDeploymentHistoryCommand>command);

                case cli.CommandType.deploymentList:
                    return deploymentList(<cli.IDeploymentListCommand>command);

                case cli.CommandType.deploymentRemove:
                    return deploymentRemove(<cli.IDeploymentRemoveCommand>command);

                case cli.CommandType.deploymentRename:
                    return deploymentRename(<cli.IDeploymentRenameCommand>command);

                case cli.CommandType.login:
                    return login(<cli.ILoginCommand>command);

                case cli.CommandType.logout:
                    return logout(<cli.ILogoutCommand>command);

                case cli.CommandType.promote:
                    return promote(<cli.IPromoteCommand>command);

                case cli.CommandType.register:
                    return register(<cli.IRegisterCommand>command);

                case cli.CommandType.release:
                    return release(<cli.IReleaseCommand>command);

                case cli.CommandType.rollback:
                    return rollback(<cli.IRollbackCommand>command);

                default:
                    // We should never see this message as invalid commands should be caught by the argument parser.
                    throw new Error("Invalid command:  " + JSON.stringify(command));
            }
        });
}

function generateRandomFilename(length: number): string {
    var filename: string = "";
    var validChar: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < length; i++) {
        filename += validChar.charAt(Math.floor(Math.random() * validChar.length));
    }

    return filename;
}

function getAccessKey(accessKeyName: string): Promise<AccessKey> {
    return sdk.getAccessKeys()
        .then((accessKeys: AccessKey[]): AccessKey => {
            for (var i = 0; i < accessKeys.length; ++i) {
                var accessKey: AccessKey = accessKeys[i];

                if (accessKey.name === accessKeyName) {
                    return accessKey;
                }
            }
        });
}

function getAccessKeyId(accessKeyName: string): Promise<string> {
    return getAccessKey(accessKeyName)
        .then((accessKey: AccessKey): string => {
            if (accessKey) {
                return accessKey.id;
            }

            return null;
        });
}

function getApp(appName: string): Promise<App> {
    var ownerEmailValue: string;
    var appNameValue: string = appName;
    var delimiterIndex: number = appName.indexOf("/");

    if (delimiterIndex !== -1) {
        ownerEmailValue = appName.substring(0, delimiterIndex);
        appNameValue = appName.substring(delimiterIndex + 1);

        throwForInvalidEmail(ownerEmailValue);
    }

    return sdk.getApps()
        .then((apps: App[]): App => {
            var foundApp = false;
            var possibleApp: App;

            for (var i = 0; i < apps.length; ++i) {
                var app: App = apps[i];
                if (app.name === appNameValue) {
                    var isCurrentUserOwner: boolean = isCurrentAccountOwner(app.collaborators);
                    if (ownerEmailValue) {
                        var appOwner: string = getOwnerEmail(app.collaborators);
                        foundApp = appOwner && appOwner === ownerEmailValue;
                    } else if (!isCurrentUserOwner) {
                        // found an app name matching given value but is not the owner of the app
                        // its possible there is another app with same name of which this user
                        // is the owner, so keep this pointer for future use.
                        possibleApp = app;
                    } else {
                        foundApp = isCurrentUserOwner;
                    }
                }

                if (foundApp) {
                    return app;
                }
            }

            if (possibleApp) {
                return possibleApp;
            }
        });
}

function isCurrentAccountOwner(map: CollaboratorMap): boolean {
    if (map) {
        var ownerEmail: string = getOwnerEmail(map);
        return ownerEmail && map[ownerEmail].isCurrentAccount;
    }

    return false;
}

function getCurrentUserEmail(map: CollaboratorMap): string {
    if (map) {
        for (var key of Object.keys(map)) {
            if (map[key].isCurrentAccount) {
                return key;
            }
        }
    }

    return null;
}

function getOwnerEmail(map: CollaboratorMap): string {
    if (map) {
        for (var key of Object.keys(map)) {
            if (map[key].permission === Permissions.Owner) {
                return key;
            }
        }
    }

    return null;
}

function getAppId(appName: string): Promise<string> {
    return getApp(appName)
        .then((app: App): string => {
            if (app) {
                return app.id;
            }

            return null;
        });
}

function getDeployment(appId: string, deploymentName: string): Promise<Deployment> {
    return sdk.getDeployments(appId)
        .then((deployments: Deployment[]): Deployment => {
            for (var i = 0; i < deployments.length; ++i) {
                var deployment: Deployment = deployments[i];

                if (deployment.name === deploymentName) {
                    return deployment;
                }
            }
        });
}

function getDeploymentId(appId: string, deploymentName: string): Promise<string> {
    return getDeployment(appId, deploymentName)
        .then((deployment: Deployment): string => {
            if (deployment) {
                return deployment.id;
            }

            return null;
        });
}

function getTotalActiveFromDeploymentMetrics(metrics: DeploymentMetrics): number {
    var totalActive = 0;
    Object.keys(metrics).forEach((label: string) => {
        totalActive += metrics[label].active;
    });

    return totalActive;
}

function initiateExternalAuthenticationAsync(serverUrl: string, action: string): void {
    var message: string = `A browser is being launched to authenticate your account. Follow the instructions ` +
        `it displays to complete your ${action === "register" ? "registration" : "login"}.\r\n`;

    log(message);
    var hostname: string = os.hostname();
    var url: string = serverUrl + "/auth/" + action + "?hostname=" + hostname;
    opener(url);
}

function login(command: cli.ILoginCommand): Promise<void> {
    // Check if one of the flags were provided.
    if (command.accessKey) {
        sdk = new AccountManager(command.accessKey, userAgent, command.serverUrl);
        return sdk.isAuthenticated()
            .then((isAuthenticated: boolean): void => {
                if (isAuthenticated) {
                    serializeConnectionInfo(command.serverUrl, command.accessKey);
                } else {
                    throw new Error("Invalid access key.");
                }
            });
    } else {
        initiateExternalAuthenticationAsync(command.serverUrl, "login");

        return loginWithAccessTokenInternal(command.serverUrl);
    }
}

function loginWithAccessTokenInternal(serverUrl: string): Promise<void> {
    return requestAccessToken()
        .then((accessToken: string): Promise<void> => {
            if (accessToken === null) {
                // The user has aborted the synchronous prompt (e.g.:  via [CTRL]+[C]).
                return;
            }

            try {
                var decoded: string = base64.decode(accessToken);
                var connectionInfo: ILegacyLoginConnectionInfo = JSON.parse(decoded);
            } catch (error) {
                throw new Error("Invalid access token.");
            }

            var accessKey: string = getAccessKeyFromConnectionInfo(connectionInfo);
            sdk = new AccountManager(accessKey, userAgent, serverUrl);

            return sdk.isAuthenticated()
                .then((isAuthenticated: boolean): void => {
                    if (isAuthenticated) {
                        serializeConnectionInfo(serverUrl, accessKey);
                    } else {
                        throw new Error("Invalid access token.");
                    }
                });
        });
}

function getAccessKeyFromConnectionInfo(connectionInfo: ILegacyLoginConnectionInfo|ILoginConnectionInfo): string {
    if (!connectionInfo) return null;

    var legacyLoginConnectionInfo: ILegacyLoginConnectionInfo = <ILegacyLoginConnectionInfo>connectionInfo;
    var loginConnectionInfo: ILoginConnectionInfo = <ILoginConnectionInfo>connectionInfo;

    if (legacyLoginConnectionInfo.accessKeyName) {
        return legacyLoginConnectionInfo.accessKeyName;
    } else {
        return loginConnectionInfo.accessKey;
    }
}

function logout(command: cli.ILogoutCommand): Promise<void> {
    return Q(<void>null)
        .then((): Promise<void> => {
            if (!command.isLocal) {
                return sdk.removeAccessKey(sdk.accessKey)
                    .then((): void => {
                        log("Removed access key " + sdk.accessKey + ".");
                        sdk = null;
                    });
            }
        })
        .then((): void => deleteConnectionInfoCache(), (): void => deleteConnectionInfoCache());
}

function formatDate(unixOffset: number): string {
    var date: moment.Moment = moment(unixOffset);
    var now: moment.Moment = moment();
    if (now.diff(date, "days") < 30) {
        return date.fromNow();                  // "2 hours ago"
    } else if (now.year() === date.year()) {
        return date.format("MMM D");            // "Nov 6"
    } else {
        return date.format("MMM D, YYYY");      // "Nov 6, 2014"
    }
}

function getAppDisplayName(app: App, appNameToCountMap: NameToCountMap): string {
    if (appNameToCountMap && appNameToCountMap[app.name] > 1) {
        var isCurrentUserOwner: boolean = isCurrentAccountOwner(app.collaborators);
        return isCurrentUserOwner ? app.name : getOwnerEmail(app.collaborators) + "/" + app.name;
    } else {
        return app.name;
    }
}

function getNameToCountMap(apps: App[]): NameToCountMap {
    var nameToCountMap: NameToCountMap = {};
    apps.forEach((app: App) => {
        var ownerEmail: string = getOwnerEmail(app.collaborators);
        if (!nameToCountMap[app.name]) {
            nameToCountMap[app.name] = 1;
        } else {
            nameToCountMap[app.name] = nameToCountMap[app.name] + 1;
        }
    });

    return nameToCountMap;
}

function printAppList(format: string, apps: App[], deploymentLists: string[][]): void {
    var appNameToCountMap: NameToCountMap = getNameToCountMap(apps);

    if (format === "json") {
        var dataSource: any[] = apps.map((app: App, index: number) => {
            return { "name": getAppDisplayName(app, appNameToCountMap), "deployments": deploymentLists[index] };
        });

        printJson(dataSource);
    } else if (format === "table") {
        var headers = ["Name", "Deployments"];
        printTable(headers, (dataSource: any[]): void => {
            apps.forEach((app: App, index: number): void => {
                var row = [getAppDisplayName(app, appNameToCountMap), wordwrap(50)(deploymentLists[index].join(", "))];
                dataSource.push(row);
            });
        });
    }
}

function getCollaboratorDisplayName(email: string, collaboratorProperties: CollaboratorProperties): string {
    return (collaboratorProperties.permission === Permissions.Owner) ? email + chalk.magenta(" (" + Permissions.Owner + ")") : email;
}

function printCollaboratorsList(format: string, collaborators: CollaboratorMap): void {
    if (format === "json") {
        var dataSource = { "collaborators": collaborators };
        printJson(dataSource);
    } else if (format === "table") {
        var headers = ["E-mail Address"];
        printTable(headers, (dataSource: any[]): void => {
            Object.keys(collaborators).forEach((email: string): void => {
                var row = [getCollaboratorDisplayName(email, collaborators[email])];
                dataSource.push(row);
            });
        });
    }
}

function printDeploymentList(command: cli.IDeploymentListCommand, deployments: Deployment[], showPackage: boolean = true): void {
    if (command.format === "json") {
        deployments.forEach((deployment: Deployment) => delete deployment.id);  // Temporary until ID's are removed from the REST API
        printJson(deployments);
    } else if (command.format === "table") {
        var headers = ["Name"];
        if (command.displayKeys) {
            headers.push("Deployment Key");
        }

        if (showPackage) {
            headers.push("Update Metadata");
            headers.push("Install Metrics");
        }

        printTable(headers, (dataSource: any[]): void => {
            deployments.forEach((deployment: Deployment): void => {
                var row = [deployment.name];
                if (command.displayKeys) {
                    row.push(deployment.key);
                }

                if (showPackage) {
                    row.push(getPackageString(deployment.package));
                    row.push(getPackageMetricsString(<PackageWithMetrics>(deployment.package)));
                }

                dataSource.push(row);
            });
        });
    }
}

function printDeploymentHistory(command: cli.IDeploymentHistoryCommand, packageHistory: PackageWithMetrics[], currentUserEmail: string): void {
    if (command.format === "json") {
        printJson(packageHistory);
    } else if (command.format === "table") {
        var headers = ["Label", "Release Time", "App Version", "Mandatory"];
        if (command.displayAuthor) {
            headers.push("Released By");
        }

        headers.push("Description", "Install Metrics");

        printTable(headers, (dataSource: any[]) => {
            packageHistory.forEach((packageObject: Package) => {
                var releaseTime: string = formatDate(packageObject.uploadTime);
                var releaseSource: string;
                if (packageObject.releaseMethod === "Promote") {
                    releaseSource = `Promoted ${packageObject.originalLabel} from "${packageObject.originalDeployment}"`;
                } else if (packageObject.releaseMethod === "Rollback") {
                    var labelNumber: number = parseInt(packageObject.label.substring(1));
                    var lastLabel: string = "v" + (labelNumber - 1);
                    releaseSource = `Rolled back ${lastLabel} to ${packageObject.originalLabel}`;
                }

                if (releaseSource) {
                    releaseTime += "\n" + chalk.magenta(`(${releaseSource})`).toString();
                }

                var row = [packageObject.label, releaseTime, packageObject.appVersion, packageObject.isMandatory ? "Yes" : "No"];
                if (command.displayAuthor) {
                    var releasedBy: string = packageObject.releasedBy ? packageObject.releasedBy : "";
                    if (currentUserEmail && releasedBy === currentUserEmail) {
                        releasedBy = "You";
                    }

                    row.push(releasedBy);
                }

                row.push(packageObject.description ? wordwrap(30)(packageObject.description) : "", getPackageMetricsString(packageObject));

                dataSource.push(row);
            });
        });
    }
}

function getPackageString(packageObject: Package): string {
    if (!packageObject) {
        return chalk.magenta("No updates released").toString();
    }

    return chalk.green("Label: ") + packageObject.label + "\n" +
        chalk.green("App Version: ") + packageObject.appVersion + "\n" +
        chalk.green("Mandatory: ") + (packageObject.isMandatory ? "Yes" : "No") + "\n" +
        chalk.green("Release Time: ") + formatDate(packageObject.uploadTime) + "\n" +
        chalk.green("Released By: ") + (packageObject.releasedBy ? packageObject.releasedBy : "") +
        (packageObject.description ? wordwrap(70)("\n" + chalk.green("Description: ") + packageObject.description) : "");
}

function getPackageMetricsString(packageObject: PackageWithMetrics): string {
    if (!packageObject || !packageObject.metrics) {
        return "" + chalk.magenta("No installs recorded");
    }

    var activePercent: number = packageObject.metrics.totalActive
        ? packageObject.metrics.active / packageObject.metrics.totalActive * 100
        : 0.0;
    var percentString: string;
    if (activePercent === 100.0) {
        percentString = "100%";
    } else if (activePercent === 0.0) {
        percentString = "0%";
    } else {
        percentString = activePercent.toPrecision(2) + "%";
    }

    var numPending: number = packageObject.metrics.downloaded - packageObject.metrics.installed - packageObject.metrics.failed;
    var returnString: string = chalk.green("Active: ") + percentString + " (" + packageObject.metrics.active.toLocaleString() + " of " + packageObject.metrics.totalActive.toLocaleString() + ")\n" +
        chalk.green("Total: ") + packageObject.metrics.installed.toLocaleString();

    if (numPending > 0) {
        returnString += " (" + numPending.toLocaleString() + " pending)";
    }

    if (packageObject.metrics.failed) {
        returnString += "\n" + chalk.green("Rollbacks: ") + chalk.red(packageObject.metrics.failed.toLocaleString() + "");
    }

    return returnString;
}

function printJson(object: any): void {
    log(JSON.stringify(object, /*replacer=*/ null, /*spacing=*/ 2));
}

function printAccessKeys(format: string, keys: AccessKey[]): void {
    if (format === "json") {
        printJson(keys);
    } else if (format === "table") {
        printTable(["Key", "Time Created", "Created From", "Description"], (dataSource: any[]): void => {
            keys.forEach((key: AccessKey): void => {
                dataSource.push([
                    key.name,
                    key.createdTime ? formatDate(key.createdTime) : "",
                    key.createdBy ? key.createdBy : "",
                    key.description ? key.description : ""
                ]);
            });
        });
    }
}

function printTable(columnNames: string[], readData: (dataSource: any[]) => void): void {
    var table = new Table({
        head: columnNames,
        style: { head: ["cyan"] }
    });

    readData(table);

    log(table.toString());
}

function register(command: cli.IRegisterCommand): Promise<void> {
    initiateExternalAuthenticationAsync(command.serverUrl, "register");

    return loginWithAccessTokenInternal(command.serverUrl);
}

function promote(command: cli.IPromoteCommand): Promise<void> {
    var appId: string;
    var sourceDeploymentId: string;
    var destDeploymentId: string;

    return getAppId(command.appName)
        .then((appIdResult: string): Promise<string> => {
            throwForInvalidAppId(appIdResult, command.appName);
            appId = appIdResult;
            return getDeploymentId(appId, command.sourceDeploymentName);
        })
        .then((deploymentId: string): Promise<string> => {
            throwForInvalidDeploymentId(deploymentId, command.sourceDeploymentName, command.appName);
            sourceDeploymentId = deploymentId;
            return getDeploymentId(appId, command.destDeploymentName);
        })
        .then((deploymentId: string): Promise<void> => {
            throwForInvalidDeploymentId(deploymentId, command.destDeploymentName, command.appName);
            destDeploymentId = deploymentId;
            return sdk.promotePackage(appId, sourceDeploymentId, destDeploymentId);
        })
        .then((): void => {
            log("Successfully promoted the \"" + command.sourceDeploymentName + "\" deployment of the \"" + command.appName + "\" app to the \"" + command.destDeploymentName + "\" deployment.");
        });
}

function release(command: cli.IReleaseCommand): Promise<void> {
    if (isBinaryOrZip(command.package)) {
        throw new Error("It is unnecessary to package releases in a .zip or binary file. Please specify the direct path to the update content's directory (e.g. /platforms/ios/www) or file (e.g. main.jsbundle).");
    } else if (semver.valid(command.appStoreVersion) === null) {
        throw new Error("Please use a semver compliant app store version, for example \"1.0.3\".");
    }

    return getAppId(command.appName)
        .then((appId: string): Promise<void> => {
            throwForInvalidAppId(appId, command.appName);

            return getDeploymentId(appId, command.deploymentName)
                .then((deploymentId: string): Promise<void> => {
                    throwForInvalidDeploymentId(deploymentId, command.deploymentName, command.appName);

                    var filePath: string = command.package;
                    var getPackageFilePromise: Promise<IPackageFile>;
                    var isSingleFilePackage: boolean = true;

                    if (fs.lstatSync(filePath).isDirectory()) {
                        isSingleFilePackage = false;
                        getPackageFilePromise = Promise<IPackageFile>((resolve: (file: IPackageFile) => void, reject: (reason: Error) => void): void => {
                            var directoryPath: string = filePath;

                            recursiveFs.readdirr(directoryPath, (error?: any, directories?: string[], files?: string[]): void => {
                                if (error) {
                                    reject(error);
                                    return;
                                }

                                var baseDirectoryPath = path.dirname(directoryPath);
                                var fileName: string = generateRandomFilename(15) + ".zip";
                                var zipFile = new yazl.ZipFile();
                                var writeStream: fs.WriteStream = fs.createWriteStream(fileName);

                                zipFile.outputStream.pipe(writeStream)
                                    .on("error", (error: Error): void => {
                                        reject(error);
                                    })
                                    .on("close", (): void => {
                                        filePath = path.join(process.cwd(), fileName);

                                        resolve({ isTemporary: true, path: filePath });
                                    });

                                for (var i = 0; i < files.length; ++i) {
                                    var file: string = files[i];
                                    var relativePath: string = path.relative(baseDirectoryPath, file);

                                    // yazl does not like backslash (\) in the metadata path.
                                    relativePath = slash(relativePath);

                                    zipFile.addFile(file, relativePath);
                                }

                                zipFile.end();
                            });
                        });
                    } else {
                        getPackageFilePromise = Q({ isTemporary: false, path: filePath });
                    }

                    var lastTotalProgress = 0;
                    var progressBar = new progress("Upload progress:[:bar] :percent :etas", {
                        complete: "=",
                        incomplete: " ",
                        width: 50,
                        total: 100
                    });

                    var uploadProgress = (currentProgress: number): void => {
                        progressBar.tick(currentProgress - lastTotalProgress);
                        lastTotalProgress = currentProgress;
                    }

                    return getPackageFilePromise
                        .then((file: IPackageFile): Promise<void> => {
                            return sdk.addPackage(appId, deploymentId, file.path, command.description, /*label*/ null, command.appStoreVersion, command.mandatory, uploadProgress)
                                .then((): void => {
                                    log("Successfully released an update containing the \"" + command.package + "\" " + (isSingleFilePackage ? "file" : "directory") + " to the \"" + command.deploymentName + "\" deployment of the \"" + command.appName + "\" app.");

                                    if (file.isTemporary) {
                                        fs.unlinkSync(filePath);
                                    }
                                });
                        });
                });
        });
}

function rollback(command: cli.IRollbackCommand): Promise<void> {
    var appId: string;

    return confirm()
        .then((wasConfirmed: boolean) => {
            if (!wasConfirmed) {
                log("Rollback cancelled.")
                return;
            }

            return getAppId(command.appName)
                .then((appIdResult: string): Promise<string> => {
                    throwForInvalidAppId(appIdResult, command.appName);
                    appId = appIdResult;
                    return getDeploymentId(appId, command.deploymentName);
                })
                .then((deploymentId: string): Promise<void> => {
                    throwForInvalidDeploymentId(deploymentId, command.deploymentName, command.appName);
                    return sdk.rollbackPackage(appId, deploymentId, command.targetRelease || undefined);
                })
                .then((): void => {
                    log("Successfully performed a rollback on the \"" + command.deploymentName + "\" deployment of the \"" + command.appName + "\" app.");
                });
        });
}

function requestAccessToken(): Promise<string> {
    return Promise<string>((resolve, reject, notify): void => {
        prompt.message = "";
        prompt.delimiter = "";

        prompt.start();

        prompt.get({
            properties: {
                response: {
                    description: chalk.cyan("Enter your access token: ")
                }
            }
        }, (err: any, result: any): void => {
            if (err) {
                resolve(null);
            } else {
                resolve(result.response.trim());
            }
        });
    });
}

function serializeConnectionInfo(serverUrl: string, accessKey: string): void {
    var connectionInfo: ILegacyLoginConnectionInfo|ILoginConnectionInfo = <ILoginConnectionInfo>{ serverUrl: serverUrl, accessKey: accessKey };
    var json: string = JSON.stringify(connectionInfo);
    fs.writeFileSync(configFilePath, json, { encoding: "utf8" });

    log("\r\nSuccessfully logged-in. Your session token was written to " + chalk.cyan(configFilePath) + ". You can run the " + chalk.cyan("code-push logout") + " command at any time to delete this file and terminate your session.\r\n");
}

function isBinaryOrZip(path: string): boolean {
    return path.search(/\.zip$/i) !== -1
        || path.search(/\.apk$/i) !== -1
        || path.search(/\.ipa$/i) !== -1;
}

function throwForMissingCredentials(accessKeyName: string, providerName: string, providerUniqueId: string): void {
    if (!accessKeyName) throw new Error("Access key is missing.");
    if (!providerName) throw new Error("Provider name is missing.");
    if (!providerUniqueId) throw new Error("Provider unique ID is missing.");
}

function throwForInvalidAccessKeyId(accessKeyId: string, accessKeyName: string): void {
    if (!accessKeyId) {
        throw new Error("Access key \"" + accessKeyName + "\" does not exist.");
    }
}

function throwForInvalidApp(app: App, appName: string): void {
    if (!app) {
        throw new Error("App \"" + appName + "\" does not exist.");
    }
}

function throwForInvalidAppId(appId: string, appName: string): void {
    if (!appId) {
        throw new Error("App \"" + appName + "\" does not exist.");
    }
}

function throwForInvalidEmail(email: string): void {
    if (!emailValidator.validate(email)) {
        throw new Error("\"" + email + "\" is an invalid e-mail address.");
    }
}

function throwForInvalidDeployment(deployment: Deployment, deploymentName: string, appName: string): void {
    if (!deployment) {
        throw new Error("Deployment \"" + deploymentName + "\" does not exist for app \"" + appName + "\".");
    }
}

function throwForInvalidDeploymentId(deploymentId: string, deploymentName: string, appName: string): void {
    if (!deploymentId) {
        throw new Error("Deployment \"" + deploymentName + "\" does not exist for app \"" + appName + "\".");
    }
}

function throwForInvalidOutputFormat(format: string): void {
    switch (format) {
        case "json":
        case "table":
            break;

        default:
            throw new Error("Invalid format:  " + format + ".");
    }
}
