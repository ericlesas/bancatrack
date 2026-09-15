import {
  EmailAuthProvider, reauthenticateWithCredential, updatePassword, deleteUser,
  sendPasswordResetEmail, verifyPasswordResetCode, confirmPasswordReset,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth'
import { auth } from './firebase.js'

export const observeAuth = (callback) => onAuthStateChanged(auth, callback)
export const signIn = (email, password) => signInWithEmailAndPassword(auth, email, password)
export const signUp = (email, password) => createUserWithEmailAndPassword(auth, email, password)
export const signOutUser = () => signOut(auth)

export async function reauthenticate(password) {
  const user = auth.currentUser
  if (!user?.email) throw { code: 'auth/user-token-expired' }
  try {
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password))
  } catch (error) {
    if (error.code === 'auth/invalid-credential') throw { code: 'auth/wrong-password' }
    throw error
  }
  return user
}

export async function changePassword(currentPassword, newPassword) {
  const user = await reauthenticate(currentPassword)
  await updatePassword(user, newPassword)
}

export async function requestPasswordReset(email) {
  auth.languageCode = 'pt-BR'
  try {
    await sendPasswordResetEmail(auth, email)
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error
  }
}

export const verifyResetCode = (code) => verifyPasswordResetCode(auth, code)
export const resetPassword = (code, password) => confirmPasswordReset(auth, code, password)
export const deleteAuthenticatedUser = (user) => deleteUser(user)
