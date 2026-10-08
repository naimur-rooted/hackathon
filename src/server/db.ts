import fs from 'fs';
import path from 'path';
import { MongoClient, Db } from 'mongodb';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'STUDENT' | 'ADMIN';
  department: string;
  batch?: string;
  section?: string;
  studentId?: string;
  avatarUrl?: string;
  savedNotices?: string[];
  savedExams?: string[];
  savedResources?: string[];
  rsvps?: string[];
  createdAt: string;
}

export interface Notice {
  id: string;
  title: string;
  description: string;
  category: 'Academic' | 'Examination' | 'Transport' | 'Scholarship' | 'Holiday' | 'General';
  department: string;
  batch?: string;
  section?: string;
  publishedAt: string;
  deadline?: string;
  sourceUrl: string;
  sourceType: 'OFFICIAL_CITY_UNIVERSITY' | 'ADMIN_CURATED' | 'STUDENT_POST';
  verified: boolean;
  priority: 'URGENT' | 'IMPORTANT' | 'NORMAL';
  actionPrompt?: string;
  actionUrl?: string;
  createdBy: string;
  views: number;
}

export interface Exam {
  id: string;
  course: string;
  courseCode: string;
  department: string;
  batch?: string;
  section?: string;
  examType: 'Midterm' | 'Final' | 'Quiz' | 'Viva';
  date: string; // YYYY-MM-DD
  time: string; // e.g. "10:00 AM - 12:00 PM"
  location: string;
  sourceUrl: string;
  verified: boolean;
  notes?: string;
}

export interface EventRegistration {
  id: string;
  ticketCode: string;
  eventId: string;
  userId: string;
  userName: string;
  userEmail: string;
  studentId: string;
  department: string;
  batch?: string;
  section?: string;
  registeredAt: string;
  checkedIn: boolean;
  checkedInAt?: string;
  participationType: 'IN_PERSON' | 'ONLINE';
  notes?: string;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  club: string;
  host: string;
  department?: string;
  batch?: string;
  section?: string;
  date: string; // YYYY-MM-DD
  time: string;
  location: string;
  category: 'Competition' | 'Seminar' | 'Workshop' | 'Cultural' | 'Sports' | 'Career' | 'Meetup' | 'Hackathon';
  eventType?: 'PHYSICAL' | 'ONLINE' | 'HYBRID';
  onlineMeetingUrl?: string;
  sourceUrl: string;
  sourceType: 'OFFICIAL_CITY_UNIVERSITY' | 'CLUB_VERIFIED';
  verified: boolean;
  attendeesCount: number;
  attendees: string[]; // user IDs
  maxCapacity?: number;
  registrationDeadline?: string;
  createdBy: string;
  bannerImage?: string;
}

export interface Club {
  id: string;
  name: string;
  code: string;
  shortDescription: string;
  department: string;
  lead: string;
  email: string;
  membersCount: number;
  officialPage: string;
  logo: string;
}

export interface ResourceItem {
  id: string;
  title: string;
  description: string;
  department: string;
  batch?: string;
  section?: string;
  course: string;
  courseCode: string;
  semester: string;
  category: 'Notes' | 'Past Questions' | 'Lab Manual' | 'Syllabus' | 'Lecture Slides';
  resourceUrl: string;
  fileSize?: string;
  verified: boolean;
  uploadedBy: string;
  uploadedByRole: 'STUDENT' | 'FACULTY' | 'ADMIN';
  downloadCount: number;
  createdAt: string;
}

export interface FAQItem {
  id: string;
  category: 'Registration' | 'Examination' | 'Transport' | 'Academic' | 'Clubs' | 'Facilities' | 'Waiver & Fees';
  question: string;
  answer: string;
  officialSource: string;
  verified: boolean;
}

export interface BusSchedule {
  id: string;
  routeNumber: string;
  routeName: string;
  departurePoint: string;
  destination: string;
  viaPoints: string[];
  morningDepTime: string;
  returnDepTime: string;
  status: 'Normal' | 'Slight Delay' | 'Winter Schedule Active';
  contactPerson: string;
}

export interface LostFoundItem {
  id: string;
  type: 'LOST' | 'FOUND';
  title: string;
  description: string;
  location: string;
  date: string;
  category: 'ID Card' | 'Electronics' | 'Documents' | 'Accessories' | 'Other';
  contactMethod: string;
  contactName: string;
  status: 'OPEN' | 'RESOLVED';
  reportedBy: string;
  createdAt: string;
  imageUrl?: string;
}

export interface DirectoryContact {
  id: string;
  name: string;
  designation: string;
  department: string;
  category: 'FACULTY' | 'ADMIN_OFFICE' | 'HOTLINE';
  email: string;
  phone: string;
  officeLocation: string;
  availableHours?: string;
  avatarUrl?: string;
}

export interface HelpdeskInquiry {
  id: string;
  userId?: string;
  userName: string;
  userEmail: string;
  studentId: string;
  department: string;
  category: string;
  subject: string;
  details: string;
  attachmentUrl?: string;
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED';
  adminReply?: string;
  repliedAt?: string;
  createdAt: string;
}

export interface DatabaseState {
  users: User[];
  notices: Notice[];
  exams: Exam[];
  events: EventItem[];
  eventRegistrations: EventRegistration[];
  clubs: Club[];
  resources: ResourceItem[];
  faqs: FAQItem[];
  busSchedules: BusSchedule[];
  lostFound: LostFoundItem[];
  directory: DirectoryContact[];
  helpdeskInquiries: HelpdeskInquiry[];
}

