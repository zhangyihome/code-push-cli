import * as base64 from "base-64";
import Q = require("q");
import crypto = require("crypto");
import Promise = Q.Promise;
import superagent = require("superagent");

var packageJson = require("../../package.json");

declare var fs: any;

if (typeof window === `undefined`) {
    fs = require(`fs`);
} else {
    fs = {
        createReadStream: (fileOrPath: string): void => {
            throw new Error(`Tried to call a node fs function from the browser.`);
        }
    }
}

// Aliasing UpdateMetrics as IUpdateMetrics & CollaboratorProperties as ICollaboratorProperties to deal with TypeScript issue that removes unused imports.
import { AccessKey, Account, App, CollaboratorMap, CollaboratorProperties as ICollaboratorProperties, Deployment, DeploymentMetrics, Package, UpdateMetrics as IUpdateMetrics } from "rest-definitions";
export { AccessKey, Account, App, CollaboratorMap, Deployment, DeploymentMetrics, Package };
export type UpdateMetrics = IUpdateMetrics;
export type CollaboratorProperties = ICollaboratorProperties;

export module Permissions {
    export const Owner = "Owner";
    export const Collaborator = "Collaborator";
}

export interface CodePushError {
    message?: string;
    statusCode?: number;
}

interface PackageToUpload {
    description: string;
    appVersion: string;
    isMandatory: boolean;
}

interface JsonResponse {
    header: { [headerName: string]: string };
    body?: any;
}

// A template string tag function that URL encodes the substituted values
function urlEncode(strings: string[], ...values: string[]): string {
    var result = "";
    for (var i = 0; i < strings.length; i++) {
        result += strings[i];   // Assumes that template string will not start with a substitution
        if (i < values.length) {
            result += encodeURIComponent(values[i]);
        }
    }

    return result;
}

export class AccountManager {
    private static API_VERSION = `v2`;

    private _accessKey: string;
    private _serverUrl: string;
    private _userAgent: string;

    constructor(accessKey: string, userAgent?: string, serverUrl?: string) {
        this._accessKey = accessKey;
        this._userAgent = userAgent;
        this._serverUrl = serverUrl || `https://codepush.azurewebsites.net`;
    }

    public get accessKey(): string {
        return this._accessKey;
    }

