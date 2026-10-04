<?php
declare(strict_types=1);

namespace CineVerse\Controllers;

use CineVerse\Core\Request;
use CineVerse\Core\Response;
use CineVerse\Middleware\RateLimitMiddleware;
use CineVerse\Services\AuthService;
use Throwable;

final class AuthController
{
    /**
     * POST /api/auth/register
     * Body: { email, password, display_name, country?, lang? }
     */
    public function register(Request $request): void
    {
        // Rate limit: 5 register attempts / 15 minutes per IP
        RateLimitMiddleware::enforce('auth_register', 5, 900);

        $email    = trim((string) $request->input('email', ''));
        $password = (string) $request->input('password', '');
        $name     = trim((string) $request->input('display_name', ''));
        $country  = $request->input('country');
        $lang     = (string) $request->input('lang', 'ar');

        // Quick field-level validation errors
        $errors = [];
        if ($email === '')    $errors['email']        = 'البريد الإلكتروني مطلوب';
        if ($password === '') $errors['password']     = 'كلمة المرور مطلوبة';
        if ($name === '')     $errors['display_name'] = 'الاسم مطلوب';
        if ($errors) {
            Response::validation($errors);
        }

        try {
            $service = new AuthService();
            $user = $service->register(
                $email,
                $password,
                $name,
                is_string($country) && strlen($country) === 2 ? strtoupper($country) : null,
                $lang
            );

            // Auto-login after register
            $service->login($user);

            Response::created(['user' => $user]);
        } catch (Throwable $e) {
            Response::error($e->getMessage(), 422);
        }
    }

    /**
     * POST /api/auth/login
     * Body: { email, password }
     */
    public function login(Request $request): void
    {
        // Rate limit: 10 login attempts / 15 minutes per IP
        RateLimitMiddleware::enforce('auth_login', 10, 900);

        $email    = trim((string) $request->input('email', ''));
        $password = (string) $request->input('password', '');

        $errors = [];
        if ($email === '')    $errors['email']    = 'البريد الإلكتروني مطلوب';
        if ($password === '') $errors['password'] = 'كلمة المرور مطلوبة';
        if ($errors) {
            Response::validation($errors);
        }

        try {
            $service = new AuthService();
            $user = $service->attempt($email, $password);

            if ($user === null) {
                Response::error('البريد الإلكتروني أو كلمة المرور غير صحيحة', 401);
            }

            $service->login($user);
            Response::ok(['user' => $user]);
        } catch (Throwable $e) {
            error_log('[CineVerse Auth] login: ' . $e->getMessage());
            Response::serverError('تعذر تسجيل الدخول');
        }
    }

    /**
     * POST /api/auth/logout
     */
    public function logout(Request $request): void
    {
        try {
            (new AuthService())->logout();
        } catch (Throwable $e) {
            error_log('[CineVerse Auth] logout: ' . $e->getMessage());
        }
        Response::ok(['message' => 'تم تسجيل الخروج']);
    }

    /**
     * GET /api/auth/me
     */
    public function me(Request $request): void
    {
        try {
            $service = new AuthService();
            $user = $service->currentUser();

            if ($user === null) {
                Response::error('غير مصرح', 401);
            }

            Response::ok(['user' => $user]);
        } catch (Throwable $e) {
            error_log('[CineVerse Auth] me: ' . $e->getMessage());
            Response::serverError('تعذر تحميل بيانات المستخدم');
        }
    }
}