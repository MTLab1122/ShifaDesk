/**
 * ==============================================================================
 * MatabAI (ShifaDesk) - Demonstration / Mock Data Repository
 * ==============================================================================
 * This file provides mock data for future modules (Phase 3: Appointments/Queue,
 * Phase 4: WhatsApp, Phase 5: Lab/Reports).
 * Phase 2 modules (Auth, Organizations, Clinics, User, Audit) use the real API.
 * ==============================================================================
 */

export interface MockDoctor {
  id: string;
  name: string;
  specialty: string;
  qualifications: string;
  roomNumber: string;
  consultationFee: number;
  availableDays: string[];
  status: 'Available' | 'Busy' | 'Off Duty';
}

export interface MockReceptionist {
  id: string;
  name: string;
  email: string;
  phone: string;
  shift: 'Morning' | 'Evening' | 'Night';
  status: 'Active' | 'On Leave';
}

export interface MockPatient {
  id: string;
  mrn: string;
  name: string;
  phone: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  bloodGroup: string;
  lastVisit: string;
}

export interface MockAppointment {
  id: string;
  patientName: string;
  doctorName: string;
  specialty: string;
  date: string;
  timeSlot: string;
  status: 'Confirmed' | 'Pending' | 'Completed' | 'Cancelled';
  tokenNumber: number;
}

export interface MockQueueToken {
  id: string;
  tokenNumber: number;
  patientName: string;
  doctorName: string;
  department: string;
  status: 'Waiting' | 'Called' | 'Completed' | 'Skipped';
  estimatedWaitMinutes: number;
}

export interface MockConversation {
  id: string;
  patientName: string;
  phone: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isAiHandling: boolean;
  messages: Array<{
    id: string;
    sender: 'patient' | 'clinic' | 'ai';
    text: string;
    timestamp: string;
  }>;
}

export interface MockLabTest {
  id: string;
  code: string;
  name: string;
  category: string;
  price: number;
  turnaroundHours: number;
}

export interface MockLabReport {
  id: string;
  orderNumber: string;
  patientName: string;
  testName: string;
  status: 'Pending' | 'Sample Collected' | 'Ready';
  requestedDate: string;
}

export interface MockNotification {
  id: string;
  title: string;
  message: string;
  category: 'appointment' | 'queue' | 'system';
  read: boolean;
  timestamp: string;
}

export const MOCK_DOCTORS: MockDoctor[] = [
  {
    id: 'doc-1',
    name: 'Dr. Muhammad Talha',
    specialty: 'Internal Medicine',
    qualifications: 'MBBS, FCPS',
    roomNumber: 'Room 101',
    consultationFee: 2500,
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    status: 'Available',
  },
  {
    id: 'doc-2',
    name: 'Dr. Ayesha Malik',
    specialty: 'Pediatrics',
    qualifications: 'MBBS, MCPS (Peds)',
    roomNumber: 'Room 104',
    consultationFee: 2000,
    availableDays: ['Mon', 'Wed', 'Fri', 'Sat'],
    status: 'Available',
  },
  {
    id: 'doc-3',
    name: 'Dr. Tariq Khan',
    specialty: 'Cardiology',
    qualifications: 'MBBS, MD Cardiology',
    roomNumber: 'Room 202',
    consultationFee: 3500,
    availableDays: ['Tue', 'Thu', 'Sat'],
    status: 'Busy',
  },
];

export const MOCK_RECEPTIONISTS: MockReceptionist[] = [
  {
    id: 'rec-1',
    name: 'Fatima Zahra',
    email: 'fatima@alshifa.local',
    phone: '03001234567',
    shift: 'Morning',
    status: 'Active',
  },
  {
    id: 'rec-2',
    name: 'Bilal Ahmed',
    email: 'bilal@alshifa.local',
    phone: '03007654321',
    shift: 'Evening',
    status: 'Active',
  },
];

export const MOCK_PATIENTS: MockPatient[] = [
  {
    id: 'pat-1',
    mrn: 'MRN-2026-001',
    name: 'Usman Ali',
    phone: '03211122334',
    age: 34,
    gender: 'Male',
    bloodGroup: 'B+',
    lastVisit: '2026-11-02',
  },
  {
    id: 'pat-2',
    mrn: 'MRN-2026-002',
    name: 'Zainab Bibi',
    phone: '03339988776',
    age: 28,
    gender: 'Female',
    bloodGroup: 'O+',
    lastVisit: '2026-11-05',
  },
  {
    id: 'pat-3',
    mrn: 'MRN-2026-003',
    name: 'Hamza Farooq',
    phone: '03455566778',
    age: 45,
    gender: 'Male',
    bloodGroup: 'A+',
    lastVisit: '2026-11-08',
  },
];

