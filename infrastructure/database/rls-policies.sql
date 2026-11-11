-- ==============================================================================
-- MatabAI (ShifaDesk) - PostgreSQL Row Level Security (RLS) Policies
-- ==============================================================================
-- Multi-Tenant Data Isolation Rules for Supabase / PostgreSQL
-- ==============================================================================

-- 1. Enable RLS on all Phase 2 foundational tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. Organizations Policies
-- Users can view organizations they belong to (or if super-admin)
CREATE POLICY "org_member_select" ON organizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = organizations.id
        AND up.auth_user_id = auth.uid()
        AND om.status = 'ACTIVE'
    )
  );

-- Only organization admins can update their organization
CREATE POLICY "org_admin_update" ON organizations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = organizations.id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN')
        AND om.status = 'ACTIVE'
    )
  );

-- 3. Clinics Policies
-- Users can view clinics belonging to their organization
CREATE POLICY "clinic_org_select" ON clinics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = clinics.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.status = 'ACTIVE'
    )
  );

-- Clinic admins can insert and update clinics within their organization
CREATE POLICY "clinic_admin_insert" ON clinics
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = clinics.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN')
        AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "clinic_admin_update" ON clinics
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = clinics.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN')
        AND om.status = 'ACTIVE'
    )
  );

-- 4. User Profiles Policies
-- Users can read profiles in the same organization
CREATE POLICY "profile_user_select" ON user_profiles
  FOR SELECT
  USING (
    auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM organization_memberships om1
      JOIN organization_memberships om2 ON om1.organization_id = om2.organization_id
      JOIN user_profiles up1 ON om1.user_profile_id = up1.id
      WHERE up1.auth_user_id = auth.uid()
        AND om2.user_profile_id = user_profiles.id
        AND om1.status = 'ACTIVE'
    )
  );

-- Users can update only their own profile
CREATE POLICY "profile_user_update" ON user_profiles
  FOR UPDATE
  USING (auth_user_id = auth.uid());

-- 5. Memberships Policies
-- Organization members can read memberships in their org
CREATE POLICY "membership_org_select" ON organization_memberships
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = organization_memberships.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.status = 'ACTIVE'
    )
  );

-- 6. Audit Logs Policies
-- Only Organization Admins can read audit logs for their organization
CREATE POLICY "audit_admin_select" ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = audit_logs.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN')
        AND om.status = 'ACTIVE'
    )
  );

-- ==============================================================================
-- 7. Phase 3 Tables: Doctors, Assignments, Staff Members, Patients
-- ==============================================================================
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_clinic_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Doctors: Members of the same organization can read doctors
CREATE POLICY "doctor_org_select" ON doctors
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = doctors.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.status = 'ACTIVE'
    )
  );

-- Doctors: Only Clinic/Super Admins can create or update doctors
CREATE POLICY "doctor_admin_write" ON doctors
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = doctors.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN')
        AND om.status = 'ACTIVE'
    )
  );

-- Staff Members: Members of the same organization can read staff
CREATE POLICY "staff_org_select" ON staff_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = staff_members.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.status = 'ACTIVE'
    )
  );

-- Staff Members: Only Clinic/Super Admins can manage staff
CREATE POLICY "staff_admin_write" ON staff_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = staff_members.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN')
        AND om.status = 'ACTIVE'
    )
  );

-- Patients: Only authorized staff (Super Admin, Clinic Admin, Doctor, Receptionist) can view patients in their organization
CREATE POLICY "patient_org_staff_select" ON patients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = patients.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST')
        AND om.status = 'ACTIVE'
    )
    OR (
      user_profile_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = patients.user_profile_id
          AND up.auth_user_id = auth.uid()
      )
    )
  );

-- Patients: Admins and Receptionists can insert/update patients
CREATE POLICY "patient_reception_write" ON patients
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = patients.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST')
        AND om.status = 'ACTIVE'
    )
  );

-- ==============================================================================
-- 8. Phase 4 Tables: Working Hours, Schedule Exceptions, Appointments & History
-- ==============================================================================
ALTER TABLE doctor_working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_schedule_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_status_history ENABLE ROW LEVEL SECURITY;

