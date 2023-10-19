<template>
  <el-upload class="upload-demo" :drag="true" :action=action method="POST" :multiple="false" :headers=headers
    accept=".csv" show-file-list name="trans" @success="handleUploadSuccess">
    <el-icon class="el-icon--upload"><upload-filled /></el-icon>
    <div class="el-upload__text">
      拖拽文件至此处 或 <em>单击上传</em>
    </div>
    <template #tip>
      <div class="el-upload__tip">
        当前仅支持微信账单及支付宝账单
      </div>
    </template>
  </el-upload>
  <el-input class="result-textarea" type="textarea" :rows="30" readonly :value="responseData" placeholder='完成解析后将自动填充到此处,可直接进行复制，解析案例如下：

2022-06-19 * "温州市数据管理发展集团有限公司" "HIK-停车缴费-洞头人民路停车场(人民路区域共享)"
    time: "15:27:44"
    uuid: "2022061922001474561419808812"
    status: "ALiPay - 交易成功"
    Expenses:TransPort:Private:Park +5.00 CNY
    Liabilities:CreditCard:Bank:ZhongXin:C6428 -5.00 CNY
'></el-input>
</template>

<script setup lang="ts">
import { UploadFilled } from '@element-plus/icons-vue'
import { ref, computed } from 'vue';
import axios from '../../utils/request';
// import { responseData } from '../../utils/request';

const csrfToken = ref('');
const action = axios.defaults.baseURL + '/translate/trans'

axios.defaults.withCredentials = true
axios.get('translate/trans').then(res => {
  csrfToken.value = document.cookie.split('=')[1]
})
  .catch(error => {  // 处理请求错误
    console.error(error);
  });
sessionStorage.setItem("csrf_token", csrfToken.value)


const token = localStorage.getItem("token");

const headers = computed(() => ({
  //   'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
  'X-CSRFToken': csrfToken.value,
  "Authorization": `Bearer ${token}`
}))

const responseData = ref('')
const handleUploadSuccess = (response: any) => {
  responseData.value = response.join('');
  console.log(responseData.value);
}
</script>
