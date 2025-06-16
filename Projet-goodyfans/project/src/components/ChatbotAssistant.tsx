import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Zap, User, Bot, Paperclip, Image } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const ChatbotAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your moderation assistant. How can I help you today?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const botResponses: { [key: string]: string } = {
        'help': 'I can help you with moderation tasks. Try asking about moderation policies, how to review content, or specific content types.',
        'moderation': 'Our moderation system uses Azure Content Moderator to automatically detect inappropriate content. Content is classified as approved, rejected, or pending human review.',
        'policy': 'Our moderation policy prohibits explicit violence, hate speech, and self-harm content. Adult content is allowed but must comply with our terms of service.',
        'studio': 'We have enhanced studio detection to reduce false positives for music studio content. The system recognizes equipment, instruments, and studio environments.',
        'review': 'To review content, click on the "Review" button for any item in the moderation queue. You can then approve or reject the content with optional notes.',
        'settings': 'Moderation settings can be adjusted in the Admin Dashboard under Settings > Moderation. You can customize thresholds for different content categories.',
        'default': 'I understand you\'re asking about moderation. Could you provide more details about what you need help with?'
      };

      // Find a matching response or use default
      let responseText = botResponses.default;
      const lowerInput = userMessage.content.toLowerCase();
      
      for (const [key, response] of Object.entries(botResponses)) {
        if (lowerInput.includes(key)) {
          responseText = response;
          break;
        }
      }

      // Add AI response
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
          isOpen 
            ? 'bg-red-600 rotate-90' 
            : 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700'
        }`}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageSquare className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-orange-600 p-4 text-white">
            <div className="flex items-center space-x-2">
              <Bot className="w-6 h-6" />
              <div>
                <h3 className="font-semibold">Moderation Assistant</h3>
                <p className="text-xs text-white/80">AI-powered help for moderation tasks</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] ${
                    message.role === 'user'
                      ? 'bg-red-600 text-white rounded-t-2xl rounded-bl-2xl'
                      : 'bg-white border border-gray-200 rounded-t-2xl rounded-br-2xl'
                  } p-3 shadow-sm`}>
                    <p className={message.role === 'user' ? 'text-white' : 'text-gray-800'}>
                      {message.content}
                    </p>
                    <p className={`text-xs mt-1 text-right ${
                      message.role === 'user' ? 'text-white/80' : 'text-gray-500'
                    }`}>
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-t-2xl rounded-br-2xl p-3 shadow-sm">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <div className="flex-1 relative">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your question..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  rows={1}
                />
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
                className="p-2 bg-red-600 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700 transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center space-x-2">
                <button className="p-1 text-gray-500 hover:text-gray-700">
                  <Paperclip className="w-4 h-4" />
                </button>
                <button className="p-1 text-gray-500 hover:text-gray-700">
                  <Image className="w-4 h-4" />
                </button>
              </div>
              <div className="text-xs text-gray-500 flex items-center">
                <Zap className="w-3 h-3 mr-1" />
                Powered by AI
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};