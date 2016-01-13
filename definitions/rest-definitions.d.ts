declare module "rest-definitions" {
    export interface AccessKey {
        /*generated*/ id?: string;
        name: string;
        createdBy: string;
        createdTime: number;
        description?: string;
    }

    export interface DeploymentStatusReport {
        appVersion: string;
        clientUniqueID: string;
        deploymentKey: string; 
        label?: string;
        status?: string
    }

    export interface PackageInfo {
        appVersion: string;
        description: string;
        isMandatory: boolean;
        /*generated*/ label?: string;
        /*generated*/ packageHash: string;
    }

    export interface UpdateCheckResponse extends PackageInfo {
        /*generated*/ downloadURL: string;
        /*generated*/ isAvailable: boolean;
        /*generated*/ packageSize: number;
        /*generated*/ updateAppVersion?: boolean;
    }

    export interface UpdateCheckRequest {
        appVersion: string;
        deploymentKey: string;
        isCompanion: boolean;
        label: string;
        packageHash: string;
    }

    export interface Account {
        email: string;
        /*generated*/ id?: string;
        name: string;
        /*const*/ username: string;
    }

    export interface App {
        /*generated*/ id?: string;
        name: string;
    }

    export interface Deployment {
        /*generated*/ id?: string;
        name: string;
        package?: Package
    }

    export interface DeploymentKey {
        description: string;
        /*generated*/ id?: string;
        isPrimary: boolean;
        /*generated*/ key: string;
        name: string;
    }

    export interface Package extends PackageInfo {
        /*generated*/ blobUrl: string;
        /*generated*/ diffAgainstPackageHash?: string;
        /*generated*/ diffBlobUrl?: string;
        /*generated*/ diffSize?: number;
        /*generated*/ originalLabel?: string;       // Set on "Promote" and "Rollback"
        /*generated*/ originalDeployment?: string;  // Set on "Promote"
        /*generated*/ releaseMethod?: string;       // "Upload", "Promote" or "Rollback". Unknown if unspecified
        /*generated*/ size: number;
        /*generated*/ uploadTime: number;
    }
}