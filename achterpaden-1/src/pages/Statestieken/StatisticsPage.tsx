import React from 'react';
import Charts from './components/Charts';
import SummaryCards from './components/SummaryCards';
import AIReportButton from './components/AIReportButton';
import DownloadButton from './components/DownloadButton';
import './Statistics.module.css';

const StatisticsPage: React.FC = () => {
    return (
        <div className="statistics-page">
            <h1>Statistieken</h1>
            <SummaryCards />
            <Charts />
            <div className="action-buttons">
                <AIReportButton />
                <DownloadButton />
            </div>
        </div>
    );
};

export default StatisticsPage;