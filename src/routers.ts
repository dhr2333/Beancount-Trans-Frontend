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
  ]
})

export default router