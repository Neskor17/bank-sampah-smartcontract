# ♻️ Bank Sampah Chain (`bank-sampah-smartcontract`)

> Aplikasi **Bank Sampah berbasis Blockchain & Pencatatan Insentif** yang mengintegrasikan *smart contract* Solidity pada jaringan lokal Ganache, koneksi wallet MetaMask & Web3.js, serta antarmuka *Single Page Application* (SPA) bertema **Light Liquid Glass**.

![Solidity](https://img.shields.io/badge/Solidity-363636?style=for-the-badge&logo=solidity&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Ethereum](https://img.shields.io/badge/Ethereum-3C3C3D?style=for-the-badge&logo=ethereum&logoColor=white)
![MetaMask](https://img.shields.io/badge/MetaMask-F6851B?style=for-the-badge&logo=metamask&logoColor=white)

---

## ✨ Ringkasan Proyek

Pengelolaan bank sampah secara konvensional kerap menghadapi tantangan terkait transparansi pencatatan berat sampah, perhitungan insentif/poin warga, serta verifikasi riwayat transaksi. **Bank Sampah Chain** menghadirkan pendekatan pencatatan transaksi berbasis *smart contract* sehingga alur pendaftaran akun, penyetoran sampah, dan perhitungan insentif dapat diuji dan diverifikasi secara terstruktur pada jaringan *blockchain* lokal.

### Fitur Utama
* **Smart Contract `BankSampah` (`contracts/BankSampah.sol`):** Mengelola registrasi warga (`registerUser`), penyetoran sampah & perhitungan insentif (`collectWaste`), serta pembacaan ringkasan data akun (`getMySummary`).
* **Antarmuka *Light Liquid Glass* (`frontend/`):** Desain antarmuka bening bernuansa terang dengan efek kaca semi-transparan, *backdrop blur*, serta kontras warna teks yang jelas.
* **Navigasi Multi-Section SPA:** Berpindah mulus antar bagian **Dashboard**, **Setor Sampah**, **Insentif & Warga**, dan **Laporan Transaksi** dalam satu halaman utama (`index.html`).
* **Pencatatan & Riwayat Transaksi:** Menampilkan tabel riwayat transaksi beserta *Tx Hash* dan dukungan *fallback* Mode Demo Lokal saat *backend* (`../backend/api.php` / database `bank_sampah11`) belum dijalankan.

---

## 🛠️ Tech Stack & Lingkungan

| Kategori | Teknologi / Tools | Keterangan |
| :--- | :--- | :--- |
| **Smart Contract** | Solidity, Truffle | Kompilasi, migrasi (`migrations/`), dan interaksi via Truffle Console |
| **Local Blockchain** | Ganache (`http://127.0.0.1:7545`) | Chain ID `1337`, mata uang `ETH` |
| **Wallet & Web3** | MetaMask, Web3.js | Koneksi akun, tanda tangan transaksi, dan pemanggilan kontrak |
| **Frontend** | HTML5, CSS3, JavaScript | SPA berbasis `<section>` dengan tema *Light Liquid Glass* |
| **Backend & DB (Opsional)** | PHP (`api.php`), MySQL (`bank_sampah11`) | Pencatatan data/laporan tambahan bila layanan *backend* aktif |

---

## 📁 Struktur Direktori

```text
bank_sampah11/
├── build/
│   └── contracts/
│       └── BankSampah.json       # Artifact & ABI hasil kompilasi Truffle
├── contracts/
│   └── BankSampah.sol            # Kode smart contract utama
├── frontend/
│   ├── index.html                # Struktur utama SPA & navigasi section
│   ├── styles.css                # Gaya visual Light Liquid Glass
│   └── app.js                    # Logika koneksi wallet, Web3, tab & laporan
├── migrations/
│   └── ...                       # Skrip migrasi Truffle
├── truffle-config.js             # Konfigurasi jaringan Truffle & Ganache
└── README.md
