# Arena

Kendi top dövüş oyunumuz: iki rastgele chibi kafa top dövüşür, maç bitince yenisi başlar. Saf statik sayfa (`index.html` + `karakterler.js` + `istat.html`), derleme yok.

- **Yayın:** GitHub Pages, `main` dalına her push otomatik yayınlanır → https://de1readh.github.io/arena/
- **Dock bağlantısı:** `D:\Projects\Dock\static\arena` bu klasöre bağlantı (junction). Buradaki her değişiklik Dock panelinin boşta ekranında da görünür.

## Kurallar

- Kullanıcıyla Türkçe konuş.
- **8765 Dock'un gerçek panel sunucusu. Kapatma, yeniden başlatma, testte kullanma.** Testler 8799'da: `.claude/launch.json` → `arena-test`. Adres `http://localhost:8799/`.
- Büyük adımdan önce ne yapacağını ve neye benzeyeceğini anlat, onay bekle.
- Değiştirmeden önce commit at (yedek dosyası yerine git). Eski yedek dosyaları `yedek/` içinde, git'e girmez.
- Push = internette yayın. Kullanıcı istemeden push etme.

Karakter eklemek ya da oyunu geliştirmek için önce `README.md` dosyasını oku: test araçları, kalıcı tasarım kararları, kadro, kaynak bayrakları, güncel denge ve açık konular orada.
