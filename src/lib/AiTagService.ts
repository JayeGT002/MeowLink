// ============================================================
// AiTagService — Mock AI 标签生成服务
// 当前基于域名/标题关键词映射，后续接入真实 AI 只需替换此文件
// ============================================================

/**
 * 根据 URL 和标题生成 AI 标签（Mock 实现）
 * 返回 2-5 个标签，后续可替换为真实 AI API 调用
 */
export async function generateAiTags(
  url: string,
  title: string,
  description?: string
): Promise<string[]> {
  const domain = extractDomain(url)
  const text = `${domain} ${title} ${description || ''}`.toLowerCase()
  const matched = new Set<string>()

  // 域名 → 标签映射
  const domainRules: [string, string[]][] = [
    ['github.com', ['开源', '工具', '代码']],
    ['gitlab.com', ['开源', '工具']],
    ['stackoverflow.com', ['教程', '问答']],
    ['react.dev', ['React', '前端', '教程']],
    ['nextjs.org', ['React', 'Next.js', '前端']],
    ['vercel.com', ['工具', '前端']],
    ['tailwindcss.com', ['CSS', '前端', '教程']],
    ['typescriptlang.org', ['TypeScript', '教程']],
    ['nodejs.org', ['Node.js', '后端']],
    ['figma.com', ['设计', '工具']],
    ['dribbble.com', ['设计', '灵感']],
    ['behance.net', ['设计', '作品']],
    ['notion.so', ['工具', '效率']],
    ['linear.app', ['工具', '项目管理']],
    ['docker.com', ['DevOps', '工具', '教程']],
    ['prisma.io', ['TypeScript', '数据库', 'ORM']],
    ['supabase.com', ['工具', '开源', '数据库']],
    ['vitejs.dev', ['前端', '工具', '构建']],
    ['eslint.org', ['工具', '代码质量']],
    ['astro.build', ['前端', '框架', 'SSG']],
    ['vitest.dev', ['工具', '测试']],
    ['radix-ui.com', ['React', '开源', 'UI']],
    ['framer.com', ['设计', '工具']],
    ['bun.sh', ['工具', '运行时']],
    ['raycast.com', ['工具', '效率']],
    ['tanstack.com', ['React', 'TypeScript', '状态管理']],
    ['zustand-demo.pmnd.rs', ['React', '状态管理']],
    ['caniuse.com', ['CSS', '工具', '参考']],
    ['developer.mozilla.org', ['教程', '前端', '文档']],
    ['css-tricks.com', ['CSS', '教程']],
    ['joshwcomeau.com', ['CSS', 'React', '教程']],
    ['ui.shadcn.com', ['React', '开源', 'UI']],
  ]

  for (const [domainPattern, tags] of domainRules) {
    if (domain.includes(domainPattern)) {
      for (const t of tags) matched.add(t)
    }
  }

  // 标题关键词 → 标签映射
  const keywordRules: [string[], string][] = [
    [['react', 'hooks', 'jsx', 'virtual dom'], 'React'],
    [['next.js', 'nextjs', 'ssr', 'server component'], 'Next.js'],
    [['typescript', 'ts', 'type system', 'generics'], 'TypeScript'],
    [['tailwind', 'utility css', 'utility-first'], 'CSS'],
    [['css', 'style', 'flexbox', 'grid', 'animation'], 'CSS'],
    [['node', 'nodejs', 'express', 'fastify', 'koa'], 'Node.js'],
    [['docker', 'container', 'kubernetes', 'k8s'], 'DevOps'],
    [['database', 'sql', 'postgres', 'mysql', 'mongodb'], '数据库'],
    [['api', 'rest', 'graphql', 'endpoint'], 'API'],
    [['test', 'testing', 'jest', 'vitest', 'cypress'], '测试'],
    [['design', 'ui', 'ux', 'figma', 'sketch', 'prototype'], '设计'],
    [['tutorial', 'guide', 'learn', '教程', 'doc', 'document'], '教程'],
    [['open source', 'github', '开源', 'repository'], '开源'],
    [['tool', '工具', 'platform', 'service', 'app'], '工具'],
    [['blog', 'article', 'post', '文章', '博客'], '文章'],
    [['performance', 'optimization', 'speed', 'fast', '性能'], '性能'],
    [['security', 'auth', 'authentication', 'vulnerability'], '安全'],
    [['ai', 'machine learning', 'ml', 'llm', 'gpt', 'chatgpt'], 'AI'],
    [['python', 'django', 'flask', 'fastapi'], 'Python'],
    [['rust', 'cargo', 'wasm'], 'Rust'],
    [['javascript', 'js', 'ecmascript', 'es6'], 'JavaScript'],
    [['frontend', '前端', 'browser', 'spa'], '前端'],
    [['backend', 'server', '后端', 'microservice', 'api gateway'], '后端'],
    [['framework', '框架', 'library', '库'], '框架'],
    [['resource', '资源', 'template', 'collection', 'awesome'], '资源'],
    [['static site', 'jamstack', 'ssg', 'hugo', 'gatsby'], '静态网站'],
    [['state management', '状态管理', 'store', 'redux'], '状态管理'],
  ]

  for (const [keywords, tag] of keywordRules) {
    if (keywords.some((k) => text.includes(k))) {
      matched.add(tag)
    }
  }

  // 去重、限制 2-5 个
  const result = [...matched]
  if (result.length < 2) {
    // 补充通用标签
    const fallbacks = ['工具', '参考', '书签']
    for (const fb of fallbacks) {
      if (!matched.has(fb)) result.push(fb)
      if (result.length >= 2) break
    }
  }

  return result.slice(0, 5)
}

/**
 * 从 URL 提取域名
 */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

// ============================================================
// 工具函数
// ============================================================

/** 标签归一化：大小写不敏感匹配已有标签 */
export function normalizeTag(input: string, existingTags: string[]): string {
  const found = existingTags.find((t) => t.toLowerCase() === input.toLowerCase())
  return found || input
}

/** 去重并过滤停用词 */
export function deduplicateTags(tags: string[]): string[] {
  const seen = new Set<string>()
  const stopWords = new Set(['the', 'a', 'an', 'is', 'of', 'in', 'for', 'to', 'and', 'or'])
  return tags.filter((t) => {
    const lower = t.toLowerCase()
    if (stopWords.has(lower)) return false
    if (seen.has(lower)) return false
    seen.add(lower)
    return true
  })
}
