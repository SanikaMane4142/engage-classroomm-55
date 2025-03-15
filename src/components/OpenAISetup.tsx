
import React, { useState, useEffect } from 'react';
import { initializeOpenAI, isOpenAIInitialized } from '../utils/openaiApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface OpenAISetupProps {
  onSetupComplete?: () => void;
}

const OpenAISetup: React.FC<OpenAISetupProps> = ({ onSetupComplete }) => {
  const [apiKey, setApiKey] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if OpenAI is already initialized
    setIsInitialized(isOpenAIInitialized());
  }, []);

  const handleSaveKey = () => {
    if (!apiKey.trim()) {
      toast({
        title: 'API Key Required',
        description: 'Please enter your OpenAI API key',
        variant: 'destructive',
      });
      return;
    }

    try {
      initializeOpenAI(apiKey.trim());
      setIsInitialized(true);
      toast({
        title: 'Success',
        description: 'OpenAI API key has been saved',
      });
      if (onSetupComplete) {
        onSetupComplete();
      }
    } catch (error) {
      console.error('Error initializing OpenAI:', error);
      toast({
        title: 'Error',
        description: 'Failed to initialize OpenAI',
        variant: 'destructive',
      });
    }
  };

  if (isInitialized) {
    return (
      <Alert className="mb-4 bg-green-50 border-green-200">
        <AlertDescription>
          OpenAI API is configured. You can now use AI features.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="mb-6 p-4 border rounded-lg">
      <h3 className="text-lg font-medium mb-2">OpenAI API Setup</h3>
      <p className="text-gray-600 mb-4 text-sm">
        To use AI features, please enter your OpenAI API key. You can get an API key from
        <a 
          href="https://platform.openai.com/api-keys" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-700 ml-1"
        >
          OpenAI's website
        </a>.
      </p>
      <div className="flex gap-2">
        <Input
          type="password"
          placeholder="Enter your OpenAI API key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="flex-1"
        />
        <Button onClick={handleSaveKey}>Save Key</Button>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Your API key is stored locally in your browser and is not sent to our servers.
      </p>
    </div>
  );
};

export default OpenAISetup;
