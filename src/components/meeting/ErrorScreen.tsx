
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorScreenProps {
  errorMessage: string;
  resetError: () => void;
}

const ErrorScreen: React.FC<ErrorScreenProps> = ({ errorMessage, resetError }) => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full px-6 py-8 bg-white rounded-lg shadow-md text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Media Access Error</h2>
        <p className="text-gray-600 mb-6">{errorMessage}</p>
        <div className="space-y-4">
          <Button onClick={resetError} className="w-full">
            Try Again
          </Button>
          <Button onClick={() => navigate('/dashboard')} variant="outline" className="w-full">
            Return to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ErrorScreen;
