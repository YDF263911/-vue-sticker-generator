<template>
  <div class="min-h-screen bg-background text-foreground">

    <main class="container mx-auto px-6 py-12">
      <div class="mb-12 text-center">
        <h1 class="mb-4 bg-gradient-to-r from-primary via-primary to-secondary bg-clip-text text-4xl font-bold tracking-tight text-transparent md:text-5xl lg:text-6xl">
          打造你的数字徽章
        </h1>
        <p class="text-base text-muted-foreground md:text-lg">指挥AI，实现你的创意。</p>
      </div>

      <div class="mx-auto max-w-4xl">
        <div class="glass-panel mb-8 rounded-xl p-6 shadow-[0_0_40px_rgba(100,150,255,0.15)]">
          <div class="mb-6 flex flex-col gap-6 md:flex-row">
            <div class="flex-1">
              <label class="mb-2 block text-sm font-medium text-primary/80">描述你的创意</label>
              <textarea
                v-model.trim="prompt"
                placeholder="例如：一只发光的赛博狐狸..."
                class="w-full resize-none rounded-xl border border-primary/30 bg-input/50 px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                rows="4"
                :disabled="state === 'loading'"
              />
              
              <!-- 提示词库 -->
              <div class="mt-3">
                <p class="mb-2 text-xs text-muted-foreground">快速选择灵感：</p>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="preset in presetPrompts"
                    :key="preset"
                    @click="prompt = preset"
                    :disabled="state === 'loading'"
                    class="rounded-lg border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary transition-all hover:bg-primary/20 hover:shadow-sm disabled:opacity-50"
                  >
                    {{ preset }}
                  </button>
                </div>
              </div>
            </div>
            <div class="flex flex-col items-center justify-center gap-4">
              <div>
                <label class="mb-2 block text-sm font-medium text-primary/80">选择风格</label>
                <select
                  v-model="selectedStyle"
                  :disabled="state === 'loading'"
                  class="w-48 rounded-xl border border-primary/30 bg-input/50 px-4 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                >
                  <option v-for="style in styleOptions" :key="style" :value="style">
                    {{ styleLabels[style] }}
                  </option>
                </select>
              </div>
              <div>
                <label class="mb-2 block text-sm font-medium text-primary/80">生成数量</label>
                <div class="flex gap-2">
                  <button
                    v-for="option in quantityOptions"
                    :key="option.value"
                    @click="selectedQuantity = option.value"
                    :disabled="state === 'loading'"
                    :class="[
                      'rounded-xl border px-4 py-2 text-sm font-medium transition-all',
                      selectedQuantity === option.value
                        ? 'border-primary bg-primary text-white shadow-sm'
                        : 'border-primary/30 bg-input/50 text-foreground hover:border-primary/50'
                    ]"
                  >
                    {{ option.label }}
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div class="mb-6">
            <label class="mb-2 block text-sm font-medium text-primary/80">
              负面提示词（可选）
            </label>
            <input
              v-model.trim="negativePrompt"
              placeholder="如：不要文字、不要水印、背景不要太乱"
              class="w-full rounded-xl border border-primary/30 bg-input/50 px-4 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              :disabled="state === 'loading'"
            />
            <p class="mt-1 text-xs text-muted-foreground">
              输入不希望出现在贴纸中的内容
            </p>
            
            <!-- 提示词优化建议 -->
            <div class="mt-3 rounded-lg bg-blue-50 p-3 border border-blue-200">
              <p class="text-xs font-medium text-blue-800 mb-2">💡 提示词优化建议：</p>
              <ul class="text-xs text-blue-700 space-y-1">
                <li>• 使用具体描述："可爱的卡通猫咪" 比 "猫" 更好</li>
                <li>• 指定风格："赛博朋克风格机器人"</li>
                <li>• 描述动作/状态："微笑的太阳"、"飞翔的龙"</li>
                <li>• 避免复杂场景：专注于单一主体</li>
              </ul>
            </div>
          </div>
          <!-- 消息提示 -->
          <div v-if="message" class="mb-4">
            <div 
              :class="[
                'rounded-lg p-3 text-sm font-medium',
                messageType === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
                messageType === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
                'bg-blue-100 text-blue-800 border border-blue-200'
              ]"
            >
              {{ message }}
            </div>
          </div>
          
          <div class="flex flex-col gap-4 sm:flex-row">
            <UiButton
              @click="handleGenerate"
              :disabled="state === 'loading' || !prompt"
              class="flex-1 rounded-xl bg-gradient-to-r from-primary to-secondary text-sm font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(100,150,255,0.4)] transition-all hover:shadow-[0_0_30px_rgba(100,150,255,0.6)] disabled:opacity-50 disabled:shadow-none"
              size="lg"
            >
              <template v-if="state === 'loading'">
                <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                生成中...
              </template>
              <template v-else>生成贴纸</template>
            </UiButton>
            <UiButton
              @click="handleReset"
              variant="outline"
              class="rounded-xl text-sm font-bold uppercase tracking-wider"
            >
              清空
            </UiButton>
          </div>
        </div>

        <div class="holographic-panel relative min-h-[400px] overflow-hidden rounded-xl p-6 shadow-[0_0_40px_rgba(100,150,255,0.15)]">
          <div v-if="state === 'idle'" class="flex h-full min-h-[300px] flex-col items-center justify-center">
            <div class="relative h-48 w-48">
              <div class="absolute inset-0 animate-[grid-fade_2s_ease-in-out_infinite] bg-[linear-gradient(0deg,transparent_24%,rgba(100,150,255,0.25)_25%,rgba(100,150,255,0.25)_26%,transparent_27%,transparent_74%,rgba(100,150,255,0.25)_75%,rgba(100,150,255,0.25)_76%,transparent_77%,transparent),linear-gradient(90deg,transparent_24%,rgba(100,150,255,0.25)_25%,rgba(100,150,255,0.25)_26%,transparent_27%,transparent_74%,rgba(100,150,255,0.25)_75%,rgba(100,150,255,0.25)_76%,transparent_77%,transparent)] bg-[size:40px_40px]" />
            </div>
            <p class="mt-6 text-lg font-bold tracking-wider text-primary/80">等待输入...</p>
            <p class="mt-2 text-sm text-muted-foreground">输入描述并选择风格开始生成</p>
          </div>

          <div v-else-if="state === 'loading'" class="flex h-full min-h-[300px] flex-col items-center justify-center">
            <div class="relative h-48 w-48">
              <div class="absolute inset-0 bg-[linear-gradient(0deg,transparent_24%,rgba(100,150,255,0.25)_25%,rgba(100,150,255,0.25)_26%,transparent_27%,transparent_74%,rgba(100,150,255,0.25)_75%,rgba(100,150,255,0.25)_76%,transparent_77%,transparent),linear-gradient(90deg,transparent_24%,rgba(100,150,255,0.25)_25%,rgba(100,150,255,0.25)_26%,transparent_27%,transparent_74%,rgba(100,150,255,0.25)_75%,rgba(100,150,255,0.25)_76%,transparent_77%,transparent)] bg-[size:40px_40px]" />
              <div class="absolute inset-0 animate-[scan-line_2s_linear_infinite] bg-gradient-to-b from-transparent via-primary/40 to-transparent" />
            </div>
            <p class="mt-6 animate-[neon-pulse_1.5s_ease-in-out_infinite] text-lg font-bold tracking-wider text-primary">
              矩阵合成进行中...
            </p>
            <p class="mt-2 text-sm text-muted-foreground">这可能需要一些时间</p>
          </div>

          <div v-else-if="state === 'success' && generatedImages.length > 0" class="flex flex-col items-center justify-center py-6">
            <div class="mb-6 text-center">
              <h3 class="text-xl font-bold text-primary">生成完成！</h3>
              <p class="text-sm text-muted-foreground">你的数字徽章已打造完成</p>
            </div>
            
            <!-- 多张图片显示 -->
            <div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2" :class="{ 'lg:grid-cols-4': generatedImages.length === 4, 'lg:grid-cols-2': generatedImages.length === 2 }">
              <div 
                v-for="(image, index) in generatedImages" 
                :key="index"
                class="group relative overflow-hidden rounded-xl border-2 border-primary/30 shadow-[0_0_20px_rgba(100,150,255,0.2)] transition-all hover:shadow-[0_0_30px_rgba(100,150,255,0.4)]"
              >
                <img 
                  :src="image" 
                  :alt="`Generated sticker ${index + 1}`" 
                  class="h-auto w-full" 
                  @load="onImageLoad"
                  @error="onImageError"
                />
                <div class="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-1 text-xs text-white">
                  {{ index + 1 }}
                </div>
                
                <!-- 图片操作按钮 -->
                <div class="absolute top-2 right-2 flex gap-2 opacity-0 transition-all group-hover:opacity-100">
                  <button
                    @click="copyImageToClipboard(image)"
                    class="rounded-full bg-white/90 p-2 text-primary shadow-sm transition-all hover:bg-white hover:shadow-md"
                    title="复制到剪贴板"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>
                  <button
                    @click="regenerateSingleImage(index)"
                    class="rounded-full bg-white/90 p-2 text-primary shadow-sm transition-all hover:bg-white hover:shadow-md"
                    title="重新生成此贴纸"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                      <path d="M3 3v5h5"></path>
                      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
                      <path d="M16 16h5v5"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            <div class="flex flex-wrap gap-3 justify-center">
              <UiButton @click="handleDownloadAll" class="rounded-xl bg-gradient-to-r from-primary to-secondary text-sm font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(100,150,255,0.4)] hover:shadow-[0_0_30px_rgba(100,150,255,0.6)]">
                下载全部
              </UiButton>
              <UiButton @click="handleDownload" class="rounded-xl bg-primary/10 text-primary text-sm font-bold uppercase tracking-wider border border-primary/30 hover:bg-primary/20">
                选择下载
              </UiButton>
              <UiButton variant="outline" @click="handleReset" class="rounded-xl text-sm font-bold uppercase tracking-wider">
                继续创作
              </UiButton>
            </div>
          </div>

          <div v-else-if="state === 'error'" class="flex h-full min-h-[300px] flex-col items-center justify-center">
            <div class="mb-4 rounded-full bg-destructive/20 p-4">
              <div class="h-8 w-8 rounded-full bg-destructive"></div>
            </div>
            <p class="text-lg font-bold tracking-wider text-destructive">合成失败</p>
            <p class="mt-2 text-sm text-muted-foreground">请优化你的描述并重试</p>
            <UiButton @click="handleReset" class="mt-4 rounded-xl bg-gradient-to-r from-primary to-secondary text-sm font-bold uppercase tracking-wider">重试</UiButton>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { RouterLink } from 'vue-router'
