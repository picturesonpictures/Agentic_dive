import { create } from 'zustand'

// ─── UI Store ─────────────────────────────────────────────────────────────────
// Ephemeral UI state that doesn't persist to localStorage.
// Context menus, quick-connect state, snap-to-grid, etc.

export interface ContextMenuState {
  type: 'node' | 'edge' | 'pane'
  x: number
  y: number
  targetId?: string // node or edge ID
}

export interface PendingConnection {
  nodeId: string
  handleId: string
  handleType: 'source' | 'target'
}

export interface QuickConnectState {
  x: number
  y: number
  connection: PendingConnection
}

interface UIState {
  // Context menu
  contextMenu: ContextMenuState | null
  openContextMenu: (menu: ContextMenuState) => void
  closeContextMenu: () => void

  // Quick-connect menu (drag wire to empty space)
  quickConnect: QuickConnectState | null
  openQuickConnect: (state: QuickConnectState) => void
  closeQuickConnect: () => void

  // Snap-to-grid
  snapEnabled: boolean
  toggleSnap: () => void
}

export const useUIStore = create<UIState>()((set) => ({
  // Context menu
  contextMenu: null,
  openContextMenu: (menu) => set({ contextMenu: menu, quickConnect: null }),
  closeContextMenu: () => set({ contextMenu: null }),

  // Quick-connect
  quickConnect: null,
  openQuickConnect: (state) => set({ quickConnect: state, contextMenu: null }),
  closeQuickConnect: () => set({ quickConnect: null }),

  // Snap
  snapEnabled: false,
  toggleSnap: () => set(s => ({ snapEnabled: !s.snapEnabled })),
}))
