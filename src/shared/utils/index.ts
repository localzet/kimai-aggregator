// Utility functions placeholder
// Add your utility functions here

// Example utility for formatting currency
export const formatCurrency = (amount: number, currency = 'RUB'): string => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

// Example utility for formatting duration
export const formatDuration = (minutes: number): string => {
  const roundedMinutes = Math.round(minutes)
  const hours = Math.floor(roundedMinutes / 60)
  const mins = roundedMinutes % 60
  return `${hours}ч ${mins}м`
}
