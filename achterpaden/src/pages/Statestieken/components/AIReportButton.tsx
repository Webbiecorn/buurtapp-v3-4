import React from 'react';

const AIReportButton: React.FC = () => {
    const handleGenerateReport = async () => {
        try {
            const response = await fetch('/api/aiReport', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ /* parameters for report generation */ }),
            });

            if (!response.ok) {
                throw new Error('Failed to generate report');
            }

            const reportData = await response.json();
            // Handle the report data (e.g., display a success message or update state)
        } catch (error) {
            // Error generating report
            // Handle error (e.g., display an error message)
        }
    };

    return (
        <button onClick={handleGenerateReport} className="ai-report-button">
            Genereer AI Verslag
        </button>
    );
};

export default AIReportButton;