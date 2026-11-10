# Arena: geliştirme kılavuzu

Kendi top dövüş oyunumuz. Ayrı proje: `D:\Projects\Arena`, GitHub `De1readh/arena`, yayında https://de1readh.github.io/arena/ (`main`'e push = yayın). Dock panelinin boşta ekranında da oynar. Her karakter chibi kafalı bir top. İki rastgele karakter dövüşür, maç bitince 4 sn "X KAZANDI" yazar, yeni maç başlar. Menü ve ses yok.
Dock'ta `static/arena` bu klasöre bağlantıdır (junction), ayrı kopya yok. Panel (`Dock/static/index.html`) oyunu yalnızca boştayken `/arena/` iframe'ine yükler (opaklık .5, dokunuş panele gider). Detay ekranındaki **ARENA** şeridi `/arena/istat.html` tam ekran istatistiğini açar. İstatistik kaydı tarayıcıda `localStorage['arena-istat']` içinde.

Bu dosya, başka bir sohbette karakter eklemek ya da oyunu geliştirmek için gereken her şeyi toplar. Kod içi kurallar `karakterler.js` başındaki yorumda da var.

## Dosyalar

| Dosya | Ne |
|---|---|
| `index.html` | Motor: fizik, çarpışma, vuruş (`o.vur`), çizim, HUD, demo, simülasyon, denge raporu |
| `karakterler.js` | Bütün karakterler (`KARAKTERLER` dizisi), çizim yardımcıları, `DENGE` standartları |
| `istat.html` | Panelde oynanan gerçek maçların tablosu |
| `yedek/` | Git'ten önceki yedekler (git'e girmez). En yenisi `karakterler.backup-yeat.js`; `index.weaponball-backup.html` eski oyun |

## Çalıştırma ve test

- **8765 Dock'un gerçek panel sunucusu, kapatma, testte kullanma.**
- Test sunucusu **8799**: `.claude/launch.json` içindeki `arena-test` (bu klasörü sunar). Adres: `http://localhost:8799/`.
- Kullanıcı sonuçları yan tarayıcıda demo olarak görmek istiyor.

URL anahtarları:

| Anahtar | Ne yapar |
|---|---|
| `?demo=CHUN-LI,PEELY&rakip=SUKUNA` | Skilleri sırayla gösterir (kukla saldırmaz, can dolar). `tek` skillde can %40'a iner. Skillin `demo()` kancası durumu hazırlar |
| `?denge=300` | Denge raporu: her ikili N maç; genel oran, hasar/sn, skill payları ve isabet, eşleşme tablosu, "çarpan öner" |
| `?sim=1000` / `?sim` | Ekransız N maç / kayıtlı istatistik |
| `?ucus=1` / `?ucus=0` | Herkesi uçurur / yere indirir |
| `?oran=1.3` | Arena oranını dener (denge 1.5 ve 1.3'te ölçüldü; `?dikey=1` 1.3 kullanır) |

Tarayıcı konsolunda işe yarayan parçalar (`?denge=1` sayfasında motor simülasyon kipinde yüklenir):

```js
// iki karakter arasında hızlı maç: kazanma oranı ve kimin hangi skille ne kadar vurduğu
cift=(A,B,K=300)=>{const i=KR.findIndex(k=>k.ad==A),j=KR.findIndex(k=>k.ad==B);let w=0,dm={};o.olc=(ad,s,d)=>{dm[ad.slice(0,3)+':'+s]=(dm[ad.slice(0,3)+':'+s]||0)+d};o.olcK=null;
 for(let n=0;n<K;n++){yeniMac(i,j);while(!o.bitti)tick();if(o.kazanan?.ad==A)w++}o.olc=null;for(const k in dm)dm[k]=+(dm[k]/K).toFixed(1);return {kaz:w/K,...dm}}
```

```js
// ?demo sayfasında: adı geçen skill başladıktan dt tick sonra oyunu dondurur (ekran görüntüsü için)
dondur=(ad,dt)=>new Promise(r=>{o.dur=0;const dm=document.getElementById('dm');let once=dm.textContent,t0=null;const iv=setInterval(()=>{const t=dm.textContent;
 if(t0==null&&t.includes(ad)&&!once.includes(ad))t0=o.t;once=t;if(t0!=null&&o.t-t0>=dt){o.dur=1e9;clearInterval(iv);r(o.t)}},2)});
// donmuş arenadan bir bölgeyi (arena koordinatı) büyütüp tam ekran gösterir; kapat() geri alır
buyut=(ax,ay,w,h)=>{const src=document.querySelector('canvas:not(#galeri)');let g=document.getElementById('galeri');if(!g){g=document.createElement('canvas');g.id='galeri';document.body.appendChild(g)}
 g.style.cssText='position:fixed;inset:0;z-index:99;background:#000;width:100vw;height:100vh';g.width=1000;g.height=900;const c=g.getContext('2d'),s=Math.min(1000/(w*SC),900/(h*SC));
 c.drawImage(src,(OX+ax)*SC,(OY+ay)*SC,w*SC,h*SC,0,0,w*SC*s,h*SC*s)};kapat=()=>document.getElementById('galeri')?.remove();
```

- Kafayı büyük görmek için `galeri` tuvaline `KR.find(k=>k.ad=='X').gorunum(c, {k, hafiza:{}, ez:0, vx:0, vy:0, r:24}, {t:100}, 0, 0)` çiz. `ez:9` acı yüzünü gösterir.
- Hit frame'i yakalamak için `vurusKaresi`'ni geçici sarmala; işlev bildirimi olduğu için yeniden atanabilir.
- `const` ile tanımlı yardımcılar (`fnKaynak` gibi) konsoldan değiştirilemez.
- Demo nesnelerinde `n.sk` yok, çünkü `o.demoAdim`, `o.sk` atanmadan önce çalışır.

## Kalıcı tasarım kararları (kullanıcıyla verildi)

- **Görünüm:**
  - OLED siyah zemin, neon can halkalı chibi kafa toplar, çok az yazı.
  - Arena sabit 660×440 dikdörtgen, ekranın ortasında.
  - Smash tarzı can göstergeleri arenanın iki yanında, asla arenanın içinde değil.
  - Arenada büyük hasar sayısı yok; hasar yan göstergede küçük "−N" olarak çıkar.
- **Kafa çizimi:**
  - Her karakterin kendi saç silüeti var, `sacCiz` ile noktadan çizilir; ortak diken saç fonksiyonu beğenilmedi.
  - Anime karakterleri ortak `goz()` ve `kas()` ile çizilir (`ag`: Isagi'nin ağ desenli irisi, `halka`: Makima'nın eş merkezli halkalı irisi), JJK tarzında: badem göz, bol beyaz, küçük düz iris, kalın üst kapak, tek parıltı. Kişilik ayarlarla korunur.
  - Anime olmayanlar (Peely) çizgi film tarzında.
  - Vurulunca `b.ez > 0` olur: `aciGoz` / `aciAgiz`.
- **Referans resmi:** Kullanıcı resim atarsa çizim ona sadık olmalı. Silah, eşya gibi ikonik şeyler karakterin satış noktası.
- **Efektler:**
  - "Her şeyimizi neon yapmayalım." Efekt skillin doğasına uyar: kan koyu ve damlayan, gölge mürekkep, chi sulu boya.
  - Karakter kendi darbe efektini `kaynak.vurFx` ile getirir.
- **Ekran:** Hiçbir skill ekranı kaplamaz (yarıçap ~150 px). Alan genişletme: `tek`, `alt: true` nesne, silik büyük kanji (`yazi()`), koyu arka plan.
- **Hit frame (`vurusKaresi`):**
  - Yalnızca büyük anlarda kullanılır.
  - Oyun bir an donar, arena siyah-beyaza döner (beyaz zemin, mürekkep siluetler), siyah hız çizgileri çıkar.
  - `ters=false` sürümü sadedir: daha kısa donma, yine siyah-beyaz kare ve beyaz flaş.
  - Siyah-beyaz geçiş `ciz()` sonunda `kareSiyahBeyaz` ile yapılır (o karedeki her efekt döner, yan göstergeler renkli yeniden çizilir). `ctx.filter` kullanma: PC'de kareyi ikiye katlıyor, iOS Safari'de yok (renkli negatif kalıyordu); karışım modları (saturation, difference, color-burn) kullanılır.
- **Dikey video düzeni (deneme):** `?dikey=1` 9:16 çerçeve, göstergeler arenanın üstünde ve altında eğik kesimli bantlarda (büyük kafa ileride karakter görseliyle değişecek), arena `oran` 1.3, VS menüsü gizli. `?dikey=2` ikisi üstte, `?dikey=3` dikey arena: kullanıcı 1'i seçti.
- **Maç sonu:** donmaz; 4 sn boyunca 100 kat ağır çekim (`YAVAS` .01, o anda durmuş gibi görünür), toplar kareler arasında kayar.
- **Futbol topu:**
  - Arenada tek top var; yalnızca topla oynayan karakter (`top: true`: Isagi, Kaiser) varken doğar.
  - Başka skiller topa dokunmaz.
  - **Tek top, el değiştirir** (kullanıcı kararı, rekabet mekaniği): serbest top (şutta değilken) topla oynayan başka karaktere değerse onun olur (`n.sahip`). Şut `sut(..., { atan })` ile atanı tutar; isabet kaynağı atanın `topKaynak` kancasından, isabet sonrası atanın `topVurdu` kancası çalışır. `t.kilit` (Gol Formülü, İmparatorun Tacı top çağırırken) çalınmayı engeller. Isagi–Kaiser maçında top ~18 kez el değiştirir.
- **İsabet sınıfları:** Her skill `isabet` sınıfı alır. Tutmayan skill seyirde anlamsız.

  | Sınıf | Aralık |
  |---|---|
  | guvenilir | %75+ |
  | normal | %55–90 |
  | nadir | %30–60 |
  | ulti | %85+ |
- **Denge standardı:**
  - Genel oran %45–55.
  - Eşleşmelerde 60-40 normal; 35–65 dışı kırmızıdır, düzeltilir.
  - Önce mekanik kollar: menzil, `kosul`, bekleme, isabet, hazırlık, geri tepme, hız, can, savunma, karşı mekanik. Hasar ve `guc` en son.

## Kullanıcıyla çalışma kuralları

- Türkçe konuş.
- Büyük adımdan önce ne yapacağını ve neye benzeyeceğini anlat, onay bekle.
- Değiştirmeden önce commit at (git yedeğin yerini aldı).
- Dengede önce ölç ve çözüm önerileri sun; kullanıcı "uygula" deyince uygula.
- Bitince demoda yan tarayıcıda göster. 8799'da test et, 8765'e dokunma.

## Yeni karakter rutini

1. Görünümü ve 5–6 skilli öner (pasif, sık temel vuruş, menzil, hareket, nadir büyük vuruş, ulti). Onay bekle.
2. Yedekle. Yardımcıları `const KARAKTERLER = [` satırının üstüne, karakteri dizinin sonuna ekle.
3. `?demo=AD` ile her skilli dondur, büyüt, bak: kafa küçük boyda da okunuyor mu, efekt rakibin altında kalıyor mu.
4. `?denge=300` çalıştır. Kırmızıları mekanikle düzelt (`cift()` ile ikili ikili bak). En son ±5 puan için can ya da `guc`.
5. Bu README'deki kadro ve denge bölümünü, `memory/arena-game-plan.md` dosyasını güncelle.

## Motor ve kaynak bayrakları (etkileşimler)

- `o.vur(hedef, hasar, kaynak, geriTepme, tur)`: `tur` 'yakin', 'menzil' ya da 'alan'.
  - Sıra: önce bütün `hasarAl` kancaları, sonra kritik (%10, ×1.5), sonra `o.olc`, sonra `vurFx`.
  - Gerçek hasarı döner; savuşturulursa 0.
- **Kaynak bayrakları:**

  | Bayrak | Etkisi |
  |---|---|
  | `yoksay` | Bütün `hasarAl` savunmalarını deler (Toji'nin mızrağı) |
  | `kesin` | Kaçınma reflekslerine takılmaz: Isagi Meta, Naoya 24 Kare, Toji refleksi |
  | `futbol` | Isagi/Kaiser topu. Sonsuzluk %50 keser, Peely duvarı durduramaz, Chun-Li'nin serisini bozar |
  | `mermi` | Peely mermisi. Sonsuzluk %20 keser |
  | `delici` | Choso ışını. Peely duvarını kırıp geçer |
- **Nesne bayrakları:**
  - `kopek: true`: Megumi'nin köpekleri. Choso'nun Kesici Kan'ı, Peely'nin pompalısı ve Chun-Li'nin tekmeleri öldürür: `n.p = n.l; n.omur = n.l + 12`.
  - `fnDuvar`: Peely'nin duvarı; yolundaki vuruşu durdurur.
- **Savaşçı alanları:**
  - `b.don` (dondurma) ve `donDirenc`
  - `itDirenc`
  - `b.hizx` (geçici hız)
  - `b.dokunulmaz` (Mahoraga)
  - `b.tip` / `b.etiket` (dönüşüm)
  - `b.bek[]` (skill bekleme sayaçları; Chun-Li'nin sersemletmesi bunları uzatır)
  - `b.hafiza` (karakterin serbest durumu)

## Kadro (13 karakter)

| Karakter | Tip | Can / hız | Skiller ve özel mekanik |
|---|---|---|---|
| GOJO | menzilli 300 | 105 / 1 (guc 1.07) | **Sonsuzluk** (3 sn açık, 2 sn kapalı; açıkken yakın vuruşun %30'u geçer, top %50, mermi %80) · Mavi · Kırmızı · Mor · Sonsuz Boşluk |
| SUKUNA | yakın | 100 / 1.15 | Kesme · Parçalama (canı azalana daha çok) · Ateş Oku · **Dünyayı Kesen Kesik** (Sonsuzluk'un yuttuğu kesikler 16 uyum biriktirir) · Ters Lanet (+25) · Kötücül Türbe |
| CHOSO | menzilli 240 | 100 / 1 (guc 1.05) | Delici Kan (`delici`) · Kızıl Pul Akışı · Süpernova · Kesici Kan (köpekleri de keser) · Kızıl Bağlama |
| TOJI | yakın | 105 / 1.3 | Göksel Kısıtlama (refleks) · Ters Göksel Mızrak (`yoksay`) · Oyuncu Bulut · Bin Mil Zincir · Ruh Bölen Kılıç |
| MAKI | yakın | 105 / 1.2 | Tam Göksel Kısıtlama (alandan %20, uzaktan kesikten %30 az) · Ejderha Kemiği (aldığı hasarı kılıçta biriktirir) · Naginata · Lanetli Bıçaklar · Zen'in Avı |
| MEGUMI | menzilli 220 | 108 / 1.05 | İlahi Köpekler (`kopek`) · Nue · Kurbağa · Gölgeye Dalış · **Mahoraga** (canı ≤6'da ritüel, dokunulmaz) · Kovma Kılıcı · Tutuş |
| NAOYA | yakın | 116 / 1.25 | 24 Kare (hızlandıkça yakın vuruştan sıyrılır, ≥5 hasar sıfırlar) · Kare Hapsi · Projeksiyon Yumrukları · Ses Hızı Çarpma · Ay Sarayı |
| ISAGI | menzilli 215 | 104 / 1.05 | Topla oynar · Akış · Direkt Şut · Omuz Mücadelesi · Topsuz Koşu · Metavizyon · Gol Formülü |
| PEELY | menzilli 240 | 104 / 1.05 | Fortnite muzu. Envanter (malzeme, duvar, kalkan) · Kazma · SCAR · Pompalı · Keskin Nişancı · İnşa · Kalkan İksiri |
| KAISER | menzilli 200 | 106 / 1.18 | Topla oynar (Isagi'yle tek top). Bastard forması, platin sarıdan gök mavisine dağınık saç (perçem sola savrulur, solda arkaya sarkan tutam), gözlerde kırmızı çizgi, boyunda yarısı yakada kalan mavi gül. Efektler: mavi gül, altın taç, mavi-beyaz şimşek · **İmparator** (canı rakipten 8+ azsa öfke: deli gülüş, dikenli sarmaşık, şut ×1.15, hız ×1.12) · Kaiser Impact (en hızlı şut, dipten de atar) · Kaiser Impact Magnus (falso: `egri`) · Taç Eli (iter, topu çeker, Isagi'den de; vurursa Kaiser Impact hazır. 4 hasar: Naoya'nın 24 Kare'sini sıfırlamasın diye) · Top Hırsızı (topa atılır, çalar) · Mavi Gül (140 px alan, 0.5 sn tomurcuk) · İmparatorun Tacı (ulti: dondurur, ara sahne, güdümlü Magnus) |
| CHUN-LI | yakın | 94 / 1.15 | Klasik görünüm. **Super Art Göstergesi** (vurdukça ve vuruldukça dolar; tekme atarken yakın vuruşlardan %40 az hasar; top çarparsa seri bozulur) · Hyakuretsukyaku (her isabet rakibin skillerini 1.5 tick geciktirir, köpekleri savurur) · Spinning Bird Kick · Kikoken · Tenshokyaku (son tekme `kesin`) · Hōyokusen |
| MAKIMA | menzilli 230 | 92 / 0.95 | Chainsaw Man, Kontrol Şeytanı. Mercan saç, küt perçem, arkada sağ omza sarkan örgü; altın halkalı gözler, göz altında Fujimoto tarzı noktalı çizgi, burunsuz yüz (Sözleşme'den sonra sol gözünden ve ağzının kenarından kan iner); beyaz gömlek, siyah kravat. Efektler: eş merkezli halkalar, siyah-kırmızı zincir, koyu kan · **Sözleşme** (ölümcül darbede maçta bir kez %25 canla kalkar, 契約; `yoksay` deler) + kontrol alanı (120 px içindeki rakip ağırlaşır) · Bang (parmak tabancası, 0.35 sn halka nişanı) · Kontrol Zincirleri (yakına üç zincir, itme 17) · Tasma (yalnız 170 px içindekine: rakibi en yakın duvara sürükler, `don`) · Uzaktan Ezme (0.6 sn işaret, yukarıdan ezer) · Diz Çök (ulti: arenanın arkasında gökyüzünden izleyen tek dev balık gözü, `makimaDevGoz`; rakibe bakar, üç baskı) |
| YEAT | menzilli 120 | 94 / 1.05 | Rapçi. Siyah kıvırcık örgü maske (yüz açık), siyah dikdörtgen gözlük, ince bıyık, buzlu zincir ucunda elmaslı küçük çan. Palet siyah-yeşil-elmas; efektler: ses halkaları, glitch, elmas, ad-lib yazıları (`yeatYazi`). **Ritim:** 150 BPM (`YEAT_BEAT` 24 tick); skiller hemen başlar, vuruş bir sonraki beat'e iner (`yeatBeat`) · **Rage** (pasif: vurdukça/vuruldukça dolar; 4 sn hız ×1.2, hasar ×1.2, yakın vuruştan %35 az hasar) · Çan (zincirli çan savurur, DONG) · 808 (altında hoparlör, şok dalgası duvara fırlatır, duvara çarparsa ek hasar) · Glitch (uzaktakinin arkasına ışınlanır, 4 hasar) · Tonka (Yeat'in dev lüks kamyoneti: rakibin hizasında şerit, 0.23 sn kilit, beat'te dev siyah kamyonet arenayı boydan boya geçip çarpar; `yeatTonka`) · Afterlyfe (ulti: arena kararır, yeşil lazerler, arkada dev elmaslı çan 4 beat çalar; `yeatCan`) |

## Denge durumu (2026-11-10, ikili başına 300 maç)

- **Dikey arena (1.3) dengesi:** Sukuna Kesme 140→136 menzil, bekleme 46→52 · Naoya 24 Kare: menzilli/alan ≥5 darbe hızı ×.75 siler (yakın ×.4 kaldı) · Peely SCAR bekleme 120→112 · Makima kontrol alanı yavaşlatması .93/.95→.965/.975 · Yeat Çan bekleme 80→86.
  - 1.3'te genel %46–56 (Maki 56), kırmızı 16→10–14 (300 maçta ±6 oynar; 66–68'ler sınırda). 1.5'te genel %46–56, kırmızı 15→11.
  - Kalan kalıcı kırmızılar: Maki–Makima ~%89, Sukuna–Kaiser ~%75, Sukuna–Makima ~%74 (aşağıdaki tabloda, Sukuna'ya özel karşı mekanik bekliyor), Yeat–Toji ~%70, Makima–Gojo ~%68.

Aşağısı 1.5'teki eski notlar:

- **Genel:** Herkes %44–55 aralığında (ikili başına 200 maç, Kaiser sonrası). Kaiser %51 (ikili başına 300 maç, `cift`).
- **Açık eşleşmeler** (sınırın hemen dışında; kullanıcıya çözüm önerisi sunulmadı):

  | Eşleşme | Durum | Sebep / öneri |
  |---|---|---|
  | Chun-Li – Sukuna | %33 | Hasar yarışı. Sukuna'nın Ters Lanet'i (+25) ve 140 menzilli Kesme'si farkı yaratıyor. Tekme önceliğini büyük darbelere kapatmak Sukuna'yı %20'ye düşürdü, can artırmak Maki'yi bozuyor. Sukuna'ya özel bir karşı mekanik gerekiyor |
  | Chun-Li – Maki | %70 | Tekme önceliği Maki'nin biriktirilmiş kılıç darbesini de kesiyor. Önceliği büyük vuruşlara kapatmak Maki'yi düzeltiyor ama Sukuna'yı bozuyor; ikisi birlikte çözülmeli |
  | Isagi – Peely | %68 | Top duvara takılmıyor, Metavizyon mermilerden sıyrılıyor |
  | Kaiser – Sukuna | %26 | Kesme (140 menzil, maçta ~50 hasar) ve Parçalama Kaiser'i hızlı eritiyor; hız, menzil, dipten şut ve Mavi Gül sıklığı yetmedi. Chun-Li – Sukuna ile aynı kök: Sukuna'ya özel karşı mekanik gerekiyor |
  | Kaiser – Naoya | %66 | Naoya top şutlarından sıyrılamıyor ve her ≥5 hasar 24 Kare'yi siliyor (Isagi – Naoya da %60–66). Taç Eli 4'e indirildi |
  | Kaiser – Isagi | %54 | Tamam. Top çalınca şut beklemesini sıfırlamak burayı %65'e çıkarıyordu, kaldırıldı |
  | Makima – Gojo | %66–76 | Sonsuzluk Bang'i (menzil) kesmiyor. Öneri: Sonsuzluk Bang'i kessin ya da Bang'e `yoksay` yerine özel bayrak |
  | Makima – Naoya | %72 | Kontrol alanı Naoya'yı yavaşlatıp 24 Kare birikimini siliyor |
  | Makima – Sukuna | %25 | Sukuna'nın Kesme'si (140 menzil) alanın dışından vuruyor; Kaiser – Sukuna ile aynı kök |
  | Makima – Maki | %11–17 | Maki tasarımı gereği büyücü karşıtı: alandan %20 az, donmayı yarı sürede çözer, itmeye dirençli; Makima'nın hasarının çoğu alan/menzil |
  | Yeat (genel) | %54 | Glitch 4 hasar; Rage'de yakın zırh %35, alınan hasardan dolma ×4.5; Elmas Yağmuru yerine Tonka (isabet %47). Dışarıda kalanlar: Toji %74, Kaiser %67, Makima %33. Toji'nin sebebine bakılmadı; Makima menzilli olduğu için Rage zırhı ona karşı işlemiyor |
