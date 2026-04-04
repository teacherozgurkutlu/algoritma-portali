# Algoritma Portali

Bu proje, 5. sinif ogrencileri icin hazirlanmis algoritma portalidir.

## Sayfalar

- `index.html`: Ana sayfa
- `algoritma-nedir.html`: Algoritma tanimi
- `neden-onemli.html`: Neden onemli oldugu
- `gunluk-hayat.html`: Gunluk hayat ornekleri
- `giris.html`: Ogrenci kaydi ve giris
- `mini-lab.html`: 10 soruluk quiz
- `ogretmen-paneli.html`: Sonuc paneli

## Veri modlari

- `local`: Veriler ayni tarayici icinde tutulur.
- `firebase`: Gercek cok kullanicili kullanim icin Firebase Auth ve Firestore kullanilir.

Aktif mod `portal-config.js` dosyasindan belirlenir.

## Firebase dosyalari

- `portal-config.js`: Web uygulama ayarlari ve ogretmen e-postalari
- `portal-data.js`: Yerel ve Firebase veri katmani
- `portal.js`: Arayuz mantigi
- `firebase.json`: Hosting ve Firestore yapilandirmasi
- `firestore.rules`: Guvenlik kurallari
- `firestore.indexes.json`: Firestore index yapisi

## Onemli not

Gercek cok kullanicili sistemin canliya alinmasi icin bir Firebase projesi gerekir.
Bu ortamda Firebase girisi etkileşimli Google oturumu istedigi icin son aktivasyon adimi,
kisa bir kullanici onayi gerektirebilir.
