import { describe, expect, it } from 'vitest'
import { BET_RESULTS } from './bet-status.js'
import {
  calculateAccumulatedResult,
  calculateBetIndicators,
  calculateBetReturn,
  calculateDailyResults,
  calculateMonthlyResults
} from './calculations.js'

const takenGreen = (odd, stake, betDate = '2025-02-19') => ({ odd, stake, betDate, wasTaken: true, result: BET_RESULTS.GREEN })

describe('regras extraídas da planilha', () => {
  it('calcula green como lucro líquido', () => {
    expect(calculateBetReturn(takenGreen(2.16, 7))).toBe(8.12)
  })

  it('calcula red como perda da stake', () => {
    expect(calculateBetReturn({ ...takenGreen(1.6, 7), result: BET_RESULTS.RED })).toBe(-7)
  })

  it('zera entradas não realizadas, void e em andamento', () => {
    expect(calculateBetReturn({ ...takenGreen(1.7, 7), wasTaken: false })).toBe(0)
    expect(calculateBetReturn({ ...takenGreen(1.7, 7), result: BET_RESULTS.VOID })).toBe(0)
    expect(calculateBetReturn({ ...takenGreen(1.7, 7), result: BET_RESULTS.IN_PROGRESS })).toBe(0)
  })

  it('inclui todas as apostas do dia, corrigindo a exclusão da última linha da planilha', () => {
    const bets = [
      takenGreen(1.7, 7), takenGreen(1.624, 7), takenGreen(1.6, 7),
      takenGreen(1.53, 7), takenGreen(2.16, 7), takenGreen(6.88, 7), takenGreen(1.7, 7)
    ]
    expect(calculateDailyResults(bets)[0].netResult).toBe(71.358)
  })

  it('consolida dia, mês e acumulado', () => {
    const bets = [
      takenGreen(2.16, 7, '2025-02-19'),
      { ...takenGreen(1.7, 7, '2025-02-20'), result: BET_RESULTS.RED }
    ]
    expect(calculateDailyResults(bets).map(({ netResult }) => netResult)).toEqual([-7, 8.12])
    expect(calculateMonthlyResults(bets)).toEqual([{ month: '2025-02', netResult: 1.12, days: 2 }])
    expect(calculateAccumulatedResult(bets)).toBe(1.12)
  })

  it('conta indicadores apenas das entradas realizadas', () => {
    const bets = [
      takenGreen(1.8, 7),
      { ...takenGreen(1.8, 7), result: BET_RESULTS.RED },
      { ...takenGreen(1.8, 7), wasTaken: false }
    ]
    expect(calculateBetIndicators(bets)).toEqual({ taken: 2, green: 1, red: 1 })
  })
})
