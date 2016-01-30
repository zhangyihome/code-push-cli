import * as base64 from "base-64";
import Q = require("q");
import crypto = require("crypto");
import tryJSON = require("try-json");
import Promise = Q.Promise;
import request = require("superagent");

declare var fs: any;

if (typeof window === "undefined") {
    fs = require("fs");
} else {
    fs = {
        createReadStream: (fileOrPath: string): void => {
            throw new Error("Tried to call a node fs function from the browser.");
        }
    }
}

// Aliasing UpdateMetrics as IUpdateMetrics & CollaboratorProperties as ICollaboratorProperties to deal with TypeScript issue that removes unused imports.
import { AccessKey, Account, App, CollaboratorMap, CollaboratorProperties as ICollaboratorProperties, Deployment, DeploymentKey, DeploymentMetrics, Package, UpdateMetrics as IUpdateMetrics } from "rest-definitions";
export { AccessKey, Account, App, CollaboratorMap, Deployment, DeploymentKey, DeploymentMetrics, Package };
export type UpdateMetrics = IUpdateMetrics;
export type CollaboratorProperties = ICollaboratorProperties;

export interface CodePushError {
    message?: string;
    statusCode?: number;
}

interface PackageToUpload {
    label: string;
    description: string;
    appVersion: string;
    isMandatory: boolean;
}

interface ILoginInfo {
    accessKeyName: string;
    providerName: string;
    providerUniqueId: string;
}

export class AccountManager {
    private _authedAgent: request.SuperAgent<any>;
    private _saveAuthedAgent: boolean = false;
    private _userAgent: string;
    public account: Account;
    public serverUrl: string = "http://localhost:3000";

    public get accountId(): string {
        return this.account.id;
    }

    constructor(serverUrl: string, userAgent: string) {
        // If window is not defined, it means we are in the node environment and not a browser.
        this._saveAuthedAgent = (typeof window === "undefined");

        this._userAgent = userAgent;
        this.serverUrl = serverUrl;
    }

    public loginWithAccessToken(accessToken: string): Promise<void> {
        return Promise<void>((resolve, reject, notify) => {
            var loginInfo: ILoginInfo = AccountManager.getLoginInfo(accessToken);

            var req = request.post(this.serverUrl + "/auth/login/accessToken");
            this.attachCredentials(req, request);
            req = req.type("form");

            if (loginInfo && loginInfo.providerName && loginInfo.providerUniqueId) {
                // Login the old way.
                req = req.send({ identity: JSON.stringify({ providerName: loginInfo.providerName, providerUniqueId: loginInfo.providerUniqueId }) })
                    .send({ token: loginInfo.accessKeyName });
            } else {
                // Note: We can't send an empty identity string, or PassportAuth will short circuit and fail.
                req = req.send({ identity: "accessKey" })
                    .send({ token: accessToken });
            }

            req.end((err: any, res: request.Response) => {
                if (err) {
                    reject(<CodePushError>{ message: this.getErrorMessage(err, res) });
                    return;
                }

                if (this._saveAuthedAgent) {
                    this._authedAgent = request.agent();
                    this._authedAgent.saveCookies(res);
                }

                if (res.ok) {
                    resolve(null);
                } else {
                    var body = tryJSON(res.text);
                    if (body) {
                        reject(<CodePushError>body);
                    } else {
                        reject(<CodePushError>{ message: res.text, statusCode: res.status });
                    }
                }
            });
        });
    }

    public logout(): Promise<void> {
        return Promise<void>((resolve, reject, notify) => {
            var req = request.post(this.serverUrl + "/auth/logout");
            this.attachCredentials(req, request);

            req.end((err: any, res: request.Response) => {
                if (err && err.status !== 401) {
                    reject(<CodePushError>{ message: this.getErrorMessage(err, res) });
                    return;
                }

                this._authedAgent = null;

                if (res.ok) {
                    resolve(null);
                } else {
                    var body = tryJSON(res.text);
                    if (body) {
                        reject(<CodePushError>body);
                    } else {
                        reject(<CodePushError>{ message: res.text, statusCode: res.status });
                    }
                }
            });
        });
    }

