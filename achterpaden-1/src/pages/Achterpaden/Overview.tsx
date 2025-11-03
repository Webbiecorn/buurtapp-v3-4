import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Achterpaden.module.css';

const Overview: React.FC = () => {
    return (
        <div className={styles.container}>
            <h1>Achterpaden Overview</h1>
            <p>Hier vindt u een overzicht van de gegevens.</p>
            <Link to="/statestieken" className={styles.statisticsLink}>
                Ga naar Statestieken
            </Link>
        </div>
    );
};

export default Overview;