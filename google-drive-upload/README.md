# Google Drive Upload Bridge

Bu klasor, ogrenci dosyalarini ogretmenin Google Drive hesabindaki `bilsemprj` klasorune yuklemek icin kullanilan Google Apps Script ornegini icerir.

## Kurulum

1. Google Drive uzerinden yeni bir Apps Script projesi olusturun.
2. `Code.gs` dosyasinin icerigini proje icindeki `Code.gs` dosyasina yapistirin.
3. `upload.html` dosyasini yeni bir HTML dosyasi olarak ekleyin.
4. Scripti `Deploy > New deployment > Web app` ile yayinlayin.
5. `Execute as` degeri kendi hesabiniz olsun.
6. Uretilen web app adresini `portal-config.js` icindeki `googleDriveUpload.webAppUrl` alanina yazin.

## Ne yapar

- `bilsemprj` klasorunu bulur, yoksa olusturur.
- Her ogrenci icin ayri alt klasor acar.
- Yuklenen dosyayi ilgili ogrenci klasorune kaydeder.
- Firestore `projects` koleksiyonuna proje kaydi olusturur.
- Portal penceresine dosya metaverisini geri yollar.
