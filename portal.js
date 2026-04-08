import {
  createDataLayer,
  escapeHtml,
  formatDate,
  getApprovedTeacherEmails,
  getGoogleDriveUploadConfig,
  getModeLabel,
  getPortalMeta,
  isAdminRole,
  isFirebaseModeConfigured,
  isGoogleDriveUploadConfigured,
  isStaffRole,
  isTeacherRole
} from "./portal-data.js?v=20260407-6";

const state = {
  dataLayer: null,
  currentUser: null,
  managementSnapshot: null,
  managementSnapshotUnsubscribe: null,
  studentWorkspace: null,
  studentWorkspaceUnsubscribe: null,
  driveUploadBridgeBound: false,
  driveUploadBridge: null,
  teacherFilters: {
    search: "",
    className: "all",
    sort: "date_desc"
  },
  quizDraft: createEmptyQuizDraft()
};

const UPLOAD_CALLBACK_STORAGE_PREFIX = "algoritmaUploadCallback:";

function createEmptyQuestion() {
  return {
    prompt: "",
    options: ["", "", "", ""],
    correctIndex: 0,
    explanation: ""
  };
}

function createEmptyQuizDraft() {
  return {
    title: "",
    description: "",
    audience: "all_assigned",
    targetStudentIds: [],
    questions: [createEmptyQuestion()]
  };
}

