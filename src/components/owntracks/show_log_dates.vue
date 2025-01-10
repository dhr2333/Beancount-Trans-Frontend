<template>
    <div>
        <ul>
            <li v-for="date in results" :key="date">
                <a :href="`${apiUrl}/owntracks/show_maps?date=${date}`" target="_blank">{{ date }}</a>
            </li>
        </ul>
    </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import axios from '../../utils/request'
import { ElMessage } from 'element-plus';

const apiUrl = import.meta.env.VITE_API_URL;
const results = ref()
const fetchData = async () => {
    try {
        const response = await axios.get('owntracks/show_dates')
        results.value = response.data.results
    } catch (error: any) {
        console.error(error)
        if (error.response.data.code == "token_not_valid") {
            ElMessage("token_not_valid, please log in again.")
        } else if (error.response.data.detail == "身份认证信息未提供。") {
            ElMessage.info("请登录后重试")
        }
    }
}

onMounted(() => {
    fetchData()
})

</script>

<style>
li {
    text-align: left;
    font-size: 15px;
}
</style>