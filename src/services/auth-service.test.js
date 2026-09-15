import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reauthenticateWithCredential, updatePassword, sendPasswordResetEmail, verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth'
import { changePassword, requestPasswordReset, verifyResetCode, resetPassword } from './auth-service.js'
vi.mock('./firebase.js', () => ({ auth: { currentUser: { uid: 'user', email: 'user@example.com' } } }))
vi.mock('firebase/auth', () => ({
  EmailAuthProvider: { credential: vi.fn(() => 'credential') }, reauthenticateWithCredential: vi.fn(), updatePassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(), verifyPasswordResetCode: vi.fn(), confirmPasswordReset: vi.fn(), deleteUser: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(), onAuthStateChanged: vi.fn(), signInWithEmailAndPassword: vi.fn(), signOut: vi.fn()
}))
beforeEach(() => vi.resetAllMocks())
describe('segurança das operações de autenticação', () => {
  it('não altera a senha quando a reautenticação falha', async () => {
    reauthenticateWithCredential.mockRejectedValue({ code: 'auth/invalid-credential' })
    await expect(changePassword('wrong', 'new-password')).rejects.toMatchObject({ code: 'auth/wrong-password' })
    expect(updatePassword).not.toHaveBeenCalled()
  })
  it('altera a senha após reautenticar', async () => {
    await changePassword('current', 'new-password')
    expect(updatePassword).toHaveBeenCalledWith(expect.objectContaining({ uid: 'user' }), 'new-password')
  })
  it('não revela se o e-mail existe mas propaga falhas de conexão', async () => {
    sendPasswordResetEmail.mockRejectedValueOnce({ code: 'auth/user-not-found' })
    await expect(requestPasswordReset('unknown@example.com')).resolves.toBeUndefined()
    sendPasswordResetEmail.mockRejectedValueOnce({ code: 'auth/network-request-failed' })
    await expect(requestPasswordReset('user@example.com')).rejects.toMatchObject({ code: 'auth/network-request-failed' })
  })
  it('propaga códigos inválidos e já utilizados ao formulário', async () => {
    verifyPasswordResetCode.mockRejectedValue({ code: 'auth/expired-action-code' })
    confirmPasswordReset.mockRejectedValue({ code: 'auth/invalid-action-code' })
    await expect(verifyResetCode('expired')).rejects.toMatchObject({ code: 'auth/expired-action-code' })
    await expect(resetPassword('used', 'new-password')).rejects.toMatchObject({ code: 'auth/invalid-action-code' })
  })
})
