import { createRouter, createWebHistory } from 'vue-router'

// 引入组件
// import Test from "./components/layouts/Test.vue"
import Trans from "./components/trans/Trans.vue"
import Income from "./components/map/Income.vue"
import Expense from "./components/map/Expense.vue"
import Payee from "./components/map/Payee.vue"
import Event from "./components/bill/Event.vue"
import Commodity from "./components/bill/Commodity.vue"
import Account from "./components/assets/Account.vue"
// import Home from "./components/HelloWorld.vue"
import Login from "./views/login/index.vue"
// import News from "./components/Test_News.vue"
// import User from "./components/Test_User.vue"
// import NewsContent from "./components/Test_NewsContent.vue"

// 配置路由
const router = createRouter({
  // 4. 内部提供了 history 模式的实现。为了简单起见，我们在这里使用 hash 模式。
  // history: createWebHashHistory(),
  history: createWebHistory(),
  routes: [
    { path: '',name:"index", component: Login },
    // { path: '/', name:"home",component: Home },
    // { path: '/test',name:"test", component: Test },
    { path: '/trans',name:"trans", component: Trans },
    { path: '/map/income',name:"income", component: Income },
    { path: '/map/expense',name:"expense", component: Expense },
    { path: '/map/payee',name:"payee", component: Payee },
    { path: '/bill/event',name:"event", component: Event },
    { path: '/bill/commodity',name:"commodity", component: Commodity },
    { path: '/assets/account', name: "account", component: Account },
    { path: '/login', name: "login", component: Login },
    // { path: '/user', component: User },
    // { path: '/newscontent/:aid', component: NewsContent },
  ]
  // `routes: routes` 的缩写
})

export default router