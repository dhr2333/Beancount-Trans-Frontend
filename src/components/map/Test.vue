<template>
    <el-form ref="ruleFormRef" :model="ruleForm" :rules="rules" label-width="120px" class="demo-ruleForm" :size="formSize"
        status-icon>
        <el-form-item label="关键字" prop="key">
            <el-input v-model="ruleForm.key" placeholder="古茗" />
        </el-form-item>
        <el-form-item label="商家" prop="payee">
            <el-input v-model="ruleForm.payee" placeholder="古茗" />
        </el-form-item>
        <el-form-item label="映射账户" prop="expend">
            <el-input v-model="ruleForm.expend" placeholder="Expenses:Food:DrinkFruit" />
        </el-form-item>
        <el-form-item label="标签" prop="tag">
            <el-input v-model="ruleForm.tag" placeholder="饮料水果" />
        </el-form-item>
        <el-form-item label="类型" prop="classification">
            <el-select-v2 v-model="ruleForm.classification" placeholder="餐饮美食/饮料水果" :options="options" />
        </el-form-item>
        <!-- <el-form-item label="类型" prop="classification">
            <el-input v-model="ruleForm.classification" placeholder="餐饮美食/饮料水果" />
        </el-form-item> -->
        <!-- <el-form-item label="Activity zone" prop="region">
            <el-select v-model="ruleForm.region" placeholder="Activity zone">
                <el-option label="Zone one" value="shanghai" />
                <el-option label="Zone two" value="beijing" />
            </el-select>
        </el-form-item>
        <el-form-item label="Activity count" prop="count">
            <el-select-v2 v-model="ruleForm.count" placeholder="Activity count" :options="options" />
        </el-form-item>
        <el-form-item label="Activity time" required>
            <el-col :span="11">
                <el-form-item prop="date1">
                    <el-date-picker v-model="ruleForm.date1" type="date" label="Pick a date" placeholder="Pick a date"
                        style="width: 100%" />
                </el-form-item>
            </el-col>
            <el-col class="text-center" :span="2">
                <span class="text-gray-500">-</span>
            </el-col>
            <el-col :span="11">
                <el-form-item prop="date2">
                    <el-time-picker v-model="ruleForm.date2" label="Pick a time" placeholder="Pick a time"
                        style="width: 100%" />
                </el-form-item>
            </el-col>
        </el-form-item>
        <el-form-item label="Instant delivery" prop="delivery">
            <el-switch v-model="ruleForm.delivery" />
        </el-form-item>
        <el-form-item label="Activity type" prop="type">
            <el-checkbox-group v-model="ruleForm.type">
                <el-checkbox label="Online activities" name="type" />
                <el-checkbox label="Promotion activities" name="type" />
                <el-checkbox label="Offline activities" name="type" />
                <el-checkbox label="Simple brand exposure" name="type" />
            </el-checkbox-group>
        </el-form-item>
        <el-form-item label="Resources" prop="resource">
            <el-radio-group v-model="ruleForm.resource">
                <el-radio label="Sponsorship" />
                <el-radio label="Venue" />
            </el-radio-group>
        </el-form-item>
        <el-form-item label="Activity form" prop="desc">
            <el-input v-model="ruleForm.desc" type="textarea" />
        </el-form-item> -->
        <el-form-item>
            <el-button type="primary" @click="submitForm(ruleFormRef)">
                Create
            </el-button>
            <el-button @click="resetForm(ruleFormRef)">Reset</el-button>
        </el-form-item>
    </el-form>
</template>

<script lang="ts" setup>
import { reactive, ref } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'

const formSize = ref('default')
const ruleFormRef = ref<FormInstance>()
const ruleForm = reactive({
    key: '',
    payee: '',
    expend: '',
    tag: '',
    classification: '',
    // name: 'Hello',
    // region: '',
    // count: '',
    // date1: '',
    // date2: '',
    // delivery: false,
    // type: [],
    // resource: '',
    // desc: '',
})

const rules = reactive<FormRules>({
    key: [
        { required: true, message: '请输入关键字', trigger: 'blur' },
        { max: 16, message: '长度应控制在16个字符以内', trigger: 'blur' },
    ],
    payee: [
        { required: false, message: 'Please select Activity zone', trigger: 'change', },
    ],
    expend: [
        { required: true, message: '请输入映射账户', trigger: 'blur' },
        { max: 64, message: '长度应控制在64个字符以内', trigger: 'blur' },
    ],
    classification: [
        { required: true, message: '请选择类型', trigger: 'blur' },
    ],
    // date1: [
    //     {
    //         type: 'date',
    //         required: true,
    //         message: 'Please pick a date',
    //         trigger: 'change',
    //     },
    // ],
    // date2: [
    //     {
    //         type: 'date',
    //         required: true,
    //         message: 'Please pick a time',
    //         trigger: 'change',
    //     },
    // ],
    // type: [
    //     {
    //         type: 'array',
    //         required: true,
    //         message: 'Please select at least one activity type',
    //         trigger: 'change',
    //     },
    // ],
    // resource: [
    //     {
    //         required: true,
    //         message: 'Please select activity resource',
    //         trigger: 'change',
    //     },
    // ],
    // desc: [
    //     { required: true, message: 'Please input activity form', trigger: 'blur' },
    // ],
})

const submitForm = async (formEl: FormInstance | undefined) => {
    if (!formEl) return
    await formEl.validate((valid, fields) => {
        if (valid) {
            console.log('submit!')
        } else {
            console.log('error submit!', fields)
        }
    })
}

const resetForm = (formEl: FormInstance | undefined) => {
    if (!formEl) return
    formEl.resetFields()
}

const options = Array.from({ length: 10000 }).map((_, idx) => ({
    value: `${idx + 1}`,
    label: `${idx + 1}`,
}))
</script>
