<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JIGPOLY-FRBAS | Revolutionizing Attendance</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css">
    <style>
        body {
            font-family: 'Poppins', sans-serif;
            background: linear-gradient(135deg, #f0f4ff 0%, #e0e7ff 100%);
            color: #1e293b;
            overflow-x: hidden;
        }
        .navbar {
            background: linear-gradient(90deg, #1a2e44, #2d68c4);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
            padding: 1rem 2rem;
            position: sticky;
            top: 0;
            z-index: 1000;
        }
        .navbar-brand {
            font-size: 1.8rem;
            font-weight: 700;
            color: #ffffff;
            text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.2);
        }
        .nav-link {
            color: #b0c4de !important;
            font-weight: 500;
            transition: all 0.3s ease;
            margin-left: 1rem;
        }
        .nav-link:hover, .nav-link.active {
            color: #00a896 !important;
            transform: translateY(-2px);
        }
        .header {
            background: url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80') no-repeat center center/cover;
            min-height: 100vh;
            display: flex;
            align-items: center;
            position: relative;
            overflow: hidden;
        }
        .header-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(26, 46, 68, 0.6);
            z-index: 1;
        }
        .header-content {
            position: relative;
            z-index: 2;
            text-align: center;
            color: #ffffff;
            padding: 2rem;
        }
        .header-content h1 {
            font-size: 3.5rem;
            font-weight: 700;
            line-height: 1.2;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
            animation: fadeInDown 1s ease-out;
        }
        .header-content p {
            font-size: 1.2rem;
            margin: 1rem 0;
            animation: fadeInUp 1.5s ease-out;
        }
        .btn-primary {
            background: linear-gradient(45deg, #2d68c4, #00a896);
            border: none;
            padding: 12px 30px;
            font-size: 1.1rem;
            font-weight: 500;
            border-radius: 25px;
            transition: all 0.4s ease;
            box-shadow: 0 4px 15px rgba(45, 104, 196, 0.4);
        }
        .btn-primary:hover {
            background: linear-gradient(45deg, #1a4a9b, #007d6a);
            transform: translateY(-3px);
            box-shadow: 0 6px 20px rgba(45, 104, 196, 0.5);
        }
        .features {
            padding: 4rem 2rem;
            background: #ffffff;
            box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
        }
        .feature-card {
            background: #f9fafb;
            border-radius: 15px;
            padding: 2rem;
            text-align: center;
            transition: all 0.3s ease;
            height: 100%;
        }
        .feature-card:hover {
            background: linear-gradient(135deg, #e0e7ff, #f0f4ff);
            transform: translateY(-5px);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
        }
        .feature-card i {
            font-size: 2.5rem;
            color: #2d68c4;
            margin-bottom: 1rem;
        }
        .feature-card h4 {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 1rem;
        }
        .feature-card p {
            color: #64748b;
            font-size: 0.95rem;
        }
        .footer {
            background: linear-gradient(90deg, #1a2e44, #2d68c4);
            color: #ffffff;
            padding: 2rem 0;
            margin-top: 2rem;
        }
        .footer a {
            color: #b0c4de;
            text-decoration: none;
            transition: color 0.3s ease;
        }
        .footer a:hover {
            color: #00a896;
        }
        .social-icon {
            font-size: 1.5rem;
            margin: 0 0.5rem;
        }
        @keyframes fadeInDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 768px) {
            .header-content h1 { font-size: 2.5rem; }
            .header-content p { font-size: 1rem; }
            .feature-card { margin-bottom: 2rem; }
        }
    </style>
</head>
<body>
    <!-- Navbar -->
    <nav class="navbar navbar-expand-lg navbar-dark">
        <div class="container">
            <a class="navbar-brand" href="#">JIGPOLY-FRBAS</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav ms-auto">
                    <li class="nav-item">
                        <a class="nav-link active" href="#home">Home</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="#features">Features</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="#about">About</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="#contact">Contact</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link btn btn-primary" href="resources/pages/alog.php">Admin</a>
                    </li>
                </ul>
            </div>
        </div>
    </nav>

    <!-- Header with CTA -->
    <header class="header" id="home">
        <div class="header-overlay"></div>
        <div class="container header-content">
            <h1 class="animate__animated animate__fadeInDown">Revolutionize Attendance with JIGPOLY-FRBAS</h1>
            <p class="animate__animated animate__fadeInUp">Experience cutting-edge face recognition technology for seamless, accurate, and efficient attendance management.</p>
            <a href="resources/pages/entry.php" class="btn btn-primary animate__animated animate__fadeInUp" style="animation-delay: 0.5s;">Start Now</a>
        </div>
    </header>

    <!-- Features Section -->
    <section class="features" id="features">
        <div class="container">
            <h2 class="text-center mb-5" style="color: #1e293b; font-weight: 700;">Why Choose JIGPOLY-FRBAS?</h2>
            <div class="row">
                <div class="col-md-4">
                    <div class="feature-card">
                        <i class="fas fa-camera"></i>
                        <h4>Advanced Face Recognition</h4>
                        <p>Utilize state-of-the-art AI to accurately identify and record student attendance in real-time.</p>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="feature-card">
                        <i class="fas fa-chart-line"></i>
                        <h4>Real-Time Analytics</h4>
                        <p>Gain insights with comprehensive dashboards and attendance trend reports.</p>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="feature-card">
                        <i class="fas fa-lock"></i>
                        <h4>Secure & Reliable</h4>
                        <p>Ensure data privacy with encrypted storage and robust security protocols.</p>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="feature-card">
                        <i class="fas fa-mobile-alt"></i>
                        <h4>Mobile Accessibility</h4>
                        <p>Manage attendance on-the-go with our intuitive mobile application.</p>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="feature-card">
                        <i class="fas fa-cloud"></i>
                        <h4>Cloud Integration</h4>
                        <p>Access your data anytime, anywhere with seamless cloud synchronization.</p>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="feature-card">
                        <i class="fas fa-user-shield"></i>
                        <h4>Admin Control</h4>
                        <p>Empower administrators with full control over user management and settings.</p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="footer" id="contact">
        <div class="container text-center">
            <h5>JIGPOLY-FRBAS</h5>
            <p>© 2025 Jigawa State Polytechnic. All rights reserved.</p>
            <div class="mt-3">
                <a href="#" class="social-icon"><i class="fab fa-facebook-f"></i></a>
                <a href="#" class="social-icon"><i class="fab fa-twitter"></i></a>
                <a href="#" class="social-icon"><i class="fab fa-linkedin-in"></i></a>
                <a href="#" class="social-icon"><i class="fab fa-instagram"></i></a>
            </div>
            <p class="mt-3"><a href="/privacy">Privacy Policy</a> | <a href="/terms">Terms of Service</a></p>
        </div>
    </footer>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/wow/1.1.2/wow.min.js"></script>
    <script>
        new WOW().init();
    </script>
</body>
</html>