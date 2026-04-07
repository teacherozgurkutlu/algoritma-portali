const STORAGE_KEYS = {
  users: "algoritmaPortaliUsers",
  session: "algoritmaPortaliSession",
  staffEmails: "algoritmaPortaliStaffEmails",
  quizzes: "algoritmaPortaliQuizzes",
  attempts: "algoritmaPortaliAttempts",
  projects: "algoritmaPortaliProjects",
  messages: "algoritmaPortaliMessages"
};

const PORTAL_CONFIG = window.PORTAL_CONFIG || {};
const ADMIN_CONFIG = PORTAL_CONFIG.admin || { name: "Sistem Yoneticisi", email: "ogretmen@algoritma-portal.local" };
const LOCAL_ADMIN_PASSWORD = String(PORTAL_CONFIG.admin?.localPassword || "YerelYonetici123!");
const LOCAL_TEACHER_PASSWORD = String(PORTAL_CONFIG.admin?.localTeacherPassword || "YerelOgretmen123!");
const FIREBASE_CONFIG = PORTAL_CONFIG.firebase || { teacherEmails: [], config: {} };
const GOOGLE_DRIVE_UPLOAD_CONFIG = PORTAL_CONFIG.googleDriveUpload || { webAppUrl: "", folderName: "bilsemprj", maxFileSizeMb: 20 };

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function normalizeDateValue(value) {
  if (!value) return new Date().toISOString();
  if (typeof value === "string") return value;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (typeof value.seconds === "number") return new Date(value.seconds * 1000).toISOString();
  return new Date().toISOString();
}

export function formatDate(value) {
  return new Date(normalizeDateValue(value)).toLocaleString("tr-TR");
}

function sortByDate(items, fieldName, direction = "desc") {
  const multiplier = direction === "asc" ? 1 : -1;
  return [...items].sort((left, right) => multiplier * (new Date(normalizeDateValue(left[fieldName])) - new Date(normalizeDateValue(right[fieldName]))));
}

export function sortAttemptsNewestFirst(items) {
  return sortByDate(items, "createdAt", "desc");
}

export function sortProjectsNewestFirst(items) {
  return sortByDate(items, "uploadedAt", "desc");
}

export function sortMessagesOldestFirst(items) {
  return sortByDate(items, "createdAt", "asc");
}

export function sortQuizzesNewestFirst(items) {
  return sortByDate(items, "createdAt", "desc");
}

export function isFirebaseModeConfigured() {
  return PORTAL_CONFIG.storageMode === "firebase" && Boolean(FIREBASE_CONFIG.config?.apiKey) && Boolean(FIREBASE_CONFIG.config?.projectId);
}

export function getModeLabel() {
  return isFirebaseModeConfigured() ? "Firebase" : "Yerel";
}

export function isAdminRole(role) {
  return role === "admin";
}

export function isTeacherRole(role) {
  return role === "teacher";
}

export function isStaffRole(role) {
  return role === "teacher" || role === "admin";
}

export function getPortalMeta() {
  return {
    name: String(PORTAL_CONFIG.portalName || "Altieylul BILSEM Proje Yonetim Sistemi"),
    adminName: String(ADMIN_CONFIG.name || "Sistem Yoneticisi"),
    adminEmail: normalizeEmail(ADMIN_CONFIG.email)
  };
}

export function getApprovedTeacherEmails() {
  const emailSet = new Set(
    [normalizeEmail(ADMIN_CONFIG.email), ...(FIREBASE_CONFIG.teacherEmails || []).map((email) => normalizeEmail(email))]
      .filter(Boolean)
  );
  return [...emailSet];
}

function getStoredApprovedTeacherEmails() {
  return readJson(STORAGE_KEYS.staffEmails, []).map((email) => normalizeEmail(email)).filter(Boolean);
}

function saveStoredApprovedTeacherEmails(emails) {
  writeJson(STORAGE_KEYS.staffEmails, [...new Set(emails.map((email) => normalizeEmail(email)).filter(Boolean))]);
}

function getMergedApprovedTeacherEmails(extraEmails = []) {
  return [...new Set([...getApprovedTeacherEmails(), ...extraEmails.map((email) => normalizeEmail(email)).filter(Boolean)])];
}

export function getGoogleDriveUploadConfig() {
  return {
    folderName: GOOGLE_DRIVE_UPLOAD_CONFIG.folderName || "bilsemprj",
    maxFileSizeMb: Number(GOOGLE_DRIVE_UPLOAD_CONFIG.maxFileSizeMb || 20),
    webAppUrl: String(GOOGLE_DRIVE_UPLOAD_CONFIG.webAppUrl || "").trim()
  };
}

export function isGoogleDriveUploadConfigured() {
  return Boolean(getGoogleDriveUploadConfig().webAppUrl);
}

function resolveRoleFromEmail(email) {
  const normalized = normalizeEmail(email);
  if (normalized === normalizeEmail(ADMIN_CONFIG.email)) {
    return "admin";
  }
  return getMergedApprovedTeacherEmails(getStoredApprovedTeacherEmails()).includes(normalized) ? "teacher" : "student";
}

function createEmptyAssignment() {
  return {
    assignedTeacherId: null,
    assignedTeacherName: "",
    assignedTeacherEmail: ""
  };
}

function sanitizeQuestion(question, index) {
  const prompt = String(question?.prompt || "").trim();
  const options = Array.isArray(question?.options)
    ? question.options.slice(0, 4).map((item) => String(item || "").trim())
    : [];
  const correctIndex = Number.parseInt(String(question?.correctIndex ?? ""), 10);
  const explanation = String(question?.explanation || "").trim();

  if (!prompt) {
    throw new Error(`${index + 1}. soru metni bos olamaz.`);
  }

  if (options.length !== 4 || options.some((item) => !item)) {
    throw new Error(`${index + 1}. soru icin 4 secenek doldurulmalidir.`);
  }

  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) {
    throw new Error(`${index + 1}. soru icin dogru secenek belirleyin.`);
  }

  return { prompt, options, correctIndex, explanation };
}

