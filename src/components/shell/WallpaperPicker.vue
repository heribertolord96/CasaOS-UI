<script>
import usePreferences from '@/mixins/usePreferences'

const CUSTOM_WALLPAPER_KEY = 'casaos_custom_wallpaper'
const MAX_IMAGE_SIZE = 2 * 1024 * 1024

const gradientPresets = [
  { id: 'gradient-1', label: 'Ocean', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { id: 'gradient-2', label: 'Sunset', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { id: 'gradient-3', label: 'Forest', value: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { id: 'gradient-4', label: 'Dusk', value: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' },
  { id: 'gradient-5', label: 'Night', value: 'linear-gradient(135deg, #0c3483 0%, #a2b6df 100%)' },
]

export default {
  name: 'WallpaperPicker',
  mixins: [usePreferences],
  data() {
    return {
      solidColor: '#1a1a2e',
      gradientPresets,
      builtInWallpapers: [
        { id: 'wp-01', path: require('@/assets/background/wallpaper01.jpg') },
        { id: 'wp-02', path: require('@/assets/background/wallpaper02.jpg') },
      ],
      customImagePreview: null,
    }
  },
  created() {
    const stored = localStorage.getItem(CUSTOM_WALLPAPER_KEY)
    if (stored) {
      this.customImagePreview = stored
    }
  },
  methods: {
    selectBuiltIn(wp) {
      this.$store.commit('SET_WALLPAPER', { path: wp.path, from: 'Built-in' })
    },
    applySolidColor() {
      this.$store.commit('SET_WALLPAPER', { path: '', from: 'SolidColor', color: this.solidColor })
      const bg = document.getElementById('background')
      if (bg) {
        bg.style.backgroundImage = 'none'
        bg.style.backgroundColor = this.solidColor
      }
    },
    applyGradient(gradient) {
      this.$store.commit('SET_WALLPAPER', { path: '', from: 'Gradient', gradient: gradient.value })
      const bg = document.getElementById('background')
      if (bg) {
        bg.style.backgroundImage = gradient.value
      }
    },
    onFileSelect(event) {
      const file = event.target.files[0]
      if (!file) return

      if (file.size > MAX_IMAGE_SIZE) {
        this.$buefy.toast.open({
          message: 'Image too large (max 2MB)',
          type: 'is-warning',
        })
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const base64 = e.target.result
        try {
          localStorage.setItem(CUSTOM_WALLPAPER_KEY, base64)
          this.customImagePreview = base64
          this.$store.commit('SET_WALLPAPER', { path: base64, from: 'Upload' })
        } catch (err) {
          this.$buefy.toast.open({
            message: 'Failed to save image (storage full)',
            type: 'is-danger',
          })
        }
      }
      reader.readAsDataURL(file)
    },
    applyCustomImage() {
      if (this.customImagePreview) {
        this.$store.commit('SET_WALLPAPER', { path: this.customImagePreview, from: 'Upload' })
      }
    },
    triggerFileInput() {
      this.$refs.fileInput.click()
    },
  },
}
</script>

<template>
  <div class="wallpaper-picker">
    <h4 class="picker-section-title">{{ $t('Built-in') }}</h4>
    <div class="picker-grid">
      <div
        v-for="wp in builtInWallpapers"
        :key="wp.id"
        class="picker-thumb"
        :style="{ backgroundImage: `url(${wp.path})` }"
        @click="selectBuiltIn(wp)"
      />
    </div>

    <h4 class="picker-section-title mt-3">{{ $t('Gradients') }}</h4>
    <div class="picker-grid">
      <div
        v-for="g in gradientPresets"
        :key="g.id"
        class="picker-thumb"
        :style="{ backgroundImage: g.value }"
        @click="applyGradient(g)"
      />
    </div>

    <h4 class="picker-section-title mt-3">{{ $t('Solid Color') }}</h4>
    <div class="is-flex is-align-items-center gap-2">
      <input
        v-model="solidColor"
        type="color"
        class="color-input"
      >
      <b-button size="is-small" type="is-dark" rounded @click="applySolidColor">
        {{ $t('Apply') }}
      </b-button>
    </div>

    <h4 class="picker-section-title mt-3">{{ $t('Custom Image') }}</h4>
    <div class="is-flex is-align-items-center gap-2">
      <div
        v-if="customImagePreview"
        class="picker-thumb"
        :style="{ backgroundImage: `url(${customImagePreview})` }"
        @click="applyCustomImage"
      />
      <b-button size="is-small" type="is-dark" rounded @click="triggerFileInput">
        {{ $t('Upload') }}
      </b-button>
      <input
        ref="fileInput"
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        style="display: none"
        @change="onFileSelect"
      >
    </div>

    <h4 class="picker-section-title mt-3">{{ $t('Effects') }}</h4>
    <div class="is-flex is-align-items-center">
      <span class="is-size-7 mr-2">{{ $t('Blur when apps open') }}</span>
      <b-switch
        :value="wallpaperBlurOnApps"
        type="is-dark"
        size="is-small"
        @input="setPreference('wallpaperBlurOnApps', $event)"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.wallpaper-picker {
  padding: 0.5rem 0;
}

.picker-section-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(74, 74, 74, 0.5);
  margin-bottom: 0.5rem;
}

.picker-grid {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.picker-thumb {
  width: 4.5rem;
  height: 3rem;
  border-radius: 6px;
  background-size: cover;
  background-position: center;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 0.15s, transform 0.15s;

  &:hover {
    border-color: var(--accent-color, #007AFF);
    transform: scale(1.05);
  }
}

.color-input {
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  padding: 0;
  background: none;
}

.gap-2 {
  gap: 0.5rem;
}
</style>
