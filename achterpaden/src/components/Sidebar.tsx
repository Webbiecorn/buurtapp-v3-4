import React from 'react';
import { Link } from 'react-router-dom';
import './Sidebar.css';

const Sidebar: React.FC = () => {
    return (
        <div className="sidebar">
            <h2>Navigatie</h2>
            <ul>
                <li>
                    <Link to="/achterpaden">Achterpaden</Link>
                </li>
                <li>
                    <Link to="/statestieken">Statestieken</Link>
                </li>
            </ul>
        </div>
    );
};

export default Sidebar;