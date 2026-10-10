# Terminal Tool

## Terminal Interface Overview

The Terminal panel exposes an in-browser command-line console driven by the platform's custom **wxlsh** shell. wxlsh ships with utilities frequently invoked during security testing — codec conversion, hashing, text processing, and HTTP probes.

Interface regions:

| Region | Description |
|---|---|
| Output area | Renders command results and system notices, and keeps a scrollback buffer you can scroll up through to revisit earlier output |
| Input line | Where commands are typed; supports history navigation |
| Prompt | `hacker@wxlsh:~$ ` signals that the shell is ready; the path segment tracks the current working directory |

The scrollback buffer holds the last 1000 lines; output older than that is discarded as new lines arrive. `clear` (or `Ctrl + L`) empties it and starts from a blank screen.

On startup the panel prints a short banner:

```
wxlsh 1.0 — web exploit shell
type 'help' for available commands
```

## Command Tiers

wxlsh groups its commands into tiers. Tier 5 is a reserved namespace for penetration-testing tools that has not been implemented yet — see the Tier 5 section below.

The Terminal is granted per challenge: it appears only when the challenge author lists `terminal` among the challenge's tools, so a challenge without a Terminal tab is working as intended rather than broken. Where the tab is present, Tiers 1–4 are all available.

There is no filesystem layer in the shell. Commands such as `ls`, `cat`, `head`, `tail`, `cp`, `mv`, and `rm` are deliberately absent. Running one prints the command name back at you along with a pointer to `help`:

```
hacker@wxlsh:~$ cat /etc/passwd
wxlsh: command not found: cat
Type 'help' for available commands.
```

> **Quoting and flags**: the parser treats a short flag as consuming the token after it, so `-d ZmxhZ3s…` stores the payload as the flag's value and leaves no positional argument behind. Quoted tokens are never treated as flags. Where this matters, the syntax below shows the form that actually works.

### Tier 1 — Shell

| Command | Syntax | Description |
|---|---|---|
| `help` | `help [command]` | List available commands, or show detailed usage for one command |
| `clear` | `clear` | Clear the terminal screen |
| `echo` | `echo [text ...]` | Print the arguments, separated by spaces |
| `pwd` | `pwd` | Print the current working directory |
| `cd` | `cd [directory]` | Change directory; bare `cd` and `cd ~` return to `/home/hacker` |
| `whoami` | `whoami` | Print the current username |
| `id` | `id` | Print uid, gid, and group membership |
| `env` | `env` | Print environment variables in `KEY=VALUE` form |
| `export` | `export KEY=VALUE [...]` | Set one or more environment variables |
| `history` | `history` | Print previously executed commands |
| `date` | `date` | Print the current date and time in Linux format |
| `which` | `which <command>` | Print the path of a command, or report that it was not found |

### Tier 2 — Text processing

| Command | Syntax | Common flags |
|---|---|---|
| `grep` | `grep [options] <pattern> <text>` | `-i` case-insensitive, `-v` invert, `-c` count, `-n` line numbers |
| `sed` | `sed <expression> <text>` | e.g. `sed "s/old/new/g"` |
| `awk` | `awk <program> <text>` | e.g. `awk "{print $1}"` |
| `sort` | `sort [options] [text]` | `-r` reverse, `-n` numeric, `-u` unique |
| `uniq` | `uniq [options] [text]` | `-c` prefix counts, `-d` duplicates only |
| `cut` | `cut [options] <text>` | `-d <delim>`, `-f <fields>` |
| `tr` | `tr <set1> <set2> <text>` | Character-for-character mapping, e.g. `tr abc ABC`; ranges such as `a-z` are not expanded |
| `tee` | `tee [text]` | Pass input through to output |
| `xargs` | `xargs [text ...]` | Echoes its arguments back; it does not invoke another command |
| `diff` | `diff <text1> <text2>` | Compare two inputs line by line |

### Tier 3 — Encoding and hashing

