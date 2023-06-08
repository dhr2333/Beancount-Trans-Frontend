<template>
  <el-upload class="upload-demo" drag="true" action="http://127.0.0.1:8002/translate/trans" method="POST" multiple="false"
    accept=".csv" show-file-list name="trans">
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
</script>
