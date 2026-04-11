export default {
  computed: {
    openMode() {
      return this.$store.getters['preferences/openMode']
    },
    accentColor() {
      return this.$store.getters['preferences/accentColor']
    },
    iconSize() {
      return this.$store.getters['preferences/iconSize']
    },
    gridDensity() {
      return this.$store.getters['preferences/gridDensity']
    },
    showAppLabels() {
      return this.$store.getters['preferences/showAppLabels']
    },
    wallpaperBlurOnApps() {
      return this.$store.getters['preferences/wallpaperBlurOnApps']
    },
    hiddenSections() {
      return this.$store.getters['preferences/hiddenSections']
    },
    tabBarDisplay() {
      return this.$store.getters['preferences/tabBarDisplay']
    },
    appMenuDisplay() {
      return this.$store.getters['preferences/appMenuDisplay']
    },
  },

  methods: {
    setPreference(key, value) {
      this.$store.commit('preferences/SET_PREFERENCE', { key, value })
    },
    toggleSectionVisibility(sectionId) {
      this.$store.commit('preferences/TOGGLE_SECTION_VISIBILITY', sectionId)
    },
    isSectionHidden(sectionId) {
      return this.$store.getters['preferences/isSectionHidden'](sectionId)
    },
    restoreAllSections() {
      this.$store.commit('preferences/RESTORE_ALL_SECTIONS')
    },
  },
}
