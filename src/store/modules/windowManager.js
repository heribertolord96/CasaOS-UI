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
    OPEN_APP(state, appInfo) {
      const existing = state.openApps.find(a => a.id === appInfo.id)
      if (existing) {
        state.activeAppId = appInfo.id
        existing.state = 'active'
        existing.zIndex = nextZIndex(state.openApps)
        return
      }
      const idx = state.openApps.length
      const z = nextZIndex(state.openApps)
      state.openApps.push({
        id: appInfo.id,
        name: appInfo.name,
        icon: appInfo.icon,
        url: appInfo.url,
        state: 'active',
        maximized: idx === 0,
        rect: defaultRect(idx),
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
  },

  actions: {
    openApp({ commit }, appInfo) {
      commit('OPEN_APP', appInfo)
    },
    closeApp({ commit }, appId) {
      commit('CLOSE_APP', appId)
    },
    activateApp({ commit }, appId) {
      commit('SET_ACTIVE_APP', appId)
    },
    minimizeApp({ commit }, appId) {
      commit('MINIMIZE_APP', appId)
    },
    showDashboard({ commit }) {
      commit('SHOW_DASHBOARD')
    },
    setAppRect({ commit }, payload) {
      commit('SET_APP_RECT', payload)
    },
    setAppMaximized({ commit }, payload) {
      commit('SET_APP_MAXIMIZED', payload)
    },
    toggleAppMaximized({ commit }, appId) {
      commit('TOGGLE_APP_MAXIMIZED', appId)
    },
  },
}

export default windowManager