-- Doctor Working Hours: Organization members can view schedules
CREATE POLICY "working_hours_org_select" ON doctor_working_hours
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = doctor_working_hours.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.status = 'ACTIVE'
    )
  );

-- Doctor Working Hours: Only Admins can modify working hours
CREATE POLICY "working_hours_admin_write" ON doctor_working_hours
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = doctor_working_hours.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN')
        AND om.status = 'ACTIVE'
    )
  );

-- Schedule Exceptions: Organization members can view exceptions
CREATE POLICY "schedule_exceptions_org_select" ON doctor_schedule_exceptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = doctor_schedule_exceptions.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.status = 'ACTIVE'
    )
  );

-- Schedule Exceptions: Admins can modify exceptions
CREATE POLICY "schedule_exceptions_admin_write" ON doctor_schedule_exceptions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = doctor_schedule_exceptions.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN')
        AND om.status = 'ACTIVE'
    )
  );

-- Appointments: Staff can view appointments within organization; Patients can view their own
CREATE POLICY "appointments_select" ON appointments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = appointments.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST')
        AND om.status = 'ACTIVE'
    )
    OR EXISTS (
      SELECT 1 FROM patients p
      JOIN user_profiles up ON p.user_profile_id = up.id
      WHERE p.id = appointments.patient_id
        AND up.auth_user_id = auth.uid()
    )
  );

-- Appointments: Authorized staff (or Patient for own) can insert/update
CREATE POLICY "appointments_write" ON appointments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = appointments.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST')
        AND om.status = 'ACTIVE'
    )
    OR EXISTS (
      SELECT 1 FROM patients p
      JOIN user_profiles up ON p.user_profile_id = up.id
      WHERE p.id = appointments.patient_id
        AND up.auth_user_id = auth.uid()
    )
  );

-- Appointment Status History: Read-only for authorized staff and patient
CREATE POLICY "appointment_history_select" ON appointment_status_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = appointment_status_history.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST')
        AND om.status = 'ACTIVE'
    )
  );

-- ==============================================================================
-- 7. Phase 5: Digital Token & Queue Management Policies
-- ==============================================================================

-- Enable RLS on Queue tables
ALTER TABLE clinic_queue_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_queue_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_status_history ENABLE ROW LEVEL SECURITY;

-- Queue Settings Policies
CREATE POLICY "queue_settings_select" ON clinic_queue_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = clinic_queue_settings.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "queue_settings_write" ON clinic_queue_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = clinic_queue_settings.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN')
        AND om.status = 'ACTIVE'
    )
  );

-- Queue Sessions Policies
CREATE POLICY "queue_sessions_select" ON clinic_queue_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = clinic_queue_sessions.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "queue_sessions_write" ON clinic_queue_sessions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = clinic_queue_sessions.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST', 'DOCTOR')
        AND om.status = 'ACTIVE'
    )
  );

-- Queue Tokens Policies
CREATE POLICY "queue_tokens_select" ON queue_tokens
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = queue_tokens.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST', 'DOCTOR')
        AND om.status = 'ACTIVE'
    )
    OR EXISTS (
      SELECT 1 FROM patients p
      JOIN user_profiles up ON p.user_profile_id = up.id
      WHERE p.id = queue_tokens.patient_id
        AND up.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "queue_tokens_write" ON queue_tokens
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = queue_tokens.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST', 'DOCTOR')
        AND om.status = 'ACTIVE'
    )
  );

-- Queue Status History Policies
CREATE POLICY "queue_history_select" ON queue_status_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = queue_status_history.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST', 'DOCTOR')
        AND om.status = 'ACTIVE'
    )
  );

-- ==============================================================================
-- 9. Phase 6: WhatsApp Business Cloud API Integration RLS Policies
-- ==============================================================================

ALTER TABLE whatsapp_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_message_templates ENABLE ROW LEVEL SECURITY;

-- WhatsApp Integrations Policies
CREATE POLICY "whatsapp_integrations_select" ON whatsapp_integrations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = whatsapp_integrations.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN')
        AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "whatsapp_integrations_write" ON whatsapp_integrations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = whatsapp_integrations.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN')
        AND om.status = 'ACTIVE'
    )
  );