    public isAuthenticated(): Promise<boolean> {
        return Promise<boolean>((resolve, reject, notify) => {
            var requester: request.SuperAgent<any> = this._authedAgent ? this._authedAgent : request;
            var req = requester.get(this.serverUrl + "/authenticated");
            this.attachCredentials(req, requester);

            req.end((err: any, res: request.Response) => {
                if (err && err.status !== 401) {
                    reject(<CodePushError>{ message: this.getErrorMessage(err, res) });
                    return;
                }

                var status: number = res ? res.status : err.status;

                var authenticated: boolean = status === 200;

                if (authenticated && this._saveAuthedAgent) {
                    this._authedAgent = request.agent();
                    this._authedAgent.saveCookies(res);
                }

                resolve(authenticated);
            });
        });
    }

    public addAccessKey(machine: string, description?: string): Promise<AccessKey> {
        return Promise<AccessKey>((resolve, reject, notify) => {
            return this.generateAccessKey().then((newAccessKey: string) => {
                var accessKey: AccessKey = { id: null, name: newAccessKey, createdTime: new Date().getTime(), createdBy: machine, description: description };
                var requester: request.SuperAgent<any> = this._authedAgent ? this._authedAgent : request;
                var req = requester.post(this.serverUrl + "/accessKeys/");

                this.attachCredentials(req, requester);

                req.set("Content-Type", "application/json;charset=UTF-8")
                    .send(JSON.stringify(accessKey))
                    .end((err: any, res: request.Response) => {
                        if (err) {
                            reject(<CodePushError>{ message: this.getErrorMessage(err, res) });
                            return;
                        }

                        if (res.ok) {
                            var location = res.header["location"];
                            if (location && location.lastIndexOf("/") !== -1) {
                                accessKey.id = location.substr(location.lastIndexOf("/") + 1);
                                resolve(accessKey);
                            } else {
                                resolve(null);
                            }
                        } else {
                            var body = tryJSON(res.text);
                            if (body) {
                                reject(<CodePushError>body);
                            } else {
                                reject(<CodePushError>{ message: res.text, statusCode: res.status });
                            }
                        }
                    });
            });
        });
    }

    public getAccessKey(accessKeyId: string): Promise<AccessKey> {
        return Promise<AccessKey>((resolve, reject, notify) => {
            var requester: request.SuperAgent<any> = this._authedAgent ? this._authedAgent : request;
            var req = requester.get(this.serverUrl + "/accessKeys/" + accessKeyId);

            this.attachCredentials(req, requester);

            req.end((err: any, res: request.Response) => {
                if (err) {
                    reject(<CodePushError>{ message: this.getErrorMessage(err, res) });
                    return;
                }

                var body = tryJSON(res.text);
                if (res.ok) {
                    if (body) {
                        resolve(body.accessKey);
                    } else {
                        reject(<CodePushError>{ message: "Could not parse response: " + res.text, statusCode: res.status });
                    }
                } else {
                    if (body) {
                        reject(<CodePushError>body);
                    } else {
                        reject(<CodePushError>{ message: res.text, statusCode: res.status });
                    }
                }
            });
        });
    }

    public getAccessKeys(): Promise<AccessKey[]> {
        return Promise<AccessKey[]>((resolve, reject, notify) => {
            var requester: request.SuperAgent<any> = this._authedAgent ? this._authedAgent : request;
            var req = requester.get(this.serverUrl + "/accessKeys");

            this.attachCredentials(req, requester);

            req.end((err: any, res: request.Response) => {
                if (err) {
                    reject(<CodePushError>{ message: this.getErrorMessage(err, res) });
                    return;
                }

                var body = tryJSON(res.text);
                if (res.ok) {
                    if (body) {
                        resolve(body.accessKeys);
                    } else {
                        reject(<CodePushError>{ message: "Could not parse response: " + res.text, statusCode: res.status });
                    }
                } else {
                    if (body) {
                        reject(<CodePushError>body);
                    } else {
                        reject(<CodePushError>{ message: res.text, statusCode: res.status });
                    }
                }
            });
        });
    }

