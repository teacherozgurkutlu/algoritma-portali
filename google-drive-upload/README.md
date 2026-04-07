# Google Drive Upload Bridge

Bu klasor, ogrenci dosyalarini ogretmenin Google Drive hesabindaki `bilsemprj` klasorune yuklemek icin kullanilan Google Apps Script ornegini icerir.

## Kurulum

1. Google Drive uzerinden yeni bir Apps Script projesi olusturun.
2. `Code.gs` dosyasinin icerigini proje icindeki `Code.gs` dosyasina yapistirin.
3. `upload.html` dosyasini yeni bir HTML dosyasi olarak ekleyin.
4. `Project Settings > Script properties` alanina su anahtarlari girin:
   - `FIREBASE_API_KEY`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_TEACHER_EMAIL`
   - `FIREBASE_TEACHER_PASSWORD`
5. Scripti `Deploy > New deployment > Web app` ile yayinlayin.
6. `Execute as` degeri kendi hesabiniz olsun.
7. Uretilen web app adresini `portal-config.js` icindeki `googleDriveUpload.webAppUrl` alanina yazin.
8. Kod guncellediyseniz yeniden `Deploy > Manage deployments > Edit > Deploy` yapin.

## Sorun Giderme

- Hata: `Lutfen bir dosya secin.`
  Bu hata genelde eski deployment kullanildiginda gorulur. `Code.gs` ve `upload.html` dosyalarini guncelleyip yeniden deploy edin.
  Yeni surum dosyayi `base64` olarak gonderir; bu nedenle file-input aktarim uyumsuzluklarinda da calisir.

## Ne yapar

- `bilsemprj` klasorunu bulur, yoksa olusturur.
- Her ogrenci icin ayri alt klasor acar.
- Yuklenen dosyayi ilgili ogrenci klasorune kaydeder.
- Firestore `projects` koleksiyonuna proje kaydi olusturur.
- Portal penceresine dosya metaverisini geri yollar.
