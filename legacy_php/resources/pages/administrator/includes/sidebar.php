 <aside class="main-sidebar sidebar-dark-primary elevation-4">
    <a href="home.php" class="brand-link">
        <span class="brand-text font-weight-bold">Smart Attendance <span style="color: #00a896;">Ms</span></span>
    </a>
    <div class="sidebar">
        <nav class="mt-2">
            <ul class="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu" data-accordion="false">
                <li class="nav-item">
                    <a href="home.php" class="nav-link">
                        <i class="nav-icon fas fa-tachometer-alt"></i>
                        <p>Dashboard</p>
                    </a>
                </li>
                <li class="nav-item">
                    <a href="manage-course.php" class="nav-link">
                        <i class="nav-icon fas fa-book"></i>
                        <p>Manage Courses</p>
                    </a>
                </li>
                <li class="nav-item">
                    <a href="create-venue.php.php" class="nav-link">
                        <i class="nav-icon fas fa-map-pin"></i>
                        <p>Create Venue</p>
                    </a>
                </li>
                <li class="nav-item">
                    <a href="manage-lecture.php.php" class="nav-link">
                        <i class="nav-icon fas fa-user-tie"></i>
                        <p>Manage Lecturers</p>
                    </a>
                </li>
                <li class="nav-item">
                    <a href="manage-lecture.php.php" class="nav-link">
                        <i class="nav-icon fas fa-users"></i>
                        <p>Manage Students</p>
                    </a>
                </li>
                <li class="nav-item">
                    <a href="#" class="nav-link">
                        <i class="nav-icon fas fa-cog"></i>
                        <p>Settings</p>
                    </a>
                </li>
                <li class="nav-item">
                    <a href="../../logout.php" class="nav-link">
                        <i class="nav-icon fas fa-sign-out-alt"></i>
                        <p>Logout</p>
                    </a>
                </li>
            </ul>
        </nav>
    </div>
</aside>
<script>
document.addEventListener("DOMContentLoaded", function() {
    var currentUrl = window.location.href;
    var links = document.querySelectorAll('.nav-sidebar .nav-link');
    links.forEach(function(link) {
        if (link.href === currentUrl) {
            link.classList.add('active');
        }
    });
});
</script>