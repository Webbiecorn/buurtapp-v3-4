

import React from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { UserRole } from '../types';
import { HomeIcon } from '../components/Icons';

const LoginPage: React.FC = () => {
  const { login } = useAppContext();
  const navigate = ReactRouterDOM.useNavigate();

  const handleLogin = (role: UserRole) => {
    login(role);
    navigate('/');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-dark-bg">
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-dark-surface rounded-xl shadow-lg">
        <div className="flex flex-col items-center">
          <div className="p-3 bg-brand-primary rounded-full mb-4">
             <HomeIcon className="h-10 w-10 text-white"/>
          </div>
          <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-dark-text-primary">Buurtconciërge App</h1>
          <p className="mt-2 text-center text-md text-gray-500 dark:text-dark-text-secondary">Log in met een testaccount</p>
        </div>
        
        <div className="space-y-4">
          <button
            onClick={() => handleLogin(UserRole.Beheerder)}
            className="w-full px-4 py-3 font-semibold text-white bg-brand-primary rounded-lg hover:bg-brand-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-dark-surface focus:ring-brand-primary transition-colors duration-300"
          >
            Inloggen als Beheerder
          </button>
          <button
            onClick={() => handleLogin(UserRole.Concierge)}
            className="w-full px-4 py-3 font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-dark-surface focus:ring-green-600 transition-colors duration-300"
          >
            Inloggen als Conciërge
          </button>
          <button
            onClick={() => handleLogin(UserRole.Viewer)}
            className="w-full px-4 py-3 font-semibold text-white dark:text-dark-text-primary bg-gray-700 dark:bg-gray-600 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-dark-surface focus:ring-gray-600 transition-colors duration-300"
          >
            Inloggen als Viewer
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;