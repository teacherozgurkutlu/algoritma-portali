# Altieylul BILSEM Proje Yonetim Sistemi

Bu repo, eski algoritma portalinin proje yonetimi odakli surume donusturulmus halidir.

## Ana moduller

- `index.html`: Portal tanitimi ve yeni akis
- `giris.html`: Ogrenci, ogretmen ve admin giris/kayit ekrani
- `mini-lab.html`: Ogrenci quiz merkezi, ogretmen/admin quiz olusturma alani
- `proje-yonetimi.html`: Proje yukleme, degerlendirme ve mesajlasma
- `ogretmen-paneli.html`: Admin atama ekrani ve yonetim raporlari

## Rol modeli

- `student`: Kendi quiz, proje ve mesaj alanini gorur
- `teacher`: Yalnizca atanmis ogrencilerini gorur, quiz hazirlar, projeleri ve mesajlari yonetir
- `admin`: Tum ogrencileri, ogretmenleri, quizleri, projeleri, mesajlari ve sonuclari gorur; ogretmen atamasi yapar

## Veri katmani

- `portal-config.js`: Portal adi, admin hesabi, Firebase ve Drive ayarlari
- `portal-data.js`: Yerel/Firebase veri erisimi, rol ve atama mantigi
- `portal.js`: Rol bazli arayuz akislarinin tamami
- `firestore.rules`: Yeni rol modeline gore Firestore kurallari

## Notlar

- Proje yukleme akisi mevcut Google Apps Script koprusunu kullanir.
- Firebase tarafinda ek ogretmen e-postalari tanimlanacaksa `portal-config.js` ile birlikte `firestore.rules` da guncellenmelidir.
