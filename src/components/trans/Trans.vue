<template>
  <el-upload class="upload-demo" :drag="true" :action=action method="POST" :data="getUploadData" :multiple="false"
    :headers=headers accept=".csv,.pdf,.xls,.xlsx" show-file-list name="trans" @success="handleUploadSuccess"
    @error="handleUploadError" @change="handleChange">
    <el-icon class="el-icon--upload"><upload-filled /></el-icon>
    <div class="el-upload__text">
      拖拽文件至此处 或 <em>单击上传</em>
    </div>
    <template #tip>
      <div class="el-upload__tip">
        当前支持<a :href="wechatUrl" download>微信</a>、<a :href="alipayUrl" download>支付宝</a>、
        <el-popover placement="top-start" :width="220" trigger="hover" content="
        中国工商银行储蓄卡（ICBC）
        中国建设银行储蓄卡（CCB）
        中国银行储蓄卡（BOC）
        ">
          <template #reference><a>储蓄卡</a>
          </template>
        </el-popover>、
        <el-popover placement="top-start" :width="220" trigger="hover" content="招商银行信用卡（CMB）">
          <template #reference><a>信用卡</a>
          </template>
        </el-popover>账单
        <el-select v-model="value4" multiple collapse-tags collapse-tags-tooltip :max-collapse-tags="2"
          placeholder="可选功能" style="width: 300px">
          <el-option v-for="item in options" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-input v-model="input" style="width: 250px" type="password" v-if="showPassword"
          placeholder="输入PDF文件解密密码后再上传文件" show-password />
      </div>
    </template>
  </el-upload>
  <!-- 添加复制按钮和结果框 -->
  <div class="result-container">
    <el-input class="result-textarea"></el-input>
    <el-button class="copy-btn" type="success" :icon="DocumentCopy" @click="copyResponseData" :disabled="!responseData">
      复制结果
    </el-button>
  </div>
  <el-input class="result-textarea" type="textarea" :rows="30" readonly :value="responseData" placeholder='完成解析后将自动填充到此处,可直接进行复制，解析案例如下：

2022-06-19 * "温州市数据管理发展集团有限公司" "HIK-停车缴费-洞头人民路停车场(人民路区域共享)"
    time: "15:27:44"
    uuid: "2022061922001474561419808812"
    status: "ALiPay - 交易成功"
    Expenses:TransPort:Private:Park +5.00 CNY
    Liabilities:CreditCard:Bank:CITIC:C6428 -5.00 CNY

or 

2024-04-16 balance Assets:Savings:Bank:BOC:C0814 84543.23 CNY
2024-04-15 pad Assets:Savings:Bank:BOC:C0814 Income:Investment:Interest
'></el-input>
</template>

<script setup lang="ts">
import { ElMessage, ElPopover } from 'element-plus';
import { UploadFilled, DocumentCopy } from '@element-plus/icons-vue'
import { ref, computed, watch } from 'vue';
import axios from '../../utils/request';


const input = ref()
const filename = ref()
const wechatUrl = ref('https://dl.dhr2333.cn/%E5%AE%8C%E6%95%B4%E6%B5%8B%E8%AF%95_%E5%BE%AE%E4%BF%A1.csv');
const alipayUrl = ref('https://dl.dhr2333.cn/%E5%AE%8C%E6%95%B4%E6%B5%8B%E8%AF%95_%E6%94%AF%E4%BB%98%E5%AE%9D.csv');
const value4 = ref([])
const options = [
  {
    value: '写入Beancount-Trans-Assets',
    label: '写入Beancount-Trans-Assets',
  },
  {
    value: '文件若加密请选择',
    label: '文件若加密请选择',
  },
  {
    value: '中国银行借记卡忽略支付宝微信条目',
    label: '中国银行借记卡忽略支付宝微信条目',
  },
  {
    value: '招行信用卡忽略支付宝微信条目',
    label: '招行信用卡忽略支付宝微信条目',
  },
  {
    value: '生成balance对账信息',
    label: '生成balance对账信息',
  },
  {
    value: '仅返回CSV格式账单',
    label: '仅返回CSV格式账单',
  }
]