-- WhatsApp Contacts Policies
CREATE POLICY "whatsapp_contacts_select" ON whatsapp_contacts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = whatsapp_contacts.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST', 'DOCTOR')
        AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "whatsapp_contacts_write" ON whatsapp_contacts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = whatsapp_contacts.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST')
        AND om.status = 'ACTIVE'
    )
  );

-- WhatsApp Conversations Policies
CREATE POLICY "whatsapp_conversations_select" ON whatsapp_conversations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = whatsapp_conversations.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST', 'DOCTOR')
        AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "whatsapp_conversations_write" ON whatsapp_conversations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = whatsapp_conversations.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST')
        AND om.status = 'ACTIVE'
    )
  );

-- WhatsApp Messages Policies
CREATE POLICY "whatsapp_messages_select" ON whatsapp_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = whatsapp_messages.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST', 'DOCTOR')
        AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "whatsapp_messages_write" ON whatsapp_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = whatsapp_messages.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST')
        AND om.status = 'ACTIVE'
    )
  );

-- WhatsApp Message Templates Policies
CREATE POLICY "whatsapp_templates_select" ON whatsapp_message_templates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = whatsapp_message_templates.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST', 'DOCTOR')
        AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "whatsapp_templates_write" ON whatsapp_message_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = whatsapp_message_templates.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN')
        AND om.status = 'ACTIVE'
    )
  );

-- ==============================================================================
-- 10. Phase 7: AI-Powered Multilingual Receptionist RLS Policies
-- ==============================================================================

ALTER TABLE ai_assistant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversation_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interaction_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tool_execution_logs ENABLE ROW LEVEL SECURITY;

-- AI Assistant Settings
CREATE POLICY "ai_settings_select" ON ai_assistant_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = ai_assistant_settings.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST', 'DOCTOR')
        AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "ai_settings_write" ON ai_assistant_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = ai_assistant_settings.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN')
        AND om.status = 'ACTIVE'
    )
  );

-- AI Conversation States
CREATE POLICY "ai_states_select" ON ai_conversation_states
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = ai_conversation_states.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST')
        AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "ai_states_write" ON ai_conversation_states
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = ai_conversation_states.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST')
        AND om.status = 'ACTIVE'
    )
  );

-- AI Interaction Logs
CREATE POLICY "ai_interactions_select" ON ai_interaction_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = ai_interaction_logs.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN')
        AND om.status = 'ACTIVE'
    )
  );

-- Clinic FAQs
CREATE POLICY "clinic_faqs_select" ON clinic_faqs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = clinic_faqs.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "clinic_faqs_write" ON clinic_faqs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = clinic_faqs.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN')
        AND om.status = 'ACTIVE'
    )
  );

-- AI Tool Execution Logs
CREATE POLICY "ai_tools_select" ON ai_tool_execution_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = ai_tool_execution_logs.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN')
        AND om.status = 'ACTIVE'
    )
  );

-- ==============================================================================
-- 11. Phase 8: Notification Orchestration & Workflow Engine RLS Policies
-- ==============================================================================

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE in_app_notifications ENABLE ROW LEVEL SECURITY;

-- Notification Preferences
CREATE POLICY "notification_preferences_select" ON notification_preferences
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = notification_preferences.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.status = 'ACTIVE'
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = notification_preferences.user_id
        AND up.auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM patients p
      JOIN user_profiles up ON p.user_profile_id = up.id
      WHERE p.id = notification_preferences.patient_id
        AND up.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "notification_preferences_write" ON notification_preferences
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = notification_preferences.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST')
        AND om.status = 'ACTIVE'
    )
  );

-- Notification Rules
CREATE POLICY "notification_rules_select" ON notification_rules
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = notification_rules.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "notification_rules_write" ON notification_rules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = notification_rules.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN')
        AND om.status = 'ACTIVE'
    )
  );

-- Notification Templates
CREATE POLICY "notification_templates_select" ON notification_templates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = notification_templates.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "notification_templates_write" ON notification_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = notification_templates.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN')
        AND om.status = 'ACTIVE'
    )
  );

-- Notification Jobs
CREATE POLICY "notification_jobs_select" ON notification_jobs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = notification_jobs.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST')
        AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "notification_jobs_write" ON notification_jobs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = notification_jobs.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN')
        AND om.status = 'ACTIVE'
    )
  );

