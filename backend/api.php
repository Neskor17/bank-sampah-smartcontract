<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require __DIR__ . '/db.php';

function clean_text($value) {
    return trim((string)$value);
}

function respond($statusCode, $payload) {
    http_response_code($statusCode);
    echo json_encode($payload);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// 1. GET: Laporan transaksi atau ambil data pengguna berdasarkan username
if ($method === 'GET') {
    if (isset($_GET['action']) && $_GET['action'] === 'reports') {
        $sql = "SELECT t.id, u.username, u.wallet_address, t.waste_type, t.weight, t.incentive_earned, t.tx_type, t.tx_hash, t.transaction_date
                FROM transactions t
                JOIN users u ON t.user_id = u.id
                ORDER BY t.transaction_date DESC, t.id DESC";
        $result = $conn->query($sql);
        if (!$result) {
            respond(500, ['status' => 'error', 'message' => 'Gagal mengambil laporan: ' . $conn->error]);
        }

        $reports = [];
        while ($row = $result->fetch_assoc()) {
            $reports[] = $row;
        }
        respond(200, ['status' => 'success', 'data' => $reports]);
    }

    if (isset($_GET['username']) && clean_text($_GET['username']) !== '') {
        $username = clean_text($_GET['username']);
        $stmt = $conn->prepare("SELECT id, username, wallet_address, balance, incentive_balance, created_at FROM users WHERE username = ? LIMIT 1");
        $stmt->bind_param("s", $username);
        $stmt->execute();
        $res = $stmt->get_result();

        if ($res && $res->num_rows > 0) {
            $user = $res->fetch_assoc();
            $stmt->close();
            respond(200, ['status' => 'success', 'data' => $user]);
        }
        $stmt->close();
        respond(404, ['status' => 'error', 'message' => 'Pengguna tidak ditemukan']);
    }

    respond(400, ['status' => 'error', 'message' => 'Parameter GET tidak valid']);
}

// 2. POST: Registrasi pengguna, catat transaksi sampah, atau tarik insentif
if ($method === 'POST') {
    $action = isset($_POST['action']) ? clean_text($_POST['action']) : '';

    // A. Tambah pengguna baru
    if ($action === 'register' || (isset($_POST['username']) && !isset($_POST['amount']) && $action === '')) {
        $username = isset($_POST['username']) ? clean_text($_POST['username']) : '';
        $walletAddress = isset($_POST['wallet_address']) ? clean_text($_POST['wallet_address']) : null;

        if ($username === '' || strlen($username) > 100) {
            respond(400, ['status' => 'error', 'message' => 'Username wajib diisi (maksimal 100 karakter)']);
        }

        $check = $conn->prepare("SELECT id FROM users WHERE username = ? LIMIT 1");
        $check->bind_param("s", $username);
        $check->execute();
        $check->store_result();
        if ($check->num_rows > 0) {
            $check->close();
            respond(409, ['status' => 'error', 'message' => 'Username sudah terdaftar']);
        }
        $check->close();

        $stmt = $conn->prepare("INSERT INTO users (username, wallet_address) VALUES (?, ?)");
        $stmt->bind_param("ss", $username, $walletAddress);

        if ($stmt->execute()) {
            $newId = $stmt->insert_id;
            $stmt->close();
            respond(201, [
                'status'  => 'success',
                'message' => 'Pengguna berhasil didaftarkan',
                'user_id' => $newId
            ]);
        }

        $err = $stmt->error;
        $stmt->close();
        respond(500, ['status' => 'error', 'message' => 'Gagal menambah pengguna: ' . $err]);
    }

    // B. Catat transaksi sampah & tambah saldo berat + saldo insentif
    if ($action === 'collect' || (isset($_POST['user_id'], $_POST['weight']) && $action === '')) {
        $userId = isset($_POST['user_id']) ? (int)$_POST['user_id'] : 0;
        $weight = isset($_POST['weight']) ? (float)$_POST['weight'] : 0.0;
        $wasteType = isset($_POST['waste_type']) ? strtolower(clean_text($_POST['waste_type'])) : 'plastik';
        $txHash = isset($_POST['tx_hash']) ? clean_text($_POST['tx_hash']) : null;

        if ($userId <= 0 || $weight <= 0) {
            respond(400, ['status' => 'error', 'message' => 'user_id dan weight harus lebih besar dari 0']);
        }

        $rates = [
            'plastik' => 100.0,
            'kertas'  => 80.0,
            'logam'   => 200.0
        ];
        $rate = isset($rates[$wasteType]) ? $rates[$wasteType] : 100.0;
        $incentive = $weight * $rate;

        $conn->begin_transaction();
        try {
            $updUser = $conn->prepare("UPDATE users SET balance = balance + ?, incentive_balance = incentive_balance + ? WHERE id = ?");
            $updUser->bind_param("ddi", $weight, $incentive, $userId);
            $updUser->execute();
            if ($updUser->affected_rows === 0) {
                throw new Exception("Pengguna dengan user_id tersebut tidak ditemukan");
            }
            $updUser->close();

            $insTx = $conn->prepare("INSERT INTO transactions (user_id, waste_type, weight, incentive_earned, tx_type, tx_hash) VALUES (?, ?, ?, ?, 'collect', ?)");
            $insTx->bind_param("isdds", $userId, $wasteType, $weight, $incentive, $txHash);
            $insTx->execute();
            $insTx->close();

            $conn->commit();
            respond(200, [
                'status'           => 'success',
                'message'          => 'Transaksi sampah dan insentif berhasil dicatat',
                'incentive_earned' => $incentive
            ]);
        } catch (Throwable $e) {
            $conn->rollback();
            respond(400, ['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    // C. Penarikan insentif
    if ($action === 'withdraw' || (isset($_POST['username'], $_POST['amount']) && $action === '')) {
        $username = isset($_POST['username']) ? clean_text($_POST['username']) : '';
        $amount = isset($_POST['amount']) ? (float)$_POST['amount'] : 0.0;
        $txHash = isset($_POST['tx_hash']) ? clean_text($_POST['tx_hash']) : null;

        if ($username === '' || $amount <= 0) {
            respond(400, ['status' => 'error', 'message' => 'Username wajib diisi dan jumlah penarikan harus > 0']);
        }

        $conn->begin_transaction();
        try {
            $stmt = $conn->prepare("SELECT id, incentive_balance FROM users WHERE username = ? FOR UPDATE");
            $stmt->bind_param("s", $username);
            $stmt->execute();
            $res = $stmt->get_result();

            if (!$res || $res->num_rows === 0) {
                $stmt->close();
                throw new Exception("Pengguna tidak ditemukan");
            }

            $user = $res->fetch_assoc();
            $stmt->close();

            $currentIncentive = (float)$user['incentive_balance'];
            $userId = (int)$user['id'];

            if ($currentIncentive < $amount) {
                throw new Exception("Saldo insentif tidak mencukupi");
            }

            $upd = $conn->prepare("UPDATE users SET incentive_balance = incentive_balance - ? WHERE id = ?");
            $upd->bind_param("di", $amount, $userId);
            $upd->execute();
            $upd->close();

            $zeroWeight = 0.0;
            $insTx = $conn->prepare("INSERT INTO transactions (user_id, waste_type, weight, incentive_earned, tx_type, tx_hash) VALUES (?, 'penarikan', ?, ?, 'withdraw', ?)");
            $insTx->bind_param("idds", $userId, $zeroWeight, $amount, $txHash);
            $insTx->execute();
            $insTx->close();

            $conn->commit();
            respond(200, [
                'status'  => 'success',
                'message' => 'Insentif berhasil ditarik',
                'amount'  => $amount
            ]);
        } catch (Throwable $e) {
            $conn->rollback();
            respond(400, ['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    respond(400, ['status' => 'error', 'message' => 'Aksi POST tidak dikenali']);
}

respond(405, ['status' => 'error', 'message' => 'Method tidak diizinkan']);