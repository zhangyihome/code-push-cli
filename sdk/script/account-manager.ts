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

// Aliasing UpdateMetrics as IUpdateMetrics to deal with TypeScript issue that removes unused imports.
import { AccessKey, Account, App, Deployment, DeploymentMetrics, Package, UpdateMetrics as IUpdateMetrics } from "rest-definitions";
export { AccessKey, Account, App, Deployment, DeploymentMetrics, Package };
export type UpdateMetrics = IUpdateMetrics;

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

interface JsonResponse {
    header: { [headerName: string]: string };
    body?: any;
}

export class AccountManager {
    private static API_VERSION = `v2`;

    private _accessKey: string;
    private _serverUrl: string;
    private _userAgent: string;

    constructor(accessKey: string, userAgent?: string, serverUrl?: string) {
        this._accessKey = accessKey;
        this._userAgent = userAgent || (`${packageJson.name}/${packageJson.version}`);
        this._serverUrl = serverUrl || `https://codepush.azurewebsites.net`;
    }

    public get accessKey(): string {
        return this._accessKey;
    }

    public isAuthenticated(): Promise<boolean> {
        return Promise<boolean>((resolve, reject, notify) => {
            var request: superagent.Request<any> = superagent.get(`${this._serverUrl}/authenticated`);
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
                var accessKey: AccessKey = { id: null, name: newAccessKey, createdTime: new Date().getTime(), createdBy: machine, description: description };
                return this.post(`/accessKeys/`, JSON.stringify(accessKey), /*expectResponseBody=*/ false)
                    .then((res: JsonResponse) => {
                        var location: string = res.header[`location`];
                        if (location && location.lastIndexOf(`/`) !== -1) {
                            accessKey.id = location.substr(location.lastIndexOf(`/`) + 1);
                            return accessKey;
                        } else {
                            return null;
                        }
                    });
            });
    }

    public getAccessKey(accessKeyId: string): Promise<AccessKey> {
        return this.get(`/accessKeys/${accessKeyId}`)
            .then((res: JsonResponse) => res.body.accessKey);
    }

    public getAccessKeys(): Promise<AccessKey[]> {
        return this.get(`/accessKeys`)
            .then((res: JsonResponse) => res.body.accessKeys);
    }

    public removeAccessKey(accessKeyId: string): Promise<void> {
        return this.del(`/accessKeys/${accessKeyId}`)
            .then(() => null);
    }

    // Account
    public getAccountInfo(): Promise<Account> {
        return this.get(`/account`)
            .then((res: JsonResponse) => res.body.account);
    }

    public updateAccountInfo(accountInfoToChange: Account): Promise<void> {
        return this.put(`/account`, JSON.stringify(accountInfoToChange))
            .then(() => null);
    }

    // Apps
    public getApps(): Promise<App[]> {
        return this.get(`/apps`)
            .then((res: JsonResponse) => res.body.apps);
    }

    public getApp(appId: string): Promise<App> {
        return this.get(`/apps/${appId}`)
            .then((res: JsonResponse) => res.body.app);
    }

    public addApp(appName: string): Promise<App> {
        var app: App = { name: appName };
        return this.post(`/apps/`, JSON.stringify(app), /*expectResponseBody=*/ false)
            .then((res: JsonResponse) => {
                var location = res.header[`location`];
                if (location && location.lastIndexOf(`/`) !== -1) {
                    app.id = location.substr(location.lastIndexOf(`/`) + 1);
                    return app;
                } else {
                    return null;
                }
            });
    }

    public removeApp(app: App | string): Promise<void> {
        var id: string = (typeof app === `string`) ? (<string>app) : (<App>app).id;
        return this.del(`/apps/${id}`)
            .then(() => null);
    }

    public updateApp(infoToChange: App): Promise<void> {
        return this.put(`/apps/${infoToChange.id}`, JSON.stringify(infoToChange))
            .then((res: JsonResponse) => null);
    }