import UiButton from '@/components/UiButton.vue'
import { Loader2 } from 'lucide-vue-next'
import { generateSticker } from '@/utils/ai-service'
import { saveStickerToHistory } from '@/utils/supabase'

type GenerationState = 'idle' | 'loading' | 'success' | 'error'

type StyleOption = 'CARTOON' | 'REALISTIC' | 'WATERCOLOR' | 'CYBERPUNK' | 'ANIME' | 'MINIMALIST' | 'VINTAGE' | 'FUTURISTIC' | 'BIO-ORGANIC' | 'RETRO-WAVE'

type QuantityOption = 1 | 2 | 4

const prompt = ref('')
const state = ref<GenerationState>('idle')
const generatedImages = ref<string[]>([])
const selectedStyle = ref<StyleOption>('CARTOON')
const selectedQuantity = ref<QuantityOption>(1)
const negativePrompt = ref('')
const errorMessage = ref<string>('')
const message = ref<string>('')
const messageType = ref<'success' | 'error' | 'info'>('info')

// 预设提示词库
const presetPrompts = [
  '可爱猫咪宇航员',
  '流泪面包卡通',
  '赛博朋克狐狸',
  '水彩风格独角兽',
  '复古机器人',
  '极简风格月亮',
  '动漫风格龙猫',
  '未来主义城市',
  '生物有机蘑菇',
  '复古浪潮海豚'
]