function friendlyErrorMessage(error) {
  const text = String(error?.message || error || "");

  if (text.includes("CONFIGURATION_NOT_FOUND")) {
    return "Firebase Authentication henuz etkin degil. Authentication > Get started adimini tamamlayin.";
  }
  if (text.includes("auth/operation-not-allowed")) {
    return "Email/Password girisi Firebase Authentication icinde etkin degil.";
  }
  if (text.includes("auth/email-already-in-use")) {
    return "Bu e-posta zaten kayitli.";
  }
  if (text.includes("auth/invalid-credential") || text.includes("auth/wrong-password") || text.includes("auth/user-not-found")) {
    return "E-posta veya sifre hatali.";
  }
  if (text.includes("LOCAL_MODE_PASSWORD_RESET_NOT_AVAILABLE")) {
    return "Yerel modda sifre sifirlama linki yok. Bu ozellik Firebase modunda calisir.";
  }
  if (text.includes("UPLOAD_NOT_CONFIGURED")) {
    return "Google Drive yukleme koprusu henuz ayarlanmadi.";
  }
  if (text.includes("UPLOAD_POPUP_BLOCKED")) {
    return "Tarayici yukleme penceresini engelledi. Pop-up izni verip tekrar deneyin.";
  }
  if (text.includes("UPLOAD_CANCELLED")) {
    return "Yukleme penceresi kapatildi.";
  }

  return text || "Bilinmeyen hata";
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function roleLabel(role) {
  if (role === "admin") return "Admin";
  if (role === "teacher") return "Ogretmen";
  return "Ogrenci";
}

function roleDescription(role) {
  if (role === "admin") return "Tum sistemi gorur ve atama yapar.";
  if (role === "teacher") return "Yalnizca atanmis ogrencilerle calisir.";
  return "Kendi quiz, proje ve mesaj kayitlarini gorur.";
}

function prettifyEmailName(email) {
  const localPart = normalizeText(String(email || "").split("@")[0]) || "ogretmen";
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildAssignmentTargets(snapshot) {
  const byEmail = new Map();

  (snapshot.teachers || []).forEach((teacher) => {
    byEmail.set(normalizeText(teacher.email), {
      value: teacher.id || teacher.email,
      email: teacher.email,
      name: teacher.name,
      role: teacher.role,
      userId: teacher.id || null
    });
  });

  (snapshot.approvedTeacherEmails || []).forEach((email) => {
    const normalized = normalizeText(email);
    if (byEmail.has(normalized)) {
      return;
    }
    byEmail.set(normalized, {
      value: email,
      email,
      name: prettifyEmailName(email) || email,
      role: email === "kutluozgur79@gmail.com" ? "admin" : "teacher",
      userId: null
    });
  });

  return [...byEmail.values()].sort((left, right) => left.name.localeCompare(right.name, "tr"));
}

function applyStudentAssignmentToSnapshot(snapshot, studentId, teacher) {
  if (!snapshot) return;
  const teacherId = teacher?.id || null;
  const teacherName = teacher?.name || "";
  const teacherEmail = teacher?.email || "";

  (snapshot.students || []).forEach((student) => {
    if (student.id !== studentId) return;
    student.assignedTeacherId = teacherId;
    student.assignedTeacherName = teacherName;
    student.assignedTeacherEmail = teacherEmail;
  });

  (snapshot.attempts || []).forEach((attempt) => {
    if (attempt.userId !== studentId) return;
    attempt.teacherId = teacherId;
    attempt.teacherName = teacherName;
    attempt.teacherEmail = teacherEmail;
  });

  (snapshot.projects || []).forEach((project) => {
    if (project.userId !== studentId) return;
    project.teacherId = teacherId;
    project.teacherName = teacherName;
    project.teacherEmail = teacherEmail;
  });

  (snapshot.messages || []).forEach((message) => {
    if (message.studentId !== studentId) return;
    message.teacherId = teacherId;
    message.teacherName = teacherName;
    message.teacherEmail = teacherEmail;
  });
}

function clearTeacherAssignmentsInSnapshot(snapshot, teacherEmail) {
  if (!snapshot) return;
  const normalized = normalizeText(teacherEmail);
  if (!normalized) return;

  (snapshot.students || []).forEach((student) => {
    if (normalizeText(student.assignedTeacherEmail) !== normalized) return;
    student.assignedTeacherId = null;
    student.assignedTeacherName = "";
    student.assignedTeacherEmail = "";
  });

  (snapshot.attempts || []).forEach((attempt) => {
    if (normalizeText(attempt.teacherEmail) !== normalized) return;
    attempt.teacherId = null;
    attempt.teacherName = "";
    attempt.teacherEmail = "";
  });

  (snapshot.projects || []).forEach((project) => {
    if (normalizeText(project.teacherEmail) !== normalized) return;
    project.teacherId = null;
    project.teacherName = "";
    project.teacherEmail = "";
  });

  (snapshot.messages || []).forEach((message) => {
    if (normalizeText(message.teacherEmail) !== normalized) return;
    message.teacherId = null;
    message.teacherName = "";
    message.teacherEmail = "";
  });
}

function homePathForUser(user) {
  if (!user) return "giris.html";
  return isStaffRole(user.role) ? "ogretmen-paneli.html" : "mini-lab.html";
}

function nextStepLabel(user) {
  return isStaffRole(user.role) ? "Yonetim paneline git" : "Quiz merkezine git";
}

function renderRichText(value) {
  return escapeHtml(value).replaceAll("\n", "<br>");
}

function formatFileSize(bytes) {
  const size = Number(bytes || 0);
  if (!size) return "-";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getLatestDate(items, fieldName) {
  return [...items]
    .map((item) => item[fieldName])
    .filter(Boolean)
    .sort((left, right) => new Date(right) - new Date(left))[0] || null;
}

function toCsvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function renderSessionBadges() {
  document.querySelectorAll("[data-session-status]").forEach((node) => {
    node.innerHTML = "";
  });

  document.querySelectorAll("[data-header-session]").forEach((node) => {
    if (!state.currentUser) {
      node.innerHTML = `<a class="button button-secondary" href="giris.html">Giris Yap</a>`;
      return;
    }

    node.innerHTML = `
      <span class="status-pill">${escapeHtml(state.currentUser.name)} • ${roleLabel(state.currentUser.role)}</span>
      <button class="button button-secondary" type="button" data-logout-button>Cikis Yap</button>
    `;
    node.innerHTML = `
      <span class="status-pill">${escapeHtml(state.currentUser.name)} | ${roleLabel(state.currentUser.role)}</span>
      <button class="button button-secondary" type="button" data-logout-button>Cikis Yap</button>
    `;
  });

  document.querySelectorAll("[data-logout-button]").forEach((button) => {
    button.onclick = async () => {
      await state.dataLayer.logoutUser();
      window.location.href = "giris.html";
    };
  });
  return;

  const modeLabel = getModeLabel();

  document.querySelectorAll("[data-session-status]").forEach((node) => {
    if (!state.currentUser) {
      node.innerHTML = `
        <span class="status-pill">${modeLabel} mod</span>
        <span class="status-pill">Oturum yok</span>
        <a class="button button-secondary" href="giris.html">Giris Yap</a>
      `;
      return;
    }

    node.innerHTML = `
      <span class="status-pill">${modeLabel} mod</span>
      <span class="status-pill">${escapeHtml(state.currentUser.name)} • ${roleLabel(state.currentUser.role)}</span>
      <a class="button button-secondary" href="${homePathForUser(state.currentUser)}">${nextStepLabel(state.currentUser)}</a>
      <button class="button button-secondary" type="button" data-logout-button>Cikis Yap</button>
    `;
  });

  document.querySelectorAll("[data-logout-button]").forEach((button) => {
    button.onclick = async () => {
      await state.dataLayer.logoutUser();
      window.location.href = "giris.html";
    };
  });
}

function renderFirebaseSetupWarning() {
  const host = document.getElementById("firebase-warning");
  if (!host) return;
  host.innerHTML = "";
  return;

  if (!isFirebaseModeConfigured()) {
    host.innerHTML = `
      <div class="gate-card">
        <h2>Yerel mod aktif</h2>
        <p>Gercek cok kullanicili kullanim icin <code>portal-config.js</code> icindeki Firebase ayarlarini tamamlayin.</p>
      </div>
    `;
    return;
  }

  if (!isGoogleDriveUploadConfigured() && document.querySelector("[data-project-page]")) {
    const uploadConfig = getGoogleDriveUploadConfig();
    host.innerHTML = `
      <div class="gate-card">
        <h2>Drive yukleme koprusu bekliyor</h2>
        <p>Proje yukleme icin <strong>${escapeHtml(uploadConfig.folderName)}</strong> klasorune bagli Apps Script adresi tanimlanmali.</p>
      </div>
    `;
    return;
  }

  host.innerHTML = "";
}

function renderTeacherLoginNote() {
  const host = document.getElementById("teacher-login-note");
  if (!host) return;
  host.innerHTML = "";
  return;

  const portalMeta = getPortalMeta();
  const approvedEmails = getApprovedTeacherEmails();

  host.innerHTML = `
    <p><strong>Admin e-postasi:</strong> ${escapeHtml(portalMeta.adminEmail)}</p>
    <p><strong>Tanimli ogretmen e-postalari:</strong> ${approvedEmails.length ? approvedEmails.map(escapeHtml).join(", ") : "Henuz tanim yok"}</p>
    <p>Ogretmen ve admin rolleri e-posta listesine gore belirlenir. Ogrenci hesaplari normal kayit akisiyla olusturulur.</p>
    <p>Su an sistem <strong>${escapeHtml(getModeLabel())}</strong> modunda. Firebase modunda daha once kullandiginiz Firebase sifresi gecerlidir; eski yerel ogretmen sifresi gecmez.</p>
  `;
}

function bindDriveUploadBridge() {
  if (state.driveUploadBridgeBound) {
    return;
  }

  state.driveUploadBridgeBound = true;
  window.addEventListener("message", (event) => {
    const bridge = state.driveUploadBridge;
    if (!bridge || event.source !== bridge.popup) {
      return;
    }

    const data = event.data || {};
    if (data.requestId !== bridge.requestId) {
      return;
    }

    cleanupDriveUploadBridge();

    if (data.type === "google-drive-upload-complete") {
      bridge.resolve(data.payload || {});
      return;
    }

    bridge.reject(new Error(data.message || "UPLOAD_FAILED"));
  });
}

function cleanupDriveUploadBridge() {
  if (!state.driveUploadBridge) {
    return;
  }

  clearInterval(state.driveUploadBridge.pollTimer);
  clearTimeout(state.driveUploadBridge.timeoutTimer);
  state.driveUploadBridge = null;
}

function readUploadCallbackPayload(requestId) {
  try {
    const raw = localStorage.getItem(`${UPLOAD_CALLBACK_STORAGE_PREFIX}${requestId}`);
    if (!raw) {
      return null;
    }
    localStorage.removeItem(`${UPLOAD_CALLBACK_STORAGE_PREFIX}${requestId}`);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function openDriveUploadPopup() {
  if (!isGoogleDriveUploadConfigured()) {
    return Promise.reject(new Error("UPLOAD_NOT_CONFIGURED"));
  }

  if (!state.currentUser || state.currentUser.role !== "student") {
    return Promise.reject(new Error("Sadece ogrenci hesabi proje yukleyebilir."));
  }

  bindDriveUploadBridge();

  const uploadConfig = getGoogleDriveUploadConfig();
  const requestId = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const portalOrigin = window.location.origin && window.location.origin !== "null" ? window.location.origin : "";
  const params = new URLSearchParams({
    requestId,
    portalOrigin,
    studentId: state.currentUser.id,
    studentName: state.currentUser.name,
    className: state.currentUser.className,
    email: state.currentUser.email
  });
  const popupUrl = `${uploadConfig.webAppUrl}${uploadConfig.webAppUrl.includes("?") ? "&" : "?"}${params.toString()}`;
  const popup = window.open(popupUrl, "driveUploadWindow", "width=720,height=820,resizable=yes,scrollbars=yes");

  if (!popup) {
    return Promise.reject(new Error("UPLOAD_POPUP_BLOCKED"));
  }

  popup.focus();

  return new Promise((resolve, reject) => {
    const pollTimer = window.setInterval(() => {
      const callbackPayload = readUploadCallbackPayload(requestId);
      if (callbackPayload) {
        cleanupDriveUploadBridge();
        resolve(callbackPayload);
        return;
      }

      if (popup.closed) {
        cleanupDriveUploadBridge();
        reject(new Error("UPLOAD_CANCELLED"));
      }
    }, 600);

    const timeoutTimer = window.setTimeout(() => {
      cleanupDriveUploadBridge();
      reject(new Error("Yukleme zaman asimina ugradi."));
    }, 5 * 60 * 1000);

    state.driveUploadBridge = { requestId, popup, resolve, reject, pollTimer, timeoutTimer };
  });
}

function evaluateQuiz(quiz, formData) {
  const answers = (quiz.questions || []).map((question, index) => {
    const selectedValue = formData.get(`quiz-${quiz.id}-q-${index}`);
    const selectedIndex = selectedValue === null ? -1 : Number.parseInt(String(selectedValue), 10);
    const isCorrect = selectedIndex === question.correctIndex;

    return {
      prompt: question.prompt,
      selectedAnswer: selectedIndex >= 0 ? question.options[selectedIndex] : "Bos birakildi",
      correctAnswer: question.options[question.correctIndex],
      explanation: question.explanation,
      isCorrect
    };
  });

  const correctCount = answers.filter((answer) => answer.isCorrect).length;
  return {
    total: answers.length,
    score: Math.round((correctCount / answers.length) * 100),
    correctCount,
    wrongCount: answers.length - correctCount,
    answers
  };
}

function renderStudentAttempts(attempts) {
  const host = document.getElementById("student-attempts");
  if (!host) return;

  if (!attempts.length) {
    host.innerHTML = `<div class="empty-state">Henuz tamamlanmis bir quiz sonucu yok.</div>`;
    return;
  }

  host.innerHTML = attempts.map((attempt) => `
    <details class="attempt-card">
      <summary>
        <span>${escapeHtml(attempt.quizTitle || "Quiz")}</span>
        <strong>${attempt.correctCount}/${attempt.total} dogru</strong>
        <span>${attempt.score} puan • ${formatDate(attempt.createdAt)}</span>
      </summary>
      <ol class="results-list compact-list">
        ${(attempt.answers || []).map((answer, index) => `
          <li class="${answer.isCorrect ? "answer-correct" : "answer-wrong"}">
            <strong>${index + 1}. soru</strong> -
            Secilen: ${escapeHtml(answer.selectedAnswer)} -
            Dogru: ${escapeHtml(answer.correctAnswer)}
          </li>
        `).join("")}
      </ol>
    </details>
  `).join("");
}

function renderQuizQuestionList(quiz) {
  return (quiz.questions || []).map((question, index) => `
    <article class="question-card">
      <div class="question-header">
        <span class="question-count">Soru ${index + 1}</span>
        <h3>${escapeHtml(question.prompt)}</h3>
      </div>
      <div class="option-list">
        ${question.options.map((option, optionIndex) => `
          <label class="option-item">
            <input type="radio" name="quiz-${quiz.id}-q-${index}" value="${optionIndex}">
            <span>${escapeHtml(option)}</span>
          </label>
        `).join("")}
      </div>
      ${question.explanation ? `<p class="muted-text">Aciklama notu: ${escapeHtml(question.explanation)}</p>` : ""}
    </article>
  `).join("");
}

function renderStudentQuizStats(snapshot) {
  const host = document.getElementById("student-quiz-stats");
  if (!host) return;

  const attempts = snapshot.attempts || [];
  const quizzes = snapshot.quizzes || [];
  const bestScore = attempts.length ? Math.max(...attempts.map((attempt) => attempt.score)) : 0;

  host.innerHTML = `
    <article class="stat-card"><span>Atanan ogretmen</span><strong>${snapshot.teacher ? escapeHtml(snapshot.teacher.name) : "-"}</strong></article>
    <article class="stat-card"><span>Aktif quiz</span><strong>${quizzes.length}</strong></article>
    <article class="stat-card"><span>Tamamlanan quiz</span><strong>${attempts.length}</strong></article>
    <article class="stat-card"><span>En iyi puan</span><strong>${bestScore}</strong></article>
  `;
}

function renderStudentQuizOverview(snapshot) {
  const host = document.getElementById("student-quiz-overview");
  if (!host) return;

  host.innerHTML = snapshot.teacher
    ? `
      <div class="summary-card-grid">
        <article class="summary-card">
          <h3>${escapeHtml(snapshot.teacher.name)}</h3>
          <p>${escapeHtml(snapshot.teacher.email || "-")} • ${escapeHtml(snapshot.teacher.className || "-")}</p>
          <div class="summary-metrics">
            <span>${(snapshot.quizzes || []).length} quiz</span>
            <span>${(snapshot.attempts || []).length} sonuc</span>
            <span>${(snapshot.projects || []).length} proje</span>
          </div>
        </article>
      </div>
    `
    : `
      <div class="gate-card">
        <h2>Ogretmen atamasi yok</h2>
        <p>Atama olmasa da quiz ve proje ekranlarini kullanabilirsiniz.</p>
      </div>
    `;
}
function renderStudentQuizList(snapshot) {
  const host = document.getElementById("student-quiz-list");
  if (!host) return;

  const attemptMap = new Map();
  (snapshot.attempts || []).forEach((attempt) => {
    const items = attemptMap.get(attempt.quizId) || [];
    items.push(attempt);
    attemptMap.set(attempt.quizId, items.sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)));
  });

  const quizzes = snapshot.quizzes || [];
  if (!quizzes.length) {
    host.innerHTML = `<div class="empty-state">Size atanmis bir quiz bulunmuyor.</div>`;
    return;
  }

  host.innerHTML = quizzes.map((quiz) => {
    const attempts = attemptMap.get(quiz.id) || [];
    const latest = attempts[0];
    return `
      <details class="attempt-card quiz-assignment-card">
        <summary>
          <span>${escapeHtml(quiz.title)}</span>
          <strong>${latest ? `${latest.score} puan` : "Henuz cozulmedi"}</strong>
          <span>${attempts.length ? `${attempts.length} deneme` : `${quiz.questionCount} soru`}</span>
        </summary>
        <div class="quiz-card-body">
          ${quiz.description ? `<p>${renderRichText(quiz.description)}</p>` : `<p class="muted-text">Aciklama eklenmedi.</p>`}
          <div class="summary-metrics">
            <span>${quiz.questionCount} soru</span>
            <span>Olusturan: ${escapeHtml(quiz.createdByName || "-")}</span>
            <span>${latest ? `Son sonuc: ${latest.score}` : "Ilk deneme acik"}</span>
          </div>
          <form class="quiz-form" data-student-quiz-form="${escapeHtml(quiz.id)}">
            ${renderQuizQuestionList(quiz)}
            <div class="inline-actions">
              <button class="button button-primary" type="submit">Quiz gonder</button>
            </div>
            <p class="auth-message" data-quiz-status aria-live="polite"></p>
          </form>
        </div>
      </details>
    `;
  }).join("");
}

function buildQuizStatsById(snapshot) {
  const stats = new Map();

  (snapshot.quizzes || []).forEach((quiz) => {
    stats.set(quiz.id, {
      quiz,
      attempts: [],
      averageScore: 0
    });
  });

  (snapshot.attempts || []).forEach((attempt) => {
    const item = stats.get(attempt.quizId);
    if (!item) {
      return;
    }
    item.attempts.push(attempt);
  });

  stats.forEach((item) => {
    const totalScore = item.attempts.reduce((sum, attempt) => sum + attempt.score, 0);
    item.averageScore = item.attempts.length ? Math.round(totalScore / item.attempts.length) : 0;
  });

  return stats;
}

function renderStaffQuizStats(snapshot) {
  const host = document.getElementById("staff-quiz-stats");
  if (!host) return;

  const attempts = snapshot.attempts || [];
  const students = snapshot.students || [];
  const quizzes = snapshot.quizzes || [];
  const average = attempts.length ? Math.round(attempts.reduce((sum, attempt) => sum + attempt.score, 0) / attempts.length) : 0;

  host.innerHTML = `
    <article class="stat-card"><span>Gorunen ogrenci</span><strong>${students.length}</strong></article>
    <article class="stat-card"><span>Olusturulan quiz</span><strong>${quizzes.length}</strong></article>
    <article class="stat-card"><span>Toplam sonuc</span><strong>${attempts.length}</strong></article>
    <article class="stat-card"><span>Ortalama puan</span><strong>${average}</strong></article>
  `;
}

function getAvailableQuizStudents(snapshot) {
  return [...(snapshot?.students || [])].sort((left, right) => left.name.localeCompare(right.name, "tr"));
}

function getDraftAudienceOptions() {
  if (isAdminRole(state.currentUser?.role)) {
    return [
      { value: "all_students", label: "Tum ogrenciler" },
      { value: "selected_students", label: "Secili ogrenciler" }
    ];
  }
  return [
    { value: "all_assigned", label: "Atanmis tum ogrencilerim" },
    { value: "selected_students", label: "Secili ogrenciler" }
  ];
}

function renderQuizBuilder(snapshot) {
  const host = document.getElementById("quiz-builder-shell");
  if (!host) return;

  const students = getAvailableQuizStudents(snapshot);
  const audienceOptions = getDraftAudienceOptions();
  const allowedAudienceValues = new Set(audienceOptions.map((option) => option.value));
  if (!allowedAudienceValues.has(state.quizDraft.audience)) {
    state.quizDraft.audience = isAdminRole(state.currentUser?.role) ? "all_students" : "all_assigned";
  }
  const showSelection = state.quizDraft.audience === "selected_students";
  const availableStudentIds = new Set(students.map((student) => student.id));
  state.quizDraft.targetStudentIds = state.quizDraft.targetStudentIds.filter((id) => availableStudentIds.has(id));

  host.innerHTML = `
    <form id="quiz-builder-form" class="form-grid">
      <label class="field">
        <span>Quiz basligi</span>
        <input type="text" name="title" value="${escapeHtml(state.quizDraft.title)}" placeholder="Ornek: Proje Fikri ve Arastirma Hazirligi">
      </label>
      <label class="field">
        <span>Aciklama</span>
        <textarea name="description" class="message-textarea" placeholder="Quiz amacini ve beklentiyi yazin">${escapeHtml(state.quizDraft.description)}</textarea>
      </label>
      <label class="field">
        <span>Hedef ogrenci grubu</span>
        <select name="audience">
          ${audienceOptions.map((option) => `<option value="${option.value}" ${option.value === state.quizDraft.audience ? "selected" : ""}>${option.label}</option>`).join("")}
        </select>
      </label>
      ${showSelection ? `
        <div class="field">
          <span>Ogrenci secimi</span>
          <div class="check-grid">
            ${students.length ? students.map((student) => `
              <label class="check-item">
                <input type="checkbox" name="targetStudentIds" value="${escapeHtml(student.id)}" ${state.quizDraft.targetStudentIds.includes(student.id) ? "checked" : ""}>
                <span>${escapeHtml(student.name)} • ${escapeHtml(student.className || "-")}</span>
              </label>
            `).join("") : `<div class="empty-state">Secilebilecek ogrenci yok.</div>`}
          </div>
        </div>
      ` : `
        <div class="gate-card">
          <p>${students.length ? `${students.length} ogrenci secilen hedef gruba otomatik dahil edilecek.` : "Henuz quiz atanabilecek ogrenci yok."}</p>
        </div>
      `}
      <div class="quiz-editor-grid">
        ${state.quizDraft.questions.map((question, index) => `
          <article class="question-editor-card">
            <div class="question-editor-head">
              <h3>Soru ${index + 1}</h3>
              ${state.quizDraft.questions.length > 1 ? `<button class="button button-secondary" type="button" data-remove-question="${index}">Soruyu kaldir</button>` : ""}
            </div>
            <label class="field">
              <span>Soru metni</span>
              <input type="text" data-question-prompt="${index}" value="${escapeHtml(question.prompt)}" placeholder="Soru metni">
            </label>
            ${question.options.map((option, optionIndex) => `
              <label class="field">
                <span>Secenek ${optionIndex + 1}</span>
                <input type="text" data-question-option="${index}:${optionIndex}" value="${escapeHtml(option)}" placeholder="Secenek">
              </label>
            `).join("")}
            <label class="field">
              <span>Dogru secenek</span>
              <select data-question-correct="${index}">
                ${[0, 1, 2, 3].map((optionIndex) => `<option value="${optionIndex}" ${question.correctIndex === optionIndex ? "selected" : ""}>Secenek ${optionIndex + 1}</option>`).join("")}
              </select>
            </label>
            <label class="field">
              <span>Aciklama notu</span>
              <textarea data-question-explanation="${index}" class="message-textarea" placeholder="Istege bagli aciklama">${escapeHtml(question.explanation)}</textarea>
            </label>
          </article>
        `).join("")}
      </div>
      <div class="inline-actions">
        <button class="button button-secondary" type="button" id="quiz-add-question">Soru ekle</button>
        <button class="button button-primary" type="submit">Quizi yayinla</button>
      </div>
      <p class="auth-message" id="quiz-builder-message" aria-live="polite"></p>
    </form>
  `;
}

function renderStaffQuizList(snapshot) {
  const host = document.getElementById("staff-quiz-list");
  if (!host) return;

  const statsById = buildQuizStatsById(snapshot);
  if (!(snapshot.quizzes || []).length) {
    host.innerHTML = `<div class="empty-state">Henuz quiz olusturulmedi.</div>`;
    return;
  }

  host.innerHTML = (snapshot.quizzes || []).map((quiz) => {
    const stats = statsById.get(quiz.id);
    const lastAttempt = getLatestDate(stats?.attempts || [], "createdAt");
    return `
      <article class="project-card">
        <div class="project-head">
          <div>
            <h3>${escapeHtml(quiz.title)}</h3>
            <p>${escapeHtml(quiz.audienceLabel || "-")} • ${quiz.questionCount} soru • ${formatDate(quiz.createdAt)}</p>
          </div>
          <span class="status-pill">${stats?.attempts.length || 0} sonuc</span>
        </div>
        ${quiz.description ? `<p>${renderRichText(quiz.description)}</p>` : `<p class="muted-text">Aciklama eklenmedi.</p>`}
        <div class="summary-metrics">
          <span>Hedef ogrenci: ${(quiz.accessibleUserIds || []).length}</span>
          <span>Ortalama: ${stats?.averageScore || 0}</span>
          <span>${lastAttempt ? `Son teslim: ${formatDate(lastAttempt)}` : "Sonuc yok"}</span>
        </div>
      </article>
    `;
  }).join("");
}

function renderStaffQuizResults(snapshot) {
  const host = document.getElementById("staff-quiz-results");
  if (!host) return;

  const attempts = snapshot.attempts || [];
  if (!attempts.length) {
    host.innerHTML = `<div class="empty-state">Henuz quiz sonucu kaydedilmedi.</div>`;
    return;
  }

  host.innerHTML = `
    <div class="table-wrap">
      <table class="attempt-table">
        <thead>
          <tr><th>Quiz</th><th>Ogrenci</th><th>Sinif</th><th>Puan</th><th>Dogru</th><th>Tarih</th></tr>
        </thead>
        <tbody>
          ${attempts.map((attempt) => `
            <tr>
              <td>${escapeHtml(attempt.quizTitle || "-")}</td>
              <td>${escapeHtml(attempt.studentName || "-")}</td>
              <td>${escapeHtml(attempt.className || "-")}</td>
              <td>${attempt.score}</td>
              <td>${attempt.correctCount}/${attempt.total}</td>
              <td>${formatDate(attempt.createdAt)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderMessageThread(messages, viewerRole) {
  if (!messages.length) {
    return `<div class="empty-state">Henuz mesaj yok.</div>`;
  }

  return `
    <div class="chat-thread">
      ${messages.map((message) => {
        const ownRoles = viewerRole === "student" ? ["student"] : ["teacher", "admin"];
        const isOwn = ownRoles.includes(message.senderRole);
        return `
          <article class="chat-bubble ${isOwn ? "chat-bubble-self" : "chat-bubble-other"}">
            <div class="chat-meta">
              <strong>${escapeHtml(message.senderName)}</strong>
              <span>${escapeHtml(roleLabel(message.senderRole))} • ${formatDate(message.createdAt)}</span>
            </div>
            <p>${renderRichText(message.text)}</p>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function renderProjectCards(projects, viewerRole) {
  if (!projects.length) {
    return `<div class="empty-state">Henuz proje dosyasi yuklenmedi.</div>`;
  }

  return `
    <div class="project-list">
      ${projects.map((project) => `
        <article class="project-card">
          <div class="project-head">
            <div>
              <h3>${escapeHtml(project.title || project.driveFileName || "Proje dosyasi")}</h3>
              <p>${formatDate(project.uploadedAt)} • ${escapeHtml(project.driveFileName || "Dosya adi yok")} • ${escapeHtml(formatFileSize(project.size))}</p>
            </div>
            ${project.driveFileUrl ? `<a class="button button-secondary" href="${escapeHtml(project.driveFileUrl)}" target="_blank" rel="noopener noreferrer">Dosyayi ac</a>` : `<span class="status-pill">Kayit olustu</span>`}
          </div>
          ${project.description ? `<p>${renderRichText(project.description)}</p>` : `<p class="muted-text">Aciklama eklenmedi.</p>`}
          <div class="review-block">
            <h4>Ogretmen degerlendirmesi</h4>
            ${viewerRole === "student" ? (
              project.reviewText
                ? `<div class="review-display">${renderRichText(project.reviewText)}</div>
                   <p class="muted-text">${project.reviewUpdatedAt ? `Son guncelleme: ${formatDate(project.reviewUpdatedAt)}` : ""}</p>`
                : `<div class="empty-state">Henuz degerlendirme eklenmedi.</div>`
            ) : `
              <textarea class="review-textarea" data-review-input="${escapeHtml(project.id)}" placeholder="Degerlendirme yazin">${escapeHtml(project.reviewText || "")}</textarea>
              <div class="inline-actions">
                <button class="button button-primary" type="button" data-save-review-button="${escapeHtml(project.id)}">Kaydet</button>
                <span class="inline-note" data-review-status="${escapeHtml(project.id)}">${project.reviewUpdatedAt ? `Son guncelleme: ${formatDate(project.reviewUpdatedAt)}` : ""}</span>
              </div>
            `}
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function renderStudentProjectPage(snapshot) {
  const statsHost = document.getElementById("student-project-stats");
  const overviewHost = document.getElementById("student-project-overview");
  const uploadHost = document.getElementById("student-project-upload");
  const projectHost = document.getElementById("student-project-list");
  const messageHost = document.getElementById("student-message-thread");
  const uploadConfig = getGoogleDriveUploadConfig();

  if (statsHost) {
    statsHost.innerHTML = `
      <article class="stat-card"><span>Atanan ogretmen</span><strong>${snapshot.teacher ? escapeHtml(snapshot.teacher.name) : "-"}</strong></article>
      <article class="stat-card"><span>Yuklenen proje</span><strong>${(snapshot.projects || []).length}</strong></article>
      <article class="stat-card"><span>Mesaj</span><strong>${(snapshot.messages || []).length}</strong></article>
      <article class="stat-card"><span>Quiz sonucu</span><strong>${(snapshot.attempts || []).length}</strong></article>
    `;
  }

  if (overviewHost) {
    overviewHost.innerHTML = snapshot.teacher
      ? `
        <div class="summary-card-grid">
          <article class="summary-card">
            <h3>${escapeHtml(snapshot.teacher.name)}</h3>
            <p>${escapeHtml(snapshot.teacher.email || "-")} • ${escapeHtml(snapshot.teacher.className || "-")}</p>
            <div class="summary-metrics">
              <span>${(snapshot.projects || []).length} proje</span>
              <span>${(snapshot.messages || []).length} mesaj</span>
              <span>${(snapshot.quizzes || []).length} quiz</span>
            </div>
          </article>
        </div>
      `
      : `<div class="gate-card"><h2>Ogretmen atamasi yok</h2><p>Atama olmasa da proje yukleme ve mesajlasma kullanilabilir.</p></div>`;
  }

  if (uploadHost) {
    uploadHost.innerHTML = isGoogleDriveUploadConfigured()
      ? `
        <div class="project-upload-card">
          <p>Dosyalar <strong>${escapeHtml(uploadConfig.folderName)}</strong> klasorune yuklenir ve portala kaydedilir.</p>
          <div class="inline-actions">
            <button class="button button-primary" type="button" id="student-drive-upload-button">Proje dosyasi yukle</button>
          </div>
          <p class="auth-message" id="student-project-message" aria-live="polite"></p>
        </div>
      `
      : `<div class="empty-state">Drive yukleme koprusu henuz tanimli degil.</div>`;
  }

  if (projectHost) {
    projectHost.innerHTML = renderProjectCards(snapshot.projects || [], "student");
  }

  if (messageHost) {
    messageHost.innerHTML = `
      ${renderMessageThread(snapshot.messages || [], "student")}
      <form id="student-message-form" class="message-form">
        <label class="field">
          <span>Mesaj gonder</span>
          <textarea name="text" class="message-textarea" placeholder="Mesajinizi yazin"></textarea>
        </label>
        <div class="inline-actions">
          <button class="button button-primary" type="submit">Mesaj gonder</button>
        </div>
        <p class="auth-message" id="student-message-status" aria-live="polite"></p>
      </form>
    `;
  }

  bindStudentProjectActions();
}

function buildProjectWorkspaceRows(snapshot) {
  const projectMap = new Map();
  const messageMap = new Map();

  (snapshot.projects || []).forEach((project) => {
    const items = projectMap.get(project.userId) || [];
    items.push(project);
    projectMap.set(project.userId, items.sort((left, right) => new Date(right.uploadedAt) - new Date(left.uploadedAt)));
  });

  (snapshot.messages || []).forEach((message) => {
    const items = messageMap.get(message.studentId) || [];
    items.push(message);
    messageMap.set(message.studentId, items.sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt)));
  });

  return (snapshot.students || []).map((student) => ({
    student,
    projects: projectMap.get(student.id) || [],
    messages: messageMap.get(student.id) || []
  }));
}

function renderStaffProjectPage(snapshot, { messageOnly = false } = {}) {
  const statsHost = document.getElementById("project-staff-stats");
  const workspaceHost = document.getElementById("project-staff-workspace");

  if (statsHost) {
    const reviewedCount = (snapshot.projects || []).filter((project) => project.reviewText).length;
    statsHost.innerHTML = `
      <article class="stat-card"><span>Gorunen ogrenci</span><strong>${(snapshot.students || []).length}</strong></article>
      <article class="stat-card"><span>Yuklenen proje</span><strong>${(snapshot.projects || []).length}</strong></article>
      <article class="stat-card"><span>Degerlendirilen</span><strong>${reviewedCount}</strong></article>
      <article class="stat-card"><span>Toplam mesaj</span><strong>${(snapshot.messages || []).length}</strong></article>
    `;
  }

  if (!workspaceHost) return;

  const rows = buildProjectWorkspaceRows(snapshot);
  if (!rows.length) {
    workspaceHost.innerHTML = `<div class="empty-state">Henuz gorunur ogrenci bulunmuyor.</div>`;
    return;
  }

  workspaceHost.innerHTML = rows.map(({ student, projects, messages }) => `
    <details class="attempt-card teacher-student-card">
      <summary>
        <span>${escapeHtml(student.name)} • ${escapeHtml(student.className || "-")}</span>
        <strong>${projects.length} proje</strong>
        <span>${messages.length} mesaj</span>
      </summary>
      <div class="teacher-student-content">
        ${messageOnly ? `
          <section class="teacher-student-column">
            <h3>Mesajlasma</h3>
            ${renderMessageThread(messages, "staff")}
            <form class="message-form" data-teacher-message-form="${escapeHtml(student.id)}">
              <label class="field">
                <span>${escapeHtml(student.name)} icin mesaj</span>
                <textarea name="text" class="message-textarea" placeholder="Mesajinizi yazin"></textarea>
              </label>
              <div class="inline-actions">
                <button class="button button-primary" type="submit">Mesaj gonder</button>
              </div>
              <p class="auth-message" data-message-status aria-live="polite"></p>
            </form>
          </section>
        ` : `
          <section class="teacher-student-column">
            <div class="student-mini-meta">
              <span class="status-pill">${escapeHtml(student.email || "-")}</span>
              <span class="status-pill">${student.assignedTeacherName ? escapeHtml(student.assignedTeacherName) : "Atama yok"}</span>
            </div>
            ${renderProjectCards(projects, "staff")}
          </section>
        `}
      </div>
    </details>
  `).join("");

  bindStaffProjectActions();
}

async function loadStudentWorkspace(callback, onError) {
  if (state.studentWorkspaceUnsubscribe) {
    state.studentWorkspaceUnsubscribe();
    state.studentWorkspaceUnsubscribe = null;
  }

  try {
    state.studentWorkspace = await state.dataLayer.getStudentWorkspace(state.currentUser.id);
    callback(state.studentWorkspace);
  } catch (error) {
    onError?.(error);
  }

  state.studentWorkspaceUnsubscribe = state.dataLayer.subscribeStudentWorkspace(
    state.currentUser.id,
    (snapshot) => {
      state.studentWorkspace = snapshot;
      callback(snapshot);
    },
    (error) => onError?.(error)
  );
}

async function loadManagementSnapshot(callback, onError) {
  if (state.managementSnapshotUnsubscribe) {
    state.managementSnapshotUnsubscribe();
    state.managementSnapshotUnsubscribe = null;
  }

  try {
    state.managementSnapshot = await state.dataLayer.getManagementSnapshot(state.currentUser);
    callback(state.managementSnapshot);
  } catch (error) {
    onError?.(error);
  }

  state.managementSnapshotUnsubscribe = state.dataLayer.subscribeManagementSnapshot(
    state.currentUser,
    (snapshot) => {
      state.managementSnapshot = snapshot;
      callback(snapshot);
    },
    (error) => onError?.(error)
  );
}

function bindLoginPage() {
  if (!document.querySelector("[data-login-page]")) return;

  renderTeacherLoginNote();

  const loginForm = document.getElementById("login-form");
  const forgotPasswordForm = document.getElementById("forgot-password-form");
  const registerForm = document.getElementById("register-form");
  const loginMessage = document.getElementById("login-message");
  const forgotPasswordMessage = document.getElementById("forgot-password-message");
  const registerMessage = document.getElementById("register-message");
  const activeSession = document.getElementById("active-session");
  const tabButtons = document.querySelectorAll("[data-auth-tab]");
  const tabPanels = document.querySelectorAll("[data-auth-panel]");

  if (tabButtons.length && tabPanels.length) {
    const setActiveTab = (tabId) => {
      tabButtons.forEach((button) => {
        button.classList.toggle("active", button.getAttribute("data-auth-tab") === tabId);
      });
      tabPanels.forEach((panel) => {
        panel.hidden = panel.getAttribute("data-auth-panel") !== tabId;
      });
    };

    tabButtons.forEach((button) => {
      if (button.dataset.bound) return;
      button.dataset.bound = "true";
      button.addEventListener("click", () => setActiveTab(button.getAttribute("data-auth-tab")));
    });

    setActiveTab("login");
  }

  if (state.currentUser && activeSession) {
    activeSession.innerHTML = `
      <div class="auth-message success-message">Acik oturum: <strong>${escapeHtml(state.currentUser.name)}</strong> - ${escapeHtml(roleLabel(state.currentUser.role))}</div>
    `;
  }

  if (loginForm && !loginForm.dataset.bound) {
    loginForm.dataset.bound = "true";
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      loginMessage.textContent = "";
      const formData = new FormData(loginForm);
      try {
        state.currentUser = await state.dataLayer.loginUser(formData.get("email"), formData.get("password"));
        window.location.href = homePathForUser(state.currentUser);
      } catch (error) {
        loginMessage.textContent = friendlyErrorMessage(error);
      }
    });
  }

  if (forgotPasswordForm && !forgotPasswordForm.dataset.bound) {
    forgotPasswordForm.dataset.bound = "true";
    forgotPasswordForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (forgotPasswordMessage) forgotPasswordMessage.textContent = "";
      const formData = new FormData(forgotPasswordForm);
      const email = String(formData.get("email") || "").trim();

      if (!email) {
        if (forgotPasswordMessage) forgotPasswordMessage.textContent = "Lutfen e-posta adresinizi girin.";
        return;
      }

      try {
        await state.dataLayer.sendPasswordResetEmail(email);
        if (forgotPasswordMessage) forgotPasswordMessage.textContent = "Sifre sifirlama linki gonderildi.";
        forgotPasswordForm.reset();
      } catch (error) {
        if (forgotPasswordMessage) forgotPasswordMessage.textContent = friendlyErrorMessage(error);
      }
    });
  }

  if (registerForm && !registerForm.dataset.bound) {
    registerForm.dataset.bound = "true";
    registerForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      registerMessage.textContent = "";
      const formData = new FormData(registerForm);
      const payload = {
        name: String(formData.get("name") || "").trim(),
        className: String(formData.get("className") || "").trim(),
        email: String(formData.get("email") || "").trim(),
        password: String(formData.get("password") || "").trim()
      };

      if (!payload.name || !payload.email || !payload.password) {
        registerMessage.textContent = "Lutfen tum alanlari doldurun.";
        return;
      }

      if (isFirebaseModeConfigured() && payload.password.length < 6) {
        registerMessage.textContent = "Firebase modunda sifre en az 6 karakter olmali.";
        return;
      }

      if (!isFirebaseModeConfigured() && payload.password.length < 4) {
        registerMessage.textContent = "Yerel modda sifre en az 4 karakter olmali.";
        return;
      }

      try {
        state.currentUser = await state.dataLayer.registerUser(payload);
        window.location.href = homePathForUser(state.currentUser);
      } catch (error) {
        registerMessage.textContent = friendlyErrorMessage(error);
      }
    });
  }
}

