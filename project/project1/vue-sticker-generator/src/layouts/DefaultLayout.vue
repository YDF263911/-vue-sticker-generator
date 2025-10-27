<template>
  <div class="min-h-screen bg-background text-foreground">
    <!-- 导航栏 -->
    <nav class="glass-panel sticky top-0 z-50 border-b border-primary/20">
      <div class="container mx-auto flex items-center justify-between px-6 py-4">
        <div class="flex items-center gap-3">
          <div class="h-8 w-8 rounded-lg bg-gradient-to-br from-primary via-primary to-secondary shadow-[0_0_15px_rgba(100,150,255,0.5)]" />
          <span class="text-2xl font-bold tracking-wide text-primary">贴纸工坊</span>
        </div>
        
        <div class="flex items-center gap-4">
          <RouterLink to="/" class="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
            生成器
          </RouterLink>
          <RouterLink to="/history" class="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
            历史记录
          </RouterLink>
          
          <!-- 登录状态显示 -->
          <div v-if="user" class="flex items-center gap-3">
            <span class="text-sm text-muted-foreground">{{ user.email }}</span>
            <UiButton variant="outline" size="sm" @click="doSignOut" class="rounded-xl">
              退出登录
            </UiButton>
          </div>
          <RouterLink v-else to="/login" class="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
            登录
          </RouterLink>
        </div>
      </div>
    </nav>

    <!-- 主要内容区域 -->
    <main>
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import UiButton from '@/components/UiButton.vue'
import { useSupabaseAuth } from '@/composables/useSupabaseAuth'

const { user, signOut } = useSupabaseAuth()

async function doSignOut() {
  await signOut()
}
</script>