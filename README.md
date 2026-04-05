# Algoritma Portali

Bu proje, 5. sinif ogrencileri icin hazirlanmis algoritma portalidir.

## Sayfalar

- `index.html`: Ana sayfa
- `algoritma-nedir.html`: Algoritma tanimi
- `neden-onemli.html`: Neden onemli oldugu
- `gunluk-hayat.html`: Gunluk hayat ornekleri
- `giris.html`: Ogrenci kaydi ve giris
- `mini-lab.html`: Quiz alani
- `proje-yonetimi.html`: Proje yukleme, degerlendirme ve mesajlasma alani
- `ogretmen-paneli.html`: Quiz sonuclari ve analiz paneli

## Veri modlari

- `local`: Veriler ayni tarayici icinde tutulur.
- `firebase`: Gercek cok kullanicili kullanim icin Firebase Auth ve Firestore kullanilir.

Aktif mod `portal-config.js` dosyasindan belirlenir.

## Yeni ozellikler

- Ogrenci kaydi ve girisi
- Quiz sonuclarinin kaydi
- Ogrencinin proje dosyasini Google Drive uzerindeki `bilsemprj` klasorune yukleme akisi
- Ayrik proje yonetimi sayfasi
- Ogretmenin proje degerlendirmesi yazabilmesi
- Ogrenci ve ogretmen arasinda iki yonlu mesajlasma

## Dosya yapisi

- `portal-config.js`: Web uygulama ayarlari, ogretmen e-postalari ve Google Drive yukleme koprusu
- `portal-data.js`: Yerel ve Firebase veri katmani
- `portal.js`: Arayuz mantigi
- `firebase.json`: Hosting ve Firestore yapilandirmasi
- `firestore.rules`: Guvenlik kurallari
- `firestore.indexes.json`: Firestore index yapisi
- `google-drive-upload/`: Google Apps Script yukleme penceresi ornegi

## Google Drive entegrasyonu

Portal, dosyayi dogrudan tarayicidan sizin Google Drive hesabinizdaki klasore yazamaz. Bu nedenle repo icinde bir Google Apps Script koprusu bulunur.

Kurulum ozeti:

1. `google-drive-upload/Code.gs` ve `google-drive-upload/upload.html` dosyalarini yeni bir Apps Script projesine ekleyin.
2. Scripti web app olarak yayinlayin. Calisma hesabi sizin Google hesabiniz olsun.
3. Apps Script icinde gerekli Firebase bilgilerinin `Script properties` olarak tanimlandigindan emin olun.
4. Web app adresini `portal-config.js` icindeki `googleDriveUpload.webAppUrl` alanina yapistirin.
5. Script ilk yuklemede Drive icinde `bilsemprj` klasorunu olusturur ve ogrenci bazli alt klasorler acar.

## Guvenlik notu

- Firebase `apiKey`, `authDomain`, `projectId` gibi istemci ayarlari tek basina gizli kabul edilmez.
- Gercek kullanici sifreleri repoda tutulmamalidir.
- Apps Script tarafinda gerekli gizli bilgiler repoya yazilmak yerine `Script properties` icinde saklanmalidir.

## Onemli not

Gercek cok kullanicili sistemin canliya alinmasi icin bir Firebase projesi gerekir. Google Drive yukleme ozelligi icin de ayrica Apps Script web app koprusunun devreye alinmasi gerekir.
