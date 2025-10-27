-- Supabase 分类表创建脚本
-- 在Supabase SQL编辑器中执行此脚本

-- 创建动物分类表
CREATE TABLE IF NOT EXISTS stickers_animals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    prompt TEXT NOT NULL,
    style TEXT NOT NULL,
    image_url TEXT NOT NULL,
    category TEXT DEFAULT 'animals',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建自然分类表
CREATE TABLE IF NOT EXISTS stickers_nature (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    prompt TEXT NOT NULL,
    style TEXT NOT NULL,
    image_url TEXT NOT NULL,
    category TEXT DEFAULT 'nature',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建食物分类表
CREATE TABLE IF NOT EXISTS stickers_food (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    prompt TEXT NOT NULL,
    style TEXT NOT NULL,
    image_url TEXT NOT NULL,
    category TEXT DEFAULT 'food',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建物品分类表
CREATE TABLE IF NOT EXISTS stickers_objects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    prompt TEXT NOT NULL,
    style TEXT NOT NULL,
    image_url TEXT NOT NULL,
    category TEXT DEFAULT 'objects',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建幻想分类表
CREATE TABLE IF NOT EXISTS stickers_fantasy (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    prompt TEXT NOT NULL,
    style TEXT NOT NULL,
    image_url TEXT NOT NULL,
    category TEXT DEFAULT 'fantasy',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建科技分类表
CREATE TABLE IF NOT EXISTS stickers_tech (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    prompt TEXT NOT NULL,
    style TEXT NOT NULL,
    image_url TEXT NOT NULL,
    category TEXT DEFAULT 'tech',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 为所有表启用行级安全策略
ALTER TABLE stickers_animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE stickers_nature ENABLE ROW LEVEL SECURITY;
ALTER TABLE stickers_food ENABLE ROW LEVEL SECURITY;
ALTER TABLE stickers_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE stickers_fantasy ENABLE ROW LEVEL SECURITY;
ALTER TABLE stickers_tech ENABLE ROW LEVEL SECURITY;

-- 创建允许所有用户读取的策略
CREATE POLICY "Allow public read access" ON stickers_animals FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON stickers_nature FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON stickers_food FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON stickers_objects FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON stickers_fantasy FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON stickers_tech FOR SELECT USING (true);

-- 创建允许所有用户插入的策略
CREATE POLICY "Allow public insert access" ON stickers_animals FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert access" ON stickers_nature FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert access" ON stickers_food FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert access" ON stickers_objects FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert access" ON stickers_fantasy FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert access" ON stickers_tech FOR INSERT WITH CHECK (true);

-- 创建允许所有用户删除的策略
CREATE POLICY "Allow public delete access" ON stickers_animals FOR DELETE USING (true);
CREATE POLICY "Allow public delete access" ON stickers_nature FOR DELETE USING (true);
CREATE POLICY "Allow public delete access" ON stickers_food FOR DELETE USING (true);
CREATE POLICY "Allow public delete access" ON stickers_objects FOR DELETE USING (true);
CREATE POLICY "Allow public delete access" ON stickers_fantasy FOR DELETE USING (true);
CREATE POLICY "Allow public delete access" ON stickers_tech FOR DELETE USING (true);

-- 为所有表创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_stickers_animals_created_at ON stickers_animals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stickers_nature_created_at ON stickers_nature(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stickers_food_created_at ON stickers_food(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stickers_objects_created_at ON stickers_objects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stickers_fantasy_created_at ON stickers_fantasy(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stickers_tech_created_at ON stickers_tech(created_at DESC);

-- 注释：在Supabase控制台的SQL编辑器中执行此脚本
-- 执行后，您的应用将能够使用分类表存储和检索贴纸数据