    public removeAccessKey(accessKeyId: string): Promise<void> {
        return Promise<void>((resolve, reject, notify) => {
            var requester: request.SuperAgent<any> = this._authedAgent ? this._authedAgent : request;
            var req = requester.del(this.serverUrl + "/accessKeys/" + accessKeyId);

            this.attachCredentials(req, requester);

            req.end((err: any, res: request.Response) => {
                if (err) {
                    reject(<CodePushError>{ message: this.getErrorMessage(err, res) });
                    return;
                }

                if (res.ok) {
                    resolve(null);
                } else {
                    var body = tryJSON(res.text);
                    if (body) {
                        reject(<CodePushError>body);
                    } else {
                        reject(<CodePushError>{ message: res.text, statusCode: res.status });
                    }
                }
            });
        });
    }

    // Account
    public getAccountInfo(): Promise<Account> {
        return Promise<Account>((resolve, reject, notify) => {
            var requester = (this._authedAgent ? this._authedAgent : request);

            var req = requester.get(this.serverUrl + "/account");
            this.attachCredentials(req, requester);

            req.end((err: any, res: request.Response) => {
                if (err) {
                    reject(<CodePushError>{ message: this.getErrorMessage(err, res) });
                    return;
                }

                var body = tryJSON(res.text);

                if (res.ok) {
                    if (body) {
                        this.account = <Account>body.account;
                        resolve(this.account);
                    } else {
                        reject(<CodePushError>{ message: "Could not parse response: " + res.text, statusCode: res.status });
                    }
                } else {
                    if (body) {
                        reject(<CodePushError>body);
                    } else {
                        reject(<CodePushError>{ message: res.text, statusCode: res.status });
                    }
                }
            });
        });
    }

    public updateAccountInfo(accountInfoToChange: Account): Promise<void> {
        return Promise<void>((resolve, reject, notify) => {
            var requester = (this._authedAgent ? this._authedAgent : request);

            var req = requester.put(this.serverUrl + "/account");
            this.attachCredentials(req, requester);

            req.set("Content-Type", "application/json;charset=UTF-8")
                .send(JSON.stringify(accountInfoToChange))
                .end((err: any, res: request.Response) => {
                    if (err) {
                        reject(<CodePushError>{ message: this.getErrorMessage(err, res) });
                        return;
                    }

                    if (res.ok) {
                        resolve(null);
                    } else {
                        var body = tryJSON(res.text);
                        if (body) {
                            reject(<CodePushError>body);
                        } else {
                            reject(<CodePushError>{ message: res.text, statusCode: res.status });
                        }
                    }
                });
        });
    }

    // Apps
    public getApps(): Promise<App[]> {
        return Promise<App[]>((resolve, reject, notify) => {
            var requester = (this._authedAgent ? this._authedAgent : request);

            var req = requester.get(this.serverUrl + "/apps");
            this.attachCredentials(req, requester);

            req.end((err: any, res: request.Response) => {
                if (err) {
                    reject(<CodePushError>{ message: this.getErrorMessage(err, res) });
                    return;
                }

                var body = tryJSON(res.text);
                if (res.ok) {
                    if (body) {
                        resolve(body.apps);
                    } else {
                        reject(<CodePushError>{ message: "Could not parse response: " + res.text, statusCode: res.status });
                    }
                } else {
                    if (body) {
                        reject(<CodePushError>body);
                    } else {
                        reject(<CodePushError>{ message: res.text, statusCode: res.status });
                    }
                }
            });
        });
    }