const quantityOptions = [
  { value: 1, label: '1张' },
  { value: 2, label: '2张' },
  { value: 4, label: '4张' }
]

const styleOptions: StyleOption[] = [
  'CARTOON', 'REALISTIC', 'WATERCOLOR', 'CYBERPUNK', 
  'ANIME', 'MINIMALIST', 'VINTAGE', 'FUTURISTIC',
  'BIO-ORGANIC', 'RETRO-WAVE'
]

const styleLabels = {
  'CARTOON': '卡通风格',
  'REALISTIC': '写实风格', 
  'WATERCOLOR': '水彩风格',
  'CYBERPUNK': '赛博朋克',
  'ANIME': '动漫风格',
  'MINIMALIST': '极简风格',
  'VINTAGE': '复古风格',
  'FUTURISTIC': '未来主义',
  'BIO-ORGANIC': '生物有机',
  'RETRO-WAVE': '复古浪潮'
}

async function handleGenerate() {
  if (!prompt.value.trim()) return
  
  state.value = 'loading'
  generatedImages.value = []
  errorMessage.value = ''
  
  try {
    const results = []
    
    // 根据选择的数量生成多张贴纸
    for (let i = 0; i < selectedQuantity.value; i++) {
      const result = await generateSticker({
        prompt: prompt.value,
        style: selectedStyle.value,
        negativePrompt: negativePrompt.value,
        num_outputs: 1 // 每次生成1张，通过循环实现多张
      })
      
      if (result.success && result.imageUrl) {
        results.push(result.imageUrl)
      } else {
        throw new Error(result.error || 'Generation failed')
      }
    }
    
    if (results.length > 0) {
      generatedImages.value = results
      state.value = 'success'
      
      // 保存所有图片到历史记录
      for (const imageUrl of results) {
        await saveStickerToHistory({
          prompt: prompt.value,
          style: selectedStyle.value,
          image_url: imageUrl
        })
      }
    } else {
      state.value = 'error'
      errorMessage.value = '生成失败，请重试'
    }
  } catch (error) {
    state.value = 'error'
    errorMessage.value = error.message || '生成过程中出现错误'
    console.error('Generation error:', error)
  }
}

