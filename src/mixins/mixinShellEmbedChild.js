import { postEmbedCloseToParent } from '@/utils/shellEmbedBridge'

/**
 * Use in route components shown inside EmbeddedViewer (iframe).
 * Parent document does not wrap <router-view> with @close, so $emit('close') is a no-op there.
 */
export default {
  methods: {
    requestPanelClose() {
      const id = this.$route.query.embedWindowId
      if (id && typeof window !== 'undefined' && window.self !== window.top) {
        postEmbedCloseToParent(String(id))
        return
      }
      this.$emit('close')
    },
  },
}
