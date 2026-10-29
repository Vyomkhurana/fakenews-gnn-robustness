// Real outputs exported by src/export_demo_json.py (python). Nothing here is typed in by hand.
import resultsJson from './data/results.json'
import storiesJson from './data/stories.json'

export type NodeType = 'news' | 'user' | 'bot'
export interface GNode {
  id: number
  type: NodeType
  x: number
  y: number
  depth: number
  order: number
  handle: string
  followersPct: number
  statusesPct: number
  agePct: number
}
export interface Story {
  testIndex: number
  newsId: string | null
  headline: string | null
  label: string
  truth: string
  n: number
  users: number
  k: number
  edgeCount: number
  maxDepth: number
  nodes: GNode[]
  edges: [number, number][]
  bots: number[]
  p: number[] // P(fake): 0 clean, 1 attacked, 2 attacked + filter, 3 adv-trained under adaptive attack
  importance: number[][]
  filter: { checked: number; flagged: number; flaggedBots: number }
}

export const stories = storiesJson as unknown as Story[]
export const results = resultsJson
export const MODELS = ['GCN', 'GAT', 'SAGE'] as const
export const MODEL_COLORS: Record<string, string> = { GCN: '#7B96FF', GAT: '#B9A8FF', SAGE: '#5CE1E6' }

export const C = {
  bg: '#0A0F1E', card: '#141B2F', ink: '#EAF0FF', muted: '#8F9AC0', coral: '#FF4D6D', blue: '#7B96FF',
  green: '#2EE6A8', amber: '#FFB547', purple: '#6C5CE7', violet: '#B9A8FF', line: '#263055', edge: '#3B4A7E',
}

export const storyTitle = (s: Story) => s.headline ?? s.label
export const pct = (v: number, d = 1) => `${(100 * v).toFixed(d)}%`
export const f3 = (v: number) => v.toFixed(3)