    public isAuthenticated(): Promise<boolean> {
        return Promise<boolean>((resolve, reject, notify) => {
            var request: superagent.Request<any> = superagent.get(this._serverUrl + urlEncode `/authenticated`);
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

    public addAccessKey(machine: string, description?: string): Promise<AccessKey> {
        return this.generateAccessKey()
            .then((newAccessKey: string) => {
                var accessKey: AccessKey = { name: newAccessKey, createdTime: new Date().getTime(), createdBy: machine, description: description };
                return this.post(urlEncode `/accessKeys/`, JSON.stringify(accessKey), /*expectResponseBody=*/ false)
                    .then(() => accessKey);
            });
    }

    public getAccessKey(accessKey: string): Promise<AccessKey> {
        return this.get(urlEncode `/accessKeys/${accessKey}`)
            .then((res: JsonResponse) => res.body.accessKey);
    }

    public getAccessKeys(): Promise<AccessKey[]> {
        return this.get(urlEncode `/accessKeys`)
            .then((res: JsonResponse) => res.body.accessKeys);
    }

    public removeAccessKey(accessKey: string): Promise<void> {
        return this.del(urlEncode `/accessKeys/${accessKey}`)
            .then(() => null);
    }

    // Account
    public getAccountInfo(): Promise<Account> {
        return this.get(urlEncode `/account`)
            .then((res: JsonResponse) => res.body.account);
    }

    public updateAccountInfo(accountInfoToChange: Account): Promise<void> {
        return this.put(urlEncode `/account`, JSON.stringify(accountInfoToChange))
            .then(() => null);
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

    public updateApp(appName: string, infoToChange: App): Promise<void> {
        return this.put(urlEncode `/apps/${appName}`, JSON.stringify(infoToChange))
            .then(() => null);
    }

    public transferApp(appName: string, email: string): Promise<void> {
        return this.post(urlEncode `/apps/${appName}/transfer/${email}`, /*requestBody=*/ null, /*expectResponseBody=*/ false)
            .then(() => null);
    }

    // Collaborators
    public getCollaboratorsList(appName: string): Promise<CollaboratorMap> {
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

    public getDeployments(appName: string): Promise<Deployment[]> {
        return this.get(urlEncode `/apps/${appName}/deployments/`)
            .then((res: JsonResponse) => res.body.deployments);
    }

    public getDeployment(appName: string, deploymentName: string): Promise<Deployment> {
        return this.get(urlEncode `/apps/${appName}/deployments/${deploymentName}`)
            .then((res: JsonResponse) => res.body.deployment);
    }

    public getDeploymentMetrics(appName: string, deploymentName: string): Promise<DeploymentMetrics> {
        return this.get(urlEncode `/apps/${appName}/deployments/${deploymentName}/metrics`)
            .then((res: JsonResponse) => res.body.metrics);
    }

    public updateDeployment(appName: string, deploymentName: string, infoToChange: Deployment): Promise<void> {
        return this.put(urlEncode `/apps/${appName}/deployments/${deploymentName}`, JSON.stringify(infoToChange))
            .then(() => null);
    }

    public removeDeployment(appName: string, deploymentName: string): Promise<void> {
        return this.del(urlEncode `/apps/${appName}/deployments/${deploymentName}`)
            .then(() => null);
    }

    public addPackage(appName: string, deploymentName: string, fileOrPath: File | string, description: string, appVersion: string, isMandatory: boolean = false, uploadProgressCallback?: (progress: number) => void): Promise<void> {
        return Promise<void>((resolve, reject, notify) => {
            var packageInfo: PackageToUpload = this.generatePackageInfo(description, appVersion, isMandatory);
            var request: superagent.Request<any> = superagent.put(this._serverUrl + urlEncode `/apps/${appName}/deployments/${deploymentName}/package`);
            this.attachCredentials(request);

            var file: any;
            if (typeof fileOrPath === `string`) {
                file = fs.createReadStream(<string>fileOrPath);
            } else {
                file = fileOrPath;
            }

            request.attach(`package`, file)
                .field(`packageInfo`, JSON.stringify(packageInfo))
                .on(`progress`, (event: any) => {
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

    public promotePackage(appName: string, sourceDeploymentName: string, destDeploymentName: string): Promise<void> {
        return this.post(urlEncode `/apps/${appName}/deployments/${sourceDeploymentName}/promote/${destDeploymentName}`, /*requestBody=*/ null, /*expectResponseBody=*/ false)
            .then(() => null);
    }

    public rollbackPackage(appName: string, deploymentName: string, targetRelease?: string): Promise<void> {
        return this.post(urlEncode `/apps/${appName}/deployments/${deploymentName}/rollback/${targetRelease || ``}`, /*requestBody=*/ null, /*expectResponseBody=*/ false)
            .then(() => null);
    }

    public getPackage(appName: string, deploymentName: string): Promise<Package> {
        return this.get(urlEncode `/apps/${appName}/deployments/${deploymentName}/package`)
            .then((res: JsonResponse) => res.body.package);
    }

    public getPackageHistory(appName: string, deploymentName: string): Promise<Package[]> {
        return this.get(urlEncode `/apps/${appName}/deployments/${deploymentName}/packageHistory`)
            .then((res: JsonResponse) => res.body.packageHistory);
    }

    private get(endpoint: string, expectResponseBody: boolean = true): Promise<JsonResponse> {
        return this.makeApiRequest(`get`, endpoint, /*requestBody=*/ null, expectResponseBody, /*contentType=*/ null);
    }

    private post(endpoint: string, requestBody: string, expectResponseBody: boolean, contentType: string = `application/json;charset=UTF-8`): Promise<JsonResponse> {
        return this.makeApiRequest(`post`, endpoint, requestBody, expectResponseBody, contentType);
    }

    private put(endpoint: string, requestBody: string, expectResponseBody: boolean = false, contentType: string = `application/json;charset=UTF-8`): Promise<JsonResponse> {
        return this.makeApiRequest(`put`, endpoint, requestBody, expectResponseBody, contentType);
    }

    private del(endpoint: string, expectResponseBody: boolean = false): Promise<JsonResponse> {
        return this.makeApiRequest(`del`, endpoint, /*requestBody=*/ null, expectResponseBody, /*contentType=*/ null);
    }

    private makeApiRequest(method: string, endpoint: string, requestBody: string, expectResponseBody: boolean, contentType: string): Promise<JsonResponse> {
        return Promise<JsonResponse>((resolve, reject, notify) => {
            var request: superagent.Request<any> = (<any>superagent)[method](this._serverUrl + endpoint);
            this.attachCredentials(request);

            if (requestBody) {
                if (contentType) {
                    request = request.set(`Content-Type`, contentType);
                }

                request = request.send(requestBody);
            }

            request.end((err: any, res: superagent.Response) => {
                if (err) {
                    reject(<CodePushError>{ message: this.getErrorMessage(err, res) });
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
                            header: res.header,
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

    private generatePackageInfo(description: string, appVersion: string, isMandatory: boolean): PackageToUpload {
        return {
            description: description,
            appVersion: appVersion,
            isMandatory: isMandatory
        };
    }

    private attachCredentials(request: superagent.Request<any>): void {
        request.set(`Accept`, `application/vnd.code-push.${AccountManager.API_VERSION}+json`);
        request.set(`Authorization`, `Bearer ${this._accessKey}`);
        if (this._userAgent) {
            request.set(`User-Agent`, this._userAgent);
        }
        request.set(`X-CodePush-SDK-Version`, `${packageJson.name}/${packageJson.version}`);
    }

    private generateAccessKey(): Promise<string> {
        return this.getAccountInfo()
            .then((account: Account) => {
                var accessKey = crypto.randomBytes(21)
                    .toString(`base64`)
                    .replace(/\+/g, `_`)  // URL-friendly characters
                    .replace(/\//g, `-`)
                    .concat(account.email);

                return accessKey;
            });
    }
}