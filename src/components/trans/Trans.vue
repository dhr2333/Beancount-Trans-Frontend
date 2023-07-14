<template>
  <el-upload class="upload-demo" drag="true" :action=action method="POST" multiple="false" :headers=headers accept=".csv"
    show-file-list name="trans">
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
</template>

<script setup lang="ts">
import { UploadFilled } from '@element-plus/icons-vue'
import { ref, computed } from 'vue';
import axios from '../../utils/request';

const csrfToken = ref('');
const action = axios.defaults.baseURL + '/translate/trans'
console.log(action);


axios.defaults.withCredentials = true
// axios.get('http://localhost:8002/api/get_csrf_token/').then(res => {
axios.get('translate/trans').then(res => {
  // csrfToken.value = res.data.token
  // console.log(res);
  // console.log(res.config);
  // console.log(res.data);
  // console.log(res.headers);
  // console.log(res.status);
  // console.log(res.headers['set-cookie']);
  // console.log(document)
  // console.log(document.cookie)
  csrfToken.value = document.cookie.split('=')[1]
})
  .catch(error => {
    // 处理请求错误
    console.error(error);
  });
sessionStorage.setItem("csrf_token", csrfToken.value)


const headers = computed(() => ({
  //   'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
  'X-CSRFToken': csrfToken.value
}))

</script>
