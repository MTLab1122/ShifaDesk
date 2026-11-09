'use client';

import * as React from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MOCK_CONVERSATIONS, MockConversation } from '@/lib/mock-data';
import {
  MessageSquare,
  Bot,
  Send,
  User,
  Phone,
  Search,
  Sparkles,
  CheckCheck,
} from 'lucide-react';

export default function ConversationsPage() {
  const [conversations, setConversations] = React.useState<MockConversation[]>(MOCK_CONVERSATIONS);
  const [selectedId, setSelectedId] = React.useState<string>(MOCK_CONVERSATIONS[0]?.id || '');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [replyText, setReplyText] = React.useState('');

  const activeConversation = conversations.find((c) => c.id === selectedId) || conversations[0];

  const filteredConversations = conversations.filter(
    (c) =>
      c.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm),
  );

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeConversation) return;

    const newMessage = {
      id: `msg-${Date.now()}`,
      sender: 'clinic' as const,
      text: replyText.trim(),
      timestamp: 'Just now',
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeConversation.id) {
          return {
            ...c,
            lastMessage: replyText.trim(),
            timestamp: 'Just now',
            unreadCount: 0,
            messages: [...c.messages, newMessage],
          };
        }
        return c;
      }),
    );

    setReplyText('');
  };

  const toggleAiMode = (id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isAiHandling: !c.isAiHandling } : c)),
    );
  };

  const handleQuickTemplate = (text: string) => {
    setReplyText(text);
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">WhatsApp Receptionist</h1>
          <p className="text-muted-foreground text-sm">
            Automated multilingual triage, AI conversational receptionist, and human handoff.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 gap-1.5 py-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Meta Cloud API Webhook: Active
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[720px]">
        {/* Left Side: Conversation List */}
        <Card className="lg:col-span-4 flex flex-col h-full overflow-hidden">
          <CardHeader className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search patient or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </CardHeader>
          <div className="flex-1 overflow-y-auto divide-y">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No active conversations found
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === activeConversation?.id;
                return (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setSelectedId(conv.id);
                      // Clear unread count on select
                      setConversations((prev) =>
                        prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c)),
                      );
                    }}
                    className={`w-full text-left p-4 transition-colors hover:bg-muted/50 flex flex-col gap-1.5 ${
                      isSelected ? 'bg-clinical-50/70 border-r-4 border-r-clinical-600' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm truncate">{conv.patientName}</span>
                      <span className="text-xs text-muted-foreground">{conv.timestamp}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{conv.lastMessage}</p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {conv.phone}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {conv.isAiHandling ? (
                          <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200 gap-1 px-1.5 py-0">
                            <Sparkles className="h-2.5 w-2.5" />
                            AI Handling
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0">
                            Staff Mode
                          </Badge>
                        )}
                        {conv.unreadCount > 0 && (
                          <span className="h-4 min-w-4 px-1 rounded-full bg-clinical-600 text-white text-[10px] flex items-center justify-center font-bold">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        {/* Right Side: Conversation Thread & Message Input */}
        <Card className="lg:col-span-8 flex flex-col h-full overflow-hidden">
          {activeConversation ? (
            <>
              {/* Thread Header */}
              <div className="p-4 border-b flex items-center justify-between bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-clinical-100 text-clinical-700 flex items-center justify-center font-bold">
                    {activeConversation.patientName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">{activeConversation.patientName}</h3>
                    <p className="text-xs text-muted-foreground">{activeConversation.phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={activeConversation.isAiHandling ? 'secondary' : 'outline'}
                    onClick={() => toggleAiMode(activeConversation.id)}
                    className="gap-1.5 text-xs"
                  >
                    <Bot className="h-3.5 w-3.5" />
                    {activeConversation.isAiHandling ? 'Pause AI Receptionist' : 'Enable AI Receptionist'}
                  </Button>
                </div>
              </div>

              {/* Thread Messages */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
                {activeConversation.messages.map((msg) => {
                  const isPatient = msg.sender === 'patient';
                  const isAi = msg.sender === 'ai';
                  const isStaff = msg.sender === 'clinic';

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col max-w-[80%] ${
                        isPatient ? 'mr-auto items-start' : 'ml-auto items-end'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-muted-foreground">
                        {isPatient && <span>{activeConversation.patientName}</span>}
                        {isAi && (
                          <span className="flex items-center gap-1 text-purple-600 font-medium">
                            <Bot className="h-3 w-3" />
                            MatabAI Reception Agent
                          </span>
                        )}
                        {isStaff && (
                          <span className="flex items-center gap-1 text-clinical-700 font-medium">
                            <User className="h-3 w-3" />
                            Clinic Staff
                          </span>
                        )}
                        <span>•</span>
                        <span>{msg.timestamp}</span>
                      </div>

                      <div
                        className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                          isPatient
                            ? 'bg-white border text-foreground rounded-tl-sm'
                            : isAi
                            ? 'bg-purple-600 text-white rounded-tr-sm'
                            : 'bg-clinical-600 text-white rounded-tr-sm'
                        }`}
                      >
                        {msg.text}
                      </div>

                      {!isPatient && (
                        <div className="flex items-center gap-1 mt-0.5 px-1 text-[10px] text-muted-foreground">
                          <CheckCheck className="h-3 w-3 text-emerald-500" />
                          <span>Delivered</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Quick Reply Presets */}
              <div className="p-2 border-t bg-muted/10 flex flex-wrap gap-2 text-xs">
                <span className="text-[11px] text-muted-foreground self-center">Quick Replies:</span>
                <button
                  type="button"
                  onClick={() => handleQuickTemplate('Aapka appointment confirm ho chuka hai.')}
                  className="px-2.5 py-1 rounded bg-muted hover:bg-muted/80 text-[11px] text-foreground transition-colors"
                >
                  Confirm Appointment (Urdu)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickTemplate('Dr. Talha ki consultation fee 2500 PKR hai.')}
                  className="px-2.5 py-1 rounded bg-muted hover:bg-muted/80 text-[11px] text-foreground transition-colors"
                >
                  Doctor Fee Info
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickTemplate('Matab Clinic OPD Block 3, Main Boulevard par waqey hai.')}
                  className="px-2.5 py-1 rounded bg-muted hover:bg-muted/80 text-[11px] text-foreground transition-colors"
                >
                  Clinic Location
                </button>
              </div>

              {/* Message Composer */}
              <form onSubmit={handleSendMessage} className="p-4 border-t flex items-center gap-2 bg-white">
                <Input
                  placeholder="Type message or reply in Urdu/English/Pashto..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" disabled={!replyText.trim()} className="bg-clinical-600 hover:bg-clinical-700 text-white gap-1.5">
                  <Send className="h-4 w-4" />
                  Send
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 stroke-[1.5] mb-2 text-muted-foreground/60" />
              <p>Select a conversation from the sidebar to view messages.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
