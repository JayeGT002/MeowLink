'use client'

import {
  AllApplication,
  AppSwitch,
  Book,
  BookOne,
  Bookmark,
  BookmarkOne,
  Bookshelf,
  Browser,
  Code,
  CodeBrackets,
  CodeComputer,
  Connect,
  DataAll,
  DataSheet,
  DatabasePoint,
  FolderCode,
  FolderOpen,
  FolderPlus,
  Github,
  GraphicDesign,
  GridFour,
  GridTwo,
  Home,
  Inbox,
  InboxIn,
  InboxOut,
  Layers,
  LinkCloud,
  LinkOne,
  Magic,
  Message,
  MindMapping,
  Picture,
  Planet,
  Platte,
  Play,
  Ranking,
  Rocket,
  SettingConfig,
  SettingTwo,
  Star,
  Terminal,
  Thunderbolt,
  Tips,
  Tool,
  TreeDiagram,
  Trophy,
  World,
} from '@icon-park/react'

// ============================================================
// IconPark 图标映射 — 精选 46 个适合文件夹的图标
// 使用 outline 风格，统一单色
// ============================================================

export type IconName = string

export interface IconDef {
  name: IconName
  label: string
  component: React.ComponentType<{
    theme?: 'outline' | 'filled' | 'two-tone' | 'multi-color'
    size?: number
    fill?: string | string[]
    strokeLinecap?: 'butt' | 'round' | 'square'
    strokeLinejoin?: 'miter' | 'round' | 'bevel'
    strokeWidth?: number
  }>
}

/** 所有可用图标，分类分组 */
export const FOLDER_ICONS: { category: string; icons: IconDef[] }[] = [
  {
    category: '通用',
    icons: [
      { name: 'Home', label: '首页', component: Home },
      { name: 'Inbox', label: '收件箱', component: Inbox },
      { name: 'InboxIn', label: '收入', component: InboxIn },
      { name: 'InboxOut', label: '发出', component: InboxOut },
      { name: 'Star', label: '收藏', component: Star },
      { name: 'Bookmark', label: '书签', component: Bookmark },
      { name: 'BookmarkOne', label: '书签1', component: BookmarkOne },
      { name: 'Bookshelf', label: '书架', component: Bookshelf },
      { name: 'Book', label: '书本', component: Book },
      { name: 'BookOne', label: '书本1', component: BookOne },
      { name: 'Trophy', label: '奖杯', component: Trophy },
      { name: 'Ranking', label: '排名', component: Ranking },
    ],
  },
  {
    category: '开发',
    icons: [
      { name: 'Code', label: '代码', component: Code },
      { name: 'CodeBrackets', label: '代码块', component: CodeBrackets },
      { name: 'CodeComputer', label: '编程', component: CodeComputer },
      { name: 'Terminal', label: '终端', component: Terminal },
      { name: 'FolderCode', label: '代码文件夹', component: FolderCode },
      { name: 'FolderOpen', label: '打开文件夹', component: FolderOpen },
      { name: 'DataAll', label: '全数据', component: DataAll },
      { name: 'DataSheet', label: '数据表', component: DataSheet },
      { name: 'DatabasePoint', label: '数据库', component: DatabasePoint },
      { name: 'Github', label: 'GitHub', component: Github },
      { name: 'Tool', label: '工具', component: Tool },
      { name: 'Connect', label: '连接', component: Connect },
    ],
  },
  {
    category: '设计',
    icons: [
      { name: 'GraphicDesign', label: '图形设计', component: GraphicDesign },
      { name: 'Magic', label: '魔法棒', component: Magic },
      { name: 'Platte', label: '调色板', component: Platte },
      { name: 'Picture', label: '图片', component: Picture },
      { name: 'MindMapping', label: '思维导图', component: MindMapping },
      { name: 'Layers', label: '图层', component: Layers },
    ],
  },
  {
    category: '网络',
    icons: [
      { name: 'World', label: '全球', component: World },
      { name: 'Browser', label: '浏览器', component: Browser },
      { name: 'Planet', label: '星球', component: Planet },
      { name: 'Rocket', label: '火箭', component: Rocket },
      { name: 'LinkOne', label: '链接', component: LinkOne },
      { name: 'LinkCloud', label: '云链接', component: LinkCloud },
      { name: 'Play', label: '播放', component: Play },
      { name: 'Thunderbolt', label: '闪电', component: Thunderbolt },
      { name: 'Tips', label: '提示', component: Tips },
      { name: 'Message', label: '消息', component: Message },
    ],
  },
  {
    category: '系统',
    icons: [
      { name: 'AppSwitch', label: '切换', component: AppSwitch },
      { name: 'AllApplication', label: '全部应用', component: AllApplication },
      { name: 'GridFour', label: '四宫格', component: GridFour },
      { name: 'GridTwo', label: '两列', component: GridTwo },
      { name: 'TreeDiagram', label: '树状图', component: TreeDiagram },
      { name: 'SettingConfig', label: '配置', component: SettingConfig },
      { name: 'SettingTwo', label: '设置', component: SettingTwo },
      { name: 'FolderPlus', label: '新建文件夹', component: FolderPlus },
    ],
  },
]

/** 扁平化所有图标 */
export const ALL_ICONS: IconDef[] = FOLDER_ICONS.flatMap((c) => c.icons)

/** 根据名称获取图标组件 */
export function getIconComponent(name: string): React.ComponentType<any> | null {
  const def = ALL_ICONS.find((i) => i.name === name)
  return def?.component || null
}