function bindStudentQuizActions() {
  const host = document.getElementById("student-quiz-list");
  if (!host || host.dataset.bound) return;
  host.dataset.bound = "true";

  host.addEventListener("submit", async (event) => {
    const form = event.target.closest("[data-student-quiz-form]");
    if (!form) return;
    event.preventDefault();

    const quizId = form.getAttribute("data-student-quiz-form");
    const status = form.querySelector("[data-quiz-status]");
    const quiz = (state.studentWorkspace?.quizzes || []).find((item) => item.id === quizId);
    if (!quiz) return;

    const formData = new FormData(form);
    const answeredCount = (quiz.questions || []).filter((_, index) => formData.get(`quiz-${quiz.id}-q-${index}`) !== null).length;
    if (answeredCount !== (quiz.questions || []).length) {
      if (status) status.textContent = "Lutfen tum sorulari cevaplayin.";
      return;
    }

    if (status) status.textContent = "Kaydediliyor...";

    try {
      const result = evaluateQuiz(quiz, formData);
      await state.dataLayer.saveAttempt(state.currentUser, quiz, result);
      if (status) status.textContent = `${result.score} puan ile kaydedildi.`;
      await loadStudentWorkspace((snapshot) => {
        renderStudentQuizStats(snapshot);
        renderStudentQuizOverview(snapshot);
        renderStudentQuizList(snapshot);
        renderStudentAttempts(snapshot.attempts || []);
      });
    } catch (error) {
      if (status) status.textContent = friendlyErrorMessage(error);
    }
  });
}

