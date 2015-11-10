import * as assert from "assert";
import * as sinon from "sinon";
import Q = require("q");
import Promise = Q.Promise;
import * as codePush from "code-push";
import * as cli from "../definitions/cli";
import * as cmdexec from "../script/command-executor";
import * as os from "os";

function assertJsonDescribesObject(json: string, object: Object): void {
    // Make sure JSON is indented correctly
    assert.equal(json, JSON.stringify(object, /*replacer=*/ null, /*spacing=*/ 2)); 
}

export class SdkStub {
    public addAccessKey(machine: string, description?: string): Promise<codePush.AccessKey> {
        return Q(<codePush.AccessKey>{
            id: "accessKeyId",
            name: "key123",
            createdTime: new Date().getTime(),
            createdBy: os.hostname(),
            description: description
        });
    }

    public addApp(name: string, description?: string): Promise<codePush.App> {
        return Q(<codePush.App>{
            description: description,
            id: "appId",
            name: name
        });
    }

    public addDeployment(appId: string, name: string, description?: string): Promise<codePush.Deployment> {
        return Q(<codePush.Deployment>{
            description: description,
            id: "deploymentId",
            name: name
        });
    }

    public getAccessKeys(): Promise<codePush.AccessKey[]> {
        return Q([<codePush.AccessKey>{
            id: "7",
            name: "8",
            createdTime: 0,
            createdBy: os.hostname(),
            description: "Test Description"
        }]);
    }

    public getApps(): Promise<codePush.App[]> {
        return Q([<codePush.App>{
            id: "1",
            name: "a"
        }, <codePush.App>{
            id: "2",
            name: "b"
        }]);
    }

    public getDeploymentKeys(appId: string, deploymentId: string): Promise<codePush.DeploymentKey[]> {
        return Q([<codePush.DeploymentKey>{
            id: "5",
            key: "6",
            name: "Primary"
        }]);
    }

    public getDeployments(appId: string): Promise<codePush.Deployment[]> {
        return Q([<codePush.Deployment>{
            id: "3",
            name: "Production"
        }, <codePush.Deployment>{
            id: "4",
            name: "Staging",
            description: "cde",
            package: {
                appVersion: "1.0.0",
                description: "fgh",
                label: "ghi",
                packageHash: "jkl",
                isMandatory: true,
                size: 10,
                blobUrl: "http://mno.pqr",
                uploadTime: +1000
            }
        }]);
    }

    public getPackageHistory(appId: string, deploymentId: string): Promise<codePush.Package[]> {
        return Q([
            <codePush.Package>{
                appVersion: "1.0.0",
                isMandatory: false,
                packageHash: "463acc7d06adc9c46233481d87d9e8264b3e9ffe60fe98d721e6974209dc71a0",
                blobUrl: "https://codepushstaging.blob.core.windows.net/storagev2/416cfQ5Ge",
                uploadTime: 1447113596270,
                label: "v1"
            },
            <codePush.Package>{
                description: "New update - this update does a whole bunch of things, including testing linewrapping",
                appVersion: "1.0.1",
                isMandatory: false,
                packageHash: "463acc7d06adc9c46233481d87d9e8264b3e9ffe60fe98d721e6974209dc71a0",
                blobUrl: "https://codepushstaging.blob.core.windows.net/storagev2/4JpoBE5Gg",
                uploadTime: 1447118476669,
                label: "v2"
            }
        ]);
    }

    public removeAccessKey(accessKeyId: string): Promise<void> {
        return Q(<void>null);
    }

    public removeApp(appId: string): Promise<void> {
        return Q(<void>null);
    }

    public removeDeployment(appId: string, deployment: string): Promise<void> {
        return Q(<void>null);
    }

    public updateApp(app: codePush.App): Promise<void> {
        return Q(<void>null);
    }

    public updateDeployment(appId: string, deployment: codePush.Deployment): Promise<void> {
        return Q(<void>null);
    }
}

