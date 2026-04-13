const STORAGE_KEY = 'casaos_workspace'
const SNAPSHOT_VERSION = 1
const MAX_APPS = 20

function defaultRect(index) {
  const step = (index % 4) * 2.5
  return {
    left: Math.min(6 + step, 18),
    top: Math.min(4 + step, 16),
    width: Math.max(48 - step * 0.4, 38),
    height: Math.min(78 - step * 0.4, 82),
  }
}

function nextZIndex(apps) {
  const max = apps.reduce((m, a) => Math.max(m, a.zIndex || 0), 99)
  return max + 1
}

function isHttpUrl(s) {
  if (!s || typeof s !== 'string')
    return false
  try {
    const u = new URL(s)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

function clampRect(rect) {
  const minW = 28
  const minH = 28
  const width = Math.min(100, Math.max(minW, rect.width))
  const height = Math.min(100, Math.max(minH, rect.height))
  const left = Math.min(100 - width, Math.max(0, rect.left))
  const top = Math.min(100 - height, Math.max(0, rect.top))
  return { left, top, width, height }
}

function normalizeRectInput(r, index) {
  const base = defaultRect(index)
  if (!r || typeof r !== 'object')
    return base
  const merged = {
    left: Number(r.left),
    top: Number(r.top),
    width: Number(r.width),
    height: Number(r.height),
  }
  if ([merged.left, merged.top, merged.width, merged.height].some(n => !Number.isFinite(n)))
    return base
  return clampRect(merged)
}

function sanitizeAppForRestore(raw, index) {
  if (!raw || typeof raw.id !== 'string' || !raw.url)
    return null
  if (!isHttpUrl(raw.url))
    return null
  const navUrl = raw.navUrl != null && raw.navUrl !== '' ? raw.navUrl : null
  if (navUrl && !isHttpUrl(navUrl))
    return null

  const name = typeof raw.name === 'string' ? raw.name : raw.id
  const groupKey = raw.groupKey != null ? raw.groupKey : name
  const icon = raw.icon != null ? raw.icon : ''
  const state = ['active', 'background', 'minimized'].includes(raw.state) ? raw.state : 'background'
  const maximized = !!raw.maximized
  const rect = normalizeRectInput(raw.rect, index)
  const zIndex = Number.isFinite(Number(raw.zIndex)) ? Math.max(100, Number(raw.zIndex)) : 100 + index

  return {
    id: raw.id,
    groupKey,
    name,
    icon,
    url: raw.url,
    navUrl,
    state,
    maximized,
    rect,
    zIndex,
  }
}

function loadSnapshotFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw)
      return null
    return JSON.parse(raw)
  } catch (e) {
    console.warn('Failed to load workspace from localStorage', e)
    return null
  }
}

function validateSnapshot(data) {
  if (!data || data.v !== SNAPSHOT_VERSION || !Array.isArray(data.openApps))
    return null
  const openApps = []
  for (let i = 0; i < Math.min(data.openApps.length, MAX_APPS); i++) {
    const a = sanitizeAppForRestore(data.openApps[i], i)
    if (a)
      openApps.push(a)
  }
  let activeAppId = data.activeAppId != null ? data.activeAppId : null
  if (activeAppId && !openApps.some(a => a.id === activeAppId))
    activeAppId = openApps.length ? openApps[openApps.length - 1].id : null
  return { openApps, activeAppId }
}