    public getApp(appId: string): Promise<App> {
        return Promise<App>((resolve, reject, notify) => {
            var requester = (this._authedAgent ? this._authedAgent : request);

            var req = requester.get(this.serverUrl + "/apps/" + appId);
            this.attachCredentials(req, requester);

            req.end((err: any, res: request.Response) => {
                if (err) {
                    reject(<CodePushError>{ message: this.getErrorMessage(err, res) });
                    return;
                }

                var body = tryJSON(res.text);
                if (res.ok) {
                    if (body) {
                        resolve(body.app);
                    } else {
                        reject(<CodePushError>{ message: "Could not parse response: " + res.text, statusCode: res.status });
                    }
                } else {
                    if (body) {
                        reject(<CodePushError>body);
                    } else {
                        reject(<CodePushError>{ message: res.text, statusCode: res.status });
                    }
                }
            });
        });
    }

    public addApp(appName: string): Promise<App> {
        return Promise<App>((resolve, reject, notify) => {
            var app = <App>{ name: appName };
            var requester = (this._authedAgent ? this._authedAgent : request);

            var req = requester.post(this.serverUrl + "/apps/");
            this.attachCredentials(req, requester);

            req.set("Content-Type", "application/json;charset=UTF-8")
                .send(JSON.stringify(app))
                .end((err: any, res: request.Response) => {
                    if (err) {
                        reject(<CodePushError>{ message: this.getErrorMessage(err, res) });
                        return;
                    }

                    if (res.ok) {
                        var location = res.header["location"];
                        if (location && location.lastIndexOf("/") !== -1) {
                            app.id = location.substr(location.lastIndexOf("/") + 1);
                            resolve(app);
                        } else {
                            resolve(null);
                        }
                    } else {
                        var body = tryJSON(res.text);
                        if (body) {
                            reject(<CodePushError>body);
                        } else {
                            reject(<CodePushError>{ message: res.text, statusCode: res.status });
                        }
                    }
                });
        });
    }

    public removeApp(app: App | string): Promise<void> {
        return Promise<void>((resolve, reject, notify) => {
            var id: string = (typeof app === "string") ? app : app.id;
            var requester = (this._authedAgent ? this._authedAgent : request);

            var req = requester.del(this.serverUrl + "/apps/" + id);
            this.attachCredentials(req, requester);

            req.end((err: any, res: request.Response) => {
                if (err) {
                    reject(<CodePushError>{ message: this.getErrorMessage(err, res) });
                    return;
                }

                if (res.ok) {
                    resolve(null);
                } else {
                    var body = tryJSON(res.text);
                    if (body) {
                        reject(<CodePushError>body);
                    } else {
                        reject(<CodePushError>{ message: res.text, statusCode: res.status });
                    }
                }
            });
        });
    }

    public updateApp(infoToChange: App): Promise<void> {
        return Promise<void>((resolve, reject, notify) => {
            var requester = (this._authedAgent ? this._authedAgent : request);
            var req = requester.put(this.serverUrl + "/apps/" + infoToChange.id);
            this.attachCredentials(req, requester);

            req.set("Content-Type", "application/json;charset=UTF-8")
                .send(JSON.stringify(infoToChange))
                .end((err: any, res: request.Response) => {
                    if (err) {
                        reject(<CodePushError>{ message: this.getErrorMessage(err, res) });
                        return;
                    }

                    if (res.ok) {
                        resolve(null);
                    } else {
                        var body = tryJSON(res.text);
                        if (body) {
                            reject(<CodePushError>body);
                        } else {
                            reject(<CodePushError>{ message: res.text, statusCode: res.status });
                        }
                    }
                });
        });
    }

    public transferApp(appId: string, email: string): Promise<void> {
        return Promise<void>((resolve, reject, notify) => {
            var requester = (this._authedAgent ? this._authedAgent : request);
            var req = requester.post(this.serverUrl + "/apps/" + appId + "/transfer/" + email);
            this.attachCredentials(req, requester);

            req.end((err: any, res: request.Response) => {
                if (err) {
                    reject(<CodePushError>{ message: this.getErrorMessage(err, res) });
                    return;
                }

                if (res.ok) {
                    resolve(<void>null);
                } else {
                    var body = tryJSON(res.text);
                    if (body) {
                        reject(<CodePushError>body);
                    } else {
                        reject(<CodePushError>{ message: res.text, statusCode: res.status });
                    }
                }
            });
        });
    }

