import React from 'react';

const DownloadButton: React.FC = () => {
    const handleDownload = async () => {
        try {
            const response = await fetch('/api/generatePdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ /* Add any necessary data here */ }),
            });

            if (!response.ok) {
                throw new Error('Failed to generate PDF');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'report.pdf';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            // Error downloading the PDF
        }
    };

    return (
        <button onClick={handleDownload} className="download-button">
            Download Report
        </button>
    );
};

export default DownloadButton;