# Firebase Kurulum Notu

Bu proje Firebase'e hazir durumdadir. Canli cok kullanicili kullanim icin su bilgiler gerekir:

1. Firebase projesi
2. Web app `firebaseConfig` bilgileri
3. Email/Password auth etkinlestirme
4. Firestore database olusturma
5. `portal-config.js` icinde:
   - `storageMode: "firebase"`
   - `firebase.teacherEmails`
   - `firebase.config`
   - `googleDriveUpload.webAppUrl`
6. `firestore.rules` icindeki ogretmen e-posta kontrolunu gercek ogretmen e-postasi ile eslestirme
7. Google Drive yukleme icin `google-drive-upload` klasorundeki Apps Script ornegini ayaga kaldirma
8. Apps Script icindeki Firebase baglanti bilgilerini `Script properties` olarak tanimlama

Dosyalar hazir:

- `firebase.json`
- `firestore.rules`
- `firestore.indexes.json`
- `portal-config.js`
- `portal-data.js`

## Firestore koleksiyonlari

- `users`
- `attempts`
- `projects`
- `messages`

## Google Drive yukleme akisi

1. `google-drive-upload/Code.gs` ve `google-drive-upload/upload.html` dosyalarini yeni bir Apps Script projesine kopyalayin.
2. `Project Settings > Script properties` altinda `FIREBASE_API_KEY`, `FIREBASE_PROJECT_ID`, `FIREBASE_TEACHER_EMAIL`, `FIREBASE_TEACHER_PASSWORD` alanlarini tanimlayin.
3. Scripti web app olarak `Execute as: Me` seklinde yayinlayin.
4. Uretilen web app adresini `portal-config.js` icindeki `googleDriveUpload.webAppUrl` alanina girin.
5. Portal artik ogrenciler icin yukleme popup'ini acacak ve yuklenen dosyalar sizin Drive hesabinizdaki `bilsemprj` klasorune kaydedilecektir.

Not:

- `Script properties` degerlerini repoya commit etmeyin.
- `FIREBASE_TEACHER_PASSWORD` icin sadece Firebase Authentication'da aktif olan gercek bir hesap kullanin.
- `portal-config.js` icindeki web istemci `firebase.config` alanlari gizli sayilmaz; asil gizli bilgiler Apps Script `Script properties` veya benzeri secret store icinde tutulmalidir.