describe("CLI", () => {
    var log: Sinon.SinonStub;
    var sandbox: Sinon.SinonSandbox;
    var wasConfirmed = true;

    beforeEach((): void => {
        wasConfirmed = true;

        sandbox = sinon.sandbox.create();

        sandbox.stub(cmdexec, "confirm", (): Promise<boolean> => Q(wasConfirmed));
        log = sandbox.stub(cmdexec, "log", (message: string): void => { });
        sandbox.stub(cmdexec, "loginWithAccessToken", (): Promise<void> => Q(<void>null));

        cmdexec.sdk = <any>new SdkStub();
    });

    afterEach((): void => {
        sandbox.restore();
    });

    it("accessKeyAdd creates access key with description", (done: MochaDone): void => {
        var command: cli.IAccessKeyAddCommand = {
            type: cli.CommandType.accessKeyAdd,
            description: "Test description"
        };

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(log);
                assert.equal(log.args[0].length, 1);

                var actual: string = log.args[0][0];
                var expected = "Created a new access key \"Test description\": key123";

                assert.equal(actual, expected);
                done();
            });
    });

    it("accessKeyList lists access key names and ID's", (done: MochaDone): void => {
        var command: cli.ICommand = {
            type: cli.CommandType.accessKeyList,
            format: "json"
        };

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(log);
                assert.equal(log.args[0].length, 1);

                var actual: string = log.args[0][0];
                var expected = [
                    {
                        id: "7",
                        name: "8",
                        createdTime: 0,
                        createdBy: os.hostname(),
                        description: "Test Description"
                    }
                ];

                assertJsonDescribesObject(actual, expected);
                done();
            });
    });

    it("accessKeyRemove removes access key", (done: MochaDone): void => {
        var command: cli.IAccessKeyRemoveCommand = {
            type: cli.CommandType.accessKeyRemove,
            accessKeyName: "8"
        };

        var removeAccessKey: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "removeAccessKey");

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(removeAccessKey);
                sinon.assert.calledWithExactly(removeAccessKey, "7");
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, "Removed access key \"8\".");

                done();
            });
    });

    it("accessKeyRemove does not remove access key if cancelled", (done: MochaDone): void => {
        var command: cli.IAccessKeyRemoveCommand = {
            type: cli.CommandType.accessKeyRemove,
            accessKeyName: "8"
        };

        var removeAccessKey: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "removeAccessKey");

        wasConfirmed = false;

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.notCalled(removeAccessKey);
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, "Remove cancelled.");

                done();
            });
    });

    it("appAdd reports new app name and ID", (done: MochaDone): void => {
        var command: cli.IAppAddCommand = {
            type: cli.CommandType.appAdd,
            appName: "a"
        };
        
        var deploymentListCommand: cli.IDeploymentListCommand = {
            type: cli.CommandType.deploymentList,
            appName: "a",
            format: "table"
        };

        var addApp: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "addApp");
        var deploymentList: Sinon.SinonSpy = sandbox.spy(cmdexec, "deploymentList");

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(addApp);
                sinon.assert.calledTwice(log);
                sinon.assert.calledWithExactly(log, "Successfully added app \"a\".\nCreated two default deployments:");
                sinon.assert.calledOnce(deploymentList);
                sinon.assert.calledWithExactly(deploymentList, deploymentListCommand);
                done();
            });
    });

    it("appList lists app names and ID's", (done: MochaDone): void => {
        var command: cli.ICommand = {
            type: cli.CommandType.appList,
            format: "json"
        };

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(log);
                assert.equal(log.args[0].length, 1);

                var actual: string = log.args[0][0];
                var expected = [
                    { name: "a", id: "1" },
                    { name: "b", id: "2" }
                ];

                assertJsonDescribesObject(actual, expected);
                done();
            });
    });

    it("appRemove removes app", (done: MochaDone): void => {
        var command: cli.IAppRemoveCommand = {
            type: cli.CommandType.appRemove,
            appName: "a"
        };

        var removeApp: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "removeApp");

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(removeApp);
                sinon.assert.calledWithExactly(removeApp, "1");
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, "Removed app \"a\".");

                done();
            });
    });

    it("appRemove does not remove app if cancelled", (done: MochaDone): void => {
        var command: cli.IAppRemoveCommand = {
            type: cli.CommandType.appRemove,
            appName: "a"
        };

        var removeApp: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "removeApp");

        wasConfirmed = false;

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.notCalled(removeApp);
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, "Remove cancelled.");

                done();
            });
    });

    it("appRename renames app", (done: MochaDone): void => {
        var command: cli.IAppRenameCommand = {
            type: cli.CommandType.appRename,
            currentAppName: "a",
            newAppName: "c"
        };

        var updateApp: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "updateApp");

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(updateApp);
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, "Renamed app \"a\" to \"c\".");

                done();
            });
    });

    it("deploymentAdd reports new app name and ID", (done: MochaDone): void => {
        var command: cli.IDeploymentAddCommand = {
            type: cli.CommandType.deploymentAdd,
            appName: "a",
            deploymentName: "b"
        };

        var addDeployment: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "addDeployment");
        var getDeploymentKeys: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "getDeploymentKeys");

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(addDeployment);
                sinon.assert.calledOnce(getDeploymentKeys);
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, "Added deployment \"b\" with key \"6\" to app \"a\".");
                done();
            });
    });

    it("deploymentList lists deployment names, deployment keys, and package information", (done: MochaDone): void => {
        var command: cli.IDeploymentListCommand = {
            type: cli.CommandType.deploymentList,
            appName: "a",
            format: "json"
        };

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(log);
                assert.equal(log.args[0].length, 1);

                var actual: string = log.args[0][0];
                var expected = [
                    {
                        name: "Production",
                        deploymentKey: "6"
                    },
                    {
                        name: "Staging",
                        deploymentKey: "6",
                        package: {
                            appVersion: "1.0.0",
                            isMandatory: true,
                            packageHash: "jkl",
                            uploadTime: "1970-01-01T00:00:01.000Z",
                            description: "fgh"
                        }
                    }
                ];

                assertJsonDescribesObject(actual, expected);
                done();
            });
    });

    it("deploymentRemove removes deployment", (done: MochaDone): void => {
        var command: cli.IDeploymentRemoveCommand = {
            type: cli.CommandType.deploymentRemove,
            appName: "a",
            deploymentName: "Staging"
        };

        var removeDeployment: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "removeDeployment");

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(removeDeployment);
                sinon.assert.calledWithExactly(removeDeployment, "1", "4");
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, "Removed deployment \"Staging\" from app \"a\".");

                done();
            });
    });

    it("deploymentRemove does not remove deployment if cancelled", (done: MochaDone): void => {
        var command: cli.IDeploymentRemoveCommand = {
            type: cli.CommandType.deploymentRemove,
            appName: "a",
            deploymentName: "Staging"
        };

        var removeDeployment: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "removeDeployment");

        wasConfirmed = false;

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.notCalled(removeDeployment);
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, "Remove cancelled.");

                done();
            });
    });

    it("deploymentRename renames deployment", (done: MochaDone): void => {
        var command: cli.IDeploymentRenameCommand = {
            type: cli.CommandType.deploymentRename,
            appName: "a",
            currentDeploymentName: "Staging",
            newDeploymentName: "c"
        };

        var updateDeployment: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "updateDeployment");

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(updateDeployment);
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, "Renamed deployment \"Staging\" to \"c\" for app \"a\".");

                done();
            });
    });

    it("deploymentHistory lists package history information", (done: MochaDone): void => {
        var command: cli.IDeploymentHistoryCommand = {
            type: cli.CommandType.deploymentHistory,
            appName: "a",
            deploymentName: "Staging",
            format: "json"
        };

        var getPackageHistory: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "getPackageHistory");

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(getPackageHistory);
                sinon.assert.calledOnce(log);
                assert.equal(log.args[0].length, 1);

                var actual: string = log.args[0][0];
                var expected: codePush.Package[] = [
                    <codePush.Package>{
                        description: "New update - this update does a whole bunch of things, including testing linewrapping",
                        appVersion: "1.0.1",
                        isMandatory: false,
                        packageHash: "463acc7d06adc9c46233481d87d9e8264b3e9ffe60fe98d721e6974209dc71a0",
                        blobUrl: "https://codepushstaging.blob.core.windows.net/storagev2/4JpoBE5Gg",
                        uploadTime: 1447118476669,
                        label: "v2"
                    },
                    <codePush.Package>{
                        appVersion: "1.0.0",
                        isMandatory: false,
                        packageHash: "463acc7d06adc9c46233481d87d9e8264b3e9ffe60fe98d721e6974209dc71a0",
                        blobUrl: "https://codepushstaging.blob.core.windows.net/storagev2/416cfQ5Ge",
                        uploadTime: 1447113596270,
                        label: "v1"
                    }
                ];

                assertJsonDescribesObject(actual, expected);
                done();
            });
    });
});