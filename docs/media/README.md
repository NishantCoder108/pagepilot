# Repository media

The root README includes genuine screenshots of the application. `home.jpg` shows URL entry and local history; `workspace.jpg` shows extracted source text and the AI setup area. Neither screenshot represents a completed model response.

## Live app link

After the HTTPS deployment is verified, replace `Live app: Deployment pending` in the root README with a real Markdown link:

```md
**Live app:** [Try PagePilot](YOUR_VERIFIED_HTTPS_URL)
```

The uppercase token is an editing placeholder, not a URL to publish. Confirm extraction, generation, and `/health` on the deployed service before adding the link.

## Demo video

Record a short end-to-end walkthrough: paste a URL, inspect the extracted page, connect a provider, generate a summary, ask a question, follow a citation, and export the result. Use a disposable API key and keep its value, browser storage, and developer-tool request headers out of the recording.

Upload the video to a host of your choice and replace `Demo video: Recording pending` with its real link. A clickable video thumbnail can use this format after replacing both tokens:

```md
[![Watch the PagePilot demo](docs/media/demo-thumbnail.jpg)](YOUR_VIDEO_URL)
```

Add an actual thumbnail file before using that snippet. Do not leave broken placeholder links in the public README. Keep large video files outside Git; the README should link to the recording.

## Screenshots

Store repository screenshots in this directory and reference them with relative Markdown paths. Prefer screenshots that show one useful flow, with readable text and no credentials or personal reading history. Add summary/chat screenshots after verifying generation with a real provider, or visibly label any test-fixture output.

Use descriptive filenames such as `home.jpg`, `workspace.jpg`, and `source-citations.jpg`. Update the images when the interface changes. Avoid publishing fabricated model output as a working product demonstration.
