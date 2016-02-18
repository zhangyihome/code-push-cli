import * as assert from "assert";
import * as sinon from "sinon";
import Q = require("q");
import * as path from "path";
import Promise = Q.Promise;
import * as codePush from "code-push";
import * as cli from "../definitions/cli";
import * as cmdexec from "../script/command-executor";
import * as os from "os";

function assertJsonDescribesObject(json: string, object: Object): void {
    // Make sure JSON is indented correctly
    assert.equal(json, JSON.stringify(object, /*replacer=*/ null, /*spacing=*/ 2));
}

function ensureInTestAppDirectory(): void {
    if (!~__dirname.indexOf("/resources/TestApp")) {
        process.chdir(__dirname + "/resources/TestApp");
    }
}

export class SdkStub {
    public getAccountInfo(): Promise<codePush.Account> {
        return Q(<codePush.Account>{
            email: "a@a.com"
        });
    }

    public addAccessKey(machine: string, description?: string): Promise<codePush.AccessKey> {
        return Q(<codePush.AccessKey>{
            name: "key123",
            createdTime: new Date().getTime(),
            createdBy: os.hostname(),
            description: description
        });
    }

    public addApp(name: string): Promise<codePush.App> {
        return Q(<codePush.App>{
            name: name
        });
    }

    public addCollaborator(name: string, email: string): Promise<void> {
        return Q(<void>null);
    }

    public addDeployment(appId: string, name: string): Promise<codePush.Deployment> {
        return Q(<codePush.Deployment>{
            name: name,
            key: "6"
        });
    }

    public getAccessKeys(): Promise<codePush.AccessKey[]> {
        return Q([<codePush.AccessKey>{
            name: "8",
            createdTime: 0,
            createdBy: os.hostname(),
            description: "Test Description"
        }]);
    }

    public getApps(): Promise<codePush.App[]> {
        return Q([<codePush.App>{
            name: "a",
            collaborators: { "a@a.com": { permission: "Owner", isCurrentAccount: true } }
        }, <codePush.App>{
            name: "b",
            collaborators: { "a@a.com": { permission: "Owner", isCurrentAccount: true } }
        }]);
    }

    public getDeployments(appId: string): Promise<codePush.Deployment[]> {
        return Q([<codePush.Deployment>{
            name: "Production",
            key: "6"
        }, <codePush.Deployment>{
            name: "Staging",
            key: "6",
            package: {
                appVersion: "1.0.0",
                description: "fgh",
                label: "v2",
                packageHash: "jkl",
                isMandatory: true,
                size: 10,
                blobUrl: "http://mno.pqr",
                uploadTime: 1000
            }
        }]);
    }

    public getPackageHistory(appId: string, deploymentId: string): Promise<codePush.Package[]> {
        return Q([
            <codePush.Package>{
                description: null,
                appVersion: "1.0.0",
                isMandatory: false,
                packageHash: "463acc7d06adc9c46233481d87d9e8264b3e9ffe60fe98d721e6974209dc71a0",
                blobUrl: "https://fakeblobstorage.net/storagev2/blobid1",
                uploadTime: 1447113596270,
                size: 1,
                label: "v1"
            },
            <codePush.Package>{
                description: "New update - this update does a whole bunch of things, including testing linewrapping",
                appVersion: "1.0.1",
                isMandatory: false,
                packageHash: "463acc7d06adc9c46233481d87d9e8264b3e9ffe60fe98d721e6974209dc71a0",
                blobUrl: "https://fakeblobstorage.net/storagev2/blobid2",
                uploadTime: 1447118476669,
                size: 2,
                label: "v2"
            }
        ]);
    }

    public getDeploymentMetrics(appId: string, deploymentId: string): Promise<any> {
        return Q({
            "1.0.0": {
                active: 123
            },
            "v1": {
                active: 789,
                downloaded: 456,
                failed: 654,
                installed: 987
            },
            "v2": {
                active: 123,
                downloaded: 321,
                failed: 789,
                installed: 456
            }
        });
    }

    public getCollaboratorsList(app: codePush.App): Promise<any> {
        return Q({
            "a@a.com": {
                permission: "Owner",
                isCurrentAccount: true
            },
            "b@b.com": {
                permission: "Collaborator",
                isCurrentAccount: false
            }
        });
    }

