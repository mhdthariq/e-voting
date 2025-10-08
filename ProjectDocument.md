# 📄 LAPORAN SPESIFIKASI WEBSITE E-VOTING — BLOCKVOTE

## 1. Nama Project

**BlockVote**

---

## 2. Deskripsi Singkat

**BlockVote** adalah prototipe sistem e-voting berbasis website dengan arsitektur **monolith Next.js**, yang menggabungkan frontend dan backend dalam satu aplikasi.
Sistem ini mensimulasikan konsep blockchain sederhana untuk memastikan keamanan, transparansi, dan keutuhan data suara tanpa mengorbankan kerahasiaan pemilih.
BlockVote memiliki tiga peran utama: **Admin Website**, **Akun Organisasi**, dan **Akun Voter**.
Voting dilakukan melalui browser, dan hasilnya disimpan dalam rantai blok (*blockchain*) menggunakan mekanisme *hash chaining* dan *digital signature* untuk mencegah manipulasi data atau injeksi hash palsu.

---

## 3. Struktur Akun dan Hak Akses

### 3.1. Admin Website

* Memiliki hak akses absolut (super admin).
* Melihat seluruh daftar akun organisasi dan election aktif.
* Dapat menghentikan election dari organisasi mana pun.
* Dapat melihat hasil election dan status partisipasi voter (sudah/belum vote).
* Tidak dapat melihat kandidat yang dipilih individu (rahasia suara terjaga).
* Mampu memverifikasi integritas blockchain (validasi hash & rantai blok).

### 3.2. Akun Organisasi

* Membuat election (judul, deskripsi, jadwal, dan kandidat).
* Menambahkan daftar voter (nama & email).
* Sistem otomatis membuat akun voter (username & password acak).
* Dapat melihat status voter (sudah/belum vote).
* Dapat menghentikan election dan melihat hasil perolehan suara.
* Setelah dihentikan, hasil disimpan dan semua akun voter menjadi nonaktif.
* Tetap dapat memantau riwayat hasil dan status voter walau akun voter telah dinonaktifkan.

### 3.3. Akun Voter

* Login dengan username dan password acak yang dikirim via email.
* Melihat election aktif untuknya.
* Memberikan suara satu kali untuk kandidat pilihan.
* Vote disimpan dalam blockchain dengan tanda tangan digital.
* Akun dinonaktifkan setelah election dihentikan.

---

## 4. Fitur Utama

### 4.1. Pembuatan Election

* Organisasi membuat election dan mengunggah daftar voter (nama + email).
* Sistem otomatis membuat akun voter (username & password acak).
* Email undangan dikirim ke setiap voter berisi kredensial login.

### 4.2. Proses Voting

* Voter login, melihat daftar kandidat, lalu memilih satu kandidat.
* Vote disimpan sebagai transaksi di blockchain dengan tanda tangan digital.
* Status voter berubah menjadi *“sudah vote”*.

### 4.3. Penghentian Election

* Organisasi atau admin dapat menghentikan election.
* Sistem mengirim email hasil election ke seluruh voter dan organisasi.
* Akun voter menjadi *inactive*.
* Hasil election tetap dapat dilihat di dashboard.

---

## 5. Keamanan Blockchain (Mitigasi Hash Injection)

Untuk mencegah serangan seperti **hash injection, collision, atau length extension**, sistem menggunakan beberapa mekanisme keamanan kriptografi:

| Potensi Serangan                  | Penjelasan                                                                              | Mitigasi                                                                   |
| --------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **Hash Injection / Manipulation** | Penyerang mencoba mengubah isi block/vote dan menghasilkan hash palsu agar tampak valid | Gunakan **double SHA-256** dan **canonical serialization** sebelum hashing |
| **Collision Attack**              | Dua data berbeda menghasilkan hash sama                                                 | Gunakan **SHA-256** (bukan MD5/SHA-1)                                      |
| **Length Extension Attack**       | Penyerang menambahkan data ke hash lama untuk membuat hash baru valid                   | Gunakan **double hash** atau **HMAC-SHA256**                               |
| **Replay Attack**                 | Vote lama dikirim ulang                                                                 | Gunakan kombinasi `voteId + voterPublicKey + electionId` dan status voted  |
| **Block Tampering**               | Penyerang menambah atau mengganti blok di rantai                                        | Gunakan `prevHash` dan `nonce` dengan Proof-of-Work ringan                 |
| **Signature Forgery**             | Penyerang membuat vote palsu                                                            | Semua vote wajib memiliki **digital signature (Ed25519)**                  |
| **Non-Deterministic Hash**        | Hash berbeda karena JSON field acak                                                     | Gunakan **canonical serialization** (urutan field tetap dan deterministik) |

### 🔐 Langkah Implementasi

1. **Double Hash (SHA-256)**
   Setiap block dan vote di-hash dua kali (`SHA256(SHA256(data))`) untuk mencegah manipulasi langsung.
2. **Canonical Serialization**
   Gunakan urutan tetap pada field block (`index|prevHash|merkleRoot|timestamp|electionId|nonce`).
3. **Digital Signature**
   Setiap vote disertai tanda tangan digital menggunakan kunci privat voter.
4. **Merkle Root Validation**
   Semua vote dalam block disusun ke Merkle Tree, `merkleRoot` disimpan dalam header block.
