import * as base64 from "base-64";
import crypto = require("crypto");
import * as os from "os";
import Q = require("q");
import superagent = require("superagent");

import Promise = Q.Promise;

import { AccessKey, AccessKeyRequest, Account, App, CodePushError, CollaboratorMap, CollaboratorProperties, Deployment, DeploymentMetrics, Headers, Package, PackageInfo, ServerAccessKey, Session, UpdateMetrics } from "./types";

var superproxy = require("superagent-proxy");
superproxy(superagent);

var packageJson = require("../package.json");

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

interface JsonResponse {
    headers: Headers;
    body?: any;
}

// A template string tag function that URL encodes the substituted values
function urlEncode(strings: string[], ...values: string[]): string {
    var result = "";
    for (var i = 0; i < strings.length; i++) {
        result += strings[i];
        if (i < values.length) {
            result += encodeURIComponent(values[i]);
        }
    }

    return result;
}

class AccountManager {
    public static AppPermission = {
        OWNER: "Owner",
        COLLABORATOR: "Collaborator"
    };
    public static SERVER_URL = "https://codepush-management.azurewebsites.net";

    private static API_VERSION: number = 2;

    private _accessKey: string;
    private _serverUrl: string;
    private _customHeaders: Headers;
    private _proxy: string;

    constructor(accessKey: string, customHeaders?: Headers, serverUrl?: string, proxy?: string) {
        if (!accessKey) throw new Error("An access key must be specified.");

        this._accessKey = accessKey;
        this._customHeaders = customHeaders;
        this._serverUrl = serverUrl || AccountManager.SERVER_URL;
        this._proxy = proxy;
    }

    public get accessKey(): string {
        return this._accessKey;
    }

