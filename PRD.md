Product Requirements Document (PRD): Core API Service
1. Ringkasan Eksekutif
Pengembangan layanan backend API terpusat berkinerja tinggi menggunakan lingkungan runtime Bun dan framework Hono. Sistem ini dirancang untuk melayani berbagai client-side application, termasuk frontend berbasis Vue.js/Nuxt.js, dengan latensi sangat rendah. Layanan ini akan mengelola logika bisnis utama, otentikasi, dan operasi CRUD yang terhubung ke basis data PostgreSQL.

2. Tujuan dan Sasaran
Performa dan Latensi: Memanfaatkan kemampuan eksekusi Bun dan routing Hono untuk meminimalkan waktu respons API (target < 50ms per request non-kompleks).

Standarisasi Arsitektur: Menerapkan struktur kode yang ketat agar skalabel dan mudah di-maintain oleh tim developer, memastikan pemisahan yang jelas antara controller, business logic, dan akses data.

Konsistensi Data: Mengimplementasikan standar skema relasional yang seragam untuk melacak mutasi data historis dan referensi antar entitas tanpa kehilangan integritas.

3. Spesifikasi Teknis dan Arsitektur Aplikasi
Runtime & Package Manager: Bun

Framework API: Hono (menangani routing, middleware, dan validasi payload)

Basis Data: PostgreSQL (dengan pemanfaatan views, triggers, dan indexing untuk agregasi data kompleks)

Pola Desain (Design Pattern): Repository Pattern.

Semua interaksi langsung dengan database harus dienkapsulasi di dalam kelas Repository.

Controller Hono dilarang melakukan query langsung, melainkan harus memanggil Action classes atau Service layer yang menjembatani Repository.

4. Standar Struktur Basis Data
Pengembangan skema PostgreSQL wajib mematuhi aturan penamaan dan desain berikut:

Penamaan Tabel: Harus menggunakan format tunggal (singular) dengan sufiks yang spesifik.

Tabel entitas master menggunakan akhiran _master dengan primary key bertipe ID auto-increment integer.

Tabel pencatatan transaksi atau log menggunakan akhiran _transaksi dengan primary key bertipe UUID.

Penamaan Foreign Key: Setiap kolom yang merujuk pada tabel lain wajib menggunakan akhiran _id.

Manajemen Data (Soft Deletion): Penghapusan data secara permanen (DML DELETE) tidak diizinkan untuk entitas utama. Setiap tabel wajib memiliki kolom boolean is_aktif (dengan nilai default true). Operasi penghapusan hanya akan mengubah status is_aktif menjadi false.

5. Cakupan Fitur Utama
Modul Otentikasi & Otorisasi: Integrasi JWT (JSON Web Token) melalui middleware Hono untuk memvalidasi setiap request yang masuk dan membatasi akses berdasarkan peran pengguna (Role-Based Access Control).

Manajemen Pengguna (User Management): API untuk registrasi, pembaruan profil, dan penonaktifan akun pengguna (modifikasi parameter is_aktif).

Layanan Integrasi Transaksi: Endpoint khusus untuk mencatat mutasi atau aktivitas pengguna ke dalam entitas _transaksi, disiapkan untuk dapat diintegrasikan dengan layanan gateway eksternal di masa mendatang (misalnya integrasi QRIS DANA atau layanan eksternal lainnya).

Standardisasi Respons API: Implementasi format JSON yang konsisten di seluruh endpoint (memuat parameter status, message, dan data) yang dirancang ramah bagi pemrosesan data frontend.

6. Kriteria Penerimaan (Acceptance Criteria)
Server dapat dijalankan menggunakan perintah eksekusi bawaan Bun tanpa bergantung pada runtime eksternal lainnya.

Semua query basis data telah dipisahkan ke dalam layer Repository.

Uji coba endpoint pembaruan atau penghapusan data secara konsisten hanya memodifikasi kolom is_aktif.

Respons API memvalidasi input dengan benar dan mengembalikan kode status HTTP yang sesuai (200, 400, 401, 403, 404, 500).