    // Collaborators
    public getCollaboratorsList(appId: string): Promise<CollaboratorMap> {
        return Promise<CollaboratorMap>((resolve, reject, notify) => {
            var requester = (this._authedAgent ? this._authedAgent : request);

            var req = requester.get(this.serverUrl + "/apps/" + appId + "/collaborators");
            this.attachCredentials(req, requester);

            req.end((err: any, res: request.Response) => {
                if (err) {
                    reject(<CodePushError>{ message: this.getErrorMessage(err, res) });
                    return;
                }

                var body = tryJSON(res.text);
                if (res.ok) {
                    if (body) {
                        resolve(body.collaborators);
                    } else {
                        reject(<CodePushError>{ message: "Could not parse response: " + res.text, statusCode: res.status });
                    }
                } else {
                    if (body) {
                        reject(<CodePushError>body);
                    } else {
                        reject(<CodePushError>{ message: res.text, statusCode: res.status });
                    }
                }
            });
        });
    }

    public addCollaborator(appId: string, email: string): Promise<void> {
        return Promise<void>((resolve, reject, notify) => {
            var requester = (this._authedAgent ? this._authedAgent : request);

            var req = requester.post(this.serverUrl + "/apps/" + appId + "/collaborators/" + email);
            this.attachCredentials(req, requester);

            req.end((err: any, res: request.Response) => {
                if (err) {
                    reject(<CodePushError>{ message: this.getErrorMessage(err, res) });
                    return;
                }

                if (res.ok) {
                    resolve(null);
                } else {
                    var body = tryJSON(res.text);
                    if (body) {
                        reject(<CodePushError>body);
                    } else {
                        reject(<CodePushError>{ message: res.text, statusCode: res.status });
                    }
                }
            });
        });
    }

    public removeCollaborator(app: App | string, email: string): Promise<void> {
        return Promise<void>((resolve, reject, notify) => {
            var id: string = (typeof app === "string") ? app : app.id;
            var requester = (this._authedAgent ? this._authedAgent : request);

            var req = requester.del(this.serverUrl + "/apps/" + id + "/collaborators/" + email);
            this.attachCredentials(req, requester);

            req.end((err: any, res: request.Response) => {
                if (err) {
                    reject(<CodePushError>{ message: this.getErrorMessage(err, res) });
                    return;
                }

                if (res.ok) {
                    resolve(null);
                } else {
                    var body = tryJSON(res.text);
                    if (body) {
                        reject(<CodePushError>body);
                    } else {
                        reject(<CodePushError>{ message: res.text, statusCode: res.status });
                    }
                }
            });
        });
    }

    // Deployments
    public addDeployment(appId: string, name: string): Promise<Deployment> {
        return Promise<Deployment>((resolve, reject, notify) => {
            var deployment = <Deployment>{ name: name };

            var requester = (this._authedAgent ? this._authedAgent : request);
            var req = requester.post(this.serverUrl + "/apps/" + appId + "/deployments/");;
            this.attachCredentials(req, requester);

            req.set("Content-Type", "application/json;charset=UTF-8")
                .send(JSON.stringify(deployment))
                .end((err: any, res: request.Response) => {
                    if (err) {
                        reject(<CodePushError>{ message: this.getErrorMessage(err, res) });
                        return;
                    }

                    if (res.ok) {
                        var location = res.header["location"];
                        if (location && location.lastIndexOf("/") !== -1) {
                            deployment.id = location.substr(location.lastIndexOf("/") + 1);
                            resolve(deployment);
                        } else {
                            resolve(null);
                        }
                    } else {
                        var body = tryJSON(res.text);
                        if (body) {
                            reject(<CodePushError>body);
                        } else {
                            reject(<CodePushError>{ message: res.text, statusCode: res.status });
                        }
                    }
                });
        });
    }

