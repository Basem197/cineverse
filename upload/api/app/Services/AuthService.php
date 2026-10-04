<?php
declare(strict_types=1);

namespace CineVerse\Services;

use CineVerse\Core\Env;
use CineVerse\Repositories\UserRepository;
use RuntimeException;

/**
 * AuthService — registration, login, logout, and session helpers.
 */
final class AuthService
{
    private UserRepository $users;
    private int $minPasswordLength;

    public function __construct(?UserRepository $users = null)
    {
        $this->users = $users ?? new UserRepository();
        $this->minPasswordLength = Env::int('PASSWORD_MIN_LENGTH', 8);
    }

    /**
     * Register a new user. Returns the created user (safe fields only).
     *
     * @throws RuntimeException with a human-readable message
     */
    public function register(string $email, string $password, string $displayName, ?string $country = null, string $lang = 'ar'): array
    {
        $email = strtolower(trim($email));
        $displayName = trim($displayName);

        // Validation
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new RuntimeException('صيغة البريد الإلكتروني غير صحيحة');
        }
        if (mb_strlen($displayName) < 2 || mb_strlen($displayName) > 60) {
            throw new RuntimeException('الاسم يجب أن يكون بين حرفين و60 حرفًا');
        }
        if (mb_strlen($password) < $this->minPasswordLength) {
            throw new RuntimeException("كلمة المرور يجب أن تكون {$this->minPasswordLength} أحرف على الأقل");
        }
        if ($this->users->emailExists($email)) {
            throw new RuntimeException('هذا البريد الإلكتروني مسجل بالفعل');
        }
        if (!in_array($lang, ['ar', 'en', 'tr'], true)) {
            $lang = 'ar';
        }

        $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 11]);
        if ($hash === false) {
            throw new RuntimeException('فشل في معالجة كلمة المرور');
        }

        $id = $this->users->create($email, $hash, $displayName, $country, $lang);

        return $this->users->findById($id) ?? throw new RuntimeException('فشل في إنشاء الحساب');
    }

    /**
     * Verify credentials. Returns the user (safe fields) or null.
     */
    public function attempt(string $email, string $password): ?array
    {
        $email = strtolower(trim($email));

        $user = $this->users->findByEmail($email);
        if (!$user) {
            // Constant-time-ish: run a dummy verify to prevent enumeration
            password_verify($password, '$2y$11$dummyhashdummyhashdummyhashdummyhashdummyhashdu');
            return null;
        }

        if (!(bool) $user['is_active']) {
            return null;
        }

        if (!password_verify($password, (string) $user['password_hash'])) {
            return null;
        }

        // Optional: rehash if algorithm changed
        if (password_needs_rehash((string) $user['password_hash'], PASSWORD_BCRYPT, ['cost' => 11])) {
            // (Skipped for simplicity — can add later)
        }

        $this->users->touchLogin((int) $user['id']);

        // Return safe user object
        return $this->users->findById((int) $user['id']);
    }

    /**
     * Persist user into session.
     */
    public function login(array $user): void
    {
        session_regenerate_id(true);
        $_SESSION['user_id']   = (int) $user['id'];
        $_SESSION['user_role'] = $user['role'] ?? 'user';
        $_SESSION['logged_in_at'] = time();
    }

    /**
     * Clear the session.
     */
    public function logout(): void
    {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(
                session_name(),
                '',
                [
                    'expires'  => time() - 42000,
                    'path'     => $params['path'],
                    'domain'   => $params['domain'],
                    'secure'   => $params['secure'],
                    'httponly' => $params['httponly'],
                    'samesite' => $params['samesite'] ?? 'Lax',
                ]
            );
        }
        session_destroy();
    }

    /**
     * Get current authenticated user (safe fields) or null.
     */
    public function currentUser(): ?array
    {
        $id = $_SESSION['user_id'] ?? null;
        if (!is_int($id) && !is_numeric($id)) {
            return null;
        }
        return $this->users->findById((int) $id);
    }

    public function isLoggedIn(): bool
    {
        return isset($_SESSION['user_id']);
    }

    public function userId(): ?int
    {
        return isset($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : null;
    }

    public function isAdmin(): bool
    {
        return ($_SESSION['user_role'] ?? '') === 'admin';
    }
}