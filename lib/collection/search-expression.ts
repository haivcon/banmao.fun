export function collectionSearchExpression(folder: string): string {
    const renderableResources = "resource_type:image OR resource_type:video";
    return folder ? `(${renderableResources}) AND folder:${folder}*` : renderableResources;
}
