<?php
declare(strict_types=1);

namespace CineVerse\Core;

/**
 * Request — thin wrapper around the current HTTP request.
 */
final class Request
{
    private string $method;
    private string $path;
    /** @var array<string,mixed> */
    private array $query;
    /** @var array<string,mixed> */
    private array $body;
    /** @var array<string,string> */
    private array $headers;
    /** @var array<string,string> */
    private array $routeParams = [];

    public function __construct()
    {
        $this->method  = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        $this->path    = $this->resolvePath();
        $this->query   = $_GET ?? [];
        $this->body    = $this->resolveBody();
        $this->headers = $this->resolveHeaders();
    }

    private function resolvePath(): string
    {
        $uri = $_SERVER['REQUEST_URI'] ?? '/';

        // Strip query string
        $pos = strpos($uri, '?');
        if ($pos !== false) {
            $uri = substr($uri, 0, $pos);
        }

        // If the app is not at domain root, strip the base path.
        // e.g. /cineverse/api/public/api/health  →  /api/health
        $scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
        $baseDir    = rtrim(str_replace('\\', '/', dirname($scriptName)), '/');

        if ($baseDir !== '' && str_starts_with($uri, $baseDir)) {
            $uri = substr($uri, strlen($baseDir));
        }

        $uri = '/' . ltrim($uri, '/');

        return $uri === '' ? '/' : $uri;
    }

    /** @return array<string,mixed> */
    private function resolveBody(): array
    {
        $contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';

        // JSON body
        if (stripos($contentType, 'application/json') !== false) {
            $raw = file_get_contents('php://input');
            if ($raw === false || $raw === '') {
                return [];
            }
            $decoded = json_decode($raw, true);
            return is_array($decoded) ? $decoded : [];
        }

        // Form body
        if ($this->method === 'POST' || $this->method === 'PUT' || $this->method === 'PATCH') {
            return $_POST ?? [];
        }

        return [];
    }

    /** @return array<string,string> */
    private function resolveHeaders(): array
    {
        $headers = [];

        if (function_exists('getallheaders')) {
            $all = getallheaders();
            if (is_array($all)) {
                foreach ($all as $k => $v) {
                    $headers[strtolower((string) $k)] = (string) $v;
                }
                return $headers;
            }
        }

        foreach ($_SERVER as $key => $value) {
            if (str_starts_with($key, 'HTTP_')) {
                $name = strtolower(str_replace('_', '-', substr($key, 5)));
                $headers[$name] = (string) $value;
            }
        }

        return $headers;
    }

    // ---------- Public accessors ----------

    public function method(): string { return $this->method; }
    public function path(): string   { return $this->path; }

    /** @return array<string,mixed> */
    public function query(): array { return $this->query; }

    /** @return array<string,mixed> */
    public function body(): array { return $this->body; }

    public function input(string $key, mixed $default = null): mixed
    {
        if (array_key_exists($key, $this->body))   return $this->body[$key];
        if (array_key_exists($key, $this->query))  return $this->query[$key];
        return $default;
    }

    public function header(string $name, ?string $default = null): ?string
    {
        return $this->headers[strtolower($name)] ?? $default;
    }

    /** @return array<string,string> */
    public function allHeaders(): array { return $this->headers; }

    /** Set route params (called by Router after match). @param array<string,string> $params */
    public function setRouteParams(array $params): void { $this->routeParams = $params; }

    public function routeParam(string $key, ?string $default = null): ?string
    {
        return $this->routeParams[$key] ?? $default;
    }

    public function ip(): string
    {
        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }

    public function userAgent(): string
    {
        return $_SERVER['HTTP_USER_AGENT'] ?? '';
    }
}