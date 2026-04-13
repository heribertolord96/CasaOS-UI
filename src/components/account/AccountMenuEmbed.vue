<script>
/**
 * Account UI for the App menu pane (narrow column). Same behaviour as AccountPanel, layout tuned for embed.
 */
import { ValidationObserver, ValidationProvider } from 'vee-validate'
import '@/plugins/vee-validate'
import { Cropper, Preview } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'
import 'vue-advanced-cropper/dist/theme.compact.css'

function getMimeType(file, fallback = null) {
  const byteArray = (new Uint8Array(file)).subarray(0, 4)
  let header = ''
  for (let i = 0; i < byteArray.length; i++) {
    header += byteArray[i].toString(16)
  }
  switch (header) {
    case '89504e47':
      return 'image/png'
    case '47494638':
      return 'image/gif'
    case 'ffd8ffe0':
    case 'ffd8ffe1':
    case 'ffd8ffe2':
    case 'ffd8ffe3':
    case 'ffd8ffe8':
      return 'image/jpeg'
    default:
      return fallback
  }
}

export default {
  name: 'AccountMenuEmbed',
  components: {
    ValidationObserver,
    ValidationProvider,
    Cropper,
    Preview,
  },
  data() {
    return {
      isLoading: false,
      state: 1,
      user: this.$store.state.user,
      username: this.$store.state.user.username,
      /** Bust browser cache after a successful avatar upload */
      avatarCacheBust: 0,
      oriPassword: '',
      password: '',
      confirmation: '',
      message: '',
      notificationShow: false,
      image: {
        src: null,
        type: null,
      },
      result: {
        coordinates: null,
        image: null,
        canvas: null,
      },
      stencilProps: {
        aspectRatio: 1,
      },
      canvasProps: {
        height: 160,
        width: 160,
      },
    }
  },
  computed: {
    title() {
      let val = ''
      switch (this.state) {
        case 1:
          val = this.$t('Account')
          break
        case 2:
          val = this.$t('Change name')
          break
        case 3:
          val = this.$t('Change Password')
          break
        case 4:
          val = this.$t('Change Avatar')
          break
        default:
          break
      }
      return val
    },
    userInfo() {
      return this.$store.state.user
    },
    bodyPadding() {
      return this.state === 1 || this.state === 4 ? 'account-menu-embed__body--padded' : ''
    },
    buttonAlign() {
      return this.state === 1 ? 'is-justify-content-center' : 'is-justify-content-end'
    },
    /** Absolute URL so <img> loads reliably inside the App menu scroll pane (relative v1/… can mis-resolve). */
    avatarSrc() {
      const token = this.$store.state.token || localStorage.getItem('access_token') || ''
      const bust = this.avatarCacheBust ? `&_=${this.avatarCacheBust}` : ''
      return `${this.$protocol}//${this.$baseURL}/v1/users/avatar?token=${encodeURIComponent(token)}${bust}`
    },
  },
  destroyed() {
    if (this.image.src) {
      URL.revokeObjectURL(this.image.src)
    }
  },
  methods: {
    goto(val) {
      this.state = val
      if (val === 1) {
        if (this.image.src) {
          URL.revokeObjectURL(this.image.src)
        }
        this.oriPassword = ''
        this.password = ''
        this.confirmation = ''
        this.username = this.userInfo.username
      }
    },
    onChange({ coordinates, image, canvas }) {
      this.result = {
        coordinates,
        image,
        canvas,
      }
    },
    loadImage(event) {
      const { files } = event.target
      if (files && files[0]) {
        if (this.image.src) {
          URL.revokeObjectURL(this.image.src)
        }
        const blob = URL.createObjectURL(files[0])
        const reader = new FileReader()
        reader.onload = (e) => {
          this.image = {
            src: blob,
            type: getMimeType(e.target.result, files[0].type),
          }
          this.goto(4)
        }
        reader.readAsArrayBuffer(files[0])
      }
    },
    defaultSize({ imageSize, visibleArea }) {
      return {
        width: (visibleArea || imageSize).width,
        height: (visibleArea || imageSize).height,
      }
    },
    async updateUserInfo() {
      try {
        const userRes = await this.$api.users.getUserInfo()
        this.$store.commit('SET_USER', userRes.data.data)
        this.goto(1)
      }
      catch (error) {
        console.error(error.response.message)
      }
    },
    async saveUser() {
      this.isLoading = true
      try {
        const res = await this.$api.users.setUserInfo(this.user)
        this.$store.commit('SET_USER', res.data.data)
        this.user = res.data.data
        this.goto(1)
        this.isLoading = false
      }
      catch (error) {
        console.error(error.response.message)
        this.isLoading = false
      }
    },
    async savePassword() {
      this.isLoading = true
      try {
        await this.$api.users.changePassword({
          old_password: this.oriPassword,
          password: this.password,
        })
        this.oriPassword = ''
        this.password = ''
        this.confirmation = ''
        this.isLoading = false
        this.goto(1)
      }
      catch (error) {
        this.isLoading = false
        this.notificationShow = true
        this.message = error.response.data.message
      }
    },
    async saveAvatar() {
      this.isLoading = true
      const imageData = this.result.canvas.toDataURL()
      this.$api.users.saveAvatar({ file: imageData }).then(() => {
        this.avatarCacheBust = Date.now()
        this.$buefy.toast.open({
          message: this.$t(`Update successful`),
          type: 'is-success',
        })
        this.isLoading = false
        this.goto(1)
      }).catch(() => {
        this.$buefy.toast.open({
          message: this.$t(`Update failure`),
          type: 'is-danger',
        })
        this.isLoading = false
      })
    },
    logout() {
      this.$messageBus('account_setting_logout')
      this.$store.commit('SET_DEFAULT_WALLPAPER')
      this.$router.push('/logout')
    },
  },
}
</script>

