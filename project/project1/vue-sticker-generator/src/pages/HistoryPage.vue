<template>
  <div class="min-h-screen bg-background text-foreground">

    <main class="container mx-auto px-6 py-16">
      <div class="mb-16 text-center">
        <h1 class="mb-4 bg-gradient-to-r from-primary via-primary to-secondary bg-clip-text text-5xl font-bold tracking-tight text-transparent md:text-6xl lg:text-7xl">
          历史创作
        </h1>
        <p class="text-lg text-muted-foreground md:text-xl">你的数字艺术品库</p>
      </div>

      <!-- 分类筛选器 -->
      <div v-if="stickers.length > 0" class="mb-12">
        <div class="flex flex-wrap items-center justify-center gap-4">
          <UiButton 
            @click="setActiveCategory('all')"
            :variant="activeCategory === 'all' ? 'default' : 'outline'"
            class="rounded-lg font-semibold transition-all"
          >
            <Grid3x3 class="mr-2 h-4 w-4" />
            全部 ({{ stickers.length }})
          </UiButton>
          
          <UiButton 
            v-for="category in categories" 
            :key="category.id"
            @click="setActiveCategory(category.id)"
            :variant="activeCategory === category.id ? 'default' : 'outline'"
            class="rounded-lg font-semibold transition-all"
          >
            <component :is="category.icon" class="mr-2 h-4 w-4" />
            {{ category.name }} ({{ getCategoryCount(category.id) }})
          </UiButton>
        </div>
      </div>

      <div v-if="stickers.length === 0" class="holographic-panel flex min-h-[500px] flex-col items-center justify-center rounded-xl p-10 shadow-[0_0_40px_rgba(100,150,255,0.15)]">
        <div class="mb-8 opacity-30">
          <ImageOff class="h-32 w-32 text-primary" :stroke-width="1" />
        </div>
        <p class="text-2xl font-bold tracking-wider text-primary/80">暂无创作记录</p>
        <p class="mt-4 text-muted-foreground">你生成的贴纸将在这里显示</p>
        <RouterLink to="/">
          <UiButton class="mt-8 rounded-xl bg-gradient-to-r from-primary to-secondary font-bold uppercase tracking-wider shadow-[0_0_25px_rgba(100,150,255,0.4)] hover:shadow-[0_0_35px_rgba(100,150,255,0.6)]" size="lg">
            创建第一个贴纸
          </UiButton>
        </RouterLink>
      </div>

      <!-- 分类显示贴纸 -->
      <div v-else>
        <div v-for="category in filteredCategories" :key="category.id" class="mb-16">
          <!-- 分类标题 -->
          <div class="mb-8 flex items-center gap-3 border-b border-primary/20 pb-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20">
              <component :is="category.icon" class="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 class="text-3xl font-bold text-primary">{{ category.name }}</h2>
              <p class="text-muted-foreground">{{ category.description }}</p>
            </div>
            <span class="ml-auto rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
              {{ getCategoryStickers(category.id).length }} 个项目
            </span>
          </div>

          <!-- 贴纸网格 -->
          <div class="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div
              v-for="sticker in getCategoryStickers(category.id)"
              :key="sticker.id"
              class="holographic-panel group relative overflow-hidden rounded-xl p-6 shadow-[0_0_40px_rgba(100,150,255,0.15)] transition-all hover:shadow-[0_0_50px_rgba(100,150,255,0.25)]"
            >
              <div class="relative mb-4 overflow-hidden rounded-lg border border-primary/30 shadow-[0_0_30px_rgba(100,150,255,0.2)] transition-all group-hover:border-primary/50 group-hover:shadow-[0_0_40px_rgba(100,150,255,0.3)]">
                <img :src="sticker.imageUrl" :alt="sticker.prompt" class="h-auto w-full transition-transform duration-300 group-hover:scale-105" />
                <div class="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </div>

              <div class="mb-4 space-y-2">
                <p class="line-clamp-2 text-sm text-foreground">{{ sticker.prompt }}</p>
                <div class="flex items-center gap-2">
                  <span class="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {{ sticker.style }}
                  </span>
                  <span class="rounded-md border border-secondary/20 bg-secondary/10 px-2 py-0.5 text-xs font-semibold text-secondary">
                    {{ getStickerCategory(sticker) }}
                  </span>
                </div>
              </div>

              <UiButton @click="handleDelete(sticker.id)" variant="outline" size="sm" class="w-full rounded-lg border-destructive/30 bg-transparent font-bold uppercase tracking-wider text-destructive transition-all hover:border-destructive hover:bg-destructive/10 hover:shadow-[0_0_20px_rgba(255,100,100,0.3)]">
                <Trash2 class="mr-2 h-4 w-4" />
                删除
              </UiButton>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { RouterLink } from 'vue-router'
import UiButton from '@/components/UiButton.vue'
import { Trash2, ImageOff, Grid3x3, PawPrint, Leaf, Apple, Box, Sparkles, Cpu, Loader } from 'lucide-vue-next'
import { getStickerHistory, getStickerHistoryByCategory, deleteStickerFromHistory, StickerRecord } from '@/utils/supabase'

interface StickerItem {
  id: string
  imageUrl: string
  prompt: string
  style: string
  createdAt: Date
  category?: string // 预计算分类
}

interface Category {
  id: string
  name: string
  icon: any
  description: string
  keywords: string[]
}

const stickers = ref<StickerItem[]>([])
const isLoading = ref(true)
const activeCategory = ref('all')
const imageLoadingStates = ref<Record<string, boolean>>({})

