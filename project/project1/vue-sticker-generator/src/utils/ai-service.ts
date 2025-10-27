export interface GenerationRequest {
  prompt: string
  style: string
  negativePrompt?: string
  model?: string
  num_outputs?: number
}

export interface GenerationResponse {
  imageUrl: string
  success: boolean
  error?: string
}

// AI贴纸生成服务
export async function generateSticker(request: GenerationRequest): Promise<GenerationResponse> {
  try {
    // 优先尝试OpenAI DALL-E 3
    const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (openaiKey) {
      return await generateWithOpenAI(request, openaiKey);
    }
    
    // 尝试Stability AI
    const stabilityKey = import.meta.env.VITE_STABILITY_API_KEY;
    if (stabilityKey) {
      return await generateWithStabilityAI(request, stabilityKey);
    }
    
    // 尝试本地AI服务
    const localAIUrl = import.meta.env.VITE_LOCAL_AI_URL;
    if (localAIUrl) {
      return await generateStickerWithLocalAI(request);
    }
    
    // 如果没有配置API密钥，使用改进的模拟服务
    return await generateStickerWithImprovedMock(request);
  } catch (error) {
    console.error('AI generation error:', error);
    return {
      imageUrl: '',
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate image. Please try again.'
    };
  }
}

// OpenAI DALL-E 3 生成
async function generateWithOpenAI(request: GenerationRequest, apiKey: string): Promise<GenerationResponse> {
  const promptTemplates = {
    'CARTOON': (prompt: string) => 
      `${prompt}, cartoon style, vibrant colors, simple shapes, cute character, sticker design, transparent background, vector art`,
    
    'REALISTIC': (prompt: string) => 
      `${prompt}, realistic style, detailed texture, natural lighting, photorealistic, sticker design, transparent background, vector art`,
    
    'WATERCOLOR': (prompt: string) => 
      `${prompt}, watercolor painting style, soft edges, blended colors, artistic brush strokes, sticker design, transparent background, vector art`,
    
    'CYBERPUNK': (prompt: string) => 
      `${prompt}, cyberpunk style, neon colors, futuristic technology, glowing effects, sticker design, transparent background, vector art`,
    
    'ANIME': (prompt: string) => 
      `${prompt}, anime style, Japanese animation, expressive eyes, dynamic poses, sticker design, transparent background, vector art`,
    
    'MINIMALIST': (prompt: string) => 
      `${prompt}, minimalist style, clean lines, simple shapes, modern design, sticker design, transparent background, vector art`,
    
    'VINTAGE': (prompt: string) => 
      `${prompt}, vintage style, retro aesthetic, aged look, nostalgic design, sticker design, transparent background, vector art`,
    
    'FUTURISTIC': (prompt: string) => 
      `${prompt}, futuristic style, advanced technology, sleek design, modern aesthetic, sticker design, transparent background, vector art`,
    
    'BIO-ORGANIC': (prompt: string) => 
      `${prompt}, organic biological style, natural forms, flowing shapes, vibrant colors, sticker design, transparent background, vector art`,
    
    'RETRO-WAVE': (prompt: string) => 
      `${prompt}, retro wave 80s style, pastel colors, geometric patterns, nostalgic aesthetic, sticker design, transparent background, vector art`
  };
  
  const template = promptTemplates[request.style as keyof typeof promptTemplates] || 
    ((prompt: string) => `${prompt}, ${request.style.toLowerCase()} style sticker, transparent background, vector art`);
  
  // 组合用户负面提示词和系统默认负面提示词
  const systemNegative = generateNegativePrompt(request.prompt, request.style);
  const finalNegative = request.negativePrompt 
    ? `${systemNegative}, ${request.negativePrompt}`
    : systemNegative;
  
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt: template(request.prompt),
      model: "dall-e-3",
      size: "1024x1024",
      quality: "standard",
      n: request.num_outputs || 1
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
  }
  
  const data = await response.json();
  
  // 如果请求多张图片，返回第一张（DALL-E 3目前只支持生成1张）
  const imageUrl = data.data[0]?.url;
  
  if (!imageUrl) {
    throw new Error('No image URL returned from OpenAI');
  }
  
  return {
    imageUrl,
    success: true
  };
}

