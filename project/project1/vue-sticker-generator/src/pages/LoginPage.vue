<template>
  <div class="min-h-screen bg-background text-foreground">

    <main class="container mx-auto px-6 py-12 max-w-lg">
      <h1 class="mb-6 text-3xl font-bold text-primary">登录 / 注册</h1>
      <div class="glass-panel rounded-xl p-6 space-y-6">
        <div>
          <label class="mb-2 block text-sm font-medium text-primary/80">邮箱</label>
          <input v-model.trim="email" type="email" placeholder="you@example.com"
            class="w-full rounded-xl border border-primary/30 bg-input/50 px-4 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
        </div>
        <div>
          <label class="mb-2 block text-sm font-medium text-primary/80">密码</label>
          <input v-model.trim="password" type="password" placeholder="不少于6位"
            class="w-full rounded-xl border border-primary/30 bg-input/50 px-4 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
        </div>
        <div class="flex flex-col gap-3">
          <UiButton :disabled="loading" class="rounded-xl bg-gradient-to-r from-primary to-secondary font-bold tracking-wider" @click="doSignIn">
            邮箱密码登录
          </UiButton>
          <UiButton :disabled="loading" variant="outline" class="rounded-xl" @click="doSignUp">
            注册新账号
          </UiButton>
          <div class="text-center text-xs text-muted-foreground">或</div>
          <UiButton :disabled="loading || !email" variant="outline" class="rounded-xl" @click="doOtp">
            发送邮箱验证码登录链接
          </UiButton>
        </div>
        <p v-if="message" class="text-sm" :class="messageType === 'error' ? 'text-destructive' : 'text-primary'">{{ message }}</p>
        <div v-if="user" class="text-sm text-muted-foreground">已登录：{{ user.email }}</div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import UiButton from '@/components/UiButton.vue'
import { useSupabaseAuth } from '@/composables/useSupabaseAuth'

const router = useRouter()
const { user, loading, signInEmail, signUpEmail, signInOtp } = useSupabaseAuth()

const email = ref('')
const password = ref('')
const message = ref('')
const messageType = ref<'info' | 'error'>('info')

watchEffect(() => {
  if (user.value) {
    router.replace('/')
  }
})

async function doSignIn() {
  message.value = ''
  
  // 基本验证
  if (!email.value || !password.value) {
    message.value = '请输入邮箱和密码'
    messageType.value = 'error'
    return
  }
  
  if (password.value.length < 6) {
    message.value = '密码长度不能少于6位'
    messageType.value = 'error'
    return
  }
  
  try {
    const { error } = await signInEmail(email.value, password.value)
    if (error) {
      // 提供更友好的错误提示
      if (error.message.includes('Invalid login credentials')) {
        message.value = '邮箱或密码错误，请检查后重试'
      } else if (error.message.includes('Email not confirmed')) {
        message.value = '邮箱未验证，请先验证邮箱或使用邮箱验证码登录'
      } else {
        message.value = error.message
      }
      messageType.value = 'error'
    } else {
      message.value = '登录成功，正在跳转...'
      messageType.value = 'info'
      router.replace('/')
    }
  } catch (err) {
    message.value = '登录失败，请稍后重试'
    messageType.value = 'error'
  }
}

async function doSignUp() {
  message.value = ''
  
  // 基本验证
  if (!email.value || !password.value) {
    message.value = '请输入邮箱和密码'
    messageType.value = 'error'
    return
  }
  
  if (password.value.length < 6) {
    message.value = '密码长度不能少于6位'
    messageType.value = 'error'
    return
  }
  
  try {
    const { error } = await signUpEmail(email.value, password.value)
    if (error) {
      // 提供更友好的错误提示
      if (error.message.includes('User already registered')) {
        message.value = '该邮箱已注册，请直接登录'
      } else if (error.message.includes('weak_password')) {
        message.value = '密码强度不足，请使用更复杂的密码'
      } else {
        message.value = error.message
      }
      messageType.value = 'error'
    } else {
      message.value = '注册成功！系统已自动验证邮箱，您可以直接登录'
      messageType.value = 'info'
    }
  } catch (err) {
    message.value = '注册失败，请稍后重试'
    messageType.value = 'error'
  }
}

async function doOtp() {
  message.value = ''
  
  // 基本验证
  if (!email.value) {
    message.value = '请输入邮箱地址'
    messageType.value = 'error'
    return
  }
  
  try {
    const { error } = await signInOtp(email.value)
    if (error) {
      // 提供更友好的错误提示
      if (error.message.includes('rate limit')) {
        message.value = '发送频率过高，请稍后重试'
      } else {
        message.value = error.message
      }
      messageType.value = 'error'
    } else {
      message.value = '已发送登录链接到您的邮箱，请查收邮件并点击链接完成登录'
      messageType.value = 'info'
    }
  } catch (err) {
    message.value = '发送失败，请稍后重试'
    messageType.value = 'error'
  }
}
</script>
