import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Overview from './pages/Achterpaden/Overview';
import StatisticsPage from './pages/Statestieken/StatisticsPage';

const App: React.FC = () => {
    return (
        <Router>
            <div>
                <Header />
                <Sidebar />
                <main>
                    <Switch>
                        <Route path="/" exact component={Overview} />
                        <Route path="/statistieken" component={StatisticsPage} />
                    </Switch>
                </main>
            </div>
        </Router>
    );
};

export default App;