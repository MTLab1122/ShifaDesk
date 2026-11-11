'use client';

import * as React from 'react';
import { useAuth } from '@/lib/auth-context';
import { ApiClient } from '@/lib/api-client';
import {
  VoiceCallSession,
  VoiceAnalytics,
  VoiceProviderSettings,
  VoiceConversationMessage,
} from '@matabai/shared';
import { Badge } from '@/components/ui/badge';
import {
  PhoneCall,
  PhoneIncoming,
  PhoneOff,
  PhoneForwarded,
  Clock,
  CalendarCheck,
  Settings,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Send,
  Headphones,
  Radio,
} from 'lucide-react';

export default function VoiceAssistantPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = React.useState<'overview' | 'simulator' | 'settings'>('overview');
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  // Data states
  const [analytics, setAnalytics] = React.useState<VoiceAnalytics | null>(null);
  const [calls, setCalls] = React.useState<VoiceCallSession[]>([]);
  const [settings, setSettings] = React.useState<VoiceProviderSettings | null>(null);
  const [providerStatus, setProviderStatus] = React.useState<{
    status: string;
    provider: string;
    phoneNumber: string | null;
    isVerified: boolean;
    liveCallTestingBlocked: boolean;
    message: string;
    regulatoryNotice: string;
  } | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [langFilter, setLangFilter] = React.useState<string>('ALL');
  const [phoneSearch, setPhoneSearch] = React.useState<string>('');

  // Transcript Modal
  const [selectedCall, setSelectedCall] = React.useState<VoiceCallSession | null>(null);
  const [transcriptMessages, setTranscriptMessages] = React.useState<VoiceConversationMessage[]>([]);
  const [loadingTranscript, setLoadingTranscript] = React.useState(false);

  // Simulator State
  const [simPhone, setSimPhone] = React.useState('+923001234567');
  const [simLang, setSimLang] = React.useState<'ur' | 'ps' | 'en'>('ur');
  const [simMessage, setSimMessage] = React.useState('');
  const [simSessionId, setSimSessionId] = React.useState<string | undefined>(undefined);
  const [simBusy, setSimBusy] = React.useState(false);
  const [simConversation, setSimConversation] = React.useState<
    Array<{
      speaker: 'caller' | 'assistant' | 'system';
      text: string;
      intent?: string;
      action?: string;
    }>
  >([
    {
      speaker: 'assistant',
      text: 'مطب اے آئی میں خوش آمدید۔ اردو کے لیے 1، د پښتو لپاره 2، for English press 3.',
    },
  ]);

  // Load Data
  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [analyticsRes, callsRes, statusRes, settingsRes] = await Promise.allSettled([
        ApiClient.voice.getAnalytics(user?.clinicId),
        ApiClient.voice.getCalls({
          clinicId: user?.clinicId,
          page: 1,
          limit: 30,
          status: statusFilter !== 'ALL' ? (statusFilter as any) : undefined,
          language: langFilter !== 'ALL' ? langFilter : undefined,
          callerPhone: phoneSearch || undefined,
        }),
        ApiClient.voice.getProviderStatus(user?.clinicId),
        ApiClient.voice.getSettings(user?.clinicId),
      ]);

      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value);
      if (callsRes.status === 'fulfilled') setCalls(callsRes.value.items || []);
      if (statusRes.status === 'fulfilled') setProviderStatus(statusRes.value);
      if (settingsRes.status === 'fulfilled') setSettings(settingsRes.value);
    } catch (err) {
      console.error('Failed to load voice assistant data:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.clinicId, statusFilter, langFilter, phoneSearch]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // View Transcript
  const openTranscript = async (call: VoiceCallSession) => {
    setSelectedCall(call);
    setLoadingTranscript(true);
    try {
      const res = await ApiClient.voice.getTranscript(call.id);
      setTranscriptMessages(res.messages || []);
    } catch (err) {
      console.error('Failed to load transcript:', err);
    } finally {
      setLoadingTranscript(false);
    }
  };

  // Run Simulator Turn
  const handleSimulateSend = async (customText?: string, dtmf?: string) => {
    const textToSend = customText !== undefined ? customText : simMessage;
    if (!textToSend.trim() && !dtmf) return;

    const displayMsg = dtmf ? `[Keypad ${dtmf}] ${textToSend}` : textToSend;

    // Append caller message immediately
    setSimConversation((prev) => [
      ...prev,
      { speaker: 'caller', text: displayMsg },
    ]);
    if (customText === undefined) setSimMessage('');
    setSimBusy(true);

    try {
      const res = await ApiClient.voice.simulateTurn({
        clinicId: user?.clinicId || '00000000-0000-0000-0000-000000000000',
        callerPhone: simPhone,
        message: textToSend || `DTMF_${dtmf}`,
        language: simLang,
        sessionId: simSessionId,
        dtmfDigit: dtmf,
      });

      setSimSessionId(res.sessionId);
      setSimConversation((prev) => [
        ...prev,
        {
          speaker: 'assistant',
          text: res.message,
          intent: res.intent,
          action: res.actionTaken,
        },
      ]);
    } catch (err: any) {
      setSimConversation((prev) => [
        ...prev,
        {
          speaker: 'system',
          text: `Simulation Error: ${err.message || 'Failed to process voice turn'}`,
        },
      ]);
    } finally {
      setSimBusy(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings || !user?.clinicId) return;
    setSaving(true);
    try {
      const updated = await ApiClient.voice.updateSettings(user.clinicId, {
        sttProvider: settings.sttProvider as any,
        ttsProvider: settings.ttsProvider as any,
        llmProvider: settings.llmProvider,
        voiceModel: settings.voiceModel,
        voiceSpeed: Number(settings.voiceSpeed),
        humanTransferNumber: settings.humanTransferNumber,
        ivrGreetingMessage: settings.ivrGreetingMessage,
        enableRecording: settings.enableRecording,
        recordingConsentMessage: settings.recordingConsentMessage,
        transcriptRetentionDays: Number(settings.transcriptRetentionDays),
      });
      setSettings(updated);
      alert('Voice assistant settings saved successfully.');
    } catch (err: any) {
      alert(`Error saving settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-clinical-50 text-clinical-600 border border-clinical-200">
              <PhoneCall className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                AI Voice Receptionist & Telephony
                <Badge variant="outline" className="border-clinical-300 text-clinical-700 bg-clinical-50 text-xs">
                  Urdu / Pashto / English IVR
                </Badge>
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Inbound telephone calls, automated appointment booking, real-time token inquiries, and receptionist transfer.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border bg-background hover:bg-muted text-foreground transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Telephony Readiness Banner */}
      {providerStatus && (
        <div
          className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
            providerStatus.liveCallTestingBlocked
              ? 'bg-amber-50/70 border-amber-200 text-amber-900'
              : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
          }`}
        >
          <div className="flex items-start gap-3">
            {providerStatus.liveCallTestingBlocked ? (
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="text-sm font-semibold flex items-center gap-2">
                Carrier Status: {providerStatus.provider}{' '}
                <Badge
                  className={
                    providerStatus.liveCallTestingBlocked
                      ? 'bg-amber-600 text-white'
                      : 'bg-emerald-600 text-white'
                  }
                >
                  {providerStatus.status}
                </Badge>
                {providerStatus.phoneNumber && (
                  <span className="font-mono text-xs">({providerStatus.phoneNumber})</span>
                )}
              </div>
              <p className="text-xs mt-1 opacity-90">{providerStatus.message}</p>
              <p className="text-[11px] mt-1 font-medium text-muted-foreground">
                📌 {providerStatus.regulatoryNotice}
              </p>
            </div>
          </div>

          {providerStatus.liveCallTestingBlocked && (
            <button
              onClick={() => setActiveTab('simulator')}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shrink-0 shadow-sm transition-colors"
            >
              Open Voice Simulator
            </button>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b space-x-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-clinical-600 text-clinical-600 font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <PhoneIncoming className="h-4 w-4" />
          Call Logs & Analytics
        </button>
        <button
          onClick={() => setActiveTab('simulator')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'simulator'
              ? 'border-clinical-600 text-clinical-600 font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Radio className="h-4 w-4" />
          Voice Simulator Playground
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'settings'
              ? 'border-clinical-600 text-clinical-600 font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Settings className="h-4 w-4" />
          Telephony & IVR Settings
        </button>
      </div>

      {/* TAB 1: OVERVIEW & CALL LOGS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="p-4 rounded-xl border bg-card text-card-foreground shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-medium">Total Calls</span>
                <PhoneCall className="h-4 w-4 text-clinical-600" />
              </div>
              <div className="text-2xl font-bold">{analytics?.totalCalls || 0}</div>
              <p className="text-[11px] text-muted-foreground mt-1">All time</p>
            </div>

            <div className="p-4 rounded-xl border bg-card text-card-foreground shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-medium">Completed</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-emerald-600">
                {analytics?.completedCalls || 0}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {analytics?.totalCalls
                  ? `${Math.round(((analytics.completedCalls || 0) / analytics.totalCalls) * 100)}% answered`
                  : '0% answered'}
              </p>
            </div>

            <div className="p-4 rounded-xl border bg-card text-card-foreground shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-medium">Missed / Busy</span>
                <PhoneOff className="h-4 w-4 text-rose-500" />
              </div>
              <div className="text-2xl font-bold text-rose-600">
                {analytics?.missedCalls || 0}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">No answer / busy</p>
            </div>

            <div className="p-4 rounded-xl border bg-card text-card-foreground shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-medium">Avg Duration</span>
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold">
                {analytics?.averageDurationSeconds || 0}s
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Per completed call</p>
            </div>

            <div className="p-4 rounded-xl border bg-card text-card-foreground shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-medium">Voice Bookings</span>
                <CalendarCheck className="h-4 w-4 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-600">
                {analytics?.appointmentsBookedViaVoice || 0}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Via telephone</p>
            </div>

            <div className="p-4 rounded-xl border bg-card text-card-foreground shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-medium">Handovers</span>
                <PhoneForwarded className="h-4 w-4 text-amber-600" />
              </div>
              <div className="text-2xl font-bold text-amber-600">
                {analytics?.handoverCount || 0}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Transferred to staff</p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="p-4 rounded-xl border bg-card flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search caller phone..."
                  value={phoneSearch}
                  onChange={(e) => setPhoneSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border bg-background text-foreground"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border bg-background text-foreground"
              >
                <option value="ALL">All Call Statuses</option>
                <option value="COMPLETED">Completed</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="FAILED">Failed</option>
                <option value="BUSY">Busy</option>
                <option value="NO_ANSWER">No Answer</option>
              </select>

              <select
                value={langFilter}
                onChange={(e) => setLangFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border bg-background text-foreground"
              >
                <option value="ALL">All Languages</option>
                <option value="ur">Urdu (اردو)</option>
                <option value="ps">Pashto (پښتو)</option>
                <option value="en">English</option>
              </select>
            </div>

            <span className="text-xs text-muted-foreground">
              Showing {calls.length} calls
            </span>
          </div>

          {/* Calls Table */}
          <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 border-b text-muted-foreground uppercase text-[10px] font-semibold tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Caller & Patient</th>
                    <th className="px-4 py-3">Language</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Handover</th>
                    <th className="px-4 py-3">Started At</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {calls.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        No voice call sessions recorded yet. Use the Voice Simulator tab to test!
                      </td>
                    </tr>
                  ) : (
                    calls.map((call) => (
                      <tr key={call.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground">{call.callerPhone}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {call.patient ? `👤 ${call.patient.fullName}` : 'New caller'}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                            {call.selectedLanguage || 'ur'}
                          </Badge>
                        </td>

                        <td className="px-4 py-3 font-mono">
                          {call.durationSeconds ? `${call.durationSeconds}s` : '0s'}
                        </td>

                        <td className="px-4 py-3">
                          <Badge
                            className={
                              call.callStatus === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : call.callStatus === 'IN_PROGRESS'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-rose-100 text-rose-800'
                            }
                          >
                            {call.callStatus}
                          </Badge>
                        </td>

                        <td className="px-4 py-3">
                          {call.handoverStatus === 'TRANSFERRED' ? (
                            <Badge className="bg-amber-100 text-amber-800">Transferred</Badge>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(call.startedAt).toLocaleString()}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => openTranscript(call)}
                            className="px-2.5 py-1 text-[11px] font-medium rounded-md border bg-background hover:bg-muted text-foreground transition-colors"
                          >
                            Transcript
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VOICE SIMULATOR PLAYGROUND */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls & Quick Actions */}
          <div className="space-y-4">
            <div className="p-4 rounded-xl border bg-card space-y-4">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Radio className="h-4 w-4 text-clinical-600" />
                Call Simulator Controls
              </h2>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Caller Phone (E.164)
                </label>
                <input
                  type="text"
                  value={simPhone}
                  onChange={(e) => setSimPhone(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border bg-background text-foreground font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  IVR Language
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setSimLang('ur')}
                    className={`py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                      simLang === 'ur'
                        ? 'bg-clinical-600 text-white border-clinical-600'
                        : 'bg-background hover:bg-muted text-foreground'
                    }`}
                  >
                    اردو (Urdu)
                  </button>
                  <button
                    onClick={() => setSimLang('ps')}
                    className={`py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                      simLang === 'ps'
                        ? 'bg-clinical-600 text-white border-clinical-600'
                        : 'bg-background hover:bg-muted text-foreground'
                    }`}
                  >
                    پښتو (Pashto)
                  </button>
                  <button
                    onClick={() => setSimLang('en')}
                    className={`py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                      simLang === 'en'
                        ? 'bg-clinical-600 text-white border-clinical-600'
                        : 'bg-background hover:bg-muted text-foreground'
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>

              {/* Keypad */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Telephone DTMF Keypad
                </label>
                <div className="grid grid-cols-3 gap-2 font-mono font-bold text-center">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((k) => (
                    <button
                      key={k}
                      disabled={simBusy}
                      onClick={() => handleSimulateSend(`Pressed ${k}`, k)}
                      className="py-2 text-xs rounded-lg border bg-muted/40 hover:bg-clinical-50 hover:border-clinical-300 transition-colors"
                    >
                      {k}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  1=Urdu, 2=Pashto, 3=English, 0=Receptionist Handover
                </p>
              </div>

              <button
                onClick={() => {
                  setSimSessionId(undefined);
                  setSimConversation([
                    {
                      speaker: 'assistant',
                      text: 'مطب اے آئی میں خوش آمدید۔ اردو کے لیے 1، د پښتو لپاره 2، for English press 3.',
                    },
                  ]);
                }}
                className="w-full py-2 text-xs font-semibold rounded-lg border bg-muted/40 hover:bg-muted text-foreground transition-colors"
              >
                Reset Conversation
              </button>
            </div>

            {/* Quick Test Scenarios */}
            <div className="p-4 rounded-xl border bg-card space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                One-Click Test Scenarios
              </h3>

              <div className="space-y-1.5 text-xs">
                <button
                  disabled={simBusy}
                  onClick={() => handleSimulateSend('کلینک کے اوقات کار اور پتہ بتائیں')}
                  className="w-full text-left p-2 rounded-lg border hover:bg-muted text-foreground transition-colors flex items-center justify-between"
                >
                  <span>🏥 Clinic Info & Timing</span>
                  <span className="text-[10px] font-mono text-muted-foreground">Urdu</span>
                </button>

                <button
                  disabled={simBusy}
                  onClick={() => handleSimulateSend('ڈاکٹر کا وقت معلوم کرنا ہے')}
                  className="w-full text-left p-2 rounded-lg border hover:bg-muted text-foreground transition-colors flex items-center justify-between"
                >
                  <span>👨‍⚕️ Doctor Schedule & Fees</span>
                  <span className="text-[10px] font-mono text-muted-foreground">Urdu</span>
                </button>

                <button
                  disabled={simBusy}
                  onClick={() => handleSimulateSend('او پی ڈی میں ٹوکن کا کیا نمبر چل رہا ہے؟')}
                  className="w-full text-left p-2 rounded-lg border hover:bg-muted text-foreground transition-colors flex items-center justify-between"
                >
                  <span>🎫 Queue Token Status</span>
                  <span className="text-[10px] font-mono text-muted-foreground">Urdu</span>
                </button>

                <button
                  disabled={simBusy}
                  onClick={() => handleSimulateSend('ڈاکٹر احمد کے ساتھ آج کی اپائنٹمنٹ بک کریں')}
                  className="w-full text-left p-2 rounded-lg border hover:bg-muted text-foreground transition-colors flex items-center justify-between"
                >
                  <span>📅 Book Voice Appointment</span>
                  <span className="text-[10px] font-mono text-muted-foreground">Urdu</span>
                </button>

                <button
                  disabled={simBusy}
                  onClick={() => handleSimulateSend('سر درد اور بخار ہے، کون سی دوا کھاؤں؟')}
                  className="w-full text-left p-2 rounded-lg border border-amber-300 bg-amber-50/50 hover:bg-amber-100/50 text-amber-900 transition-colors flex items-center justify-between"
                >
                  <span>🛡️ Medical Advice Refusal</span>
                  <span className="text-[10px] font-semibold text-amber-700">Safety Refusal</span>
                </button>

                <button
                  disabled={simBusy}
                  onClick={() => handleSimulateSend('سینے میں شدید درد ہے، دل کا دورہ پڑ رہا ہے!')}
                  className="w-full text-left p-2 rounded-lg border border-rose-300 bg-rose-50/50 hover:bg-rose-100/50 text-rose-900 transition-colors flex items-center justify-between"
                >
                  <span>🚨 Emergency 1122 Escalation</span>
                  <span className="text-[10px] font-semibold text-rose-700">Emergency</span>
                </button>

                <button
                  disabled={simBusy}
                  onClick={() => handleSimulateSend('کسی انسان سے بات کروائیں، ریسیپشنسٹ')}
                  className="w-full text-left p-2 rounded-lg border border-blue-300 bg-blue-50/50 hover:bg-blue-100/50 text-blue-900 transition-colors flex items-center justify-between"
                >
                  <span>📞 Receptionist Handover</span>
                  <span className="text-[10px] font-semibold text-blue-700">Handover</span>
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Dialogue Pane */}
          <div className="lg:col-span-2 border rounded-xl bg-card flex flex-col h-[650px] shadow-sm">
            <div className="p-4 border-b flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2">
                <Headphones className="h-5 w-5 text-clinical-600" />
                <div>
                  <h3 className="text-sm font-semibold">Live Speech & IVR Interaction</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Caller: {simPhone} • Language: {simLang.toUpperCase()}
                  </p>
                </div>
              </div>

              {simBusy && (
                <div className="flex items-center gap-2 text-xs text-clinical-600 font-medium">
                  <div className="w-2 h-2 rounded-full bg-clinical-600 animate-ping" />
                  Processing voice turn...
                </div>
              )}
            </div>

            {/* Conversation Log */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {simConversation.map((turn, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${
                    turn.speaker === 'caller'
                      ? 'items-end'
                      : turn.speaker === 'assistant'
                      ? 'items-start'
                      : 'items-center'
                  }`}
                >
                  {turn.speaker === 'system' ? (
                    <div className="px-3 py-1.5 rounded-lg bg-muted text-[11px] text-muted-foreground text-center">
                      {turn.text}
                    </div>
                  ) : (
                    <div
                      className={`max-w-[85%] p-3 rounded-2xl text-xs space-y-1.5 shadow-sm ${
                        turn.speaker === 'caller'
                          ? 'bg-clinical-600 text-white rounded-br-none'
                          : 'bg-muted/70 text-foreground border rounded-bl-none'
                      }`}
                    >
                      <div className="text-[10px] font-semibold opacity-75 uppercase">
                        {turn.speaker === 'caller' ? 'Caller Speech' : 'AI Voice Receptionist'}
                      </div>
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">{turn.text}</div>

                      {turn.intent && (
                        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/40 text-[10px]">
                          <span className="font-semibold text-clinical-700">Intent: {turn.intent}</span>
                          {turn.action && (
                            <span className="text-muted-foreground font-mono">Action: {turn.action}</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Speech Input Box */}
            <div className="p-4 border-t bg-background">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSimulateSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Type simulated caller speech (e.g. 'ڈاکٹر احمد کا وقت بتائیں' or 'Book appointment')..."
                  value={simMessage}
                  onChange={(e) => setSimMessage(e.target.value)}
                  disabled={simBusy}
                  className="flex-1 px-3 py-2 text-xs rounded-lg border bg-background text-foreground"
                />
                <button
                  type="submit"
                  disabled={simBusy || !simMessage.trim()}
                  className="px-4 py-2 rounded-lg bg-clinical-600 hover:bg-clinical-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Send className="h-3.5 w-3.5" />
                  Speak
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TELEPHONY & IVR SETTINGS */}
      {activeTab === 'settings' && settings && (
        <form onSubmit={handleSaveSettings} className="space-y-6 max-w-4xl">
          <div className="p-6 rounded-xl border bg-card space-y-6 shadow-sm">
            <div>
              <h2 className="text-base font-semibold">Speech Recognition (STT) & Synthesis (TTS)</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure provider engines for multilingual speech recognition and voice responses.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Speech-to-Text (STT) Engine
                </label>
                <select
                  value={settings.sttProvider}
                  onChange={(e) => setSettings({ ...settings, sttProvider: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs rounded-lg border bg-background text-foreground"
                >
                  <option value="openai_whisper">OpenAI Whisper (Multilingual High-Accuracy)</option>
                  <option value="groq_whisper">Groq Whisper (Ultra-low Latency)</option>
                  <option value="google_stt">Google Cloud Speech-to-Text</option>
                  <option value="twilio_gather">Twilio Gather Built-in</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Text-to-Speech (TTS) Engine
                </label>
                <select
                  value={settings.ttsProvider}
                  onChange={(e) => setSettings({ ...settings, ttsProvider: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs rounded-lg border bg-background text-foreground"
                >
                  <option value="openai_tts">OpenAI TTS (Natural Conversational)</option>
                  <option value="elevenlabs">ElevenLabs Multi-voice</option>
                  <option value="google_tts">Google Cloud TTS</option>
                  <option value="twilio_say">Twilio Polly (Standard)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Voice Model
                </label>
                <input
                  type="text"
                  value={settings.voiceModel}
                  onChange={(e) => setSettings({ ...settings, voiceModel: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border bg-background text-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Voice Speed (0.5x - 2.0x)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="2.0"
                  value={settings.voiceSpeed}
                  onChange={(e) => setSettings({ ...settings, voiceSpeed: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 text-xs rounded-lg border bg-background text-foreground"
                />
              </div>
            </div>

            <div className="border-t pt-6 space-y-4">
              <h2 className="text-base font-semibold">Human Receptionist Handover & Routing</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Reception Desk Transfer Number (E.164)
                  </label>
                  <input
                    type="text"
                    placeholder="+923001234567"
                    value={settings.humanTransferNumber || ''}
                    onChange={(e) => setSettings({ ...settings, humanTransferNumber: e.target.value || null })}
                    className="w-full px-3 py-2 text-xs rounded-lg border bg-background text-foreground font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Calls will be connected to this number when caller says "receptionist" or presses 0.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Transcript Retention (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={settings.transcriptRetentionDays}
                    onChange={(e) => setSettings({ ...settings, transcriptRetentionDays: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 text-xs rounded-lg border bg-background text-foreground"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-6 space-y-4">
              <h2 className="text-base font-semibold">IVR Welcome Prompt</h2>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Initial Language Selection Greeting
                </label>
                <textarea
                  rows={3}
                  value={settings.ivrGreetingMessage}
                  onChange={(e) => setSettings({ ...settings, ivrGreetingMessage: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border bg-background text-foreground"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enableRecording"
                  checked={settings.enableRecording}
                  onChange={(e) => setSettings({ ...settings, enableRecording: e.target.checked })}
                  className="rounded border"
                />
                <label htmlFor="enableRecording" className="text-xs font-medium text-foreground cursor-pointer">
                  Enable Call Audio Recording & Quality Consent
                </label>
              </div>

              {settings.enableRecording && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Recording Consent Announcement
                  </label>
                  <input
                    type="text"
                    value={settings.recordingConsentMessage}
                    onChange={(e) => setSettings({ ...settings, recordingConsentMessage: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border bg-background text-foreground"
                  />
                </div>
              )}
            </div>

            <div className="border-t pt-4 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-lg bg-clinical-600 hover:bg-clinical-700 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                {saving ? 'Saving Settings...' : 'Save Voice Settings'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Transcript Modal */}
      {selectedCall && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background border rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-xl">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <PhoneCall className="h-4 w-4 text-clinical-600" />
                  Call Session: {selectedCall.callerPhone}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Call SID: {selectedCall.providerCallId} • Started: {new Date(selectedCall.startedAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedCall(null)}
                className="text-muted-foreground hover:text-foreground text-xs font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {loadingTranscript ? (
                <div className="py-8 text-center text-xs text-muted-foreground animate-pulse">
                  Loading conversation transcript...
                </div>
              ) : transcriptMessages.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No conversation messages logged for this call.
                </div>
              ) : (
                transcriptMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.speaker === 'CALLER' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] p-3 rounded-2xl text-xs space-y-1 shadow-sm ${
                        msg.speaker === 'CALLER'
                          ? 'bg-clinical-600 text-white rounded-br-none'
                          : 'bg-muted/70 text-foreground border rounded-bl-none'
                      }`}
                    >
                      <div className="text-[10px] font-semibold opacity-75 uppercase">
                        {msg.speaker === 'CALLER' ? 'Caller' : 'AI Voice Receptionist'}
                      </div>
                      <div className="text-sm leading-relaxed">{msg.messageText}</div>
                      <div className="text-[9px] opacity-75 font-mono text-right">
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t bg-muted/20 flex justify-end">
              <button
                onClick={() => setSelectedCall(null)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg border bg-background hover:bg-muted text-foreground"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
