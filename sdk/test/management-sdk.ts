/// <reference path="../definitions/harness.d.ts" />

import * as assert from "assert";
import * as Q from "q";

import {AccountManager} from "../script/management/account-manager";

var request = require("superagent");

var manager: AccountManager;
describe("Management SDK", () => {

    beforeEach(() => {
        manager = new AccountManager(/*serverUrl=*/ "http://localhost", /*userAgent=*/ "unit-test/1.0.0");
    });

    after(() => {
        // Prevent an exception that occurs due to how superagent-mock overwrites methods
        request.Request.prototype._callback = function () { };
    });

    it("methods reject the promise with status code info when an error occurs", (done: MochaDone) => {
        mockReturn("Text", 404);

        var methodsWithErrorHandling: any[] = [
            manager.addApp.bind(manager, "appName"),
            manager.getApp.bind(manager, "appId"),
            manager.updateApp.bind(manager, {}),
            manager.removeApp.bind(manager, "appId"),

            manager.addDeployment.bind(manager, "appId", "name"),
            manager.getDeployment.bind(manager, "appId", "deploymentId"),
            manager.getDeployments.bind(manager, "appId"),
            manager.updateDeployment.bind(manager, "appId", { id: "deploymentToChange" }),
            manager.removeDeployment.bind(manager, "appId", { id: "deploymentToChange" }),

            manager.getDeploymentKeys.bind(manager, "appId", "deploymentId"),

            manager.getPackage.bind(manager, ""),
        ];

        var result = Q<void>(null);
        methodsWithErrorHandling.forEach(function (f) {
            result = result.then(() => {
                return testErrors(f);
            });
        });

        result.done(() => {
            done();
        });

        // Test that the proper error code and text is passed through on a server error
        function testErrors(method: any): Q.Promise<void> {
            return Q.Promise<void>((resolve: any, reject: any, notify: any) => {
                method().done(() => {
                    assert.fail("Should have thrown an error");
                    reject();
                }, (error: any) => {
                        assert.equal(error.message, "Text");
                        resolve();
                    });
            });
        }
    });

    it("isAuthenticated handles successful auth", (done: MochaDone) => {
        mockReturn(JSON.stringify({ authenticated: true }), 200, {});
        manager.isAuthenticated().done((authenticated: boolean) => {
            assert(authenticated, "Should be authenticated");
            done();
        });
    });

    it("isAuthenticated handles unsuccessful auth", (done: MochaDone) => {
        mockReturn("Unauthorized", 401, {});
        manager.isAuthenticated().done((authenticated: boolean) => {
            assert(!authenticated, "Should not be authenticated");
            done();
        });
    });

    it("isAuthenticated handles unexpected status codes", (done: MochaDone) => {
        mockReturn("Not Found", 404, {});
        manager.isAuthenticated().done((authenticated: boolean) => {
            assert.fail("isAuthenticated should have rejected the promise");
            done();
        }, (err) => {
            assert.equal(err.message, "Not Found", "Error message should be 'Not Found'");
            done();
        });
    });

    it("addApp handles location header", (done: MochaDone) => {
        mockReturn(JSON.stringify({ success: true }), 200, { location: "/appId" });
        manager.addApp("appName").done((obj) => {
            assert.ok(obj);
            done();
        }, rejectHandler);
    });

    it("addApp handles missing location header", (done: MochaDone) => {
        mockReturn(JSON.stringify({ success: true }), 200, {});
        manager.addApp("appName").done((obj) => {
            assert.ok(!obj);
            done();
        }, rejectHandler);
    });

    it("getApp handles JSON response", (done: MochaDone) => {
        mockReturn(JSON.stringify({ app: {} }), 200, {});

        manager.getApp("appId").done((obj: any) => {
            assert.ok(obj);
            done();
        }, rejectHandler);
    });

    it("updateApp handles success response", (done: MochaDone) => {
        mockReturn(JSON.stringify({ apps: [] }), 200, {});

        manager.updateApp(<any>{}).done((obj: any) => {
            assert.ok(!obj);
            done();
        }, rejectHandler);
    });

    it("removeApp handles success response", (done: MochaDone) => {
        mockReturn("", 200, {});

        manager.removeApp("appId").done((obj: any) => {
            assert.ok(!obj);
            done();
        }, rejectHandler);
    });

    it("addDeployment handles success response", (done: MochaDone) => {
        mockReturn("", 200, { location: "/deploymentId" });

        manager.addDeployment("appId", "name").done((obj: any) => {
            assert.ok(obj);
            done();
        }, rejectHandler);
    });

    it("addDeployment handles missing location header", (done: MochaDone) => {
        mockReturn("", 200, {});

        manager.addDeployment("appId", "name").done((obj: any) => {
            assert.ok(!obj);
            done();
        }, rejectHandler);
    });

    it("getDeployment handles JSON response", (done: MochaDone) => {
        mockReturn(JSON.stringify({ deployment: {} }), 200, {});

        manager.getDeployment("appId", "deploymentId").done((obj: any) => {
            assert.ok(obj);
            done();
        }, rejectHandler);
    });

    it("getDeployments handles JSON response", (done: MochaDone) => {
        mockReturn(JSON.stringify({ deployments: [] }), 200, {});

        manager.getDeployments("appId").done((obj: any) => {
            assert.ok(obj);
            done();
        }, rejectHandler);
    });

    it("updateDeployment handles success response", (done: MochaDone) => {
        mockReturn(JSON.stringify({ apps: [] }), 200, {});

        manager.updateDeployment("appId", <any>{id: "deploymentId"}).done((obj: any) => {
            assert.ok(!obj);
            done();
        }, rejectHandler);
    });

    it("removeDeployment handles success response", (done: MochaDone) => {
        mockReturn("", 200, {});

        manager.removeDeployment("appId", "deploymentId").done((obj: any) => {
            assert.ok(!obj);
            done();
        }, rejectHandler);
    });

    it("getDeploymentKeys handles JSON response", (done: MochaDone) => {
        mockReturn(JSON.stringify({ deploymentKeys: [] }), 200, {});

        manager.getDeploymentKeys("appId", "deploymentId").done((obj: any) => {
            assert.ok(obj);
            done();
        }, rejectHandler);
    });

    it("getPackage handles success response", (done: MochaDone) => {
        mockReturn(JSON.stringify({ package: {} }), 200);

        manager.getPackage("appId", "deploymentId").done((obj: any) => {
            assert.ok(obj);
            done();
        }, rejectHandler);
    });

    it("getPackageHistory handles success response with no packages", (done: MochaDone) => {
        mockReturn(JSON.stringify({ packageHistory: [] }), 200);

        manager.getPackageHistory("appId", "deploymentId").done((obj: any) => {
            assert.ok(obj);
            assert.equal(obj.length, 0);
            done();
        }, rejectHandler);
    });

    it("getPackageHistory handles success response with two packages", (done: MochaDone) => {
        mockReturn(JSON.stringify({ packageHistory: [ { label: "v1" }, { label: "v2" } ] }), 200);

        manager.getPackageHistory("appId", "deploymentId").done((obj: any) => {
            assert.ok(obj);
            assert.equal(obj.length, 2);
            assert.equal(obj[0].label, "v1");
            assert.equal(obj[1].label, "v2");
            done();
        }, rejectHandler);
    });

    it("getPackageHistory handles error response", (done: MochaDone) => {
        mockReturn("", 404);

        manager.getPackageHistory("appId", "deploymentId").done((obj: any) => {
            throw new Error("Call should not complete successfully");
        }, (error: Error) => done());
    });
});

// Helper method that is used everywhere that an assert.fail() is needed in a promise handler
function rejectHandler(val: any): void {
    assert.fail();
}

// Wrapper for superagent-mock that abstracts away information not needed for SDK tests
function mockReturn(bodyText: string, statusCode: number, header = {}) {
    require("superagent-mock")(request, [{
        pattern: "http://localhost/(\\w+)/?",
        fixtures: function (match: any, params: any) {
            var isOk = statusCode >= 200 && statusCode < 300;
            if (!isOk) {
                var err: any = new Error(bodyText);
                err.status = statusCode;
                throw err;
            }
            return { text: bodyText, status: statusCode, ok: isOk, header: header, headers: {} };
        },
        callback: function (match: any, data: any) { return data; }
    }]);
}
