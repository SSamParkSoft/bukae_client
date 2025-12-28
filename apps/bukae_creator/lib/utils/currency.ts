// 환율 변환 유틸리티
// money.js를 사용하여 통화 변환

import fx from 'money'

// 기본 환율 설정 (USD 기준)
// money.js는 base currency를 기준으로 모든 환율을 설정합니다
// 예: {USD: 1, KRW: 1350}는 "1 USD = 1350 KRW"를 의미합니다
// TODO: 실제 운영 환경에서는 환율 API를 통해 실시간 환율을 가져와야 함
const EXCHANGE_RATES: Record<string, number> = {
  USD: 1.0, // 기준 통화
  KRW: 1350.0, // 1 USD = 1350 KRW
  CNY: 7.3, // 1 USD = 7.3 CNY (1 CNY ≈ 185 KRW)
  EUR: 0.93, // 1 USD = 0.93 EUR (1 EUR ≈ 1450 KRW)
  JPY: 150.0, // 1 USD = 150 JPY (1 JPY ≈ 9 KRW)
}

// money.js 초기화
fx.base = 'USD'
fx.rates = EXCHANGE_RATES

/**
 * 통화를 원화(KRW)로 변환
 * @param amount 변환할 금액
 * @param fromCurrency 원래 통화 코드 (예: 'CNY', 'USD', 'EUR' 등)
 * @returns 원화로 변환된 금액 (소수점 반올림)
 */
export function convertToKRW(amount: number, fromCurrency: string): number {
  const currency = fromCurrency?.toUpperCase() || 'KRW'
  
  // 디버깅: 변환 전 값 로그
  console.log(`[Currency] 변환 시작: ${amount} ${currency} -> KRW`)
  
  // 이미 원화인 경우 그대로 반환
  if (currency === 'KRW') {
    console.log(`[Currency] 이미 원화입니다: ${amount}`)
    return Math.round(amount)
  }
  
  // 환율 정보가 없는 경우 경고 후 원본 반환
  if (!fx.rates[currency]) {
    console.warn(`[Currency] 환율 정보가 없습니다: ${currency}, 원본 금액 반환: ${amount}`)
    return Math.round(amount)
  }
  
  try {
    const converted = fx.convert(amount, { from: currency, to: 'KRW' })
    console.log(`[Currency] 변환 완료: ${amount} ${currency} = ${converted} KRW (반올림: ${Math.round(converted)})`)
    return Math.round(converted)
  } catch (error) {
    console.error(`[Currency] 환율 변환 실패: ${currency} -> KRW`, error)
    return Math.round(amount)
  }
}

/**
 * 환율 정보 업데이트 (실시간 환율 API 연동 시 사용)
 * @param rates 새로운 환율 정보 (USD 기준)
 * @param baseCurrency 기준 통화 (기본값: 'USD')
 */
export function updateExchangeRates(
  rates: Record<string, number>,
  baseCurrency: string = 'USD'
): void {
  fx.base = baseCurrency
  fx.rates = { ...EXCHANGE_RATES, ...rates }
  // base currency의 환율은 항상 1이어야 함
  fx.rates[baseCurrency] = 1
}

