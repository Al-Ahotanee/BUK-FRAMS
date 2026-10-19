<?php
// Start the session to access and destroy session variables.
session_start();

// Unset all of the session variables.
// This clears any stored user data, such as email or role.
$_SESSION = array();

// If it's desired to kill the session, also delete the session cookie.
// This destroys the session on the server and invalidates the client's cookie.
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}

// Destroy the session.
session_destroy();

// Redirect the user to the login page (entry.php).
header("Location: entry.php");
exit;
?>