function bindQuizBuilder() {
  const host = document.getElementById("quiz-builder-shell");
  if (!host || host.dataset.bound) return;
  host.dataset.bound = "true";

  host.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.matches('input[name="title"]')) {
      state.quizDraft.title = target.value;
    } else if (target.matches('textarea[name="description"]')) {
      state.quizDraft.description = target.value;
    } else if (target.hasAttribute("data-question-prompt")) {
      const index = Number.parseInt(target.getAttribute("data-question-prompt"), 10);
      state.quizDraft.questions[index].prompt = target.value;
    } else if (target.hasAttribute("data-question-option")) {
      const [questionIndex, optionIndex] = String(target.getAttribute("data-question-option")).split(":").map((value) => Number.parseInt(value, 10));
      state.quizDraft.questions[questionIndex].options[optionIndex] = target.value;
    } else if (target.hasAttribute("data-question-explanation")) {
      const index = Number.parseInt(target.getAttribute("data-question-explanation"), 10);
      state.quizDraft.questions[index].explanation = target.value;
    }
  });

  host.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.matches('select[name="audience"]')) {
      state.quizDraft.audience = target.value;
      renderQuizBuilder(state.managementSnapshot);
      return;
    }

    if (target.hasAttribute("data-question-correct")) {
      const index = Number.parseInt(target.getAttribute("data-question-correct"), 10);
      state.quizDraft.questions[index].correctIndex = Number.parseInt(target.value, 10);
      return;
    }

    if (target.matches('input[name="targetStudentIds"]')) {
      const checked = host.querySelectorAll('input[name="targetStudentIds"]:checked');
      state.quizDraft.targetStudentIds = [...checked].map((item) => item.value);
    }
  });

  host.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    if (button.id === "quiz-add-question") {
      state.quizDraft.questions.push(createEmptyQuestion());
      renderQuizBuilder(state.managementSnapshot);
      return;
    }

    const removeIndex = button.getAttribute("data-remove-question");
    if (removeIndex !== null) {
      state.quizDraft.questions.splice(Number.parseInt(removeIndex, 10), 1);
      renderQuizBuilder(state.managementSnapshot);
    }
  });

  host.addEventListener("submit", async (event) => {
    const form = event.target.closest("#quiz-builder-form");
    if (!form) return;
    event.preventDefault();

    const message = document.getElementById("quiz-builder-message");
    const students = getAvailableQuizStudents(state.managementSnapshot);
    const accessibleUserIds = state.quizDraft.audience === "selected_students"
      ? state.quizDraft.targetStudentIds
      : students.map((student) => student.id);
    const audienceLabel = state.quizDraft.audience === "selected_students"
      ? `${accessibleUserIds.length} secili ogrenci`
      : isAdminRole(state.currentUser.role) ? "Tum ogrenciler" : "Atanmis tum ogrenciler";

    if (message) message.textContent = "Kaydediliyor...";

    try {
      await state.dataLayer.saveQuiz(state.currentUser, {
        title: state.quizDraft.title,
        description: state.quizDraft.description,
        audienceLabel,
        accessibleUserIds,
        questions: state.quizDraft.questions
      });
      state.quizDraft = createEmptyQuizDraft();
      if (!isAdminRole(state.currentUser.role)) {
        state.quizDraft.audience = "all_assigned";
      }
      await loadManagementSnapshot((snapshot) => {
        renderStaffQuizStats(snapshot);
        renderQuizBuilder(snapshot);
        renderStaffQuizList(snapshot);
        renderStaffQuizResults(snapshot);
      });
      const refreshedMessage = document.getElementById("quiz-builder-message");
      if (refreshedMessage) refreshedMessage.textContent = "Quiz basariyla yayina alindi.";
    } catch (error) {
      if (message) message.textContent = friendlyErrorMessage(error);
    }
  });
}

