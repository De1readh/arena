// Arena karakterleri. Yeni karakter = KARAKTERLER dizisine bir nesne daha.
//
// ---- Bütün karakterler için oyun kuralları (motor bunları kendisi yapar, karakter yazarken bilmen yeterli)
// · Arena 660×440 sabit dikdörtgen (oran 1.5), ekranın ortasında. Denge bu boyuta göre yapılır; ?sim=1000 ile dene.
// · Her karakter chibi kafalı bir top. Can, kafayı saran neon çerçeve + arenanın iki yanındaki göstergede sayı olarak görünür.
// · Duvardan sekme ve yer çekimi herkes için aynı; ucar: true olan yer çekimsiz süzülür, hiç durmaz.
// · Yakın dövüşçü rakibe yaklaşır, menzilli kendi menzil bandında kalır.
// · Hiçbir skill ekranı kaplamasın: yarıçap ~150 px'i geçmesin. Alan genişletme: tek: true, alt: true nesne
//   (arenaya kırpılır), silik büyük kanji (yazi()), arka planı koyu tut (OLED).
// · Duvara değen güçlü saldırılar o.duvarVur ile duvarda iz bıraksın (patlama 2, duvarı yarma 3).
// · Görsel işleri (parçacık, iz) o.sim true iken atla; simülasyon hızlı kalsın.
//
// { ad, renk, can, hiz (1 = normal), tip: 'yakin' | 'menzilli', menzil (menzilli için px), ucar, r (top yarıçapı, varsayılan 24),
//   gorunum(c, ben, o, bakX, bakY) : chibi kafa; 24 yarıçaplı, (0,0) merkez, bak = rakibe bakış yönü; kafa/sac/yanak yardımcıları aşağıda.
//     Vurulunca b.ez > 0 olur: o sırada normal gözler yerine aciGoz (ve istersen aciAgiz) çiz; ezilme ve kıvılcımı motor yapar.
//     Karaktere özel saç için sacCiz (Gojo/Sukuna/Choso örnek). ben.hizx: geçici hız çarpanı (güçlendirme skilleri için).
//     Yazmazsan varsayilanKafa çizilir; onu sac: { renk, kenar, adet, uzun } ve ten ile kısaca ayarlayabilirsin.
//   skiller: [{ ad,
//     bekleme  : kullanımlar arası tick (60 tick = 1 sn), ilk: maç başında ilk bekleme, tek: maçta bir kez
//     kosul(ben, rakip, o)  : true dönerse kullanır
//     kullan(ben, rakip, o) : skillin kendisi (false dönerse kullanılmamış sayılır)
//     pasif(ben, rakip, o)  : her tick
//     hasarAl(ben, hasar, {kaynak, tur}, o) : gelen hasarı değiştirir, yeni hasarı döner
//     ciz(c, ben, o)        : topun üstüne çizim (aura vb.)
//     demo(ben, rakip, o)   : /arena/?demo=AD gösteriminde skillden hemen önce durumu hazırlar (isteğe bağlı) }] }
//
// o (oyun): o.ekle({x,y,vx,vy,omur,adim(n,o),ciz(c,n,o),alt}) ekrana nesne koyar (n.l yaşı, n.olu=1 siler, alt: topların altına çizilir)
//   o.vur(hedef, hasar, kaynak{x,y}, geriTepme, 'yakin'|'menzil'|'alan') · o.sayi(hedef, n, 2) iyileşme yazısı
//   o.parca(x,y,renk(ler),adet,hiz,omur,boy) · o.tane({x,y,vx,vy,renk,m,s}) · o.sars(n) · o.isik(c,x,y,r,renk,alfa)
//   o.duvarVur(x,y,renk,guc) · o.rakip(ben) · o.t maç tick'i · o.W, o.H arena boyutu · o.sim simülasyonda true
//   Karakterde guc: hasar çarpanı (denge ince ayarı) · donDirenc: 1 ise dondurma/bağlama yarı sürede çözülür · itDirenc: 0..1 geri tepme direnci.
//   Kaynakta yoksay: true ise rakibin hasarAl savunmaları (Sonsuzluk vb.) devre dışı kalır; kesin: true ise kaçınma reflekslerine takılmaz.
//   Diğer kaynak bayrakları: futbol (Isagi topu), mermi (Peely), delici (Choso ışını, Peely duvarını deler); nesnede kopek: true (Megumi köpeği,
//   bazı skiller öldürür). Etkileşim listesi, kadro, test araçları ve kullanıcının kalıcı kararları: static/arena/README.md
//   Topla oynayan karakter (top: true; Isagi, Kaiser): futbol(o, ben) arenadaki tek topu verir, yoksa sahibinin yanında doğurur; top yalnızca böyle bir karakter varsa var olur.
//     Diğer karakterlerin skilleri topa dokunmaz (top sadece gövdelerden seker). Tek top el değiştirir: serbest top topla oynayan başka karaktere değerse onun olur.
//     sut(o, top, açı, hız, hasar, kb, { atan, guc, gudum, egri, vmax, renk, renk2, ciz, son }) · karakterde topKaynak(o, top, guc) ve topVurdu(atan, hedef, o) kancaları · top.kilit çalınmayı engeller.
//   Kaynağa vurFx(x, y, açı, kritik) koyarsan motorun neon kıvılcımı yerine o çalışır (Choso'nun kanı gibi). Efekt skillin doğasına uysun, her şey neon olmasın.
//
// ---- Denge: /arena/?denge raporu bu standartlara göre boyar (yeşil tamam, sarı izle, kırmızı düzelt)
// Karakterlerin birbirine üstünlüğü olması iyidir; her eşleşme %50 olmak zorunda değil, 60-40 normaldir.
// Yeni karakter rutini: tasarla → ?denge → kırmızıları mekanikle düzelt → son ±5 puan için "çarpan öner" → karaktere guc: x yaz.
// Dengeleme kolları (önce bunlar, hasar en son): menzil / kosul mesafesi · bekleme · isabet (vuruş penceresi, nişan kilidi, mermi hızı, alan yarıçapı)
//   · hazırlık süresi · geri tepme ve itDirenc · hız · can · savunma (hasarAl) · karşı-mekanik (yoksay, kesin). Rapordaki "×/maç" ve "vuruş" hangi kolun
//   gerektiğini söyler: az vuruyorsa isabet/menzil, az kullanılıyorsa kosul/bekleme, tek eşleşme bozuksa o ikisinin etkileşimi.
// Güç bütçesi (tasarlarken): can 100 · maçta etkili hasar/sn 2.5–4.5 · tek skill toplam hasarın %60'ını geçmesin (tek düğmeli karakter olmasın)
//   · maçta bir kez (tek) skillerin payı %30'u geçmesin · anında isabet eden 12+ hasarlı saldırı en az 0.4 sn hazırlık ve nişan kilidiyle gelsin
//   (rakip kaçabilsin) · rakibi dondurma/bağlama maç başına toplam ~2.5 sn'yi geçmesin.
// İsabet (kullanımların en az bir kez vuranı): her skill tasarlanırken sınıfını isabet: '...' ile yazar. Tutmayan skill seyirde anlamsızdır.
//   guvenilir %75+: temel/sık yakın vuruş; yalnızca tutacağı mesafede basılır, hasarı küçük ritmi sık.
//   normal %55–90: menzilli ve alan saldırıları; rakip bazen kaçar. Mermi için nişanı onden(b, e, hız) ile al.
//   nadir %30–60: büyük, yavaş, önceden görünen vuruş; tutunca büyük an, tutmayınca "kaçtı" anı. %60 üstü fazla garanti demek.
//   ulti %85+: maçta bir kez (tek); boşa gitmemeli. Yazılmazsa tek → ulti, değilse normal. Hasar vermeyen skill "destek" sayılır.
//   Sınıf dışına çıkan skillin önce mekaniği düzelir (kosul mesafesi, nişan, hız, vuruş penceresi), sonra denge.
const DENGE = { genel: [45, 55], genelUyari: [42, 58], eslesme: [40, 60], eslesmeUyari: [35, 65], sure: [20, 40], hasarSn: [2.5, 4.5], tekSkill: 60, ulti: 30,
  isabet: { guvenilir: [75, 100], normal: [55, 90], nadir: [30, 60], ulti: [85, 100] } };

const TAU_ = Math.PI * 2, rnd = (a, b) => a + Math.random() * (b - a),
  yonu = (a, b) => Math.atan2(b.y - a.y, b.x - a.x), uzak = (a, b) => Math.hypot(b.x - a.x, b.y - a.y),
  duvarda = (n, o, p = 6) => n.x < p || n.x > o.W - p || n.y < p || n.y > o.H - p,
  // önden nişan: hız px/tick ile giden mermi rakibin varacağı yere gider (seken topta yaklaşık; sekme ve yer çekimi hesapta yok)
  onden = (b, e, hiz, tmax = 40) => { let x = e.x, y = e.y; for (let i = 0; i < 3; i++) { const t = Math.min(tmax, Math.hypot(x - b.x, y - b.y) / hiz); x = e.x + e.vx * t; y = e.y + e.vy * t; }
    return Math.atan2(y - b.y, x - b.x); };

// ince, iki ucu sivri kesik
function kesik(c, x, y, a, len, w, renk, al) {
  if (al <= 0) return;
  const ca = Math.cos(a), sa = Math.sin(a), nx = -sa * w, ny = ca * w;
  c.globalAlpha = Math.min(1, al); c.fillStyle = renk; c.beginPath();
  c.moveTo(x - ca * len / 2, y - sa * len / 2); c.lineTo(x + nx, y + ny);
  c.lineTo(x + ca * len / 2, y + sa * len / 2); c.lineTo(x - nx, y - ny); c.closePath(); c.fill(); c.globalAlpha = 1;
}
function halka(c, x, y, r, renk, lw, al) {
  if (al <= 0 || r <= 0) return;
  c.globalAlpha = Math.min(1, al); c.strokeStyle = renk; c.lineWidth = lw; c.beginPath(); c.arc(x, y, r, 0, TAU_); c.stroke(); c.globalAlpha = 1;
}
// alan genişletmede silik büyük yazı
function yazi(c, t, x, y, boy, renk, al) {
  c.save(); c.globalAlpha = al; c.fillStyle = renk; c.font = '700 ' + boy + 'px "Yu Mincho","MS Mincho",serif';
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(t, x, y); c.restore();
}

// ---- chibi yardımcıları: hepsi 24 yarıçaplı kafaya göre, (0,0) kafa merkezi
// ten rengi kafa; icinde() kafanın içine kırpılarak çizilir (yaka, dövme)
function kafa(c, ten, icinde) {
  c.save(); c.beginPath(); c.arc(0, 0, 24, 0, TAU_); c.clip();
  c.fillStyle = ten; c.fillRect(-24, -24, 48, 48);
  c.fillStyle = 'rgba(120,60,40,.18)'; c.beginPath(); c.arc(-6, 6, 26, 0, TAU_); c.arc(0, 0, 24, 0, TAU_, true); c.fill('evenodd'); // sağ alt gölge
  if (icinde) icinde(); c.restore();
}
function yanak(c, fx, fy) { c.fillStyle = 'rgba(255,120,140,.35)'; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * 12 + fx, 7 + fy, 4, 2, 0, 0, TAU_); c.fill(); } }
// diken saç: kafanın üstünü saran gür kütle + kavisli kalın dikenler + şakaklarda tutam + alına düşen perçemler + parlama.
// n diken, uç yarıçapı uc, kök yarıçapı kok, yukari: dikenleri yukarı toplama (0..1), alt: alın çizgisinin y'si
function sac(c, renk, kenar, n, uc, kok, yukari, t, alt) {
  const nk = Math.max(kok, 25.5), p = (a, r) => [Math.cos(a) * r, Math.sin(a) * r];
  c.beginPath();
  c.moveTo(-26.5, alt + 13); c.quadraticCurveTo(-27, alt + 2, -25, alt - 4); // sol şakak tutamı
  let [vx, vy] = p(Math.PI * 1.06, nk); c.lineTo(vx, vy);
  for (let i = 0; i < n; i++) {
    const u0 = i / n, u1 = (i + 1) / n, um = (i + .5) / n, j = 1 + .14 * Math.sin(i * 2.3 + 1.1); // her dikene sabit ufak fark
    const a0 = Math.PI * (1.06 + .88 * u0), a1 = Math.PI * (1.06 + .88 * u1);
    let am = Math.PI * (1.06 + .88 * um); am += (Math.PI * 1.5 - am) * yukari;
    const r = uc * j * (.84 + .16 * Math.sin(Math.PI * um)) + Math.sin(t * .06 + i) * .6;
    const [tx, ty] = p(am, r), [nx, ny] = p(a1, nk), bk = (am - Math.PI * 1.5) * .35; // uçlar dışa doğru hafif kıvrılır
    const [c1x, c1y] = p(a0 + (am - a0) * .4 - bk, (nk + r) * .56), [c2x, c2y] = p(a1 + (am - a1) * .4 - bk, (nk + r) * .56); // kök geniş, uç sivri
    c.quadraticCurveTo(c1x, c1y, tx, ty); c.quadraticCurveTo(c2x, c2y, nx, ny);
  }
  c.quadraticCurveTo(27, alt + 2, 26.5, alt + 13); // sağ şakak tutamı
  c.quadraticCurveTo(23, alt + 8, 21, alt + 1);
  const L = [4, 7, 3, 6, 5]; // perçemler: sağdan sola, uçları hafif yana savrulur
  for (let i = 0; i < L.length; i++) {
    const x0 = 21 - i * 42 / L.length, x1 = x0 - 42 / L.length, xm = (x0 + x1) / 2 - 2;
    c.quadraticCurveTo(x0 - 1, alt + L[i] * .6, xm, alt + L[i]); c.quadraticCurveTo(xm + 1, alt + L[i] * .4, x1, alt - 1);
  }
  c.quadraticCurveTo(-23, alt + 8, -26.5, alt + 13);
  c.closePath(); c.fillStyle = renk; c.fill();
  c.save(); c.clip(); // içte: kökte gölge, tepede parlama
  const g = c.createLinearGradient(0, alt - 8, 0, alt + 6); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.18)');
  c.fillStyle = g; c.fillRect(-30, alt - 8, 60, 24);
  c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, nk - 5, Math.PI * 1.24, Math.PI * 1.38); c.stroke();
  c.restore();
  c.strokeStyle = kenar; c.lineWidth = 1.4; c.stroke();
}

// karaktere özel saç: P silüet noktaları saat yönünde [x, y, salınım, kavis]; noktalar arası dışa kavisli çizilir
// (kavis varsayılan .2; o noktada biten çizgi için 4. değerle değişir). teller: içte ince kıl çizgileri [x0,y0,kx,ky,x1,y1]
function sacCiz(c, P, t, renk, kenar, golge, teller = []) {
  const q = P.map(([x, y, s = 0], i) => [x + Math.sin(t * .05 + i * 1.7) * s, y]);
  c.beginPath(); c.moveTo(q[0][0], q[0][1]);
  for (let i = 1; i <= q.length; i++) {
    const [ax, ay] = q[i - 1], [x, y] = q[i % q.length], dx = x - ax, dy = y - ay, k = P[i % q.length][3] ?? .2;
    c.quadraticCurveTo((ax + x) / 2 + dy * k, (ay + y) / 2 - dx * k, x, y);
  }
  c.fillStyle = renk; c.fill();
  let y0 = 99, y1 = -99; for (const [, y] of q) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  c.save(); c.clip(); // tepe hafif parlak, dip gölgeli
  const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, 'rgba(255,255,255,.22)'); g.addColorStop(.45, 'rgba(255,255,255,0)'); g.addColorStop(1, golge);
  c.fillStyle = g; c.fillRect(-60, y0, 120, y1 - y0 + 2);
  c.strokeStyle = kenar; c.globalAlpha = .55; c.lineWidth = 1.1; c.lineCap = 'round';
  for (const [a, b, cx, cy, x, y] of teller) { c.beginPath(); c.moveTo(a, b); c.quadraticCurveTo(cx, cy, x, y); c.stroke(); }
  c.restore();
  c.strokeStyle = kenar; c.lineWidth = 1.4; c.lineJoin = 'round'; c.stroke();
}
// sivri tutam dizisi: (cx,cy) merkezli, a0→a1 açıları arasında n uç; uclar: uç yarıçapları (sırayla), dip: dip yarıçapı, egik: uçlar sırayla yana yatar
function dikenler(cx, cy, a0, a1, n, uclar, dip, egik = 0) {
  const P = [], da = (a1 - a0) / n, p = (a, r, s, k) => P.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, s, k]);
  for (let i = 0; i <= n; i++) { p(a0 + i * da, dip, 0, .04); if (i < n) p(a0 + (i + .5 + (i % 2 ? egik : -egik)) * da, uclar[i % uclar.length], .5, .06); }
  return P;
}
// Gojo: göz bağı saçı yukarı iter, dik ve alev gibi kabarık durur; bağı çıkınca saç alnına düşer
// sivri, boyları farklı, dışa açılan tutamlar (eşit yuvarlak dilimler aşçı şapkası gibi duruyordu)
const GOJO_DIK = [[-25, -4, 0, 0], [-37, -11, .6, .05], [-25, -15, 0, .07], [-42, -28, .8, .08], [-23, -24, 0, .07], [-34, -45, .8, .07], [-16, -30, 0, .07],
  [-19, -57, 1, .06], [-7, -34, 0, .07], [-1, -50, 1, .05], [3, -35, 0, .06], [12, -60, 1, .06], [11, -32, 0, .07], [30, -48, .8, .06], [19, -27, 0, .07],
  [41, -33, .8, .06], [24, -18, 0, .07], [37, -10, .6, .05], [25, -4, 0, .06]];
const GOJO_DIK_TEL = [[-14, -10, -17, -20, -22, -30], [0, -10, -1, -22, -4, -34], [13, -10, 15, -20, 19, -30]];
const GOJO_DUZ = [[-27, 7, .4], [-29, -10], [-31, -22, .5], [-22, -30], [-20, -41, .6], [-8, -33], [1, -43, .6], [9, -33], [22, -38, .6], [23, -27], [31, -20, .5],
  [28, -8], [27, 7, .4], [19, -6], [17, 2, .3], [13, -8], [8, -5], [4, -9], [0, 1, .3], [-4, -9], [-8, -5], [-13, -8], [-17, 2, .3], [-21, -6]];
const GOJO_DUZ_TEL = [[-12, -26, -14, -16, -16, -6], [0, -30, 1, -18, 0, -6], [12, -26, 14, -16, 16, -6]];
// Sukuna: ön saç yukarı-geri taranmış (alın ve dövmesi açıkta), yanlar kısa ve koyu (kafa içinde çizilir)
const SUKUNA_SAC = [[-21, -10, 0, .05], ...dikenler(0, -1, Math.PI * 1.06, Math.PI * 1.94, 15, [33, 36, 39, 37, 41, 38, 42, 39, 42, 38, 41, 37, 39, 36, 33], 29, .14),
  [21, -10, 0, .05], [15, -15, 0, .08], [7, -17.5, 0, .05], [0, -16, 0, .05], [-7, -17.5, 0, .05], [-15, -15, 0, .05]];
const SUKUNA_TEL = [[-6, -20, -8, -27, -11, -35], [2, -21, 2, -29, 3, -38], [10, -20, 12, -27, 16, -34], [-16, -17, -21, -22, -27, -26], [17, -17, 22, -21, 28, -25]];

// vurulunca (b.ez > 0) gözler "> <" olur; her gorunum normal gözlerin yerine bunu çizer
function aciGoz(c, fx, fy, renk = '#2a1420', y = -1) {
  c.strokeStyle = renk; c.lineWidth = 2; c.lineCap = c.lineJoin = 'round';
  for (const s of [-1, 1]) { const x = s * 8.5 + fx; c.beginPath(); c.moveTo(x - s * 3.5, y - 3 + fy); c.lineTo(x + s * 3, y + fy); c.lineTo(x - s * 3.5, y + 3 + fy); c.stroke(); }
}
function aciAgiz(c, fx, fy) { c.fillStyle = '#3a0a14'; c.beginPath(); c.ellipse(fx, 12 + fy, 3.6, 2.8, 0, 0, TAU_); c.fill(); }

// ORTAK GÖZ, animenin düz tarzı: badem göz, bol beyaz, küçük düz renkli iris, kalın üst kapak çizgisi, ince alt çizgi, kapak kıvrımı.
//   (parlak/renk geçişli büyük "kawaii" göz değil). x,y merkez, s: -1 sol / 1 sağ göz, bx,by bakış. Kişilik ayarlarla:
//   iris/koyu: iris rengi ve halkası, iri: iris yarıçapı, acik: üst kapak açıklığı (1 tam, .45 ağır kapak), egim: dış köşe yukarı + / aşağı -,
//   duz: üst kapak düzlüğü 0..1, alt: alt kapağın kalkması (kısık bakış), parlak: parıltı noktası (0 yok), kirpik: çizgi rengi,
//   kalin: üst çizgi kalınlığı, kivrim: kapak kıvrımı (false kapatır, 2 belirgin), torba: göz altı torbası, en/boy: ölçek, halka: eş merkezli halkalı iris
function goz(c, x, y, s, bx, by, g) {
  const w = 5.4 * (g.en || 1), B = g.boy || 1, h = 5.4 * B * (g.acik ?? 1), e = g.egim || 0, d = g.duz || 0;
  const ix = x - s * w * .85, iy = y + .8 * B, ox = x + s * w, oy = y + .2 * B - e * 1.6 * B, top = iy - h;
  const P = [[ix, iy], [x - s * w * .45, top + (iy - top) * (.1 + d * .6)], [x + s * w * .4, top + d * h * .35], [ox, oy]];
  const bz = t => { const u = 1 - t; return [0, 1].map(j => u * u * u * P[0][j] + 3 * u * u * t * P[1][j] + 3 * u * t * t * P[2][j] + t * t * t * P[3][j]); };
  const ay = y + (4.6 - (g.alt || 0) * 3.6) * B, ax = x + s * w * .05, aq = t => { const u = 1 - t; return [u * u * ox + 2 * u * t * ax + t * t * ix, u * u * oy + 2 * u * t * ay + t * t * iy]; };
  const ust = () => { c.moveTo(ix, iy); c.bezierCurveTo(...P[1], ...P[2], ...P[3]); };
  const k = g.kirpik || '#141418'; c.lineCap = c.lineJoin = 'round';
  if (g.torba) { c.strokeStyle = 'rgba(95,55,105,.55)'; c.lineWidth = .8 * B; for (const o of [1.6, 3]) { c.globalAlpha = o > 2 ? .5 : 1; c.beginPath(); for (let i = 1; i <= 8; i++) { const [px, py] = aq(i / 10); c.lineTo(px, py + o * B); } c.stroke(); } c.globalAlpha = 1; }
  c.save(); c.beginPath(); ust(); c.quadraticCurveTo(ax, ay, ix, iy); c.fillStyle = '#fbf8f4'; c.fill(); c.clip();
  const r = (g.iri || 2.6) * B, cx = x + bx * 1.3 * B, cy = y - .2 * B + by * .6 * B;
  c.fillStyle = g.iris; c.beginPath(); c.arc(cx, cy, r, 0, TAU_); c.fill(); c.strokeStyle = g.koyu; c.lineWidth = .8 * B; c.stroke(); // düz renk iris, koyu halka
  if (g.halka) { c.strokeStyle = g.koyu; c.lineWidth = .32 * B; for (const f of [.5, .74, .94]) { c.beginPath(); c.arc(cx, cy, r * f, 0, TAU_); c.stroke(); } } // halka: eş merkezli halkalı iris (Makima)
  c.fillStyle = g.koyu; c.beginPath(); c.arc(cx, cy, r * (g.ag ? .26 : g.halka ? .2 : .42), 0, TAU_); c.fill();                                    // göz bebeği
  if (g.ag) { c.strokeStyle = 'rgba(255,255,255,.92)'; c.lineWidth = .3 * B; c.beginPath(); const N = 8, p = (a, f) => [cx + Math.cos(a) * r * f, cy + Math.sin(a) * r * f]; // ag: örümcek ağı desenli iris (Isagi'nin Metavizyonu)
    for (let i = 0; i < N; i++) { const a = .2 + i * TAU_ / N; c.moveTo(...p(a, .3)); c.lineTo(...p(a, .96)); }
    for (const f of [.56, .82]) { c.moveTo(...p(.2, f)); for (let i = 1; i <= N; i++) { const a = .2 + i * TAU_ / N; c.quadraticCurveTo(...p(a - Math.PI / N, f * .8), ...p(a, f)); } }
    c.stroke(); }
  c.strokeStyle = 'rgba(40,30,40,.22)'; c.lineWidth = 1.6 * B; c.beginPath(); ust(); c.stroke();                                    // üst kapağın beyaza düşen gölgesi
  if (g.parlak !== 0) { c.fillStyle = '#fff'; c.beginPath(); c.arc(cx - r * .38, cy - r * .38, .55 * (g.parlak || 1) * B, 0, TAU_); c.fill(); } // tek küçük parıltı
  c.restore();
  const L = (g.kalin || 1) * B; c.fillStyle = c.strokeStyle = k; c.beginPath();                                                    // kalın üst kapak çizgisi; dış uçta aşağı kıvrılır
  for (let i = 0; i <= 12; i++) { const [px, py] = bz(i / 12); c.lineTo(px, py + .25 * B); }
  c.lineTo(ox + s * 1.1 * B, oy + .7 * B);
  for (let i = 12; i >= 0; i--) { const t = i / 12, [px, py] = bz(t); c.lineTo(px, py - L * (.45 + 1.25 * t)); }
  c.fill();
  c.lineWidth = .7 * B; c.globalAlpha = .8; c.beginPath(); for (let i = 0; i <= 7; i++) { const [px, py] = aq(.02 + i * .08); c.lineTo(px, py); } c.stroke(); // ince alt çizgi, iç köşeye varmaz
  if (g.kivrim !== false) { c.globalAlpha = g.kivrim == 2 ? .7 : .45; c.lineWidth = .65 * B; c.beginPath(); for (let i = 3; i <= 11; i++) { const [px, py] = bz(i / 12); c.lineTo(px, py - (2 + (g.kivrim == 2 ? .4 : 0)) * B); } c.stroke(); } // kapak kıvrımı
  c.globalAlpha = 1;
}
// kaş: aci > 0 içi inik (öfkeli/kararlı), < 0 içi kalkık (hüzünlü/yorgun)
function kas(c, x, y, s, aci, renk = '#141418', kalin = 2) {
  c.strokeStyle = renk; c.lineWidth = kalin; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x - s * 4, y + aci * 1.2); c.quadraticCurveTo(x + s * .5, y - 1 - aci * .2, x + s * 5, y - aci * 1.1); c.stroke();
}

// gorunum yazılmamış karakter için sade chibi: ten, diken saç (sac ayarlarıyla), rakibe bakan gözler, küçük ağız
function varsayilanKafa(c, b, o, bx, by) {
  const k = b.k, s = k.sac || {}, fx = bx * 3, fy = by * 1.5;
  kafa(c, k.ten || '#f6dcc8', () => yanak(c, fx, fy));
  if (b.ez > 0) { aciGoz(c, fx, fy); aciAgiz(c, fx, fy); } else {
    for (const x of [-8, 8]) { c.fillStyle = '#1a1420'; c.beginPath(); c.ellipse(x + fx, -1 + fy, 2.6, 3.4, 0, 0, TAU_); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(x + fx - .8, -2.2 + fy, .9, 0, TAU_); c.fill(); }
    c.strokeStyle = '#7a3a3a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-3 + fx, 11 + fy); c.quadraticCurveTo(fx, 13 + fy, 3 + fx, 11 + fy); c.stroke();
  }
  sac(c, s.renk || k.renk, s.kenar || '#00000066', s.adet || 7, s.uzun || 36, 21, .3, o.t, -11);
}

// Kötücül Türbe'nin tapınağı: yükselir (y 0→1), kapıları açılır (kapi 0→1), içinde dişli kırmızı ağız
function turbe(c, x, y, yuk, kapi, al, t) {
  if (al <= 0 || yuk <= 0) return;
  c.save(); c.translate(x, y + (1 - yuk) * 30); c.globalAlpha = al * yuk * .9; c.lineJoin = 'round';
  const kirmizi = '#ff2e4d', koyu = '#1a0006';
  // iç: kızıl ışık ve dişler
  if (kapi > 0) {
    const g = c.createRadialGradient(0, -30, 2, 0, -30, 46); g.addColorStop(0, 'rgba(255,60,80,' + .9 * kapi + ')'); g.addColorStop(1, 'rgba(80,0,10,' + .8 * kapi + ')');
    c.fillStyle = g; c.fillRect(-36, -58, 72, 56);
    c.fillStyle = '#ffe6ea'; const ag = 6 + 8 * kapi + Math.sin(t * .3) * 2;
    c.beginPath(); for (let i = 0; i <= 8; i++) c.lineTo(-34 + i * 8.5, -58 + (i % 2 ? 22 - ag : 2)); c.lineTo(34, -58); c.closePath(); c.fill();
    c.beginPath(); for (let i = 0; i <= 8; i++) c.lineTo(-34 + i * 8.5, -2 - (i % 2 ? 22 - ag : 2)); c.lineTo(34, -2); c.closePath(); c.fill();
  }
  // kapılar: menteşeden dönüyormuş gibi daralır
  const kw = 36 * (1 - kapi);
  c.fillStyle = koyu; c.strokeStyle = kirmizi; c.lineWidth = 1.5;
  if (kw > .5) { c.fillRect(-36, -58, kw, 56); c.strokeRect(-36, -58, kw, 56); c.fillRect(36 - kw, -58, kw, 56); c.strokeRect(36 - kw, -58, kw, 56); }
  // direkler, taban, iki katlı kıvrık çatı
  c.fillStyle = koyu; c.lineWidth = 2;
  for (const px of [-44, 36]) { c.fillRect(px, -62, 8, 62); c.strokeRect(px, -62, 8, 62); }
  c.fillRect(-62, 0, 124, 6); c.strokeRect(-62, 0, 124, 6);
  const cati = (w, h, yy) => { c.beginPath(); c.moveTo(-w - 10, yy - 8); c.quadraticCurveTo(-w * .6, yy, -w * .5, yy - 4); c.lineTo(0, yy - h); c.lineTo(w * .5, yy - 4); c.quadraticCurveTo(w * .6, yy, w + 10, yy - 8); c.lineTo(w, yy + 4); c.lineTo(-w, yy + 4); c.closePath(); c.fill(); c.stroke(); };
  cati(62, 22, -64); cati(42, 18, -86);
  c.restore();
  if (kapi > 0) { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = .5 * kapi * al; const g = c.createRadialGradient(x, y - 30, 0, x, y - 30, 90); g.addColorStop(0, kirmizi); g.addColorStop(1, 'transparent'); c.fillStyle = g; c.beginPath(); c.arc(x, y - 30, 90, 0, TAU_); c.fill(); c.restore(); }
}

// Choso: siyah saç, ortadan ayrık perçem, yanlarda yanağa inen tutamlar, tepede iki kısa kuyruk
const CHOSO_SAC = [[-25, 4, .2, .05], [-27, -8], [-27, -20], [-20, -29], [-8, -32], [0, -30], [8, -32], [20, -29], [27, -20], [27, -8], [25, 4, .2, .05],
  [21, -4, .2, .03], [18, -14, 0, .02], [15, -4.5, .3, .03], [12, -13, 0, .02], [9, -7, .3, .03], [6, -14, 0, .02], [3, -3.5, .3, .03], [0, -13, 0, .02],
  [-3, -4, .3, .03], [-6, -14, 0, .02], [-9, -7, .3, .03], [-12, -13, 0, .02], [-15, -5, .3, .03], [-18, -14, 0, .02], [-21, -4, .2, .03]];
const CHOSO_TEL = [[-4, -28, -6, -20, -9, -9], [5, -28, 7, -20, 9, -10], [-14, -26, -16, -18, -18, -8], [14, -26, 17, -18, 19, -8]];
const CHOSO_KUYRUK = dikenler(-14, -30, Math.PI * .72, Math.PI * 2.28, 11, [16, 12, 19, 13, 18, 11, 17, 14, 16, 12, 15], 9, .15); // sivri patlamış topuz
const CHOSO_KUYRUK_SAG = CHOSO_KUYRUK.map(([x, y, s, k]) => [-x, y, s, k]).reverse();
// Sukuna: Sonsuzluk'un yuttuğu (yarıdan fazla azalan) yakın vuruşları biriktirir; 16 olunca Dünyayı Kesen Kesik açılır. Pratikte yalnızca Gojo'ya karşı çalışır.
const sukunaUyum = (b, d, v) => { if (v > 0 && v < d * .5) b.hafiza.uyum = (b.hafiza.uyum || 0) + d - v; };
const kanKat = (b, o) => o.t < (b.hafiza.akis || 0) ? 1.25 : 1; // Kızıl Pul Akışı açıkken hasar çarpanı
// ---- kan efektleri: neon değil. Koyu, ıslak, ağır: ışıma ve 'lighter' yok, damlalar yer çekimiyle düşer, duvarda leke kalır.
const KAN = ['#7a0010', '#a00a1a', '#c01424', '#d8283a'];
// duvara/yere yapışan leke; yan duvarda aşağı süzülür. Ekranda en çok 40 tane.
function kanLeke(o, x, y, boy) {
  if (o.sim || o.nes.reduce((s, n) => s + (n.leke ? 1 : 0), 0) > 40) return;
  x = Math.max(7, Math.min(o.W - 7, x)); y = Math.max(7, Math.min(o.H - 7, y));
  o.ekle({ leke: 1, alt: true, x, y, omur: 420, k: KAN[Math.random() * 3 | 0], akar: x < 12 || x > o.W - 12 ? rnd(8, 26) : 0,
    p: Array.from({ length: 5 }, (_, i) => [rnd(-1, 1) * boy * (i ? .9 : 0), rnd(-1, 1) * boy * (i ? .9 : 0), boy * (i ? rnd(.25, .55) : .8)]),
    ciz(c, m) {
      c.globalAlpha = .9 * Math.min(1, (m.omur - m.l) / 120); c.fillStyle = m.k;
      for (const [dx, dy, r] of m.p) { c.beginPath(); c.arc(m.x + dx, m.y + dy, r, 0, TAU_); c.fill(); }
      if (m.akar) { const L = m.akar * Math.min(1, m.l / 90); c.fillRect(m.x - 1, m.y, 2, L); c.beginPath(); c.arc(m.x, m.y + L, 1.7, 0, TAU_); c.fill(); }
      c.globalAlpha = 1;
    } });
}
// sıçrayan damlalar: a yönünde (yoksa her yöne), yay genişliğinde; düşer, duvara değince leke bırakır
function kanSicrat(o, x, y, n, hiz, a = null, yay = TAU_) {
  if (o.sim) return;
  const d = Array.from({ length: n }, () => { const t = a == null ? rnd(0, TAU_) : a + rnd(-yay / 2, yay / 2), v = hiz * rnd(.3, 1);
    return { x, y, vx: Math.cos(t) * v, vy: Math.sin(t) * v - hiz * .25, r: rnd(.9, 2.4), k: KAN[1 + Math.random() * 3 | 0] }; });
  o.ekle({ d, x: 0, y: 0, omur: 60,
    adim(m, o) { for (const p of m.d) { if (p.dur) continue; p.vy += .25; p.x += p.vx; p.y += p.vy;
      if (p.x < 7 || p.x > o.W - 7 || p.y < 7 || p.y > o.H - 7) { p.dur = 1; if (p.r > 1.6) kanLeke(o, p.x, p.y, p.r * 1.6); } } },
    ciz(c, m) { c.globalAlpha = Math.min(1, (m.omur - m.l) / 15);
      for (const p of m.d) { if (p.dur) continue; c.fillStyle = p.k; c.beginPath(); // hızla uzayan damla
        c.ellipse(p.x, p.y, p.r + Math.min(3, Math.hypot(p.vx, p.vy) * .35), p.r, Math.atan2(p.vy, p.vx), 0, TAU_); c.fill(); }
      c.globalAlpha = 1; } });
}
// ıslak kan küresi: koyu gövde, içe doğru açılan kızıl, tek sert parlama; hafifçe dalgalanır
function kanTop(c, x, y, r, t) {
  const w = 1 + Math.sin(t * .35) * .07, g = c.createRadialGradient(x - r * .3, y - r * .3, r * .1, x, y, r);
  g.addColorStop(0, '#e8404c'); g.addColorStop(.5, '#a80a1c'); g.addColorStop(1, '#4a0009');
  c.fillStyle = g; c.beginPath(); c.ellipse(x, y, r * w, r / w, 0, 0, TAU_); c.fill();
  c.fillStyle = 'rgba(255,225,225,.85)'; c.beginPath(); c.ellipse(x - r * .36, y - r * .4, r * .22, r * .13, -.6, 0, TAU_); c.fill();
}
// Choso'nun vuruşları: motorun neon kıvılcımı yerine kan sıçrar (vurFx)
const kanKaynak = (o, x, y) => ({ x, y, renk: '#8c0616', vurFx: (px, py, a, kr) => kanSicrat(o, px, py, kr ? 16 : 9, kr ? 5.5 : 4, a, 1.8) });
// Delici Kan ışını: anında duvara kadar uzanır, yolundaki rakibi deler; ucu duvara kan sıçratır
function delici(o, s, a, hasar, kb, kalin) {
  const ca = Math.cos(a), sa = Math.sin(a), x = s.x + ca * 26, y = s.y + sa * 26, e = o.rakip(s);
  const tx = ca > 0 ? (o.W - 6 - x) / ca : ca < 0 ? (6 - x) / ca : 1e9, ty = sa > 0 ? (o.H - 6 - y) / sa : sa < 0 ? (6 - y) / sa : 1e9, L = Math.max(0, Math.min(tx, ty));
  const p = (e.x - x) * ca + (e.y - y) * sa, dik = Math.abs((e.x - x) * sa - (e.y - y) * ca), wx = x + ca * L, wy = y + sa * L;
  if (p > -e.r && p < L + e.r && dik < e.r + kalin * .5 && o.vur(e, hasar, { ...kanKaynak(o, s.x, s.y), delici: true }, kb, 'menzil') > 0) vurusKaresi(o, e.x, e.y, kalin > 8 ? 1.8 : .7, kalin > 8);
  o.duvarVur(wx, wy, '#6e000f', kalin > 8 ? 3 : 2); o.sars(kalin > 8 ? 8 : 4);
  kanLeke(o, wx, wy, kalin * 1.1); kanSicrat(o, wx, wy, kalin > 8 ? 26 : 16, 4.5, a + Math.PI, 2.4);
  o.ekle({ x, y, x2: wx, y2: wy, omur: 22, kalin,
    ciz(c, m) { const k = 1 - m.l / m.omur, w = m.kalin * (m.l < 3 ? 1.25 : k * k);
      c.save(); c.lineCap = 'butt'; c.beginPath(); c.moveTo(m.x, m.y); c.lineTo(m.x2, m.y2);
      c.strokeStyle = '#5a000c'; c.lineWidth = w * 1.5; c.stroke();
      c.strokeStyle = '#b8101f'; c.lineWidth = w; c.stroke();
      c.strokeStyle = 'rgba(255,150,160,.55)'; c.lineWidth = Math.max(.5, w * .16); c.stroke(); // ıslak parlaklık
      c.restore(); } });
}
// kanı avuçta sıkıştırma: damlalar spiralle içeri çekilir, küre büyür
function kanKure(c, o, x, y, k, l) {
  for (let i = 0; i < 6; i++) { const a = i * TAU_ / 6 + l * .18, r = 6 + 22 * (1 - k) * (.6 + .4 * Math.sin(i * 2.1));
    c.fillStyle = KAN[2 + (i & 1)]; c.beginPath(); c.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, 1.6 + k, 0, TAU_); c.fill(); }
  kanTop(c, x, y, 3 + 5 * k, l);
}

// ---- Toji: lanet enerjisi yok, her şey fiziksel. Efektler neon değil: gümüş çelik çizgileri, toz, kısa metal kıvılcımı.
// Toji'nin saçı kısa ve aşağı düşer: başı saran dağınık kütle, tepede yalnızca küçük kabarıklar, yanlarda ve alında aşağı sarkan uçlar, perçem sağdan ayrık
const TOJI_SAC = [[-26, 4, .3, .1], [-27.5, -6], [-29.5, -12, .3], [-27, -18], [-26, -25, .3], [-18, -29], [-12, -33, .3], [-4, -31], [3, -34, .3], [10, -31],
  [17, -31, .3], [22, -26], [28, -21, .3], [27, -12], [29.5, -6, .3], [27, 0], [25, 5, .3], [22, -5, 0, .1], [18, -1, .3], [15, -11], [11, -4, .3], [7, -16, 0, .1],
  [3, -6, .3], [-1, -12], [-5, -4, .3], [-9, -11], [-14, -2, .3], [-18, -10], [-21, -1, .3], [-22, -6]];
const TOJI_TEL = [[7, -28, 7, -22, 7, -16], [-6, -27, -9, -18, -10, -10], [16, -26, 17, -18, 15, -11], [-22, -18, -25, -8, -24, 0], [23, -18, 25, -8, 24, 0]];
// darbe: beyaz çelik çizgileri + gri toz bulutu (+ kritikte birkaç turuncu kıvılcım)
function celikFx(o, x, y, a, kr) {
  if (o.sim) return;
  o.ekle({ x: 0, y: 0, omur: 16, px: x, py: y, kr, cz: Array.from({ length: kr ? 7 : 4 }, () => [a + rnd(-.7, .7), rnd(10, kr ? 30 : 20)]),
    toz: Array.from({ length: 5 }, () => [rnd(0, TAU_), rnd(.4, 1.2), rnd(3, 6)]),
    ciz(c, m) { const k = m.l / m.omur;
      c.save(); c.lineCap = 'round';
      for (const [t, v, r] of m.toz) { c.globalAlpha = .35 * (1 - k); c.fillStyle = '#8c8f96'; c.beginPath(); c.arc(m.px + Math.cos(t) * v * m.l, m.py + Math.sin(t) * v * m.l - m.l * .3, r * (1 + k), 0, TAU_); c.fill(); }
      if (m.l < 7) for (const [t, L] of m.cz) { const u = m.l / 7; c.globalAlpha = 1 - u; c.strokeStyle = '#eef2f6'; c.lineWidth = 1.6;
        c.beginPath(); c.moveTo(m.px + Math.cos(t) * L * u, m.py + Math.sin(t) * L * u); c.lineTo(m.px + Math.cos(t) * L * (u + .4), m.py + Math.sin(t) * L * (u + .4)); c.stroke(); }
      if (m.kr && m.l < 10) { c.globalAlpha = 1 - m.l / 10; c.fillStyle = '#ffb347'; for (const [t, L] of m.cz) { c.beginPath(); c.arc(m.px + Math.cos(t) * L * m.l / 6, m.py + Math.sin(t) * L * m.l / 6 + m.l * m.l * .05, 1.1, 0, TAU_); c.fill(); } }
      c.restore(); } });
}
const celikKaynak = (o, b, yoksay = false) => ({ x: b.x, y: b.y, renk: '#dfe6ee', yoksay, vurFx: (x, y, a, kr) => celikFx(o, x, y, a, kr) });
// Ters Göksel Mızrak: kısa sap + çatallı, ters dönük bıçak (gümüş)
function mizrak(c, x, y, a, L, al) {
  c.save(); c.translate(x, y); c.rotate(a); c.globalAlpha = al; c.lineCap = 'round';
  c.strokeStyle = '#3a3a42'; c.lineWidth = 3; c.beginPath(); c.moveTo(-10, 0); c.lineTo(L - 16, 0); c.stroke();
  c.fillStyle = '#d8dde4'; c.strokeStyle = '#7d8590'; c.lineWidth = 1; c.beginPath();
  c.moveTo(L - 18, -2); c.lineTo(L, 0); c.lineTo(L - 18, 2); c.lineTo(L - 12, 7); c.lineTo(L - 20, 3); c.lineTo(L - 20, -3); c.lineTo(L - 12, -7); c.closePath(); c.fill(); c.stroke();
  c.restore();
}
// hızlı hareket ederken ardında kalan silik siluetler (ben.iz: son 10 konum)
function hayalet(c, b, al) {
  for (let i = 0; i < b.iz.length - 1; i += 2) { const [x, y] = b.iz[i]; c.globalAlpha = al * (i + 1) / b.iz.length * .35; c.fillStyle = '#2a2d33';
    c.beginPath(); c.arc(x, y, b.r, 0, TAU_); c.fill(); c.strokeStyle = '#c8ff3a'; c.lineWidth = 1; c.globalAlpha *= .5; c.stroke(); }
  c.globalAlpha = 1;
}

// ---- Maki (uyanmış): Toji gibi fiziksel ama darbeyi yiyip geri vuran dövüşçü. Kısa dağınık koyu yeşil saç, yüzünde yanık izleri.
const MAKI_SAC = [[-26, 3, .2, .03], [-28, -6], [-28, -14], [-22, -27], [-10, -33], [0, -34], [10, -33], [22, -27], [28, -14], [28, -6], [26, 3, .2, .03],
  [23, -1, 0, .02], [21, 3, .2, .03], [19, -3, 0, .04], [18, -5, .3, .03], [15, -11, 0, .02], [12, -5.5, .3, .03], [9, -12, 0, .02], [5, -6, .3, .03], [2, -11, 0, .02],
  [-1, -5.5, .3, .03], [-4, -12, 0, .02], [-8, -6, .3, .03], [-11, -11, 0, .02], [-14, -5, .3, .03], [-17, -10, 0, .02], [-19, -3, 0, .04], [-21, 3, .2, .03], [-23, -1, 0, .02]];
const MAKI_TEL = [[-6, -30, -7, -20, -8, -10], [5, -30, 6, -20, 6, -10], [15, -27, 17, -16, 16, -7], [-16, -27, -18, -16, -16, -7], [-25, -12, -26, -5, -25, 1], [25, -12, 26, -5, 25, 1]];
// yanık izi: düzensiz kenarlı leke, koyu kenar, içte açık çizgiler
function yanik(c, P, fx, fy) {
  c.beginPath(); P.forEach(([x, y], i) => i ? c.lineTo(x + fx, y + fy) : c.moveTo(x + fx, y + fy)); c.closePath();
  c.fillStyle = 'rgba(196,124,110,.85)'; c.fill(); c.strokeStyle = 'rgba(140,72,62,.7)'; c.lineWidth = .8; c.stroke();
  c.strokeStyle = 'rgba(236,170,150,.6)'; c.lineWidth = .6; c.beginPath(); for (let i = 1; i < P.length - 1; i += 2) { c.moveTo(P[i][0] * .8 + P[0][0] * .2 + fx, P[i][1] * .8 + P[0][1] * .2 + fy); c.lineTo(P[i + 1][0] * .6 + P[0][0] * .4 + fx, P[i + 1][1] * .6 + P[0][1] * .4 + fy); } c.stroke();
}
// Zen'in Avı açıkken bütün vuruşları savunmayı deler
// kesin: Toji'nin refleksi sıyrılamaz (Maki de Göksel Kısıtlamalı, onun hızını görür)
const makiKaynak = (o, nokta, sahip) => ({ ...celikKaynak(o, nokta, o.t < (sahip.hafiza.av || 0)), kesin: true });
// Ejderha Kemiği: geniş, ağır kılıç; biriken enerjiyle kor gibi ısınır (isi 0..1)
function ejderKilic(c, x, y, a, isi, al) {
  c.save(); c.translate(x, y); c.rotate(a); c.globalAlpha = al;
  c.fillStyle = '#2a2420'; c.fillRect(-4, -1.6, 15, 3.2); c.fillStyle = '#6a6e76'; c.fillRect(10, -5.5, 3, 11);
  c.beginPath(); c.moveTo(13, -4.5); c.lineTo(50, -3.5); c.lineTo(57, 0); c.lineTo(50, 3.5); c.lineTo(13, 4.5); c.closePath();
  c.fillStyle = '#b8bec6'; c.fill();
  if (isi > 0) { const g = c.createLinearGradient(13, 0, 57, 0); g.addColorStop(0, 'rgba(255,120,40,' + .25 * isi + ')'); g.addColorStop(1, 'rgba(255,170,70,' + .85 * isi + ')'); c.fillStyle = g; c.fill(); }
  c.strokeStyle = '#eef2f6'; c.lineWidth = .8; c.beginPath(); c.moveTo(13, -4.5); c.lineTo(50, -3.5); c.lineTo(57, 0); c.stroke();
  c.restore();
}
// naginata: uzun ahşap sap, ucunda kavisli bıçak
function naginata(c, x, y, a, L, al) {
  c.save(); c.translate(x, y); c.rotate(a); c.globalAlpha = al; c.lineCap = 'round';
  c.strokeStyle = '#3a2618'; c.lineWidth = 3.2; c.beginPath(); c.moveTo(-12, 0); c.lineTo(L - 14, 0); c.stroke();
  c.fillStyle = '#d8dde4'; c.strokeStyle = '#7d8590'; c.lineWidth = .8; c.beginPath(); c.moveTo(L - 16, -2); c.quadraticCurveTo(L - 4, -7, L + 4, -1.5); c.lineTo(L - 16, 2.2); c.closePath(); c.fill(); c.stroke();
  c.restore();
}

// ---- Megumi: On Gölge. Efektler neon değil: mürekkep gibi gölge birikintisi (koyu mor kenarlı), shikigami'ler gölgeden çıkıp gölgeye batar.
// Saç: dağınık, kirpi gibi her yöne dikilen siyah dikenler; tepede en uzun, yanlarda dışa, alında aralıklı sivri perçemler (gözler açıkta)
const MEGUMI_SAC = [[-23, 3, 0, .1], [-35, -3, .4, .04], [-26, -10, 0, .04], [-41, -17, .5, .05], [-27, -22, 0, .05], [-39, -34, .6, .06], [-21, -32, 0, .06],
  [-29, -49, .7, .06], [-12, -38, 0, .06], [-14, -57, .8, .06], [-3, -42, 0, .06], [3, -61, .8, .06], [7, -42, 0, .06], [17, -56, .8, .06], [14, -37, 0, .06],
  [31, -47, .7, .06], [22, -30, 0, .06], [40, -32, .6, .06], [27, -21, 0, .05], [41, -14, .5, .05], [26, -9, 0, .04], [34, -2, .4, .04], [23, 3, 0, .04],
  [20, -6, 0, .1], [18, 4, .3, .04], [14, -8, 0, .04], [10, -4, .2, .04], [6, -9, 0, .04], [1, 3, .3, .04], [-3, -9, 0, .04], [-9, -4, .2, .04], [-13, -8, 0, .04],
  [-18, 4, .3, .04], [-21, -5, 0, .04]];
const MEGUMI_TEL = [[-6, -30, -9, -40, -12, -50], [3, -30, 3, -44, 3, -56], [12, -28, 15, -40, 16, -50], [-20, -22, -28, -28, -34, -32], [20, -20, 28, -26, 35, -30], [-14, -12, -20, -14, -30, -16]];
const kis = (v, a, b) => Math.max(a, Math.min(b, v));
// gölge birikintisi: koyu, ıslak mürekkep; kenarı soluk mor (OLED siyahında görünsün diye)
function golge(c, x, y, rx, ry, al) {
  if (al <= 0) return;
  c.save(); c.globalAlpha = Math.min(1, al);
  c.fillStyle = '#0b0815'; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU_); c.fill();
  c.strokeStyle = '#4e3f86'; c.lineWidth = 1.6; c.stroke();
  c.strokeStyle = '#2a2150'; c.lineWidth = 1; c.beginPath(); c.ellipse(x, y, rx * .6, ry * .6, 0, 0, TAU_); c.stroke();
  c.restore();
}
// shikigami ısırığı / gölge darbesi: dışa sıçrayan mürekkep damlaları (ışıma yok)
function golgeFx(o, x, y, a) {
  if (o.sim) return;
  o.ekle({ x, y, omur: 18, d: Array.from({ length: 7 }, () => [a + Math.PI + rnd(-1.2, 1.2), rnd(1.2, 3.2), rnd(1.5, 3.5)]),
    ciz(c, m) { const k = m.l / m.omur; c.save();
      for (const [t, v, r] of m.d) { const px = m.x + Math.cos(t) * v * m.l, py = m.y + Math.sin(t) * v * m.l + m.l * m.l * .03;
        c.globalAlpha = 1 - k; c.fillStyle = '#120c22'; c.beginPath(); c.arc(px, py, r * (1 - k * .4), 0, TAU_); c.fill();
        c.strokeStyle = '#6a58b0'; c.lineWidth = .8; c.stroke(); }
      c.restore(); } });
}
const golgeKaynak = (o, n) => ({ x: n.x, y: n.y, renk: '#8f7fd0', vurFx: (x, y, a) => golgeFx(o, x, y, a) });
const megNormal = b => !b.hafiza.mah && !b.hafiza.rit;
// İlahi Köpekler: yandan kurt silüeti (burnu +x yönünde); ak: beyaz köpek, değilse kara
function kopekCiz(c, x, y, a, l, ak, al) {
  c.save(); c.translate(x, y); c.rotate(a); if (Math.cos(a) < 0) c.scale(1, -1); c.globalAlpha = al; c.lineJoin = c.lineCap = 'round';
  const dolgu = ak ? '#e9e7e1' : '#15151c', kenar = ak ? '#8a8796' : '#77739a', s = Math.sin(l * .8) * 3.2;
  c.strokeStyle = kenar; c.lineWidth = 2.2; // bacaklar: koşarken çapraz salınır
  for (const [bx, f] of [[-8, 1], [-5, -1], [4, -1], [7, 1]]) { c.beginPath(); c.moveTo(bx, 2); c.lineTo(bx + s * f, 9); c.stroke(); }
  c.fillStyle = dolgu; c.lineWidth = 1.1;
  c.beginPath(); c.moveTo(-11, -1); c.quadraticCurveTo(-20, -9, -21, -3); c.quadraticCurveTo(-17, -2, -11, 2); c.fill(); c.stroke(); // gür kuyruk
  c.beginPath(); c.ellipse(-2, 0, 11, 5.2, 0, 0, TAU_); c.fill(); c.stroke(); // gövde
  c.beginPath(); c.moveTo(5, -3); c.lineTo(9, -10); c.lineTo(10.5, -14); c.lineTo(12, -9.5); c.lineTo(14, -13.5); c.lineTo(14.6, -8); // sivri kulaklar
  c.quadraticCurveTo(17, -6, 21, -4.5); c.lineTo(20.5, -2); c.quadraticCurveTo(15, -.5, 10, 1.5); c.closePath(); c.fill(); c.stroke(); // baş ve uzun burun
  c.fillStyle = ak ? '#1a1a22' : '#e4cf6a'; c.beginPath(); c.arc(13.4, -6.2, 1.1, 0, TAU_); c.fill(); // göz: kara köpekte sarı
  c.fillStyle = ak ? '#3a3a44' : '#9a96b8'; c.beginPath(); c.arc(21, -3.4, .9, 0, TAU_); c.fill();
  if (!ak) { c.strokeStyle = '#3a3656'; c.lineWidth = .8; c.beginPath(); c.moveTo(-8, -3); c.quadraticCurveTo(-2, -5, 4, -3); c.stroke(); } // kara tüyde soluk parlama
  c.restore();
}
// Nue: geniş kanatlı, maskeli baykuş; kanatlar çırpar, dalışta pençelerinde kıvılcım
function nueCiz(c, x, y, vx, l, dal, al) {
  c.save(); c.translate(x, y); if (vx < 0) c.scale(-1, 1); c.globalAlpha = al; c.lineJoin = 'round';
  const f = Math.sin(l * .45) * (dal ? .25 : 1);
  for (const s of [-1, 1]) { c.save(); c.scale(s, 1); c.rotate(-f * .5);
    c.beginPath(); c.moveTo(2, -2); c.quadraticCurveTo(14, -16 - f * 6, 26, -10 - f * 8); c.lineTo(22, -6 - f * 6); c.lineTo(25, -3 - f * 5); c.lineTo(19, -1 - f * 3);
    c.lineTo(21, 2 - f * 2); c.quadraticCurveTo(10, 2, 2, 3); c.closePath();
    c.fillStyle = '#e4e2ea'; c.fill(); c.strokeStyle = '#7d7a8c'; c.lineWidth = 1; c.stroke();
    c.fillStyle = '#2a2838'; c.beginPath(); c.moveTo(26, -10 - f * 8); c.lineTo(22, -6 - f * 6); c.lineTo(25, -3 - f * 5); c.lineTo(20, -5 - f * 4); c.closePath(); c.fill(); // koyu kanat ucu
    c.restore(); }
  c.fillStyle = '#d4d1dc'; c.strokeStyle = '#6e6a80'; c.lineWidth = 1; c.beginPath(); c.ellipse(0, 2, 5.5, 8, 0, 0, TAU_); c.fill(); c.stroke(); // gövde
  c.fillStyle = '#f2f0f6'; c.beginPath(); c.ellipse(0, -6, 5.2, 4.6, 0, 0, TAU_); c.fill(); c.stroke(); // maske gibi yüz
  c.fillStyle = '#1a1826'; c.beginPath(); c.ellipse(-2, -6.4, 1.3, .7, -.3, 0, TAU_); c.ellipse(2, -6.4, 1.3, .7, .3, 0, TAU_); c.fill();
  c.strokeStyle = '#5a566c'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-2, 10); c.lineTo(-3, 13); c.moveTo(2, 10); c.lineTo(3, 13); c.stroke(); // pençeler
  c.restore();
}
function simsek(c, x0, y0, x1, y1, al, seg = 6, renk = ['#c8b440', '#fffbe0']) {
  c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = al; c.lineCap = c.lineJoin = 'round';
  for (const [w, r] of [[3, renk[0]], [1.2, renk[1]]]) { c.strokeStyle = r; c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0);
    for (let i = 1; i < seg; i++) { const u = i / seg; c.lineTo(x0 + (x1 - x0) * u + rnd(-6, 6), y0 + (y1 - y0) * u + rnd(-6, 6)); } c.lineTo(x1, y1); c.stroke(); }
  c.restore();
}
// Kurbağa: tıknaz, benekli, iri gözlü; ağzından pembe dil
function kurbagaCiz(c, x, y, a, boy, al) {
  c.save(); c.translate(x, y); c.scale(boy, boy); c.globalAlpha = al; if (Math.cos(a) < 0) c.scale(-1, 1);
  c.fillStyle = '#5c6a46'; c.strokeStyle = '#2e3624'; c.lineWidth = 1; c.beginPath(); c.ellipse(0, 1, 10, 6.5, 0, 0, TAU_); c.fill(); c.stroke();
  c.fillStyle = '#3c4630'; for (const [px, py, r] of [[-4, -1, 1.6], [2, 2, 1.3], [-6, 3, 1.1], [5, -2, 1]]) { c.beginPath(); c.arc(px, py, r, 0, TAU_); c.fill(); }
  for (const s of [-1, 1]) { c.fillStyle = '#5c6a46'; c.beginPath(); c.arc(4 + s * 3.4, -5, 2.8, 0, TAU_); c.fill(); c.stroke();
    c.fillStyle = '#d8c86a'; c.beginPath(); c.arc(4 + s * 3.4, -5.3, 1.9, 0, TAU_); c.fill(); c.fillStyle = '#111'; c.fillRect(3.6 + s * 3.4, -6.6, .8, 2.6); }
  c.strokeStyle = '#2e3624'; c.beginPath(); c.moveTo(4, 2.5); c.quadraticCurveTo(8, 3.5, 10, 1); c.stroke();
  c.restore();
}
// Mahoraga: soluk, kaslı dev; gözlerin yerinde iki çift beyaz kanat, başının üstünde sekiz kollu tekerlek (her uyumda bir kol döner)
function carkCiz(c, a, parla) {
  c.save(); c.translate(0, -37); c.rotate(a); c.lineCap = 'round';
  if (parla > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = parla; c.fillStyle = '#ffe6a0'; c.beginPath(); c.arc(0, 0, 20, 0, TAU_); c.fill(); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; }
  for (let i = 0; i < 8; i++) { const t = i * TAU_ / 8, ca = Math.cos(t), sa = Math.sin(t);
    c.strokeStyle = '#6e521e'; c.lineWidth = 3.4; c.beginPath(); c.moveTo(ca * 3, sa * 3); c.lineTo(ca * 18, sa * 18); c.stroke();
    c.strokeStyle = '#e0bc62'; c.lineWidth = 1.9; c.stroke();
    c.fillStyle = '#e0bc62'; c.strokeStyle = '#6e521e'; c.lineWidth = .9; c.beginPath(); c.arc(ca * 18.5, sa * 18.5, 2, 0, TAU_); c.fill(); c.stroke(); } // kol uçlarındaki tutamak
  c.strokeStyle = '#6e521e'; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, 12.5, 0, TAU_); c.stroke();
  c.strokeStyle = '#e8c56c'; c.lineWidth = 2.4; c.stroke();
  c.fillStyle = '#e8c56c'; c.strokeStyle = '#6e521e'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, 3.6, 0, TAU_); c.fill(); c.stroke();
  c.restore();
}
function mahoragaCiz(c, b, o, bx, by) {
  const h = b.hafiza, fx = bx * 2.4, fy = by * 1.2;
  c.fillStyle = '#d9d3c7'; c.fillRect(-1.6, -27, 3.2, 6); // tekerleği başa bağlayan sap
  carkCiz(c, h.carkA || 0, o.t - (h.tik ?? -99) < 14 ? .5 * (1 - (o.t - h.tik) / 14) : 0);
  kafa(c, '#e6e0d5', () => {
    c.fillStyle = '#b9b0a2'; c.beginPath(); c.moveTo(-24, 14); c.quadraticCurveTo(-10, 18, -6, 24); c.lineTo(-24, 24); c.fill(); // omuz-boyun kası
    c.beginPath(); c.moveTo(24, 14); c.quadraticCurveTo(10, 18, 6, 24); c.lineTo(24, 24); c.fill();
    c.strokeStyle = '#a69d8e'; c.lineWidth = 1; c.beginPath(); c.moveTo(-5, 18); c.quadraticCurveTo(0, 21, 5, 18); c.stroke();
  });
  c.strokeStyle = '#a0978a'; c.lineWidth = 2.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(-14 + fx, -8 + fy); c.quadraticCurveTo(fx, -12 + fy, 14 + fx, -8 + fy); c.stroke(); // ağır kaş çıkıntısı
  c.lineWidth = 1.2; c.beginPath(); c.moveTo(fx, -4 + fy); c.lineTo(fx + .6, 5 + fy); c.moveTo(-2 + fx, 6 + fy); c.lineTo(2.6 + fx, 6 + fy); c.stroke(); // burun
  c.fillStyle = '#a89688'; c.beginPath(); c.ellipse(fx, 12 + fy, 4.8, 1.9, 0, 0, TAU_); c.fill(); // kalın, kapalı dudak
  c.strokeStyle = '#6e6258'; c.lineWidth = 1; c.beginPath(); c.moveTo(-4.8 + fx, 12 + fy); c.lineTo(4.8 + fx, 12 + fy); c.stroke();
  for (const s of [-1, 1]) for (const [ust, boy] of [[1, 1], [0, .85]]) { // gözlerin yerinde ikişer kanat, dışa açılır
    c.save(); c.translate(s * 5 + fx, -2 + fy + (ust ? -1.5 : 2.5)); c.scale(s * boy, boy); c.rotate(ust ? -.28 : .2);
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(10, -6, 25, -4); c.lineTo(21, -1.5); c.lineTo(24, 1); c.lineTo(18, 2); c.lineTo(20, 4.5); c.quadraticCurveTo(9, 5, 0, 2); c.closePath();
    c.fillStyle = '#f6f3ec'; c.fill(); c.strokeStyle = '#9d9587'; c.lineWidth = .9; c.stroke();
    c.strokeStyle = '#c9c2b5'; c.lineWidth = .6; c.beginPath(); c.moveTo(4, 1); c.quadraticCurveTo(12, -1, 20, -1); c.stroke(); c.restore(); }
}
// Mahoraga'nın vuruşları: ilk 2 sn rakibin savunmasına çarpar, sonra ona uyum sağlayıp deler; çağrıldıktan sonraki 5 sn rakip ölmez (izlensin)
function mahVur(o, s, e, d, kb) {
  const uyumlu = o.t - s.hafiza.mah > 120;
  const v = o.vur(e, d, { x: s.x, y: s.y, renk: '#efe6cf', yoksay: uyumlu, kesin: uyumlu }, kb, 'yakin');
  if (e.hp <= 0 && o.t - s.hafiza.mah < 300) e.hp = 1;
  return v;
}
function mahoragaOl(b, e, o) {
  const h = b.hafiza; if (h.mah) return;
  h.rit = 0; h.mah = o.t; h.tut = 0; h.uyum = new Set(); h.carkA = h.carkH = 0; h.tik = -99;
  Object.assign(b, { r: 31, hp: b.mx, renk: '#efe6cf', etiket: 'MAHORAGA', tip: 'yakin', don: 0 });
  b.dokunulmaz = sk => { if (sk && !h.uyum.has(sk)) { h.uyum.add(sk); h.carkH += TAU_ / 8; h.tik = o.t; } }; // her yeni skille tekerlek bir kol döner
  const a = yonu(b, e); e.vx += Math.cos(a) * 12; e.vy += Math.sin(a) * 12 - 2; o.sars(12);
  o.ekle({ sahip: b, x: b.x, y: b.y, omur: 1e9,
    adim(m, o) { const s = m.sahip; if (!s.hafiza.mah) { m.olu = 1; return; } s.don = 0; h.carkA += (h.carkH - h.carkA) * .18; m.x = s.x; m.y = s.y; }, // dondurulamaz
    ciz(c, m, o) { const k = m.l / 50; if (k >= 1) return; // çıkış: yerden yükselen gölge sütunu ve şok halkası
      golge(c, m.x, m.y + 26, 60 * (1 - k * .5), 14 * (1 - k * .5), 1 - k);
      halka(c, m.x, m.y, 30 + 140 * Math.sqrt(k), '#efe6cf', 3 * (1 - k) + .5, (1 - k) * .8); } });
}
function megumiDon(b) { // demoda Mahoraga'dan Megumi'ye geri döner
  const h = b.hafiza; h.mah = h.rit = h.tut = 0; h.dalis = 0;
  Object.assign(b, { r: b.k.r || 24, renk: b.k.renk, etiket: null, tip: null, dokunulmaz: null });
}

// ---- Naoya: Projeksiyon Büyüsü. Her hareketi saniyede 24 kareye bölünür: ardında ince beyaz film kareleri, dokunduğunu düz bir kareye hapseder.
// Naoya: kısa, aşağı düşen zeytin-sarı saç; alnına sivri perçemler iner (ortadakiler en uzun), şakakları örter
const NAOYA_SAC = [[-25, 4, .2, .1], [-28, -8], [-27, -20, .3], [-22, -30], [-13, -36, .3], [-2, -38], [10, -37, .3], [20, -32], [27, -22, .3], [28, -10], [25, 4, .2, .1],
  [21, -4, 0, .1], [18, 0, .2, .04], [15, -10, 0, .04], [12, -6, .2, .04], [8, -12, 0, .04], [4, -4.5, .3, .04], [1, -11, 0, .04], [-2, -5, .3, .04], [-5, -12, 0, .04],
  [-9, -6.5, .2, .04], [-12, -12, 0, .04], [-16, -3, .2, .04], [-19, -9, 0, .04], [-22, 0, .2, .04]];
const NAOYA_TEL = [[0, -34, 1, -20, -2, -4], [8, -33, 7, -18, 4, -3], [-9, -32, -9, -18, -9, -6], [17, -28, 16, -14, 12, -5], [-18, -26, -18, -12, -16, -4], [23, -20, 22, -8, 18, -2]];
// film karesi: ince beyaz çerçeve, üst ve altta delik sırası
function filmKare(c, x, y, w, hh, a, al, dolgu) {
  if (al <= 0) return;
  c.save(); c.translate(x, y); c.rotate(a); c.globalAlpha = Math.min(1, al);
  if (dolgu) { c.fillStyle = 'rgba(232,232,244,.13)'; c.fillRect(-w / 2, -hh / 2, w, hh); }
  c.strokeStyle = '#eceaf2'; c.lineWidth = 1.3; c.strokeRect(-w / 2, -hh / 2, w, hh);
  c.fillStyle = '#eceaf2'; for (let i = -w / 2 + 4; i < w / 2 - 3; i += 7) { c.fillRect(i, -hh / 2 + 2, 2.4, 2.4); c.fillRect(i, hh / 2 - 4.4, 2.4, 2.4); }
  c.restore();
}
// Naoya'nın darbesi: kırılıp saçılan küçük film kareleri
function kareFx(o, x, y, a) {
  if (o.sim) return;
  o.ekle({ x, y, omur: 16, p: Array.from({ length: 4 }, () => [a + Math.PI + rnd(-1, 1), rnd(1.5, 3.5), rnd(-.3, .3)]),
    ciz(c, m) { const k = m.l / m.omur; for (const [t, v, r] of m.p) filmKare(c, m.x + Math.cos(t) * v * m.l, m.y + Math.sin(t) * v * m.l, 12, 9, r * m.l, 1 - k); } });
}
const naoyaKaynak = (o, n) => ({ x: n.x, y: n.y, renk: '#f4f1e6', vurFx: (x, y, a) => kareFx(o, x, y, a) });

// ---- Isagi (Blue Lock): arenada tek futbol topu var; skiller onunla ya da onsuz vurur. Diğer karakterlerin skilleri topa dokunmaz.
// Saç: koyu lacivert, dağınık kısa; gözlerin arasına inen tek tutam, yanlar kulak hizasında
const ISAGI_SAC = [[-25, 5, .2, .04], ...dikenler(0, -2, Math.PI * 1.02, Math.PI * 1.98, 11, [31, 34, 32, 36, 33, 35, 39, 34, 33, 35, 31], 27, .22),
  [25, 5, .2, .04], [21, -3, 0, .03], [19.5, 1, .3, .03], [16.5, -9, 0, .02], [14, -4.5, .3, .03], [11, -12, 0, .02], [7, -7, .3, .03], [4, -13, 0, .02],
  [1.2, 5, .25, .02], [-2, -13, 0, .02], [-6, -7, .3, .03], [-10, -12, 0, .02], [-14, -5, .3, .03], [-16.5, -9, 0, .02], [-19.5, 1, .3, .03], [-21, -3, 0, .03]];
const ISAGI_TEL = [[-8, -26, -10, -18, -12, -10], [4, -28, 4, -20, 3, -13], [14, -24, 16, -16, 15, -10], [-18, -20, -21, -13, -21, -5]];
const eo_ = (x, n = 2) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), n);
// yapboz parçası: üst ve sağda çıkıntı, alt ve solda girinti (ızgarada birbirine oturur); s yarı boy
function yapboz(c, x, y, s, a, dolgu, kenar, al, lw = 1) {
  if (al <= 0) return; const k = s * .34; c.save(); c.translate(x, y); c.rotate(a); c.globalAlpha = Math.min(1, al);
  c.beginPath(); c.moveTo(-s, -s); c.lineTo(-k, -s); c.arc(0, -s, k, Math.PI, 0); c.lineTo(s, -s); c.lineTo(s, -k); c.arc(s, 0, k, -Math.PI / 2, Math.PI / 2);
  c.lineTo(s, s); c.lineTo(k, s); c.arc(0, s, k, 0, Math.PI, true); c.lineTo(-s, s); c.lineTo(-s, k); c.arc(-s, 0, k, Math.PI / 2, -Math.PI / 2, true); c.closePath();
  if (dolgu) { c.fillStyle = dolgu; c.fill(); } if (kenar) { c.strokeStyle = kenar; c.lineWidth = lw; c.lineJoin = 'round'; c.stroke(); } c.restore();
}
// saçılan yapboz parçaları (vuruş efekti)
function yapbozSac(o, x, y, n, hiz, boy = 5) {
  if (o.sim) return;
  o.ekle({ x, y, omur: 46, p: Array.from({ length: n }, () => { const a = rnd(0, TAU_), v = hiz * rnd(.4, 1); return { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, a: rnd(0, TAU_), va: rnd(-.3, .3), s: boy * rnd(.7, 1.3) }; }),
    adim(m) { for (const q of m.p) { q.x += q.vx; q.y += q.vy; q.vx *= .93; q.vy = q.vy * .93 + .06; q.a += q.va; } },
    ciz(c, m) { const al = 1 - m.l / m.omur; for (const q of m.p) yapboz(c, q.x, q.y, q.s, q.a, 'rgba(232,240,255,.92)', '#2f62ff', al, 1.2); } });
}
// manga darbesi: beyaz şok halkaları, dışa fırlayan kalın sivri çizgiler, mavi parlama
function darbeFx(o, x, y, guc = 1) {
  if (o.sim) return;
  o.ekle({ x, y, omur: 22, guc, cz: Array.from({ length: 12 }, () => [rnd(0, TAU_), rnd(.6, 1.2)]),
    ciz(c, m, o) { const u = m.l / m.omur, al = 1 - u, g = m.guc;
      o.isik(c, m.x, m.y, 70 * g * (1 - u * .4), '#3d72ff', .7 * al);
      halka(c, m.x, m.y, 8 + 46 * g * eo_(u), '#ffffff', 3.5 * g * al + .5, al);
      halka(c, m.x, m.y, 4 + 28 * g * eo_(u * 1.4), '#9fbcff', 2 * al, .8 * al);
      c.save(); c.fillStyle = '#fff'; c.globalAlpha = al;
      for (const [b, k] of m.cz) { const r0 = 10 + 30 * g * u * k, r1 = r0 + 34 * g * k * (1 - u * .6), w = 2.6 * g * k * al, ca = Math.cos(b), sa = Math.sin(b);
        c.beginPath(); c.moveTo(m.x + ca * r0 - sa * w, m.y + sa * r0 + ca * w); c.lineTo(m.x + ca * r1, m.y + sa * r1); c.lineTo(m.x + ca * r0 + sa * w, m.y + sa * r0 - ca * w); c.fill(); }
      c.restore(); } });
}
// anime "hit frame" (bütün karakterler kullanabilir): oyun bir an donar, arena siyah-beyaza döner (beyaz zemin, mürekkep silüetler), darbeye odaklanan
// kalın siyah çizgiler; sonra beyaz flaş söner. ters = false sade sürüm: daha kısa donma. Yalnızca büyük anlarda kullan.
// Siyah-beyaz geçiş ciz()'in sonunda (kareSiyahBeyaz) yapılır ki o karede çizilen her efekt (Kaiser'in gülü, parçacıklar) de dönsün.
function vurusKaresi(o, x, y, guc = 1, ters = true) {
  if (o.sim) return; o.dur = Math.max(o.dur, Math.round((ters ? 6 : 3) + 4 * guc)); o.sars(5 + 3 * guc);
  o.ekle({ x, y, omur: 4 + guc * 2 | 0, guc, cz: Array.from({ length: 28 }, () => [rnd(0, TAU_), rnd(.3, 1)]),
    ciz(c, m, o) { if (m.l <= 1 || (m.guc > 1.5 && m.l == 3)) { o.kare = m; return; } // aynı tick'te eklenen nesne bir kez ilerler, ilk kare l = 1
      c.save(); c.beginPath(); c.rect(6, 6, o.W - 12, o.H - 12); c.clip();
      c.globalAlpha = .45 * (1 - m.l / m.omur); c.fillStyle = '#fff'; c.fillRect(0, 0, o.W, o.H);
      c.globalAlpha = .5 * (1 - m.l / m.omur); vurusCizgi(c, m, false); c.restore(); } });
}
function vurusCizgi(c, m, ters) {
  const g = m.guc; c.fillStyle = ters ? '#000' : '#fff';
  for (const [a, k] of m.cz) { const r0 = 34 + 70 * (1 - k), w = 9 * k * g, ca = Math.cos(a), sa = Math.sin(a);
    c.beginPath(); c.moveTo(m.x + ca * r0, m.y + sa * r0); c.lineTo(m.x + ca * 800 - sa * w, m.y + sa * 800 + ca * w); c.lineTo(m.x + ca * 800 + sa * w, m.y + sa * 800 - ca * w); c.fill(); }
  if (ters) { c.globalAlpha = 1; c.strokeStyle = '#000'; c.lineWidth = 3 * g; c.beginPath(); c.arc(m.x, m.y, 18 * g, 0, TAU_); c.stroke(); }
}
// arenayı siyah-beyaz negatife çevirir: ctx.filter yerine karışım modları (filtre PC'de kareyi ikiye katlıyordu, iOS'ta hiç yok, renkli negatif kalıyordu)
function kareSiyahBeyaz(c, m, o) {
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'saturation'; c.fillStyle = '#808080'; c.fillRect(0, 0, c.canvas.width, c.canvas.height); c.restore(); // arenadan taşan efektler de renksiz; yan göstergeleri ciz() renkli yeniden çizer
  c.save(); c.beginPath(); c.rect(6, 6, o.W - 12, o.H - 12); c.clip();
  c.globalCompositeOperation = 'saturation'; c.fillStyle = '#808080'; c.fillRect(0, 0, o.W, o.H); // renksiz: yalnızca parlaklık kalır
  c.globalCompositeOperation = 'difference'; c.fillStyle = '#fff'; c.fillRect(0, 0, o.W, o.H);    // ters: siyah zemin beyaz, neon mürekkep
  c.globalCompositeOperation = 'color-burn'; c.fillStyle = '#b0b0b0'; c.fillRect(0, 0, o.W, o.H); // kontrast: ara tonlar koyulaşır, beyaz kalır
  c.globalCompositeOperation = 'source-over'; c.globalAlpha = .92; vurusCizgi(c, m, true); c.restore();
}
// şut anı: kısa donma, şut yönünde arenayı yaran hız çizgileri ve önde açılan hava dalgası
function sutAni(o, x, y, a, guc = 1) {
  if (o.sim) return; o.dur = Math.max(o.dur, Math.round(2 + 2 * guc));
  o.ekle({ x, y, a, guc, omur: 16, cz: Array.from({ length: 12 }, () => [rnd(-1, 1), rnd(.4, 1), rnd(0, 120)]),
    ciz(c, m, o) { const u = m.l / m.omur, al = 1 - u, ca = Math.cos(m.a), sa = Math.sin(m.a), g = m.guc;
      c.save(); c.beginPath(); c.rect(6, 6, o.W - 12, o.H - 12); c.clip(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
      for (const [k, b, d] of m.cz) { const ox = -sa * k * 46 * g, oy = ca * k * 46 * g, d0 = d + 80 * u, L = (90 + 220 * b) * g;
        c.strokeStyle = b > .7 ? '#fff' : '#8fb0ff'; c.globalAlpha = al * b; c.lineWidth = (b > .7 ? 2.4 : 1.2) * g;
        c.beginPath(); c.moveTo(m.x + ox + ca * d0, m.y + oy + sa * d0); c.lineTo(m.x + ox + ca * (d0 + L), m.y + oy + sa * (d0 + L)); c.stroke(); }
      const R = 14 + 40 * eo_(u) * g; c.strokeStyle = '#fff'; c.globalAlpha = al; c.lineWidth = 4 * g * al + .5; // önde hava dalgası (yay)
      c.beginPath(); c.arc(m.x + ca * R * .6, m.y + sa * R * .6, R, m.a - 1.1, m.a + 1.1); c.stroke();
      c.strokeStyle = '#7fa4ff'; c.lineWidth = 2 * al; c.beginPath(); c.arc(m.x + ca * R * .2, m.y + sa * R * .2, R * .7, m.a - 1.3, m.a + 1.3); c.stroke();
      c.restore(); } });
}
const isagiKaynak = (o, n, guc = 1) => ({ futbol: true, x: n.x - n.vx * 2, y: n.y - n.vy * 2, renk: '#2f62ff', vurFx: (x, y, a, kr) => { const g = guc * (kr ? 1.4 : 1); vurusKaresi(o, x, y, g); darbeFx(o, x, y, g * 1.3); yapbozSac(o, x, y, kr ? 12 : 8, kr ? 7 : 5.5, 5); } });
// Metavizyon yüzü: gözden şakağa yayılan ışıklı yapboz çatlakları (k: yayılma 0..1)
function yapbozCatlak(c, x, y, k, yon = 1) { // yon: -1 sol göz, çatlaklar sol şakağa yayılır
  c.save(); c.beginPath(); c.arc(0, 0, 24, 0, TAU_); c.clip();
  for (let i = -1; i <= 2; i++) for (let j = -2; j <= 1; j++) { const px = x + yon * (i * 6.4 - 1), py = y + j * 6.4 + 2.5, d = Math.hypot(px - x, py - y); if (d > 17 * k || (i < 0 && j > 0)) continue;
    const f = 1 - d / 19; yapboz(c, px, py, 3.2, 0, null, 'rgba(30,140,255,.8)', f, 1.5); yapboz(c, px, py, 3.2, 0, null, '#e8f8ff', f, .45); }
  c.restore();
}
function halkaFx(o, x, y, renk) { o.ekle({ x, y, omur: 14, ciz(c, m) { const u = m.l / 14; halka(c, m.x, m.y, 10 + 26 * eo_(u), renk, 3 * (1 - u) + .5, 1 - u); halka(c, m.x, m.y, 6 + 14 * u, '#fff', 1.5, 1 - u); } }); } // top el değiştirdi
const isagiCarpan = (b, o) => (b.hafiza.akis ? 1.2 : 1) * (o.t < (b.hafiza.meta || 0) ? 1.25 : 1);
// tek top: topla oynayan karakter varsa ilk ihtiyaçta sahibinin yanında doğar, maç boyunca kalır (yoktan top yaratan skill yok)
function futbol(o, b) {
  return o.nes.find(n => n.futbol) || o.ekle({ futbol: true, x: kis(b.x - b.taraf * 40, 20, o.W - 20), y: b.y - 20, r: 9, omur: Infinity, sahip: b, don: 0, atis: null, iz: [], adim: topAdim, ciz: futbolCiz });
}
// şut: top hedefe fırlar; rakibe çarparsa hasar, duvara giderse iz bırakır, sonra yine sahibine döner. ek.atan: şutu atan (top ona geçer).
// Vuruş kaynağı atanın topKaynak(o, top, guc) kancasından gelir (yoksa Isagi'ninki), isabette atanın topVurdu(atan, hedef, o) kancası çalışır.
function sut(o, n, a, hiz, hasar, kb, ek = {}) {
  const atan = ek.atan || n.sahip; n.sahip = atan;
  n.vx = Math.cos(a) * hiz; n.vy = Math.sin(a) * hiz; n.atis = { hasar, kb, l: 0, ...ek, atan }; n.sk = o.sk; n.kul = o.kul; n.iz = [];
  if (!o.sim) { darbeFx(o, n.x, n.y, ek.guc || 1); sutAni(o, n.x, n.y, a, ek.guc || 1); o.sars(3 + 3 * (ek.guc || 1)); }
}
function topAdim(n, o) {
  const s = n.sahip; if (!o.T.includes(s)) { n.olu = 1; return; } // tek top: serbestken topla oynayan başka karaktere değerse ona geçer (Isagi–Kaiser rekabeti)
  const h = s.hafiza, R = n.r;
  if (n.atis) { const at = n.atis; at.l++;
    if (at.gudum) { const e = o.rakip(s), v = Math.hypot(n.vx, n.vy), a0 = Math.atan2(n.vy, n.vx), da = yonu(n, e) - a0, a = a0 + kis(Math.atan2(Math.sin(da), Math.cos(da)), -at.gudum, at.gudum); n.vx = Math.cos(a) * v; n.vy = Math.sin(a) * v; }
    if (at.egri && at.l > 5 && at.l < 40) { const a = Math.atan2(n.vy, n.vx) + at.egri; const v = Math.hypot(n.vx, n.vy); n.vx = Math.cos(a) * v; n.vy = Math.sin(a) * v; } // falso
    if (at.l > 70 || Math.hypot(n.vx, n.vy) < 5) n.atis = null; }
  else { const d = uzak(n, s) || 1, ck = (.03 + .07 * Math.min(1, d / 160)) * (h.akis ? 1.6 : 1) * (o.t < (h.meta || 0) ? 1.5 : 1); // sahibine doğru hafif çekim
    n.vx += (s.x - n.x) / d * ck; n.vy += (s.y - n.y) / d * ck + .07; n.vx *= .992; n.vy *= .992; }
  let duvar = false;
  if (n.x < 6 + R) { n.x = 6 + R; n.vx = Math.abs(n.vx) * .75; duvar = true; }
  if (n.x > o.W - 6 - R) { n.x = o.W - 6 - R; n.vx = -Math.abs(n.vx) * .75; duvar = true; }
  if (n.y < 6 + R) { n.y = 6 + R; n.vy = Math.abs(n.vy) * .75; duvar = true; }
  if (n.y > o.H - 6 - R) { n.y = o.H - 6 - R; n.vy = -Math.abs(n.vy) * .65; n.vx *= .96; duvar = true; }
  if (duvar && n.atis) { o.duvarVur(n.x, n.y, '#cfe0ff', 2); darbeFx(o, n.x, n.y, .6); o.sars(3); n.atis = null; }
  for (const f of o.T) { if (f.hp <= 0) continue; const dx = n.x - f.x, dy = n.y - f.y, d = Math.hypot(dx, dy) || 1, rr = f.r + R; if (d >= rr) continue;
    const nx = dx / d, ny = dy / d; n.x = f.x + nx * rr; n.y = f.y + ny * rr;
    if (n.atis && f !== n.atis.atan) { const at = n.atis, A = at.atan; n.atis = null; if (o.vur(f, at.hasar, (A.k.topKaynak || isagiKaynak)(o, n, at.guc), at.kb, 'menzil') > 0) A.k.topVurdu?.(A, f, o); at.son?.(n, f, o); }
    else if (!n.atis && f !== n.sahip && f.k.top && !n.kilit) { n.sahip = f; if (!o.sim) { o.parca(n.x, n.y, [f.renk, '#fff'], 10, 3.5, 18, 2); halkaFx(o, n.x, n.y, f.renk); } }
    const rv = (n.vx - f.vx) * nx + (n.vy - f.vy) * ny; if (rv < 0) { n.vx -= 1.7 * rv * nx; n.vy -= 1.7 * rv * ny; } } // top hafif: karakterleri itmez, onlardan seker
  const v = Math.hypot(n.vx, n.vy), vm = n.atis?.vmax || 24; if (v > vm) { n.vx *= vm / v; n.vy *= vm / v; }
  n.don += n.vx * .09;
  if (o.sim) return; if (n.atis) { n.iz.push([n.x, n.y]); if (n.iz.length > 16) n.iz.shift(); } else if (n.iz.length) n.iz.shift();
}
function futbolCiz(c, n, o) {
  const R = n.r, at = n.atis;
  if (n.iz.length > 1) { // şut izi: kalın mavi kuyruk, beyaz çekirdek, hız çizgileri, topu saran rüzgâr
    const g = at?.guc || 1, r1 = at?.renk || n.izRenk || '#3d72ff', r2 = at?.renk2 || '#9fbcff'; if (at) n.izRenk = r1; c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
    for (let i = 1; i < n.iz.length; i++) { const f = i / n.iz.length, [x0, y0] = n.iz[i - 1], [x1, y1] = n.iz[i];
      c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.strokeStyle = r1; c.globalAlpha = f * .55; c.lineWidth = R * 3 * f * g; c.stroke();
      c.strokeStyle = '#fff'; c.globalAlpha = f * .8; c.lineWidth = R * .8 * f; c.stroke(); }
    if (at) { const a = Math.atan2(n.vy, n.vx), ca = Math.cos(a), sa = Math.sin(a); c.strokeStyle = '#fff';
      for (const [k, L, w] of [[-1.7, 70, 1.3], [1.6, 90, 1.3], [-.7, 120, .8], [.9, 60, .8]]) { const ox = -sa * R * k, oy = ca * R * k, d0 = R + 6 + (o.t * 7 + L) % 30;
        c.globalAlpha = .55; c.lineWidth = w; c.beginPath(); c.moveTo(n.x + ox - ca * d0, n.y + oy - sa * d0); c.lineTo(n.x + ox - ca * (d0 + L * g), n.y + oy - sa * (d0 + L * g)); c.stroke(); }
      c.strokeStyle = r2; c.lineWidth = 1.6; c.globalAlpha = .8;
      for (let j = 0; j < 2; j++) { c.beginPath(); c.ellipse(n.x - ca * 4, n.y - sa * 4, R + 6, R * .7 + 3, a, o.t * .5 + j * Math.PI, o.t * .5 + j * Math.PI + 2); c.stroke(); } }
    c.restore(); if (at) { o.isik(c, n.x, n.y, 36 * g, r1, .6); at.ciz?.(c, n, o); } }
  c.save(); c.translate(n.x, n.y); c.rotate(n.don); c.fillStyle = '#f4f6fa'; c.beginPath(); c.arc(0, 0, R, 0, TAU_); c.fill(); c.clip();
  const bes = (x, y, r, d) => { c.beginPath(); for (let i = 0; i < 5; i++) { const a = d + i * TAU_ / 5; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.fill(); };
  c.fillStyle = '#1a1c24'; bes(0, 0, R * .36, -Math.PI / 2);
  for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU_ / 5 + Math.PI / 5; bes(Math.cos(a) * R, Math.sin(a) * R, R * .36, a + Math.PI); }
  c.strokeStyle = '#1a1c24'; c.lineWidth = .7; c.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU_ / 5; c.moveTo(Math.cos(a) * R * .36, Math.sin(a) * R * .36); c.lineTo(Math.cos(a) * R * .72, Math.sin(a) * R * .72); } c.stroke();
  c.restore();
  const gr = c.createRadialGradient(n.x - R * .35, n.y - R * .4, 0, n.x, n.y, R * 1.1); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(10,14,40,.5)');
  c.fillStyle = gr; c.beginPath(); c.arc(n.x, n.y, R, 0, TAU_); c.fill(); c.strokeStyle = '#0e1018'; c.lineWidth = .8; c.stroke();
}
// büyük anime gözü (Metavizyon alanı ve ulti ara sahnesi): badem göz, ağ desenli parlayan iris. s = -1 aynalı (sol göz), beyaz: göz akı alfası
function metaGoz(c, x, y, w, ac, t, bx, by, al, s = 1, beyaz = .13) {
  if (al <= 0 || ac <= 0) return; const h = w * .4 * ac;
  const ust = () => { c.moveTo(-w, 4); c.bezierCurveTo(-w * .55, -h * 1.05, w * .4, -h * 1.15, w, -6); };
  c.save(); c.translate(x, y); c.scale(s, 1); c.globalAlpha = al; c.lineCap = c.lineJoin = 'round';
  c.beginPath(); ust(); c.quadraticCurveTo(w * .1, h * .85, -w, 4); c.fillStyle = 'rgba(225,232,255,' + beyaz + ')'; c.fill(); c.save(); c.clip();
  const ix = bx * s * w * .18, iy = by * h * .2 + 2, R = w * .33, N = 14, p = (a, f) => [ix + Math.cos(a) * R * f, iy + Math.sin(a) * R * f];
  const gr = c.createRadialGradient(ix, iy, R * .15, ix, iy, R); gr.addColorStop(0, '#b8d0ff'); gr.addColorStop(.45, '#3a6cff'); gr.addColorStop(1, '#0a1a66');
  c.fillStyle = gr; c.beginPath(); c.arc(ix, iy, R, 0, TAU_); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = Math.max(.8, w / 110); c.beginPath(); // örümcek ağı: ışınlar ve içe sarkan halkalar
  for (let i = 0; i < N; i++) { const a = t * .004 + i * TAU_ / N; c.moveTo(...p(a, .2)); c.lineTo(...p(a, .96)); }
  for (const f of [.34, .5, .66, .82]) { c.moveTo(...p(t * .004, f)); for (let i = 1; i <= N; i++) { const a = t * .004 + i * TAU_ / N; c.quadraticCurveTo(...p(a - Math.PI / N, f * .86), ...p(a, f)); } }
  c.stroke();
  c.fillStyle = '#020410'; c.beginPath(); c.arc(ix, iy, R * .2, 0, TAU_); c.fill(); c.strokeStyle = 'rgba(200,220,255,.7)'; c.lineWidth = Math.max(.8, w / 90); c.stroke();
  c.fillStyle = '#fff'; c.beginPath(); c.ellipse(ix - R * .42, iy - R * .45, R * .13, R * .1, -.5, 0, TAU_); c.fill(); c.beginPath(); c.arc(ix + R * .35, iy + R * .4, R * .05, 0, TAU_); c.fill();
  c.strokeStyle = 'rgba(0,0,20,.55)'; c.lineWidth = h * .3; c.beginPath(); ust(); c.stroke(); // üst kapağın göze düşen gölgesi
  c.restore();
  c.strokeStyle = '#e8eeff'; c.lineWidth = Math.max(2, w / 26); c.beginPath(); ust(); c.stroke(); // kalın üst kapak çizgisi ve dış köşe kirpikleri
  c.lineWidth = Math.max(1.2, w / 50); c.beginPath(); for (const [dx, dy] of [[.14, -.2], [.2, -.05]]) { c.moveTo(w * .92, -8); c.lineTo(w * (1 + dx), -8 + h * dy - 4); } c.stroke();
  c.globalAlpha = al * .7; c.lineWidth = Math.max(.8, w / 90); c.beginPath(); c.moveTo(w * .9, -2); c.quadraticCurveTo(w * .1, h * .85, -w * .8, 6); c.stroke(); // ince alt çizgi
  c.globalAlpha = al * .45; c.beginPath(); c.moveTo(-w * .5, -h * .95); c.bezierCurveTo(-w * .2, -h * 1.32, w * .35, -h * 1.35, w * .75, -h * .75); c.stroke(); // kapak kıvrımı
  c.restore();
}

// ---- Peely (Fortnite): anime değil, çizgi film. Silahlar düz renk + kalın koyu kontur; nadirlik rengi yalnızca silahın altında hafif bir parıltı.
const FN_NADIR = { scar: '#f2a531', pompa: '#3aa0ff', sniper: '#b35cff' };
function silahCiz(c, t, x, y, a, al = 1, k = 1.3) {
  c.save(); c.translate(x, y); c.rotate(a); if (t == 'sniper') k *= .9; c.scale(k, Math.cos(a) < 0 ? -k : k); c.globalAlpha = al; c.lineJoin = 'round'; c.lineCap = 'round';
  const K = '#1a120a', yol = (renk, P, kapa = true) => { c.fillStyle = renk; c.beginPath(); c.moveTo(...P[0]); for (const p of P.slice(1)) c.lineTo(...p); if (kapa) c.closePath(); c.fill(); c.strokeStyle = K; c.lineWidth = .9; c.stroke(); },
    kutu = (renk, x, y, w, h) => yol(renk, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]), cizgi = (renk, w, P) => { c.strokeStyle = renk; c.lineWidth = w; c.beginPath(); c.moveTo(...P[0]); for (const p of P.slice(1)) c.lineTo(...p); c.stroke(); };
  if (t == 'scar') { const T = '#d9b77c', TK = '#b08a52';
    yol('#2b2b30', [[9, 4], [12.5, 4], [15.5, 9], [15, 13.5], [11.5, 14.5], [12, 9]]); // kavisli şarjör
    c.strokeStyle = '#55565e'; c.lineWidth = .6; for (const q of [7.5, 10, 12.5]) { c.beginPath(); c.moveTo(11.5 + (q - 7) * .35, q); c.lineTo(14.5 + (q - 7) * .1, q - .4); c.stroke(); }
    yol('#24242a', [[1.5, 3], [5, 3], [4.2, 10], [.4, 9.6]]); // tabanca kabzası
    yol(T, [[-19, -3.2], [-7, -3.8], [-6, 2.6], [-13, 3.6], [-19, 5.4]]); kutu('#2a2a30', -21, -3.6, 2.4, 9.4); // dipçik, nervürlü kauçuk
    c.strokeStyle = '#55565e'; c.lineWidth = .5; for (let i = -2; i <= 4; i += 1.6) { c.beginPath(); c.moveTo(-21, i); c.lineTo(-18.6, i); c.stroke(); }
    yol(T, [[-7, -4], [22, -4], [23, -1], [22, 2.4], [6, 2.4], [5, 4.5], [-2, 4.5], [-6, 2.6]]); // gövde
    yol(TK, [[6, 2.4], [16, 2.4], [16, 4], [7, 4]]); kutu('#3a3a40', 2, -1, 6, 1.6); // alt kızak, şarjör yatağı, ejektör
    for (const x of [12, 15, 18]) { c.fillStyle = '#2a2018'; c.beginPath(); c.ellipse(x, -.6, 1.1, .7, 0, 0, TAU_); c.fill(); } // el korumasındaki delikler
    kutu('#202024', -3, -5.6, 25, 1.6); c.fillStyle = '#5a5a62'; for (let x = -2; x < 22; x += 2) c.fillRect(x, -5.4, 1, .6); // üst ray
    yol('#202024', [[-1.5, -5.6], [-1, -8.5], [1, -8.5], [1.5, -5.6]]); yol('#202024', [[19, -5.6], [19.4, -9], [21, -9], [21, -5.6]]); // nişangahlar
    kutu('#202024', 23, -1.4, 10, 2); yol('#202024', [[33, -2.4], [37.5, -2.4], [37.5, 1.6], [33, 1.6]]); c.fillStyle = '#5a5a62'; c.fillRect(34, -1.6, .8, 2.4); c.fillRect(35.8, -1.6, .8, 2.4); // namlu, namlu freni
    cizgi('rgba(255,250,230,.5)', .8, [[-5, -3], [21, -3]]); }
  else if (t == 'pompa') { const A = '#8a4b22', AA = '#b8743c', M = '#26272c';
    yol(A, [[-21, -1.2], [-5, -3.4], [-3.5, 1.5], [-7, 3.2], [-9, 6.5], [-12, 6.5], [-11, 3.4], [-21, 5.8]]); cizgi(AA, .9, [[-19, -.2], [-7, -2.2]]); // tahta dipçik ve kabza
    kutu(M, -4, -3.6, 13, 6.2); kutu('#3c3e46', -2, -2.4, 7, 1.6); // siyah gövde
    kutu('#3a3b42', 9, -.2, 22, 2.4); kutu(M, 9, -3.2, 29, 2.8); c.fillStyle = '#111'; c.beginPath(); c.ellipse(38, -1.8, .8, 1.5, 0, 0, TAU_); c.fill(); // namlu ve şarjör borusu
    yol(A, [[12, -.8], [23, -.8], [24, 1.2], [23, 3.6], [12, 3.6], [11, 1.4]]); for (const x of [14.5, 17, 19.5]) cizgi('#5a2e12', .7, [[x, .2], [x, 3]]); cizgi(AA, .8, [[13, -.1], [22.5, -.1]]); // pompa kolu
    c.fillStyle = '#4bd36a'; c.beginPath(); c.arc(36.5, -3.8, .9, 0, TAU_); c.fill(); kutu(M, 1, -5, 2, 1.4); // yeşil arpacık, gez
    cizgi('rgba(255,255,255,.35)', .7, [[10, -2.8], [37, -2.8]]); }
  else if (t == 'sniper') { const T = '#d4b580', TK = '#a8864e';
    yol(T, [[-24, -2], [-9, -3], [-3, -2.2], [-3, 3.2], [-10, 3.6], [-13, 8], [-17, 8], [-16, 4.2], [-24, 6.5]]); c.fillStyle = '#1a120a'; c.beginPath(); c.ellipse(-12.5, 3.3, 2.6, 1.6, -.4, 0, TAU_); c.fill(); // ten rengi dipçik, başparmak deliği
    kutu('#2a2a30', -26, -2.4, 2.4, 9.4); cizgi(TK, .8, [[-22, -.6], [-9, -1.6]]);
    yol(T, [[-3, -2.2], [12, -2.2], [12, 2.4], [-3, 3.2]]); kutu('#2a2a30', 0, -2.8, 9, 1.6); // gövde, kilit
    yol('#2a2a30', [[3, 3], [6, 3], [6.5, 6], [3.5, 6]]); cizgi('#2a2a30', 1.2, [[7, -1], [8.5, 2.5]]); c.fillStyle = '#2a2a30'; c.beginPath(); c.arc(8.7, 2.9, 1.2, 0, TAU_); c.fill(); // şarjör, sürgü kolu
    kutu('#18181c', 1, -5.2, 2, 2.4); kutu('#18181c', 8, -5.2, 2, 2.4); // dürbün ayakları
    yol('#16161a', [[-5, -6.4], [-3, -7.6], [9, -7.6], [11, -9], [14, -9], [14, -4.4], [11, -4.4], [9, -5.4], [-3, -5.4], [-5, -4.6]]); c.fillStyle = '#5ab0ff'; c.beginPath(); c.ellipse(14, -6.7, .6, 2.1, 0, 0, TAU_); c.fill(); // dürbün, mavi mercek
    kutu('#b9bdc5', 12, -.9, 22, 1.8); cizgi('rgba(255,255,255,.7)', .5, [[12.5, -.6], [33.5, -.6]]); // gümüş namlu
    yol('#1e1e22', [[33, -2.6], [46, -2.6], [47, -1.6], [47, 1.6], [46, 2.6], [33, 2.6]]); cizgi('rgba(255,255,255,.25)', .8, [[34, -1.6], [46, -1.6]]); } // susturucu
  else if (t == 'kazma') { kutu('#8a5a2a', -2, -1.6, 27, 3.2); c.fillStyle = '#c3c8d2'; c.strokeStyle = K; c.lineWidth = .9; c.beginPath(); c.moveTo(22, -14); c.quadraticCurveTo(33, 0, 22, 14); c.quadraticCurveTo(28, 0, 22, -14); c.fill(); c.stroke();
    kutu('#3a6fd0', 21, -2.5, 5, 5); }
  c.restore();
}
function iksirCiz(c, x, y, a, dolu = 1) { // küçük kalkan iksiri: yuvarlak cam kavanoz, mandallı metal kapak, mor kurdele, mavi sıvı ve kabarcıklar
  c.save(); c.translate(x, y); c.rotate(a); c.scale(1.25, 1.25); c.lineJoin = 'round'; c.lineCap = 'round'; const K = '#0c1424';
  c.beginPath(); c.ellipse(0, 2, 8.4, 7.6, 0, 0, TAU_); c.fillStyle = 'rgba(215,235,255,.35)'; c.fill(); // cam
  c.save(); c.clip(); const g = c.createLinearGradient(0, -6, 0, 10); g.addColorStop(0, '#9fdcff'); g.addColorStop(1, '#1f63d8');
  const s = 9.6 - 15 * dolu; c.fillStyle = g; c.fillRect(-9, s, 18, 20); c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(-9, s, 18, .8);
  c.fillStyle = 'rgba(255,255,255,.75)'; for (const [bx, by, r] of [[-3, 6, .9], [2.5, 4, .7], [4.5, 7, .6], [-1, 8.5, .5], [1, 1.5, .5]]) if (by > s) { c.beginPath(); c.arc(bx, by, r, 0, TAU_); c.fill(); } c.restore();
  c.beginPath(); c.ellipse(0, 2, 8.4, 7.6, 0, 0, TAU_); c.strokeStyle = 'rgba(30,60,110,.9)'; c.lineWidth = .9; c.stroke();
  c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.ellipse(-4.2, -1, 1.5, 2.8, .5, 0, TAU_); c.fill(); // cam parlaması
  c.fillStyle = 'rgba(215,235,255,.5)'; c.fillRect(-5, -7, 10, 2.6); c.strokeStyle = K; c.lineWidth = .8; c.strokeRect(-5, -7, 10, 2.6); // boyun
  c.fillStyle = '#7a5aa8'; c.fillRect(-5.4, -5.6, 10.8, 1.6); c.beginPath(); c.moveTo(-5, -5); c.lineTo(-10, -2.5); c.lineTo(-9, -1.4); c.lineTo(-4.6, -4); c.lineTo(-9, -.4); c.lineTo(-8, .6); c.lineTo(-4.4, -4.2); c.fill(); // mor kurdele ve uçları
  c.fillStyle = '#b8bec8'; c.beginPath(); c.ellipse(0, -8, 6.4, 1.9, 0, 0, TAU_); c.fill(); c.stroke(); c.fillStyle = '#8a909c'; c.fillRect(-6.4, -8, 12.8, 1.6); c.strokeRect(-6.4, -8, 12.8, 1.6); // mandallı metal kapak
  c.strokeStyle = '#8a909c'; c.lineWidth = .9; c.beginPath(); c.moveTo(6, -7.5); c.lineTo(9.5, -5); c.lineTo(8.5, -1); c.moveTo(6.4, -6); c.lineTo(8.2, -2.5); c.stroke(); // tel mandal
  c.restore();
}
// anında giden mermi: ağızdan a yönünde duvara kadar; rakibin gövdesini keserse vurur. Isagi'nin topuna dokunmaz.
function fnIsin(o, b, a, pay = 0) {
  const e = o.rakip(b), ca = Math.cos(a), sa = Math.sin(a), x0 = b.x + ca * (b.r + 58), y0 = b.y + sa * (b.r + 58);
  const L = Math.max(0, Math.min(ca > 0 ? (o.W - 6 - b.x) / ca : ca < 0 ? (6 - b.x) / ca : 1e9, sa > 0 ? (o.H - 6 - b.y) / sa : sa < 0 ? (6 - b.y) / sa : 1e9)); // isabet gövde merkezinden ölçülür, iz namludan çizilir
  const dx = e.x - b.x, dy = e.y - b.y, on = dx * ca + dy * sa, yan = Math.abs(dx * sa - dy * ca), vur = on > 0 && on < L + e.r && yan < e.r + pay;
  const l = vur ? Math.max(0, on - Math.sqrt(Math.max(0, e.r * e.r - yan * yan))) : L;
  return { x0, y0, x1: b.x + ca * Math.max(l, b.r + 58), y1: b.y + sa * Math.max(l, b.r + 58), vur };
}
function fnIz(o, r, renk, w, omur) { if (o.sim) return; // mermi izi
  o.ekle({ x: 0, y: 0, x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1, omur, renk, w,
    ciz(c, m) { const u = m.l / m.omur; c.save(); c.lineCap = 'round'; c.globalAlpha = 1 - u; c.strokeStyle = m.renk; c.lineWidth = m.w * (1 - u) + .4;
      c.beginPath(); c.moveTo(m.x0 + (m.x1 - m.x0) * u * .6, m.y0 + (m.y1 - m.y0) * u * .6); c.lineTo(m.x1, m.y1); c.stroke(); c.restore(); } });
}
function fnAgiz(o, x, y, a, g = 1) { if (o.sim) return; // namlu alevi
  o.ekle({ x, y, a, g, omur: 5, ciz(c, m) { const u = m.l / m.omur, L = (10 + 8 * m.g) * (1 - u * .5), w = 4 * m.g; c.save(); c.translate(m.x, m.y); c.rotate(m.a); c.globalAlpha = 1 - u;
    c.fillStyle = '#ffd34a'; c.beginPath(); c.moveTo(0, -w); c.lineTo(L, 0); c.lineTo(0, w); c.lineTo(L * .3, 0); c.closePath(); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(1, 0, w * .55, 0, TAU_); c.fill(); c.restore(); } });
}
function fnIsaret(o, x, y, kr) { // Fortnite isabet işareti: dört kısa çapraz çizgi
  o.parca(x, y, ['#fff', '#ffe27a'], kr ? 8 : 4, 3, 12, 1.6);
  o.ekle({ x, y, omur: 12, kr, ciz(c, m) { const u = m.l / m.omur, r0 = 5 + 3 * u, r1 = r0 + (m.kr ? 8 : 5); c.save(); c.strokeStyle = m.kr ? '#ffd23f' : '#fff'; c.globalAlpha = 1 - u; c.lineWidth = 2; c.lineCap = 'round';
    for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + i * Math.PI / 2; c.beginPath(); c.moveTo(m.x + Math.cos(a) * r0, m.y + Math.sin(a) * r0); c.lineTo(m.x + Math.cos(a) * r1, m.y + Math.sin(a) * r1); c.stroke(); } c.restore(); } });
}
const fnKaynak = (o, x, y) => ({ mermi: true, x, y, renk: '#ffe27a', vurFx: (px, py, a, kr) => fnIsaret(o, px, py, kr) });
const fnKesisir = (p, q, m) => { const d = (ax, ay, bx, by, cx, cy) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax); // p→q doğrusu duvarı (x1,y1)-(x2,y2) keser mi
  return d(p.x, p.y, q.x, q.y, m.x1, m.y1) * d(p.x, p.y, q.x, q.y, m.x2, m.y2) < 0 && d(m.x1, m.y1, m.x2, m.y2, p.x, p.y) * d(m.x1, m.y1, m.x2, m.y2, q.x, q.y) < 0; };
// inşa: saldırının geldiği yöne tahta duvar. Önce mavi hologram çerçeve, sonra tahtayla dolar. Vuruşları emer; rakip yavaşsa yaslanır, hızlıysa parçalar. Top içinden geçer.
function fnDuvarKur(o, b, e) {
  const a = yonu(b, e), d = Math.min(46, uzak(b, e) / 2), cx = kis(b.x + Math.cos(a) * d, 14, o.W - 14), cy = kis(b.y + Math.sin(a) * d, 14, o.H - 14), px = -Math.sin(a) * 34, py = Math.cos(a) * 34;
  return o.ekle({ fnDuvar: true, sahip: b, x: cx, y: cy, a, x1: cx - px, y1: cy - py, x2: cx + px, y2: cy + py, hp: 5, mx: 5, omur: 300, sk: 'İnşa', adim: fnDuvarAdim, ciz: fnDuvarCiz });
}
function fnDuvarHasar(o, m, d) { m.hp -= d; m.f = 6; if (!o.sim) o.parca(m.x + rnd(-14, 14), m.y + rnd(-14, 14), ['#c08a4a', '#8a5a2a'], 4, 2.5, 18, 2);
  if (m.hp <= 0 && !m.kirik) { m.kirik = 1; m.omur = m.l + 1; if (!o.sim) { o.parca(m.x, m.y, ['#c08a4a', '#8a5a2a', '#e0b070'], 22, 5, 30, 3); o.sars(2); } } }
function fnDuvarAdim(m, o) { if (m.f) m.f--; if (m.l < 8 || m.kirik) return;
  const e = o.rakip(m.sahip), ux = m.x2 - m.x1, uy = m.y2 - m.y1, t = kis(((e.x - m.x1) * ux + (e.y - m.y1) * uy) / (ux * ux + uy * uy), 0, 1),
    qx = m.x1 + ux * t, qy = m.y1 + uy * t, dx = e.x - qx, dy = e.y - qy, d = Math.hypot(dx, dy) || 1;
  if (d < e.r + 4) { const nx = dx / d, ny = dy / d, v = e.vx * nx + e.vy * ny;
    if (v < -3) { fnDuvarHasar(o, m, m.hp); e.vx *= .7; e.vy *= .7; return; } // hızla çarpan duvarı parçalayıp geçer (sekip takılmaz)
    e.x = qx + nx * (e.r + 4); e.y = qy + ny * (e.r + 4); if (v < 0) { e.vx -= v * nx; e.vy -= v * ny; } } // yavaş gelen duvara yaslanır
}
function fnDuvarCiz(c, m) {
  const k = Math.min(1, m.l / 6), dol = kis((m.l - 6) / 8, 0, 1), son = Math.min(1, (m.omur - m.l) / 15), L = 68, T = 8;
  c.save(); c.translate(m.x, m.y); c.rotate(m.a + Math.PI / 2); c.globalAlpha = son; c.lineJoin = 'round';
  if (dol < 1) { c.strokeStyle = '#6fc8ff'; c.fillStyle = 'rgba(80,170,255,.18)'; c.lineWidth = 1.3; c.beginPath(); c.rect(-L / 2 * k, -T / 2, L * k, T); c.fill(); c.stroke(); // hologram çerçeve
    c.globalAlpha = .5 * son; for (let x = -L / 2; x <= L / 2 * k; x += 8.5) { c.beginPath(); c.moveTo(x, -T / 2); c.lineTo(x, T / 2); c.stroke(); } c.globalAlpha = son; }
  if (dol > 0) { const w = L * dol, hs = m.hp / m.mx; c.fillStyle = m.f ? '#f0d0a0' : hs > .5 ? '#b07a3e' : '#94622e'; c.strokeStyle = '#3a2410'; c.lineWidth = 1.4;
    c.beginPath(); c.rect(-L / 2, -T / 2, w, T); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(58,36,16,.6)'; c.lineWidth = 1; for (let x = -L / 2 + 17; x < -L / 2 + w; x += 17) { c.beginPath(); c.moveTo(x, -T / 2); c.lineTo(x, T / 2); c.stroke(); } // tahta aralıkları
    c.fillStyle = '#d8d8d8'; for (let x = -L / 2 + 4; x < -L / 2 + w; x += 17) for (const y of [-2, 2]) { c.beginPath(); c.arc(x, y, .8, 0, TAU_); c.fill(); } // çiviler
    if (hs < .6) { c.strokeStyle = '#2a1808'; c.lineWidth = 1; c.beginPath(); c.moveTo(-8, -T / 2); c.lineTo(-3, 0); c.lineTo(-9, T / 2); if (hs < .3) { c.moveTo(14, -T / 2); c.lineTo(19, 1); c.lineTo(15, T / 2); } c.stroke(); } }
  c.restore();
}
function kalkanKir(o, b) { o.parca(b.x, b.y, ['#7fd0ff', '#2f9bff', '#fff'], 16, 4.5, 24, 2.2);
  o.ekle({ x: b.x, y: b.y, omur: 16, ciz(c, m) { const u = m.l / m.omur; halka(c, m.x, m.y, b.r + 7 + 16 * u, '#7fd0ff', 2.5 * (1 - u) + .5, 1 - u); } }); }

// ---- Chun-Li: kahverengi taytlı bacak + bağcıklı beyaz çizme; chi efektleri sulu boya gibi (ışıma yok: şeffaf katmanlar, fırça yayı, damlalar)
const CHI = ['#1f4fc8', '#3a72e6', '#7fa8f4', '#cfe0ff'];
const CHUN_SAC = [[-24, 9, 0, .05], [-26.5, -5], [-24, -18], [-15, -26.5], [0, -28.5], [15, -26.5], [24, -18], [26.5, -5], [24, 9, 0, .05],
  [21, -1, 0, .1], [19, -6, 0, .05], [12, -5.5, 0, -.12], [5, -9, 0, -.1], [1, -17, 0, -.08], [-3, -9, 0, .08], [-11, -5.5, 0, -.1], [-19, -6, 0, -.12], [-21, -1, 0, .05]];
const CHUN_TEL = [[-2, -26, -7, -20, -11, -13], [3, -26, 8, -20, 12, -13], [-12, -24, -17, -17, -20, -8], [12, -24, 17, -17, 20, -8]];
function bacakCiz(c, x, y, a, L, al = 1) { // (x,y) kalça, a yönünde L boyunda; uçta bağcıklı beyaz çizme
  if (al <= 0) return; c.save(); c.translate(x, y); c.rotate(a); c.globalAlpha = Math.min(1, al); c.lineJoin = c.lineCap = 'round';
  const B = L - 13, g = c.createLinearGradient(0, -5, 0, 5); g.addColorStop(0, '#4e3226'); g.addColorStop(.35, '#a77a5e'); g.addColorStop(1, '#4a2e22');
  c.fillStyle = g; c.beginPath(); c.moveTo(0, -5.6); c.quadraticCurveTo(B * .45, -6.4, B, -3.8); c.lineTo(B, 3.8); c.quadraticCurveTo(B * .45, 5.6, 0, 5.4); c.closePath(); c.fill(); // kahverengi tayt
  c.strokeStyle = 'rgba(30,16,10,.6)'; c.lineWidth = .8; c.stroke();
  c.fillStyle = '#f5f5f2'; c.beginPath(); c.moveTo(B - 2, -4.6); c.lineTo(L - 3, -4.2); c.quadraticCurveTo(L + 3, -3.6, L + 3, .4); c.quadraticCurveTo(L + 2.6, 4.6, L - 3, 4.8); c.lineTo(B - 2, 5); c.closePath(); c.fill();
  c.strokeStyle = '#8e949e'; c.lineWidth = .8; c.stroke(); // çizme
  c.fillStyle = '#c9ced6'; c.fillRect(B - 2, 3.6, L - B + 3, 1.4); c.fillStyle = '#e4e6ea'; c.fillRect(B - 3.4, -5.2, 2.2, 10.4); // taban, çizme ağzı
  c.strokeStyle = 'rgba(140,148,160,.6)'; c.lineWidth = .5; c.beginPath(); for (let i = 0; i < 4; i++) { const q = B + i * 2.6; c.moveTo(q, -3.4); c.lineTo(q + 2, .6); c.moveTo(q + 2, -3.4); c.lineTo(q, .6); } c.stroke(); // bağcıklar
  c.restore();
}
function chiFx(o, x, y, a, g = 1) { if (o.sim) return; // sulu boya mavi sıçrama: üst üste şeffaf lekeler, fırça yayı, dağılan damlalar
  o.ekle({ x, y, a, g, omur: 26,
    lk: Array.from({ length: 7 }, () => { const t = a + rnd(-1, 1), r = rnd(2, 14) * g; return [Math.cos(t) * r, Math.sin(t) * r, rnd(3, 7) * g, CHI[rnd(0, 4) | 0]]; }),
    dm: Array.from({ length: 10 }, () => { const t = a + rnd(-.9, .9), v = rnd(1.2, 3.6) * g; return [Math.cos(t) * v, Math.sin(t) * v, rnd(.8, 2) * g]; }),
    ciz(c, m) { const u = m.l / m.omur, al = 1 - u, ca = Math.cos(m.a), sa = Math.sin(m.a);
      for (const [dx, dy, r, k] of m.lk) { c.globalAlpha = .3 * al; c.fillStyle = k; c.beginPath(); c.arc(m.x + dx * (1 + u), m.y + dy * (1 + u), r * (1 + u * .6), 0, TAU_); c.fill(); }
      const R = 16 * m.g * (.6 + .4 * eo_(u * 2)); c.globalAlpha = .55 * al; c.fillStyle = '#5a8cf0'; // fırça yayı
      c.beginPath(); c.arc(m.x, m.y, R, m.a - 1.2, m.a + 1.2); c.arc(m.x - ca * R * .4, m.y - sa * R * .4, R * .95, m.a + 1.05, m.a - 1.05, true); c.fill();
      c.fillStyle = '#2a5ad0'; for (const [vx, vy, r] of m.dm) { const t = m.l * (1 - u * .5); c.globalAlpha = .7 * al; c.beginPath(); c.arc(m.x + vx * t, m.y + vy * t + .03 * m.l * m.l, r, 0, TAU_); c.fill(); }
      c.globalAlpha = 1; } });
}
const chiKaynak = (o, x, y, ek = {}) => ({ x, y, renk: '#3f8cff', vurFx: (px, py, a, kr) => chiFx(o, px, py, a, kr ? 1.4 : 1), ...ek });
const saEkle = (b, d) => { if (!b.hafiza.sup) b.hafiza.sa = Math.min(100, (b.hafiza.sa || 0) + d); }; // Super Art göstergesi (0..100)
function chunVur(o, s, e, d, kb, k = s, tur = 'yakin', ek) { if (tur == 'yakin') s.hafiza.tekme = o.t + 6; const v = o.vur(e, d, chiKaynak(o, k.x, k.y, ek), kb, tur); if (v > 0) saEkle(s, v * 1.1); return v; }
function kopekTekme(o, s, R) { for (const n of o.nes) if (n.kopek && n.p == null && uzak(n, s) < R) { n.p = n.l; n.omur = n.l + 12; chiFx(o, n.x, n.y, yonu(s, n), .8); } } // tekme yolundaki gölge köpeklerini savurur
function chiEller(c, x, y, a, al) { // Kikoken duruşu: bilekler bitişik, avuçlar önde, parmaklar dışa açık; bileklerde dikenli bileklik
  c.save(); c.translate(x, y); c.rotate(a); c.globalAlpha = al; c.lineCap = c.lineJoin = 'round';
  for (const s of [-1, 1]) { c.save(); c.translate(0, s * 4.8);
    c.strokeStyle = '#e9bf9c'; c.lineWidth = 2; c.beginPath(); for (let j = 0; j < 4; j++) { c.moveTo(4.5 + j * 1.7, s * 2); c.lineTo(5 + j * 2.1, s * 7.6); } c.stroke(); // parmaklar
    c.fillStyle = '#e9bf9c'; c.strokeStyle = '#a8765a'; c.lineWidth = .7; c.beginPath(); c.ellipse(6.5, 0, 4.4, 3.6, 0, 0, TAU_); c.fill(); c.stroke(); // avuç
    c.fillStyle = '#d6dae0'; c.strokeStyle = '#5a5e66'; c.lineWidth = .5;
    for (const [px, py, qx, qy] of [[-2.6, 3.8, 0, 7.4], [.6, 3.8, 1.6, 7.6], [-3.6, -1.5, -7, 0], [-2.6, -3.8, -1.4, -6.6]]) { c.beginPath(); c.moveTo(px - 1.2, s * py); c.lineTo(qx, s * qy); c.lineTo(px + 1.2, s * py); c.fill(); c.stroke(); } // dikenler
    c.fillStyle = '#1a1a20'; c.beginPath(); c.roundRect(-4, -3.9, 5.6, 7.8, 1.4); c.fill(); c.restore(); } // bileklik
  c.restore();
}
function chiTop(c, m) { // Kikoken: arkada dağılan sulu boya lekeleri, üst üste şeffaf katmanlar, dönen fırça yayları, açık çekirdek (ışıma yok)
  for (const [x, y, l, dx, dy, r, k] of m.iz) { const u = (m.l - l) / 28; if (u > 1) continue; c.globalAlpha = .34 * (1 - u); c.fillStyle = CHI[k]; c.beginPath(); c.arc(x + dx * u, y + dy * u, r * (1 + u * .5), 0, TAU_); c.fill(); }
  const t = m.l * .35;
  for (let i = 0; i < 6; i++) { const a = t + i * 1.05, r = 4 + (i % 2) * 3; c.globalAlpha = .33; c.fillStyle = CHI[i % 3]; c.beginPath(); c.arc(m.x + Math.cos(a) * r, m.y + Math.sin(a) * r, 13 - i * 1.1, 0, TAU_); c.fill(); }
  c.globalAlpha = .8; c.strokeStyle = '#e6efff'; c.lineCap = 'round'; for (const k of [0, 2.1, 4.2]) { c.lineWidth = 2.2; c.beginPath(); c.arc(m.x, m.y, 13, t * 1.6 + k, t * 1.6 + k + 1.3); c.stroke(); }
  c.globalAlpha = .5; c.lineWidth = 1; c.beginPath(); c.arc(m.x, m.y, 8, -t * 2, -t * 2 + 2.4); c.stroke();
  c.globalAlpha = .92; c.fillStyle = '#eef4ff'; c.beginPath(); c.arc(m.x, m.y, 5, 0, TAU_); c.fill(); c.globalAlpha = 1;
}function kickBulanik(c, s, a, yay, L, n) { // art arda tekmenin bulanıklığı: her karede farklı açıda titreşen bacaklar ve hız yayları
  const R = s.r - 2; for (let i = 0; i < n; i++) { const t = a + rnd(-yay, yay); bacakCiz(c, s.x + Math.cos(t) * R, s.y + Math.sin(t) * R, t, L * rnd(.85, 1.05), i ? .45 : 1); }
  c.save(); c.strokeStyle = '#cfe0ff'; c.globalAlpha = .35; c.lineWidth = 1.4; c.lineCap = 'round';
  for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(s.x, s.y, s.r + L - 8 + i * 6, a - yay - .1 + rnd(-.1, .1), a + yay + .1); c.stroke(); } c.restore();
}

// ---- Kaiser (Blue Lock, Bastard München): Isagi'yle aynı tek topu paylaşır (serbest top kime değerse onun). Efekt dili: mavi gül, altın taç, mavi-beyaz şimşek.
// Saç: tepesi açık sarı, göz hizasından uçlara maviye döner; ortadan ayrık perçemler, çene hizasında küt kesim, ensede ince at kuyruğu
const KAISER_SAC = [[-22, 19, .3, .04], [-28, 12, .3, .1], [-30.5, 0, .3], [-31, -10, .3], [-27, -20, .2], [-30, -25, .5, .02], [-20, -28, 0, .03], [-13, -33.5, .5, .05], [-6, -31, 0, .04],
  [4, -34, .3, .2], [16, -31, .3], [26, -22, .3], [30, -10, .3], [29.5, 3, .3], [26, 14.5, .4, .1], [22, 9, .2, .04], [19.5, -1, 0, .03], [16.5, 4, .2, .05], [15, -8, 0, .03], [12, -16, 0, .03], // sağda ayrık, şakakta yüzü çerçeveleyen tutam
  [6, -7.5, .25, .1], [0, -4.5, 0, .05], [-6, -9, 0, .02], [-7.5, -4.6, .2, .05], [-11, -8, 0, .02], [-15, 2, .2, .05], [-17, -3, 0, .02], [-19.5, 10, .2, .05], [-21, 2, 0, .03]]; // perçemler sola savrulur, sol gözün üstüne düşer
const KAISER_TEL = [[8, -30, 0, -22, -8, -12], [14, -28, 6, -18, -2, -8], [-4, -30, -12, -22, -16, -8], [20, -22, 24, -10, 25, 6], [-22, -18, -26, -6, -26, 8]];
const KAISER_GOZ = { iris: '#3f6fd8', koyu: '#0d1a4c', iri: 2.7, acik: .8, egim: .28, duz: .55, alt: .2, kalin: 1.45, kivrim: 2, parlak: .9, kirpik: '#1a1626' }; // yarı kapalı, kibirli
const KAISER_GOZ_OFKE = { iris: '#5f8cff', koyu: '#0a1238', iri: 2.3, acik: 1.1, egim: .42, duz: .3, kalin: 1.5, parlak: 0, kirpik: '#1a1626' }; // iri açılmış, deli bakış
const KAISER_SIM = ['#2f5cff', '#eef4ff'];
const kaiserSacRenk = (c, y0 = -35, y1 = 20) => { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#fdf7e6'); g.addColorStop(.45, '#f0e4bc'); g.addColorStop(.62, '#bfe0f4'); g.addColorStop(.8, '#6cbdf0'); g.addColorStop(1, '#3a96dc'); return g; }; // platin sarı → açık gök mavisi
// göz çevresindeki kırmızı çizgi: alt kapağın dış yarısı ve dış köşenin üstünde silik kırmızı gölge (goz() ile aynı ölçüler)
function kaiserKirmizi(c, x, y, s, g) { // kırmızı sürme: alt kirpik çizgisinin dış yarısına yapışık, dış köşede küçük kuyruk (goz()'ün alt kapak eğrisi)
  const w = 5.4, ox = x + s * w, oy = y + .2 - (g.egim || 0) * 1.6, ax = x + s * w * .05, ay = y + 4.6 - (g.alt || 0) * 3.6, ix = x - s * w * .85, iy = y + .8;
  c.save(); c.strokeStyle = '#d63446'; c.lineCap = c.lineJoin = 'round'; c.lineWidth = .75; c.globalAlpha = .9; c.beginPath();
  for (let i = 0; i <= 8; i++) { const t = i / 8 * .6, u = 1 - t; c.lineTo(u * u * ox + 2 * u * t * ax + t * t * ix, u * u * oy + 2 * u * t * ay + t * t * iy + .55); } c.stroke();
  c.beginPath(); c.moveTo(ox - s * .3, oy + .4); c.lineTo(ox + s * 1.3, oy - .3); c.stroke(); c.restore(); }
const kaiserCarpan = b => b.hafiza.ofke ? 1.15 : 1;
// gül yaprağı: damla/kalp biçimi; s boy
function gulYaprak(c, x, y, s, a, dolgu, kenar, al) {
  if (al <= 0) return; c.save(); c.translate(x, y); c.rotate(a); c.globalAlpha = Math.min(1, al);
  c.beginPath(); c.moveTo(0, s * .55); c.bezierCurveTo(-s * 1.1, -s * .1, -s * .55, -s * 1.05, 0, -s * .7); c.bezierCurveTo(s * .55, -s * 1.05, s * 1.1, -s * .1, 0, s * .55);
  c.fillStyle = dolgu; c.fill(); if (kenar) { c.strokeStyle = kenar; c.lineWidth = Math.max(.5, s * .12); c.stroke(); } c.restore();
}
// mavi gül: üç kat taç yaprağı, ortada sarmal; ac 0..1 açılma
function gul(c, x, y, r, a, al, ac = 1) {
  if (al <= 0 || r <= 0) return; c.save(); c.translate(x, y); c.rotate(a); c.globalAlpha = Math.min(1, al);
  for (const [n, f, d, k] of [[6, 1, '#142a86', '#060c34'], [5, .7, '#2f55c8', '#0c1c62'], [4, .45, '#6a94f0', '#1c3a96']]) {
    const R = r * f * (.35 + .65 * ac); c.fillStyle = d; c.strokeStyle = k; c.lineWidth = Math.max(.4, r * .05);
    for (let i = 0; i < n; i++) { const b = i * TAU_ / n + f * 2.2; c.beginPath(); c.arc(Math.cos(b) * R * .5, Math.sin(b) * R * .5, R * .55, 0, TAU_); c.fill(); c.stroke(); } }
  c.strokeStyle = '#cfe0ff'; c.lineWidth = Math.max(.4, r * .06); c.lineCap = 'round'; c.beginPath();
  for (let t = 0; t <= 9.4; t += .4) { const q = r * .26 * (.35 + .65 * ac) * t / 9.4; c.lineTo(Math.cos(t) * q, Math.sin(t) * q); } c.stroke();
  c.restore();
}
// altın taç: üç sivri, uçlarda inci, ortada anahtar deliği (Kaiser'in el dövmesi)
function tac(c, x, y, s, al, renk = '#ffc23d', kenar = '#5a3a08') {
  if (al <= 0) return; c.save(); c.translate(x, y); c.globalAlpha = Math.min(1, al); c.lineJoin = 'round';
  c.beginPath(); c.moveTo(-s, s * .5); c.lineTo(-s * 1.05, -s * .55); c.lineTo(-s * .5, -s * .05); c.lineTo(0, -s * .9); c.lineTo(s * .5, -s * .05); c.lineTo(s * 1.05, -s * .55); c.lineTo(s, s * .5); c.closePath();
  c.fillStyle = renk; c.fill(); c.strokeStyle = kenar; c.lineWidth = Math.max(.6, s * .1); c.stroke();
  c.fillStyle = kenar; c.beginPath(); c.arc(0, s * .05, s * .17, 0, TAU_); c.fill(); c.fillRect(-s * .07, s * .05, s * .14, s * .32);
  c.fillStyle = '#fff6d0'; for (const [px, py] of [[-1.05, -.55], [0, -.9], [1.05, -.55]]) { c.beginPath(); c.arc(px * s, py * s, s * .11, 0, TAU_); c.fill(); }
  c.restore();
}
// saçılan mavi gül yaprakları (vuruş efekti); a/yay verilirse o yöne savrulur
function gulSac(o, x, y, n, hiz, boy = 5, a = null, yay = TAU_) {
  if (o.sim) return;
  o.ekle({ x, y, omur: 50, p: Array.from({ length: n }, () => { const b = a == null ? rnd(0, TAU_) : a + rnd(-yay / 2, yay / 2), v = hiz * rnd(.35, 1); return { x, y, vx: Math.cos(b) * v, vy: Math.sin(b) * v, a: rnd(0, TAU_), va: rnd(-.25, .25), s: boy * rnd(.6, 1.3), k: rnd(0, 1) }; }),
    adim(m) { for (const q of m.p) { q.x += q.vx; q.y += q.vy; q.vx *= .94; q.vy = q.vy * .94 + .04; q.a += q.va; } },
    ciz(c, m) { const al = 1.3 * (1 - m.l / m.omur); for (const q of m.p) gulYaprak(c, q.x, q.y, q.s, q.a, q.k < .5 ? '#2f55c8' : q.k < .85 ? '#6a94f0' : '#dfe8ff', '#0a1648', al); } });
}
// Kaiser darbesi: mavi ışıma, altın şok halkası, dışa çakan mavi-beyaz şimşekler, darbenin üstünde yükselen taç
function kaiserPatla(o, x, y, g = 1) {
  if (o.sim) return;
  o.ekle({ x, y, g, omur: 26, sm: Array.from({ length: 7 }, () => [rnd(0, TAU_), rnd(.6, 1)]),
    ciz(c, m, o) { const u = m.l / m.omur, al = 1 - u, g = m.g;
      o.isik(c, m.x, m.y, 85 * g, '#3a6cff', .75 * al);
      halka(c, m.x, m.y, 10 + 56 * g * eo_(u), '#ffd86a', 4.5 * g * al + .5, al); halka(c, m.x, m.y, 6 + 32 * g * eo_(u * 1.3), '#cfe0ff', 2 * al, al);
      if (m.l < 12) for (const [a, k] of m.sm) simsek(c, m.x, m.y, m.x + Math.cos(a) * 72 * g * k, m.y + Math.sin(a) * 72 * g * k, al, 5, KAISER_SIM);
      tac(c, m.x, m.y - 28 * g - 18 * eo_(u), 9 * g, al * 1.4); } });
  o.parca(x, y, ['#ffd86a', '#fff', '#6a94f0'], 14, 5, 22, 2.2);
}
const kaiserKaynak = (o, n, guc = 1) => ({ futbol: true, x: n.x - n.vx * 2, y: n.y - n.vy * 2, renk: '#ffc23d', vurFx: (x, y, a, kr) => { const g = guc * (kr ? 1.4 : 1);
  vurusKaresi(o, x, y, g); kaiserPatla(o, x, y, g); gulSac(o, x, y, kr ? 18 : 12, kr ? 7 : 5.5, 5.5); } });
// uçan topun üstü: arkada savrulan gül yaprakları, topu saran şimşek çatırtısı
function kaiserIz(c, n, o) {
  const g = n.atis.guc || 1, P = n.iz;
  for (let i = 1; i < P.length; i += 2) { const f = i / P.length; gulYaprak(c, P[i][0] + Math.sin(i * 2.1) * 9 * g, P[i][1] + Math.cos(i * 1.7) * 9 * g, (3 + 3 * f) * g, i * 1.3 + o.t * .15, f < .5 ? '#2f55c8' : '#6a94f0', '#0a1648', f); }
  for (let j = 0; j < 2 + g; j++) { const a = rnd(0, TAU_), r = n.r + 3, L = r + 14 * g;
    simsek(c, n.x + Math.cos(a) * r, n.y + Math.sin(a) * r, n.x + Math.cos(a) * L + rnd(-6, 6), n.y + Math.sin(a) * L + rnd(-6, 6), .9, 3, KAISER_SIM); }
}
const kaiserAtis = (b, guc, ek) => ({ atan: b, guc, renk: '#ffb02e', renk2: '#6a94f0', ciz: kaiserIz, ...ek });
// şut anı: topun arkasında bir an açan dev mavi gül ve üstünde taç (sut() zaten hız çizgilerini ve donmayı yapar)
function kaiserSutAni(o, x, y, a, g = 1) {
  if (o.sim) return;
  o.ekle({ x, y, a, g, omur: 28, alt: true, ciz(c, m) { const u = m.l / m.omur, al = 1 - u, bx = m.x - Math.cos(m.a) * 16, by = m.y - Math.sin(m.a) * 16;
    o.isik(c, bx, by, 60 * m.g, '#2f55c8', .5 * al); gul(c, bx, by, (24 + 30 * eo_(u * 2)) * m.g, m.a + u, al, eo_(u * 3)); tac(c, m.x, m.y - 30 * m.g, 8 * m.g, al * 1.5); } });
}
const kaiserTopAyakta = (b, e, o) => { const t = futbol(o, b); t.sahip = b; t.x = b.x + b.r + t.r + 2; t.y = b.y; t.vx = t.vy = 0; t.atis = null; };
// Taç Eli: kırmızı kollu, taç dövmeli el; (x,y) avuç, a yönü
function tacEl(c, x, y, a, al) {
  if (al <= 0) return; c.save(); c.translate(x, y); c.rotate(a); c.globalAlpha = Math.min(1, al); c.lineJoin = 'round';
  c.fillStyle = '#8a1a26'; c.strokeStyle = '#3a060c'; c.lineWidth = 1; c.beginPath(); c.roundRect(-22, -5.5, 15, 11, 3); c.fill(); c.stroke(); // kol
  c.fillStyle = '#f5dfcb'; c.strokeStyle = '#b08870'; for (const [py, L] of [[-5.4, 7], [-1.8, 8.5], [1.8, 8], [5.2, 6]]) { c.beginPath(); c.roundRect(2, py - 1.6, L, 3.2, 1.6); c.fill(); c.stroke(); } // parmaklar
  c.beginPath(); c.ellipse(-1, 0, 7.5, 7, 0, 0, TAU_); c.fill(); c.stroke();
  tac(c, -1.5, .5, 3.2, 1, '#2f55c8', '#0a1648'); c.restore(); // mavi taç dövmesi
}

// ---- Makima (Chainsaw Man, Kontrol Şeytanı): koşmaz, uzaktan hükmeder. Efekt dili: gözündeki eş merkezli halkalar, siyah-kırmızı zincir, koyu kan. Neon yok.
// Saç: mercan kırmızısı, kaş üstünde küt perçem, çeneye inen ince sivri yan tutamlar; arkada sağ omza sarkan örgü (kafanın arkasında çizilir)
const MAKIMA_SAC = [[-17.5, 4, 0, .03], [-18, 13, 0, .03], [-20.5, 18.5, .3, .05], [-25, 8, .25], [-27.5, -4, .2], [-26, -16, .2], [-18, -26, .2], [-6, -31, .2], [6, -31, .2], [18, -26, .2], [26, -16, .2],
  [27.5, -4, .2], [25, 8, .25], [20.5, 18.5, .3, .05], [18, 13, 0, .03], [17.5, 4, 0, .03], [16, -5, 0, .03],
  [13, -4.5, .12, .02], [11, -7.5, 0, .02], [8, -5.5, .1, .02], [5, -7.8, 0, .02], [2, -4, .12, .02], [-1, -7.8, 0, .02], [-4, -5.8, .1, .02], [-7, -8, 0, .02], [-10, -5.6, .1, .02], [-13, -7.5, 0, .02], [-14.5, -4.2, .12, .02], [-16, -5, 0, .03]];
const MAKIMA_TEL = [[-3, -29, -4, -20, -4, -11], [7, -29, 8, -20, 8, -11], [-21, -16, -23, -4, -22, 10], [21, -16, 23, -4, 22, 10]];
const MAKIMA_GOZ = { iris: '#f4b23a', koyu: '#b5561a', iri: 3.3, acik: .92, egim: .05, duz: .45, alt: .1, kalin: 1.35, kivrim: 2, parlak: 0, kirpik: '#3a1c1c', halka: true }; // altın, eş merkezli halkalı, parıltısız
const makimaSacRenk = c => { const g = c.createLinearGradient(0, -32, 0, 18); g.addColorStop(0, '#ef6c54'); g.addColorStop(.55, '#e14b3b'); g.addColorStop(1, '#c53b2f'); return g; };
// Fujimoto tarzı: alt kapağın biraz altında, ona paralel nokta nokta çizgi (goz()'ün alt kapak eğrisi)
function makimaGozAlti(c, x, y, s, g) {
  const w = 5.4, ox = x + s * w, oy = y + .2 - (g.egim || 0) * 1.6, ax = x + s * w * .05, ay = y + 4.6 - (g.alt || 0) * 3.6, ix = x - s * w * .85, iy = y + .8;
  c.save(); c.fillStyle = '#a06a64'; c.globalAlpha = .9;
  for (let i = 0; i < 6; i++) { const t = .1 + i * .14, u = 1 - t; c.beginPath(); c.arc(u * u * ox + 2 * u * t * ax + t * t * ix, u * u * oy + 2 * u * t * ay + t * t * iy + 1.9, .34, 0, TAU_); c.fill(); }
  c.restore();
}
// Diz Çök'ün dev gözü: arenanın arkasında, gökyüzünden izler. Balık gözü merceği: ortası şişkin (halkalar merkeze göre büyük), kenarlar kararır.
// Tırtıklı koyu iris kenarı, iki koyu kızıl halka, ışınsal sarı çizgiler ve benekler, pembe tırtıklı halkalı kırmızı bebek, kıl kıl kirpikler. ac: kapak açıklığı, bx/by: bakış
function makimaDevGoz(c, o, ac, bx, by, al, P) {
  if (al <= 0) return; const cx = o.W / 2, cy = o.H * .46, w = o.W * .56, h = o.H * .5 * ac, R = o.H * .42, ix = cx + bx * w * .14, iy = cy + by * o.H * .06;
  const U = [[cx - w, cy + 6], [cx - w * .5, cy - h * 1.25], [cx + w * .5, cy - h * 1.25], [cx + w, cy - 4]], A = [[cx + w, cy - 4], [cx + w * .5, cy + h * 1.15], [cx - w * .5, cy + h * 1.15], [cx - w, cy + 6]];
  const bz = (Q, t) => { const u = 1 - t; return [0, 1].map(j => u * u * u * Q[0][j] + 3 * u * u * t * Q[1][j] + 3 * u * t * t * Q[2][j] + t * t * t * Q[3][j]); };
  const yol = () => { c.beginPath(); c.moveTo(...U[0]); c.bezierCurveTo(...U[1], ...U[2], ...U[3]); c.bezierCurveTo(...A[1], ...A[2], ...A[3]); c.closePath(); };
  const tirtik = (r, n, d, renk) => { c.beginPath(); for (let i = 0; i <= n * 2; i++) { const a = i * Math.PI / n, q = i % 2 ? r : r - d; c.lineTo(ix + Math.cos(a) * q, iy + Math.sin(a) * q); } c.closePath(); c.fillStyle = renk; c.fill(); };
  c.save(); c.globalAlpha = al;
  const dg = c.createRadialGradient(cx, cy, w * .25, cx, cy, w * 1.2); dg.addColorStop(0, 'rgba(120,52,50,.9)'); dg.addColorStop(.6, 'rgba(60,16,18,.95)'); dg.addColorStop(1, 'rgba(6,0,2,1)'); // kapak derisi, mercek kenarı kararır
  c.fillStyle = dg; c.fillRect(0, 0, o.W, o.H);
  c.strokeStyle = 'rgba(200,120,112,.35)'; c.lineWidth = 2; c.beginPath(); c.moveTo(U[0][0] + 20, U[0][1] - 14); c.bezierCurveTo(U[1][0], U[1][1] - 26, U[2][0], U[2][1] - 26, U[3][0] - 20, U[3][1] - 14); c.stroke(); // kapak kıvrımı
  yol(); c.save(); c.clip();
  const ak = c.createRadialGradient(cx, cy, R * .5, cx, cy, w); ak.addColorStop(0, '#eadfd6'); ak.addColorStop(1, '#7a6058'); c.fillStyle = ak; c.fillRect(cx - w, cy - o.H, w * 2, o.H * 2);
  c.fillStyle = '#1c0604'; c.beginPath(); c.arc(ix, iy, R, 0, TAU_); c.fill(); // en dış halka düz
  const ig = c.createRadialGradient(ix, iy, R * .1, ix, iy, R * .92); ig.addColorStop(0, '#ffd068'); ig.addColorStop(.55, '#f8a432'); ig.addColorStop(1, '#cf661c'); tirtik(R * .93, 80, R * .06, ig); // irisin dış çeperi dikenli, koyu halkanın dışı düz
  c.save(); c.beginPath(); c.arc(ix, iy, R * .9, 0, TAU_); c.clip(); const ug = c.createLinearGradient(0, iy - R * .9, 0, iy + R * .15); ug.addColorStop(0, 'rgba(110,30,6,.5)'); ug.addColorStop(1, 'rgba(110,30,6,0)'); c.fillStyle = ug; c.fillRect(ix - R, iy - R, R * 2, R * 1.15); c.restore(); // irisin üst yarısı kapağın gölgesinde
  const t = o.t || 0; c.strokeStyle = '#b0261c'; c.lineWidth = R * .006; c.lineCap = 'round'; c.globalAlpha = al * .85; // halkaların arasında düzenli örüntüde ince düz kızıl çizgiler, yavaşça döner
  for (let i = 0; i < 48; i++) { const a = i / 48 * TAU_ + t * .004, r0 = R * (i % 2 ? .6 : .57), r1 = R * (i % 2 ? .69 : .64); c.beginPath(); c.moveTo(ix + Math.cos(a) * r0, iy + Math.sin(a) * r0); c.lineTo(ix + Math.cos(a) * r1, iy + Math.sin(a) * r1); c.stroke(); }
  c.fillStyle = '#fff0a8'; P.sp.forEach(([a, f], i) => { const b = a - t * .006, r0 = R * f; c.globalAlpha = al * (.55 + .45 * Math.sin(t * .12 + i)); c.beginPath(); c.arc(ix + Math.cos(b) * r0, iy + Math.sin(b) * r0, R * .007, 0, TAU_); c.fill(); }); // iç halkada minik sarı benekler, ters yöne süzülüp parlar
  c.globalAlpha = al; c.strokeStyle = '#b0261c'; for (const [f, lw] of [[.8, .06], [.52, .045]]) { c.lineWidth = R * lw; c.beginPath(); for (let i = 0; i <= 140; i++) { const a = i / 140 * TAU_, q = R * f + (i % 2 ? 1.2 : -1.2); c.lineTo(ix + Math.cos(a) * q, iy + Math.sin(a) * q); } c.stroke(); } // iki koyu kızıl halka
  tirtik(R * .3, 30, R * .05, '#f0a4a0'); tirtik(R * .19, 26, R * .025, '#c4281f'); // pembe tırtıklı halka, tırtıklı kırmızı bebek
  const mv = c.createRadialGradient(cx, cy, w * .35, cx, cy, w * 1.02); mv.addColorStop(0, 'rgba(20,0,0,0)'); mv.addColorStop(1, 'rgba(20,0,0,.6)'); c.fillStyle = mv; c.fillRect(cx - w, cy - o.H, w * 2, o.H * 2); // mercek: kenarlara doğru bükülüp kararır
  const kg = c.createLinearGradient(0, cy - h * 1.1, 0, cy - h * .1); kg.addColorStop(0, 'rgba(40,8,8,.6)'); kg.addColorStop(1, 'rgba(40,8,8,0)'); c.fillStyle = kg; c.fillRect(cx - w, cy - h * 1.3, w * 2, h * 1.2); // üst kapağın gölgesi
  c.fillStyle = 'rgba(255,255,255,.13)'; c.beginPath(); c.ellipse(cx - w * .28, cy - h * .42, w * .26, h * .2, -.25, 0, TAU_); c.fill(); // merceğin parlaması
  c.restore();
  c.strokeStyle = '#24100e'; c.lineWidth = 3.4; c.beginPath(); c.moveTo(...U[0]); c.bezierCurveTo(...U[1], ...U[2], ...U[3]); c.stroke(); c.lineWidth = 1.6; c.beginPath(); c.moveTo(...A[0]); c.bezierCurveTo(...A[1], ...A[2], ...A[3]); c.stroke();
  c.lineCap = 'round'; for (const [t, L, altta, d] of P.kir) { const Q = altta ? A : U, [x, y] = bz(Q, .04 + t * .92), a = (altta ? Math.PI / 2 : -Math.PI / 2) + (t - .5) * (altta ? -1.6 : 1.6) + d, len = (altta ? 18 : 40) * L * (.5 + ac * .5); // kıl kıl kirpikler
    c.strokeStyle = altta ? 'rgba(110,62,56,.85)' : 'rgba(70,34,30,.95)'; c.lineWidth = altta ? 1.2 : 1.8; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a) * len * .6, y + Math.sin(a) * len * .6, x + Math.cos(a + d * 3) * len, y + Math.sin(a + d * 3) * len); c.stroke(); }
  c.restore();
}
// gözündeki eş merkezli halkalar: her skillin imzası
function halkalar(c, x, y, r, al, renk = '#f4b23a', koyu = '#7a1010', n = 3) {
  if (al <= 0 || r <= 0) return; c.save(); c.globalAlpha = Math.min(1, al);
  for (let i = 0; i < n; i++) { c.strokeStyle = i % 2 ? koyu : renk; c.lineWidth = Math.max(1.3, r * .06); c.beginPath(); c.arc(x, y, r * (1 - i / n), 0, TAU_); c.stroke(); }
  c.fillStyle = koyu; c.beginPath(); c.arc(x, y, Math.max(1.2, r * .08), 0, TAU_); c.fill(); c.restore();
}
// siyah-kırmızı zincir: (x0,y0)→(x1,y1), sark: ortası aşağı sarkar, boy: halka boyu
function zincir(c, x0, y0, x1, y1, al, sark = 0, boy = 5, kx, ky, renk = ['#c0302a', '#2a1414']) { // kx,ky verilirse eğrinin kontrol noktası (gövdenin etrafından dolandırmak için)
  if (al <= 0) return; const mx = kx ?? (x0 + x1) / 2, my = ky ?? (y0 + y1) / 2 + sark, L = Math.hypot(mx - x0, my - y0) + Math.hypot(x1 - mx, y1 - my), n = Math.max(2, L / (boy * 1.5) | 0);
  c.save(); c.globalAlpha = Math.min(1, al); c.lineWidth = Math.max(.8, boy * .3);
  for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t, x = u * u * x0 + 2 * u * t * mx + t * t * x1, y = u * u * y0 + 2 * u * t * my + t * t * y1,
      a = Math.atan2(2 * u * (my - y0) + 2 * t * (y1 - my), 2 * u * (mx - x0) + 2 * t * (x1 - mx));
    c.strokeStyle = renk[i % 2]; c.beginPath(); c.ellipse(x, y, boy * .8, i % 2 ? boy * .22 : boy * .42, a, 0, TAU_); c.stroke(); }
  c.restore();
}
// koyu kan sıçraması ve dışa açılan halkalar
function makimaFx(o, x, y, g = 1) {
  if (o.sim) return; kanSicrat(o, x, y, 7 + 5 * g | 0, 3.5 * g);
  o.ekle({ x, y, g, omur: 22, ciz(c, m) { const u = m.l / m.omur; halkalar(c, m.x, m.y, (10 + 30 * eo_(u)) * m.g, 1 - u); } });
}
const makimaKaynak = (o, x, y, g = 1, ek) => ({ x, y, renk: '#c0302a', vurFx: (px, py, a, kr) => makimaFx(o, px, py, g * (kr ? 1.4 : 1)), ...ek });
// parmak tabancası: beyaz gömlek kolu, işaret parmağı ileri, başparmak yukarı
function parmakEl(c, x, y, a, al) {
  if (al <= 0) return; c.save(); c.translate(x, y); c.rotate(a); c.globalAlpha = Math.min(1, al); c.lineJoin = 'round';
  c.fillStyle = '#f4f1ea'; c.strokeStyle = '#8a8680'; c.lineWidth = .8; c.beginPath(); c.roundRect(-16, -4.5, 12, 9, 2.5); c.fill(); c.stroke();
  c.fillStyle = '#f8e6dc'; c.strokeStyle = '#b8907e'; c.beginPath(); c.ellipse(-1.5, .5, 5, 4.2, 0, 0, TAU_); c.fill(); c.stroke();
  c.beginPath(); c.roundRect(1, -2.6, 9.5, 2.8, 1.4); c.fill(); c.stroke();
  c.beginPath(); c.roundRect(-2.5, -7.5, 2.6, 5.5, 1.3); c.fill(); c.stroke();
  c.restore();
}

// ---- YEAT: siyah fuzzy örgü maske, siyah gözlük, buzlu zincir. Palet: siyah, yeşil, elmas. Ritim: 150 BPM, vuruşlar beat'e iner
const YEAT_BEAT = 24, YEAT_ZINCIR = ['#e3eae7', '#6d7572'], YEAT_Y = ['#0b3d22', '#1f8f4e', '#39e87a', '#b6ffd2'], YEAT_ELMAS = ['#ffffff', '#e8fbff', '#9fe8ff', '#b6ffd2'];
const yeatBeat = (o, en) => { let d = YEAT_BEAT - (o.t % YEAT_BEAT); while (d < en) d += YEAT_BEAT; return d; }; // en az "en" tick sonra gelen ilk beat'e kaç tick var
const yeatK = (b, o) => o.t < (b.hafiza.rageT || 0) ? 1.2 : 1;
const YEAT_TUY = Array.from({ length: 58 }, (_, i) => { const a = i < 40 ? Math.PI * (.78 + i / 40 * 1.44) : Math.PI * (.2 + (i - 40) / 18 * .6); return [a + Math.sin(i * 7.3) * .06, 2 + (i * 37 % 13) / 2.4, i % 2 ? 1 : -1, i % 6 == 0, i * 2.3]; }); // maskenin kıvırcık iplikleri: çoğu üstte ve yanlarda
const YEAT_ADLIB = ['twizzy!', 'what?', 'geeked', 'luh geek', 'skrrt'];
function yeatVur(o, b, e, d, kaynak, kb, tur) { const v = o.vur(e, d * yeatK(b, o), kaynak, kb, tur), h = b.hafiza; if (v > 0 && !(o.t < (h.rageT || 0))) h.rage = Math.min(100, (h.rage || 0) + v * 6); return v; }
function elmas(c, x, y, s, a, al) { // dört yüzlü küçük elmas
  if (al <= 0) return; c.save(); c.translate(x, y); c.rotate(a); c.globalAlpha = Math.min(1, al);
  c.fillStyle = '#e8fbff'; c.beginPath(); c.moveTo(0, -s); c.lineTo(s * .7, -s * .2); c.lineTo(0, s); c.lineTo(-s * .7, -s * .2); c.closePath(); c.fill();
  c.fillStyle = '#9fe8ff'; c.beginPath(); c.moveTo(0, -s); c.lineTo(s * .7, -s * .2); c.lineTo(0, -s * .05); c.closePath(); c.fill();
  c.fillStyle = '#b6ffd2'; c.beginPath(); c.moveTo(-s * .7, -s * .2); c.lineTo(0, -s * .05); c.lineTo(0, s); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = Math.max(.4, s * .12); c.beginPath(); c.moveTo(-s * 1.3, -s * .2); c.lineTo(s * 1.3, -s * .2); c.moveTo(0, -s * 1.5); c.lineTo(0, s * 1.4); c.globalAlpha *= .55; c.stroke(); c.restore();
}
function parilti(c, x, y, s, al) { if (al <= 0) return; c.save(); c.globalAlpha = Math.min(1, al); c.fillStyle = '#fff'; c.beginPath(); // dört köşeli yıldız parıltısı
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? s * .22 : s; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.closePath(); c.fill(); c.restore(); }
// çan: tepede halka, omuz, genişleyen gövde, yeşil kenar şeridi, elmas taşlı kuşak, tokmak. (x,y) tepe halkası; s boy; a eğim; parla: yeşil ışıma
function yeatCan(c, x, y, s, a, al, parla = 0) {
  if (al <= 0) return; c.save(); c.translate(x, y); c.rotate(a); c.scale(s, s); c.globalAlpha = Math.min(1, al);
  if (parla > 0) { const g = c.createRadialGradient(0, .6, .1, 0, .6, 1.4); g.addColorStop(0, 'rgba(57,232,122,' + .38 * parla + ')'); g.addColorStop(1, 'rgba(57,232,122,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, .6, 1.4, 0, TAU_); c.fill(); }
  c.lineWidth = .07; c.strokeStyle = '#0a0c0b'; c.fillStyle = '#9aa29f'; c.beginPath(); c.ellipse(0, -.06, .14, .12, 0, 0, TAU_); c.fill(); c.stroke(); // tepe halkası
  const yol = () => { c.beginPath(); c.moveTo(-.2, .1); c.bezierCurveTo(-.46, .1, -.5, .45, -.52, .8); c.quadraticCurveTo(-.56, 1.02, -.74, 1.1); c.lineTo(.74, 1.1); c.quadraticCurveTo(.56, 1.02, .52, .8); c.bezierCurveTo(.5, .45, .46, .1, .2, .1); c.closePath(); };
  const g = c.createLinearGradient(-.7, 0, .7, 0); g.addColorStop(0, '#141716'); g.addColorStop(.32, '#8d9592'); g.addColorStop(.42, '#e9efec'); g.addColorStop(.56, '#4c5351'); g.addColorStop(1, '#101211');
  yol(); c.fillStyle = g; c.fill(); c.stroke();
  c.save(); yol(); c.clip(); c.fillStyle = '#1f8f4e'; c.fillRect(-.8, .96, 1.6, .1); c.fillStyle = 'rgba(57,232,122,.9)'; c.fillRect(-.8, .98, 1.6, .03); c.restore(); // yeşil kenar şeridi
  c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = .04; c.beginPath(); c.moveTo(-.4, .55); c.quadraticCurveTo(0, .62, .4, .55); c.stroke(); // gövde çizgisi
  c.fillStyle = '#0d0f0e'; c.beginPath(); c.ellipse(0, 1.1, .74, .1, 0, 0, TAU_); c.fill(); c.stroke(); // ağız
  c.fillStyle = '#c9d0cd'; c.beginPath(); c.arc(Math.sin(a * 3) * .12, 1.2, .1, 0, TAU_); c.fill(); c.stroke(); // tokmak
  c.restore();
  for (let i = -2; i <= 2; i++) { const t = i / 2.6, px = x + (t * .44 * Math.cos(a) - .42 * Math.sin(a)) * s, py = y + (t * .44 * Math.sin(a) + .42 * Math.cos(a)) * s; elmas(c, px, py, s * .055, a, al); } // elmas taşlı kuşak
}
// Tonka: oyuncak gibi abartılı dev siyah lüks kamyonet, yandan. Kocaman tekerlekler, elmaslı krom jantlar, yeşil alt ışık, füme camlar. (x,y) gövde ortası, dir +1 sağa gider
function yeatTonka(c, x, y, dir, al, t) {
  if (al <= 0) return; c.save(); c.translate(x, y); c.scale(dir, 1); c.globalAlpha = Math.min(1, al);
  const ug = c.createRadialGradient(0, 40, 4, 0, 40, 86); ug.addColorStop(0, 'rgba(57,232,122,.75)'); ug.addColorStop(1, 'rgba(57,232,122,0)'); c.fillStyle = ug; c.beginPath(); c.ellipse(0, 40, 86, 14, 0, 0, TAU_); c.fill(); // yeşil alt ışık
  c.strokeStyle = '#1a1c1b'; c.lineWidth = 4; c.beginPath(); c.moveTo(-42, 22); c.lineTo(-30, 8); c.moveTo(44, 22); c.lineTo(32, 8); c.stroke(); // yükseltilmiş süspansiyon
  const gv = c.createLinearGradient(0, -42, 0, 16); gv.addColorStop(0, '#3a3f3d'); gv.addColorStop(.35, '#0c0d0d'); gv.addColorStop(1, '#030303'); // parlak siyah boya
  c.fillStyle = gv; c.strokeStyle = '#000'; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(-68, -14); c.lineTo(-30, -14); c.lineTo(-26, -40); c.lineTo(30, -40); c.quadraticCurveTo(38, -40, 44, -16); c.lineTo(62, -12); c.quadraticCurveTo(70, -10, 70, -2); c.lineTo(70, 12); c.lineTo(-68, 12); c.closePath(); c.fill(); c.strokeStyle = 'rgba(57,232,122,.6)'; c.lineWidth = 1.3; c.stroke(); // kasa + kabin, siyah zeminde okunsun diye yeşil kenar ışığı
  c.fillStyle = '#0d2a1a'; c.beginPath(); c.moveTo(-21, -35); c.lineTo(4, -35); c.lineTo(4, -17); c.lineTo(-23, -17); c.closePath(); c.fill(); c.beginPath(); c.moveTo(9, -35); c.lineTo(28, -35); c.quadraticCurveTo(34, -35, 38, -17); c.lineTo(9, -17); c.closePath(); c.fill(); // füme camlar
  c.fillStyle = 'rgba(57,232,122,.45)'; c.beginPath(); c.moveTo(-16, -17); c.lineTo(-10, -35); c.lineTo(-6, -35); c.lineTo(-12, -17); c.fill(); c.beginPath(); c.moveTo(16, -17); c.lineTo(22, -35); c.lineTo(25, -35); c.lineTo(19, -17); c.fill(); // yeşil yansıma
  c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-66, -11); c.lineTo(-30, -11); c.moveTo(-24, -39); c.lineTo(28, -39); c.moveTo(46, -13); c.lineTo(62, -10); c.stroke(); // boya parlaması
  c.strokeStyle = '#2b2f2d'; c.lineWidth = 1; c.beginPath(); c.moveTo(6, -14); c.lineTo(6, 10); c.moveTo(-30, -14); c.lineTo(-30, 10); c.stroke(); // kapı ve kasa çizgileri
  c.fillStyle = '#cfd6d4'; c.fillRect(64, -6, 7, 14); c.fillStyle = '#7d8582'; for (let i = 0; i < 3; i++) c.fillRect(65, -4 + i * 4, 5, 1.4); // krom ızgara
  c.fillStyle = '#f0fff8'; c.beginPath(); c.ellipse(68, -8, 3, 2.4, 0, 0, TAU_); c.fill(); yeatFar(c, 70, -8, al); // far
  c.fillStyle = '#ff3b3b'; c.fillRect(-69, -12, 3, 6); // stop lambası
  for (const wx of [-42, 44]) { c.fillStyle = '#080808'; c.beginPath(); c.arc(wx, 22, 21, 0, TAU_); c.fill(); c.strokeStyle = '#4a514e'; c.lineWidth = 1.2; c.stroke(); c.strokeStyle = '#1e1e1e'; c.lineWidth = 3; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU_ + t * .6; c.beginPath(); c.arc(wx, 22, 19, a, a + .2); c.stroke(); } // tırtıklı dev lastik
    const jg = c.createRadialGradient(wx - 3, 19, 1, wx, 22, 12); jg.addColorStop(0, '#ffffff'); jg.addColorStop(.5, '#aab2af'); jg.addColorStop(1, '#4a514e'); c.fillStyle = jg; c.beginPath(); c.arc(wx, 22, 12, 0, TAU_); c.fill(); // krom jant
    c.strokeStyle = '#3a403d'; c.lineWidth = 2; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU_ + t * .6; c.beginPath(); c.moveTo(wx + Math.cos(a) * 4, 22 + Math.sin(a) * 4); c.lineTo(wx + Math.cos(a) * 11, 22 + Math.sin(a) * 11); c.stroke(); }
    elmas(c, wx, 22, 3.4, t * .6, al); } // jant göbeğinde elmas
  c.restore();
}
function yeatFar(c, x, y, al) { const g = c.createRadialGradient(x, y, 1, x, y, 26); g.addColorStop(0, 'rgba(240,255,248,' + .9 * al + ')'); g.addColorStop(1, 'rgba(240,255,248,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, 26, 0, TAU_); c.fill(); }
function yeatFx(o, x, y, g = 1) { // yeşil kıymıklar, elmas parıltıları, ses halkası
  if (o.sim) return; o.parca(x, y, ['#39e87a', '#b6ffd2', '#ffffff'], 6 + 5 * g | 0, 3.4 * g, 18, 1.8);
  o.ekle({ x, y, g, el: Array.from({ length: 4 + 2 * g | 0 }, () => [rnd(0, TAU_), rnd(8, 26) * g, rnd(1.6, 3)]), omur: 22, ciz(c, m) { const u = m.l / m.omur;
    halka(c, m.x, m.y, (6 + 26 * eo_(u)) * m.g, '#39e87a', 2.4 * (1 - u), 1 - u); halka(c, m.x, m.y, (4 + 16 * eo_(u)) * m.g, '#fff', 1.2 * (1 - u), 1 - u);
    for (const [a, r, s] of m.el) parilti(c, m.x + Math.cos(a) * r * eo_(u), m.y + Math.sin(a) * r * eo_(u), s * 2.2 * (1 - u), 1 - u); } });
}
const yeatKaynak = (o, x, y, g = 1, ek) => ({ x, y, renk: '#39e87a', vurFx: (px, py, a, kr) => yeatFx(o, px, py, g * (kr ? 1.4 : 1)), ...ek });
function yeatYazi(o, x, y, t, boy = 15) { if (o.sim) return; // ad-lib: glitch kaymalı eğik yazı, yukarı süzülür
  o.ekle({ x, y, t, boy, omur: 46, a: rnd(-.18, .18), ciz(c, m) { const u = m.l / m.omur, al = u < .1 ? u / .1 : 1 - Math.max(0, u - .6) / .4, j = m.l % 5 == 0 ? rnd(-2, 2) : 0;
    c.save(); c.translate(m.x, m.y - 18 * eo_(u)); c.rotate(m.a); c.font = 'italic 900 ' + m.boy + 'px "Arial Black", Impact, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.globalAlpha = al * .8; c.fillStyle = '#1f8f4e'; c.fillText(m.t, -2 + j, 1); c.fillStyle = '#ffffff'; c.globalAlpha = al * .5; c.fillText(m.t, 1.5 - j, -1);
    c.globalAlpha = al; c.lineWidth = 3; c.strokeStyle = '#000'; c.strokeText(m.t, 0, 0); c.fillStyle = '#b6ffd2'; c.fillText(m.t, 0, 0); c.restore(); } });
}
function glitchHayalet(c, x, y, r, al, t) { // RGB yerine yeşil-beyaz kaymalı, yatay dilimli bozuk top silueti
  if (al <= 0) return; c.save(); c.globalAlpha = Math.min(1, al) * .7;
  for (const [dx, renk] of [[-4, '#39e87a'], [3, '#ffffff'], [0, '#0b3d22']]) { c.strokeStyle = renk; c.lineWidth = 2; c.beginPath(); c.arc(x + dx, y, r, 0, TAU_); c.stroke(); }
  for (let i = 0; i < 5; i++) { const yy = y - r + ((i * 17 + t * 7) % (r * 2)), w = r * (.8 + ((i * 13 + t) % 7) / 6); c.fillStyle = i % 2 ? '#39e87a' : '#e8fbff'; c.globalAlpha = Math.min(1, al) * .55; c.fillRect(x - w / 2 + ((i * 29 + t * 3) % 11) - 5, yy, w, 2 + i % 3); }
  c.restore();
}

const KARAKTERLER = [
  {
    ad: 'GOJO', renk: '#5fd4ff', can: 105, guc: 1.07, hiz: 1, tip: 'menzilli', menzil: 300, ucar: false,
    gorunum(c, b, o, bx, by) {
      const fx = bx * 3, fy = by * 1.5, gozAcik = o.t < (b.hafiza.goz || 0);
      kafa(c, '#f7e1cf', () => { // yüksek yakalı siyah forma
        c.fillStyle = '#141a2e'; c.beginPath(); c.moveTo(-24, 13); c.quadraticCurveTo(0, 21, 24, 13); c.lineTo(24, 24); c.lineTo(-24, 24); c.fill();
        c.strokeStyle = '#2c3a63'; c.lineWidth = 1; c.beginPath(); c.moveTo(-24, 13); c.quadraticCurveTo(0, 21, 24, 13); c.stroke();
        yanak(c, fx, fy);
      });
      const aci = b.ez > 0;
      if (gozAcik) { // Sonsuz Boşluk'ta göz bağını çıkarır: altı göz
        if (aci) aciGoz(c, fx, fy); else for (const s of [-1, 1]) // iri, parlak Altı Göz; beyaz kirpik
          goz(c, s * 8.5 + fx, -.5 + fy, s, bx, by, { iris: '#7fd8ff', koyu: '#1d6fb8', iri: 2.9, kirpik: '#e8f0fa', acik: 1.05, egim: .1, parlak: 1.4 });
        sacCiz(c, GOJO_DUZ, o.t, '#f5f9ff', '#8fa9cc', 'rgba(120,150,200,.35)', GOJO_DUZ_TEL);
        if (!aci) for (const s of [-1, 1]) kas(c, s * 8.5 + fx, -9 + fy, s, -.2, '#dde6f4', 1.6); // beyaz, rahat kaşlar
      } else { // göz bağı, saçın dibini örter
        sacCiz(c, GOJO_DIK, o.t, '#f5f9ff', '#8fa9cc', 'rgba(120,150,200,.4)', GOJO_DIK_TEL);
        c.fillStyle = '#0c0c14'; c.beginPath(); c.moveTo(-25.5, -8 + fy); c.quadraticCurveTo(fx, -5 + fy, 25.5, -8 + fy); c.lineTo(25.5, 1.5 + fy); c.quadraticCurveTo(fx, 4.5 + fy, -25.5, 1.5 + fy); c.closePath(); c.fill();
        c.strokeStyle = '#2b2f45'; c.lineWidth = 1; c.beginPath(); c.moveTo(-23, -3.5 + fy); c.quadraticCurveTo(fx, -.5 + fy, 23, -3.5 + fy); c.stroke();
        if (aci) aciGoz(c, fx, fy, '#e8f2ff', -3); // göz bağının üstünde beyaz > <
      }
      if (aci) aciAgiz(c, fx, fy);
      else { c.strokeStyle = '#9b5656'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-3.5 + fx, 11 + fy); c.quadraticCurveTo(1 + fx, 13.8 + fy, 5 + fx, 9.8 + fy); c.stroke(); } // kendinden emin sırıtış
      if (b.hp < b.mx * .35) { c.fillStyle = '#9fdcff'; c.beginPath(); c.moveTo(18, -13); c.quadraticCurveTo(22, -7, 18, -5); c.quadraticCurveTo(14, -7, 18, -13); c.fill(); } // ter damlası
    },
    skiller: [
      { ad: 'Sonsuzluk', // pasif: 3 sn açık, 2 sn kapalı; açıkken yakın vuruşlar %70, futbol topu %50, Peely'nin mermileri %20 az (topun kendisine dokunmaz)
        pasif(b, e, o) { const h = b.hafiza; h.faz ??= Math.random() * 300 | 0; h.acik = (o.t + h.faz) % 300 < 180; },
        hasarAl(b, d, bilgi, o) {
          const top = bilgi.kaynak?.futbol; if (b.hafiza.acik && bilgi.kaynak?.mermi) return d * .8; if (!b.hafiza.acik || (bilgi.tur != 'yakin' && !top)) return d;
          const k = bilgi.kaynak, a = k ? yonu(b, k) : 0;
          o.parca(b.x + Math.cos(a) * (b.r + 8), b.y + Math.sin(a) * (b.r + 8), ['#bfefff', '#5fd4ff', '#fff'], 10, 3, 20, 2);
          o.ekle({ sahip: b, omur: 20, ciz(c, n) { halka(c, n.sahip.x, n.sahip.y, n.sahip.r + 8 + n.l * 1.6, '#bfefff', 2, 1 - n.l / 20); } });
          return d * (top ? .5 : .3);
        },
        ciz(c, b, o) {
          if (!b.hafiza.acik) return;
          c.save(); c.setLineDash([5, 9]); c.lineDashOffset = -o.t * .6;
          halka(c, b.x, b.y, b.r + 9, '#bfefff', 1.5, .45 + .15 * Math.sin(o.t * .1)); c.restore();
        } },

      { ad: 'Mavi', isabet: 'normal', bekleme: 220, ilk: 90, // çeken küre
        kullan(b, e, o) {
          const a = onden(b, e, 5, 20);
          o.ekle({ sahip: b, x: b.x + Math.cos(a) * 30, y: b.y + Math.sin(a) * 30, vx: Math.cos(a) * 5, vy: Math.sin(a) * 5, omur: 90,
            adim(m, o) {
              const e = o.rakip(m.sahip), d = uzak(m, e) || 1;
              if (!m.dur && (m.l >= 35 || d < 60 || duvarda(m, o, 20))) m.dur = 1;
              if (m.dur) {
                m.vx *= .85; m.vy *= .85;
                if (d < 150 && e.don <= 0) { const k = .15 + .55 * (1 - d / 150); e.vx += (m.x - e.x) / d * k; e.vy += (m.y - e.y) / d * k; }
                if (m.l % 12 == 0 && d < 70) o.vur(e, 2.2, m, 0, 'menzil');
              }
              if (!o.sim && m.l % 2 == 0) { const a = rnd(0, TAU_), r = rnd(50, 85);
                o.tane({ x: m.x + Math.cos(a) * r, y: m.y + Math.sin(a) * r, vx: -Math.cos(a - .5) * 3.2, vy: -Math.sin(a - .5) * 3.2, renk: Math.random() < .5 ? '#4aa8ff' : '#c8f0ff', m: 18, s: 2 }); }
              if (m.l == m.omur - 1) o.parca(m.x, m.y, ['#4aa8ff', '#c8f0ff', '#fff'], 26, 4, 30);
            },
            ciz(c, m, o) {
              const p = Math.min(1, m.l / 8) * Math.min(1, (m.omur - m.l) / 10), r = ((m.dur ? 15 : 10) + Math.sin(m.l * .4) * 1.5) * p;
              o.isik(c, m.x, m.y, r * 5, '#2a7bff', .55 * p);
              c.save(); c.translate(m.x, m.y); c.rotate(m.l * .25); c.globalCompositeOperation = 'lighter';
              for (let i = 0; i < 3; i++) { c.rotate(TAU_ / 3); c.globalAlpha = .7 * p; c.strokeStyle = '#7cc4ff'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, r * 1.7, 0, 1.3); c.stroke(); }
              c.restore();
              halka(c, m.x, m.y, r, '#4aa8ff', 3, p); c.globalAlpha = p; c.fillStyle = '#e6f6ff'; c.beginPath(); c.arc(m.x, m.y, r * .5, 0, TAU_); c.fill(); c.globalAlpha = 1;
            } });
        } },

      { ad: 'Kırmızı', isabet: 'normal', bekleme: 260, ilk: 150, kosul: (b, e) => uzak(b, e) < 230, // iten patlama
        kullan(b, e, o) {
          const a = onden(b, e, 8.5); b.vx -= Math.cos(a) * 2; b.vy -= Math.sin(a) * 2;
          o.ekle({ sahip: b, x: b.x + Math.cos(a) * 28, y: b.y + Math.sin(a) * 28, vx: Math.cos(a) * 8.5, vy: Math.sin(a) * 8.5, omur: 45, a,
            adim(m, o) {
              const e = o.rakip(m.sahip);
              if (m.p == null) {
                o.tane({ x: m.x, y: m.y, vx: rnd(-1, 1), vy: rnd(-1, 1), renk: '#ff3048', m: 14, s: 3 });
                if (uzak(m, e) < e.r + 12 || duvarda(m, o) || m.l >= m.omur - 1) {
                  m.p = m.l; m.vx = m.vy = 0; m.omur = m.l + 24;
                  if (uzak(m, e) < e.r + 75) o.vur(e, 8, m, 13, 'menzil');
                  if (duvarda(m, o, 90)) o.duvarVur(m.x, m.y, '#ff3048', 2);
                  o.sars(5); o.parca(m.x, m.y, ['#ff3048', '#ff9aa8', '#fff'], 40, 7, 32, 3);
                }
              }
            },
            ciz(c, m, o) {
              if (m.p == null) {
                o.isik(c, m.x, m.y, 50, '#ff2040', .7);
                c.save(); c.translate(m.x, m.y); c.rotate(m.l * .4); c.fillStyle = '#ff5a6e';
                for (let i = 0; i < 4; i++) { c.rotate(TAU_ / 4); c.beginPath(); c.moveTo(0, -3); c.lineTo(18, 0); c.lineTo(0, 3); c.fill(); }
                c.restore(); c.fillStyle = '#fff'; c.beginPath(); c.arc(m.x, m.y, 6, 0, TAU_); c.fill();
              } else {
                const k = (m.l - m.p) / 24;
                o.isik(c, m.x, m.y, 110 * (1 - k * .4), '#ff2040', .8 * (1 - k));
                halka(c, m.x, m.y, 15 + 75 * Math.pow(k, .5), '#ff9aa8', 4 * (1 - k) + 1, 1 - k);
              }
            } });
        } },

      { ad: 'Mor', isabet: 'nadir', bekleme: 720, ilk: 420, kosul: (b, e) => uzak(b, e) > 140, // mavi + kırmızı birleşir, yavaş ve çok güçlü
        kullan(b, e, o) {
          o.ekle({ sahip: b, x: b.x, y: b.y, omur: 340, sarj: 40, iz: [], a: yonu(b, e),
            adim(m, o) {
              const g = m.sahip, e = o.rakip(g);
              if (m.l <= m.sarj) {
                m.a = yonu(g, e); m.x = g.x + Math.cos(m.a) * 34; m.y = g.y + Math.sin(m.a) * 34;
                if (m.l == m.sarj) { m.vx = Math.cos(m.a) * 3.4; m.vy = Math.sin(m.a) * 3.4; o.sars(4); o.parca(m.x, m.y, ['#b45cff', '#e9d6ff', '#fff'], 30, 5, 30); }
                return;
              }
              m.iz.push([m.x, m.y]); if (m.iz.length > 34) m.iz.shift();
              if (!m.vurdu && uzak(m, e) < e.r + 22) { m.vurdu = 1; if (o.vur(e, 22, m, 9, 'menzil') > 0) vurusKaresi(o, e.x, e.y, 2); o.sars(9); o.parca(e.x, e.y, ['#b45cff', '#fff', '#7a2cff'], 50, 8, 40, 3); }
              if (!o.sim) { const a = rnd(0, TAU_); o.tane({ x: m.x + Math.cos(a) * 22, y: m.y + Math.sin(a) * 22, vx: Math.cos(a) * 1.5, vy: Math.sin(a) * 1.5, renk: Math.random() < .3 ? '#fff' : '#b45cff', m: 20, s: 2 }); }
              if (!m.yardi && duvarda(m, o, 8)) { m.yardi = 1; o.duvarVur(m.x, m.y, '#b45cff', 3); o.sars(5); o.parca(m.x, m.y, ['#b45cff', '#fff'], 30, 6, 40); }
              if (m.x < -40 || m.x > o.W + 40 || m.y < -40 || m.y > o.H + 40) m.olu = 1;
            },
            ciz(c, m, o) {
              if (m.l <= m.sarj) {
                const k = m.l / m.sarj, d = 26 * (1 - k) + 2, ay = k * TAU_ * 1.5, px = Math.cos(ay) * d, py = Math.sin(ay) * d;
                o.isik(c, m.x + px, m.y + py, 26, '#2a7bff', .9); o.isik(c, m.x - px, m.y - py, 26, '#ff2040', .9);
                c.fillStyle = '#fff'; c.beginPath(); c.arc(m.x + px, m.y + py, 4, 0, TAU_); c.arc(m.x - px, m.y - py, 4, 0, TAU_); c.fill();
                o.isik(c, m.x, m.y, 60 * k, '#9a3cff', k * .7);
                return;
              }
              c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
              for (let i = 1; i < m.iz.length; i++) { const f = i / m.iz.length; c.globalAlpha = f * .35; c.strokeStyle = '#7a2cff'; c.lineWidth = 40 * f;
                c.beginPath(); c.moveTo(m.iz[i - 1][0], m.iz[i - 1][1]); c.lineTo(m.iz[i][0], m.iz[i][1]); c.stroke(); }
              c.restore();
              const p = 1 + Math.sin(m.l * .3) * .06;
              o.isik(c, m.x, m.y, 80 * p, '#9a3cff', .8);
              halka(c, m.x, m.y, 22 * p, '#c88bff', 4, 1);
              c.fillStyle = '#efe2ff'; c.beginPath(); c.arc(m.x, m.y, 14 * p, 0, TAU_); c.fill();
            } });
        } },

      { ad: 'Sonsuz Boşluk', tek: true, ilk: 120, kosul: b => b.hp < b.mx * .4, // alan genişletme: rakip 1,5 sn donar, Mor hazırlanır
        kullan(b, e, o) {
          e.don = Math.max(e.don, 90); o.sars(6); b.hafiza.goz = o.t + 240; // göz bağını çıkarır
          const i = b.k.skiller.findIndex(s => s.ad == 'Mor'); if (i >= 0) b.bek[i] = Math.min(b.bek[i], 30);
          o.ekle({ alt: true, sahip: b, x: b.x, y: b.y, omur: 150,
            cizgi: Array.from({ length: 70 }, () => ({ a: rnd(0, TAU_), r: rnd(0, 600), s: rnd(2, 9) })),
            ciz(c, m, o) {
              const k = Math.min(1, m.l / 25), son = Math.min(1, (m.omur - m.l) / 30), R = Math.hypot(o.W, o.H) * k * k;
              c.save(); c.beginPath(); c.arc(m.x, m.y, R, 0, TAU_); c.clip();
              const g = c.createRadialGradient(m.x, m.y, 0, m.x, m.y, Math.max(1, R));
              g.addColorStop(0, 'rgba(70,140,230,' + .14 * son + ')'); g.addColorStop(1, 'rgba(10,20,70,' + .3 * son + ')');
              c.fillStyle = g; c.fillRect(0, 0, o.W, o.H);
              c.globalCompositeOperation = 'lighter'; c.strokeStyle = '#dff3ff'; c.lineWidth = 1.2;
              for (const y of m.cizgi) { const r = (y.r + m.l * y.s) % 700, ca = Math.cos(y.a), sa = Math.sin(y.a);
                c.globalAlpha = .55 * son * Math.min(1, r / 80); c.beginPath(); c.moveTo(m.x + ca * r, m.y + sa * r); c.lineTo(m.x + ca * (r + 10 + y.s * 4), m.y + sa * (r + 10 + y.s * 4)); c.stroke(); }
              c.restore();
              yazi(c, '無量空処', o.W / 2, o.H / 2, 96, '#cfeaff', .1 * son * k);
              halka(c, m.x, m.y, R, '#ffffff', 2, .7 * (1 - k) * son);
              if (k >= 1) { c.save(); c.globalAlpha = .5 * son * (.7 + .3 * Math.sin(m.l * .2)); c.strokeStyle = '#dff3ff'; c.lineWidth = 3; c.strokeRect(6, 6, o.W - 12, o.H - 12); c.restore(); }
            } });
        } },
    ],
  },

  {
    ad: 'SUKUNA', renk: '#ff2e4d', can: 100, hiz: 1.15, tip: 'yakin', ucar: false,
    gorunum(c, b, o, bx, by) {
      const fx = bx * 3, fy = by * 1.5, kirp = (o.t + (b.hafiza.faz ??= Math.random() * 240 | 0)) % 240 < 7;
      kafa(c, '#f5d3bf', () => { // beyaz kimono yakası
        c.fillStyle = '#f2eee6'; c.beginPath(); c.moveTo(-24, 12); c.lineTo(fx * .5, 24); c.lineTo(24, 12); c.lineTo(24, 24); c.lineTo(-24, 24); c.fill();
        c.strokeStyle = '#2a1a1a'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-15, 15); c.lineTo(fx * .5, 24); c.lineTo(15, 15); c.stroke();
        c.strokeStyle = '#1a0a0a'; c.lineWidth = 1.5; // yanak dövmeleri
        for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 20 + fx, 3 + fy); c.lineTo(s * 14 + fx, 7.5 + fy); c.moveTo(s * 21 + fx, 7 + fy); c.lineTo(s * 16 + fx, 10.5 + fy); c.stroke(); } // gözlerin altında aşağı inen iki çizgi
        c.fillStyle = '#4a2630'; // kısa, koyu yanlar
        for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 25, -17); c.lineTo(s * 17, -16); c.quadraticCurveTo(s * 16, -9, s * 19, -3); c.lineTo(s * 25, -1); c.fill(); }
      });
      for (const s of [-1, 1]) { // dört göz: üstte büyük, altta küçük
        const x = s * 8.5 + fx, y = -1.5 + fy;
        if (b.ez > 0) { if (s < 0) aciGoz(c, fx, fy, '#4a1422', -1.5); } // vurulunca üst gözler > <
        else if (kirp) { c.strokeStyle = '#4a1422'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x - 4.5, y); c.lineTo(x + 4.5, y); c.stroke(); }
        else { const G = { iris: '#a8122c', koyu: '#3a0008', iri: 2.05, acik: .9, egim: .9, duz: .2, alt: .25, kalin: 1.3 }; // küçük irisli, bol beyazlı zalim bakış
          goz(c, x, y, s, bx, by, G); goz(c, s * 9 + fx, 6 + fy, s, bx, by, { ...G, boy: .45, en: .6, alt: .2, acik: .8, kivrim: false, kalin: 1 }); } // altında ikinci, küçük göz çifti
      }
      // sivri dişli sırıtış
      c.fillStyle = '#3a0010'; c.beginPath(); c.moveTo(-7 + fx, 11.5 + fy); c.quadraticCurveTo(fx, 18.5 + fy, 7 + fx, 11.5 + fy); c.quadraticCurveTo(fx, 13.5 + fy, -7 + fx, 11.5 + fy); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.moveTo(-5.5 + fx, 12 + fy); for (let i = 0; i <= 5; i++) c.lineTo(-5.5 + i * 2.2 + fx, 12.6 + fy + (i % 2 ? 2 : 0)); c.lineTo(5.5 + fx, 12 + fy); c.closePath(); c.fill();
      sacCiz(c, SUKUNA_SAC, o.t, '#ff9ab8', '#b8496a', 'rgba(150,30,70,.3)', SUKUNA_TEL);
      c.strokeStyle = '#4a1422'; c.lineWidth = 2.2; // çatık kaşlar
      for (const s of [-1, 1]) kas(c, s * 8.5 + fx, -9 + fy, s, 1.7, '#4a1422', 2.2);
      c.strokeStyle = '#1a0a0a'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-3, -12.5); c.lineTo(0, -10); c.lineTo(3, -12.5); c.stroke(); // alın dövmesi
      if (b.hp < b.mx * .35) { c.strokeStyle = '#c4002a'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(6 + fx, 15 + fy); c.lineTo(7 + fx, 20 + fy); c.stroke(); } // ağız kenarından kan
    },
    skiller: [
      { ad: 'Kesme', isabet: 'guvenilir', bekleme: 52, ilk: 30, kosul: (b, e) => uzak(b, e) < 136, // görünmez kesik
        kullan(b, e, o) {
          sukunaUyum(b, 4.5, o.vur(e, 4.5, b, 3, 'yakin'));
          if (duvarda(e, o, 70)) o.duvarVur(e.x, e.y, '#ff8090', .9);
          o.ekle({ x: e.x, y: e.y, a: rnd(0, TAU_), omur: 14,
            ciz(c, m) { const k = m.l / m.omur, L = 120 * (.5 + k * .5);
              kesik(c, m.x + 3, m.y + 3, m.a, L, 4 * (1 - k) + .5, '#ff2e4d', (1 - k) * .8);
              kesik(c, m.x, m.y, m.a, L, 2.4 * (1 - k) + .4, '#fff', 1 - k); } });
          o.parca(e.x, e.y, ['#ff2e4d', '#fff'], 8, 4, 20, 2);
        } },

      { ad: 'Parçalama', isabet: 'guvenilir', bekleme: 160, ilk: 100, kosul: (b, e) => uzak(b, e) < b.r + e.r + 30, // canı az olana daha çok
        kullan(b, e, o) {
          const d = 5 + 9 * (1 - e.hp / e.mx); sukunaUyum(b, d, o.vur(e, d, b, 6, 'yakin')); o.sars(3);
          o.ekle({ x: e.x, y: e.y, a: rnd(0, TAU_), omur: 22,
            ciz(c, m) {
              for (let i = 0; i < 6; i++) { const t = m.l - i * 2; if (t < 0) continue; const k = t / (m.omur - 10); if (k > 1) continue;
                const a = m.a + (i % 2 ? Math.PI / 2 : 0), off = ((i >> 1) - 1) * 14, nx = -Math.sin(a) * off, ny = Math.cos(a) * off;
                kesik(c, m.x + nx, m.y + ny, a, 90, 3 * (1 - k) + .4, '#ff2e4d', (1 - k) * .7);
                kesik(c, m.x + nx, m.y + ny, a, 90, 1.6 * (1 - k) + .3, '#fff', 1 - k); }
            } });
          o.parca(e.x, e.y, ['#ff2e4d', '#ff8090', '#fff'], 18, 5, 26, 2.5);
        } },

      { ad: 'Ateş Oku', isabet: 'nadir', bekleme: 450, ilk: 300, kosul: (b, e) => uzak(b, e) > 200, // tek menzilli saldırısı
        kullan(b, e, o) {
          o.ekle({ sahip: b, x: b.x, y: b.y, omur: 150, sarj: 30, a: yonu(b, e),
            adim(m, o) {
              const s = m.sahip, e = o.rakip(s);
              if (m.l <= m.sarj) {
                m.x = s.x; m.y = s.y; m.a = yonu(s, e);
                if (!o.sim) { const a = rnd(0, TAU_); o.tane({ x: s.x + Math.cos(a) * 36, y: s.y + Math.sin(a) * 36, vx: -Math.cos(a) * 1.2, vy: -Math.sin(a) * 1.2 - .8, renk: Math.random() < .5 ? '#ff7a1a' : '#ffd23f', m: 22, s: 2.5 }); }
                if (m.l == m.sarj) { m.x += Math.cos(m.a) * 30; m.y += Math.sin(m.a) * 30; m.vx = Math.cos(m.a) * 10.5; m.vy = Math.sin(m.a) * 10.5; o.sars(3); }
                return;
              }
              if (m.p != null) return;
              o.tane({ x: m.x, y: m.y, vx: -m.vx * .1 + rnd(-.8, .8), vy: -m.vy * .1 + rnd(-.8, .8) - .4, renk: Math.random() < .5 ? '#ff7a1a' : '#ffd23f', m: 24, s: 3 });
              if (uzak(m, e) < e.r + 10 || duvarda(m, o) || m.l >= m.omur - 1) {
                m.p = m.l; m.vx = m.vy = 0; m.omur = m.l + 30;
                if (uzak(m, e) < e.r + 65) o.vur(e, 14, m, 8, 'menzil');
                if (duvarda(m, o, 80)) o.duvarVur(m.x, m.y, '#ff7a1a', 2.2);
                o.sars(7); o.parca(m.x, m.y, ['#ff7a1a', '#ffd23f', '#ff3b2f', '#fff'], 55, 7, 40, 3.5);
              }
            },
            ciz(c, m, o) {
              if (m.l <= m.sarj) {
                const k = m.l / m.sarj, s = m.sahip;
                c.save(); c.globalAlpha = k; c.strokeStyle = '#ffb02e'; c.lineWidth = 3; c.beginPath(); c.arc(s.x, s.y, 36, m.a - 1.1, m.a + 1.1); c.stroke();
                c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(s.x + Math.cos(m.a) * 10, s.y + Math.sin(m.a) * 10); c.lineTo(s.x + Math.cos(m.a) * (36 + 24 * k), s.y + Math.sin(m.a) * (36 + 24 * k)); c.stroke(); c.restore();
                o.isik(c, s.x, s.y, 70, '#ff7a1a', .5 * k);
              } else if (m.p == null) {
                o.isik(c, m.x, m.y, 55, '#ff7a1a', .8);
                c.save(); c.translate(m.x, m.y); c.rotate(m.a); c.fillStyle = '#ffd23f'; c.beginPath(); c.moveTo(16, 0); c.lineTo(-10, -6); c.lineTo(-24, 0); c.lineTo(-10, 6); c.fill();
                c.fillStyle = '#fff'; c.beginPath(); c.moveTo(12, 0); c.lineTo(-6, -2.5); c.lineTo(-14, 0); c.lineTo(-6, 2.5); c.fill(); c.restore();
              } else {
                const k = (m.l - m.p) / 30;
                o.isik(c, m.x, m.y, 100 * (1 - k * .3), '#ff5a1a', 1 - k);
                halka(c, m.x, m.y, 12 + 60 * Math.sqrt(k), '#ffd23f', 4 * (1 - k) + 1, 1 - k);
              }
            } });
        } },

      { ad: 'Dünyayı Kesen Kesik', isabet: 'normal', bekleme: 120, ilk: 0, kosul: b => (b.hafiza.uyum || 0) >= 16, // Sonsuzluk kesiklerini yeterince yutunca uyum sağlar: alanın kendisini keser, savunma tanımaz
        demo(b) { b.hafiza.uyum = 16; },
        kullan(b, e, o) { b.hafiza.uyum -= 16;
          o.ekle({ sahip: b, x: b.x, y: b.y, omur: 34, a: yonu(b, e),
            adim(m, o) { const s = m.sahip, e = o.rakip(s); m.x = s.x; m.y = s.y;
              if (m.l <= 14) m.a = yonu(s, { x: e.x + e.vx * 6, y: e.y + e.vy * 6 }); // nişan ateşten 6 tick önce kilitlenir: kaçan kurtulabilir
              if (m.l == 20) { const ca = Math.cos(m.a), sa = Math.sin(m.a), L = Math.min(ca > 0 ? (o.W - s.x) / ca : ca < 0 ? -s.x / ca : 1e9, sa > 0 ? (o.H - s.y) / sa : sa < 0 ? -s.y / sa : 1e9);
                m.x1 = s.x + ca * L; m.y1 = s.y + sa * L; m.x0 = s.x; m.y0 = s.y; o.sars(7); o.duvarVur(m.x1, m.y1, '#ff2e4d', 3);
                const dx = e.x - s.x, dy = e.y - s.y, on = dx * ca + dy * sa;
                if (on > 0 && on < L + e.r && Math.abs(dx * sa - dy * ca) < e.r + 8) { if (o.vur(e, 10, { x: s.x, y: s.y, renk: '#ff2e4d', yoksay: true, kesin: true }, 8, 'yakin') > 0) vurusKaresi(o, e.x, e.y, 1.6); } } },
            ciz(c, m, o) {
              if (m.l < 20) { c.save(); c.setLineDash([4, 6]); c.strokeStyle = '#ff8090'; c.lineWidth = 1; c.globalAlpha = .15 + .25 * m.l / 20;
                c.beginPath(); c.moveTo(m.x, m.y); c.lineTo(m.x + Math.cos(m.a) * 700, m.y + Math.sin(m.a) * 700); c.stroke(); c.restore(); return; } // ince nişan çizgisi
              const k = (m.l - 20) / 14; c.save(); c.beginPath(); c.rect(6, 6, o.W - 12, o.H - 12); c.clip();
              yazi(c, '斬', o.W / 2, o.H / 2, 140, '#ff2e4d', .12 * (1 - k));
              const ux = m.x1 - m.x0, uy = m.y1 - m.y0, n = Math.hypot(ux, uy) || 1, nx = -uy / n * 3 * k, ny = ux / n * 3 * k; // alan iki yana ayrılıp kapanır
              for (const [w, renk, al] of [[5 * (1 - k) + 1, '#ff2e4d', .8], [2 * (1 - k) + .5, '#fff', 1]]) { c.globalAlpha = al * (1 - k); c.strokeStyle = renk; c.lineWidth = w;
                c.beginPath(); c.moveTo(m.x0 + nx, m.y0 + ny); c.lineTo(m.x1 + nx, m.y1 + ny); c.moveTo(m.x0 - nx, m.y0 - ny); c.lineTo(m.x1 - nx, m.y1 - ny); c.stroke(); }
              c.restore(); } });
        } },

      { ad: 'Ters Lanet', tek: true, kosul: b => b.hp < b.mx * .3, // bir kez, 1 sn içinde +25 can
        kullan(b, e, o) {
          o.sayi(b, 25, 2);
          o.ekle({ sahip: b, x: b.x, y: b.y, omur: 60,
            adim(m, o) { const s = m.sahip; m.x = s.x; m.y = s.y; if (s.hp <= 0 || o.bitti) { m.olu = 1; return; } s.hp = Math.min(s.mx, s.hp + 25 / 60);
              if (!o.sim) o.tane({ x: s.x + rnd(-20, 20), y: s.y + rnd(-10, 20), vy: -rnd(1, 2.5), renk: Math.random() < .5 ? '#fff5d0' : '#ffe08a', m: 30, s: 2 }); },
            ciz(c, m, o) { const k = m.l / m.omur; o.isik(c, m.x, m.y, 75, '#ffe9a8', .45 * (1 - k)); halka(c, m.x, m.y, m.sahip.r + 6 + 10 * k, '#fff5d0', 2, 1 - k); } });
        } },

      { ad: 'Kötücül Türbe', tek: true, kosul: (b, e) => b.hp < b.mx * .5 && uzak(b, e) < 220, // alan genişletme: içerideki her şey kesilir, Sonsuzluk işe yaramaz
        kullan(b, e, o) {
          o.sars(6);
          o.ekle({ alt: true, sahip: b, x: b.x, y: b.y, sx: b.x, sy: Math.max(115, b.y), omur: 165, R: 130, kes: [], acilis: 30,
            adim(m, o) {
              const s = m.sahip, e = o.rakip(s); m.x = s.x; m.y = s.y; if (s.hp <= 0) { m.olu = 1; return; }
              if (m.l == m.acilis) o.sars(5);
              if (m.l > m.acilis + 15 && m.l % 6 == 0 && uzak(m, e) < m.R + e.r) { o.vur(e, 1.6, s, .6, 'alan'); m.kes.push({ x: e.x + rnd(-12, 12), y: e.y + rnd(-12, 12), a: rnd(0, TAU_), l: 0, b: 1 }); }
              if (!o.sim && m.l > m.acilis + 10) for (let i = 0; i < 2; i++) { const a = rnd(0, TAU_), r = Math.sqrt(Math.random()) * m.R; m.kes.push({ x: m.x + Math.cos(a) * r, y: m.y + Math.sin(a) * r, a: rnd(0, TAU_), l: 0 }); }
              if (m.l > m.acilis && m.l % 4 == 0) { const a = rnd(0, TAU_), x = m.x + Math.cos(a) * m.R, y = m.y + Math.sin(a) * m.R; if (duvarda({ x, y }, o, 6)) o.duvarVur(x, y, '#ff8090', .8); }
              for (const k of m.kes) k.l++; m.kes = m.kes.filter(k => k.l < 10);
            },
            ciz(c, m, o) {
              const son = Math.min(1, (m.omur - m.l) / 20);
              turbe(c, m.sx, m.sy, Math.min(1, m.l / 18), Math.max(0, Math.min(1, (m.l - 16) / 14)), son, m.l);
              const k = Math.max(0, Math.min(1, (m.l - m.acilis) / 15)), R = m.R * (1 - Math.pow(1 - k, 3));
              if (R <= 0) return;
              const g = c.createRadialGradient(m.x, m.y, 0, m.x, m.y, Math.max(1, R));
              g.addColorStop(0, 'rgba(120,0,20,' + .45 * son + ')'); g.addColorStop(1, 'rgba(255,30,60,' + .18 * son + ')');
              c.fillStyle = g; c.beginPath(); c.arc(m.x, m.y, R, 0, TAU_); c.fill();
              halka(c, m.x, m.y, R, '#ff2e4d', 2, .8 * son);
              c.save(); c.setLineDash([2, 10]); c.lineDashOffset = m.l; halka(c, m.x, m.y, R * .8, '#ff8090', 1, .5 * son); c.restore();
              yazi(c, '伏魔御廚子', m.x, m.y, 30, '#ff8090', .16 * son * k);
              for (const q of m.kes) { const f = 1 - q.l / 10; kesik(c, q.x, q.y, q.a, q.b ? 70 : 44, q.b ? 2.2 : 1.2, q.b ? '#fff' : '#ffb0bc', f * son * (q.b ? 1 : .6)); }
            } });
        } },
    ],
  },

  {
    ad: 'CHOSO', renk: '#b44dff', can: 100, guc: 1.05, hiz: 1, tip: 'menzilli', menzil: 240, ucar: false,
    gorunum(c, b, o, bx, by) {
      const fx = bx * 3, fy = by * 1.5, akis = o.t < (b.hafiza.akis || 0), SAC = '#1f1926', KEN = '#4a3a5e';
      sacCiz(c, CHOSO_KUYRUK, o.t, SAC, KEN, 'rgba(0,0,0,.3)'); sacCiz(c, CHOSO_KUYRUK_SAG, o.t, SAC, KEN, 'rgba(0,0,0,.3)');
      kafa(c, '#f2dfd2', () => {
        c.fillStyle = '#2a2030'; c.beginPath(); c.moveTo(-24, 15); c.quadraticCurveTo(0, 21, 24, 15); c.lineTo(24, 24); c.lineTo(-24, 24); c.fill(); // koyu üst
        c.fillStyle = '#ddd2c4'; c.beginPath(); c.moveTo(-7, 18.5); c.lineTo(fx * .4, 24); c.lineTo(7, 18.5); c.fill(); // açık yaka
        // dövme: burun köprüsünden göz altlarına uzanan ince, uçları sivrilen koyu çizgi
        c.fillStyle = '#2a1830'; c.beginPath(); c.moveTo(-16 + fx, 5.4 + fy); c.quadraticCurveTo(fx, 3.4 + fy, 16 + fx, 5.4 + fy); c.quadraticCurveTo(fx, 6.4 + fy, -16 + fx, 5.4 + fy); c.fill();
        if (akis) { c.strokeStyle = '#8c0616'; c.lineWidth = 1.1; // Kızıl Pul: yanaklarda kabaran kan damarları
          for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 15 + fx, 7.5 + fy); c.lineTo(s * 18 + fx, 10.5 + fy); c.lineTo(s * 16.5 + fx, 14 + fy); c.moveTo(s * 18 + fx, 10.5 + fy); c.lineTo(s * 21.5 + fx, 11.5 + fy); c.moveTo(s * 13 + fx, -5 + fy); c.lineTo(s * 16 + fx, -8 + fy); c.stroke(); } }
      });
      if (b.ez > 0) { aciGoz(c, fx, fy, '#2a1420', -1.5); aciAgiz(c, fx, fy); } else {
        for (const s of [-1, 1]) { // ağır kapaklı, dış köşesi düşük, ışıksız yorgun gözler ve belirgin göz altları; Kızıl Pul'da iris kızarır
          const x = s * 8.5 + fx, y = -1 + fy;
          goz(c, x, y, s, bx, by, { iris: akis ? '#b8101f' : '#6e2a34', koyu: '#1a0608', kirpik: '#1e1018', acik: .5, egim: -.7, duz: .85, parlak: .6, kivrim: 2, torba: true });
          kas(c, x, y - 6.2, s, -1.1, '#2a1820', 1.3); // ince, hüzünlü kaş
        }
        c.strokeStyle = '#7a3e3e'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(-3 + fx, 12.6 + fy); c.quadraticCurveTo(fx, 11.6 + fy, 3 + fx, 12.6 + fy); c.stroke(); // ifadesiz, ucu düşük ağız
      }
      sacCiz(c, CHOSO_SAC, o.t, SAC, KEN, 'rgba(0,0,0,.35)', CHOSO_TEL);
      if (b.hp < b.mx * .35 && b.ez <= 0) { c.fillStyle = '#1e1018'; for (const s of [-1, 1]) { const x = s * 7 + fx; // can azalınca gözlerin altından dövmeyi kesip inen koyu çizgiler
        c.beginPath(); c.moveTo(x - 1, 1.6 + fy); c.lineTo(x + 1, 1.6 + fy); c.quadraticCurveTo(x + .6, 7 + fy, x + s * .4, 12 + fy); c.quadraticCurveTo(x - .4, 7 + fy, x - 1, 1.6 + fy); c.fill(); } }
    },
    skiller: [
      { ad: 'Delici Kan', isabet: 'nadir', bekleme: 360, ilk: 120, kosul: (b, e) => uzak(b, e) > 90, // yarım sn sıkıştırır, duvara kadar giden ışın; nişanı ateşten 7 tick önce kilitler, hareket eden kaçabilir
        kullan(b, e, o) {
          o.ekle({ sahip: b, x: b.x, y: b.y, omur: 31, a: yonu(b, e),
            adim(m, o) { const s = m.sahip; if (m.l < 23) m.a = yonu(s, o.rakip(s)); m.x = s.x + Math.cos(m.a) * 30; m.y = s.y + Math.sin(m.a) * 30;
              if (m.l == 30 && s.hp > 0 && s.don <= 0) delici(o, s, m.a, 13 * kanKat(s, o), 7, 7); },
            ciz(c, m, o) { kanKure(c, o, m.x, m.y, m.l / 30, m.l); } });
        } },

      { ad: 'Kızıl Pul Akışı', bekleme: 600, ilk: 200, // 4 sn hızlanır ve daha çok vurur
        kullan(b, e, o) { b.hafiza.akis = o.t + 240; kanSicrat(o, b.x, b.y, 14, 3); },
        pasif(b, e, o) { b.hizx = o.t < (b.hafiza.akis || 0) ? 1.4 : 1;
          if (b.hizx > 1 && o.t % 9 == 0) kanSicrat(o, b.x + rnd(-10, 10), b.y + rnd(-6, 12), 2, 1.2, Math.PI / 2, 1); }, // hızlanırken kan damlatır
        ciz(c, b, o) { if (o.t >= (b.hafiza.akis || 0)) return; // vücudu saran ince kan zarı: koyu, nabız gibi atar
          halka(c, b.x, b.y, b.r + 3.5 + Math.max(0, Math.sin(o.t * .22)) * 2, '#9a0a1a', 3, .85); halka(c, b.x, b.y, b.r + 3.5, '#d8283a', 1, .7); } },

      { ad: 'Süpernova', isabet: 'normal', bekleme: 300, ilk: 160, kosul: (b, e) => uzak(b, e) < 320, // dört kan küresi döner, sonra rakibe atılıp patlar
        kullan(b, e, o) {
          for (let i = 0; i < 4; i++) o.ekle({ sahip: b, x: b.x, y: b.y, omur: 120, i, git: 36 + i * 7,
            adim(m, o) { const s = m.sahip, e = o.rakip(s);
              if (m.p != null) return;
              if (m.l < m.git) { const a = m.i * TAU_ / 4 + m.l * .15; m.x = s.x + Math.cos(a) * 36; m.y = s.y + Math.sin(a) * 36; m.vx = m.vy = 0; return; }
              if (m.l == m.git) { const a = onden(m, e, 7.5); m.vx = Math.cos(a) * 7.5; m.vy = Math.sin(a) * 7.5; }
              if (m.l > m.git) { (m.iz ??= []).push([m.x, m.y]); if (m.iz.length > 6) m.iz.shift(); }
              if (uzak(m, e) < e.r + 10 || duvarda(m, o) || m.l >= m.omur - 1) {
                m.p = m.l; m.vx = m.vy = 0; m.omur = m.l + 14;
                if (uzak(m, e) < e.r + 40) o.vur(e, 4 * kanKat(s, o), kanKaynak(o, m.x, m.y), 3, 'alan');
                kanSicrat(o, m.x, m.y, 12, 4); if (duvarda(m, o, 12)) kanLeke(o, m.x, m.y, 6);
              } },
            ciz(c, m, o) {
              if (m.p == null) { for (const [i, [x, y]] of (m.iz || []).entries()) { c.fillStyle = KAN[1]; c.globalAlpha = .7; c.beginPath(); c.arc(x, y, 1 + i * .5, 0, TAU_); c.fill(); } c.globalAlpha = 1; // arkasında damla izi
                kanTop(c, m.x, m.y, 5.5, m.l + m.i * 3); }
              else { const k = (m.l - m.p) / 14; c.globalAlpha = 1 - k; kanTop(c, m.x, m.y, 5.5 + 9 * Math.sqrt(k), m.l); c.globalAlpha = 1; } // patlarken yayılıp söner
            } });
        } },

      { ad: 'Kesici Kan', isabet: 'guvenilir', bekleme: 125, ilk: 60, kosul: (b, e, o) => uzak(b, e) < b.r + e.r + 60 || o.nes.some(n => n.kopek && n.p == null && uzak(n, b) < 70), // yaklaşanı iki kan kırbacıyla geri iter; üstüne gelen gölge köpeklerini de keser
        kullan(b, e, o) {
          const kp = o.nes.filter(n => n.kopek && n.p == null && uzak(n, b) < 90), yakin = uzak(b, e) < b.r + e.r + 60, hd = yakin ? e : kp[0], a = yonu(b, hd);
          for (const n of kp) { n.p = n.l; n.omur = n.l + 12; if (!o.sim) kanSicrat(o, n.x, n.y, 8, 3); } // kesilen köpek gölgesine geri batar
          if (yakin) { o.vur(e, 5 * kanKat(b, o), kanKaynak(o, b.x, b.y), 9, 'yakin'); b.vx -= Math.cos(a) * 2; b.vy -= Math.sin(a) * 2; }
          o.ekle({ sahip: b, omur: 14, a, d: uzak(b, hd),
            ciz(c, m, o) { const s = m.sahip, k = m.l / m.omur, u = Math.min(1, m.l / 4); // kırbaç önce uzanır, sonra incelip söner
              c.save(); c.lineCap = 'round';
              for (const y of [-1, 1]) { const L = (m.d + 10) * u, ex = s.x + Math.cos(m.a) * L, ey = s.y + Math.sin(m.a) * L, nx = -Math.sin(m.a) * 36 * y * u, ny = Math.cos(m.a) * 36 * y * u;
                c.beginPath(); c.moveTo(s.x, s.y); c.quadraticCurveTo((s.x + ex) / 2 + nx, (s.y + ey) / 2 + ny, ex, ey);
                c.globalAlpha = 1 - k * k; c.strokeStyle = '#5a000c'; c.lineWidth = 5.5 * (1 - k) + 1; c.stroke();
                c.strokeStyle = '#b8101f'; c.lineWidth = 3.5 * (1 - k) + .6; c.stroke();
                c.strokeStyle = 'rgba(255,150,160,.45)'; c.lineWidth = .8; c.stroke(); }
              c.restore(); } });
        } },

      { ad: 'Kızıl Bağlama', tek: true, ilk: 120, kosul: b => b.hp < b.mx * .4, // kan ipleri rakibi bağlar, ardından tam güç Delici Kan
        kullan(b, e, o) {
          e.don = Math.max(e.don, 75); o.sars(5);
          o.ekle({ alt: true, sahip: b, x: b.x, y: b.y, omur: 120, atis: 60,
            ipler: Array.from({ length: 5 }, (_, i) => { const u = rnd(0, 1), k = i % 4; return k == 0 ? [u * o.W, 6] : k == 1 ? [o.W - 6, u * o.H] : k == 2 ? [u * o.W, o.H - 6] : [6, u * o.H]; }),
            adim(m, o) { const s = m.sahip; m.x = s.x; m.y = s.y; if (s.hp <= 0) { m.olu = 1; return; }
              if (m.l == m.atis) delici(o, s, yonu(s, o.rakip(s)), 22 * kanKat(s, o), 11, 14); },
            ciz(c, m, o) {
              const s = m.sahip, e = o.rakip(s), son = Math.min(1, (m.omur - m.l) / 25), k = Math.min(1, m.l / 20);
              c.save(); c.beginPath(); c.rect(6, 6, o.W - 12, o.H - 12); c.clip();
              const g = c.createRadialGradient(e.x, e.y, 0, e.x, e.y, Math.max(o.W, o.H)); g.addColorStop(0, 'rgba(60,0,10,' + .3 * son * k + ')'); g.addColorStop(1, 'rgba(20,0,4,' + .6 * son * k + ')');
              c.fillStyle = g; c.fillRect(0, 0, o.W, o.H);
              yazi(c, '赤血操術', o.W / 2, o.H / 2, 84, '#a00a1a', .25 * son * k);
              if (m.l < m.atis + 10) { c.lineCap = 'round'; // kan ipleri duvardan rakibe uzanır, rakibe dolanır
                for (const [x, y] of m.ipler) { const u = Math.min(1, m.l / 14), tx = x + (e.x - x) * u, ty = y + (e.y - y) * u, sal = Math.sin(m.l * .5 + x) * 6 * (1 - u * .7);
                  c.globalAlpha = son; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo((x + tx) / 2 + sal, (y + ty) / 2 - sal, tx, ty);
                  c.strokeStyle = '#5a000c'; c.lineWidth = 4.5; c.stroke(); c.strokeStyle = '#b8101f'; c.lineWidth = 2.6; c.stroke(); c.strokeStyle = 'rgba(255,150,160,.4)'; c.lineWidth = .7; c.stroke(); }
                if (m.l > 14 && e.don > 0) for (let i = 0; i < 3; i++) { c.save(); c.translate(e.x, e.y); c.rotate(i * 1.05 + .3); c.strokeStyle = '#a00a1a'; c.lineWidth = 3; c.globalAlpha = son;
                  c.beginPath(); c.ellipse(0, 0, e.r + 3, (e.r + 3) * .35, 0, 0, TAU_); c.stroke(); c.restore(); } }
              c.restore();
              if (m.l < m.atis) { const a = yonu(s, e); kanKure(c, o, s.x + Math.cos(a) * 30, s.y + Math.sin(a) * 30, m.l / m.atis, m.l); }
            } });
        } },
    ],
  },

  {
    ad: 'TOJI', renk: '#c8ff3a', can: 105, guc: .94, hiz: 1.3, tip: 'yakin', ucar: false, donDirenc: 1,
    gorunum(c, b, o, bx, by) {
      const fx = bx * 3, fy = by * 1.5;
      kafa(c, '#e6c2a4', () => {
        c.fillStyle = '#141418'; c.beginPath(); c.moveTo(-24, 17); c.quadraticCurveTo(0, 23, 24, 17); c.lineTo(24, 24); c.lineTo(-24, 24); c.fill(); // siyah dar tişört
        c.lineWidth = 1; c.strokeStyle = '#2c1636'; // boynuna dolanmış mor lanet solucanı (silah deposu)
        for (let i = 0; i < 12; i++) { const x = -24 + i * 4.4, y = 21 + Math.sin(i * .9 + o.t * .05) * 1 + (x * x) * .003;
          c.fillStyle = i % 2 ? '#6e3f80' : '#5a3168'; c.beginPath(); c.ellipse(x, y, 2.7, 3, 0, 0, TAU_); c.fill(); c.stroke(); }
        c.fillStyle = '#7a4a8c'; c.beginPath(); c.ellipse(19, 17.5, 3.2, 2.6, -.4, 0, TAU_); c.fill(); c.stroke(); // solucanın kafası
        c.fillStyle = '#e8e0a0'; c.beginPath(); c.arc(20.2, 16.9, .8, 0, TAU_); c.fill();
      });
      if (b.ez > 0) { aciGoz(c, fx, fy, '#141418'); aciAgiz(c, fx, fy); } else {
        for (const s of [-1, 1]) { // tembel, yarı kısık ama tehlikeli bakış; yeşil iris, kalın alçak kaş
          const x = s * 8.5 + fx, y = -.5 + fy;
          goz(c, x, y, s, bx, by, { iris: '#3f8a58', koyu: '#0e2a18', acik: .62, egim: .5, duz: .7, alt: .3, parlak: .7 });
          kas(c, x, y - 5.6, s, .9, '#141418', 2.3);
        }
        c.strokeStyle = '#6a3030'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-4 + fx, 11.5 + fy); c.quadraticCurveTo(1 + fx, 13.4 + fy, 5 + fx, 10 + fy); c.stroke(); // yan sırıtış
      }
      c.strokeStyle = '#b98276'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-5.5 + fx, 8.5 + fy); c.lineTo(-3.8 + fx, 14.5 + fy); c.stroke(); // dudak köşesindeki yara izi
      sacCiz(c, TOJI_SAC, o.t, '#1a1a1f', '#3c3c48', 'rgba(0,0,0,.35)', TOJI_TEL);
    },
    skiller: [
      { ad: 'Göksel Kısıtlama', // pasif: hız, dayanıklılık (can) ve donma direnci karakter ayarında; hızla çarpması bile hasar verir; hızlanınca ardında silik siluetler kalır
        pasif(b, e, o) { const h = b.hafiza; if ((h.carp || 0) > o.t || uzak(b, e) > b.r + e.r + 3) return;
          const v = Math.hypot(b.vx - e.vx, b.vy - e.vy); if (v > 3) { h.carp = o.t + 16; o.vur(e, .8 + v * .36, celikKaynak(o, b), 2 + v * .4, 'yakin'); } },
        hasarAl(b, d, { kaynak, tur }, o) { // refleks: uzaktan gelen yakın dövüş kesiklerinden (%47) yana sıyrılır; ardında silik siluet kalır
          if (tur != 'yakin' || !kaynak || kaynak.kesin || uzak(b, kaynak) < 64 || Math.random() > .47) return d;
          if (!o.sim) o.ekle({ x: b.x, y: b.y, omur: 14, ciz(c, m) { c.globalAlpha = .45 * (1 - m.l / 14); c.fillStyle = '#2a2d33'; c.beginPath(); c.arc(m.x, m.y, 24, 0, TAU_); c.fill(); c.globalAlpha = 1; } });
          return 0; },
        ciz(c, b) { const v = Math.hypot(b.vx, b.vy); if (v > 6) hayalet(c, b, Math.min(1, (v - 6) / 4)); } },

      { ad: 'Ters Göksel Mızrak', isabet: 'guvenilir', bekleme: 130, ilk: 80, kosul: (b, e) => uzak(b, e) < 120, // atılıp saplar; lanetli savunmaları deler
        kullan(b, e, o) { const a = yonu(b, e); b.vx += Math.cos(a) * 6; b.vy += Math.sin(a) * 6 - 1;
          o.ekle({ sahip: b, x: 0, y: 0, omur: 18, a,
            adim(m, o) { const s = m.sahip, e = o.rakip(s); if (m.l < 6) m.a = yonu(s, e);
              if (!m.vurdu && m.l >= 3 && m.l <= 9 && uzak(s, e) < s.r + e.r + 42) { m.vurdu = 1; o.vur(e, 4.5, celikKaynak(o, s, true), 7, 'yakin'); } }, // atılış boyunca ilk temasta saplar
            ciz(c, m) { const s = m.sahip, u = m.l < 6 ? m.l / 6 : 1 - (m.l - 6) / 12; mizrak(c, s.x, s.y, m.a, 30 + 34 * u, Math.min(1, u * 2)); } });
        } },

      { ad: 'Oyuncu Bulut', isabet: 'guvenilir', bekleme: 150, ilk: 140, kosul: (b, e) => uzak(b, e) < b.r + e.r + 34, // üç parçalı sopa: üç darbe, sonuncusu duvara fırlatır
        kullan(b, e, o) {
          o.ekle({ sahip: b, x: 0, y: 0, omur: 26, a: yonu(b, e),
            adim(m, o) { const s = m.sahip, e = o.rakip(s); m.a = yonu(s, e);
              if (m.l % 8 == 0 && m.l <= 16 && uzak(s, e) < s.r + e.r + 46) { o.vur(e, 4, celikKaynak(o, s), m.l == 16 ? 13 : 2, 'yakin'); if (m.l == 16) o.sars(4); } },
            ciz(c, m) { const s = m.sahip, k = m.l / m.omur, sw = Math.sin(m.l * .9) * 1.3, al = 1 - k * k;
              c.save(); c.lineCap = 'round'; c.globalAlpha = al;
              let a = m.a + sw, x = s.x + Math.cos(a) * 16, y = s.y + Math.sin(a) * 16;
              for (let i = 0; i < 3; i++) { const nx = x + Math.cos(a) * 17, ny = y + Math.sin(a) * 17;
                c.strokeStyle = '#2b1d14'; c.lineWidth = 4.2; c.beginPath(); c.moveTo(x, y); c.lineTo(nx, ny); c.stroke();
                c.strokeStyle = '#a0784e'; c.lineWidth = 2.4; c.stroke();
                c.fillStyle = '#c9ccd2'; c.beginPath(); c.arc(nx, ny, 1.8, 0, TAU_); c.fill(); // parçaları bağlayan metal halka
                x = nx; y = ny; a -= sw * .6; }
              c.strokeStyle = '#dfe6ee'; c.lineWidth = 1; c.globalAlpha = al * .35; c.beginPath(); c.arc(s.x, s.y, 62, m.a + sw - .8, m.a + sw + .2); c.stroke(); // savrulma izi
              c.restore(); } });
        } },

      { ad: 'Bin Mil Zincir', isabet: 'normal', bekleme: 330, ilk: 120, kosul: (b, e) => uzak(b, e) > 190, // zincirli mızrağı fırlatır, saplanınca kendini rakibe çeker
        kullan(b, e, o) { const a = onden(b, e, 18);
          o.ekle({ sahip: b, x: b.x, y: b.y, vx: Math.cos(a) * 18, vy: Math.sin(a) * 18, omur: 60, a,
            adim(m, o) { const s = m.sahip, e = o.rakip(s);
              if (m.tut != null) { m.x = e.x; m.y = e.y; m.vx = m.vy = 0; const d = uzak(s, e) || 1;
                s.vx = (e.x - s.x) / d * 11; s.vy = (e.y - s.y) / d * 11; if (d < s.r + e.r + 6 || m.l > m.tut + 25 || s.don > 0) m.olu = 1; return; }
              if (m.geri) { const d = uzak(m, s) || 1; m.vx = (s.x - m.x) / d * 16; m.vy = (s.y - m.y) / d * 16; if (d < 20) m.olu = 1; return; } // ıskaladı: geri sarar
              if (uzak(m, e) < e.r + 8) { m.tut = m.l; o.vur(e, 4, celikKaynak(o, m, true), 0, 'menzil'); }
              else if (duvarda(m, o) || uzak(m, s) > 330) { m.geri = 1; if (duvarda(m, o)) o.duvarVur(m.x, m.y, '#dfe6ee', .6); }
            },
            ciz(c, m) { const s = m.sahip, d = uzak(s, m), n = Math.floor(d / 7), a = yonu(s, m);
              c.save(); c.strokeStyle = '#9aa1ab'; c.lineWidth = 1.3;
              for (let i = 1; i < n; i++) { const t = i / n, x = s.x + (m.x - s.x) * t, y = s.y + (m.y - s.y) * t + Math.sin(t * Math.PI) * (m.tut != null ? 0 : 8);
                c.beginPath(); c.ellipse(x, y, 3.4, 1.8, a + (i % 2 ? 0 : Math.PI / 2), 0, TAU_); c.stroke(); } // zincir halkaları
              c.restore(); if (m.tut == null) mizrak(c, m.x - Math.cos(m.a) * 34, m.y - Math.sin(m.a) * 34, m.a, 34, 1); } });
        } },

      { ad: 'Ruh Bölen Kılıç', tek: true, ilk: 120, kosul: b => b.hp < b.mx * .45, // alan genişletmesi yok: arena kararır, dört kez rakibin içinden kesip geçer
        kullan(b, e, o) { o.sars(4);
          o.ekle({ alt: true, sahip: b, x: b.x, y: b.y, omur: 100, kes: [],
            adim(m, o) { const s = m.sahip, e = o.rakip(s); if (s.hp <= 0) { m.olu = 1; return; }
              if (m.l >= 18 && m.l <= 66 && (m.l - 18) % 16 == 0) {
                const a = yonu(s, e) + rnd(-.7, .7), x0 = s.x, y0 = s.y;
                const x1 = Math.max(32, Math.min(o.W - 32, e.x + Math.cos(a) * 70)), y1 = Math.max(32, Math.min(o.H - 32, e.y + Math.sin(a) * 70));
                m.kes.push({ x0, y0, x1, y1, l: m.l }); s.x = x1; s.y = y1; s.vx = Math.cos(a) * 2; s.vy = Math.sin(a) * 2;
                if (o.vur(e, 5, celikKaynak(o, { x: x0, y: y0 }, true), 3, 'yakin') > 0) vurusKaresi(o, e.x, e.y, m.l == 66 ? 1.8 : .5, m.l == 66); o.sars(3);
              } },
            ciz(c, m, o) { const son = Math.min(1, (m.omur - m.l) / 20), k = Math.min(1, m.l / 15);
              c.fillStyle = 'rgba(0,0,0,' + .6 * k * son + ')'; c.fillRect(0, 0, o.W, o.H); // arena kararır
              yazi(c, '天与呪縛', o.W / 2, o.H / 2, 84, '#c8ccd2', .08 * k * son);
              for (const q of m.kes) { const u = (m.l - q.l) / 30; if (u > 1) continue;
                c.globalAlpha = .4 * (1 - u); c.fillStyle = '#2a2d33'; c.beginPath(); c.arc(q.x0, q.y0, 24, 0, TAU_); c.fill(); c.globalAlpha = 1; // geride kalan silik siluet
                kesik(c, (q.x0 + q.x1) / 2, (q.y0 + q.y1) / 2, Math.atan2(q.y1 - q.y0, q.x1 - q.x0), Math.hypot(q.x1 - q.x0, q.y1 - q.y0) + 40, 2.6 * (1 - u) + .3, '#f4f6f8', 1 - u); }
            } });
        } },
    ],
  },

  {
    ad: 'MAKI', renk: '#2fe0a0', can: 105, hiz: 1.2, tip: 'yakin', ucar: false, donDirenc: 1, itDirenc: .3,
    gorunum(c, b, o, bx, by) {
      const fx = bx * 3, fy = by * 1.5, av = o.t < (b.hafiza.av || 0);
      kafa(c, '#ecc8ae', () => {
        c.fillStyle = '#1b2133'; c.beginPath(); c.moveTo(-24, 15); c.quadraticCurveTo(0, 21, 24, 15); c.lineTo(24, 24); c.lineTo(-24, 24); c.fill(); // Jujutsu Lisesi yakası
        c.fillStyle = '#d8b04a'; c.beginPath(); c.arc(fx * .3, 21.5, 1.6, 0, TAU_); c.fill();
        yanik(c, [[9, -15], [15, -16], [21, -12], [24, -5], [21, 1], [17, -1], [14, 3], [10, -2], [7, -7], [9, -11]], fx, fy); // alından göze inen yanık
        yanik(c, [[-21, 2], [-15, 3], [-11, 7], [-12, 12], [-17, 13], [-22, 9]], fx, fy); // yanak
      });
      if (b.ez > 0) { aciGoz(c, fx, fy, '#141418'); aciAgiz(c, fx, fy); } else {
        for (const s of [-1, 1]) { // keskin, kararlı, dik bakış; Zen'in Avı'nda kehribar iris parlar
          const x = s * 8.5 + fx, y = -.5 + fy;
          goz(c, x, y, s, bx, by, { iris: av ? '#f0a83a' : '#9a6a30', koyu: '#3a2008', acik: .8, egim: .7, duz: .3, alt: .1 });
          kas(c, x, y - 7, s, 1.3, '#141418', 2);
        }
        c.strokeStyle = '#7a3e3e'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-3.2 + fx, 12.4 + fy); c.lineTo(3.2 + fx, 12 + fy); c.stroke(); // sıkılmış ağız
      }
      sacCiz(c, MAKI_SAC, o.t, '#1f3a2e', '#3f6a55', 'rgba(0,0,0,.35)', MAKI_TEL);
    },
    skiller: [
      { ad: 'Tam Göksel Kısıtlama', // pasif: lanet enerjisiyle kilitlenemez: alan saldırılarından %20, uzaktan nişanlı kesiklerden %30 az hasar; Zen'in Avı'nda hızlanır
        pasif(b, e, o) { b.hizx = o.t < (b.hafiza.av || 0) ? 1.4 : 1; },
        hasarAl(b, d, { kaynak, tur }) { return tur == 'alan' ? d * .8 : tur == 'yakin' && kaynak && uzak(b, kaynak) > 90 ? d * .7 : d; } },

      { ad: 'Ejderha Kemiği', isabet: 'guvenilir', bekleme: 78, ilk: 40, kosul: (b, e) => uzak(b, e) < b.r + e.r + 46, // uzun kılıç; aldığı hasarın %45'ini kılıçta biriktirir, sonraki savuruşta patlatır
        hasarAl(b, d) { b.hafiza.ejder = Math.min(20, (b.hafiza.ejder || 0) + d * .45); return d; },
        demo(b) { b.hafiza.ejder = 14; }, // demoda dolu kılıçla göster
        pasif(b) { if (b.hafiza.ejder) b.hafiza.ejder *= .995; }, // kullanılmayan enerji yavaşça söner (~2.3 sn'de yarıya)
        kullan(b, e, o) {
          const h = b.hafiza, ek = h.ejder || 0, a = yonu(b, e); h.ejder = 0;
          o.vur(e, 4 + ek, makiKaynak(o, b, b), 5 + ek * .5, 'yakin');
          if (ek > 6) { o.sars(3 + ek * .2);
            if (!o.sim) o.ekle({ x: e.x, y: e.y, omur: 20, ek, ciz(c, m) { const u = m.l / m.omur; halka(c, m.x, m.y, 12 + (30 + m.ek * 2) * Math.sqrt(u), '#c8ccd2', 3 * (1 - u) + .5, .8 * (1 - u));
              c.globalAlpha = .3 * (1 - u); c.fillStyle = '#8c8f96'; for (let i = 0; i < 6; i++) { const t = i * 1.05; c.beginPath(); c.arc(m.x + Math.cos(t) * 26 * u, m.y + Math.sin(t) * 26 * u, 4 + 6 * u, 0, TAU_); c.fill(); } c.globalAlpha = 1; } }); } // biriken enerji: şok halkası ve toz
          o.ekle({ sahip: b, x: 0, y: 0, omur: 12, a, ek,
            ciz(c, m) { const s = m.sahip, u = m.l / m.omur, aa = m.a - 1.2 + 2.4 * Math.min(1, u * 1.6);
              c.save(); c.globalAlpha = .3 * (1 - u); c.strokeStyle = '#dfe6ee'; c.lineWidth = 3; c.beginPath(); c.arc(s.x, s.y, 52, m.a - 1.2, aa); c.stroke(); c.restore();
              ejderKilic(c, s.x, s.y, aa, Math.min(1, m.ek / 14), 1 - u * u); } });
        },
        ciz(c, b, o) { const ek = b.hafiza.ejder || 0; if (ek < 4) return; // dolan kılıcın közleri Maki'nin çevresinde yükselir
          c.fillStyle = '#ff9a3c'; for (let i = 0; i < 3; i++) { const y = (o.t * .6 + i * 14) % 40; c.globalAlpha = Math.min(1, ek / 14) * .8 * (1 - y / 40);
            c.beginPath(); c.arc(b.x + Math.sin(o.t * .1 + i * 2) * 16, b.y + 14 - y, 1.3, 0, TAU_); c.fill(); } c.globalAlpha = 1; } },

      { ad: 'Naginata Atılımı', isabet: 'guvenilir', bekleme: 150, ilk: 100, kosul: (b, e) => { const d = uzak(b, e); return d > 75 && d < 180; }, // orta mesafeden atılıp deler
        kullan(b, e, o) { const a = yonu(b, e); b.vx += Math.cos(a) * 8; b.vy += Math.sin(a) * 8 - 1.5;
          o.ekle({ sahip: b, x: 0, y: 0, omur: 18, a,
            adim(m, o) { const s = m.sahip, e = o.rakip(s); if (m.l < 5) m.a = yonu(s, e);
              if (!m.vurdu && m.l >= 5 && m.l <= 11 && uzak(s, e) < s.r + e.r + 56) { m.vurdu = 1; o.vur(e, 7, makiKaynak(o, s, s), 6, 'yakin'); } }, // atılım boyunca ilk temas eden vuruş sayılır
            ciz(c, m) { const s = m.sahip, u = m.l < 7 ? m.l / 7 : 1 - (m.l - 7) / 11; naginata(c, s.x, s.y, m.a, 40 + 30 * u, Math.min(1, u * 2)); } });
        } },

      { ad: 'Lanetli Bıçaklar', isabet: 'normal', bekleme: 260, ilk: 150, kosul: (b, e) => uzak(b, e) > 200, // uzaktaki rakibe üç bıçak; duvara saplanıp kalır
        kullan(b, e, o) { const a0 = onden(b, e, 11);
          for (let i = -1; i <= 1; i++) { const a = a0 + i * .13;
            o.ekle({ sahip: b, x: b.x + Math.cos(a) * 26, y: b.y + Math.sin(a) * 26, vx: Math.cos(a) * 11, vy: Math.sin(a) * 11, omur: 70, a,
              adim(m, o) { if (m.p != null) return; const e = o.rakip(m.sahip);
                if (uzak(m, e) < e.r + 5) { o.vur(e, 3, makiKaynak(o, m, m.sahip), 2, 'menzil'); m.olu = 1; }
                else if (duvarda(m, o)) { m.p = m.l; m.vx = m.vy = 0; m.omur = m.l + 50; o.duvarVur(m.x, m.y, '#dfe6ee', .4); } },
              ciz(c, m) { const al = m.p != null ? 1 - (m.l - m.p) / 50 : 1;
                if (m.p == null) { c.save(); c.globalAlpha = .25; c.strokeStyle = '#dfe6ee'; c.lineWidth = 1; c.beginPath(); c.moveTo(m.x, m.y); c.lineTo(m.x - m.vx * 2.5, m.y - m.vy * 2.5); c.stroke(); c.restore(); }
                c.save(); c.translate(m.x, m.y); c.rotate(m.a); c.globalAlpha = al;
                c.fillStyle = '#d8dde4'; c.beginPath(); c.moveTo(8, 0); c.lineTo(-3, -2.4); c.lineTo(-3, 2.4); c.closePath(); c.fill();
                c.fillStyle = '#3a3a42'; c.fillRect(-10, -1, 7, 2); c.restore(); } });
          }
        } },

      { ad: "Zen'in Avı", tek: true, ilk: 120, kosul: b => b.hp < b.mx * .45, // alan genişletmesi yok: 4 sn hızlanır, kılıcı dolar, her vuruşu savunmayı deler
        kullan(b, e, o) { b.hafiza.av = o.t + 240; b.hafiza.ejder = 20; o.sars(5);
          o.ekle({ alt: true, sahip: b, x: 0, y: 0, omur: 240, toz: [],
            adim(m, o) { const s = m.sahip; if (s.hp <= 0) { m.olu = 1; return; }
              if (!o.sim && m.l % 3 == 0 && Math.hypot(s.vx, s.vy) > 4) { m.toz.push([s.x, s.y + 16, m.l]); if (m.toz.length > 40) m.toz.shift(); } },
            ciz(c, m, o) { const son = Math.min(1, (m.omur - m.l) / 30), k = Math.min(1, m.l / 20);
              c.fillStyle = 'rgba(0,0,0,' + .35 * k * son + ')'; c.fillRect(0, 0, o.W, o.H);
              yazi(c, '禪院', o.W / 2, o.H / 2, 110, '#c8ccd2', .07 * k * son);
              for (const [x, y, l] of m.toz) { const u = (m.l - l) / 30; if (u > 1) continue; c.globalAlpha = .3 * (1 - u); c.fillStyle = '#8c8f96'; c.beginPath(); c.arc(x, y - u * 6, 4 + u * 8, 0, TAU_); c.fill(); }
              c.globalAlpha = 1; } });
        } },
    ],
  },
  {
    ad: 'MEGUMI', renk: '#6f8cff', can: 108, hiz: 1.05, tip: 'menzilli', menzil: 220, ucar: false,
    gorunum(c, b, o, bx, by) {
      if (b.hafiza.mah) return mahoragaCiz(c, b, o, bx, by);
      const fx = bx * 3, fy = by * 1.5, rit = b.hafiza.rit;
      kafa(c, '#f0d6c2', () => {
        c.fillStyle = '#151a2c'; c.beginPath(); c.moveTo(-24, 12); c.lineTo(-9, 15); c.lineTo(-7, 24); c.lineTo(-24, 24); c.fill(); // dik yakalı lise üniforması
        c.beginPath(); c.moveTo(24, 12); c.lineTo(9, 15); c.lineTo(7, 24); c.lineTo(24, 24); c.fill(); c.fillRect(-9, 19, 18, 5);
        c.fillStyle = '#c9a24a'; c.beginPath(); c.arc(fx * .3, 21.5, 1.5, 0, TAU_); c.fill();
      });
      if (b.ez > 0) { aciGoz(c, fx, fy, '#141418'); aciAgiz(c, fx, fy); } else if (rit) { // ritüelde gözler kapalı, kaşlar çatık
        c.strokeStyle = '#141418'; c.lineWidth = 1.8; c.lineCap = 'round';
        for (const s of [-1, 1]) { const x = s * 8.5 + fx; c.beginPath(); c.moveTo(x - 4.4, fy); c.quadraticCurveTo(x, 1.6 + fy, x + 4.4, fy); c.stroke();
          c.beginPath(); c.moveTo(x + s * 5, -6.6 + fy); c.lineTo(x - s * 4, -4.4 + fy); c.stroke(); }
        c.strokeStyle = '#7a3e3e'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(-2.4 + fx, 12 + fy); c.lineTo(2.4 + fx, 12 + fy); c.stroke();
      } else {
        for (const s of [-1, 1]) { // yarı kapalı, sıkılmış bakış: düz üst kapak, koyu deniz yeşili iris
          const x = s * 8.5 + fx, y = -.5 + fy;
          goz(c, x, y, s, bx, by, { iris: '#2c5a70', koyu: '#0a1a24', acik: .58, egim: .2, duz: 1, alt: .1, parlak: .7 });
          kas(c, x, y - 5.2, s, .5, '#141418', 1.8); // düz, hafif çatık kaş
        }
        c.strokeStyle = '#7a3e3e'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-2.8 + fx, 12.4 + fy); c.quadraticCurveTo(fx, 11.4 + fy, 2.8 + fx, 12.4 + fy); c.stroke(); // hafif somurtkan ağız
      }
      sacCiz(c, MEGUMI_SAC, o.t, '#15161e', '#3d4562', 'rgba(0,0,0,.4)', MEGUMI_TEL);
    },
    skiller: [
      { ad: 'On Gölge', // pasif: gölgeye dalmışken vurulamaz; ritüelde yavaşlar, Mahoraga hızlıdır
        pasif(b) { b.hizx = b.hafiza.mah ? 1.35 : b.hafiza.rit ? .3 : 1; },
        hasarAl(b, d, _, o) { if ((b.hafiza.dalis || 0) > o.t) return 0; b.hafiza.vurul = o.t; return d; } },

      { ad: 'İlahi Köpekler', isabet: 'normal', bekleme: 170, ilk: 60, kosul: (b, e) => megNormal(b) && uzak(b, e) < 260, // beyaz ve kara kurt gölgeden fırlar, kovalayıp ısırır
        demo: megumiDon,
        kullan(b, e, o) {
          for (const ak of [1, 0]) { const sx = b.x + (ak ? -12 : 12), sy = b.y + b.r * .5, a = onden({ x: sx, y: sy }, e, 6.5) + (ak ? -.3 : .3);
            o.ekle({ sahip: b, x: sx, y: sy, vx: 0, vy: 0, omur: 80, a, ak, iz: [], kopek: true,
              adim(m, o) { const s = m.sahip, e = o.rakip(s);
                if (!megNormal(s) && m.p == null) { m.p = m.l; m.omur = m.l + 12; }
                if (m.l == m.omur - 1 && m.p == null) { m.p = m.l; m.omur = m.l + 12; } // yetişemezse gölgeye batar
                if (m.p != null) { m.vx *= .7; m.vy *= .7; return; }
                const h = onden(m, e, 6.5, 25), d = ((h - m.a) % TAU_ + TAU_ * 1.5) % TAU_ - Math.PI; m.a += kis(d, -.06, .06); // sınırlı dönüş: kaçan rakibi ıskalayabilir
                m.vx = Math.cos(m.a) * 6.5; m.vy = Math.sin(m.a) * 6.5;
                if (m.x < 10 || m.x > o.W - 10) m.a = Math.PI - m.a; if (m.y < 10 || m.y > o.H - 10) m.a = -m.a;
                if (!o.sim && m.l % 3 == 0) { m.iz.push([m.x, m.y + 8]); if (m.iz.length > 6) m.iz.shift(); }
                if (uzak(m, e) < e.r + 9) { o.vur(e, 3.5, golgeKaynak(o, m), 3, 'yakin'); m.p = m.l; m.omur = m.l + 16; } },
              ciz(c, m) { const g = Math.min(1, m.l / 6), al = m.p != null ? 1 - (m.l - m.p) / (m.omur - m.p) : g;
                for (const [i, [x, y]] of m.iz.entries()) { c.globalAlpha = .5 * (i + 1) / m.iz.length * al; c.fillStyle = '#2a2150'; c.beginPath(); c.ellipse(x, y, 3, 1.4, 0, 0, TAU_); c.fill(); } // pençe izi gölge damlaları
                c.globalAlpha = 1; if (m.l < 8) golge(c, m.x, m.y + 8, 14, 4, 1 - m.l / 8); // gölgeden fırlar
                if (m.p != null) golge(c, m.x, m.y + 6, 13 * al, 4 * al, al); // gölgeye geri batar
                kopekCiz(c, m.x, m.y, m.a, m.l, m.ak, al); } });
          }
        } },

      { ad: 'Nue', isabet: 'normal', bekleme: 260, ilk: 150, kosul: (b, e) => megNormal(b) && uzak(b, e) > 120, // baykuş rakibin üstüne süzülür, yıldırımla dalar
        demo: megumiDon,
        kullan(b, e, o) {
          o.ekle({ sahip: b, x: b.x, y: b.y - b.r, omur: 110,
            adim(m, o) { const s = m.sahip, e = o.rakip(s);
              if (!megNormal(s) && m.p == null) { m.p = m.l; m.omur = m.l + 10; }
              if (m.p != null) return;
              if (m.l < 40) { const tx = kis(e.x + e.vx * 12, 30, o.W - 30), ty = Math.max(34, e.y - 120); m.vx = (tx - m.x) * .08; m.vy = (ty - m.y) * .08; return; }
              if (m.l == 40) { const a = onden(m, e, 10); m.vx = Math.cos(a) * 10; m.vy = Math.sin(a) * 10; m.dal = 1; }
              if (uzak(m, e) < e.r + 12) { o.vur(e, 6, { x: m.x, y: m.y, renk: '#fff1a0' }, 4, 'menzil'); e.don = Math.max(e.don, 12); m.p = m.l; m.omur = m.l + 18; m.vx = m.vy = 0; o.sars(3); m.hx = e.x; m.hy = e.y; }
              else if (duvarda(m, o, 4)) { m.p = m.l; m.omur = m.l + 12; m.vx = m.vy = 0; } },
            ciz(c, m, o) { const al = m.p != null ? 1 - (m.l - m.p) / (m.omur - m.p) : Math.min(1, m.l / 8);
              nueCiz(c, m.x, m.y, m.vx || 1, m.l, m.dal, al);
              if (m.dal && m.p == null && !o.sim && m.l % 2 == 0) simsek(c, m.x, m.y + 10, m.x + rnd(-10, 10), m.y + rnd(16, 24), .6, 3); // pençelerde kıvılcım
              if (m.hx != null && m.l - m.p < 10) { simsek(c, m.x, m.y, m.hx, m.hy, 1 - (m.l - m.p) / 10); simsek(c, m.x, m.y, m.hx + rnd(-20, 20), m.hy + rnd(-20, 20), .6 * (1 - (m.l - m.p) / 10)); } } });
        } },

      { ad: 'Kurbağa', isabet: 'guvenilir', bekleme: 160, ilk: 100, kosul: (b, e) => megNormal(b) && uzak(b, e) < b.r + e.r + 80, // yaklaşanı diliyle yakalar, Megumi açılır
        demo: megumiDon,
        kullan(b, e, o) { const a = yonu(b, e);
          o.ekle({ sahip: b, x: b.x, y: b.y, omur: 40, a,
            adim(m, o) { const s = m.sahip, e = o.rakip(s);
              if (!megNormal(s)) { m.olu = 1; return; }
              if (m.l < 6) m.a = yonu(s, e); m.x = s.x + Math.cos(m.a) * (s.r + 9); m.y = s.y + Math.sin(m.a) * (s.r + 9);
              if (m.l == 6 && uzak(m, e) < e.r + 90) { m.tut = 1; o.vur(e, 5, golgeKaynak(o, e), 0, 'yakin'); e.don = Math.max(e.don, 30); }
              if (m.tut && m.l < 30) { e.x += (m.x - e.x) * .03; e.y += (m.y - e.y) * .03; }
              if (m.tut && m.l == 30) { s.vx -= Math.cos(m.a) * 8; s.vy -= Math.sin(m.a) * 8 + 1; } },
            ciz(c, m, o) { const e = o.rakip(m.sahip), boy = Math.min(1, m.l / 5) * Math.min(1, (m.omur - m.l) / 8);
              golge(c, m.x, m.y + 6, 15 * boy, 4.5 * boy, boy);
              const dil = m.tut && m.l < 30 ? 1 : m.l < 6 ? m.l / 6 : m.l < 12 ? 1 - (m.l - 6) / 6 : 0;
              if (dil > 0) { const tx = m.tut ? e.x : m.x + Math.cos(m.a) * 90 * dil, ty = m.tut ? e.y : m.y + Math.sin(m.a) * 90 * dil, mx = m.x + Math.cos(m.a) * 6, my = m.y - 1;
                c.save(); c.lineCap = 'round'; c.strokeStyle = '#7a2e48'; c.lineWidth = 4.2; c.beginPath(); c.moveTo(mx, my); c.lineTo(tx, ty); c.stroke();
                c.strokeStyle = '#d86a8a'; c.lineWidth = 2.6; c.stroke(); c.fillStyle = '#d86a8a'; c.beginPath(); c.arc(tx, ty, 3.4, 0, TAU_); c.fill(); c.restore(); }
              kurbagaCiz(c, m.x, m.y, m.a, boy, boy); } });
        } },

      { ad: 'Gölgeye Dalış', bekleme: 160, ilk: 200, kosul: (b, e, o) => megNormal(b) && o.t - (b.hafiza.vurul ?? -99) < 20 && uzak(b, e) < b.r + e.r + 60, // sıkışınca gölgesine batar, rakibin arkasından çıkar
        demo: megumiDon,
        kullan(b, e, o) { b.hafiza.dalis = o.t + 30;
          o.ekle({ sahip: b, x: b.x, y: b.y, omur: 46,
            adim(m, o) { const s = m.sahip, e = o.rakip(s);
              if (m.l < 30) { s.vx *= .6; s.vy *= .6; m.x = s.x; m.y = s.y; return; }
              if (m.l == 30) { const a = yonu(s, e); m.ex = s.x; m.ey = s.y;
                s.x = kis(e.x + Math.cos(a) * 190, s.r + 8, o.W - s.r - 8); s.y = kis(e.y + Math.sin(a) * 190, s.r + 8, o.H - s.r - 8); s.vx = s.vy = 0; m.x = s.x; m.y = s.y;
                golgeFx(o, s.x, s.y + 10, -Math.PI / 2); } },
            ciz(c, m, o) {
              if (m.l < 30) { const k = Math.min(1, m.l / 12); golge(c, m.x, m.y + 18, 30, 8, 1);
                c.save(); c.beginPath(); c.rect(m.x - 30, m.y + 26 - 52 * k, 60, 60); c.clip(); c.globalAlpha = .92; c.fillStyle = '#05040a'; c.beginPath(); c.arc(m.x, m.y, 25.5, 0, TAU_); c.fill(); c.restore(); } // aşağıdan yukarı gölgeye batar
              else { const k = (m.l - 30) / 16; golge(c, m.x, m.y + 18, 30 * (1 - k), 8 * (1 - k), 1 - k); } } });
        } },

      { ad: 'İlahi General Mahoraga', tek: true, ilk: 0, kosul: b => megNormal(b) && b.hp > 0 && b.hp <= 6, // canı ~6'ya düşünce ritüel: 1,5 sn savunmasız; ölmezse Mahoraga çıkar
        demo(b, e, o) { megumiDon(b); b.hp = 6; },
        kullan(b, e, o) { b.hafiza.rit = o.t; o.sars(3);
          o.ekle({ alt: true, sahip: b, x: b.x, y: b.y, omur: 92,
            adim(m, o) { const s = m.sahip; if (s.hp <= 0 || !s.hafiza.rit) { m.olu = 1; return; } m.x = s.x; m.y = s.y; if (m.l == 90) mahoragaOl(s, o.rakip(s), o); },
            ciz(c, m, o) { const k = Math.min(1, m.l / 30), u = m.l / 90;
              c.fillStyle = 'rgba(4,2,10,' + .45 * k + ')'; c.fillRect(0, 0, o.W, o.H);
              yazi(c, '布瑠部由良由良', o.W / 2, o.H / 2, 64, '#cfc7ef', .1 * k);
              golge(c, m.x, m.y + 22, 40 + 50 * u, 10 + 12 * u, k); // yerde büyüyen gölge, içinde sekiz kollu tekerlek belirir
              c.save(); c.translate(m.x, m.y + 22); c.scale(1, .26); c.rotate(m.l * .02); c.globalAlpha = .7 * u; c.strokeStyle = '#8f7fd0'; c.lineWidth = 3;
              c.beginPath(); c.arc(0, 0, 30 + 40 * u, 0, TAU_); c.stroke();
              for (let i = 0; i < 8; i++) { const t = i * TAU_ / 8; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(t) * (40 + 50 * u), Math.sin(t) * (40 + 50 * u)); c.stroke(); }
              c.restore(); } });
        } },

      { ad: 'Kovma Kılıcı', isabet: 'guvenilir', bekleme: 55, ilk: 0, kosul: (b, e) => b.hafiza.mah && !b.hafiza.tut && uzak(b, e) < b.r + e.r + 44, // Mahoraga: sağ kolundaki dev kılıçla savurur
        demo(b, e, o) { mahoragaOl(b, e, o); },
        kullan(b, e, o) { const a = yonu(b, e); b.vx += Math.cos(a) * 3; b.vy += Math.sin(a) * 3;
          o.ekle({ sahip: b, x: 0, y: 0, omur: 16, a, yon: Math.random() < .5 ? 1 : -1,
            adim(m, o) { const s = m.sahip, e = o.rakip(s); if (m.l == 4 && uzak(s, e) < s.r + e.r + 52) { mahVur(o, s, e, 7, 11); o.sars(5); } },
            ciz(c, m) { const s = m.sahip, u = Math.min(1, m.l / 5), k = m.l / m.omur, b0 = m.a - m.yon * 1.3, b1 = b0 + m.yon * 2.6 * u;
              c.save(); c.lineCap = 'round';
              c.globalAlpha = .35 * (1 - k); c.strokeStyle = '#efe6cf'; c.lineWidth = 16; c.beginPath(); c.arc(s.x, s.y, 50, Math.min(b0, b1), Math.max(b0, b1)); c.stroke(); // savurma izi
              c.translate(s.x, s.y); c.rotate(b1); c.globalAlpha = 1 - k * k;
              c.fillStyle = '#d8dce2'; c.strokeStyle = '#70757e'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(26, -4); c.lineTo(78, -2.5); c.lineTo(86, 0); c.lineTo(78, 2.5); c.lineTo(26, 4); c.closePath(); c.fill(); c.stroke();
              c.strokeStyle = '#f6f8fa'; c.lineWidth = .8; c.beginPath(); c.moveTo(28, -2.6); c.lineTo(80, -1.2); c.stroke();
              c.fillStyle = '#c9a24a'; c.fillRect(22, -6, 4, 12); c.restore(); } });
        } },

      { ad: 'Tutuş', isabet: 'guvenilir', bekleme: 210, ilk: 0, kosul: (b, e) => b.hafiza.mah && !b.hafiza.tut && uzak(b, e) < b.r + e.r + 24, // Mahoraga rakibi yakalar, üç yumruk, sonra duvara fırlatır
        demo(b, e, o) { mahoragaOl(b, e, o); },
        kullan(b, e, o) { b.hafiza.tut = 1;
          o.ekle({ sahip: b, x: 0, y: 0, omur: 66, a: yonu(b, e), yum: -99,
            adim(m, o) { const s = m.sahip, e = o.rakip(s);
              if (e.hp <= 0 || !s.hafiza.mah) { s.hafiza.tut = 0; m.olu = 1; return; }
              const d = s.r + e.r - 2; e.x = kis(s.x + Math.cos(m.a) * d, e.r + 6, o.W - e.r - 6); e.y = kis(s.y + Math.sin(m.a) * d, e.r + 6, o.H - e.r - 6);
              e.vx = e.vy = 0; e.don = Math.max(e.don, 3); s.vx *= .6; s.vy *= .6;
              if (m.l == 14 || m.l == 28 || m.l == 42) { mahVur(o, s, e, 4, 0); o.sars(4); m.yum = m.l; }
              if (m.l == 58) { s.hafiza.tut = 0; e.don = 0; mahVur(o, s, e, 5, 18); o.sars(9); if (duvarda(e, o, 60)) o.duvarVur(e.x, e.y, '#efe6cf', 2); m.olu = 1; } },
            ciz(c, m, o) { const s = m.sahip, e = o.rakip(s), u = m.l - m.yum;
              c.save(); c.lineCap = 'round'; c.strokeStyle = '#d9d3c7'; c.lineWidth = 7; // kalın kol rakibi kavrar
              c.beginPath(); c.moveTo(s.x + Math.cos(m.a + .9) * s.r * .8, s.y + Math.sin(m.a + .9) * s.r * .8); c.quadraticCurveTo(e.x + Math.cos(m.a + 1.8) * e.r, e.y + Math.sin(m.a + 1.8) * e.r, e.x, e.y - e.r * .2); c.stroke();
              c.strokeStyle = '#b9b0a2'; c.lineWidth = 1.2; c.stroke();
              if (u < 8) { const k = u / 8; halka(c, e.x, e.y, e.r * (.6 + k), '#efe6cf', 3 * (1 - k), 1 - k);
                c.globalAlpha = 1 - k; c.fillStyle = '#e6e0d5'; c.beginPath(); c.arc(e.x - Math.cos(m.a) * e.r * .5, e.y - Math.sin(m.a) * e.r * .5, 7, 0, TAU_); c.fill(); } // yumruk
              c.restore(); } });
        } },
    ],
  },

  {
    ad: 'NAOYA', renk: '#d8cf7a', can: 116, hiz: 1.25, tip: 'yakin', ucar: false,
    gorunum(c, b, o, bx, by) { // zeytin-sarı perçemli saç, küpeli kulaklar, keskin gözler, ağzı açık kendini beğenmiş kahkaha
      const fx = bx * 3, fy = by * 1.5;
      for (const s of [-1, 1]) { c.fillStyle = '#efd6c0'; c.strokeStyle = '#c49a80'; c.lineWidth = .9; // kulaklar
        c.beginPath(); c.ellipse(s * 23.5, 3, 3.6, 5.4, s * .15, 0, TAU_); c.fill(); c.stroke(); }
      kafa(c, '#f2dcc8', () => {
        c.fillStyle = '#121218'; c.beginPath(); c.moveTo(-24, 13); c.lineTo(-3, 24); c.lineTo(-24, 24); c.fill(); c.beginPath(); c.moveTo(24, 13); c.lineTo(3, 24); c.lineTo(24, 24); c.fill(); // siyah kimono
        c.fillStyle = '#e8e6ec'; c.beginPath(); c.moveTo(-15, 17.5); c.lineTo(0, 24); c.lineTo(15, 17.5); c.lineTo(11, 16.5); c.lineTo(0, 21.5); c.lineTo(-11, 16.5); c.fill(); // beyaz iç yaka
      });
      c.fillStyle = '#2f6b4f'; c.strokeStyle = '#173a2a'; c.lineWidth = .5; for (const [x, y] of [[25, 7], [-25, 7]]) { c.beginPath(); c.arc(x, y, 1.3, 0, TAU_); c.fill(); c.stroke(); } // koyu yeşil taş küpeler
      c.strokeStyle = '#1a1a20'; c.lineWidth = 1; c.beginPath(); c.arc(25.6, -.6, 1.8, -1.2, 1.9); c.stroke(); // kulak üstünde siyah halka
      if (b.ez > 0) { aciGoz(c, fx, fy, '#141418'); aciAgiz(c, fx, fy); } else {
        for (const s of [-1, 1]) { const x = s * 8.5 + fx, y = .8 + fy; // tepeden bakan kibirli kısık gözler: alt kapak kalkık, küçük iris
          goz(c, x, y, s, bx, by, { iris: '#6a6a40', koyu: '#1a1a0c', iri: 2.3, acik: .55, egim: .85, duz: .8, alt: .55, parlak: .7 });
          kas(c, x, y - 5.4 - (s > 0 ? 1.4 : 0), s, s > 0 ? .3 : .9, '#3a3424', 1.7); // sağ kaş havada: küçümseyen ifade
        }
        c.save(); c.beginPath(); c.moveTo(-7.5 + fx, 8.6 + fy); c.quadraticCurveTo(fx, 10 + fy, 7.5 + fx, 8 + fy); c.quadraticCurveTo(5 + fx, 16.5 + fy, fx, 16.6 + fy); c.quadraticCurveTo(-5 + fx, 16.5 + fy, -7.5 + fx, 8.6 + fy); // açık ağız
        c.fillStyle = '#4a1418'; c.fill(); c.clip();
        c.fillStyle = '#c86a76'; c.beginPath(); c.ellipse(fx, 16 + fy, 4, 2.4, 0, 0, TAU_); c.fill(); // dil
        c.fillStyle = '#fbf8f2'; c.fillRect(-8 + fx, 8 + fy, 16, 2.8); c.fillRect(-5 + fx, 14.2 + fy, 10, 3); // üst ve alt dişler
        c.restore(); c.strokeStyle = '#6a2a2a'; c.lineWidth = 1; c.beginPath(); c.moveTo(-7.5 + fx, 8.6 + fy); c.quadraticCurveTo(fx, 10 + fy, 7.5 + fx, 8 + fy); c.quadraticCurveTo(5 + fx, 16.5 + fy, fx, 16.6 + fy); c.quadraticCurveTo(-5 + fx, 16.5 + fy, -7.5 + fx, 8.6 + fy); c.stroke();
      }
      sacCiz(c, NAOYA_SAC, o.t, '#b3aa78', '#5e5838', 'rgba(60,55,30,.45)', NAOYA_TEL);
    },
    skiller: [
      { ad: '24 Kare', // pasif: kesintisiz hareket ettikçe hızlanır (en çok ×1.45) ve hızı kadar yakın vuruşlardan sıyrılır (en çok %50); büyük darbe ya da donma birikimi siler.
        pasif(b, e, o) { const h = b.hafiza, v = Math.hypot(b.vx, b.vy);
          if (o.t - (h.son ?? o.t) > 1) h.iv = 0; h.son = o.t; // donmuşsa (pasif çalışmadı) birikim gider
          h.iv = kis((h.iv || 0) + (v > 3 ? .006 : -.002), 0, 1); b.hizx = 1 + .45 * h.iv + (o.t < (h.saray || 0) ? .2 : 0);
          if (!o.sim && o.t % 4 == 0) { (h.kare ??= []).push([b.x, b.y, o.t]); if (h.kare.length > 5) h.kare.shift(); } },
        hasarAl(b, d, { kaynak, tur }, o) { const h = b.hafiza; // hızlandıkça yakın vuruşların arasından kare atlayarak sıyrılır (menzilli/alan sıyrılamaz; kesin vuruşta şans azalır: Maki onu görür)
          if (tur == 'yakin' && Math.random() < .5 * (h.iv || 0) * (kaynak?.kesin ? .7 : 1)) { if (!o.sim) o.ekle({ x: b.x, y: b.y, omur: 14, ciz(c, m) { filmKare(c, m.x, m.y, 54, 54, 0, .8 * (1 - m.l / 14)); } }); return 0; }
          if (d >= 5) h.iv = (h.iv || 0) * (tur == 'yakin' ? .4 : .75); return d; }, // uzaktan büyük darbe hızını daha az siler (menzillilere karşı çok eziliyordu)
        ciz(c, b, o) { const v = Math.hypot(b.vx, b.vy); if (v < 3.5 || !b.hafiza.kare) return; const al = Math.min(1, (v - 3.5) / 4);
          for (const [x, y, t] of b.hafiza.kare) { const u = (o.t - t) / 20; if (u > 1 || u < .1) continue;
            c.globalAlpha = .3 * (1 - u) * al; c.fillStyle = '#2a2a30'; c.beginPath(); c.arc(x, y, b.r, 0, TAU_); c.fill(); c.globalAlpha = 1;
            filmKare(c, x, y, 2 * b.r + 6, 2 * b.r + 6, 0, .4 * (1 - u) * al); } } },

      { ad: 'Kare Hapsi', isabet: 'guvenilir', bekleme: 240, ilk: 150, kosul: (b, e) => uzak(b, e) < b.r + e.r + 22 && e.don <= 0, // dokunduğunu düz bir film karesine hapseder (~0,7 sn)
        kullan(b, e, o) { e.don = Math.max(e.don, 42); o.vur(e, 3, naoyaKaynak(o, b), 0, 'yakin');
          o.ekle({ sahip: b, x: e.x, y: e.y, omur: 46, hedef: e,
            adim(m) { const e = m.hedef; if (e.don <= 0 && m.kir == null) { m.kir = m.l; m.omur = m.l + 12; } m.x = e.x; m.y = e.y; },
            ciz(c, m) { const e = m.hedef, w = 2 * e.r + 16;
              if (m.kir == null) { filmKare(c, m.x, m.y, w, w, .06, .95, true); c.globalAlpha = .18; c.fillStyle = '#f4f2fa'; c.fillRect(m.x - w / 2, m.y - w / 2, w, w); c.globalAlpha = 1; }
              else { const k = (m.l - m.kir) / 12; for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) filmKare(c, m.x + dx * w * (.25 + k * .5), m.y + dy * w * (.25 + k * .5), w / 2, w / 2, dx * dy * k, 1 - k); } } });
        } },

      { ad: 'Projeksiyon Yumrukları', isabet: 'guvenilir', bekleme: 75, ilk: 60, kosul: (b, e) => uzak(b, e) < b.r + e.r + 40, // kare atlayıp dibine girer: üç yumruk, sonuncusu fırlatır
        kullan(b, e, o) {
          o.ekle({ sahip: b, x: 0, y: 0, omur: 22, vur: [],
            adim(m, o) { const s = m.sahip, e = o.rakip(s);
              if (m.l % 6 == 0 && m.l <= 12 && uzak(s, e) < s.r + e.r + 44) { const a = yonu(s, e), d = s.r + e.r + 2;
                m.vur.push([s.x, s.y, m.l]); s.x = kis(e.x - Math.cos(a) * d, s.r + 6, o.W - s.r - 6); s.y = kis(e.y - Math.sin(a) * d, s.r + 6, o.H - s.r - 6);
                o.vur(e, 3.2, naoyaKaynak(o, s), m.l == 12 ? 11 : 2, 'yakin'); } },
            ciz(c, m, o) { const s = m.sahip, e = o.rakip(s);
              for (const [x, y, l] of m.vur) { const u = (m.l - l) / 10; if (u > 1) continue; // kare atladığı yerde kalan silik görüntü
                filmKare(c, x, y, 2 * s.r + 6, 2 * s.r + 6, 0, .7 * (1 - u)); c.globalAlpha = .4 * (1 - u); c.fillStyle = '#2a2a30'; c.beginPath(); c.arc(x, y, s.r, 0, TAU_); c.fill(); c.globalAlpha = 1;
                c.strokeStyle = '#f4f1e6'; c.lineWidth = 1.4; c.globalAlpha = 1 - u; c.beginPath(); c.moveTo(x, y); c.lineTo(e.x, e.y); c.stroke(); c.globalAlpha = 1; } } });
        } },

      { ad: 'Ses Hızı Çarpma', isabet: 'normal', bekleme: 240, ilk: 120, kosul: (b, e) => { const d = uzak(b, e); return d > 150 && d < 380; }, // dümdüz atılır; birikmiş hızı kadar sert vurur
        kullan(b, e, o) { const a = onden(b, e, 15);
          o.ekle({ sahip: b, x: b.x, y: b.y, omur: 20, a, iz: [],
            adim(m, o) { const s = m.sahip, e = o.rakip(s); if (m.bitti) return;
              s.vx = Math.cos(m.a) * 19; s.vy = Math.sin(m.a) * 19; if (m.l % 2 == 0) m.iz.push([s.x, s.y, m.l]);
              if (uzak(s, e) < s.r + e.r + 6) { if (o.vur(e, 3 + 5 * (s.hafiza.iv || 0), naoyaKaynak(o, s), 12, 'yakin') > 0) vurusKaresi(o, e.x, e.y, .8, false); o.sars(5); m.bitti = 1; m.omur = m.l + 14; s.vx *= .3; s.vy *= .3; }
              else if (duvarda(s, o, s.r + 8)) { m.bitti = 1; m.omur = m.l + 14; } },
            ciz(c, m) { for (const [x, y, l] of m.iz) { const u = (m.l - l) / 16; if (u > 1) continue; filmKare(c, x, y, 54, 54, 0, .5 * (1 - u)); }
              const s = m.sahip; if (!m.bitti) { c.save(); c.strokeStyle = '#f4f1e6'; c.lineCap = 'round'; c.globalAlpha = .6;
                for (const k of [-12, 0, 12]) { const nx = -Math.sin(m.a) * k, ny = Math.cos(m.a) * k; c.lineWidth = k ? 1 : 2; c.beginPath(); c.moveTo(s.x + nx - Math.cos(m.a) * 30, s.y + ny - Math.sin(m.a) * 30); c.lineTo(s.x + nx - Math.cos(m.a) * 80, s.y + ny - Math.sin(m.a) * 80); c.stroke(); }
                c.restore(); } } });
        } },

      { ad: 'Zaman Hücresi Ay Sarayı', tek: true, ilk: 120, kosul: b => b.hp < b.mx * .45, // alan genişletme, 4 sn: içerideki beden 24 kareye uyamaz; yavaşı geçen hızı kadar hasar alır
        kullan(b, e, o) { b.hafiza.saray = o.t + 240; o.sars(6);
          o.ekle({ alt: true, sahip: b, x: 0, y: 0, omur: 240,
            adim(m, o) { const s = m.sahip, e = o.rakip(s); if (s.hp <= 0) { m.olu = 1; return; }
              if (m.l > 20 && m.l % 6 == 0) { const v = Math.hypot(e.vx, e.vy) - 2.5; if (v > 0) o.vur(e, .08 * v, naoyaKaynak(o, e), 0, 'alan'); } },
            ciz(c, m, o) { const son = Math.min(1, (m.omur - m.l) / 30), k = Math.min(1, m.l / 24), al = son * k;
              c.fillStyle = 'rgba(2,2,8,' + .55 * al + ')'; c.fillRect(0, 0, o.W, o.H);
              c.globalAlpha = .1 * al; c.fillStyle = '#e9e4d0'; c.beginPath(); c.arc(o.W * .5, o.H * .3, 74, 0, TAU_); c.fill(); c.globalAlpha = 1; // dolunay
              halka(c, o.W * .5, o.H * .3, 74, '#e9e4d0', 1.2, .3 * al);
              c.save(); c.strokeStyle = '#e9e4d0'; c.lineWidth = 1; c.globalAlpha = .05 * al; for (let x = 6; x < o.W; x += 66) c.strokeRect(x, 6, 60, o.H - 12); c.restore(); // film şeridi gibi dikey kareler
              yazi(c, '時胞月宮殿', o.W / 2, o.H * .62, 70, '#e9e4d0', .09 * al); } });
        } },
    ],
  },

  {
    ad: 'ISAGI', renk: '#2f62ff', can: 104, hiz: 1.05, tip: 'menzilli', menzil: 215, ucar: false, top: true,
    topVurdu(b) { b.hafiza.parca = Math.min(4, (b.hafiza.parca || 0) + 1); }, // her top isabeti bir yapboz parçası
    gorunum(c, b, o, bx, by) { // koyu lacivert dağınık saç, iri mavi gözler; Metavizyon/akış/ultide iris ağ desenli parlar, dişler sıkılı
      const fx = bx * 3, fy = by * 1.5, h = b.hafiza, meta = o.t < (h.meta || 0), ag = h.akis || meta || o.t < (h.ulti || 0);
      for (const s of [-1, 1]) { c.fillStyle = '#f3dcc6'; c.strokeStyle = '#c49a80'; c.lineWidth = .9; c.beginPath(); c.ellipse(s * 23.5, 3, 3.6, 5.4, s * .15, 0, TAU_); c.fill(); c.stroke(); }
      kafa(c, '#f5dfcb', () => { // Blue Lock forması: siyah, mavi şeritli yaka
        c.fillStyle = '#10131c'; c.beginPath(); c.moveTo(-24, 13); c.lineTo(-6, 18); c.lineTo(-4, 24); c.lineTo(-24, 24); c.fill(); c.beginPath(); c.moveTo(24, 13); c.lineTo(6, 18); c.lineTo(4, 24); c.lineTo(24, 24); c.fill();
        c.strokeStyle = '#2f62ff'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-22, 14.5); c.lineTo(-5.5, 19.5); c.moveTo(22, 14.5); c.lineTo(5.5, 19.5); c.stroke();
      });
      c.fillStyle = '#0c0d12'; c.beginPath(); c.arc(-25, 7, 1.4, 0, TAU_); c.fill(); c.fillStyle = '#9aa4c0'; c.beginPath(); c.arc(-25.4, 6.6, .45, 0, TAU_); c.fill(); // siyah küpe
      if (b.ez > 0) { aciGoz(c, fx, fy, '#141418'); aciAgiz(c, fx, fy); } else {
        for (const s of [-1, 1]) { const x = s * 8.5 + fx, y = -.5 + fy;
          if (meta) { c.save(); c.beginPath(); c.arc(0, 0, 24, 0, TAU_); c.clip(); const gg = c.createRadialGradient(x + s * 3, y, 0, x + s * 3, y, 20); // gözün çevresi koyu mavi gölgeye düşer, çatlaklar üstünde parlar
              gg.addColorStop(0, 'rgba(8,18,60,.75)'); gg.addColorStop(1, 'rgba(8,18,60,0)'); c.fillStyle = gg; c.fillRect(-24, -24, 48, 48); c.restore();
            yapbozCatlak(c, x, y, eo_((240 - h.meta + o.t) / 40), s); o.isik(c, x, y, 9, '#5fd0ff', .7); }
          else if (ag) o.isik(c, x, y, 10, '#4a7cff', .6);
          goz(c, x, y, s, bx, by, meta ? { iris: '#7fdcff', koyu: '#1650c8', iri: 3.5, acik: 1.15, egim: .35, duz: .3, ag: true, parlak: 0, kalin: 1.2, kirpik: '#0a1a3a' } : ag ? { iris: '#2f62ff', koyu: '#081038', iri: 3.3, acik: 1.12, egim: .3, duz: .3, ag: true, parlak: 0, kalin: 1.15 }
            : { iris: '#3a6ee8', koyu: '#0c1a48', iri: 3, acik: 1.02, egim: .12, duz: .35, parlak: 1.1 });
          kas(c, x, y - 6.6, s, ag ? 1.4 : .6, '#151a2a', 1.8); }
        if (ag) { c.fillStyle = '#3a1418'; c.beginPath(); c.roundRect(-5.5 + fx, 10 + fy, 11, 4.6, 1.6); c.fill(); c.fillStyle = '#f6f4f0'; c.beginPath(); c.roundRect(-5 + fx, 10.5 + fy, 10, 3.6, 1.2); c.fill(); // sıkılı dişler
          c.strokeStyle = '#7a5050'; c.lineWidth = .5; c.beginPath(); c.moveTo(-5 + fx, 12.3 + fy); c.lineTo(5 + fx, 12.3 + fy); for (const x of [-2.5, 0, 2.5]) { c.moveTo(x + fx, 10.6 + fy); c.lineTo(x + fx, 14 + fy); } c.stroke(); }
        else { c.strokeStyle = '#7a3e3e'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-3.2 + fx, 12.6 + fy); c.quadraticCurveTo(fx, 11.6 + fy, 3.2 + fx, 12.6 + fy); c.stroke(); } // kararlı düz ağız
        if (ag || b.hp < b.mx * .5) { const x = -16 + fx, y = 2 + fy; c.fillStyle = 'rgba(205,228,255,.9)'; c.strokeStyle = '#8aa0c8'; c.lineWidth = .5; // ter damlası
          c.beginPath(); c.moveTo(x, y - 3.4); c.quadraticCurveTo(x + 2.2, y + 1.2, x, y + 2.4); c.quadraticCurveTo(x - 2.2, y + 1.2, x, y - 3.4); c.fill(); c.stroke(); }
      }
      if (meta) { c.save(); c.shadowColor = '#7fd0ff'; c.shadowBlur = 12; // Metavizyonda saç beyaz-mavi parlar
        sacCiz(c, ISAGI_SAC, o.t, '#a9c4f0', '#f2f8ff', 'rgba(40,80,170,.45)', ISAGI_TEL); c.restore();
        if (b.ez <= 0) { c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = '#bfe8ff'; c.lineCap = 'round'; // iki gözden yana uzanan ışık çizgileri
          for (const s of [-1, 1]) { const x = s * 8.5 + fx, y = -.5 + fy;
            for (const [dy, L, w] of [[-1.5, 30, 1], [0, 40, 1.4], [1.6, 26, .8]]) { c.globalAlpha = .7; c.lineWidth = w; c.beginPath(); c.moveTo(x + s * 4, y + dy * .4); c.lineTo(x + s * L, y + dy * 2 - 2); c.stroke(); } }
          c.restore(); } }
      else sacCiz(c, ISAGI_SAC, o.t, '#1b2134', '#46557e', 'rgba(0,0,12,.5)', ISAGI_TEL);
      c.strokeStyle = 'rgba(170,190,255,.35)'; c.lineWidth = 1.4; c.lineCap = 'round'; for (const [a0, a1] of [[1.3, 1.38], [1.46, 1.52], [1.6, 1.64]]) { c.beginPath(); c.arc(-1, -3, 28, Math.PI * a0, Math.PI * a1); c.stroke(); } // tepedeki parlama
    },
    skiller: [
      { ad: 'Akış', // pasif: top maç başında yanında doğar. Canı %30 altında akışa girer: gözler ağ desenli parlar, hızlanır, top ona daha hızlı gelir, şutları sertleşir.
        pasif(b, e, o) { futbol(o, b); const h = b.hafiza; h.akis = b.hp < b.mx * .3; b.hizx = h.akis ? 1.15 : 1;
          if (h.akis && !o.sim && o.t % 3 == 0) o.tane({ x: b.x + rnd(-b.r, b.r), y: b.y + rnd(0, b.r), vy: -rnd(1, 2), renk: rnd(0, 1) < .5 ? '#8fb0ff' : '#fff', m: 26, s: 1.6 }); },
        hasarAl(b, d, { kaynak, tur }, o) { // Metavizyon açıkken saldırıyı önceden görür: alan dışı vuruşlardan %30 sıyrılır
          if (o.t < (b.hafiza.meta || 0) && tur != 'alan' && Math.random() < .3 * (kaynak?.kesin ? .6 : 1)) {
            if (!o.sim) o.ekle({ x: b.x, y: b.y, omur: 16, ciz(c, m) { const u = m.l / 16; halka(c, m.x, m.y, b.r + 4 + 14 * u, '#cfe0ff', 1.5, 1 - u); c.globalAlpha = .3 * (1 - u); c.fillStyle = '#2f62ff'; c.beginPath(); c.arc(m.x - 10 * u, m.y, b.r, 0, TAU_); c.fill(); c.globalAlpha = 1; } });
            return 0; }
          return d; },
        ciz(c, b, o) { const h = b.hafiza, e = o.rakip(b);
          if (o.t < (h.meta || 0) && b.ez <= 0) { const a = yonu(b, e), k = b.r / 24, gy = b.y + (-.5 + Math.sin(a) * 1.5) * k; // iki parlayan gözün arkasında kalan ışık izi
            if (h.gT !== o.t) { h.gT = o.t; (h.gIz ??= []).push([-1, 1].map(s => [b.x + (s * 8.5 + Math.cos(a) * 3) * k, gy])); if (h.gIz.length > 12) h.gIz.shift(); }
            c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; const P = h.gIz;
            for (const j of [0, 1]) for (let i = 1; i < P.length; i++) { const f = i / P.length; c.strokeStyle = '#5fd0ff'; c.globalAlpha = .5 * f; c.lineWidth = 6 * f; c.beginPath(); c.moveTo(...P[i - 1][j]); c.lineTo(...P[i][j]); c.stroke(); c.strokeStyle = '#fff'; c.globalAlpha = .8 * f; c.lineWidth = 1.6 * f; c.stroke(); }
            c.restore(); } else if (h.gIz) h.gIz.length = 0;
          if (h.akis) { c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; o.isik(c, b.x, b.y, b.r * 2.4, '#2f62ff', .3); // akış: kafayı saran mavi-beyaz akıntılar
            for (let i = 0; i < 4; i++) { const a = o.t * .07 + i * TAU_ / 4; c.strokeStyle = i % 2 ? '#fff' : '#7fa4ff'; c.globalAlpha = .55; c.lineWidth = 1.6; c.beginPath(); c.arc(b.x, b.y, b.r + 7 + i % 2 * 3, a, a + 1.1); c.stroke(); }
            c.restore(); }
          if (h.ulti == null && h.parca && e.hp > 0) for (let i = 0; i < h.parca; i++) { const a = -Math.PI * .75 + i * Math.PI / 2, r = e.r + 11; // rakibin halkasında toplanan yapboz parçaları
            yapboz(c, e.x + Math.cos(a) * r, e.y + Math.sin(a) * r, 4.2, a + Math.PI / 4, 'rgba(232,240,255,.95)', '#2f62ff', h.parca >= 4 ? .7 + .3 * Math.sin(o.t * .3) : .9, 1); } } },

      { ad: 'Direkt Şut', isabet: 'normal', bekleme: 80, ilk: 50, kosul: (b, e, o) => { const t = futbol(o, b); return !t.atis && uzak(t, b) < b.r + t.r + 24 && uzak(b, e) > 70; }, // top ayağının dibindeyse rakibin gideceği yere sert şut
        kullan(b, e, o) { const t = futbol(o, b), v = o.t < (b.hafiza.meta || 0) ? 20 : 17; sut(o, t, onden(t, e, v), v, 8 * isagiCarpan(b, o), 7, { guc: 1, gudum: .08, atan: b }); },
        demo(b, e, o) { const t = futbol(o, b); t.x = b.x + b.r + t.r + 2; t.y = b.y; t.vx = t.vy = 0; t.atis = null; } },

      { ad: 'Omuz Mücadelesi', isabet: 'guvenilir', bekleme: 105, ilk: 90, kosul: (b, e, o) => uzak(b, e) < b.r + e.r + 34 && uzak(futbol(o, b), b) > 60, // top uzaktayken gövdeyle dalar
        kullan(b, e, o) {
          o.ekle({ sahip: b, x: 0, y: 0, omur: 14, a: yonu(b, e), iz: [],
            adim(m, o) { const s = m.sahip, e = o.rakip(s); if (m.bitti) return; s.vx = Math.cos(m.a) * 13; s.vy = Math.sin(m.a) * 13; m.iz.push([s.x, s.y, m.l]);
              if (uzak(s, e) < s.r + e.r + 5) { o.vur(e, 5, { x: s.x, y: s.y, renk: '#2f62ff', vurFx: (x, y) => { darbeFx(o, x, y, 1.2); o.dur = Math.max(o.dur, 6); } }, 13, 'yakin'); o.sars(6); m.bitti = 1; m.omur = m.l + 12; s.vx *= -.3; s.vy *= -.3; } },
            ciz(c, m) { const s = m.sahip; for (const [x, y, l] of m.iz) { const u = (m.l - l) / 10; if (u > 1) continue; c.globalAlpha = .35 * (1 - u); c.fillStyle = '#2f62ff'; c.beginPath(); c.arc(x, y, s.r, 0, TAU_); c.fill(); } c.globalAlpha = 1; } });
        },
        demo(b, e, o) { const t = futbol(o, b); t.x = 30; t.y = 40; t.vx = t.vy = 0; t.atis = null; } },

      { ad: 'Topsuz Koşu', isabet: 'normal', bekleme: 220, ilk: 140, kosul: (b, e, o) => { const t = futbol(o, b), d = uzak(t, b); return !t.atis && d > 100 && d < 320 && uzak(t, e) > 60; }, // boşluğa koşar, ilk dokunuşta vole
        kullan(b, e, o) { const t = futbol(o, b);
          o.ekle({ sahip: b, top: t, x: 0, y: 0, omur: 30, iz: [],
            adim(m, o) { const s = m.sahip, t = m.top, e = o.rakip(s); if (m.bitti) return; const a = Math.atan2(t.y + t.vy * 4 - s.y, t.x + t.vx * 4 - s.x);
              s.vx = Math.cos(a) * 16; s.vy = Math.sin(a) * 16; if (m.l % 2 == 0) m.iz.push([s.x, s.y, m.l]);
              if (uzak(s, t) < s.r + t.r + 14) { const v = o.t < (s.hafiza.meta || 0) ? 19 : 17; m.vp = [t.x, t.y, Math.atan2(e.y - t.y, e.x - t.x)];
                sut(o, t, onden(t, e, v), v, 8 * isagiCarpan(s, o), 8, { guc: 1.3, gudum: .08, atan: s }); m.bitti = 1; m.vl = m.l; m.omur = m.l + 16; s.vx *= .3; s.vy *= .3; } },
            ciz(c, m) { const s = m.sahip;
              for (const [x, y, l] of m.iz) { const u = (m.l - l) / 12; if (u > 1) continue; c.globalAlpha = .4 * (1 - u); c.fillStyle = '#2f62ff'; c.beginPath(); c.arc(x, y, s.r * (1 - u * .3), 0, TAU_); c.fill(); }
              c.globalAlpha = 1;
              if (m.vp) { const u = (m.l - m.vl) / 16, [x, y, a] = m.vp; c.save(); c.strokeStyle = '#fff'; c.lineCap = 'round'; c.globalAlpha = 1 - u; // vole yayı
                c.lineWidth = 5 * (1 - u) + 1; c.beginPath(); c.arc(x, y, 22 + 14 * u, a - Math.PI * .9, a - Math.PI * .1); c.stroke();
                c.strokeStyle = '#7fa4ff'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 30 + 18 * u, a - Math.PI * .8, a - Math.PI * .2); c.stroke(); c.restore(); } } });
        },
        demo(b, e, o) { const t = futbol(o, b); t.x = b.x; t.y = b.y - 160; t.vx = t.vy = 0; t.atis = null; } },

      { ad: 'Metavizyon', bekleme: 840, ilk: 280, kosul: (b, e, o) => o.t >= (b.hafiza.ulti || 0), // destek, 4 sn: arenada dev göz açılır; şutlar hızlanır ve sertleşir, top daha hızlı gelir, saldırılardan sıyrılır
        kullan(b, e, o) { b.hafiza.meta = o.t + 240; o.sars(4);
          o.ekle({ alt: true, sahip: b, x: 0, y: 0, omur: 240, odak: Array.from({ length: 48 }, () => [rnd(0, TAU_), rnd(.4, 1)]),
            adim(m) { if (m.sahip.hp <= 0) m.olu = 1; },
            ciz(c, m, o) { const s = m.sahip, e = o.rakip(s), t = o.nes.find(n => n.futbol), son = Math.min(1, (m.omur - m.l) / 24), al = Math.min(1, m.l / 10) * son, ac = eo_(m.l / 22, 3) * Math.min(1, (m.omur - m.l) / 18);
              const ex = o.W / 2, ey = o.H * .42, hx = t ? t.x : e.x, hy = t ? t.y : e.y;
              c.fillStyle = 'rgba(0,3,16,' + .62 * al + ')'; c.fillRect(0, 0, o.W, o.H);
              for (let y = 30; y < o.H; y += 48) for (let x = 30; x < o.W; x += 48) yapboz(c, x, y, 24, 0, null, '#5a7cff', .07 * al, 1); // arenayı saran yapboz ızgarası
              c.save(); c.strokeStyle = '#cfe0ff'; c.lineWidth = 1; const tit = (o.t >> 2) % 3; // göze odaklanan manga hız çizgileri
              for (let i = 0; i < m.odak.length; i++) { if (i % 3 == tit) continue; const [a, k] = m.odak[i]; c.globalAlpha = .1 * al * k; c.beginPath(); c.moveTo(ex + Math.cos(a) * 165, ey + Math.sin(a) * 70); c.lineTo(ex + Math.cos(a) * (200 + 200 * k), ey + Math.sin(a) * (90 + 150 * k)); c.stroke(); }
              c.restore();
              o.isik(c, ex, ey, 190, '#2f62ff', .35 * al);
              metaGoz(c, ex, ey, 150, ac, o.t, kis((hx - ex) / 220, -1, 1), kis((hy - ey) / 140, -1, 1), al);
              if (t && e.hp > 0) { const px = e.x + e.vx * 18, py = e.y + e.vy * 18; c.save(); c.strokeStyle = '#cfe0ff'; c.lineWidth = 1.2; // taktik çizgileri: oyuncu → top → rakibin varacağı yer
                c.setLineDash([2, 5]); c.globalAlpha = .45 * al; c.beginPath(); c.moveTo(s.x, s.y); c.lineTo(t.x, t.y); c.stroke();
                c.setLineDash([7, 6]); c.lineDashOffset = -o.t; c.globalAlpha = .6 * al; c.beginPath(); c.moveTo(t.x, t.y); c.lineTo(px, py); c.stroke(); c.setLineDash([]);
                const r = e.r + 9 + Math.sin(o.t * .2) * 2; halka(c, px, py, r, '#cfe0ff', 1.3, .7 * al); c.globalAlpha = .7 * al; c.beginPath();
                for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; c.moveTo(px + Math.cos(a) * (r - 4), py + Math.sin(a) * (r - 4)); c.lineTo(px + Math.cos(a) * (r + 6), py + Math.sin(a) * (r + 6)); } c.stroke(); c.restore(); } } });
        } },

      { ad: 'Gol Formülü', tek: true, ilk: 0, kosul: (b, e) => (b.hafiza.parca || 0) >= 4 && !e.dokunulmaz, // dört yapboz parçası tamamlanınca: rakip kilitlenir, top ayağına gelir, ağ desenli gözlerle güdümlü vole
        kullan(b, e, o) { const h = b.hafiza, t = futbol(o, b); h.parca = 0; h.ulti = o.t + 110; e.don = Math.max(e.don, 44); o.sars(5);
          o.ekle({ sahip: b, hedef: e, top: t, x: 0, y: 0, omur: 110, kose: [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([dx, dy]) => ({ x0: kis(e.x + dx * 200, 20, o.W - 20), y0: kis(e.y + dy * 160, 20, o.H - 20), dx, dy })),
            adim(m, o) { const s = m.sahip, e = m.hedef, t = m.top; if (s.hp <= 0) { m.olu = 1; return; }
              t.kilit = m.l < 40; if (t.kilit) t.sahip = s; // çağrılan top yolda çalınamaz
              if (m.l < 40) { const px = s.x + (e.x > s.x ? 1 : -1) * (s.r + t.r + 1), py = s.y + 6; t.atis = null; // top arenadan ayağına çağrılır
                t.vx += (px - t.x) * .12 - t.vx * .25; t.vy += (py - t.y) * .12 - t.vy * .25; s.vx *= .85; s.vy *= .85; }
              if (m.l == 24) { o.sars(5); darbeFx(o, e.x, e.y, 1.3); } // klik: parçalar oturur
              if (m.l == 40) { yapbozSac(o, e.x, e.y, 10, 6, 9);
                sut(o, t, yonu(t, e), 22, 16, 16, { guc: 2.2, gudum: .25, atan: s, son: (n, f, o) => { o.sars(10); vurusKaresi(o, f.x, f.y, 2.6); o.duvarVur(kis(f.x + n.vx * 30, 0, o.W), kis(f.y + n.vy * 30, 0, o.H), '#cfe0ff', 3); darbeFx(o, f.x, f.y, 2.2); yapbozSac(o, f.x, f.y, 18, 8, 7); } }); } },
            ciz(c, m, o) { const e = m.hedef;
              if (m.l < 40) { const k = eo_(m.l / 24, 3); o.isik(c, e.x, e.y, 60 + 30 * k, '#2f62ff', .5 * k);
                for (const p of m.kose) { const tx = e.x + p.dx * 15, ty = e.y + p.dy * 15;
                  yapboz(c, p.x0 + (tx - p.x0) * k, p.y0 + (ty - p.y0) * k, 15, (1 - k) * p.dx * 3, 'rgba(225,235,255,.9)', '#2f62ff', Math.min(1, m.l / 6), 2); }
                if (m.l >= 24) { const f = 1 - (m.l - 24) / 16; halka(c, e.x, e.y, 30 + (m.l - 24) * 3, '#fff', 3 * f, f); } }
              if (m.l > 20 && m.l < 56) { const u = (m.l - 20) / 36, gir = eo_(u * 4, 3), al = u > .8 ? (1 - u) / .2 : 1, bw = 380, bh = 78, cx = o.W / 2 - (1 - gir) * 420, cy = o.H * .2; // ara sahne: iki ağ desenli göz
                c.save(); c.globalAlpha = al; c.beginPath(); c.rect(cx - bw / 2, cy - bh / 2, bw, bh); c.fillStyle = 'rgba(2,6,26,.95)'; c.fill(); c.save(); c.clip();
                c.strokeStyle = 'rgba(160,190,255,.25)'; c.lineWidth = 1; c.beginPath(); for (let i = 0; i < 14; i++) { const y = cy - bh / 2 + (i * 37 % bh), x = cx - bw / 2 + ((i * 97 + m.l * 24) % (bw + 120)) - 60; c.moveTo(x, y); c.lineTo(x + 50, y); } c.stroke();
                for (const s of [-1, 1]) metaGoz(c, cx + s * 84, cy + 8, 58, 1, o.t, 0, 0, al, s, .92);
                c.fillStyle = '#1b2134'; c.strokeStyle = '#46557e'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(cx - bw / 2, cy - bh / 2); // perçemler gözlerin üstüne düşer
                for (const [x, y] of [[-170, -12], [-150, -34], [-125, -10], [-100, -36], [-60, -16], [-30, -36], [-6, 26], [6, -36], [36, -14], [70, -36], [110, -8], [135, -34], [160, -14], [190, -39]]) c.lineTo(cx + x, cy + y);
                c.lineTo(cx + bw / 2, cy - bh / 2); c.closePath(); c.fill(); c.stroke(); c.restore();
                c.strokeStyle = '#e8eeff'; c.lineWidth = 2; c.beginPath(); c.moveTo(cx - bw / 2, cy - bh / 2); c.lineTo(cx + bw / 2, cy - bh / 2); c.moveTo(cx - bw / 2, cy + bh / 2); c.lineTo(cx + bw / 2, cy + bh / 2); c.stroke(); c.restore(); } } });
        },
        demo(b, e, o) { b.hafiza.parca = 4; b.hafiza.ulti = null; const t = futbol(o, b); t.x = 40; t.y = o.H - 40; } },
    ],
  },
  {
    ad: 'PEELY', renk: '#ffd93a', can: 104, hiz: 1.05, tip: 'menzilli', menzil: 240, ucar: false,
    gorunum(c, b, o, bx, by) { // Fortnite muzu: armut gövde, tepede kesik kahverengi sap, yanlarda soyulmuş kabuk, parlak koyu nokta gözler, küçük gülümseme
      const fx = bx * 2.2, fy = by * 1.2;
      if (o.bitti && o.kazanan === b) { const t = performance.now() / 1000; c.translate(0, -Math.abs(Math.sin(t * 7)) * 5); c.rotate(Math.sin(t * 7) * .2); } // zafer dansı
      c.lineJoin = c.lineCap = 'round';
      const kabuk = (P, ic) => { c.beginPath(); c.moveTo(...P[0]); c.bezierCurveTo(...P[1]); c.bezierCurveTo(...P[2]); c.closePath();
        const g = c.createLinearGradient(P[0][0], P[0][1], P[1][4], P[1][5]); g.addColorStop(0, '#f3c21c'); g.addColorStop(1, ic); c.fillStyle = g; c.fill(); c.strokeStyle = 'rgba(120,80,0,.55)'; c.lineWidth = 1; c.stroke(); };
      kabuk([[-9, -19], [-13, -25, -16, -33, -13, -41], [-9, -33, -6, -27, -4, -21]], '#fbe9a0'); // sol kabuk yukarı kalkık
      const muz = () => { c.beginPath(); c.moveTo(-8, -29); c.bezierCurveTo(-12, -17, -25, -7, -24, 6); c.bezierCurveTo(-23, 24, 23, 24, 24, 6); c.bezierCurveTo(25, -7, 12, -17, 8, -29); c.closePath(); };
      const gr = c.createLinearGradient(0, -30, 0, 22); gr.addColorStop(0, '#f2bd14'); gr.addColorStop(.45, '#f7d63a'); gr.addColorStop(1, '#c9de3a');
      muz(); c.fillStyle = gr; c.fill(); c.save(); c.clip();
      const gl = c.createRadialGradient(-7, -6, 2, -4, 0, 30); gl.addColorStop(0, 'rgba(255,255,220,.55)'); gl.addColorStop(.5, 'rgba(255,255,200,0)'); gl.addColorStop(1, 'rgba(140,100,0,.35)'); c.fillStyle = gl; c.fillRect(-26, -32, 52, 56); // yumuşak 3B ışık, kenarlar koyu
      c.restore(); muz(); c.strokeStyle = 'rgba(110,80,0,.6)'; c.lineWidth = 1.1; c.stroke();
      c.fillStyle = '#5e3416'; c.beginPath(); c.moveTo(-8, -29); c.lineTo(-7.5, -35); c.bezierCurveTo(-4, -37.5, 4, -37.5, 7.5, -35); c.lineTo(8, -29); c.bezierCurveTo(4, -27.4, -4, -27.4, -8, -29); c.fill(); // kesik sap
      c.fillStyle = '#7d4a22'; c.beginPath(); c.ellipse(0, -35.4, 7.6, 2, 0, 0, TAU_); c.fill(); c.fillStyle = 'rgba(255,220,170,.25)'; c.fillRect(-5, -33.5, 3, 4);
      kabuk([[12, -16], [19, -18, 22, -12, 21, -2], [17, -8, 15, -12, 10, -12]], '#fff0b0'); // sağ kabuk aşağı sarkık
      if (b.ez > 0) { c.strokeStyle = '#2a1608'; c.lineWidth = 2; for (const s of [-1, 1]) { const x = s * 9 + fx, y = -1 + fy; c.beginPath(); c.moveTo(x - s * 3.5, y - 3); c.lineTo(x + s * 2.5, y); c.lineTo(x - s * 3.5, y + 3); c.stroke(); } // sımsıkı kapalı gözler
        c.fillStyle = '#3a1a0a'; c.beginPath(); c.ellipse(fx, 8 + fy, 2.6, 3.2, 0, 0, TAU_); c.fill(); return; }
      for (const s of [-1, 1]) { const x = s * 9 + fx, y = -1 + fy; // parlak koyu nokta göz
        const g = c.createRadialGradient(x - 1, y - 1.5, .5, x, y, 4.6); g.addColorStop(0, '#5a2c12'); g.addColorStop(1, '#140804'); c.fillStyle = g;
        c.beginPath(); c.ellipse(x, y, 3.7, 4.4, 0, 0, TAU_); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(x - 1.2 + bx * .6, y - 1.7, 1.1, 0, TAU_); c.fill(); c.globalAlpha = .7; c.beginPath(); c.arc(x + 1.3, y + 1.5, .5, 0, TAU_); c.fill(); c.globalAlpha = 1; }
      c.fillStyle = '#3a1a0a'; c.beginPath(); c.moveTo(-3 + fx, 6.5 + fy); c.quadraticCurveTo(fx, 7.6 + fy, 3 + fx, 6.5 + fy); c.quadraticCurveTo(fx, 11 + fy, -3 + fx, 6.5 + fy); c.fill(); // küçük gülümseme
    },
    skiller: [
      { ad: 'Envanter', // pasif: elindeki silahı gösterir; malzeme (tahta) zamanla ve kazmayla dolar; duvar ve kalkan candan önce hasarı yer
        pasif(b) { const h = b.hafiza; h.mat ??= 30; if ((h.mt = (h.mt || 0) + 1) % 45 == 0) h.mat = Math.min(50, h.mat + 2); },
        hasarAl(b, d, { kaynak, tur }, o) { const h = b.hafiza;
          if (kaynak && !kaynak.futbol && tur != 'alan') for (const w of o.nes) if (w.fnDuvar && w.sahip === b && !w.kirik && w.l >= 8 && fnKesisir(kaynak, b, w)) { if (kaynak.delici) { fnDuvarHasar(o, w, w.hp); break; } fnDuvarHasar(o, w, d); return 0; } // delici ışın (Choso) duvarı parçalayıp geçer
          if (h.kalkan > 0) { const k = Math.min(h.kalkan, d); h.kalkan -= k; d -= k; if (!o.sim) { o.parca(b.x, b.y, ['#7fd0ff', '#fff'], 4, 2.5, 14, 1.6); if (h.kalkan <= 0) kalkanKir(o, b); } }
          if (d > 0) { h.vurul = o.t; if (kaynak) h.vk = { x: kaynak.x, y: kaynak.y }; } return d; },
        ciz(c, b, o) { const h = b.hafiza, e = o.rakip(b);
          if (h.kalkan > 0) { c.save(); c.lineCap = 'butt'; c.lineWidth = 3; c.strokeStyle = '#3aa8ff'; const n = 5, k = h.kalkan / 20; // bölmeli kalkan çubuğu, can halkasının dışında
            for (let i = 0; i < n; i++) { const f = kis(k * n - i, 0, 1); if (f <= 0) break; const a0 = -Math.PI / 2 + i * TAU_ / n + .06; c.beginPath(); c.arc(b.x, b.y, b.r + 8, a0, a0 + (TAU_ / n - .12) * f); c.stroke(); } c.restore(); }
          if (b.hp <= 0) return; const d = uzak(b, e), t = o.t < (h.silahT || 0) ? h.silah : d < 130 ? 'pompa' : d < 260 ? 'scar' : 'sniper';
          if (t == 'kazma') return;
          if (t == 'iksir') { iksirCiz(c, b.x + 18, b.y + 8, -.9 - .5 * Math.sin(o.t * .15), h.icDolu ?? 1); return; }
          const a = h.nisan ?? yonu(b, e), g = Math.max(0, 1 - (o.t - (h.geri ?? -99)) / 8) * 6, R = b.r + 12 - g, x = b.x + Math.cos(a) * R, y = b.y + Math.sin(a) * R + 3;
          o.isik(c, x + Math.cos(a) * 10, y + Math.sin(a) * 10, 20, FN_NADIR[t], .22); silahCiz(c, t, x, y, a); } },

      { ad: 'Kazma', isabet: 'guvenilir', bekleme: 55, ilk: 30, kosul: (b, e) => uzak(b, e) < b.r + e.r + 28, // klasik kazma; vuruş tahta (malzeme) kazandırır
        kullan(b, e, o) { const a = yonu(b, e), h = b.hafiza; h.silah = 'kazma'; h.silahT = o.t + 16;
          if (o.vur(e, 2.5, fnKaynak(o, b.x, b.y), 4, 'yakin') > 0) h.mat = Math.min(50, (h.mat ?? 30) + 10);
          o.ekle({ sahip: b, x: 0, y: 0, omur: 14, a,
            ciz(c, m) { const s = m.sahip, u = m.l / m.omur, aa = m.a - 1.4 + 2.6 * eo_(Math.min(1, u * 1.8), 3);
              c.save(); c.globalAlpha = .6 * (1 - u); c.strokeStyle = '#fff'; c.lineWidth = 4 * (1 - u) + 1; c.lineCap = 'round'; c.beginPath(); c.arc(s.x, s.y, s.r + 38, Math.max(m.a - 1.4, aa - 1.2), aa); c.stroke(); c.restore();
              silahCiz(c, 'kazma', s.x + Math.cos(aa) * (s.r + 2), s.y + Math.sin(aa) * (s.r + 2), aa); } });
        } },

      { ad: 'SCAR', isabet: 'guvenilir', bekleme: 112, ilk: 50, kosul: (b, e) => { const d = uzak(b, e); return d > 90 && d < 400; }, // altın SCAR: dört mermilik seri, hafif saçılma; seriden en az biri neredeyse hep tutar, temel silah
        kullan(b, e, o) { b.hafiza.silah = 'scar'; b.hafiza.silahT = o.t + 60;
          o.ekle({ sahip: b, x: 0, y: 0, omur: 20,
            adim(m, o) { const s = m.sahip, e = o.rakip(s); if (m.l % 5 != 1 || s.don > 0 || s.hp <= 0) return;
              const a = yonu(s, e) + rnd(-.07, .07), r = fnIsin(o, s, a); s.hafiza.geri = o.t; fnIz(o, r, '#fff2b0', 1.8, 7); fnAgiz(o, r.x0, r.y0, a, .7);
              if (r.vur) o.vur(e, 1.2, fnKaynak(o, s.x, s.y), 1.5, 'menzil'); else if (!o.sim) o.duvarVur(r.x1, r.y1, '#ffe27a', .3); } });
        } },

      { ad: 'Pompalı', isabet: 'guvenilir', bekleme: 160, ilk: 70, kosul: (b, e, o) => uzak(b, e) < b.r + e.r + 75 || o.nes.some(n => n.kopek && n.p == null && uzak(n, b) < 80), // dibe gelene saçma: yakında sert, uzaklaştıkça zayıf; Peely geri teper. Üstüne gelen gölge köpeklerini de vurur
        kullan(b, e, o) { const h = b.hafiza, kp = o.nes.filter(n => n.kopek && n.p == null && uzak(n, b) < 130), yakin = uzak(b, e) < b.r + e.r + 75;
          for (const n of kp) { n.p = n.l; n.omur = n.l + 12; } // vurulan köpek gölgesine geri batar
          const a = yonu(b, yakin || !kp.length ? e : kp[0]), d = yakin ? uzak(b, e) - b.r - e.r : 75, hs = 6 - 3 * kis(d / 75, 0, 1); h.silah = 'pompa'; h.silahT = o.t + 70; h.geri = o.t;
          const x0 = b.x + Math.cos(a) * (b.r + 58), y0 = b.y + Math.sin(a) * (b.r + 58), v = yakin ? o.vur(e, hs, fnKaynak(o, b.x, b.y), 0, 'menzil') : 0;
          b.vx -= Math.cos(a) * 3; b.vy -= Math.sin(a) * 3;
          if (!o.sim) { o.sars(3); fnAgiz(o, x0, y0, a, 1.6); const L = Math.min(150, d + 70);
            for (let i = 0; i < 9; i++) { const q = a + rnd(-.3, .3), l = L * rnd(.7, 1); fnIz(o, { x0, y0, x1: x0 + Math.cos(q) * l, y1: y0 + Math.sin(q) * l }, i % 3 ? '#ffe9a0' : '#fff', 1.4, 8); }
            if (v >= 5.5) vurusKaresi(o, e.x, e.y, .9, false); }
        } },

      { ad: 'Keskin Nişancı', isabet: 'nadir', bekleme: 420, ilk: 220, kosul: (b, e) => uzak(b, e) > 210, // kırmızı lazerle nişan, tek atış; nişan ateşten 11 tick önce kilitlenir, kaçan kurtulur
        kullan(b, e, o) { b.hafiza.silah = 'sniper'; b.hafiza.silahT = o.t + 60;
          o.ekle({ sahip: b, x: 0, y: 0, omur: 52, a: yonu(b, e),
            adim(m, o) { const s = m.sahip, e = o.rakip(s); if (s.hp <= 0) { m.olu = 1; s.hafiza.nisan = null; return; }
              if (m.l < 32) { s.vx *= .9; s.vy *= .9; if (m.l <= 21) m.a = yonu(s, e); s.hafiza.nisan = m.a; s.hafiza.silahT = o.t + 40; return; }
              if (m.l == 32) { const r = m.r = fnIsin(o, s, m.a, 2); s.hafiza.geri = o.t; s.vx -= Math.cos(m.a) * 4; s.vy -= Math.sin(m.a) * 4;
                if (!o.sim) { o.sars(5); fnAgiz(o, r.x0, r.y0, m.a, 1.4); }
                if (r.vur) { if (o.vur(e, 13, fnKaynak(o, s.x, s.y), 9, 'menzil') > 0) vurusKaresi(o, e.x, e.y, 1.5); } else o.duvarVur(r.x1, r.y1, '#c07bff', 1.5); }
              if (m.l == 40) s.hafiza.nisan = null; },
            ciz(c, m, o) { const s = m.sahip;
              if (m.l < 32) { const r = fnIsin(o, s, m.a, 2), kil = m.l > 21, al = kil ? (m.l % 4 < 2 ? 1 : .4) : .25 + .5 * m.l / 21; // lazer; kilitlenince yanıp söner
                c.save(); c.strokeStyle = '#ff2a3a'; c.globalAlpha = al; c.lineWidth = kil ? 1.4 : .9; c.beginPath(); c.moveTo(r.x0, r.y0); c.lineTo(r.x1, r.y1); c.stroke();
                c.fillStyle = '#ff2a3a'; c.beginPath(); c.arc(r.x1, r.y1, 2.4, 0, TAU_); c.fill(); c.restore(); o.isik(c, r.x1, r.y1, 9, '#ff2a3a', al * .6); return; }
              const u = (m.l - 32) / 20, r = m.r; if (!r) return; c.save(); c.lineCap = 'round'; // atış izi: kalın beyaz çizgi, mor kenar, söner
              c.globalAlpha = 1 - u; c.strokeStyle = '#b35cff'; c.lineWidth = 6 * (1 - u) + 1; c.beginPath(); c.moveTo(r.x0, r.y0); c.lineTo(r.x1, r.y1); c.stroke();
              c.strokeStyle = '#fff'; c.lineWidth = 2.2 * (1 - u) + .4; c.stroke(); c.restore(); } });
        } },

      { ad: 'İnşa', bekleme: 140, ilk: 80, kosul: (b, e, o) => (b.hafiza.mat ?? 30) >= 10 && !o.nes.some(n => n.fnDuvar && n.sahip === b && !n.kirik) && (uzak(b, e) < 150 || o.t - (b.hafiza.vurul ?? -99) < 15), // yaklaşana ya da vurulunca araya duvar
        kullan(b, e, o) { const h = b.hafiza; h.mat -= 10; fnDuvarKur(o, b, o.t - (h.vurul ?? -99) < 15 && h.vk ? h.vk : e); } },

      { ad: 'Kalkan İksiri', tek: true, ilk: 120, kosul: (b, e) => b.hp < b.mx * .5 && uzak(b, e) > 120, // büyük kalkan iksiri: 1 sn durup içer, 20 kalkan
        kullan(b, e, o) { const h = b.hafiza; h.silah = 'iksir'; h.silahT = o.t + 60; h.icDolu = 1;
          o.ekle({ sahip: b, x: 0, y: 0, omur: 64,
            adim(m, o) { const s = m.sahip, h = s.hafiza; if (s.hp <= 0) { m.olu = 1; return; } if (m.l <= 54) { s.vx *= .92; h.icDolu = 1 - m.l / 54; }
              if (m.l == 54) { h.kalkan = 20; if (!o.sim) { o.parca(s.x, s.y, ['#7fd0ff', '#2f9bff', '#fff'], 18, 3, 30, 2); o.sars(2); } }
              if (!o.sim && m.l < 54 && m.l % 4 == 0) o.tane({ x: s.x + 15 + rnd(-4, 4), y: s.y + 2, vy: -rnd(.6, 1.4), vx: rnd(-.3, .3), renk: '#9fd8ff', m: 22, s: 1.6 }); },
            ciz(c, m, o) { const s = m.sahip; if (m.l < 54) return; const u = (m.l - 54) / 10; halka(c, s.x, s.y, s.r + 8 + 10 * u, '#7fd0ff', 3 * (1 - u) + .5, 1 - u); o.isik(c, s.x, s.y, 50, '#3aa8ff', .5 * (1 - u)); } });
        } },
    ],
  },

  {
    ad: 'CHUN-LI', renk: '#3f8cff', can: 94, hiz: 1.15, tip: 'yakin', ucar: false,
    gorunum(c, b, o, bx, by) { // klasik Chun-Li: beyaz ipek kılıflı iki topuz ve sarkan kurdeleler, ortadan ayrık kâkül, altın şeritli mavi qipao yakası, göz kenarında ince kırmızı
      const fx = bx * 3, fy = by * 1.5, h = b.hafiza;
      if (o.t < (h.ters || 0)) c.rotate(Math.PI + Math.sin(o.t * .5) * .12); // Spinning Bird Kick: baş aşağı
      const dal = Math.sin(o.t * .12), sav = kis(-b.vx * .6, -4, 4); // kurdeleler dalgalanır, hıza karşı savrulur
      c.lineCap = c.lineJoin = 'round';
      for (const s of [-1, 1]) for (const k of [0, 1]) { // kurdeleler kafanın arkasında
        const x0 = s * (16 + k * 3), y0 = -18, x1 = s * (26 + k * 4) + sav, y1 = 7 + k * 7 + dal * 2 * s, kx = s * (29 + k * 3) + sav * .5 + dal * 2;
        c.fillStyle = k ? '#e3e1da' : '#f4f2ec'; c.strokeStyle = '#a9adb6'; c.lineWidth = .7;
        c.beginPath(); c.moveTo(x0 - 1.6, y0); c.quadraticCurveTo(kx, -6, x1, y1); c.lineTo(x1 + s * 2.6, y1 - 1.2); c.quadraticCurveTo(kx + s * 3, -8, x0 + 1.6, y0); c.closePath(); c.fill(); c.stroke(); }
      kafa(c, '#f1d3b8', () => {
        c.fillStyle = '#2a58c8'; c.beginPath(); c.moveTo(-24, 15); c.quadraticCurveTo(0, 22, 24, 15); c.lineTo(24, 24); c.lineTo(-24, 24); c.fill(); // mavi qipao yakası
        c.strokeStyle = '#e2b13c'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-24, 15); c.quadraticCurveTo(0, 22, 24, 15); c.stroke(); // altın şerit
        c.fillStyle = '#e2b13c'; c.beginPath(); c.arc(fx * .3, 21.2, 1.4, 0, TAU_); c.fill();
      });
      if (b.ez > 0) { aciGoz(c, fx, fy, '#1a0e0a'); aciAgiz(c, fx, fy); } else {
        for (const s of [-1, 1]) { const x = s * 8.5 + fx, y = -.5 + fy; // kararlı, dik bakış; koyu kirpikli
          goz(c, x, y, s, bx, by, { iris: '#6a3c22', koyu: '#24120a', acik: .9, egim: .55, duz: .3, kalin: 1.35, kirpik: '#1a0e0a' });
          c.strokeStyle = 'rgba(200,40,50,.55)'; c.lineWidth = .9; c.beginPath(); c.moveTo(x + s * 4.8, y - 2.4); c.quadraticCurveTo(x + s * 6.4, y - 2.8, x + s * 7.2, y - 4); c.stroke(); // göz kenarında ince kırmızı
          kas(c, x, y - 7.2, s, .7, '#2a1a12', 1.6); }
        c.fillStyle = '#b8545c'; c.beginPath(); c.moveTo(-3 + fx, 11.4 + fy); c.quadraticCurveTo(fx, 10.6 + fy, 3 + fx, 11.4 + fy); c.quadraticCurveTo(fx, 13.4 + fy, -3 + fx, 11.4 + fy); c.fill(); // küçük, ciddi dudak
      }
      sacCiz(c, CHUN_SAC, o.t, '#2b1a12', '#5a3a28', 'rgba(0,0,0,.35)', CHUN_TEL);
      for (const s of [-1, 1]) { const x = s * 18, y = -24, t = Math.atan2(-y, -x); // topuzlar: beyaz ipek kılıf, kıvrımlar, dipte altın bağ
        const g = c.createRadialGradient(x - s * 2, y - 3, 1, x, y, 8.5); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#cfd2d9');
        c.fillStyle = g; c.strokeStyle = '#8d929c'; c.lineWidth = .9; c.beginPath(); c.arc(x, y, 7.6, 0, TAU_); c.fill(); c.stroke();
        c.strokeStyle = 'rgba(120,126,140,.45)'; c.lineWidth = .6; for (const k of [-.6, 0, .6]) { c.beginPath(); c.moveTo(x + k * 5 - s * 1.5, y - 6); c.quadraticCurveTo(x + k * 2.6 + s * 1.5, y, x - s * 1.5 + Math.cos(t) * 5.2, y + Math.sin(t) * 5.2); c.stroke(); }
        c.save(); c.translate(x + Math.cos(t) * 6.4, y + Math.sin(t) * 6.4); c.rotate(t + Math.PI / 2); c.fillStyle = '#e2b13c'; c.strokeStyle = '#9a7420'; c.lineWidth = .4; c.fillRect(-3.6, -.9, 7.2, 1.8); c.strokeRect(-3.6, -.9, 7.2, 1.8); c.restore(); }
    },
    skiller: [
      { ad: 'Super Art Göstergesi', // pasif: vurdukça ve vuruldukça dolar (topun altında 3 parçalı yay, yazı yok); dolunca Hōyokusen açılır. Tekme atarken ve hemen ardından (tekme önceliği) yakın vuruşlardan %40 az hasar alır; futbol topu çarparsa tekme serisi bozulur
        hasarAl(b, d, { kaynak, tur }, o) { if (kaynak?.futbol) b.hafiza.kirik = o.t; if (tur == 'yakin' && o.t <= (b.hafiza.tekme || -1) + 8) d *= .6; saEkle(b, d * .9); return d; },
        ciz(c, b, o) { const sa = b.hafiza.sa || 0, R = b.r + 8, dolu = sa >= 100; c.save(); c.lineCap = 'round'; c.lineWidth = 2.6;
          for (let i = 0; i < 3; i++) { const a1 = Math.PI * (.71 - i * .145), a0 = a1 - Math.PI * .12, f = kis((sa - i * 100 / 3) * .03, 0, 1);
            c.globalAlpha = .22; c.strokeStyle = '#7fa8f4'; c.beginPath(); c.arc(b.x, b.y, R, a0, a1); c.stroke();
            if (f > 0) { c.globalAlpha = dolu ? .75 + .25 * Math.sin(o.t * .3) : .9; c.strokeStyle = dolu ? '#e6efff' : '#5a8cf0'; c.beginPath(); c.arc(b.x, b.y, R, a1 - (a1 - a0) * f, a1); c.stroke(); } }
          c.restore(); } },

      { ad: 'Hyakuretsukyaku', isabet: 'guvenilir', bekleme: 105, ilk: 40, kosul: (b, e, o) => uzak(b, e) < b.r + e.r + 30 || o.nes.some(n => n.kopek && n.p == null && uzak(n, b) < 70), // yüz şimşek tekme: havada asılı kalıp art arda 10 küçük tekme, sonuncusu iter; gölge köpeklerini de savurur
        kullan(b, e, o) { o.ekle({ sahip: b, x: 0, y: 0, omur: 34, a: yonu(b, e),
          adim(m, o) { const s = m.sahip, e = o.rakip(s); if (s.hp <= 0) { m.olu = 1; return; } s.hafiza.tekme = o.t; kopekTekme(o, s, s.r + 46); m.a = yonu(s, e); s.vx = s.vx * .8 + Math.cos(m.a) * .9; s.vy = s.vy * .6 + Math.sin(m.a) * .9; // asılı kalır, rakibe yapışır
            if (o.t - (s.hafiza.kirik ?? -9) < 2) { m.olu = 1; return; } // top çarptı: seri bozuldu
            if (m.l % 3 == 0 && m.l <= 30 && uzak(s, e) < s.r + e.r + 46 && chunVur(o, s, e, 1, m.l == 30 ? 6 : 0) > 0) for (let i = 0; i < e.bek.length; i++) if (e.bek[i] > 0 && e.bek[i] < 1e9) e.bek[i] += 1.5; }, // sersemletme: isabet eden her tekme rakibin skillerini biraz geciktirir
          ciz(c, m) { kickBulanik(c, m.sahip, m.a, .6, 36, 4); } });
        } },

      { ad: 'Spinning Bird Kick', isabet: 'normal', bekleme: 240, ilk: 110, kosul: (b, e) => { const d = uzak(b, e); return d > 90 && d < 300; }, // baş aşağı, bacaklar açık, helikopter gibi dönerek rakibin içinden geçer
        kullan(b, e, o) { const a = onden(b, e, 8.5); b.hafiza.ters = o.t + 40;
          o.ekle({ sahip: b, x: 0, y: 0, omur: 40, a, vur: 0, son: -9, iz: [],
            adim(m, o) { const s = m.sahip, e = o.rakip(s), bit = () => { s.hafiza.ters = 0; m.olu = 1; };
              if (s.hp <= 0 || s.don > 0) return bit();
              s.hafiza.tekme = o.t; kopekTekme(o, s, s.r + 34); s.vx = Math.cos(m.a) * 8.5; s.vy = Math.sin(m.a) * 8.5; // yer çekimine kapılmadan düz gider
              if (!o.sim && m.l % 2 == 0) m.iz.push([s.x, s.y - s.r * .55, m.l]);
              if (m.vur < 3 && m.l - m.son >= 6 && uzak(s, e) < s.r + e.r + 30) { m.vur++; m.son = m.l; chunVur(o, s, e, 3, 3); }
              if (m.l > 4 && duvarda(s, o, s.r + 8)) { s.vx *= -.4; s.vy *= -.4; bit(); } },
            ciz(c, m, o) { const s = m.sahip, ry = s.y - s.r * .55, f = Math.cos(o.t * .7);
              for (const [x, y, l] of m.iz) { const u = (m.l - l) / 14; if (u > 1) continue; c.globalAlpha = .14 * (1 - u); c.fillStyle = CHI[1]; c.beginPath(); c.ellipse(x, y, 34 * (1 - u * .3), 8, 0, 0, TAU_); c.fill(); }
              c.globalAlpha = .35; c.strokeStyle = '#7fa8f4'; c.lineWidth = 2.5; c.beginPath(); c.ellipse(s.x, ry, 46, 9, 0, 0, TAU_); c.stroke(); c.globalAlpha = 1; // dönüş izi
              for (const k of [1, -1]) { const y = s.y + Math.sin(o.t * .7) * k * 3 - 10; c.save(); c.translate(s.x + k * Math.sign(f || 1) * 19, y); c.scale(k * Math.sign(f || 1), 1); bacakCiz(c, 0, 0, 0, 14 + 30 * Math.abs(f), 1); c.restore(); } } }); // açık bacaklar dönerken boy değiştirir, yer değiştirir
        } },

      { ad: 'Kikoken', isabet: 'normal', bekleme: 210, ilk: 80, kosul: (b, e) => uzak(b, e) > 170, // avuçlar önde: sulu boya gibi dalgalanan mavi chi topu
        kullan(b, e, o) { const a = onden(b, e, 10); b.vx -= Math.cos(a) * 1.5; b.vy -= Math.sin(a) * 1.5;
          o.ekle({ sahip: b, x: 0, y: 0, omur: 18, a, ciz(c, m) { const s = m.sahip, u = m.l / m.omur; chiEller(c, s.x + Math.cos(m.a) * (s.r - 3), s.y + Math.sin(m.a) * (s.r - 3), m.a, u < .7 ? 1 : (1 - u) / .3); } });
          o.ekle({ sahip: b, x: b.x + Math.cos(a) * 38, y: b.y + Math.sin(a) * 38, vx: Math.cos(a) * 10, vy: Math.sin(a) * 10, omur: 80, iz: [],
            adim(m, o) { const e = o.rakip(m.sahip); if (!o.sim && m.l % 2 == 0) { for (let j = 0; j < 2; j++) m.iz.push([m.x + rnd(-6, 6), m.y + rnd(-6, 6), m.l, rnd(-10, 10) - m.vx * 2, rnd(-10, 10) - m.vy * 2, rnd(3, 8), rnd(0, 3) | 0]); if (m.iz.length > 28) m.iz.splice(0, 2); }
              if (uzak(m, e) < e.r + 16) { chunVur(o, m.sahip, e, 6, 4, m, 'menzil'); m.olu = 1; }
              else if (duvarda(m, o, 10)) { chiFx(o, m.x, m.y, Math.atan2(-m.vy, -m.vx), 1.2); m.olu = 1; } },
            ciz(c, m) { chiTop(c, m); } });
        } },

      { ad: 'Tenshokyaku', isabet: 'normal', bekleme: 220, ilk: 90, kosul: (b, e) => { const d = uzak(b, e); if (d > b.r + e.r + 70) return false; // üstüne atlayan ya da dalan rakibi yükselen tekmelerle karşılar, son tekme havaya atar
          return ((b.x - e.x) * e.vx + (b.y - e.y) * e.vy) / d > 5.5 || e.y < b.y - 25; },
        demo(b, e) { e.x = b.x + 50; e.y = b.y - 40; },
        kullan(b, e, o) { b.vy = -8; b.vx += Math.sign(e.x - b.x) * 1.5;
          o.ekle({ sahip: b, x: 0, y: 0, omur: 22,
            adim(m, o) { const s = m.sahip, e = o.rakip(s); if (s.hp <= 0) { m.olu = 1; return; } s.hafiza.tekme = o.t; kopekTekme(o, s, s.r + 40); if (m.l < 12) s.vy = Math.min(s.vy, -5);
              if (m.l % 6 == 4 && uzak(s, e) < s.r + e.r + 42) { const son = m.l >= 16; chunVur(o, s, e, son ? 5 : 2.5, son ? 7 : 1, s, 'yakin', son ? { kesin: true } : undefined); if (son) e.vy -= 4; } }, // son tekme karşı vuruş: kaçınmaya takılmaz
            ciz(c, m) { const s = m.sahip, u = m.l / m.omur, a = -Math.PI / 2 + ((m.l / 6 | 0) % 2 ? .45 : -.45);
              c.globalAlpha = .28 * (1 - u); c.fillStyle = CHI[1]; c.beginPath(); c.ellipse(s.x, s.y + s.r + 8 + 16 * u, 12, 6 + 20 * u, 0, 0, TAU_); c.fill(); c.globalAlpha = 1; // yükselişin chi izi
              bacakCiz(c, s.x + Math.cos(a) * (s.r - 2), s.y + Math.sin(a) * (s.r - 2), a, 38, 1 - u * .5); } });
        } },

      { ad: 'Hōyokusen', isabet: 'ulti', bekleme: 60, ilk: 0, kosul: (b, e) => (b.hafiza.sa || 0) >= 100 && uzak(b, e) < 220 && !e.dokunulmaz, // Super Art: chi toplar, rakibe dalar, tekme serisi; son yukarı tekmede hit frame
        demo(b, e) { b.hafiza.sa = 100; e.x = b.x + 170; },
        kullan(b, e, o) { const h = b.hafiza; h.sa = 0; h.sup = 1; if (!o.sim) { o.dur = Math.max(o.dur, 10); o.sars(4); }
          o.ekle({ sahip: b, x: 0, y: 0, omur: 120, faz: 0, cl: 0, a: yonu(b, e),
            adim(m, o) { const s = m.sahip, e = o.rakip(s), bit = () => { s.hafiza.sup = 0; m.faz = 3; m.cl = m.l; m.omur = m.l + 14; };
              if (m.faz == 3) return; if (s.hp <= 0 || e.hp <= 0) return bit();
              if (m.faz == 0) { s.vx *= .6; s.vy *= .6; if (m.l >= 14) { m.faz = 1; m.cl = m.l; } } // chi toplanır
              else if (m.faz == 1) { m.a = onden(s, e, 15); s.vx = Math.cos(m.a) * 15; s.vy = Math.sin(m.a) * 15;
                if (uzak(s, e) < s.r + e.r + 10) { m.faz = 2; m.cl = m.l; e.don = Math.max(e.don, 36); }
                else if (m.l - m.cl > 32) { bit(); s.hafiza.sa = 50; } } // boşa giderse göstergenin yarısı geri gelir
              else { const k = m.l - m.cl, a = yonu(s, e), d = s.r + e.r + 4; m.a = a;
                s.vx = s.vy = 0; s.x = kis(e.x - Math.cos(a) * d, s.r + 6, o.W - s.r - 6); s.y = kis(e.y - Math.sin(a) * d, s.r + 6, o.H - s.r - 6);
                if (k % 5 == 0 && k <= 25) chunVur(o, s, e, 1.4, .5);
                if (k == 32) { e.don = 0; chunVur(o, s, e, 6, 11, s, 'yakin', { kesin: true }); e.vy -= 6; vurusKaresi(o, e.x, e.y, 1.4); m.vurdu = 1; bit(); } } },
            ciz(c, m, o) { const s = m.sahip;
              if (m.faz == 0) { const u = m.l / 14; for (let i = 0; i < 6; i++) { const a = i * 1.05 + m.l * .2, r = 20 + 50 * (1 - u); c.globalAlpha = .3 * u; c.fillStyle = CHI[i % 3]; c.beginPath(); c.arc(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r, 8, 0, TAU_); c.fill(); }
                c.globalAlpha = 1; halka(c, s.x, s.y, s.r + 6 + 30 * (1 - u), '#cfe0ff', 2, .7 * u); } // chi çevresinden toplanır
              else if (m.faz == 1) bacakCiz(c, s.x + Math.cos(m.a) * (s.r - 2), s.y + Math.sin(m.a) * (s.r - 2), m.a, 42, 1); // ayakla dalış
              else if (m.faz == 2) { yazi(c, '鳳翼扇', o.W / 2, o.H / 2, 90, '#cfe0ff', .08); kickBulanik(c, s, m.a, .8, 40, 5); }
              else if (m.vurdu) { const u = (m.l - m.cl) / 14, a = -Math.PI / 2 + Math.cos(m.a) * .5; bacakCiz(c, s.x + Math.cos(a) * (s.r - 2), s.y + Math.sin(a) * (s.r - 2), a, 44, 1 - u); } } }); // son yukarı tekme
        } },
    ],
  },
  {
    ad: 'KAISER', renk: '#ffc23d', can: 106, hiz: 1.18, tip: 'menzilli', menzil: 200, ucar: false, top: true,
    topKaynak: kaiserKaynak,
    gorunum(c, b, o, bx, by) { // platin sarıdan gök mavisine dönen dağınık saç (perçem sola savrulup sol göze düşer), solda arkaya sarkan uzun tutam, gözlerde kırmızı çizgi, yarı kapalı kibirli mavi gözler, yan sırıtma, boynunda mavi gül; öfkede gözler açılır, deli gülüş
      const fx = bx * 3, fy = by * 1.5, of = b.hafiza.ofke, sw = Math.sin(o.t * .08) * 2;
      { const g = c.createLinearGradient(-20, -8, -40, 34); g.addColorStop(0, '#eef0e6'); g.addColorStop(.45, '#9fd2f2'); g.addColorStop(1, '#3a96dc'); c.fillStyle = g; c.strokeStyle = '#2f78b8'; c.lineWidth = .8; // solda arkaya sarkan uzun tutam (at kuyruğu)
        for (let k = 0; k < 3; k++) { const w = Math.sin(o.t * .07 + k) * 2; c.beginPath(); c.moveTo(-18, -6 + k * 3); c.quadraticCurveTo(-35 - k * 2, 3 + w, -41 + k * 4, 31 + k * 2 + w); c.quadraticCurveTo(-30 + k, 13 + w, -16, 3 + k * 3); c.closePath(); c.fill(); c.stroke(); } }
      kafa(c, '#f6e2d0', () => { // Bastard forması: kırmızı balıkçı yaka, siyah ceket, altın şerit
        c.fillStyle = '#2f55c8'; c.beginPath(); c.ellipse(11.8, 13.6, 2.3, 1, -.6, 0, TAU_); c.fill(); gul(c, 16, 14.2, 4, .5, .95); // boyunda mavi gül dövmesi: yarısı yakanın altında kalır
        c.fillStyle = '#7a1622'; c.fillRect(-7, 16.5, 14, 8);
        c.fillStyle = '#0d0d12'; c.beginPath(); c.moveTo(-24, 13); c.lineTo(-7, 17); c.lineTo(-5, 24); c.lineTo(-24, 24); c.fill(); c.beginPath(); c.moveTo(24, 13); c.lineTo(7, 17); c.lineTo(5, 24); c.lineTo(24, 24); c.fill();
        c.strokeStyle = '#d8b24a'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(-22, 14.3); c.lineTo(-6.5, 18); c.lineTo(-5, 24); c.moveTo(22, 14.3); c.lineTo(6.5, 18); c.lineTo(5, 24); c.stroke();
      });
      if (b.ez > 0) { aciGoz(c, fx, fy, '#1a1626'); aciAgiz(c, fx, fy); } else {
        for (const s of [-1, 1]) { const x = s * 8.5 + fx, y = -.5 + fy;
          if (of) o.isik(c, x, y, 9, '#4f86ff', .6);
          goz(c, x, y, s, bx, by, of ? KAISER_GOZ_OFKE : KAISER_GOZ); kaiserKirmizi(c, x, y, s, of ? KAISER_GOZ_OFKE : KAISER_GOZ);
          kas(c, x, y - 6.4, s, of ? 1.6 : .25, '#a8894a', 1.3); }
        if (of) { c.fillStyle = '#3a0a14'; c.beginPath(); c.moveTo(-6 + fx, 10.4 + fy); c.quadraticCurveTo(fx, 12 + fy, 6.4 + fx, 9.6 + fy); c.quadraticCurveTo(fx, 18.5 + fy, -6 + fx, 10.4 + fy); c.fill(); // deli gülüş: dişler görünür
          c.save(); c.clip(); c.fillStyle = '#f6f4f0'; c.fillRect(-7 + fx, 9 + fy, 14, 3.4); c.strokeStyle = '#8a6a6a'; c.lineWidth = .45; c.beginPath(); for (const x of [-3, 0, 3]) { c.moveTo(x + fx, 9 + fy); c.lineTo(x + fx, 12.4 + fy); } c.stroke(); c.restore(); }
        else { c.strokeStyle = '#8a4040'; c.lineWidth = 1.3; c.lineCap = 'round'; c.beginPath(); c.moveTo(-1.8 + fx, 12.6 + fy); c.quadraticCurveTo(1.6 + fx, 13.3 + fy, 3.8 + fx, 11 + fy); c.lineTo(4.6 + fx, 10.2 + fy); c.stroke(); } // yan sırıtma
      }
      sacCiz(c, KAISER_SAC, o.t, kaiserSacRenk(c), '#c9b88a', 'rgba(30,90,160,.35)', KAISER_TEL);
      c.fillStyle = '#111'; c.beginPath(); c.arc(25.6, 12.5, 1.3, 0, TAU_); c.fill(); c.fillStyle = '#ffd86a'; c.beginPath(); c.arc(25.3, 12.1, .45, 0, TAU_); c.fill(); // küpe
      c.strokeStyle = 'rgba(255,255,240,.45)'; c.lineWidth = 1.4; c.lineCap = 'round'; for (const [a0, a1] of [[1.3, 1.38], [1.46, 1.52], [1.6, 1.64]]) { c.beginPath(); c.arc(-1, -3, 28, Math.PI * a0, Math.PI * a1); c.stroke(); } // tepedeki parlama
    },
    skiller: [
      { ad: 'İmparator', // pasif: top maç başında yanında doğar. Canı rakibinden belirgin azken öfkelenir: gözler açılır, deli gülüş, kafayı dikenli mavi sarmaşık sarar; şutları %15 sertleşir, hızlanır
        pasif(b, e, o) { futbol(o, b); const h = b.hafiza, of = b.hp < e.hp - 8;
          if (of && !h.ofke && !o.sim) { o.sars(4); gulSac(o, b.x, b.y, 14, 4.5, 5); halkaFx(o, b.x, b.y, '#2f55c8'); } h.ofke = of; b.hizx = of ? 1.12 : 1; },
        ciz(c, b, o) { if (!b.hafiza.ofke) return; const r0 = b.r + 7, A = a => r0 + Math.sin(a * 5 + o.t * .1) * 3;
          c.save(); c.strokeStyle = '#1e3796'; c.fillStyle = '#1e3796'; c.lineWidth = 2; c.lineCap = 'round'; c.beginPath();
          for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU_ + o.t * .03, r = A(a); c.lineTo(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r); } c.stroke(); // dikenli sarmaşık
          for (let i = 0; i < 10; i++) { const a = i / 10 * TAU_ + o.t * .03, r = A(a), x = b.x + Math.cos(a) * r, y = b.y + Math.sin(a) * r;
            c.beginPath(); c.moveTo(x + Math.cos(a) * 5, y + Math.sin(a) * 5); c.lineTo(x + Math.cos(a + 1.6) * 2, y + Math.sin(a + 1.6) * 2); c.lineTo(x + Math.cos(a - 1.6) * 2, y + Math.sin(a - 1.6) * 2); c.fill(); }
          c.restore(); for (let i = 0; i < 3; i++) { const a = i * 2.1 + o.t * .03; gul(c, b.x + Math.cos(a) * (r0 + 1), b.y + Math.sin(a) * (r0 + 1), 4.8, o.t * .02, .95); } } },

      { ad: 'Kaiser Impact', isabet: 'normal', bekleme: 85, ilk: 60, kosul: (b, e, o) => { const t = futbol(o, b); return !t.atis && !t.kilit && uzak(t, b) < b.r + t.r + 26 && uzak(b, e) > 40; }, // neredeyse hazırlıksız (dipteki rakibe de), arenanın en hızlı şutu
        kullan(b, e, o) { const t = futbol(o, b), v = 23; sut(o, t, onden(t, e, v), v, 8 * kaiserCarpan(b), 8, kaiserAtis(b, 1.2, { gudum: .05, vmax: 26 })); kaiserSutAni(o, t.x, t.y, Math.atan2(t.vy, t.vx), 1.2); },
        demo: kaiserTopAyakta },

      { ad: 'Kaiser Impact Magnus', isabet: 'normal', bekleme: 250, ilk: 170, kosul: (b, e, o) => { const t = futbol(o, b); return !t.atis && !t.kilit && uzak(t, b) < b.r + t.r + 26 && uzak(b, e) > 140; }, // falsolu şut: yana açılır, yay çizip rakibe döner
        kullan(b, e, o) { const t = futbol(o, b), y = Math.random() < .5 ? 1 : -1;
          sut(o, t, yonu(t, e) - y * .6, 20, 8 * kaiserCarpan(b), 11, kaiserAtis(b, 1.6, { gudum: .15, egri: y * .024 })); kaiserSutAni(o, t.x, t.y, yonu(t, e), 1.6); },
        demo(b, e, o) { b.x = 120; e.x = o.W - 120; kaiserTopAyakta(b, e, o); } },

      { ad: 'Taç Eli', isabet: 'guvenilir', bekleme: 110, ilk: 80, kosul: (b, e) => uzak(b, e) < b.r + e.r + 30, // taç dövmeli eliyle iter, rakibi savurur, topu kendine çeker (Isagi'den de)
        kullan(b, e, o) { const a = yonu(b, e); b.vx = Math.cos(a) * 4; b.vy = Math.sin(a) * 4; // atılmaz, yerinde iter
          o.ekle({ sahip: b, hedef: e, x: b.x, y: b.y, a, omur: 22,
            adim(m, o) { const s = m.sahip, e = m.hedef; m.x = s.x; m.y = s.y; if (m.l != 5) return;
              if (uzak(s, e) < s.r + e.r + 40) { m.vurdu = 1; o.vur(e, 4 * kaiserCarpan(s), { x: s.x, y: s.y, renk: '#ffc23d', vurFx: (x, y) => { kaiserPatla(o, x, y, .8); o.dur = Math.max(o.dur, 5); } }, 14, 'yakin'); o.sars(5); }
              const t = futbol(o, s); if (!t.atis && !t.kilit && uzak(t, s) < 220) { if (t.sahip !== s && !o.sim) halkaFx(o, t.x, t.y, '#ffc23d'); t.sahip = s; const d = uzak(t, s) || 1; t.vx = (s.x - t.x) / d * 9; t.vy = (s.y - t.y) / d * 9;
                if (m.vurdu) { const i = s.k.skiller.findIndex(k => k.ad == 'Kaiser Impact'); s.bek[i] = Math.min(s.bek[i], 12); } } }, // it, çek, vur: yakın dövüşçüye karşı kombo
            ciz(c, m, o) { const s = m.sahip, u = m.l / m.omur, it = m.l < 5 ? m.l / 5 : 1, al = m.l < 14 ? 1 : (22 - m.l) / 8;
              tacEl(c, s.x + Math.cos(m.a) * (s.r + 4 + 14 * eo_(it)), s.y + Math.sin(m.a) * (s.r + 4 + 14 * eo_(it)), m.a, al);
              if (m.vurdu) { const x = s.x + Math.cos(m.a) * (s.r + 26), y = s.y + Math.sin(m.a) * (s.r + 26), k = (m.l - 5) / 17; c.save(); c.strokeStyle = '#fff'; c.lineWidth = 4 * (1 - k) + .5; c.globalAlpha = 1 - k;
                c.beginPath(); c.arc(x, y, 14 + 26 * k, m.a - 1.2, m.a + 1.2); c.stroke(); c.strokeStyle = '#ffd86a'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 8 + 36 * k, m.a - 1, m.a + 1); c.stroke(); c.restore(); } } });
        } },

      { ad: 'Top Hırsızı', bekleme: 200, ilk: 120, kosul: (b, e, o) => { const t = futbol(o, b), d = uzak(t, b); return !t.atis && !t.kilit && d > 90 && d < 330; }, // destek: topa atılır ve kapar; Isagi'den çalabilir (şut beklemesini kısaltmaz, Isagi eşleşmesini bozuyordu)
        kullan(b, e, o) { const t = futbol(o, b);
          o.ekle({ sahip: b, top: t, cal: t.sahip !== b, x: 0, y: 0, omur: 32, iz: [],
            adim(m, o) { const s = m.sahip, t = m.top; if (m.bitti) return; const a = Math.atan2(t.y + t.vy * 4 - s.y, t.x + t.vx * 4 - s.x);
              s.vx = Math.cos(a) * 17; s.vy = Math.sin(a) * 17; if (m.l % 2 == 0) m.iz.push([s.x, s.y, m.l]);
              if (uzak(s, t) < s.r + t.r + 14 && !t.kilit) { t.sahip = s; t.atis = null; t.vx = s.vx * .2; t.vy = s.vy * .2; s.vx *= .3; s.vy *= .3; m.bitti = 1; m.omur = m.l + 20; m.tl = m.l; m.tx = t.x; m.ty = t.y;
                if (!o.sim) { gulSac(o, t.x, t.y, m.cal ? 18 : 9, 5, 5); halkaFx(o, t.x, t.y, '#ffc23d'); if (m.cal) { o.sars(6); vurusKaresi(o, t.x, t.y, .9, false); kaiserPatla(o, t.x, t.y, 1); } } } }, // rakipten çaldı: beyaz flaş, şimşekli taç
            ciz(c, m) { const s = m.sahip;
              for (const [x, y, l] of m.iz) { const u = (m.l - l) / 12; if (u > 1) continue; c.globalAlpha = .4 * (1 - u); c.fillStyle = l % 4 ? '#ffc23d' : '#2f55c8'; c.beginPath(); c.arc(x, y, s.r * (1 - u * .3), 0, TAU_); c.fill(); }
              c.globalAlpha = 1; if (m.tl != null) { const u = (m.l - m.tl) / 20; tac(c, m.tx, m.ty - 18 - 16 * u, m.cal ? 9 : 6, 1.4 * (1 - u)); } } });
        },
        demo(b, e, o) { const t = futbol(o, b); t.sahip = e; t.x = b.x; t.y = b.y - 170; t.vx = t.vy = 0; t.atis = null; } },

      { ad: 'Mavi Gül', isabet: 'nadir', bekleme: 420, ilk: 240, kosul: (b, e) => uzak(b, e) < 150 && !e.dokunulmaz, // boynundaki dövme açar: yarım saniye tomurcuk, sonra 140 px'lik gül patlaması
        kullan(b, e, o) { o.sars(3);
          o.ekle({ alt: true, sahip: b, x: b.x, y: b.y, omur: 62, R: 140, cz: Array.from({ length: 14 }, (_, i) => i * TAU_ / 14 + rnd(-.1, .1)),
            adim(m, o) { const s = m.sahip, e = o.rakip(s); if (s.hp <= 0) { m.olu = 1; return; } if (m.l < 30) { m.x = s.x; m.y = s.y; s.vx *= .9; s.vy *= .9; }
              if (m.l == 30) { o.sars(9); if (uzak(m, e) < m.R + e.r * .5) o.vur(e, 14 * kaiserCarpan(s), { x: m.x, y: m.y, renk: '#2f55c8', vurFx: (x, y) => { vurusKaresi(o, x, y, 1.6); gulSac(o, x, y, 22, 7, 6); kaiserPatla(o, x, y, 1.2); } }, 15, 'alan');
                if (!o.sim) gulSac(o, m.x, m.y, 34, 9, 6); } },
            ciz(c, m, o) {
              if (m.l < 30) { const k = eo_(m.l / 30, 2); // tomurcuk: koyu daire, silik 薔薇, içeri kapanan dikenli çember, büyüyen gül
                c.fillStyle = 'rgba(0,4,24,' + .55 * k + ')'; c.beginPath(); c.arc(m.x, m.y, m.R + 8, 0, TAU_); c.fill();
                yazi(c, '薔薇', m.x, m.y, 92, '#2f55c8', .16 * k);
                halka(c, m.x, m.y, m.R, '#4f7ae0', 1.2, .7 * k);
                c.save(); c.fillStyle = '#1e3796'; for (const a of m.cz) { const r = m.R - 6, x = m.x + Math.cos(a + m.l * .02) * r, y = m.y + Math.sin(a + m.l * .02) * r;
                  c.globalAlpha = k; c.beginPath(); c.moveTo(x - Math.cos(a) * 10 * k, y - Math.sin(a) * 10 * k); c.lineTo(x + Math.cos(a + 1.6) * 3, y + Math.sin(a + 1.6) * 3); c.lineTo(x + Math.cos(a - 1.6) * 3, y + Math.sin(a - 1.6) * 3); c.fill(); } c.restore();
                o.isik(c, m.x, m.y, 70 + 50 * k, '#2f55c8', .4 * k); gul(c, m.x, m.y, 26 + 54 * k, m.l * .03, .9, k * .5); }
              else { const u = (m.l - 30) / 32, al = 1 - u; // patlama: gül tam açar, kesik gibi yapraklar dışa savrulur
                c.fillStyle = 'rgba(0,4,24,' + .55 * al + ')'; c.beginPath(); c.arc(m.x, m.y, m.R + 8, 0, TAU_); c.fill();
                o.isik(c, m.x, m.y, m.R, '#3a6cff', .6 * al); gul(c, m.x, m.y, 80 + 50 * eo_(u), 1 + u, al, 1);
                for (const a of m.cz) { const r = 30 + (m.R - 20) * eo_(u * 1.6); kesik(c, m.x + Math.cos(a) * r, m.y + Math.sin(a) * r, a, 46 * (1 - u * .5), 4, u < .3 ? '#ffffff' : '#9fc0ff', al); }
                halka(c, m.x, m.y, m.R * eo_(u * 1.8), '#ffd86a', 4 * al + .5, al); } } });
        } },

      { ad: 'İmparatorun Tacı', tek: true, ilk: 600, kosul: (b, e, o) => e.hp < e.mx * .5 && !e.dokunulmaz && !futbol(o, b).kilit, // rakip kilitlenir, top ayağına gelir, ara sahne, tam güç Magnus
        kullan(b, e, o) { const t = futbol(o, b); b.hafiza.ulti = o.t + 120; e.don = Math.max(e.don, 46); o.sars(6); t.sahip = b; t.atis = null;
          o.ekle({ sahip: b, hedef: e, top: t, x: 0, y: 0, omur: 120,
            adim(m, o) { const s = m.sahip, e = m.hedef, t = m.top; if (s.hp <= 0) { t.kilit = 0; m.olu = 1; return; }
              t.kilit = m.l < 44;
              if (m.l < 44) { const px = s.x + (e.x > s.x ? 1 : -1) * (s.r + t.r + 1), py = s.y + 6; t.sahip = s; t.atis = null; t.vx += (px - t.x) * .12 - t.vx * .25; t.vy += (py - t.y) * .12 - t.vy * .25; s.vx *= .85; s.vy *= .85; }
              if (m.l == 26) { o.sars(6); kaiserPatla(o, s.x, s.y - 30, 1.1); }
              if (m.l == 44) { const y = e.x > s.x ? -1 : 1;
                sut(o, t, yonu(t, e) - y * .6, 22, 17, 17, kaiserAtis(s, 2.4, { gudum: .3, egri: y * .02, vmax: 28, son: (n, f, o) => { o.sars(12); vurusKaresi(o, f.x, f.y, 2.8);
                  o.duvarVur(kis(f.x + n.vx * 30, 0, o.W), kis(f.y + n.vy * 30, 0, o.H), '#ffd86a', 3); kaiserPatla(o, f.x, f.y, 2); gulSac(o, f.x, f.y, 34, 9, 7); } }));
                kaiserSutAni(o, t.x, t.y, yonu(t, e), 2.4); } },
            ciz(c, m, o) { const s = m.sahip, e = m.hedef;
              if (m.l < 44) { const k = eo_(m.l / 26, 3); // Kaiser'in üstünde dev taç belirir, rakibin çevresini gül çemberi sarar
                o.isik(c, s.x, s.y - 40, 60 * k, '#ffc23d', .45 * k); tac(c, s.x, s.y - 44 - 6 * Math.sin(m.l * .2), 20 * k, k);
                for (let i = 0; i < 8; i++) { const a = i * TAU_ / 8 + m.l * .04, r = e.r + 40 - 18 * k; gul(c, e.x + Math.cos(a) * r, e.y + Math.sin(a) * r, 6, a, k); }
                if (m.l > 20) simsek(c, s.x, s.y - 30, e.x, e.y, .5 + .5 * Math.random(), 8, KAISER_SIM); }
              if (m.l > 14 && m.l < 60) { const u = (m.l - 14) / 46, gir = eo_(u * 4, 3), al = u > .8 ? (1 - u) / .2 : 1, bw = 380, bh = 78, cx = o.W / 2 + (1 - gir) * 420, cy = o.H * .2; // ara sahne: kibirli yarı kapalı gözler
                c.save(); c.globalAlpha = al; c.beginPath(); c.rect(cx - bw / 2, cy - bh / 2, bw, bh); c.fillStyle = 'rgba(4,6,22,.96)'; c.fill(); c.save(); c.clip();
                c.fillStyle = '#f6e2d0'; c.fillRect(cx - 150, cy - bh / 2, 300, bh);
                for (const s of [-1, 1]) { c.save(); c.translate(cx + s * 72, cy + 10); c.scale(5.5, 5.5); goz(c, 0, 0, s, 0, 0, { ...KAISER_GOZ, acik: .62, parlak: 1.2 }); kaiserKirmizi(c, 0, 0, s, KAISER_GOZ); kas(c, 0, -6.2, s, .5, '#a8894a', 1.1); c.restore(); }
                const g = c.createLinearGradient(0, cy - bh / 2, 0, cy + bh / 2); g.addColorStop(0, '#fdf7e6'); g.addColorStop(.5, '#f0e4bc'); g.addColorStop(.8, '#8ccbf2'); g.addColorStop(1, '#3a96dc');
                c.fillStyle = g; c.strokeStyle = '#9a8a62'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(cx - bw / 2, cy - bh / 2); // perçemler: sağda ayrık, sola savrulup sol gözün üstüne düşer
                for (const [x, y] of [[-190, 39], [-170, 39], [-160, 10], [-140, 32], [-125, -2], [-102, 26], [-88, -8], [-62, 2], [-40, -14], [-10, -22], [20, -28], [45, -34], [60, -38], [80, -30], [110, -14], [135, -20], [150, 8], [165, -4], [175, 39], [190, 39]]) c.lineTo(cx + x, cy + y);
                c.lineTo(cx + bw / 2, cy - bh / 2); c.closePath(); c.fill(); c.stroke();
                yazi(c, '皇帝', cx + 150, cy + 6, 64, '#7a1622', .55); for (const [x, y, r] of [[-170, 22, 13], [-140, 30, 9], [170, -26, 10]]) gul(c, cx + x, cy + y, r, x + m.l * .05, .9); c.restore();
                c.strokeStyle = '#ffc23d'; c.lineWidth = 2; c.beginPath(); c.moveTo(cx - bw / 2, cy - bh / 2); c.lineTo(cx + bw / 2, cy - bh / 2); c.moveTo(cx - bw / 2, cy + bh / 2); c.lineTo(cx + bw / 2, cy + bh / 2); c.stroke(); c.restore(); } } });
        },
        demo(b, e, o) { kaiserTopAyakta(b, e, o); } },
    ],
  },
  {
    ad: 'MAKIMA', renk: '#ff6f59', can: 92, hiz: .95, tip: 'menzilli', menzil: 230, ucar: false,
    gorunum(c, b, o, bx, by) { // mercan kırmızısı saç, küt perçem, ince yan tutamlar, arkada sağ omza sarkan örgü; altın halkalı gözler, göz altı çizgisi, sakin gülümseme; beyaz gömlek, siyah kravat
      const fx = bx * 3, fy = by * 1.5, h = b.hafiza, sw = Math.sin(o.t * .05) * .6;
      for (let i = 0; i < 7; i++) { const u = i / 7, x = 18.5 + u * 9 + sw * u, y = 13 + u * 17, z = i % 2 ? 1 : -1; // örgü: kafanın arkasından sağ omza sarkar
        c.save(); c.translate(x + z * .6, y); c.rotate(.5 + z * .55); c.fillStyle = i % 2 ? '#dc4a3c' : '#c93c30'; c.strokeStyle = '#962a22'; c.lineWidth = .6; c.beginPath(); c.ellipse(0, 0, 3.1, 2.1, 0, 0, TAU_); c.fill(); c.stroke(); c.restore(); }
      c.fillStyle = '#2a1a1a'; c.beginPath(); c.ellipse(27.8 + sw, 31.5, 1.8, 1.1, .5, 0, TAU_); c.fill();
      c.fillStyle = '#dc4a3c'; c.strokeStyle = '#962a22'; c.lineWidth = .6; c.beginPath(); c.moveTo(27 + sw, 32.5); c.quadraticCurveTo(30.5 + sw, 36, 30 + sw * 2, 39.5); c.quadraticCurveTo(28.5 + sw, 36.5, 26.5 + sw, 33.5); c.fill(); c.stroke();
      kafa(c, '#f8e6dc', () => { // beyaz gömlek yakası, siyah kravat
        c.fillStyle = '#f4f1ea'; c.strokeStyle = '#b8b4aa'; c.lineWidth = .8; c.beginPath(); c.moveTo(-24, 14); c.lineTo(-6, 16); c.lineTo(0, 22); c.lineTo(6, 16); c.lineTo(24, 14); c.lineTo(24, 24); c.lineTo(-24, 24); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = '#1c1c24'; c.beginPath(); c.moveTo(-2.2, 19); c.lineTo(2.2, 19); c.lineTo(3.4, 24); c.lineTo(-3.4, 24); c.fill(); c.beginPath(); c.moveTo(-2.4, 17.6); c.lineTo(2.4, 17.6); c.lineTo(1.6, 19.6); c.lineTo(-1.6, 19.6); c.fill();
      });
      if (b.ez > 0) { aciGoz(c, fx, fy, '#3a1c1c'); aciAgiz(c, fx, fy); } else {
        const g = h.soz && o.t - h.soz < 120 ? { ...MAKIMA_GOZ, iris: '#ffd36a', iri: 3.6 } : MAKIMA_GOZ; // sözleşmeden kalkınca halkalar parlar
        for (const s of [-1, 1]) { const x = s * 8.3 + fx, y = -.3 + fy; goz(c, x, y, s, bx, by, g); makimaGozAlti(c, x, y, s, g); }
        c.strokeStyle = '#a24a48'; c.lineWidth = 1.1; c.lineCap = 'round'; c.beginPath(); c.moveTo(-3 + fx, 11.6 + fy); c.quadraticCurveTo(fx, 13.2 + fy, 3 + fx, 11.6 + fy); c.stroke(); // sakin gülümseme
      }
      if (h.soz) { c.fillStyle = '#8c0f16'; // sözleşmeden sonra sol gözünden yanağına ve ağzının kenarından ince kan iner: üstte ince, altta damla
        const kan = (x0, y0, x1, y1, w) => { c.beginPath(); c.moveTo(x0 - w * .3, y0); c.quadraticCurveTo(x0 - w * .4, (y0 + y1) / 2, x1 - w, y1); c.arc(x1, y1, w, Math.PI, 0, true); c.quadraticCurveTo(x0 + w * .4, (y0 + y1) / 2, x0 + w * .3, y0); c.closePath(); c.fill(); };
        kan(-7.6 + fx, 2.2 + fy, -8.1 + fx, 10.6 + fy, .75); kan(3 + fx, 11.7 + fy, 3.4 + fx, 14.4 + fy, .45);
        c.fillStyle = 'rgba(255,190,180,.5)'; c.beginPath(); c.ellipse(-7.9 + fx, 7.6 + fy, .13, .9, .06, 0, TAU_); c.fill(); }
      sacCiz(c, MAKIMA_SAC, o.t, makimaSacRenk(c), '#b4372c', 'rgba(90,10,10,.28)', MAKIMA_TEL);
      c.strokeStyle = 'rgba(255,230,220,.5)'; c.lineWidth = 1.4; c.lineCap = 'round'; for (const [a0, a1] of [[1.3, 1.38], [1.46, 1.52], [1.6, 1.64]]) { c.beginPath(); c.arc(-1, -3, 28, Math.PI * a0, Math.PI * a1); c.stroke(); } // tepedeki parlama
    },
    skiller: [
      { ad: 'Sözleşme', // pasif: ölümcül hasar sözleşmeyle bir "vatandaşa" aktarılır: maçta bir kez düşmek yerine %25 canla kalkar. yoksay deler (Toji'nin mızrağı sözleşmeyi tanımaz).
        // Kontrol alanı: 120 px içine giren rakip ağırlaşır (yakın dövüşçüye karşı; menzilliler zaten uzakta durur)
        pasif(b, e, o) { const d = uzak(b, e); b.hafiza.alan = d < 120; if (b.hafiza.alan && e.don <= 0) { e.vx *= .965; e.vy *= .975; } },
        ciz(c, b, o) { if (b.hafiza.alan) halkalar(c, b.x, b.y, 120, .14 + .04 * Math.sin(o.t * .15)); },
        hasarAl(b, d, bilgi, o) { const h = b.hafiza; if (h.soz || d * 1.5 < b.hp) return d;
          const once = b.hp; h.soz = o.t; b.hp = Math.max(b.hp, b.mx * .25); b.don = 0;
          if (!o.sim) { o.sars(7); vurusKaresi(o, b.x, b.y, 1.4); kanSicrat(o, b.x, b.y, 16, 4.5); o.sayi(b, b.hp - once, 2);
            o.ekle({ sahip: b, x: b.x, y: b.y, omur: 70, ciz(c, m) { const u = m.l / m.omur, s = m.sahip; for (let i = 0; i < 3; i++) halkalar(c, s.x, s.y, s.r + 8 + i * 18 + 34 * u, (1 - u) * (1 - i * .25));
              yazi(c, '契約', s.x, s.y - 56, 26, '#c0302a', .6 * (1 - u)); } }); }
          return 0; } },

      { ad: 'Bang', isabet: 'normal', bekleme: 130, ilk: 50, kosul: (b, e) => uzak(b, e) < 260 && !e.dokunulmaz, // parmak tabancası: rakibin üstünde halka nişanı, 0.35 sn sonra "pat"
        kullan(b, e, o) {
          o.ekle({ sahip: b, hedef: e, x: e.x, y: e.y, omur: 34, a: yonu(b, e),
            adim(m, o) { const s = m.sahip, e = m.hedef; if (s.hp <= 0) { m.olu = 1; return; } m.a = yonu(s, m);
              if (m.l < 16) { m.x += (e.x - m.x) * .5; m.y += (e.y - m.y) * .5; } // nişan 0.27 sn rakibi izler, son 0.08 sn kilitli
              if (m.l == 21) { m.ates = 1; if (uzak(m, e) < e.r + 14) o.vur(e, 5, makimaKaynak(o, m.x, m.y, 1.4), 6, 'menzil'); if (!o.sim) { o.sars(4); o.dur = Math.max(o.dur, 3); } } },
            ciz(c, m, o) { const s = m.sahip, k = Math.min(1, m.l / 8), al = m.l < 21 ? k : 1 - (m.l - 21) / 13, hx = s.x + Math.cos(m.a) * (s.r + 6), hy = s.y + Math.sin(m.a) * (s.r + 6);
              parmakEl(c, hx, hy, m.a, al);
              if (m.l < 21) { c.fillStyle = 'rgba(20,0,4,' + .5 * k + ')'; c.beginPath(); c.arc(m.x, m.y, 34 - 12 * eo_(m.l / 21), 0, TAU_); c.fill(); halkalar(c, m.x, m.y, 34 - 12 * eo_(m.l / 21), k);
                c.save(); c.strokeStyle = 'rgba(192,48,42,.4)'; c.lineWidth = 1; c.setLineDash([2, 5]); c.beginPath(); c.moveTo(hx + Math.cos(m.a) * 10, hy + Math.sin(m.a) * 10); c.lineTo(m.x, m.y); c.stroke(); c.restore(); }
              else if (m.ates) { const u = (m.l - 21) / 13, fx = hx + Math.cos(m.a) * 11, fy = hy + Math.sin(m.a) * 11; halka(c, m.x, m.y, 6 + 34 * eo_(u), '#1a0608', 4 * (1 - u) + .5, 1 - u); halka(c, m.x, m.y, 4 + 20 * eo_(u), '#f4b23a', 2 * (1 - u), 1 - u);
                if (u < .45) { c.save(); c.lineCap = 'round'; /* görünmez kurşunun izi */ c.globalAlpha = 1 - u / .45; c.strokeStyle = '#c0302a'; c.lineWidth = 4; c.beginPath(); c.moveTo(fx, fy); c.lineTo(m.x, m.y); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 1.4; c.stroke(); c.restore(); } halka(c, hx + Math.cos(m.a) * 11, hy + Math.sin(m.a) * 11, 2 + 8 * u, '#f4f1ea', 1.2, 1 - u); } } });
        } },

      { ad: 'Kontrol Zincirleri', isabet: 'guvenilir', bekleme: 75, ilk: 60, kosul: (b, e) => uzak(b, e) < b.r + e.r + 46, // yakına gelene parmak uçlarından üç zincir iner, geri iter
        kullan(b, e, o) {
          o.ekle({ sahip: b, hedef: e, x: 0, y: 0, a0: yonu(b, e), omur: 26,
            adim(m, o) { const s = m.sahip, e = m.hedef; if (m.l == 7 && uzak(s, e) < s.r + e.r + 60) { o.vur(e, 6, makimaKaynak(o, s.x, s.y, .9), 17, 'yakin'); o.sars(4); } },
            ciz(c, m, o) { const s = m.sahip, e = m.hedef, k = eo_(Math.min(1, m.l / 7), 2), al = m.l < 16 ? 1 : (26 - m.l) / 10, L = (uzak(s, e) + 8) * k;
              for (const d of [-1, 0, 1]) { const b0 = d ? m.a0 + d * 2.1 : -Math.PI / 2, x0 = s.x + Math.cos(b0) * (s.r + 12), y0 = s.y + Math.sin(b0) * (s.r + 12), tx = e.x - Math.cos(m.a0) * e.r * .4, ty = e.y - Math.sin(m.a0) * e.r * .4; // yanlarından ve tepesinden üç zincir, gövdesinin etrafından dolanıp hedefe iner
                const kb = d ? m.a0 + d * 1.25 : Math.atan2(Math.sin(m.a0) - 1, Math.cos(m.a0)), kx = s.x + Math.cos(kb) * (s.r + 40), ky = s.y + Math.sin(kb) * (s.r + 40) - (d ? 0 : 14);
                zincir(c, x0, y0, x0 + (tx - x0) * k, y0 + (ty - y0) * k, al, 0, 4, x0 + (kx - x0) * k, y0 + (ky - y0) * k); halkalar(c, x0, y0, 6, al * .8); } } });
        } },

      { ad: 'Tasma', isabet: 'normal', bekleme: 420, ilk: 260, kosul: (b, e) => uzak(b, e) < 170 && !e.dokunulmaz && e.don <= 0, // boyna zincir tasma: yaklaşan rakip 1 sn kontrolde, en yakın duvara sürüklenip çarpar (uzaktakine kullanmaz)
        kullan(b, e, o) { const sec = [[e.x, 0], [o.W - e.x, 1], [e.y, 2], [o.H - e.y, 3]].sort((p, q) => p[0] - q[0])[0][1];
          o.ekle({ sahip: b, hedef: e, x: 0, y: 0, omur: 80, a: [Math.PI, 0, -Math.PI / 2, Math.PI / 2][sec], px: e.x + e.vx * 5, py: e.y + e.vy * 5,
            adim(m, o) { const s = m.sahip, e = m.hedef; if (s.hp <= 0 || e.hp <= 0) { m.olu = 1; return; } if (m.l < 10 || m.son != null) return;
              if (m.l == 10 && (uzak({ x: m.px, y: m.py }, e) > e.r + 18 || e.dokunulmaz)) { m.kac = 1; m.son = m.l; m.omur = m.l + 14; return; } // zincir boşa düştü
              const v = 2 + (m.l - 10) * .5; e.don = Math.max(e.don, 2); e.vx = e.vy = 0; e.x += Math.cos(m.a) * v; e.y += Math.sin(m.a) * v;
              if (duvarda(e, o, e.r + 6)) { e.x = kis(e.x, e.r + 6, o.W - e.r - 6); e.y = kis(e.y, e.r + 6, o.H - e.r - 6); const wx = e.x + Math.cos(m.a) * e.r, wy = e.y + Math.sin(m.a) * e.r;
                o.vur(e, 7, makimaKaynak(o, wx, wy, 1.3), 4, 'alan'); o.duvarVur(wx, wy, '#c0302a', 2); e.don = Math.max(e.don, 18); m.son = m.l; m.omur = m.l + 16;
                if (!o.sim) { o.sars(7); vurusKaresi(o, e.x, e.y, 1.2, false); } }
              else if (m.l > 60) { m.son = m.l; m.omur = m.l + 12; } },
            ciz(c, m, o) { const s = m.sahip, e = m.hedef, k = Math.min(1, m.l / 10), tx = s.x + ((m.kac ? m.px : e.x) - s.x) * k, ty = s.y + ((m.kac ? m.py : e.y) - s.y) * k, al = m.son != null ? 1 - (m.l - m.son) / 16 : 1;
              zincir(c, s.x, s.y, tx, ty, al, m.l > 10 && m.son == null ? 3 : 16, 4.5);
              if (m.l >= 10 && !m.kac) { c.save(); c.globalAlpha = Math.max(0, al); c.strokeStyle = '#c0302a'; c.lineWidth = 2.6; c.beginPath(); c.ellipse(e.x, e.y + e.r * .8, e.r * .58, e.r * .2, 0, 0, TAU_); c.stroke(); // boyundaki tasma
                c.strokeStyle = '#1a0a0a'; c.lineWidth = 1; c.stroke(); c.restore(); halkalar(c, e.x, e.y, e.r + 10, .5 * al); } } });
        } },

      { ad: 'Uzaktan Ezme', isabet: 'nadir', bekleme: 480, ilk: 300, kosul: (b, e) => uzak(b, e) < 360 && !e.dokunulmaz, // rakibin yerinde halka işareti; 0.6 sn sonra görünmez bir güç onu yere çakar
        kullan(b, e, o) {
          o.ekle({ alt: true, sahip: b, hedef: e, x: e.x, y: e.y, omur: 70, R: 50, cat: Array.from({ length: 9 }, () => [rnd(0, TAU_), rnd(.6, 1)]),
            adim(m, o) { const s = m.sahip, e = m.hedef; if (s.hp <= 0) { m.olu = 1; return; } if (m.l < 19) { m.x += (e.x - m.x) * .3; m.y += (e.y - m.y) * .3; } // 0.3 sn izler, son 0.3 sn kilitli
              if (m.l == 38) { m.ezdi = 1; o.sars(9); if (uzak(m, e) < m.R + e.r * .4) { o.vur(e, 13, makimaKaynak(o, e.x, e.y - 40, 1.6), 12, 'alan'); e.vy += 9; e.ez = e.ezm = 16; e.ezq = .45; e.eza = Math.PI / 2; if (!o.sim) vurusKaresi(o, e.x, e.y, 1.6); } } },
            ciz(c, m, o) {
              if (m.l < 38) { const k = m.l / 38; c.fillStyle = 'rgba(20,0,4,' + .45 * k + ')'; c.beginPath(); c.arc(m.x, m.y, m.R + 14, 0, TAU_); c.fill(); halkalar(c, m.x, m.y, m.R * (1.6 - .6 * k), .4 + .6 * k, '#f4b23a', '#7a1010', 4);
                c.save(); c.lineCap = 'round'; for (let i = 0; i < 9; i++) { const x = m.x + (i - 4) * m.R * .24, d = (m.l * 9 + i * 37) % 120, y0 = m.y - 150 + d, L = 26 + (i * 13) % 20; // işarete doğru inen basınç çizgileri
                  c.globalAlpha = k * (1 - d / 120) * .8; c.strokeStyle = i % 3 ? '#c0302a' : '#f4f1ea'; c.lineWidth = i % 3 ? 1.6 : 1; c.beginPath(); c.moveTo(x, y0); c.lineTo(x, y0 + L); c.stroke(); } c.restore(); }
              else { const u = (m.l - 38) / 32, al = 1 - u; c.save(); c.strokeStyle = '#1a0608'; c.lineWidth = 2.2; c.globalAlpha = al; c.lineJoin = 'round'; // yerde çember çatlak
                for (const [a, k] of m.cat) { c.beginPath(); c.moveTo(m.x, m.y); for (let i = 1; i <= 3; i++) { const b = a + (i % 2 ? .15 : -.15), r = m.R * 1.4 * k * i / 3; c.lineTo(m.x + Math.cos(b) * r, m.y + Math.sin(b) * r); } c.stroke(); } c.restore();
                halka(c, m.x, m.y, m.R * (1 + u), '#c0302a', 4 * al + .5, al); halkalar(c, m.x, m.y, m.R * .6, al * .7); } } });
        } },

      { ad: 'Diz Çök', tek: true, ilk: 500, kosul: (b, e) => e.hp < e.mx * .55 && !e.dokunulmaz, // arenanın arkasında gökyüzünden izleyen tek dev göz açılır; rakip diz çöker, üstüne üç baskı iner
        kullan(b, e, o) { e.don = Math.max(e.don, 54); o.sars(5);
          o.ekle({ alt: true, sahip: b, hedef: e, x: 0, y: 0, omur: 90,
            P: { sp: Array.from({ length: 50 }, () => [rnd(0, TAU_), rnd(.22, .47)]), // iç halkadaki benekler
              kir: Array.from({ length: 80 }, (_, i) => [i < 56 ? i / 56 : (i - 56) / 24, rnd(.7, 1.3), i >= 56, rnd(-.12, .12)]) },
            adim(m, o) { const s = m.sahip, e = m.hedef; if (s.hp <= 0) { m.olu = 1; return; }
              if (m.l < 54) { e.vx = e.vy = 0; e.y = Math.min(o.H - 6 - e.r, e.y + 2); } // diz çöker: yere çekilir
              if (m.l == 22 || m.l == 36 || m.l == 50) { const son = m.l == 50; o.vur(e, son ? 9 : 5, makimaKaynak(o, e.x, e.y - 30, son ? 1.8 : 1.1), son ? 14 : 2, 'alan'); e.ez = e.ezm = 16; e.ezq = .5; e.eza = Math.PI / 2;
                if (!o.sim) { o.sars(son ? 12 : 6); if (son) { vurusKaresi(o, e.x, e.y, 2.4); o.duvarVur(e.x, o.H, '#c0302a', 3); } } } },
            ciz(c, m, o) { const e = m.hedef, k = eo_(m.l / 18, 2), al = m.l < 70 ? k : (90 - m.l) / 20;
              const ac = m.l < 70 ? eo_(m.l / 22, 3) : (90 - m.l) / 20; // kapak açılır, sonunda kapanır
              makimaDevGoz(c, o, Math.max(.02, ac), kis((e.x - o.W / 2) / 260, -1, 1), kis((e.y - o.H * .46) / 160, -1, 1), al * .78, m.P);
              if (m.l < 56) halkalar(c, e.x, e.y, e.r + 20 + 6 * Math.sin(m.l * .3), al); } });
        } },
    ],
  },
  {
    ad: 'YEAT', renk: '#39e87a', can: 94, hiz: 1.05, tip: 'menzilli', menzil: 120, ucar: false,
    gorunum(c, b, o, bx, by) { // siyah kıvırcık örgü maske (yüz açıkta), siyah dikdörtgen gözlük, ince bıyık; boynunda buzlu zincir ve elmaslı küçük çan
      const fx = bx * 3, fy = by * 1.5, h = b.hafiza, t = o.t || 0, rage = t < (h.rageT || 0), ox = fx * .5, oy = 3.5 + fy * .5;
      c.lineCap = 'round';
      const kenar = (a, f = 1) => { const r = f * (1 + .018 * Math.sin(a * 9)); return [Math.cos(a) * 28.6 * r, Math.sin(a) * (Math.sin(a) < 0 ? 31.5 : 25) * r - 1.5]; }; // maskenin hacimli silueti: bere tepede kabarır, yanlardan topun dışına taşar
      for (const [a, L, z, acik, ph] of YEAT_TUY) { const px = -Math.sin(a) * z, py = Math.cos(a) * z, w = Math.sin(t * .06 + ph) * .4, [ex, ey] = kenar(a, .96); // siluetin kenarından taşan düzensiz kıvırcık iplikler
        c.strokeStyle = acik ? '#5a5a5a' : '#383838'; c.lineWidth = .9; c.beginPath(); let tx, ty;
        for (let j = 0; j <= 6; j++) { const u = j / 6, q = Math.sin(u * 7 + ph) * 1.3 * u + w * u; tx = ex + Math.cos(a) * L * u + px * q; ty = ey + Math.sin(a) * L * u + py * q; j ? c.lineTo(tx, ty) : c.moveTo(tx, ty); }
        const st = Math.atan2(-py, -px); c.arc(tx + px * .9, ty + py * .9, .9, st, st + 4.4 * z, z < 0); c.stroke(); }
      const yol = () => { c.beginPath(); for (let i = 0; i <= 60; i++) { const [x, y] = kenar(i / 60 * TAU_); i ? c.lineTo(x, y) : c.moveTo(x, y); } c.closePath(); };
      yol(); c.fillStyle = '#121212'; c.fill(); c.strokeStyle = 'rgba(255,255,255,.16)'; c.lineWidth = 1.2; c.stroke(); // siyah zeminde okunsun diye ince gri kenar ışığı
      c.save(); yol(); c.clip(); c.strokeStyle = 'rgba(255,255,255,.075)'; c.lineWidth = .8; // örgü dokusu
      for (let yy = -32; yy < 24; yy += 3.2) for (let xx = -30 + (yy * 1.7 % 3.4 + 3.4) % 3.4; xx < 30; xx += 3.4) { if (((xx - ox) / 16.5) ** 2 + ((yy - oy) / 13.5) ** 2 < 1) continue; c.beginPath(); c.arc(xx, yy, 1.2, Math.PI * .1, Math.PI * .9); c.stroke(); }
      c.strokeStyle = 'rgba(255,255,255,.1)'; c.lineWidth = .7; for (const yy of [-19, -17.4, -15.8]) { c.beginPath(); c.moveTo(-30, yy + 3); c.quadraticCurveTo(0, yy - 3, 30, yy + 3); c.stroke(); } // bere kıvrımı
      const gl = c.createRadialGradient(10, 10, 4, 6, 6, 34); gl.addColorStop(0, 'rgba(0,0,0,0)'); gl.addColorStop(1, 'rgba(0,0,0,.35)'); c.fillStyle = gl; c.fillRect(-32, -34, 64, 62); c.restore(); // hacim gölgesi
      c.save(); c.beginPath(); c.ellipse(ox, oy, 15.5, 12.5, 0, 0, TAU_); c.clip(); c.fillStyle = '#ecc8b0'; c.fillRect(-20, -12, 40, 32); // yüz
      c.fillStyle = 'rgba(120,60,40,.2)'; c.beginPath(); c.ellipse(ox + 6, oy + 4, 15, 12, 0, 0, TAU_); c.ellipse(ox, oy, 15.5, 12.5, 0, 0, TAU_); c.fill('evenodd'); c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(-20, oy - 13, 40, 4); c.restore(); // yüz gölgesi, maskenin alnına düşen gölge
      c.lineWidth = .8; for (let i = 0; i < 44; i++) { const a = i / 44 * TAU_ + Math.sin(i * 5.1) * .05, k = 1 + Math.sin(i * 3.7) * .06, x = ox + Math.cos(a) * 15.6 * k, y = oy + Math.sin(a) * 12.6 * k, r = .55 + (i * 7 % 5) * .13; // yüz açıklığının düzensiz tüylü kenarı
        c.strokeStyle = i % 4 ? '#1c1c1c' : '#353535'; c.beginPath(); c.arc(x - Math.cos(a) * .8, y - Math.sin(a) * .8, r, a + 1 + i % 3, a + 4.6 + i % 3); c.stroke(); }
      c.strokeStyle = 'rgba(70,46,34,.75)'; c.lineWidth = .9; c.beginPath(); c.moveTo(-3.4 + fx, 9.4 + fy); c.quadraticCurveTo(-1.6 + fx, 8.6 + fy, -.4 + fx, 8.9 + fy); c.moveTo(.4 + fx, 8.9 + fy); c.quadraticCurveTo(1.6 + fx, 8.6 + fy, 3.4 + fx, 9.4 + fy); c.stroke(); // ince bıyık
      if (b.ez > 0) aciAgiz(c, fx, fy); else { c.strokeStyle = '#8a4a44'; c.lineWidth = 1; c.beginPath(); c.moveTo(-2.4 + fx, 11.9 + fy); c.quadraticCurveTo(fx, 12.4 + fy, 2.6 + fx, 11.5 + fy); c.stroke(); } // düz, hafif yan ağız
      c.save(); c.translate(fx, -1.2 + fy); if (b.ez > 0) { c.translate(1, 1.5); c.rotate(.18); } // siyah dikdörtgen gözlük; vurulunca kayar
      for (const s of [-1, 1]) { const x0 = s < 0 ? -12.6 : 1.4, yol = () => { c.beginPath(); c.roundRect(x0, -3.4, 11.2, 6.4, [s < 0 ? 1 : .6, s < 0 ? .6 : 1, 2.2, 2.2]); };
        const g = c.createLinearGradient(0, -3.4, 0, 3); g.addColorStop(0, '#020302'); g.addColorStop(1, rage ? '#123e24' : '#0d1f15'); yol(); c.fillStyle = g; c.fill();
        c.save(); yol(); c.clip(); c.fillStyle = rage ? 'rgba(57,232,122,.65)' : 'rgba(57,232,122,.32)'; c.beginPath(); c.moveTo(x0 + 2, 3); c.lineTo(x0 + 5, -3.4); c.lineTo(x0 + 6.4, -3.4); c.lineTo(x0 + 3.4, 3); c.fill(); // yeşil yansıma
          c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.moveTo(x0 + 7.4, 3); c.lineTo(x0 + 9.6, -3.4); c.lineTo(x0 + 10.2, -3.4); c.lineTo(x0 + 8, 3); c.fill(); c.restore();
        c.strokeStyle = '#000'; c.lineWidth = 1.3; yol(); c.stroke(); }
      c.strokeStyle = '#000'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-1.4, -2.2); c.lineTo(1.4, -2.2); c.moveTo(-12.6, -2.4); c.lineTo(-15.6, -2.8); c.moveTo(12.6, -2.4); c.lineTo(15.6, -2.8); c.stroke(); c.restore();
      for (let i = 0; i <= 16; i++) { const u = i / 16, a = Math.PI * (.12 + .76 * u), x = Math.cos(a) * 16.5, y = 9 + Math.sin(a) * 11.6, ta = Math.atan2(Math.cos(a) * 11.6, -Math.sin(a) * 16.5); // buzlu zincir
        c.fillStyle = i % 2 ? '#8f9895' : '#e3eae7'; c.strokeStyle = '#2a2e2c'; c.lineWidth = .4; c.beginPath(); c.ellipse(x, y, 1.6, i % 2 ? .7 : 1.1, ta, 0, TAU_); c.fill(); c.stroke();
        if ((i * 7 + (t / 7 | 0)) % 11 == 0) parilti(c, x, y - .5, 2.4, .9); }
      yeatCan(c, 0, 19.2, 4.6, Math.sin(t * .08) * .18, 1, rage ? .7 : 0); // zincirin ucunda elmaslı küçük çan
    },
    skiller: [
      { ad: 'Rage', // pasif: 150 BPM beat nabzı. Vurdukça (×6) ve vuruldukça (×4.5) Rage dolar; dolunca 4 sn hız ×1.2, hasar ×1.2, yakın vuruştan %35 az hasar, glitch izi
        pasif(b, e, o) { const h = b.hafiza;
          if (!(o.t < (h.rageT || 0)) && (h.rage || 0) >= 100) { h.rage = 0; h.rageT = o.t + 240; if (!o.sim) { o.sars(6); yeatYazi(o, b.x, b.y - 42, 'RAGE', 20); yeatFx(o, b.x, b.y, 1.6); } }
          b.hizx = o.t < (h.rageT || 0) ? 1.2 : 1;
          if (!o.sim && b.hizx > 1 && o.t % 3 == 0) { (h.iz ||= []).push([b.x, b.y, o.t]); if (h.iz.length > 6) h.iz.shift(); } },
        hasarAl(b, d, bilgi, o) { const h = b.hafiza; if (o.t < (h.rageT || 0)) return bilgi.tur == 'yakin' ? d * .65 : d; h.rage = Math.min(100, (h.rage || 0) + d * 4.5); return d; }, // Rage: yakın dövüşçüye karşı mosh pit zırhı
        ciz(c, b, o) { const h = b.hafiza, f = o.t % YEAT_BEAT, rage = o.t < (h.rageT || 0);
          if (f < 10) { const u = f / 10; halka(c, b.x, b.y, b.r + 3 + u * (rage ? 24 : 12), '#39e87a', 2.4 * (1 - u), (rage ? .85 : .45) * (1 - u)); } // beat nabzı
          if (rage) { for (const [x, y, t] of h.iz || []) if (o.t - t < 18) glitchHayalet(c, x, y, b.r, (1 - (o.t - t) / 18) * .6, o.t);
            for (let i = 0; i < 3; i++) { const a = o.t * .07 + i * 2.1, r = b.r + 10 + 4 * Math.sin(o.t * .2 + i); elmas(c, b.x + Math.cos(a) * r, b.y + Math.sin(a) * r, 2.6, a, .9); } } // etrafında dönen elmaslar
          else if (h.rage > 0) { c.save(); c.strokeStyle = '#39e87a'; c.globalAlpha = .55; c.lineWidth = 2; c.lineCap = 'round'; const k = h.rage / 100 * Math.PI * .45; // Rage göstergesi: topun altında dolan yay
            c.beginPath(); c.arc(b.x, b.y, b.r + 7, Math.PI / 2 - k, Math.PI / 2 + k); c.stroke(); c.restore(); } } },

      { ad: 'Çan', isabet: 'guvenilir', bekleme: 86, ilk: 40, kosul: (b, e) => uzak(b, e) < b.r + e.r + 110 && !e.dokunulmaz, // zincirli çanı savurur, beat'te rakibe iner: DONG
        kullan(b, e, o) { const vL = yeatBeat(o, 9);
          o.ekle({ sahip: b, hedef: e, x: b.x, y: b.y, omur: vL + 16, vL, z: Math.random() < .5 ? -1 : 1, a: yonu(b, e), iz: [],
            adim(m, o) { const s = m.sahip, e = m.hedef; if (s.hp <= 0) { m.olu = 1; return; }
              if (m.l <= m.vL) { m.a = yonu(s, e); const p = m.l / m.vL, R = s.r + 14 + (Math.min(uzak(s, e), s.r + e.r + 145) - s.r - 14) * eo_(p, 4), q = m.a + (1 - eo_(p, 2)) * 3.2 * m.z;
                m.iz.push([m.x, m.y]); if (m.iz.length > 4) m.iz.shift(); m.x = s.x + Math.cos(q) * R; m.y = s.y + Math.sin(q) * R; }
              else { m.x += (s.x - m.x) * .22; m.y += (s.y - m.y) * .22; }
              if (m.l == m.vL) { m.dong = 1; m.hx = m.x; m.hy = m.y; if (uzak(m, e) < e.r + 24) { const v = yeatVur(o, s, e, 6, yeatKaynak(o, m.x, m.y, 1.1), 14, 'yakin'); if (!o.sim) { o.sars(5); if (v > 0 && Math.random() < .3) yeatYazi(o, e.x, e.y - 34, YEAT_ADLIB[rnd(0, YEAT_ADLIB.length) | 0]); } } } },
            ciz(c, m, o) { const s = m.sahip, al = m.l < m.vL + 6 ? 1 : 1 - (m.l - m.vL - 6) / 10, g = yonu(s, m), S = 27, tx = m.x - Math.cos(g) * S * .6, ty = m.y - Math.sin(g) * S * .6;
              if (!m.dong) m.iz.forEach(([x, y], i) => yeatCan(c, x - Math.cos(g) * S * .6, y - Math.sin(g) * S * .6, S, g - Math.PI / 2, (i + 1) * .08, .4)); // savrulma izi
              zincir(c, s.x + Math.cos(g) * s.r * .7, s.y + Math.sin(g) * s.r * .7, tx, ty, al, 5, 3.2, undefined, undefined, YEAT_ZINCIR);
              yeatCan(c, tx, ty, S, g - Math.PI / 2, al, m.dong ? 1 - (m.l - m.vL) / 16 : .3);
              if (m.dong) { const u = (m.l - m.vL) / 16; for (let i = 0; i < 4; i++) halka(c, m.hx, m.hy, 12 + i * 14 + 64 * eo_(u), i % 2 ? '#ffffff' : '#39e87a', 4 * (1 - u), (1 - u) * (1 - i * .2)); } } }); // DONG: vuruş noktasından yayılan ses halkaları
        } },

      { ad: '808', isabet: 'normal', bekleme: 240, ilk: 120, kosul: (b, e) => uzak(b, e) < 150 && !e.dokunulmaz, // bas düşer: altında dev hoparlör pompalar, beat'te şok dalgası rakibi duvara fırlatır; duvara çarparsa ek hasar
        kullan(b, e, o) { const vL = yeatBeat(o, 12);
          o.ekle({ alt: true, sahip: b, hedef: e, x: b.x, y: b.y, omur: vL + 40, vL,
            adim(m, o) { const s = m.sahip, e = m.hedef; if (s.hp <= 0) { m.olu = 1; return; } m.x = s.x; m.y = s.y;
              if (m.l == m.vL) { if (!o.sim) o.sars(9); if (uzak(s, e) < 205) { yeatVur(o, s, e, 5, yeatKaynak(o, s.x, s.y, 1.2), 24, 'alan'); m.it = 1; } }
              if (m.it && !m.duvar && m.l > m.vL + 2 && m.l < m.vL + 30 && duvarda(e, o, e.r + 5)) { m.duvar = 1; yeatVur(o, s, e, 4, yeatKaynak(o, e.x, e.y, 1.3), 4, 'alan'); o.duvarVur(e.x, e.y, '#39e87a', 2);
                if (!o.sim) { o.sars(7); vurusKaresi(o, e.x, e.y, 1.2, false); } } },
            ciz(c, m, o) {
              if (m.l < m.vL + 14) { const k = eo_(Math.min(1, m.l / 8)), al = m.l < m.vL ? k : 1 - (m.l - m.vL) / 14, p = m.l < m.vL ? Math.sin(m.l * 1.4) * 2 : 6 * al; // hoparlör konisi pompalar
                c.save(); c.globalAlpha = al; c.fillStyle = '#050605'; c.beginPath(); c.arc(m.x, m.y, 50 * k, 0, TAU_); c.fill();
                const g = c.createRadialGradient(m.x, m.y, 2, m.x, m.y, 40 * k); g.addColorStop(0, '#454c49'); g.addColorStop(.7, '#161917'); g.addColorStop(1, '#0b0d0c'); c.fillStyle = g; c.beginPath(); c.arc(m.x, m.y, (40 + p * .4) * k, 0, TAU_); c.fill();
                c.restore(); halka(c, m.x, m.y, 48 * k, '#1f8f4e', 3, al); halka(c, m.x, m.y, (41 + p * .4) * k, '#2f3532', 4, al); halka(c, m.x, m.y, (30 + p * .6) * k, '#39e87a', 1, al * .6);
                for (let i = 0; i < 8; i++) { const a = i * TAU_ / 8 + .39; c.fillStyle = '#9aa29f'; c.globalAlpha = al; c.beginPath(); c.arc(m.x + Math.cos(a) * 45 * k, m.y + Math.sin(a) * 45 * k, 1.4, 0, TAU_); c.fill(); } c.globalAlpha = 1; } // vida başları
              if (m.l >= m.vL) { const u = (m.l - m.vL) / 40, al = 1 - u;
                for (let i = 0; i < 3; i++) halka(c, m.x, m.y, 26 + 180 * eo_(Math.min(1, u * 1.7 + i * .07), 3), i == 1 ? '#ffffff' : '#39e87a', (7 - i * 2.2) * al + .5, al * (1 - i * .22));
                const r = 26 + 180 * eo_(Math.min(1, u * 1.7), 3); for (let i = 0; i < 10; i++) { const a = i * TAU_ / 10 + u; elmas(c, m.x + Math.cos(a) * r, m.y + Math.sin(a) * r, 3.4 * al, a, al); } } } });
        } },

      { ad: 'Glitch', isabet: 'normal', bekleme: 360, ilk: 150, kosul: (b, e) => uzak(b, e) > 150 && !e.dokunulmaz && e.don <= 0, // bozulup kaybolur, beat'te rakibin arkasında belirir ve vurur
        kullan(b, e, o) { const vL = yeatBeat(o, 8);
          o.ekle({ sahip: b, hedef: e, x: b.x, y: b.y, omur: vL + 22, vL, ox: b.x, oy: b.y,
            adim(m, o) { const s = m.sahip, e = m.hedef; if (s.hp <= 0) { m.olu = 1; return; }
              if (m.l < m.vL) { s.vx *= .6; s.vy *= .6; m.ox = s.x; m.oy = s.y; }
              if (m.l == m.vL) { const a = yonu(s, e), R = e.r + s.r + 4; s.x = kis(e.x + Math.cos(a) * R, s.r + 6, o.W - s.r - 6); s.y = kis(e.y + Math.sin(a) * R, s.r + 6, o.H - s.r - 6); s.vx = s.vy = 0;
                if (uzak(s, e) < s.r + e.r + 24) yeatVur(o, s, e, 4, yeatKaynak(o, s.x, s.y, 1.1), 11, 'yakin'); if (!o.sim) { o.sars(5); yeatFx(o, m.ox, m.oy, 1); } } },
            ciz(c, m, o) { const s = m.sahip;
              if (m.l < m.vL) glitchHayalet(c, s.x, s.y, s.r + 2, .4 + .6 * m.l / m.vL, o.t); // kaybolurken bozulur
              else { const u = (m.l - m.vL) / 22; glitchHayalet(c, m.ox, m.oy, s.r, 1 - u, o.t); glitchHayalet(c, s.x, s.y, s.r + 5 * (1 - u), (1 - u) * .8, o.t + 3);
                c.save(); c.globalAlpha = 1 - u; c.strokeStyle = '#39e87a'; c.lineWidth = 2; c.setLineDash([6, 5]); c.lineDashOffset = -o.t * 2; c.beginPath(); c.moveTo(m.ox, m.oy); c.lineTo(s.x, s.y); c.stroke(); c.restore(); } } }); // eski yerden yenisine kesik kesik iz
        } },

      { ad: 'Tonka', isabet: 'nadir', bekleme: 420, ilk: 260, kosul: (b, e) => !e.dokunulmaz, // rakibin hizasında şerit belirir, duvardan farlar yanar; beat'te dev siyah Tonka arenayı boydan boya geçip çarpar
        kullan(b, e, o) { const vL = yeatBeat(o, 34), dir = e.x >= b.x ? 1 : -1;
          o.ekle({ sahip: b, hedef: e, x: dir > 0 ? -120 : o.W + 120, y: e.y, ly: e.y, omur: vL + 34, vL, dir, v: 0, iz: [],
            adim(m, o) { const s = m.sahip, e = m.hedef; if (s.hp <= 0) { m.olu = 1; return; }
              if (m.l < m.vL - 14) { m.ly += (e.y - m.ly) * .3; m.y = m.ly; return; } // şerit rakibin hizasını izler, son 0.23 sn kilitli
              if (m.l == m.vL - 14) m.v = Math.max(12, (Math.abs(e.x - m.x) - 66) / 14); // ön tampon beat'te rakibe varır
              m.x += m.dir * m.v; if (!o.sim && m.l % 2 == 0) { m.iz.push([m.x - m.dir * 70, m.y + 30, m.l]); if (m.iz.length > 8) m.iz.shift(); }
              if (!m.vurdu && Math.abs(e.x - m.x) < 66 + e.r && Math.abs(e.y - m.ly) < 24 + e.r * .5) { m.vurdu = 1; const v = yeatVur(o, s, e, 12, yeatKaynak(o, e.x - m.dir * 40, m.ly, 1.6), 18, 'alan');
                if (!o.sim && v > 0) { o.sars(10); vurusKaresi(o, e.x, e.y, 1.6); yeatYazi(o, e.x, e.y - 40, 'skrrt', 18); } } },
            ciz(c, m, o) { const al = Math.min(1, m.l / 8, (m.omur - m.l) / 6), W = o.W, gel = m.l >= m.vL - 14;
              c.save(); c.beginPath(); c.rect(0, 0, W, o.H); c.clip(); // kamyonet arenaya kırpılır
              if (!gel || m.l < m.vL + 4) { const k = Math.min(1, m.l / (m.vL - 14)), y = m.ly; c.fillStyle = 'rgba(57,232,122,' + .1 * al + ')'; c.fillRect(0, y - 36, W, 72); // şerit
                c.strokeStyle = 'rgba(57,232,122,' + .55 * al + ')'; c.lineWidth = 1.5; c.setLineDash([16, 12]); c.lineDashOffset = -o.t * 3 * m.dir; for (const d of [-36, 36]) { c.beginPath(); c.moveTo(0, y + d); c.lineTo(W, y + d); c.stroke(); } c.setLineDash([]);
                for (let i = 0; i < 6; i++) { const x = ((i * 120 + o.t * 6 * m.dir) % W + W) % W; c.fillStyle = 'rgba(182,255,210,' + .4 * al * k + ')'; c.beginPath(); c.moveTo(x + m.dir * 12, y); c.lineTo(x - m.dir * 4, y - 12); c.lineTo(x - m.dir * 4, y + 12); c.fill(); } // akan oklar
                const fx = m.dir > 0 ? 0 : W, g = c.createRadialGradient(fx, y, 4, fx, y, 160 * k + 20); g.addColorStop(0, 'rgba(240,255,248,' + .8 * k * al + ')'); g.addColorStop(1, 'rgba(240,255,248,0)'); c.fillStyle = g; c.fillRect(fx - 200, y - 200, 400, 400); } // duvardan yaklaşan farlar
              if (gel) { for (const [x, y, l] of m.iz) { const u = (m.l - l) / 16; if (u < 1) { c.fillStyle = 'rgba(160,170,165,' + .35 * (1 - u) + ')'; c.beginPath(); c.arc(x - m.dir * u * 20, y - u * 14, 8 + u * 16, 0, TAU_); c.fill(); } } // lastik dumanı
                c.strokeStyle = 'rgba(232,251,255,' + .5 * al + ')'; c.lineWidth = 2; for (let i = 0; i < 6; i++) { const yy = m.ly - 34 + i * 13, x0 = m.x - m.dir * (80 + (i * 37 % 50)); c.beginPath(); c.moveTo(x0, yy); c.lineTo(x0 - m.dir * (60 + i * 9), yy); c.stroke(); } // hız çizgileri
                yeatTonka(c, m.x, m.ly, m.dir, al, o.t); }
              c.restore(); } });
        } },

      { ad: 'Afterlyfe', tek: true, ilk: 520, kosul: (b, e) => e.hp < e.mx * .55 && !e.dokunulmaz, // arena kararır, yeşil lazerler; arkada dev elmaslı çan iner, 4 beat çalar, her çalış şok dalgası
        kullan(b, e, o) { const v0 = yeatBeat(o, 30), om = v0 + YEAT_BEAT * 3 + 34; o.sars(4); if (!o.sim) yeatYazi(o, b.x, b.y - 46, 'AFTERLYFE', 18);
          o.ekle({ sahip: b, x: 0, y: 0, omur: om, ciz(c, m) { const s = m.sahip, al = Math.min(1, m.l / 12, (m.omur - m.l) / 16), x = s.x, y = s.y - s.r - 9; // başında yeşil hale
            c.save(); c.globalAlpha = al; c.strokeStyle = 'rgba(57,232,122,.35)'; c.lineWidth = 6; c.beginPath(); c.ellipse(x, y, 15, 4.5, 0, 0, TAU_); c.stroke(); c.strokeStyle = '#e8fbff'; c.lineWidth = 1.8; c.stroke(); c.restore(); } });
          o.ekle({ alt: true, sahip: b, hedef: e, x: 0, y: 0, v0, omur: om, son: -99, E: Array.from({ length: 28 }, () => [rnd(0, 1), rnd(0, 1), rnd(2, 4), rnd(0, TAU_)]),
            adim(m, o) { const s = m.sahip, e = m.hedef; if (s.hp <= 0) { m.olu = 1; return; } e.vx *= .94; e.vy *= .94;
              const f = m.l - m.v0; if (f >= 0 && f % YEAT_BEAT == 0 && f <= YEAT_BEAT * 3) { const son = f == YEAT_BEAT * 3; m.son = m.l; m.z = (f / YEAT_BEAT) % 2 ? -1 : 1;
                yeatVur(o, s, e, son ? 8 : 4, yeatKaynak(o, e.x, e.y - 30, son ? 1.8 : 1.1), son ? 16 : 3, 'alan');
                if (!o.sim) { o.sars(son ? 12 : 6); if (son) { vurusKaresi(o, e.x, e.y, 2.2); yeatYazi(o, e.x, e.y - 40, 'twizzy!', 20); } } } },
            ciz(c, m, o) { const al = Math.min(1, m.l / 14, (m.omur - m.l) / 20), W = o.W, H = o.H, d = m.l - m.son, fl = d >= 0 && d < 10 ? 1 - d / 10 : 0;
              c.fillStyle = 'rgba(0,5,2,' + .86 * al + ')'; c.fillRect(0, 0, W, H);
              c.save(); c.lineCap = 'round'; for (let i = 0; i < 6; i++) { const sol = i < 3, x0 = sol ? 30 : W - 30, a = (sol ? .55 : Math.PI - .55) + (sol ? 1 : -1) * (i % 3) * .32 + Math.sin(m.l * .035 + i * 1.7) * .3; // köşelerden süpüren yeşil lazerler
                const x1 = x0 + Math.cos(a) * 900, y1 = -6 + Math.sin(a) * 900; c.strokeStyle = 'rgba(57,232,122,' + (.07 + .1 * fl) * al + ')'; c.lineWidth = 10; c.beginPath(); c.moveTo(x0, -6); c.lineTo(x1, y1); c.stroke();
                c.strokeStyle = 'rgba(182,255,210,' + (.4 + .4 * fl) * al + ')'; c.lineWidth = 1.6; c.stroke(); } c.restore();
              for (const [x, y, s, ph] of m.E) parilti(c, x * W, y * H, s * (1 + fl), al * (.35 + .4 * Math.sin(m.l * .12 + ph)));
              const ty = -220 + 236 * eo_(Math.min(1, m.l / m.v0), 3), sw = d >= 0 ? .2 * m.z * Math.sin(d * .2) * Math.exp(-d / 34) : 0, S = H * .56; // dev çan iner, her çalışta sallanır
              zincir(c, W / 2, -8, W / 2, ty, al, 0, 8, undefined, undefined, YEAT_ZINCIR);
              yeatCan(c, W / 2, ty, S, sw, al * .95, .2 + .7 * fl);
              if (d >= 0 && d < YEAT_BEAT + 10) { const u = d / (YEAT_BEAT + 10), mx = W / 2 - Math.sin(sw) * S * 1.1, my = ty + Math.cos(sw) * S * 1.1; // çalış: çanın ağzından yayılan ses dalgaları
                for (let i = 0; i < 3; i++) halka(c, mx, my, 30 + i * 30 + 420 * eo_(u, 2), i == 1 ? '#ffffff' : '#39e87a', (8 - i * 2.5) * (1 - u) + .5, al * (1 - u) * (1 - i * .2)); } } });
        } },
    ],
  },
];
