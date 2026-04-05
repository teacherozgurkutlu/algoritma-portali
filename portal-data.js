export const QUIZ_QUESTIONS = [
  { prompt: "Algoritma en dogru hangi tanimla aciklanir?", options: ["Bir hedefe ulasmak icin izlenen acik ve sirali adimlar", "Aklimiza geleni hemen yapmak", "Sadece bilgisayar oyunlarinin kurali", "Sadece matematikte kullanilan bir kelime"], correctIndex: 0, explanation: "Algoritma; acik, sirali ve bir sonuca goturen adimlar butunudur." },
  { prompt: "Asagidakilerden hangisi algoritma ozelligi tasir?", options: ["Rastgele baslayip rastgele bitmek", "Adimlarin yerinin belli olmasi", "Kurallarin surekli degismesi", "Sonucun onemsiz olmasi"], correctIndex: 1, explanation: "Algoritmada adimlarin duzeni ve sirasi nettir." },
  { prompt: "Bir sandvic algoritmasinda girdi hangisidir?", options: ["Hazir sandvic", "Malzemeler", "Yeme islemi", "Masa ortusu"], correctIndex: 1, explanation: "Girdi, algoritmanin basinda kullandigimiz bilgi veya malzemelerdir." },
  { prompt: "Bir algoritmanin sonunda ortaya cikan sey ne olabilir?", options: ["Cikti", "Baslangic", "Kararsizlik", "Bosluk"], correctIndex: 0, explanation: "Algoritma sonunda bir sonuc yani cikti elde edilir." },
  { prompt: "Neden adimlarin dogru sirada olmasi gerekir?", options: ["Cunku siralama sadece ogretmen icindir", "Cunku yanlis sira sonucu bozabilir", "Cunku algoritma hic degisemez", "Cunku sadece hizli olmak yeterlidir"], correctIndex: 1, explanation: "Yanlis sira, islemin dogru sonuc vermesini engelleyebilir." },
  { prompt: "Asagidakilerden hangisi iyi bir algoritmanin ozelligidir?", options: ["Belirsiz ve karmasik olmasi", "Sonunun belli olmamasi", "Acik ve anlasilir olmasi", "Her defasinda degismesi"], correctIndex: 2, explanation: "Iyi algoritma acik, anlasilir ve takip edilebilir olur." },
  { prompt: "\"Hava yagmurluysa semsiye al\" ifadesi hangi dusunceyi gosterir?", options: ["Tekrar", "Karar verme", "Rastgelelik", "Bitis"], correctIndex: 1, explanation: "Kosula gore farkli adim secmek karar verme adimidir." },
  { prompt: "\"5 soru cozulene kadar tekrar et\" cumlesi hangi fikre ornektir?", options: ["Tekrar", "Cikti", "Yanlis siralama", "Tesaduf"], correctIndex: 0, explanation: "Ayni adimin belirli bir kosula kadar surmesi tekrar mantigidir." },
  { prompt: "Algoritmalar neden buyuk problemleri cozmeyi kolaylastirir?", options: ["Problemi gizledigi icin", "Problemi kucuk adimlara boldugu icin", "Zorlugu arttirdigi icin", "Kurallari sildigi icin"], correctIndex: 1, explanation: "Buyuk isleri kucuk parcalara ayirmak cozum surecini kolaylastirir." },
  { prompt: "Asagidakilerden hangisi algoritmanin gunluk hayattaki bir ornegidir?", options: ["Navigasyonun yol tarifi vermesi", "Kalemi masaya birakmak", "Pencereye bakmak", "Sadece beklemek"], correctIndex: 0, explanation: "Yol tarifleri belirli bir hedefe goturen sirali adimlar verir." },
  { prompt: "Ders calisma planinda hangi sira daha uygundur?", options: ["Tekrar et, konuyu oku, ornek coz", "Konuyu oku, ornek coz, yanlislarini kontrol et", "Defteri kapat, sorulari atla, sonra dusun", "Rastgele soru sec, sonra kitabi ac"], correctIndex: 1, explanation: "Ders calismada da mantikli ve ilerleyen bir sira gerekir." },
  { prompt: "Ayni hedefe ulasan iki algoritma arasindaki fark ne olabilir?", options: ["Biri daha verimli olabilir", "Ikisi de mutlaka ayni hizdadir", "Ikisi de kuralsizdir", "Fark olmasi imkansizdir"], correctIndex: 0, explanation: "Ayni sonuca ulasan algoritmalarin hizi ve duzeni farkli olabilir." },
  { prompt: "Asagidakilerden hangisi yanlistir?", options: ["Algoritmalar sadece bilgisayarlarda kullanilir", "Algoritmalar yemek tariflerinde de gorulur", "Algoritmalar oyun kurallarinda bulunabilir", "Algoritmalar plan yapmayi kolaylastirir"], correctIndex: 0, explanation: "Algoritmalar sadece bilgisayarlarda degil, gunluk hayatta da vardir." },
  { prompt: "Cantayi kapatmadan once malzemeleri kontrol etmek hangi asamaya benzer?", options: ["Denetim ve kontrol", "Rastgele secim", "Bitisi atlama", "Kuralsiz ilerleme"], correctIndex: 0, explanation: "Iyi bir algoritmada sonucu kontrol etmek onemli bir asamadir." },
  { prompt: "Bir algoritmada adimlardan biri eksik kalirsa ne olabilir?", options: ["Sonuc etkilenmeyebilir ama her zaman degil", "Sonuc her zaman daha iyi olur", "Eksik adim onemli degildir", "Algoritma otomatik duzelir"], correctIndex: 0, explanation: "Bazi adimlar kritik olabilir; eksik kalirsa sonuc bozulabilir." },
  { prompt: "Asagidakilerden hangisi girdi-islem-cikti yapisina uygundur?", options: ["Malzeme - adimlar - hazir urun", "Bitis - baslangic - hata", "Renk - bekleme - bosluk", "Oyun - ses - masa"], correctIndex: 0, explanation: "Girdi once gelir, sonra islem yapilir, en sonda cikti elde edilir." },
  { prompt: "Robotlarin ve oyunlarin dogru calismasi neden algoritmaya baglidir?", options: ["Cunku makine ve yazilimlar komutlari sirayla uygular", "Cunku sadece sansla hareket ederler", "Cunku kuralsiz sistemler daha iyidir", "Cunku enerji yerine hayal gucu kullanirlar"], correctIndex: 0, explanation: "Yazilim ve robotik sistemler, acik komutlar ve algoritmalarla calisir." },
  { prompt: "Algoritmik dusunme hangi beceriyi guclendirir?", options: ["Plan yapma ve neden-sonuc kurma", "Kurallari tamamen yok sayma", "Bosuna zaman harcama", "Dusunmeden hareket etme"], correctIndex: 0, explanation: "Algoritmik dusunme planlama ve mantikli karar verme becerisini gelistirir." },
  { prompt: "Bir isi her gun benzer sirayla yapmak neyi gosterir?", options: ["Tekrar eden bir algoritma kullandigimizi", "Kuralsiz davrandigimizi", "Algoritmanin ise yaramadigini", "Sonucun gereksiz oldugunu"], correctIndex: 0, explanation: "Her gun ayni duzende yapilan isler tekrar eden algoritmalara ornektir." },
  { prompt: "Algoritmanin en temel amaclarindan biri hangisidir?", options: ["Karisikligi azaltip isi daha kontrollu hale getirmek", "Her isi daha karisik yapmak", "Adimlari gizlemek", "Sonucu onemsiz hale getirmek"], correctIndex: 0, explanation: "Algoritmalar isleri daha duzenli, kontrollu ve anlasilir hale getirir." }
];

