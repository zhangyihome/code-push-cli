export { AccessKey, Account, App, CollaboratorMap, CollaboratorProperties, Deployment, DeploymentMetrics, Package, UpdateMetrics } from "rest-definitions";

export interface CodePushError {
    message?: string;
    statusCode?: number;
}

export interface PackageInfo {
    appVersion?: string;
    description?: string;
    isMandatory?: boolean;
    label?: string;
    rollout?: number;
}

export type Headers = { [headerName: string]: string };
