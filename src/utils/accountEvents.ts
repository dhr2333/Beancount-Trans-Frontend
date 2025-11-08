const ACCOUNT_TREE_UPDATED_EVENT = 'account-tree-updated'

export const emitAccountTreeUpdated = () => {
    window.dispatchEvent(new CustomEvent(ACCOUNT_TREE_UPDATED_EVENT))
}

export const subscribeAccountTreeUpdated = (handler: EventListener) => {
    window.addEventListener(ACCOUNT_TREE_UPDATED_EVENT, handler)
    return () => window.removeEventListener(ACCOUNT_TREE_UPDATED_EVENT, handler)
}

export { ACCOUNT_TREE_UPDATED_EVENT }
