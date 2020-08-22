[![Telegram](https://img.shields.io/badge/-telegram-blue)](https://t.me/kemonoparty)

[Kemono](https://kemono.party) is an open-source reimplementation of [yiff.party](https://yiff.party/). It archives and dumps data, images, and files from paysites like Patreon.

Kemono's codebase consists of both importers to handle API data and a frontend to share it. While the status of the project is considered stable, there may be bugs and weird quirks here and there. Beware!

![Screenshot](md/screenshot.jpg)

### Supported Sites
- Patreon
- Pixiv Fanbox
- Gumroad
- Discord
- DLsite
- SubscribeStar

### Running
- Install [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) if you don't have them installed already.
- `git clone https://github.com/OpenYiff/Kemono && cd Kemono`
- Copy `.env.example` to `.env` and configure
- `docker-compose build`
- `docker-compose up -d`
- Your instance should now be running [here](http://localhost:8000).
#### Migrating from v1.x -> v2.0
Kemono v2.0 uses Postgres for speed, along with a new unified schema. Ensure your instance is up with the database ports exposed, and run `node migrate-1.x-to-2.0.js <mongo connection url>`.

### FAQ
#### Where did the test scripts go?
The importer test scripts were removed in [v1.2](https://github.com/OpenYiff/Kemono/releases/tag/v1.2).
#### My instance uses too much memory!/My instance is randomly crashing!
Large instances may see memory issues due to the thumbnail generator. Either [set some swap space](https://www.digitalocean.com/community/tutorials/how-to-add-swap-space-on-ubuntu-16-04) or disable the feature in your `docker-compose` file.

---

[Licensed under BSD 3-Clause.](/LICENSE) [tldr.](https://www.tldrlegal.com/l/bsd3)

Kemono itself does not circumvent any technological copyright measures. Content is retrieved legally.
