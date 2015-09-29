export enum CommandType {
    accessKeyList,
    accessKeyRemove,
    appAdd,
    appList,
    appRemove,
    appRename,
    deploy,
    deploymentAdd,
    deploymentList,
    deploymentRemove,
    deploymentRename,
    deploymentKeyList,
    login,
    logout,
    register
}

export interface ICommand {
    type: CommandType;
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

export interface IDeployCommand extends ICommand {
    appName: string;
    deploymentName: string;
    description: string;
    mandatory: boolean;
    minAppVersion: string;
    package: string;
}

export interface IDeploymentAddCommand extends ICommand {
    appName: string;
    deploymentName: string;
}

export interface IDeploymentListCommand extends ICommand {
    appName: string;
    format: string;
    verbose?: boolean;
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

export interface IDeploymentKeyListCommand extends ICommand {
    appName: string;
    deploymentName: string;
    format: string;
}

export interface ILoginCommand extends ICommand {
    serverUrl: string;
}

export interface IRegisterCommand extends ICommand {
    serverUrl: string;
}