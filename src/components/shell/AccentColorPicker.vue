<script>
import usePreferences from '@/mixins/usePreferences'

const presets = [
  { id: 'blue', color: '#007AFF', label: 'Blue' },
  { id: 'purple', color: '#AF52DE', label: 'Purple' },
  { id: 'pink', color: '#FF2D55', label: 'Pink' },
  { id: 'red', color: '#FF3B30', label: 'Red' },
  { id: 'orange', color: '#FF9500', label: 'Orange' },
  { id: 'green', color: '#34C759', label: 'Green' },
  { id: 'teal', color: '#5AC8FA', label: 'Teal' },
  { id: 'graphite', color: '#8E8E93', label: 'Graphite' },
]

export default {
  name: 'AccentColorPicker',
  mixins: [usePreferences],
  data() {
    return {
      presets,
      customColor: '#007AFF',
    }
  },
  created() {
    this.customColor = this.accentColor
  },
  methods: {
    selectPreset(preset) {
      this.setPreference('accentColor', preset.color)
      this.customColor = preset.color
    },
    applyCustom() {
      this.setPreference('accentColor', this.customColor)
    },
  },
}
</script>

<template>
  <div class="accent-picker">
    <div class="preset-grid">
      <button
        v-for="p in presets"
        :key="p.id"
        class="preset-swatch"
        :class="{ active: accentColor === p.color }"
        :style="{ backgroundColor: p.color }"
        :title="p.label"
        @click="selectPreset(p)"
      />
    </div>
    <div class="custom-row mt-2">
      <input
        v-model="customColor"
        type="color"
        class="color-input"
        @change="applyCustom"
      >
      <span class="color-hex">{{ customColor }}</span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.accent-picker {
  padding: 0.25rem 0;
}

.preset-grid {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.preset-swatch {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
  outline: none;

  &:hover {
    transform: scale(1.15);
  }

  &.active {
    border-color: rgba(0, 0, 0, 0.3);
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8), 0 0 0 4px currentColor;
  }
}

.custom-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.color-input {
  width: 1.75rem;
  height: 1.75rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  padding: 0;
  background: none;
}

.color-hex {
  font-size: 0.75rem;
  font-family: monospace;
  color: rgba(74, 74, 74, 0.6);
}
</style>