function sanitizeQuizPayload(payload) {
  const title = String(payload?.title || "").trim();
  const description = String(payload?.description || "").trim();
  const accessibleUserIds = [...new Set((payload?.accessibleUserIds || []).map((value) => String(value || "").trim()).filter(Boolean))];
  const questions = (payload?.questions || []).map((question, index) => sanitizeQuestion(question, index));

  if (!title) {
    throw new Error("Quiz basligi bos olamaz.");
  }

  if (!accessibleUserIds.length) {
    throw new Error("Quiz icin en az bir ogrenci secilmelidir.");
  }

  if (!questions.length) {
    throw new Error("En az bir soru eklenmelidir.");
  }

  return {
    title,
    description,
    accessibleUserIds,
    questions,
    audienceLabel: String(payload?.audienceLabel || "").trim() || `${accessibleUserIds.length} ogrenci`
  };
}

function buildProjectRecord(student, payload, overrides = {}) {
  return {
    requestId: String(payload.requestId || ""),
    userId: student.id,
    studentName: student.name,
    className: student.className,
    email: student.email,
    teacherId: student.assignedTeacherId || null,
    teacherName: student.assignedTeacherName || "",
    teacherEmail: student.assignedTeacherEmail || "",
    title: String(payload.title || "").trim(),
    description: String(payload.description || "").trim(),
    driveFileId: String(payload.driveFileId || ""),
    driveFileUrl: String(payload.driveFileUrl || ""),
    driveFileName: String(payload.driveFileName || ""),
    mimeType: String(payload.mimeType || ""),
    size: Number(payload.size || 0),
    reviewText: String(payload.reviewText || ""),
    reviewUpdatedAt: payload.reviewUpdatedAt || null,
    reviewUpdatedBy: payload.reviewUpdatedBy || null,
    reviewUpdatedByName: payload.reviewUpdatedByName || null,
    reviewUpdatedByRole: payload.reviewUpdatedByRole || null,
    ...overrides
  };
}

function buildMessageRecord(student, text, sender, overrides = {}) {
  return {
    studentId: student.id,
    studentName: student.name,
    className: student.className,
    email: student.email,
    teacherId: student.assignedTeacherId || null,
    teacherName: student.assignedTeacherName || "",
    teacherEmail: student.assignedTeacherEmail || "",
    senderId: sender.id,
    senderName: sender.name,
    senderRole: sender.role,
    text: String(text || "").trim(),
    ...overrides
  };
}

function buildAttemptRecord(student, quiz, result, overrides = {}) {
  return {
    userId: student.id,
    studentName: student.name,
    className: student.className,
    email: student.email,
    teacherId: student.assignedTeacherId || null,
    teacherName: student.assignedTeacherName || "",
    teacherEmail: student.assignedTeacherEmail || "",
    quizId: quiz.id,
    quizTitle: quiz.title,
    createdBy: quiz.createdBy,
    createdByName: quiz.createdByName,
    score: result.score,
    total: result.total,
    correctCount: result.correctCount,
    wrongCount: result.wrongCount,
    answers: result.answers,
    ...overrides
  };
}