<template>
  <div class="account-menu-embed">
    <ValidationObserver v-slot="{ handleSubmit }">
      <header class="account-menu-embed__head">
        <h3 class="account-menu-embed__title title is-6 mb-0">
          {{ title }}
        </h3>
        <b-button :label="$t('Logout')" rounded size="is-small" type="is-danger is-light" @click="logout" />
      </header>

      <section class="account-menu-embed__body" :class="bodyPadding">
        <template v-if="state === 1">
          <div class="is-flex is-justify-content-center mb-4">
            <div class="account-menu-embed__avatar-wrap is-relative">
              <div class="edit-avatar is-absolute">
                <b-icon icon="edit-outline" pack="casa" />
                <input type="file" class="file-input" accept="image/*" @change="loadImage($event)">
              </div>
              <b-image
                :key="avatarSrc"
                :src="avatarSrc"
                :src-fallback="require('@/assets/img/account/default-avatar.svg')"
                class="account-menu-embed__avatar-img is-64x64"
                rounded
              />
            </div>
          </div>
          <div class="mb-4">
            <div class="has-text-emphasis-04 has-text-gray-font mb-2">
              {{ $t('Name') }}
            </div>
            <div class="is-flex is-align-items-center account-item">
              <div class="has-text-emphasis-02 is-flex-grow-1">
                {{ userInfo.username }}
              </div>
              <div class="edit-button" @click.stop="goto(2)">
                <b-icon class="close-button ml-2 has-text-gray-font" icon="edit-outline" pack="casa" />
              </div>
            </div>
          </div>
          <div>
            <div class="has-text-emphasis-04 has-text-gray-font mb-2">
              {{ $t('Password') }}
            </div>
            <div class="is-flex is-align-items-center account-item">
              <div class="has-text-emphasis-02 is-flex-grow-1 has-text-gray-font">
                ••••••
              </div>
              <div class="edit-button" @click.stop="goto(3)">
                <b-icon class="close-button ml-2 has-text-gray-font" icon="edit-outline" pack="casa" />
              </div>
            </div>
          </div>
        </template>

        <template v-else-if="state === 2">
          <ValidationProvider v-slot="{ errors, valid }" name="User" rules="required">
            <b-field :message="$t(errors)" :type="{ 'is-danger': errors[0], 'is-success': valid }" class="mb-0 has-text-light">
              <b-input v-model="user.username" type="text" @keyup.enter.native="handleSubmit(saveUser)" />
            </b-field>
          </ValidationProvider>
        </template>

        <template v-else-if="state === 3">
          <b-notification v-model="notificationShow" aria-close-label="Close notification" auto-close role="alert" type="is-danger">
            {{ message }}
          </b-notification>
          <ValidationProvider v-slot="{ errors, valid }" name="oriPassword" rules="required|min:5" vid="oriPassword">
            <b-field :message="$t(errors)" :type="{ 'is-danger': errors[0], 'is-success': valid }" class="mb-3 has-text-light">
              <b-input v-model="oriPassword" :placeholder="$t('Original password')" password-reveal type="password" />
            </b-field>
          </ValidationProvider>
          <ValidationProvider v-slot="{ errors, valid }" name="Password" rules="required|min:5" vid="password">
            <b-field :message="$t(errors)" :type="{ 'is-danger': errors[0], 'is-success': valid }" class="mb-3 has-text-light">
              <b-input v-model="password" :placeholder="$t('New password')" password-reveal type="password" />
            </b-field>
          </ValidationProvider>
          <ValidationProvider v-slot="{ errors, valid }" name="Password Confirmation" rules="required|confirmed:password">
            <b-field :message="$t(errors)" :type="{ 'is-danger': errors[0], 'is-success': valid }" class="mb-0">
              <b-input v-model="confirmation" :placeholder="$t('Confirm the new password again')" password-reveal type="password" @keyup.enter.native="handleSubmit(savePassword)" />
            </b-field>
          </ValidationProvider>
        </template>

        <template v-else-if="state === 4">
          <div class="account-menu-embed__cropper is-flex is-flex-wrap-wrap is-align-items-flex-start">
            <div class="cropper-wrapper is-flex-grow-0 is-flex-shrink-0">
              <Cropper :src="image.src" :debounce="false" :stencil-props="stencilProps" check-orientation :min-height="80" :min-width="80" :canvas="canvasProps" :default-size="defaultSize" @change="onChange" />
            </div>
            <div class="account-menu-embed__preview-col is-flex is-justify-content-center is-align-items-center is-flex-grow-1 pl-3">
              <div class="has-text-centered">
                <div class="account-menu-embed__preview-ring">
                  <Preview :width="64" :height="64" :image="result.image" :coordinates="result.coordinates" class="preview" />
                </div>
                <p class="has-text-emphasis-04 has-text-gray-font mt-2">
                  Preview
                </p>
              </div>
            </div>
          </div>
        </template>
      </section>

      <footer v-if="state !== 1" class="account-menu-embed__foot is-flex is-align-items-center" :class="buttonAlign">
        <b-button :label="$t('Back')" rounded size="is-small" @click.stop="goto(1)" />
        <b-button v-if="state === 2" :label="$t('Submit')" rounded size="is-small" type="is-dark" @click="handleSubmit(saveUser)" />
        <b-button v-else-if="state === 3" :label="$t('Submit')" rounded size="is-small" type="is-dark" @click="handleSubmit(savePassword)" />
        <b-button v-else-if="state === 4" :label="$t('Submit')" rounded size="is-small" type="is-dark" @click="handleSubmit(saveAvatar)" />
      </footer>
    </ValidationObserver>
    <b-loading v-model="isLoading" :is-full-page="false" />
  </div>