function handleReset() {
  state.value = 'idle'
  generatedImages.value = []
  prompt.value = ''
  negativePrompt.value = ''
  errorMessage.value = ''
}

function handleDownload() {
  if (generatedImages.value.length > 0) {
    // 让用户选择下载哪张图片
    const index = window.prompt(`请输入要下载的图片编号 (1-${generatedImages.value.length}):`)
    if (index && index >= 1 && index <= generatedImages.value.length) {
      nextTick(() => {
        const link = document.createElement('a')
        link.href = generatedImages.value[index - 1]
        link.download = `sticker-${Date.now()}-${index}.png`
        link.click()
      })
    }
  }
}

function handleDownloadAll() {
  if (generatedImages.value.length > 0) {
    // 下载所有图片
    nextTick(() => {
      generatedImages.value.forEach((image, index) => {
        const link = document.createElement('a')
        link.href = image
        link.download = `sticker-${Date.now()}-${index + 1}.png`
        link.click()
      })
    })
  }
}

// 复制图片到剪贴板
async function copyImageToClipboard(imageUrl: string) {
  try {
    // 获取图片数据
    const response = await fetch(imageUrl)
    const blob = await response.blob()
    
    // 创建ClipboardItem
    const clipboardItem = new ClipboardItem({
      'image/png': blob
    })
    
    // 写入剪贴板
    await navigator.clipboard.write([clipboardItem])
    
    // 显示成功提示
    showMessage('贴纸已复制到剪贴板！', 'success')
  } catch (error) {
    console.error('复制失败:', error)
    showMessage('复制失败，请尝试下载功能', 'error')
  }
}

// 重新生成单张图片
async function regenerateSingleImage(index: number) {
  if (!prompt.value.trim()) return
  
  const originalState = state.value
  state.value = 'loading'
  
  try {
    const result = await generateSticker({
      prompt: prompt.value,
      style: selectedStyle.value,
      negativePrompt: negativePrompt.value,
      num_outputs: 1
    })
    
    if (result.success && result.imageUrl) {
      // 替换指定索引的图片
      const newImages = [...generatedImages.value]
      newImages[index] = result.imageUrl
      generatedImages.value = newImages
      
      // 保存到历史记录
      await saveStickerToHistory({
        prompt: prompt.value,
        style: selectedStyle.value,
        image_url: result.imageUrl
      })
      
      showMessage('贴纸重新生成成功！', 'success')
    } else {
      showMessage('重新生成失败，请重试', 'error')
    }
  } catch (error) {
    console.error('重新生成错误:', error)
    showMessage('重新生成过程中出现错误', 'error')
  } finally {
    state.value = originalState
  }
}

// 显示消息提示
function showMessage(text: string, type: 'success' | 'error' | 'info' = 'info') {
  message.value = text
  messageType.value = type
  
  // 3秒后自动清除消息
  setTimeout(() => {
    if (message.value === text) {
      message.value = ''
      messageType.value = 'info'
    }
  }, 3000)
}

function onImageLoad() {
  console.log('图片加载成功')
}

function onImageError() {
  console.error('图片加载失败')
  state.value = 'error'
  errorMessage.value = '图片加载失败，请重试'
}


</script>
