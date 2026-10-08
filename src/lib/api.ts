import { Notice, Exam, EventItem, EventRegistration, CheckInResult, Club, ResourceItem, FAQItem, BusSchedule, LostFoundItem, DashboardStats, NoticeSummaryResult, User, DirectoryContact, HelpdeskInquiry } from '../types';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('campusos_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    throw new Error(res.ok ? 'Unexpected response format' : `Server error (${res.status}): ${text.slice(0, 120)}`);
  }
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `API request failed with status ${res.status}`);
  }
  return data;
}

function buildQueryString(params?: Record<string, any>): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (
      value !== undefined &&
      value !== null &&
      value !== '' &&
      value !== 'undefined' &&
      value !== 'All'
    ) {
      searchParams.append(key, String(value));
    }
  }
  const str = searchParams.toString();
  return str ? `?${str}` : '';
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ success: boolean; token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(res);
  },

  async sendLoginOtp(email: string, password: string): Promise<{ success: boolean; message: string; email: string; demoOtp: string }> {
    const res = await fetch(`${API_BASE}/auth/send-login-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(res);
  },

  async verifyLoginOtp(email: string, otp: string): Promise<{ success: boolean; token: string; user: User; message: string }> {
    const res = await fetch(`${API_BASE}/auth/verify-login-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });
    return handleResponse(res);
  },

  async sendRegisterOtp(data: { name: string; email: string; password: string; department: string; batch?: string; section?: string }): Promise<{ success: boolean; message: string; demoOtp: string }> {
    const res = await fetch(`${API_BASE}/auth/send-register-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async verifyRegisterOtp(data: { name: string; email: string; password: string; department: string; batch?: string; section?: string; studentId?: string; otp: string }): Promise<{ success: boolean; token: string; user: User; message: string }> {
    const res = await fetch(`${API_BASE}/auth/verify-register-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async sendForgotOtp(email: string): Promise<{ success: boolean; message: string; demoOtp: string }> {
    const res = await fetch(`${API_BASE}/auth/send-forgot-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return handleResponse(res);
  },

  async resetPassword(email: string, otp: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, newPassword }),
    });
    return handleResponse(res);
  },

  async register(data: { name: string; email: string; password: string; department: string; batch?: string; section?: string; studentId?: string; role?: string }): Promise<{ success: boolean; token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async getMe(): Promise<{ success: boolean; user: User }> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async updateProfile(data: Partial<User>): Promise<{ success: boolean; user: User; message: string }> {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // Notices
  async getNotices(params?: { category?: string; department?: string; batch?: string; section?: string; search?: string; priority?: string }): Promise<{ success: boolean; data: Notice[] }> {
    const res = await fetch(`${API_BASE}/notices${buildQueryString(params)}`);
    return handleResponse(res);
  },

  async getNoticeById(id: string): Promise<{ success: boolean; data: Notice }> {
    const res = await fetch(`${API_BASE}/notices/${id}`);
    return handleResponse(res);
  },

  async toggleSaveNotice(id: string): Promise<{ success: boolean; saved: boolean; savedNotices: string[] }> {
    const res = await fetch(`${API_BASE}/notices/${id}/toggle-save`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async createNotice(data: Partial<Notice>): Promise<{ success: boolean; data: Notice }> {
    const res = await fetch(`${API_BASE}/notices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async updateNotice(id: string, data: Partial<Notice>): Promise<{ success: boolean; data: Notice }> {
    const res = await fetch(`${API_BASE}/notices/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async deleteNotice(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/notices/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  // Exams
  async getExams(params?: { department?: string; batch?: string; section?: string; examType?: string; search?: string }): Promise<{ success: boolean; data: Exam[] }> {
    const res = await fetch(`${API_BASE}/exams${buildQueryString(params)}`);
    return handleResponse(res);
  },

  async createExam(data: Partial<Exam>): Promise<{ success: boolean; data: Exam }> {
    const res = await fetch(`${API_BASE}/exams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async deleteExam(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/exams/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async toggleSaveExam(id: string): Promise<{ success: boolean; saved: boolean; savedExams: string[] }> {
    const res = await fetch(`${API_BASE}/exams/${id}/toggle-save`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  // Events, Registration, Ticket Passes & Check-in
  async getEvents(params?: { category?: string; club?: string; department?: string; batch?: string; section?: string; timeline?: string; eventType?: string; upcoming?: string; search?: string }): Promise<{ success: boolean; data: EventItem[] }> {
    const res = await fetch(`${API_BASE}/events${buildQueryString(params)}`);
    return handleResponse(res);
  },

  async getEventById(id: string): Promise<{ success: boolean; data: EventItem & { totalRegistrations?: number; checkedInCount?: number } }> {
    const res = await fetch(`${API_BASE}/events/${id}`);
    return handleResponse(res);
  },

  async createEvent(data: Partial<EventItem>): Promise<{ success: boolean; data: EventItem }> {
    const res = await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async updateEvent(id: string, data: Partial<EventItem>): Promise<{ success: boolean; data: EventItem }> {
    const res = await fetch(`${API_BASE}/events/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async deleteEvent(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/events/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async toggleRsvp(eventId: string, details?: { participationType?: 'IN_PERSON' | 'ONLINE'; notes?: string }): Promise<{ success: boolean; rsvped: boolean; count: number; registration?: EventRegistration; ticketCode?: string; message: string }> {
    const res = await fetch(`${API_BASE}/events/${eventId}/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(details || {}),
    });
    return handleResponse(res);
  },

  async getMyRegistrations(): Promise<{ success: boolean; data: (EventRegistration & { event?: EventItem })[] }> {
    const res = await fetch(`${API_BASE}/events/my/registrations`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async getEventAttendees(eventId: string): Promise<{ success: boolean; data: { event: EventItem; registrations: EventRegistration[]; stats: { total: number; checkedIn: number; pending: number; maxCapacity: number } } }> {
    const res = await fetch(`${API_BASE}/events/${eventId}/attendees`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async checkInAttendee(data: { ticketCode?: string; searchCode?: string; eventId?: string }): Promise<CheckInResult> {
    const res = await fetch(`${API_BASE}/events/check-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async toggleAttendeeCheckin(registrationId: string): Promise<{ success: boolean; registration: EventRegistration; message: string }> {
    const res = await fetch(`${API_BASE}/events/toggle-attendee-checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ registrationId }),
    });
    return handleResponse(res);
  },

  // Clubs
  async getClubs(): Promise<{ success: boolean; data: Club[] }> {
    const res = await fetch(`${API_BASE}/clubs`);
    return handleResponse(res);
  },

  // Resources
  async getResources(params?: { department?: string; batch?: string; section?: string; category?: string; search?: string; courseCode?: string }): Promise<{ success: boolean; data: ResourceItem[] }> {
    const res = await fetch(`${API_BASE}/resources${buildQueryString(params)}`);
    return handleResponse(res);
  },

  async createResource(data: Partial<ResourceItem>): Promise<{ success: boolean; data: ResourceItem }> {
    const res = await fetch(`${API_BASE}/resources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async recordDownload(id: string): Promise<{ success: boolean; downloadCount: number; resourceUrl: string }> {
    const res = await fetch(`${API_BASE}/resources/${id}/download`, {
      method: 'POST',
    });
    return handleResponse(res);
  },

  async toggleSaveResource(id: string): Promise<{ success: boolean; saved: boolean; savedResources: string[] }> {
    const res = await fetch(`${API_BASE}/resources/${id}/toggle-save`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async deleteResource(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/resources/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  // Helpdesk & Transport
  async getFaqs(params?: { category?: string; search?: string }): Promise<{ success: boolean; data: FAQItem[] }> {
    const res = await fetch(`${API_BASE}/faqs${buildQueryString(params)}`);
    return handleResponse(res);
  },

  async getBusSchedules(): Promise<{ success: boolean; data: BusSchedule[] }> {
    const res = await fetch(`${API_BASE}/bus-schedules`);
    return handleResponse(res);
  },

  async createBusSchedule(data: Partial<BusSchedule>): Promise<{ success: boolean; data: BusSchedule }> {
    const res = await fetch(`${API_BASE}/bus-schedules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async deleteBusSchedule(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/bus-schedules/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  // Lost & Found
  async getLostFound(params?: { type?: string; status?: string }): Promise<{ success: boolean; data: LostFoundItem[] }> {
    const res = await fetch(`${API_BASE}/lost-found${buildQueryString(params)}`);
    return handleResponse(res);
  },

  async createLostFound(data: Partial<LostFoundItem>): Promise<{ success: boolean; data: LostFoundItem }> {
    const res = await fetch(`${API_BASE}/lost-found`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async resolveLostFound(id: string): Promise<{ success: boolean; data: LostFoundItem }> {
    const res = await fetch(`${API_BASE}/lost-found/${id}/resolve`, {
      method: 'PUT',
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  // Directory & Faculty
  async getDirectory(params?: { department?: string; category?: string; search?: string }): Promise<{ success: boolean; data: DirectoryContact[] }> {
    const res = await fetch(`${API_BASE}/directory${buildQueryString(params)}`);
    return handleResponse(res);
  },

  async createDirectoryContact(data: Partial<DirectoryContact>): Promise<{ success: boolean; data: DirectoryContact; message: string }> {
    const res = await fetch(`${API_BASE}/directory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async updateDirectoryContact(id: string, data: Partial<DirectoryContact>): Promise<{ success: boolean; data: DirectoryContact; message: string }> {
    const res = await fetch(`${API_BASE}/directory/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async deleteDirectoryContact(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/directory/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  // Helpdesk Inquiries & Student Tickets
  async getHelpdeskInquiries(params?: { status?: string; search?: string }): Promise<{ success: boolean; data: HelpdeskInquiry[] }> {
    const res = await fetch(`${API_BASE}/helpdesk/inquiries${buildQueryString(params)}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async createHelpdeskInquiry(data: Partial<HelpdeskInquiry>): Promise<{ success: boolean; data: HelpdeskInquiry; message: string }> {
    const res = await fetch(`${API_BASE}/helpdesk/inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async replyHelpdeskInquiry(id: string, data: { adminReply: string; status?: string }): Promise<{ success: boolean; data: HelpdeskInquiry; message: string }> {
    const res = await fetch(`${API_BASE}/helpdesk/inquiries/${id}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async deleteHelpdeskInquiry(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/helpdesk/inquiries/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  // Dashboard Stats
  async getDashboardStats(): Promise<{ success: boolean; data: DashboardStats }> {
    const res = await fetch(`${API_BASE}/dashboard/stats`);
    return handleResponse(res);
  },

  // AI
  async summarizeNotice(noticeId: string): Promise<{ success: boolean; data: NoticeSummaryResult }> {
    const res = await fetch(`${API_BASE}/ai/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noticeId }),
    });
    return handleResponse(res);
  },

  async askCampusAI(query: string): Promise<{ success: boolean; data: { answer: string; source: string; verified: boolean } }> {
    const res = await fetch(`${API_BASE}/ai/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    return handleResponse(res);
  },
};
