# Algoritma Portali

Bu proje, 5. sinif ogrencilerinin anlayabilecegi duzeyde hazirlanmis bir GitHub Pages sitesidir.

## Sayfalar

- `index.html`: Ana sayfa
- `algoritma-nedir.html`: Algoritmanin temel tanimi
- `neden-onemli.html`: Algoritmalarin neden onemli oldugu
- `gunluk-hayat.html`: Gunluk hayattan ornekler
- `giris.html`: Ogrenci kaydi ve giris ekrani
- `mini-lab.html`: 10 soruluk quiz
- `ogretmen-paneli.html`: Quiz sonuclarinin goruldugu panel

## Bu surum nasil calisir?

- Ogrenciler `giris.html` sayfasindan kayit olabilir.
- Kayit olan ogrenci giris yapip `mini-lab.html` sayfasinda quiz cozer.
- Her quiz sonucu, dogru ve yanlis cevap detaylari ile birlikte kaydedilir.
- Ogretmen hesabi ile `ogretmen-paneli.html` sayfasinda tum sonuclar gorulebilir.

## Varsayilan ogretmen hesabi

- E-posta: `ogretmen@algoritma-portal.local`
- Sifre: `Ogretmen123`

Bu bilgiler `portal-config.js` dosyasindan degistirilebilir.

## Onemli not

Bu surumde veriler `localStorage` kullanilarak tarayicida saklanir. Yani:

- Sonuclar ayni tarayici ve ayni cihaz icinde gorunur.
- Farkli cihazlardan girilen ogrenci verileri ortak olarak birlesmez.

Tum cihazlardan ortak kayit, gercek kullanici dogrulamasi ve merkezi sonuc takibi isteniyorsa Firebase veya Supabase gibi bir servis baglanmalidir.

## GitHub Pages ile yayinlama

1. Dosyalari bir GitHub deposuna yukleyin.
2. `Settings > Pages` bolumune gidin.
3. `Source` olarak `Deploy from a branch` secin.
4. Branch olarak `main`, klasor olarak `/ (root)` secin.
5. Kaydedin. Birkac dakika sonra site yayinlanir.
