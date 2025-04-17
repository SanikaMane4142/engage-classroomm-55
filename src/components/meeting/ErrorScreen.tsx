
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, RefreshCw } from 'lucide-react';
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
        <h2 className="text-xl font-bold mb-2">Connection Error</h2>
        <p className="text-gray-600 mb-6">{errorMessage}</p>
        <div className="space-y-4">
          <Button onClick={resetError} className="w-full flex items-center justify-center">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Button onClick={() => navigate('/dashboard')} variant="outline" className="w-full">
            Return to Dashboard
          </Button>
          
          {/* Additional help info */}
          <div className="mt-6 border-t pt-4">
            <h3 className="font-medium text-sm mb-2">Troubleshooting Tips:</h3>
            <ul className="text-sm text-gray-600 text-left list-disc pl-5">
              <li>Make sure your camera and microphone are properly connected</li>
              <li>Check that you've granted camera/mic permissions in your browser</li>
              <li>Try using a different browser (Chrome or Firefox recommended)</li>
              <li>Make sure you're on a stable internet connection</li>
              <li>Try closing other applications using your camera</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorScreen;
