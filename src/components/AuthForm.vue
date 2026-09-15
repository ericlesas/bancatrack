<script setup>
import { ref } from 'vue'

const props = defineProps({ pending: Boolean, error: String, message: String })
const emit = defineEmits(['sign-in', 'sign-up', 'reset', 'clear'])

const mode = ref('sign-in')
const email = ref('')
const password = ref('')

function submit() {
  if (props.pending) return
  if (mode.value === 'reset') { emit('reset', email.value); return }
  if (mode.value === 'sign-in') emit('sign-in', { email: email.value, password: password.value })
  else emit('sign-up', { email: email.value, password: password.value })
}
</script>

<template>
  <main class="auth-shell">
    <section class="auth-card">
      <div class="auth-brand">
        <img src="/icons/bancatrack-icon-source.png" alt="Logo BancaTrack" width="72" height="72" />
        <strong>BancaTrack</strong>
      </div>
      <h1>{{ mode === 'reset' ? 'Esqueci minha senha' : mode === 'sign-in' ? 'Entre na sua banca' : 'Crie sua conta' }}</h1>
      <p class="auth-intro">Suas entradas ficam protegidas e disponíveis nos seus dispositivos.</p>

      <form class="bet-form" @submit.prevent="submit">
        <label><span>E-mail</span><input v-model.trim="email" autocomplete="email" type="email" required /></label>
        <label v-if="mode !== 'reset'"><span>Senha</span><input v-model="password" autocomplete="current-password" minlength="6" type="password" required /></label>
        <p v-if="props.message" role="status">{{ props.message }}</p>
        <p v-if="props.error" class="form-error" role="alert">{{ props.error }}</p>
        <button class="primary-button" :disabled="props.pending" type="submit">
          {{ props.pending ? 'Aguarde…' : mode === 'reset' ? 'Enviar link de recuperação' : mode === 'sign-in' ? 'Entrar' : 'Criar conta' }}
        </button>
      </form>

      <button class="text-button" type="button" :disabled="pending" @click="emit('clear'); password = ''; mode = mode === 'sign-in' ? 'sign-up' : 'sign-in'">
        {{ mode === 'sign-in' ? 'Ainda não tenho conta' : 'Já tenho uma conta' }}
      </button>
      <button v-if="mode === 'sign-in'" class="text-button" type="button" :disabled="pending" @click="emit('clear'); password = ''; mode = 'reset'">Esqueci minha senha</button>
    </section>
  </main>
</template>
