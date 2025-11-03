export const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('nl-NL', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(num);
};

export const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('nl-NL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(date);
};

export const formatPercentage = (num: number): string => {
    return `${(num * 100).toFixed(2)}%`;
};

export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('nl-NL', {
        style: 'currency',
        currency: 'EUR',
    }).format(amount);
};