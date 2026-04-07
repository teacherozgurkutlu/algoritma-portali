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
  const fileBlob = extractUploadBlob_(formObject);
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

function extractUploadBlob_(formObject) {
  if (!formObject) {
    return null;
  }

  const value = formObject.projectFile;
  if (value && typeof value.getBytes === "function") {
    return value;
  }
  if (Array.isArray(value) && value.length && typeof value[0].getBytes === "function") {
    return value[0];
  }

  const base64 = sanitizeText_(formObject.projectFileBase64);
  if (base64) {
    const name = sanitizeFileName_(formObject.projectFileName || "proje");
    const mimeType = sanitizeText_(formObject.projectFileMimeType) || "application/octet-stream";
    const bytes = Utilities.base64Decode(base64);
    return Utilities.newBlob(bytes, mimeType, name);
  }

  return null;
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
