// sortHelper.js
export function sortData(feedbackData, fieldName, sortDirection) {
    const isAscending = sortDirection === 'asc';

    return [...feedbackData].sort((a, b) => {
        const aValue = a[fieldName];
        const bValue = b[fieldName];

        // If the field is a number
        if (typeof aValue === 'number' && typeof bValue === 'number') {
            return isAscending ? aValue - bValue : bValue - aValue;
        }

        // If the field is a date (Date type)
        if (aValue instanceof Date && bValue instanceof Date) {
            return isAscending ? aValue - bValue : bValue - aValue;
        }

        // If the field is a text (string)
        const aText = aValue ? aValue.toString().toLowerCase() : '';
        const bText = bValue ? bValue.toString().toLowerCase() : '';
        return isAscending ? aText.localeCompare(bText) : bText.localeCompare(aText);
    });
}