// Initial seed data with authentic City University information
const initialDatabase: DatabaseState = {
  users: [
    {
      id: 'usr_admin',
      name: 'Registrar Office Admin',
      email: 'sahinfdr89@gmail.com', // REAL VALID GMAIL ADMIN
      passwordHash: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password is "admin123"
      role: 'ADMIN',
      department: 'Central Administration',
      studentId: 'ADMIN-001',
      savedNotices: [],
      savedExams: [],
      savedResources: [],
      rsvps: [],
      createdAt: '2026-09-01T08:00:00Z',
    },
    {
      id: 'usr_student',
      name: 'City University Student',
      email: 'sahincontest@gmail.com', // REAL VALID GMAIL STUDENT
      passwordHash: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password is "password123"
      role: 'STUDENT',
      department: 'Computer Science & Engineering',
      studentId: '213-15-4921',
      savedNotices: ['not_1', 'not_2'],
      savedExams: ['ex_1', 'ex_2'],
      savedResources: ['res_1'],
      rsvps: ['evt_1'],
      createdAt: '2026-09-15T09:30:00Z',
    },
    {
      id: 'usr_admin_alias',
      name: 'Registrar Office Admin',
      email: 'admin@cityuniversity.ac.bd',
      passwordHash: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
      role: 'ADMIN',
      department: 'Central Administration',
      studentId: 'ADMIN-002',
      savedNotices: [],
      savedExams: [],
      savedResources: [],
      rsvps: [],
      createdAt: '2026-09-01T08:00:00Z',
    },
    {
      id: 'usr_student_alias',
      name: 'City University Student',
      email: 'student@cityuniversity.ac.bd',
      passwordHash: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
      role: 'STUDENT',
      department: 'Computer Science & Engineering',
      studentId: '213-15-4922',
      savedNotices: ['not_1'],
      savedExams: ['ex_1'],
      savedResources: ['res_1'],
      rsvps: [],
      createdAt: '2026-09-15T09:30:00Z',
    },
  ],
  notices: [
    {
      id: 'not_1',
      title: 'Fall 2026 Trimester Course Registration & Advising Schedule',
      description: 'All undergraduate and graduate students are notified that Fall 2026 Trimester course advising and registration will commence via the online student portal from October 10 to October 18, 2026. Late registration with a fine of BDT 500 will apply from October 19. Classes officially start on October 22, 2026 at the Permanent Campus (Khagan, Birulia, Ashulia). Students must clear at least 40% of their 1st installment tuition dues prior to course selection.',
      category: 'Academic',
      department: 'All Departments',
      batch: 'All Batches',
      section: 'All Sections',
      publishedAt: '2026-10-01',
      deadline: '2026-10-18',
      sourceUrl: 'https://cityuniversity.ac.bd/notices/fall-2026-registration',
      sourceType: 'OFFICIAL_CITY_UNIVERSITY',
      verified: true,
      priority: 'URGENT',
      actionPrompt: 'Complete course advising on portal before deadline',
      actionUrl: 'https://cityuniversity.ac.bd/student-portal',
      createdBy: 'Registrar Office',
      views: 1420,
    },
    {
      id: 'not_2',
      title: 'City University Merit Scholarship & Waiver Applications for Fall 2026',
      description: 'Applications are invited from students who scored SGPA 3.80 or above in the previous trimester for 20% to 100% tuition fee waiver. Freedom fighter quota, sibling waiver, and remote area concession forms must be submitted to the Accounts and Registrar office with all verified academic transcripts before October 25, 2026.',
      category: 'Scholarship',
      department: 'All Departments',
      batch: 'All Batches',
      section: 'All Sections',
      publishedAt: '2026-09-28',
      deadline: '2026-10-25',
      sourceUrl: 'https://cityuniversity.ac.bd/notice/scholarship-fall2026',
      sourceType: 'OFFICIAL_CITY_UNIVERSITY',
      verified: true,
      priority: 'IMPORTANT',
      actionPrompt: 'Submit prescribed waiver form with grade sheet to Khagan Campus',
      actionUrl: 'https://cityuniversity.ac.bd/waiver-form',
      createdBy: 'Registrar Office',
      views: 980,
    },
    {
      id: 'not_3',
      title: 'CSE Batch 65 Summer 2026 Trimester Final Examination Routine & Admit Card',
      description: 'The Controller of Examinations announces that the Summer 2026 Trimester Final Examinations for CSE 65th Batch (Section A & B) will take place between October 10 and October 18, 2026 at Academic Buildings 1 & 2 of the Permanent Campus. Admit cards must be downloaded and printed from the student portal. Entry to the examination hall without a printed admit card and City University student ID card is strictly prohibited.',
      category: 'Examination',
      department: 'Computer Science & Engineering',
      batch: '65',
      section: 'B',
      publishedAt: '2026-09-26',
      deadline: '2026-10-10',
      sourceUrl: 'https://cityuniversity.ac.bd/exams/summer-2026-final-routine',
      sourceType: 'OFFICIAL_CITY_UNIVERSITY',
      verified: true,
      priority: 'URGENT',
      actionPrompt: 'Print your Final Exam Admit Card before October 10',
      actionUrl: 'https://cityuniversity.ac.bd/student-portal/admit-card',
      createdBy: 'Controller of Examinations',
      views: 2650,
    },
    {
      id: 'not_4',
      title: 'Permanent Campus Shuttle Bus Schedule Update for Winter Session',
      description: 'Due to morning road traffic on Dhaka-Aricha and Mirpur-Birulia highways, all university shuttle buses departing from Mirpur-10, Uttara House Building, and Savar will leave 15 minutes earlier starting Sunday. Evening return buses will depart Khagan Campus at 04:30 PM and 05:45 PM.',
      category: 'Transport',
      department: 'All Departments',
      batch: 'All Batches',
      section: 'All Sections',
      publishedAt: '2026-10-04',
      deadline: '2026-10-08',
      sourceUrl: 'https://cityuniversity.ac.bd/transport/shuttle-schedule-2026',
      sourceType: 'OFFICIAL_CITY_UNIVERSITY',
      verified: true,
      priority: 'NORMAL',
      actionPrompt: 'Check revised route timings in CampusOS Transport section',
      createdBy: 'Transport Committee',
      views: 740,
    },
    {
      id: 'not_5',
      title: 'Central Library Book Return & Digital Repository Access Renewal',
      description: 'Students who borrowed physical books during the Summer trimester must return or renew them at the Central Library (3rd Floor, Academic Building 1) by October 15. The City University IEEE Xplore and Research4Life remote digital credentials will be renewed for the next academic year.',
      category: 'Academic',
      department: 'All Departments',
      batch: 'All Batches',
      section: 'All Sections',
      publishedAt: '2026-10-02',
      deadline: '2026-10-15',
      sourceUrl: 'https://cityuniversity.ac.bd/library/notice-oct2026',
      sourceType: 'OFFICIAL_CITY_UNIVERSITY',
      verified: true,
      priority: 'NORMAL',
      actionPrompt: 'Renew borrowed books to prevent overdue fine of 5 BDT/day',
      createdBy: 'Central Library Office',
      views: 520,
    },
  ],
  exams: [
    {
      id: 'ex_1',
      course: 'Database Management Systems',
      courseCode: 'CSE 311',
      department: 'Computer Science & Engineering',
      batch: '65',
      section: 'B',
      examType: 'Final',
      date: '2026-10-11',
      time: '10:00 AM - 12:00 PM',
      location: 'Academic Bldg 1, Room 304, Khagan Campus',
      sourceUrl: 'https://cityuniversity.ac.bd/exams/summer-2026-final-routine',
      verified: true,
      notes: 'Bring scientific calculator. ER-diagram stencils allowed.',
    },
    {
      id: 'ex_2',
      course: 'Algorithms & Complexity Analysis',
      courseCode: 'CSE 221',
      department: 'Computer Science & Engineering',
      batch: '65',
      section: 'B',
      examType: 'Final',
      date: '2026-10-13',
      time: '02:00 PM - 04:00 PM',
      location: 'Academic Bldg 1, Room 402, Khagan Campus',
      sourceUrl: 'https://cityuniversity.ac.bd/exams/summer-2026-final-routine',
      verified: true,
      notes: 'Sections A & B combined in Hall 402.',
    },
    {
      id: 'ex_3',
      course: 'Microprocessors & Embedded Systems',
      courseCode: 'EEE 321',
      department: 'Electrical & Electronic Engineering',
      batch: '64',
      section: 'A',
      examType: 'Final',
      date: '2026-10-12',
      time: '10:00 AM - 12:00 PM',
      location: 'Academic Bldg 2, Room 205, Khagan Campus',
      sourceUrl: 'https://cityuniversity.ac.bd/exams/summer-2026-final-routine',
      verified: true,
      notes: '8086 Assembly opcode sheets will be provided.',
    },
    {
      id: 'ex_4',
      course: 'Financial Accounting & Cost Analysis',
      courseCode: 'ACT 101',
      department: 'Business Administration',
      batch: '63',
      section: 'A',
      examType: 'Final',
      date: '2026-10-14',
      time: '10:00 AM - 12:00 PM',
      location: 'Academic Bldg 2, Room 102, Khagan Campus',
      sourceUrl: 'https://cityuniversity.ac.bd/exams/summer-2026-final-routine',
      verified: true,
      notes: 'Financial ledger sheets distributed by invigilator.',
    },
    {
      id: 'ex_5',
      course: 'Design of Concrete Structures I',
      courseCode: 'CE 315',
      department: 'Civil Engineering',
      batch: '62',
      section: 'A',
      examType: 'Final',
      date: '2026-10-16',
      time: '02:00 PM - 04:00 PM',
      location: 'Civil Annex Building, Room 101',
      sourceUrl: 'https://cityuniversity.ac.bd/exams/summer-2026-final-routine',
      verified: true,
      notes: 'BNBC 2020 handbook charts permitted.',
    },
    {
      id: 'ex_6',
      course: 'Object Oriented Programming (Java)',
      courseCode: 'CSE 133',
      department: 'Computer Science & Engineering',
      batch: '65',
      section: 'A',
      examType: 'Midterm',
      date: '2026-10-15',
      time: '11:30 AM - 01:00 PM',
      location: 'Software Lab 3, Khagan Campus',
      sourceUrl: 'https://cityuniversity.ac.bd/exams/midterm-schedule',
      verified: true,
      notes: 'Lab test + written logic examination.',
    },
  ],
  events: [
    {
      id: 'evt_1',
      title: 'City University Intra-University Programming Contest (CU-IUPC 2026)',
      description: 'Annual premier 5-hour competitive programming championship organized by CPCCU. Teams of 3 will tackle challenging algorithmic problems under ICPC rules. Top 5 teams will represent City University in the National ICPC Preliminary. Trophies, medals, and crests for winners.',
      club: 'CPCCU (Competitive Programming Community of City University)',
      host: 'Dept of CSE & CPCCU',
      department: 'Computer Science & Engineering',
      batch: '65',
      section: 'B',
      date: '2026-10-24',
      time: '09:00 AM - 04:30 PM',
      location: 'Computer Labs 1 & 2, Academic Bldg 1, Khagan Campus',
      category: 'Competition',
      eventType: 'PHYSICAL',
      sourceUrl: 'https://cityuniversity.ac.bd/clubs/cpccu/iupc2026',
      sourceType: 'OFFICIAL_CITY_UNIVERSITY',
      verified: true,
      attendeesCount: 1,
      attendees: ['usr_student'],
      maxCapacity: 120,
      registrationDeadline: '2026-10-22',
      createdBy: 'CPCCU Executive Committee',
      bannerImage: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 'evt_2',
      title: 'RoboCarnival 2026: Autonomous Line Follower & Robo-Soccer Battle',
      description: 'The City University Robotics Club (CURC) invites tech enthusiasts to showcase their autonomous robots. Segments include 16mm Line Follower Robot (LFR) speed sprint, Obstacle Avoider, and 3v3 Robo-Soccer battle. Free beginner workshop on ESP32 & motor drivers before the main arena kicks off.',
      club: 'City University Robotics Club (CURC)',
      host: 'CURC & Dept of EEE',
      department: 'Electrical & Electronic Engineering',
      batch: '64',
      section: 'A',
      date: '2026-11-05',
      time: '10:00 AM - 05:00 PM',
      location: 'Central Auditorium & Courtyard, Khagan Campus',
      category: 'Workshop',
      eventType: 'PHYSICAL',
      sourceUrl: 'https://cityuniversity.ac.bd/clubs/robotics/carnival',
      sourceType: 'CLUB_VERIFIED',
      verified: true,
      attendeesCount: 0,
      attendees: [],
      maxCapacity: 200,
      registrationDeadline: '2026-11-03',
      createdBy: 'CURC President',
      bannerImage: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 'evt_3',
      title: 'Generative AI & LLM Systems: Hands-on Masterclass (Online Webinar)',
      description: 'Special online workshop on building full-stack AI agents with Gemini, vector databases, and multi-modal models. Live coding demonstration, architecture walkthrough, and Q&A session with industry software engineers. Certificate of completion provided for all verified attendees.',
      club: 'CPCCU (Competitive Programming Community of City University)',
      host: 'Dept of CSE & Google Developer Student Leads',
      department: 'Computer Science & Engineering',
      batch: 'All Batches',
      section: 'All Sections',
      date: '2026-10-18',
      time: '07:30 PM - 09:30 PM',
      location: 'Online Live Stream (Google Meet / Zoom)',
      category: 'Workshop',
      eventType: 'ONLINE',
      onlineMeetingUrl: 'https://meet.google.com/cu-cse-ai-masterclass',
      sourceUrl: 'https://cityuniversity.ac.bd/events/genai-masterclass',
      sourceType: 'OFFICIAL_CITY_UNIVERSITY',
      verified: true,
      attendeesCount: 1,
      attendees: ['usr_student'],
      maxCapacity: 300,
      registrationDeadline: '2026-10-18',
      createdBy: 'Dept of CSE',
      bannerImage: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 'evt_4',
      title: 'Career Conclave 2026: Tech Industry Connect & On-Campus Resume Clinic',
      description: 'Bridging the transition from classroom to industry. High-profile speakers from leading software companies, telecommunication giants, and banks in Dhaka will conduct masterclasses on modern engineering stacks, technical interviews, and resume structuring. On-site internship submissions accepted.',
      club: 'City University Career & Placement Cell',
      host: 'Office of Student Affairs',
      department: 'All Departments',
      batch: 'All Batches',
      section: 'All Sections',
      date: '2026-10-28',
      time: '11:00 AM - 03:00 PM',
      location: 'Main Auditorium, Khagan Campus',
      category: 'Career',
      eventType: 'HYBRID',
      onlineMeetingUrl: 'https://meet.google.com/city-career-conclave',
      sourceUrl: 'https://cityuniversity.ac.bd/events/career-conclave',
      sourceType: 'OFFICIAL_CITY_UNIVERSITY',
      verified: true,
      attendeesCount: 0,
      attendees: [],
      maxCapacity: 250,
      registrationDeadline: '2026-10-27',
      createdBy: 'Career Placement Cell',
      bannerImage: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 'evt_5',
      title: 'Inter-Department Cricket Championship: Trimester Cup 2026',
      description: '16 teams representing CSE, EEE, BBA, Civil, English, Law, Pharmacy, and Textile Engineering will clash in the annual T10 tournament. Opening match will feature CSE Challengers vs EEE Titans on the sprawling central green field.',
      club: 'City University Sports Club (CUSC)',
      host: 'CUSC & Physical Education Dept',
      department: 'All Departments',
      batch: 'All Batches',
      section: 'All Sections',
      date: '2026-11-12',
      time: '08:30 AM - 05:00 PM',
      location: 'Central University Playground, Khagan Permanent Campus',
      category: 'Sports',
      eventType: 'PHYSICAL',
      sourceUrl: 'https://cityuniversity.ac.bd/sports/cricket2026',
      sourceType: 'CLUB_VERIFIED',
      verified: true,
      attendeesCount: 0,
      attendees: [],
      maxCapacity: 500,
      createdBy: 'Sports Club Secretary',
      bannerImage: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 'evt_6',
      title: 'City University National Parliamentary Debate Championship 2026',
      description: '32 premier university debating teams across Bangladesh will compete over 3 days in British Parliamentary & Bangla Asian Parliamentary formats. Adjudicated by national champions.',
      club: 'City University Debating Club (CUDC)',
      host: 'CUDC & Dept of Law',
      department: 'Department of Law & English',
      batch: 'All Batches',
      section: 'All Sections',
      date: '2026-11-20',
      time: '09:00 AM - 06:00 PM',
      location: 'Moot Court Hall & Conference Rooms, Permanent Campus',
      category: 'Competition',
      eventType: 'PHYSICAL',
      sourceUrl: 'https://cityuniversity.ac.bd/clubs/cudc/nationals',
      sourceType: 'CLUB_VERIFIED',
      verified: true,
      attendeesCount: 0,
      attendees: [],
      maxCapacity: 200,
      createdBy: 'CUDC President',
      bannerImage: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80',
    },
  ],
  eventRegistrations: [
    {
      id: 'reg_1',
      ticketCode: 'CU-EVT-IUPC-9281',
      eventId: 'evt_1',
      userId: 'usr_student',
      userName: 'City University Student',
      userEmail: 'sahincontest@gmail.com',
      studentId: '213-15-4921',
      department: 'Computer Science & Engineering',
      batch: '65',
      section: 'B',
      registeredAt: '2026-10-02T10:30:00Z',
      checkedIn: false,
      participationType: 'IN_PERSON',
      notes: 'Team Lead: CodeCrusaders',
    },
    {
      id: 'reg_2',
      ticketCode: 'CU-EVT-GENAI-1044',
      eventId: 'evt_3',
      userId: 'usr_student',
      userName: 'City University Student',
      userEmail: 'sahincontest@gmail.com',
      studentId: '213-15-4921',
      department: 'Computer Science & Engineering',
      batch: '65',
      section: 'B',
      registeredAt: '2026-10-04T14:15:00Z',
      checkedIn: true,
      checkedInAt: '2026-10-08T02:30:00Z',
      participationType: 'ONLINE',
      notes: 'Online participant',
    },
  ],
  clubs: [
    {
      id: 'clb_1',
      name: 'CPCCU — Competitive Programming Community of City University',
      code: 'CPCCU',
      shortDescription: 'The premier coding community cultivating problem solving, algorithm design, data structures, and ICPC contest preparation.',
      department: 'Computer Science & Engineering',
      lead: 'Md. Ashraful Islam (Convener)',
      email: 'cpccu@cityuniversity.ac.bd',
      membersCount: 380,
      officialPage: 'https://cityuniversity.ac.bd/clubs/cpccu',
      logo: 'code',
    },
    {
      id: 'clb_2',
      name: 'City University Robotics Club (CURC)',
      code: 'CURC',
      shortDescription: 'Dedicated to hardware prototyping, IoT, microcontrollers, embedded systems, drone research, and competitive robotics battles.',
      department: 'Electrical & Electronic Engineering',
      lead: 'Engr. Shahadat Hossain (Advisor)',
      email: 'robotics@cityuniversity.ac.bd',
      membersCount: 290,
      officialPage: 'https://cityuniversity.ac.bd/clubs/curc',
      logo: 'bot',
    },
    {
      id: 'clb_3',
      name: 'City University Cultural Club (CUCC)',
      code: 'CUCC',
      shortDescription: 'Fostering music, drama, poetry recitation, dance, and cultural celebrations including Pahela Baishakh and National Day observances.',
      department: 'All Departments',
      lead: 'Nafisa Tabassum',
      email: 'cultural@cityuniversity.ac.bd',
      membersCount: 410,
      officialPage: 'https://cityuniversity.ac.bd/clubs/cucc',
      logo: 'music',
    },
    {
      id: 'clb_4',
      name: 'City University Debating Club (CUDC)',
      code: 'CUDC',
      shortDescription: 'Practicing Parliamentary, Asian Parliamentary, and Bangla traditional debate formats to hone logic, rhetoric, and public speaking.',
      department: 'Department of Law & English',
      lead: 'Barrister Farhan Kabir',
      email: 'debate@cityuniversity.ac.bd',
      membersCount: 220,
      officialPage: 'https://cityuniversity.ac.bd/clubs/cudc',
      logo: 'mic',
    },
    {
      id: 'clb_5',
      name: 'City University Sports Club (CUSC)',
      code: 'CUSC',
      shortDescription: 'Organizing inter-department football, cricket, table tennis, badminton, and chess leagues across both campuses.',
      department: 'All Departments',
      lead: 'Captain Tareq Rahman',
      email: 'sports@cityuniversity.ac.bd',
      membersCount: 520,
      officialPage: 'https://cityuniversity.ac.bd/clubs/cusc',
      logo: 'trophy',
    },
  ],
  resources: [
    {
      id: 'res_1',
      title: 'CSE 221 Algorithms Comprehensive Lecture Notes & Graph Proofs',
      description: 'Handwritten and typed comprehensive notes covering Divide & Conquer, Greedy Algorithms, Dynamic Programming, and Graph Traversals (BFS, DFS, Dijkstra, Bellman-Ford). Verified by course instructor.',
      department: 'Computer Science & Engineering',
      batch: '65',
      section: 'B',
      course: 'Algorithms & Complexity Analysis',
      courseCode: 'CSE 221',
      semester: '6th Trimester',
      category: 'Notes',
      resourceUrl: 'https://cityuniversity.ac.bd/resources/cse221-algo-notes.pdf',
      fileSize: '4.8 MB PDF',
      verified: true,
      uploadedBy: 'Tanvir Ahmed (CR, 65th Batch)',
      uploadedByRole: 'STUDENT',
      downloadCount: 342,
      createdAt: '2026-09-12',
    },
    {
      id: 'res_2',
      title: 'CSE 311 Database Management Systems Final Question Bank (2022-2025)',
      description: 'Curated compilation of past 6 trimesters final examination question papers with solved queries for Relational Algebra, SQL subqueries, Normalization (1NF to BCNF), and Concurrency Control transactions.',
      department: 'Computer Science & Engineering',
      batch: '65',
      section: 'B',
      course: 'Database Management Systems',
      courseCode: 'CSE 311',
      semester: '7th Trimester',
      category: 'Past Questions',
      resourceUrl: 'https://cityuniversity.ac.bd/resources/cse311-question-bank.pdf',
      fileSize: '8.2 MB PDF',
      verified: true,
      uploadedBy: 'Academic Admin (CSE Dept)',
      uploadedByRole: 'ADMIN',
      downloadCount: 512,
      createdAt: '2026-09-18',
    },
    {
      id: 'res_3',
      title: 'EEE 211 Analog Electronics I Lab Manual & Proteus Simulation Files',
      description: 'Official department lab manual detailing Diode characteristics, BJT amplifier biasing, and Operational Amplifier inverting/non-inverting circuits with circuit schematics.',
      department: 'Electrical & Electronic Engineering',
      batch: '64',
      section: 'A',
      course: 'Analog Electronics I',
      courseCode: 'EEE 211',
      semester: '4th Trimester',
      category: 'Lab Manual',
      resourceUrl: 'https://cityuniversity.ac.bd/resources/eee211-lab-manual.pdf',
      fileSize: '3.1 MB PDF',
      verified: true,
      uploadedBy: 'EEE Faculty Member',
      uploadedByRole: 'FACULTY',
      downloadCount: 204,
      createdAt: '2026-08-30',
    },
    {
      id: 'res_4',
      title: 'ACT 101 Financial Accounting Quick Formula Sheet & Balance Sheet Templates',
      description: 'Concise 6-page summary for BBA undergraduates: Debit/Credit Golden Rules, Journalizing, Trial Balance adjusting entries, and Cash Flow statement templates.',
      department: 'Business Administration',
      batch: '63',
      section: 'A',
      course: 'Principles of Accounting',
      courseCode: 'ACT 101',
      semester: '1st Trimester',
      category: 'Notes',
      resourceUrl: 'https://cityuniversity.ac.bd/resources/act101-formula-sheet.pdf',
      fileSize: '1.4 MB PDF',
      verified: true,
      uploadedBy: 'BBA Society Coordinator',
      uploadedByRole: 'STUDENT',
      downloadCount: 289,
      createdAt: '2026-09-05',
    },
    {
      id: 'res_5',
      title: 'CE 315 Design of Concrete Structures Course Syllabus & ACI Codes Excerpt',
      description: 'Complete breakdown of course learning outcomes, beam flexure design criteria, column interaction diagrams, and official reference textbook list.',
      department: 'Civil Engineering',
      batch: '62',
      section: 'A',
      course: 'Design of Concrete Structures I',
      courseCode: 'CE 315',
      semester: '8th Trimester',
      category: 'Syllabus',
      resourceUrl: 'https://cityuniversity.ac.bd/resources/ce315-syllabus.pdf',
      fileSize: '1.9 MB PDF',
      verified: true,
      uploadedBy: 'Dept of Civil Engineering',
      uploadedByRole: 'ADMIN',
      downloadCount: 167,
      createdAt: '2026-09-02',
    },
  ],
  faqs: [
    {
      id: 'faq_1',
      category: 'Registration',
      question: 'How can I complete course registration for the upcoming trimester?',
      answer: 'Course registration is performed through the City University student portal (cityuniversity.ac.bd/student-portal). Log in with your Student ID and password, navigate to "Course Advising", select your approved batch courses according to your advisor guidance, and click Submit. Make sure at least 40% of the 1st installment tuition fee is cleared with the accounts office before the deadline to prevent advising holds.',
      officialSource: 'City University Academic Regulations Section 3.2',
      verified: true,
    },
    {
      id: 'faq_2',
      category: 'Examination',
      question: 'What is the policy for collecting exam admit cards and dealing with clashes?',
      answer: 'Admit cards are generated 7 days before examination commencement on the portal. You must clear all prior trimester tuition dues and have at least 75% class attendance. If you encounter a routine clash (two exams scheduled at the same time), immediately submit the Exam Clash Form to the Controller of Examinations office at Khagan Campus at least 3 days before exam week.',
      officialSource: 'Office of the Controller of Examinations',
      verified: true,
    },
    {
      id: 'faq_3',
      category: 'Transport',
      question: 'Who is eligible to use the university shuttle buses and how do I get a pass?',
      answer: 'All registered City University students can avail the university transport service across designated routes (Savar, Mirpur-10, Uttara, Gabtoli). A transport fee is charged per trimester, or you may show your valid student ID card with current trimester sticker. Digital transport schedules and live route updates are accessible here on CampusOS.',
      officialSource: 'City University Transport Committee Guidelines',
      verified: true,
    },
    {
      id: 'faq_4',
      category: 'Waiver & Fees',
      question: 'What are the criteria for Merit Waiver and Financial Assistance?',
      answer: 'Students maintaining a minimum SGPA of 3.80 in a regular trimester with a minimum course load of 9 credits receive a 20% to 100% tuition fee waiver. Special quotas also exist for children of Freedom Fighters (100% waiver as per UGC guidelines), siblings studying concurrently (20% waiver each), and female students in engineering programs.',
      officialSource: 'City University Scholarship & Waiver Policy',
      verified: true,
    },
    {
      id: 'faq_5',
      category: 'Clubs',
      question: 'How do I join CPCCU or the Robotics Club?',
      answer: 'Club recruitment drives take place during the first two weeks of each trimester at the central cafeteria and club booths in Academic Building 1. You can also join digitally via CampusOS Clubs section or attend weekly open mentoring sessions organized by CPCCU every Wednesday at 03:30 PM.',
      officialSource: 'Office of Student Affairs',
      verified: true,
    },
    {
      id: 'faq_6',
      category: 'Facilities',
      question: 'Where are the Medical Center and Proctor Office located at Permanent Campus?',
      answer: 'The University Medical Center is located on the Ground Floor of Academic Building 1 (East Wing), offering free first-aid, doctor consultation, and emergency ambulance dispatch. The Proctor Office is on the 2nd Floor of the Administrative Wing.',
      officialSource: 'City University Campus Administration Guide',
      verified: true,
    },
  ],
  busSchedules: [
    {
      id: 'bus_1',
      routeNumber: 'Route 1',
      routeName: 'Mirpur Express',
      departurePoint: 'Mirpur-10 Roundabout (Near Fire Service)',
      destination: 'Permanent Campus (Khagan, Ashulia)',
      viaPoints: ['Mirpur-1', 'Zoo Road', 'Beribadh', 'Birulia Bridge', 'Khagan Bazar'],
      morningDepTime: '07:15 AM & 08:00 AM',
      returnDepTime: '04:30 PM & 05:45 PM',
      status: 'Winter Schedule Active',
      contactPerson: 'Md. Rafiq (Supervisor) - 01711-XXXXXX',
    },
    {
      id: 'bus_2',
      routeNumber: 'Route 2',
      routeName: 'Uttara Shuttle',
      departurePoint: 'Uttara Azampur / House Building',
      destination: 'Permanent Campus (Khagan, Ashulia)',
      viaPoints: ['Abdullahpur', 'Kamarpara', 'Dhour Beribadh', 'Ashulia Model Town', 'Khagan'],
      morningDepTime: '07:10 AM & 07:50 AM',
      returnDepTime: '04:30 PM & 05:45 PM',
      status: 'Normal',
      contactPerson: 'Kabir Mia (Supervisor) - 01822-XXXXXX',
    },
    {
      id: 'bus_3',
      routeNumber: 'Route 3',
      routeName: 'Savar Local Feeder',
      departurePoint: 'Savar Bus Stand (Overbridge)',
      destination: 'Permanent Campus (Khagan, Ashulia)',
      viaPoints: ['Thana Stand', 'Radio Colony', 'Ashulia Mor', 'Khagan City University Gate'],
      morningDepTime: '07:30 AM, 08:30 AM, 09:30 AM (Trips every 45 mins)',
      returnDepTime: '01:30 PM, 03:30 PM, 05:00 PM',
      status: 'Normal',
      contactPerson: 'Sattar Driver - 01913-XXXXXX',
    },
    {
      id: 'bus_4',
      routeNumber: 'Route 4',
      routeName: 'Gabtoli / Technical Express',
      departurePoint: 'Gabtoli Technical Mor',
      destination: 'Permanent Campus (Khagan, Ashulia)',
      viaPoints: ['Mazar Road', 'Aminbazar', 'Birulia Road', 'Khagan Campus'],
      morningDepTime: '07:20 AM',
      returnDepTime: '04:30 PM',
      status: 'Winter Schedule Active',
      contactPerson: 'Alamgir Hossain - 01678-XXXXXX',
    },
  ],
  lostFound: [
    {
      id: 'lf_1',
      type: 'FOUND',
      title: 'City University Student ID Card (CSE 22nd Batch)',
      description: 'Found a plastic laminate student ID card near Central Cafeteria Table 4. Name: Farzana Haque, ID starts with 221-15-... Deposited at the Security Helpdesk.',
      location: 'Central Cafeteria, Permanent Campus',
      date: '2026-10-06',
      category: 'ID Card',
      contactMethod: 'Visit Security Desk, Main Gate or call Proctor Office',
      contactName: 'Cafeteria Staff Monir',
      status: 'OPEN',
      reportedBy: 'usr_student',
      createdAt: '2026-10-06T11:00:00Z',
    },
    {
      id: 'lf_2',
      type: 'LOST',
      title: 'Blue Casio fx-991EX Calculator with Name Tag',
      description: 'Left inside Academic Building 1, Room 304 after CSE 311 review class on Monday afternoon. Has a black sticker on the back cover.',
      location: 'Academic Bldg 1, Room 304',
      date: '2026-10-05',
      category: 'Electronics',
      contactMethod: 'Phone / WhatsApp: 01700-112233',
      contactName: 'Tanvir (CSE 21st Batch)',
      status: 'OPEN',
      reportedBy: 'usr_student',
      createdAt: '2026-10-05T15:30:00Z',
    },
  ],
  directory: [
    {
      id: 'dir_1',
      name: 'Prof. Dr. Md. Shahjahan',
      designation: 'Vice Chancellor & Senior Professor',
      department: 'Central Administration',
      category: 'ADMIN_OFFICE',
      email: 'vc@cityuniversity.ac.bd',
      phone: '+880 1711-100001',
      officeLocation: 'Administrative Building, Level 3, Executive Suite',
      availableHours: '11:00 AM - 01:00 PM (By Appointment)',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'dir_2',
      name: 'Md. Shahjahan Ali',
      designation: 'Registrar',
      department: 'Central Administration',
      category: 'ADMIN_OFFICE',
      email: 'registrar@cityuniversity.ac.bd',
      phone: '+880 1711-234567',
      officeLocation: 'Administrative Building, Level 2, Room 201',
      availableHours: '09:00 AM - 05:00 PM (Sat-Wed)',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'dir_3',
      name: 'Dr. Kazi Mahfuzur Rahman',
      designation: 'Proctor & Associate Professor',
      department: 'Central Administration',
      category: 'ADMIN_OFFICE',
      email: 'proctor@cityuniversity.ac.bd',
      phone: '+880 1711-987654',
      officeLocation: 'Academic Building 1, Room 108',
      availableHours: '24/7 Security & Discipline Wing',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'dir_4',
      name: 'Prof. Dr. A. K. M. Zaidi',
      designation: 'Professor & Head of Department',
      department: 'Computer Science & Engineering',
      category: 'FACULTY',
      email: 'head.cse@cityuniversity.ac.bd',
      phone: '+880 1912-345678',
      officeLocation: 'Academic Building 1, 3rd Floor, Room 301',
      availableHours: '10:00 AM - 01:00 PM (Sun, Tue, Wed)',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'dir_5',
      name: 'Md. Rezaul Karim',
      designation: 'Assistant Professor & Coordinator',
      department: 'Computer Science & Engineering',
      category: 'FACULTY',
      email: 'rezaul.cse@cityuniversity.ac.bd',
      phone: '+880 1712-456789',
      officeLocation: 'Academic Building 1, Room 305',
      availableHours: '09:30 AM - 03:30 PM (Sat-Wed)',
      avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'dir_6',
      name: 'Farhana Rahman',
      designation: 'Senior Lecturer & Batch 65 Advisor',
      department: 'Computer Science & Engineering',
      category: 'FACULTY',
      email: 'farhana.cse@cityuniversity.ac.bd',
      phone: '+880 1813-789012',
      officeLocation: 'Faculty Lounge 2, Room 308',
      availableHours: '11:00 AM - 02:00 PM (Mon-Thu)',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'dir_7',
      name: 'Dr. Engr. Mohammad Tariqul Islam',
      designation: 'Professor & Head of Department',
      department: 'Electrical & Electronic Engineering',
      category: 'FACULTY',
      email: 'head.eee@cityuniversity.ac.bd',
      phone: '+880 1714-556677',
      officeLocation: 'Academic Building 2, Room 201',
      availableHours: '10:00 AM - 01:00 PM (Sat, Mon, Wed)',
      avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'dir_8',
      name: 'Prof. Dr. Nazmul Ahsan',
      designation: 'Dean & Head of Department',
      department: 'Business Administration',
      category: 'FACULTY',
      email: 'head.bba@cityuniversity.ac.bd',
      phone: '+880 1815-667788',
      officeLocation: 'Academic Building 2, Room 101',
      availableHours: '10:30 AM - 02:30 PM (Sun-Thu)',
      avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'dir_9',
      name: 'Engr. Md. Mahmudur Rahman',
      designation: 'Associate Professor & Head',
      department: 'Civil Engineering',
      category: 'FACULTY',
      email: 'head.ce@cityuniversity.ac.bd',
      phone: '+880 1916-778899',
      officeLocation: 'Civil Annex Building, Room 105',
      availableHours: '09:00 AM - 01:00 PM (Sat-Wed)',
      avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'dir_10',
      name: 'Dr. Syeda Salma Khatun',
      designation: 'Associate Professor & Head',
      department: 'Department of English',
      category: 'FACULTY',
      email: 'head.english@cityuniversity.ac.bd',
      phone: '+880 1717-889900',
      officeLocation: 'Arts Building, Room 204',
      availableHours: '10:00 AM - 02:00 PM (Sun-Wed)',
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'dir_11',
      name: 'Barrister Kazi M. Rahman',
      designation: 'Head of Department',
      department: 'Department of Law',
      category: 'FACULTY',
      email: 'head.law@cityuniversity.ac.bd',
      phone: '+880 1818-990011',
      officeLocation: 'Moot Court Building, Room 102',
      availableHours: '11:00 AM - 03:00 PM (Sat, Mon, Wed)',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'dir_12',
      name: 'Dr. Farida Begum',
      designation: 'Professor & Head of Department',
      department: 'Department of Pharmacy',
      category: 'FACULTY',
      email: 'head.pharmacy@cityuniversity.ac.bd',
      phone: '+880 1919-001122',
      officeLocation: 'Pharmacy Lab Complex, Room 301',
      availableHours: '09:30 AM - 01:30 PM (Sun-Thu)',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'dir_13',
      name: 'Engr. Md. Golam Kibria',
      designation: 'Associate Professor & Head',
      department: 'Textile Engineering',
      category: 'FACULTY',
      email: 'head.te@cityuniversity.ac.bd',
      phone: '+880 1720-112233',
      officeLocation: 'Textile Workshop Building, Room 101',
      availableHours: '10:00 AM - 02:00 PM (Sat-Wed)',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'dir_14',
      name: 'Accounts & Tuition Waiver Wing',
      designation: 'Finance & Accounts Helpdesk',
      department: 'Central Administration',
      category: 'ADMIN_OFFICE',
      email: 'accounts@cityuniversity.ac.bd',
      phone: '+880 1819-456789',
      officeLocation: 'Administrative Building, Level 1',
      availableHours: '09:00 AM - 04:30 PM (Installment & Waiver Processing)',
    },
    {
      id: 'dir_15',
      name: 'Central Transport & Shuttle Helpdesk',
      designation: 'Transport Operations Officer',
      department: 'Central Administration',
      category: 'HOTLINE',
      email: 'transport@cityuniversity.ac.bd',
      phone: '+880 1678-112233',
      officeLocation: 'Permanent Campus Main Gate Terminal',
      availableHours: '06:30 AM - 07:00 PM Daily',
    },
  ],
  helpdeskInquiries: [
    {
      id: 'inq_1',
      userId: 'usr_student',
      userName: 'City University Student',
      userEmail: 'sahincontest@gmail.com',
      studentId: '213-15-4921',
      department: 'Computer Science & Engineering',
      category: 'Registration & Portal',
      subject: 'Unable to enroll in CSE 311 Section B on the portal',
      details: 'Whenever I select CSE 311 Section B, the student portal says class quota is full. However, our batch CR confirmed 5 seats remain available.',
      status: 'RESOLVED',
      adminReply: 'Checked with CSE Department office. 5 additional seats were approved and added to CSE 311 Section B. You can now complete your enrollment.',
      repliedAt: '2026-10-07T14:30:00Z',
      createdAt: '2026-10-06T09:15:00Z',
    },
    {
      id: 'inq_2',
      userId: 'usr_student',
      userName: 'City University Student',
      userEmail: 'sahincontest@gmail.com',
      studentId: '213-15-4921',
      department: 'Computer Science & Engineering',
      category: 'Transport & Shuttle',
      subject: 'Mirpur Route 1 morning bus timing query',
      details: 'Does Route 1 Mirpur bus depart from Mirpur 10 at 7:15 AM or 7:30 AM during midterm week?',
      status: 'IN_REVIEW',
      adminReply: 'During midterm examinations, Route 1 departs at 7:15 AM sharp to ensure students arrive 30 minutes before exams begin.',
      repliedAt: '2026-10-07T16:00:00Z',
      createdAt: '2026-10-07T11:00:00Z',
    },
  ],
};