-- In-App Notifications
CREATE POLICY "in_app_notifications_select" ON in_app_notifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = in_app_notifications.recipient_user_id
        AND up.auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = in_app_notifications.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN')
        AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "in_app_notifications_write" ON in_app_notifications
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = in_app_notifications.recipient_user_id
        AND up.auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = in_app_notifications.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN')
        AND om.status = 'ACTIVE'
    )
  );

-- ==============================================================================
-- 12. Phase 9: AI Voice Receptionist & Telephony RLS Policies
-- ==============================================================================

ALTER TABLE voice_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_call_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_provider_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_handover_records ENABLE ROW LEVEL SECURITY;

-- Voice Integrations
CREATE POLICY "voice_integrations_select" ON voice_integrations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = voice_integrations.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "voice_integrations_write" ON voice_integrations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = voice_integrations.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN')
        AND om.status = 'ACTIVE'
    )
  );

-- Voice Call Sessions
CREATE POLICY "voice_call_sessions_select" ON voice_call_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = voice_call_sessions.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST', 'DOCTOR')
        AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "voice_call_sessions_write" ON voice_call_sessions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = voice_call_sessions.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST')
        AND om.status = 'ACTIVE'
    )
  );

-- Voice Conversation Messages
CREATE POLICY "voice_conversation_messages_select" ON voice_conversation_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM voice_call_sessions vcs
      JOIN organization_memberships om ON vcs.organization_id = om.organization_id
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE vcs.id = voice_conversation_messages.call_session_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST', 'DOCTOR')
        AND om.status = 'ACTIVE'
    )
  );

-- Voice Call Events
CREATE POLICY "voice_call_events_select" ON voice_call_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM voice_call_sessions vcs
      JOIN organization_memberships om ON vcs.organization_id = om.organization_id
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE vcs.id = voice_call_events.call_session_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN')
        AND om.status = 'ACTIVE'
    )
  );

-- Voice Provider Settings
CREATE POLICY "voice_provider_settings_select" ON voice_provider_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = voice_provider_settings.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "voice_provider_settings_write" ON voice_provider_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = voice_provider_settings.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN')
        AND om.status = 'ACTIVE'
    )
  );

-- Voice Handover Records
CREATE POLICY "voice_handover_records_select" ON voice_handover_records
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM voice_call_sessions vcs
      JOIN organization_memberships om ON vcs.organization_id = om.organization_id
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE vcs.id = voice_handover_records.call_session_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST')
        AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "voice_handover_records_write" ON voice_handover_records
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM voice_call_sessions vcs
      JOIN organization_memberships om ON vcs.organization_id = om.organization_id
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE vcs.id = voice_handover_records.call_session_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST')
        AND om.status = 'ACTIVE'
    )
  );

-- ==============================================================================
-- 13. Phase 10: Diagnostic Laboratory & Secure Report Delivery RLS Policies
-- ==============================================================================

ALTER TABLE laboratory_test_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE laboratory_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE laboratory_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE laboratory_package_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE laboratory_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE laboratory_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE laboratory_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE laboratory_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE laboratory_result_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE laboratory_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE laboratory_report_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE laboratory_report_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE laboratory_audit_logs ENABLE ROW LEVEL SECURITY;

-- Laboratory Test Categories Policies
CREATE POLICY "laboratory_test_categories_select" ON laboratory_test_categories
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = laboratory_test_categories.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "laboratory_test_categories_write" ON laboratory_test_categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = laboratory_test_categories.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN', 'LAB_STAFF', 'LAB_MANAGER')
        AND om.status = 'ACTIVE'
    )
  );

-- Laboratory Tests Policies
CREATE POLICY "laboratory_tests_select" ON laboratory_tests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = laboratory_tests.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "laboratory_tests_write" ON laboratory_tests
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = laboratory_tests.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN', 'LAB_STAFF', 'LAB_MANAGER')
        AND om.status = 'ACTIVE'
    )
  );