    public release(appId: string, deploymentId: string): Promise<string> {
        return Q("Successfully released");
    }

    public removeAccessKey(accessKeyId: string): Promise<void> {
        return Q(<void>null);
    }

    public removeApp(appId: string): Promise<void> {
        return Q(<void>null);
    }

    public removeCollaborator(name: string, email: string): Promise<void> {
        return Q(<void>null);
    }

    public removeDeployment(appId: string, deployment: string): Promise<void> {
        return Q(<void>null);
    }

    public updateApp(app: codePush.App): Promise<void> {
        return Q(<void>null);
    }

    public transferApp(app: codePush.App): Promise<void> {
        return Q(<void>null);
    }

    public updateDeployment(appId: string, deployment: codePush.Deployment): Promise<void> {
        return Q(<void>null);
    }
}

describe("CLI", () => {
    var log: Sinon.SinonStub;
    var sandbox: Sinon.SinonSandbox;
    var spawn: Sinon.SinonStub;
    var wasConfirmed = true;
    const RELEASE_FAILED_ERROR_MESSAGE: string = "It is unnecessary to package releases in a .zip or binary file. Please specify the direct path to the update content's directory (e.g. /platforms/ios/www) or file (e.g. main.jsbundle).";

    beforeEach((): void => {
        wasConfirmed = true;

        sandbox = sinon.sandbox.create();

        sandbox.stub(cmdexec, "confirm", (): Promise<boolean> => Q(wasConfirmed));
        sandbox.stub(cmdexec, "createEmptyTempReleaseFolder", (): Promise<void> => Q(<void>null));
        log = sandbox.stub(cmdexec, "log", (message: string): void => { });
        spawn = sandbox.stub(cmdexec, "spawn", (command: string, commandArgs: string[]): any => {
            return {
                stdout: { on: () => { } },
                stderr: { on: () => { } },
                on: (event: string, callback: () => void) => {
                    callback();
                }
            };
        });
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
                var expected = "Successfully created a new access key \"Test description\": key123";

                assert.equal(actual, expected);
                done();
            });
    });

    it("accessKeyList lists access key names and ID's", (done: MochaDone): void => {
        var command: cli.IAccessKeyListCommand = {
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
            accessKey: "8"
        };

        var removeAccessKey: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "removeAccessKey");

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(removeAccessKey);
                sinon.assert.calledWithExactly(removeAccessKey, "8");
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, "Successfully removed the \"8\" access key.");

                done();
            });
    });

    it("accessKeyRemove does not remove access key if cancelled", (done: MochaDone): void => {
        var command: cli.IAccessKeyRemoveCommand = {
            type: cli.CommandType.accessKeyRemove,
            accessKey: "8"
        };

        var removeAccessKey: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "removeAccessKey");

        wasConfirmed = false;

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.notCalled(removeAccessKey);
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, "Access key removal cancelled.");

                done();
            });
    });

    it("appAdd reports new app name and ID", (done: MochaDone): void => {
        var command: cli.IAppAddCommand = {
            type: cli.CommandType.appAdd,
            appName: "a"
        };

        var addApp: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "addApp");
        var deploymentList: Sinon.SinonSpy = sandbox.spy(cmdexec, "deploymentList");

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(addApp);
                sinon.assert.calledTwice(log);
                sinon.assert.calledWithExactly(log, "Successfully added the \"a\" app, along with the following default deployments:");
                sinon.assert.calledOnce(deploymentList);
                done();
            });
    });

    it("appList lists app names and ID's", (done: MochaDone): void => {
        var command: cli.IAppListCommand = {
            type: cli.CommandType.appList,
            format: "json"
        };

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(log);
                assert.equal(log.args[0].length, 1);

                var actual: string = log.args[0][0];
                var expected = [
                    { name: "a", deployments: ["Production", "Staging"]},
                    { name: "b", deployments: ["Production", "Staging"]}
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
                sinon.assert.calledWithExactly(removeApp, "a");
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, "Successfully removed the \"a\" app.");

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
                sinon.assert.calledWithExactly(log, "App removal cancelled.");

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
                sinon.assert.calledWithExactly(log, "Successfully renamed the \"a\" app to \"c\".");

                done();
            });
    });

    it("appTransfer transfers app", (done: MochaDone): void => {
        var command: cli.IAppTransferCommand = {
            type: cli.CommandType.appTransfer,
            appName: "a",
            email: "b@b.com"
        };

        var transferApp: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "transferApp");

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(transferApp);
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, "Successfully transferred the ownership of app \"a\" to the account with email \"b@b.com\".");

                done();
            });
    });

    it("collaboratorAdd adds collaborator", (done: MochaDone): void => {
        var command: cli.ICollaboratorAddCommand = {
            type: cli.CommandType.collaboratorAdd,
            appName: "a",
            email: "b@b.com"
        };

        var addCollaborator: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "addCollaborator");

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(addCollaborator);
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, "Successfully added \"b@b.com\" as a collaborator to the app \"a\".");

                done();
            });
    });

    it("collaboratorList lists collaborators email and properties", (done: MochaDone): void => {
        var command: cli.ICollaboratorListCommand = {
            type: cli.CommandType.collaboratorList,
            appName: "a",
            format: "json"
        };

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(log);
                assert.equal(log.args[0].length, 1);

                var actual: string = log.args[0][0];
                var expected = {
                    "collaborators":
                        {
                            "a@a.com": { permission: "Owner", isCurrentAccount: true },
                            "b@b.com": { permission: "Collaborator", isCurrentAccount: false }
                        }
                };

                assertJsonDescribesObject(actual, expected);
                done();
            });
    });

    it("collaboratorRemove removes collaborator", (done: MochaDone): void => {
        var command: cli.ICollaboratorRemoveCommand = {
            type: cli.CommandType.collaboratorRemove,
            appName: "a",
            email: "b@b.com"
        };

        var removeCollaborator: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "removeCollaborator");

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(removeCollaborator);
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, "Successfully removed \"b@b.com\" as a collaborator from the app \"a\".");

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

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(addDeployment);
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, "Successfully added the \"b\" deployment with key \"6\" to the \"a\" app.");
                done();
            });
    });

    it("deploymentList lists deployment names, deployment keys, and package information", (done: MochaDone): void => {
        var command: cli.IDeploymentListCommand = {
            type: cli.CommandType.deploymentList,
            appName: "a",
            format: "json",
            displayKeys: true
        };

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(log);
                assert.equal(log.args[0].length, 1);

                var actual: string = log.args[0][0];
                var expected = [
                    {
                        name: "Production",
                        key: "6"
                    },
                    {
                        name: "Staging",
                        key: "6",
                        package: {
                            appVersion: "1.0.0",
                            description: "fgh",
                            label: "v2",
                            packageHash: "jkl",
                            isMandatory: true,
                            size: 10,
                            blobUrl: "http://mno.pqr",
                            uploadTime: 1000,
                            metrics: {
                                active: 123,
                                downloaded: 321,
                                failed: 789,
                                installed: 456,
                                totalActive: 1035
                            }
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
                sinon.assert.calledWithExactly(removeDeployment, "a", "Staging");
                sinon.assert.calledOnce(log);
                sinon.assert.calledWithExactly(log, "Successfully removed the \"Staging\" deployment from the \"a\" app.");

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
                sinon.assert.calledWithExactly(log, "Deployment removal cancelled.");

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
                sinon.assert.calledWithExactly(log, "Successfully renamed the \"Staging\" deployment to \"c\" for the \"a\" app.");

                done();
            });
    });

    it("deploymentHistory lists package history information", (done: MochaDone): void => {
        var command: cli.IDeploymentHistoryCommand = {
            type: cli.CommandType.deploymentHistory,
            appName: "a",
            deploymentName: "Staging",
            format: "json",
            displayAuthor: false
        };

        var getPackageHistory: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "getPackageHistory");

        cmdexec.execute(command)
            .done((): void => {
                sinon.assert.calledOnce(getPackageHistory);
                sinon.assert.calledOnce(log);
                assert.equal(log.args[0].length, 1);

                var actual: string = log.args[0][0];
                var expected: codePush.Package[] = [
                    {
                        description: null,
                        appVersion: "1.0.0",
                        isMandatory: false,
                        packageHash: "463acc7d06adc9c46233481d87d9e8264b3e9ffe60fe98d721e6974209dc71a0",
                        blobUrl: "https://fakeblobstorage.net/storagev2/blobid1",
                        uploadTime: 1447113596270,
                        size: 1,
                        label: "v1",
                        metrics: {
                            active: 789,
                            downloaded: 456,
                            failed: 654,
                            installed: 987,
                            totalActive: 1035
                        }
                    },
                    {
                        description: "New update - this update does a whole bunch of things, including testing linewrapping",
                        appVersion: "1.0.1",
                        isMandatory: false,
                        packageHash: "463acc7d06adc9c46233481d87d9e8264b3e9ffe60fe98d721e6974209dc71a0",
                        blobUrl: "https://fakeblobstorage.net/storagev2/blobid2",
                        uploadTime: 1447118476669,
                        size: 2,
                        label: "v2",
                        metrics: {
                            active: 123,
                            downloaded: 321,
                            failed: 789,
                            installed: 456,
                            totalActive: 1035
                        }
                    }
                ];

                assertJsonDescribesObject(actual, expected);
                done();
            });
    });

    it("release doesn't allow releasing .zip file", (done: MochaDone): void => {
        var command: cli.IReleaseCommand = {
            type: cli.CommandType.release,
            appName: "a",
            deploymentName: "Staging",
            description: "test releasing zip file",
            mandatory: false,
            appStoreVersion: "1.0.0",
            package: "/fake/path/test/file.zip"
        };

        releaseHelperFunction(command, done);
    });

    it("release doesn't allow releasing .ipa file", (done: MochaDone): void => {
        var command: cli.IReleaseCommand = {
            type: cli.CommandType.release,
            appName: "a",
            deploymentName: "Staging",
            description: "test releasing ipa file",
            mandatory: false,
            appStoreVersion: "1.0.0",
            package: "/fake/path/test/file.ipa"
        };

        releaseHelperFunction(command, done);
    });

    it("release doesn't allow releasing .apk file", (done: MochaDone): void => {
        var command: cli.IReleaseCommand = {
            type: cli.CommandType.release,
            appName: "a",
            deploymentName: "Staging",
            description: "test releasing apk file",
            mandatory: false,
            appStoreVersion: "1.0.0",
            package: "/fake/path/test/file.apk"
        };

        releaseHelperFunction(command, done);
    });

    it("release-react fails if CWD does not contain package.json", (done: MochaDone): void => {
        var command: cli.IReleaseReactCommand = {
            type: cli.CommandType.releaseReact,
            appName: "a",
            deploymentName: "Staging",
            description: "Test invalid folder",
            mandatory: false,
            platform: "ios"
        };

        var release: Sinon.SinonSpy = sandbox.spy(cmdexec, "release");
        var releaseReact: Sinon.SinonSpy = sandbox.spy(cmdexec, "releaseReact");

        cmdexec.execute(command)
            .then(() => {
                done(new Error("Did not throw error."));
            })
            .catch((err) => {
                assert.equal(err.message, "Unable to find or read \"package.json\" in the CWD. The \"release-react\" command must be executed in a React Native project folder.");
                sinon.assert.notCalled(release);
                sinon.assert.threw(releaseReact, "Error");
                sinon.assert.notCalled(spawn);
                done();
            })
            .done();
    });

    it("release-react fails if entryFile does not exist", (done: MochaDone): void => {
        var command: cli.IReleaseReactCommand = {
            type: cli.CommandType.releaseReact,
            appName: "a",
            deploymentName: "Staging",
            description: "Test invalid entryFile",
            entryFile: "doesntexist.js",
            mandatory: false,
            platform: "ios"
        };

        ensureInTestAppDirectory();

        var release: Sinon.SinonSpy = sandbox.spy(cmdexec, "release");
        var releaseReact: Sinon.SinonSpy = sandbox.spy(cmdexec, "releaseReact");

        cmdexec.execute(command)
            .then(() => {
                done(new Error("Did not throw error."));
            })
            .catch((err) => {
                assert.equal(err.message, "Entry file \"doesntexist.js\" does not exist.");
                sinon.assert.notCalled(release);
                sinon.assert.threw(releaseReact, "Error");
                sinon.assert.notCalled(spawn);
                done();
            })
            .done();
    });

    it("release-react fails if platform is invalid", (done: MochaDone): void => {
        var command: cli.IReleaseReactCommand = {
            type: cli.CommandType.releaseReact,
            appName: "a",
            deploymentName: "Staging",
            description: "Test invalid platform",
            mandatory: false,
            platform: "blackberry",
        };

        ensureInTestAppDirectory();

        var release: Sinon.SinonSpy = sandbox.spy(cmdexec, "release");
        var releaseReact: Sinon.SinonSpy = sandbox.spy(cmdexec, "releaseReact");

        cmdexec.execute(command)
            .then(() => {
                done(new Error("Did not throw error."));
            })
            .catch((err) => {
                assert.equal(err.message, "Platform must be either \"ios\" or \"android\".");
                sinon.assert.notCalled(release);
                sinon.assert.threw(releaseReact, "Error");
                sinon.assert.notCalled(spawn);
                done();
            })
            .done();
    });

    it("release-react defaults entry file to index.{platform}.js if not provided", (done: MochaDone): void => {
        var command: cli.IReleaseReactCommand = {
            type: cli.CommandType.releaseReact,
            appName: "a",
            deploymentName: "Staging",
            description: "Test default entry file",
            mandatory: false,
            platform: "ios"
        };

        ensureInTestAppDirectory();

        var release: Sinon.SinonSpy = sandbox.stub(cmdexec, "release", () => { return Q(<void>null) });

        cmdexec.execute(command)
            .then(() => {
                var releaseCommand: cli.IReleaseCommand = <any>command;
                releaseCommand.package = path.join(os.tmpdir(), "CodePush");
                releaseCommand.appStoreVersion = "1.2.3";

                sinon.assert.calledOnce(spawn);
                var spawnCommand: string = spawn.args[0][0];
                var spawnCommandArgs: string = spawn.args[0][1].join(" ");
                assert.equal(spawnCommand, "node");
                assert.equal(
                    spawnCommandArgs,
                    `${path.join("node_modules", "react-native", "local-cli", "cli.js")} bundle --assets-dest ${path.join(os.tmpdir(), "CodePush")} --bundle-output ${path.join(os.tmpdir(), "CodePush", "main.jsbundle")} --dev false --entry-file index.ios.js --platform ios`
                );
                assertJsonDescribesObject(JSON.stringify(release.args[0][0], /*replacer=*/ null, /*spacing=*/ 2), releaseCommand);
                done();
            })
            .done();
    });

    it("release-react generates sourcemaps", (done: MochaDone): void => {
        var command: cli.IReleaseReactCommand = {
            type: cli.CommandType.releaseReact,
            appName: "a",
            deploymentName: "Staging",
            description: "Test generates sourcemaps",
            mandatory: false,
            platform: "android",
            sourcemapOutput: "index.android.js.map"
        };

        ensureInTestAppDirectory();

        var release: Sinon.SinonSpy = sandbox.stub(cmdexec, "release", () => { return Q(<void>null) });

        cmdexec.execute(command)
            .then(() => {
                var releaseCommand: cli.IReleaseCommand = <any>command;
                releaseCommand.package = path.join(os.tmpdir(), "CodePush");
                releaseCommand.appStoreVersion = "1.2.3";

                sinon.assert.calledOnce(spawn);
                var spawnCommand: string = spawn.args[0][0];
                var spawnCommandArgs: string = spawn.args[0][1].join(" ");
                assert.equal(spawnCommand, "node");
                assert.equal(
                    spawnCommandArgs,
                    `${path.join("node_modules", "react-native", "local-cli", "cli.js")} bundle --assets-dest ${path.join(os.tmpdir(), "CodePush")} --bundle-output ${path.join(os.tmpdir(), "CodePush", "main.jsbundle")} --dev false --entry-file index.android.js --platform android --sourcemap-output index.android.js.map`
                );
                assertJsonDescribesObject(JSON.stringify(release.args[0][0], /*replacer=*/ null, /*spacing=*/ 2), releaseCommand);
                done();
            })
            .done();
    });

    function releaseHelperFunction(command: cli.IReleaseCommand, done: MochaDone): void {
        var release: Sinon.SinonSpy = sandbox.spy(cmdexec.sdk, "release");
        cmdexec.execute(command)
            .done((): void => {
                throw "Error Expected";
            }, (error: any): void => {
                assert (!!error);
                assert.equal(error.message, RELEASE_FAILED_ERROR_MESSAGE);
                done();
            });
    }
});