function bindStudentProjectActions() {
  const uploadButton = document.getElementById("student-drive-upload-button");
  const uploadMessage = document.getElementById("student-project-message");
  const messageForm = document.getElementById("student-message-form");
  const messageStatus = document.getElementById("student-message-status");

  if (uploadButton && !uploadButton.dataset.bound) {
    uploadButton.dataset.bound = "true";
    uploadButton.addEventListener("click", async () => {
      uploadButton.disabled = true;
      if (uploadMessage) uploadMessage.textContent = "Yukleme penceresi aciliyor...";
      try {
        const projectPayload = await openDriveUploadPopup();
        if (uploadMessage) uploadMessage.textContent = "Drive kaydi olusturuluyor...";
        await state.dataLayer.saveProjectRecord(state.currentUser, projectPayload);
        await loadStudentWorkspace(renderStudentProjectPage);
        if (uploadMessage) uploadMessage.textContent = "Proje basariyla kaydedildi.";
      } catch (error) {
        if (uploadMessage) uploadMessage.textContent = friendlyErrorMessage(error);
      } finally {
        uploadButton.disabled = false;
      }
    });
  }

  if (messageForm && !messageForm.dataset.bound) {
    messageForm.dataset.bound = "true";
    messageForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(messageForm);
      const text = String(formData.get("text") || "").trim();
      if (!text) {
        if (messageStatus) messageStatus.textContent = "Mesaj bos olamaz.";
        return;
      }

      if (messageStatus) messageStatus.textContent = "Gonderiliyor...";
      try {
        await state.dataLayer.sendMessage({
          studentId: state.currentUser.id,
          text,
          sender: state.currentUser
        });
        messageForm.reset();
        await loadStudentWorkspace(renderStudentProjectPage);
      } catch (error) {
        if (messageStatus) messageStatus.textContent = friendlyErrorMessage(error);
      }
    });
  }
}

