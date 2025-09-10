<template>
  <div class="login-register">
    <div class="contain">
      <div class="big-box" :class="{ active: isLogin }">
        <div class="big-contain" key="bigContainLogin" v-if="isLogin">
          <div class="btitle">账户登录</div>
          <form class="bform" @submit.prevent="login">
            <input type="text" placeholder="用户名(默认admin)" v-model="username">
            <span class="errTips" v-if="emailError">* 用户名无效 *</span>
            <input type="password" placeholder="密码(默认123456)" v-model="password">
            <span class="errTips" v-if="emailError">* 密码填写错误 *</span>
            <button type="submit" class="bbutton">登录</button>
            <button type="button" class="bbutton" @click="loginWithGitHub">使用 GitHub 登录</button>
            <!-- <button class="bbutton" @click="loginWithGoogle">使用 Google 登录</button> -->
            <!-- <button class="bbutton" @click="sendPostRequest">使用 Dummy 登录</button> -->
          </form>
        </div>

        <div class="big-contain" key="bigContainRegister" v-else>
          
          <div class="btitle">创建账户</div>
          <form class="bform" @submit.prevent="register"> <!-- 关键修改：添加表单和 submit 事件 -->
            <input type="text" placeholder="用户名（必填）" v-model="username">
            <span class="errTips" v-if="existed">* 用户名已经存在！ *</span>
            <input type="email" placeholder="邮箱（选填）" v-model="email">
            <input type="password" placeholder="密码（必填）" v-model="password">
            <button type="submit" class="bbutton">注册</button> <!-- 改为 submit 类型 -->
          </form>
        </div>
      </div>
      <div class="small-box" :class="{ active: isLogin }">
        <div class="small-contain" key="smallContainRegister" v-if="isLogin">
          <div class="stitle">还没有账户?</div>
          <p class="scontent">立即注册，AI 帮您实现 3 分钟生成专业财务报表
          </p>
          <button class="sbutton" @click="changeType">注册</button>
        </div>
        <div class="small-contain" key="smallContainLogin" v-else>
          <div class="stitle">已有账户?</div>
          <p class="scontent">欢迎回来！请登录继续管理您的财务报告</p>
          <button class="sbutton" @click="changeType">登录</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import axios from '../../utils/request';
import router from '~/routers';
import { ElMessage } from 'element-plus'


let isRegisteredLogin = false;
const apiUrl = import.meta.env.VITE_API_URL;
const isLogin = ref(true);
const emailError = ref(false);
const existed = ref(false);
const username = ref("");
const email = ref("");
const password = ref("");

const loginWithGitHub = () => {
  const providerId = 'github'; // 指定 GitHub 作为 OAuth 提供商
  const callbackURL = 'https://trans.dhr2333.cn/auth/github/token'; // 该路由负责获取后端传回的认证令牌和用户名，将其写入浏览器localstorage中

  // 创建一个隐藏的表单
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = apiUrl + '/_allauth/browser/v1/auth/provider/redirect';
  form.style.display = 'none';

  // 添加表单字段
  const providerInput = document.createElement('input');
  providerInput.type = 'hidden';
  providerInput.name = 'provider';
  providerInput.value = providerId;
  form.appendChild(providerInput);

  const callbackInput = document.createElement('input');
  callbackInput.type = 'hidden';
  callbackInput.name = 'callback_url';
  callbackInput.value = callbackURL;
  form.appendChild(callbackInput);

  const processInput = document.createElement('input');
  processInput.type = 'hidden';
  processInput.name = 'process';
  processInput.value = 'login'; // 或 'connect'
  form.appendChild(processInput);

  // 将表单添加到 body 并提交
  document.body.appendChild(form);
  form.submit();
};

// Google OAuth 登录逻辑
// const loginWithGoogle = () => {
//   const clientId = '27533849710-0ot3fj14f5vqkinena7is5ms08nfe2kl.apps.googleusercontent.com'; // 替换为你的Google客户端ID
//   const redirectUri = 'http://127.0.0.1:38001/accounts/google/login/callback/'; // 替换为你的回调URL
//   const scope = 'openid email profile'; // 请求的权限范围

//   // 生成一个随机的状态值
//   // const state = "111111111111111111" + Math.random().toString(36).substring(2); // 简单的随机字符串
//   // console.log(state);

