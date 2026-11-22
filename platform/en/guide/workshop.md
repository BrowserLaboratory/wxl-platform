# Workshop: start, save, and leave

WXL runs challenges in the browser. Attack logs, notes, Code drafts, and challenge progress stay in this device's browser storage for this site. There is no account sync or automatic submission to a teacher.

## Shared classroom computers

1. Check whose work is stored before starting. Choose **Continue with this work** only when it is yours. For a previous participant's work, choose **Delete it and start fresh**. Deletion cannot be undone.
2. While the choice is pending, previous completion counts and badges are hidden and flag submission is disabled. If clearing is unconfirmed, close the other site tabs and reload as instructed before continuing.
3. Before leaving, export the attack log from every challenge you need to keep; unsolved work can also be exported. Choose **Full** to retain the most content. Open the downloaded file to check it, then move it to your own storage.
4. One export contains the single attempt you chose, not a backup of the whole browser. Copy any unsaved note text separately.
5. Close all site tabs before handing over the computer. The next participant should reopen the site and clear the previous work. An open tab cannot identify that a different person has taken the seat. Remove personal downloads from the shared computer according to classroom rules.

## Personal devices

- Return using the same device, browser, and site address, keeping its stored data. If asked, confirm that the work is yours before continuing.
- The latest unsolved session resumes when eligible. Returning to a solved challenge starts a new session while retaining the previous one. The challenge page lists every attempt stored for that challenge, and any of them can be chosen for export — not only the attempt in progress.
- Changing browsers or devices does not carry the data over on its own. Take the downloaded JSON to the other device and import it from the same challenge's page.
- An import always adds one record. It never replaces or merges an existing one, and it changes neither challenge progress nor the editor draft. An imported record can be read and exported again, but new work is not appended to it — to carry on with the challenge, start a fresh attempt.
- Import a file from the page of the challenge it belongs to. A file for a different challenge is refused, naming both challenges; it is never stored under the challenge you have open.
- The integrity check shown on import says only that the file's content matches the hashes inside it. It does not say who produced the file.

## Read the result and the saving status separately

| Message | Meaning | Action |
|---|---|---|
| Verification and saving in progress | Submission has not finished | Wait rather than resubmitting |
| Correct flag and saved | The answer is correct and this submission was saved | Export the work you need |
| Correct flag and incompletely saved | The answer is correct, but saving did not fully succeed | Keep any available export; another submission counts as another attempt |
| Unable to verify | No valid answer determination was obtained | Wait for the runtime and retry |
| Unable to read progress | Existing progress could not be confirmed; this does not mean zero completion or deletion | Retry the read, then follow storage guidance if needed |

## Platform updates

Before the workshop, export important work, close the other site tabs, and reload. An old page may be unable to use an upgraded database; reloading loads the new application code. Database preservation does not preserve the challenge's running environment: logins, uploaded files, and unsaved actions may need to be repeated after reloading.

If a storage warning appears, save available exports and unsaved text first. Do not clear site data as a routine troubleshooting step.

## Suggested demonstration

Show keep versus clear, open a challenge, submit an answer while explaining the separate saving status, then download and open a full attack log. Arrange a separate file submission channel if you want to collect work; WXL does not collect it automatically.

See [notes and export](./notes#export) and [troubleshooting](./troubleshooting) for details.
