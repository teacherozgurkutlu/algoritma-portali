const STORAGE_KEYS = {
  users: "algoritmaPortaliUsers",
  session: "algoritmaPortaliSession",
  attempts: "algoritmaPortaliAttempts"
};

const PORTAL_CONFIG = window.PORTAL_CONFIG || {};
const ADMIN_CONFIG = PORTAL_CONFIG.admin || {
  name: "Ogretmen",
  email: "ogretmen@algoritma-portal.local",
  password: "Ogretmen123"
};

const QUIZ_QUESTIONS = [
  {
    prompt: "Algoritma en iyi hangi cumle ile anlatilir?",
    options: [
      "Bir isi adim adim planlamak",
      "Her isi rastgele yapmak",
      "Sorulari bos birakmak",
      "Kurallari unutmak"
    ],
    correctIndex: 0,
    explanation: "Algoritma, bir isi duzenli ve sira ile yapmaktir."
  },
  {
    prompt: "Asagidakilerden hangisi algoritmaya ornektir?",
    options: [
      "Oyun oynarken kural degistirmek",
      "Dis fircalarken sirayi takip etmek",
      "Ders calisirken defteri kapatmak",
      "Kalemi yere atmak"
    ],
    correctIndex: 1,
    explanation: "Dis fircalama gibi sira takip edilen isler algoritmaya ornektir."
  },
  {
    prompt: "Bir sandvic yaparken ilk olarak ne yapilir?",
    options: [
      "Malzemeleri hazirlamak",
      "Masayi toplamak",
      "Oyuna baslamak",
      "Televizyonu acmak"
    ],
    correctIndex: 0,
    explanation: "Algoritmada ilk adim hazirliktir."
  },
  {
    prompt: "Algoritmalar neden faydalidir?",
    options: [
      "Karisikligi artirir",
      "Hata yapmayi kolaylastirir",
      "Isi duzenler ve kolaylastirir",
      "Zamani uzatir"
    ],
    correctIndex: 2,
    explanation: "Dogru adimlar isi daha kolay ve duzenli hale getirir."
  },
  {
    prompt: "Yol tarifi neden bir algoritmadir?",
    options: [
      "Cunku sirali adimlar verir",
      "Cunku her zaman gizlidir",
      "Cunku sadece bilgisayarlar kullanir",
      "Cunku hic kural yoktur"
    ],
    correctIndex: 0,
    explanation: "Yol tarifleri de sirasiyla izlenen adimlar verir."
  },
  {
    prompt: "Bir bilgisayar oyunu ne ile hareket eder?",
    options: [
      "Sadece sans ile",
      "Algoritmalar ve komutlarla",
      "Sadece sesle",
      "Kuralsiz sekilde"
    ],
    correctIndex: 1,
    explanation: "Bilgisayarlar, verilen komutlara ve algoritmalara gore calisir."
  },
  {
    prompt: "Asagidakilerden hangisi dogru siralamadir?",
    options: [
      "Okula git, uyan, kahvalti yap",
      "Kahvalti yap, uyan, canta hazirla",
      "Uyan, hazirlan, okula git",
      "Cik, canta hazirla, uyan"
    ],
    correctIndex: 2,
    explanation: "Dogru siralama algoritmanin temelidir."
  },
  {
    prompt: "El yikarken hangi adim sabundan sonra gelir?",
    options: [
      "Elleri islatmak",
      "Elleri ovusturmek",
      "Hemen disari cikmak",
      "Defteri acmak"
    ],
    correctIndex: 1,
    explanation: "Sabundan sonra elleri ovusturmek gerekir."
  },
  {
    prompt: "Bir isi kucuk parcalara ayirmak ne saglar?",
    options: [
      "Daha zor hale getirir",
      "Hicbir sey degistirmez",
      "Cozmeyi kolaylastirir",
      "Kurallari yok eder"
    ],
    correctIndex: 2,
    explanation: "Algoritmalar isi kucuk ve kolay adimlara ayirir."
  },
  {
    prompt: "Quiz sonunda ne ogrenmis oluruz?",
    options: [
      "Dogru ve yanlislarimizi",
      "Sadece sansimizi",
      "Sadece oyunun rengini",
      "Hicbir seyi"
    ],
    correctIndex: 0,
    explanation: "Sonuc ekrani, dogru ve yanlis cevaplari gosterir."
  }
];

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function escapeHtml(value) {
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

function getUsers() {
  return readJson(STORAGE_KEYS.users, []);
}

function saveUsers(users) {
  writeJson(STORAGE_KEYS.users, users);
}

function getAttempts() {
  return readJson(STORAGE_KEYS.attempts, []);
}

function saveAttempts(attempts) {
  writeJson(STORAGE_KEYS.attempts, attempts);
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

function getCurrentUser() {
  const session = getSession();

  if (!session) {
    return null;
  }

  return getUsers().find((user) => user.id === session.userId) || null;
}

function seedTeacherAccount() {
  const users = getUsers();
  const adminEmail = normalizeEmail(ADMIN_CONFIG.email);
  const existing = users.find((user) => normalizeEmail(user.email) === adminEmail);

  if (existing) {
    if (existing.role !== "teacher") {
      existing.role = "teacher";
      saveUsers(users);
    }
    return existing;
  }

  const teacher = {
    id: createId("teacher"),
    role: "teacher",
    name: ADMIN_CONFIG.name || "Ogretmen",
    className: "Ogretmen",
    email: adminEmail,
    password: ADMIN_CONFIG.password,
    createdAt: new Date().toISOString()
  };

  users.push(teacher);
  saveUsers(users);
  return teacher;
}

function registerUser(payload) {
  const users = getUsers();
  const email = normalizeEmail(payload.email);

  if (users.some((user) => normalizeEmail(user.email) === email)) {
    throw new Error("Bu e-posta zaten kayitli.");
  }

  const user = {
    id: createId("student"),
    role: "student",
    name: payload.name.trim(),
    className: payload.className.trim(),
    email,
    password: payload.password,
    createdAt: new Date().toISOString()
  };

  users.push(user);
  saveUsers(users);
  return user;
}

function loginUser(email, password) {
  const user = getUsers().find(
    (item) =>
      normalizeEmail(item.email) === normalizeEmail(email) &&
      item.password === password
  );

  if (!user) {
    throw new Error("E-posta veya sifre hatali.");
  }

  setSession(user.id);
  return user;
}

function logoutUser() {
  clearSession();
  window.location.href = "giris.html";
}

function saveAttempt(user, result) {
  const attempts = getAttempts();
  attempts.push({
    id: createId("attempt"),
    userId: user.id,
    studentName: user.name,
    className: user.className,
    email: user.email,
    score: result.score,
    total: QUIZ_QUESTIONS.length,
    correctCount: result.correctCount,
    wrongCount: result.wrongCount,
    createdAt: new Date().toISOString(),
    answers: result.answers
  });
  saveAttempts(attempts);
}

function formatDate(dateValue) {
  return new Date(dateValue).toLocaleString("tr-TR");
}

function renderSessionBadges() {
  const user = getCurrentUser();

  document.querySelectorAll("[data-session-status]").forEach((node) => {
    if (!user) {
      node.innerHTML = `
        <span class="status-pill">Oturum yok</span>
        <a class="button button-secondary" href="giris.html">Giris Yap</a>
      `;
      return;
    }

    const roleLabel = user.role === "teacher" ? "Ogretmen" : "Ogrenci";
    node.innerHTML = `
      <span class="status-pill">${escapeHtml(user.name)} • ${roleLabel}</span>
      <button class="button button-secondary" type="button" data-logout-button>Cikis Yap</button>
    `;
  });

  document.querySelectorAll("[data-logout-button]").forEach((button) => {
    button.addEventListener("click", logoutUser);
  });
}

function renderLoginPage() {
  const page = document.querySelector("[data-login-page]");
  if (!page) {
    return;
  }

  const currentUser = getCurrentUser();
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const loginMessage = document.getElementById("login-message");
  const registerMessage = document.getElementById("register-message");
  const activeSession = document.getElementById("active-session");

  if (currentUser) {
    const nextLink =
      currentUser.role === "teacher" ? "ogretmen-paneli.html" : "mini-lab.html";
    const nextText =
      currentUser.role === "teacher" ? "Ogretmen paneline git" : "Quiz sayfasina git";

    activeSession.innerHTML = `
      <div class="auth-message success-message">
        Acik oturum: <strong>${escapeHtml(currentUser.name)}</strong>
      </div>
      <div class="inline-actions">
        <a class="button button-primary" href="${nextLink}">${nextText}</a>
        <button class="button button-secondary" type="button" data-logout-button>Cikis Yap</button>
      </div>
    `;

    renderSessionBadges();
  }

  loginForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    loginMessage.textContent = "";

    const formData = new FormData(loginForm);

    try {
      const user = loginUser(formData.get("email"), formData.get("password"));
      loginMessage.textContent = "Giris basarili. Yonlendiriliyorsun.";
      window.location.href =
        user.role === "teacher" ? "ogretmen-paneli.html" : "mini-lab.html";
    } catch (error) {
      loginMessage.textContent = error.message;
    }
  });

  registerForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    registerMessage.textContent = "";

    const formData = new FormData(registerForm);
    const name = String(formData.get("name") || "").trim();
    const className = String(formData.get("className") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "").trim();

    if (!name || !className || !email || !password) {
      registerMessage.textContent = "Lutfen tum alanlari doldur.";
      return;
    }

    if (password.length < 4) {
      registerMessage.textContent = "Sifre en az 4 karakter olmali.";
      return;
    }

    try {
      const user = registerUser({ name, className, email, password });
      setSession(user.id);
      registerMessage.textContent = "Kayit tamam. Quiz sayfasina yonlendiriliyorsun.";
      window.location.href = "mini-lab.html";
    } catch (error) {
      registerMessage.textContent = error.message;
    }
  });
}

