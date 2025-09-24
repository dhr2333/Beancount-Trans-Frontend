import { createRouter, createWebHistory } from 'vue-router'

// 引入组件
import Trans from "./components/trans/Trans.vue"
import Format from "./components/map/Format.vue"
import Templates from "./components/map/Templates.vue"
import Assets from "./components/map/Assets.vue"
import Expenses from "./components/map/Expenses.vue"
import Income from "./components/map/Income.vue"
import FileManage from "./components/file/FileManage.vue"
import AccountManagement from "./components/config/AccountManagement.vue"
import Login from "./views/login/index.vue"
import ShowDates from "./components/owntracks/show_log_dates.vue"
import AuthenticateByGithubToken from './components/GitHubCallback.vue';

// 配置路由
const router = createRouter({
  // 内部提供了 history 模式的实现。为了简单起见，我们在这里使用 hash 模式。
  history: createWebHistory(),
  routes: [
    { path: '',name:"index", component: Trans },
    { path: '/auth/github/token', component: AuthenticateByGithubToken },
    { path: '/trans',name:"trans", component: Trans },
    { path: '/format',name:"format", component: Format },
    { path: '/map/templates',name:"templates", component: Templates },
    { path: '/map/assets',name:"assets", component: Assets },
    { path: '/map/expenses',name:"expenses", component: Expenses },
    { path: '/map/income',name:"income", component: Income },
    { path: '/file',name:"filemanage", component: FileManage },
    { path: '/config/accounts', name: "accountManagement", component: AccountManagement },
    { path: '/login', name: "login", component: Login },
    { path: '/owntracks/show_dates', name: "showdates", component: ShowDates },
  ]
})

export default router