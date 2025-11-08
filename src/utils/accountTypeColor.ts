import type { TagProps } from 'element-plus'

const accountTypeMap: Record<string, TagProps['type']> = {
    Assets: 'success',
    Expenses: 'warning',
    Income: 'primary',
    Liabilities: 'danger',
    Equity: 'info',
    资产账户: 'success',
    支出账户: 'warning',
    收入账户: 'primary',
    负债账户: 'danger',
    权益账户: 'info'
}

export const getAccountTypeColor = (type: string): TagProps['type'] => {
    return accountTypeMap[type] ?? 'info'
}