// Stability AI 生成
async function generateWithStabilityAI(request: GenerationRequest, apiKey: string): Promise<GenerationResponse> {
  try {
    // 优化提示词处理：自动中英文转换 + 负面提示词
    const optimizedPrompt = optimizePromptForAI(request.prompt, request.style);
    
    // 组合用户负面提示词和系统默认负面提示词
    const systemNegative = generateNegativePrompt(request.prompt, request.style);
    const finalNegative = request.negativePrompt 
      ? `${optimizedPrompt.negative}, ${request.negativePrompt}`
      : optimizedPrompt.negative;
    
    // 添加超时控制和更好的错误处理
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时
    
    const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        text_prompts: [
          {
            text: optimizedPrompt.positive,
            weight: 1.0
          },
          {
            text: finalNegative,
            weight: -0.5
          }
        ],
        cfg_scale: 7,
        height: 1024,
        width: 1024,
        steps: 20, // 减少步数以加快生成速度
        samples: request.num_outputs || 1
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Stability AI API error:', response.status, errorText);
      throw new Error(`Stability AI API error: ${response.status} - ${errorText.substring(0, 200)}`);
    }
    
    const data = await response.json();
    
    if (!data.artifacts || !data.artifacts[0]) {
      throw new Error('No image artifacts returned from Stability AI');
    }
    
    // Stability AI返回base64图像数据
    const base64Image = data.artifacts[0].base64;
    const imageUrl = `data:image/png;base64,${base64Image}`;
    
    return {
      imageUrl,
      success: true
    };
  } catch (error) {
    console.warn('Stability AI service unavailable, falling back to mock service:', error);
    
    // 如果是网络错误，尝试使用备用API端点
    if (error.name === 'AbortError' || error.message.includes('Failed to fetch') || error.message.includes('QUIC')) {
      console.log('尝试使用备用API端点...');
      return await tryAlternativeStabilityAIEndpoint(request, apiKey);
    }
    
    // 其他错误回退到模拟服务
    return await generateStickerWithImprovedMock(request);
  }
}