5. **Proof-of-Work (Nonce)**
   Untuk menambah block, sistem mencari hash yang memenuhi kriteria difficulty ringan (contoh: dua digit 0 di depan).
6. **Anti-Replay Protection**
   Vote hanya diterima jika voter belum pernah voting di election tersebut.
7. **Audit Trail**
   Akun dan data vote tidak dihapus fisik — hanya berstatus *inactive* agar integritas log tetap bisa diaudit.

---

## 6. Workflow Sistem

### 6.1. Admin Website

1. Login → Melihat daftar organisasi & election aktif.
2. Menghentikan election bermasalah (jika perlu).
3. Melihat hasil election & validasi blockchain.

### 6.2. Akun Organisasi

1. Login → Membuat election → Menambahkan kandidat & voter.
2. Sistem mengirim email undangan ke voter.
3. Memantau status voting (sudah/belum vote).
4. Menghentikan election → Sistem menonaktifkan akun voter & mengirim email hasil.

### 6.3. Akun Voter

1. Menerima email undangan → Login ke website.
2. Melihat kandidat → Memberikan suara (sekali).
3. Vote diverifikasi & ditambahkan ke blockchain.
4. Akun nonaktif setelah election dihentikan.

---

## 7. Teknologi yang Digunakan

* **Framework:** Next.js (monolith: frontend + backend).
* **Bahasa:** JavaScript (Node.js).
* **Database:** SQLite / PostgreSQL (penyimpanan akun & metadata election).
* **Blockchain Logic:** Custom JavaScript (SHA-256, proof-of-work ringan, digital signature).
* **Email Service:** Nodemailer (SMTP / SendGrid / Mailgun).
* **Deployment:** Domain `blockvote.org`, HTTPS aktif.

---

## 8. Tujuan Pengembangan

* Sebagai **prototipe proyek kampus** untuk demonstrasi konsep blockchain voting.
* Fokus pada keamanan data, validasi blockchain, dan privasi pemilih.
* Implementasi sederhana namun mencakup prinsip fundamental: *immutability*, *integrity*, dan *non-repudiation*.

---

# ⚙️ Contoh Implementasi Kode Blockchain Aman (Next.js / Node.js)

Berikut kode yang dapat kamu tempatkan di folder `lib/blockchain.js` atau `utils/blockchain.js`:

```js
import crypto from "crypto";

// === Canonical serialization ===
function canonicalSerializeBlock(block) {
  const data = [
    block.index,
    block.prevHash,
    block.merkleRoot,
    block.timestamp,
    block.electionId,
    block.nonce
  ].join("|");
  return Buffer.from(data, "utf8");
}

// === Double SHA-256 ===
function doubleSha256(buffer) {
  const first = crypto.createHash("sha256").update(buffer).digest();
  return crypto.createHash("sha256").update(first).digest("hex");
}

// === Proof-of-Work ===
function mineBlock(block, difficulty = 2) {
  block.nonce = 0;
  while (true) {
    const hash = doubleSha256(canonicalSerializeBlock(block));
    if (hash.startsWith("0".repeat(difficulty))) {
      block.hash = hash;
      return block;
    }
    block.nonce++;
  }
}

// === Create vote hash ===
function hashVote(vote) {
  const data = [
    vote.voteId,
    vote.electionId,
    vote.voterPublicKey,
    vote.candidateId,
    vote.timestamp
  ].join("|");
  return doubleSha256(Buffer.from(data, "utf8"));
}

// === Digital signature verification ===
function verifyVoteSignature(pubKeyPem, vote, signatureHex) {
  const verify = crypto.createVerify("SHA256");
  verify.update(hashVote(vote));
  verify.end();
  return verify.verify(pubKeyPem, Buffer.from(signatureHex, "hex"));
}

// === Merkle root calculation ===
function merkleRoot(hashes) {
  if (hashes.length === 0) return "";
  while (hashes.length > 1) {
    const temp = [];
    for (let i = 0; i < hashes.length; i += 2) {
      const left = hashes[i];
      const right = hashes[i + 1] || left;
      temp.push(doubleSha256(Buffer.from(left + right, "utf8")));
    }
    hashes = temp;
  }
  return hashes[0];
}

// === Validate blockchain ===
function validateChain(chain) {
  for (let i = 1; i < chain.length; i++) {
    const prev = chain[i - 1];
    const current = chain[i];
    const expectedHash = doubleSha256(canonicalSerializeBlock(current));
    if (current.prevHash !== prev.hash || current.hash !== expectedHash) {
      return false;
    }
  }
  return true;
}

export {
  mineBlock,
  hashVote,
  verifyVoteSignature,
  merkleRoot,
  validateChain,
  doubleSha256,
};
```

---

# ✅ Ringkasan Tambahan untuk Implementasi

| Komponen                                         | Deskripsi                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------ |
| **Blockchain disimpan di memori atau file JSON** | Sesuai versi terminal, mudah untuk debugging.                      |
| **Vote disertai signature dan public key**       | Mencegah pemalsuan data.                                           |
| **Block diverifikasi sebelum disimpan**          | Pastikan `prevHash`, `hash`, `merkleRoot`, dan `difficulty` valid. |
| **Hasil election tetap anonim**                  | Tidak ada mapping langsung kandidat ↔ voter di blockchain.         |
| **Akun voter tidak dihapus**                     | Status diset `inactive` untuk audit.                               |
