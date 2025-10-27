import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface StickerRecord {
  id: string
  prompt: string
  style: string
  image_url: string
  created_at: string
  category?: string
}

// 分类定义（已删除冗余表，仅保留分类名称）
const CATEGORIES = {
  animals: 'animals',
  nature: 'nature', 
  food: 'food',
  objects: 'objects',
  fantasy: 'fantasy',
  tech: 'tech'
}

// 智能分类函数（与前端保持一致）
function getStickerCategory(prompt: string, style: string): string {
  const promptLower = prompt.toLowerCase()
  
  const categoryKeywords = {
    animals: ['猫', '狗', '龙', '鸟', '鱼', '熊', '兔', '鹿', 'animal', 'cat', 'dog', 'puppy', 'kitten', 'dragon', 'bird', 'fish', 'bear', 'rabbit', 'deer'],
    nature: ['花', '树', '星', '月', '云', '太阳', 'flower', 'tree', 'star', 'moon', 'cloud', 'sun', 'plant', 'nature', 'leaf'],
    food: ['苹果', '香蕉', '橙子', '草莓', '葡萄', '西瓜', 'food', 'fruit', 'apple', 'banana', 'orange', 'strawberry', 'grape', 'watermelon', 'drink'],
    objects: ['心', '圆', '方', '三角', '几何', 'object', 'shape', 'heart', 'circle', 'square', 'triangle', 'geometric', 'item'],
    fantasy: ['龙', '魔法', '幻想', '神话', 'fantasy', 'magic', 'dragon', 'mythical', 'creative', 'imagination'],
    tech: ['机器人', '科技', '未来', '机械', 'tech', 'robot', 'future', 'mechanical', 'cyber', 'digital', 'technology']
  }
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      if (promptLower.includes(keyword.toLowerCase())) {
        return category
      }
    }
  }
  
  // 根据风格作为备用分类
  const styleBasedCategory = {
    'CYBERPUNK': 'tech',
    'BIO-ORGANIC': 'nature',
    'RETRO-WAVE': 'objects'
  }[style] || 'objects'
  
  return styleBasedCategory
}

export async function saveStickerToHistory(sticker: Omit<StickerRecord, 'id' | 'created_at'>) {
  try {
    // 使用单一表结构
    const category = getStickerCategory(sticker.prompt, sticker.style)
    
    const { data, error } = await supabase
      .from('stickers_optimized')
      .insert([
        {
          prompt: sticker.prompt,
          style: sticker.style,
          image_url: sticker.image_url,
          category: category,
          style_category: sticker.style, // 使用style作为style_category
          is_active: true
        }
      ])
      .select()
      .single()
    
    if (error) {
      console.error('Error saving sticker to database:', error)
      throw error // 直接抛出错误
    }
    
    return { ...data, category } as StickerRecord
  } catch (error) {
    console.error('Error saving sticker:', error)
    throw error // 直接抛出错误
  }
}



export async function getStickerHistory() {
  const maxRetries = 3;
  const retryDelay = 1000; // 1秒
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // 使用单一表查询
      console.log(`Querying merged table for sticker history (attempt ${attempt}/${maxRetries})`)
      
      // 设置查询超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      try {
        // 查询单一表，优化查询性能
        const { data, error } = await supabase
          .from('stickers_optimized')
          .select('id, prompt, style, image_url, category, created_at')
          .order('created_at', { ascending: false })
          .limit(10) // 增加显示数量到10条
        
        clearTimeout(timeoutId);
        
        if (error) {
          console.error(`Query attempt ${attempt} failed:`, error)
          
          // 如果是超时错误，等待后重试
          if (error.code === '57014' || error.message?.includes('timeout')) {
            if (attempt < maxRetries) {
              console.log(`Query timeout, retrying in ${retryDelay}ms...`)
              await new Promise(resolve => setTimeout(resolve, retryDelay));
              continue;
            }
          }
          
          throw error;
        }
        
        if (data) {
          console.log('Merged table query successful:', data.length, 'items')
          // 确保每条记录都有分类信息
          const dataWithCategories = data.map(item => ({
            ...item,
            category: item.category || getStickerCategory(item.prompt, item.style)
          }))
          return dataWithCategories as StickerRecord[]
        }
        
        return []
      } catch (queryError) {
        clearTimeout(timeoutId);
        throw queryError;
      }
    } catch (error) {
      console.error(`Error fetching sticker history (attempt ${attempt}):`, error)
      
      // 最后一次尝试失败，抛出错误
      if (attempt === maxRetries) {
        throw error;
      }
      
      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  // 理论上不会执行到这里
  throw new Error('Max retries exceeded');
}

// 按分类获取历史记录
export async function getStickerHistoryByCategory(category?: string) {
  try {
    // 使用主表查询，然后按分类过滤
    const allData = await getStickerHistory()
    
    if (category && category !== 'all') {
      return allData.filter(item => {
        const itemCategory = item.category || getStickerCategory(item.prompt, item.style)
        return itemCategory === category
      })
    }
    
    return allData
  } catch (error) {
    console.error('Error fetching sticker history by category:', error)
    return []
  }
}

// 从localStorage获取历史记录（备用，支持分类）
async function getFromLocalStorage(): Promise<StickerRecord[]> {
  try {
    if (!isLocalStorageAvailable()) {
      return []
    }
    
    // 从所有分类中获取数据
    const allCategories = Object.keys(CATEGORIES)
    const allData: StickerRecord[] = []
    
    for (const category of allCategories) {
      const categoryKey = `stickerHistory_${category}`
      const categoryData = JSON.parse(localStorage.getItem(categoryKey) || '[]')
      allData.push(...categoryData)
    }
    
    return allData
  } catch (error) {
    console.error('Error getting sticker history from localStorage:', error)
    return []
  }
}

export async function deleteStickerFromHistory(id: string) {
  try {
    // 使用单一表删除
    const { error } = await supabase
      .from('stickers_optimized')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Error deleting sticker from database:', error)
      throw error // 直接抛出错误
    }
  } catch (error) {
    console.error('Error deleting sticker:', error)
    throw error // 直接抛出错误
  }
}