| Command | Syntax | Description |
|---|---|---|
| `base64` | `base64 <text>` / `base64 "-d" <encoded>` | Base64 encode, or decode with a quoted `"-d"` |
| `hex` | `hex <text>` / `hex "-d" <hex-string>` | Hex encode to space-separated bytes, or decode with a quoted `"-d"` |
| `encode` | `encode <base64\|url\|hex> <value>` | Encode in the named format; a single argument defaults to base64 |
| `decode` | `decode <base64\|url\|hex> <value>` | Decode from the named format; a single argument defaults to base64 |
| `urlencode` | `urlencode <text>` | Percent-encode text for use in URLs |
| `urldecode` | `urldecode <text>` | Decode percent-encoded text |
| `xxd` | `xxd <text>` | Hex dump with offsets and an ASCII column |
| `md5sum` | `md5sum <text>` | Compute the MD5 hash |
| `sha256sum` | `sha256sum <text>` | Compute the SHA-256 hash |

For plain hex without the dump formatting, use `hex` or `encode hex` instead of `xxd`.

### Tier 4 — Network

| Command | Syntax | Common flags |
|---|---|---|
| `curl` | `curl [options] <url>` | `-X <method>`, `-d <data>`, `-H <header>`, `-i`, `-s`, `-L`, `-v`, `-o <file>` |
| `wget` | `wget [options] <url>` | `-O <file>`, `-q` |

### Tier 5 — Reserved, not yet implemented

`dirb`, `dirsearch`, `sqlmap`, `jwt`, `hydra`, and `nmap` are reserved command names. The execution path behind them is still a stub, so they are not usable in any challenge yet. Running one reports:

```
wxlsh: 'sqlmap' is not available for this challenge.
This command is controlled by the challenge author.
```

Solve tasks that would call for these tools with the Tier 1–4 commands, the Code Editor, and the Repeater instead.

## Command Reference

### help

List the commands in wxlsh's help registry, grouped by category, or show detailed usage for one command. The registry covers Tiers 1–4 with one exception: `hex` is missing from it, so neither `help` nor `which hex` acknowledges the command even though it runs.

**Syntax**

```
help
help <command>
```

**Example**

```
hacker@wxlsh:~$ help
Available commands:

  Shell:
    cd          change directory
    clear       clear the terminal screen
    ...

Type 'help <command>' for detailed usage.
```

---

### clear

Wipe the existing output from the console and restore a blank canvas. `Ctrl + L` does the same thing.

**Syntax**

```
clear
```

---

### base64

Base64-encode the supplied text, or decode it by passing a quoted `"-d"`.

**Syntax**

```
base64 <text>
base64 "-d" <encoded>
```

**Example**

```
hacker@wxlsh:~$ base64 admin:password
YWRtaW46cGFzc3dvcmQ=

hacker@wxlsh:~$ base64 "-d" ZmxhZ3tzZWNyZXR9
flag{secret}
```

> **Quote the `-d`**: written bare, the parser consumes the encoded text as the flag's value and the command sees no input at all, so it prints its usage line instead of decoding. The built-in `help` text shows the bare form; the quoted form above is the one that works. `decode base64 <encoded>` is an alternative that needs no quoting.

---

### hex

Hex-encode the supplied text, or decode a hex string by passing a quoted `"-d"`. Encoded output is emitted as space-separated bytes; decoding accepts input with or without spaces.

**Syntax**

```
hex <text>
hex "-d" <hex-string>
```

**Example**

```
hacker@wxlsh:~$ hex hello
68 65 6c 6c 6f

hacker@wxlsh:~$ hex "-d" 666c61677b7368656c6c7d
flag{shell}
```

> The `"-d"` needs quoting for the same reason as `base64`. `decode hex <hex-string>` also works and needs no quoting.

---

### encode

Encode a value in the named format: `base64`, `url`, or `hex`. When only one argument is supplied, the format defaults to base64 — pass `url` explicitly for percent-encoding.

**Syntax**

```
encode <base64|url|hex> <value>
```