    // Deployments
    public addDeployment(appId: string, name: string): Promise<Deployment> {
        var deployment = <Deployment>{ name: name };
        return this.post(`/apps/${appId}/deployments/`, JSON.stringify(deployment), /*expectResponseBody=*/ true)
            .then((res: JsonResponse) => res.body.deployment);
    }

    public getDeployments(appId: string): Promise<Deployment[]> {
        return this.get(`/apps/${appId}/deployments/`)
            .then((res: JsonResponse) => res.body.deployments);
    }

    public getDeployment(appId: string, deploymentId: string): Promise<Deployment> {
        return this.get(`/apps/${appId}/deployments/${deploymentId}`)
            .then((res: JsonResponse) => res.body.deployment);
    }

    public getDeploymentMetrics(appId: string, deploymentId: string): Promise<DeploymentMetrics> {
        return this.get(`/apps/${appId}/deployments/${deploymentId}/metrics`)
            .then((res: JsonResponse) => res.body.metrics);
    }

    public updateDeployment(appId: string, infoToChange: Deployment): Promise<void> {
        return this.put(`/apps/${appId}/deployments/${infoToChange.id}`, JSON.stringify(infoToChange))
            .then(() => null);
    }

    public removeDeployment(appId: string, deployment: Deployment | string): Promise<void> {
        var id: string = (typeof deployment === `string`) ? (<string>deployment) : (<Deployment>deployment).id;
        return this.del(`/apps/${appId}/deployments/${id}`)
            .then(() => null);
    }

    public addPackage(appId: string, deploymentId: string, fileOrPath: File | string, description: string, label: string, appVersion: string, isMandatory: boolean = false, uploadProgressCallback?: (progress: number) => void): Promise<void> {
        return Promise<void>((resolve, reject, notify) => {
            var packageInfo: PackageToUpload = this.generatePackageInfo(description, label, appVersion, isMandatory);
            var request: superagent.Request<any> = superagent.put(`${this._serverUrl}/apps/${appId}/deployments/${deploymentId}/package`);
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

    public promotePackage(appId: string, sourceDeploymentId: string, destDeploymentId: string): Promise<void> {
        return this.post(`/apps/${appId}/deployments/${sourceDeploymentId}/promote/${destDeploymentId}`, /*requestBody=*/ null, /*expectResponseBody=*/ false)
            .then(() => null);
    }

    public rollbackPackage(appId: string, deploymentId: string, targetRelease?: string): Promise<void> {
        return this.post(`/apps/${appId}/deployments/${deploymentId}/rollback/${targetRelease || ``}`, /*requestBody=*/ null, /*expectResponseBody=*/ false)
            .then(() => null);
    }

    public getPackage(appId: string, deploymentId: string): Promise<Package> {
        return this.get(`/apps/${appId}/deployments/${deploymentId}/package`)
            .then((res: JsonResponse) => res.body.package);
    }

    public getPackageHistory(appId: string, deploymentId: string): Promise<Package[]> {
        return this.get(`/apps/${appId}/deployments/${deploymentId}/packageHistory`)
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

    private generatePackageInfo(description: string, label: string, appVersion: string, isMandatory: boolean): PackageToUpload {
        return {
            description: description,
            label: label,
            appVersion: appVersion,
            isMandatory: isMandatory
        };
    }

    private attachCredentials(request: superagent.Request<any>): void {
        request.set(`User-Agent`, this._userAgent);
        request.set(`Accept`, `application/vnd.code-push.${AccountManager.API_VERSION}+json`);
        request.set(`Authorization`, `Bearer ${this._accessKey}`);
    }

    private generateAccessKey(): Promise<string> {
        return this.getAccountInfo()
            .then((account: Account) => {
                var accessKey = crypto.randomBytes(21)
                    .toString(`base64`)
                    .replace(/\+/g, `_`)  // URL-friendly characters
                    .replace(/\//g, `-`)
                    .concat(account.id);

                return accessKey;
            });
    }
}