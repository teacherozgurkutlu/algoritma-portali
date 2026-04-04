import {
  QUIZ_QUESTIONS,
  createDataLayer,
  escapeHtml,
  formatDate,
  getModeLabel,
  getTeacherEmails,
  isFirebaseModeConfigured
} from "./portal-data.js";

const PORTAL_CONFIG = window.PORTAL_CONFIG || {};
const ADMIN_CONFIG = PORTAL_CONFIG.admin || {
  name: "Ogretmen",
  email: "ogretmen@algoritma-portal.local",
  password: "Ogretmen123"
};

const state = {
  dataLayer: null,
  currentUser: null,
  teacherSnapshotUnsubscribe: null
};

function friendlyErrorMessage(error) {
  const text = String(error?.message || error || "");

  if (text.includes("CONFIGURATION_NOT_FOUND")) {
    return "Firebase Authentication henuz etkin degil. Konsolda Authentication > Get started ve Email/Password secenegini acin.";
  }

  if (text.includes("auth/operation-not-allowed")) {
    return "Email/Password girisi Firebase Authentication icinde etkinlestirilmemis.";
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

  if (isFirebaseModeConfigured()) {
    host.innerHTML = "";
    return;
  }

  host.innerHTML = `
    <div class="gate-card">
      <h2>Su an yerel mod aktif</h2>
      <p>Gercek cok kullanicili kullanim icin <code>portal-config.js</code> dosyasina Firebase ayarlari girilip <code>storageMode</code> degeri <code>firebase</code> yapilmalidir.</p>
    </div>
  `;
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
        <p>Bu e-postalardan biri ile giris yapan kullanici ogretmen panelini acabilir.</p>
      `
      : `<p>Firebase modunda ogretmen e-postalari <code>portal-config.js</code> icinde ayarlanir.</p>`;
    return;
  }

  host.innerHTML = `
    <p><strong>E-posta:</strong> ${escapeHtml(ADMIN_CONFIG.email)}</p>
    <p><strong>Sifre:</strong> ${escapeHtml(ADMIN_CONFIG.password)}</p>
    <p>Bu hesap ile <a href="ogretmen-paneli.html">ogretmen paneline</a> girip tum quiz sonuclarini gorebilirsiniz.</p>
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

async function renderStudentAttempts(userId) {
  const list = document.getElementById("student-attempts");
  if (!list) {
    return;
  }

  const attempts = await state.dataLayer.listAttemptsForUser(userId);
  if (!attempts.length) {
    list.innerHTML = `<div class="empty-state">Heniz kaydedilmis bir quiz sonucu yok.</div>`;
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
    gate.innerHTML = `<div class="gate-card"><h2>Ogretmen hesabi ile acik</h2><p>Ogretmenler quiz yerine ogrenci sonuc panelini kullanir.</p><a class="button button-primary" href="ogretmen-paneli.html">Ogretmen Paneli</a></div>`;
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
        quizMessage.textContent = "Lutfen 10 sorunun tamamini cevapla.";
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

function renderTeacherStats(snapshot) {
  const attempts = snapshot.attempts || [];
  const students = snapshot.students || [];
  const totalScore = attempts.reduce((sum, attempt) => sum + attempt.score, 0);
  const averageScore = attempts.length ? Math.round(totalScore / attempts.length) : 0;

  document.getElementById("teacher-stats").innerHTML = `
    <article class="stat-card"><span>Kayitli ogrenci</span><strong>${students.length}</strong></article>
    <article class="stat-card"><span>Toplam quiz</span><strong>${attempts.length}</strong></article>
    <article class="stat-card"><span>Ortalama puan</span><strong>${averageScore}</strong></article>
  `;

  const tableHost = document.getElementById("teacher-table");
  const detailHost = document.getElementById("teacher-details");

  if (!attempts.length) {
    tableHost.innerHTML = `<div class="empty-state">Heniz ogrenci sonucu kaydedilmedi.</div>`;
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
    <details class="attempt-card" open>
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

  const downloadButton = document.getElementById("download-results");
  if (downloadButton && !downloadButton.dataset.bound) {
    downloadButton.dataset.bound = "true";
    downloadButton.addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(attempts, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "quiz-sonuclari.json";
      link.click();
      URL.revokeObjectURL(url);
    });
  }
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
    gate.innerHTML = `<div class="gate-card"><h2>Bu alan sadece ogretmen icin</h2><p>Ogrenci hesabi ile quiz sayfasina donebilirsiniz.</p><a class="button button-primary" href="mini-lab.html">Quiz Sayfasi</a></div>`;
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
    document.getElementById("teacher-table").innerHTML = `<div class="empty-state">Sonuclar alinamadi: ${escapeHtml(friendlyErrorMessage(error))}</div>`;
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
  await renderTeacherDashboard();
}

initPortal().catch((error) => {
  console.error(error);
  document.querySelectorAll("[data-session-status]").forEach((node) => {
    node.innerHTML = `<span class="status-pill">Hata</span><span class="status-pill">${escapeHtml(friendlyErrorMessage(error) || "Portal baslatilamadi")}</span>`;
  });
});
