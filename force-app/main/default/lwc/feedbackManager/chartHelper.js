import { loadScript } from 'lightning/platformResourceLoader';
import chartJs from '@salesforce/resourceUrl/lwcc__chartjs_v280';


let Chart; // Chart.js library instance
export const loadChartJs = async (context) => {
    if (!Chart) {
        try {
            await loadScript(context, chartJs);
            Chart = window.Chart; // Load Chart.js globally
        } catch (error) {
            console.error('Error loading Chart.js', error);
            throw error;
        }
    }
};

export const initializeChart = (canvasElement, ratingData) => {
    if (!Chart) {
        console.error('Chart.js is not loaded');
        return null;
    }
    if (!canvasElement) {
        console.error('Canvas element not found');
        return null;
    }

    return new Chart(canvasElement, {
        type: 'pie',
        data: {
            labels: ratingData.labels,
            datasets: [
                {
                    data: ratingData.percentages,
                    backgroundColor: ratingData.colors,
                    borderColor: '#FFFFFF',
                    borderWidth: 2,
                },
            ],
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            return `${label}: ${value}%`;
                        },
                    },
                },
            },
        },
    });
};

export const calculateRatingDistribution = (feedbackData) => {
    // Fixed minimum value is 1 (as per your request)
    const minRating = 1;
    
    // Dynamically calculate the maximum value based on feedback data
    const maxRating = Math.max(...feedbackData.map(feedback => feedback.Rating__c));

    // Ensure each range has a size of 5
    const rangeSize = 5;
    
    // Calculate number of sections required for the chart
    const numberOfRanges = Math.ceil(maxRating / rangeSize); // Number of ranges

    // Create ranges dynamically with a fixed range size of 5
    const ranges = [];
    for (let i = 0; i < numberOfRanges; i++) {
        const rangeMin = minRating + i * rangeSize;
        let rangeMax = rangeMin + rangeSize - 1;

        ranges.push({
            min: rangeMin,
            max: rangeMax,
            label: `Rating (${rangeMin}-${rangeMax})`,
            count: 0
        });
    }

    // Count feedbacks in each range
    feedbackData.forEach((feedback) => {
        const rating = feedback.Rating__c;
        ranges.forEach((range) => {
            if (rating >= range.min && rating <= range.max) {
                range.count++;
            }
        });
    });

    const totalFeedbacks = feedbackData.length;
    const percentages = ranges.map((range) =>
        totalFeedbacks > 0 ? ((range.count / totalFeedbacks) * 100).toFixed(2) : 0
    );
    const labels = ranges.map((range) => range.label);

    // Generate dynamic colors for each section
    const colors = ranges.map((_, index) => {
        const hue = (index * 60) % 360; // This will generate colors by varying hue
        return `hsl(${hue}, 70%, 50%)`; // Generate colors in HSL format
    });

    return { percentages, labels, colors };
};



