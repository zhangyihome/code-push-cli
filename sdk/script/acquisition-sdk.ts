/// <reference path="../definitions/harness.d.ts" />

import { UpdateCheckResponse, UpdateCheckRequest } from "rest-definitions";

export module Http {
    export const enum Verb {
        GET, HEAD, POST, PUT, DELETE, TRACE, OPTIONS, CONNECT, PATCH
    }

    export interface Response {
        statusCode: number;
        body?: string;
    }

    export interface Requester {
        request(verb: Verb, url: string, callback: Callback<Response>): void;
        request(verb: Verb, url: string, requestBody: string, callback: Callback<Response>): void;
    }
}

// All fields are non-nullable, except when retrieving the currently running package on the first run of the app,
// in which case only the appVersion is compulsory
export interface Package {
    deploymentKey: string;
    description: string;
    label: string;
    appVersion: string;
    isMandatory: boolean;
    packageHash: string;
    packageSize: number;
}

export interface RemotePackage extends Package {
    downloadUrl: string;
}

export interface NativeUpdateNotification {
    updateAppVersion: boolean;   // Always true
    appVersion: string;
}

export interface LocalPackage extends Package {
    localPath: string;
}

export interface Callback<T> { (error: Error, parameter: T): void; }

export interface Configuration {
    serverUrl: string;
    deploymentKey: string;
    ignoreAppVersion?: boolean
}

export class AcquisitionStatus {
    public static DeploymentSucceeded = "DeploymentSucceeded";
    public static DeploymentFailed = "DeploymentFailed";
}

export class AcquisitionManager {
    private _deploymentKey: string;
    private _httpRequester: Http.Requester;
    private _ignoreAppVersion: boolean;
    private _serverUrl: string;

    constructor(httpRequester: Http.Requester, configuration: Configuration) {
        this._httpRequester = httpRequester;

        this._serverUrl = configuration.serverUrl;
        if (this._serverUrl.slice(-1) !== "/") {
            this._serverUrl += "/";
        }

        this._deploymentKey = configuration.deploymentKey;
        this._ignoreAppVersion = configuration.ignoreAppVersion;
    }

    public queryUpdateWithCurrentPackage(currentPackage: Package, callback?: Callback<RemotePackage | NativeUpdateNotification>): void {
        if (!currentPackage || !currentPackage.appVersion) {
            throw new Error("Calling common acquisition SDK with incorrect package");  // Unexpected; indicates error in our implementation
        }

        var updateRequest: UpdateCheckRequest = {
            deploymentKey: this._deploymentKey,
            appVersion: currentPackage.appVersion,
            packageHash: currentPackage.packageHash,
            isCompanion: this._ignoreAppVersion
        };

        var requestUrl: string = this._serverUrl + "updateCheck?" + queryStringify(updateRequest);

        this._httpRequester.request(Http.Verb.GET, requestUrl, (error: Error, response: Http.Response) => {
            if (error) {
                callback(error, /*remotePackage=*/ null);
                return;
            }

            if (response.statusCode !== 200) {
                callback(new Error(response.statusCode + ": " + response.body), /*remotePackage=*/ null);
                return;
            }

            try {
                var responseObject = JSON.parse(response.body);
                var updateInfo: UpdateCheckResponse = responseObject.updateInfo;
            } catch (error) {
                callback(error, /*remotePackage=*/ null);
                return;
            }

            if (!updateInfo) {
                callback(error, /*remotePackage=*/ null);
                return;
            } else if (updateInfo.updateAppVersion) {
                callback(/*error=*/ null, { updateAppVersion: true, appVersion: updateInfo.appVersion });
                return;
            } else if (!updateInfo.isAvailable) {
                callback(/*error=*/ null, /*remotePackage=*/ null);
                return;
            }

            var remotePackage: RemotePackage = {
                deploymentKey: this._deploymentKey,
                description: updateInfo.description,
                label: updateInfo.label,
                appVersion: updateInfo.appVersion,
                isMandatory: updateInfo.isMandatory,
                packageHash: updateInfo.packageHash,
                packageSize: updateInfo.packageSize,
                downloadUrl: updateInfo.downloadURL
            };

            callback(/*error=*/ null, remotePackage);
        });
    }

    public reportStatus(status: string, message?: string, callback?: Callback<void>): void {
        var url: string = this._serverUrl + "reportStatus";
        var body: string;

        switch (status) {
            case AcquisitionStatus.DeploymentSucceeded:
            case AcquisitionStatus.DeploymentFailed:
                url += "/deploy";
                body = JSON.stringify({ deploymentKey: this._deploymentKey, status: status, message: message });
                break;

            default:
                if (callback) {
                    callback(new Error("Unrecognized status."), /*not used*/ null);
                }
                return;
        }

        this._httpRequester.request(Http.Verb.POST, url, body, (error: Error, response: Http.Response): void => {
            if (callback) {
                if (error) {
                    callback(error, /*not used*/ null);
                    return;
                }

                if (response.statusCode !== 200) {
                    callback(new Error(response.statusCode + ": " + response.body), /*not used*/ null);
                    return;
                }

                callback(/*error*/ null, /*not used*/ null);
            }
        });
    }
}

function queryStringify(object: Object): string {
    var queryString = "";
    var isFirst: boolean = true;

    for (var property in object) {
        if (object.hasOwnProperty(property)) {
            var value: string = (<any>object)[property];
            if (!isFirst) {
                queryString += "&";
            }

            queryString += encodeURIComponent(property) + "=";
            if (value !== null && typeof value !== "undefined") {
                queryString += encodeURIComponent(value);
            }

            isFirst = false;
        }
    }

    return queryString;
}
