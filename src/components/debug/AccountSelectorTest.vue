<template>
    <div class="account-selector-test">
        <h2>账户选择器测试</h2>

        <div class="test-section">
            <h3>测试不同账户类型</h3>

            <div class="test-item">
                <h4>支出账户选择器</h4>
                <AccountSelector v-model="selectedExpenseAccount" account-type="Expenses" placeholder="选择支出账户"
                    @change="handleExpenseAccountChange" />
                <p>选中的支出账户ID: {{ selectedExpenseAccount }}</p>
            </div>

            <div class="test-item">
                <h4>资产账户选择器</h4>
                <AccountSelector v-model="selectedAssetsAccount" account-type="Assets" placeholder="选择资产账户"
                    @change="handleAssetsAccountChange" />
                <p>选中的资产账户ID: {{ selectedAssetsAccount }}</p>
            </div>

            <div class="test-item">
                <h4>无类型过滤选择器</h4>
                <AccountSelector v-model="selectedAnyAccount" placeholder="选择任意账户" @change="handleAnyAccountChange" />
                <p>选中的账户ID: {{ selectedAnyAccount }}</p>
            </div>
        </div>

        <div class="test-section">
            <h3>调试信息</h3>
            <div class="debug-info">
                <h4>选中的支出账户:</h4>
                <pre>{{ JSON.stringify(selectedExpenseAccountData, null, 2) }}</pre>

                <h4>选中的资产账户:</h4>
                <pre>{{ JSON.stringify(selectedAssetsAccountData, null, 2) }}</pre>

                <h4>选中的任意账户:</h4>
                <pre>{{ JSON.stringify(selectedAnyAccountData, null, 2) }}</pre>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AccountSelector from '../common/AccountSelector.vue'

const selectedExpenseAccount = ref<number | null>(null)
const selectedAssetsAccount = ref<number | null>(null)
const selectedAnyAccount = ref<number | null>(null)

const selectedExpenseAccountData = ref(null)
const selectedAssetsAccountData = ref(null)
const selectedAnyAccountData = ref(null)

const handleExpenseAccountChange = (account: any) => {
    console.log('支出账户选择变化:', account)
    selectedExpenseAccountData.value = account
}

const handleAssetsAccountChange = (account: any) => {
    console.log('资产账户选择变化:', account)
    selectedAssetsAccountData.value = account
}

const handleAnyAccountChange = (account: any) => {
    console.log('任意账户选择变化:', account)
    selectedAnyAccountData.value = account
}
</script>

<style scoped>
.account-selector-test {
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

.test-item {
    margin-bottom: 20px;
    padding: 15px;
    background-color: #f5f7fa;
    border-radius: 4px;
}

.test-item h4 {
    margin: 0 0 10px 0;
    color: #409eff;
}

.debug-info {
    margin-top: 15px;
}

.debug-info pre {
    max-height: 200px;
    overflow-y: auto;
    font-size: 12px;
    line-height: 1.4;
    background-color: #f5f7fa;
    padding: 10px;
    border-radius: 4px;
}
</style>
