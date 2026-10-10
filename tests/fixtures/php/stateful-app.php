<?php
/**
 * A PHP challenge shaped like the ones this runtime exists to serve.
 *
 * Not a toy: it declares functions and a class, keeps a native session across
 * requests, sets cookies and status codes, reads a mounted file, and writes to
 * the filesystem. Every one of those was broken or unreachable before this
 * change, so an integration test that only ran `echo "hi"` would have passed
 * against the old runtime too.
 *
 * Deliberately NOT under platform/challenge/: this is test material, not a
 * challenge, and it must never appear in the challenge index.
 */

class NoteStore
{
    private string $path;

    public function __construct(string $path)
    {
        $this->path = $path;
    }

    public function all(): array
    {
        if (!file_exists($this->path)) {
            return [];
        }
        return json_decode(file_get_contents($this->path), true) ?: [];
    }

    public function add(string $note): void
    {
        $notes = $this->all();
        $notes[] = $note;
        file_put_contents($this->path, json_encode($notes));
    }
}

function current_user(): ?string
{
    return $_SESSION['user'] ?? null;
}

function render(string $title, string $body): string
{
    return "<h1>" . htmlspecialchars($title) . "</h1><p>{$body}</p>";
}

session_id($_COOKIE['PHPSESSID'] ?? 'fixture-session');
session_start();

$store = new NoteStore('/notes.json');
$action = $_GET['action'] ?? 'home';

if ($action === 'login') {
    // Intentionally trivial: the fixture exercises the runtime, not an auth flow.
    if (($_POST['user'] ?? '') !== '') {
        $_SESSION['user'] = $_POST['user'];
        setcookie('logged_in', '1');
        echo render('Welcome', 'signed in as ' . htmlspecialchars($_SESSION['user']));
    } else {
        http_response_code(400);
        echo render('Login failed', 'no user supplied');
    }
} elseif ($action === 'whoami') {
    $user = current_user();
    if ($user === null) {
        http_response_code(403);
        echo render('Forbidden', 'not signed in');
    } else {
        echo render('You', htmlspecialchars($user));
    }
} elseif ($action === 'note') {
    $store->add($_GET['text'] ?? '');
    echo render('Notes', (string) count($store->all()));
} elseif ($action === 'flag') {
    header('Content-Type: text/plain');
    echo trim(file_get_contents('/flag.txt'));
} else {
    echo render('Home', 'nothing to see');
}
