<script>
import usePreferences from '@/mixins/usePreferences'

const CUSTOM_WALLPAPER_KEY = 'casaos_custom_wallpaper'
const WALLPAPER_SERVER_KEY = 'wallpaper'
const MAX_IMAGE_SIZE = 2 * 1024 * 1024
/** Skip syncing huge base64 payloads to custom storage (localStorage still holds wallpaper_object). */
const MAX_WALLPAPER_SYNC_BYTES = 512 * 1024

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
      gradientAngles: [0, 45, 90, 135, 180, 225, 270, 315],
      customGradientAngle: 135,
      customGradientStops: ['#667EEA', '#764BA2'],
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
    /**
     * Keep server custom storage in sync so a fresh profile / empty localStorage can restore the same wallpaper.
     * Large base64 uploads may exceed API limits; local-only still works via getWallpaperConfig + wallpaper_object.
     */
    persistWallpaperToServer(wallpaper) {
      if (!wallpaper || !wallpaper.from) {
        return
      }
      const payload = {
        path: wallpaper.path || '',
        from: wallpaper.from,
      }
      if (wallpaper.color) {
        payload.color = wallpaper.color
      }
      if (wallpaper.gradient) {
        payload.gradient = wallpaper.gradient
      }
      try {
        const n = JSON.stringify(payload).length
        if (n > MAX_WALLPAPER_SYNC_BYTES) {
          return
        }
      } catch (e) {
        return
      }
      this.$api.users.setCustomStorage(WALLPAPER_SERVER_KEY, payload).catch(() => {})
    },

    normalizeHex(value) {
      const input = String(value || '').trim().toUpperCase()
      const withHash = input.startsWith('#') ? input : `#${input}`
      return /^#([0-9A-F]{6})$/.test(withHash) ? withHash : null
    },
    selectBuiltIn(wp) {
      const w = { path: wp.path, from: 'Built-in' }
      this.$store.commit('SET_WALLPAPER', w)
      this.persistWallpaperToServer(w)
    },
    applySolidColor() {
      const normalized = this.normalizeHex(this.solidColor)
      if (!normalized) {
        return
      }
      this.solidColor = normalized
      const w = { path: '', from: 'SolidColor', color: normalized }
      this.$store.commit('SET_WALLPAPER', w)
      this.persistWallpaperToServer(w)
    },
    applyGradient(gradient) {
      const w = { path: '', from: 'Gradient', gradient: gradient.value }
      this.$store.commit('SET_WALLPAPER', w)
      this.persistWallpaperToServer(w)
    },
    updateCustomGradientStop(index, value) {
      const normalized = this.normalizeHex(value)
      if (!normalized) {
        return
      }
      this.$set(this.customGradientStops, index, normalized)
    },
    addGradientStop() {
      this.customGradientStops.push('#FFFFFF')
    },
    removeGradientStop(index) {
      if (this.customGradientStops.length <= 2) {
        return
      }
      this.customGradientStops.splice(index, 1)
    },
    buildCustomGradient() {
      const cleanStops = this.customGradientStops
        .map(color => this.normalizeHex(color))
        .filter(Boolean)
      if (cleanStops.length < 2) {
        return null
      }
      const step = 100 / (cleanStops.length - 1)
      const gradientStops = cleanStops
        .map((color, idx) => `${color} ${Math.round(step * idx)}%`)
        .join(', ')
      return `linear-gradient(${this.customGradientAngle}deg, ${gradientStops})`
    },
    applyCustomGradient() {
      const gradient = this.buildCustomGradient()
      if (!gradient) {
        return
      }
      const w = { path: '', from: 'Gradient', gradient }
      this.$store.commit('SET_WALLPAPER', w)
      this.persistWallpaperToServer(w)
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
          const w = { path: base64, from: 'Upload' }
          this.$store.commit('SET_WALLPAPER', w)
          this.persistWallpaperToServer(w)
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
        const w = { path: this.customImagePreview, from: 'Upload' }
        this.$store.commit('SET_WALLPAPER', w)
        this.persistWallpaperToServer(w)
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
    <h4 class="picker-section-title mt-2">{{ $t('Custom gradient') }}</h4>
    <div class="is-flex is-align-items-center gap-2 mb-1">
      <span class="is-size-7 picker-meta-label">{{ $t('Angle') }}</span>
      <b-select v-model="customGradientAngle" size="is-small">
        <option v-for="deg in gradientAngles" :key="deg" :value="deg">
          {{ deg }}deg
        </option>
      </b-select>
      <b-button size="is-small" type="is-dark" rounded @click="addGradientStop">
        {{ $t('Add color') }}
      </b-button>
    </div>
    <div class="picker-grid picker-grid--stops">
      <div
        v-for="(stop, idx) in customGradientStops"
        :key="`stop-${idx}`"
        class="gradient-stop-tile"
      >
        <input
          :value="stop"
          type="color"
          class="color-input color-input--stop"
          @input="updateCustomGradientStop(idx, $event.target.value)"
        >
        <button
          v-if="customGradientStops.length > 2"
          type="button"
          class="gradient-stop-remove"
          @click="removeGradientStop(idx)"
        >
          ×
        </button>
      </div>
      <div
        class="picker-thumb picker-thumb--preview"
        :style="{ backgroundImage: buildCustomGradient() || 'none' }"
        @click="applyCustomGradient"
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
    <div class="picker-grid">
      <div
        v-if="customImagePreview"
        class="picker-thumb"
        :style="{ backgroundImage: `url(${customImagePreview})` }"
        @click="applyCustomImage"
      />
      <button
        type="button"
        class="picker-thumb picker-thumb-upload"
        @click="triggerFileInput"
      >
        <span class="picker-upload-text">{{ $t('Upload') }}</span>
      </button>
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
  color: var(--shell-muted-text, rgba(74, 74, 74, 0.5));
  margin-bottom: 0.5rem;
}

.picker-grid {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.picker-grid--stops {
  align-items: center;
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

.picker-thumb-upload {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--shell-settings-btn-bg, rgba(255, 255, 255, 0.08));
  border: 1px dashed var(--shell-select-border, rgba(255, 255, 255, 0.3));
  color: var(--shell-dropdown-text, #fff);
}

.picker-thumb--preview {
  border-style: solid;
}

.picker-upload-text {
  font-size: 0.72rem;
  font-weight: 600;
}

.gradient-stop-tile {
  position: relative;
  width: 2rem;
  height: 2rem;
}

.gradient-stop-remove {
  position: absolute;
  top: -0.35rem;
  right: -0.35rem;
  width: 0.95rem;
  height: 0.95rem;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.65);
  color: #fff;
  font-size: 0.75rem;
  line-height: 1;
  cursor: pointer;
  padding: 0;
}

.picker-meta-label {
  color: var(--shell-muted-text);
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

.color-input--stop {
  width: 100%;
  height: 100%;
  border-radius: 6px;
}

.gap-2 {
  gap: 0.5rem;
}
</style>