const DATA_FILE = path.resolve(process.cwd(), '.campusos_db.json');

class Database {
  private state: DatabaseState;

  constructor() {
    this.state = this.load();
  }

  private load(): DatabaseState {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const data = JSON.parse(raw) as DatabaseState;
        this.migrateData(data);
        this.saveState(data);
        return data;
      }
    } catch {
      // fallback to initial
    }
    const fallback = JSON.parse(JSON.stringify(initialDatabase));
    this.saveState(fallback);
    return fallback;
  }

  private migrateData(data: DatabaseState): void {
    if (!data.users) data.users = [];
    data.users.forEach((u) => {
      if (!u.batch && u.role === 'STUDENT') u.batch = '65';
      if (!u.section && u.role === 'STUDENT') u.section = 'B';
    });
    if (!data.notices) data.notices = [];
    data.notices.forEach((n) => {
      if (!n.batch) {
        n.batch = n.department?.includes('CSE') || n.department?.includes('Computer') ? '65' : 'All Batches';
      }
      if (!n.section) {
        n.section = n.batch === '65' ? 'B' : 'All Sections';
      }
    });
    if (!data.exams) data.exams = [];
    data.exams.forEach((e) => {
      if (!e.batch) {
        e.batch = e.courseCode?.includes('CSE') ? '65' : '64';
      }
      if (!e.section) {
        e.section = 'B';
      }
    });
    if (!data.events) data.events = [];
    data.events.forEach((ev) => {
      if (!ev.batch) {
        ev.batch = ev.club?.includes('CPCCU') || ev.department?.includes('CSE') ? '65' : 'All Batches';
      }
      if (!ev.section) {
        ev.section = ev.batch === '65' ? 'B' : 'All Sections';
      }
      if (!ev.attendees) {
        ev.attendees = [];
      }
      // Ensure attendee count matches real registrations
      ev.attendeesCount = ev.attendees.length;
    });
    if (!data.eventRegistrations) data.eventRegistrations = [];
    if (data.eventRegistrations.length === 0 && data.events && data.events.length > 0) {
      // Seed default registrations for demo student
      data.eventRegistrations = [
        {
          id: 'reg_1',
          ticketCode: 'CU-EVT-IUPC-9281',
          eventId: 'evt_1',
          userId: 'usr_student',
          userName: 'City University Student',
          userEmail: 'sahincontest@gmail.com',
          studentId: '213-15-4921',
          department: 'Computer Science & Engineering',
          batch: '65',
          section: 'B',
          registeredAt: '2026-10-02T10:30:00Z',
          checkedIn: false,
          participationType: 'IN_PERSON',
          notes: 'Team Lead: CodeCrusaders',
        },
      ];
    }
    if (!data.resources) data.resources = [];
    data.resources.forEach((r) => {
      if (!r.batch) {
        r.batch = r.courseCode?.includes('CSE') ? '65' : 'All Batches';
      }
      if (!r.section) {
        r.section = r.batch === '65' ? 'B' : 'All Sections';
      }
    });
    if (!data.directory || data.directory.length === 0) {
      data.directory = JSON.parse(JSON.stringify(initialDatabase.directory));
    }
    if (!data.helpdeskInquiries) {
      data.helpdeskInquiries = JSON.parse(JSON.stringify(initialDatabase.helpdeskInquiries));
    }
  }

  private saveState(stateToSave: DatabaseState): void {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(stateToSave, null, 2), 'utf-8');
    } catch {
      // ignore
    }
  }

  public save(): void {
    this.saveState(this.state);
    this.syncToMongo();
  }

  public saveLocal(): void {
    this.saveState(this.state);
  }

  private async syncToMongo(): Promise<void> {
    if (!mongoDbInstance) return;
    try {
      const collections = [
        'users',
        'notices',
        'exams',
        'events',
        'eventRegistrations',
        'clubs',
        'resources',
        'faqs',
        'busSchedules',
        'lostFound',
        'directory',
        'helpdeskInquiries',
      ] as const;

      const state = this.state;
      for (const colName of collections) {
        const items = (state as any)[colName];
        if (Array.isArray(items)) {
          const col = mongoDbInstance.collection(colName);
          await col.deleteMany({});
          if (items.length > 0) {
            await col.insertMany(JSON.parse(JSON.stringify(items)));
          }
        }
      }
    } catch (err: any) {
      console.error('[MongoDB Atlas Sync Error]', err.message);
    }
  }

  public getState(): DatabaseState {
    return this.state;
  }

  public resetToDefault(): void {
    this.state = JSON.parse(JSON.stringify(initialDatabase));
    this.save();
  }
}