function bindStaffProjectActions() {
  const host = document.getElementById("project-staff-workspace");
  if (!host || host.dataset.bound) return;
  host.dataset.bound = "true";

  host.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-save-review-button]");
    if (!button) return;

    const projectId = button.getAttribute("data-save-review-button");
    const input = host.querySelector(`[data-review-input="${projectId}"]`);
    const status = host.querySelector(`[data-review-status="${projectId}"]`);
    button.disabled = true;
    if (status) status.textContent = "Kaydediliyor...";

    try {
      await state.dataLayer.saveProjectReview(projectId, input?.value || "", state.currentUser);
      await loadManagementSnapshot(renderStaffProjectPage);
      const refreshedStatus = host.querySelector(`[data-review-status="${projectId}"]`);
      if (refreshedStatus) refreshedStatus.textContent = "Kaydedildi.";
    } catch (error) {
      if (status) status.textContent = friendlyErrorMessage(error);
    } finally {
      button.disabled = false;
    }
  });

  host.addEventListener("submit", async (event) => {
    const form = event.target.closest("[data-teacher-message-form]");
    if (!form) return;
    event.preventDefault();

    const studentId = form.getAttribute("data-teacher-message-form");
    const status = form.querySelector("[data-message-status]");
    const formData = new FormData(form);
    const text = String(formData.get("text") || "").trim();

    if (!text) {
      if (status) status.textContent = "Mesaj bos olamaz.";
      return;
    }

    if (status) status.textContent = "Gonderiliyor...";

    try {
      await state.dataLayer.sendMessage({
        studentId,
        text,
        sender: state.currentUser
      });
      form.reset();
      await loadManagementSnapshot(renderStaffProjectPage);
    } catch (error) {
      if (status) status.textContent = friendlyErrorMessage(error);
    }
  });
}

function getFilteredStudents(snapshot) {
  const search = normalizeText(state.teacherFilters.search);
  const className = state.teacherFilters.className;

  return [...(snapshot.students || [])].filter((student) => {
    const matchesClass = className === "all" || normalizeText(student.className) === normalizeText(className);
    if (!matchesClass) return false;
    if (!search) return true;
    const haystack = [student.name, student.className, student.email].map(normalizeText).join(" ");
    return haystack.includes(search);
  });
}

function buildStudentManagementRows(snapshot) {
  const students = getFilteredStudents(snapshot);
  const studentIds = new Set(students.map((student) => student.id));

  const attemptMap = new Map();
  (snapshot.attempts || []).filter((attempt) => studentIds.has(attempt.userId)).forEach((attempt) => {
    const list = attemptMap.get(attempt.userId) || [];
    list.push(attempt);
    attemptMap.set(attempt.userId, list);
  });

  const projectMap = new Map();
  (snapshot.projects || []).filter((project) => studentIds.has(project.userId)).forEach((project) => {
    const list = projectMap.get(project.userId) || [];
    list.push(project);
    projectMap.set(project.userId, list);
  });

  const messageMap = new Map();
  (snapshot.messages || []).filter((message) => studentIds.has(message.studentId)).forEach((message) => {
    const list = messageMap.get(message.studentId) || [];
    list.push(message);
    messageMap.set(message.studentId, list);
  });

  return students.map((student) => {
    const attempts = (attemptMap.get(student.id) || []).sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
    const projects = (projectMap.get(student.id) || []).sort((left, right) => new Date(right.uploadedAt) - new Date(left.uploadedAt));
    const messages = (messageMap.get(student.id) || []).sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
    const averageScore = attempts.length ? Math.round(attempts.reduce((sum, item) => sum + item.score, 0) / attempts.length) : 0;
    const latestActivityAt = getLatestDate([...attempts, ...projects.map((project) => ({ createdAt: project.uploadedAt })), ...messages], "createdAt");
    return { student, attempts, projects, messages, averageScore, latestActivityAt };
  }).sort((left, right) => {
    if (state.teacherFilters.sort === "name_asc") {
      return left.student.name.localeCompare(right.student.name, "tr");
    }
    if (state.teacherFilters.sort === "score_desc") {
      return right.averageScore - left.averageScore;
    }
    if (state.teacherFilters.sort === "score_asc") {
      return left.averageScore - right.averageScore;
    }
    return new Date(right.latestActivityAt || 0) - new Date(left.latestActivityAt || 0);
  });
}

