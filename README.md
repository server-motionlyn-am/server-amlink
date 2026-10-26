# MotionLyn · Server GitHub untuk Link AM

Folder ini adalah isi **repo GitHub** milikmu. Tugasnya: mengunduh paket link Alight Motion
(XML + semua media) **di server GitHub**, bukan di browser/HP. Jadi bebas error CORS di versi web.

```
MotionLyn (web) ──picu──▶ GitHub Actions ──unduh──▶ server Alight Motion
       ▲                        │
       └──── ambil hasil ◀──── branch "amcache" di repo ini
```

## Pasang (sekali saja, ±10 menit, bisa dari HP)

**1. Buat repo.** GitHub → **New repository** → nama bebas (mis. `motionlyn-am`) → pilih **Private** → Create.

**2. Upload isi folder ini** ke repo: tombol **Add file → Upload files**, pilih semua isi folder
(`scripts/`, `README.md`, dst.) lalu **Commit changes**.

> Folder `.github` kadang tidak ikut terunggah dari HP. Cek tab **Actions**: kalau workflow **AM Fetch** tidak
> muncul, buat manual: **Add file → Create new file**, ketik nama `.github/workflows/amfetch.yml`
> (ketik garis miring supaya folder terbentuk), lalu tempel seluruh isi `workflow-salin.txt`, **Commit**.
> Nama file harus tepat `amfetch.yml`.

**3. Izinkan workflow menulis.** Repo → **Settings → Actions → General → Workflow permissions** →
pilih **Read and write permissions** → **Save**.

**4. Buat token.** GitHub → foto profil → **Settings → Developer settings → Personal access tokens →
Fine-grained tokens → Generate new token**:
- *Repository access*: **Only select repositories** → pilih repo tadi
- *Permissions → Repository permissions*: **Actions: Read and write** dan **Contents: Read-only**
- Atur masa berlaku (mis. 90 hari), **Generate**, lalu **salin tokennya** (hanya tampil sekali).

**5. Isi di MotionLyn (web).** **Link AM → Server GitHub**: isi `username/nama-repo` dan token →
**Uji koneksi** (harus muncul ✓) → **Simpan**. Selesai. Tempel link AM seperti biasa.

## Cara pakai & waktu tunggu
- Tempel link → MotionLyn memicu workflow → GitHub mengunduh paket → hasil diambil web.
  Biasanya **30–90 detik** (layar tunggu menampilkan statusnya).
- Link yang sama dalam 24 jam diambil dari **cache** (langsung, tanpa menunggu).
- Link pendek `alight.link` juga diurus server GitHub.
- Kalau server GitHub gagal, MotionLyn otomatis mencoba jalur langsung, dan pesan error menyebut kedua alasannya.

## Catatan
- **Token = kunci akses ke repo.** Jangan dibagikan. Tersimpan hanya di perangkat/browser yang kamu isi. Kalau bocor, cabut di
  Settings → Developer settings, lalu buat baru.
- Repo **Private** disarankan: hasil unduhan (cache) tidak terlihat orang lain. Hasil otomatis dihapus setelah 24 jam
  dan riwayat branch `amcache` selalu diratakan (ukuran repo tidak membengkak).
- Batas paket **300 MB** (dipotong 40 MB per bagian, lalu digabung lagi oleh MotionLyn).
- Akun gratis: GitHub memberi ±2.000 menit Actions/bulan untuk repo privat; satu impor memakai kurang dari 1 menit.
- Kalau gagal: buka tab **Actions** di repo, klik run terakhir untuk melihat lognya.
- Ini hanya untuk **versi web**. Aplikasi Android tidak memerlukannya.

## Isi repo
- `.github/workflows/amfetch.yml`: workflow (dijalankan lewat API / tombol *Run workflow*)
- `scripts/fetch-am.mjs`: mengunduh paket AM, memotong, menulis hasil
- `scripts/prune.mjs`: membersihkan cache lama
