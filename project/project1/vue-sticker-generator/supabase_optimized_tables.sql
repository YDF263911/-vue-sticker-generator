-- Supabase 优化表结构创建脚本
-- 在Supabase SQL编辑器中执行此脚本

-- 创建优化后的主表结构
CREATE TABLE IF NOT EXISTS stickers_optimized (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    prompt TEXT NOT NULL,
    style TEXT NOT NULL,
    image_url TEXT NOT NULL,
    category TEXT NOT NULL,
    prompt_tokens TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', prompt)) STORED,
    style_category TEXT NOT NULL,
    image_size INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 为优化表启用行级安全策略
ALTER TABLE stickers_optimized ENABLE ROW LEVEL SECURITY;

-- 创建允许所有用户读取的策略
CREATE POLICY "Allow public read access" ON stickers_optimized FOR SELECT USING (true);

-- 创建允许所有用户插入的策略
CREATE POLICY "Allow public insert access" ON stickers_optimized FOR INSERT WITH CHECK (true);

-- 创建允许所有用户删除的策略
CREATE POLICY "Allow public delete access" ON stickers_optimized FOR DELETE USING (true);

-- 创建高性能索引
-- 复合索引：按分类和时间排序（最常用查询）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stickers_optimized_category_created 
ON stickers_optimized(category, created_at DESC);

-- 时间索引：按时间排序
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stickers_optimized_created 
ON stickers_optimized(created_at DESC);

-- 全文搜索索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stickers_optimized_prompt_search 
ON stickers_optimized USING GIN(prompt_tokens);

-- 风格索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stickers_optimized_style 
ON stickers_optimized(style);

-- 活动状态索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stickers_optimized_active 
ON stickers_optimized(is_active) WHERE is_active = true;

-- 数据迁移函数：将现有数据迁移到优化表
CREATE OR REPLACE FUNCTION migrate_stickers_to_optimized() 
RETURNS INTEGER AS $$
DECLARE
    migrated_count INTEGER := 0;
    rec RECORD;
BEGIN
    -- 从原表迁移数据
    FOR rec IN SELECT * FROM stickers LOOP
        INSERT INTO stickers_optimized (
            prompt, style, image_url, category, style_category, is_active
        ) VALUES (
            rec.prompt, 
            rec.style, 
            rec.image_url,
            CASE 
                WHEN rec.prompt ILIKE '%cat%' OR rec.prompt ILIKE '%dog%' OR rec.prompt ILIKE '%animal%' THEN 'animals'
                WHEN rec.prompt ILIKE '%flower%' OR rec.prompt ILIKE '%tree%' OR rec.prompt ILIKE '%nature%' THEN 'nature'
                WHEN rec.prompt ILIKE '%food%' OR rec.prompt ILIKE '%fruit%' THEN 'food'
                WHEN rec.prompt ILIKE '%tech%' OR rec.prompt ILIKE '%robot%' THEN 'tech'
                WHEN rec.prompt ILIKE '%fantasy%' OR rec.prompt ILIKE '%magic%' THEN 'fantasy'
                ELSE 'objects'
            END,
            rec.style,
            true
        );
        migrated_count := migrated_count + 1;
    END LOOP;
    
    RETURN migrated_count;
END;
$$ LANGUAGE plpgsql;

-- 注释：在Supabase控制台的SQL编辑器中执行此脚本
-- 执行后，运行 SELECT migrate_stickers_to_optimized(); 来迁移现有数据