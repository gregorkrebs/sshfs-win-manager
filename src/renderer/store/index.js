import Vue from 'vue'
import Vuex from 'vuex'

import createPersistedState from 'vuex-persistedstate'

import modules from './modules'

Vue.use(Vuex)

export default new Vuex.Store({
  modules,
  plugins: [
    // Persist to localStorage (simple + works for Electron)
    createPersistedState({
      key: 'sshfs-win-manager'
    })
  ],
  strict: false
})
