import {
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
