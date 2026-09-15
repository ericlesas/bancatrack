<script setup>
import { ref } from 'vue'
const props = defineProps({ email: String, pending: Boolean, error: String, message: String })
const emit = defineEmits(['password', 'delete', 'logout', 'back', 'clear'])
const screen = ref('menu')
const titles = { menu: 'Configurações da conta', password: 'Alterar senha', logout: 'Sair', delete: 'Excluir conta e dados' }
function navigate(destination) {
  if (props.pending) return
  currentPassword.value = newPassword.value = confirmation.value = deletePassword.value = ''
  accepted.value = false
  validation.value = ''
  emit('clear')
  screen.value = destination
}
function back(event) {
  if (props.pending) return
  event?.currentTarget?.blur()
  if (screen.value === 'menu') emit('back')
  else navigate('menu')
}
const currentPassword = ref('')
const newPassword = ref('')
const confirmation = ref('')
const deletePassword = ref('')
const accepted = ref(false)
const validation = ref('')
function submitPassword() {
  if (props.pending) return
  validation.value = ''
  if (newPassword.value !== confirmation.value) { validation.value = 'As senhas não coincidem.'; return }
  emit('password', { currentPassword: currentPassword.value, newPassword: newPassword.value })
  currentPassword.value = newPassword.value = confirmation.value = ''
}
function submitDelete() {
  if (props.pending || !accepted.value) return
  emit('delete', deletePassword.value)
  deletePassword.value = ''
  accepted.value = false
}
</script>
<template>
  <section class="account-settings" :aria-label="titles[screen]">
    <header class="account-header">
      <button class="account-back" type="button" :disabled="pending" :aria-label="screen === 'menu' ? 'Voltar ao resumo' : 'Voltar às configurações'" @click="back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m12 5-7 7 7 7M5 12h14" /></svg>
      </button>
      <h1>{{ titles[screen] }}</h1>
    </header>
    <div class="content-card">
    <p class="section-caption">{{ email }}</p>
    <p v-if="error || validation" class="form-error" role="alert">{{ validation || error }}</p>
    <p v-if="message" class="account-message" role="status">{{ message }}</p>
    <nav v-if="screen === 'menu'" class="account-menu" aria-label="Opções da conta">
      <button class="secondary-button" type="button" :disabled="pending" @click="navigate('password')"><svg class="account-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></svg><span class="account-menu-label">Alterar senha</span><span class="account-menu-chevron" aria-hidden="true">›</span></button>
      <button class="secondary-button" type="button" :disabled="pending" @click="navigate('logout')"><svg class="account-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M10 12h11m-4-4 4 4-4 4" /></svg><span class="account-menu-label">Sair</span><span class="account-menu-chevron" aria-hidden="true">›</span></button>
      <button class="secondary-button negative" type="button" :disabled="pending" @click="navigate('delete')"><svg class="account-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" /></svg><span class="account-menu-label">Excluir conta e dados</span><span class="account-menu-chevron" aria-hidden="true">›</span></button>
    </nav>
    <form v-if="screen === 'password'" class="bet-form" @submit.prevent="submitPassword">
      <label><span>Senha atual</span><input v-model="currentPassword" type="password" autocomplete="current-password" required :disabled="pending" /></label>
      <label><span>Nova senha</span><input v-model="newPassword" type="password" autocomplete="new-password" minlength="6" required :disabled="pending" /></label>
      <label><span>Confirmar nova senha</span><input v-model="confirmation" type="password" autocomplete="new-password" minlength="6" required :disabled="pending" /></label>
      <button class="primary-button" :disabled="pending">Alterar senha</button>
    </form>
    <section v-if="screen === 'logout'" class="account-session" aria-label="Sessão">
      <p>Deseja encerrar sua sessão neste dispositivo? Você poderá entrar novamente com seu e-mail e senha.</p>
      <button class="secondary-button account-logout" type="button" :disabled="pending" @click="emit('logout')">Encerrar sessão</button>
    </section>
    <form v-if="screen === 'delete'" class="bet-form account-danger" @submit.prevent="submitDelete">
      <p>Suas apostas e sua conta serão apagadas permanentemente. Não será possível recuperá-las. Feche o app em outros dispositivos antes de continuar.</p>
      <label><span>Senha atual</span><input v-model="deletePassword" type="password" autocomplete="current-password" required :disabled="pending" /></label>
      <label class="account-confirm"><input v-model="accepted" type="checkbox" required :disabled="pending" /><span>Entendo que a exclusão é definitiva.</span></label>
      <button class="danger-button" :disabled="pending || !accepted">Excluir minha conta e dados</button>
    </form>
    <p v-if="pending" class="account-progress" role="status">Aguarde a conclusão…</p>
    </div>
  </section>
</template>
