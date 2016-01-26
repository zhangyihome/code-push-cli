declare module "rest-definitions" {
    export interface AccessKey {
        /*generated*/ id?: string;
        name: string;
        createdBy: string;
        createdTime: number;
        description?: string;
    }
    
    export interface DeploymentMetrics {
        [packageLabelOrAppVersion: string]: UpdateMetrics
    }

    export interface DeploymentStatusReport {
        appVersion: string;
        clientUniqueId: string;
        deploymentKey: string; 
        label?: string;
        status?: string
    }
    
    export interface DownloadReport {
        clientUniqueId: string;
        deploymentKey: string;
        label: string;
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
    
    export interface UpdateMetrics {
        active: number;
        downloaded?: number;
        failed?: number;
        installed?: number;
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
        /*generated*/ collaborators?: Collaborator[];
        /*generated*/ isOwner?: boolean;
    }

    export interface Collaborator {
        /*assigned*/ accountId?: string;
        email: string;
        permission: string;
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
        /*generated*/ releasedBy?: string;          // Set by commitPackage
        /*generated*/ releaseMethod?: string;       // "Upload", "Promote" or "Rollback". Unknown if unspecified
        /*generated*/ size: number;
        /*generated*/ uploadTime: number;
    }
}