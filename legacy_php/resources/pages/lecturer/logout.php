<?php
session_start();
// Destroy session and unset variables
$_SESSION = [];
session_destroy();
// Prevent caching to ensure user can't go back
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Smart Attendance System - Successfully logged out. Return to login or homepage.">
    <meta name="keywords" content="Smart Attendance, Logout, Face Recognition">
    <title>Logout | Smart Attendance System</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&family=Open+Sans:wght@400&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #00a896;
            --secondary: #003049;
            --text-dark: #1a237e;
            --text-light: #f4f9f9;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Open Sans', sans-serif;
            background: #f4f9f9;
            min-height: 100vh;
            position: relative;
            overflow-x: hidden;
        }
        .header {
            position: fixed;
            top: 0;
            width: 100%;
            background: linear-gradient(90deg, rgba(0, 48, 73, 0.9), rgba(0, 168, 150, 0.9));
            z-index: 1000;
            padding: 15px 0;
            backdrop-filter: blur(5px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
        .header .navbar-brand {
            font-family: 'Poppins', sans-serif;
            font-size: 1.8rem;
            font-weight: 700;
            color: var(--text-light);
        }
        .header .navbar-brand span { color: var(--primary); }
        .main-section {
            min-height: calc(100vh - 120px);
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            background: url('https://images.unsplash.com/photo-1516321310766-78a99501fd95?q=80&w=2070&auto=format&fit=crop') no-repeat center/cover fixed;
        }
        .main-section::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(rgba(0, 48, 73, 0.6), rgba(0, 168, 150, 0.4));
            z-index: 1;
        }
        #particles-js {
            position: absolute;
            width: 100%;
            height: 100%;
            z-index: 2;
        }
        .logout-card {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 15px;
            padding: 30px;
            max-width: 500px;
            width: 90%;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            backdrop-filter: blur(10px);
            z-index: 3;
            animation: fadeInUp 1s ease-in-out;
        }
        .logout-card h1 {
            font-family: 'Poppins', sans-serif;
            font-size: 2.5rem;
            font-weight: 700;
            color: var(--text-dark);
            margin-bottom: 20px;
        }
        .logout-card p {
            font-size: 1.1rem;
            color: #666;
            margin-bottom: 30px;
        }
        .cta-button {
            background: linear-gradient(45deg, #028090, #00a896);
            color: white;
            padding: 12px 30px;
            border-radius: 25px;
            font-family: 'Poppins', sans-serif;
            font-size: 1rem;
            font-weight: 700;
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 4px 15px rgba(0, 168, 150, 0.5);
            position: relative;
            overflow: hidden;
            text-decoration: none;
            display: inline-block;
            margin: 10px;
            transition: all 0.3s ease;
        }
        .cta-button::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            transition: width 0.6s ease, height 0.6s ease;
        }
        .cta-button:hover::before {
            width: 300px;
            height: 300px;
        }
        .cta-button:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 20px rgba(0, 168, 150, 0.7);
        }
        .footer {
            background: linear-gradient(180deg, #003049, #004b6b);
            color: var(--text-light);
            padding: 30px 0;
            text-align: center;
            position: relative;
        }
        .footer .social-links a {
            color: var(--primary);
            font-size: 1.5rem;
            margin: 0 10px;
            transition: transform 0.3s ease;
        }
        .footer .social-links a:hover {
            transform: scale(1.3);
        }
        .footer p {
            margin: 10px 0;
            font-size: 0.9rem;
        }
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 768px) {
            .logout-card h1 { font-size: 2rem; }
            .logout-card p { font-size: 1rem; }
            .cta-button { padding: 10px 20px; font-size: 0.9rem; }
            .header .navbar-brand { font-size: 1.4rem; }
        }
        @media (max-width: 576px) {
            .logout-card h1 { font-size: 1.5rem; }
            .logout-card p { font-size: 0.9rem; }
            .cta-button { padding: 8px 15px; font-size: 0.8rem; margin: 5px; }
        }
    </style>
</head>
<body>
    <!-- Header -->
    <header class="header">
        <nav class="container navbar">
            <a class="navbar-brand" href="index.html">Smart Attendance <span>Ms</span></a>
        </nav>
    </header>

    <!-- Main Section -->
    <section class="main-section">
        <div id="particles-js"></div>
        <div class="logout-card animate__animated animate__fadeInUp">
            <h1>Logged Out Successfully</h1>
            <p>You have been securely logged out of the Smart Attendance System. Thank you for using our platform!</p>
            <div>
                <a href="lecturer/index.php" class="cta-button">Back to Login</a>
                <a href="index.html" class="cta-button">Go to Homepage</a>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
        <div class="container">
            <div class="social-links animate__animated animate__fadeIn">
                <a href="https://facebook.com" target="_blank"><i class="fab fa-facebook-f"></i></a>
                <a href="https://twitter.com" target="_blank"><i class="fab fa-twitter"></i></a>
                <a href="https://linkedin.com" target="_blank"><i class="fab fa-linkedin-in"></i></a>
            </div>
            <p>Contact us: <a href="mailto:support@smartattendance.com">support@smartattendance.com</a></p>
            <p>&copy; 2025 Smart Attendance System. All rights reserved.</p>
        </div>
    </footer>

    <!-- Scripts -->
    <script src="https://cdn.jsdelivr.net/npm/particles.js@2.0.0/particles.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // Particles.js
        particlesJS('particles-js', {
            particles: {
                number: { value: 50, density: { enable: true, value_area: 800 } },
                color: { value: ['#00a896', '#028090'] },
                shape: { type: ['circle', 'star'], polygon: { nb_sides: 5 } },
                opacity: { value: 0.5, random: true, anim: { enable: true, speed: 1, opacity_min: 0.1 } },
                size: { value: 3, random: true, anim: { enable: true, speed: 2, size_min: 0.5 } },
                line_linked: { enable: true, distance: 100, color: '#00a896', opacity: 0.3, width: 1 },
                move: { enable: true, speed: 4, direction: 'none', random: true, out_mode: 'out' }
            },
            interactivity: {
                detect_on: 'canvas',
                events: { onhover: { enable: true, mode: 'repulse' }, onclick: { enable: true, mode: 'push' }, resize: true },
                modes: { repulse: { distance: 100, duration: 0.4 }, push: { particles_nb: 4 } }
            },
            retina_detect: true
        });
    </script>
</body>
</html>