</template>

<style lang="scss" scoped>
.account-menu-embed {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  max-width: 100%;
}

.account-menu-embed__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0 0.25rem 0.75rem;
  margin-bottom: 0.25rem;
  border-bottom: 1px solid var(--shell-divider);
}

.account-menu-embed__title {
  color: var(--shell-dropdown-text);
}

.account-menu-embed__body {
  padding: 0.25rem 0.35rem 0.5rem;

  &.account-menu-embed__body--padded {
    padding-top: 0.5rem;
  }
}

.account-menu-embed__foot {
  padding: 0.75rem 0.35rem 0;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.account-menu-embed__avatar-wrap {
  position: relative;
  width: 64px;
  height: 64px;
  flex-shrink: 0;
}

.account-menu-embed__avatar-img {
  display: block;
  overflow: hidden;
}

.account-menu-embed__avatar-img ::v-deep img {
  width: 64px;
  height: 64px;
  object-fit: cover;
}

.edit-avatar {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.5);
  transition: all 0.3s;
  z-index: 10;
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0;

  .file-input {
    width: 100%;
    height: 100%;
    opacity: 0;
    border-radius: 50%;
    cursor: pointer;
  }

  .icon {
    pointer-events: none;
    color: #fff !important;
  }

  &:hover {
    opacity: 1;
  }
}

.account-menu-embed__preview-col {
  flex: 1 1 96px;
  min-width: 88px;
  min-height: 120px;
}

.account-menu-embed__preview-ring {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  margin: 0 auto;
  overflow: hidden;
  border-radius: 50%;
  background-color: var(--shell-app-menu-muted-surface-strong);
}

.cropper-wrapper {
  width: min(200px, 100%);
  height: 200px;
  overflow: hidden;
  position: relative;
  background-color: var(--shell-app-menu-muted-surface);
  display: flex;
  justify-content: center;
  align-items: center;
}

.preview {
  display: block;
  border-radius: 50%;
}

.account-menu-embed__preview-ring ::v-deep .vue-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
}

.vue-advanced-cropper {
  ::v-deep img {
    max-height: none !important;
  }
}

::v-deep .vue-preview__image {
  max-height: none !important;
}

::v-deep .vue-simple-handler-wrapper {
  width: 18px !important;
  height: 18px !important;
}
</style>