export const db = new Database();

let isMongoConnected = false;
let isMongoConnecting = false;

export async function initMongo(): Promise<boolean> {
  if (isMongoConnected) return true;
  if (isMongoConnecting) return false;

  const uri = process.env.MONGODB_URI;
  if (!uri || !uri.startsWith('mongodb')) {
    console.log('[Database] Running in Local Persistent Mode (.campusos_db.json)');
    return false;
  }

  isMongoConnecting = true;
  try {
    const client = new MongoClient(uri, {
      connectTimeoutMS: 3000,
      serverSelectionTimeoutMS: 3000,
    });
    await client.connect();
    mongoDbInstance = client.db('campusos');
    isMongoConnected = true;
    isMongoConnecting = false;
    const clusterHost = uri.split('@')[1]?.split('/')[0] || 'Atlas Cluster';
    console.log(`[MongoDB Atlas] Connected successfully to live cluster (${clusterHost})!`);

    const collections = [
      'users',
      'notices',
      'exams',
      'events',
      'eventRegistrations',
      'clubs',
      'resources',
      'faqs',
      'busSchedules',
      'lostFound',
      'directory',
      'helpdeskInquiries',
    ] as const;

    let hasAtlasData = false;
    for (const colName of collections) {
      const col = mongoDbInstance.collection(colName);
      const count = await col.countDocuments();
      if (count > 0) {
        hasAtlasData = true;
        const docs = await col.find({}).toArray();
        const cleanedDocs = docs.map(({ _id, ...rest }) => rest);
        (db.getState() as any)[colName] = cleanedDocs;
      }
    }

    if (!hasAtlasData) {
      console.log('[MongoDB Atlas] Empty cluster detected. Seeding full City University database to MongoDB Atlas...');
      const state = db.getState();
      for (const colName of collections) {
        const items = (state as any)[colName];
        if (Array.isArray(items) && items.length > 0) {
          const col = mongoDbInstance.collection(colName);
          await col.insertMany(JSON.parse(JSON.stringify(items)));
        }
      }
      console.log('[MongoDB Atlas] Seed complete. All collections populated on Atlas!');
    } else {
      console.log('[MongoDB Atlas] Synchronized and loaded live collections from Atlas cloud database.');
    }

    db.saveLocal();
    return true;
  } catch (err: any) {
    console.warn(`[MongoDB Atlas Notice] Atlas connection failed (${err.message}). Defaulting seamlessly to local disk.`, err);
    return false;
  }
}