    public getDeployments(appId: string): Promise<Deployment[]> {
        return Promise<Deployment[]>((resolve, reject, notify) => {
            var requester = (this._authedAgent ? this._authedAgent : request);
            var req = requester.get(this.serverUrl + "/apps/" + appId + "/deployments");
            this.attachCredentials(req, requester);

            req.end((err: any, res: request.Response) => {
                if (err) {
                    reject(<CodePushError>{ message: this.getErrorMessage(err, res) });
                    return;
                }

                var body = tryJSON(res.text);
                if (res.ok) {
                    if (body) {
                        resolve(body.deployments);
                    } else {
                        reject(<CodePushError>{ message: "Could not parse response: " + res.text, statusCode: res.status });
                    }
                } else {
                    if (body) {
                        reject(<CodePushError>body);
                    } else {
                        reject(<CodePushError>{ message: res.text, statusCode: res.status });
                    }
                }
            });
        });
    }

    public getDeployment(appId: string, deploymentId: string): Promise<Deployment> {
        return Promise<Deployment>((resolve, reject, notify) => {
            var requester = (this._authedAgent ? this._authedAgent : request);
            var req = requester.get(this.serverUrl + "/apps/" + appId + "/deployments/" + deploymentId);
            this.attachCredentials(req, requester);

            req.end((err: any, res: request.Response) => {
                if (err) {
                    reject(<CodePushError>{ message: this.getErrorMessage(err, res) });
                    return;
                }

                var body = tryJSON(res.text);
                if (res.ok) {
                    if (body) {
                        resolve(body.deployment);
                    } else {
                        reject(<CodePushError>{ message: "Could not parse response: " + res.text, statusCode: res.status });
                    }
                } else {
                    if (body) {
                        reject(<CodePushError>body);
                    } else {
                        reject(<CodePushError>{ message: res.text, statusCode: res.status });
                    }
                }
            });
        });
    }

    public getDeploymentMetrics(appId: string, deploymentId: string): Promise<DeploymentMetrics> {
        return Promise<DeploymentMetrics>((resolve, reject, notify) => {
            var requester = (this._authedAgent ? this._authedAgent : request);
            var req = requester.get(this.serverUrl + "/apps/" + appId + "/deployments/" + deploymentId + "/metrics");
            this.attachCredentials(req, requester);

            req.end((err: any, res: request.Response) => {
                if (err) {
                    reject(<CodePushError>{ message: this.getErrorMessage(err, res) });
                    return;
                }

                var body = tryJSON(res.text);
                if (res.ok) {
                    if (body) {
                        resolve(body.metrics);
                    } else {
                        reject(<CodePushError>{ message: "Could not parse response: " + res.text, statusCode: res.status });
                    }
                } else {
                    if (body) {
                        reject(<CodePushError>body);
                    } else {
                        reject(<CodePushError>{ message: res.text, statusCode: res.status });
                    }
                }
            });
        });
    }

    public updateDeployment(appId: string, infoToChange: Deployment): Promise<void> {
        return Promise<void>((resolve, reject, notify) => {
            var requester = (this._authedAgent ? this._authedAgent : request);
            var req = requester.put(this.serverUrl + "/apps/" + appId + "/deployments/" + infoToChange.id);
            this.attachCredentials(req, requester);

            req.set("Content-Type", "application/json;charset=UTF-8")
                .send(JSON.stringify(infoToChange))
                .end((err: any, res: request.Response) => {
                    if (err) {
                        reject(<CodePushError>{ message: this.getErrorMessage(err, res) });
                        return;
                    }

                    if (res.ok) {
                        resolve(null);
                    } else {
                        var body = tryJSON(res.text);
                        if (body) {
                            reject(<CodePushError>body);
                        } else {
                            reject(<CodePushError>{ message: res.text, statusCode: res.status });
                        }
                    }
                });
        });
    }

