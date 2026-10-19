<?php
session_start();
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Redirect to dashboard if already logged in
if (isset($_SESSION['user']['emailAddress'])) {
    if ($_SESSION['user']['role'] === 'admin') {
        header("Location: administrator/home.php");
    } elseif ($_SESSION['user']['role'] === 'lecturer') {
        header("Location: lecturer/dash.php");
    }
    exit;
}

// Database connection
$dsn = 'mysql:host=127.0.0.1;dbname=attendance-db;charset=utf8mb4';
$username = 'root';
$password = '';
try {
    $pdo = new PDO($dsn, $username, $password, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
} catch (PDOException $e) {
    die("Database connection failed: " . $e->getMessage());
}

$error_message = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $emailAddress = trim($_POST['emailAddress'] ?? '');
    $userPassword = trim($_POST['password'] ?? '');

    if (empty($emailAddress) || empty($userPassword)) {
        $error_message = 'Please enter both email and password.';
    } else {
        // Check for Admin
        $stmt_admin = $pdo->prepare("SELECT `Id`, `emailAddress`, `password` FROM `tbladmin` WHERE `emailAddress` = :email");
        $stmt_admin->execute([':email' => $emailAddress]);
        $admin = $stmt_admin->fetch(PDO::FETCH_ASSOC);

        if ($admin && password_verify($userPassword, $admin['password'])) {
            $_SESSION['user'] = [
                'id' => $admin['Id'],
                'emailAddress' => $admin['emailAddress'],
                'role' => 'admin'
            ];
            header("Location: administrator/home.php");
            exit;
        }

        // Check for Lecturer
        $stmt_lecturer = $pdo->prepare("SELECT `Id`, `emailAddress`, `password`, `firstName` FROM `tbllecture` WHERE `emailAddress` = :email");
        $stmt_lecturer->execute([':email' => $emailAddress]);
        $lecturer = $stmt_lecturer->fetch(PDO::FETCH_ASSOC);

        if ($lecturer && password_verify($userPassword, $lecturer['password'])) {
            $_SESSION['user'] = [
                'id' => $lecturer['Id'],
                'emailAddress' => $lecturer['emailAddress'],
                'firstName' => $lecturer['firstName'],
                'role' => 'lecturer'
            ];
            header("Location: lecturer/dash.php");
            exit;
        }

        $error_message = 'Invalid email or password.';
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login | JIGPOLY-FRBAS</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css">
    <script src="https://unpkg.com/valla@1.0.0/dist/valla.min.js"></script>
    <style>
        body {
            font-family: 'Poppins', sans-serif;
            background: linear-gradient(135deg, #f0f4ff 0%, #e0e7ff 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow-x: hidden;
            color: #1e293b;
            margin: 0;
        }
        .header {
            background: linear-gradient(90deg, #1a2e44, #2d68c4);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            padding: 1rem 2rem;
            position: sticky;
            top: 0;
            z-index: 1000;
            animation: slideDown 0.6s ease-out;
        }
        @keyframes slideDown {
            from { transform: translateY(-100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        .navbar-brand {
            font-size: 2rem;
            font-weight: 700;
            color: #ffffff;
            text-shadow: 1px 1px 5px rgba(0, 0, 0, 0.3);
            transition: transform 0.3s ease;
        }
        .navbar-brand:hover {
            transform: scale(1.05);
        }
        .nav-link {
            color: #b0c4de !important;
            font-weight: 600;
            font-size: 1.1rem;
            margin-left: 1.5rem;
            padding: 0.5rem 1rem;
            border-radius: 20px;
            transition: all 0.4s ease;
        }
        .nav-link:hover, .nav-link.active {
            color: #00a896 !important;
            background: rgba(255, 255, 255, 0.2);
            transform: translateY(-2px);
            box-shadow: 0 2px 10px rgba(0, 168, 150, 0.2);
        }
        .navbar-toggler {
            border: none;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
        }
        .navbar-toggler:focus {
            box-shadow: none;
        }
        .login-container {
            width: 100%;
            max-width: 420px;
            padding: 2.5rem;
            border-radius: 20px;
            background: #ffffff;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            animation: fadeIn 0.8s ease-in-out;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .login-header {
            text-align: center;
            margin-bottom: 2rem;
        }
        .login-header h2 {
            font-size: 2rem;
            font-weight: 700;
            color: #1a2e44;
            margin-bottom: 0.5rem;
        }
        .login-header p {
            color: #64748b;
            font-size: 0.95rem;
        }
        .form-label {
            font-weight: 600;
            color: #1e293b;
        }
        .form-control {
            border-radius: 10px;
            border: 1px solid #e2e8f0;
            padding: 12px;
            font-size: 1rem;
            transition: all 0.3s ease;
        }
        .form-control:focus {
            box-shadow: 0 0 0 0.25rem rgba(45, 104, 196, 0.25);
            border-color: #2d68c4;
            outline: none;
        }
        .btn-login {
            width: 100%;
            padding: 12px;
            font-weight: 600;
            font-size: 1.1rem;
            border-radius: 25px;
            background: linear-gradient(45deg, #2d68c4, #00a896);
            border: none;
            color: #ffffff;
            transition: all 0.4s ease;
            box-shadow: 0 4px 15px rgba(45, 104, 196, 0.4);
        }
        .btn-login:hover {
            background: linear-gradient(45deg, #1a4a9b, #007d6a);
            transform: translateY(-3px);
            box-shadow: 0 6px 20px rgba(45, 104, 196, 0.5);
        }
        .alert-error {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
            border-radius: 10px;
            padding: 1rem;
            margin-bottom: 1.5rem;
            text-align: center;
            font-size: 0.95rem;
        }
        @media (max-width: 768px) {
            .header { padding: 1rem; }
            .navbar-brand { font-size: 1.5rem; }
            .nav-link { margin-left: 0.5rem; font-size: 1rem; }
            .login-container { padding: 1.5rem; }
            .login-header h2 { font-size: 1.5rem; }
        }
    </style>
</head>
<body>
    <!-- Header -->
    <header class="header">
        <div class="container">
            <nav class="navbar navbar-expand-lg navbar-dark">
                <a class="navbar-brand" href="index.php">JIGPOLY-FRBAS</a>
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <div class="collapse navbar-collapse" id="navbarNav">
                    <ul class="navbar-nav ms-auto">
                        <li class="nav-item">
                            <a class="nav-link" href="../../index.php#home">Home</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="../../index.php#features">Features</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="../../index.php#contact">Contact</a>
                        </li>
                    </ul>
                </div>
            </nav>
        </div>
    </header>

    <!-- Login Section -->
    <div class="container">
        <div class="login-container">
            <div class="login-header">
                <h2><i class="fas fa-lock me-2"></i>Login</h2>
                <p>Securely access your JIGPOLY-FRBAS account</p>
            </div>
            <?php if ($error_message): ?>
                <div class="alert alert-error">
                    <?php echo htmlspecialchars($error_message); ?>
                </div>
            <?php endif; ?>
            <form id="loginForm" action="entry.php" method="POST">
                <div class="mb-3">
                    <label for="emailAddress" class="form-label">Email Address</label>
                    <div class="input-group">
                        <span class="input-group-text"><i class="fas fa-user"></i></span>
                        <input type="email" class="form-control" id="emailAddress" name="emailAddress" required>
                    </div>
                </div>
                <div class="mb-4">
                    <label for="password" class="form-label">Password</label>
                    <div class="input-group">
                        <span class="input-group-text"><i class="fas fa-key"></i></span>
                        <input type="password" class="form-control" id="password" name="password" required>
                    </div>
                </div>
                <button type="submit" class="btn btn-login">Login</button>
            </form>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://unpkg.com/valla@1.0.0/dist/valla.min.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const form = document.getElementById('loginForm');
            const valla = new Valla(form);

            valla.setMessages({
                required: 'This field is required.',
                email: 'Please enter a valid email address.'
            });

            valla.add('emailAddress', {
                validators: [
                    Valla.validators.required(),
                    Valla.validators.email()
                ]
            });

            valla.add('password', {
                validators: [
                    Valla.validators.required()
                ]
            });
        });
    </script>
</body>
</html>