function renderQuizQuestions() {
  return QUIZ_QUESTIONS.map((question, index) => {
    const options = question.options
      .map(
        (option, optionIndex) => `
          <label class="option-item">
            <input type="radio" name="q-${index}" value="${optionIndex}">
            <span>${escapeHtml(option)}</span>
          </label>
        `
      )
      .join("");

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
    const selectedIndex =
      selectedValue === null ? -1 : Number.parseInt(String(selectedValue), 10);
    const isCorrect = selectedIndex === question.correctIndex;

    return {
      prompt: question.prompt,
      selectedAnswer:
        selectedIndex >= 0 ? question.options[selectedIndex] : "Bos birakildi",
      correctAnswer: question.options[question.correctIndex],
      explanation: question.explanation,
      isCorrect
    };
  });

  const correctCount = answers.filter((answer) => answer.isCorrect).length;

  return {
    score: correctCount * 10,
    correctCount,
    wrongCount: QUIZ_QUESTIONS.length - correctCount,
    answers
  };
}

function renderQuizResult(result) {
  const answerList = result.answers
    .map(
      (answer, index) => `
        <li class="${answer.isCorrect ? "answer-correct" : "answer-wrong"}">
          <strong>${index + 1}. soru:</strong> ${escapeHtml(answer.prompt)}<br>
          Senin cevabin: ${escapeHtml(answer.selectedAnswer)}<br>
          Dogru cevap: ${escapeHtml(answer.correctAnswer)}<br>
          Aciklama: ${escapeHtml(answer.explanation)}
        </li>
      `
    )
    .join("");

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

function renderStudentAttempts(userId) {
  const list = document.getElementById("student-attempts");
  if (!list) {
    return;
  }

  const attempts = getAttempts()
    .filter((attempt) => attempt.userId === userId)
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));

  if (!attempts.length) {
    list.innerHTML = `<div class="empty-state">Heniz kaydedilmis bir quiz sonucu yok.</div>`;
    return;
  }

  list.innerHTML = attempts
    .map(
      (attempt) => `
        <details class="attempt-card">
          <summary>
            <span>${formatDate(attempt.createdAt)}</span>
            <strong>${attempt.correctCount}/${attempt.total} dogru</strong>
            <span>${attempt.score} puan</span>
          </summary>
          <ol class="results-list compact-list">
            ${attempt.answers
              .map(
                (answer, index) => `
                  <li class="${answer.isCorrect ? "answer-correct" : "answer-wrong"}">
                    <strong>${index + 1}. soru</strong> •
                    Secilen: ${escapeHtml(answer.selectedAnswer)} •
                    Dogru: ${escapeHtml(answer.correctAnswer)}
                  </li>
                `
              )
              .join("")}
          </ol>
        </details>
      `
    )
    .join("");
}

