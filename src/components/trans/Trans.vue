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
          placeholder="输入PDF文件解密密码后再上传文件" show-password>
          <template #prefix>
            <el-icon>
              <Lock />
            </el-icon>
          </template>
        </el-input>
      </div>
    </template>
  </el-upload>
  <!-- 添加复制按钮和结果框 -->
  <div class="result-container">
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
  <div class="table-container">
    <el-table :data="responseList" style="width: 100%;" border highlight-current-row>
      <el-table-column label="账单格式化内容" min-width="400">
        <template #default="scope">
          <pre class="bill-formatted-content" style="white-space: pre-wrap; margin: 0; cursor: pointer;"
            @click="copySingleFormatted(scope.row.formatted)" :title="'点击复制该条账单内容'">{{ scope.row.formatted }}</pre>
        </template>
      </el-table-column>
      <el-table-column label="AI分类反馈" min-width="400">
        <template #default="scope">
          <div class="ai-classification-container">
            <div class="current-selection">
              <span class="label">当前分类：</span>
              <el-tag v-if="scope.row.ai_choose" type="success" class="selected-tag">{{ scope.row.ai_choose }}</el-tag>
              <span v-else class="no-category-tip">无分类建议</span>
            </div>
            <div v-if="scope.row.ai_candidates && scope.row.ai_candidates.length > 1" class="candidates">
              <span class="label">候选分类：</span>
              <div class="candidate-tags">
                <el-tag v-for="(candidate, idx) in scope.row.ai_candidates" :key="idx"
                  :type="candidate.key === scope.row.ai_choose ? 'success' : 'info'" class="candidate-tag"
                  @click="handleAiChoose(scope.$index, candidate.key)">
                  {{ candidate.key }}
                  <span class="score" v-if="candidate.score !== undefined">
                    ({{ candidate.score }})
                  </span>
                </el-tag>
              </div>
            </div>
            <div v-else-if="scope.row.ai_candidates && scope.row.ai_candidates.length === 1" class="candidates">
              <span class="label" style="color: #909399;">仅有一个分类建议</span>
            </div>
            <div v-else class="candidates">
              <span class="label" style="color: #909399;">无候选分类</span>
            </div>
          </div>
        </template>
      </el-table-column>
    </el-table>
  </div>
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
const responseList = ref([]); // 存储所有账单条目

const handleUploadSuccess = (response: any, file: any) => {
  if (file.status === 'error') return;
  if (isCSVOnly.value == true) {
    responseData.value = response
    downloadCSV(responseData.value)
  } else {
    responseList.value = response.results; // 存储所有条目
    responseData.value = response.results.map((item: any) => item.formatted).join(''); // 存储所有条目
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
  if (JSON.parse(err.message).error === "PDF解密失败") {
    ElMessage.error("PDF解密失败");
  }
  else if (JSON.parse(err.message).error === "当前账单不支持") {
    ElMessage.error("当前账单不支持");
  }
  else if (JSON.parse(err.message).error === "使用DeepSeek模型需要API密钥") {
    ElMessage.error("使用DeepSeek模型需要API密钥");
  }
  else if (JSON.parse(err.message).error === "DeepSeek调用失败，请检查API密钥是否正确") {
    ElMessage.error("DeepSeek调用失败，请检查API密钥是否正确");
  }
  else {
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

// 复制单条账单内容
const copySingleFormatted = async (text) => {
  try {
    await navigator.clipboard.writeText(text.trim())
    ElMessage.success('已复制该条账单内容')
  } catch (err) {
    ElMessage.error('复制失败，请手动复制')
  }
}

// 反馈AI选择
const handleAiChoose = (rowIndex, key) => {
  // 只更新前端显示，后端逻辑可后续实现
  responseList.value[rowIndex].ai_choose = key
  ElMessage.success('已反馈AI选择')
}
</script>
<style>
/* 添加样式 */
.upload-demo,
.result-container,
.result-textarea {
  width: calc(100% - 24px);
  margin-left: 5px;
}

.upload-demo {
  margin-left: 14px;
}

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

.ai-classification-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.current-selection,
.candidates {
  display: flex;
  align-items: center;
}

.label {
  font-size: 12px;
  color: #606266;
  margin-right: 8px;
  flex-shrink: 0;
}

.candidate-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.candidate-tag {
  cursor: pointer;
  transition: all 0.3s;
}

.candidate-tag:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.candidate-tag.is-selected {
  font-weight: bold;
  border-width: 2px;
}

.score {
  font-size: 0.85em;
  color: #909399;
  margin-left: 2px;
}

.candidate-tag:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.no-category-tip {
  color: #909399;
  font-size: 12px;
  display: inline-block;
  line-height: 22px;
  /* 与 el-tag 高度一致 */
  padding: 0 9px;
  border-radius: 4px;
  background: #f4f4f5;
  vertical-align: middle;
}

.bill-formatted-content {
  font-size: 12px;
  font-family: Monaco, Consolas, 'Courier New', monospace;
  line-height: 1.6;
  background: none;
  border: none;
  box-shadow: none;
  margin: 0;
  padding: 0;
}

.table-container {
  padding-left: 15px;
  padding-right: 10px;
  box-sizing: border-box;
}

.el-table {
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
}
</style>