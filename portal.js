import {
  QUIZ_QUESTIONS,
  createDataLayer,
  escapeHtml,
  formatDate,
  getGoogleDriveUploadConfig,
  getModeLabel,
  getTeacherEmails,
  isFirebaseModeConfigured,
  isGoogleDriveUploadConfigured
} from "./portal-data.js";

const PORTAL_CONFIG = window.PORTAL_CONFIG || {};
const ADMIN_CONFIG = PORTAL_CONFIG.admin || {
  name: "Ogretmen",
  email: "ogretmen@algoritma-portal.local"
};

const state = {
  dataLayer: null,
  currentUser: null,
  teacherSnapshotUnsubscribe: null,
  teacherSnapshot: null,
  studentWorkspaceUnsubscribe: null,
  studentWorkspace: { projects: [], messages: [] },
  teacherControlsBound: false,
  driveUploadBridgeBound: false,
  driveUploadBridge: null,
  teacherFilters: {
    search: "",
    className: "all",
    sort: "date_desc"
  }
};

const UPLOAD_CALLBACK_STORAGE_PREFIX = "algoritmaUploadCallback:";

function friendlyErrorMessage(error) {
  const text = String(error?.message || error || "");

  if (text.includes("CONFIGURATION_NOT_FOUND")) {
    return "Firebase Authentication henuz etkin degil. Konsolda Authentication > Get started ve Email/Password secenegini acin.";
  }

  if (text.includes("auth/operation-not-allowed")) {
    return "Email/Password girisi Firebase Authentication icinde etkinlestirilmemis.";
  }

  if (text.includes("UPLOAD_NOT_CONFIGURED")) {
    return "Google Drive yukleme koprusu henuz ayarlanmis degil.";
  }

  if (text.includes("UPLOAD_POPUP_BLOCKED")) {
    return "Tarayici yukleme penceresini engelledi. Pop-up izni verip tekrar deneyin.";
  }

  if (text.includes("UPLOAD_CANCELLED")) {
    return "Yukleme penceresi kapatildi.";
  }

  return text || "Bilinmeyen hata";
}

