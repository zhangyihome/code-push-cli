export enum CommandType {
    accessKeyAdd,
    accessKeyList,
    accessKeyRemove,
    appAdd,
    appList,
    appRemove,
    appRename,
    appTransfer,
    collaboratorAdd,
    collaboratorList,
    collaboratorRemove,
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
    releaseReact,
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

export interface IAppTransferCommand extends ICommand {
    appName: string;
    email: string;
}

export interface ICollaboratorAddCommand extends ICommand {
    appName: string;
    email: string;
}

export interface ICollaboratorListCommand extends ICommand {
    appName: string;
    format: string;
}

export interface ICollaboratorRemoveCommand extends ICommand {
    appName: string;
    email: string;
}

export interface IDeploymentAddCommand extends ICommand {
    appName: string;
    deploymentName: string;
}

export interface IDeploymentHistoryCommand extends ICommand {
    appName: string;
    deploymentName: string;
    format: string;
    displayAuthor: boolean;
}

export interface IDeploymentListCommand extends ICommand {
    appName: string;
    format: string;
    displayKeys: boolean;
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

export interface IReleaseBaseCommand extends ICommand {
    appName: string;
    deploymentName: string;
    description: string;
    mandatory: boolean;
}

export interface IReleaseCommand extends IReleaseBaseCommand {
    appStoreVersion: string;
    package: string;
}

export interface IReleaseReactCommand extends IReleaseBaseCommand {
    entryFile?: string;
    platform: string;
    sourcemapOutput?: string;
}

export interface IRollbackCommand extends ICommand {
    appName: string;
    deploymentName: string;
    targetRelease: string;
}