function renderManagementDashboard(snapshot) {
  state.managementSnapshot = snapshot;
  const rows = buildStudentManagementRows(snapshot);
  const assignmentTargets = buildAssignmentTargets(snapshot);
  const attempts = rows.flatMap((row) => row.attempts);
  const projects = rows.flatMap((row) => row.projects);
  const messages = rows.flatMap((row) => row.messages);
  const averageScore = attempts.length ? Math.round(attempts.reduce((sum, attempt) => sum + attempt.score, 0) / attempts.length) : 0;

  document.getElementById("teacher-stats").innerHTML = `
    <article class="stat-card"><span>Gorunen ogrenci</span><strong>${rows.length}</strong></article>
    <article class="stat-card"><span>Quiz</span><strong>${(snapshot.quizzes || []).length}</strong></article>
    <article class="stat-card"><span>Quiz sonucu</span><strong>${attempts.length}</strong></article>
    <article class="stat-card"><span>Proje</span><strong>${projects.length}</strong></article>
    <article class="stat-card"><span>Mesaj</span><strong>${messages.length}</strong></article>
    <article class="stat-card"><span>Ortalama puan</span><strong>${averageScore}</strong></article>
  `;

  const classFilter = document.getElementById("teacher-class-filter");
  const classNames = [...new Set((snapshot.students || []).map((student) => student.className).filter(Boolean))].sort((left, right) => left.localeCompare(right, "tr"));
  if (classFilter) {
    classFilter.innerHTML = `<option value="all">Tum siniflar</option>${classNames.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("")}`;
    classFilter.value = classNames.includes(state.teacherFilters.className) ? state.teacherFilters.className : "all";
  }

  const summaryHost = document.getElementById("teacher-filter-summary");
  if (summaryHost) {
    summaryHost.textContent = `${rows.length} ogrenci • ${attempts.length} quiz sonucu • ${projects.length} proje • ${messages.length} mesaj`;
  }

  const directoryHost = document.getElementById("teacher-directory");
  if (directoryHost) {
    const directoryCard = directoryHost.closest(".lab-card");
    if (directoryCard) {
      directoryCard.hidden = !isAdminRole(state.currentUser.role);
    }
  }
  if (directoryHost && isAdminRole(state.currentUser.role)) {
    directoryHost.innerHTML = assignmentTargets.length
      ? `
        <div class="summary-card-grid">
          ${assignmentTargets.map((teacher) => {
            const assignedCount = (snapshot.students || []).filter((student) =>
              student.assignedTeacherId === teacher.userId ||
              normalizeText(student.assignedTeacherEmail) === normalizeText(teacher.email)
            ).length;
            return `
              <article class="summary-card">
                <h3>${escapeHtml(teacher.name)}</h3>
                <p>${escapeHtml(roleLabel(teacher.role))} • ${escapeHtml(teacher.email || "-")}</p>
                <div class="summary-metrics">
                  <span>${assignedCount} ogrenci</span>
                  <span>${escapeHtml(roleDescription(teacher.role))}</span>
                </div>
              </article>
            `;
          }).join("")}
        </div>
      `
      : `<div class="empty-state">Goruntulenecek ogretmen yok.</div>`;
  }

  const summaryCardsHost = document.getElementById("teacher-student-summary");
  if (summaryCardsHost) {
    summaryCardsHost.innerHTML = rows.length
      ? rows.map((row) => `
        <article class="summary-card">
          <h3>${escapeHtml(row.student.name)}</h3>
          <p>${escapeHtml(row.student.className || "-")} • ${escapeHtml(row.student.email || "-")}</p>
          <div class="summary-metrics">
            <span>${row.attempts.length} sonuc</span>
            <span>${row.projects.length} proje</span>
            <span>${row.messages.length} mesaj</span>
            <span>Ort. ${row.averageScore}</span>
          </div>
        </article>
      `).join("")
      : `<div class="empty-state">Filtrelerde ogrenci bulunamadi.</div>`;
  }

  const tableHost = document.getElementById("teacher-table");
  if (tableHost) {
    tableHost.innerHTML = attempts.length
      ? `
        <div class="table-wrap">
          <table class="attempt-table">
            <thead><tr><th>Quiz</th><th>Ogrenci</th><th>Sinif</th><th>Puan</th><th>Dogru</th><th>Tarih</th></tr></thead>
            <tbody>
              ${attempts.map((attempt) => `
                <tr>
                  <td>${escapeHtml(attempt.quizTitle || "-")}</td>
                  <td>${escapeHtml(attempt.studentName || "-")}</td>
                  <td>${escapeHtml(attempt.className || "-")}</td>
                  <td>${attempt.score}</td>
                  <td>${attempt.correctCount}/${attempt.total}</td>
                  <td>${formatDate(attempt.createdAt)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `
      : `<div class="empty-state">Filtrelerde quiz sonucu bulunamadi.</div>`;
  }

  const analysisHost = document.getElementById("teacher-question-analysis");
  if (analysisHost) {
    const reviewedCount = projects.filter((project) => project.reviewText).length;
    analysisHost.innerHTML = `
      <div class="summary-card-grid">
        <article class="summary-card"><h3>Quiz dagilimi</h3><p>${(snapshot.quizzes || []).length} quiz • ${attempts.length} sonuc</p></article>
        <article class="summary-card"><h3>Proje durumu</h3><p>${projects.length} proje • ${reviewedCount} degerlendirme</p></article>
        <article class="summary-card"><h3>Mesaj trafigi</h3><p>${messages.length} mesaj • ${rows.filter((row) => row.messages.length).length} aktif thread</p></article>
      </div>
    `;
  }

  const detailHost = document.getElementById("teacher-details");
  if (detailHost) {
    detailHost.innerHTML = rows.length
      ? rows.map((row) => `
        <details class="attempt-card">
          <summary>
            <span>${escapeHtml(row.student.name)} • ${escapeHtml(row.student.className || "-")}</span>
            <strong>${row.projects.length} proje</strong>
            <span>${row.messages.length} mesaj • Ort. ${row.averageScore}</span>
          </summary>
          <div class="summary-card-grid detail-grid">
            <article class="summary-card"><h3>Atama</h3><p>${row.student.assignedTeacherName ? escapeHtml(row.student.assignedTeacherName) : "Atama yok"}</p></article>
            <article class="summary-card"><h3>Son quiz</h3><p>${row.attempts[0] ? `${escapeHtml(row.attempts[0].quizTitle || "-")} • ${row.attempts[0].score} puan` : "Kayit yok"}</p></article>
            <article class="summary-card"><h3>Son proje</h3><p>${row.projects[0] ? `${escapeHtml(row.projects[0].title || row.projects[0].driveFileName || "-")} • ${formatDate(row.projects[0].uploadedAt)}` : "Kayit yok"}</p></article>
            <article class="summary-card"><h3>Son mesaj</h3><p>${row.messages[0] ? `${escapeHtml(row.messages[0].senderName)} • ${formatDate(row.messages[0].createdAt)}` : "Kayit yok"}</p></article>
          </div>
        </details>
      `).join("")
      : `<div class="empty-state">Detay gosterilecek ogrenci bulunamadi.</div>`;
  }

  const adminSection = document.getElementById("admin-assignment-section");
  if (adminSection) adminSection.hidden = !isAdminRole(state.currentUser.role);

  const assignmentHost = document.getElementById("assignment-board");
  if (assignmentHost && isAdminRole(state.currentUser.role)) {
    assignmentHost.innerHTML = rows.length
      ? rows.map((row) => `
        <div class="assignment-row">
          <div>
            <strong>${escapeHtml(row.student.name)}</strong>
            <p>${escapeHtml(row.student.className || "-")} • ${escapeHtml(row.student.email || "-")}</p>
          </div>
          <div class="assignment-controls">
            <select data-assignment-select="${escapeHtml(row.student.id)}">
              <option value="">Ogretmen sec</option>
              ${assignmentTargets.map((teacher) => {
                const isSelected = row.student.assignedTeacherId
                  ? teacher.userId === row.student.assignedTeacherId
                  : normalizeText(teacher.email) === normalizeText(row.student.assignedTeacherEmail);
                return `<option value="${escapeHtml(teacher.value)}" ${isSelected ? "selected" : ""}>${escapeHtml(teacher.name)} (${escapeHtml(roleLabel(teacher.role))})</option>`;
              }).join("")}
            </select>
            <button class="button button-primary" type="button" data-assignment-save="${escapeHtml(row.student.id)}">Kaydet</button>
            <span class="inline-note" data-assignment-status="${escapeHtml(row.student.id)}"></span>
          </div>
        </div>
      `).join("")
      : `<div class="empty-state">Atama yapilacak ogrenci bulunamadi.</div>`;
  }

  const teacherEmailHost = document.getElementById("teacher-email-admin");
  if (teacherEmailHost && isAdminRole(state.currentUser.role)) {
    const approvedEmails = [...(snapshot.approvedTeacherEmails || [])].filter((email) => email !== "kutluozgur79@gmail.com");
    teacherEmailHost.innerHTML = `
      <form id="teacher-email-form" class="form-grid">
        <label class="field">
          <span>Yeni ogretmen e-postasi</span>
          <input type="email" name="teacherEmail" placeholder="ornek@okul.k12.tr">
        </label>
        <div class="inline-actions">
          <button class="button button-primary" type="submit">Ogretmen e-postasi ekle</button>
        </div>
        <p class="auth-message" id="teacher-email-status" aria-live="polite"></p>
      </form>
      <div class="summary-card-grid">
        ${approvedEmails.length ? approvedEmails.map((email) => {
          const assignedCount = (snapshot.students || []).filter((student) => normalizeText(student.assignedTeacherEmail) === normalizeText(email)).length;
          return `
          <article class="summary-card">
            <h3>${escapeHtml(email)}</h3>
            <p>Bu e-posta ile kayit olan kullanici ogretmen rolune gecer.</p>
            <div class="summary-metrics">
              <span>${assignedCount} ogrenci</span>
            </div>
            <div class="inline-actions">
              <button class="button button-secondary" type="button" data-clear-assignments-email="${escapeHtml(email)}">Bu ogretmenin atamalarini temizle</button>
              <button class="button button-secondary" type="button" data-remove-teacher-email="${escapeHtml(email)}">Ogretmen e-postasini sil</button>
            </div>
            <p class="inline-note" data-clear-assignments-status="${escapeHtml(email)}"></p>
            <p class="inline-note" data-remove-teacher-status="${escapeHtml(email)}"></p>
          </article>
        `;
        }).join("") : `<div class="empty-state">Admin disinda tanimli ek ogretmen e-postasi yok.</div>`}
      </div>
    `;
  }
}

function bindTeacherDashboardActions() {
  const searchInput = document.getElementById("teacher-search");
  const classFilter = document.getElementById("teacher-class-filter");
  const sortSelect = document.getElementById("teacher-sort");
  const resetButton = document.getElementById("teacher-filter-reset");
  const jsonButton = document.getElementById("download-results");
  const csvButton = document.getElementById("download-results-csv");
  const assignmentHost = document.getElementById("assignment-board");
  const teacherEmailHost = document.getElementById("teacher-email-admin");

  if (searchInput && !searchInput.dataset.bound) {
    searchInput.dataset.bound = "true";
    searchInput.addEventListener("input", () => {
      state.teacherFilters.search = searchInput.value;
      renderManagementDashboard(state.managementSnapshot);
    });
  }

  if (classFilter && !classFilter.dataset.bound) {
    classFilter.dataset.bound = "true";
    classFilter.addEventListener("change", () => {
      state.teacherFilters.className = classFilter.value;
      renderManagementDashboard(state.managementSnapshot);
    });
  }

  if (sortSelect && !sortSelect.dataset.bound) {
    sortSelect.dataset.bound = "true";
    sortSelect.addEventListener("change", () => {
      state.teacherFilters.sort = sortSelect.value;
      renderManagementDashboard(state.managementSnapshot);
    });
  }

  if (resetButton && !resetButton.dataset.bound) {
    resetButton.dataset.bound = "true";
    resetButton.addEventListener("click", () => {
      state.teacherFilters = { search: "", className: "all", sort: "date_desc" };
      if (searchInput) searchInput.value = "";
      if (sortSelect) sortSelect.value = "date_desc";
      renderManagementDashboard(state.managementSnapshot);
    });
  }

  if (jsonButton && !jsonButton.dataset.bound) {
    jsonButton.dataset.bound = "true";
    jsonButton.addEventListener("click", () => {
      const rows = buildStudentManagementRows(state.managementSnapshot);
      const attempts = rows.flatMap((row) => row.attempts);
      const blob = new Blob([JSON.stringify(attempts, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "quiz-sonuclari.json";
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  if (csvButton && !csvButton.dataset.bound) {
    csvButton.dataset.bound = "true";
    csvButton.addEventListener("click", () => {
      const rows = buildStudentManagementRows(state.managementSnapshot);
      const attempts = rows.flatMap((row) => row.attempts);
      const header = ["Quiz", "Ogrenci", "Sinif", "Puan", "Dogru", "Yanlis", "Tarih"];
      const csvRows = attempts.map((attempt) => [attempt.quizTitle, attempt.studentName, attempt.className, attempt.score, attempt.correctCount, attempt.wrongCount, formatDate(attempt.createdAt)]);
      const csv = [header, ...csvRows].map((row) => row.map(toCsvCell).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "quiz-sonuclari.csv";
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  if (assignmentHost && !assignmentHost.dataset.bound) {
    assignmentHost.dataset.bound = "true";
    assignmentHost.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-assignment-save]");
      if (!button) return;

      const studentId = button.getAttribute("data-assignment-save");
      const select = assignmentHost.querySelector(`[data-assignment-select="${studentId}"]`);
      const status = assignmentHost.querySelector(`[data-assignment-status="${studentId}"]`);

      button.disabled = true;
      if (status) status.textContent = "Kaydediliyor...";

      try {
        const selectedValue = String(select?.value || "");
        await state.dataLayer.saveStudentAssignment(studentId, selectedValue, state.currentUser);
        const targets = buildAssignmentTargets(state.managementSnapshot || {});
        const selectedTeacher = targets.find((item) => item.value === selectedValue) || null;
        applyStudentAssignmentToSnapshot(state.managementSnapshot, studentId, {
          id: selectedTeacher?.userId || null,
          name: selectedTeacher?.name || "",
          email: selectedTeacher?.email || ""
        });
        renderManagementDashboard(state.managementSnapshot);
        const refreshedStatus = document.querySelector(`[data-assignment-status="${studentId}"]`);
        if (refreshedStatus) refreshedStatus.textContent = "Atama kaydedildi.";
      } catch (error) {
        if (status) status.textContent = friendlyErrorMessage(error);
      } finally {
        button.disabled = false;
      }
    });
  }

  if (teacherEmailHost && !teacherEmailHost.dataset.bound) {
    teacherEmailHost.dataset.bound = "true";
    teacherEmailHost.addEventListener("submit", async (event) => {
      const form = event.target.closest("#teacher-email-form");
      if (!form) return;
      event.preventDefault();

      const status = document.getElementById("teacher-email-status");
      const formData = new FormData(form);
      const teacherEmail = String(formData.get("teacherEmail") || "").trim().toLowerCase();

      if (!teacherEmail) {
        if (status) status.textContent = "Gecerli bir e-posta girin.";
        return;
      }

      if (status) status.textContent = "Kaydediliyor...";

      try {
        await state.dataLayer.saveApprovedTeacherEmail(teacherEmail, state.currentUser);
        if (state.managementSnapshot && !((state.managementSnapshot.approvedTeacherEmails || []).includes(teacherEmail))) {
          state.managementSnapshot.approvedTeacherEmails = [...(state.managementSnapshot.approvedTeacherEmails || []), teacherEmail];
          renderManagementDashboard(state.managementSnapshot);
        }
        form.reset();
        const refreshedStatus = document.getElementById("teacher-email-status");
        if (refreshedStatus) refreshedStatus.textContent = "Ogretmen e-postasi kaydedildi.";
      } catch (error) {
        if (status) status.textContent = friendlyErrorMessage(error);
      }
    });

    teacherEmailHost.addEventListener("click", async (event) => {
      const clearButton = event.target.closest("[data-clear-assignments-email]");
      const removeButton = event.target.closest("[data-remove-teacher-email]");
      if (!clearButton && !removeButton) return;

      if (clearButton) {
        const teacherEmail = String(clearButton.getAttribute("data-clear-assignments-email") || "").trim().toLowerCase();
        const status = teacherEmailHost.querySelector(`[data-clear-assignments-status="${teacherEmail}"]`);
        if (!teacherEmail) return;
        if (!window.confirm(`${teacherEmail} icin mevcut ogrenci atamalarini temizlemek istiyor musunuz?`)) return;

        clearButton.disabled = true;
        if (status) status.textContent = "Temizleniyor...";

        try {
          await state.dataLayer.clearAssignmentsForTeacherEmail(teacherEmail, state.currentUser);
          clearTeacherAssignmentsInSnapshot(state.managementSnapshot, teacherEmail);
          renderManagementDashboard(state.managementSnapshot);
          const refreshedStatus = document.querySelector(`[data-clear-assignments-status="${teacherEmail}"]`);
          if (refreshedStatus) refreshedStatus.textContent = "Atamalar temizlendi.";
        } catch (error) {
          if (status) status.textContent = friendlyErrorMessage(error);
        } finally {
          clearButton.disabled = false;
        }
        return;
      }

      if (removeButton) {
        const teacherEmail = String(removeButton.getAttribute("data-remove-teacher-email") || "").trim().toLowerCase();
        const status = teacherEmailHost.querySelector(`[data-remove-teacher-status="${teacherEmail}"]`);
        if (!teacherEmail) return;
        if (!window.confirm(`${teacherEmail} ogretmen e-postasini listeden silmek istiyor musunuz?`)) return;

        removeButton.disabled = true;
        if (status) status.textContent = "Siliniyor...";

        try {
          await state.dataLayer.removeApprovedTeacherEmail(teacherEmail, state.currentUser);
          if (state.managementSnapshot) {
            state.managementSnapshot.approvedTeacherEmails = (state.managementSnapshot.approvedTeacherEmails || []).filter((email) => normalizeText(email) !== normalizeText(teacherEmail));
          }
          renderManagementDashboard(state.managementSnapshot);
          const refreshedStatus = document.querySelector(`[data-remove-teacher-status="${teacherEmail}"]`);
          if (refreshedStatus) refreshedStatus.textContent = "E-posta listeden silindi.";
        } catch (error) {
          if (status) status.textContent = friendlyErrorMessage(error);
        } finally {
          removeButton.disabled = false;
        }
      }
    });
  }
}

function renderQuizPage() {
  if (!document.querySelector("[data-quiz-page]")) return;

  const gate = document.getElementById("quiz-gate");
  const studentShell = document.getElementById("student-quiz-shell");
  const staffShell = document.getElementById("staff-quiz-shell");

  if (!state.currentUser) {
    gate.innerHTML = `<div class="gate-card"><h2>Quiz merkezi icin giris gerekli</h2><p>Oturum acmadan quizlere erisim saglanmaz.</p><a class="button button-primary" href="giris.html">Giris Yap</a></div>`;
    return;
  }

  gate.hidden = true;

  if (isStaffRole(state.currentUser.role)) {
    if (studentShell) studentShell.hidden = true;
    if (staffShell) staffShell.hidden = false;
    loadManagementSnapshot((snapshot) => {
      renderStaffQuizStats(snapshot);
      renderQuizBuilder(snapshot);
      renderStaffQuizList(snapshot);
      renderStaffQuizResults(snapshot);
      bindQuizBuilder();
    });
    return;
  }

  if (staffShell) staffShell.hidden = true;
  if (studentShell) studentShell.hidden = false;
  loadStudentWorkspace((snapshot) => {
    renderStudentQuizStats(snapshot);
    renderStudentQuizOverview(snapshot);
    renderStudentQuizList(snapshot);
    renderStudentAttempts(snapshot.attempts || []);
    bindStudentQuizActions();
  });
}

function renderProjectManagementPage() {
  const isProjectPage = Boolean(document.querySelector("[data-project-page]"));
  const isMessagePage = Boolean(document.querySelector("[data-message-page]"));
  if (!isProjectPage && !isMessagePage) return;

  const gate = document.getElementById("project-gate");
  const studentShell = document.getElementById("project-student-shell");
  const staffShell = document.getElementById("project-staff-shell");

  if (!state.currentUser) {
    gate.innerHTML = `<div class="gate-card"><h2>${isMessagePage ? "Mesajlasma alani icin giris gerekli" : "Proje alani icin giris gerekli"}</h2><p>Ogrenci veya yetkili personel olarak oturum acin.</p><a class="button button-primary" href="giris.html">Giris Yap</a></div>`;
    return;
  }

  gate.hidden = true;

  if (isStaffRole(state.currentUser.role)) {
    if (studentShell) studentShell.hidden = true;
    if (staffShell) staffShell.hidden = false;
    loadManagementSnapshot((snapshot) => {
      renderStaffProjectPage(snapshot, { messageOnly: isMessagePage });
      bindStaffProjectActions();

    });
    return;
  }

  if (staffShell) staffShell.hidden = true;
  if (studentShell) studentShell.hidden = false;
  loadStudentWorkspace((snapshot) => {
    renderStudentProjectPage(snapshot);
    bindStudentProjectActions();

    const messageCard = document.getElementById("student-message-thread")?.closest(".lab-card");
    const projectListCard = document.getElementById("student-project-list")?.closest(".lab-card");
    const uploadCard = document.getElementById("student-project-upload")?.closest(".lab-card");

    if (isMessagePage) {
      if (projectListCard) projectListCard.hidden = true;
      if (uploadCard) uploadCard.hidden = true;
      if (messageCard) messageCard.hidden = false;
    } else {
      if (messageCard) messageCard.hidden = true;
      if (projectListCard) projectListCard.hidden = false;
      if (uploadCard) uploadCard.hidden = false;
    }
  });
}

function renderTeacherDashboard() {
  if (!document.querySelector("[data-teacher-page]")) return;

  const gate = document.getElementById("teacher-gate");
  const dashboard = document.getElementById("teacher-dashboard");

  if (!state.currentUser) {
    gate.innerHTML = `<div class="gate-card"><h2>Panel icin giris gerekli</h2><p>Ogretmen veya admin hesabi ile giris yapin.</p><a class="button button-primary" href="giris.html">Giris Yap</a></div>`;
    return;
  }

  if (!isStaffRole(state.currentUser.role)) {
    gate.innerHTML = `<div class="gate-card"><h2>Bu alan sadece ogretmen ve admin icindir</h2><p>Ogrenci hesabi ile kendi quiz ve proje alaniniza donebilirsiniz.</p><a class="button button-primary" href="mini-lab.html">Quiz Merkezi</a></div>`;
    return;
  }

  gate.hidden = true;
  dashboard.hidden = false;

  loadManagementSnapshot((snapshot) => {
    renderManagementDashboard(snapshot);
    bindTeacherDashboardActions();
  }, (error) => {
    document.getElementById("teacher-table").innerHTML = `<div class="empty-state">${escapeHtml(friendlyErrorMessage(error))}</div>`;
  });
}

async function initPortal() {
  state.dataLayer = await createDataLayer();
  state.currentUser = await state.dataLayer.ensureSetup();

  renderSessionBadges();
  renderFirebaseSetupWarning();
  bindLoginPage();
  renderQuizPage();
  renderProjectManagementPage();
  renderTeacherDashboard();
}

initPortal().catch((error) => {
  console.error(error);
  document.querySelectorAll("[data-session-status], [data-header-session]").forEach((node) => {
    node.innerHTML = `<span class="status-pill">Hata</span><span class="status-pill">${escapeHtml(friendlyErrorMessage(error))}</span>`;
  });
});

