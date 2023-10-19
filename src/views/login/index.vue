
<template>
  <div class="login-register">
    <div class="contain">
      <div class="big-box" :class="{ active: isLogin }">
        <div class="big-contain" key="bigContainLogin" v-if="isLogin">
          <div class="btitle">账户登录</div>
          <div class="bform">
            <input type="username" placeholder="用户名" v-model="username1" />
            <span class="errTips" v-if="emailError">* 用户名无效 *</span>
            <input type="password" placeholder="密码" v-model="password" />
            <span class="errTips" v-if="emailError">* 密码填写错误 *</span>
          </div>
          <button class="bbutton" @click="login">登录</button>
        </div>
        <div class="big-contain" key="bigContainRegister" v-else>
          <div class="btitle">创建账户</div>
          <div class="bform">
            <input type="text" placeholder="用户名" v-model="username1" />
            <span class="errTips" v-if="existed">* 用户名已经存在！ *</span>
            <input type="email" placeholder="邮箱" v-model="useremail" />
            <input type="password" placeholder="密码" v-model="password" />
          </div>
          <button class="bbutton" @click="register">注册</button>
        </div>
      </div>
      <div class="small-box" :class="{ active: isLogin }">
        <div class="small-contain" key="smallContainRegister" v-if="isLogin">
          <div class="stitle">你好，朋友!</div>
          <p class="scontent">开始注册，和我们一起旅行</p>
          <button class="sbutton" @click="changeType">注册</button>
        </div>
        <div class="small-contain" key="smallContainLogin" v-else>
          <div class="stitle">欢迎回来!</div>
          <p class="scontent">与我们保持联系，请登录你的账户</p>
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
import jwt_decode from 'jwt-decode';
import username from '../../components/layouts/BaseHeader.vue';
//  as headerUsername from '../../components/layouts/BaseHeader.vue'


const apiUrl = import.meta.env.VITE_API_URL;
const isLogin = ref(true);
const emailError = ref(false);
const passwordError = ref(false);
const existed = ref(false);
const username1 = ref("");
const useremail = ref("");
const password = ref("");
console.log(apiUrl);


function changeType() {
  isLogin.value = !isLogin.value;
  username1.value = "";
  useremail.value = "";
  password.value = "";
}
const login = async () => {
  if (username1.value != "" && password.value != "") {
    try {
      const res = await axios.post(apiUrl + 'token/', {
        username: username1.value,
        password: password.value
      });

      const storage = localStorage;
      const token = res.data.access;
      console.log(res.data);
      storage.setItem('token', res.data.access);
      console.log(jwt_decode(token));
      storage.setItem('refresh', res.data.refresh);
      storage.setItem('iat', jwt_decode(token).iat);
      storage.setItem('exp', jwt_decode(token).exp);
      storage.setItem('username', username1.value);
      username.value = username1.value;
      const test = localStorage.getItem('username');
      if (test) {
        router.push('/map/expenses/')
        username.value = username1.value;
        // window.location.reload();
      }
      // test.value = username.value;
    } catch (error) {
      console.log(error);
    }
  }
}
const register = () => {

}

// function login() {
//   console.log(self);
//   // const self = this;
//   // console.log(self.$axios.dispatch('login'));
//   if (username.value != "" && password.value != "") {
//     self.$axios({
//       method: "post",
//       url: "http://localhost:8002/api/token/",
//       data: {
//         username: username.value,
//         password: password.value,
//       },
//     })
//       .then((res) => {
//         const storage = localStorage;
//         const expiredTime = Date.parse(res.headers.date) + 60000;
//         console.log(res.data);
//         storage.setItem("token", res.data.access);
//         storage.setItem("refresh", res.data.refresh);
//         storage.setItem("expiredTime", expiredTime);
//         storage.setItem("username", this.signinName);
//         this.$router.push("/expense/");
//       });
//   }
// }
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