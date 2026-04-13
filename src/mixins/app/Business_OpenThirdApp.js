import { nanoid } from 'nanoid'

export default {
	methods: {
		/** Full URL for same-origin hash routes (embedded iframe shell). */
		embeddedShellAbsoluteUrl(routeLocation) {
			const resolved = this.$router.resolve(routeLocation)
			return new URL(resolved.href, window.location.href).href
		},
		openCasaAppStoreEmbedded() {
			const id = `casa-store-${nanoid(10)}`
			const url = this.embeddedShellAbsoluteUrl({
				name: 'DevelopmentElement',
				query: { embedWindowId: id },
			})
			this.$store.dispatch('windowManager/openApp', {
				id,
				groupKey: 'App Store',
				name: 'App Store',
				icon: require('@/assets/img/app/appstore.svg'),
				url,
				maximized: true,
			})
		},
		/**
		 * Embedded Files window. Each open uses a unique id so multiple windows are allowed.
		 * @param {{ openNewFileModal?: boolean }} opts - if true, opens "new file" flow (text editor entry).
		 */
		openCasaFilesEmbedded(opts = {}) {
			const { openNewFileModal = false } = opts
			const id = `casa-files-${nanoid(10)}`
			const url = this.embeddedShellAbsoluteUrl(
				openNewFileModal
					? { name: 'Files', query: { newFile: '1', cd: '/DATA/Documents', embedWindowId: id } }
					: { name: 'Files', query: { embedWindowId: id } },
			)
			const name = openNewFileModal ? this.$t('Text editor') : this.$t('Files')
			const groupKey = openNewFileModal ? 'casa-files-editor' : 'casa-files'
			this.$store.dispatch('windowManager/openApp', {
				id,
				groupKey,
				name,
				icon: require('@/assets/img/app/files.svg'),
				url,
				maximized: true,
			})
		},
		openAppToNewWindow(appInfo) {
			this.hasNewTag(appInfo.name) ? this.firstOpenThirdApp(appInfo) : this.openThirdApp(appInfo, true);
		},
		openThirdApp(appInfo, isNewWindows) {
			this.$messageBus('apps_open', appInfo.name);
			if (appInfo.hostname !== "" || appInfo.port !== "" || appInfo.index !== "") {
				const hostIp = appInfo.hostname || this.$baseIp
				const scheme = appInfo.scheme || 'http'
				const port = appInfo.port ? `:${appInfo.port}` : ''
				const url = `${scheme}://${hostIp}${port}${appInfo.index}`

				const openMode = this.$store.getters['preferences/openMode']
				if (openMode === 'embedded' && isNewWindows) {
					const gk = appInfo.name || appInfo.id
					const wid = `embed-${gk}-${nanoid(10)}`
					let finalUrl = url
					try {
						const u = new URL(url, window.location.href)
						if (u.origin === window.location.origin) {
							u.searchParams.set('embedWindowId', wid)
							finalUrl = u.href
						}
					} catch (e) {
						/* keep finalUrl */
					}
					this.$store.dispatch('windowManager/openApp', {
						id: wid,
						groupKey: gk,
						name: appInfo.name || appInfo.id,
						icon: appInfo.icon || appInfo.image || '',
						url: finalUrl,
					})
					return
				}

				if (isNewWindows) {
					window.open(url);
				} else {
					let html = document.createElement('a');
					html.href = url;
					html.rel = 'noreferrer';
					document.getElementById('app').appendChild(html)
					html.click();
				}
			}
		},
		async openThirdContainerByAppInfo(appInfo) {
			try {
				await this.$openAPI.appManagement.compose.setComposeAppStatus(appInfo.id, 'start')

				let allinfo = await this.$openAPI.appManagement.compose.myComposeApp(appInfo.id).then(res => {
					return res.data.data
				})
				
				let containerInfoV2 = allinfo.store_info
				let app = {
					"id": appInfo.id,
					"name": appInfo.id,
					scheme: containerInfoV2.scheme,
					hostname: containerInfoV2.hostname || this.$baseIp,
					port: containerInfoV2.port_map,
					index: containerInfoV2.index,
					image: allinfo.compose.services[appInfo.id].image,
				}

				if (allinfo.status.indexOf('running') === -1) { 
					await this.$openAPI.appManagement.compose.setComposeAppStatus(allinfo.compose.name, 'start')
					this.firstOpenThirdApp(app)
				}else{
					this.openAppToNewWindow(app)
				}
			} catch (e) {
				console.error(e);
			}

		},
		firstOpenThirdApp(appInfo) {
			this.removeIdFromSessionStorage(appInfo.name)
			const openMode = this.$store.getters['preferences/openMode']
			if (openMode === 'embedded') {
				const gk = appInfo.name || appInfo.id
				const id = `embed-launch-${gk}-${nanoid(10)}`
				const url = this.embeddedShellAbsoluteUrl({
					name: 'AppLauncherCheck',
					query: {
						appDetailData: JSON.stringify(appInfo),
						embedWindowId: id,
					},
				})
				this.$store.dispatch('windowManager/openApp', {
					id,
					groupKey: gk,
					name: appInfo.name || appInfo.id,
					icon: appInfo.icon || appInfo.image || '',
					url,
				})
				return
			}
			const launchRoute = {
				name: 'AppLauncherCheck',
				path: '/launch',
				query: {
					appDetailData: JSON.stringify(appInfo),
				},
			}
			const routeUrl = this.$router.resolve(launchRoute)
			window.open(routeUrl.href, '_blank')
		},
	},
}