    public removeDeployment(appId: string, deployment: Deployment | string): Promise<void> {
        return Promise<void>((resolve, reject, notify) => {
            var id: string = (typeof deployment === "string") ? deployment : deployment.id;
            var requester = (this._authedAgent ? this._authedAgent : request);
            var req = requester.del(this.serverUrl + "/apps/" + appId + "/deployments/" + id);
            this.attachCredentials(req, requester);

            req.end((err: any, res: request.Response) => {
                if (err) {
                    reject(<CodePushError>{ message: this.getErrorMessage(err, res) });
                    return;
                }

                if (res.ok) {
                    resolve(null);
                } else {
                    var body = tryJSON(res.text);
                    if (body) {
                        reject(<CodePushError>body);
                    } else {
                        reject(<CodePushError>{ message: res.text, statusCode: res.status });
                    }
                }
            });
        });
    }

    public getDeploymentKeys(appId: string, deploymentId: string): Promise<DeploymentKey[]> {
        return Promise<DeploymentKey[]>((resolve, reject, notify) => {
            var requester = (this._authedAgent ? this._authedAgent : request);
            var req = requester.get(this.serverUrl + "/apps/" + appId + "/deployments/" + deploymentId + "/deploymentKeys")
            this.attachCredentials(req, requester);

            req.end((err: any, res: request.Response) => {
                if (err) {
                    reject(<CodePushError>{ message: this.getErrorMessage(err, res) });
                    return;
                }

                var body = tryJSON(res.text);
                if (res.ok) {
                    if (body) {
                        resolve(body.deploymentKeys);
                    } else {
                        reject(<CodePushError>{ message: "Could not parse response: " + res.text, statusCode: res.status });
                    }
                } else {
                    if (body) {
                        reject(<CodePushError>body);
                    } else {
                        reject(<CodePushError>{ message: res.text, statusCode: res.status });
                    }
                }
            });
        });
    }

    public addPackage(appId: string, deploymentId: string, fileOrPath: File | string, description: string, label: string, appVersion: string, isMandatory: boolean = false, uploadProgressCallback?: (progress: number) => void): Promise<void> {
        return Promise<void>((resolve, reject, notify) => {
            var packageInfo: PackageToUpload = this.generatePackageInfo(description, label, appVersion, isMandatory);
            var requester = (this._authedAgent ? this._authedAgent : request);
            var req = requester.put(this.serverUrl + "/apps/" + appId + "/deployments/" + deploymentId + "/package");
            this.attachCredentials(req, requester);

            var file: any;
            if (typeof fileOrPath === "string") {
                file = fs.createReadStream(<string>fileOrPath);
            } else {
                file = fileOrPath;
            }

            req.attach("package", file)
                .field("packageInfo", JSON.stringify(packageInfo))
                .on("progress", (event: any) => {
                    if (uploadProgressCallback && event && event.total > 0) {
                        var currentProgress: number = event.loaded / event.total * 100;
                        uploadProgressCallback(currentProgress);
                    }
                })
                .end((err: any, res: request.Response) => {
                    if (err) {
                        reject(<CodePushError>{ message: this.getErrorMessage(err, res) });
                        return;
                    }

                    if (res.ok) {
                        resolve(<void>null);
                    } else {
                        var body = tryJSON(res.text);
                        if (body) {
                            reject(<CodePushError>body);
                        } else {
                            reject(<CodePushError>{ message: res.text, statusCode: res.status });
                        }
                    }
                });
        });
    }

    public promotePackage(appId: string, sourceDeploymentId: string, destDeploymentId: string): Promise<void> {
        return Promise<void>((resolve, reject, notify) => {
            var requester = (this._authedAgent ? this._authedAgent : request);
            var req = requester.post(this.serverUrl + "/apps/" + appId + "/deployments/" + sourceDeploymentId + "/promote/" + destDeploymentId);
            this.attachCredentials(req, requester);

            req.end((err: any, res: request.Response) => {
                if (err) {
                    reject(<CodePushError>{ message: this.getErrorMessage(err, res) });
                    return;
                }

                if (res.ok) {
                    resolve(<void>null);
                } else {
                    var body = tryJSON(res.text);
                    if (body) {
                        reject(<CodePushError>body);
                    } else {
                        reject(<CodePushError>{ message: res.text, statusCode: res.status });
                    }
                }
            });
        });
    }