function renderQuizPage() {
  const page = document.querySelector("[data-quiz-page]");
  if (!page) {
    return;
  }

  const gate = document.getElementById("quiz-gate");
  const shell = document.getElementById("quiz-shell");
  const quizForm = document.getElementById("quiz-form");
  const quizBody = document.getElementById("quiz-body");
  const quizMessage = document.getElementById("quiz-message");
  const quizResult = document.getElementById("quiz-result");
  const currentUser = getCurrentUser();

  if (!currentUser) {
    gate.innerHTML = `
      <div class="gate-card">
        <h2>Quiz icin giris gerekli</h2>
        <p>Ogrencilerin kayit olup giris yapmasi gerekiyor.</p>
        <a class="button button-primary" href="giris.html">Giris ve Kayit</a>
      </div>
    `;
    shell.hidden = true;
    return;
  }

  if (currentUser.role === "teacher") {
    gate.innerHTML = `
      <div class="gate-card">
        <h2>Ogretmen hesabi ile acik</h2>
        <p>Ogretmenler quiz yerine ogrenci sonuc panelini kullanir.</p>
        <a class="button button-primary" href="ogretmen-paneli.html">Ogretmen Paneli</a>
      </div>
    `;
    shell.hidden = true;
    return;
  }

  gate.hidden = true;
  shell.hidden = false;
  quizBody.innerHTML = renderQuizQuestions();
  renderStudentAttempts(currentUser.id);

  quizForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    quizMessage.textContent = "";

    const formData = new FormData(quizForm);
    const answeredCount = QUIZ_QUESTIONS.filter((_, index) => formData.get(`q-${index}`) !== null).length;

    if (answeredCount !== QUIZ_QUESTIONS.length) {
      quizMessage.textContent = "Lutfen 10 sorunun tamamini cevapla.";
      return;
    }

    const result = evaluateQuiz(formData);
    saveAttempt(currentUser, result);
    quizResult.innerHTML = renderQuizResult(result);
    quizForm.reset();
    renderStudentAttempts(currentUser.id);
  });
}