const STORAGE_KEYS = {
  users: "algoritmaPortaliUsers",
  session: "algoritmaPortaliSession",
  attempts: "algoritmaPortaliAttempts",
  projects: "algoritmaPortaliProjects",
  messages: "algoritmaPortaliMessages"
};

const PORTAL_CONFIG = window.PORTAL_CONFIG || {};
const ADMIN_CONFIG = PORTAL_CONFIG.admin || { name: "Ogretmen", email: "ogretmen@algoritma-portal.local" };
const LOCAL_ADMIN_PASSWORD = String(PORTAL_CONFIG.admin?.localPassword || "YerelOgretmen123!");
const FIREBASE_CONFIG = PORTAL_CONFIG.firebase || { teacherEmails: [], config: {} };
const GOOGLE_DRIVE_UPLOAD_CONFIG = PORTAL_CONFIG.googleDriveUpload || { webAppUrl: "", folderName: "bilsemprj", maxFileSizeMb: 20 };

export function normalizeEmail(value) { return String(value || "").trim().toLowerCase(); }
export function escapeHtml(value) { return String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;"); }
function createId(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
function readJson(key, fallback) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } }
function writeJson(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

export function normalizeDateValue(value) {
  if (!value) return new Date().toISOString();
  if (typeof value === "string") return value;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (typeof value.seconds === "number") return new Date(value.seconds * 1000).toISOString();
  return new Date().toISOString();
}

export function formatDate(value) { return new Date(normalizeDateValue(value)).toLocaleString("tr-TR"); }
export function sortAttemptsNewestFirst(items) { return [...items].sort((a, b) => new Date(normalizeDateValue(b.createdAt)) - new Date(normalizeDateValue(a.createdAt))); }
export function sortProjectsNewestFirst(items) { return [...items].sort((a, b) => new Date(normalizeDateValue(b.uploadedAt)) - new Date(normalizeDateValue(a.uploadedAt))); }
export function sortMessagesOldestFirst(items) { return [...items].sort((a, b) => new Date(normalizeDateValue(a.createdAt)) - new Date(normalizeDateValue(b.createdAt))); }

export function isFirebaseModeConfigured() {
  return PORTAL_CONFIG.storageMode === "firebase" && Boolean(FIREBASE_CONFIG.config?.apiKey) && Boolean(FIREBASE_CONFIG.config?.projectId);
}

export function getTeacherEmails() {
  return (FIREBASE_CONFIG.teacherEmails || []).map((email) => normalizeEmail(email)).filter(Boolean);
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

function isTeacherEmail(email) {
  return getTeacherEmails().includes(normalizeEmail(email));
}

export function getModeLabel() {
  return isFirebaseModeConfigured() ? "Firebase" : "Yerel";
}

function buildProjectRecord(user, payload, overrides = {}) {
  return {
    requestId: String(payload.requestId || ""),
    userId: user.id,
    studentName: user.name,
    className: user.className,
    email: user.email,
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
    ...overrides
  };
}

function buildMessageRecord(studentId, text, sender, overrides = {}) {
  return {
    studentId,
    senderId: sender.id,
    senderName: sender.name,
    senderRole: sender.role,
    text: String(text || "").trim(),
    ...overrides
  };
}

function buildLocalDataLayer() {
  function getUsers() { return readJson(STORAGE_KEYS.users, []); }
  function saveUsers(users) { writeJson(STORAGE_KEYS.users, users); }
  function getAttempts() { return readJson(STORAGE_KEYS.attempts, []); }
  function saveAttempts(attempts) { writeJson(STORAGE_KEYS.attempts, attempts); }
  function getProjects() { return readJson(STORAGE_KEYS.projects, []); }
  function saveProjects(projects) { writeJson(STORAGE_KEYS.projects, projects); }
  function getMessages() { return readJson(STORAGE_KEYS.messages, []); }
  function saveMessages(messages) { writeJson(STORAGE_KEYS.messages, messages); }
  function getSession() { return readJson(STORAGE_KEYS.session, null); }
  function setSession(userId) { writeJson(STORAGE_KEYS.session, { userId }); }
  function clearSession() { localStorage.removeItem(STORAGE_KEYS.session); }
  function getCurrentUser() { const session = getSession(); return session ? getUsers().find((user) => user.id === session.userId) || null : null; }

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
      password: LOCAL_ADMIN_PASSWORD,
      createdAt: new Date().toISOString()
    };
    users.push(teacher);
    saveUsers(users);
    return teacher;
  }

  return {
    mode: "local",
    adminConfig: ADMIN_CONFIG,
    async ensureSetup() { seedTeacherAccount(); return getCurrentUser(); },
    async registerUser(payload) {
      const users = getUsers();
      const email = normalizeEmail(payload.email);
      if (users.some((user) => normalizeEmail(user.email) === email)) throw new Error("Bu e-posta zaten kayitli.");
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
      setSession(user.id);
      return user;
    },
    async loginUser(email, password) {
      const user = getUsers().find((item) => normalizeEmail(item.email) === normalizeEmail(email) && item.password === password);
      if (!user) throw new Error("E-posta veya sifre hatali.");
      setSession(user.id);
      return user;
    },
    async logoutUser() { clearSession(); },
    async getCurrentUser() { return getCurrentUser(); },
    async saveAttempt(user, result) {
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
    },
    async listAttemptsForUser(userId) { return sortAttemptsNewestFirst(getAttempts().filter((attempt) => attempt.userId === userId)); },
    async saveProjectRecord(user, payload) {
      const projects = getProjects();
      const projectId = payload.requestId || createId("project");
      const existingIndex = projects.findIndex((item) => item.id === projectId);
      const record = {
        id: projectId,
        ...buildProjectRecord(user, payload, { uploadedAt: new Date().toISOString() })
      };
      if (existingIndex >= 0) {
        projects[existingIndex] = { ...projects[existingIndex], ...record };
      } else {
        projects.push(record);
      }
      saveProjects(projects);
    },
    async listProjectsForUser(userId) { return sortProjectsNewestFirst(getProjects().filter((project) => project.userId === userId)); },
    async saveProjectReview(projectId, reviewText, actor) {
      const projects = getProjects();
      const project = projects.find((item) => item.id === projectId);
      if (!project) throw new Error("Proje kaydi bulunamadi.");
      project.reviewText = String(reviewText || "").trim();
      project.reviewUpdatedAt = new Date().toISOString();
      project.reviewUpdatedBy = actor.id;
      project.reviewUpdatedByName = actor.name;
      saveProjects(projects);
    },
    async sendMessage({ studentId, text, sender }) {
      const cleanText = String(text || "").trim();
      if (!cleanText) throw new Error("Mesaj bos olamaz.");
      const messages = getMessages();
      messages.push({
        id: createId("message"),
        ...buildMessageRecord(studentId, cleanText, sender, { createdAt: new Date().toISOString() })
      });
      saveMessages(messages);
    },
    async listMessagesForUser(userId) { return sortMessagesOldestFirst(getMessages().filter((message) => message.studentId === userId)); },
    async getStudentWorkspace(userId) {
      return {
        projects: await this.listProjectsForUser(userId),
        messages: await this.listMessagesForUser(userId)
      };
    },
    subscribeStudentWorkspace(userId, callback) { this.getStudentWorkspace(userId).then(callback); return () => {}; },
    async getTeacherSnapshot() {
      return {
        attempts: sortAttemptsNewestFirst(getAttempts()),
        students: getUsers().filter((user) => user.role === "student"),
        projects: sortProjectsNewestFirst(getProjects()),
        messages: sortMessagesOldestFirst(getMessages())
      };
    },
    subscribeTeacherSnapshot(callback) { this.getTeacherSnapshot().then(callback); return () => {}; }
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
    serverTimestamp
  } = firestoreModule;

  const app = initializeApp(FIREBASE_CONFIG.config);
  const auth = getAuth(app);
  const db = getFirestore(app);

  async function upsertProfile(authUser, extra = {}) {
    const role = isTeacherEmail(authUser.email) ? "teacher" : "student";
    const ref = doc(db, "users", authUser.uid);
    const snap = await getDoc(ref);
    const current = snap.exists() ? snap.data() : {};
    const profile = {
      uid: authUser.uid,
      email: normalizeEmail(authUser.email),
      name: extra.name || current.name || authUser.displayName || authUser.email,
      className: extra.className || current.className || (role === "teacher" ? "Ogretmen" : ""),
      role,
      updatedAt: serverTimestamp()
    };
    if (!snap.exists()) profile.createdAt = serverTimestamp();
    await setDoc(ref, profile, { merge: true });
    return { id: authUser.uid, email: profile.email, name: profile.name, className: profile.className, role };
  }

  async function resolveCurrentUser() {
    const authUser = await new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => { unsubscribe(); resolve(user); }, (error) => { unsubscribe(); reject(error); });
    });
    return authUser ? upsertProfile(authUser) : null;
  }

  function mapAttempt(docSnap) {
    const data = docSnap.data();
    return { id: docSnap.id, ...data, createdAt: normalizeDateValue(data.createdAt) };
  }

  function mapUser(docSnap) {
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

  function subscribeWorkspace(queryRef, mapFn, assignItems, publish, onError) {
    return onSnapshot(queryRef, (snapshot) => {
      assignItems(snapshot.docs.map(mapFn));
      publish();
    }, onError);
  }

  return {
    mode: "firebase",
    adminConfig: ADMIN_CONFIG,
    async ensureSetup() { return resolveCurrentUser(); },
    async registerUser(payload) {
      const credential = await createUserWithEmailAndPassword(auth, normalizeEmail(payload.email), payload.password);
      await updateProfile(credential.user, { displayName: payload.name.trim() });
      return upsertProfile(credential.user, { name: payload.name.trim(), className: payload.className.trim() });
    },
    async loginUser(email, password) {
      const credential = await signInWithEmailAndPassword(auth, normalizeEmail(email), password);
      return upsertProfile(credential.user);
    },
    async logoutUser() { await signOut(auth); },
    async getCurrentUser() { return auth.currentUser ? upsertProfile(auth.currentUser) : null; },
    async saveAttempt(user, result) {
      await addDoc(collection(db, "attempts"), {
        userId: user.id,
        studentName: user.name,
        className: user.className,
        email: user.email,
        score: result.score,
        total: QUIZ_QUESTIONS.length,
        correctCount: result.correctCount,
        wrongCount: result.wrongCount,
        answers: result.answers,
        createdAt: serverTimestamp()
      });
    },
    async listAttemptsForUser(userId) {
      const snapshot = await getDocs(query(collection(db, "attempts"), where("userId", "==", userId)));
      return sortAttemptsNewestFirst(snapshot.docs.map(mapAttempt));
    },
    async saveProjectRecord(user, payload) {
      const record = {
        ...buildProjectRecord(user, payload, {
          uploadedAt: serverTimestamp(),
          reviewUpdatedAt: null,
          reviewUpdatedBy: null,
          reviewUpdatedByName: null
        })
      };
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
        reviewUpdatedByName: actor.name
      });
    },
    async sendMessage({ studentId, text, sender }) {
      const cleanText = String(text || "").trim();
      if (!cleanText) throw new Error("Mesaj bos olamaz.");
      await addDoc(collection(db, "messages"), {
        ...buildMessageRecord(studentId, cleanText, sender, { createdAt: serverTimestamp() })
      });
    },
    async listMessagesForUser(userId) {
      const snapshot = await getDocs(query(collection(db, "messages"), where("studentId", "==", userId)));
      return sortMessagesOldestFirst(snapshot.docs.map(mapMessage));
    },
    async getStudentWorkspace(userId) {
      const [projectsSnapshot, messagesSnapshot] = await Promise.all([
        getDocs(query(collection(db, "projects"), where("userId", "==", userId))),
        getDocs(query(collection(db, "messages"), where("studentId", "==", userId)))
      ]);
      return {
        projects: sortProjectsNewestFirst(projectsSnapshot.docs.map(mapProject)),
        messages: sortMessagesOldestFirst(messagesSnapshot.docs.map(mapMessage))
      };
    },
    subscribeStudentWorkspace(userId, callback, onError) {
      const cache = { projects: [], messages: [] };
      const publish = () => callback({
        projects: sortProjectsNewestFirst(cache.projects),
        messages: sortMessagesOldestFirst(cache.messages)
      });

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

      return () => {
        unsubscribeProjects();
        unsubscribeMessages();
      };
    },
    async getTeacherSnapshot() {
      const [attemptsSnapshot, usersSnapshot, projectsSnapshot, messagesSnapshot] = await Promise.all([
        getDocs(collection(db, "attempts")),
        getDocs(collection(db, "users")),
        getDocs(collection(db, "projects")),
        getDocs(collection(db, "messages"))
      ]);
      return {
        attempts: sortAttemptsNewestFirst(attemptsSnapshot.docs.map(mapAttempt)),
        students: usersSnapshot.docs.map(mapUser).filter((user) => user.role === "student"),
        projects: sortProjectsNewestFirst(projectsSnapshot.docs.map(mapProject)),
        messages: sortMessagesOldestFirst(messagesSnapshot.docs.map(mapMessage))
      };
    },
    subscribeTeacherSnapshot(callback, onError) {
      const cache = { attempts: [], students: [], projects: [], messages: [] };
      const publish = () => callback({
        attempts: sortAttemptsNewestFirst(cache.attempts),
        students: cache.students.filter((user) => user.role === "student"),
        projects: sortProjectsNewestFirst(cache.projects),
        messages: sortMessagesOldestFirst(cache.messages)
      });

      const unsubscribeAttempts = subscribeWorkspace(collection(db, "attempts"), mapAttempt, (items) => { cache.attempts = items; }, publish, onError);
      const unsubscribeUsers = subscribeWorkspace(collection(db, "users"), mapUser, (items) => { cache.students = items; }, publish, onError);
      const unsubscribeProjects = subscribeWorkspace(collection(db, "projects"), mapProject, (items) => { cache.projects = items; }, publish, onError);
      const unsubscribeMessages = subscribeWorkspace(collection(db, "messages"), mapMessage, (items) => { cache.messages = items; }, publish, onError);

      return () => {
        unsubscribeAttempts();
        unsubscribeUsers();
        unsubscribeProjects();
        unsubscribeMessages();
      };
    }
  };
}

export async function createDataLayer() {
  return isFirebaseModeConfigured() ? buildFirebaseDataLayer() : buildLocalDataLayer();
}
