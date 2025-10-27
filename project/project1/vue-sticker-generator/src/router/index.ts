import type { RouteRecordRaw } from 'vue-router'
import GeneratorPage from '@/pages/GeneratorPage.vue'
import HistoryPage from '@/pages/HistoryPage.vue'

import LoginPage from '@/pages/LoginPage.vue'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'generator', component: GeneratorPage },
  { path: '/history', name: 'history', component: HistoryPage },
  { path: '/login', name: 'login', component: LoginPage },
]

export default routes