function renderTeacherDashboard() {
  const page = document.querySelector("[data-teacher-page]");
  if (!page) {
    return;
  }

  const gate = document.getElementById("teacher-gate");
  const dashboard = document.getElementById("teacher-dashboard");
  const currentUser = getCurrentUser();

  if (!currentUser) {
    gate.innerHTML = `
      <div class="gate-card">
        <h2>Panel icin giris gerekli</h2>
        <p>Ogretmen hesabi ile giris yapmalisiniz.</p>
        <a class="button button-primary" href="giris.html">Ogretmen Girisi</a>
      </div>
    `;
    dashboard.hidden = true;
    return;
  }

  if (currentUser.role !== "teacher") {
    gate.innerHTML = `
      <div class="gate-card">
        <h2>Bu alan sadece ogretmen icin</h2>
        <p>Ogrenci hesabi ile quiz sayfasina donebilirsiniz.</p>
        <a class="button button-primary" href="mini-lab.html">Quiz Sayfasi</a>
      </div>
    `;
    dashboard.hidden = true;
    return;
  }

  gate.hidden = true;
  dashboard.hidden = false;

  const attempts = getAttempts().sort(
    (left, right) => new Date(right.createdAt) - new Date(left.createdAt)
  );
  const students = getUsers().filter((user) => user.role === "student");
  const totalScore = attempts.reduce((sum, attempt) => sum + attempt.score, 0);
  const averageScore = attempts.length ? Math.round(totalScore / attempts.length) : 0;

  document.getElementById("teacher-stats").innerHTML = `
    <article class="stat-card">
      <span>Kayitli ogrenci</span>
      <strong>${students.length}</strong>
    </article>
    <article class="stat-card">
      <span>Toplam quiz</span>
      <strong>${attempts.length}</strong>
    </article>
    <article class="stat-card">
      <span>Ortalama puan</span>
      <strong>${averageScore}</strong>
    </article>
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
        <thead>
          <tr>
            <th>Ogrenci</th>
            <th>Sinif</th>
            <th>Dogru</th>
            <th>Yanlis</th>
            <th>Puan</th>
            <th>Tarih</th>
          </tr>
        </thead>
        <tbody>
          ${attempts
            .map(
              (attempt) => `
                <tr>
                  <td>${escapeHtml(attempt.studentName)}</td>
                  <td>${escapeHtml(attempt.className)}</td>
                  <td>${attempt.correctCount}</td>
                  <td>${attempt.wrongCount}</td>
                  <td>${attempt.score}</td>
                  <td>${formatDate(attempt.createdAt)}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  detailHost.innerHTML = attempts
    .map(
      (attempt) => `
        <details class="attempt-card" open>
          <summary>
            <span>${escapeHtml(attempt.studentName)} • ${escapeHtml(attempt.className)}</span>
            <strong>${attempt.correctCount}/${attempt.total} dogru</strong>
            <span>${formatDate(attempt.createdAt)}</span>
          </summary>
          <ol class="results-list compact-list">
            ${attempt.answers
              .map(
                (answer, index) => `
                  <li class="${answer.isCorrect ? "answer-correct" : "answer-wrong"}">
                    <strong>${index + 1}. soru</strong> •
                    Secilen: ${escapeHtml(answer.selectedAnswer)} •
                    Dogru: ${escapeHtml(answer.correctAnswer)}
                  </li>
                `
              )
              .join("")}
          </ol>
        </details>
      `
    )
    .join("");

  const downloadButton = document.getElementById("download-results");
  downloadButton?.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(attempts, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "quiz-sonuclari.json";
    link.click();
    URL.revokeObjectURL(url);
  });
}

function initPortal() {
  seedTeacherAccount();
  renderSessionBadges();
  renderLoginPage();
  renderQuizPage();
  renderTeacherDashboard();
}

initPortal();