function prettifyEmailName(email) {
  const localPart = normalizeEmail(email).split("@")[0] || "ogretmen";
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isApprovedTeacherEmailValue(email, extraEmails = []) {
  const normalized = normalizeEmail(email);
  return getMergedApprovedTeacherEmails(extraEmails).includes(normalized);
}

function filterManagementSnapshot(snapshot, actor) {
  if (!actor || isAdminRole(actor.role)) {
    return snapshot;
  }

  const students = (snapshot.students || []).filter((student) => student.assignedTeacherId === actor.id);
  const studentIds = new Set(students.map((student) => student.id));

  return {
    approvedTeacherEmails: snapshot.approvedTeacherEmails || [],
    teachers: (snapshot.teachers || []).filter((teacher) => teacher.id === actor.id),
    students,
    quizzes: (snapshot.quizzes || []).filter((quiz) => quiz.createdBy === actor.id),
    attempts: (snapshot.attempts || []).filter((attempt) => studentIds.has(attempt.userId) || attempt.teacherId === actor.id),
    projects: (snapshot.projects || []).filter((project) => studentIds.has(project.userId) || project.teacherId === actor.id),
    messages: (snapshot.messages || []).filter((message) => studentIds.has(message.studentId) || message.teacherId === actor.id)
  };
}

function buildLocalDataLayer() {
  function getUsers() {
    return readJson(STORAGE_KEYS.users, []);
  }

  function saveUsers(users) {
    writeJson(STORAGE_KEYS.users, users);
  }

  function getQuizzes() {
    return readJson(STORAGE_KEYS.quizzes, []);
  }

  function saveQuizzes(quizzes) {
    writeJson(STORAGE_KEYS.quizzes, quizzes);
  }

  function getAttempts() {
    return readJson(STORAGE_KEYS.attempts, []);
  }

  function saveAttempts(attempts) {
    writeJson(STORAGE_KEYS.attempts, attempts);
  }

  function getProjects() {
    return readJson(STORAGE_KEYS.projects, []);
  }

  function saveProjects(projects) {
    writeJson(STORAGE_KEYS.projects, projects);
  }

  function getMessages() {
    return readJson(STORAGE_KEYS.messages, []);
  }

  function saveMessages(messages) {
    writeJson(STORAGE_KEYS.messages, messages);
  }

  function getSession() {
    return readJson(STORAGE_KEYS.session, null);
  }

  function setSession(userId) {
    writeJson(STORAGE_KEYS.session, { userId });
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_KEYS.session);
  }

  function getCurrentUserFromSession() {
    const session = getSession();
    return session ? getUsers().find((user) => user.id === session.userId) || null : null;
  }

  function getStudentById(userId) {
    return getUsers().find((user) => user.id === userId && user.role === "student") || null;
  }

  function seedStaffAccounts() {
    const users = getUsers();
    const now = new Date().toISOString();

    getMergedApprovedTeacherEmails(getStoredApprovedTeacherEmails()).forEach((email) => {
      const role = resolveRoleFromEmail(email);
      const existing = users.find((user) => normalizeEmail(user.email) === email);
      const baseFields = {
        name: role === "admin" ? ADMIN_CONFIG.name || "Sistem Yoneticisi" : prettifyEmailName(email) || "Ogretmen",
        className: "BILSEM",
        email,
        role
      };

      if (existing) {
        existing.role = role;
        existing.name = existing.name || baseFields.name;
        existing.className = existing.className || baseFields.className;
        existing.email = email;
      } else {
        users.push({
          id: createId(role),
          ...createEmptyAssignment(),
          ...baseFields,
          password: role === "admin" ? LOCAL_ADMIN_PASSWORD : LOCAL_TEACHER_PASSWORD,
          createdAt: now
        });
      }
    });

    saveUsers(users);
  }

  function buildStudentWorkspace(userId) {
    const users = getUsers();
    const student = users.find((user) => user.id === userId) || null;
    const teacher = student?.assignedTeacherId
      ? users.find((user) => user.id === student.assignedTeacherId) || null
      : student?.assignedTeacherEmail
        ? {
          id: null,
          name: student.assignedTeacherName || prettifyEmailName(student.assignedTeacherEmail) || "Yetkili personel",
          email: student.assignedTeacherEmail,
          role: "teacher",
          className: "BILSEM"
        }
        : null;

    return {
      student,
      teacher,
      quizzes: sortQuizzesNewestFirst(getQuizzes().filter((quiz) => (quiz.accessibleUserIds || []).includes(userId))),
      attempts: sortAttemptsNewestFirst(getAttempts().filter((attempt) => attempt.userId === userId)),
      projects: sortProjectsNewestFirst(getProjects().filter((project) => project.userId === userId)),
      messages: sortMessagesOldestFirst(getMessages().filter((message) => message.studentId === userId))
    };
  }

  function buildManagementSnapshot() {
    const users = getUsers();
    return {
      approvedTeacherEmails: getMergedApprovedTeacherEmails(getStoredApprovedTeacherEmails()),
      teachers: users.filter((user) => isStaffRole(user.role)).sort((left, right) => left.name.localeCompare(right.name, "tr")),
      students: users.filter((user) => user.role === "student").sort((left, right) => left.name.localeCompare(right.name, "tr")),
      quizzes: sortQuizzesNewestFirst(getQuizzes()),
      attempts: sortAttemptsNewestFirst(getAttempts()),
      projects: sortProjectsNewestFirst(getProjects()),
      messages: sortMessagesOldestFirst(getMessages())
    };
  }

  return {
    mode: "local",
    adminConfig: ADMIN_CONFIG,
    async ensureSetup() {
      seedStaffAccounts();
      return getCurrentUserFromSession();
    },
    async registerUser(payload) {
      const users = getUsers();
      const email = normalizeEmail(payload.email);
      if (users.some((user) => normalizeEmail(user.email) === email)) {
        throw new Error("Bu e-posta zaten kayitli.");
      }

      const role = resolveRoleFromEmail(email);
      const user = {
        id: createId(role),
        role,
        name: String(payload.name || "").trim(),
        className: String(payload.className || "").trim(),
        email,
        password: String(payload.password || ""),
        createdAt: new Date().toISOString(),
        ...createEmptyAssignment()
      };

      users.push(user);
      saveUsers(users);
      setSession(user.id);
      return user;
    },
    async loginUser(email, password) {
      const user = getUsers().find((item) => normalizeEmail(item.email) === normalizeEmail(email) && item.password === password);
      if (!user) {
        throw new Error("E-posta veya sifre hatali.");
      }
      setSession(user.id);
      return user;
    },
    async logoutUser() {
      clearSession();
    },
    async getCurrentUser() {
      return getCurrentUserFromSession();
    },
    async listApprovedTeacherEmails() {
      return getMergedApprovedTeacherEmails(getStoredApprovedTeacherEmails());
    },
    async saveApprovedTeacherEmail(email, actor) {
      if (!actor || !isAdminRole(actor.role)) {
        throw new Error("Sadece admin ogretmen e-postasi ekleyebilir.");
      }
      const normalized = normalizeEmail(email);
      if (!normalized) {
        throw new Error("Gecerli bir e-posta girin.");
      }
      const merged = getMergedApprovedTeacherEmails([...getStoredApprovedTeacherEmails(), normalized]);
      saveStoredApprovedTeacherEmails(merged.filter((item) => item !== normalizeEmail(ADMIN_CONFIG.email)));
      seedStaffAccounts();
      return merged;
    },
    async saveQuiz(actor, payload) {
      if (!actor || !isStaffRole(actor.role)) {
        throw new Error("Quiz olusturma yetkiniz yok.");
      }

      const cleanPayload = sanitizeQuizPayload(payload);
      const quizzes = getQuizzes();
      quizzes.push({
        id: createId("quiz"),
        title: cleanPayload.title,
        description: cleanPayload.description,
        audienceLabel: cleanPayload.audienceLabel,
        accessibleUserIds: cleanPayload.accessibleUserIds,
        questionCount: cleanPayload.questions.length,
        questions: cleanPayload.questions,
        createdBy: actor.id,
        createdByName: actor.name,
        createdByRole: actor.role,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      saveQuizzes(quizzes);
    },
    async saveAttempt(user, quiz, result) {
      const student = getStudentById(user.id);
      if (!student) {
        throw new Error("Ogrenci kaydi bulunamadi.");
      }
      const attempts = getAttempts();
      attempts.push({
        id: createId("attempt"),
        ...buildAttemptRecord(student, quiz, result, { createdAt: new Date().toISOString() })
      });
      saveAttempts(attempts);
    },
    async listAttemptsForUser(userId) {
      return sortAttemptsNewestFirst(getAttempts().filter((attempt) => attempt.userId === userId));
    },
    async saveProjectRecord(user, payload) {
      const student = getStudentById(user.id);
      if (!student) {
        throw new Error("Ogrenci profili bulunamadi.");
      }
      const projects = getProjects();
      const projectId = payload.requestId || createId("project");
      const existingIndex = projects.findIndex((item) => item.id === projectId);
      const record = {
        id: projectId,
        ...buildProjectRecord(student, payload, { uploadedAt: new Date().toISOString() })
      };

      if (existingIndex >= 0) {
        projects[existingIndex] = { ...projects[existingIndex], ...record };
      } else {
        projects.push(record);
      }

      saveProjects(projects);
    },
    async listProjectsForUser(userId) {
      return sortProjectsNewestFirst(getProjects().filter((project) => project.userId === userId));
    },
    async saveProjectReview(projectId, reviewText, actor) {
      if (!actor || !isStaffRole(actor.role)) {
        throw new Error("Degerlendirme kaydetme yetkiniz yok.");
      }
      const projects = getProjects();
      const project = projects.find((item) => item.id === projectId);
      if (!project) {
        throw new Error("Proje kaydi bulunamadi.");
      }
      if (isTeacherRole(actor.role) && project.teacherId !== actor.id) {
        throw new Error("Bu proje icin yetkiniz yok.");
      }

      project.reviewText = String(reviewText || "").trim();
      project.reviewUpdatedAt = new Date().toISOString();
      project.reviewUpdatedBy = actor.id;
      project.reviewUpdatedByName = actor.name;
      project.reviewUpdatedByRole = actor.role;
      saveProjects(projects);
    },
    async sendMessage({ studentId, text, sender }) {
      const cleanText = String(text || "").trim();
      if (!cleanText) {
        throw new Error("Mesaj bos olamaz.");
      }

      const student = getStudentById(studentId);
      if (!student) {
        throw new Error("Mesaj gonderilecek ogrenci bulunamadi.");
      }

      if (sender.role === "student" && sender.id !== studentId) {
        throw new Error("Sadece kendi adiniza mesaj gonderebilirsiniz.");
      }

      if (sender.role === "teacher" && student.assignedTeacherId !== sender.id) {
        throw new Error("Bu ogrenci size atanmis degil.");
      }

      const messages = getMessages();
      messages.push({
        id: createId("message"),
        ...buildMessageRecord(student, cleanText, sender, { createdAt: new Date().toISOString() })
      });
      saveMessages(messages);
    },
    async listMessagesForUser(userId) {
      return sortMessagesOldestFirst(getMessages().filter((message) => message.studentId === userId));
    },
    async getStudentWorkspace(userId) {
      return buildStudentWorkspace(userId);
    },
    subscribeStudentWorkspace(userId, callback) {
      this.getStudentWorkspace(userId).then(callback);
      return () => {};
    },
    async saveStudentAssignment(studentId, teacherId, actor) {
      if (!actor || !isAdminRole(actor.role)) {
        throw new Error("Sadece admin ogrenci atamasi yapabilir.");
      }

      const users = getUsers();
      const student = users.find((user) => user.id === studentId && user.role === "student");
      if (!student) {
        throw new Error("Ogrenci kaydi bulunamadi.");
      }

      const normalizedTeacherRef = normalizeEmail(teacherId);
      let teacher = teacherId
        ? users.find((user) => (user.id === teacherId || normalizeEmail(user.email) === normalizedTeacherRef) && isStaffRole(user.role))
        : null;

      if (!teacher && normalizedTeacherRef && isApprovedTeacherEmailValue(normalizedTeacherRef, getStoredApprovedTeacherEmails())) {
        teacher = {
          id: null,
          name: prettifyEmailName(normalizedTeacherRef) || "Ogretmen",
          email: normalizedTeacherRef,
          role: "teacher"
        };
      }

      if (teacherId && !teacher) {
        throw new Error("Atanacak ogretmen bulunamadi.");
      }

      student.assignedTeacherId = teacher?.id || null;
      student.assignedTeacherName = teacher?.name || "";
      student.assignedTeacherEmail = teacher?.email || "";
      saveUsers(users);

      const attempts = getAttempts();
      attempts.forEach((attempt) => {
        if (attempt.userId === studentId) {
          attempt.teacherId = teacher?.id || null;
          attempt.teacherName = teacher?.name || "";
          attempt.teacherEmail = teacher?.email || "";
        }
      });
      saveAttempts(attempts);

      const projects = getProjects();
      projects.forEach((project) => {
        if (project.userId === studentId) {
          project.teacherId = teacher?.id || null;
          project.teacherName = teacher?.name || "";
          project.teacherEmail = teacher?.email || "";
        }
      });
      saveProjects(projects);

      const messages = getMessages();
      messages.forEach((message) => {
        if (message.studentId === studentId) {
          message.teacherId = teacher?.id || null;
          message.teacherName = teacher?.name || "";
          message.teacherEmail = teacher?.email || "";
        }
      });
      saveMessages(messages);
    },
    async getManagementSnapshot(actor) {
      return filterManagementSnapshot(buildManagementSnapshot(), actor);
    },
    subscribeManagementSnapshot(actor, callback) {
      this.getManagementSnapshot(actor).then(callback);
      return () => {};
    }
  };
}

async function buildFirebaseDataLayer() {
  const [appModule, authModule, firestoreModule] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js")
  ]);

  const { initializeApp } = appModule;
  const { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } = authModule;
  const {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    collection,
    addDoc,
    getDocs,
    query,
    where,
    onSnapshot,
    serverTimestamp,
    writeBatch
  } = firestoreModule;

  const app = initializeApp(FIREBASE_CONFIG.config);
  const auth = getAuth(app);
  const db = getFirestore(app);

  function mapUser(docSnap) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: data?.createdAt ? normalizeDateValue(data.createdAt) : null,
      updatedAt: data?.updatedAt ? normalizeDateValue(data.updatedAt) : null
    };
  }

  function mapAttempt(docSnap) {
    const data = docSnap.data();
    return { id: docSnap.id, ...data, createdAt: normalizeDateValue(data.createdAt) };
  }

  function mapProject(docSnap) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      uploadedAt: normalizeDateValue(data.uploadedAt),
      reviewUpdatedAt: data.reviewUpdatedAt ? normalizeDateValue(data.reviewUpdatedAt) : null
    };
  }

  function mapMessage(docSnap) {
    const data = docSnap.data();
    return { id: docSnap.id, ...data, createdAt: normalizeDateValue(data.createdAt) };
  }

  function mapQuiz(docSnap) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: normalizeDateValue(data.createdAt),
      updatedAt: data.updatedAt ? normalizeDateValue(data.updatedAt) : null
    };
  }

  async function fetchUserProfile(userId) {
    const profileSnap = await getDoc(doc(db, "users", userId));
    return profileSnap.exists() ? mapUser(profileSnap) : null;
  }

  async function getRemoteApprovedTeacherEmails() {
    const snapshot = await getDocs(collection(db, "staffEmails"));
    return snapshot.docs.map((item) => normalizeEmail(item.id)).filter(Boolean);
  }

  async function resolveRoleFromEmailRemote(email) {
    const normalized = normalizeEmail(email);
    if (normalized === normalizeEmail(ADMIN_CONFIG.email)) {
      return "admin";
    }
    if (getApprovedTeacherEmails().includes(normalized)) {
      return "teacher";
    }
    const staffDoc = await getDoc(doc(db, "staffEmails", normalized));
    return staffDoc.exists() ? "teacher" : "student";
  }

  async function upsertProfile(authUser, extra = {}) {
    const role = await resolveRoleFromEmailRemote(authUser.email);
    const ref = doc(db, "users", authUser.uid);
    const snap = await getDoc(ref);
    const current = snap.exists() ? snap.data() : {};
    const profile = {
      uid: authUser.uid,
      email: normalizeEmail(authUser.email),
      name: extra.name || current.name || authUser.displayName || authUser.email,
      className: extra.className || current.className || (isStaffRole(role) ? "BILSEM" : ""),
      role,
      assignedTeacherId: current.assignedTeacherId || null,
      assignedTeacherName: current.assignedTeacherName || "",
      assignedTeacherEmail: current.assignedTeacherEmail || "",
      updatedAt: serverTimestamp()
    };

    if (!snap.exists()) {
      profile.createdAt = serverTimestamp();
    }

    await setDoc(ref, profile, { merge: true });
    return {
      id: authUser.uid,
      email: profile.email,
      name: profile.name,
      className: profile.className,
      role,
      assignedTeacherId: current.assignedTeacherId || null,
      assignedTeacherName: current.assignedTeacherName || "",
      assignedTeacherEmail: current.assignedTeacherEmail || ""
    };
  }

  async function resolveCurrentUser() {
    const authUser = await new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(
        auth,
        (user) => {
          unsubscribe();
          resolve(user);
        },
        (error) => {
          unsubscribe();
          reject(error);
        }
      );
    });

    return authUser ? upsertProfile(authUser) : null;
  }

  function subscribeWorkspace(queryRef, mapFn, assignItems, publish, onError) {
    return onSnapshot(
      queryRef,
      (snapshot) => {
        assignItems(snapshot.docs.map(mapFn));
        publish();
      },
      onError
    );
  }

  return {
    mode: "firebase",
    adminConfig: ADMIN_CONFIG,
    async ensureSetup() {
      return resolveCurrentUser();
    },
    async registerUser(payload) {
      const credential = await createUserWithEmailAndPassword(auth, normalizeEmail(payload.email), payload.password);
      await updateProfile(credential.user, { displayName: String(payload.name || "").trim() });
      return upsertProfile(credential.user, {
        name: String(payload.name || "").trim(),
        className: String(payload.className || "").trim()
      });
    },
    async loginUser(email, password) {
      const credential = await signInWithEmailAndPassword(auth, normalizeEmail(email), password);
      return upsertProfile(credential.user);
    },
    async logoutUser() {
      await signOut(auth);
    },
    async getCurrentUser() {
      return auth.currentUser ? upsertProfile(auth.currentUser) : null;
    },
    async listApprovedTeacherEmails() {
      return getMergedApprovedTeacherEmails(await getRemoteApprovedTeacherEmails());
    },
    async saveApprovedTeacherEmail(email, actor) {
      if (!actor || !isAdminRole(actor.role)) {
        throw new Error("Sadece admin ogretmen e-postasi ekleyebilir.");
      }
      const normalized = normalizeEmail(email);
      if (!normalized) {
        throw new Error("Gecerli bir e-posta girin.");
      }
      await setDoc(doc(db, "staffEmails", normalized), {
        email: normalized,
        role: "teacher",
        createdAt: serverTimestamp(),
        createdBy: actor.id,
        createdByName: actor.name
      }, { merge: true });
      return this.listApprovedTeacherEmails();
    },
    async saveQuiz(actor, payload) {
      if (!actor || !isStaffRole(actor.role)) {
        throw new Error("Quiz olusturma yetkiniz yok.");
      }
      const cleanPayload = sanitizeQuizPayload(payload);
      await addDoc(collection(db, "quizzes"), {
        title: cleanPayload.title,
        description: cleanPayload.description,
        audienceLabel: cleanPayload.audienceLabel,
        accessibleUserIds: cleanPayload.accessibleUserIds,
        questionCount: cleanPayload.questions.length,
        questions: cleanPayload.questions,
        createdBy: actor.id,
        createdByName: actor.name,
        createdByRole: actor.role,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    },
    async saveAttempt(user, quiz, result) {
      const student = await fetchUserProfile(user.id);
      if (!student) {
        throw new Error("Ogrenci profili bulunamadi.");
      }
      await addDoc(collection(db, "attempts"), {
        ...buildAttemptRecord(student, quiz, result, { createdAt: serverTimestamp() })
      });
    },
    async listAttemptsForUser(userId) {
      const snapshot = await getDocs(query(collection(db, "attempts"), where("userId", "==", userId)));
      return sortAttemptsNewestFirst(snapshot.docs.map(mapAttempt));
    },
    async saveProjectRecord(user, payload) {
      const student = await fetchUserProfile(user.id);
      if (!student) {
        throw new Error("Ogrenci profili bulunamadi.");
      }

      const record = buildProjectRecord(student, payload, {
        uploadedAt: serverTimestamp(),
        reviewUpdatedAt: null,
        reviewUpdatedBy: null,
        reviewUpdatedByName: null,
        reviewUpdatedByRole: null
      });

      if (payload.requestId) {
        await setDoc(doc(db, "projects", payload.requestId), record, { merge: true });
        return;
      }

      await addDoc(collection(db, "projects"), record);
    },
    async listProjectsForUser(userId) {
      const snapshot = await getDocs(query(collection(db, "projects"), where("userId", "==", userId)));
      return sortProjectsNewestFirst(snapshot.docs.map(mapProject));
    },
    async saveProjectReview(projectId, reviewText, actor) {
      await updateDoc(doc(db, "projects", projectId), {
        reviewText: String(reviewText || "").trim(),
        reviewUpdatedAt: serverTimestamp(),
        reviewUpdatedBy: actor.id,
        reviewUpdatedByName: actor.name,
        reviewUpdatedByRole: actor.role
      });
    },
    async sendMessage({ studentId, text, sender }) {
      const cleanText = String(text || "").trim();
      if (!cleanText) {
        throw new Error("Mesaj bos olamaz.");
      }
      const student = await fetchUserProfile(studentId);
      if (!student) {
        throw new Error("Mesaj gonderilecek ogrenci bulunamadi.");
      }
      await addDoc(collection(db, "messages"), {
        ...buildMessageRecord(student, cleanText, sender, { createdAt: serverTimestamp() })
      });
    },
    async listMessagesForUser(userId) {
      const snapshot = await getDocs(query(collection(db, "messages"), where("studentId", "==", userId)));
      return sortMessagesOldestFirst(snapshot.docs.map(mapMessage));
    },
    async getStudentWorkspace(userId) {
      const student = await fetchUserProfile(userId);
      let teacher = null;
      if (student?.assignedTeacherId) {
        try {
          teacher = await fetchUserProfile(student.assignedTeacherId);
        } catch {
          teacher = student.assignedTeacherId ? {
            id: student.assignedTeacherId,
            name: student.assignedTeacherName || "Yetkili personel",
            email: student.assignedTeacherEmail || "",
            role: "teacher",
            className: "BILSEM"
          } : null;
                }
      }
      if (!teacher && student?.assignedTeacherEmail) {
        teacher = {
          id: null,
          name: student.assignedTeacherName || prettifyEmailName(student.assignedTeacherEmail) || "Yetkili personel",
          email: student.assignedTeacherEmail,
          role: "teacher",
          className: "BILSEM"
        };
      }

      const [attemptsSnapshot, projectsSnapshot, messagesSnapshot, quizzesSnapshot] = await Promise.all([
        getDocs(query(collection(db, "attempts"), where("userId", "==", userId))),
        getDocs(query(collection(db, "projects"), where("userId", "==", userId))),
        getDocs(query(collection(db, "messages"), where("studentId", "==", userId))),
        getDocs(query(collection(db, "quizzes"), where("accessibleUserIds", "array-contains", userId)))
      ]);

      return {
        student,
        teacher,
        quizzes: sortQuizzesNewestFirst(quizzesSnapshot.docs.map(mapQuiz)),
        attempts: sortAttemptsNewestFirst(attemptsSnapshot.docs.map(mapAttempt)),
        projects: sortProjectsNewestFirst(projectsSnapshot.docs.map(mapProject)),
        messages: sortMessagesOldestFirst(messagesSnapshot.docs.map(mapMessage))
      };
    },
    subscribeStudentWorkspace(userId, callback, onError) {
      const cache = {
        student: null,
        teacher: null,
        quizzes: [],
        attempts: [],
        projects: [],
        messages: []
      };
      let teacherUnsubscribe = null;

      const publish = () => {
        callback({
          student: cache.student,
          teacher: cache.teacher,
          quizzes: sortQuizzesNewestFirst(cache.quizzes),
          attempts: sortAttemptsNewestFirst(cache.attempts),
          projects: sortProjectsNewestFirst(cache.projects),
          messages: sortMessagesOldestFirst(cache.messages)
        });
      };

      const unsubscribeStudent = onSnapshot(
        doc(db, "users", userId),
        (snapshot) => {
          cache.student = snapshot.exists() ? mapUser(snapshot) : null;

          if (teacherUnsubscribe) {
            teacherUnsubscribe();
            teacherUnsubscribe = null;
          }

          if (cache.student?.assignedTeacherId) {
            teacherUnsubscribe = onSnapshot(
              doc(db, "users", cache.student.assignedTeacherId),
              (teacherSnapshot) => {
                cache.teacher = teacherSnapshot.exists()
                  ? mapUser(teacherSnapshot)
                  : {
                    id: cache.student.assignedTeacherId,
                    name: cache.student.assignedTeacherName || "Yetkili personel",
                    email: cache.student.assignedTeacherEmail || "",
                    role: "teacher",
                    className: "BILSEM"
                  };
                publish();
              },
              () => {
                cache.teacher = {
                  id: cache.student.assignedTeacherId,
                  name: cache.student.assignedTeacherName || "Yetkili personel",
                  email: cache.student.assignedTeacherEmail || "",
                  role: "teacher",
                  className: "BILSEM"
                };
                publish();
              }
            );
          } else {
            cache.teacher = cache.student?.assignedTeacherEmail
              ? {
                id: null,
                name: cache.student.assignedTeacherName || prettifyEmailName(cache.student.assignedTeacherEmail) || "Yetkili personel",
                email: cache.student.assignedTeacherEmail || "",
                role: "teacher",
                className: "BILSEM"
              }
              : null;
          }

          publish();
        },
        onError
      );

      const unsubscribeAttempts = subscribeWorkspace(
        query(collection(db, "attempts"), where("userId", "==", userId)),
        mapAttempt,
        (items) => { cache.attempts = items; },
        publish,
        onError
      );

      const unsubscribeProjects = subscribeWorkspace(
        query(collection(db, "projects"), where("userId", "==", userId)),
        mapProject,
        (items) => { cache.projects = items; },
        publish,
        onError
      );

      const unsubscribeMessages = subscribeWorkspace(
        query(collection(db, "messages"), where("studentId", "==", userId)),
        mapMessage,
        (items) => { cache.messages = items; },
        publish,
        onError
      );

      const unsubscribeQuizzes = subscribeWorkspace(
        query(collection(db, "quizzes"), where("accessibleUserIds", "array-contains", userId)),
        mapQuiz,
        (items) => { cache.quizzes = items; },
        publish,
        onError
      );

      return () => {
        unsubscribeStudent();
        unsubscribeAttempts();
        unsubscribeProjects();
        unsubscribeMessages();
        unsubscribeQuizzes();
        if (teacherUnsubscribe) {
          teacherUnsubscribe();
        }
      };
    },
    async saveStudentAssignment(studentId, teacherId, actor) {
      if (!actor || !isAdminRole(actor.role)) {
        throw new Error("Sadece admin ogrenci atamasi yapabilir.");
      }

      const studentRef = doc(db, "users", studentId);
      const studentSnapshot = await getDoc(studentRef);
      if (!studentSnapshot.exists()) {
        throw new Error("Ogrenci kaydi bulunamadi.");
      }

      const normalizedTeacherRef = normalizeEmail(teacherId);
      let teacher = teacherId ? await fetchUserProfile(teacherId) : null;

      if (!teacher && normalizedTeacherRef) {
        const usersByEmail = await getDocs(query(collection(db, "users"), where("email", "==", normalizedTeacherRef)));
        teacher = usersByEmail.docs.map(mapUser).find((user) => isStaffRole(user.role)) || null;
      }

      if (!teacher && normalizedTeacherRef) {
        const approvedEmails = await this.listApprovedTeacherEmails();
        if (isApprovedTeacherEmailValue(normalizedTeacherRef, approvedEmails)) {
          teacher = {
            id: null,
            name: prettifyEmailName(normalizedTeacherRef) || "Ogretmen",
            email: normalizedTeacherRef,
            role: "teacher"
          };
        }
      }

      if (teacherId && !teacher) {
        throw new Error("Atanacak ogretmen bulunamadi.");
      }

      const batch = writeBatch(db);
      batch.update(studentRef, {
        assignedTeacherId: teacher?.id || null,
        assignedTeacherName: teacher?.name || "",
        assignedTeacherEmail: teacher?.email || "",
        updatedAt: serverTimestamp()
      });

      const [attemptsSnapshot, projectsSnapshot, messagesSnapshot] = await Promise.all([
        getDocs(query(collection(db, "attempts"), where("userId", "==", studentId))),
        getDocs(query(collection(db, "projects"), where("userId", "==", studentId))),
        getDocs(query(collection(db, "messages"), where("studentId", "==", studentId)))
      ]);

      attemptsSnapshot.docs.forEach((item) => {
        batch.update(item.ref, {
          teacherId: teacher?.id || null,
          teacherName: teacher?.name || "",
          teacherEmail: teacher?.email || ""
        });
      });

      projectsSnapshot.docs.forEach((item) => {
        batch.update(item.ref, {
          teacherId: teacher?.id || null,
          teacherName: teacher?.name || "",
          teacherEmail: teacher?.email || ""
        });
      });

      messagesSnapshot.docs.forEach((item) => {
        batch.update(item.ref, {
          teacherId: teacher?.id || null,
          teacherName: teacher?.name || "",
          teacherEmail: teacher?.email || ""
        });
      });

      await batch.commit();
    },
    async getManagementSnapshot(actor) {
      if (isAdminRole(actor.role)) {
        const [usersSnapshot, quizzesSnapshot, attemptsSnapshot, projectsSnapshot, messagesSnapshot, staffEmails] = await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(collection(db, "quizzes")),
          getDocs(collection(db, "attempts")),
          getDocs(collection(db, "projects")),
          getDocs(collection(db, "messages")),
          this.listApprovedTeacherEmails()
        ]);

        const users = usersSnapshot.docs.map(mapUser);
        return {
          approvedTeacherEmails: staffEmails,
          teachers: users.filter((user) => isStaffRole(user.role)).sort((left, right) => left.name.localeCompare(right.name, "tr")),
          students: users.filter((user) => user.role === "student").sort((left, right) => left.name.localeCompare(right.name, "tr")),
          quizzes: sortQuizzesNewestFirst(quizzesSnapshot.docs.map(mapQuiz)),
          attempts: sortAttemptsNewestFirst(attemptsSnapshot.docs.map(mapAttempt)),
          projects: sortProjectsNewestFirst(projectsSnapshot.docs.map(mapProject)),
          messages: sortMessagesOldestFirst(messagesSnapshot.docs.map(mapMessage))
        };
      }

      const [selfProfile, studentsSnapshot, quizzesSnapshot, attemptsSnapshot, projectsSnapshot, messagesSnapshot, staffEmails] = await Promise.all([
        fetchUserProfile(actor.id),
        getDocs(query(collection(db, "users"), where("assignedTeacherEmail", "==", normalizeEmail(actor.email)))),
        getDocs(query(collection(db, "quizzes"), where("createdBy", "==", actor.id))),
        getDocs(query(collection(db, "attempts"), where("teacherEmail", "==", normalizeEmail(actor.email)))),
        getDocs(query(collection(db, "projects"), where("teacherEmail", "==", normalizeEmail(actor.email)))),
        getDocs(query(collection(db, "messages"), where("teacherEmail", "==", normalizeEmail(actor.email)))),
        this.listApprovedTeacherEmails()
      ]);

      return {
        approvedTeacherEmails: staffEmails,
        teachers: selfProfile ? [selfProfile] : [],
        students: studentsSnapshot.docs.map(mapUser).sort((left, right) => left.name.localeCompare(right.name, "tr")),
        quizzes: sortQuizzesNewestFirst(quizzesSnapshot.docs.map(mapQuiz)),
        attempts: sortAttemptsNewestFirst(attemptsSnapshot.docs.map(mapAttempt)),
        projects: sortProjectsNewestFirst(projectsSnapshot.docs.map(mapProject)),
        messages: sortMessagesOldestFirst(messagesSnapshot.docs.map(mapMessage))
      };
    },
    subscribeManagementSnapshot(actor, callback, onError) {
      if (isAdminRole(actor.role)) {
        const cache = { users: null, quizzes: null, attempts: null, projects: null, messages: null, staffEmails: null };
        const publish = () => {
          if (!cache.users || !cache.staffEmails) {
            return;
          }
          const users = cache.users;
          callback({
            approvedTeacherEmails: getMergedApprovedTeacherEmails(cache.staffEmails),
            teachers: users.filter((user) => isStaffRole(user.role)).sort((left, right) => left.name.localeCompare(right.name, "tr")),
            students: users.filter((user) => user.role === "student").sort((left, right) => left.name.localeCompare(right.name, "tr")),
            quizzes: sortQuizzesNewestFirst(cache.quizzes || []),
            attempts: sortAttemptsNewestFirst(cache.attempts || []),
            projects: sortProjectsNewestFirst(cache.projects || []),
            messages: sortMessagesOldestFirst(cache.messages || [])
          });
        };

        const unsubscribeUsers = subscribeWorkspace(collection(db, "users"), mapUser, (items) => { cache.users = items; }, publish, onError);
        const unsubscribeStaffEmails = subscribeWorkspace(collection(db, "staffEmails"), (item) => normalizeEmail(item.id), (items) => { cache.staffEmails = items; }, publish, onError);
        const unsubscribeQuizzes = subscribeWorkspace(collection(db, "quizzes"), mapQuiz, (items) => { cache.quizzes = items; }, publish, onError);
        const unsubscribeAttempts = subscribeWorkspace(collection(db, "attempts"), mapAttempt, (items) => { cache.attempts = items; }, publish, onError);
        const unsubscribeProjects = subscribeWorkspace(collection(db, "projects"), mapProject, (items) => { cache.projects = items; }, publish, onError);
        const unsubscribeMessages = subscribeWorkspace(collection(db, "messages"), mapMessage, (items) => { cache.messages = items; }, publish, onError);

        return () => {
          unsubscribeUsers();
          unsubscribeStaffEmails();
          unsubscribeQuizzes();
          unsubscribeAttempts();
          unsubscribeProjects();
          unsubscribeMessages();
        };
      }

      const cache = { teacher: null, students: null, quizzes: null, attempts: null, projects: null, messages: null, staffEmails: null, teacherLoaded: false };
      const publish = () => {
        if (!cache.teacherLoaded || !cache.students || !cache.staffEmails) {
          return;
        }
        callback({
          approvedTeacherEmails: getMergedApprovedTeacherEmails(cache.staffEmails),
          teachers: cache.teacher ? [cache.teacher] : [],
          students: [...(cache.students || [])].sort((left, right) => left.name.localeCompare(right.name, "tr")),
          quizzes: sortQuizzesNewestFirst(cache.quizzes || []),
          attempts: sortAttemptsNewestFirst(cache.attempts || []),
          projects: sortProjectsNewestFirst(cache.projects || []),
          messages: sortMessagesOldestFirst(cache.messages || [])
        });
      };

      const unsubscribeTeacher = onSnapshot(
        doc(db, "users", actor.id),
        (snapshot) => {
          cache.teacher = snapshot.exists() ? mapUser(snapshot) : null;
          cache.teacherLoaded = true;
          publish();
        },
        onError
      );
      const unsubscribeStaffEmails = subscribeWorkspace(collection(db, "staffEmails"), (item) => normalizeEmail(item.id), (items) => { cache.staffEmails = items; }, publish, onError);

      const unsubscribeStudents = subscribeWorkspace(
        query(collection(db, "users"), where("assignedTeacherEmail", "==", normalizeEmail(actor.email))),
        mapUser,
        (items) => { cache.students = items; },
        publish,
        onError
      );

      const unsubscribeQuizzes = subscribeWorkspace(
        query(collection(db, "quizzes"), where("createdBy", "==", actor.id)),
        mapQuiz,
        (items) => { cache.quizzes = items; },
        publish,
        onError
      );

      const unsubscribeAttempts = subscribeWorkspace(
        query(collection(db, "attempts"), where("teacherEmail", "==", normalizeEmail(actor.email))),
        mapAttempt,
        (items) => { cache.attempts = items; },
        publish,
        onError
      );

      const unsubscribeProjects = subscribeWorkspace(
        query(collection(db, "projects"), where("teacherEmail", "==", normalizeEmail(actor.email))),
        mapProject,
        (items) => { cache.projects = items; },
        publish,
        onError
      );

      const unsubscribeMessages = subscribeWorkspace(
        query(collection(db, "messages"), where("teacherEmail", "==", normalizeEmail(actor.email))),
        mapMessage,
        (items) => { cache.messages = items; },
        publish,
        onError
      );

      return () => {
        unsubscribeTeacher();
        unsubscribeStaffEmails();
        unsubscribeStudents();
        unsubscribeQuizzes();
        unsubscribeAttempts();
        unsubscribeProjects();
        unsubscribeMessages();
      };
    }
  };
}

export async function createDataLayer() {
  return isFirebaseModeConfigured() ? buildFirebaseDataLayer() : buildLocalDataLayer();
}
