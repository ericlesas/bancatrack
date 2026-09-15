<script setup>
import { onMounted, ref } from 'vue'
import { verifyResetCode, resetPassword } from '../services/auth-service.js'
import { authErrorMessage } from '../services/auth-errors.js'
const props = defineProps({ code: String, mode: String })
const emit = defineEmits(['back'])
const pending = ref(true)
const email = ref('')
const password = ref('')
const confirmation = ref('')
const error = ref('')
const done = ref(false)
onMounted(async () => {
  try {
    if (props.mode !== 'resetPassword' || !props.code) throw { code: 'auth/invalid-action-code' }
    email.value = await verifyResetCode(props.code)
  } catch (failure) { error.value = authErrorMessage(failure) }
  finally { pending.value = false }
})
async function submit() {
  if (pending.value || done.value || !email.value) return
  error.value = ''
  if (password.value !== confirmation.value) { error.value = 'As senhas não coincidem.'; return }
  pending.value = true
  try { await resetPassword(props.code, password.value); done.value = true }
  catch (failure) { error.value = authErrorMessage(failure) }
  finally { pending.value = false; password.value = confirmation.value = '' }
}
</script>
<template>
  <main class="auth-shell"><section class="auth-card">
    <h1>Nova senha</h1>
    <p v-if="pending" role="status">Aguarde…</p>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <p v-if="done" role="status">Senha atualizada. Entre com sua nova senha.</p>
    <form v-if="email && !done" class="bet-form" @submit.prevent="submit">
      <p>{{ email }}</p>
      <label><span>Nova senha</span><input v-model="password" type="password" autocomplete="new-password" minlength="6" required :disabled="pending" /></label>
      <label><span>Confirmar nova senha</span><input v-model="confirmation" type="password" autocomplete="new-password" minlength="6" required :disabled="pending" /></label>
      <button class="primary-button" :disabled="pending">Salvar nova senha</button>
    </form>
    <button class="text-button" :disabled="pending" @click="emit('back')">Voltar ao app</button>
  </section></main>
</template>
