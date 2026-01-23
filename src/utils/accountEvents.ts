const ACCOUNT_TREE_UPDATED_EVENT = 'account-tree-updated'
const TASK_BANNER_REFRESH_EVENT = 'task-banner-refresh'

export const emitAccountTreeUpdated = () => {
    window.dispatchEvent(new CustomEvent(ACCOUNT_TREE_UPDATED_EVENT))
}

export const subscribeAccountTreeUpdated = (handler: EventListener) => {
    window.addEventListener(ACCOUNT_TREE_UPDATED_EVENT, handler)
    return () => window.removeEventListener(ACCOUNT_TREE_UPDATED_EVENT, handler)
}

export const emitTaskBannerRefresh = () => {
    window.dispatchEvent(new CustomEvent(TASK_BANNER_REFRESH_EVENT))
}

export const subscribeTaskBannerRefresh = (handler: EventListener) => {
    window.addEventListener(TASK_BANNER_REFRESH_EVENT, handler)
    return () => window.removeEventListener(TASK_BANNER_REFRESH_EVENT, handler)
}

export { ACCOUNT_TREE_UPDATED_EVENT, TASK_BANNER_REFRESH_EVENT }