function persistWorkspace(state, rootState) {
  if (!rootState.preferences.rememberWorkspace) {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (e) {
      console.warn('Failed to clear workspace storage', e)
    }
    return
  }
  try {
    const snapshot = {
      v: SNAPSHOT_VERSION,
      savedAt: Date.now(),
      openApps: JSON.parse(JSON.stringify(state.openApps)),
      activeAppId: state.activeAppId,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  } catch (e) {
    console.warn('Failed to save workspace to localStorage', e)
  }
}

const windowManager = {
  namespaced: true,

  state: () => ({
    openApps: [],
    activeAppId: null,
  }),

  getters: {
    openApps: s => s.openApps,
    activeAppId: s => s.activeAppId,
    activeApp: s => s.openApps.find(a => a.id === s.activeAppId) || null,
    isAppOpen: s => id => s.openApps.some(a => a.id === id),
    showDashboard: s => s.activeAppId === null,
    /** Apps visible on desktop (not minimized) */
    desktopApps: s => s.openApps.filter(a => a.state !== 'minimized'),
  },

  mutations: {
    HYDRATE(state, { openApps, activeAppId }) {
      state.openApps = openApps
      state.activeAppId = activeAppId
    },

    OPEN_APP(state, appInfo) {
      const existing = state.openApps.find(a => a.id === appInfo.id)
      if (existing) {
        state.activeAppId = appInfo.id
        existing.state = 'active'
        existing.zIndex = nextZIndex(state.openApps)
        return
      }
      const idx = state.openApps.length
      const z = appInfo.zIndex != null && Number.isFinite(Number(appInfo.zIndex))
        ? Number(appInfo.zIndex)
        : nextZIndex(state.openApps)

      let navUrl = appInfo.navUrl != null && appInfo.navUrl !== '' ? appInfo.navUrl : null
      if (navUrl && !isHttpUrl(navUrl))
        navUrl = null

      const stateVal = appInfo.state != null && ['active', 'background', 'minimized'].includes(appInfo.state)
        ? appInfo.state
        : 'active'

      state.openApps.push({
        id: appInfo.id,
        /** Logical app id for TabBar grouping (e.g. same Docker app name) */
        groupKey: appInfo.groupKey != null ? appInfo.groupKey : appInfo.name,
        name: appInfo.name,
        icon: appInfo.icon,
        url: appInfo.url,
        navUrl,
        state: stateVal,
        maximized: appInfo.maximized != null ? !!appInfo.maximized : idx === 0,
        rect: normalizeRectInput(appInfo.rect, idx),
        zIndex: z,
      })
      state.activeAppId = appInfo.id
    },

    CLOSE_APP(state, appId) {
      const idx = state.openApps.findIndex(a => a.id === appId)
      if (idx !== -1) {
        state.openApps.splice(idx, 1)
      }
      if (state.activeAppId === appId) {
        const last = state.openApps[state.openApps.length - 1]
        state.activeAppId = last ? last.id : null
      }
    },

    SET_ACTIVE_APP(state, appId) {
      const target = state.openApps.find(a => a.id === appId)
      if (target) {
        target.zIndex = nextZIndex(state.openApps)
      }
      state.activeAppId = appId
      state.openApps.forEach((a) => {
        if (a.id === appId) {
          a.state = 'active'
        } else if (a.state === 'active') {
          a.state = 'background'
        }
      })
    },

    MINIMIZE_APP(state, appId) {
      const app = state.openApps.find(a => a.id === appId)
      if (app) {
        app.state = 'minimized'
      }
      if (state.activeAppId === appId) {
        const visible = state.openApps.filter(a => a.state !== 'minimized')
        const last = visible[visible.length - 1]
        state.activeAppId = last ? last.id : null
      }
    },

    SHOW_DASHBOARD(state) {
      state.activeAppId = null
    },

    SET_APP_RECT(state, { appId, rect }) {
      const app = state.openApps.find(a => a.id === appId)
      if (!app)
        return
      app.rect = { ...app.rect, ...rect }
      const minW = 28
      const minH = 28
      app.rect.width = Math.min(100, Math.max(minW, app.rect.width))
      app.rect.height = Math.min(100, Math.max(minH, app.rect.height))
      app.rect.left = Math.min(100 - app.rect.width, Math.max(0, app.rect.left))
      app.rect.top = Math.min(100 - app.rect.height, Math.max(0, app.rect.top))
    },

    SET_APP_MAXIMIZED(state, { appId, maximized }) {
      const app = state.openApps.find(a => a.id === appId)
      if (app) {
        app.maximized = maximized
      }
    },

    TOGGLE_APP_MAXIMIZED(state, appId) {
      const app = state.openApps.find(a => a.id === appId)
      if (app) {
        app.maximized = !app.maximized
      }
    },

    SET_APP_NAV_URL(state, { appId, navUrl }) {
      const app = state.openApps.find(a => a.id === appId)
      if (!app)
        return
      if (navUrl && !isHttpUrl(navUrl))
        return
      app.navUrl = navUrl && navUrl !== '' ? navUrl : null
    },
  },

  actions: {
    openApp({ commit, state, rootState }, appInfo) {
      commit('OPEN_APP', appInfo)
      persistWorkspace(state, rootState)
    },
    closeApp({ commit, state, rootState }, appId) {
      commit('CLOSE_APP', appId)
      persistWorkspace(state, rootState)
    },
    activateApp({ commit, state, rootState }, appId) {
      commit('SET_ACTIVE_APP', appId)
      persistWorkspace(state, rootState)
    },
    minimizeApp({ commit, state, rootState }, appId) {
      commit('MINIMIZE_APP', appId)
      persistWorkspace(state, rootState)
    },
    showDashboard({ commit, state, rootState }) {
      commit('SHOW_DASHBOARD')
      persistWorkspace(state, rootState)
    },
    setAppRect({ commit, state, rootState }, payload) {
      commit('SET_APP_RECT', payload)
      persistWorkspace(state, rootState)
    },
    setAppMaximized({ commit, state, rootState }, payload) {
      commit('SET_APP_MAXIMIZED', payload)
      persistWorkspace(state, rootState)
    },
    toggleAppMaximized({ commit, state, rootState }, appId) {
      commit('TOGGLE_APP_MAXIMIZED', appId)
      persistWorkspace(state, rootState)
    },
    setAppNavUrl({ commit, state, rootState }, payload) {
      commit('SET_APP_NAV_URL', payload)
      persistWorkspace(state, rootState)
    },
    restoreFromStorage({ commit, rootState }) {
      if (!rootState.preferences.rememberWorkspace)
        return
      const raw = loadSnapshotFromStorage()
      const validated = validateSnapshot(raw)
      if (!validated)
        return
      commit('HYDRATE', validated)
    },
  },
}

export default windowManager
