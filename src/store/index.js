/*
 * @Author: Jerryk jerry@icewhale.org
 * @Date: 2022-03-02 22:48:28
 * @LastEditors: Jerryk jerry@icewhale.org
 * @LastEditTime: 2022-06-02 19:54:35
 * @FilePath: \CasaOS-UI\src\store\index.js
 * @Description: 
 * 
 * Copyright (c) 2022 by IceWhale, All Rights Reserved. 
 */
import Vue       from 'vue';
import Vuex      from 'vuex';
import state     from './state';
import getters   from './getters';
import mutations from './mutations';
import actions   from './actions';
import preferences from './modules/preferences';
import windowManager from './modules/windowManager';

Vue.use(Vuex)

export default new Vuex.Store({
	state,
	getters,
	mutations,
	actions,
	modules: {
		preferences,
		windowManager,
	},
})