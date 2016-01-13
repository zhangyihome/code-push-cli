import Acquisition = require("./acquisition-native-stub");

class MyApp {
    private static AppStoreScriptVersion = "1.5";
    private static AppUpdateTimeoutMs = 30 * 60 * 1000;
    private static ServerUrl = "http://localhost:7127/";
    
    private _acquisition: Acquisition.NativeSample;

    constructor() {
         this._acquisition = new Acquisition.NativeImplementation({ appVersion: "1.0.0", clientUniqueId: "203ff986-f335-4e94-8e79-ee404231218d", deploymentKey: "fa3s34a5s6d7f8we9a9r", serverUrl: MyApp.ServerUrl });
    }

    public onAppStartup(): void {
        this.registerLifecycleEvents();
        this.getLatestApp();
        window.setInterval(() => this.getLatestApp(), MyApp.AppUpdateTimeoutMs);
    }

    private registerLifecycleEvents(): void {
         this._acquisition.beforeApply((error: Error, newPackageInfo: Acquisition.LocalPackage) => {
            if (newPackageInfo.label.charAt(0) > "1") {
                // Migrate user data
            }
        });
        
         this._acquisition.afterApply((error: Error, oldPackageInfo: Acquisition.LocalPackage) => {
           if (oldPackageInfo.label.charAt(0) < "1") {
                // Display dialog to user about changes
                return Q.Promise<void>((resolve: () => void) => {
                    resolve();
                });
           }
        });
    }
    
    private getLatestApp(): void {
         this._acquisition.queryUpdate((error: Error, remotePackage: Acquisition.RemotePackage) => this.downloadAndApplyPackage(remotePackage));
    }
    
    private downloadAndApplyPackage(remotePackage: Acquisition.RemotePackage): void {
        if (remotePackage) {
             this._acquisition.download(remotePackage, (error: Error, localPackage: Acquisition.LocalPackage) => this.applyPackage(localPackage));
        }
    }
    
    private applyPackage(localPackage: Acquisition.LocalPackage): void {
        if (localPackage) {
             this._acquisition.apply(localPackage);
        }
    }
}
