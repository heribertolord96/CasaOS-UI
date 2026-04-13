import 'intersection-observer'
import Vue from 'vue'
import App from '@/App.vue'
import router from '@/router'
import store from '@/store'
import i18n from '@/plugins/i18n'
import api from '@/service/api.js'
import openAPI from '@/service/index.js'
import Buefy from 'buefy'
import VueFullscreen from 'vue-fullscreen'
import Vue2TouchEvents from 'vue2-touch-events'
import VueSocialSharing from 'vue-social-sharing'
import VueSocketIOExt from 'vue-socket.io-extended';
import messageBus from '@/events/index.js'
import VueDOMPurifyHTML from 'vue-dompurify-html'
import VAnimateCss from 'v-animate-css'

// Import Styles
import '@/assets/scss/app.scss'

const io = require("socket.io-client");

const isDev = process.env.NODE_ENV === 'dev';
const protocol = document.location.protocol
const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:'
const devIp = process.env.VUE_APP_DEV_IP
const devPort = process.env.VUE_APP_DEV_PORT
const localhost = document.location.host
const localhostName = document.location.hostname
const baseIp = isDev ? `${devIp}` : `${localhostName}`
const baseURL = isDev ? `${devIp}:${devPort}` : `${localhost}`
const wsURL = `${wsProtocol}//${baseURL}`

const socket = io( {
	transports: ['websocket', 'polling'],
	path: '/v2/message_bus/socket.io/',
});

Vue.use(Buefy)
Vue.use(VueFullscreen)
Vue.use(VAnimateCss, { animateCSSPath: '/css/animate.min.css' });
Vue.use(Vue2TouchEvents)
Vue.use(VueSocketIOExt, socket);
Vue.use(VueSocialSharing);
Vue.use(VueDOMPurifyHTML, {
	default: {
		ALLOWED_ATTR: ['target', 'href']
	}
});

Vue.config.productionTip = false

/* Avoid noisy overlays / unhandled rejection for API errors when callers omit .catch() */
function isAxiosLike(reason) {
	if (!reason || typeof reason !== 'object') return false
	return reason.isAxiosError === true || reason.name === 'AxiosError' || !!(reason.config && reason.request)
}

window.addEventListener('unhandledrejection', (event) => {
	const r = event.reason
	if (!isAxiosLike(r)) return
	const st = r?.response?.status
	const msg = r?.message || ''
	const network = msg.includes('Network Error')
	// Backend missing routes or server errors during dev; keep 401/403 visible for debugging auth
	if (st === 404 || (st >= 500 && st < 600) || network) {
		console.warn('[CasaOS UI] Unhandled API error', st || '', r?.config?.url || '', msg)
		event.preventDefault()
	}
})
Vue.prototype.$api = api;
Vue.prototype.$openAPI = openAPI;
Vue.prototype.$baseIp = baseIp;
Vue.prototype.$baseURL = baseURL;
Vue.prototype.$protocol = protocol;
Vue.prototype.$wsProtocol = wsProtocol;


// Create an EventBus
Vue.prototype.$EventBus = new Vue();
Vue.prototype.$messageBus = messageBus;

document.documentElement.setAttribute(
	'data-ui-theme',
	store.state.preferences.uiTheme === 'light' ? 'light' : 'dark',
)
{
	const raw = Number(store.state.preferences.shellOpacity)
	const pct = Number.isFinite(raw) ? raw : 100
	const clamped = Math.min(100, Math.max(15, pct))
	document.documentElement.style.setProperty('--shell-opacity-mul', String(clamped / 100))
}

store.dispatch('windowManager/restoreFromStorage')

store.subscribe((mutation) => {
	if (mutation.type === 'preferences/SET_PREFERENCE'
		&& mutation.payload?.key === 'rememberWorkspace'
		&& mutation.payload.value === false) {
		try {
			localStorage.removeItem('casaos_workspace')
		} catch (e) {
			console.warn('Failed to clear workspace storage', e)
		}
	}
})

new Vue({
	router,
	i18n,
	store,
	render: h => h(App)
}).$mount('#app')





