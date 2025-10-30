import { createRouter, createWebHistory } from 'vue-router'

// 引入组件
import Trans from "./components/trans/Trans.vue"
import Format from "./components/map/Format.vue"
import FileManage from "./components/file/FileManage.vue"
import AccountManagement from "./components/config/AccountManagement.vue"
import TagManagement from "./components/config/TagManagement.vue"
import MappingManagement from "./components/map/MappingManagement.vue"
import ApiTest from "./components/debug/ApiTest.vue"
import AccountSelectorTest from "./components/debug/AccountSelectorTest.vue"
import Login from "./views/login/index.vue"
import PhoneBinding from "./views/phone-binding/index.vue"
import Settings from "./views/settings/index.vue"
import AuthenticateByGithubToken from './components/GitHubCallback.vue';
// 模板管理
import AccountTemplates from "./components/template/AccountTemplates.vue"
import MappingTemplates from "./components/template/MappingTemplates.vue"

// 配置路由
const router = createRouter({
  // 内部提供了 history 模式的实现。为了简单起见，我们在这里使用 hash 模式。
  history: createWebHistory(),
  routes: [
    { path: '',name:"index", component: Trans },
    { path: '/auth/github/token', component: AuthenticateByGithubToken },
    { path: '/trans',name:"trans", component: Trans },
    { path: '/format',name:"format", component: Format },
    { path: '/file',name:"filemanage", component: FileManage },
    { path: '/config/accounts', name: "accountManagement", component: AccountManagement },
    { path: '/config/tags', name: "tagManagement", component: TagManagement },
    { path: '/config/mappings', name: "mappingManagement", component: MappingManagement },
    // 模板管理
    { path: '/template/accounts', name: "accountTemplates", component: AccountTemplates },
    { path: '/template/mappings', name: "mappingTemplates", component: MappingTemplates },
    { path: '/debug/api', name: "apiTest", component: ApiTest },
    { path: '/debug/account-selector', name: "accountSelectorTest", component: AccountSelectorTest },
    { path: '/login', name: "login", component: Login },
    { path: '/phone-binding', name: "phoneBinding", component: PhoneBinding },
    { path: '/settings', name: "settings", component: Settings },
  ]
})

// 路由守卫：检查手机号绑定状态
router.beforeEach(async (to, from, next) => {
  const token = localStorage.getItem('access');
  const username = localStorage.getItem('username');
  
  // 如果是登录页面、手机号绑定页面或OAuth回调页面，直接放行
  if (to.path === '/login' || to.path === '/phone-binding' || to.path === '/auth/github/token' || to.path === '/') {
    // 如果已登录且访问首页，检查是否需要绑定手机号
    if (token && username && to.path === '/') {
      try {
        const axios = (await import('./utils/request')).default;
        await axios.get(import.meta.env.VITE_API_URL + '/auth/profile/me/');
        // 如果成功，说明已绑定手机号，可以继续
        next();
      } catch (error: any) {
        // 如果是403错误，跳转到手机号绑定页面
        if (error.response?.status === 403) {
          next('/phone-binding');
        } else {
          next();
        }
      }
    } else {
      // 匿名用户或未登录用户，允许访问（用于访问admin用户数据）
      next();
    }
    return;
  }
  
  // 如果没有token，允许匿名访问（用于访问admin用户数据）
  if (!token || !username) {
    // 匿名用户允许访问，后端会返回id=1用户的数据
    next();
    return;
  }
  
  // 对于需要认证的页面，检查手机号绑定状态
  try {
    const axios = (await import('./utils/request')).default;
    await axios.get(import.meta.env.VITE_API_URL + '/auth/profile/me/');
    // 如果成功，说明已绑定手机号，可以继续
    next();
  } catch (error: any) {
    // 如果是403错误，跳转到手机号绑定页面
    if (error.response?.status === 403 && error.response?.data?.code === 'PHONE_NUMBER_REQUIRED') {
      // 保存当前路径
      sessionStorage.setItem('redirectAfterPhoneBinding', to.fullPath);
      next('/phone-binding');
    } else {
      // 其他错误（如401），跳转到登录页面
      next('/login');
    }
  }
})

export default router
