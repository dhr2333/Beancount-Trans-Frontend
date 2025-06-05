import { createRouter, createWebHistory } from 'vue-router'

// 引入组件
import Trans from "./components/trans/Trans.vue"
import Format from "./components/map/Format.vue"
import Assets from "./components/map/Assets.vue"
import Expenses from "./components/map/Expenses.vue"
import Income from "./components/map/Income.vue"
import Event from "./components/bill/Event.vue"
import Commodity from "./components/bill/Commodity.vue"
import BillAccount from "./components/bill/Account.vue"
import Account from "./components/assets/Account.vue"
import FileManage from "./components/file/FileManage.vue"
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
    { path: '/map/assets',name:"assets", component: Assets },
    { path: '/map/expenses',name:"expenses", component: Expenses },
    { path: '/map/income',name:"income", component: Income },
    { path: '/bill/account',name:"billaccount", component: BillAccount },
    { path: '/bill/event',name:"event", component: Event },
    { path: '/bill/commodity',name:"commodity", component: Commodity },
    { path: '/file',name:"filemanage", component: FileManage },
    { path: '/assets/account', name: "account", component: Account },
    { path: '/login', name: "login", component: Login },
    { path: '/owntracks/show_dates', name: "showdates", component: ShowDates },
  ]
})

export default router