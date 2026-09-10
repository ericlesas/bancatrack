import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc
} from 'firebase/firestore'
import { db } from './firebase.js'

function betsCollection(userId) {
  return collection(db, 'users', userId, 'bets')
}

export function observeBets(userId, onBets, onError) {
  const betsQuery = query(betsCollection(userId), orderBy('betDate', 'desc'))

  return onSnapshot(betsQuery, { includeMetadataChanges: true }, (snapshot) => {
    const bets = snapshot.docs.map((document) => ({ id: document.id, ...document.data() }))
    onBets(bets, {
      pendingIds: snapshot.docs.filter((document) => document.metadata.hasPendingWrites).map((document) => document.id),
      fromCache: snapshot.metadata.fromCache,
      hasPendingWrites: snapshot.metadata.hasPendingWrites
    })
  }, onError)
}

const betFields = (bet) => ({
  betDate: bet.betDate,
  odd: bet.odd,
  stake: bet.stake,
  wasTaken: bet.wasTaken,
  result: bet.result
})

export function createBet(userId, bet) {
  return setDoc(doc(db, 'users', userId, 'bets', bet.id), {
    ...betFields(bet),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })
}

export function updateBet(userId, bet) {
  return updateDoc(doc(db, 'users', userId, 'bets', bet.id), {
    ...betFields(bet),
    updatedAt: serverTimestamp()
  })
}

export function removeBet(userId, betId) {
  return deleteDoc(doc(db, 'users', userId, 'bets', betId))
}