    public isAuthenticated(): Promise<boolean> {
        return Promise<boolean>((resolve, reject, notify) => {
            var request: superagent.Request<any> = superagent.get(this._serverUrl + urlEncode `/authenticated`);
            if (this._proxy) (<any>request).proxy(this._proxy);
            this.attachCredentials(request);

            request.end((err: any, res: superagent.Response) => {
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

    public addAccessKey(friendlyName: string, ttl?: number): Promise<AccessKey> {
        if (!friendlyName) {
            throw new Error("A name must be specified when adding an access key.");
        }

        var accessKeyRequest: AccessKeyRequest = {
            createdBy: os.hostname(),
            friendlyName,
            ttl
        };

        return this.post(urlEncode `/accessKeys/`, JSON.stringify(accessKeyRequest), /*expectResponseBody=*/ true)
            .then((response: JsonResponse) => {
                return {
                    createdTime: response.body.accessKey.createdTime,
                    expires: response.body.accessKey.expires,
                    key: response.body.accessKey.name,
                    name: response.body.accessKey.friendlyName
                };
            });
    }

    public getAccessKey(accessKeyName: string): Promise<AccessKey> {
        return this.get(urlEncode `/accessKeys/${accessKeyName}`)
            .then((res: JsonResponse) => {
                return {
                    createdTime: res.body.accessKey.createdTime,
                    expires: res.body.accessKey.expires,
                    name: res.body.accessKey.friendlyName,
                };
            });
    }

    public getAccessKeys(): Promise<AccessKey[]> {
        return this.get(urlEncode `/accessKeys`)
            .then((res: JsonResponse) => {
                var accessKeys: AccessKey[] = [];

                res.body.accessKeys.forEach((serverAccessKey: ServerAccessKey) => {
                    !serverAccessKey.isSession && accessKeys.push({
                        createdTime: serverAccessKey.createdTime,
                        expires: serverAccessKey.expires,
                        name: serverAccessKey.friendlyName
                    });
                });

                return accessKeys;
            });
    }

    public getSessions(): Promise<Session[]> {
        return this.get(urlEncode `/accessKeys`)
            .then((res: JsonResponse) => {
                // A machine name might be associated with multiple session keys,
                // but we should only return one per machine name.
                var sessionMap: { [machineName: string]: Session } = {};
                var now: number = new Date().getTime();
                res.body.accessKeys.forEach((serverAccessKey: ServerAccessKey) => {
                    if (serverAccessKey.isSession && serverAccessKey.expires > now) {
                        sessionMap[serverAccessKey.createdBy] = {
                            loggedInTime: serverAccessKey.createdTime,
                            machineName: serverAccessKey.createdBy
                        };
                    }
                });

                var sessions: Session[] = Object.keys(sessionMap)
                    .map((machineName: string) => sessionMap[machineName]);

                return sessions;
            });
    }


    public editAccessKey(oldName: string, newName?: string, ttl?: number): Promise<AccessKey> {
        var accessKeyRequest: AccessKeyRequest = {
            friendlyName: newName,
            ttl
        };

        return this.patch(urlEncode `/accessKeys/${oldName}`, JSON.stringify(accessKeyRequest))
            .then((res: JsonResponse) => {
                return {
                    createdTime: res.body.accessKey.createdTime,
                    expires: res.body.accessKey.expires,
                    name: res.body.accessKey.friendlyName,
                };
            });
    }

    public removeAccessKey(name: string): Promise<void> {
        return this.del(urlEncode `/accessKeys/${name}`)
            .then(() => null);
    }

    public removeSession(machineName: string): Promise<void> {
        return this.del(urlEncode `/sessions/${machineName}`)
            .then(() => null);
    }

    // Account
    public getAccountInfo(): Promise<Account> {
        return this.get(urlEncode `/account`)
            .then((res: JsonResponse) => res.body.account);
    }

    // Apps
    public getApps(): Promise<App[]> {
        return this.get(urlEncode `/apps`)
            .then((res: JsonResponse) => res.body.apps);
    }

    public getApp(appName: string): Promise<App> {
        return this.get(urlEncode `/apps/${appName}`)
            .then((res: JsonResponse) => res.body.app);
    }

    public addApp(appName: string): Promise<App> {
        var app: App = { name: appName };
        return this.post(urlEncode `/apps/`, JSON.stringify(app), /*expectResponseBody=*/ false)
            .then(() => app);
    }

    public removeApp(appName: string): Promise<void> {
        return this.del(urlEncode `/apps/${appName}`)
            .then(() => null);
    }

    public renameApp(oldAppName: string, newAppName: string): Promise<void> {
        return this.patch(urlEncode `/apps/${oldAppName}`, JSON.stringify({ name: newAppName }))
            .then(() => null);
    }

    public transferApp(appName: string, email: string): Promise<void> {
        return this.post(urlEncode `/apps/${appName}/transfer/${email}`, /*requestBody=*/ null, /*expectResponseBody=*/ false)
            .then(() => null);
    }

    // Collaborators
    public getCollaborators(appName: string): Promise<CollaboratorMap> {
        return this.get(urlEncode `/apps/${appName}/collaborators`)
            .then((res: JsonResponse) => res.body.collaborators);
    }

    public addCollaborator(appName: string, email: string): Promise<void> {
        return this.post(urlEncode `/apps/${appName}/collaborators/${email}`, /*requestBody=*/ null, /*expectResponseBody=*/ false)
            .then(() => null);
    }

    public removeCollaborator(appName: string, email: string): Promise<void> {
        return this.del(urlEncode `/apps/${appName}/collaborators/${email}`)
            .then(() => null);
    }

    // Deployments
    public addDeployment(appName: string, deploymentName: string): Promise<Deployment> {
        var deployment = <Deployment>{ name: deploymentName };
        return this.post(urlEncode `/apps/${appName}/deployments/`, JSON.stringify(deployment), /*expectResponseBody=*/ true)
            .then((res: JsonResponse) => res.body.deployment);
    }

    public clearDeploymentHistory(appName: string, deploymentName: string): Promise<void> {
        return this.del(urlEncode `/apps/${appName}/deployments/${deploymentName}/history`)
            .then(() => null);
    }

    public getDeployments(appName: string): Promise<Deployment[]> {
        return this.get(urlEncode `/apps/${appName}/deployments/`)
            .then((res: JsonResponse) => res.body.deployments);
    }

    public getDeployment(appName: string, deploymentName: string): Promise<Deployment> {
        return this.get(urlEncode `/apps/${appName}/deployments/${deploymentName}`)
            .then((res: JsonResponse) => res.body.deployment);
    }

    public renameDeployment(appName: string, oldDeploymentName: string, newDeploymentName: string): Promise<void> {
        return this.patch(urlEncode `/apps/${appName}/deployments/${oldDeploymentName}`, JSON.stringify({ name: newDeploymentName }))
            .then(() => null);
    }

    public removeDeployment(appName: string, deploymentName: string): Promise<void> {
        return this.del(urlEncode `/apps/${appName}/deployments/${deploymentName}`)
            .then(() => null);
    }

    public getDeploymentMetrics(appName: string, deploymentName: string): Promise<DeploymentMetrics> {
        return this.get(urlEncode `/apps/${appName}/deployments/${deploymentName}/metrics`)
            .then((res: JsonResponse) => res.body.metrics);
    }

    public getDeploymentHistory(appName: string, deploymentName: string): Promise<Package[]> {
        return this.get(urlEncode `/apps/${appName}/deployments/${deploymentName}/history`)
            .then((res: JsonResponse) => res.body.history);
    }

    public release(appName: string, deploymentName: string, fileOrPath: File | string, targetBinaryVersion: string, updateMetadata: PackageInfo, uploadProgressCallback?: (progress: number) => void): Promise<void> {
        return Promise<void>((resolve, reject, notify) => {
            updateMetadata.appVersion = targetBinaryVersion;
            var request: superagent.Request<any> = superagent.post(this._serverUrl + urlEncode `/apps/${appName}/deployments/${deploymentName}/release`);
            if (this._proxy) (<any>request).proxy(this._proxy);
            this.attachCredentials(request);

            var file: any;
            if (typeof fileOrPath === "string") {
                file = fs.createReadStream(<string>fileOrPath);
            } else {
                file = fileOrPath;
            }

            request.attach("package", file)
                .field("packageInfo", JSON.stringify(updateMetadata))
                .on("progress", (event: any) => {
                    if (uploadProgressCallback && event && event.total > 0) {
                        var currentProgress: number = event.loaded / event.total * 100;
                        uploadProgressCallback(currentProgress);
                    }
                })
                .end((err: any, res: superagent.Response) => {
                    if (err) {
                        reject(<CodePushError>{ message: this.getErrorMessage(err, res) });
                        return;
                    }

                    if (res.ok) {
                        resolve(<void>null);
                    } else {
                        try {
                            var body = JSON.parse(res.text);
                        } catch (err) {
                        }

                        if (body) {
                            reject(<CodePushError>body);
                        } else {
                            reject(<CodePushError>{ message: res.text, statusCode: res.status });
                        }
                    }
                });
        });
    }

    public patchRelease(appName: string, deploymentName: string, label: string, updateMetadata: PackageInfo): Promise<void> {
        updateMetadata.label = label;
        var requestBody: string = JSON.stringify({ packageInfo: updateMetadata });
        return this.patch(urlEncode `/apps/${appName}/deployments/${deploymentName}/release`, requestBody, /*expectResponseBody=*/ false)
            .then(() => null);
    }

    public promote(appName: string, sourceDeploymentName: string, destinationDeploymentName: string,  updateMetadata: PackageInfo): Promise<void> {
        var requestBody: string = JSON.stringify({ packageInfo: updateMetadata });
        return this.post(urlEncode `/apps/${appName}/deployments/${sourceDeploymentName}/promote/${destinationDeploymentName}`, requestBody, /*expectResponseBody=*/ false)
            .then(() => null);
    }

    public rollback(appName: string, deploymentName: string, targetRelease?: string): Promise<void> {
        return this.post(urlEncode `/apps/${appName}/deployments/${deploymentName}/rollback/${targetRelease || ``}`, /*requestBody=*/ null, /*expectResponseBody=*/ false)
            .then(() => null);
    }

    private get(endpoint: string, expectResponseBody: boolean = true): Promise<JsonResponse> {
        return this.makeApiRequest("get", endpoint, /*requestBody=*/ null, expectResponseBody, /*contentType=*/ null);
    }

    private post(endpoint: string, requestBody: string, expectResponseBody: boolean, contentType: string = "application/json;charset=UTF-8"): Promise<JsonResponse> {
        return this.makeApiRequest("post", endpoint, requestBody, expectResponseBody, contentType);
    }

    private patch(endpoint: string, requestBody: string, expectResponseBody: boolean = false, contentType: string = "application/json;charset=UTF-8"): Promise<JsonResponse> {
        return this.makeApiRequest("patch", endpoint, requestBody, expectResponseBody, contentType);
    }

    private del(endpoint: string, expectResponseBody: boolean = false): Promise<JsonResponse> {
        return this.makeApiRequest("del", endpoint, /*requestBody=*/ null, expectResponseBody, /*contentType=*/ null);
    }

    private makeApiRequest(method: string, endpoint: string, requestBody: string, expectResponseBody: boolean, contentType: string): Promise<JsonResponse> {
        return Promise<JsonResponse>((resolve, reject, notify) => {
            var request: superagent.Request<any> = (<any>superagent)[method](this._serverUrl + endpoint);
            if (this._proxy) (<any>request).proxy(this._proxy);
            this.attachCredentials(request);

            if (requestBody) {
                if (contentType) {
                    request = request.set("Content-Type", contentType);
                }

                request = request.send(requestBody);
            }

            request.end((err: any, res: superagent.Response) => {
                if (err) {
                    reject(<CodePushError>{
                        message: this.getErrorMessage(err, res),
                        statusCode: res.status
                    });

                    return;
                }

                try {
                    var body = JSON.parse(res.text);
                } catch (err) {
                }

                if (res.ok) {
                    if (expectResponseBody && !body) {
                        reject(<CodePushError>{ message: `Could not parse response: ${res.text}`, statusCode: res.status });
                    } else {
                        resolve(<JsonResponse>{
                            headers: res.header,
                            body: body
                        });
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

    private getErrorMessage(error: Error, response: superagent.Response): string {
        return response && response.text ? response.text : error.message;
    }

    private attachCredentials(request: superagent.Request<any>): void {
        if (this._customHeaders) {
            for (var headerName in this._customHeaders) {
                request.set(headerName, this._customHeaders[headerName]);
            }
        }

        request.set("Accept", `application/vnd.code-push.v${AccountManager.API_VERSION}+json`);
        request.set("Authorization", `Bearer ${this._accessKey}`);
        request.set("X-CodePush-SDK-Version", packageJson.version);
    }
}

export = AccountManager;
