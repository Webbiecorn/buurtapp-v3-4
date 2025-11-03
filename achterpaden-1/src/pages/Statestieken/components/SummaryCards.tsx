import React from 'react';
import './SummaryCards.module.css';

const SummaryCards = ({ data }) => {
    return (
        <div className="summary-cards">
            {data.map((item, index) => (
                <div key={index} className="summary-card">
                    <h3>{item.title}</h3>
                    <p>{item.value}</p>
                </div>
            ))}
        </div>
    );
};

export default SummaryCards;