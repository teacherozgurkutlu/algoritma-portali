const ROOT_FOLDER_NAME = "bilsemprj";
const MAX_FILE_SIZE_MB = 20;

function doGet(e) {
  const template = HtmlService.createTemplateFromFile("upload");
  template.data = {
    requestId: String(e.parameter.requestId || ""),
    portalOrigin: String(e.parameter.portalOrigin || ""),
    studentId: String(e.parameter.studentId || ""),
    studentName: String(e.parameter.studentName || ""),
    className: String(e.parameter.className || ""),
    email: String(e.parameter.email || ""),
    maxFileSizeMb: MAX_FILE_SIZE_MB,
    rootFolderName: ROOT_FOLDER_NAME
  };

  return template
    .evaluate()
    .setTitle("BILSEM Proje Yukleme")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function uploadProject(formObject) {
  const fileBlob = extractUploadBlob_(formObject.projectFile);
  if (!fileBlob || typeof fileBlob.getBytes !== "function") {
    throw new Error("Lutfen bir dosya secin.");
  }

  const sizeMb = fileBlob.getBytes().length / (1024 * 1024);
  if (sizeMb > MAX_FILE_SIZE_MB) {
    throw new Error("Dosya boyutu limitin uzerinde.");
  }

  const projectTitle = sanitizeText_(formObject.projectTitle) || fileBlob.getName();
  const description = sanitizeText_(formObject.description);
  const studentName = sanitizeText_(formObject.studentName) || "Ogrenci";
  const className = sanitizeText_(formObject.className) || "Sinif-yok";
  const rootFolder = getOrCreateFolder_(ROOT_FOLDER_NAME, DriveApp.getRootFolder());
  const studentFolder = getOrCreateFolder_(`${studentName} - ${className}`, rootFolder);
  const finalName = sanitizeFileName_(fileBlob.getName());
  const uploadBlob = fileBlob.copyBlob().setName(finalName);
  const file = studentFolder.createFile(uploadBlob);
  const requestId = String(formObject.requestId || Utilities.getUuid());

  persistProjectToFirestore_(requestId, formObject, file, projectTitle, description);

  return {
    requestId,
    studentId: String(formObject.studentId || ""),
    title: projectTitle,
    description,
    driveFileId: file.getId(),
    driveFileUrl: file.getUrl(),
    driveFileName: file.getName(),
    mimeType: file.getMimeType(),
    size: file.getSize(),
    uploadedAt: new Date().toISOString()
  };
}

function extractUploadBlob_(value) {
  if (!value) {
    return null;
  }
  if (typeof value.getBytes === "function") {
    return value;
  }
  if (Array.isArray(value) && value.length && typeof value[0].getBytes === "function") {
    return value[0];
  }
  return null;
}

function persistProjectToFirestore_(requestId, formObject, file, projectTitle, description) {
  const config = getFirebaseUploadConfig_();
  const idToken = signInToFirebase_(config);
  const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents/projects/${encodeURIComponent(requestId)}`;
  const payload = {
    fields: {
      requestId: { stringValue: requestId },
      userId: { stringValue: String(formObject.studentId || "") },
      studentName: { stringValue: String(formObject.studentName || "") },
      className: { stringValue: String(formObject.className || "") },
      email: { stringValue: String(formObject.email || "") },
      title: { stringValue: projectTitle },
      description: { stringValue: description },
      driveFileId: { stringValue: file.getId() },
      driveFileUrl: { stringValue: file.getUrl() },
      driveFileName: { stringValue: file.getName() },
      mimeType: { stringValue: file.getMimeType() },
      size: { integerValue: String(file.getSize()) },
      reviewText: { stringValue: "" },
      reviewUpdatedAt: { nullValue: null },
      reviewUpdatedBy: { nullValue: null },
      reviewUpdatedByName: { nullValue: null },
      uploadedAt: { timestampValue: new Date().toISOString() }
    }
  };

  const response = UrlFetchApp.fetch(url, {
    method: "patch",
    contentType: "application/json",
    headers: {
      Authorization: `Bearer ${idToken}`
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  if (status < 200 || status >= 300) {
    throw new Error(`Firestore kaydi olusturulamadi: ${response.getContentText()}`);
  }
}

function signInToFirebase_(config) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${config.apiKey}`;
  const response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({
      email: config.teacherEmail,
      password: config.teacherPassword,
      returnSecureToken: true
    }),
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  const body = JSON.parse(response.getContentText());
  if (status < 200 || status >= 300 || !body.idToken) {
    throw new Error(`Firebase girisi basarisiz: ${response.getContentText()}`);
  }
  return body.idToken;
}

function getFirebaseUploadConfig_() {
  const properties = PropertiesService.getScriptProperties();
  return {
    apiKey: getRequiredScriptProperty_(properties, "FIREBASE_API_KEY"),
    projectId: getRequiredScriptProperty_(properties, "FIREBASE_PROJECT_ID"),
    teacherEmail: getRequiredScriptProperty_(properties, "FIREBASE_TEACHER_EMAIL"),
    teacherPassword: getRequiredScriptProperty_(properties, "FIREBASE_TEACHER_PASSWORD")
  };
}

function getRequiredScriptProperty_(properties, key) {
  const value = String(properties.getProperty(key) || "").trim();
  if (!value) {
    throw new Error(`Script property eksik: ${key}`);
  }
  return value;
}

function getOrCreateFolder_(name, parentFolder) {
  const folders = parentFolder.getFoldersByName(name);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parentFolder.createFolder(name);
}

function sanitizeText_(value) {
  return String(value || "").trim();
}

function sanitizeFileName_(value) {
  return sanitizeText_(value)
    .replace(/[\\/:*?"<>|]/g, "-")
    .slice(0, 180) || "proje";
}
