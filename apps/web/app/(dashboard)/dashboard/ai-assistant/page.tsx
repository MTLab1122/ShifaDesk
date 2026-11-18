'use client';

import * as React from 'react';
import { useAuth } from '@/lib/auth-context';
import { ApiClient } from '@/lib/api-client';
import {
  AiAssistantSettings,
  ClinicFaq,
  AiInteractionLog,
  AiToolExecutionLog,
  AiUsageStats,
  AiAssistantHealth,
} from '@matabai/shared';
import { Badge } from '@/components/ui/badge';
import {
  Bot,
  Settings,
  HelpCircle,
  Activity,
  BarChart3,
  MessageSquare,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Plus,
  Send,
  Zap,
} from 'lucide-react';

export default function AiAssistantPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = React.useState<'settings' | 'faqs' | 'audit' | 'metrics' | 'simulator'>('settings');
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [health, setHealth] = React.useState<AiAssistantHealth | null>(null);
  const [settings, setSettings] = React.useState<AiAssistantSettings | null>(null);
  const [faqs, setFaqs] = React.useState<ClinicFaq[]>([]);
  const [interactions, setInteractions] = React.useState<AiInteractionLog[]>([]);
  const [toolLogs, setToolLogs] = React.useState<AiToolExecutionLog[]>([]);
  const [usage, setUsage] = React.useState<AiUsageStats | null>(null);

  // FAQ Modal / Form state
  const [showFaqModal, setShowFaqModal] = React.useState(false);
  const [editingFaq, setEditingFaq] = React.useState<ClinicFaq | null>(null);
  const [faqForm, setFaqForm] = React.useState({
    questionEn: '',
    answerEn: '',
    questionUr: '',
    answerUr: '',
    questionPs: '',
    answerPs: '',
    category: 'GENERAL' as const,
    isActive: true,
  });

  // Simulator state
  const [simMessage, setSimMessage] = React.useState('');
  const [simHistory, setSimHistory] = React.useState<Array<{ sender: 'user' | 'bot'; text: string; intent?: string }>>([
    { sender: 'bot', text: 'Hello! I am your AI receptionist. You can ask me to book an appointment, check doctor availability, check queue tokens, or ask clinic hours in English, Urdu (اردو), or Pashto (پښتو)!' },
  ]);
  const [simLoading, setSimLoading] = React.useState(false);

  // Settings form state
  const [formSettings, setFormSettings] = React.useState({
    assistantName: '',
    enabled: true,
    defaultLanguage: 'UR',
    supportedLanguages: ['EN', 'UR', 'PS'],
    greetingMessage: '',
    humanHandoverEnabled: true,
    appointmentBookingEnabled: true,
    tokenLookupEnabled: true,
    clinicFaqEnabled: true,
  });

  const clinicId = user?.clinicId || '';

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [healthData, settingsData, faqsData, interactionsData, toolsData, usageData] = await Promise.all([
        ApiClient.ai.getHealth().catch(() => null),
        ApiClient.ai.getSettings(clinicId).catch(() => null),
        ApiClient.ai.listFaqs({ clinicId }).catch(() => ({ items: [], total: 0 })),
        ApiClient.ai.listInteractions({ clinicId, limit: 15 }).catch(() => ({ items: [], total: 0 })),
        ApiClient.ai.listToolExecutions({ clinicId, limit: 15 }).catch(() => ({ items: [], total: 0 })),
        ApiClient.ai.getUsageStats(clinicId).catch(() => null),
      ]);

      if (healthData) setHealth(healthData);
      if (settingsData) {
        setSettings(settingsData);
        setFormSettings({
          assistantName: settingsData.assistantName,
          enabled: settingsData.enabled,
          defaultLanguage: settingsData.defaultLanguage,
          supportedLanguages: settingsData.supportedLanguages,
          greetingMessage: settingsData.greetingMessage,
          humanHandoverEnabled: settingsData.humanHandoverEnabled,
          appointmentBookingEnabled: settingsData.appointmentBookingEnabled,
          tokenLookupEnabled: settingsData.tokenLookupEnabled,
          clinicFaqEnabled: settingsData.clinicFaqEnabled,
        });
      }
      if (faqsData) setFaqs(faqsData.items);
      if (interactionsData) setInteractions(interactionsData.items);
      if (toolsData) setToolLogs(toolsData.items);
      if (usageData) setUsage(usageData);
    } catch (err) {
      console.error('Failed to load AI Assistant data:', err);
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleEnable = async () => {
    if (!settings) return;
    try {
      const newEnabled = !formSettings.enabled;
      if (newEnabled) {
        await ApiClient.ai.enableAssistant(clinicId);
      } else {
        await ApiClient.ai.disableAssistant(clinicId);
      }
      setFormSettings((prev) => ({ ...prev, enabled: newEnabled }));
      await loadData();
    } catch (err) {
      console.error('Failed to toggle AI Assistant:', err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await ApiClient.ai.updateSettings({
        clinicId,
        ...formSettings,
        defaultLanguage: formSettings.defaultLanguage as any,
        supportedLanguages: formSettings.supportedLanguages as any,
      });
      alert('AI Assistant settings saved successfully.');
      await loadData();
    } catch (err) {
      console.error('Failed to update settings:', err);
      alert('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingFaq) {
        await ApiClient.ai.updateFaq(editingFaq.id, {
          clinicId,
          ...faqForm,
        });
      } else {
        await ApiClient.ai.createFaq({
          clinicId,
          ...faqForm,
        });
      }
      setShowFaqModal(false);
      setEditingFaq(null);
      setFaqForm({
        questionEn: '',
        answerEn: '',
        questionUr: '',
        answerUr: '',
        questionPs: '',
        answerPs: '',
        category: 'GENERAL',
        isActive: true,
      });
      await loadData();
    } catch (err) {
      console.error('Failed to save FAQ:', err);
      alert('Failed to save FAQ.');
    }
  };

  const handleDeleteFaq = async (id: string) => {
    if (!confirm('Are you sure you want to delete this FAQ entry?')) return;
    try {
      await ApiClient.ai.deleteFaq(id);
      await loadData();
    } catch (err) {
      console.error('Failed to delete FAQ:', err);
    }
  };

  const handleSendSimulator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simMessage.trim() || simLoading) return;

    const userText = simMessage.trim();
    setSimMessage('');
    setSimHistory((prev) => [...prev, { sender: 'user', text: userText }]);
    setSimLoading(true);

    try {
      // Test simulation using random conversation ID for the playground session
      const testRes = await ApiClient.ai.testConversationInteraction(
        '00000000-0000-0000-0000-000000000001',
        userText,
        clinicId,
      );
      setSimHistory((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: testRes.response || 'I am ready to help you.',
          intent: testRes.intent,
        },
      ]);
    } catch (err: any) {
      setSimHistory((prev) => [
        ...prev,
        { sender: 'bot', text: `⚠️ Error: ${err.message || 'Failed to simulate response'}` },
      ]);
    } finally {
      setSimLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                AI Multilingual Receptionist
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Automated 24/7 reception, doctor scheduling, and token check-ins in English, Urdu, & Pashto
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {health && (
            <Badge
              variant="outline"
              className={`px-3 py-1 font-medium ${health.status === 'ACTIVE'
                ? 'border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30'
                : 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-950/30'
                }`}
            >
              <Zap className="w-3.5 h-3.5 mr-1.5" />
              {health.status} ({health.model})
            </Badge>
          )}

          <button
            type="button"
            onClick={handleToggleEnable}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${formSettings.enabled
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
              : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
          >
            {formSettings.enabled ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {formSettings.enabled ? 'Receptionist Active' : 'Receptionist Paused'}
          </button>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
            title="Refresh AI Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === 'settings'
            ? 'border-teal-600 text-teal-600 dark:text-teal-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
        >
          <Settings className="w-4 h-4" />
          Settings & Guardrails
        </button>

        <button
          onClick={() => setActiveTab('faqs')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === 'faqs'
            ? 'border-teal-600 text-teal-600 dark:text-teal-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
        >
          <HelpCircle className="w-4 h-4" />
          Multilingual FAQs ({faqs.length})
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === 'audit'
            ? 'border-teal-600 text-teal-600 dark:text-teal-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
        >
          <Activity className="w-4 h-4" />
          Live Audit & Tools
        </button>

        <button
          onClick={() => setActiveTab('metrics')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === 'metrics'
            ? 'border-teal-600 text-teal-600 dark:text-teal-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
        >
          <BarChart3 className="w-4 h-4" />
          Metrics & Cost
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === 'simulator'
            ? 'border-teal-600 text-teal-600 dark:text-teal-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
        >
          <MessageSquare className="w-4 h-4" />
          Simulator Playground
        </button>
      </div>

      {/* TAB 1: SETTINGS & GUARDRAILS */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSaveSettings} className="p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 space-y-5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Virtual Assistant Configuration
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Assistant Persona Name
                  </label>
                  <input
                    type="text"
                    value={formSettings.assistantName}
                    onChange={(e) => setFormSettings({ ...formSettings, assistantName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Default Initial Language
                    </label>
                    <select
                      value={formSettings.defaultLanguage}
                      onChange={(e) => setFormSettings({ ...formSettings, defaultLanguage: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm"
                    >
                      <option value="UR">اردو (Urdu)</option>
                      <option value="PS">پښتو (Pashto)</option>
                      <option value="EN">English</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Active Operational Languages
                    </label>
                    <div className="flex items-center gap-3 pt-2">
                      <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded font-medium">EN</span>
                      <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded font-medium">UR (اردو)</span>
                      <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded font-medium">PS (پښتو)</span>
                      <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded font-medium">Roman Scripts</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Greeting Message Template
                  </label>
                  <textarea
                    rows={3}
                    value={formSettings.greetingMessage}
                    onChange={(e) => setFormSettings({ ...formSettings, greetingMessage: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>

                <div className="pt-2 border-t border-gray-200 dark:border-gray-800 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Permitted Autonomous Capabilities
                  </h3>

                  <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formSettings.appointmentBookingEnabled}
                        onChange={(e) => setFormSettings({ ...formSettings, appointmentBookingEnabled: e.target.checked })}
                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Appointment Booking & Slot Availability Engine
                      </span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formSettings.tokenLookupEnabled}
                        onChange={(e) => setFormSettings({ ...formSettings, tokenLookupEnabled: e.target.checked })}
                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Digital Token & Live Queue Status Inquiries
                      </span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formSettings.clinicFaqEnabled}
                        onChange={(e) => setFormSettings({ ...formSettings, clinicFaqEnabled: e.target.checked })}
                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Clinic Timings, Location & Administrative FAQ Retrieval
                      </span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formSettings.humanHandoverEnabled}
                        onChange={(e) => setFormSettings({ ...formSettings, humanHandoverEnabled: e.target.checked })}
                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Automatic Human Receptionist Escalation on Handover Keywords
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm transition-colors shadow-sm disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Safety & Compliance Policy */}
          <div className="space-y-6">
            <div className="p-6 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-xl space-y-4">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-semibold text-sm">Emergency Override Policy</h3>
              </div>
              <p className="text-xs text-amber-900 dark:text-amber-300 leading-relaxed">
                Emergency detection (e.g. chest pain, severe bleeding, difficulty breathing) triggers an immediate multilingual emergency alert directing the patient to Rescue 1122 and nearest hospital emergency room. Booking is halted and the conversation is escalated to human staff.
              </p>
            </div>

            <div className="p-6 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/50 rounded-xl space-y-4">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="font-semibold text-sm">Zero Medical Advice Rule</h3>
              </div>
              <p className="text-xs text-blue-900 dark:text-blue-300 leading-relaxed">
                The virtual assistant is strictly prohibited from providing medical advice, diagnosing diseases, interpreting diagnostic reports, or prescribing medication. Inquiries of this nature receive a standardized refusal offering in-person doctor consultation.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MULTILINGUAL FAQS */}
      {activeTab === 'faqs' && (
        <div className="space-y-5">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Verified clinic answers provided directly to patients during WhatsApp conversations.
            </p>
            <button
              onClick={() => {
                setEditingFaq(null);
                setFaqForm({
                  questionEn: '',
                  answerEn: '',
                  questionUr: '',
                  answerUr: '',
                  questionPs: '',
                  answerPs: '',
                  category: 'GENERAL',
                  isActive: true,
                });
                setShowFaqModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add FAQ
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {faqs.map((faq) => (
              <div
                key={faq.id}
                className="p-5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="outline" className="text-xs uppercase">
                    {faq.category}
                  </Badge>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      onClick={() => {
                        setEditingFaq(faq);
                        setFaqForm({
                          questionEn: faq.questionEn,
                          answerEn: faq.answerEn,
                          questionUr: faq.questionUr || '',
                          answerUr: faq.answerUr || '',
                          questionPs: faq.questionPs || '',
                          answerPs: faq.answerPs || '',
                          category: faq.category as any,
                          isActive: faq.isActive,
                        });
                        setShowFaqModal(true);
                      }}
                      className="text-teal-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteFaq(faq.id)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                    🇬🇧 {faq.questionEn}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                    {faq.answerEn}
                  </p>
                </div>

                {faq.questionUr && (
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800 text-right" dir="rtl">
                    <h5 className="font-medium text-xs text-gray-800 dark:text-gray-200">
                      🇵🇰 {faq.questionUr}
                    </h5>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {faq.answerUr}
                    </p>
                  </div>
                )}
              </div>
            ))}

            {faqs.length === 0 && (
              <div className="col-span-2 p-8 text-center bg-gray-50 dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-sm text-gray-500">
                No FAQs added yet. Click &quot;Add FAQ&quot; to define verified clinic questions and answers.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT STREAM */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                Recent Conversational Interactions
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400">
                  <tr>
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4">Language</th>
                    <th className="py-2.5 px-4">Detected Intent</th>
                    <th className="py-2.5 px-4">Outcome</th>
                    <th className="py-2.5 px-4">Latency</th>
                    <th className="py-2.5 px-4">Tokens</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-800 dark:text-gray-200">
                  {interactions.map((it) => (
                    <tr key={it.id}>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        {new Date(it.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 px-4 uppercase font-medium">{it.detectedLanguage}</td>
                      <td className="py-2.5 px-4 font-mono">{it.detectedIntent}</td>
                      <td className="py-2.5 px-4">
                        <Badge
                          variant="outline"
                          className={
                            it.outcome === 'HANDOVER'
                              ? 'border-amber-500 text-amber-600'
                              : it.outcome === 'TOOL_EXECUTED'
                                ? 'border-emerald-500 text-emerald-600'
                                : 'border-blue-500 text-blue-600'
                          }
                        >
                          {it.outcome}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4">{it.latencyMs}ms</td>
                      <td className="py-2.5 px-4">
                        {(it.inputTokens || 0) + (it.outputTokens || 0)}
                      </td>
                    </tr>
                  ))}
                  {interactions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-gray-400">
                        No recorded AI interactions yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                Allowlisted Tool Invocations
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400">
                  <tr>
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4">Tool Name</th>
                    <th className="py-2.5 px-4">Execution Status</th>
                    <th className="py-2.5 px-4">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-800 dark:text-gray-200">
                  {toolLogs.map((tl) => (
                    <tr key={tl.id}>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        {new Date(tl.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-medium">{tl.toolName}</td>
                      <td className="py-2.5 px-4">
                        <Badge
                          variant="outline"
                          className={
                            tl.executionStatus === 'SUCCESS'
                              ? 'border-emerald-500 text-emerald-600'
                              : 'border-red-500 text-red-600'
                          }
                        >
                          {tl.executionStatus}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4">{tl.executionDurationMs}ms</td>
                    </tr>
                  ))}
                  {toolLogs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-gray-400">
                        No tool executions logged yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: METRICS & COST */}
      {activeTab === 'metrics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
              <span className="text-xs text-gray-500">Total Interactions</span>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {usage?.totalInteractions ?? 0}
              </p>
            </div>
            <div className="p-5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
              <span className="text-xs text-gray-500">Avg Latency</span>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {usage?.averageLatencyMs ?? 0} ms
              </p>
            </div>
            <div className="p-5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
              <span className="text-xs text-gray-500">Handover Rate</span>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {usage?.handoverRatePercentage ?? 0}%
              </p>
            </div>
            <div className="p-5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
              <span className="text-xs text-gray-500">Estimated Cost</span>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                ${usage?.estimatedCostUsd ?? 0}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SIMULATOR PLAYGROUND */}
      {activeTab === 'simulator' && (
        <div className="max-w-2xl mx-auto bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm flex flex-col h-[600px]">
          <div className="p-4 bg-teal-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <div>
                <h3 className="font-semibold text-sm">WhatsApp AI Receptionist Simulator</h3>
                <p className="text-xs text-teal-100">Live multi-turn testing (English, Urdu, Pashto, Roman)</p>
              </div>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50 dark:bg-gray-950">
            {simHistory.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.sender === 'user'
                    ? 'bg-teal-600 text-white rounded-br-none'
                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-none shadow-sm border border-gray-200 dark:border-gray-700'
                    }`}
                >
                  {msg.text}
                </div>
                {msg.intent && (
                  <span className="text-[10px] text-gray-400 font-mono mt-1">
                    Intent: {msg.intent}
                  </span>
                )}
              </div>
            ))}
            {simLoading && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Assistant is thinking...
              </div>
            )}
          </div>

          <form onSubmit={handleSendSimulator} className="p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex gap-2">
            <input
              type="text"
              value={simMessage}
              onChange={(e) => setSimMessage(e.target.value)}
              placeholder="Type in English, Urdu (e.g. ڈاکٹر سے ملنا ہے), or Pashto..."
              className="flex-1 px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button
              type="submit"
              disabled={simLoading || !simMessage.trim()}
              className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm disabled:opacity-50 flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </form>
        </div>
      )}

      {/* FAQ Modal */}
      {showFaqModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {editingFaq ? 'Edit FAQ Entry' : 'Create Multilingual FAQ'}
            </h3>

            <form onSubmit={handleSaveFaq} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <select
                  value={faqForm.category}
                  onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                >
                  <option value="GENERAL">General</option>
                  <option value="APPOINTMENTS">Appointments</option>
                  <option value="TIMINGS">Timings</option>
                  <option value="FEES">Fees</option>
                  <option value="LOCATION">Location</option>
                  <option value="SERVICES">Services</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Question (English) *
                </label>
                <input
                  type="text"
                  required
                  value={faqForm.questionEn}
                  onChange={(e) => setFaqForm({ ...faqForm, questionEn: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Answer (English) *
                </label>
                <textarea
                  rows={2}
                  required
                  value={faqForm.answerEn}
                  onChange={(e) => setFaqForm({ ...faqForm, answerEn: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  سوال (اردو)
                </label>
                <input
                  type="text"
                  dir="rtl"
                  value={faqForm.questionUr}
                  onChange={(e) => setFaqForm({ ...faqForm, questionUr: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  جواب (اردو)
                </label>
                <textarea
                  rows={2}
                  dir="rtl"
                  value={faqForm.answerUr}
                  onChange={(e) => setFaqForm({ ...faqForm, answerUr: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFaqModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium"
                >
                  Save FAQ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
