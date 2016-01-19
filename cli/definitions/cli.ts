export enum CommandType {
    accessKeyAdd,
    accessKeyList,
    accessKeyRemove,
    appAdd,
    appList,
    appRemove,
    appRename,
    deploymentAdd,
    deploymentHistory,
    deploymentList,
    deploymentMetrics,
    deploymentRemove,
    deploymentRename,
    login,
    logout,
    promote,
    register,
    release,
    rollback
}

export interface ICommand {
    type: CommandType;
}

export interface IAccessKeyAddCommand extends ICommand {
    description: string;
}

export interface IAccessKeyListCommand extends ICommand {
    format: string;
}

export interface IAccessKeyRemoveCommand extends ICommand {
    accessKeyName: string;
}

export interface IAppAddCommand extends ICommand {
    appName: string;
}

export interface IAppListCommand extends ICommand {
    format: string;
}

export interface IAppRemoveCommand extends ICommand {
    appName: string;
}

export interface IAppRenameCommand extends ICommand {
    currentAppName: string;
    newAppName: string;
}

export interface IDeploymentAddCommand extends ICommand {
    appName: string;
    deploymentName: string;
}

export interface IDeploymentListCommand extends ICommand {
    appName: string;
    format: string;
}

export interface IDeploymentRemoveCommand extends ICommand {
    appName: string;
    deploymentName: string;
}

export interface IDeploymentRenameCommand extends ICommand {
    appName: string;
    currentDeploymentName: string;
    newDeploymentName: string;
}

export interface IDeploymentHistoryCommand extends ICommand {
    appName: string;
    deploymentName: string;
    format: string;
}

export interface IDeploymentMetricsCommand extends ICommand {
    appName: string;
    deploymentName: string;
    format: string;
}

export interface ILoginCommand extends ICommand {
    serverUrl: string;
    accessKey: string;
}

export interface ILogoutCommand extends ICommand {
    isLocal: boolean;
}

export interface IPromoteCommand extends ICommand {
    appName: string;
    sourceDeploymentName: string;
    destDeploymentName: string;
}

export interface IRegisterCommand extends ICommand {
    serverUrl: string;
}

export interface IReleaseCommand extends ICommand {
    appName: string;
    deploymentName: string;
    description: string;
    mandatory: boolean;
    appStoreVersion: string;
    package: string;
}

export interface IRollbackCommand extends ICommand {
    appName: string;
    deploymentName: string;
    targetRelease: string;
}