**Example**

```
hacker@wxlsh:~$ encode url "' OR 1=1 --"
%27%20OR%201%3D1%20--

hacker@wxlsh:~$ encode hex admin
61646d696e
```

---

### decode

Decode a value from the named format: `base64`, `url`, or `hex`. As with `encode`, a single argument is treated as base64.

**Syntax**

```
decode <base64|url|hex> <value>
```

**Example**

```
hacker@wxlsh:~$ decode url %66%6c%61%67%7b%74%65%73%74%7d
flag{test}

hacker@wxlsh:~$ decode base64 ZmxhZ3tzZWNyZXR9
flag{secret}
```

---

### curl

Issue an HTTP request against the supplied URL and print the response body. Useful for inspecting API replies or probing whether an endpoint exists.

**Syntax**

```
curl <url>
curl -X <METHOD> <url>
curl -d <body> <url>
curl -H "Header-Name: value" <url>
curl -i <url>
```

Supported flags are `-X`, `-d`, `-H`, `-i` (include response headers), `-s` (silent), `-L` (follow redirects), `-v` (verbose), and `-o <file>`. There is no `-I`; use `-i` to see the response headers.

Since the shell has no filesystem, `-o` (and `wget`'s `-O`) print a `saved to <file>` line and discard the response body — they suppress output rather than write anything you can read back.

**Example**

```
hacker@wxlsh:~$ curl http://target.local/api/status
{
  "status": "ok",
  "version": "1.0"
}

hacker@wxlsh:~$ curl -H "X-Admin: true" http://target.local/admin
403 Forbidden
```

A response whose `content-type` names JSON is re-indented before printing; any other content type is printed exactly as received.

---

### md5sum and sha256sum

Compute a hash of the supplied text. Both commands mimic the coreutils output shape, so the digest is followed by two spaces and a `-` standing in for the filename. Strip that suffix before comparing a digest against a target value.

**Syntax**

```
md5sum <text>
sha256sum <text>
```

**Example**

```
hacker@wxlsh:~$ md5sum secret
5ebe2294ecd0e0f08eab7690d2a6ee69  -

hacker@wxlsh:~$ sha256sum secret
2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b  -
```

## Pipes

wxlsh supports the `|` operator, so encoding, decoding, and hashing steps can be chained in a single line.

The upstream output is inserted as the downstream command's **first positional argument** — it is not appended after the arguments you typed. Piping therefore suits commands whose first argument is the data itself (`md5sum`, `sha256sum`, `base64`, `decode`, `urlencode`, `xxd`, `tee`). Commands that expect an operand first, such as `grep <pattern> <text>` or `tr <set1> <set2> <text>`, receive the piped text in the operand slot instead of the data slot, so pass their input as a normal argument rather than through a pipe.

**Example**

```
hacker@wxlsh:~$ echo secret | md5sum
5ebe2294ecd0e0f08eab7690d2a6ee69  -

hacker@wxlsh:~$ echo admin | base64 | decode
admin
```

## Command History

wxlsh records every command you run, and the arrow keys let you browse and reuse prior entries.

| Key | Action |
|---|---|
| `↑` (Up) | Surface the previous command from history |
| `↓` (Down) | Advance to the next command in history (toward newer entries) |

History is persisted to IndexedDB rather than held in memory, so it survives a page reload — the most recent 200 entries are restored when the terminal starts. The store is shared across every challenge on the site rather than kept per challenge, so entries typed in an earlier challenge remain reachable with the arrow keys.

Consecutive duplicates are collapsed only on the way into the persistent store. Within the current session the arrow keys and `history` still show every repetition, so a command you ran three times in a row appears three times until you reload.

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + A` | Jump the cursor to the start of the input line |
| `Ctrl + E` | Jump the cursor to the end of the input line |
| `Ctrl + L` | Wipe the console screen (equivalent to invoking `clear`) |
| `Ctrl + C` | Abort the current entry, empty the input line, and advance to a fresh row |
