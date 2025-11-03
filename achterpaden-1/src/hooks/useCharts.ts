import { useState, useEffect } from 'react';
import { fetchChartData } from '../services/api';

const useCharts = () => {
    const [chartData, setChartData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadChartData = async () => {
            try {
                const data = await fetchChartData();
                setChartData(data);
            } catch (err) {
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        loadChartData();
    }, []);

    return { chartData, loading, error };
};

export default useCharts;