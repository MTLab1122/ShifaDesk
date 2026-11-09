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


