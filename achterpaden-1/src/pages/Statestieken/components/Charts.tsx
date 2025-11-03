import React from 'react';
import { Line } from 'react-chartjs-2';
import { Bar } from 'react-chartjs-2';
import { Pie } from 'react-chartjs-2';
import useCharts from '../../../hooks/useCharts';

const Charts: React.FC = () => {
    const { lineChartData, barChartData, pieChartData } = useCharts();

    return (
        <div className="charts-container">
            <h2>Statistieken Overzicht</h2>
            <div className="chart">
                <h3>Lijngrafiek</h3>
                <Line data={lineChartData} />
            </div>
            <div className="chart">
                <h3>Staafgrafiek</h3>
                <Bar data={barChartData} />
            </div>
            <div className="chart">
                <h3>Taartgrafiek</h3>
                <Pie data={pieChartData} />
            </div>
        </div>
    );
};

export default Charts;