import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createRenderer, nextTick, ssrContextKey } from 'vue'
import AccountSettings from './AccountSettings.vue'
import AuthForm from './AuthForm.vue'
import ResetPassword from './ResetPassword.vue'
import { verifyResetCode, resetPassword } from '../services/auth-service.js'
vi.mock('../services/auth-service.js', () => ({ verifyResetCode: vi.fn(), resetPassword: vi.fn() }))
const node = (text = '') => ({ children: [], text, props: {} })
const renderer = createRenderer({
  createElement: () => node(), createText: node, createComment: node,
  setText: (el, text) => { el.text = text },
  setElementText: (el, text) => { el.text = text; el.children = [] },
  patchProp: (el, key, previous, value) => { el.props[key] = value },
  insert: (el, parent, anchor) => {
    if (el.parent) { const index = el.parent.children.indexOf(el); if (index >= 0) el.parent.children.splice(index, 1) }
    const index = anchor ? parent.children.indexOf(anchor) : -1
    parent.children.splice(index < 0 ? parent.children.length : index, 0, el)
    el.parent = parent
  },
  remove: (el) => { const index = el.parent?.children.indexOf(el); if (index >= 0) el.parent.children.splice(index, 1) },
  parentNode: (el) => el.parent,
  nextSibling: (el) => el.parent?.children[el.parent.children.indexOf(el) + 1]
})

const apps = []
function mount(component, props = {}) {
  const root = node()
  const app = renderer.createApp({ ...component, render: () => null }, props)
  app.provide(ssrContextKey, {})
  const state = app.mount(root).$.setupState
  apps.push(app)
  root.html = () => { let html = ''; component.ssrRender({}, chunk => { html += chunk }, null, {}, props, state, {}, {}); return html }
  return { state, root }
}
function text(root) { return root.html() }
const flush = async () => { await Promise.resolve(); await nextTick(); await Promise.resolve(); await nextTick() }
beforeEach(() => vi.resetAllMocks())
afterEach(() => apps.splice(0).forEach(app => app.unmount()))
it('mostra somente o menu e abre cada fluxo, voltando ao menu', async () => {
  const onBack = vi.fn()
  const { state, root } = mount(AccountSettings, { onBack })
  expect(text(root)).not.toContain('Senha atual')
  state.navigate('password'); await nextTick()
  expect(text(root)).toContain('Confirmar nova senha')
  expect(text(root)).not.toContain('Deseja encerrar')
  state.back(); state.navigate('logout'); await nextTick()
  expect(text(root)).toContain('Deseja encerrar')
  state.back(); state.navigate('delete'); await nextTick()
  expect(text(root)).toContain('Entendo que a exclusão é definitiva')
  state.back(); state.back()
  expect(onBack).toHaveBeenCalledTimes(1)
})
it('limpa senhas e consentimento ao sair de um fluxo', () => {
  const { state } = mount(AccountSettings)
  state.currentPassword = 'secret'; state.deletePassword = 'secret'; state.accepted = true
  state.navigate('delete')
  expect(state.currentPassword).toBe('')
  expect(state.deletePassword).toBe('')
  expect(state.accepted).toBe(false)
})
it('impede alteração com confirmação divergente e exclusão sem consentimento', () => {
  const onPassword = vi.fn(), onDelete = vi.fn()
  const { state } = mount(AccountSettings, { onPassword, onDelete })
  state.newPassword = 'secret1'; state.confirmation = 'secret2'; state.submitPassword(); state.submitDelete()
  expect(onPassword).not.toHaveBeenCalled(); expect(onDelete).not.toHaveBeenCalled()
  expect(state.validation).toContain('não coincidem')
})
it('bloqueia navegação e envios durante processamento', () => {
  const onPassword = vi.fn(), onDelete = vi.fn(), onBack = vi.fn()
  const { state } = mount(AccountSettings, { pending: true, onPassword, onDelete, onBack })
  state.navigate('delete'); state.back(); state.submitPassword(); state.accepted = true; state.submitDelete()
  expect(state.screen).toBe('menu')
  expect(onPassword).not.toHaveBeenCalled(); expect(onDelete).not.toHaveBeenCalled(); expect(onBack).not.toHaveBeenCalled()
})
it('solicita recuperação apenas com e-mail, sem campo de senha', async () => {
  const onReset = vi.fn()
  const { state, root } = mount(AuthForm, { onReset })
  state.mode = 'reset'; state.email = 'test@example.com'; await nextTick()
  expect(text(root)).not.toContain('Senha')
  state.submit()
  expect(onReset).toHaveBeenCalledWith('test@example.com')
})
it.each(['auth/expired-action-code', 'auth/invalid-action-code'])('mostra erro de link %s sem formulário', async code => {
  verifyResetCode.mockRejectedValue({ code })
  const { state, root } = mount(ResetPassword, { mode: 'resetPassword', code: 'test-code' })
  await flush()
  expect(state.error).toContain('link')
  expect(text(root)).not.toContain('Salvar nova senha')
  expect(resetPassword).not.toHaveBeenCalled()
})
it('rejeita modos desconhecidos sem validar nem consumir o código', async () => {
  mount(ResetPassword, { mode: 'unknown', code: 'test-code' }); await flush()
  expect(verifyResetCode).not.toHaveBeenCalled()
})
it('valida confirmação e conclui redefinição limpando senhas', async () => {
  verifyResetCode.mockResolvedValue('test@example.com')
  const { state, root } = mount(ResetPassword, { mode: 'resetPassword', code: 'test-code' }); await flush()
  state.password = 'secret1'; state.confirmation = 'secret2'; await state.submit()
  expect(resetPassword).not.toHaveBeenCalled()
  state.confirmation = 'secret1'; await state.submit(); await nextTick()
  expect(resetPassword).toHaveBeenCalledWith('test-code', 'secret1')
  expect(state.password).toBe(''); expect(state.done).toBe(true)
  expect(text(root)).toContain('Senha atualizada')
  expect(text(root)).not.toContain('Salvar nova senha')
})
it('permite nova tentativa após falha de rede na redefinição', async () => {
  verifyResetCode.mockResolvedValue('test@example.com')
  resetPassword.mockRejectedValueOnce({ code: 'auth/network-request-failed' })
  const { state } = mount(ResetPassword, { mode: 'resetPassword', code: 'test-code' }); await flush()
  state.password = state.confirmation = 'secret1'; await state.submit()
  expect(state.done).toBe(false); expect(state.pending).toBe(false); expect(state.error).toContain('conexão')
  state.password = state.confirmation = 'secret2'; await state.submit()
  expect(state.done).toBe(true)
})

it('retira o foco do botão voltar após a navegação', () => {
  const { state } = mount(AccountSettings)
  state.navigate('password')
  const blur = vi.fn()
  state.back({ currentTarget: { blur } })
  expect(blur).toHaveBeenCalledTimes(1)
  expect(state.screen).toBe('menu')
})
