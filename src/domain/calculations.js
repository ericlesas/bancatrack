import { BET_RESULTS } from './bet-status.js'

const roundCurrency = (value) => Math.round((value + Number.EPSILON) * 1000) / 1000

/**
 * Reproduz o retorno líquido da planilha: ganhos não incluem a stake,
 * reds perdem a stake e apostas não realizadas/void/em andamento valem zero.
 */
export function calculateBetReturn({ odd, stake, wasTaken, result }) {
  if (!wasTaken || result === BET_RESULTS.VOID || result === BET_RESULTS.IN_PROGRESS) {
    return 0
  }

  if (result === BET_RESULTS.GREEN) {
    return roundCurrency((Number(odd) * Number(stake)) - Number(stake))
  }

  if (result === BET_RESULTS.RED) {
    return roundCurrency(-Number(stake))
  }

  return 0
}

export function enrichBet(bet) {
  return { ...bet, netReturn: calculateBetReturn(bet) }
}

export function calculateDailyResults(bets) {
  const days = new Map()

  for (const bet of bets) {
    const key = bet.betDate
    const current = days.get(key) ?? { date: key, bets: [], netResult: 0 }
    const enrichedBet = enrichBet(bet)
    current.bets.push(enrichedBet)
    current.netResult = roundCurrency(current.netResult + enrichedBet.netReturn)
    days.set(key, current)
  }

  return [...days.values()].sort((a, b) => b.date.localeCompare(a.date))
}

export function calculateMonthlyResults(bets) {
  const months = new Map()

  for (const day of calculateDailyResults(bets)) {
    const key = day.date.slice(0, 7)
    const current = months.get(key) ?? { month: key, netResult: 0, days: 0 }
    current.netResult = roundCurrency(current.netResult + day.netResult)
    current.days += 1
    months.set(key, current)
  }

  return [...months.values()].sort((a, b) => b.month.localeCompare(a.month))
}

export function calculateAccumulatedResult(bets) {
  return roundCurrency(bets.reduce((total, bet) => total + calculateBetReturn(bet), 0))
}

export function calculateBetIndicators(bets) {
  const takenBets = bets.filter((bet) => bet.wasTaken)

  return {
    taken: takenBets.length,
    green: takenBets.filter((bet) => bet.result === BET_RESULTS.GREEN).length,
    red: takenBets.filter((bet) => bet.result === BET_RESULTS.RED).length
  }
}

export function filterBetsByMonth(bets, month) {
  return month ? bets.filter((bet) => bet.betDate.startsWith(month)) : bets
}

export function calculateDashboardMetrics(bets) {
  const indicators = calculateBetIndicators(bets)
  const settledBets = bets.filter((bet) => bet.wasTaken && [BET_RESULTS.GREEN, BET_RESULTS.RED].includes(bet.result))
  const settledStake = roundCurrency(settledBets.reduce((total, bet) => total + Number(bet.stake), 0))
  const netResult = calculateAccumulatedResult(settledBets)

  return {
    ...indicators,
    settled: settledBets.length,
    settledStake,
    netResult,
    winRate: settledBets.length ? (indicators.green / settledBets.length) * 100 : 0,
    roi: settledStake ? (netResult / settledStake) * 100 : 0
  }
}