//   // localStorage.setItem('oauth_state', state); // 存储状态值以便后续验证

//   // 构造Google OAuth授权URL
//   const authUrl = `https://accounts.google.com/o/oauth2/auth?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${encodeURIComponent(scope)}`;
//   // const authUrl = `http://127.0.0.1:8002/accounts/google/login/?process=login`;

//   // 重定向到Google登录页面
//   window.location.href = authUrl;
// };



function changeType() {
  isLogin.value = !isLogin.value;
  username.value = "";
  email.value = "";
  password.value = "";
  // password2.value = "!QAZse4rfv";
}

const login = async () => {
  if (username.value === "" || password.value === "") {
    ElMessage.error("用户名和密码不能为空");
    return
  }
  try {
    const res = await axios.post(apiUrl + '/_allauth/app/v1/auth/login', {
      username: username.value,
      password: password.value
    });

    const storage = localStorage;
    storage.setItem('access', res.data.meta.access_token);
    storage.setItem('username', res.data.data.user.username);

    if (!isRegisteredLogin) {
      ElMessage.success("登录成功");
    }
    router.push('file/')

  } catch (error) {
    console.log(error);

    ElMessage.error("用户名或密码错误");
  }
}

const register = async () => {
  try {
    const res = await axios.post(apiUrl + '/_allauth/app/v1/auth/signup', {
      username: username.value,
      password: password.value
    });

    if (res.status === 200 && res.data) {
      const storage = localStorage;
      storage.setItem('access', res.data.meta.access_token);
      storage.setItem('username', res.data.data.user.username);
      ElMessage.success("登录成功");
      router.push('/map/expenses/');
    } else {
      ElMessage.error('注册失败，请稍后再试。');
    }
  } catch (error) {
    if (error.response) {
      ElMessage.error(error.response.data.errors[0].message);
    } else {
      ElMessage.error('请求出错，请稍后再试。');
    }
  }
};

</script>

<style scoped="scoped">
.login-register {
  width: 100vw;
  height: 100vh;
  box-sizing: border-box;
}

.contain {
  width: 60%;
  height: 60%;
  position: relative;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: #fff;
  border-radius: 20px;
  box-shadow: 0 0 3px #f0f0f0, 0 0 6px #f0f0f0;
}

.big-box {
  width: 70%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 30%;
  transform: translateX(0%);
  transition: all 1s;
}

.big-contain {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.btitle {
  font-size: 1.5em;
  font-weight: bold;
  color: rgb(57, 167, 176);
}

.bform {
  width: 100%;
  height: 40%;
  padding: 2em 0;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  align-items: center;
}

.bform .errTips {
  display: block;
  width: 50%;
  text-align: left;
  color: red;
  font-size: 0.7em;
  margin-left: 1em;
}

.bform input {
  width: 50%;
  height: 30px;
  border: none;
  outline: none;
  border-radius: 10px;
  padding-left: 2em;
  background-color: #f0f0f0;
}

.bbutton {
  width: 20%;
  height: 40px;
  border-radius: 24px;
  border: none;
  outline: none;
  background-color: rgb(57, 167, 176);
  color: #fff;
  font-size: 0.9em;
  cursor: pointer;
}

.small-box {
  width: 30%;
  height: 100%;
  background: linear-gradient(135deg, rgb(57, 167, 176), rgb(56, 183, 145));
  position: absolute;
  top: 0;
  left: 0;
  transform: translateX(0%);
  transition: all 1s;
  border-top-left-radius: inherit;
  border-bottom-left-radius: inherit;
}

.small-contain {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.stitle {
  font-size: 1.5em;
  font-weight: bold;
  color: #fff;
}

.scontent {
  font-size: 0.8em;
  color: #fff;
  text-align: center;
  padding: 2em 4em;
  line-height: 1.7em;
}

.sbutton {
  width: 60%;
  height: 40px;
  border-radius: 24px;
  border: 1px solid #fff;
  outline: none;
  background-color: transparent;
  color: #fff;
  font-size: 0.9em;
  cursor: pointer;
}

.big-box.active {
  left: 0;
  transition: all 0.5s;
}

.small-box.active {
  left: 100%;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  border-top-right-radius: inherit;
  border-bottom-right-radius: inherit;
  transform: translateX(-100%);
  transition: all 1s;
}
</style>