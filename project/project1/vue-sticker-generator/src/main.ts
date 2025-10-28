import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import './assets/globals.css'
import routes from './router'

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    // 极简且稳妥的滚动行为，避免 el 选择器导致的 getBoundingClientRect 调用
    if (savedPosition) return savedPosition
    return { left: 0, top: 0, behavior: 'auto' }
  }
})

createApp(App).use(router).mount('#app')
