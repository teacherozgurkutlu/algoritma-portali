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
6. `firestore.rules` icindeki `teacher@example.com` degerini gercek ogretmen e-postasi ile degistirme

Dosyalar hazir:

- `firebase.json`
- `firestore.rules`
- `firestore.indexes.json`
- `portal-config.js`
- `portal-data.js`
