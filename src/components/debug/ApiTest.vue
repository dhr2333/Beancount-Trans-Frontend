<template>
    <div class="api-test">
        <h2>API 测试页面</h2>

        <div class="test-section">
            <h3>认证设置</h3>
            <el-button @click="setTokens" type="primary">
                设置JWT令牌
            </el-button>
            <el-button @click="clearTokens" type="danger">
                清除令牌
            </el-button>
            <div class="token-status">
                <el-tag :type="hasTokens ? 'success' : 'danger'">
                    {{ hasTokens ? '已设置令牌' : '未设置令牌' }}
                </el-tag>
            </div>
        </div>

        <div class="test-section">
            <h3>账户树测试</h3>
            <el-button @click="testAccountTree" :loading="loading.accountTree">
                测试账户树 API
            </el-button>
            <div v-if="accountTreeData.length > 0" class="result">
                <h4>账户树数据：</h4>
                <pre>{{ JSON.stringify(accountTreeData, null, 2) }}</pre>
            </div>
        </div>

        <div class="test-section">
            <h3>货币列表测试</h3>
            <el-button @click="testCurrencies" :loading="loading.currencies">
                测试货币列表 API
            </el-button>
            <div v-if="currenciesData.length > 0" class="result">
                <h4>货币列表数据：</h4>
                <pre>{{ JSON.stringify(currenciesData, null, 2) }}</pre>
            </div>
        </div>

        <div class="test-section">
            <h3>支出映射测试</h3>
            <el-button @click="testExpenses" :loading="loading.expenses">
                测试支出映射 API
            </el-button>
            <div v-if="expensesData.length > 0" class="result">
                <h4>支出映射数据：</h4>
                <pre>{{ JSON.stringify(expensesData, null, 2) }}</pre>
            </div>
        </div>

        <div class="test-section">
            <h3>错误信息</h3>
            <div v-if="errors.length > 0" class="error-list">
                <div v-for="(error, index) in errors" :key="index" class="error-item">
                    <el-alert :title="error.title" :description="error.message" type="error" />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import axios from '../../utils/request'
import { setAuthTokens, clearAuthTokens, hasAuthTokens } from '../../utils/auth'

const loading = ref({
    accountTree: false,
    currencies: false,
    expenses: false
})

const accountTreeData = ref([])
const currenciesData = ref([])
const expensesData = ref([])
const errors = ref([])

const hasTokens = computed(() => hasAuthTokens())

const setTokens = () => {
    setAuthTokens()
    ElMessage.success('JWT令牌已设置')
}

const clearTokens = () => {
    clearAuthTokens()
    ElMessage.info('JWT令牌已清除')
}

const addError = (title: string, message: string) => {
    errors.value.push({ title, message })
}

const testAccountTree = async () => {
    try {
        loading.value.accountTree = true
        const response = await axios.get('/account/tree/')
        accountTreeData.value = response.data
        ElMessage.success('账户树 API 调用成功')
    } catch (error: any) {
        console.error('账户树 API 错误:', error)
        addError('账户树 API 错误', error.response?.data?.detail || error.message)
        ElMessage.error('账户树 API 调用失败')
    } finally {
        loading.value.accountTree = false
    }
}

const testCurrencies = async () => {
    try {
        loading.value.currencies = true
        const response = await axios.get('/currencies/')
        currenciesData.value = response.data
        ElMessage.success('货币列表 API 调用成功')
    } catch (error: any) {
        console.error('货币列表 API 错误:', error)
        addError('货币列表 API 错误', error.response?.data?.detail || error.message)
        ElMessage.error('货币列表 API 调用失败')
    } finally {
        loading.value.currencies = false
    }
}

const testExpenses = async () => {
    try {
        loading.value.expenses = true
        const response = await axios.get('/expense/')
        expensesData.value = response.data
        ElMessage.success('支出映射 API 调用成功')
    } catch (error: any) {
        console.error('支出映射 API 错误:', error)
        addError('支出映射 API 错误', error.response?.data?.detail || error.message)
        ElMessage.error('支出映射 API 调用失败')
    } finally {
        loading.value.expenses = false
    }
}
</script>

<style scoped>
.api-test {
    padding: 20px;
    max-width: 1200px;
    margin: 0 auto;
}

.test-section {
    margin-bottom: 30px;
    padding: 20px;
    border: 1px solid #e4e7ed;
    border-radius: 8px;
}

.result {
    margin-top: 15px;
    padding: 15px;
    background-color: #f5f7fa;
    border-radius: 4px;
}

.result pre {
    max-height: 300px;
    overflow-y: auto;
    font-size: 12px;
    line-height: 1.4;
}

.error-list {
    margin-top: 15px;
}

.error-item {
    margin-bottom: 10px;
}
</style>
