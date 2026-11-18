'use client';

import * as React from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ApiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import {
  WhatsappConversation,
  WhatsAppConnectionHealth,
} from '@matabai/shared';
import {
  MessageSquare,
  Send,
  User,
  Phone,
  Search,
  CheckCheck,
  Check,
  AlertTriangle,
  Clock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';

export default function ConversationsPage() {
  const { clinicId: authClinicId } = useAuth();
  const clinicId = authClinicId || 'clinic-1';

  const [health, setHealth] = React.useState<WhatsAppConnectionHealth | null>(null);
  const [conversations, setConversations] = React.useState<WhatsappConversation[]>([]);
  const [selectedId, setSelectedId] = React.useState<string>('');
  const [activeThread, setActiveThread] = React.useState<WhatsappConversation | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [replyText, setReplyText] = React.useState('');
  const [selectedTemplate, setSelectedTemplate] = React.useState('appointment_confirmation');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSending, setIsSending] = React.useState(false);

  // 1. Fetch WhatsApp Health
  const loadHealth = React.useCallback(async () => {
    try {
      const res = await ApiClient.whatsapp.checkHealth(clinicId);
      if (res) {
        setHealth(res);
      }
    } catch {
      setHealth({
        configured: false,
        connected: false,
        status: 'DISCONNECTED',
        webhookVerified: false,
        lastCheckedAt: new Date().toISOString(),
      });
    }
  }, [clinicId]);

  // 2. Fetch Conversations from backend
  const loadConversations = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const statusParam = statusFilter === 'ALL' ? undefined : statusFilter;
      const res = await ApiClient.whatsapp.listConversations({
        clinicId,
        status: statusParam,
        search: searchTerm || undefined,
      });

      const items = res?.items || (res as any)?.data || [];
      setConversations(items);
      if (items.length > 0) {
        if (!selectedId || !items.some((c: WhatsappConversation) => c.id === selectedId)) {
          const first = items[0] as WhatsappConversation;
          if (first) setSelectedId(first.id);
        }
      } else {
        setSelectedId('');
        setActiveThread(null);
      }
    } catch {
      setConversations([]);
    } finally {
      setIsLoading(false);
    }
  }, [clinicId, statusFilter, searchTerm, selectedId]);

  // 3. Load active conversation details & message history
  const loadActiveThread = React.useCallback(async () => {
    if (!selectedId) return;

    try {
      const res = await ApiClient.whatsapp.getConversation(selectedId);
      if (res) {
        setActiveThread(res);
      }
    } catch {
      // Handled gracefully
    }
  }, [selectedId]);

  React.useEffect(() => {
    loadHealth();
    loadConversations();
  }, [loadHealth, loadConversations]);

  React.useEffect(() => {
    loadActiveThread();
  }, [loadActiveThread]);

  // Send Reply Handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeThread || isSending) return;

    setIsSending(true);
    try {
      await ApiClient.whatsapp.replyConversation(activeThread.id, replyText.trim());
      setReplyText('');
      await loadActiveThread();
      await loadConversations();
    } catch (err: any) {
      alert(`Failed to send message: ${err.message || 'Error occurred'}`);
    } finally {
      setIsSending(false);
    }
  };

  // Send Template Message
  const handleSendTemplate = async () => {
    if (!activeThread?.contact?.waId || isSending) return;
    setIsSending(true);
    try {
      await ApiClient.whatsapp.sendTemplateMessage({
        clinicId,
        to: activeThread.contact.waId,
        templateName: selectedTemplate,
        languageCode: 'en_US',
        parameters: [],
        conversationId: activeThread.id,
      });
      alert(`Template "${selectedTemplate}" dispatched successfully!`);
      await loadActiveThread();
      await loadConversations();
    } catch (err: any) {
      alert(`Failed to send template: ${err.message || 'Error occurred'}`);
    } finally {
      setIsSending(false);
    }
  };

  // Handover Claim
  const handleClaim = async () => {
    if (!activeThread) return;
    try {
      await ApiClient.whatsapp.claimConversation(activeThread.id);
      await loadActiveThread();
      await loadConversations();
    } catch (err: any) {
      alert(`Claim failed: ${err.message}`);
    }
  };

  // Resolve
  const handleResolve = async () => {
    if (!activeThread) return;
    try {
      await ApiClient.whatsapp.resolveConversation(activeThread.id);
      await loadActiveThread();
      await loadConversations();
    } catch (err: any) {
      alert(`Resolve failed: ${err.message}`);
    }
  };

  // Reopen
  const handleReopen = async () => {
    if (!activeThread) return;
    try {
      await ApiClient.whatsapp.reopenConversation(activeThread.id);
      await loadActiveThread();
      await loadConversations();
    } catch (err: any) {
      alert(`Reopen failed: ${err.message}`);
    }
  };

  // Consent Toggle
  const handleToggleConsent = async (currentStatus: string) => {
    if (!activeThread?.contactId) return;
    const nextStatus = currentStatus === 'OPTED_OUT' ? 'OPTED_IN' : 'OPTED_OUT';
    try {
      await ApiClient.whatsapp.updateConsent(activeThread.contactId, {
        consentStatus: nextStatus as any,
        optOutReason: nextStatus === 'OPTED_OUT' ? 'RECEPTIONIST_MANUAL_OVERRIDE' : undefined,
      });
      await loadActiveThread();
    } catch (err: any) {
      alert(`Consent update failed: ${err.message}`);
    }
  };

  // Check 24-hr window
  const is24HrActive = activeThread?.lastCustomerMessageAt
    ? (new Date().getTime() - new Date(activeThread.lastCustomerMessageAt).getTime()) / (1000 * 60 * 60) <= 24
    : false;

  // Conversations to render
  const displayConversations = conversations.map((c) => ({
    id: c.id,
    patientName: c.contact?.profileName || c.contact?.patient?.fullName || c.contact?.waId || 'WhatsApp Patient',
    phone: c.contact?.waId || '',
    lastMessage: c.lastMessagePreview || 'New message received',
    unreadCount: c.unreadCount || 0,
    status: c.status,
    isHandover: c.status === 'HUMAN_HANDOVER',
  }));

  return (
    <div className="space-y-6">
      {/* Header & Meta Connection Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">WhatsApp Receptionist</h1>
          <p className="text-muted-foreground text-sm">
            Meta WhatsApp Cloud API integration: automated messaging, queue alerts, and receptionist handover.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {health?.connected ? (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 gap-1.5 py-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Meta Cloud API: Connected ({health.verifiedName || health.businessPhoneNumber || 'Verified'})
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 gap-1.5 py-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Meta Cloud API: Ready ({health?.status || 'Pending'})
            </Badge>
          )}
          <Button variant="ghost" size="icon" onClick={() => { loadHealth(); loadConversations(); }} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Conversation Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[740px]">
        {/* Left: Conversation List */}
        <Card className="lg:col-span-4 flex flex-col h-full overflow-hidden">
          <CardHeader className="p-4 border-b space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search patient or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1 p-0.5 bg-muted rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${
                  statusFilter === 'ALL' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('HUMAN_HANDOVER')}
                className={`flex-1 py-1.5 rounded-md font-medium transition-colors flex items-center justify-center gap-1 ${
                  statusFilter === 'HUMAN_HANDOVER' ? 'bg-amber-50 text-amber-900 shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <AlertTriangle className="h-3 w-3 text-amber-600" />
                Handover
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('OPEN')}
                className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${
                  statusFilter === 'OPEN' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Open
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('RESOLVED')}
                className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${
                  statusFilter === 'RESOLVED' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Resolved
              </button>
            </div>
          </CardHeader>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto divide-y">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Loading conversations...</div>
            ) : displayConversations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No conversations found</div>
            ) : (
              displayConversations.map((conv) => {
                const isSelected = conv.id === selectedId;
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedId(conv.id)}
                    className={`w-full text-left p-4 transition-colors hover:bg-muted/50 flex flex-col gap-1.5 ${
                      isSelected ? 'bg-clinical-50/70 border-r-4 border-r-clinical-600' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm truncate">{conv.patientName}</span>
                      {conv.isHandover && (
                        <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] px-1.5 py-0">
                          Handover
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{conv.lastMessage}</p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {conv.phone}
                      </span>
                      {conv.unreadCount > 0 && (
                        <span className="h-4 min-w-4 px-1 rounded-full bg-clinical-600 text-white text-[10px] flex items-center justify-center font-bold">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        {/* Right: Conversation Thread & Message Input */}
        <Card className="lg:col-span-8 flex flex-col h-full overflow-hidden">
          {activeThread ? (
            <>
              {/* Thread Header */}
              <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-clinical-100 text-clinical-700 flex items-center justify-center font-bold text-sm">
                    {(activeThread.contact?.profileName || 'P').charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold">
                        {activeThread.contact?.profileName || activeThread.contact?.patient?.fullName || activeThread.contact?.waId}
                      </h3>
                      {activeThread.status === 'HUMAN_HANDOVER' ? (
                        <Badge className="bg-amber-500 text-white text-xs">Human Handover</Badge>
                      ) : activeThread.status === 'RESOLVED' ? (
                        <Badge variant="outline" className="bg-slate-100 text-slate-700 text-xs">Resolved</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-xs">Open</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {activeThread.contact?.waId}
                      </span>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => handleToggleConsent(activeThread.contact?.consentStatus || 'UNKNOWN')}
                        className="flex items-center gap-1 text-[11px] underline hover:text-foreground"
                      >
                        {activeThread.contact?.consentStatus === 'OPTED_OUT' ? (
                          <span className="text-rose-600 flex items-center gap-1">
                            <ShieldAlert className="h-3 w-3" /> Opted-Out
                          </span>
                        ) : (
                          <span className="text-emerald-600 flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" /> Opted-In
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Status & Assignment Actions */}
                <div className="flex items-center gap-2">
                  {activeThread.status === 'HUMAN_HANDOVER' && (
                    <Button size="sm" onClick={handleClaim} className="bg-amber-600 hover:bg-amber-700 text-white text-xs">
                      Claim Conversation
                    </Button>
                  )}
                  {activeThread.status !== 'RESOLVED' ? (
                    <Button size="sm" variant="outline" onClick={handleResolve} className="text-xs">
                      Resolve
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={handleReopen} className="text-xs">
                      Reopen
                    </Button>
                  )}
                </div>
              </div>

              {/* 24-Hour Policy Window Banner */}
              <div
                className={`px-4 py-2 border-b flex items-center justify-between text-xs font-medium ${
                  is24HrActive
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {is24HrActive ? (
                    <span>24-Hour Customer Service Window: Active (Free text replies permitted)</span>
                  ) : (
                    <span>24-Hour Service Window Expired: Meta policy requires an approved template to message patient.</span>
                  )}
                </div>
              </div>

              {/* Thread Messages */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
                {activeThread.messages && activeThread.messages.length > 0 ? (
                  activeThread.messages.map((msg) => {
                    const isInbound = msg.direction === 'INBOUND';
                    const isTemplate = msg.messageType === 'template';

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col max-w-[80%] ${isInbound ? 'mr-auto items-start' : 'ml-auto items-end'}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-muted-foreground">
                          {isInbound ? (
                            <span>{activeThread.contact?.profileName || 'Patient'}</span>
                          ) : (
                            <span className="flex items-center gap-1 text-clinical-700 font-medium">
                              <User className="h-3 w-3" />
                              Clinic Staff
                            </span>
                          )}
                          <span>•</span>
                          <span>
                            {msg.sentAt
                              ? new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div
                          className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                            isInbound
                              ? 'bg-white border text-foreground rounded-tl-sm'
                              : isTemplate
                              ? 'bg-clinical-800 text-white rounded-tr-sm'
                              : 'bg-clinical-600 text-white rounded-tr-sm'
                          }`}
                        >
                          {msg.body}
                        </div>

                        {!isInbound && (
                          <div className="flex items-center gap-1 mt-0.5 px-1 text-[10px] text-muted-foreground">
                            {msg.status === 'READ' ? (
                              <CheckCheck className="h-3 w-3 text-sky-500" />
                            ) : msg.status === 'DELIVERED' ? (
                              <CheckCheck className="h-3 w-3 text-emerald-500" />
                            ) : msg.status === 'SENT' ? (
                              <Check className="h-3 w-3 text-slate-400" />
                            ) : (
                              <AlertTriangle className="h-3 w-3 text-rose-500" />
                            )}
                            <span className="capitalize">{msg.status.toLowerCase()}</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    No message history recorded for this conversation.
                  </div>
                )}
              </div>

              {/* Composer: Dynamic depending on 24-hr window */}
              {is24HrActive ? (
                <>
                  {/* Quick Preset Buttons */}
                  <div className="p-2 border-t bg-muted/10 flex flex-wrap gap-2 text-xs">
                    <span className="text-[11px] text-muted-foreground self-center">Quick Replies:</span>
                    <button
                      type="button"
                      onClick={() => setReplyText('Aapka appointment confirm ho chuka hai. Baraye meherbani time par tashreef layein.')}
                      className="px-2.5 py-1 rounded bg-muted hover:bg-muted/80 text-[11px] text-foreground"
                    >
                      Confirm Appointment (Urdu)
                    </button>
                    <button
                      type="button"
                      onClick={() => setReplyText('Doctor sahab OPD Consultation Room 2 mein dastyab hain.')}
                      className="px-2.5 py-1 rounded bg-muted hover:bg-muted/80 text-[11px] text-foreground"
                    >
                      Doctor Room Info
                    </button>
                  </div>

                  <form onSubmit={handleSendMessage} className="p-4 border-t flex items-center gap-2 bg-white">
                    <Input
                      placeholder="Type reply to patient in Urdu, English or Pashto..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      disabled={isSending}
                      className="flex-1"
                    />
                    <Button
                      type="submit"
                      disabled={!replyText.trim() || isSending}
                      className="bg-clinical-600 hover:bg-clinical-700 text-white gap-1.5"
                    >
                      <Send className="h-4 w-4" />
                      Send
                    </Button>
                  </form>
                </>
              ) : (
                /* Outside 24-hr window: Template Selector */
                <div className="p-4 border-t bg-amber-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">Choose Template:</span>
                    <select
                      value={selectedTemplate}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                      className="border rounded-md px-3 py-1.5 text-xs bg-white text-slate-900 w-full sm:w-64"
                    >
                      <option value="appointment_confirmation">appointment_confirmation</option>
                      <option value="appointment_reminder">appointment_reminder</option>
                      <option value="queue_token_called">queue_token_called</option>
                      <option value="queue_delay_notice">queue_delay_notice</option>
                    </select>
                  </div>
                  <Button
                    onClick={handleSendTemplate}
                    disabled={isSending}
                    className="bg-clinical-700 hover:bg-clinical-800 text-white text-xs gap-1.5 w-full sm:w-auto"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Dispatch Template
                  </Button>
                </div>
              )}
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