function renderSessionBadges() {
  const user = state.currentUser;
  const modeLabel = getModeLabel();

  document.querySelectorAll("[data-session-status]").forEach((node) => {
    if (!user) {
      node.innerHTML = `
        <span class="status-pill">${modeLabel} mod</span>
        <span class="status-pill">Oturum yok</span>
        <a class="button button-secondary" href="giris.html">Giris Yap</a>
      `;
      return;
    }

    const roleLabel = user.role === "teacher" ? "Ogretmen" : "Ogrenci";
    node.innerHTML = `
      <span class="status-pill">${modeLabel} mod</span>
      <span class="status-pill">${escapeHtml(user.name)} - ${roleLabel}</span>
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
  if (!host) {
    return;
  }

  if (!isFirebaseModeConfigured()) {
    host.innerHTML = `
      <div class="gate-card">
        <h2>Su an yerel mod aktif</h2>
        <p>Gercek cok kullanicili kullanim icin <code>portal-config.js</code> dosyasina Firebase ayarlari girilip <code>storageMode</code> degeri <code>firebase</code> yapilmalidir.</p>
      </div>
    `;
    return;
  }

  if (!isGoogleDriveUploadConfigured() && (document.querySelector("[data-quiz-page]") || document.querySelector("[data-project-page]"))) {
    const uploadConfig = getGoogleDriveUploadConfig();
    host.innerHTML = `
      <div class="gate-card">
        <h2>Google Drive yukleme beklemede</h2>
        <p>Quiz ve mesajlasma aktif. Proje dosyalarinin <strong>${escapeHtml(uploadConfig.folderName)}</strong> klasorune gidebilmesi icin <code>portal-config.js</code> icindeki <code>googleDriveUpload.webAppUrl</code> alanina Apps Script web app adresini ekleyin.</p>
      </div>
    `;
    return;
  }

  host.innerHTML = "";
}

function renderTeacherLoginNote() {
  const host = document.getElementById("teacher-login-note");
  if (!host) {
    return;
  }

  if (isFirebaseModeConfigured()) {
    const teacherEmails = getTeacherEmails();
    host.innerHTML = teacherEmails.length
      ? `
        <p><strong>Ogretmen e-postalari:</strong> ${teacherEmails.map(escapeHtml).join(", ")}</p>
        <p>Bu hesaplarla giren kullanicilar quiz sonuclarini, proje dosyalarini ve mesajlasma ekranini yonetebilir.</p>
      `
      : `<p>Firebase modunda ogretmen e-postalari <code>portal-config.js</code> icinde ayarlanir.</p>`;
    return;
  }

  host.innerHTML = `
    <p><strong>E-posta:</strong> ${escapeHtml(ADMIN_CONFIG.email)}</p>
    <p>Yerel modda ogretmen girisi icin <code>admin.localPassword</code> ayari kullanilir. Firebase modunda ise kendi sifrenizle giris yapin.</p>
    <p>Bu hesap ile <a href="ogretmen-paneli.html">ogretmen paneline</a> ve <a href="proje-yonetimi.html">proje yonetimi</a> sayfasina erisebilirsiniz.</p>
  `;
}

function renderQuizQuestions() {
  return QUIZ_QUESTIONS.map((question, index) => {
    const options = question.options.map((option, optionIndex) => `
      <label class="option-item">
        <input type="radio" name="q-${index}" value="${optionIndex}">
        <span>${escapeHtml(option)}</span>
      </label>
    `).join("");

    return `
      <article class="question-card">
        <div class="question-header">
          <span class="question-count">Soru ${index + 1}</span>
          <h3>${escapeHtml(question.prompt)}</h3>
        </div>
        <div class="option-list">${options}</div>
      </article>
    `;
  }).join("");
}

function evaluateQuiz(formData) {
  const answers = QUIZ_QUESTIONS.map((question, index) => {
    const selectedValue = formData.get(`q-${index}`);
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
  return { score: correctCount * 10, correctCount, wrongCount: QUIZ_QUESTIONS.length - correctCount, answers };
}

function renderQuizResult(result) {
  const answerList = result.answers.map((answer, index) => `
    <li class="${answer.isCorrect ? "answer-correct" : "answer-wrong"}">
      <strong>${index + 1}. soru:</strong> ${escapeHtml(answer.prompt)}<br>
      Senin cevabin: ${escapeHtml(answer.selectedAnswer)}<br>
      Dogru cevap: ${escapeHtml(answer.correctAnswer)}<br>
      Aciklama: ${escapeHtml(answer.explanation)}
    </li>
  `).join("");

  return `
    <div class="result-summary">
      <div class="score-badge">${result.score}</div>
      <div>
        <h3>Quiz tamamlandi</h3>
        <p>${result.correctCount} dogru, ${result.wrongCount} yanlis yaptin.</p>
      </div>
    </div>
    <ol class="results-list">${answerList}</ol>
  `;
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function renderRichText(value) {
  return escapeHtml(value).replaceAll("\n", "<br>");
}

function formatFileSize(bytes) {
  const size = Number(bytes || 0);
  if (!size) {
    return "-";
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function compareAttempts(left, right, sort) {
  if (sort === "date_asc") {
    return new Date(left.createdAt) - new Date(right.createdAt);
  }

  if (sort === "score_desc") {
    return right.score - left.score || new Date(right.createdAt) - new Date(left.createdAt);
  }

  if (sort === "score_asc") {
    return left.score - right.score || new Date(right.createdAt) - new Date(left.createdAt);
  }

  if (sort === "name_asc") {
    return normalizeText(left.studentName).localeCompare(normalizeText(right.studentName), "tr");
  }

  return new Date(right.createdAt) - new Date(left.createdAt);
}

function getFilteredTeacherAttempts(snapshot) {
  const attempts = [...(snapshot?.attempts || [])];
  const search = normalizeText(state.teacherFilters.search);
  const className = state.teacherFilters.className;
  const filtered = attempts.filter((attempt) => {
    const matchesClass = className === "all" || normalizeText(attempt.className) === normalizeText(className);
    if (!matchesClass) {
      return false;
    }

    if (!search) {
      return true;
    }

    const haystack = [
      attempt.studentName,
      attempt.className,
      attempt.email
    ].map(normalizeText).join(" ");

    return haystack.includes(search);
  });

  filtered.sort((left, right) => compareAttempts(left, right, state.teacherFilters.sort));
  return filtered;
}

function renderTeacherFilterSummary(filteredAttempts, snapshot) {
  const host = document.getElementById("teacher-filter-summary");
  if (!host) {
    return;
  }

  const total = snapshot?.attempts?.length || 0;
  const filteredStudents = new Set(filteredAttempts.map((attempt) => attempt.userId)).size;
  const projectCount = (snapshot?.projects || []).length;
  host.textContent = `${filteredAttempts.length} quiz sonucu - ${filteredStudents} ogrenci - ${projectCount} proje kaydi - toplam quiz kaydi ${total}`;
}

function toCsvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function buildStudentSummaries(attempts) {
  const map = new Map();

  attempts.forEach((attempt) => {
    const key = attempt.userId || attempt.email;
    const existing = map.get(key) || {
      userId: attempt.userId,
      studentName: attempt.studentName,
      className: attempt.className,
      email: attempt.email,
      attemptsCount: 0,
      totalScore: 0,
      bestScore: 0,
      latestAt: attempt.createdAt,
      latestScore: attempt.score
    };

    existing.attemptsCount += 1;
    existing.totalScore += attempt.score;
    existing.bestScore = Math.max(existing.bestScore, attempt.score);

    if (new Date(attempt.createdAt) > new Date(existing.latestAt)) {
      existing.latestAt = attempt.createdAt;
      existing.latestScore = attempt.score;
    }

    map.set(key, existing);
  });

  return [...map.values()]
    .map((item) => ({
      ...item,
      averageScore: Math.round(item.totalScore / item.attemptsCount)
    }))
    .sort((left, right) =>
      right.bestScore - left.bestScore ||
      right.averageScore - left.averageScore ||
      normalizeText(left.studentName).localeCompare(normalizeText(right.studentName), "tr")
    );
}

function buildQuestionAnalysis(attempts) {
  const stats = new Map();

  attempts.forEach((attempt) => {
    (attempt.answers || []).forEach((answer, index) => {
      const key = `${index + 1}`;
      const existing = stats.get(key) || {
        number: index + 1,
        prompt: answer.prompt,
        total: 0,
        wrong: 0,
        correct: 0
      };

      existing.total += 1;
      if (answer.isCorrect) {
        existing.correct += 1;
      } else {
        existing.wrong += 1;
      }

      stats.set(key, existing);
    });
  });

  return [...stats.values()]
    .map((item) => ({
      ...item,
      wrongRate: item.total ? Math.round((item.wrong / item.total) * 100) : 0
    }))
    .sort((left, right) => right.wrong - left.wrong || right.wrongRate - left.wrongRate || left.number - right.number);
}

function renderTeacherInsights(filteredAttempts) {
  const summaryHost = document.getElementById("teacher-student-summary");
  const topHost = document.getElementById("teacher-top-students");
  const questionHost = document.getElementById("teacher-question-analysis");

  if (!summaryHost || !topHost || !questionHost) {
    return;
  }

  if (!filteredAttempts.length) {
    summaryHost.innerHTML = `<div class="empty-state">Ogrenci ozeti icin sonuc bulunamadi.</div>`;
    topHost.innerHTML = `<div class="empty-state">Siralama olusturulamadi.</div>`;
    questionHost.innerHTML = `<div class="empty-state">Soru analizi icin yeterli veri yok.</div>`;
    return;
  }

  const summaries = buildStudentSummaries(filteredAttempts);
  const questionAnalysis = buildQuestionAnalysis(filteredAttempts);

  summaryHost.innerHTML = `
    <div class="summary-card-grid">
      ${summaries.map((item) => `
        <article class="summary-card">
          <h3>${escapeHtml(item.studentName)}</h3>
          <p>${escapeHtml(item.className || "-")} • ${escapeHtml(item.email || "-")}</p>
          <div class="summary-metrics">
            <span>Deneme: <strong>${item.attemptsCount}</strong></span>
            <span>En iyi: <strong>${item.bestScore}</strong></span>
            <span>Ortalama: <strong>${item.averageScore}</strong></span>
            <span>Son puan: <strong>${item.latestScore}</strong></span>
          </div>
        </article>
      `).join("")}
    </div>
  `;

  topHost.innerHTML = `
    <div class="rank-list">
      ${summaries.slice(0, 5).map((item, index) => `
        <article class="rank-item">
          <div class="rank-badge">${index + 1}</div>
          <div>
            <h3>${escapeHtml(item.studentName)}</h3>
            <p>${escapeHtml(item.className || "-")} • En iyi ${item.bestScore} • Ortalama ${item.averageScore}</p>
          </div>
        </article>
      `).join("")}
    </div>
  `;

  questionHost.innerHTML = `
    <div class="question-analysis-list">
      ${questionAnalysis.map((item) => `
        <article class="question-analysis-item">
          <div class="question-analysis-head">
            <span class="question-badge">Soru ${item.number}</span>
            <strong>%${item.wrongRate} yanlis</strong>
          </div>
          <p>${escapeHtml(item.prompt)}</p>
          <div class="summary-metrics">
            <span>Yanlis: <strong>${item.wrong}</strong></span>
            <span>Dogru: <strong>${item.correct}</strong></span>
            <span>Toplam: <strong>${item.total}</strong></span>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function getFilteredTeacherStudents(snapshot) {
  const students = [...(snapshot?.students || [])];
  const search = normalizeText(state.teacherFilters.search);
  const className = state.teacherFilters.className;

  return students.filter((student) => {
    const matchesClass = className === "all" || normalizeText(student.className) === normalizeText(className);
    if (!matchesClass) {
      return false;
    }

    if (!search) {
      return true;
    }

    const haystack = [
      student.name,
      student.className,
      student.email
    ].map(normalizeText).join(" ");

    return haystack.includes(search);
  });
}

function buildTeacherStudentWorkspace(snapshot) {
  const filteredStudents = getFilteredTeacherStudents(snapshot);
  const projectMap = new Map();
  const messageMap = new Map();

  (snapshot?.projects || []).forEach((project) => {
    const list = projectMap.get(project.userId) || [];
    list.push(project);
    projectMap.set(project.userId, list);
  });

  (snapshot?.messages || []).forEach((message) => {
    const list = messageMap.get(message.studentId) || [];
    list.push(message);
    messageMap.set(message.studentId, list);
  });

  return filteredStudents
    .map((student) => {
      const projects = [...(projectMap.get(student.id) || [])].sort((left, right) => new Date(right.uploadedAt) - new Date(left.uploadedAt));
      const messages = [...(messageMap.get(student.id) || [])].sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt));
      const latestProjectAt = projects[0]?.uploadedAt || null;
      const latestMessageAt = messages[messages.length - 1]?.createdAt || null;
      const latestActivityAt = latestProjectAt && latestMessageAt
        ? (new Date(latestProjectAt) > new Date(latestMessageAt) ? latestProjectAt : latestMessageAt)
        : latestProjectAt || latestMessageAt || student.createdAt;

      return {
        student,
        projects,
        messages,
        latestActivityAt
      };
    })
    .sort((left, right) => {
      if (state.teacherFilters.sort === "name_asc") {
        return normalizeText(left.student.name).localeCompare(normalizeText(right.student.name), "tr");
      }
      return new Date(right.latestActivityAt) - new Date(left.latestActivityAt);
    });
}

function renderMessageThread(messages, viewerRole) {
  if (!messages.length) {
    return `<div class="empty-state">Henuz mesaj yok.</div>`;
  }

  return `
    <div class="chat-thread">
      ${messages.map((message) => {
        const isOwn = message.senderRole === viewerRole;
        return `
          <article class="chat-bubble ${isOwn ? "chat-bubble-self" : "chat-bubble-other"}">
            <div class="chat-meta">
              <strong>${escapeHtml(message.senderName)}</strong>
              <span>${message.senderRole === "teacher" ? "Ogretmen" : "Ogrenci"} - ${formatDate(message.createdAt)}</span>
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
              <p>${formatDate(project.uploadedAt)} - ${escapeHtml(project.driveFileName || "Dosya adi yok")} - ${escapeHtml(formatFileSize(project.size))}</p>
            </div>
            ${viewerRole === "teacher" && project.driveFileUrl
              ? `<a class="button button-secondary" href="${escapeHtml(project.driveFileUrl)}" target="_blank" rel="noopener noreferrer">Drive'da ac</a>`
              : `<span class="status-pill">Drive kaydi olustu</span>`}
          </div>
          ${project.description ? `<p>${renderRichText(project.description)}</p>` : `<p class="muted-text">Aciklama eklenmemis.</p>`}
          <div class="review-block">
            <h4>Ogretmen degerlendirmesi</h4>
            ${viewerRole === "teacher"
              ? `
                <textarea class="review-textarea" data-review-input="${escapeHtml(project.id)}" placeholder="Bu proje icin degerlendirme yazin...">${escapeHtml(project.reviewText || "")}</textarea>
                <div class="inline-actions">
                  <button class="button button-primary" type="button" data-save-review-button="${escapeHtml(project.id)}">Degerlendirmeyi kaydet</button>
                  <span class="inline-note" data-review-status="${escapeHtml(project.id)}">${project.reviewUpdatedAt ? `Son guncelleme: ${formatDate(project.reviewUpdatedAt)}` : ""}</span>
                </div>
              `
              : project.reviewText
                ? `
                  <div class="review-display">${renderRichText(project.reviewText)}</div>
                  <p class="muted-text">${project.reviewUpdatedAt ? `Son guncelleme: ${formatDate(project.reviewUpdatedAt)}` : ""}</p>
                `
                : `<div class="empty-state">Ogretmen henuz bir degerlendirme yazmadi.</div>`}
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function renderTeacherProjectWorkspace(snapshot) {
  const host = document.getElementById("teacher-project-workspace");
  if (!host) {
    return;
  }

  const workspaces = buildTeacherStudentWorkspace(snapshot);

  if (!workspaces.length) {
    host.innerHTML = `<div class="empty-state">Secili filtrelerde ogrenci bulunamadi.</div>`;
    return;
  }

  host.innerHTML = workspaces.map(({ student, projects, messages }) => `
    <details class="attempt-card teacher-student-card">
      <summary>
        <span>${escapeHtml(student.name)} - ${escapeHtml(student.className || "-")}</span>
        <strong>${projects.length} proje</strong>
        <span>${messages.length} mesaj</span>
      </summary>
      <div class="teacher-student-content">
        <section class="teacher-student-column">
          <div class="student-mini-meta">
            <span class="status-pill">${escapeHtml(student.email || "-")}</span>
            <span class="status-pill">${projects.length ? `Son yukleme: ${formatDate(projects[0].uploadedAt)}` : "Yukleme yok"}</span>
          </div>
          ${renderProjectCards(projects, "teacher")}
        </section>
        <section class="teacher-student-column">
          <h3>Mesajlasma</h3>
          ${renderMessageThread(messages, "teacher")}
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
      </div>
    </details>
  `).join("");
}

function bindTeacherControls(snapshot) {
  const searchInput = document.getElementById("teacher-search");
  const classFilter = document.getElementById("teacher-class-filter");
  const sortSelect = document.getElementById("teacher-sort");
  const resetButton = document.getElementById("teacher-filter-reset");
  const csvButton = document.getElementById("download-results-csv");
  const jsonButton = document.getElementById("download-results");

  if (!searchInput || !classFilter || !sortSelect || !resetButton) {
    return;
  }

  const classNames = [...new Set((snapshot.students || []).map((student) => student.className).filter(Boolean))].sort((left, right) => left.localeCompare(right, "tr"));
  const currentValue = classFilter.value || "all";
  classFilter.innerHTML = `<option value="all">Tum siniflar</option>${classNames.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("")}`;
  classFilter.value = classNames.includes(currentValue) ? currentValue : state.teacherFilters.className;

  if (!state.teacherControlsBound) {
    state.teacherControlsBound = true;

    searchInput.addEventListener("input", () => {
      state.teacherFilters.search = searchInput.value;
      renderTeacherStats(state.teacherSnapshot);
    });

    classFilter.addEventListener("change", () => {
      state.teacherFilters.className = classFilter.value;
      renderTeacherStats(state.teacherSnapshot);
    });

    sortSelect.addEventListener("change", () => {
      state.teacherFilters.sort = sortSelect.value;
      renderTeacherStats(state.teacherSnapshot);
    });

    resetButton.addEventListener("click", () => {
      state.teacherFilters = {
        search: "",
        className: "all",
        sort: "date_desc"
      };
      searchInput.value = "";
      classFilter.value = "all";
      sortSelect.value = "date_desc";
      renderTeacherStats(state.teacherSnapshot);
    });

    jsonButton?.addEventListener("click", () => {
      const attempts = getFilteredTeacherAttempts(state.teacherSnapshot);
      const blob = new Blob([JSON.stringify(attempts, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "quiz-sonuclari.json";
      link.click();
      URL.revokeObjectURL(url);
    });

    csvButton?.addEventListener("click", () => {
      const attempts = getFilteredTeacherAttempts(state.teacherSnapshot);
      const header = [
        "Ogrenci",
        "Sinif",
        "E-posta",
        "Dogru",
        "Yanlis",
        "Puan",
        "Tarih"
      ];
      const rows = attempts.map((attempt) => [
        attempt.studentName,
        attempt.className,
        attempt.email,
        attempt.correctCount,
        attempt.wrongCount,
        attempt.score,
        formatDate(attempt.createdAt)
      ]);
      const csv = [header, ...rows].map((row) => row.map(toCsvCell).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "quiz-sonuclari.csv";
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  searchInput.value = state.teacherFilters.search;
  classFilter.value = classNames.includes(state.teacherFilters.className) ? state.teacherFilters.className : "all";
  sortSelect.value = state.teacherFilters.sort;
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

function bindStudentWorkspaceActions() {
  const uploadButton = document.getElementById("student-drive-upload-button");
  const uploadMessage = document.getElementById("student-project-message");
  const messageForm = document.getElementById("student-message-form");
  const messageStatus = document.getElementById("student-message-status");

  if (uploadButton && !uploadButton.dataset.bound) {
    uploadButton.dataset.bound = "true";
    uploadButton.addEventListener("click", async () => {
      uploadButton.disabled = true;
      if (uploadMessage) {
        uploadMessage.textContent = "Yukleme penceresi aciliyor...";
      }

      try {
        const projectPayload = await openDriveUploadPopup();
        if (uploadMessage) {
          uploadMessage.textContent = "Dosya Drive'a kaydedildi. Portal kaydi olusturuluyor...";
        }
        await state.dataLayer.saveProjectRecord(state.currentUser, projectPayload);
        if (uploadMessage) {
          uploadMessage.textContent = "Proje dosyaniz basariyla kaydedildi.";
        }
      } catch (error) {
        if (uploadMessage) {
          uploadMessage.textContent = friendlyErrorMessage(error);
        }
      } finally {
        uploadButton.disabled = false;
      }
    });
  }

  if (messageForm && !messageForm.dataset.bound) {
    messageForm.dataset.bound = "true";
    messageForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (messageStatus) {
        messageStatus.textContent = "";
      }
      const formData = new FormData(messageForm);
      const text = String(formData.get("text") || "").trim();
      if (!text) {
        if (messageStatus) {
          messageStatus.textContent = "Mesaj bos olamaz.";
        }
        return;
      }

      try {
        await state.dataLayer.sendMessage({
          studentId: state.currentUser.id,
          text,
          sender: state.currentUser
        });
        messageForm.reset();
        if (messageStatus) {
          messageStatus.textContent = "Mesaj gonderildi.";
        }
      } catch (error) {
        if (messageStatus) {
          messageStatus.textContent = friendlyErrorMessage(error);
        }
      }
    });
  }
}

function bindTeacherWorkspaceActions() {
  const host = document.getElementById("teacher-project-workspace");
  if (!host || host.dataset.bound) {
    return;
  }

  host.dataset.bound = "true";

  host.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-save-review-button]");
    if (!button) {
      return;
    }

    const projectId = button.getAttribute("data-save-review-button");
    const input = host.querySelector(`[data-review-input="${projectId}"]`);
    const status = host.querySelector(`[data-review-status="${projectId}"]`);
    const reviewText = input ? input.value : "";
    button.disabled = true;
    if (status) {
      status.textContent = "Kaydediliyor...";
    }

    try {
      await state.dataLayer.saveProjectReview(projectId, reviewText, state.currentUser);
      if (status) {
        status.textContent = "Degerlendirme kaydedildi.";
      }
    } catch (error) {
      if (status) {
        status.textContent = friendlyErrorMessage(error);
      }
    } finally {
      button.disabled = false;
    }
  });

  host.addEventListener("submit", async (event) => {
    const form = event.target.closest("[data-teacher-message-form]");
    if (!form) {
      return;
    }

    event.preventDefault();
    const studentId = form.getAttribute("data-teacher-message-form");
    const status = form.querySelector("[data-message-status]");
    const formData = new FormData(form);
    const text = String(formData.get("text") || "").trim();

    if (!text) {
      if (status) {
        status.textContent = "Mesaj bos olamaz.";
      }
      return;
    }

    if (status) {
      status.textContent = "Gonderiliyor...";
    }

    try {
      await state.dataLayer.sendMessage({
        studentId,
        text,
        sender: state.currentUser
      });
      form.reset();
      if (status) {
        status.textContent = "Mesaj gonderildi.";
      }
    } catch (error) {
      if (status) {
        status.textContent = friendlyErrorMessage(error);
      }
    }
  });
}

function renderStudentWorkspace(snapshot) {
  state.studentWorkspace = snapshot;
  const uploadHost = document.getElementById("student-project-upload");
  const projectHost = document.getElementById("student-project-list");
  const messageHost = document.getElementById("student-message-thread");
  const uploadConfig = getGoogleDriveUploadConfig();

  if (uploadHost) {
    uploadHost.innerHTML = isGoogleDriveUploadConfigured()
      ? `
        <div class="project-upload-card">
          <p>Proje dosyaniz ogretmenin Google Drive hesabindaki <strong>${escapeHtml(uploadConfig.folderName)}</strong> klasorune yuklenir.</p>
          <p class="muted-text">Acilacak yukleme penceresinde dosya, proje basligi ve kisa aciklama girilir. En fazla ${uploadConfig.maxFileSizeMb} MB onerilir.</p>
          <div class="inline-actions">
            <button class="button button-primary" type="button" id="student-drive-upload-button">Proje dosyasi yukle</button>
          </div>
          <p class="auth-message" id="student-project-message" aria-live="polite"></p>
        </div>
      `
      : `
        <div class="empty-state">
          Google Drive yukleme koprusu henuz ayarlanmadi. Apps Script web app adresi eklenince bu bolum aktif olur.
        </div>
      `;
  }

  if (projectHost) {
    projectHost.innerHTML = renderProjectCards(snapshot.projects || [], "student");
  }

  if (messageHost) {
    messageHost.innerHTML = `
      ${renderMessageThread(snapshot.messages || [], "student")}
      <form id="student-message-form" class="message-form">
        <label class="field">
          <span>Ogretmene mesaj</span>
          <textarea name="text" class="message-textarea" placeholder="Mesajinizi yazin"></textarea>
        </label>
        <div class="inline-actions">
          <button class="button button-primary" type="submit">Mesaj gonder</button>
        </div>
        <p class="auth-message" id="student-message-status" aria-live="polite"></p>
      </form>
    `;
  }

  bindStudentWorkspaceActions();
}

function startStudentWorkspaceSubscription(userId) {
  if (state.studentWorkspaceUnsubscribe) {
    state.studentWorkspaceUnsubscribe();
    state.studentWorkspaceUnsubscribe = null;
  }

  state.dataLayer.getStudentWorkspace(userId)
    .then((snapshot) => renderStudentWorkspace(snapshot))
    .catch((error) => {
      const messageHost = document.getElementById("student-message-thread");
      if (messageHost) {
        messageHost.innerHTML = `<div class="empty-state">${escapeHtml(friendlyErrorMessage(error))}</div>`;
      }
    });

  state.studentWorkspaceUnsubscribe = state.dataLayer.subscribeStudentWorkspace(
    userId,
    (snapshot) => renderStudentWorkspace(snapshot),
    (error) => {
      const messageHost = document.getElementById("student-message-thread");
      if (messageHost) {
        messageHost.innerHTML = `<div class="empty-state">${escapeHtml(friendlyErrorMessage(error))}</div>`;
      }
    }
  );
}

async function renderStudentAttempts(userId) {
  const list = document.getElementById("student-attempts");
  if (!list) {
    return;
  }

  const attempts = await state.dataLayer.listAttemptsForUser(userId);
  if (!attempts.length) {
    list.innerHTML = `<div class="empty-state">Henuz kaydedilmis bir quiz sonucu yok.</div>`;
    return;
  }

  list.innerHTML = attempts.map((attempt) => `
    <details class="attempt-card">
      <summary>
        <span>${formatDate(attempt.createdAt)}</span>
        <strong>${attempt.correctCount}/${attempt.total} dogru</strong>
        <span>${attempt.score} puan</span>
      </summary>
      <ol class="results-list compact-list">
        ${attempt.answers.map((answer, index) => `
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

function renderLoginPage() {
  if (!document.querySelector("[data-login-page]")) {
    return;
  }

  renderTeacherLoginNote();

  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const loginMessage = document.getElementById("login-message");
  const registerMessage = document.getElementById("register-message");
  const activeSession = document.getElementById("active-session");

  if (state.currentUser) {
    const nextLink = state.currentUser.role === "teacher" ? "ogretmen-paneli.html" : "mini-lab.html";
    const nextText = state.currentUser.role === "teacher" ? "Ogretmen paneline git" : "Quiz sayfasina git";
    activeSession.innerHTML = `
      <div class="auth-message success-message">Acik oturum: <strong>${escapeHtml(state.currentUser.name)}</strong></div>
      <div class="inline-actions">
        <a class="button button-primary" href="${nextLink}">${nextText}</a>
        <button class="button button-secondary" type="button" id="login-logout-button">Cikis Yap</button>
      </div>
    `;
    const logoutButton = document.getElementById("login-logout-button");
    if (logoutButton) {
      logoutButton.onclick = async () => {
        await state.dataLayer.logoutUser();
        window.location.reload();
      };
    }
  } else {
    activeSession.innerHTML = "";
  }

  if (loginForm && !loginForm.dataset.bound) {
    loginForm.dataset.bound = "true";
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      loginMessage.textContent = "";
      const formData = new FormData(loginForm);
      try {
        state.currentUser = await state.dataLayer.loginUser(formData.get("email"), formData.get("password"));
        window.location.href = state.currentUser.role === "teacher" ? "ogretmen-paneli.html" : "mini-lab.html";
      } catch (error) {
        loginMessage.textContent = friendlyErrorMessage(error) || "Giris yapilamadi.";
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

      if (!payload.name || !payload.className || !payload.email || !payload.password) {
        registerMessage.textContent = "Lutfen tum alanlari doldur.";
        return;
      }

      if (isFirebaseModeConfigured() && payload.password.length < 6) {
        registerMessage.textContent = "Firebase modunda sifre en az 6 karakter olmali.";
        return;
      }

      if (!isFirebaseModeConfigured() && payload.password.length < 4) {
        registerMessage.textContent = "Sifre en az 4 karakter olmali.";
        return;
      }

      try {
        state.currentUser = await state.dataLayer.registerUser(payload);
        window.location.href = "mini-lab.html";
      } catch (error) {
        registerMessage.textContent = friendlyErrorMessage(error) || "Kayit yapilamadi.";
      }
    });
  }
}

function renderQuizPage() {
  if (!document.querySelector("[data-quiz-page]")) {
    return;
  }

  const gate = document.getElementById("quiz-gate");
  const shell = document.getElementById("quiz-shell");
  const quizForm = document.getElementById("quiz-form");
  const quizBody = document.getElementById("quiz-body");
  const quizMessage = document.getElementById("quiz-message");
  const quizResult = document.getElementById("quiz-result");

  if (!state.currentUser) {
    gate.innerHTML = `<div class="gate-card"><h2>Quiz icin giris gerekli</h2><p>Ogrencilerin kayit olup giris yapmasi gerekiyor.</p><a class="button button-primary" href="giris.html">Giris ve Kayit</a></div>`;
    shell.hidden = true;
    return;
  }

  if (state.currentUser.role === "teacher") {
    gate.innerHTML = `<div class="gate-card"><h2>Ogretmen hesabi ile acik</h2><p>Ogretmenler quiz yerine ogrenci sonuc paneli ve proje yonetimi sayfasini kullanir.</p><div class="inline-actions"><a class="button button-primary" href="ogretmen-paneli.html">Ogretmen Paneli</a><a class="button button-secondary" href="proje-yonetimi.html">Proje Yonetimi</a></div></div>`;
    shell.hidden = true;
    return;
  }

  gate.hidden = true;
  shell.hidden = false;
  quizBody.innerHTML = renderQuizQuestions();
  renderStudentAttempts(state.currentUser.id);

  if (quizForm && !quizForm.dataset.bound) {
    quizForm.dataset.bound = "true";
    quizForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      quizMessage.textContent = "";
      const formData = new FormData(quizForm);
      const answeredCount = QUIZ_QUESTIONS.filter((_, index) => formData.get(`q-${index}`) !== null).length;
      if (answeredCount !== QUIZ_QUESTIONS.length) {
        quizMessage.textContent = `Lutfen ${QUIZ_QUESTIONS.length} sorunun tamamini cevapla.`;
        return;
      }
      try {
        const result = evaluateQuiz(formData);
        await state.dataLayer.saveAttempt(state.currentUser, result);
        quizResult.innerHTML = renderQuizResult(result);
        quizForm.reset();
        await renderStudentAttempts(state.currentUser.id);
      } catch (error) {
        quizMessage.textContent = friendlyErrorMessage(error) || "Quiz kaydedilemedi.";
      }
    });
  }
}

async function renderProjectManagementPage() {
  if (!document.querySelector("[data-project-page]")) {
    return;
  }

  const studentGate = document.getElementById("project-student-gate");
  const teacherGate = document.getElementById("project-teacher-gate");
  const studentShell = document.getElementById("project-student-shell");
  const teacherShell = document.getElementById("project-teacher-shell");
  const teacherStats = document.getElementById("project-teacher-stats");

  if (!state.currentUser) {
    const gateMarkup = `<div class="gate-card"><h2>Proje yonetimi icin giris gerekli</h2><p>Ogrenci veya ogretmen hesabi ile giris yapmalisiniz.</p><a class="button button-primary" href="giris.html">Giris Yap</a></div>`;
    if (studentGate) studentGate.innerHTML = gateMarkup;
    if (teacherGate) {
      teacherGate.innerHTML = "";
      teacherGate.hidden = true;
    }
    if (studentShell) studentShell.hidden = true;
    if (teacherShell) teacherShell.hidden = true;
    return;
  }

  if (state.currentUser.role === "student") {
    if (teacherShell) teacherShell.hidden = true;
    if (teacherGate) teacherGate.hidden = true;
    if (studentGate) studentGate.hidden = true;
    if (studentShell) studentShell.hidden = false;
    startStudentWorkspaceSubscription(state.currentUser.id);
    return;
  }

  if (studentShell) studentShell.hidden = true;
  if (studentGate) studentGate.hidden = true;
  if (teacherGate) teacherGate.hidden = true;
  if (teacherShell) teacherShell.hidden = false;

  if (state.teacherSnapshotUnsubscribe) {
    state.teacherSnapshotUnsubscribe();
  }

  const renderProjectPageTeacher = (snapshot) => {
    state.teacherSnapshot = snapshot;
    if (teacherStats) {
      const students = snapshot.students || [];
      const projects = snapshot.projects || [];
      const messages = snapshot.messages || [];
      const reviewedCount = projects.filter((project) => project.reviewText).length;
      teacherStats.innerHTML = `
        <article class="stat-card"><span>Kayitli ogrenci</span><strong>${students.length}</strong></article>
        <article class="stat-card"><span>Yuklenen proje</span><strong>${projects.length}</strong></article>
        <article class="stat-card"><span>Degerlendirilen</span><strong>${reviewedCount}</strong></article>
        <article class="stat-card"><span>Toplam mesaj</span><strong>${messages.length}</strong></article>
      `;
    }
    bindTeacherWorkspaceActions();
    renderTeacherProjectWorkspace(snapshot);
  };

  try {
    renderProjectPageTeacher(await state.dataLayer.getTeacherSnapshot());
  } catch (error) {
    const workspace = document.getElementById("teacher-project-workspace");
    if (workspace) {
      workspace.innerHTML = `<div class="empty-state">${escapeHtml(friendlyErrorMessage(error))}</div>`;
    }
  }

  state.teacherSnapshotUnsubscribe = state.dataLayer.subscribeTeacherSnapshot(
    (snapshot) => renderProjectPageTeacher(snapshot),
    (error) => {
      const workspace = document.getElementById("teacher-project-workspace");
      if (workspace) {
        workspace.innerHTML = `<div class="empty-state">${escapeHtml(friendlyErrorMessage(error))}</div>`;
      }
    }
  );
}

function renderTeacherStats(snapshot) {
  state.teacherSnapshot = snapshot;
  bindTeacherControls(snapshot);
  bindTeacherWorkspaceActions();

  const attempts = getFilteredTeacherAttempts(snapshot);
  const visibleStudents = getFilteredTeacherStudents(snapshot);
  const visibleStudentIds = new Set(visibleStudents.map((student) => student.id));
  const projects = (snapshot.projects || []).filter((project) => visibleStudentIds.has(project.userId));
  const messages = (snapshot.messages || []).filter((message) => visibleStudentIds.has(message.studentId));
  const totalScore = attempts.reduce((sum, attempt) => sum + attempt.score, 0);
  const averageScore = attempts.length ? Math.round(totalScore / attempts.length) : 0;
  const uniqueAttemptStudents = new Set(attempts.map((attempt) => attempt.userId)).size;
  const projectStudents = new Set(projects.map((project) => project.userId)).size;
  const messageThreads = new Set(messages.map((message) => message.studentId)).size;

  document.getElementById("teacher-stats").innerHTML = `
    <article class="stat-card"><span>Kayitli ogrenci</span><strong>${visibleStudents.length}</strong></article>
    <article class="stat-card"><span>Gorunen quiz</span><strong>${attempts.length}</strong></article>
    <article class="stat-card"><span>Quiz ogrencisi</span><strong>${uniqueAttemptStudents}</strong></article>
    <article class="stat-card"><span>Proje kaydi</span><strong>${projects.length}</strong></article>
    <article class="stat-card"><span>Proje yukleyen</span><strong>${projectStudents}</strong></article>
    <article class="stat-card"><span>Mesajlasma</span><strong>${messageThreads}</strong></article>
    <article class="stat-card"><span>Ortalama puan</span><strong>${averageScore}</strong></article>
  `;

  const tableHost = document.getElementById("teacher-table");
  const detailHost = document.getElementById("teacher-details");
  renderTeacherFilterSummary(attempts, snapshot);
  renderTeacherInsights(attempts);
  renderTeacherProjectWorkspace(snapshot);

  if (!attempts.length) {
    tableHost.innerHTML = `<div class="empty-state">Secili filtrelerde quiz sonucu bulunamadi.</div>`;
    detailHost.innerHTML = "";
    return;
  }

  tableHost.innerHTML = `
    <div class="table-wrap">
      <table class="attempt-table">
        <thead><tr><th>Ogrenci</th><th>Sinif</th><th>Dogru</th><th>Yanlis</th><th>Puan</th><th>Tarih</th></tr></thead>
        <tbody>
          ${attempts.map((attempt) => `<tr><td>${escapeHtml(attempt.studentName)}</td><td>${escapeHtml(attempt.className)}</td><td>${attempt.correctCount}</td><td>${attempt.wrongCount}</td><td>${attempt.score}</td><td>${formatDate(attempt.createdAt)}</td></tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;

  detailHost.innerHTML = attempts.map((attempt) => `
    <details class="attempt-card">
      <summary>
        <span>${escapeHtml(attempt.studentName)} - ${escapeHtml(attempt.className)}</span>
        <strong>${attempt.correctCount}/${attempt.total} dogru</strong>
        <span>${formatDate(attempt.createdAt)}</span>
      </summary>
      <ol class="results-list compact-list">
        ${attempt.answers.map((answer, index) => `<li class="${answer.isCorrect ? "answer-correct" : "answer-wrong"}"><strong>${index + 1}. soru</strong> - Secilen: ${escapeHtml(answer.selectedAnswer)} - Dogru: ${escapeHtml(answer.correctAnswer)}</li>`).join("")}
      </ol>
    </details>
  `).join("");

}

async function renderTeacherDashboard() {
  if (!document.querySelector("[data-teacher-page]")) {
    return;
  }

  const gate = document.getElementById("teacher-gate");
  const dashboard = document.getElementById("teacher-dashboard");

  if (!state.currentUser) {
    gate.innerHTML = `<div class="gate-card"><h2>Panel icin giris gerekli</h2><p>Ogretmen hesabi ile giris yapmalisiniz.</p><a class="button button-primary" href="giris.html">Ogretmen Girisi</a></div>`;
    dashboard.hidden = true;
    return;
  }

  if (state.currentUser.role !== "teacher") {
    gate.innerHTML = `<div class="gate-card"><h2>Bu alan sadece ogretmen icin</h2><p>Ogrenci hesabi ile quiz ve proje sayfasina donebilirsiniz.</p><a class="button button-primary" href="mini-lab.html">Ogrenci Sayfasi</a></div>`;
    dashboard.hidden = true;
    return;
  }

  gate.hidden = true;
  dashboard.hidden = false;

  if (state.teacherSnapshotUnsubscribe) {
    state.teacherSnapshotUnsubscribe();
  }

  try {
    renderTeacherStats(await state.dataLayer.getTeacherSnapshot());
  } catch (error) {
    document.getElementById("teacher-table").innerHTML = `<div class="empty-state">Veriler alinamadi: ${escapeHtml(friendlyErrorMessage(error))}</div>`;
  }

  state.teacherSnapshotUnsubscribe = state.dataLayer.subscribeTeacherSnapshot(
    (snapshot) => renderTeacherStats(snapshot),
    (error) => {
      document.getElementById("teacher-table").innerHTML = `<div class="empty-state">Canli sonuc baglantisi kurulamadi: ${escapeHtml(friendlyErrorMessage(error))}</div>`;
    }
  );
}

async function initPortal() {
  state.dataLayer = await createDataLayer();
  state.currentUser = await state.dataLayer.ensureSetup();
  renderSessionBadges();
  renderFirebaseSetupWarning();
  renderLoginPage();
  renderQuizPage();
  await renderProjectManagementPage();
  await renderTeacherDashboard();
}

initPortal().catch((error) => {
  console.error(error);
  document.querySelectorAll("[data-session-status]").forEach((node) => {
    node.innerHTML = `<span class="status-pill">Hata</span><span class="status-pill">${escapeHtml(friendlyErrorMessage(error) || "Portal baslatilamadi")}</span>`;
  });
});
