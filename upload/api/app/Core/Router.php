<?php
declare(strict_types=1);

namespace CineVerse\Core;

/**
 * Router — small REST router with path params ({id}, {slug}).
 *
 * Usage:
 *   $router->get('/api/health', [HealthController::class, 'index']);
 *   $router->get('/api/titles/{id}', [TitleController::class, 'show']);
 *   $router->dispatch($request);
 */
final class Router
{
    /** @var array<int,array{method:string,pattern:string,handler:callable|array}> */
    private array $routes = [];

    public function get(string $pattern, callable|array $handler): self
    {
        return $this->add('GET', $pattern, $handler);
    }

    public function post(string $pattern, callable|array $handler): self
    {
        return $this->add('POST', $pattern, $handler);
    }

    public function put(string $pattern, callable|array $handler): self
    {
        return $this->add('PUT', $pattern, $handler);
    }

    public function patch(string $pattern, callable|array $handler): self
    {
        return $this->add('PATCH', $pattern, $handler);
    }

    public function delete(string $pattern, callable|array $handler): self
    {
        return $this->add('DELETE', $pattern, $handler);
    }

    private function add(string $method, string $pattern, callable|array $handler): self
    {
        $this->routes[] = [
            'method'  => $method,
            'pattern' => $pattern,
            'handler' => $handler,
        ];
        return $this;
    }

    /**
     * Dispatch the request. Sends 404 / 405 as needed.
     */
    public function dispatch(Request $request): void
    {
        $method = $request->method();
        $path   = $request->path();

        $pathMatched = false;

        foreach ($this->routes as $route) {
            $params = $this->match($route['pattern'], $path);
            if ($params === null) {
                continue;
            }

            $pathMatched = true;

            if ($route['method'] !== $method) {
                continue;
            }

            $request->setRouteParams($params);

            try {
                $this->invoke($route['handler'], $request);
            } catch (\Throwable $e) {
                error_log('[CineVerse Router] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());

                if (Env::bool('APP_DEBUG', false)) {
                    Response::error($e->getMessage(), 500, [
                        'file' => $e->getFile(),
                        'line' => $e->getLine(),
                    ]);
                }
                Response::serverError();
            }
            return;
        }

        if ($pathMatched) {
            Response::error('Method not allowed', 405);
        }

        Response::notFound('Route not found: ' . $path);
    }

    /**
     * Match a route pattern against a path.
     *
     * @return array<string,string>|null  Params if match, null otherwise.
     */
    private function match(string $pattern, string $path): ?array
    {
        // Fast path: exact match
        if ($pattern === $path) {
            return [];
        }

        // Build regex:  {id}  →  ([^/]+)
        $regex = preg_replace_callback(
            '#\{([a-zA-Z_][a-zA-Z0-9_]*)\}#',
            static fn(array $m): string => '(?P<' . $m[1] . '>[^/]+)',
            $pattern
        );

        $regex = '#^' . $regex . '$#';

        if (preg_match($regex, $path, $matches) !== 1) {
            return null;
        }

        $params = [];
        foreach ($matches as $key => $value) {
            if (is_string($key)) {
                $params[$key] = $value;
            }
        }
        return $params;
    }

    /**
     * Invoke a handler: [ClassName::class, 'method'] or callable.
     */
    private function invoke(callable|array $handler, Request $request): void
    {
        if (is_array($handler) && count($handler) === 2 && is_string($handler[0])) {
            [$class, $method] = $handler;
            if (!class_exists($class)) {
                throw new \RuntimeException("Controller not found: {$class}");
            }
            $instance = new $class();
            if (!method_exists($instance, $method)) {
                throw new \RuntimeException("Method not found: {$class}::{$method}");
            }
            $instance->{$method}($request);
            return;
        }

        // Plain callable
        $handler($request);
    }
}