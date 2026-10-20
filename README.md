# 🛡️ Hoax Buster App

Aplikasi mobile berbasis **React Native (Expo)** dan **Python (FastAPI + RAG AI)** untuk mendeteksi berita bohong (hoaks), memeriksa fakta secara otomatis menggunakan AI & pencarian sumber kredibel, serta menyajikan berita terverifikasi.

---

## ✨ Fitur Utama
- **🔍 Deteksi Hoaks berbasis AI (RAG Engine):** Memeriksa klaim atau berita menggunakan kombinasi *Retrieval Layer* (Tavily & Google Fact Check API) dan *Generation Layer* (Groq / Gemini / OpenRouter).
- **📰 Portal Berita & Edukasi:** Menyajikan artikel dan informasi terkini seputar literasi digital dan klarifikasi hoaks.
- **🕓 Riwayat Pemeriksaan (History):** Menyimpan hasil analisis klaim pengguna.
- **🔐 Autentikasi & Profil Pengguna:** Terintegrasi dengan **Firebase Authentication**, **Realtime Database**, dan **Cloud Storage**.

---

## 🛠️ Teknologi yang Digunakan
### Frontend (Mobile)
- **Expo / React Native** (Expo Router)
- **TypeScript**
- **Firebase SDK** (Auth, Realtime Database, Storage)

### Backend (AI Server)
- **Python 3 + FastAPI + Uvicorn**
- **RAG (Retrieval-Augmented Generation)**
- **Integrasi API:** Groq, Google Gemini, OpenRouter, Tavily Search, Google Fact Check Tools

---

## 🚀 Cara Menjalankan Proyek

### 1. Persiapan Frontend
```bash
npm install
```

### 2. Persiapan Backend (Python AI Server)
Masuk ke folder `backend`, buat *virtual environment*, dan instal dependensi:
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Salin file `.env.example` menjadi `.env` di dalam folder `backend/`, lalu isi dengan API Key Anda:
```bash
cp .env.example .env
```

### 3. Menjalankan Aplikasi Sekaligus (Frontend + Backend)
Gunakan script otomatis dari root direktori proyek:
```bash
./run.sh
```
Atau jalankan secara terpisah:
- **Backend:** `cd backend && source .venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 8080 --reload`
- **Frontend:** `npx expo start --clear`