export const MOCK_APPOINTMENTS: MockAppointment[] = [
  {
    id: 'apt-1',
    patientName: 'Usman Ali',
    doctorName: 'Dr. Muhammad Talha',
    specialty: 'Internal Medicine',
    date: '2026-11-09',
    timeSlot: '10:00 AM - 10:20 AM',
    status: 'Confirmed',
    tokenNumber: 1,
  },
  {
    id: 'apt-2',
    patientName: 'Zainab Bibi',
    doctorName: 'Dr. Ayesha Malik',
    specialty: 'Pediatrics',
    date: '2026-11-09',
    timeSlot: '10:30 AM - 10:50 AM',
    status: 'Confirmed',
    tokenNumber: 2,
  },
  {
    id: 'apt-3',
    patientName: 'Hamza Farooq',
    doctorName: 'Dr. Tariq Khan',
    specialty: 'Cardiology',
    date: '2026-11-09',
    timeSlot: '11:00 AM - 11:20 AM',
    status: 'Pending',
    tokenNumber: 3,
  },
];

export const MOCK_QUEUE: MockQueueToken[] = [
  {
    id: 'q-1',
    tokenNumber: 101,
    patientName: 'Usman Ali',
    doctorName: 'Dr. Muhammad Talha',
    department: 'General OPD',
    status: 'Called',
    estimatedWaitMinutes: 0,
  },
  {
    id: 'q-2',
    tokenNumber: 102,
    patientName: 'Zainab Bibi',
    doctorName: 'Dr. Ayesha Malik',
    department: 'Pediatrics',
    status: 'Waiting',
    estimatedWaitMinutes: 15,
  },
  {
    id: 'q-3',
    tokenNumber: 103,
    patientName: 'Hamza Farooq',
    doctorName: 'Dr. Tariq Khan',
    department: 'Cardiology',
    status: 'Waiting',
    estimatedWaitMinutes: 30,
  },
];

export const MOCK_CONVERSATIONS: MockConversation[] = [
  {
    id: 'conv-1',
    patientName: 'Usman Ali',
    phone: '+92 321 1122334',
    lastMessage: 'Ji, kal dopahar 2 baje ka appointment confirm hai?',
    timestamp: '10:14 AM',
    unreadCount: 1,
    isAiHandling: true,
    messages: [
      { id: 'm1', sender: 'patient', text: 'Assalam-o-Alaikum, mujhe Dr. Talha se milna hai.', timestamp: '10:10 AM' },
      { id: 'm2', sender: 'ai', text: 'Wa Alaikum Assalam! Dr. Talha kal subah 10 baje aur dopahar 2 baje dastiyab hain. Konsa waqt munasib rahega?', timestamp: '10:11 AM' },
      { id: 'm3', sender: 'patient', text: 'Ji, kal dopahar 2 baje ka appointment confirm hai?', timestamp: '10:14 AM' },
    ],
  },
  {
    id: 'conv-2',
    patientName: 'Khurram Shahzad',
    phone: '+92 300 4455667',
    lastMessage: 'Shukriya, main time par pohnch jaun ga.',
    timestamp: 'Yesterday',
    unreadCount: 0,
    isAiHandling: false,
    messages: [
      { id: 'm4', sender: 'clinic', text: 'Aapka token #14 Dr. Ayesha ke liye book ho chuka hai.', timestamp: 'Yesterday' },
      { id: 'm5', sender: 'patient', text: 'Shukriya, main time par pohnch jaun ga.', timestamp: 'Yesterday' },
    ],
  },
];

export const MOCK_LAB_TESTS: MockLabTest[] = [
  { id: 'lab-1', code: 'CBC', name: 'Complete Blood Count', category: 'Hematology', price: 950, turnaroundHours: 4 },
  { id: 'lab-2', code: 'LFT', name: 'Liver Function Test', category: 'Biochemistry', price: 2200, turnaroundHours: 6 },
  { id: 'lab-3', code: 'LIPID', name: 'Lipid Profile', category: 'Biochemistry', price: 1800, turnaroundHours: 6 },
  { id: 'lab-4', code: 'HBA1C', name: 'HbA1c Glycated Hemoglobin', category: 'Endocrinology', price: 1500, turnaroundHours: 4 },
];

export const MOCK_LAB_REPORTS: MockLabReport[] = [
  { id: 'rep-1', orderNumber: 'ORD-9821', patientName: 'Usman Ali', testName: 'Complete Blood Count', status: 'Ready', requestedDate: '2026-11-08' },
  { id: 'rep-2', orderNumber: 'ORD-9822', patientName: 'Zainab Bibi', testName: 'Lipid Profile', status: 'Sample Collected', requestedDate: '2026-11-09' },
  { id: 'rep-3', orderNumber: 'ORD-9823', patientName: 'Hamza Farooq', testName: 'HbA1c', status: 'Pending', requestedDate: '2026-11-09' },
];

export const MOCK_NOTIFICATIONS: MockNotification[] = [
  { id: 'notif-1', title: 'New Appointment Booked', message: 'Usman Ali booked appointment with Dr. Talha for 10:00 AM.', category: 'appointment', read: false, timestamp: '10 mins ago' },
  { id: 'notif-2', title: 'Token Called', message: 'Token #101 called to Consultation Room 1.', category: 'queue', read: false, timestamp: '25 mins ago' },
  { id: 'notif-3', title: 'Lab Result Ready', message: 'CBC report for Usman Ali is now ready for doctor review.', category: 'system', read: true, timestamp: '1 hour ago' },
];