const csrfToken = ref('');
const action = axios.defaults.baseURL + '/translate/trans'
const isWrite = ref(false)
const cmbCreditIgnore = ref(false)
const bocDebitIgnore = ref(false)
const showPassword = ref(false)
const isbalance = ref(false)
const isCSVOnly = ref(false)

const getUploadData = () => {
  return {
    cmb_credit_ignore: cmbCreditIgnore.value,
    boc_debit_ignore: bocDebitIgnore.value,
    write: isWrite.value,
    password: input.value,
    balance: isbalance.value,
    isCSVOnly: isCSVOnly.value,
    csrfmiddlewaretoken: csrfToken.value
  };
};
watch(value4, (newValue) => {
  if (newValue.includes('写入Beancount-Trans-Assets')) {
    isWrite.value = true;
  } else {
    isWrite.value = false;
  };
  if (newValue.includes('招行信用卡忽略支付宝微信条目')) {
    cmbCreditIgnore.value = true;
  } else {
    cmbCreditIgnore.value = false;
  };
  if (newValue.includes('中国银行借记卡忽略支付宝微信条目')) {
    bocDebitIgnore.value = true;
  } else {
    bocDebitIgnore.value = false;
  };
  if (newValue.includes('文件若加密请选择')) {
    showPassword.value = true;
  } else {
    showPassword.value = false;
  };
  if (newValue.includes('生成balance对账信息')) {
    isbalance.value = true;
  } else {
    isbalance.value = false;
  };
  if (newValue.includes('仅返回CSV格式账单')) {
    isCSVOnly.value = true;
  } else {
    isCSVOnly.value = false;
  };
});

axios.defaults.withCredentials = true

const token = localStorage.getItem("access");

const headers = computed(() => ({
  "X-CSRFToken": csrfToken.value,
  "Authorization": `Bearer ${token}`,
}))

const responseData = ref('')

const handleUploadSuccess = (response: any, file: any) => {
  if (file.status === 'error') {
    return;  // 当状态为'error'时，错误会由handleUploadError处理
  }
  if (isCSVOnly.value == true) {
    responseData.value = response
    downloadCSV(responseData.value)
  } else {
    responseData.value = response.join('');
  }
};

// 函数用于下载CSV文件
const downloadCSV = (csvData: string) => {
  // 假设csvData已经是正确格式的CSV文本
  const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  if (link.download !== undefined) { // 检查浏览器是否支持下载属性
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename.value + ".csv");  // 设定下载文件名
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();  // 触发下载
    document.body.removeChild(link); // 下载后移除元素
  }
}

const handleChange = (file: File, fileList: File[]) => {
  filename.value = file.name.split('.')[0]
};

const handleUploadError = (err: any, file: any) => {
  if (JSON.parse(err.message).error === "Decryption failed") {
    ElMessage.error("PDF解密失败");
  } else if (JSON.parse(err.message).error === "当前账单不支持") {
    ElMessage.error("请上传支持的账单文件");
  } else {
    ElMessage.error("未知错误：" + err.message);
  }
};

// 在原有代码基础上添加复制方法
const copyResponseData = async () => {
  try {
    await navigator.clipboard.writeText(responseData.value);
    ElMessage.success('复制成功');
  } catch (err) {
    console.error('复制失败:', err);
    ElMessage.error('复制失败，请手动选择内容复制');
  }
};
</script>
<style>
/* 添加样式 */
.result-container {
  position: relative;
  margin-top: 20px;
}

.copy-btn {
  position: absolute;
  right: 10px;
  top: 10px;
  z-index: 100;
}

.result-textarea textarea {
  font-family: Monaco, Consolas, 'Courier New', monospace;
  font-size: 12px;
}
</style>