
import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

interface ChatPanelProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ isOpen, setIsOpen }) => {
  const [message, setMessage] = useState('');

  const handleSendMessage = () => {
    // Future implementation: send message
    setMessage('');
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent side="right" className="w-[300px] sm:w-[400px] p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>Chat</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col h-[calc(100vh-64px)]">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              <div className="flex flex-col items-start">
                <div className="bg-gray-100 rounded-lg p-3 mb-1 max-w-[80%]">
                  <p className="text-sm">Has everyone connected to the WebRTC server?</p>
                </div>
                <span className="text-xs text-gray-500">Teacher • 10:15 AM</span>
              </div>
              
              <div className="flex flex-col items-end">
                <div className="bg-blue-100 rounded-lg p-3 mb-1 max-w-[80%]">
                  <p className="text-sm">Yes, my video is streaming correctly.</p>
                </div>
                <span className="text-xs text-gray-500">You • 10:16 AM</span>
              </div>
            </div>
          </ScrollArea>
          
          <div className="p-4 border-t">
            <div className="flex space-x-2">
              <input 
                type="text" 
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <Button onClick={handleSendMessage}>Send</Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ChatPanel;
