import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000'; // Adjust the base URL as needed

export const fetchStatistics = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/statistics`);
        return response.data;
    } catch (error) {
        console.error('Error fetching statistics:', error);
        throw error;
    }
};

export const generateAIReport = async (data) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/aiReport`, data);
        return response.data;
    } catch (error) {
        console.error('Error generating AI report:', error);
        throw error;
    }
};

export const downloadPDF = async (reportId) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/generatePdf/${reportId}`, {
            responseType: 'blob',
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'report.pdf'); // Specify the file name
        document.body.appendChild(link);
        link.click();
        link.remove();
    } catch (error) {
        console.error('Error downloading PDF:', error);
        throw error;
    }
};