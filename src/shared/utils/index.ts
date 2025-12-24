// Utility functions placeholder
// Add your utility functions here

// Example utility for formatting currency
export const formatCurrency = (amount: number, currency = "RUB"): string => {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

// Example utility for formatting duration
export const formatDuration = (minutes: number): string => {
  // Обработка NaN и невалидных значений
  if (!isFinite(minutes) || isNaN(minutes) || minutes < 0) {
    return "0ч 0м";
  }
  const roundedMinutes = Math.round(minutes);
  const hours = Math.floor(roundedMinutes / 60);
  const mins = roundedMinutes % 60;
  return `${hours}ч ${mins}м`;
};
