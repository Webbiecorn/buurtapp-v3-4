import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

const Header: React.FC = () => {
    return (
        <header className="header">
            <h1>Achterpaden</h1>
            <nav>
                <ul>
                    <li>
                        <Link to="/achterpaden">Overview</Link>
                    </li>
                    <li>
                        <Link to="/statestieken">Statestieken</Link>
                    </li>
                </ul>
            </nav>
        </header>
    );
};

export default Header;