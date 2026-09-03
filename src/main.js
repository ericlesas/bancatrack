import { createApp } from 'vue'
import { registerSW } from 'virtual:pwa-register'
import App from './App.vue'
import './styles/main.css'

registerSW({ immediate: true })

createApp(App).mount('#app')
