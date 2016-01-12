import * as base64 from "base-64";
import Q = require("q");
import crypto = require("crypto");
import tryJSON = require("try-json");
import Promise = Q.Promise;
import request = require("superagent");

var packageJson = require("../../package.json");

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

import { AccessKey, Account, App, Deployment, DeploymentKey, Package } from "rest-definitions";
export { AccessKey, Account, App, Deployment, DeploymentKey, Package };

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

export class AccountManager {
    private static API_VERSION = "v2";

    private _accessKey: string;
    private _serverUrl: string;
    private _userAgent: string;

    constructor(accessKey: string, userAgent?: string, serverUrl?: string) {
        this._accessKey = accessKey;
        this._userAgent = userAgent || (packageJson.name + "/" + packageJson.version);
        this._serverUrl = serverUrl || "https://codepush.azurewebsites.net";
    }

    public get accessKey(): string {
        return this._accessKey;
    }

    public isAuthenticated(): Promise<boolean> {
        return Promise<boolean>((resolve, reject, notify) => {
            var req = request.get(this._serverUrl + "/authenticated");
            this.attachCredentials(req);

            req.end((err: any, res: request.Response) => {
                if (err && err.status !== 401) {
                    reject(<CodePushError>{ message: this.getErrorMessage(err, res) });
                    return;
                }

                var status: number = res ? res.status : err.status;
                var authenticated: boolean = status === 200;

                resolve(authenticated);
            });
        });
    }

    public addAccessKey(machine: string, description?: string): Promise<AccessKey> {
        return Promise<AccessKey>((resolve, reject, notify) => {
            return this.generateAccessKey().then((newAccessKey: string) => {
                var accessKey: AccessKey = { id: null, name: newAccessKey, createdTime: new Date().getTime(), createdBy: machine, description: description };
                var req = request.post(this._serverUrl + "/accessKeys/");

                this.attachCredentials(req);

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
            var req = request.get(this._serverUrl + "/accessKeys/" + accessKeyId);

            this.attachCredentials(req);

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
            var req = request.get(this._serverUrl + "/accessKeys");

            this.attachCredentials(req);

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
            var req = request.del(this._serverUrl + "/accessKeys/" + accessKeyId);

            this.attachCredentials(req);

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
            var req = request.get(this._serverUrl + "/account");
            this.attachCredentials(req);

            req.end((err: any, res: request.Response) => {
                if (err) {
                    reject(<CodePushError>{ message: this.getErrorMessage(err, res) });
                    return;
                }

                var body = tryJSON(res.text);

                if (res.ok) {
                    if (body) {
                        resolve(body.account);
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
            var req = request.put(this._serverUrl + "/account");
            this.attachCredentials(req);

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
            var req = request.get(this._serverUrl + "/apps");
            this.attachCredentials(req);

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
            var req = request.get(this._serverUrl + "/apps/" + appId);
            this.attachCredentials(req);

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

            var req = request.post(this._serverUrl + "/apps/");
            this.attachCredentials(req);

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
            var req = request.del(this._serverUrl + "/apps/" + id);
            this.attachCredentials(req);

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
            var req = request.put(this._serverUrl + "/apps/" + infoToChange.id);
            this.attachCredentials(req);

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

    // Deployments
    public addDeployment(appId: string, name: string): Promise<Deployment> {
        return Promise<Deployment>((resolve, reject, notify) => {
            var deployment = <Deployment>{ name: name };

            var req = request.post(this._serverUrl + "/apps/" + appId + "/deployments/");;
            this.attachCredentials(req);

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
            var req = request.get(this._serverUrl + "/apps/" + appId + "/deployments");
            this.attachCredentials(req);

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

    public getDeployment(appId: string, deploymentId: string) {
        return Promise<Deployment>((resolve, reject, notify) => {
            var req = request.get(this._serverUrl + "/apps/" + appId + "/deployments/" + deploymentId);
            this.attachCredentials(req);

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

    public updateDeployment(appId: string, infoToChange: Deployment): Promise<void> {
        return Promise<void>((resolve, reject, notify) => {
            var req = request.put(this._serverUrl + "/apps/" + appId + "/deployments/" + infoToChange.id);
            this.attachCredentials(req);

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
            var req = request.del(this._serverUrl + "/apps/" + appId + "/deployments/" + id);
            this.attachCredentials(req);

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
            var req = request.get(this._serverUrl + "/apps/" + appId + "/deployments/" + deploymentId + "/deploymentKeys")
            this.attachCredentials(req);

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
            var req = request.put(this._serverUrl + "/apps/" + appId + "/deployments/" + deploymentId + "/package");
            this.attachCredentials(req);

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
            var req = request.post(this._serverUrl + "/apps/" + appId + "/deployments/" + sourceDeploymentId + "/promote/" + destDeploymentId);
            this.attachCredentials(req);

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
            var req = request.post(this._serverUrl + "/apps/" + appId + "/deployments/" + deploymentId + "/rollback/" + (targetRelease || ""));
            this.attachCredentials(req);

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
            var req = request.get(this._serverUrl + "/apps/" + appId + "/deployments/" + deploymentId + "/package");
            this.attachCredentials(req);

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
            var req = request.get(this._serverUrl + "/apps/" + appId + "/deployments/" + deploymentId + "/packageHistory");
            this.attachCredentials(req);

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

    private attachCredentials(request: request.Request<any>): void {
        request.set("User-Agent", this._userAgent);
        request.set("Accept", "application/vnd.code-push." + AccountManager.API_VERSION + "+json");
        request.set("Authorization", "Bearer " + this._accessKey);
    }

    private generateAccessKey(): Promise<string> {
        return this.getAccountInfo().then((account: Account) => {
            var accessKey = crypto.randomBytes(21)
                .toString("base64")
                .replace(/\+/g, "_")  // URL-friendly characters
                .replace(/\//g, "-")
                .concat(account.id);

            return accessKey;
        })
    }
}