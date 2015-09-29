declare module "rest-definitions" {
    export interface AccessKey {
        id: string;
        name: string;
        description: string;
    }

    export interface PackageInfo {
        appVersion: string;
        description: string;
        label: string;
        packageHash: string;
        isMandatory: boolean;
    }

    export interface UpdateCheckResponse extends PackageInfo {
        downloadURL: string;
        isAvailable: boolean;
        packageSize: number;
        updateAppVersion?: boolean;
    }

    export interface UpdateCheckRequest {
        deploymentKey: string;
        appVersion: string;
        packageHash: string;
        isCompanion: boolean;
    }

    export interface Account {
        id: string;
        username: string;
        name: string;
        description: string;
        email: string;
    }

    export interface App {
        id: string;
        name: string;
        description: string;
    }

    export interface Deployment {
        id: string;
        name: string;
        description: string;
        package?: Package
    }

    export interface DeploymentKey {
        id: string;
        key: string;
        name: string;
        description: string;
        isPrimary: boolean;
    }

    export interface Package extends PackageInfo {
        size: number;
        blobUrl: string;
        diffBlobUrl?: string;
        diffAgainstPackageHash?: string;
    }
}