// 分类定义
const categories: Category[] = [
  {
    id: 'animals',
    name: '动物',
    icon: PawPrint,
    description: '各种可爱的动物贴纸',
    keywords: ['猫', '狗', '龙', '鸟', '鱼', '熊', '兔', '鹿', 'animal', 'cat', 'dog', 'puppy', 'kitten', 'dragon', 'bird', 'fish', 'bear', 'rabbit', 'deer']
  },
  {
    id: 'nature',
    name: '自然',
    icon: Leaf,
    description: '植物、花卉和自然元素',
    keywords: ['花', '树', '星', '月', '云', '太阳', 'flower', 'tree', 'star', 'moon', 'cloud', 'sun', 'plant', 'nature', 'leaf']
  },
  {
    id: 'food',
    name: '食物',
    icon: Apple,
    description: '水果、食物和饮料',
    keywords: ['苹果', '香蕉', '橙子', '草莓', '葡萄', '西瓜', 'food', 'fruit', 'apple', 'banana', 'orange', 'strawberry', 'grape', 'watermelon', 'drink']
  },
  {
    id: 'objects',
    name: '物品',
    icon: Box,
    description: '日常物品和几何形状',
    keywords: ['心', '圆', '方', '三角', '几何', 'object', 'shape', 'heart', 'circle', 'square', 'triangle', 'geometric', 'item']
  },
  {
    id: 'fantasy',
    name: '幻想',
    icon: Sparkles,
    description: '神话、幻想和创意设计',
    keywords: ['龙', '魔法', '幻想', '神话', 'fantasy', 'magic', 'dragon', 'mythical', 'creative', 'imagination']
  },
  {
    id: 'tech',
    name: '科技',
    icon: Cpu,
    description: '科技、未来和机械元素',
    keywords: ['机器人', '科技', '未来', '机械', 'tech', 'robot', 'future', 'mechanical', 'cyber', 'digital', 'technology']
  }
]

onMounted(async () => {
  await loadStickers()
})

async function loadStickers() {
  try {
    isLoading.value = true
    
    // 根据当前分类加载数据
    const data = activeCategory.value === 'all' 
      ? await getStickerHistory()
      : await getStickerHistoryByCategory(activeCategory.value)
    
    // 使用数据库中的分类信息，避免重复计算
    stickers.value = data.map(item => ({
      id: item.id,
      imageUrl: item.image_url,
      prompt: item.prompt,
      style: item.style,
      createdAt: new Date(item.created_at),
      category: item.category || getStickerCategory({
        id: item.id,
        imageUrl: item.image_url,
        prompt: item.prompt,
        style: item.style,
        createdAt: new Date(item.created_at)
      })
    }))
  } catch (error) {
    console.error('Failed to load stickers:', error)
    // 显示错误信息给用户
    errorMessage.value = '加载历史记录失败，请检查网络连接或稍后重试'
  } finally {
    isLoading.value = false
  }
}

// 智能分类算法（优化版）
function getStickerCategory(sticker: StickerItem): string {
  const prompt = sticker.prompt.toLowerCase()
  
  // 优化：使用更高效的关键词匹配
  for (const category of categories) {
    for (const keyword of category.keywords) {
      if (prompt.includes(keyword.toLowerCase())) {
        return category.id
      }
    }
  }
  
  // 根据风格作为备用分类
  const styleBasedCategory = {
    'CYBERPUNK': 'tech',
    'BIO-ORGANIC': 'nature',
    'RETRO-WAVE': 'objects'
  }[sticker.style] || 'objects'
  
  return styleBasedCategory
}

// 缓存分类统计
const categoryCounts = computed(() => {
  const counts: Record<string, number> = {}
  categories.forEach(category => {
    counts[category.id] = stickers.value.filter(sticker => 
      sticker.category === category.id
    ).length
  })
  return counts
})

// 获取分类统计（使用缓存）
const getCategoryCount = (categoryId: string) => {
  if (categoryId === 'all') return stickers.value.length
  return categoryCounts.value[categoryId] || 0
}

// 获取分类下的贴纸（使用预计算分类）
const getCategoryStickers = (categoryId: string) => {
  if (categoryId === 'all') return stickers.value
  return stickers.value.filter(sticker => sticker.category === categoryId)
}

// 过滤显示的类别（优化计算）
const filteredCategories = computed(() => {
  if (activeCategory.value === 'all') {
    return categories.filter(category => categoryCounts.value[category.id] > 0)
  }
  return categories.filter(category => category.id === activeCategory.value)
})

// 图片加载状态管理
const handleImageLoad = (stickerId: string) => {
  imageLoadingStates.value[stickerId] = false
}

const handleImageError = (stickerId: string) => {
  imageLoadingStates.value[stickerId] = false
  console.warn(`Failed to load image for sticker ${stickerId}`)
}

// 设置活动分类
function setActiveCategory(categoryId: string) {
  activeCategory.value = categoryId
  // 分类切换时不需要重新加载数据，只需更新显示过滤
  // 数据已经在 onMounted 时加载完成
}

async function handleDelete(id: string) {
  try {
    await deleteStickerFromHistory(id)
    stickers.value = stickers.value.filter(s => s.id !== id)
    
    // 清除图片加载状态
    delete imageLoadingStates.value[id]
  } catch (error) {
    console.error('Failed to delete sticker:', error)
    alert('Failed to delete sticker. Please try again.')
  }
}
</script>
