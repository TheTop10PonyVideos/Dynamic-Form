# Dynamic Voting Form
A web application with a web front-end for users to vote on videos, and a backend for storing ballots and fetching video information.

## Prerequisites
* Install [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).
* Ensure yt-dlp 2026.03.17 is installed. The voting form application uses it (via subprocess calls) to look up video information.
* Get a YouTube Data API key. To obtain one, you need to create a project in the [Google Cloud console](https://console.cloud.google.com), add YouTube Data API v3 to it, and create credentials for the YouTube Data API. When asked what data you'll be accessing, select "Public data" (the API is only needed for video data, which is public). This will give you an API key. If you've already done this part, you can always look up your API key in Google Cloud console -> APIs & Services -> Credentials.
* Optionally, create and save a `cookies.txt` file containing a twitter session in the project root folder. yt-dlp requires this for some posts.

## Installation and setup
* Clone the Dynamic-Form repository:

      git clone https://github.com/TheTop10PonyVideos/Dynamic-Form.git

* Inside the cloned repo directory, install project dependencies:

      cd Dynamic-Form
      npm install

* Create new `.env` environment file from the provided template:

      cp .env.dist .env

* The Dynamic-Form uses a local Postgres database to store votes and video information. You need to run this before running the voting form application, and configure the application to use it. To do this:

  1. Run the Prisma database server in a separate terminal:

        npx prisma dev

    (`npx` is a shortcut for `npm exec`).

  2. While the Prisma server is running, press h to view the database URL. It will look something like this:

        DATABASE_URL="prisma+postgres://localhost:51213/?api_key=eyJkYXRhYmFzZVV...

    Copy and paste the URL (including the `DATABASE_URL=` environment variable specifier) to the `.env` file, replacing the blank `DATABASE_URL` variable there. The Dynamic-Form application will use this variable to connect to the database.

* Add your YouTube Data API v3 key to the `.env` file:

      API_KEY="ABCDEFGH12345678...

  This is needed for the voting form to look up video data when users enter video links.

* Start the webserver for the Dynamic-Form application:

      npx next dev

  It should serve on localhost:3000 by default.

* Visit <http://localhost:3000> in your browser to confirm that the application is running. You should see the voting form page.

## Project structure
* `public`: Directory containing svg icons used in the app
* `app`: Nextjs directory containing main project files and using the app router
* `api`: Directory containing api routes accessible via the /api endpoint
* `app/[page route]`: Directory containing components (usually client side), css, and page.tsx files (usually server side) used when rendering each page.
* `lib`: Organized server and client side functionalities often used in multiple files
* `lib/api`: API request/response types and client side functions to make api calls to the server
* `lib/queries`: Server side functions for making specific interactions with the database
* `middleware.ts`: Ensures the page routes have access to the cookies that are attempted to be set on the client.

> `prisma db pull` and `prisma generate` should be used to update schema.prisma and generated code based on the connected database's schema

## Page Routes
[home]
- The main voting form

/playlist?list
- Leads to either an editable or view only playlist depending on if the user is the owner
- list is the playlist id. Omitting this allows the creation of a new playlist

/playlists
- Let's the user create, view, or edit, all of the playlists they own

/control-panel
- Page where the operator can adjust and test labels, or manually label videos from the video pool