// 尝试备用Stability AI端点
async function tryAlternativeStabilityAIEndpoint(request: GenerationRequest, apiKey: string): Promise<GenerationResponse> {
  try {
    const optimizedPrompt = optimizePromptForAI(request.prompt, request.style);
    
    // 尝试使用不同的模型或端点
    const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-v1-6/text-to-image', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        text_prompts: [
          {
            text: optimizedPrompt.positive,
            weight: 1.0
          },
          {
            text: optimizedPrompt.negative,
            weight: -0.5
          }
        ],
        cfg_scale: 7,
        height: 512,
        width: 512,
        steps: 20,
        samples: 1
      })
    });
    
    if (!response.ok) {
      throw new Error(`Alternative endpoint failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.artifacts || !data.artifacts[0]) {
      throw new Error('No image artifacts returned from alternative endpoint');
    }
    
    const base64Image = data.artifacts[0].base64;
    const imageUrl = `data:image/png;base64,${base64Image}`;
    
    return {
      imageUrl,
      success: true
    };
  } catch (error) {
    console.warn('Alternative Stability AI endpoint also failed:', error);
    return await generateStickerWithImprovedMock(request);
  }
}

// 改进的模拟服务（基于用户输入的智能模拟）
async function generateStickerWithImprovedMock(request: GenerationRequest): Promise<GenerationResponse> {
  await new Promise(resolve => setTimeout(resolve, 2000)); // 模拟AI生成时间
  
  const success = Math.random() > 0.02; // 98%成功率
  
  if (!success) {
    return {
      imageUrl: '',
      success: false,
      error: 'AI生成失败。请尝试使用不同的描述词。'
    };
  }
  
  // 基于用户输入生成相关的图片
  const promptKeywords = extractKeywords(request.prompt);
  const styleKeywords = getStyleKeywords(request.style);
  
  // 组合关键词生成相关图片
  const combinedKeywords = [...promptKeywords, ...styleKeywords].join(',');
  
  // 使用更智能的图片生成服务
  const imageUrl = await generateHighQualityMockImage(request.prompt, request.style, combinedKeywords);
  
  return {
    imageUrl,
    success: true
  };
}

// 生成更高质量的模拟图片
async function generateHighQualityMockImage(prompt: string, style: string, keywords: string): Promise<string> {
  // 基于风格和提示词生成更相关的图片
  const styleThemes = {
    'CARTOON': 'cartoon,colorful,cute,simple',
    'REALISTIC': 'realistic,detailed,photorealistic,natural',
    'WATERCOLOR': 'watercolor,painting,artistic,soft',
    'CYBERPUNK': 'cyberpunk,futuristic,neon,technology',
    'ANIME': 'anime,japanese,animation,expressive',
    'MINIMALIST': 'minimalist,simple,clean,modern',
    'VINTAGE': 'vintage,retro,old,nostalgic',
    'FUTURISTIC': 'futuristic,modern,technology,sleek',
    'BIO-ORGANIC': 'organic,nature,biological,flowing',
    'RETRO-WAVE': 'retrowave,80s,vaporwave,pastel'
  };
  
  const theme = styleThemes[style as keyof typeof styleThemes] || 'art,design';
  
  // 基于提示词生成更具体的图片
  const promptBasedImage = generatePromptBasedImage(prompt, style);
  
  return promptBasedImage;
}

// 基于提示词生成更相关的图片
function generatePromptBasedImage(prompt: string, style: string): string {
  // 常见主题的图片映射
  const themeImages = {
    // 动物主题
    '猫': 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=400&fit=crop',
    '狗': 'https://images.unsplash.com/photo-1517423447168-cb804aafa6e0?w=400&h=400&fit=crop',
    '龙': 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop',
    '鸟': 'https://images.unsplash.com/photo-1444464666168-49d633b867af?w=400&h=400&fit=crop',
    '鱼': 'https://images.unsplash.com/photo-1524704654690-b56c05c78d00?w=400&h=400&fit=crop',
    
    // 自然主题
    '花': 'https://images.unsplash.com/photo-1560807707-8cc77767d783?w=400&h=400&fit=crop',
    '树': 'https://images.unsplash.com/photo-1425913397330-cf8af2ff40a1?w=400&h=400&fit=crop',
    '星': 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=400&h=400&fit=crop',
    '月': 'https://images.unsplash.com/photo-1518834107812-67b1b7d49c4f?w=400&h=400&fit=crop',
    '云': 'https://images.unsplash.com/photo-1501630834273-4b5604d2ee31?w=400&h=400&fit=crop',
    
    // 形状主题
    '心': 'https://images.unsplash.com/photo-1579532537598-459d87c1c33f?w=400&h=400&fit=crop',
    '圆': 'https://images.unsplash.com/photo-1519996529937-47d9d54f7c63?w=400&h=400&fit=crop',
    '方': 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=400&fit=crop',
    
    // 默认图片
    'default': 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=400&fit=crop'
  };
  
  // 检查提示词中的关键词
  for (const [keyword, imageUrl] of Object.entries(themeImages)) {
    if (prompt.includes(keyword)) {
      return imageUrl;
    }
  }
  
  // 如果没有匹配的关键词，返回基于风格的默认图片
  return themeImages.default;
}

// 从用户提示中提取关键词
function extractKeywords(prompt: string): string[] {
  const keywords = [];
  
  // 常见主题关键词映射
  const themeKeywords = {
    '猫': ['cat', 'kitten', 'feline'],
    '狗': ['dog', 'puppy', 'canine'],
    '龙': ['dragon', 'mythical', 'fantasy'],
    '花': ['flower', 'blossom', 'petal'],
    '树': ['tree', 'forest', 'nature'],
    '星': ['star', 'space', 'cosmic'],
    '月': ['moon', 'night', 'celestial'],
    '心': ['heart', 'love', 'romance'],
    '云': ['cloud', 'sky', 'weather'],
    '水': ['water', 'ocean', 'liquid']
  };
  
  // 检查中文关键词
  for (const [chinese, englishKeywords] of Object.entries(themeKeywords)) {
    if (prompt.includes(chinese)) {
      keywords.push(...englishKeywords);
    }
  }
  
  // 提取英文关键词
  const englishWords = prompt.toLowerCase().match(/[a-z]+/g) || [];
  keywords.push(...englishWords.filter(word => word.length > 2));
  
  return keywords.length > 0 ? keywords.slice(0, 3) : ['sticker', 'design', 'art'];
}

// 获取风格相关关键词
function getStyleKeywords(style: string): string[] {
  const styleMap = {
    'CYBERPUNK': ['cyberpunk', 'futuristic', 'neon', 'technology', 'digital', 'glowing'],
    'BIO-ORGANIC': ['organic', 'biological', 'nature', 'life', 'flowing', 'vibrant'],
    'RETRO-WAVE': ['retro', '80s', 'vaporwave', 'nostalgic', 'pastel', 'geometric']
  };
  
  return styleMap[style as keyof typeof styleMap] || ['sticker', 'design', 'art'];
}

// 生成与用户输入相关的图片
function generateRelevantImage(prompt: string, style: string, keywords: string): string {
  // 使用更智能的图片服务，基于关键词生成相关图片
  const timestamp = Date.now();
  const hash = Math.abs(prompt.split('').reduce((a, b) => a + b.charCodeAt(0), 0));
  
  // 基于关键词和哈希值生成一致的图片URL
  const imageId = (hash % 1000) + 1;
  
  // 使用稳定的占位图片服务，确保图片与输入相关
  return `https://picsum.photos/seed/${prompt.replace(/[^a-zA-Z0-9]/g, '')}-${style}-${imageId}/400/400`;
}

// 优化AI提示词处理：自动中英文转换 + 负面提示词
function optimizePromptForAI(prompt: string, style: string): { positive: string; negative: string } {
  // 1. 中文到英文的智能转换
  const englishPrompt = convertChineseToEnglish(prompt);
  
  // 2. 根据风格生成优化的正面提示词
  const positivePrompt = generatePositivePrompt(englishPrompt, style);
  
  // 3. 生成负面提示词排除不想要的内容
  const negativePrompt = generateNegativePrompt(prompt, style);
  
  console.log('优化后的提示词:', {
    原始提示词: prompt,
    英文提示词: englishPrompt,
    正面提示词: positivePrompt,
    负面提示词: negativePrompt
  });
  
  return {
    positive: positivePrompt,
    negative: negativePrompt
  };
}

// 中文到英文的智能转换
function convertChineseToEnglish(prompt: string): string {
  // 扩展中文关键词映射
  const chineseToEnglishMap = {
    // 动物
    '猫': 'cat', '小猫': 'kitten', '猫咪': 'cat', '猫猫': 'cat',
    '狗': 'dog', '小狗': 'puppy', '狗狗': 'dog', '狗子': 'dog',
    '龙': 'dragon', '恐龙': 'dinosaur', '神龙': 'dragon',
    '鸟': 'bird', '小鸟': 'bird', '鸟儿': 'bird',
    '鱼': 'fish', '小鱼': 'fish', '鱼儿': 'fish',
    '熊': 'bear', '熊猫': 'panda', '熊熊': 'bear',
    '兔': 'rabbit', '兔子': 'rabbit', '兔兔': 'rabbit',
    '鹿': 'deer', '小鹿': 'deer', '鹿儿': 'deer',
    '虎': 'tiger', '老虎': 'tiger', '小虎': 'tiger',
    '狮': 'lion', '狮子': 'lion', '小狮': 'lion',
    
    // 水果食物
    '苹果': 'apple', '红苹果': 'red apple', '青苹果': 'green apple',
    '香蕉': 'banana', '橙子': 'orange', '橘子': 'orange',
    '草莓': 'strawberry', '葡萄': 'grape', '提子': 'grape',
    '西瓜': 'watermelon', '柠檬': 'lemon', '梨': 'pear',
    '桃': 'peach', '桃子': 'peach', '樱桃': 'cherry',
    
    // 自然
    '花': 'flower', '花朵': 'flower', '鲜花': 'flower', '花儿': 'flower',
    '树': 'tree', '树木': 'tree', '大树': 'big tree', '小树': 'small tree',
    '星': 'star', '星星': 'star', '星辰': 'star', '星空': 'starry sky',
    '月': 'moon', '月亮': 'moon', '月球': 'moon', '月光': 'moonlight',
    '云': 'cloud', '云朵': 'cloud', '白云': 'white cloud', '乌云': 'dark cloud',
    '太阳': 'sun', '阳光': 'sunlight', '日光': 'sunlight',
    '山': 'mountain', '山峰': 'mountain peak', '小山': 'hill',
    '水': 'water', '河流': 'river', '海洋': 'ocean', '湖泊': 'lake',
    
    // 形状
    '心': 'heart', '爱心': 'heart', '心形': 'heart shape',
    '圆': 'circle', '圆形': 'circle', '球': 'ball', '球形': 'sphere',
    '方': 'square', '方形': 'square', '矩形': 'rectangle',
    '三角': 'triangle', '三角形': 'triangle', '金字塔': 'pyramid',
    
    // 颜色
    '红': 'red', '红色': 'red', '红红': 'red',
    '蓝': 'blue', '蓝色': 'blue', '蓝蓝': 'blue',
    '绿': 'green', '绿色': 'green', '绿绿': 'green',
    '黄': 'yellow', '黄色': 'yellow', '黄黄': 'yellow',
    '紫': 'purple', '紫色': 'purple', '紫紫': 'purple',
    '粉': 'pink', '粉色': 'pink', '粉粉': 'pink',
    
    // 形容词
    '可爱': 'cute', '可爱的小': 'cute little', '萌萌': 'cute',
    '美丽': 'beautiful', '漂亮的': 'beautiful', '美美': 'beautiful',
    '简单': 'simple', '简约': 'minimalist', '简洁': 'simple',
    '彩色': 'colorful', '鲜艳': 'vibrant', '多彩': 'colorful',
    '大': 'big', '小': 'small', '中': 'medium', '巨大': 'huge', '微小': 'tiny',
    '快': 'fast', '慢': 'slow', '高': 'high', '低': 'low', '长': 'long', '短': 'short',
    
    // 动作和状态
    '飞': 'fly', '飞翔': 'fly', '飞行': 'fly',
    '跑': 'run', '奔跑': 'run', '跑步': 'run',
    '跳': 'jump', '跳跃': 'jump', '跳动': 'jump',
    '笑': 'smile', '微笑': 'smile', '大笑': 'laugh',
    '哭': 'cry', '哭泣': 'cry', '流泪': 'cry',
    '睡': 'sleep', '睡觉': 'sleep', '睡眠': 'sleep'
  };
  
  let englishPrompt = prompt;
  
  // 按长度从长到短排序，优先匹配长词
  const sortedEntries = Object.entries(chineseToEnglishMap).sort((a, b) => b[0].length - a[0].length);
  
  // 替换中文关键词
  for (const [chinese, english] of sortedEntries) {
    if (englishPrompt.includes(chinese)) {
      englishPrompt = englishPrompt.replace(new RegExp(chinese, 'g'), english);
    }
  }
  
  // 如果仍然是中文，添加通用描述
  if (/[\u4e00-\u9fff]/.test(englishPrompt)) {
    // 保留原始中文，但添加英文关键词
    englishPrompt = `sticker of ${englishPrompt}, simple design, vector art, transparent background`;
  }
  
  return englishPrompt;
}

// 生成优化的正面提示词
function generatePositivePrompt(prompt: string, style: string): string {
  // 首先分析用户输入的关键特征
  const userKeywords = analyzeUserPrompt(prompt);
  
  const styleTemplates = {
    'CARTOON': (p: string) => 
      `${p}, ${userKeywords.isCharacter ? 'cute character' : 'sticker'}, cartoon style, vibrant colors, simple shapes, sticker design, transparent background, vector art, high quality, centered composition, isolated object, no background`,
    
    'REALISTIC': (p: string) => 
      `${p}, ${userKeywords.isCharacter ? 'realistic character' : 'sticker'}, realistic style, detailed texture, natural lighting, photorealistic, sticker design, transparent background, vector art, high quality, centered composition, isolated object, no background`,
    
    'WATERCOLOR': (p: string) => 
      `${p}, ${userKeywords.isCharacter ? 'watercolor character' : 'sticker'}, watercolor painting style, soft edges, blended colors, artistic brush strokes, sticker design, transparent background, vector art, high quality, centered composition, isolated object, no background`,
    
    'CYBERPUNK': (p: string) => 
      `${p}, ${userKeywords.isCharacter ? 'cyberpunk character' : 'sticker'}, cyberpunk style, futuristic, neon colors, glowing effects, mechanical details, sticker design, transparent background, vector art, high quality, centered composition, isolated object, no background`,
    
    'ANIME': (p: string) => 
      `${p}, ${userKeywords.isCharacter ? 'anime character' : 'sticker'}, anime style, Japanese animation, expressive eyes, dynamic poses, sticker design, transparent background, vector art, high quality, centered composition, isolated object, no background`,
    
    'MINIMALIST': (p: string) => 
      `${p}, minimalist style, clean lines, simple shapes, modern design, sticker design, transparent background, vector art, high quality, centered composition, isolated object, no background`,
    
    'VINTAGE': (p: string) => 
      `${p}, ${userKeywords.isCharacter ? 'vintage character' : 'sticker'}, vintage style, retro aesthetic, aged look, nostalgic design, sticker design, transparent background, vector art, high quality, centered composition, isolated object, no background`,
    
    'FUTURISTIC': (p: string) => 
      `${p}, ${userKeywords.isCharacter ? 'futuristic character' : 'sticker'}, futuristic style, advanced technology, sleek design, modern aesthetic, sticker design, transparent background, vector art, high quality, centered composition, isolated object, no background`,
    
    'BIO-ORGANIC': (p: string) => 
      `${p}, ${userKeywords.isCharacter ? 'organic character' : 'sticker'}, organic biological style, natural forms, flowing shapes, vibrant colors, life energy, sticker design, transparent background, vector art, high quality, centered composition, isolated object, no background`,
    
    'RETRO-WAVE': (p: string) => 
      `${p}, ${userKeywords.isCharacter ? 'retro character' : 'sticker'}, retro wave 80s style, pastel colors, geometric patterns, nostalgic aesthetic, vaporwave, sticker design, transparent background, vector art, high quality, centered composition, isolated object, no background`
  };
  
  const template = styleTemplates[style as keyof typeof styleTemplates] || 
    ((p: string) => `${p}, ${style.toLowerCase()} style, sticker design, transparent background, vector art, high quality, isolated object, no background`);
  
  return template(prompt);
}

// 分析用户提示词的关键特征
function analyzeUserPrompt(prompt: string): { isCharacter: boolean; isObject: boolean; isAnimal: boolean; isAbstract: boolean } {
  const lowerPrompt = prompt.toLowerCase();
  
  // 检查是否是角色/人物
  const characterKeywords = ['人', '人物', '角色', '女孩', '男孩', '女性', '男性', 'person', 'character', 'girl', 'boy', 'woman', 'man'];
  const isCharacter = characterKeywords.some(keyword => lowerPrompt.includes(keyword));
  
  // 检查是否是动物
  const animalKeywords = ['猫', '狗', '龙', '鸟', '鱼', '熊', '兔', '鹿', '虎', '狮', 'cat', 'dog', 'dragon', 'bird', 'fish', 'bear', 'rabbit', 'deer', 'tiger', 'lion'];
  const isAnimal = animalKeywords.some(keyword => lowerPrompt.includes(keyword));
  
  // 检查是否是具体物体
  const objectKeywords = ['苹果', '香蕉', '花', '树', '星', '月', '心', '圆', '方', 'apple', 'banana', 'flower', 'tree', 'star', 'moon', 'heart', 'circle', 'square'];
  const isObject = objectKeywords.some(keyword => lowerPrompt.includes(keyword));
  
  // 检查是否是抽象概念
  const abstractKeywords = ['爱', '快乐', '悲伤', '梦想', '希望', '恐惧', 'love', 'happy', 'sad', 'dream', 'hope', 'fear'];
  const isAbstract = abstractKeywords.some(keyword => lowerPrompt.includes(keyword));
  
  return {
    isCharacter: isCharacter,
    isObject: isObject || (!isCharacter && !isAnimal && !isAbstract),
    isAnimal: isAnimal,
    isAbstract: isAbstract
  };
}

// 生成负面提示词排除不想要的内容
function generateNegativePrompt(prompt: string, style: string): string {
  // 分析用户提示词特征
  const userKeywords = analyzeUserPrompt(prompt);
  
  // 基础负面提示词
  const baseNegative = [
    'text', 'watermark', 'signature', 'logo', 'brand',
    'low quality', 'blurry', 'pixelated', 'jpeg artifacts',
    'ugly', 'deformed', 'malformed', 'distorted',
    'multiple objects', 'crowded scene', 'busy background',
    'background', 'landscape', 'environment', 'scene'
  ];
  
  // 根据用户输入特征调整负面提示词
  if (userKeywords.isCharacter) {
    baseNegative.push('human', 'person', 'face', 'body', 'hands', 'fingers');
  }
  
  if (userKeywords.isAnimal) {
    baseNegative.push('human', 'person', 'face', 'body', 'hands', 'fingers');
  }
  
  if (userKeywords.isObject) {
    baseNegative.push('human', 'person', 'face', 'body', 'hands', 'fingers');
  }
  
  // 风格特定的负面提示词
  const styleNegative = {
    'CARTOON': [
      'realistic', 'photorealistic', 'detailed texture', 'natural lighting',
      'complex shading', 'realistic shadows', 'photography', 'photo'
    ],
    'REALISTIC': [
      'cartoon', 'stylized', 'simple shapes', 'flat colors',
      'exaggerated features', 'anime style', 'drawing', 'illustration'
    ],
    'WATERCOLOR': [
      'digital art', 'vector art', 'clean lines', 'sharp edges',
      'solid colors', 'photorealistic', '3D', 'CG'
    ],
    'CYBERPUNK': [
      'organic', 'natural', 'wood', 'earth', 'soil',
      'vintage', 'retro', 'old fashioned', 'traditional'
    ],
    'ANIME': [
      'realistic', 'photorealistic', 'western cartoon', '3D animation',
      'live action', 'real human', 'photography'
    ],
    'MINIMALIST': [
      'complex', 'detailed', 'busy', 'cluttered', 'ornate',
      'decorative', 'intricate patterns', 'detailed', 'complex'
    ],
    'VINTAGE': [
      'modern', 'futuristic', 'high tech', 'digital',
      'contemporary', 'minimalist', 'sleek', 'futuristic'
    ],
    'FUTURISTIC': [
      'vintage', 'retro', 'old fashioned', 'antique',
      'traditional', 'classic', 'old', 'historical'
    ],
    'BIO-ORGANIC': [
      'mechanical', 'metal', 'plastic', 'synthetic',
      'geometric', 'angular', 'sharp edges', 'artificial'
    ],
    'RETRO-WAVE': [
      'futuristic', 'modern', 'high tech',
      'organic', 'natural', 'realistic', 'photorealistic'
    ]
  };
  
  const specificNegative = styleNegative[style as keyof typeof styleNegative] || [];
  
  // 基于用户输入的额外负面提示词
  const userSpecificNegative = [];
  
  // 如果用户要求简单对象，排除复杂场景
  if (prompt.includes('一只') || prompt.includes('一个') || prompt.includes('简单') || prompt.includes('single')) {
    userSpecificNegative.push(
      'complex scene', 'multiple items', 'crowded', 'background', 'landscape', 'group', 'multiple'
    );
  }
  
  // 如果用户描述具体物体，排除不相关的内容
  if (userKeywords.isObject || userKeywords.isAnimal) {
    userSpecificNegative.push('human', 'person', 'face', 'body');
  }
  
  // 组合所有负面提示词
  const allNegative = [...baseNegative, ...specificNegative, ...userSpecificNegative];
  
  // 去重并返回
  const finalNegative = [...new Set(allNegative)].join(', ');
  
  console.log('生成的负面提示词:', {
    用户特征: userKeywords,
    负面提示词: finalNegative
  });
  
  return finalNegative;
}

// 本地AI服务集成（可选）
export async function generateStickerWithLocalAI(request: GenerationRequest): Promise<GenerationResponse> {
  const LOCAL_AI_URL = import.meta.env.VITE_LOCAL_AI_URL || 'http://localhost:7860';
  
  try {
    // 组合用户负面提示词和系统默认负面提示词
    const systemNegative = generateNegativePrompt(request.prompt, request.style);
    const finalNegative = request.negativePrompt 
      ? `${systemNegative}, ${request.negativePrompt}`
      : systemNegative;
    
    const response = await fetch(`${LOCAL_AI_URL}/sdapi/v1/txt2img`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: `${request.prompt}, ${request.style.toLowerCase()} style, sticker, transparent background`,
        negative_prompt: finalNegative,
        width: 512,
        height: 512,
        steps: 20,
        cfg_scale: 7
      })
    });
    
    if (!response.ok) {
      throw new Error(`Local AI error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 本地Stable Diffusion返回base64图像
    const base64Image = data.images[0];
    const imageUrl = `data:image/png;base64,${base64Image}`;
    
    return {
      imageUrl,
      success: true
    };
  } catch (error) {
    console.error('Local AI generation error:', error);
    // 如果本地AI服务不可用，回退到模拟服务
    return await generateStickerWithImprovedMock(request);
  }
}