-- Laboratory Packages & Package Items Policies
CREATE POLICY "laboratory_packages_select" ON laboratory_packages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = laboratory_packages.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "laboratory_packages_write" ON laboratory_packages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = laboratory_packages.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN', 'LAB_STAFF', 'LAB_MANAGER')
        AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "laboratory_package_items_select" ON laboratory_package_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_packages lp
      JOIN organization_memberships om ON lp.organization_id = om.organization_id
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE lp.id = laboratory_package_items.package_id
        AND up.auth_user_id = auth.uid()
        AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "laboratory_package_items_write" ON laboratory_package_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_packages lp
      JOIN organization_memberships om ON lp.organization_id = om.organization_id
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE lp.id = laboratory_package_items.package_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN', 'LAB_STAFF', 'LAB_MANAGER')
        AND om.status = 'ACTIVE'
    )
  );

-- Laboratory Orders & Items Policies
CREATE POLICY "laboratory_orders_select" ON laboratory_orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = laboratory_orders.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "laboratory_orders_write" ON laboratory_orders
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = laboratory_orders.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'LAB_STAFF', 'LAB_MANAGER')
        AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "laboratory_order_items_select" ON laboratory_order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_orders lo
      JOIN organization_memberships om ON lo.organization_id = om.organization_id
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE lo.id = laboratory_order_items.order_id
        AND up.auth_user_id = auth.uid()
        AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "laboratory_order_items_write" ON laboratory_order_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_orders lo
      JOIN organization_memberships om ON lo.organization_id = om.organization_id
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE lo.id = laboratory_order_items.order_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'LAB_STAFF', 'LAB_MANAGER')
        AND om.status = 'ACTIVE'
    )
  );

-- Laboratory Samples Policies
CREATE POLICY "laboratory_samples_select" ON laboratory_samples
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = laboratory_samples.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "laboratory_samples_write" ON laboratory_samples
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = laboratory_samples.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN', 'LAB_STAFF', 'LAB_MANAGER')
        AND om.status = 'ACTIVE'
    )
  );

-- Laboratory Results & Reviews Policies
CREATE POLICY "laboratory_results_select" ON laboratory_results
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = laboratory_results.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "laboratory_results_write" ON laboratory_results
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = laboratory_results.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN', 'LAB_STAFF', 'LAB_MANAGER', 'LAB_REVIEWER')
        AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "laboratory_result_reviews_select" ON laboratory_result_reviews
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_results lr
      JOIN organization_memberships om ON lr.organization_id = om.organization_id
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE lr.id = laboratory_result_reviews.result_id
        AND up.auth_user_id = auth.uid()
        AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "laboratory_result_reviews_write" ON laboratory_result_reviews
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_results lr
      JOIN organization_memberships om ON lr.organization_id = om.organization_id
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE lr.id = laboratory_result_reviews.result_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN', 'LAB_MANAGER', 'LAB_REVIEWER')
        AND om.status = 'ACTIVE'
    )
  );

-- Laboratory Reports & Access Policies
CREATE POLICY "laboratory_reports_select" ON laboratory_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = laboratory_reports.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "laboratory_reports_write" ON laboratory_reports
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = laboratory_reports.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN', 'LAB_STAFF', 'LAB_MANAGER', 'LAB_REVIEWER')
        AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "laboratory_report_access_tokens_select" ON laboratory_report_access_tokens
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = laboratory_report_access_tokens.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "laboratory_report_access_tokens_write" ON laboratory_report_access_tokens
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = laboratory_report_access_tokens.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN', 'LAB_STAFF', 'LAB_MANAGER')
        AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "laboratory_report_access_logs_select" ON laboratory_report_access_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_reports lr
      JOIN organization_memberships om ON lr.organization_id = om.organization_id
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE lr.id = laboratory_report_access_logs.report_id
        AND up.auth_user_id = auth.uid()
        AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "laboratory_report_access_logs_write" ON laboratory_report_access_logs
  FOR ALL
  USING (true);

-- Laboratory Audit Logs Policies
CREATE POLICY "laboratory_audit_logs_select" ON laboratory_audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = laboratory_audit_logs.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.role IN ('SUPER_ADMIN', 'CLINIC_ADMIN', 'LAB_MANAGER')
        AND om.status = 'ACTIVE'
    )
  );

CREATE POLICY "laboratory_audit_logs_write" ON laboratory_audit_logs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN user_profiles up ON om.user_profile_id = up.id
      WHERE om.organization_id = laboratory_audit_logs.organization_id
        AND up.auth_user_id = auth.uid()
        AND om.status = 'ACTIVE'
    )
  );







