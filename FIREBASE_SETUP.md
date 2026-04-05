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
2. Scripti web app olarak `Execute as: Me` seklinde yayinlayin.
3. Uretilen web app adresini `portal-config.js` icindeki `googleDriveUpload.webAppUrl` alanina girin.
4. Portal artik ogrenciler icin yukleme popup'ini acacak ve yuklenen dosyalar sizin Drive hesabinizdaki `bilsemprj` klasorune kaydedilecektir.