    public rollbackPackage(appId: string, deploymentId: string, targetRelease?: string): Promise<void> {
        return Promise<void>((resolve, reject, notify) => {
            var requester = (this._authedAgent ? this._authedAgent : request);
            var req = requester.post(this.serverUrl + "/apps/" + appId + "/deployments/" + deploymentId + "/rollback/" + (targetRelease || ""));
            this.attachCredentials(req, requester);

            req.end((err: any, res: request.Response) => {
                if (err) {
                    reject(<CodePushError>{ message: this.getErrorMessage(err, res) });
                    return;
                }

                if (res.ok) {
                    resolve(<void>null);
                } else {
                    var body = tryJSON(res.text);
                    if (body) {
                        reject(<CodePushError>body);
                    } else {
                        reject(<CodePushError>{ message: res.text, statusCode: res.status });
                    }
                }
            });
        });
    }

    public getPackage(appId: string, deploymentId: string): Promise<Package> {
        return Promise<Package>((resolve, reject, notify) => {
            var requester = (this._authedAgent ? this._authedAgent : request);
            var req = requester.get(this.serverUrl + "/apps/" + appId + "/deployments/" + deploymentId + "/package");
            this.attachCredentials(req, requester);

            req.end((err: any, res: request.Response) => {
                if (err) {
                    reject(<CodePushError>{ message: this.getErrorMessage(err, res) });
                    return;
                }

                var body = tryJSON(res.text);
                if (res.ok) {
                    if (body) {
                        resolve(body.package);
                    } else {
                        reject(<CodePushError>{ message: "Could not parse response: " + res.text, statusCode: res.status });
                    }
                } else {
                    if (body) {
                        reject(<CodePushError>body);
                    } else {
                        reject(<CodePushError>{ message: res.text, statusCode: res.status });
                    }
                }
            });
        });
    }

    public getPackageHistory(appId: string, deploymentId: string): Promise<Package[]> {
        return Promise<Package[]>((resolve, reject, notify) => {
            var requester = (this._authedAgent ? this._authedAgent : request);
            var req = requester.get(this.serverUrl + "/apps/" + appId + "/deployments/" + deploymentId + "/packageHistory");
            this.attachCredentials(req, requester);

            req.end((err: any, res: request.Response) => {
                if (err) {
                    reject(<CodePushError>{ message: this.getErrorMessage(err, res) });
                    return;
                }

                var body = tryJSON(res.text);
                if (res.ok) {
                    if (body) {
                        resolve(body.packageHistory);
                    } else {
                        reject(<CodePushError>{ message: "Could not parse response: " + res.text, statusCode: res.status });
                    }
                } else {
                    if (body) {
                        reject(<CodePushError>body);
                    } else {
                        reject(<CodePushError>{ message: res.text, statusCode: res.status });
                    }
                }
            });
        });
    }

    private static getLoginInfo(accessKey: string): ILoginInfo {
        try {
            var decoded: string = base64.decode(accessKey);
            return tryJSON(decoded);
        } catch (ex) {
            return null;
        }
    }

    private getErrorMessage(error: Error, response: request.Response): string {
        return response && response.text ? response.text : error.message;
    }

    private generatePackageInfo(description: string, label: string, appVersion: string, isMandatory: boolean): PackageToUpload {
        return {
            description: description,
            label: label,
            appVersion: appVersion,
            isMandatory: isMandatory
        };
    }

    private attachCredentials(request: request.Request<any>, requester: request.SuperAgent<any>): void {
        if (this._saveAuthedAgent) {
            if (requester && requester.attachCookies) {
                requester.attachCookies(request);
            }
        } else {
            request.withCredentials();
        }

        if (this._userAgent) {
            request.set("User-Agent", this._userAgent);
        }
    }

    private generateAccessKey(): Promise<string> {
        return this.getAccountInfo().then(() => {
            var accessKey = crypto.randomBytes(21)
                .toString("base64")
                .replace(/\+/g, "_")  // URL-friendly characters
                .replace(/\//g, "-")
                .concat(this.accountId);

            return accessKey;
        })
    }
}